import { ReactNode } from 'react';
import SettingsButton from './SettingsButton';

interface PageHeaderProps {
  title: string;
  settingsUrl?: string;
  children?: ReactNode;
  className?: string;
}

/**
 * PageHeader - A reusable header component for pages
 *
 * Usage:
 * <PageHeader title="Morning Display" settingsUrl="/settings/morning-display" />
 * <PageHeader title="Weekly Planner" settingsUrl="/settings/weekly-schedule">
 *   <CustomButton />
 * </PageHeader>
 */
export default function PageHeader({
  title,
  settingsUrl,
  children,
  className = ''
}: PageHeaderProps) {
  return (
    <div className={`flex items-center justify-between mb-6 ${className}`}>
      <h1 className="text-3xl font-bold">{title}</h1>
      <div className="flex items-center gap-2">
        {children}
        {settingsUrl && <SettingsButton href={settingsUrl} />}
      </div>
    </div>
  );
}
