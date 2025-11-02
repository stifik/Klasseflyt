'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { PlayCircle, Rocket } from 'lucide-react';

interface WelcomeScreenProps {
  open: boolean;
  onSelectDemo: () => void;
  onSelectQuickStart: () => void;
}

export function WelcomeScreen({ open, onSelectDemo, onSelectQuickStart }: WelcomeScreenProps) {
  return (
    <Dialog open={open}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-3xl">Velkommen til Klasseflyt!</DialogTitle>
          <DialogDescription className="text-lg">
            Velg hvordan du vil komme i gang
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 gap-6 mt-4">
          {/* Demo Option */}
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={onSelectDemo}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <PlayCircle className="h-8 w-8 text-blue-500" />
                <CardTitle>Se demo</CardTitle>
              </div>
              <CardDescription>
                Utforsk appen med ferdig testdata
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Perfekt for å bli kjent med alle funksjonene før du setter opp din egen klasse.
              </p>
              <ul className="text-sm space-y-2 mb-6">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>15 demo-elever med poeng og data</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>3 fag med lekser og innleveringer</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Eksempler på alle verktøy</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Bytt til ekte data når som helst</span>
                </li>
              </ul>
              <Button className="w-full" variant="outline">
                Start demo
              </Button>
            </CardContent>
          </Card>

          {/* Quick Start Option */}
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={onSelectQuickStart}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Rocket className="h-8 w-8 text-green-500" />
                <CardTitle>Kom i gang</CardTitle>
              </div>
              <CardDescription>
                Sett opp din klasse på 3 enkle steg
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Rask oppstart med det viktigste. Du kan alltid legge til mer senere.
              </p>
              <ul className="text-sm space-y-2 mb-6">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Legg til elever (bare navn)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Opprett fag du underviser i</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Klar til bruk på under 2 minutter</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Enkel veiviser gjennom prosessen</span>
                </li>
              </ul>
              <Button className="w-full">
                Start oppsett
              </Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
