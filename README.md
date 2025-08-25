# Klasseflyt

Dette er en applikasjon for klasseromsstyring bygget med Next.js, TypeScript og Tailwind CSS. Appen er designet for å kjøre helt lokalt i nettleseren din, med valgfri synkronisering til din egen OneDrive.

## Databehandling

Appen fungerer 100% lokalt uten videre konfigurasjon. All data (elever, anmerkninger, etc.) lagres permanent i en database i din nettleser (IndexedDB). Ingen data forlater maskinen din som standard.

### Valgfri OneDrive-synkronisering

For å aktivere synkronisering mot din skole-OneDrive, må du få IT-avdelingen til å opprette en "App Registration" i skolens Microsoft Azure/Entra ID. Dette er en standard og sikker prosedyre.

**Hva skal du be IT-avdelingen om?**

Du kan sende følgende melding til IT-avdelingen:

> Hei,
>
> Jeg ønsker å ta i bruk en applikasjon kalt "Klasseflyt" som lagrer dataene sine i brukerens egen OneDrive. For at dette skal fungere, trenger appen en "App Registration" i vår Microsoft Entra ID (Azure AD).
>
> Applikasjonen trenger følgende API-tillatelser (delegert):
> 1.  `User.Read` (for å bekrefte brukerens identitet ved innlogging)
> 2.  `Files.ReadWrite.AppFolder` (gir appen tilgang *kun* til sin egen, dedikerte mappe i brukerens OneDrive, ikke andre filer)
>
> Når registreringen er opprettet, kan dere sende meg følgende to verdier?
> *   **Application (client) ID**
> *   **Directory (tenant) ID**
>
> Takk for hjelpen!

Når du mottar disse to ID-ene:
1.  Omdøp `.env.example` til `.env` (hvis du kjører koden lokalt for utvikling).
2.  Lim inn ID-ene i `.env`-filen.
3.  Start appen på nytt. "Logg inn med Microsoft"-knappen vil nå være funksjonell.
