
import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppSettings, TabKey } from '@/lib/types';
import { useToast } from './use-toast';

const defaultTabOrder: TabKey[] = ['overview', 'dailyCheck', 'remarks', 'reports', 'seatingChart', 'groupTool', 'studentPicker', 'remarkAnalysis'];

const defaultSchedule = Array.from({ length: 6 }, (_, i) => ({
    period: i + 1,
    startTime: "",
    endTime: "",
}));

const defaultSettings: AppSettings = {
  tabs: {
    overview: true,
    dailyCheck: true,
    remarks: true,
    reports: true,
    seatingChart: true,
    groupTool: true,
    studentPicker: true,
    remarkAnalysis: true,
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
  schedule: defaultSchedule,
  selectedSeatingLayoutId: null,
  remarkTypes: ["Generell", "Forstyrrer andre", "Mangler utstyr", "Upassende språk"],
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

        const mergedTabs = { ...defaultSettings.tabs, ...existingTabs };
        
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
          },
          schedule: data.schedule && data.schedule.length === 6 ? data.schedule : defaultSchedule,
          selectedSeatingLayoutId: data.selectedSeatingLayoutId || null,
          remarkTypes: data.remarkTypes && data.remarkTypes.length > 0 ? data.remarkTypes : defaultSettings.remarkTypes,
        };
        setSettings(mergedSettings);
      } else {
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
    
    setSettings(newSettings);

    const docRef = doc(db, 'users', userId, 'settings', 'appSettings');
    try {
      await setDoc(docRef, newSettings, { merge: true });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({ title: "Feil", description: "Kunne ikke lagre innstillinger.", variant: "destructive" });
      getSettings();
    }
  };

  return { settings, saveSettings, loading, refetch: getSettings };
}
