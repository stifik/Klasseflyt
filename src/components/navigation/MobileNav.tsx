"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    BookOpen,
    ClipboardCheck,
    Target,
    Trophy,
    Sparkles,
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
    Monitor,
    DollarSign
} from "lucide-react";
import { SidebarSection } from "./SidebarSection";
import { SidebarItem } from "./SidebarItem";
import Link from "next/link";

export function MobileNav() {
    const [open, setOpen] = useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Åpne meny</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
                <SheetHeader className="border-b px-6 py-4">
                    <SheetTitle>Klasseflyt</SheetTitle>
                </SheetHeader>
                <nav className="flex-1 space-y-4 overflow-y-auto p-3">
                    {/* Dashboard */}
                    <div onClick={() => setOpen(false)}>
                        <SidebarItem
                            href="/"
                            icon={Home}
                            label="Dashboard"
                        />
                    </div>

                    {/* Daglig Arbeid */}
                    <SidebarSection
                        icon={BookOpen}
                        label="Daglig Arbeid"
                        defaultOpen={true}
                    >
                        <div onClick={() => setOpen(false)}>
                            <SidebarItem
                                href="/homework"
                                icon={FileText}
                                label="Lekseoversikt"
                            />
                            <SidebarItem
                                href="/daily-check"
                                icon={ClipboardCheck}
                                label="Daglig sjekk"
                            />
                            <SidebarItem
                                href="/morning-display"
                                icon={Monitor}
                                label="Morgen-display"
                                openInNewTab={true}
                            />
                            <SidebarItem
                                href="/observations"
                                icon={Eye}
                                label="Observasjoner"
                            />
                            <SidebarItem
                                href="/secret-agent"
                                icon={ShieldCheck}
                                label="Hemmelig agent"
                            />
                        </div>
                    </SidebarSection>

                    {/* Vurdering & Analyse */}
                    <SidebarSection
                        icon={ClipboardCheck}
                        label="Vurdering & Analyse"
                    >
                        <div onClick={() => setOpen(false)}>
                            <SidebarItem
                                href="/assessments"
                                icon={FileText}
                                label="Vurderinger"
                            />
                            <SidebarItem
                                href="/reports"
                                icon={BarChart3}
                                label="Rapporter"
                            />
                        </div>
                    </SidebarSection>

                    {/* Klasseverktøy */}
                    <SidebarSection
                        icon={Target}
                        label="Klasseverktøy"
                    >
                        <div onClick={() => setOpen(false)}>
                            <SidebarItem
                                href="/classroom/seating"
                                icon={LayoutGrid}
                                label="Klassekart"
                            />
                            <SidebarItem
                                href="/classroom/groups"
                                icon={Users}
                                label="Gruppeverktøy"
                            />
                            <SidebarItem
                                href="/classroom/picker"
                                icon={Shuffle}
                                label="Elev-trekker"
                            />
                        </div>
                    </SidebarSection>

                    {/* Belønningssystem */}
                    <SidebarSection
                        icon={Trophy}
                        label="Belønningssystem"
                    >
                        <div onClick={() => setOpen(false)}>
                            <SidebarItem
                                href="/poengsentral"
                                icon={TerminalIcon}
                                label="Poengsentral"
                            />
                            <SidebarItem
                                href="/activityfeed"
                                icon={Activity}
                                label="Aktivitetslogg"
                            />
                            <SidebarItem
                                href="/rewarddashboard"
                                icon={TrendingUp}
                                label="Poengoversikt"
                            />
                            <SidebarItem
                                href="/rewardstore"
                                icon={Store}
                                label="Belønninger"
                            />
                        </div>
                    </SidebarSection>

                    {/* Moro & Spill */}
                    <SidebarSection
                        icon={Sparkles}
                        label="Moro & Spill"
                    >
                        <div onClick={() => setOpen(false)}>
                            <SidebarItem
                                href="/agent-reveal"
                                icon={ShieldCheck}
                                label="Agent display"
                                openInNewTab={true}
                            />
                            <SidebarItem
                                href="/bors"
                                icon={DollarSign}
                                label="Børs"
                                openInNewTab={true}
                            />
                        </div>
                    </SidebarSection>
                </nav>

                {/* Footer */}
                <div className="border-t p-3">
                    <Link
                        href="/changelog"
                        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setOpen(false)}
                    >
                        <Activity className="h-3 w-3" />
                        <span>Hva er nytt?</span>
                    </Link>
                </div>
            </SheetContent>
        </Sheet>
    );
}
