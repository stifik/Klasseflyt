'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import RewardSystemLayout from '@/components/RewardSystemLayout';
import { Save } from 'lucide-react';
import type { WelcomeMessage, InstructionMessage, ScheduleTemplate } from '@/lib/types';

export default function MorningDisplaySettingsPage() {
  const settings = useLiveQuery(() => db.settings.get('userSettings'));
  const welcomeMessages = useLiveQuery(() => db.welcomeMessages.toArray());
  const instructionMessages = useLiveQuery(() => db.instructionMessages.toArray());
  const scheduleTemplates = useLiveQuery(() => db.scheduleTemplates.toArray());

  const [className, setClassName] = useState('');
  const [messageRotationMode, setMessageRotationMode] = useState<'daily' | 'per-ringetid'>('daily');
  const [instructionRotationMode, setInstructionRotationMode] = useState<'daily' | 'per-ringetid'>('daily');
  const [messagesText, setMessagesText] = useState('');
  const [instructionsText, setInstructionsText] = useState('');

  useEffect(() => {
    if (settings?.morningDisplaySettings) {
      setClassName(settings.morningDisplaySettings.className);
      setMessageRotationMode(settings.morningDisplaySettings.messageRotationMode);
      setInstructionRotationMode(settings.morningDisplaySettings.instructionRotationMode);
    }
  }, [settings]);

  // Load welcome messages into textarea
  useEffect(() => {
    if (welcomeMessages) {
      const text = welcomeMessages.map(msg => msg.message).join('\n');
      setMessagesText(text);
    }
  }, [welcomeMessages]);

  // Load instruction messages into textarea
  useEffect(() => {
    if (instructionMessages) {
      const text = instructionMessages.map(instr => instr.message).join('\n');
      setInstructionsText(text);
    }
  }, [instructionMessages]);

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

  const handleSaveMessages = async () => {
    try {
      // Clear all existing messages
      await db.welcomeMessages.clear();
      
      // Add new messages from textarea (one per line)
      const lines = messagesText.split('\n').filter(line => line.trim() !== '');
      
      for (const line of lines) {
        await db.welcomeMessages.add({
          message: line.trim(),
          createdAt: new Date(),
        });
      }
      
      alert(`${lines.length} meldinger lagret!`);
    } catch (error) {
      console.error('Error saving messages:', error);
      alert('Feil ved lagring av meldinger');
    }
  };

  const handleSaveInstructions = async () => {
    try {
      // Clear all existing instructions
      await db.instructionMessages.clear();
      
      // Add new instructions from textarea (one per line)
      const lines = instructionsText.split('\n').filter(line => line.trim() !== '');
      
      for (const line of lines) {
        await db.instructionMessages.add({
          message: line.trim(),
          createdAt: new Date(),
        });
      }
      
      alert(`${lines.length} instruksjoner lagret!`);
    } catch (error) {
      console.error('Error saving instructions:', error);
      alert('Feil ved lagring av instruksjoner');
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
          <div className="flex gap-3" suppressHydrationWarning>
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
            Skriv inn meldinger, én per linje. Disse vil vises tilfeldig på morgenvisningen.
            <br />
            <span className="text-sm text-gray-500">
              Antall meldinger: {welcomeMessages?.length || 0}
            </span>
          </p>

          <div className="space-y-4">
            <div>
              <label className="block font-medium mb-2">Meldinger (én per linje)</label>
              <textarea
                rows={10}
                value={messagesText}
                onChange={(e) => setMessagesText(e.target.value)}
                placeholder={'God morgen, {klassenavn}!\nVelkommen til en ny dag!\nHei igjen! Klar for læring?\nFlott å se dere!\nLa oss gjøre i dag til en fantastisk dag!'}
                className="w-full px-4 py-2 border rounded-lg font-mono text-sm"
              />
              <button
                onClick={handleSaveMessages}
                className="mt-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Lagre meldinger
              </button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Instruksjoner</h2>
          <p className="text-gray-600 mb-4">
            Skriv inn instruksjoner, én per linje. Disse vises under velkomstmeldingen.
            <br />
            <span className="text-sm text-gray-500">
              Antall instruksjoner: {instructionMessages?.length || 0}
            </span>
          </p>

          <div className="space-y-4">
            <div>
              <label className="block font-medium mb-2">Instruksjoner (én per linje)</label>
              <textarea
                rows={8}
                value={instructionsText}
                onChange={(e) => setInstructionsText(e.target.value)}
                placeholder="Sjekk inn på Teams, hent mikrofon og les stille i boka di\nLogg på PC-en, åpne dagens oppgaver og kom i gang\nFinn frem bøkene til dagens fag og gjør deg klar\nHusk å levere lekser før klokka 10"
                className="w-full px-4 py-2 border rounded-lg font-mono text-sm"
              />
              <button
                onClick={handleSaveInstructions}
                className="mt-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Lagre instruksjoner
              </button>
            </div>
          </div>
        </div>

        {/* Quick Start Guide */}
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h2 className="text-xl font-semibold mb-3 text-blue-900">📖 Hurtigstart</h2>
          <ol className="space-y-2 text-blue-900">
            <li>1. Sett klassenavn (f.eks. &quot;Superklassen&quot;)</li>
            <li>2. Skriv inn 10-20 velkomstmeldinger (bruk gjerne ChatGPT for inspirasjon!)</li>
            <li>3. Skriv inn 5-10 instruksjoner</li>
            <li>4. Åpne <a href="/morning-display" target="_blank" className="underline font-semibold">/morning-display</a> på storskjermen</li>
            <li>5. Trykk F11 for fullskjerm</li>
          </ol>
          <p className="mt-3 text-sm text-blue-800">
            💡 Tips: Du kan enkelt redigere tekstene direkte i tekstboksene - legg til, fjern eller endre linjer som du vil!
          </p>
        </div>
      </div>
    </RewardSystemLayout>
  );
}
