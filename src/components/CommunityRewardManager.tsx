"use client";

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  createCommunityReward,
  updateCommunityReward,
  deleteCommunityReward,
  resetCommunityReward,
  getDonationBreakdown,
} from '@/lib/communityRewardService';
import { CommunityRewardCard } from './CommunityRewardCard';
import { Plus, Trash2, RotateCcw, Users, Info, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { CommunityReward } from '@/lib/types';

export function CommunityRewardManager() {
  const [isCreating, setIsCreating] = useState(false);
  const [editingReward, setEditingReward] = useState<CommunityReward | null>(null);
  const [viewingDonations, setViewingDonations] = useState<number | null>(null);

  const activeRewards = useLiveQuery(() =>
    db.communityRewards.where('status').equals('active').sortBy('priority')
  );

  const achievedRewards = useLiveQuery(() =>
    db.communityRewards.where('status').equals('achieved').reverse().sortBy('achievedAt')
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-600" />
            Fellesspotter (Delte Mål)
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Opprett og administrer klassens felles mål som elevene kan donere poeng til
          </p>
        </div>
        <Button
          onClick={() => setIsCreating(true)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nytt mål
        </Button>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Elevene kan donere poeng til disse målene via Terminal eller sette opp automatisk trekk
          når de tjener poeng. Når målet nås, vises en feiring!
        </AlertDescription>
      </Alert>

      {/* Active Rewards */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          Aktive mål ({activeRewards?.length || 0})
        </h3>
        {activeRewards && activeRewards.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {activeRewards.map((reward) => (
              <div key={reward.id} className="relative group">
                <CommunityRewardCard reward={reward} showDonateButton={false} />
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DonationViewDialog rewardId={reward.id!} rewardTitle={reward.title} />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingReward(reward)}
                    className="bg-white dark:bg-gray-800"
                  >
                    Rediger
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={async () => {
                      if (confirm(`Er du sikker på at du vil slette "${reward.title}"?`)) {
                        await deleteCommunityReward(reward.id!);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Ingen aktive mål. Opprett et nytt mål for å komme i gang!
          </div>
        )}
      </div>

      {/* Achieved Rewards History */}
      {achievedRewards && achievedRewards.length > 0 && (
        <div className="space-y-4 pt-6 border-t">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Oppnådde mål ({achievedRewards.length})
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {achievedRewards.map((reward) => (
              <div key={reward.id} className="relative group">
                <CommunityRewardCard reward={reward} showDonateButton={false} />
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DonationViewDialog rewardId={reward.id!} rewardTitle={reward.title} />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      if (
                        confirm(
                          `Vil du tilbakestille "${reward.title}" til aktiv status med 0 poeng?`
                        )
                      ) {
                        await resetCommunityReward(reward.id!);
                      }
                    }}
                    className="bg-white dark:bg-gray-800"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Tilbakestill
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <RewardFormDialog
        open={isCreating || editingReward !== null}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreating(false);
            setEditingReward(null);
          }
        }}
        reward={editingReward}
      />
    </div>
  );
}

// Form Dialog for Create/Edit
function RewardFormDialog({
  open,
  onOpenChange,
  reward,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reward: CommunityReward | null;
}) {
  const [title, setTitle] = useState(reward?.title || '');
  const [description, setDescription] = useState(reward?.description || '');
  const [target, setTarget] = useState(reward?.target.toString() || '');
  const [emoji, setEmoji] = useState(reward?.emoji || '🎯');

  React.useEffect(() => {
    if (reward) {
      setTitle(reward.title);
      setDescription(reward.description || '');
      setTarget(reward.target.toString());
      setEmoji(reward.emoji || '🎯');
    } else {
      setTitle('');
      setDescription('');
      setTarget('');
      setEmoji('🎯');
    }
  }, [reward]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetNum = parseInt(target, 10);
    if (!title || !targetNum || targetNum <= 0) {
      alert('Vennligst fyll ut alle påkrevde felt');
      return;
    }

    if (reward?.id) {
      // Update existing
      await updateCommunityReward(reward.id, {
        title,
        description,
        target: targetNum,
        emoji,
      });
    } else {
      // Create new
      await createCommunityReward(title, targetNum, description, emoji);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{reward ? 'Rediger mål' : 'Opprett nytt mål'}</DialogTitle>
          <DialogDescription>
            Opprett et felles mål som hele klassen kan jobbe mot sammen
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emoji">Emoji</Label>
            <Input
              id="emoji"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              placeholder="🎯"
              maxLength={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Tittel *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="F.eks. Farge lærers hår"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beskrivelse (valgfri)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mer informasjon om målet..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target">Målbeløp (poeng) *</Label>
            <Input
              id="target"
              type="number"
              min="1"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="100000"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Avbryt
            </Button>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
              {reward ? 'Lagre endringer' : 'Opprett mål'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Dialog to view donation breakdown
function DonationViewDialog({
  rewardId,
  rewardTitle,
}: {
  rewardId: number;
  rewardTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [breakdown, setBreakdown] = useState<Awaited<ReturnType<typeof getDonationBreakdown>>>([]);

  const loadBreakdown = async () => {
    const data = await getDonationBreakdown(rewardId);
    setBreakdown(data);
  };

  React.useEffect(() => {
    if (open) {
      loadBreakdown();
    }
  }, [open, rewardId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="bg-white dark:bg-gray-800">
          <Eye className="w-4 h-4 mr-1" />
          Donasjoner
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Donasjoner til "{rewardTitle}"</DialogTitle>
          <DialogDescription>
            Oversikt over hvem som har donert poeng til dette målet
          </DialogDescription>
        </DialogHeader>

        {breakdown.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Ingen donasjoner ennå
          </div>
        ) : (
          <div className="space-y-2">
            {breakdown.map(({ student, totalDonated, donationCount, lastDonation }) => (
              <div
                key={student.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div>
                  <div className="font-semibold">{student.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {donationCount} {donationCount === 1 ? 'donasjon' : 'donasjoner'}
                    {lastDonation && ` • Sist ${new Date(lastDonation).toLocaleDateString('nb-NO')}`}
                  </div>
                </div>
                <div className="font-bold text-lg text-purple-600 dark:text-purple-400">
                  {totalDonated.toLocaleString()} p
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
