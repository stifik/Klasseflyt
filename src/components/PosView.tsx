"use client";

import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { Reward, CommunityReward } from '@/lib/types';

interface PosViewProps {
  rewards: Reward[];
  onSelectReward: (rewardId: number) => void;
  onSelectCommunityReward?: (rewardId: number) => void;
}

const PosView: React.FC<PosViewProps> = ({ rewards, onSelectReward, onSelectCommunityReward }) => {
  // Fetch active community rewards
  const activeCommunityRewards = useLiveQuery(() =>
    db.communityRewards.where('status').equals('active').sortBy('priority')
  );

  return (
    <div className="space-y-6">
      {/* Regular Rewards Section */}
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Personlige Belønninger
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Klikk på en belønning for å starte salget
          </p>
        </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {rewards.map(reward => (
          <button 
            key={reward.id} 
            onClick={() => onSelectReward(reward.id)}
            className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:border-blue-300 hover:shadow-lg transform hover:scale-105 transition-all duration-200 text-center min-h-[140px] flex flex-col justify-center"
          >
            {/* Ikon eller emoji for belønning */}
            <div className="text-3xl mb-3">
              {reward.emoji || '🎁'}
            </div>
            
            {/* Belønningsnavn */}
            <span className="font-medium text-gray-900 dark:text-white text-sm leading-tight mb-2 block">
              {reward.name}
            </span>
            
            {/* Kostnad */}
            <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-bold">
              {reward.cost} poeng
            </div>

            {/* Hover-effekt */}
            <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Klikk for å velge
              </span>
            </div>
          </button>
        ))}
      </div>

        {rewards.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🛍️</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Ingen belønninger tilgjengelig
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Legg til belønninger i systemet for å starte salg
            </p>
          </div>
        )}
      </div>

      {/* Community Rewards Section */}
      {activeCommunityRewards && activeCommunityRewards.length > 0 && onSelectCommunityReward && (
        <div className="space-y-4 pt-6 border-t-2 border-purple-200 dark:border-purple-700">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-2 flex items-center justify-center gap-2">
              <span>🎯</span>
              Fellesspotter (Delte Mål)
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Doner til klassens felles mål
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeCommunityRewards.map((reward) => {
              const progressPercent = Math.min(100, (reward.currentAmount / reward.target) * 100);
              const remaining = Math.max(0, reward.target - reward.currentAmount);

              return (
                <button
                  key={reward.id}
                  onClick={() => onSelectCommunityReward(reward.id!)}
                  className="group bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-700 rounded-xl p-6 hover:border-purple-400 hover:shadow-lg transform hover:scale-105 transition-all duration-200 text-left"
                >
                  {/* Emoji */}
                  <div className="text-4xl mb-3 text-center">{reward.emoji || '🎯'}</div>

                  {/* Title */}
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-2 text-center">
                    {reward.title}
                  </h4>

                  {/* Progress Bar */}
                  <div className="space-y-1 mb-3">
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>{progressPercent.toFixed(0)}%</span>
                      <span>{reward.currentAmount.toLocaleString()} / {reward.target.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Remaining */}
                  <div className="text-center">
                    <div className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full text-xs font-semibold inline-block">
                      {remaining.toLocaleString()} poeng gjenstår
                    </div>
                  </div>

                  {/* Hover effect */}
                  <div className="mt-3 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold">
                      Klikk for å donere →
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(PosView);