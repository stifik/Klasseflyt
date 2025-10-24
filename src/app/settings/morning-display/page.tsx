'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import RewardSystemLayout from '@/components/RewardSystemLayout';
import { Plus, Trash2, Save } from 'lucide-react';
import type { WelcomeMessage, InstructionMessage, ScheduleTemplate } from '@/lib/types';

export default function MorningDisplaySettingsPage() {
  const settings = useLiveQuery(() => db.settings.get('userSettings'));
  const welcomeMessages = useLiveQuery(() => db.welcomeMessages.toArray());
  const instructionMessages = useLiveQuery(() => db.instructionMessages.toArray());
  const scheduleTemplates = useLiveQuery(() => db.scheduleTemplates.toArray());

  const [className, setClassName] = useState('');
  const [messageRotationMode, setMessageRotationMode] = useState<'daily' | 'per-ringetid'>('daily');
  const [instructionRotationMode, setInstructionRotationMode] = useState<'daily' | 'per-ringetid'>('daily');
  const [bulkMessages, setBulkMessages] = useState('');
  const [bulkInstructions, setBulkInstructions] = useState('');

  useEffect(() => {
    if (settings?.morningDisplaySettings) {
      setClassName(settings.morningDisplaySettings.className);
      setMessageRotationMode(settings.morningDisplaySettings.messageRotationMode);
      setInstructionRotationMode(settings.morningDisplaySettings.instructionRotationMode);
    }
  }, [settings]);

  const handleSaveClassName = async () => {
    if (settings && settings.morningDisplaySettings) {
      await db.settings.update('userSettings', {
        morningDisplaySettings: {
          className,
          messageRotationMode: settings.morningDisplaySettings.messageRotationMode,
          instructionRotationMode: settings.morningDisplaySettings.instructionRotationMode,
          lastThemeId: settings.morningDisplaySettings.lastThemeId,
          lastThemeDate: settings.morningDisplaySettings.lastThemeDate,
        },
      });
      alert('Klassenavn lagret!');
    }
  };

  const handleSaveRotationMode = async () => {
    if (settings && settings.morningDisplaySettings) {
      await db.settings.update('userSettings', {
        morningDisplaySettings: {
          className: settings.morningDisplaySettings.className,
          messageRotationMode,
          instructionRotationMode,
          lastThemeId: settings.morningDisplaySettings.lastThemeId,
          lastThemeDate: settings.morningDisplaySettings.lastThemeDate,
        },
      });
      alert('Rotasjonsinnstillinger lagret!');
    }
  };

  const handleImportMessages = async () => {
    const lines = bulkMessages.split('\n').filter(line => line.trim() !== '');
    
    for (const line of lines) {
      await db.welcomeMessages.add({
        message: line.trim(),
        createdAt: new Date(),
      });
    }
    
    setBulkMessages('');
    alert(`${lines.length} meldinger importert!`);
  };

  const handleImportInstructions = async () => {
    const lines = bulkInstructions.split('\n').filter(line => line.trim() !== '');
    
    for (const line of lines) {
      await db.instructionMessages.add({
        message: line.trim(),
        createdAt: new Date(),
      });
    }
    
    setBulkInstructions('');
    alert(`${lines.length} instruksjoner importert!`);
  };

  const handleDeleteMessage = async (id: number) => {
    if (confirm('Er du sikker på at du vil slette denne meldingen?')) {
      await db.welcomeMessages.delete(id);
    }
  };

  const handleDeleteInstruction = async (id: number) => {
    if (confirm('Er du sikker på at du vil slette denne instruksjonen?')) {
      await db.instructionMessages.delete(id);
    }
  };

  return (
    <RewardSystemLayout showBackButton={true}>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Morning Display Innstillinger</h1>
          <p className="text-gray-600">
            Konfigurer meldinger, instruksjoner og dagsplaner for morgenvisningen.
          </p>
        </div>

        {/* Class Name */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Klassenavn</h2>
          <p className="text-gray-600 mb-4">
            Dette navnet brukes i velkomstmeldinger (f.eks. &quot;God morgen, &#123;klassenavn&#125;!&quot;).
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="F.eks. 'Superklassen', '5A', 'Ørneflokken'"
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <button
              onClick={handleSaveClassName}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Lagre
            </button>
          </div>
        </div>

        {/* Rotation Mode */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Rotasjonsmodus</h2>
          <div className="space-y-4">
            <div>
              <p className="font-medium mb-2">Velkomstmeldinger</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={messageRotationMode === 'daily'}
                    onChange={() => setMessageRotationMode('daily')}
                  />
                  <span>Roter én gang per dag</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={messageRotationMode === 'per-ringetid'}
                    onChange={() => setMessageRotationMode('per-ringetid')}
                  />
                  <span>Roter per ringetid</span>
                </label>
              </div>
            </div>

            <div>
              <p className="font-medium mb-2">Instruksjoner</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={instructionRotationMode === 'daily'}
                    onChange={() => setInstructionRotationMode('daily')}
                  />
                  <span>Roter én gang per dag</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={instructionRotationMode === 'per-ringetid'}
                    onChange={() => setInstructionRotationMode('per-ringetid')}
                  />
                  <span>Roter per ringetid</span>
                </label>
              </div>
            </div>

            <button
              onClick={handleSaveRotationMode}
              className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Lagre rotasjonsinnstillinger
            </button>
          </div>
        </div>

        {/* Welcome Messages */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Velkomstmeldinger</h2>
          <p className="text-gray-600 mb-4">
            Disse meldingene vil vises tilfeldig på morgenvisningen.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block font-medium mb-2">Importer meldinger (én per linje)</label>
              <textarea
                rows={6}
                value={bulkMessages}
                onChange={(e) => setBulkMessages(e.target.value)}
                placeholder={'God morgen, {klassenavn}!\nVelkommen til en ny dag!\nHei igjen! Klar for læring?'}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <button
                onClick={handleImportMessages}
                className="mt-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Importer meldinger
              </button>
            </div>

            <div>
              <h3 className="font-medium mb-2">Nåværende meldinger ({welcomeMessages?.length || 0})</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {welcomeMessages?.map((msg) => (
                  <div
                    key={msg.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="flex-1">{msg.message}</span>
                    <button
                      onClick={() => handleDeleteMessage(msg.id!)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {(!welcomeMessages || welcomeMessages.length === 0) && (
                  <p className="text-gray-500 italic">Ingen meldinger lagt til enda.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Instruksjoner</h2>
          <p className="text-gray-600 mb-4">
            Disse instruksjonene vises under velkomstmeldingen.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block font-medium mb-2">Importer instruksjoner (én per linje)</label>
              <textarea
                rows={6}
                value={bulkInstructions}
                onChange={(e) => setBulkInstructions(e.target.value)}
                placeholder="Sjekk inn på Teams, hent mikrofon og les stille i boka di\nLogg på PC-en, åpne dagens oppgaver og kom i gang\nFinn frem bøkene til dagens fag og gjør deg klar"
                className="w-full px-4 py-2 border rounded-lg"
              />
              <button
                onClick={handleImportInstructions}
                className="mt-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Importer instruksjoner
              </button>
            </div>

            <div>
              <h3 className="font-medium mb-2">Nåværende instruksjoner ({instructionMessages?.length || 0})</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {instructionMessages?.map((instr) => (
                  <div
                    key={instr.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="flex-1">{instr.message}</span>
                    <button
                      onClick={() => handleDeleteInstruction(instr.id!)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {(!instructionMessages || instructionMessages.length === 0) && (
                  <p className="text-gray-500 italic">Ingen instruksjoner lagt til enda.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Start Guide */}
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h2 className="text-xl font-semibold mb-3 text-blue-900">📖 Hurtigstart</h2>
          <ol className="space-y-2 text-blue-900">
            <li>1. Sett klassenavn (f.eks. &quot;Superklassen&quot;)</li>
            <li>2. Importer 10-20 velkomstmeldinger (bruk ChatGPT for inspirasjon!)</li>
            <li>3. Importer 5-10 instruksjoner</li>
            <li>4. Åpne <a href="/morning-display" target="_blank" className="underline font-semibold">/morning-display</a> på storskjermen</li>
            <li>5. Trykk F11 for fullskjerm</li>
          </ol>
        </div>
      </div>
    </RewardSystemLayout>
  );
}
