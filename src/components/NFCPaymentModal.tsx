"use client";

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2, CheckCircle2, XCircle } from 'lucide-react';

type NFCStatus = 'idle' | 'waiting' | 'processing' | 'success' | 'error';

interface NFCPaymentModalProps {
  nfcStatus: NFCStatus;
  nfcMessage: string;
  onCancel: () => void;
  onAbort: () => void;
}

export function NFCPaymentModal({
  nfcStatus,
  nfcMessage,
  onCancel,
  onAbort
}: NFCPaymentModalProps) {
  return (
    <div className="space-y-4">
      <Alert className={
        nfcStatus === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-950' :
        nfcStatus === 'error' ? 'border-red-500 bg-red-50 dark:bg-red-950' :
        nfcStatus === 'processing' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' :
        'border-blue-500 bg-blue-50 dark:bg-blue-950'
      }>
        {nfcStatus === 'success' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
        {nfcStatus === 'error' && <XCircle className="h-5 w-5 text-red-600" />}
        {nfcStatus === 'processing' && <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />}
        {nfcStatus === 'waiting' && <CreditCard className="h-5 w-5 text-blue-600 animate-pulse" />}

        <div className="ml-2">
          <AlertTitle className="text-lg font-semibold">
            {nfcStatus === 'waiting' && '🔵 Venter på kort...'}
            {nfcStatus === 'processing' && '⏳ Behandler...'}
            {nfcStatus === 'success' && '✅ Vellykket!'}
            {nfcStatus === 'error' && '❌ Feil'}
          </AlertTitle>
          <AlertDescription className="text-base mt-1">
            {nfcMessage}
          </AlertDescription>
        </div>
      </Alert>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Avbryt NFC-modus
        </Button>
        <Button
          onClick={onAbort}
          variant="destructive"
          className="flex-1"
        >
          Avslutt transaksjon
        </Button>
      </div>
    </div>
  );
}
