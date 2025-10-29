"use client";

import React, { useState, useEffect } from 'react';
import type { Reward, RewardSystemSettings } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Trash2, Plus, TrendingUp, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

export default function RewardSettings() {
  const { toast } = useToast();
  
  // Load rewards and settings from database
  const localRewards = useLiveQuery(() => db.rewards.toArray()) || [];
  const dbSettings = useLiveQuery(() => db.settings.get('userSettings'));
  
  // Form states
  const [newRewardName, setNewRewardName] = useState('');
  const [newRewardCost, setNewRewardCost] = useState('');
  const [newRewardEmoji, setNewRewardEmoji] = useState('🎁');

  // Common emojis for rewards
  const commonEmojis = ['🎁', '🏆', '🎉', '🍕', '🍬', '🍭', '🎮', '📱', '🎧', '⚽', '🏀', '🎨', '📚', '🌟', '💎', '🔥', '🎯', '🎪', '🎸', '🎬', '🍿', '🎂', '🎈', '⭐', '✨'];
  
  // Reward system settings state
  const [rewardSystem, setRewardSystem] = useState<RewardSystemSettings>({
    mode: 'simple',
    priceIncreasePercent: 5,
    priceDecreasePercent: 2,
    priceFloorPercent: 50,
    priceCeilingPercent: 200,
    transferFeePercent: 10,
  });

  // Load settings from DB
  useEffect(() => {
    if (dbSettings?.rewardSystem) {
      setRewardSystem(dbSettings.rewardSystem);
    }
  }, [dbSettings]);

  // Save reward system settings
  const handleSaveRewardSystem = async () => {
    const settings = await db.settings.get('userSettings');
    if (settings) {
      settings.rewardSystem = rewardSystem;
      await db.settings.put(settings);
      toast({
        title: "Lagret",
        description: "Innstillinger for belønningssystem er oppdatert",
      });
    }
  };

  // Toggle between simple and dynamic mode
  const handleModeToggle = async (checked: boolean) => {
    const newMode: 'simple' | 'dynamic' = checked ? 'dynamic' : 'simple';
    const updatedSystem = { ...rewardSystem, mode: newMode };
    setRewardSystem(updatedSystem);
    
    // Auto-save mode change
    const settings = await db.settings.get('userSettings');
    if (settings) {
      settings.rewardSystem = updatedSystem;
      await db.settings.put(settings);
      toast({
        title: newMode === 'dynamic' ? "Dynamisk børs aktivert! 📈" : "Statiske priser aktivert",
        description: newMode === 'dynamic' 
          ? "Prisene vil nå endre seg basert på etterspørsel" 
          : "Prisene er nå låst til grunnprisen",
      });
    }
  };

  // Reset all prices to base price
  const handleResetPrices = async () => {
    const allRewards = await db.rewards.toArray();
    await Promise.all(
      allRewards.map(r => db.rewards.update(r.id, {
        currentPrice: r.basePrice,
        cost: r.basePrice
      }))
    );
    
    toast({
      title: "Priser tilbakestilt",
      description: "Alle priser er satt tilbake til grunnprisen",
    });
  };

  // Add new reward
  const handleAddReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRewardName.trim() || !newRewardCost.trim()) {
      toast({
        title: "Feil",
        description: "Vennligst fyll ut både navn og kostnad",
        variant: "destructive",
      });
      return;
    }

    const cost = parseInt(newRewardCost);
    if (isNaN(cost) || cost <= 0) {
      toast({
        title: "Feil",
        description: "Kostnad må være et positivt tall",
        variant: "destructive",
      });
      return;
    }

    const maxId = localRewards.length > 0 ? Math.max(...localRewards.map(r => r.id)) : 0;
    const newReward: Reward = {
      id: maxId + 1,
      name: newRewardName.trim(),
      cost,
      basePrice: cost,
      currentPrice: cost,
      emoji: newRewardEmoji,
    };

    await db.rewards.add(newReward);
    setNewRewardName('');
    setNewRewardCost('');
    setNewRewardEmoji('🎁');
    
    toast({
      title: "Suksess",
      description: `Belønning "${newReward.name}" lagt til`,
    });
  };

  // Delete reward
  const handleDeleteReward = async (id: number) => {
    const reward = localRewards.find(r => r.id === id);
    await db.rewards.delete(id);
    
    toast({
      title: "Slettet",
      description: `Belønning "${reward?.name}" fjernet`,
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Belønningssystem
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Administrer belønninger og prissystem
        </p>
      </div>

      <Tabs defaultValue="simple" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="simple">Enkel</TabsTrigger>
          <TabsTrigger value="advanced">Avansert</TabsTrigger>
        </TabsList>

        {/* ENKEL TAB - Static rewards list */}
        <TabsContent value="simple" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Belønninger</CardTitle>
              <CardDescription>
                Legg til og administrer tilgjengelige belønninger for elevene
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new reward form */}
              <form onSubmit={handleAddReward} className="space-y-3">
                <div>
                  <Label>Emoji</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      className="text-3xl hover:scale-110 transition-transform p-2 border rounded"
                      onClick={() => {
                        const newEmoji = prompt('Skriv inn emoji:', newRewardEmoji);
                        if (newEmoji && newEmoji.trim()) {
                          setNewRewardEmoji(newEmoji.trim());
                        }
                      }}
                    >
                      {newRewardEmoji}
                    </button>
                    <div className="flex flex-wrap gap-1 flex-1">
                      {commonEmojis.slice(0, 15).map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          className="text-xl hover:scale-110 transition-transform p-1"
                          onClick={() => setNewRewardEmoji(emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Belønning"
                    value={newRewardName}
                    onChange={(e) => setNewRewardName(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Kostnad"
                    value={newRewardCost}
                    onChange={(e) => setNewRewardCost(e.target.value)}
                    className="w-28"
                  />
                  <Button type="submit">
                    <Plus className="w-4 h-4 mr-2" />
                    Legg til
                  </Button>
                </div>
              </form>

              {/* Rewards list */}
              <div className="space-y-2">
                {localRewards.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                    Ingen belønninger lagt til ennå
                  </p>
                ) : (
                  localRewards.map((reward) => (
                    <div
                      key={reward.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <button
                          type="button"
                          className="text-2xl hover:scale-110 transition-transform"
                          onClick={() => {
                            const newEmoji = prompt('Velg en emoji:', reward.emoji || '🎁');
                            if (newEmoji && newEmoji.trim()) {
                              db.rewards.update(reward.id, { emoji: newEmoji.trim() });
                            }
                          }}
                        >
                          {reward.emoji || '🎁'}
                        </button>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {reward.name}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Grunnpris: {reward.basePrice} poeng
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteReward(reward.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AVANSERT TAB - Dynamic pricing configuration */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Dynamisk Børs
              </CardTitle>
              <CardDescription>
                Aktiver markedsbasert prising der prisene endres basert på etterspørsel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable Dynamic Pricing */}
              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="dynamic-mode" className="text-base font-semibold">
                    Aktiver dynamisk børs
                  </Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Prisene vil endre seg når elever kjøper belønninger
                  </p>
                </div>
                <Switch
                  id="dynamic-mode"
                  checked={rewardSystem.mode === 'dynamic'}
                  onCheckedChange={handleModeToggle}
                />
              </div>

              {/* Enable/Disable NFC */}
              <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="nfc-enabled" className="text-base font-semibold">
                    Aktiver NFC-skanning
                  </Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Brukes for å skanne NFC-kort i Klassebank (krever spesiell hardware)
                  </p>
                </div>
                <Switch
                  id="nfc-enabled"
                  checked={dbSettings?.nfcEnabled || false}
                  onCheckedChange={async (checked) => {
                    const settings = await db.settings.get('userSettings');
                    if (settings) {
                      settings.nfcEnabled = checked;
                      await db.settings.put(settings);
                      toast({
                        title: checked ? "NFC aktivert" : "NFC deaktivert",
                        description: checked 
                          ? "NFC-skanning er nå tilgjengelig i Klassebank" 
                          : "NFC-skanning er skjult",
                      });
                    }
                  }}
                />
              </div>

              {/* Show configuration only if dynamic mode is enabled */}
              {rewardSystem.mode === 'dynamic' && (
                <>
                  {/* Price increase percentage */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Prisøkning ved kjøp</Label>
                      <span className="text-sm font-semibold text-green-600">
                        +{rewardSystem.priceIncreasePercent}%
                      </span>
                    </div>
                    <Slider
                      value={[rewardSystem.priceIncreasePercent]}
                      onValueChange={([value]) =>
                        setRewardSystem({ ...rewardSystem, priceIncreasePercent: value })
                      }
                      min={1}
                      max={20}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Hvor mye prisen på en belønning øker når den blir kjøpt
                    </p>
                  </div>

                  {/* Price decrease percentage */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Prisreduksjon for andre varer</Label>
                      <span className="text-sm font-semibold text-red-600">
                        -{rewardSystem.priceDecreasePercent}%
                      </span>
                    </div>
                    <Slider
                      value={[rewardSystem.priceDecreasePercent]}
                      onValueChange={([value]) =>
                        setRewardSystem({ ...rewardSystem, priceDecreasePercent: value })
                      }
                      min={1}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Hvor mye prisen på andre belønninger synker når én blir kjøpt
                    </p>
                  </div>

                  {/* Price floor percentage */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Minimumspris</Label>
                      <span className="text-sm font-semibold text-blue-600">
                        {rewardSystem.priceFloorPercent}% av grunnpris
                      </span>
                    </div>
                    <Slider
                      value={[rewardSystem.priceFloorPercent]}
                      onValueChange={([value]) =>
                        setRewardSystem({ ...rewardSystem, priceFloorPercent: value })
                      }
                      min={10}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Laveste pris en belønning kan ha
                    </p>
                  </div>

                  {/* Price ceiling percentage */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Maksimumspris</Label>
                      <span className="text-sm font-semibold text-blue-600">
                        {rewardSystem.priceCeilingPercent}% av grunnpris
                      </span>
                    </div>
                    <Slider
                      value={[rewardSystem.priceCeilingPercent]}
                      onValueChange={([value]) =>
                        setRewardSystem({ ...rewardSystem, priceCeilingPercent: value })
                      }
                      min={100}
                      max={500}
                      step={10}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Høyeste pris en belønning kan ha
                    </p>
                  </div>
                </>
              )}

              {/* Transfer fee setting - always visible */}
              <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <Label>Overføringskostnad</Label>
                  <span className="text-sm font-semibold text-purple-600">
                    {rewardSystem.transferFeePercent}%
                  </span>
                </div>
                <Slider
                  value={[rewardSystem.transferFeePercent]}
                  onValueChange={([value]) =>
                    setRewardSystem({ ...rewardSystem, transferFeePercent: value })
                  }
                  min={0}
                  max={50}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Kostnad når elever overfører poeng til hverandre (0% = gratis overføring)
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-4">
                <Button onClick={handleSaveRewardSystem} className="flex-1">
                  Lagre innstillinger
                </Button>
                {rewardSystem.mode === 'dynamic' && (
                  <Button
                    onClick={handleResetPrices}
                    variant="outline"
                    className="flex-1"
                  >
                    Tilbakestill priser
                  </Button>
                )}
              </div>

              {rewardSystem.mode === 'dynamic' && (
                <React.Fragment>
                  {/* Link to public børs */}
                  <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          Offentlig børs-side
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Se sanntidspriser på en offentlig visning
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open('/bors', '_blank')}
                      >
                        Åpne <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </React.Fragment>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
