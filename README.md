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
1.  Omdøp `.env.example` til `.env` (hvis du kjører koden lokalt for utvikling).
2.  Lim inn ID-ene i `.env`-filen.
3.  Start appen på nytt. "Logg inn med Microsoft"-knappen vil nå være funksjonell for alle ansatte med en skolekonto.
