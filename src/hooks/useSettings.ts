
import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppSettings } from '@/lib/types';
import { useToast } from './use-toast';

const defaultSettings: AppSettings = {
  tabs: {
    overview: true,
    dailyCheck: true,
    remarks: true,
    reports: true,
    seatingChart: true,
  },
};

export function useSettings(userId: string) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const getSettings = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const docRef = doc(db, 'users', userId, 'settings', 'appSettings');
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Merge with defaults to ensure all keys are present
        setSettings(prev => ({
          ...prev,
          ...data,
          tabs: {
            ...prev.tabs,
            ...data.tabs,
          }
        }));
      } else {
        // No settings found, so we create them with defaults
        await setDoc(docRef, defaultSettings);
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast({ title: "Feil", description: "Kunne ikke laste innstillinger.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    getSettings();
  }, [getSettings]);

  const saveSettings = async (newSettings: AppSettings) => {
    if (!userId) return;
    const docRef = doc(db, 'users', userId, 'settings', 'appSettings');
    try {
      await setDoc(docRef, newSettings, { merge: true });
      setSettings(newSettings);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({ title: "Feil", description: "Kunne ikke lagre innstillinger.", variant: "destructive" });
    }
  };

  return { settings, setSettings: saveSettings, loading, refetch: getSettings };
}
