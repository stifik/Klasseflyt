"use client";

import React from 'react';
import SettingsPage from '@/components/SettingsPage';
import Settings from '@/components/Settings';
import CheckInSettings from '@/components/CheckInSettings';
import RewardSystemLayout from '@/components/RewardSystemLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Settings as SettingsIcon, Gift, Bell, Monitor } from 'lucide-react';
import Link from 'next/link';

export default function SettingsRoute() {
  const students = useLiveQuery(() => db.students.toArray());
  const subjects = useLiveQuery(() => db.subjects.toArray());
  const settings = useLiveQuery(() => db.settings.get('userSettings'));

  const handleUpdate = () => {
    // Trigger re-query by not doing anything - useLiveQuery will auto-update
  };

  return (
    <RewardSystemLayout showBackButton={true}>
      <Tabs defaultValue="app" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="app" className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" />
            Hovedapp
          </TabsTrigger>
          <TabsTrigger value="rewards" className="flex items-center gap-2">
            <Gift className="w-4 h-4" />
            Belønning
          </TabsTrigger>
          <TabsTrigger value="checkin" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Innsjekking
          </TabsTrigger>
          <TabsTrigger value="morning" className="flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Morgenvisning
          </TabsTrigger>
        </TabsList>
        <TabsContent value="app">
          {students && subjects && settings ? (
            <Settings
              initialStudents={students}
              initialSubjects={subjects}
              settings={settings}
              onSettingsChange={async (newSettings) => {
                await db.settings.put({ id: 'userSettings', ...newSettings });
              }}
            />
          ) : (
            <div className="flex items-center justify-center p-8">
              <p>Laster innstillinger...</p>
            </div>
          )}
        </TabsContent>
        <TabsContent value="rewards">
          <SettingsPage />
        </TabsContent>
        <TabsContent value="checkin">
          <CheckInSettings />
        </TabsContent>
        <TabsContent value="morning">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-2xl font-bold mb-4">Morning Display Innstillinger</h2>
            <p className="text-gray-600 mb-6">
              Konfigurer meldinger, instruksjoner, klassenavn og ukesmaler for morgenvisningen.
            </p>
            <div className="flex flex-col gap-4">
              <Link
                href="/settings/morning-display"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition w-fit"
              >
                <Monitor className="w-5 h-5" />
                Meldinger og klassenavn
              </Link>
              <Link
                href="/settings/themes"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition w-fit"
              >
                🎨
                Temaer og bakgrunner
              </Link>
              <Link
                href="/settings/weekly-schedule"
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition w-fit"
              >
                <SettingsIcon className="w-5 h-5" />
                Ukesmaler for dagsplan
              </Link>
              <Link
                href="/settings/weekly-planner"
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition w-fit"
              >
                📅
                Ukesplanlegger (timeplaner)
              </Link>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </RewardSystemLayout>
  );
}
