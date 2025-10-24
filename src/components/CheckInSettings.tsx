"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Trash2, Plus, Clock, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { BellTime, CheckInSettings as CheckInSettingsType } from '@/lib/types';

const WEEKDAYS = [
  { value: 'mandag', label: 'Mandag' },
  { value: 'tirsdag', label: 'Tirsdag' },
  { value: 'onsdag', label: 'Onsdag' },
  { value: 'torsdag', label: 'Torsdag' },
  { value: 'fredag', label: 'Fredag' },
] as const;

export default function CheckInSettings() {
  const { toast } = useToast();

  // Load bell times and settings from database
  const bellTimes = useLiveQuery(() => db.bellTimes.orderBy('[weekday+time]').toArray()) || [];
  const dbSettings = useLiveQuery(() => db.settings.get('userSettings'));

  // Form states for new bell time
  const [newWeekday, setNewWeekday] = useState<'mandag' | 'tirsdag' | 'onsdag' | 'torsdag' | 'fredag'>('mandag');
  const [newTime, setNewTime] = useState('08:30');
  const [newPoints, setNewPoints] = useState('10');
  const [newType, setNewType] = useState<'morgen' | 'ordinær'>('morgen');

  // Settings states
  const [checkInSettings, setCheckInSettings] = useState<CheckInSettingsType>({
    morning: {
      percent100Minutes: 3,
      percent50Minutes: 5,
      percent10Minutes: 7,
      absenceMinutes: 7,
    },
    regular: {
      percent100Minutes: 3,
      stopMinutes: 3,
    },
  });

  // Load settings from DB
  useEffect(() => {
    if (dbSettings?.checkInSettings) {
      setCheckInSettings(dbSettings.checkInSettings);
    }
  }, [dbSettings]);

  const handleAddBellTime = async (e: React.FormEvent) => {
    e.preventDefault();

    const points = parseInt(newPoints);
    if (isNaN(points) || points <= 0) {
      toast({
        title: "Feil",
        description: "Poeng må være et positivt tall",
        variant: "destructive",
      });
      return;
    }

    // Check if this weekday/time combination already exists
    const exists = bellTimes.some(bt => bt.weekday === newWeekday && bt.time === newTime);
    if (exists) {
      toast({
        title: "Feil",
        description: "Det finnes allerede en ringetid for dette tidspunktet",
        variant: "destructive",
      });
      return;
    }

    // Check if trying to add second morning bell on same day
    if (newType === 'morgen') {
      const morningExists = bellTimes.some(bt => bt.weekday === newWeekday && bt.type === 'morgen');
      if (morningExists) {
        toast({
          title: "Feil",
          description: "Det kan kun være én morgen-innsjekking per dag",
          variant: "destructive",
        });
        return;
      }
    }

    const newBellTime: Omit<BellTime, 'id'> = {
      weekday: newWeekday,
      time: newTime,
      points,
      type: newType,
    };

    await db.bellTimes.add(newBellTime as BellTime);

    // Reset form
    setNewTime('08:30');
    setNewPoints('10');

    toast({
      title: "Lagt til",
      description: `Ringetid for ${newWeekday} kl. ${newTime} er lagt til`,
    });
  };

  const handleDeleteBellTime = async (id: number) => {
    await db.bellTimes.delete(id);
    toast({
      title: "Slettet",
      description: "Ringetid er fjernet",
    });
  };

  const handleSaveSettings = async () => {
    // Validate morning settings
    if (
      checkInSettings.morning.percent100Minutes >= checkInSettings.morning.percent50Minutes ||
      checkInSettings.morning.percent50Minutes >= checkInSettings.morning.percent10Minutes ||
      checkInSettings.morning.percent10Minutes > checkInSettings.morning.absenceMinutes
    ) {
      toast({
        title: "Feil",
        description: "Tidsverdiene må være i stigende rekkefølge",
        variant: "destructive",
      });
      return;
    }

    // Validate regular settings
    if (checkInSettings.regular.percent100Minutes <= 0 || checkInSettings.regular.stopMinutes <= 0) {
      toast({
        title: "Feil",
        description: "Alle verdier må være større enn 0",
        variant: "destructive",
      });
      return;
    }

    const settings = await db.settings.get('userSettings');
    if (settings) {
      settings.checkInSettings = checkInSettings;
      await db.settings.put(settings);
      toast({
        title: "Lagret",
        description: "Innstillinger for innsjekking er oppdatert",
      });
    }
  };

  const getWeekdayLabel = (weekday: string) => {
    return WEEKDAYS.find(w => w.value === weekday)?.label || weekday;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Ringetider og Innsjekking
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Sett opp automatisk innsjekking med ringetider og trapp-basert belønning
        </p>
      </div>

      {/* Add new bell time */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Legg til ny ringetid
          </CardTitle>
          <CardDescription>
            Opprett ringetider som automatisk aktiverer innsjekking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddBellTime} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Ukedag</Label>
                <Select value={newWeekday} onValueChange={(v: any) => setNewWeekday(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEKDAYS.map(day => (
                      <SelectItem key={day.value} value={day.value}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tidspunkt</Label>
                <Input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Poeng (100% verdi)</Label>
                <Input
                  type="number"
                  min="1"
                  value={newPoints}
                  onChange={(e) => setNewPoints(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <RadioGroup value={newType} onValueChange={(v: any) => setNewType(v)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="morgen" id="type-morning" />
                    <Label htmlFor="type-morning" className="font-normal">
                      Morgen (med fravær)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ordinær" id="type-regular" />
                    <Label htmlFor="type-regular" className="font-normal">
                      Ordinær
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <Button type="submit" className="w-full md:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Legg til ringetid
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* List of bell times */}
      <Card>
        <CardHeader>
          <CardTitle>Registrerte ringetider</CardTitle>
          <CardDescription>
            Oversikt over alle ringetider sortert etter ukedag og klokkeslett
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bellTimes.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              Ingen ringetider lagt til ennå
            </p>
          ) : (
            <div className="space-y-2">
              {bellTimes.map((bellTime) => (
                <div
                  key={bellTime.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {getWeekdayLabel(bellTime.weekday)} kl. {bellTime.time}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {bellTime.type === 'morgen' ? 'Morgen-innsjekking' : 'Ordinær innsjekking'} 
                        {' • '}
                        {bellTime.points} poeng
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => bellTime.id && handleDeleteBellTime(bellTime.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stair settings */}
      <Card>
        <CardHeader>
          <CardTitle>Trapp-innstillinger</CardTitle>
          <CardDescription>
            Definer tidspunkter for poeng-trapper (i minutter etter ringetid)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Morning check-in settings */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              Morgen-innsjekking (med fraværsregistrering)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>100% poeng innen (minutter)</Label>
                <Input
                  type="number"
                  min="1"
                  value={checkInSettings.morning.percent100Minutes}
                  onChange={(e) =>
                    setCheckInSettings({
                      ...checkInSettings,
                      morning: {
                        ...checkInSettings.morning,
                        percent100Minutes: parseInt(e.target.value) || 1,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>50% poeng innen (minutter)</Label>
                <Input
                  type="number"
                  min="1"
                  value={checkInSettings.morning.percent50Minutes}
                  onChange={(e) =>
                    setCheckInSettings({
                      ...checkInSettings,
                      morning: {
                        ...checkInSettings.morning,
                        percent50Minutes: parseInt(e.target.value) || 1,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>10% poeng innen (minutter)</Label>
                <Input
                  type="number"
                  min="1"
                  value={checkInSettings.morning.percent10Minutes}
                  onChange={(e) =>
                    setCheckInSettings({
                      ...checkInSettings,
                      morning: {
                        ...checkInSettings.morning,
                        percent10Minutes: parseInt(e.target.value) || 1,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Fraværsregistrering etter (minutter)</Label>
                <Input
                  type="number"
                  min="1"
                  value={checkInSettings.morning.absenceMinutes}
                  onChange={(e) =>
                    setCheckInSettings({
                      ...checkInSettings,
                      morning: {
                        ...checkInSettings.morning,
                        absenceMinutes: parseInt(e.target.value) || 1,
                      },
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Regular check-in settings */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              Ordinær innsjekking
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>100% poeng innen (minutter)</Label>
                <Input
                  type="number"
                  min="1"
                  value={checkInSettings.regular.percent100Minutes}
                  onChange={(e) =>
                    setCheckInSettings({
                      ...checkInSettings,
                      regular: {
                        ...checkInSettings.regular,
                        percent100Minutes: parseInt(e.target.value) || 1,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Stopp lytting etter (minutter)</Label>
                <Input
                  type="number"
                  min="1"
                  value={checkInSettings.regular.stopMinutes}
                  onChange={(e) =>
                    setCheckInSettings({
                      ...checkInSettings,
                      regular: {
                        ...checkInSettings.regular,
                        stopMinutes: parseInt(e.target.value) || 1,
                      },
                    })
                  }
                />
              </div>
            </div>
          </div>

          <Button onClick={handleSaveSettings} className="w-full md:w-auto">
            Lagre innstillinger
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
