"use client";

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { rewards } from '@/lib/rewards';
import { positiveActions } from '@/lib/positiveActions';
import { buyReward, givePoints, type RewardResult } from '@/lib/rewardService';
import PosView from './PosView';
import PodView from './PodView';
import ActivityFeed from './ActivityFeed';

type TerminalMode = 'idle' | 'pos' | 'pod';
type ActiveTransaction = { 
  type: 'reward'; 
  id: number; 
  name: string; 
  cost: number; 
} | { 
  type: 'points'; 
  amount: number; 
  description: string; 
} | null;

const Terminal: React.FC = () => {
  const [mode, setMode] = useState<TerminalMode>('idle');
  const [activeTransaction, setActiveTransaction] = useState<ActiveTransaction>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [customPoints, setCustomPoints] = useState(5);
  const [customDescription, setCustomDescription] = useState('');

  // Hent studenter fra database
  const students = useLiveQuery(() => db.students.toArray()) || [];

  // Vis notifikasjon i 3 sekunder
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSelectReward = (rewardId: number) => {
    const reward = rewards.find(r => r.id === rewardId);
    if (reward) {
      setActiveTransaction({ 
        type: 'reward', 
        id: reward.id, 
        name: reward.name, 
        cost: reward.cost 
      });
    }
  };

  const handleSelectAction = (actionId: number, actionName: string, points: number, description: string) => {
    if (actionId === 0) {
      // Egendefinert handling - vis inputfelter
      setActiveTransaction({ 
        type: 'points', 
        amount: 0, // Vil bli satt av bruker
        description: 'Egendefinert handling' 
      });
    } else {
      // Forhåndsdefinert handling
      setActiveTransaction({ 
        type: 'points', 
        amount: points, 
        description: actionName // Bruk bare handlingsnavnet som beskrivelse
      });
    }
  };

  const handleManualStudentSelect = async (studentId: string) => {
    if (!studentId || !activeTransaction) return;

    // FEILSØKING: Sjekk hva vi faktisk mottar
    console.log('Valgt student-ID fra select:', studentId, typeof studentId);
    console.log('ActiveTransaction:', activeTransaction);
    // Hvis ID ser numerisk ut, vis også numeric parse
    if (/^\d+$/.test(studentId)) {
      console.log('Numeric parse of studentId:', Number(studentId));
    }

    let result: RewardResult;

    if (activeTransaction.type === 'reward') {
      // Sørg for at vi sender riktig type til buyReward
      result = await buyReward(studentId, activeTransaction.id);
    } else if (activeTransaction.type === 'points') {
      result = await givePoints(studentId, activeTransaction.amount, activeTransaction.description);
    } else {
      return;
    }

    showNotification(result.message, result.success ? 'success' : 'error');
    
    // Nullstill for neste transaksjon
    setActiveTransaction(null);
  };

  // Viser "Venter på elev"-skjermen
  if (activeTransaction) {
    const isCustomAction = activeTransaction.type === 'points' && activeTransaction.amount === 0;
    
    return (
      <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Notifikasjon */}
        {notification && (
          <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            notification.type === 'success' 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            {notification.message}
          </div>
        )}

        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">
                {activeTransaction.type === 'reward' ? '🛒' : '⭐'}
              </div>
              
              {activeTransaction.type === 'reward' ? (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Valgt belønning
                  </h2>
                  <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-4 mb-4">
                    <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100">
                      {activeTransaction.name}
                    </h3>
                    <p className="text-blue-700 dark:text-blue-300 font-medium">
                      {activeTransaction.cost} poeng
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {isCustomAction ? 'Egendefinert handling' : 'Tildel poeng'}
                  </h2>
                  
                  {isCustomAction ? (
                    <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-4 mb-4 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-green-900 dark:text-green-100 mb-1">
                          Antall poeng
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={customPoints}
                          onChange={(e) => setCustomPoints(Number(e.target.value))}
                          className="w-full p-2 border border-green-300 dark:border-green-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-green-900 dark:text-green-100 mb-1">
                          Beskrivelse
                        </label>
                        <input
                          type="text"
                          placeholder="Beskriv den positive handlingen"
                          value={customDescription}
                          onChange={(e) => setCustomDescription(e.target.value)}
                          className="w-full p-2 border border-green-300 dark:border-green-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-4 mb-4">
                      <h3 className="text-xl font-semibold text-green-900 dark:text-green-100">
                        +{activeTransaction.amount} poeng
                      </h3>
                      <p className="text-green-700 dark:text-green-300">
                        {activeTransaction.description}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Vennligst identifiser elev
              </h3>
              
              <select 
                defaultValue="" 
                onChange={(e) => {
                  if (isCustomAction && (customPoints <= 0 || !customDescription.trim())) {
                    showNotification('Vennligst fyll ut poeng og beskrivelse', 'error');
                    return;
                  }
                  // Oppdater activeTransaction med custom verdier før behandling
                  if (isCustomAction) {
                    setActiveTransaction({
                      type: 'points',
                      amount: customPoints,
                      description: customDescription
                    });
                    // Kort delay for å la state oppdateres
                    setTimeout(() => handleManualStudentSelect(e.target.value), 50);
                  } else {
                    handleManualStudentSelect(e.target.value);
                  }
                }}
                className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg"
              >
                <option value="" disabled>Velg elev fra listen...</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} ({student.points || 0} poeng)
                  </option>
                ))}
              </select>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => {
                    setActiveTransaction(null);
                    setCustomPoints(5);
                    setCustomDescription('');
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 px-6 rounded-lg font-medium transition-colors"
                >
                  Avbryt transaksjon
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'pos') {
    return (
      <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Notifikasjon */}
        {notification && (
          <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            notification.type === 'success' 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            {notification.message}
          </div>
        )}

        <div className="max-w-6xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">🛒 Butikk</h2>
                <p className="text-gray-600 dark:text-gray-400">Point of Sale (POS)</p>
              </div>
              <button 
                onClick={() => setMode('idle')}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors"
              >
                Tilbake til Terminal
              </button>
            </div>
            
            <PosView rewards={rewards} onSelectReward={handleSelectReward} />
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'pod') {
    return (
      <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Notifikasjon */}
        {notification && (
          <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            notification.type === 'success' 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            {notification.message}
          </div>
        )}

        <div className="max-w-6xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">⭐ Handlinger</h2>
                <p className="text-gray-600 dark:text-gray-400">Point of Deposit (POD)</p>
              </div>
              <button 
                onClick={() => setMode('idle')}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors"
              >
                Tilbake til Terminal
              </button>
            </div>
            
            <PodView onSelectAction={handleSelectAction} />
          </div>
        </div>
      </div>
    );
  }

  // Hovedmeny (idle-modus)
  return (
    <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            🏪 Terminal
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Rask arbeidsflyt for masse-transaksjoner
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* POS-knapp */}
          <button 
            onClick={() => setMode('pos')}
            className="group bg-blue-500 hover:bg-blue-600 text-white p-8 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-bold mb-2">Butikk</h2>
            <p className="text-blue-100 mb-3">Point of Sale (POS)</p>
            <p className="text-sm text-blue-200">
              Selg belønninger til elever
            </p>
          </button>

          {/* POD-knapp */}
          <button 
            onClick={() => setMode('pod')}
            className="group bg-green-500 hover:bg-green-600 text-white p-8 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            <div className="text-6xl mb-4">⭐</div>
            <h2 className="text-2xl font-bold mb-2">Handlinger</h2>
            <p className="text-green-100 mb-3">Point of Deposit (POD)</p>
            <p className="text-sm text-green-200">
              Gi poeng for positive handlinger
            </p>
          </button>
        </div>

        <div className="text-center mt-8">
          <p className="text-gray-500 dark:text-gray-400">
            💡 Tip: NFC-støtte kommer som en snarvei senere
          </p>
        </div>
        
        {/* ActivityFeed nederst */}
        <div className="mt-12">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
};

export default Terminal;