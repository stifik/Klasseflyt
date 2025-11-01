

'use client';

import type {FC} from 'react';
import type {AppSettings, DashboardToolKey} from '@/lib/types';
import {Card, CardHeader, CardTitle, CardDescription} from '@/components/ui/card';
import {
    BookOpen, CalendarCheck, Megaphone, BarChart2, Users, Blocks, Smile, Annoyed,
    Eye, Shuffle, UserCheck, NotebookText, FileText, CheckSquare, Settings2, Award,
    Terminal, Monitor, Trophy, Store, Activity, Calendar, ShieldCheck, Settings as SettingsIcon
} from 'lucide-react';
import { cn} from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface DashboardProps {
  settings: AppSettings;
}

const allTools: {key: DashboardToolKey; label: string; description: string; icon: React.ElementType; color: string; href: string}[] = [
  {
    key: 'overview',
    label: 'Lekseoversikt',
    description: 'Full oversikt over lekser og innleveringer.',
    icon: BookOpen,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    href: '/homework',
  },
  {
    key: 'assessments',
    label: 'Vurderinger',
    description: 'Registrer og følg opp prøveresultater.',
    icon: Award,
    color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    href: '/assessments',
  },
  {
    key: 'dailyCheck',
    label: 'Daglig Sjekk',
    description: 'Registrer iPad-status for hver elev.',
    icon: CalendarCheck,
    color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    href: '/daily-check',
  },
  {
    key: 'morning-display',
    label: 'Morgen-Display',
    description: 'Vis velkommen og innsjekk-status for elevene.',
    icon: Monitor,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    href: '/morning-display',
  },
  {
    key: 'observations',
    label: 'Observasjoner',
    description: 'Registrer atferd og anmerkninger.',
    icon: Eye,
    color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    href: '/observations',
  },
  {
    key: 'observations.hourly',
    label: 'Timeinnsjekk',
    description: 'Loggfør arbeidsinnsats i sanntid.',
    icon: CheckSquare,
    color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
    href: '/observations',
  },
  {
    key: 'observations.remarks',
    label: 'Anmerkninger',
    description: 'Loggfør spesifikke hendelser raskt.',
    icon: Megaphone,
    color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    href: '/observations',
  },
  {
    key: 'classroomTools',
    label: 'Klasseverktøy',
    description: 'Klassekart, grupper og elev-trekker.',
    icon: Settings2,
    color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
    href: '/classroom/seating',
  },
  {
    key: 'classroomTools.seatingChart',
    label: 'Klassekart',
    description: 'Design klasserom og generer sitteplasser.',
    icon: Blocks,
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    href: '/classroom/seating',
  },
   {
    key: 'classroomTools.groupTool',
    label: 'Gruppeverktøy',
    description: 'Lag tilfeldige grupper raskt og enkelt.',
    icon: Shuffle,
    color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    href: '/classroom/groups',
  },
  {
    key: 'classroomTools.studentPicker',
    label: 'Elev-trekker',
    description: 'Trekk en tilfeldig elev fra klassekartet.',
    icon: UserCheck,
    color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
    href: '/classroom/picker',
  },
  {
    key: 'reports',
    label: 'Analyse',
    description: 'Analyser data og se trender over tid.',
    icon: BarChart2,
    color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    href: '/reports',
  },
  {
    key: 'reports.summary',
    label: 'Ukesoppsummering',
    description: 'Generer ukesmeldinger til foresatte.',
    icon: FileText,
    color: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
    href: '/reports',
  },
  {
    key: 'reports.studentReports',
    label: 'Elevrapporter',
    description: 'Se detaljerte rapporter per elev.',
    icon: NotebookText,
    color: 'bg-lime-100 text-lime-600 dark:bg-lime-900/30 dark:text-lime-400',
    href: '/reports',
  },
  {
    key: 'reports.analysis',
    label: 'Anmerkningsanalyse',
    description: 'Dykk ned i data om anmerkninger.',
    icon: BarChart2,
    color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    href: '/reports',
  },
  {
    key: 'poengsentral',
    label: 'Poengsentral',
    description: 'Komplett kontrollsenter for poeng og belønninger.',
    icon: Terminal,
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    href: '/poengsentral',
  },
  {
    key: 'rewardDashboard',
    label: 'Klassebank',
    description: 'Oversikt over elevenes poeng og transaksjoner.',
    icon: Trophy,
    color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    href: '/rewarddashboard',
  },
  {
    key: 'rewardStore',
    label: 'Belønningsbutikk',
    description: 'Kjøp belønninger med opptjente poeng.',
    icon: Store,
    color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    href: '/rewardstore',
  },
  {
    key: 'activityFeed',
    label: 'Aktivitetsfeed',
    description: 'Se aktivitet og transaksjoner i sanntid.',
    icon: Activity,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    href: '/activityfeed',
  },
  {
    key: 'secret-agent',
    label: 'Hemmelig Agent',
    description: 'Trekk hemmelig agent for uken.',
    icon: ShieldCheck,
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    href: '/secret-agent',
  },
  {
    key: 'weekly-planner',
    label: 'Ukesplanlegger',
    description: 'Planlegg timeplaner og leksjoner for hele uken.',
    icon: Calendar,
    color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    href: '/weekly-planner',
  },
];


const Dashboard: FC<DashboardProps> = ({settings}) => {
  const teacherName = settings.reportSettings.teacherName;
  const router = useRouter();

  const visibleTools = settings.dashboardTools
    .filter(toolConfig => toolConfig.visible)
    .map(toolConfig => {
        const toolData = allTools.find(t => t.key === toolConfig.key);
        return toolData;
    }).filter(Boolean) as typeof allTools;


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
          
          // Open morning-display in new window, others use router
          const handleClick = () => {
            if (tool.key === 'morning-display') {
              window.open(tool.href, '_blank');
            } else {
              router.push(tool.href);
            }
          };
          
          // settings link removed

          return (
            <Card
              key={tool.key}
              onClick={handleClick}
              className="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all relative"
            >
              <CardHeader className="flex flex-row items-center gap-4">
                <div className={cn('p-3 rounded-full', tool.color)}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <CardTitle>{tool.label}</CardTitle>
                  <CardDescription>{tool.description}</CardDescription>
                </div>
                {/* gear/settings icon removed as per UI preference */}
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
