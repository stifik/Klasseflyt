'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { TimePeriod } from '@/lib/types';
import { X, Plus, Save } from 'lucide-react';

export function TimePeriodConfig() {
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Load existing time periods
  const timePeriods = useLiveQuery(
    () => db.timePeriods.orderBy('order').toArray(),
    []
  );

  const [localPeriods, setLocalPeriods] = useState<TimePeriod[]>([]);

  // Sync local state with database
  if (timePeriods && localPeriods.length === 0 && timePeriods.length > 0) {
    setLocalPeriods(timePeriods);
  }

  const handleAddPeriod = () => {
    const nextOrder = localPeriods.length > 0
      ? Math.max(...localPeriods.map(p => p.order)) + 1
      : 1;

    const newPeriod: TimePeriod = {
      name: `Periode ${nextOrder}`,
      startTime: '08:00',
      order: nextOrder,
    };

    setLocalPeriods([...localPeriods, newPeriod]);
  };

  const handleRemovePeriod = (index: number) => {
    if (localPeriods.length <= 1) {
      alert('Du må ha minst én tidsperiode!');
      return;
    }

    const updated = localPeriods.filter((_, i) => i !== index);
    // Re-order remaining periods
    const reordered = updated.map((p, i) => ({ ...p, order: i + 1 }));
    setLocalPeriods(reordered);
  };

  const handleUpdatePeriod = (index: number, field: 'name' | 'startTime', value: string) => {
    const updated = [...localPeriods];
    updated[index] = { ...updated[index], [field]: value };
    setLocalPeriods(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      // Validate that all periods have names and times
      for (const period of localPeriods) {
        if (!period.name.trim()) {
          alert('Alle perioder må ha et navn!');
          setIsSaving(false);
          return;
        }
        if (!period.startTime) {
          alert('Alle perioder må ha et starttidspunkt!');
          setIsSaving(false);
          return;
        }
      }

      // Get all existing periods to check what changed
      const existingPeriods = await db.timePeriods.toArray();
      const existingIds = existingPeriods.map(p => p.id!);

      // Clear existing periods
      await db.timePeriods.clear();

      // Add updated periods
      const newIds: number[] = [];
      for (const period of localPeriods) {
        const id = await db.timePeriods.add({
          ...period,
          createdAt: new Date(),
        });
        newIds.push(id as number);
      }

      // Handle message migration if periods changed
      // If the number of periods changed, we may need to handle orphaned messages
      const removedPeriodIds = existingIds.filter(id => !newIds.includes(id));
      if (removedPeriodIds.length > 0) {
        // Delete messages associated with removed periods
        for (const periodId of removedPeriodIds) {
          await db.timeBasedMessages.where('timePeriodId').equals(periodId).delete();
        }
      }

      setSaveMessage('Tidsperioder lagret!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save time periods:', error);
      alert('Kunne ikke lagre tidsperioder. Se konsollen for detaljer.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!timePeriods) {
    return <div>Laster...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Tidsperioder for skoledagen</h2>
      <p className="text-gray-600 mb-4">
        Definer når hver periode starter:
      </p>

      <div className="space-y-3 mb-4">
        {localPeriods.map((period, index) => (
          <div key={index} className="flex items-center gap-3">
            <span className="text-gray-700 font-medium w-6">{index + 1}.</span>
            <input
              type="text"
              value={period.name}
              onChange={(e) => handleUpdatePeriod(index, 'name', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Periodenavn"
            />
            <input
              type="time"
              value={period.startTime}
              onChange={(e) => handleUpdatePeriod(index, 'startTime', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => handleRemovePeriod(index)}
              disabled={localPeriods.length <= 1}
              className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              title="Fjern periode"
            >
              <X size={18} />
              <span className="text-sm">Fjern</span>
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleAddPeriod}
          className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md flex items-center gap-2"
        >
          <Plus size={18} />
          Legg til periode
        </button>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="ml-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Save size={18} />
          {isSaving ? 'Lagrer...' : 'Lagre tidsperioder'}
        </button>

        {saveMessage && (
          <span className="text-green-600 font-medium">{saveMessage}</span>
        )}
      </div>
    </div>
  );
}
