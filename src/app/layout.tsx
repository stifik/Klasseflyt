import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { Providers } from '@/components/Providers';
import { MainLayout } from '@/components/navigation/MainLayout';
import { BackupReminderToast } from '@/components/BackupReminderToast';
import { CheckInReminderToast } from '@/components/CheckInReminderToast';
import PlausibleProvider from 'next-plausible';

export const metadata: Metadata = {
  title: 'Klasseflyt',
  description: 'En app for lærere for å administrere klasserommet effektivt.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <head>
        <PlausibleProvider domain="klasseflyt.no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased h-full">
        <Providers>
          <MainLayout>
            {children}
          </MainLayout>
          <BackupReminderToast />
          <CheckInReminderToast />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
