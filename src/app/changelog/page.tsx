
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft, GitCommit } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const changelog = [
    {
        version: "1.2.0",
        date: "August 2024",
        changes: [
            { type: "new", text: "Lagt til 'Positiv Innsats'-registrering i anmerkningsfanen." },
            { type: "new", text: "Ny fane 'Klasseverktøy' med gruppegenerator og elev-trekker." },
            { type: "new", text: "Mulighet for å designe og lagre egne klasserom-layouts." },
            { type: "new", text: "Ny analyse-fane for anmerkninger med grafer og 'drill-down'." },
            { type: "new", text: "Lagt til Mørkt Tema (Dark Mode)." },
            { type: "fix", text: "Forbedret logikk for generering av klassekart for å bedre respektere regler." },
            { type: "improvement", text: "Generell ytelsesforbedring og feilrettinger." },
        ]
    },
     {
        version: "1.1.0",
        date: "Juli 2024",
        changes: [
            { type: "new", text: "Første lansering av kjernefunksjonalitet." },
            { type: "new", text: "Moduler for lekseoversikt, daglig sjekk, anmerkninger og elevrapporter." },
        ]
    },
];

const badgeMap: Record<string, { variant: "default" | "secondary" | "outline" | "destructive", text: string }> = {
    new: { variant: "default", text: "Nytt" },
    improvement: { variant: "secondary", text: "Forbedring" },
    fix: { variant: "outline", text: "Fiks" },
};


export default function ChangelogPage() {
  const lastUpdated = changelog[0]?.date || new Date().toLocaleDateString('nb-NO', { year: 'numeric', month: 'long' });

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4 sm:p-6">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GitCommit className="w-6 h-6 text-primary" />
            <CardTitle>Endringslogg</CardTitle>
          </div>
          <CardDescription>
            En oversikt over nye funksjoner og forbedringer. Sist oppdatert: {lastUpdated}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
            {changelog.map((entry) => (
                <div key={entry.version} className="relative pl-8">
                    <div className="absolute left-0 top-1 flex items-center justify-center w-8">
                        <div className="w-px h-full bg-border -translate-x-1/2 left-1/2"></div>
                        <div className="absolute w-3 h-3 rounded-full bg-primary border-2 border-background"></div>
                    </div>
                    <h3 className="text-lg font-semibold">Versjon {entry.version} <span className="text-sm font-normal text-muted-foreground">- {entry.date}</span></h3>
                    <ul className="mt-2 space-y-2">
                        {entry.changes.map((change, index) => {
                            const badgeInfo = badgeMap[change.type];
                            return (
                                <li key={index} className="flex items-start gap-2">
                                    {badgeInfo && <Badge variant={badgeInfo.variant} className="mt-1">{badgeInfo.text}</Badge>}
                                    <p className="flex-1 text-sm">{change.text}</p>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}
             <div className="pt-4">
             <Link href="/login" className="inline-flex items-center text-primary hover:underline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Tilbake til innlogging
              </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
