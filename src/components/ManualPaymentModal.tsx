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
  transferMode?: 'from' | 'to' | null; // For transfer transactions
  fromStudentId?: number; // ID of the sender (for filtering in 'to' mode)
}

export function ManualPaymentModal({
  students,
  rfidCards,
  isNFCSupported,
  onNFCMode,
  onManualSelect,
  onCancel,
  transferMode = null,
  fromStudentId
}: ManualPaymentModalProps) {
  // Determine title based on transfer mode
  let title = 'Velg betalingsmåte';
  let selectLabel = 'Eller velg elev manuelt:';
  let nfcButtonText = 'Tæpp NFC-kort (anbefalt)';

  if (transferMode === 'from') {
    title = 'Velg avsender';
    selectLabel = 'Velg elev som skal overføre poeng:';
    nfcButtonText = 'Tæpp kort for avsender';
  } else if (transferMode === 'to') {
    title = 'Velg mottaker';
    selectLabel = 'Velg elev som skal motta poeng:';
    nfcButtonText = 'Tæpp kort for mottaker';
  }

  // Filter students for 'to' mode to exclude the sender
  const availableStudents = transferMode === 'to'
    ? students.filter(s => s.id !== fromStudentId)
    : students;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        {title}
      </h3>

      {/* NFC Button */}
      {isNFCSupported && rfidCards.length > 0 && (
        <Button
          onClick={onNFCMode}
          className="w-full h-16 text-lg"
          variant="default"
        >
          <CreditCard className="w-5 h-5 mr-2" />
          {nfcButtonText}
        </Button>
      )}

      {/* Manual Selection */}
      <div className="space-y-2">
        <Label htmlFor="manual-select" className="text-base">
          {selectLabel}
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
          {availableStudents
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
