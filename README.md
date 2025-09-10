# Klasseflyt

Dette er en applikasjon for klasseromsstyring bygget med Next.js, TypeScript og Tailwind CSS. Appen er designet for å kjøre helt lokalt i nettleseren din, med valgfri synkronisering til den enkelte lærers egen OneDrive-konto.

## Databehandling

Appen fungerer 100% lokalt uten videre konfigurasjon. All data (elever, anmerkninger, etc.) lagres permanent i en database i din nettleser (IndexedDB). Ingen data forlater maskinen din som standard.

### Valgfri OneDrive-synkronisering (for hele skolen)

For å aktivere synkronisering mot skole-OneDrive, må skolens IT-avdeling gjøre en **engangsopprettelse** av en "App Registration" i skolens Microsoft Azure/Entra ID. Dette er en standard og sikker prosedyre som vil fungere for alle lærere.

**Hva skal IT-avdelingen bes om?**

Du kan sende følgende melding til IT-avdelingen:

> Hei,
>
> Vi ønsker å ta i bruk en applikasjon kalt "Klasseflyt" som lar lærere lagre dataene sine i sin egen OneDrive. For at dette skal fungere for alle, trenger appen en "App Registration" i vår Microsoft Entra ID (Azure AD). Dette er en engangsprosess.
>
> Applikasjonen trenger følgende API-tillatelser (delegert):
> 1.  `User.Read` (for å bekrefte brukerens identitet ved innlogging)
> 2.  `Files.ReadWrite.AppFolder` (gir appen tilgang *kun* til sin egen, dedikerte mappe i den enkelte brukers OneDrive, ikke andre filer)
>
> Når registreringen er opprettet, kan dere sende meg følgende to verdier som vil bli brukt for hele organisasjonen?
> *   **Application (client) ID**
> *   **Directory (tenant) ID**
>
> Takk for hjelpen!

Når du mottar disse to ID-ene:
1.  Opprett en fil kalt `.env` i rotmappen av prosjektet.
2.  Lim inn ID-ene i `.env`-filen slik:
    `NEXT_PUBLIC_AZURE_AD_CLIENT_ID="din-client-id"`
    `NEXT_PUBLIC_AZURE_AD_TENANT_ID="din-tenant-id"`
3.  Start appen på nytt. "Logg inn med Microsoft"-knappen vil nå være funksjonell for alle ansatte med en skolekonto.

### Valgfri KI-integrasjon (Copilot/Azure AI)

For å aktivere KI-funksjoner (f.eks. generering av ukesmeldinger), må appen kobles til skolens eksisterende Azure AI-tjeneste. Dette sikrer at databehandlingen skjer innenfor skolens databehandleravtale med Microsoft.

**Viktig: Hvordan API-nøkler håndteres**
API-nøkler er hemmeligheter og skal **aldri** legges i åpen kildekode. Appen er designet for å bli publisert (hostet) av hver enkelt skole/kommune. Hver organisasjon legger inn sin egen, unike API-nøkkel på sin server. Dette sikrer at kun deres ansatte bruker deres betalte KI-tjeneste.

**Hva skal IT-avdelingen bes om?**

> Hei,
>
> Vi ønsker å aktivere en KI-funksjon i "Klasseflyt"-appen. For å sikre at dette skjer innenfor vår eksisterende databehandleravtale med Microsoft, trenger vi tilgang til vår Azure AI-tjeneste. Kan dere fremskaffe følgende to verdier?
> *   **API-nøkkel** til en Azure AI/Cognitive Services-ressurs.
> *   Den tilhørende **Endepunkt-URL-en**.
>
> Takk!

Når du mottar disse:
1.  **For lokal utvikling:** Legg dem til i `.env`-filen din:
    `AZURE_AI_API_KEY="din-hemmelige-nøkkel"`
    `AZURE_AI_ENDPOINT="https://ditt-endepunkt.openai.azure.com/"`
2.  **Ved publisering av appen:** IT-avdelingen legger disse verdiene inn som sikre "hemmeligheter" (Environment Variables) på serveren der appen skal kjøre for deres skole.
