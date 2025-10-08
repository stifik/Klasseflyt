

'use client';

import type {FC} from 'react';
import type {AppSettings, TabKey, DashboardToolKey} from '@/lib/types';
import {Card, CardHeader, CardTitle, CardDescription} from '@/components/ui/card';
import {
    BookOpen, CalendarCheck, Megaphone, BarChart2, Users, Blocks, Smile, Annoyed, 
    Eye, Shuffle, UserCheck, NotebookText, FileText, CheckSquare, Settings2, Award,
    Trophy, Store, Presentation
} from 'lucide-react';
import {cn} from '@/lib/utils';

interface DashboardProps {
  settings: AppSettings;
  onNavigate: (tab: TabKey, subTab?: string) => void;
}

const allTools: {key: DashboardToolKey; label: string; description: string; icon: React.ElementType; color: string}[] = [
  {
    key: 'overview',
    label: 'Lekseoversikt',
    description: 'Full oversikt over lekser og innleveringer.',
    icon: BookOpen,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  },
  {
    key: 'assessments',
    label: 'Vurderinger',
    description: 'Registrer og følg opp prøveresultater.',
    icon: Award,
    color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  },
  {
    key: 'dailyCheck',
    label: 'Daglig Sjekk',
    description: 'Registrer iPad-status for hver elev.',
    icon: CalendarCheck,
    color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  },
  {
    key: 'observations',
    label: 'Observasjoner',
    description: 'Registrer atferd og anmerkninger.',
    icon: Eye,
    color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  {
    key: 'observations.hourly',
    label: 'Timeinnsjekk',
    description: 'Loggfør arbeidsinnsats i sanntid.',
    icon: CheckSquare,
    color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
  },
  {
    key: 'observations.remarks',
    label: 'Anmerkninger',
    description: 'Loggfør spesifikke hendelser raskt.',
    icon: Megaphone,
    color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  },
  {
    key: 'classroomTools',
    label: 'Klasseverktøy',
    description: 'Klassekart, grupper og elev-trekker.',
    icon: Settings2,
    color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
  },
  {
    key: 'classroomTools.seatingChart',
    label: 'Klassekart',
    description: 'Design klasserom og generer sitteplasser.',
    icon: Blocks,
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  },
   {
    key: 'classroomTools.groupTool',
    label: 'Gruppeverktøy',
    description: 'Lag tilfeldige grupper raskt og enkelt.',
    icon: Shuffle,
    color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  },
  {
    key: 'classroomTools.studentPicker',
    label: 'Elev-trekker',
    description: 'Trekk en tilfeldig elev fra klassekartet.',
    icon: UserCheck,
    color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
  },
  {
    key: 'reports',
    label: 'Analyse',
    description: 'Analyser data og se trender over tid.',
    icon: BarChart2,
    color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  },
  {
    key: 'reports.summary',
    label: 'Ukesoppsummering',
    description: 'Generer ukesmeldinger til foresatte.',
    icon: FileText,
    color: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
  },
  {
    key: 'reports.studentReports',
    label: 'Elevrapporter',
    description: 'Se detaljerte rapporter per elev.',
    icon: NotebookText,
    color: 'bg-lime-100 text-lime-600 dark:bg-lime-900/30 dark:text-lime-400',
  },
  {
    key: 'reports.analysis',
    label: 'Anmerkningsanalyse',
    description: 'Dykk ned i data om anmerkninger.',
    icon: BarChart2,
    color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  {
    key: 'rewardDashboard',
    label: 'Belønningsoversikt',
    description: 'Se klassens totale poengstand og statistikk.',
    icon: Trophy,
    color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  },
  {
    key: 'rewardStore',
    label: 'Belønningsbutikk',
    description: 'La elevene bruke poengene sine.',
    icon: Store,
    color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  {
    key: 'projectorLeaderboard',
    label: 'Tavle-toppliste',
    description: 'Vis poeng-topplisten på tavla.',
    icon: Presentation,
    color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
  },
];


const Dashboard: FC<DashboardProps> = ({settings, onNavigate}) => {
  const teacherName = settings.reportSettings.teacherName;
  
  const visibleTools = settings.dashboardTools
    .filter(toolConfig => toolConfig.visible)
    .map(toolConfig => {
        const toolData = allTools.find(t => t.key === toolConfig.key);
        if (!toolData) return null;

        const [tab, subTab] = toolData.key.split('.') as [TabKey, string | undefined];
        
        // Handle special reward tools that link to separate pages
        if (toolData.key === 'rewardDashboard' || toolData.key === 'rewardStore' || toolData.key === 'projectorLeaderboard') {
            return {
                ...toolData,
                tab: null,
                subTab: null,
                externalLink: `/${toolData.key.toLowerCase()}`,
            };
        }
        
        return {
            ...toolData,
            tab,
            subTab,
        };
    }).filter(Boolean);


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Velkommen {teacherName}!</h2>
        <p className="text-muted-foreground">Velg et verktøy for å komme i gang.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visibleTools.map((tool) => {
          if (!tool) return null;
          const Icon = tool.icon;
          return (
            <Card
              key={tool.key}
              onClick={() => {
                if (tool.externalLink) {
                  window.open(tool.externalLink, '_blank');
                } else {
                  onNavigate(tool.tab, tool.subTab);
                }
              }}
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
