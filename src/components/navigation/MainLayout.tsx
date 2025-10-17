"use client";

import { useState } from "react";
import { SidebarNav } from "./SidebarNav";
import { MobileNav } from "./MobileNav";
import { Breadcrumbs } from "./Breadcrumbs";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
    children: React.ReactNode;
}

// Pages that should not show the sidebar/header
const publicPages = ['/login', '/privacy', '/agent-reveal', '/bors'];

export function MainLayout({ children }: MainLayoutProps) {
    const pathname = usePathname();
    const isPublicPage = publicPages.includes(pathname);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    if (isPublicPage) {
        return <>{children}</>;
    }

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* Desktop Sidebar */}
            <div className="hidden md:block">
                <SidebarNav onCollapseChange={setIsSidebarCollapsed} />
            </div>

            {/* Main Content Area - pushed to the right based on sidebar width */}
            <div
                className={cn(
                    "flex flex-1 flex-col overflow-hidden transition-all duration-300",
                    "md:ml-64",
                    isSidebarCollapsed && "md:ml-16"
                )}
            >
                {/* Header */}
                <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6 no-print">
                    <MobileNav />
                    <div className="flex-1" />
                    <ThemeToggle />
                    <Link href="/settings">
                        <Button variant="ghost" size="icon">
                            <SettingsIcon className="h-5 w-5" />
                            <span className="sr-only">Innstillinger</span>
                        </Button>
                    </Link>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 print:p-0">
                    <Breadcrumbs />
                    {children}
                </main>
            </div>
        </div>
    );
}
