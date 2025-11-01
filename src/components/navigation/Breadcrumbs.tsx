"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Fragment } from "react";

const routeNameMap: Record<string, string> = {
    "": "Dashboard",
    "homework": "Lekseoversikt",
    "innsjekking": "Innsjekking",
    "daily-check": "iPad-sjekk",
    "observations": "Observasjoner",
    "hourly": "Timeinnsjekk",
    "remarks": "Anmerkninger",
    "assessments": "Vurderinger",
    "reports": "Rapporter",
    "weekly": "Ukesoppsummering",
    "students": "Elevrapporter",
    "classroom": "Klasseverktøy",
    "seating": "Klassekart",
    "groups": "Gruppeverktøy",
    "picker": "Elev-trekker",
    "terminal": "Terminal",
    "pos": "Salg",
    "pod": "Poeng",
    "activityfeed": "Aktivitetslogg",
    "rewarddashboard": "Poengoversikt",
    "rewardstore": "Belønninger",
    "agent-reveal": "Hemmelig agent",
    "bors": "Børs",
    "morning-display": "Morgenvisning",
    "secret-agent": "Hemmelig agent",
    "settings": "Innstillinger",
    "changelog": "Hva er nytt",
    "privacy": "Personvern"
};

export function Breadcrumbs() {
    const pathname = usePathname();
    const segments = pathname.split("/").filter(Boolean);

    if (segments.length === 0) {
        return null;
    }

    const breadcrumbs = segments.map((segment, index) => {
        const path = "/" + segments.slice(0, index + 1).join("/");
        const name = routeNameMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
        const isLast = index === segments.length - 1;

        return {
            path,
            name,
            isLast
        };
    });

    return (
        <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-4">
            <Link
                href="/"
                className="hover:text-foreground transition-colors"
            >
                Dashboard
            </Link>
            {breadcrumbs.map((crumb) => (
                <Fragment key={crumb.path}>
                    <ChevronRight className="h-4 w-4" />
                    {crumb.isLast ? (
                        <span className="font-medium text-foreground">{crumb.name}</span>
                    ) : (
                        <Link
                            href={crumb.path}
                            className="hover:text-foreground transition-colors"
                        >
                            {crumb.name}
                        </Link>
                    )}
                </Fragment>
            ))}
        </nav>
    );
}
