"use client";

import React from 'react';
import { positiveActions } from '@/lib/positiveActions';

interface PodViewProps {
  onSelectAction: (actionId: number, actionName: string, points: number, description: string) => void;
}

const PodView: React.FC<PodViewProps> = ({ onSelectAction }) => {
  // Filtrer kun manuelle handlinger for POD-visningen
  const manualActions = positiveActions.filter(action => action.type === 'manual');

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Velg en positiv handling
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Klikk på en handling for å tildele poeng
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {manualActions.map(action => (
          <button 
            key={action.id} 
            onClick={() => onSelectAction(action.id, action.name, action.points, action.name)}
            className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:border-green-300 hover:shadow-lg transform hover:scale-105 transition-all duration-200 text-center min-h-[140px] flex flex-col justify-center"
          >
            {/* Standardikon for handlingen */}
            <div className="text-3xl mb-3">
              ⭐
            </div>
            
            {/* Handling navn */}
            <span className="font-medium text-gray-900 dark:text-white text-sm leading-tight mb-2 block">
              {action.name}
            </span>
            
            {/* Poeng */}
            <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-1 rounded-full text-sm font-bold mb-2">
              +{action.points} poeng
            </div>

            {/* Klikk-indikator på hover */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Klikk for å velge
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Tilpasset poeng-tildeling */}
      <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-xl">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Egendefinert handling
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Klikk her for å gi poeng for andre positive handlinger
        </p>
        <button 
          onClick={() => onSelectAction(0, 'Egendefinert handling', 0, 'Tilpasset beskrivelse')}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-lg font-medium transition-colors"
        >
          ✏️ Egendefinert poeng-tildeling
        </button>
      </div>
    </div>
  );
};

export default PodView;