'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { X, ArrowRight } from 'lucide-react';

interface DashboardTourProps {
  open: boolean;
  onComplete: () => void;
}

export function DashboardTour({ open, onComplete }: DashboardTourProps) {
  const [step, setStep] = useState(1);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [settingsButtonRect, setSettingsButtonRect] = useState<DOMRect | null>(null);
  const [sidebarRect, setSidebarRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (open) {
      // Get position of settings button (top-right of dashboard)
      const settingsButton = document.querySelector('[data-tour="settings-button"]');
      if (settingsButton) {
        setSettingsButtonRect(settingsButton.getBoundingClientRect());
      }

      // Get position of sidebar
      const sidebar = document.querySelector('[data-tour="sidebar"]');
      if (sidebar) {
        setSidebarRect(sidebar.getBoundingClientRect());
      }
    }
  }, [open, step]);

  const handleComplete = () => {
    if (dontShowAgain && typeof window !== 'undefined') {
      localStorage.setItem('dashboardTourCompleted', 'true');
    }
    onComplete();
  };

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else {
      handleComplete();
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={handleComplete} />

      {/* Step 1: Settings Button */}
      {step === 1 && settingsButtonRect && (
        <Card 
          className="fixed z-50 max-w-sm shadow-2xl"
          style={{
            top: settingsButtonRect.bottom + 16,
            right: 16,
          }}
        >
          <CardContent className="pt-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">Innstillinger</h3>
              <Button variant="ghost" size="icon" onClick={handleComplete}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-muted-foreground mb-4">
              Her finner du innstillinger for dashbordet. Du kan tilpasse hvilke verktøy som vises og i hvilken rekkefølge.
            </p>
            <div className="flex items-center gap-4">
              <Button onClick={handleNext}>
                Neste
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <span className="text-sm text-muted-foreground">1 av 2</span>
            </div>
          </CardContent>
          {/* Arrow pointing up to settings button */}
          <div 
            className="absolute w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-white"
            style={{
              top: -8,
              right: 24,
            }}
          />
        </Card>
      )}

      {/* Step 2: Sidebar */}
      {step === 2 && sidebarRect && (
        <Card 
          className="fixed z-50 max-w-sm shadow-2xl"
          style={{
            top: sidebarRect.top + sidebarRect.height / 2 - 100,
            left: sidebarRect.right + 16,
          }}
        >
          <CardContent className="pt-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">Sidepanel</h3>
              <Button variant="ghost" size="icon" onClick={handleComplete}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-muted-foreground mb-4">
              Bruk sidepanelet til å navigere mellom ulike verktøy i Klasseflyt. Klikk på et ikon for å åpne verktøyet.
            </p>
            <div className="flex items-center gap-3 mb-4">
              <Checkbox
                id="dontShowAgain"
                checked={dontShowAgain}
                onCheckedChange={(checked) => setDontShowAgain(checked === true)}
              />
              <label 
                htmlFor="dontShowAgain"
                className="text-sm cursor-pointer"
              >
                Ikke vis denne turen igjen
              </label>
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={handleComplete}>
                Ferdig
              </Button>
              <span className="text-sm text-muted-foreground">2 av 2</span>
            </div>
          </CardContent>
          {/* Arrow pointing left to sidebar */}
          <div 
            className="absolute w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent border-r-white"
            style={{
              top: '50%',
              left: -8,
              transform: 'translateY(-50%)',
            }}
          />
        </Card>
      )}
    </>
  );
}
