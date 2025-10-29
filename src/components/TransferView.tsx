"use client";

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowRight, Info } from 'lucide-react';

interface TransferViewProps {
  transferFeePercent: number;
  onStartTransfer: (amount: number) => void;
}

const TransferView: React.FC<TransferViewProps> = ({ transferFeePercent, onStartTransfer }) => {
  const [amount, setAmount] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return;
    }
    onStartTransfer(parsedAmount);
  };

  const parsedAmount = parseInt(amount, 10);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;
  const fee = isValidAmount ? Math.ceil(parsedAmount * (transferFeePercent / 100)) : 0;
  const totalCost = isValidAmount ? parsedAmount + fee : 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Overfør poeng mellom elever
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Skriv inn beløpet som skal overføres
        </p>
      </div>

      {/* Info om kostnad */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <p className="font-semibold mb-1">Overføringskostnad: {transferFeePercent}%</p>
            <p>
              Når du overfører poeng, vil det koste {transferFeePercent}% ekstra.
              For eksempel: hvis du overfører 100 poeng, vil det koste totalt {100 + Math.ceil(100 * (transferFeePercent / 100))} poeng.
            </p>
          </div>
        </div>
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="transfer-amount">Beløp å overføre</Label>
          <Input
            id="transfer-amount"
            type="number"
            min="1"
            placeholder="f.eks. 100"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-lg"
          />
        </div>

        {/* Cost breakdown */}
        {isValidAmount && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Beløp til mottaker:</span>
              <span className="font-medium text-gray-900 dark:text-white">{parsedAmount} poeng</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Overføringsgebyr ({transferFeePercent}%):</span>
              <span className="font-medium text-orange-600 dark:text-orange-400">+ {fee} poeng</span>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900 dark:text-white">Total kostnad:</span>
                <span className="font-bold text-lg text-blue-600 dark:text-blue-400">{totalCost} poeng</span>
              </div>
            </div>
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={!isValidAmount}
        >
          Start overføring
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </form>

      {/* Visual explanation */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4">
        <div className="flex items-center justify-center gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl mb-1">👤</div>
            <div className="font-medium text-gray-900 dark:text-white">Avsender</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Betaler {isValidAmount ? totalCost : '___'} poeng</div>
          </div>
          <ArrowRight className="w-8 h-8 text-purple-500" />
          <div className="text-center">
            <div className="text-2xl mb-1">👤</div>
            <div className="font-medium text-gray-900 dark:text-white">Mottaker</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Får {isValidAmount ? parsedAmount : '___'} poeng</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(TransferView);
