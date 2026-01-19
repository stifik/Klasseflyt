"use client";

import { useEffect } from "react";
import { AppThemeProvider } from "./ThemeProvider";
import { ensureActionsInitialized } from "@/lib/db";
import { useAutomaticBackup } from "@/hooks/useAutomaticBackup";

function AutoBackupManager() {
  // This component just activates the automatic backup hook globally
  useAutomaticBackup();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  // Initialize actions on app startup
  useEffect(() => {
    ensureActionsInitialized().catch(console.error);
  }, []);

  return (
    <AppThemeProvider>
      <AutoBackupManager />
      {children}
    </AppThemeProvider>
  );
}
