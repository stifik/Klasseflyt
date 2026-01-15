"use client";

import React from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

interface PenViewProps {
  onSelectPenalty: (penaltyId: number, penaltyName: string, points: number, description: string) => void;
}

const PenView: React.FC<PenViewProps> = ({ onSelectPenalty }) => {
  // Hent alle handlinger fra database - filter for penalties (negative poeng)
  const allActions = useLiveQuery(() => db.actions.toArray(), []) ?? [];
  const penaltyActions = allActions.filter(action => action.type === 'penalty');

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Velg en straffehandling
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Klikk på en handling for å trekke poeng
        </p>
      </div>

      {/* Straffehandlinger */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
          Straffehandlinger
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {penaltyActions.map(action => (
            <button 
              key={action.id} 
              onClick={() => onSelectPenalty(action.id, action.name, Math.abs(action.points), action.name)}
              className="group bg-white dark:bg-gray-800 border-2 border-red-200 dark:border-red-800 rounded-xl p-6 hover:border-red-400 hover:shadow-lg transform hover:scale-105 transition-all duration-200 text-center min-h-[140px] flex flex-col justify-center"
            >
              {/* Ikon for straffehandlingen */}
              <div className="text-3xl mb-3">
                {action.emoji || '⚠️'}
              </div>
          
              {/* Handling navn */}
              <span className="font-medium text-gray-900 dark:text-white text-sm leading-tight mb-2 block">
                {action.name}
              </span>
          
              {/* Poeng (negativt) */}
              <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-3 py-1 rounded-full text-sm font-bold mb-2">
                -{Math.abs(action.points)} poeng
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

        {/* Melding hvis ingen straffehandlinger er konfigurert */}
        {penaltyActions.length === 0 && (
          <div className="text-center py-12 bg-orange-50 dark:bg-orange-900/10 rounded-xl border-2 border-dashed border-orange-300 dark:border-orange-700">
            <div className="text-4xl mb-4">⚠️</div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Ingen straffehandlinger konfigurert
            </h4>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Gå til innstillinger for å legge til straffehandlinger
            </p>
            <a 
              href="/settings#actions"
              className="inline-block bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
            >
              Gå til innstillinger
            </a>
          </div>
        )}
      </div>

      {/* Egendefinert straff */}
      <div className="p-6 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Egendefinert straff
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Klikk her for å trekke poeng for andre handlinger
        </p>
        <button 
          onClick={() => onSelectPenalty(0, 'Egendefinert straff', 0, 'Tilpasset beskrivelse')}
          className="w-full bg-red-500 hover:bg-red-600 text-white py-3 px-6 rounded-lg font-medium transition-colors shadow-md"
        >
          ✏️ Egendefinert straff
        </button>
      </div>

      {/* Advarsel */}
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <div className="flex gap-3">
          <div className="text-2xl">⚠️</div>
          <div>
            <h5 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
              Advarsel
            </h5>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Straffehandlinger kan føre til negativ saldo. Bruk med omtanke.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(PenView);
