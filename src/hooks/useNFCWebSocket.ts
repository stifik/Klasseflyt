/**
 * WebSocket hook for real-time NFC card detection
 * Replaces polling-based approach with event-driven architecture
 */

import { useEffect, useRef, useCallback, useState } from 'react';

const BRIDGE_URL = typeof window !== 'undefined'
  ? (window.localStorage?.getItem('nfc_bridge_url') || process.env.NEXT_PUBLIC_NFC_BRIDGE_URL || 'http://localhost:3001')
  : 'http://localhost:3001';

// Convert HTTP URL to WebSocket URL
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
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
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
          setIsMonitoring(data.isMonitoring || false);
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
          updateStatus('monitoring');
          break;

        case 'monitoring_stopped':
          setIsMonitoring(false);
          updateStatus('connected');
          break;

        case 'reader_connected':
          setReadersConnected(prev => prev + 1);
          if (data.reader) {
            setCurrentReader(data.reader);
          }
          break;

        case 'reader_disconnected':
          setReadersConnected(prev => Math.max(0, prev - 1));
          break;

        case 'reader_changed':
          if (data.reader) {
            setCurrentReader(data.reader);
          }
          break;

        case 'no_readers':
          setReadersConnected(0);
          setCurrentReader(null);
          break;

        case 'error':
          console.error('❌ NFC WebSocket error:', data.error, data.message);
          onError?.(data.error || 'UNKNOWN_ERROR', data.message);
          break;
      }
    } catch (error) {
      console.error('❌ Error parsing WebSocket message:', error);
    }
  }, [onCardDetected, onCardRemoved, onError, updateStatus]);

  const connect = useCallback(() => {
    if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Clear any existing reconnect timer
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    try {
      console.log('🔌 Connecting to NFC WebSocket:', WS_URL);
      updateStatus('connecting');

      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('✅ NFC WebSocket connected');
        updateStatus('connected');

        // Auto-start monitoring if enabled
        if (autoMonitor) {
          startMonitoring();
        }
      };

      ws.onmessage = handleMessage;

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        updateStatus('error');
        onError?.('WEBSOCKET_ERROR', 'Failed to connect to NFC bridge');
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        updateStatus('disconnected');

        // Auto-reconnect if enabled
        if (enabled && autoConnect) {
          console.log(`🔄 Reconnecting in ${reconnectInterval}ms...`);
          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error);
      updateStatus('error');
      onError?.('CONNECTION_FAILED', 'Could not connect to NFC bridge server');

      // Retry connection
      if (enabled && autoConnect) {
        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, reconnectInterval);
      }
    }
  }, [enabled, autoConnect, autoMonitor, handleMessage, reconnectInterval, updateStatus, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    updateStatus('disconnected');
  }, [updateStatus]);

  const sendCommand = useCallback((command: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command }));
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send command:', command);
    }
  }, []);

  const startMonitoring = useCallback(() => {
    sendCommand('start_monitoring');
  }, [sendCommand]);

  const stopMonitoring = useCallback(() => {
    sendCommand('stop_monitoring');
  }, [sendCommand]);

  const scanOnce = useCallback(() => {
    sendCommand('scan_once');
  }, [sendCommand]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (enabled && autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, autoConnect, connect, disconnect]);

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
