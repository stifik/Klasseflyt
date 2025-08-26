
'use client';

import type {FC} from 'react';
import type {AppSettings, TabKey} from '@/lib/types';
import {Card, CardHeader, CardTitle, CardDescription} from '@/components/ui/card';
import {BookOpen, CalendarCheck, Megaphone, BarChart2, Users, Blocks, Smile, Annoyed, Eye} from 'lucide-react';
import {cn} from '@/lib/utils';

interface DashboardProps {
  settings: AppSettings;
  onNavigate: (tab: TabKey) => void;
}

const tabInfo: Partial<Record<TabKey, {label: string; description: string; icon: React.ElementType; color: string}>> = {
  overview: {
    label: 'Lekseoversikt',
    description: 'Full oversikt over lekser og innleveringer.',
    icon: BookOpen,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  },
  dailyCheck: {
    label: 'Daglig Sjekk',
    description: 'Registrer iPad-status for hver elev.',
    icon: CalendarCheck,
    color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  },
  observations: {
    label: 'Observasjoner',
    description: 'Loggfør atferd og anmerkninger i timen.',
    icon: Eye,
    color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
  },
  reports: {
    label: 'Analyse',
    description: 'Analyser data og generer ukesmeldinger.',
    icon: BarChart2,
    color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  classroomTools: {
    label: 'Klasseverktøy',
    description: 'Design klasserom, lag grupper og trekk elever.',
    icon: Users,
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  },
};

const Dashboard: FC<DashboardProps> = ({settings, onNavigate}) => {
  const visibleTabs = settings.tabOrder.filter((tabKey) => settings.tabs[tabKey] && tabInfo[tabKey]);
  const teacherName = settings.reportSettings.teacherName;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Velkommen {teacherName}!</h2>
        <p className="text-muted-foreground">Velg et verktøy for å komme i gang.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visibleTabs.map((tabKey) => {
          const info = tabInfo[tabKey];
          if (!info) return null;
          const Icon = info.icon;
          return (
            <Card
              key={tabKey}
              onClick={() => onNavigate(tabKey)}
              className="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all"
            >
              <CardHeader className="flex flex-row items-center gap-4">
                <div className={cn('p-3 rounded-full', info.color)}>
                  <Icon className="w-6 h-6" />
                </div>
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
