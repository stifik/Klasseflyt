
'use client';

import { FC } from 'react';
import type { AppSettings, TabKey } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BookOpen, CalendarCheck, Megaphone, BarChart2, Users, Shuffle, Hand, AreaChart } from 'lucide-react';

interface DashboardProps {
  settings: AppSettings;
  onNavigate: (tab: TabKey) => void;
}

const tabInfo: Record<TabKey, { label: string; description: string; icon: React.ElementType }> = {
  overview: {
    label: "Lekseoversikt",
    description: "Full oversikt over lekser og innleveringer.",
    icon: BookOpen,
  },
  dailyCheck: {
    label: "Daglig Sjekk",
    description: "Registrer iPad-status for hver elev.",
    icon: CalendarCheck,
  },
  remarks: {
    label: "Anmerkninger",
    description: "Loggfør anmerkninger raskt og enkelt.",
    icon: Megaphone,
  },
  reports: {
    label: "Rapporter",
    description: "Analyser data og generer ukesmeldinger.",
    icon: BarChart2,
  },
  seatingChart: {
    label: "Klassekart",
    description: "Design klasserom og generer sitteplasser.",
    icon: Users,
  },
  groupTool: {
    label: "Gruppeverktøy",
    description: "Lag tilfeldige grupper for samarbeid.",
    icon: Shuffle,
  },
  studentPicker: {
    label: "Elev-trekker",
    description: "Trekk en tilfeldig elev fra klassen.",
    icon: Hand,
  },
  remarkAnalysis: {
    label: "Anmerkningsanalyse",
    description: "Analyser mønstre i anmerkninger.",
    icon: AreaChart,
  },
};

const Dashboard: FC<DashboardProps> = ({ settings, onNavigate }) => {
  const visibleTabs = settings.tabOrder.filter(tabKey => settings.tabs[tabKey]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Velkommen!</h2>
        <p className="text-muted-foreground">Velg et verktøy for å komme i gang.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visibleTabs.map(tabKey => {
          const info = tabInfo[tabKey];
          const Icon = info.icon;
          return (
            <Card 
              key={tabKey} 
              onClick={() => onNavigate(tabKey)}
              className="cursor-pointer hover:border-primary hover:shadow-lg transition-all"
            >
              <CardHeader className="flex flex-row items-center gap-4">
                <Icon className="w-8 h-8 text-primary" />
                <div>
                  <CardTitle>{info.label}</CardTitle>
                  <CardDescription>{info.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
