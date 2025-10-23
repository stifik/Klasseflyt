"use client";

import { useEffect } from "react";
import { AppThemeProvider } from "./ThemeProvider";
import { ensureActionsInitialized } from "@/lib/db";

export function Providers({ children }: { children: React.ReactNode }) {
  // Initialize actions on app startup
  useEffect(() => {
    ensureActionsInitialized().catch(console.error);
  }, []);

  return (
    <AppThemeProvider>
      {children}
    </AppThemeProvider>
  );
}
