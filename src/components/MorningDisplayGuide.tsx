'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Monitor, Pencil, Calendar, EyeOff } from "lucide-react";

interface MorningDisplayGuideProps {
  open: boolean;
  onClose: () => void;
  onNavigateToSettings: () => void;
  onNavigateToSchedulePlanner: () => void;
}

export default function MorningDisplayGuide({ 
  open, 
  onClose, 
  onNavigateToSettings,
  onNavigateToSchedulePlanner 
}: MorningDisplayGuideProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('morningDisplayGuideShown', 'true');
    }
    onClose();
  };

  const handleNavigateToSettings = () => {
    handleClose();
    onNavigateToSettings();
  };

  const handleNavigateToSchedule = () => {
    handleClose();
    onNavigateToSchedulePlanner();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Monitor className="h-6 w-6" />
            <DialogTitle>Morgen Display - Kort guide</DialogTitle>
          </div>
          <DialogDescription>
            Slik bruker du displayet på tavla
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Seksjon 1: Hva som vises */}
          <div>
            <p className="text-sm mb-2">Dette vises på tavla når elevene kommer:</p>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Velkomstmelding og dagens instrukser</li>
              <li>• Dagens timeplan med fag og tema</li>
              <li>• Poengoversikt og felles fremgang (hvis du bruker belønningssystemet)</li>
              <li>• Hemmelig agent (hvis aktivert)</li>
            </ul>
          </div>

          <Separator />

          {/* Seksjon 2: Tilpass displayet */}
          <div>
            <h4 className="font-medium mb-3">Tilpass displayet:</h4>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleNavigateToSettings}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Rediger velkomstmelding
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleNavigateToSchedule}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Rediger timeplan
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleNavigateToSettings}
              >
                <EyeOff className="h-4 w-4 mr-2" />
                Skjul poeng
              </Button>
            </div>
          </div>

          <Separator />

          {/* Seksjon 3: Tips */}
          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm font-medium mb-2">💡 Tips</p>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Bruk piltaster (← →) for å navigere mellom sidene</li>
              <li>• Trykk F11 for fullskjerm på tavla</li>
            </ul>
          </div>

          {/* Seksjon 4: Checkbox + Lukk */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="dontShow"
                checked={dontShowAgain}
                onCheckedChange={(checked) => setDontShowAgain(checked === true)}
              />
              <Label htmlFor="dontShow" className="text-sm cursor-pointer">
                Ikke vis denne igjen
              </Label>
            </div>

            <Button onClick={handleClose} className="w-full">
              Ok, skjønner!
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
