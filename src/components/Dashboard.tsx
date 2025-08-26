
'use client';

import type {FC} from 'react';
import type {AppSettings, TabKey} from '@/lib/types';
import {Card, CardHeader, CardTitle, CardDescription} from '@/components/ui/card';
import {BookOpen, CalendarCheck, Megaphone, BarChart2, Users, Blocks, Smile, Annoyed, Eye, Shuffle, UserCheck} from 'lucide-react';
import {cn} from '@/lib/utils';

interface DashboardProps {
  settings: AppSettings;
  onNavigate: (tab: TabKey, subTab?: string) => void;
}

const mainTools: {key: string; tab: TabKey; subTab?: string; label: string; description: string; icon: React.ElementType; color: string}[] = [
  {
    key: 'overview',
    tab: 'overview',
    label: 'Lekseoversikt',
    description: 'Full oversikt over lekser og innleveringer.',
    icon: BookOpen,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  },
  {
    key: 'dailyCheck',
    tab: 'dailyCheck',
    label: 'Daglig Sjekk',
    description: 'Registrer iPad-status for hver elev.',
    icon: CalendarCheck,
    color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  },
  {
    key: 'observations',
    tab: 'observations',
    label: 'Observasjoner',
    description: 'Loggfør atferd og anmerkninger i timen.',
    icon: Eye,
    color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
  },
  {
    key: 'seating-chart',
    tab: 'classroomTools',
    subTab: 'seating-chart',
    label: 'Klassekart',
    description: 'Design klasserom og generer sitteplasser.',
    icon: Blocks,
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  },
   {
    key: 'group-tool',
    tab: 'classroomTools',
    subTab: 'group-tool',
    label: 'Gruppeverktøy',
    description: 'Lag tilfeldige grupper raskt og enkelt.',
    icon: Shuffle,
    color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  },
  {
    key: 'student-picker',
    tab: 'classroomTools',
    subTab: 'student-picker',
    label: 'Elev-trekker',
    description: 'Trekk en tilfeldig elev fra klassekartet.',
    icon: UserCheck,
    color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
  },
  {
    key: 'reports',
    tab: 'reports',
    label: 'Analyse',
    description: 'Analyser data og generer ukesmeldinger.',
    icon: BarChart2,
    color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
];


const Dashboard: FC<DashboardProps> = ({settings, onNavigate}) => {
  const visibleTabs = new Set(settings.tabOrder.filter((tabKey) => settings.tabs[tabKey]));
  const teacherName = settings.reportSettings.teacherName;
  
  const visibleTools = mainTools.filter(tool => visibleTabs.has(tool.tab));


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Velkommen {teacherName}!</h2>
        <p className="text-muted-foreground">Velg et verktøy for å komme i gang.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visibleTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Card
              key={tool.key}
              onClick={() => onNavigate(tool.tab, tool.subTab)}
              className="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all"
            >
              <CardHeader className="flex flex-row items-center gap-4">
                <div className={cn('p-3 rounded-full', tool.color)}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle>{tool.label}</CardTitle>
                  <CardDescription>{tool.description}</CardDescription>
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
