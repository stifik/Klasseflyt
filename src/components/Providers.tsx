"use client";

import { MsalProvider } from "@azure/msal-react";
import { ThemeProvider } from "next-themes";
import { msalInstance } from "@/auth/msal";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <MsalProvider instance={msalInstance}>
                {children}
            </MsalProvider>
        </ThemeProvider>
    );
}
