"use client";

import * as React from "react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function ActionsSettings() {
  const { toast } = useToast();
  
  // Load actions from database
  const allActions = useLiveQuery(() => db.actions.toArray()) || [];
  const manualActions = allActions.filter(action => action.type === 'manual');
  const systemActions = allActions.filter(action => action.type === 'system');
  
  // Form states for new action
  const [newActionName, setNewActionName] = useState('');
  const [newActionPoints, setNewActionPoints] = useState('');
  const [newActionEmoji, setNewActionEmoji] = useState('⭐');
  
  // Edit states
  const [editingActionId, setEditingActionId] = useState<number | null>(null);
  const [editingActionName, setEditingActionName] = useState('');
  const [editingActionPoints, setEditingActionPoints] = useState('');
  const [editingActionEmoji, setEditingActionEmoji] = useState('');
  
  // Common emojis for actions
  const commonEmojis = ['⭐', '💪', '🤝', '⏰', '🙋', '👍', '🎯', '✨', '🔥', '🏆', '📚', '✅', '💯', '🎉'];

  const handleAddAction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newActionName.trim() || !newActionPoints) {
      toast({
        title: "Feil",
        description: "Fyll inn både navn og poeng",
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

    try {
      await db.actions.add({
        name: newActionName.trim(),
        points: points,
        type: 'manual',
        emoji: newActionEmoji,
      } as any);
      
      setNewActionName('');
      setNewActionPoints('');
      setNewActionEmoji('⭐');
      
      toast({
        title: "Lagt til",
        description: `${newActionEmoji} ${newActionName} (+${points} poeng)`,
      });
    } catch (error) {
      console.error('Error adding action:', error);
      toast({
        title: "Feil",
        description: "Kunne ikke legge til handling",
        variant: "destructive",
      });
    }
  };

  const handleEditAction = (action: any) => {
    setEditingActionId(action.id);
    setEditingActionName(action.name);
    setEditingActionPoints(action.points.toString());
    setEditingActionEmoji(action.emoji || '⭐');
  };

  const handleSaveAction = async () => {
    if (!editingActionId || !editingActionName.trim() || !editingActionPoints) return;

    const points = parseInt(editingActionPoints);
    if (isNaN(points) || points <= 0) {
      toast({
        title: "Feil",
        description: "Poeng må være et positivt tall",
        variant: "destructive",
      });
      return;
    }

    try {
      await db.actions.update(editingActionId, {
        name: editingActionName.trim(),
        points: points,
        emoji: editingActionEmoji,
      });
      
      setEditingActionId(null);
      toast({
        title: "Oppdatert",
        description: "Handlingen er oppdatert",
      });
    } catch (error) {
      console.error('Error updating action:', error);
      toast({
        title: "Feil",
        description: "Kunne ikke oppdatere handling",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingActionId(null);
    setEditingActionName('');
    setEditingActionPoints('');
    setEditingActionEmoji('');
  };

  const handleDeleteAction = async (actionId: number, actionName: string) => {
    if (!confirm(`Er du sikker på at du vil slette "${actionName}"?`)) return;

    try {
      await db.actions.delete(actionId);
      toast({
        title: "Slettet",
        description: `${actionName} er fjernet`,
      });
    } catch (error) {
      console.error('Error deleting action:', error);
      toast({
        title: "Feil",
        description: "Kunne ikke slette handling",
        variant: "destructive",
      });
    }
  };

  const handleUpdateSystemActionPoints = async (actionId: number, newPoints: number) => {
    if (isNaN(newPoints) || newPoints <= 0) return;

    try {
      await db.actions.update(actionId, { points: newPoints });
      toast({
        title: "Oppdatert",
        description: "Poeng er oppdatert",
      });
    } catch (error) {
      console.error('Error updating system action:', error);
      toast({
        title: "Feil",
        description: "Kunne ikke oppdatere poeng",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>⭐ Administrer Handlinger (POD)</CardTitle>
        <CardDescription>
          Konfigurer positive handlinger som kan gi poeng til elevene i POD-terminalen
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Accordion type="multiple" defaultValue={['manual']} className="w-full">
          {/* Manual Actions - Editable */}
          <AccordionItem value="manual" className="border-b-0">
            <AccordionTrigger>Manuelle handlinger ({manualActions.length})</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Disse handlingene kan du velge manuelt i POD-terminalen for å tildele poeng.
              </p>
              
              {/* Add new action form */}
              <form onSubmit={handleAddAction} className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="space-y-2">
                  <Label>Emoji</Label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-3xl hover:scale-110 transition-transform p-2 border rounded"
                      onClick={() => {
                        const newEmoji = prompt('Skriv inn emoji:', newActionEmoji);
                        if (newEmoji && newEmoji.trim()) {
                          setNewActionEmoji(newEmoji.trim());
                        }
                      }}
                    >
                      {newActionEmoji}
                    </button>
                    <div className="flex flex-wrap gap-1 flex-1">
                      {commonEmojis.map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          className="text-xl hover:scale-110 transition-transform p-1"
                          onClick={() => setNewActionEmoji(emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Handlingsnavn (f.eks. 'Hjalp en medelev')"
                    value={newActionName}
                    onChange={(e) => setNewActionName(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Poeng"
                    value={newActionPoints}
                    onChange={(e) => setNewActionPoints(e.target.value)}
                    className="w-28"
                    min="1"
                  />
                  <Button type="submit">
                    <Plus className="w-4 h-4 mr-2" />
                    Legg til
                  </Button>
                </div>
              </form>

              {/* Manual actions list */}
              <div className="space-y-2">
                {manualActions.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    Ingen manuelle handlinger lagt til ennå
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {manualActions.map((action) => (
                      <li key={action.id} className="p-3 rounded-md bg-secondary border border-gray-200 dark:border-gray-700">
                        {editingActionId === action.id ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="text-2xl hover:scale-110 transition-transform p-1 border rounded"
                                onClick={() => {
                                  const newEmoji = prompt('Velg emoji:', editingActionEmoji);
                                  if (newEmoji && newEmoji.trim()) {
                                    setEditingActionEmoji(newEmoji.trim());
                                  }
                                }}
                              >
                                {editingActionEmoji}
                              </button>
                              <Input
                                value={editingActionName}
                                onChange={(e) => setEditingActionName(e.target.value)}
                                placeholder="Handlingsnavn..."
                                className="flex-1"
                              />
                              <Input
                                type="number"
                                value={editingActionPoints}
                                onChange={(e) => setEditingActionPoints(e.target.value)}
                                placeholder="Poeng"
                                className="w-24"
                                min="1"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={handleSaveAction} className="flex-1">
                                <Check className="w-4 h-4 mr-2" />
                                Lagre
                              </Button>
                              <Button size="sm" variant="outline" onClick={handleCancelEdit} className="flex-1">
                                <X className="w-4 h-4 mr-2" />
                                Avbryt
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{action.emoji || '⭐'}</span>
                              <div>
                                <p className="font-medium">{action.name}</p>
                                <p className="text-sm text-green-600 dark:text-green-400">+{action.points} poeng</p>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEditAction(action)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDeleteAction(action.id, action.name)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* System Actions - Points only editable */}
          <AccordionItem value="system" className="border-b-0">
            <AccordionTrigger>System-handlinger ({systemActions.length})</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Disse handlingene gis automatisk av appen (f.eks. når lekser godkjennes). Du kan justere poengverdien.
              </p>
              <div className="space-y-2">
                {systemActions.map((action) => (
                  <div 
                    key={action.id} 
                    className="p-3 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{action.emoji || '✅'}</span>
                        <div>
                          <p className="font-medium">{action.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Gis automatisk av systemet</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`system-action-${action.id}`} className="text-sm">Poeng:</Label>
                        <Input
                          id={`system-action-${action.id}`}
                          type="number"
                          defaultValue={action.points}
                          onBlur={(e) => {
                            const newPoints = parseInt(e.target.value);
                            if (newPoints !== action.points && !isNaN(newPoints) && newPoints > 0) {
                              handleUpdateSystemActionPoints(action.id, newPoints);
                            }
                          }}
                          className="w-20"
                          min="1"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
