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

**OBS for Windows-brukere:** Hvis du får en feilmelding om `Execution Policies`, se [denne guiden for hvordan du løser det](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.security/set-executionpolicy). En vanlig løsning er å åpne PowerShell som administrator og kjøre: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`.

### 3. Start appen

Når installasjonen er ferdig, kan du starte utviklingsserveren:

```bash
npm run dev
```

Terminalen vil gi deg beskjed om at serveren kjører. Åpne nettleseren din og gå til adressen som vises, vanligvis **http://localhost:9002**.

## Databehandling

Appen fungerer 100% lokalt uten videre konfigurasjon. All data (elever, anmerkninger, etc.) lagres permanent i en database i din nettleser (IndexedDB). Ingen data forlater maskinen din som standard.

### Valgfri OneDrive-synkronisering

Hvis du får godkjenning fra din IT-avdeling til å synkronisere data til din egen skole-OneDrive, må du gjøre følgende:
1.  Omdøp `.env.example` til `.env`.
2.  Lim inn `CLIENT_ID` og `TENANT_ID` du mottar fra IT-avdelingen i `.env`-filen.
3.  Start appen på nytt. "Logg inn med Microsoft"-knappen vil nå være funksjonell.
