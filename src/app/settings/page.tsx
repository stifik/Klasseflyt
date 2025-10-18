"use client";

import React from 'react';
import SettingsPage from '@/components/SettingsPage';
import Settings from '@/components/Settings';
import RewardSystemLayout from '@/components/RewardSystemLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Settings as SettingsIcon, Gift } from 'lucide-react';

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
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="app" className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" />
            Hovedapp
          </TabsTrigger>
          <TabsTrigger value="rewards" className="flex items-center gap-2">
            <Gift className="w-4 h-4" />
            Belønningssystem
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
      </Tabs>
    </RewardSystemLayout>
  );
}
