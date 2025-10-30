"use client";

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { updateStudentAutoContribution } from '@/lib/communityRewardService';
import { Heart, Info, TrendingUp } from 'lucide-react';
import type { Student } from '@/lib/types';

export function StudentAutoContribution() {
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  const students = useLiveQuery(() => db.students.toArray());
  const activeRewards = useLiveQuery(() =>
    db.communityRewards.where('status').equals('active').sortBy('priority')
  );

  const selectedStudent = students?.find((s) => s.id === selectedStudentId);

  const handleUpdate = async (
    autoContributionPercent: number,
    preferredCommunityRewardId?: number
  ) => {
    if (!selectedStudentId) return;

    await updateStudentAutoContribution(
      selectedStudentId,
      autoContributionPercent,
      preferredCommunityRewardId
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Heart className="w-6 h-6 text-pink-600" />
          Automatisk Donasjon (Per Elev)
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Konfigurer automatisk prosentvis trekk til fellespot når elever tjener poeng
        </p>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Hvordan det fungerer:</strong> Hver gang en elev tjener poeng, trekkes en
          prosentandel automatisk og doneres til deres valgte fellespot. Eksempel: Hvis en elev
          tjener 100 poeng med 10% auto-donasjon, får de 90 poeng og 10 poeng går til fellesspotten.
        </AlertDescription>
      </Alert>

      {/* Student Selector */}
      <div className="space-y-2">
        <Label>Velg elev</Label>
        <Select
          value={selectedStudentId?.toString() || ''}
          onValueChange={(value) => setSelectedStudentId(parseInt(value, 10))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Velg en elev..." />
          </SelectTrigger>
          <SelectContent>
            {students?.map((student) => (
              <SelectItem key={student.id} value={student.id!.toString()}>
                {student.name}
                {(student.autoContributionPercent ?? 0) > 0 && (
                  <span className="ml-2 text-xs text-purple-600 dark:text-purple-400">
                    ({student.autoContributionPercent}% aktiv)
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Configuration for selected student */}
      {selectedStudent && (
        <div className="space-y-6 p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
          <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <Heart className="w-5 h-5 text-pink-600" />
            Innstillinger for {selectedStudent.name}
          </div>

          {/* Auto-contribution percentage */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Automatisk donasjonsprosent</Label>
              <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {selectedStudent.autoContributionPercent ?? 0}%
              </span>
            </div>
            <Slider
              value={[selectedStudent.autoContributionPercent ?? 0]}
              onValueChange={([value]) =>
                handleUpdate(value, selectedStudent.preferredCommunityRewardId)
              }
              min={0}
              max={50}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-gray-600 dark:text-gray-400">
              0% = ingen automatisk donasjon, 50% = maksimum
            </p>
          </div>

          {/* Preferred community reward */}
          {(selectedStudent.autoContributionPercent ?? 0) > 0 && (
            <div className="space-y-2">
              <Label>Foretrukket fellespot</Label>
              <Select
                value={selectedStudent.preferredCommunityRewardId?.toString() || 'none'}
                onValueChange={(value) =>
                  handleUpdate(
                    selectedStudent.autoContributionPercent ?? 0,
                    value === 'none' ? undefined : parseInt(value, 10)
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg en fellespot..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ingen (deaktiverer auto-donasjon)</SelectItem>
                  {activeRewards?.map((reward) => (
                    <SelectItem key={reward.id} value={reward.id!.toString()}>
                      {reward.emoji} {reward.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedStudent.preferredCommunityRewardId && (
                <Alert variant="destructive">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Velg en fellespot for at auto-donasjonen skal være aktiv
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Example calculation */}
          {(selectedStudent.autoContributionPercent ?? 0) > 0 &&
            selectedStudent.preferredCommunityRewardId && (
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700">
                <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <TrendingUp className="w-4 h-4" />
                  Eksempel
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Tjener poeng:</span>
                    <span className="font-bold">100 poeng</span>
                  </div>
                  <div className="flex justify-between text-purple-600 dark:text-purple-400">
                    <span>Auto-donasjon ({selectedStudent.autoContributionPercent}%):</span>
                    <span className="font-bold">
                      -{Math.floor(100 * ((selectedStudent.autoContributionPercent ?? 0) / 100))}{' '}
                      poeng
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      Eleven får:
                    </span>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      +
                      {100 -
                        Math.floor(100 * ((selectedStudent.autoContributionPercent ?? 0) / 100))}{' '}
                      poeng
                    </span>
                  </div>
                </div>
              </div>
            )}

          {/* Reset button */}
          {((selectedStudent.autoContributionPercent ?? 0) > 0 ||
            selectedStudent.preferredCommunityRewardId) && (
            <Button
              variant="outline"
              onClick={() => handleUpdate(0, undefined)}
              className="w-full"
            >
              Deaktiver automatisk donasjon for {selectedStudent.name}
            </Button>
          )}
        </div>
      )}

      {/* Overview of all students with auto-contribution */}
      {students && students.some((s) => (s.autoContributionPercent ?? 0) > 0) && (
        <div className="pt-6 border-t space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Elever med aktiv auto-donasjon
          </h3>
          <div className="grid gap-2 md:grid-cols-2">
            {students
              .filter((s) => (s.autoContributionPercent ?? 0) > 0)
              .map((student) => {
                const reward = activeRewards?.find((r) => r.id === student.preferredCommunityRewardId);
                return (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div>
                      <div className="font-semibold">{student.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {reward ? `${reward.emoji} ${reward.title}` : 'Ingen fellespot valgt'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-purple-600 dark:text-purple-400">
                        {student.autoContributionPercent}%
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedStudentId(student.id!)}
                        className="text-xs"
                      >
                        Rediger
                      </Button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
