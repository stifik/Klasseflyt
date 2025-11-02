'use client';

import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Info } from 'lucide-react';
import { Button } from './ui/button';

interface LocalStorageInfoProps {
  onClose: () => void;
}

export function LocalStorageInfo({ onClose }: LocalStorageInfoProps) {
  return (
    <div className="fixed bottom-6 right-6 z-30 max-w-md">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Om datalagring</AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <p>
            Klasseflyt lagrer all data lokalt i nettleseren din. Ingenting sendes til en server.
          </p>
          <p className="text-sm">
            <strong>Viktig:</strong> Hvis du sletter nettleserdata eller browsercache, vil dataene dine forsvinne. 
            Ta regelmessige sikkerhetskopier via innstillinger.
          </p>
          <Button variant="default" size="sm" onClick={onClose} className="mt-3">
            Jeg forstår
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
