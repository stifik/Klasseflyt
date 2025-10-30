"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Heart, AlertCircle, Info } from 'lucide-react';
import type { CommunityReward, Student } from '@/lib/types';

interface CommunityRewardDonationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reward: CommunityReward | null;
  student: Student | null;
  onConfirm: (amount: number) => void;
}

export function CommunityRewardDonationDialog({
  open,
  onOpenChange,
  reward,
  student,
  onConfirm,
}: CommunityRewardDonationDialogProps) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const donationAmount = parseInt(amount, 10);

    // Validation
    if (!donationAmount || donationAmount <= 0) {
      setError('Vennligst oppgi et gyldig beløp');
      return;
    }

    if (!student) {
      setError('Ingen elev valgt');
      return;
    }

    const currentBalance = student.points || 0;
    if (donationAmount > currentBalance) {
      setError(`${student.name} har kun ${currentBalance} poeng`);
      return;
    }

    if (!reward) {
      setError('Ingen fellespot valgt');
      return;
    }

    const remaining = Math.max(0, reward.target - reward.currentAmount);
    if (donationAmount > remaining) {
      setError(`Kun ${remaining} poeng gjenstår til målet`);
      return;
    }

    onConfirm(donationAmount);
    handleClose();
  };

  const handleClose = () => {
    setAmount('');
    setError('');
    onOpenChange(false);
  };

  const currentBalance = student?.points || 0;
  const remaining = reward ? Math.max(0, reward.target - reward.currentAmount) : 0;
  const parsedAmount = parseInt(amount, 10);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;
  const newBalance = isValidAmount ? currentBalance - parsedAmount : currentBalance;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-purple-600" />
            Doner til fellesspotten
          </DialogTitle>
          <DialogDescription>
            {student && reward ? (
              <>
                <span className="font-semibold">{student.name}</span> donerer til{' '}
                <span className="font-semibold">"{reward.title}"</span>
              </>
            ) : (
              'Oppgi beløp for donasjon'
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Balance */}
          {student && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Nåværende saldo:</span>
                  <span className="font-bold text-lg">{currentBalance.toLocaleString()} poeng</span>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="donationAmount">Beløp å donere</Label>
            <Input
              id="donationAmount"
              type="number"
              min="1"
              max={Math.min(currentBalance, remaining)}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Maks ${Math.min(currentBalance, remaining).toLocaleString()}`}
              autoFocus
              className="text-lg font-semibold"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {remaining > 0
                ? `${remaining.toLocaleString()} poeng gjenstår til målet`
                : 'Målet er allerede nådd!'}
            </p>
          </div>

          {/* Preview */}
          {isValidAmount && (
            <div className="space-y-2 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
              <div className="flex items-center gap-2 text-purple-900 dark:text-purple-100 mb-2">
                <Users className="w-4 h-4" />
                <span className="font-semibold text-sm">Donasjonssammendrag</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Donasjon:</span>
                  <span className="font-bold text-purple-700 dark:text-purple-300">
                    {parsedAmount.toLocaleString()} poeng
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-purple-200 dark:border-purple-700">
                  <span className="text-gray-600 dark:text-gray-300">Ny saldo:</span>
                  <span className="font-bold">{newBalance.toLocaleString()} poeng</span>
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Info box */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Donasjonen går direkte til fellesspotten og teller mot klassens felles mål.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Avbryt
            </Button>
            <Button
              type="submit"
              disabled={!isValidAmount || parsedAmount > currentBalance || remaining <= 0}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Heart className="w-4 h-4 mr-2" />
              Doner {isValidAmount ? parsedAmount.toLocaleString() : ''} poeng
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
