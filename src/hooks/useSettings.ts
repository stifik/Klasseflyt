
import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppSettings, TabKey } from '@/lib/types';
import { useToast } from './use-toast';

const defaultTabOrder: TabKey[] = ['overview', 'dailyCheck', 'remarks', 'reports', 'seatingChart', 'groupTool'];

const defaultSettings: AppSettings = {
  tabs: {
    overview: true,
    dailyCheck: true,
    remarks: true,
    reports: true,
    seatingChart: true,
    groupTool: true,
  },
  tabOrder: defaultTabOrder,
  reportSettings: {
    includeHomework: true,
    includeIpad: true,
    includeRemarks: true,
    includePositiveFeedback: false,
    greeting: "Hei,",
    closing: "Vennlig hilsen,",
    teacherName: "Læreren"
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
        const data = docSnap.data() as Partial<AppSettings>;
        
        const existingTabOrder = data.tabOrder && data.tabOrder.length > 0 ? data.tabOrder : defaultTabOrder;
        const existingTabs = data.tabs || {};

        // Ensure all default tabs are present for existing users
        const mergedTabs = { ...defaultSettings.tabs, ...existingTabs };
        
        // Ensure new tabs are added to the order for existing users
        const mergedTabOrder = [...existingTabOrder];
        defaultTabOrder.forEach(key => {
            if (!mergedTabOrder.includes(key)) {
                mergedTabOrder.push(key);
            }
        });

        const mergedSettings: AppSettings = {
          tabs: mergedTabs,
          tabOrder: mergedTabOrder,
          reportSettings: {
            ...defaultSettings.reportSettings,
            ...(data.reportSettings || {}),
          }
        };
        setSettings(mergedSettings);
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
    
    // Optimistically update local state immediately
    setSettings(newSettings);

    const docRef = doc(db, 'users', userId, 'settings', 'appSettings');
    try {
      await setDoc(docRef, newSettings, { merge: true });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({ title: "Feil", description: "Kunne ikke lagre innstillinger.", variant: "destructive" });
      // Optional: revert to old settings on error
      getSettings();
    }
  };

  return { settings, saveSettings, loading, refetch: getSettings };
}
