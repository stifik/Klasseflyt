'use client';

import RewardSystemLayout from '@/components/RewardSystemLayout';
import { TimePeriodConfig } from '@/components/morning-display/TimePeriodConfig';
import { TimeBasedMessageTable } from '@/components/morning-display/TimeBasedMessageTable';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { ArrowLeft, Info } from 'lucide-react';
import Link from 'next/link';

export default function TimeBasedMessagesPage() {
  const settings = useLiveQuery(() => db.settings.get('userSettings'));

  const useTimeBasedMessages = settings?.morningDisplaySettings?.useTimeBasedMessages ?? false;

  const handleToggleTimeBasedMessages = async () => {
    if (!settings) return;

    const updatedSettings = {
      ...settings,
      morningDisplaySettings: {
        ...settings.morningDisplaySettings!,
        useTimeBasedMessages: !useTimeBasedMessages,
      },
    };

    await db.settings.put(updatedSettings);
  };

  return (
    <RewardSystemLayout>
      <div className="max-w-7xl mx-auto">
        {/* Back button */}
        <div className="mb-6">
          <Link
            href="/settings/morning-display"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft size={20} />
            Tilbake til Morning Display Innstillinger
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-3xl font-bold mb-4">Tidsbaserte meldinger</h1>
          <p className="text-gray-600 mb-4">
            Konfigurer forskjellige velkomstmeldinger og instruksjoner basert på ukedag og
            tidspunkt.
          </p>

          {/* Enable/Disable Toggle */}
          <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <input
              type="checkbox"
              id="enable-time-based"
              checked={useTimeBasedMessages}
              onChange={handleToggleTimeBasedMessages}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="enable-time-based" className="flex-1 cursor-pointer">
              <div className="font-medium text-gray-900">
                Aktiver tidsbaserte meldinger
              </div>
              <div className="text-sm text-gray-600">
                Når dette er aktivert, vil systemet vise meldinger basert på gjeldende ukedag og
                tidspunkt i stedet for tilfeldige meldinger.
              </div>
            </label>
          </div>

          {!useTimeBasedMessages && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
              <Info size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <strong>Tips:</strong> Du kan konfigurere tidsperioder og meldinger selv om
                funksjonen er deaktivert. Aktiver funksjonen når du er klar til å ta den i bruk.
              </div>
            </div>
          )}
        </div>

        {/* Time Period Configuration */}
        <TimePeriodConfig />

        {/* Welcome Messages Table */}
        <div className="mb-6">
          <TimeBasedMessageTable messageType="welcome" />
        </div>

        {/* Instruction Messages Table */}
        <div className="mb-6">
          <TimeBasedMessageTable messageType="instruction" />
        </div>

        {/* Usage Instructions */}
        <div className="bg-gray-50 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-3">Hvordan fungerer det?</h2>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="font-bold text-blue-600">1.</span>
              <span>
                Definer tidsperioder for skoledagen (f.eks. "Morgen", "Etter 1. friminutt")
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-blue-600">2.</span>
              <span>
                Legg til meldinger for hver kombinasjon av ukedag og periode ved å klikke på
                cellene i tabellene
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-blue-600">3.</span>
              <span>
                Systemet velger automatisk riktig melding basert på gjeldende tid og dag
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-blue-600">4.</span>
              <span>
                Hvis en slot er tom, brukes standard/fallback-meldingen
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-blue-600">5.</span>
              <span>
                Du kan ha flere meldinger per slot (én per linje) - systemet velger tilfeldig
              </span>
            </li>
          </ul>
        </div>
      </div>
    </RewardSystemLayout>
  );
}
