"use client";

import React, { useState, useEffect } from 'react';
import { positiveActions, type PositiveAction } from '@/lib/positiveActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Settings, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import RewardSettings from './RewardSettings';

interface SettingsPageProps {
  // onBack prop er ikke lenger nødvendig siden layout håndterer navigasjon
}

export default function SettingsPage({}: SettingsPageProps) {
  const { toast } = useToast();
  
  // Felles belønning (classGoal)
  const [goalTarget, setGoalTarget] = useState<number>(200);
  const [goalTitle, setGoalTitle] = useState<string>('Felles belønning');
  const [goalLoading, setGoalLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchGoal() {
      setGoalLoading(true);
      const settings = await db.settings.get('userSettings');
      if (mounted) {
        if (settings?.classGoal?.target) setGoalTarget(settings.classGoal.target);
        if (settings?.communityGoalTitle) setGoalTitle(settings.communityGoalTitle);
      }
      setGoalLoading(false);
    }
    fetchGoal();
    return () => { mounted = false; };
  }, []);

  const handleGoalChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(goalTarget);
    if (isNaN(val) || val < 1) {
      toast({ title: 'Feil', description: 'Målsum må være et positivt tall', variant: 'destructive' });
      return;
    }
    const settings = await db.settings.get('userSettings');
    if (settings) {
      settings.classGoal = { ...settings.classGoal, target: val };
      settings.communityGoalTitle = goalTitle;
      await db.settings.put(settings);
      toast({ title: 'Lagret', description: 'Innstillinger for felles belønning er oppdatert!' });
    }
  };
  
  const [localActions, setLocalActions] = useState<PositiveAction[]>(positiveActions);
  
  // Form states for adding new items
  const [newActionName, setNewActionName] = useState('');
  const [newActionPoints, setNewActionPoints] = useState('');



  // Handlers for positive actions
  const handleAddAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionName.trim() || !newActionPoints.trim()) {
      toast({
        title: "Feil",
        description: "Vennligst fyll ut både navn og poeng",
        variant: "destructive",
      });
      return;
    }

    const points = parseInt(newActionPoints);
    if (isNaN(points) || points <= 0) {
      toast({
        title: "Feil",
        description: "Poeng må være et positivt tall",
        variant: "destructive",
      });
      return;
    }

    const newAction: PositiveAction = {
      id: Math.max(...localActions.map(a => a.id), 0) + 1,
      name: newActionName.trim(),
      points,
      type: 'manual', // Nye handlinger er alltid manuelle
    };

    setLocalActions([...localActions, newAction]);
    setNewActionName('');
    setNewActionPoints('');
    
    toast({
      title: "Suksess",
      description: `Handling "${newAction.name}" lagt til`,
    });
  };

  const handleDeleteAction = (id: number) => {
    const action = localActions.find(a => a.id === id);
    
    // Ikke tillat sletting av system-handlinger
    if (action?.type === 'system') {
      toast({
        title: "Kan ikke slette",
        description: "System-handlinger kan ikke slettes, kun redigeres.",
        variant: "destructive",
      });
      return;
    }
    
    setLocalActions(localActions.filter(a => a.id !== id));
    
    toast({
      title: "Slettet",
      description: `Handling "${action?.name}" fjernet`,
    });
  };

  return (
    <div>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="w-6 h-6" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Innstillinger for Belønningssystem
          </h1>
        </div>

        {/* New Reward Settings Component with Simple/Advanced tabs */}
        <RewardSettings />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Felles belønning - målsum */}
          <Card className="max-w-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                🎯 Felles belønning
              </CardTitle>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Sett mål for klassen
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <form onSubmit={handleGoalChange} className="flex flex-col gap-3">
                <div className="space-y-1">
                  <Label htmlFor="goal-title" className="text-sm">Tittel</Label>
                  <Input
                    id="goal-title"
                    type="text"
                    value={goalLoading ? '' : goalTitle}
                    onChange={e => setGoalTitle(e.target.value)}
                    placeholder="Felles belønning"
                    className="h-9"
                    disabled={goalLoading}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="goal-target" className="text-sm">Målsum (poeng)</Label>
                  <Input
                    id="goal-target"
                    type="number"
                    min="1"
                    value={goalLoading ? '' : goalTarget}
                    onChange={e => setGoalTarget(Number(e.target.value))}
                    className="h-9"
                    disabled={goalLoading}
                  />
                </div>
                <Button type="submit" className="w-fit" size="sm">Lagre</Button>
              </form>
            </CardContent>
          </Card>
          {/* Administrer Handlinger (POD) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                ⭐ Administrer Handlinger (POD)
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Administrer positive handlinger som gir poeng til elever
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Liste over eksisterende handlinger */}
              <div className="space-y-2">
                <h3 className="font-medium text-gray-900 dark:text-white">Nåværende handlinger:</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {/* System-handlinger først */}
                  {localActions.filter(action => action.type === 'system').length > 0 && (
                    <>
                      <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-4">System-handlinger (kan kun justere poeng):</h4>
                      {localActions.filter(action => action.type === 'system').map((action) => (
                        <div key={action.id} className="flex items-center justify-between p-2 border rounded bg-white dark:bg-gray-800">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={action.name}
                                readOnly={true}
                                className="font-medium bg-transparent border-none p-0 text-sm text-gray-500 cursor-not-allowed"
                              />
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">System</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <input
                                type="number"
                                value={action.points}
                                min="1"
                                className="w-16 text-sm border rounded px-2 py-1"
                                onChange={(e) => {
                                  const points = parseInt(e.target.value);
                                  if (!isNaN(points) && points > 0) {
                                    setLocalActions(actions => 
                                      actions.map(a => a.id === action.id ? { ...a, points } : a)
                                    );
                                  }
                                }}
                              />
                              <span className="text-sm text-gray-500">poeng</span>
                            </div>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteAction(action.id)}
                            disabled={true}
                            className="opacity-50 cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </>
                  )}
                  
                  {/* Manuelle handlinger */}
                  {localActions.filter(action => action.type === 'manual').length > 0 && (
                    <>
                      <h4 className="text-sm font-medium text-green-600 dark:text-green-400 mt-4">Manuelle handlinger (kan redigeres fritt):</h4>
                      {localActions.filter(action => action.type === 'manual').map((action) => (
                        <div key={action.id} className="flex items-center justify-between p-2 border rounded bg-white dark:bg-gray-800">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={action.name}
                                className="font-medium bg-transparent border-none p-0 text-sm text-gray-900 dark:text-white"
                                onChange={(e) => {
                                  setLocalActions(actions => 
                                    actions.map(a => a.id === action.id ? { ...a, name: e.target.value } : a)
                                  );
                                }}
                              />
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <input
                                type="number"
                                value={action.points}
                                min="1"
                                className="w-16 text-sm border rounded px-2 py-1"
                                onChange={(e) => {
                                  const points = parseInt(e.target.value);
                                  if (!isNaN(points) && points > 0) {
                                    setLocalActions(actions => 
                                      actions.map(a => a.id === action.id ? { ...a, points } : a)
                                    );
                                  }
                                }}
                              />
                              <span className="text-sm text-gray-500">poeng</span>
                            </div>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteAction(action.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </>
                  )}
                  
                  {localActions.length === 0 && (
                    <p className="text-gray-500 text-center py-4">Ingen handlinger ennå</p>
                  )}
                </div>
              </div>

              {/* Skjema for å legge til ny handling */}
              <form onSubmit={handleAddAction} className="space-y-3 pt-4 border-t">
                <h3 className="font-medium text-gray-900 dark:text-white">Legg til ny handling:</h3>
                <div>
                  <Label htmlFor="action-name">Navn på handling</Label>
                  <Input
                    id="action-name"
                    placeholder="f.eks. iPad ladet"
                    value={newActionName}
                    onChange={(e) => setNewActionName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="action-points">Poeng å gi</Label>
                  <Input
                    id="action-points"
                    type="number"
                    placeholder="f.eks. 5"
                    min="1"
                    value={newActionPoints}
                    onChange={(e) => setNewActionPoints(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Legg til ny handling
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">💡 Tips:</h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Hold belønningene enkle og oppnåelige for å motivere elevene</li>
            <li>• Variere poengverdiene basert på hvor utfordrende handlingen er</li>
            <li>• Oppdater listen regelmessig basert på hva som motiverer klassen din</li>
          </ul>
        </div>
      </div>
    </div>
  );
}