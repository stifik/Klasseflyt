import Link from 'next/link';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SettingsButtonProps {
  href: string;
  className?: string;
  variant?: 'default' | 'ghost' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  label?: string;
}

/**
 * SettingsButton - A reusable button for navigating to settings
 *
 * Usage:
 * <SettingsButton href="/settings/morning-display" />
 * <SettingsButton href="/settings" variant="outline" />
 */
export default function SettingsButton({
  href,
  className,
  variant = 'ghost',
  size = 'icon',
  label = 'Innstillinger'
}: SettingsButtonProps) {
  return (
    <Link href={href}>
      <Button
        variant={variant}
        size={size}
        className={className}
        title={label}
      >
        <Settings className="h-5 w-5" />
        {size !== 'icon' && <span className="ml-2">{label}</span>}
      </Button>
    </Link>
  );
}
