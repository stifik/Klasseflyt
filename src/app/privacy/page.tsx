
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4 sm:p-6">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Personvernerklæring for Leksehjelperen</CardTitle>
          <CardDescription>
            Sist oppdatert: {new Date().toLocaleDateString('nb-NO')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-foreground">
          <p>
            Denne personvernerklæringen forklarer hvordan Leksehjelperen ("appen") samler inn, lagrer og behandler data. Det er viktig at du leser og forstår dette før du tar i bruk appen i en skolekontekst.
          </p>

          <div className="p-4 border-l-4 border-destructive bg-destructive/10 rounded-r-lg">
            <h3 className="font-bold text-destructive">VIKTIG: Ditt ansvar som databehandler</h3>
            <p className="mt-2">
              Denne appen er et verktøy. Når du legger inn informasjon om elever, er det <strong>du som lærer, skole eller skoleeier</strong> som er å anse som <strong>databehandleransvarlig</strong>. Det betyr at du er ansvarlig for at bruken av appen er i tråd med Personopplysningsloven (GDPR), samt din skoles og kommunes retningslinjer for behandling av elevdata.
            </p>
            <p className="mt-2">
              Du må selv sørge for at du har nødvendig behandlingsgrunnlag (f.eks. samtykke eller tjenstlig behov) for å lagre og behandle personopplysninger om elever i dette verktøyet.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-lg">1. Hvilke data lagres?</h4>
            <p>Appen lagrer data du selv legger inn. Dette inkluderer, men er ikke begrenset til:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Brukerkontoinformasjon:</strong> Din e-postadresse (brukes kun for innlogging og autentisering).</li>
              <li><strong>Elevdata:</strong> Navn eller identifikatorer du gir til elevene i klasselisten din.</li>
              <li><strong>Fagdata:</strong> Navn på fag du oppretter.</li>
              <li><strong>Leksedata:</strong> Tittel, fag, og status for lekser og innleveringer.</li>
              <li><strong>Loggført data:</strong> Anmerkninger, iPad-status og annen data du registrerer på enkeltelever.</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-lg">2. Hvor lagres dataen?</h4>
            <p>
              All data lagres i en sikker skydatabase levert av Google (Firebase Firestore). Hver brukers data er strengt adskilt og knyttet til din unike, autentiserte bruker-ID. Andre brukere av appen har ingen tilgang til dine data.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-lg">3. Anbefalinger for sikker bruk</h4>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                <strong>Vurder pseudonymisering:</strong> Hvis du er usikker på om du har lov til å lagre fulle elevnavn, bør du vurdere å bruke initialer, elevnummer, eller andre koder som ikke er direkte identifiserbare.
              </li>
              <li>
                <strong>Sjekk lokale retningslinjer:</strong> Forsikre deg om at din skole eller kommune tillater bruk av tredjepartsverktøy som dette for lagring av elevinformasjon.
              </li>
              <li>
                <strong>Sikker innlogging:</strong> Bruk et sterkt, unikt passord for din konto.
              </li>
            </ul>
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
