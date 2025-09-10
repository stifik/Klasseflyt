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

**Hvordan fungerer det?**
Appen bruker en sikker metode kalt **delegert tilgang**. Dette betyr at når en lærer er logget inn, vil appen sende KI-forespørsler *på vegne av den påloggede læreren*. Azure vil da vite hvilken organisasjon læreren tilhører, og fakturering/databehandling vil skje korrekt under den organisasjonens avtale. Ingen hemmelige, felles API-nøkler er nødvendig, noe som er den eneste sikre metoden for en sentralt hostet applikasjon.

**Hva skal IT-avdelingen bes om?**

For at dette skal fungere, må den samme "App Registration" som ble opprettet for OneDrive gis én ekstra tillatelse:

> Hei,
>
> Vi ønsker å aktivere KI-funksjonalitet i "Klasseflyt"-appen. For å gjøre dette sikkert og i henhold til vår eksisterende databehandleravtale, må appen få delegert tilgang til vår Azure AI-tjeneste.
>
> Kan dere legge til følgende API-tillatelse i app-registreringen for "Klasseflyt"?
> 1.  **Azure Cognitive Services:** `user_impersonation`
>
> Dere må også "Expose an API" for app-registreringen og gi meg den tilhørende **Application ID URI** (også kalt "scope"). Den ser typisk slik ut: `api://<CLIENT_ID>`.
>
> Når dette er på plass, kan jeg konfigurere appen slik at hver lærer bruker KI-tjenesten under sin egen, sikre pålogging.
>
> Takk!

Når du mottar denne URI-en, legg den til i din `.env`-fil:
`NEXT_PUBLIC_AZURE_AD_SCOPE_URI="api://din-client-id/user_impersonation"`
