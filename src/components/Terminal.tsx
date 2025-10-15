"use client";

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { Reward } from '@/lib/types';
import { buyReward, givePoints, type RewardResult } from '@/lib/rewardService';
import PosView from './PosView';
import PodView from './PodView';
import ActivityFeed from './ActivityFeed';
import RewardDashboard from './RewardDashboard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

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
} | {
  type: 'custom_action';
  name: string;
  points: number;
} | null;

const Terminal: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  
  // Bestem mode fra URL
  const getCurrentMode = (): TerminalMode => {
    if (pathname.includes('/terminal/pos')) return 'pos';
    if (pathname.includes('/terminal/pod')) return 'pod';
    return 'idle';
  };
  
  const mode = getCurrentMode();
  
  const [activeTransaction, setActiveTransaction] = useState<ActiveTransaction>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Custom action dialog state
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customActionName, setCustomActionName] = useState('');
  const [customActionPoints, setCustomActionPoints] = useState('');

  // Hent studenter og belønninger fra database
  const students = useLiveQuery(() => db.students.toArray()) || [];
  const rewards = useLiveQuery(() => db.rewards.toArray()) || [];

  // Vis notifikasjon i 3 sekunder
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSelectReward = (rewardId: number) => {
    const reward = rewards.find((r: Reward) => r.id === rewardId);
    if (reward) {
      setActiveTransaction({ 
        type: 'reward', 
        id: reward.id, 
        name: reward.name, 
        cost: reward.currentPrice || reward.cost 
      });
    }
  };

  const handleCustomActionInitiation = () => {
    setShowCustomDialog(true);
  };

  const handleCustomDialogSubmit = () => {
    if (!customActionName.trim()) {
      showNotification('Vennligst skriv inn en beskrivelse', 'error');
      return;
    }
    
    const points = parseInt(customActionPoints, 10);
    if (isNaN(points) || points <= 0) {
      showNotification('Ugyldig tall for poeng', 'error');
      return;
    }
    
    console.log('🎯 Setter custom_action transaction:', { name: customActionName, points, type: typeof points });
    setActiveTransaction({ type: 'custom_action', name: customActionName, points });
    setShowCustomDialog(false);
    setCustomActionName('');
    setCustomActionPoints('');
  };

  const handleSelectAction = (actionId: number, actionName: string, points: number, description: string) => {
    if (actionId === 0) {
      // Egendefinert handling - trigger prompt-basert input
      handleCustomActionInitiation();
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

    console.log('🎯 Fullfører transaksjon for elev:', studentId, 'med data:', activeTransaction);

    let result: RewardResult;

    if (activeTransaction.type === 'reward') {
      result = await buyReward(studentId, activeTransaction.id);
    } else if (activeTransaction.type === 'custom_action') {
      console.log('🎯 Custom action - gir poeng:', {
        studentId,
        points: activeTransaction.points,
        pointsType: typeof activeTransaction.points,
        name: activeTransaction.name
      });
      result = await givePoints(studentId, activeTransaction.points, activeTransaction.name);
      if (result.success) {
        showNotification(`Ga ${activeTransaction.points} poeng til eleven for '${activeTransaction.name}'.`, 'success');
      }
    } else if (activeTransaction.type === 'points') {
      console.log('🎯 Forhåndsdefinert handling - gir poeng:', {
        studentId,
        amount: activeTransaction.amount,
        amountType: typeof activeTransaction.amount,
        description: activeTransaction.description
      });
      result = await givePoints(studentId, activeTransaction.amount, activeTransaction.description);
    } else {
      return;
    }

    if (!result.success || activeTransaction.type !== 'custom_action') {
      showNotification(result.message, result.success ? 'success' : 'error');
    }
    
    // Nullstill for neste transaksjon
    setActiveTransaction(null);
  };

  let content;
  if (activeTransaction) {
    content = (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">
              {activeTransaction.type === 'reward' ? '🛒' : '⭐'}
            </div>
            {activeTransaction.type === 'reward' ? (
              <React.Fragment>
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
              </React.Fragment>
            ) : activeTransaction.type === 'custom_action' ? (
              <React.Fragment>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Egendefinert handling
                </h2>
                <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-4 mb-4">
                  <h3 className="text-xl font-semibold text-green-900 dark:text-green-100">
                    +{activeTransaction.points} poeng
                  </h3>
                  <p className="text-green-700 dark:text-green-300">
                    {activeTransaction.name}
                  </p>
                </div>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Tildel poeng
                </h2>
                <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-4 mb-4">
                  <h3 className="text-xl font-semibold text-green-900 dark:text-green-100">
                    +{activeTransaction.amount} poeng
                  </h3>
                  <p className="text-green-700 dark:text-green-300">
                    {activeTransaction.description}
                  </p>
                </div>
              </React.Fragment>
            )}
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Vennligst identifiser elev
            </h3>
            <select 
              defaultValue="" 
              onChange={(e) => handleManualStudentSelect(e.target.value)}
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
                onClick={() => setActiveTransaction(null)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 px-6 rounded-lg font-medium transition-colors"
              >
                Avbryt transaksjon
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  } else if (mode === 'pos') {
    // POS mode - vis belønninger
    content = (
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col gap-8">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">🛒 Butikk</h2>
            <p className="text-gray-600 dark:text-gray-400">Velg en belønning</p>
          </div>
          <PosView rewards={rewards} onSelectReward={handleSelectReward} />
          <button
            className="w-full py-3 px-6 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold text-lg shadow-md transition-colors"
            onClick={() => router.push('/terminal')}
          >
            Tilbake til Terminal
          </button>
        </div>
      </div>
    );
  } else if (mode === 'pod') {
    // POD mode - vis handlinger
    content = (
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col gap-8">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">⭐ Handlinger</h2>
            <p className="text-gray-600 dark:text-gray-400">Velg en positiv handling</p>
          </div>
          <PodView onSelectAction={handleSelectAction} />
          <button
            className="w-full py-3 px-6 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold text-lg shadow-md transition-colors"
            onClick={() => router.push('/terminal')}
          >
            Tilbake til Terminal
          </button>
        </div>
      </div>
    );
  } else {
    // Idle mode - vis hovedmeny
    content = (
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
            onClick={() => router.push('/terminal/pos')}
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
            onClick={() => router.push('/terminal/pod')}
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
        
        {/* ActivityFeed og RewardDashboard side ved side */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <ActivityFeed />
          </div>
          <div>
            <RewardDashboard />
          </div>
        </div>
      </div>
    );
  }

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
      
      {/* Custom Action Dialog */}
      <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Egendefinert poeng-tildeling</DialogTitle>
            <DialogDescription>
              Gi poeng for en spesiell handling som ikke er på listen
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="action-name">Beskriv handlingen</Label>
              <Input
                id="action-name"
                placeholder="f.eks. Ryddet klasserommet"
                value={customActionName}
                onChange={(e) => setCustomActionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customActionName && customActionPoints) {
                    handleCustomDialogSubmit();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="action-points">Antall poeng</Label>
              <Input
                id="action-points"
                type="number"
                placeholder="f.eks. 20"
                min="1"
                value={customActionPoints}
                onChange={(e) => setCustomActionPoints(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customActionName && customActionPoints) {
                    handleCustomDialogSubmit();
                  }
                }}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowCustomDialog(false);
                setCustomActionName('');
                setCustomActionPoints('');
              }}
            >
              Avbryt
            </Button>
            <Button onClick={handleCustomDialogSubmit}>
              Bekreft
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {content}
    </div>
  );
};

export default Terminal;