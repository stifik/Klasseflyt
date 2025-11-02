'use client';

import { Alert, AlertDescription } from './ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';

interface DemoBannerProps {
  onSwitchToRealData: () => void;
}

export function DemoBanner({ onSwitchToRealData }: DemoBannerProps) {
  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>
          <strong>Demo-modus:</strong> Du bruker testdata. Endringer lagres ikke permanent.
        </span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onSwitchToRealData}
          className="ml-4 bg-white hover:bg-gray-100"
        >
          Bytt til ekte data
        </Button>
      </AlertDescription>
    </Alert>
  );
}
