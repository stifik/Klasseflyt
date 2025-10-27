"use client";

import React from 'react';
import { Progress } from './ui/progress';

interface ClassGoalProgressBarProps {
  title: string;
  current: number;
  goal: number;
  onReset?: () => void;
  showReset?: boolean;
  fullBleed?: boolean;
}

const ClassGoalProgressBar: React.FC<ClassGoalProgressBarProps> = ({
  title,
  current,
  goal,
  onReset,
  showReset = false,
  fullBleed = false,
}) => {
  const percentage = Math.min(100, Math.round((current / (goal || 1)) * 100));
  const isFull = !!fullBleed;

  return (
    <div className="w-full py-0">
      {/* Progress bar først */}
      <div>
        {isFull ? (
          <div className="-mx-4 sm:-mx-6 lg:-mx-8">
            <Progress value={percentage} className="h-2 rounded-none" />
          </div>
        ) : (
          <Progress value={percentage} className="h-2 rounded-none" />
        )}
      </div>
      
      {/* Tekst under baren */}
      <div className="flex items-center justify-between gap-3 mt-1">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{title}</span>
        {showReset && onReset && (
          <button
            onClick={onReset}
            className="px-2 py-0.5 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
          >
            🎉 Nullstill
          </button>
        )}
      </div>
      <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
        <span>{current} poeng</span>
        <span>Mål: {goal} poeng</span>
      </div>
      
      {showReset && (
        <div className="mt-1 text-xs text-green-700 dark:text-green-300 font-medium text-center">
          Målet er nådd! Tid for felles belønning 🎉
        </div>
      )}
    </div>
  );
};

export default ClassGoalProgressBar;
