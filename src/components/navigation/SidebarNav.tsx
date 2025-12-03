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
    DollarSign,
    Settings as SettingsIcon,
    Monitor,
    Calendar,
    Timer
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarSection } from "./SidebarSection";
import { SidebarItem } from "./SidebarItem";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";

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
            data-tour="sidebar"
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
                            <Logo />
                            <span className="text-lg">Klasseflyt</span>
                        </Link>
                    )}
                    {isCollapsed && (
                        <Link href="/" className="flex items-center justify-center w-full">
                            <Logo />
                        </Link>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn("ml-auto h-8 w-8", isCollapsed && "absolute right-2")}
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
                        label="Daglig arbeid"
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
                            href="/weekly-planner"
                            icon={Calendar}
                            label="Ukesplanlegger"
                            isCollapsed={isCollapsed}
                        />
                        <SidebarItem
                            href="/innsjekking"
                            icon={ClipboardCheck}
                            label="Innsjekking"
                            isCollapsed={isCollapsed}
                        />
                        <SidebarItem
                            href="/daily-check"
                            icon={ClipboardCheck}
                            label="iPad-sjekk"
                            isCollapsed={isCollapsed}
                        />
                        <SidebarItem
                            href="/morning-display"
                            icon={Monitor}
                            label="Morgenvisning"
                            isCollapsed={isCollapsed}
                            openInNewTab={true}
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
                        label="Vurdering og analyse"
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
                        <SidebarItem
                            href="/classroom/stopwatch"
                            icon={Timer}
                            label="Timere"
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
                            href="/poengsentral"
                            icon={TerminalIcon}
                            label="Poengsentral"
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
                            label="Prisliste"
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
                <div className="border-t p-3">
                    <div className="flex items-center gap-2">
                        {!isCollapsed && (
                            <>
                                <ThemeToggle />
                                <Link href="/settings" className="flex-1">
                                    <Button variant="ghost" className="w-full justify-start gap-2">
                                        <SettingsIcon className="h-4 w-4" />
                                        <span>Innstillinger</span>
                                    </Button>
                                </Link>
                            </>
                        )}
                        {isCollapsed && (
                            <div className="flex flex-col gap-2 w-full items-center">
                                <ThemeToggle />
                                <Link href="/settings">
                                    <Button variant="ghost" size="icon">
                                        <SettingsIcon className="h-4 w-4" />
                                        <span className="sr-only">Innstillinger</span>
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </aside>
    );
}
