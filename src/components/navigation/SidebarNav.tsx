"use client";

import { useState } from "react";
import {
    BookOpen,
    ClipboardCheck,
    Target,
    Trophy,
    Sparkles,
    ChevronLeft,
    Home,
    FileText,
    Eye,
    BarChart3,
    LayoutGrid,
    Users,
    Shuffle,
    Terminal as TerminalIcon,
    Activity,
    TrendingUp,
    Store,
    ShieldCheck,
    DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarSection } from "./SidebarSection";
import { SidebarItem } from "./SidebarItem";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface SidebarNavProps {
    className?: string;
    onCollapseChange?: (collapsed: boolean) => void;
}

export function SidebarNav({ className, onCollapseChange }: SidebarNavProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const handleToggle = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        onCollapseChange?.(newState);
    };

    return (
        <aside
            className={cn(
                "fixed left-0 top-0 z-40 h-screen border-r bg-background transition-all duration-300",
                isCollapsed ? "w-16" : "w-64",
                className
            )}
        >
            <div className="flex h-full flex-col">
                {/* Header */}
                <div className="flex h-14 items-center border-b px-3">
                    {!isCollapsed && (
                        <Link href="/" className="flex items-center gap-2 font-semibold">
                            <span className="text-lg">Klasseflyt</span>
                        </Link>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn("ml-auto h-8 w-8", isCollapsed && "mx-auto")}
                        onClick={handleToggle}
                    >
                        <ChevronLeft className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")} />
                    </Button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-4 overflow-y-auto p-3">
                    {/* Dashboard */}
                    <SidebarItem
                        href="/"
                        icon={Home}
                        label="Dashboard"
                        isCollapsed={isCollapsed}
                    />

                    {/* Daglig Arbeid */}
                    <SidebarSection
                        icon={BookOpen}
                        label="Daglig Arbeid"
                        defaultOpen={true}
                        isCollapsed={isCollapsed}
                    >
                        <SidebarItem
                            href="/homework"
                            icon={FileText}
                            label="Lekseoversikt"
                            isCollapsed={isCollapsed}
                        />
                        <SidebarItem
                            href="/daily-check"
                            icon={ClipboardCheck}
                            label="Daglig sjekk"
                            isCollapsed={isCollapsed}
                        />
                        <SidebarItem
                            href="/observations"
                            icon={Eye}
                            label="Observasjoner"
                            isCollapsed={isCollapsed}
                        />
                        <SidebarItem
                            href="/secret-agent"
                            icon={ShieldCheck}
                            label="Hemmelig agent"
                            isCollapsed={isCollapsed}
                        />
                    </SidebarSection>

                    {/* Vurdering & Analyse */}
                    <SidebarSection
                        icon={ClipboardCheck}
                        label="Vurdering & Analyse"
                        isCollapsed={isCollapsed}
                    >
                        <SidebarItem
                            href="/assessments"
                            icon={FileText}
                            label="Vurderinger"
                            isCollapsed={isCollapsed}
                        />
                        <SidebarItem
                            href="/reports"
                            icon={BarChart3}
                            label="Rapporter"
                            isCollapsed={isCollapsed}
                        />
                    </SidebarSection>

                    {/* Klasseverktøy */}
                    <SidebarSection
                        icon={Target}
                        label="Klasseverktøy"
                        isCollapsed={isCollapsed}
                    >
                        <SidebarItem
                            href="/classroom/seating"
                            icon={LayoutGrid}
                            label="Klassekart"
                            isCollapsed={isCollapsed}
                        />
                        <SidebarItem
                            href="/classroom/groups"
                            icon={Users}
                            label="Gruppeverktøy"
                            isCollapsed={isCollapsed}
                        />
                        <SidebarItem
                            href="/classroom/picker"
                            icon={Shuffle}
                            label="Elev-trekker"
                            isCollapsed={isCollapsed}
                        />
                    </SidebarSection>

                    {/* Belønningssystem */}
                    <SidebarSection
                        icon={Trophy}
                        label="Belønningssystem"
                        isCollapsed={isCollapsed}
                    >
                        <SidebarItem
                            href="/terminal"
                            icon={TerminalIcon}
                            label="Terminal"
                            isCollapsed={isCollapsed}
                        />
                        <SidebarItem
                            href="/activityfeed"
                            icon={Activity}
                            label="Aktivitetslogg"
                            isCollapsed={isCollapsed}
                        />
                        <SidebarItem
                            href="/rewarddashboard"
                            icon={TrendingUp}
                            label="Poengoversikt"
                            isCollapsed={isCollapsed}
                        />
                        <SidebarItem
                            href="/rewardstore"
                            icon={Store}
                            label="Belønninger"
                            isCollapsed={isCollapsed}
                        />
                    </SidebarSection>

                    {/* Moro & Spill */}
                    <SidebarSection
                        icon={Sparkles}
                        label="Moro & Spill"
                        isCollapsed={isCollapsed}
                    >
                        <SidebarItem
                            href="/agent-reveal"
                            icon={ShieldCheck}
                            label="Agent display"
                            isCollapsed={isCollapsed}
                            openInNewTab={true}
                        />
                        <SidebarItem
                            href="/bors"
                            icon={DollarSign}
                            label="Børs"
                            isCollapsed={isCollapsed}
                            openInNewTab={true}
                        />
                    </SidebarSection>
                </nav>

                {/* Footer */}
                {!isCollapsed && (
                    <div className="border-t p-3">
                        <Link
                            href="/changelog"
                            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Activity className="h-3 w-3" />
                            <span>Hva er nytt?</span>
                        </Link>
                    </div>
                )}
            </div>
        </aside>
    );
}
