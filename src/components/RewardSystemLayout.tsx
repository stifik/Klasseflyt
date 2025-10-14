"use client";

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Settings, ArrowLeft } from 'lucide-react';
import ClassGoalProgressBar from './ClassGoalProgressBar';
import { db } from '@/lib/db';

interface RewardSystemLayoutProps {
  children: React.ReactNode;
  showBackButton?: boolean;
  backButtonHref?: string;
}

const RewardSystemLayout: React.FC<RewardSystemLayoutProps> = ({ 
  children, 
  showBackButton = false,
  backButtonHref = "/"
}) => {
  const pathname = usePathname();
  const [classTotal, setClassTotal] = useState<number>(0);
  const [goal, setGoal] = useState<{ target: number; lastAchieved?: string }>({ target: 200 });
  const [goalTitle, setGoalTitle] = useState<string>('Felles belønning');
  const [showReset, setShowReset] = useState(false);

  // Sjekk om vi er på terminal-sider (inkludert /terminal/pos, /terminal/pod)
  const isOnTerminal = pathname.startsWith('/terminal');

  // Hent data for progress bar
  useEffect(() => {
    if (!isOnTerminal) return;

    let mounted = true;
    
    async function getClassTotalPoints() {
      const transactions = await db.transactions.toArray();
      // Only count positive transactions (earned points), not negative (spent points)
      return transactions.reduce((sum, t) => {
        const change = t.pointsChange || 0;
        return change > 0 ? sum + change : sum;
      }, 0);
    }

    async function getClassGoal() {
      const settings = await db.settings.get('userSettings');
      return settings?.classGoal || { target: 200 };
    }

    async function fetchData() {
      const [total, g] = await Promise.all([getClassTotalPoints(), getClassGoal()]);
      const settings = await db.settings.get('userSettings');
      if (mounted) {
        setClassTotal(total);
        setGoal(g);
        setGoalTitle(settings?.communityGoalTitle || 'Felles belønning');
        setShowReset(total >= (g.target || 1));
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => { mounted = false; clearInterval(interval); };
  }, [isOnTerminal]);

  const handleReset = async () => {
    const settings = await db.settings.get('userSettings');
    if (settings) {
      const target = settings.classGoal?.target ?? 200;
      settings.classGoal = { target, lastAchieved: new Date().toISOString() };
      await db.settings.put(settings);
      await db.transactions.clear();
      setClassTotal(0);
      setShowReset(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Header with navigation */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              {showBackButton && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={backButtonHref} className="flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Tilbake til Klasseflyt
                  </Link>
                </Button>
              )}
              <Link href="/terminal" className="text-xl font-semibold text-foreground hover:text-primary transition-colors cursor-pointer">
                Belønningssystem
              </Link>
            </div>
            
            {/* Settings button - always visible */}
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Innstillinger
              </Link>
            </Button>
          </div>
          
          
        </div>
        {/* Progress bar - kun på terminal-sider (full-bleed) */}
        {isOnTerminal && (
          <div className="w-full">
            <div className="max-w-7xl mx-auto px-4 py-0">
              <ClassGoalProgressBar
                title={goalTitle}
                current={classTotal}
                goal={goal.target}
                showReset={showReset}
                onReset={handleReset}
                fullBleed
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto p-4">
        {children}
      </main>
    </div>

  );

};

export default RewardSystemLayout;