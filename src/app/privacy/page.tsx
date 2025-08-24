
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  const lastUpdated = new Date().toLocaleDateString('nb-NO', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4 sm:p-6">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Personvernerklæring for Leksehjelperen</CardTitle>
          <CardDescription>
            Sist oppdatert: {lastUpdated}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-sm text-foreground">
          <p>
            Denne personvernerklæringen beskriver hvordan Leksehjelperen ("vi", "oss", "appen") samler inn, bruker og beskytter personopplysninger. Når du bruker denne appen som lærer i en skole, er det viktig å forstå rollefordelingen i henhold til Personopplysningsloven (GDPR).
          </p>

          <div className="p-4 border-l-4 border-destructive bg-destructive/10 rounded-r-lg">
            <h3 className="font-bold text-destructive">VIKTIG: Rollefordeling (Behandlingsansvarlig vs. Databehandler)</h3>
            <p className="mt-2">
              Når du (som lærer, skole eller kommune) legger inn data om elever, er det <strong>du som er Behandlingsansvarlig</strong>. Du bestemmer formålet med behandlingen og er ansvarlig for at du har et gyldig behandlingsgrunnlag (f.eks. tjenstlig behov).
            </p>
            <p className="mt-2">
              Leksehjelperen fungerer som en <strong>Databehandler</strong>. Vi behandler data på dine vegne og etter dine instrukser. For bruk i skolen krever dette en <strong>databehandleravtale (DPA)</strong>.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-lg">1. Vår identitet og kontaktinformasjon</h4>
            <p>
              Leksehjelperen leveres av: <br />
              <strong>[Firmanavn/Ditt Navn]</strong> <br />
              [Organisasjonsnummer] <br />
              [Adresse] <br />
              For henvendelser knyttet til personvern, kontakt oss på: <strong>[E-postadresse for personvern]</strong>
            </p>

            <h4 className="font-semibold text-lg">2. Hvilke data behandles og for hvilket formål?</h4>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Kontoinformasjon (Lærer):</strong> Vi behandler din e-postadresse for å opprette og sikre din brukerkonto, samt for å autentisere deg ved innlogging. Behandlingsgrunnlaget er GDPR art. 6(1)(b) (avtale).
              </li>
              <li>
                <strong>Elev-, fag- og leksedata:</strong> Vi behandler data du legger inn, som elevnavn (eller pseudonymer), fag, lekser, innleveringsstatus, kommentarer, iPad-status og anmerkninger. Formålet er å levere appens kjernefunksjonalitet til deg. Som databehandler er vårt grunnlag for behandling databehandleravtalen med deg. Ditt grunnlag som behandlingsansvarlig er typisk GDPR art. 6(1)(e) (utøve offentlig myndighet).
              </li>
            </ul>

            <h4 className="font-semibold text-lg">3. Databehandleravtale (DPA)</h4>
            <p>
              For å bruke Leksehjelperen til å behandle elevopplysninger i skolesammenheng, er du lovpålagt å inngå en databehandleravtale med oss. Denne avtalen regulerer hvordan vi behandler data på dine vegne og sikrer at behandlingen skjer i tråd med GDPR. Vennligst kontakt oss på <strong>[E-postadresse for DPA]</strong> for å få tilsendt vår standard databehandleravtale.
            </p>

            <h4 className="font-semibold text-lg">4. Lagringstid</h4>
            <p>
              Vi lagrer dine data så lenge du har en aktiv konto hos oss. Hvis du sletter en enkeltopplysning (f.eks. en elev eller en anmerkning) i appen, slettes den fra våre systemer. Hvis du sletter hele din brukerkonto, vil alle tilknyttede data bli permanent slettet innen 90 dager.
            </p>

            <h4 className="font-semibold text-lg">5. Overføring av data til tredjeland</h4>
            <p>
              Appen benytter skytjenesten Google Firebase, som har servere lokalisert globalt. Dette kan innebære at data overføres til land utenfor EU/EØS (f.eks. USA). Grunnlaget for slik overføring er EU-kommisjonens standard personvernbestemmelser (SCCs), som sikrer at dine data er underlagt et beskyttelsesnivå i tråd med europeisk lovgivning.
            </p>

            <h4 className="font-semibold text-lg">6. Dine rettigheter som registrert</h4>
            <p>Du har rett til å be om:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Innsyn</strong> i dine personopplysninger.</li>
              <li><strong>Retting</strong> av feilaktige opplysninger.</li>
              <li><strong>Sletting</strong> av dine personopplysninger.</li>
              <li><strong>Begrensning</strong> av behandlingen av dine opplysninger.</li>
              <li><strong>Dataportabilitet</strong> (å motta dine data i et strukturert, maskinlesbart format).</li>
              <li><strong>Å protestere</strong> mot behandlingen.</li>
            </ul>
            <p>
              Du kan utøve de fleste av disse rettighetene gjennom funksjonalitet i appen (f.eks. ved å slette elever eller fag). For øvrige henvendelser, kontakt oss på e-posten oppgitt i punkt 1. Foresatte som ønsker å utøve rettigheter på vegne av elever, må kontakte skolen (behandlingsansvarlig).
            </p>

            <h4 className="font-semibold text-lg">7. Rett til å klage</h4>
            <p>
              Hvis du mener vår behandling av personopplysninger er i strid med personvernregelverket, har du rett til å klage til den nasjonale tilsynsmyndigheten. I Norge er dette <strong>Datatilsynet</strong>.
            </p>
          </div>
          
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
