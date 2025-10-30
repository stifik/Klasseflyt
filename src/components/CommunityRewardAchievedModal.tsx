"use client";

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trophy, Sparkles, PartyPopper } from 'lucide-react';
import Confetti from 'react-confetti';
import type { CommunityReward } from '@/lib/types';

interface CommunityRewardAchievedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reward: CommunityReward | null;
}

export function CommunityRewardAchievedModal({
  open,
  onOpenChange,
  reward,
}: CommunityRewardAchievedModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (open) {
      setShowConfetti(true);
      // Update window size for confetti
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });

      // Stop confetti after 5 seconds
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!reward) return null;

  return (
    <>
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.3}
        />
      )}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-900/30 dark:via-amber-900/30 dark:to-orange-900/30 border-4 border-yellow-400 dark:border-yellow-600">
          <DialogHeader className="text-center space-y-4 pt-6">
            {/* Animated Trophy */}
            <div className="flex justify-center">
              <div className="relative">
                <Trophy className="w-24 h-24 text-yellow-500 animate-bounce" />
                <Sparkles className="w-8 h-8 text-yellow-400 absolute -top-2 -right-2 animate-pulse" />
                <Sparkles className="w-6 h-6 text-yellow-400 absolute -bottom-1 -left-1 animate-pulse" />
              </div>
            </div>

            {/* Title */}
            <DialogTitle className="text-4xl font-black text-center text-gray-900 dark:text-white">
              <div className="flex items-center justify-center gap-2 mb-2">
                <PartyPopper className="w-8 h-8 text-purple-600" />
                <span>Gratulerer!</span>
                <PartyPopper className="w-8 h-8 text-purple-600" />
              </div>
            </DialogTitle>

            {/* Reward Info */}
            <div className="space-y-4">
              <div className="text-6xl animate-pulse">{reward.emoji || '🎯'}</div>

              <DialogDescription className="text-xl font-bold text-gray-800 dark:text-gray-200">
                Klassen har oppnådd målet:
              </DialogDescription>

              <div className="bg-white/80 dark:bg-gray-800/80 p-6 rounded-2xl border-2 border-yellow-300 dark:border-yellow-600 shadow-lg">
                <h2 className="text-2xl font-black text-purple-700 dark:text-purple-300 mb-2">
                  {reward.title}
                </h2>
                {reward.description && (
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    {reward.description}
                  </p>
                )}
                <div className="flex items-center justify-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                  <Trophy className="w-6 h-6 text-yellow-500" />
                  <span>{reward.currentAmount.toLocaleString()} poeng samlet!</span>
                </div>
              </div>

              <div className="text-center space-y-2 pt-4">
                <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                  Fantastisk jobbet, hele klassen! 🎉
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Sammen er vi sterke!
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex justify-center pb-4 pt-2">
            <Button
              onClick={() => onOpenChange(false)}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg px-8 py-6 shadow-lg"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Lukk
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
