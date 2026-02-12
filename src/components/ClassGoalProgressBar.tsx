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
  contrastColor?: string; // Dynamic color for better contrast
}

const ClassGoalProgressBar: React.FC<ClassGoalProgressBarProps> = ({
  title,
  current,
  goal,
  onReset,
  showReset = false,
  fullBleed = false,
  contrastColor,
}) => {
  const percentage = Math.min(100, Math.round((current / (goal || 1)) * 100));
  const isFull = !!fullBleed;
  
  // Use contrast color if provided, otherwise use default dark colors
  const textColor = contrastColor || 'text-gray-900 dark:text-gray-100';
  
  // Create semi-transparent background for better visibility
  const progressContainerStyle = contrastColor ? {
    backgroundColor: contrastColor === '#ffffff' ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.25)'
  } : undefined;
  
  const progressIndicatorStyle = contrastColor ? {
    backgroundColor: contrastColor
  } : undefined;

  return (
    <div className="w-full py-0">
      {/* Progress bar først */}
      <div>
        {isFull ? (
          <div className="-mx-4 sm:-mx-6 lg:-mx-8">
            <Progress 
              value={percentage} 
              className="h-3 rounded-none" 
              containerStyle={progressContainerStyle}
              indicatorStyle={progressIndicatorStyle}
            />
          </div>
        ) : (
          <Progress 
            value={percentage} 
            className="h-3 rounded-none" 
            containerStyle={progressContainerStyle}
            indicatorStyle={progressIndicatorStyle}
          />
        )}
      </div>
      
      {/* Tekst under baren */}
      <div className="flex items-center justify-between gap-3 mt-2">
        <span className={`text-sm font-semibold ${contrastColor ? '' : textColor} truncate`} style={contrastColor ? { color: contrastColor } : undefined}>{title}</span>
        {showReset && onReset && (
          <button
            onClick={onReset}
            className="px-2 py-0.5 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
          >
            🎉 Nullstill
          </button>
        )}
      </div>
      <div className="flex justify-between items-center text-xs font-medium" style={contrastColor ? { color: contrastColor } : undefined}>
        <span className={contrastColor ? '' : textColor}>{current} poeng</span>
        <span className={contrastColor ? '' : textColor}>Mål: {goal} poeng</span>
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
