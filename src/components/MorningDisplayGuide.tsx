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
import { Monitor } from "lucide-react";

interface MorningDisplayGuideProps {
  open: boolean;
  onClose: () => void;
}

export default function MorningDisplayGuide({ open, onClose }: MorningDisplayGuideProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('morningDisplayGuideShown', 'true');
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Morgen Display - Kort guide
          </DialogTitle>
          <DialogDescription>
            Slik bruker du displayet på tavla
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm">
            Dette vises på tavla når elevene kommer:
          </p>

          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Velkomstmelding og dagens instrukser</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Dagens timeplan med fag og tema</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Poengoversikt (hvis du bruker belønningssystemet)</span>
            </li>
          </ul>

          <div className="rounded-lg bg-muted p-3 space-y-2">
            <p className="font-medium text-sm">💡 Tips</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Tilpass meldinger i Innstillinger → Morgen Display</li>
              <li>• Skjul poeng hvis du ikke bruker belønningssystemet</li>
              <li>• Trykk F11 for fullskjerm på tavla</li>
            </ul>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="dont-show-guide"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
            />
            <Label
              htmlFor="dont-show-guide"
              className="text-sm cursor-pointer"
            >
              Ikke vis denne igjen
            </Label>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleClose}>
            Ok, skjønner!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
