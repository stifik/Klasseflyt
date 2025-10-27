/**
 * Clean WebSocket hook implementation (alternate copy) to avoid editing corrupted original file.
 */

import { useEffect, useRef, useCallback, useState } from 'react';

const BRIDGE_URL = typeof window !== 'undefined'
  ? (window.localStorage?.getItem('nfc_bridge_url') || process.env.NEXT_PUBLIC_NFC_BRIDGE_URL || 'http://localhost:3001')
  : 'http://localhost:3001';

const WS_URL = BRIDGE_URL.replace(/^http/, 'ws');

export type NFCWebSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'monitoring' | 'error';

export interface NFCCard {
  uid: string;
  cardId: string;
  length: number;
  reader: string;
  timestamp: string;
}

export interface NFCWebSocketMessage {
  type: 'status' | 'card_detected' | 'card_removed' | 'monitoring_started' | 'monitoring_stopped' |
        'reader_connected' | 'reader_disconnected' | 'reader_changed' | 'no_readers' | 'error';
  uid?: string;
  cardId?: string;
  length?: number;
  reader?: string;
  timestamp?: string;
  error?: string;
  message?: string;
  readersConnected?: number;
  currentReader?: string | null;
  isMonitoring?: boolean;
}

interface UseNFCWebSocketOptions {
  enabled?: boolean;
  autoConnect?: boolean;
  autoMonitor?: boolean;
  onCardDetected?: (card: NFCCard) => void;
  onCardRemoved?: () => void;
  onError?: (error: string, message?: string) => void;
  onStatusChange?: (status: NFCWebSocketStatus) => void;
  reconnectInterval?: number; // milliseconds, default 3000
}

export function useNFCWebSocket({
  enabled = true,
  autoConnect = true,
  autoMonitor = false,
  onCardDetected,
  onCardRemoved,
  onError,
  onStatusChange,
  reconnectInterval = 3000
}: UseNFCWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const manualDisconnectRef = useRef(false);
  const isMonitoringRef = useRef<boolean>(false); // desired monitoring state across reconnects

  const [status, setStatus] = useState<NFCWebSocketStatus>('disconnected');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [readersConnected, setReadersConnected] = useState(0);
  const [currentReader, setCurrentReader] = useState<string | null>(null);

  const updateStatus = useCallback((newStatus: NFCWebSocketStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data: NFCWebSocketMessage = JSON.parse(event.data);

      switch (data.type) {
        case 'status':
          setReadersConnected(data.readersConnected || 0);
          setCurrentReader(data.currentReader || null);
          setIsMonitoring(!!data.isMonitoring);
          break;
        case 'card_detected':
          if (data.uid && data.cardId && onCardDetected) {
            onCardDetected({
              uid: data.uid,
              cardId: data.cardId,
              length: data.length || 0,
              reader: data.reader || '',
              timestamp: data.timestamp || new Date().toISOString()
            });
          }
          break;
        case 'card_removed':
          onCardRemoved?.();
          break;
        case 'monitoring_started':
          setIsMonitoring(true);
          isMonitoringRef.current = true;
          updateStatus('monitoring');
          break;
        case 'monitoring_stopped':
          setIsMonitoring(false);
          isMonitoringRef.current = false;
          updateStatus('connected');
          break;
        case 'reader_connected':
          setReadersConnected(prev => prev + 1);
          if (data.reader) setCurrentReader(data.reader);
          break;
        case 'reader_disconnected':
          setReadersConnected(prev => Math.max(0, prev - 1));
          break;
        case 'reader_changed':
          if (data.reader) setCurrentReader(data.reader);
          break;
        case 'no_readers':
          setReadersConnected(0);
          setCurrentReader(null);
          break;
        case 'error':
          onError?.(data.error || 'UNKNOWN_ERROR', data.message);
          break;
        default:
          break;
      }
    } catch (err) {
      console.error('Error parsing NFC WS message', err);
    }
  }, [onCardDetected, onCardRemoved, onError, updateStatus]);

  const connect = useCallback(() => {
    if (!enabled) return;
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current as number);
      reconnectTimerRef.current = null;
    }

    try {
      updateStatus('connecting');
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        updateStatus('connected');
        reconnectAttemptsRef.current = 0;
        if (autoMonitor || isMonitoringRef.current) {
          setTimeout(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ command: 'start_monitoring' }));
            }
          }, 100);
        }
      };

      ws.onmessage = handleMessage;

      ws.onerror = () => {
        // onclose will handle reconnect/backoff
      };

      ws.onclose = (event: CloseEvent) => {
        wsRef.current = null;
        updateStatus('disconnected');
        const wasManualClose = manualDisconnectRef.current === true || event.code === 1000;
        if (enabled && autoConnect && !wasManualClose) {
          reconnectAttemptsRef.current += 1;
          const attempt = reconnectAttemptsRef.current;
          const backoff = Math.min(reconnectInterval * Math.pow(2, attempt - 1), 30000);
          reconnectTimerRef.current = window.setTimeout(() => connect(), backoff);
        } else if (!wasManualClose) {
          onError?.('WEBSOCKET_ERROR', 'Failed to connect to NFC bridge - is the server running?');
        }
      };

      wsRef.current = ws;
    } catch (err) {
      wsRef.current = null;
      updateStatus('error');
      onError?.('CONNECTION_FAILED', 'Could not connect to NFC bridge server');
      if (enabled && autoConnect) {
        reconnectAttemptsRef.current += 1;
        const attempt = reconnectAttemptsRef.current;
        const backoff = Math.min(reconnectInterval * Math.pow(2, attempt - 1), 30000);
        reconnectTimerRef.current = window.setTimeout(() => connect(), backoff);
      }
    }
  }, [enabled, autoConnect, autoMonitor, handleMessage, reconnectInterval, updateStatus, onError]);

  const disconnect = useCallback(() => {
    manualDisconnectRef.current = true;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current as number);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnecting');
      wsRef.current = null;
    }
    updateStatus('disconnected');
  }, [updateStatus]);

  const sendCommand = useCallback((command: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command }));
    }
  }, []);

  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    isMonitoringRef.current = true;
    sendCommand('start_monitoring');
  }, [sendCommand]);

  const stopMonitoring = useCallback(() => {
    isMonitoringRef.current = false;
    sendCommand('stop_monitoring');
  }, [sendCommand]);

  const scanOnce = useCallback(() => {
    sendCommand('scan_once');
  }, [sendCommand]);

  useEffect(() => {
    manualDisconnectRef.current = false;
    if (enabled && autoConnect) connect();
    return () => {
      manualDisconnectRef.current = true;
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    isMonitoring,
    readersConnected,
    currentReader,
    connect,
    disconnect,
    startMonitoring,
    stopMonitoring,
    scanOnce
  };
}
