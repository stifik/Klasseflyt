"use client";

import React from 'react';
import type { Reward } from '@/lib/types';

interface PosViewProps {
  rewards: Reward[];
  onSelectReward: (rewardId: number) => void;
}

const PosView: React.FC<PosViewProps> = ({ rewards, onSelectReward }) => {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Velg en belønning
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
  );
};

export default React.memo(PosView);