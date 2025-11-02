'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Save, Calendar, Monitor, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type { MorningDisplaySettings as MorningDisplaySettingsType } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function MorningDisplaySettings() {
  const settings = useLiveQuery(() => db.settings.get('userSettings'));
  const welcomeMessages = useLiveQuery(() => db.welcomeMessages.toArray());
  const instructionMessages = useLiveQuery(() => db.instructionMessages.toArray());

  const [className, setClassName] = useState('');
  const [messageRotationMode, setMessageRotationMode] = useState<'daily' | 'per-ringetid'>('daily');
  const [instructionRotationMode, setInstructionRotationMode] = useState<'daily' | 'per-ringetid'>('daily');
  const [messagesText, setMessagesText] = useState('');
  const [instructionsText, setInstructionsText] = useState('');
  const [showPointsList, setShowPointsList] = useState(true);
  const [showProgressBar, setShowProgressBar] = useState(true);
  const [showSecretAgent, setShowSecretAgent] = useState(true);
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);

  // Check for anchor links and open relevant sections
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const fullHash = window.location.hash;
      // Handle both #welcome-messages and #morning#welcome-messages
      if (fullHash.includes('welcome-messages')) {
        setOpenAccordions(['messages']);
        setTimeout(() => {
          document.getElementById('welcome-messages')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);
      } else if (fullHash.includes('display-toggles')) {
        // Display toggles are always visible (not in accordion)
        setTimeout(() => {
          document.getElementById('display-toggles')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);
      }
    }
  }, []);

  useEffect(() => {
    if (settings?.morningDisplaySettings) {
      setClassName(settings.morningDisplaySettings.className);
      setMessageRotationMode(settings.morningDisplaySettings.messageRotationMode);
      setInstructionRotationMode(settings.morningDisplaySettings.instructionRotationMode);
      setShowPointsList(settings.morningDisplaySettings.showPointsList ?? true);
      setShowProgressBar(settings.morningDisplaySettings.showProgressBar ?? true);
      setShowSecretAgent(settings.morningDisplaySettings.showSecretAgent ?? true);
    }
  }, [settings]);

  // Auto-save toggles when they change
  useEffect(() => {
    const saveToggles = async () => {
      if (!settings?.morningDisplaySettings) return;
      
      try {
        await db.settings.update('userSettings', {
          morningDisplaySettings: {
            ...settings.morningDisplaySettings,
            showPointsList,
            showProgressBar,
            showSecretAgent,
          },
        });
      } catch (error) {
        console.error('Error auto-saving display toggles:', error);
      }
    };

    // Only save if settings are loaded (not initial state)
    if (settings?.morningDisplaySettings) {
      saveToggles();
    }
  }, [showPointsList, showProgressBar, showSecretAgent]);

  useEffect(() => {
    if (welcomeMessages) {
      const text = welcomeMessages.map(msg => msg.message).join('\n');
      setMessagesText(text);
    }
  }, [welcomeMessages]);

  useEffect(() => {
    if (instructionMessages) {
      const text = instructionMessages.map(instr => instr.message).join('\n');
      setInstructionsText(text);
    }
  }, [instructionMessages]);

  const handleSaveClassName = async () => {
    try {
      const current = await db.settings.get('userSettings');
      if (current) {
        const updatedMorning = {
          className,
          messageRotationMode: current.morningDisplaySettings?.messageRotationMode ?? 'daily',
          instructionRotationMode: current.morningDisplaySettings?.instructionRotationMode ?? 'daily',
          lastThemeId: current.morningDisplaySettings?.lastThemeId,
          lastThemeDate: current.morningDisplaySettings?.lastThemeDate,
        };

        await db.settings.update('userSettings', {
          morningDisplaySettings: updatedMorning,
        });
      } else {
        await db.settings.put({
          id: 'userSettings',
          morningDisplaySettings: {
            className,
            messageRotationMode: 'daily',
            instructionRotationMode: 'daily',
          },
        } as any);
      }

      alert('Klassenavn lagret!');
    } catch (error) {
      console.error('Error saving class name:', error);
      alert('Feil ved lagring av klassenavn');
    }
  };



  const handleSaveRotationMode = async () => {
    try {
      const current = await db.settings.get('userSettings');
      if (current) {
        const updatedMorning = {
          className: current.morningDisplaySettings?.className ?? className,
          messageRotationMode,
          instructionRotationMode,
          lastThemeId: current.morningDisplaySettings?.lastThemeId,
          lastThemeDate: current.morningDisplaySettings?.lastThemeDate,
        };

        await db.settings.update('userSettings', {
          morningDisplaySettings: updatedMorning,
        });
      } else {
        await db.settings.put({
          id: 'userSettings',
          morningDisplaySettings: {
            className,
            messageRotationMode,
            instructionRotationMode,
          },
        } as any);
      }

      alert('Rotasjonsinnstillinger lagret!');
    } catch (error) {
      console.error('Error saving rotation mode:', error);
      alert('Feil ved lagring av rotasjonsinnstillinger');
    }
  };

  const handleSaveMessages = async () => {
    try {
      await db.welcomeMessages.clear();
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
      await db.instructionMessages.clear();
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
    <div className="space-y-4">
      {/* Klassenavn og rotasjon - Direkte synlig */}
      <Card>
        <CardHeader>
          <CardTitle>Klassenavn og rotasjon</CardTitle>
          <CardDescription>Grunnleggende innstillinger for morgenvisningen</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="className">Klassenavn</Label>
            <p className="text-sm text-muted-foreground">
              Dette navnet brukes i velkomstmeldinger (f.eks. "God morgen, {'{klassenavn}'}!")
            </p>
            <div className="flex gap-2">
              <Input
                id="className"
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="F.eks. 'Superklassen', '5A', 'Ørneflokken'"
              />
              <Button onClick={handleSaveClassName}>
                <Save className="w-4 h-4 mr-2" />
                Lagre
              </Button>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <div>
              <p className="font-medium mb-2">Velkomstmeldinger - rotasjonsmodus</p>
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
              <p className="font-medium mb-2">Instruksjoner - rotasjonsmodus</p>
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

            <Button onClick={handleSaveRotationMode} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              Lagre rotasjonsinnstillinger
            </Button>
          </div>

          <Separator />

          {/* Display toggles */}
          <div className="space-y-2" id="display-toggles">
            <div className="flex items-center gap-2 mb-3">
              <Monitor className="w-4 h-4" />
              <h4 className="font-medium text-sm">Vis på display</h4>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label htmlFor="show-points-list" className="font-medium cursor-pointer">
                  Poengliste
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Vis elevenes poeng på venstre side
                </p>
              </div>
              <Switch
                id="show-points-list"
                checked={showPointsList}
                onCheckedChange={setShowPointsList}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label htmlFor="show-progress-bar" className="font-medium cursor-pointer">
                  Felles belønning (progress bar)
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Vis klassens fremgang mot neste belønning
                </p>
              </div>
              <Switch
                id="show-progress-bar"
                checked={showProgressBar}
                onCheckedChange={setShowProgressBar}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label htmlFor="show-secret-agent" className="font-medium cursor-pointer">
                  Hemmelig agent
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Vis "Hemmelig agent"-siden i displayet
                </p>
              </div>
              <Switch
                id="show-secret-agent"
                checked={showSecretAgent}
                onCheckedChange={setShowSecretAgent}
              />
            </div>
          </div>

          <Separator />

          {/* Fullskjerm tips og preview */}
          <div className="space-y-3">
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium mb-1">💡 Tips</p>
              <p className="text-muted-foreground">
                Trykk <kbd className="px-2 py-1 bg-background border rounded text-xs">F11</kbd> for å vise displayet i fullskjerm på tavla.
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open('/morning-display', '_blank')}
            >
              <ExternalLink className="mr-2 w-4 h-4" />
              Forhåndsvis Display
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Accordions for resten */}
      <Accordion 
        type="multiple" 
        value={openAccordions}
        onValueChange={setOpenAccordions}
        className="w-full space-y-4"
      >
        <AccordionItem value="messages" className="border-b-0">
          <Card id="welcome-messages">
            <CardHeader>
              <AccordionTrigger className="p-0 hover:no-underline">
                <CardTitle>Velkomstmeldinger ({welcomeMessages?.length || 0})</CardTitle>
              </AccordionTrigger>
              <CardDescription>
                Skriv inn meldinger, én per linje. Disse vil vises tilfeldig på morgenvisningen.
              </CardDescription>
            </CardHeader>
            <AccordionContent asChild>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <Label htmlFor="messages">Meldinger (én per linje)</Label>
                  <Textarea
                    id="messages"
                    rows={10}
                    value={messagesText}
                    onChange={(e) => setMessagesText(e.target.value)}
                    placeholder={'God morgen, {klassenavn}!\nVelkommen til en ny dag!\nHei igjen! Klar for læring?\nFlott å se dere!\nLa oss gjøre i dag til en fantastisk dag!'}
                    className="font-mono text-sm"
                  />
                  <Button onClick={handleSaveMessages}>
                    <Save className="w-4 h-4 mr-2" />
                    Lagre meldinger
                  </Button>
                </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        <AccordionItem value="instructions" className="border-b-0">
          <Card>
            <CardHeader>
              <AccordionTrigger className="p-0 hover:no-underline">
                <CardTitle>Instruksjoner ({instructionMessages?.length || 0})</CardTitle>
              </AccordionTrigger>
              <CardDescription>
                Skriv inn instruksjoner, én per linje. Disse vises under velkomstmeldingen.
              </CardDescription>
            </CardHeader>
            <AccordionContent asChild>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <Label htmlFor="instructions">Instruksjoner (én per linje)</Label>
                  <Textarea
                    id="instructions"
                    rows={8}
                    value={instructionsText}
                    onChange={(e) => setInstructionsText(e.target.value)}
                    placeholder="Sjekk inn på Teams, hent mikrofon og les stille i boka di\nLogg på PC-en, åpne dagens oppgaver og kom i gang\nFinn frem bøkene til dagens fag og gjør deg klar\nHusk å levere lekser før klokka 10"
                    className="font-mono text-sm"
                  />
                  <Button onClick={handleSaveInstructions}>
                    <Save className="w-4 h-4 mr-2" />
                    Lagre instruksjoner
                  </Button>
                </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        <AccordionItem value="advanced" className="border-b-0">
          <Card>
            <CardHeader>
              <AccordionTrigger className="p-0 hover:no-underline">
                <CardTitle>Avanserte innstillinger</CardTitle>
              </AccordionTrigger>
              <CardDescription>
                Tidsbaserte meldinger, temaer, ukesmaler og timeplaner
              </CardDescription>
            </CardHeader>
            <AccordionContent asChild>
              <CardContent className="pt-4 space-y-3">
                <Link
                  href="/settings/time-based-messages"
                  className="block p-4 border rounded-lg hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    <div>
                      <h3 className="font-semibold">Tidsbaserte meldinger</h3>
                      <p className="text-sm text-muted-foreground">
                        Konfigurer forskjellige meldinger for hver ukedag og tidsperiode
                      </p>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/settings/themes"
                  className="block p-4 border rounded-lg hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🎨</span>
                    <div>
                      <h3 className="font-semibold">Temaer og bakgrunner</h3>
                      <p className="text-sm text-muted-foreground">
                        Tilpass visuelle tema for morgenvisningen
                      </p>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/settings/weekly-schedule"
                  className="block p-4 border rounded-lg hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📋</span>
                    <div>
                      <h3 className="font-semibold">Ukesmaler for dagsplan</h3>
                      <p className="text-sm text-muted-foreground">
                        Konfigurer maler for dagsplanen
                      </p>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/weekly-planner"
                  className="block p-4 border rounded-lg hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📅</span>
                    <div>
                      <h3 className="font-semibold">Ukesplanlegger (timeplaner)</h3>
                      <p className="text-sm text-muted-foreground">
                        Planlegg timeplaner for hele uken
                      </p>
                    </div>
                  </div>
                </Link>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>
      </Accordion>

      {/* Hurtigstart guide */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">📖 Hurtigstart</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-blue-900 dark:text-blue-100">
            <li>1. Sett klassenavn (f.eks. "Superklassen")</li>
            <li>2. Skriv inn 10-20 velkomstmeldinger (bruk gjerne ChatGPT for inspirasjon!)</li>
            <li>3. Skriv inn 5-10 instruksjoner</li>
            <li>4. Åpne <a href="/morning-display" target="_blank" className="underline font-semibold">/morning-display</a> på storskjermen</li>
            <li>5. Trykk F11 for fullskjerm</li>
          </ol>
          <p className="mt-3 text-sm text-blue-800 dark:text-blue-200">
            💡 Tips: Du kan enkelt redigere tekstene direkte i tekstboksene - legg til, fjern eller endre linjer som du vil!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
