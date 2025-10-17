"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarItemProps {
    href: string;
    icon?: LucideIcon;
    label: string;
    badge?: string | number;
    isCollapsed?: boolean;
    openInNewTab?: boolean;
}

export function SidebarItem({ href, icon: Icon, label, badge, isCollapsed, openInNewTab }: SidebarItemProps) {
    const pathname = usePathname();
    const isActive = pathname === href || pathname.startsWith(href + "/");

    return (
        <Link
            href={href}
            target={openInNewTab ? "_blank" : undefined}
            rel={openInNewTab ? "noopener noreferrer" : undefined}
            className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                isActive && "bg-accent text-accent-foreground",
                isCollapsed && "justify-center px-2"
            )}
            title={isCollapsed ? label : undefined}
        >
            {Icon && <Icon className="h-4 w-4 shrink-0" />}
            {!isCollapsed && (
                <>
                    <span className="flex-1">{label}</span>
                    {badge && (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                            {badge}
                        </span>
                    )}
                </>
            )}
        </Link>
    );
}
