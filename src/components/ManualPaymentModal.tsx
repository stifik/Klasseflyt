"use client";

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CreditCard, AlertCircle } from 'lucide-react';
import type { Student, RFIDCard } from '@/lib/types';

interface ManualPaymentModalProps {
  students: Student[];
  rfidCards: RFIDCard[];
  isNFCSupported: boolean;
  onNFCMode: () => void;
  onManualSelect: (studentId: number) => void;
  onCancel: () => void;
}

export function ManualPaymentModal({
  students,
  rfidCards,
  isNFCSupported,
  onNFCMode,
  onManualSelect,
  onCancel
}: ManualPaymentModalProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Velg betalingsmåte
      </h3>

      {/* NFC Button */}
      {isNFCSupported && rfidCards.length > 0 && (
        <Button
          onClick={onNFCMode}
          className="w-full h-16 text-lg"
          variant="default"
        >
          <CreditCard className="w-5 h-5 mr-2" />
          Tæpp NFC-kort (anbefalt)
        </Button>
      )}

      {/* Manual Selection */}
      <div className="space-y-2">
        <Label htmlFor="manual-select" className="text-base">
          Eller velg elev manuelt:
        </Label>
        <select
          id="manual-select"
          defaultValue=""
          onChange={(e) => {
            const studentId = Number(e.target.value);
            if (studentId) {
              onManualSelect(studentId);
            }
          }}
          className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg"
        >
          <option value="" disabled>Velg elev fra listen...</option>
          {students
            .filter(student => student.name && student.id)
            .map((student) => (
              <option key={student.id} value={student.id}>
                {student.name} ({student.points || 0} poeng)
              </option>
            ))}
        </select>
      </div>

      {!isNFCSupported && (
        <Alert className="border-orange-500">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            NFC støttes ikke i denne nettleseren. Bruk manuell modus eller start NFC Bridge Server.
          </AlertDescription>
        </Alert>
      )}

      <Button
        onClick={onCancel}
        variant="outline"
        className="w-full"
      >
        Avbryt transaksjon
      </Button>
    </div>
  );
}
