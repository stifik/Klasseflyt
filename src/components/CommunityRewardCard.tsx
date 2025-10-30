"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Trophy, Users } from 'lucide-react';
import type { CommunityReward } from '@/lib/types';

interface CommunityRewardCardProps {
  reward: CommunityReward;
  onDonate?: (rewardId: number) => void;
  showDonateButton?: boolean;
  compact?: boolean;
}

export function CommunityRewardCard({
  reward,
  onDonate,
  showDonateButton = true,
  compact = false,
}: CommunityRewardCardProps) {
  const progressPercent = Math.min(100, (reward.currentAmount / reward.target) * 100);
  const remaining = Math.max(0, reward.target - reward.currentAmount);
  const isAchieved = reward.status === 'achieved';

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
        <div className="text-3xl">{reward.emoji || '🎯'}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-sm truncate">{reward.title}</h4>
            {isAchieved && <Trophy className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-2">
            <Progress value={progressPercent} className="h-2 flex-1" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
              {reward.currentAmount.toLocaleString()} / {reward.target.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={`overflow-hidden transition-all ${
      isAchieved
        ? 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-300 dark:border-yellow-700'
        : 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-700'
    }`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="text-5xl">{reward.emoji || '🎯'}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {reward.title}
              </h3>
              {isAchieved && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-400 text-yellow-900 rounded-full text-xs font-bold">
                  <Trophy className="w-3 h-3" />
                  Oppnådd!
                </div>
              )}
            </div>
            {reward.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {reward.description}
              </p>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
              <Users className="w-4 h-4" />
              <span>Fellespot</span>
            </div>
            <span className="font-bold text-lg text-gray-900 dark:text-white">
              {reward.currentAmount.toLocaleString()} / {reward.target.toLocaleString()}
            </span>
          </div>
          <Progress value={progressPercent} className="h-3" />
          <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
            <span>{progressPercent.toFixed(1)}% oppnådd</span>
            {!isAchieved && (
              <span className="font-medium">{remaining.toLocaleString()} poeng gjenstår</span>
            )}
            {isAchieved && reward.achievedAt && (
              <span>Fullført {new Date(reward.achievedAt).toLocaleDateString('nb-NO')}</span>
            )}
          </div>
        </div>

        {/* Action Button */}
        {showDonateButton && !isAchieved && onDonate && (
          <Button
            onClick={() => onDonate(reward.id!)}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            size="lg"
          >
            <Users className="w-4 h-4 mr-2" />
            Doner til fellesspotten
          </Button>
        )}

        {isAchieved && (
          <div className="text-center py-2 text-sm text-gray-600 dark:text-gray-300 italic">
            Dette målet er allerede oppnådd! 🎉
          </div>
        )}
      </div>
    </Card>
  );
}
