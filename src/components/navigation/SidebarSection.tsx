"use client";

import { useState } from "react";
import { ChevronDown, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarSectionProps {
    icon: LucideIcon;
    label: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
    isCollapsed?: boolean;
}

export function SidebarSection({ icon: Icon, label, children, defaultOpen = false, isCollapsed }: SidebarSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    if (isCollapsed) {
        return (
            <div className="space-y-1">
                <div className="px-2 py-2 flex justify-center" title={label}>
                    <Icon className="h-5 w-5" />
                </div>
                {children}
            </div>
        );
    }

    return (
        <div className="space-y-1">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-colors",
                    "hover:bg-accent hover:text-accent-foreground"
                )}
            >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="flex-1 text-left">{label}</span>
                <ChevronDown
                    className={cn(
                        "h-4 w-4 shrink-0 transition-transform",
                        isOpen && "rotate-180"
                    )}
                />
            </button>
            {isOpen && (
                <div className="ml-3 space-y-1 border-l-2 border-border pl-2">
                    {children}
                </div>
            )}
        </div>
    );
}
