
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  const lastUpdated = new Date().toLocaleDateString('nb-NO', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4 sm:p-6">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Personvernerklæring for Klasseflyt</CardTitle>
          <CardDescription>
            Sist oppdatert: {lastUpdated}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-sm text-foreground">
          <p>
            Denne personvernerklæringen beskriver hvordan Klasseflyt ("vi", "oss", "appen") behandler personopplysninger. Denne versjonen av appen er designet for å <strong>ikke</strong> bruke eksterne skytjenester for lagring av elevdata, men heller synkronisere data mot din egen Microsoft OneDrive.
          </p>

          <div className="p-4 border-l-4 border-primary bg-primary/10 rounded-r-lg">
            <h3 className="font-bold text-primary-foreground">VIKTIG: Du er Behandlingsansvarlig</h3>
            <p className="mt-2">
              Når du (som lærer, skole eller kommune) legger inn data om elever, er det <strong>du som er Behandlingsansvarlig</strong>. Du bestemmer formålet med behandlingen og er ansvarlig for at du har et gyldig behandlingsgrunnlag (f.eks. tjenstlig behov). Appen fungerer kun som et verktøy for databehandling på ditt eget utstyr og lagringsområde.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-lg">1. Hvilke data behandles og hvor?</h4>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Kontoinformasjon (Lærer):</strong> Appen bruker Microsoft Authenticator for innlogging. Vi lagrer ingen personlig informasjon om deg, men bruker din Microsoft-profil til å få tilgang til appens egen mappe på din OneDrive.
              </li>
              <li>
                <strong>Elev-, fag- og leksedata:</strong> All data du legger inn (elevnavn, anmerkninger, lekser etc.) lagres lokalt i din nettleser for rask tilgang. Denne dataen blir deretter synkronisert som en enkelt, kryptert fil til en dedikert mappe i din egen Microsoft OneDrive. <strong>Ingen av disse dataene sendes til eller lagres på våre servere.</strong>
              </li>
            </ul>

            <h4 className="font-semibold text-lg">2. Databehandleravtale (DPA)</h4>
            <p>
              Siden appen utelukkende lagrer data i din skoles Microsoft-infrastruktur (OneDrive), er det skolens eksisterende databehandleravtale med Microsoft som gjelder. Appen introduserer ingen ny tredjeparts databehandler, noe som forenkler personvernarbeidet betydelig.
            </p>

            <h4 className="font-semibold text-lg">3. Lagringstid</h4>
            <p>
              Du har full kontroll over dine data. Datafilen forblir i din OneDrive så lenge du ønsker. Hvis du sletter filen eller sletter data i appen, er det permanent borte. Vi har ingen tilgang til eller kopier av dine data.
            </p>

            <h4 className="font-semibold text-lg">4. Dine rettigheter som registrert</h4>
            <p>
              Du har full kontroll over dataene og kan utøve dine rettigheter direkte:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Innsyn, Retting og Sletting:</strong> Du kan se, endre og slette all data direkte i applikasjonen.</li>
              <li><strong>Dataportabilitet:</strong> Datafilen ligger direkte i din OneDrive og kan lastes ned og flyttes av deg.</li>
            </ul>
            <p>
              Foresatte som ønsker å utøve rettigheter på vegne av elever, må kontakte skolen (behandlingsansvarlig).
            </p>
          </div>
          
          <div className="pt-4">
             <Link href="/" className="inline-flex items-center text-primary hover:underline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Tilbake til dashbordet
              </Link>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
