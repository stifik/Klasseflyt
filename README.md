# Klasseflyt

Dette er en applikasjon for klasseromsstyring bygget med Next.js, TypeScript og Tailwind CSS. Appen er designet for å kjøre helt lokalt i nettleseren din, med valgfri synkronisering til din egen OneDrive.

## Forutsetninger

Før du begynner, sørg for at du har [Node.js](https://nodejs.org/) installert på maskinen din. Last ned og installer den anbefalte "LTS"-versjonen. Dette vil også installere `npm`, som er verktøyet du trenger for å administrere appens avhengigheter.

## Installasjon og oppstart

Følg disse stegene for å kjøre appen lokalt på din egen maskin.

### 1. Klon eller last ned koden

Hvis du har koblet prosjektet til GitHub, kan du klone det med `git`:

```bash
git clone <din-github-repository-url>
cd klasseflyt
```

Hvis du har lastet ned koden som en ZIP-fil, pakk den ut og naviger til mappen i en terminal.

### 2. Installer avhengigheter

Kjør følgende kommando i terminalen i prosjektmappen. Dette vil laste ned alle bibliotekene appen trenger for å kjøre.

```bash
npm install
```

**OBS for Windows-brukere:** Hvis du får en feilmelding om `Execution Policies`, se [denne guiden for hvordan du løser det](https://learn.microsoft.com/en-powershell/module/microsoft.powershell.security/set-executionpolicy). En vanlig løsning er å åpne PowerShell som administrator og kjøre: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`.

### 3. Start appen

Når installasjonen er ferdig, kan du starte utviklingsserveren:

```bash
npm run dev
```

Terminalen vil gi deg beskjed om at serveren kjører. Åpne nettleseren din og gå til adressen som vises, vanligvis **http://localhost:9002**.

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
1.  Omdøp `.env.example` til `.env`.
2.  Lim inn ID-ene i `.env`-filen.
3.  Start appen på nytt. "Logg inn med Microsoft"-knappen vil nå være funksjonell.
