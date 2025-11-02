"use client";

import React, { useEffect, useState } from 'react';
import Settings from '@/components/Settings';
import CheckInSettings from '@/components/CheckInSettings';
import RewardSettings from '@/components/RewardSettings';
import MorningDisplaySettings from '@/components/settings/MorningDisplaySettings';
import RewardSystemLayout from '@/components/RewardSystemLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Settings as SettingsIcon, Gift, Bell, Monitor, CreditCard } from 'lucide-react';
import Link from 'next/link';

type TabValue = 'app' | 'rewards' | 'checkin' | 'morning';

export default function SettingsRoute() {
  const students = useLiveQuery(() => db.students.toArray());
  const subjects = useLiveQuery(() => db.subjects.toArray());
  const settings = useLiveQuery(() => db.settings.get('userSettings'));

  // Read hash from URL to determine initial tab
  const [activeTab, setActiveTab] = useState<TabValue>('app');

  useEffect(() => {
    const fullHash = window.location.hash.slice(1); // Remove # from hash
    const validTabs: TabValue[] = ['app', 'rewards', 'checkin', 'morning'];

    // Split hash by # to handle multiple anchors like #morning#welcome-messages
    const hashParts = fullHash.split('#');
    const mainHash = hashParts[0];

    // Map 'hovedapp' to 'app' for backwards compatibility
    const tabMap: Record<string, TabValue> = {
      'hovedapp': 'app',
      'app': 'app',
      'rewards': 'rewards',
      'checkin': 'checkin',
      'morning': 'morning'
    };

    const mappedTab = tabMap[mainHash];
    if (mappedTab && validTabs.includes(mappedTab)) {
      setActiveTab(mappedTab);
    }
  }, []);

  const handleUpdate = () => {
    // Trigger re-query by not doing anything - useLiveQuery will auto-update
  };

  return (
    <RewardSystemLayout showBackButton={true}>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)} className="w-full">
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
          <RewardSettings />
        </TabsContent>
        <TabsContent value="checkin">
          <div className="space-y-6">
            {/* RFID Cards Link - only show if NFC is enabled */}
            {settings?.nfcEnabled && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border">
                <h2 className="text-2xl font-bold mb-4">RFID-kort administrasjon</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Koble RFID-kort til elever for rask innsjekking og betalinger.
                </p>
                <Link
                  href="/settings/rfid-cards"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition w-fit"
                >
                  <CreditCard className="w-5 h-5" />
                  Administrer RFID-kort
                </Link>
              </div>
            )}

            {/* Bell Times and Check-in Settings */}
            <CheckInSettings />
          </div>
        </TabsContent>
        <TabsContent value="morning">
          <MorningDisplaySettings />
        </TabsContent>
      </Tabs>
    </RewardSystemLayout>
  );
}
