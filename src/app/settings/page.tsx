"use client";

import React from 'react';
import SettingsPage from '@/components/SettingsPage';
import RewardSystemLayout from '@/components/RewardSystemLayout';

export default function SettingsRoute() {
  return (
    <RewardSystemLayout showBackButton={true}>
      <SettingsPage />
    </RewardSystemLayout>
  );
}
