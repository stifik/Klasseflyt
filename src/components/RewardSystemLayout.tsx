"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Settings, ArrowLeft } from 'lucide-react';

interface RewardSystemLayoutProps {
  children: React.ReactNode;
  showBackButton?: boolean;
  backButtonHref?: string;
}

const RewardSystemLayout: React.FC<RewardSystemLayoutProps> = ({ 
  children, 
  showBackButton = false,
  backButtonHref = "/"
}) => {
  return (
    <div className="min-h-screen bg-background relative">
      {/* Header with navigation */}
      <div className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            {showBackButton && (
              <Button variant="outline" size="sm" asChild>
                <Link href={backButtonHref} className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Tilbake til Klasseflyt
                </Link>
              </Button>
            )}
            <Link href="/terminal" className="text-xl font-semibold text-foreground hover:text-primary transition-colors cursor-pointer">
              Belønningssystem
            </Link>
          </div>
          
          {/* Settings button - always visible */}
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Innstillinger
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto p-4">
        {children}
      </main>
    </div>
  );
};

export default RewardSystemLayout;