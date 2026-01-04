# Klasseflyt - AI Coding Instructions

## Prosjektoversikt
**Klasseflyt** er en komplett klasseromsstyringsapp for lærere. Appen kombinerer leksehåndtering, daglig sjekk, observasjoner, belønningssystem, NFC-betalinger og mange andre verktøy - alt lagret lokalt i nettleseren med valgfri OneDrive-synkronisering.

### Hovedfunksjoner
- **Lekseoversikt**: Sporing av lekser med statuser og kommentarer
- **Daglig Sjekk**: iPad-ansvar, oppmøte, fravær
- **Observasjoner**: Anmerkninger og timebasert atferdslogging
- **Belønningssystem**: Poeng, butikk med dynamisk prising, NFC-betalinger
- **Klasseromsverktøy**: Bordplassering, gruppegenerator, elevvelger
- **Rapporter**: Ukesmeldinger, elevrapporter, PDF-eksport
- **Morning Display**: Skjermvisning for klasserommet

## Teknologi Stack
- **Frontend**: Next.js 15 + React 18 + Tailwind CSS
- **Database**: Dexie.js (IndexedDB wrapper) - 100% lokal lagring
- **Auth**: Azure AD/MSAL (valgfri, for OneDrive-synk)
- **Språk**: TypeScript
- **UI-komponenter**: Radix UI + shadcn/ui
- **State**: React hooks + Dexie useLiveQuery
- **Backend**: Next.js API routes + Vercel KV (for display-app synk)

## Kode-standarder

### Generelt
- Skriv kommentarer på norsk for forretningslogikk
- Bruk beskrivende variabelnavn på engelsk
- Hold profesjonelt språk i kode og dokumentasjon
- Test alltid i nettleser før commit (IndexedDB-operasjoner)

### Git
- Commit på engelsk: "Add price history tracking" ikke "Legger til prishistorikk"
- Beskrivende commit messages
- **Commit etter hver fullført oppgave** - ikke vent til slutten av økten
- Push til GitHub regelmessig for backup
- Ved sikkerhetsoppdateringer: commit umiddelbart etter oppdatering

### Komponent-struktur
```
src/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   └── [feature]/         # Feature-spesifikke sider
├── components/            # React-komponenter
│   ├── ui/               # shadcn/ui base-komponenter
│   ├── navigation/       # Sidebar, header, breadcrumbs
│   ├── settings/         # Innstillingskomponenter
│   └── [Feature].tsx     # Hovedkomponenter
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities og services
│   ├── db.ts             # Dexie database definisjon
│   ├── types.ts          # TypeScript typer
│   └── [service].ts      # Feature-spesifikke services
└── auth/                  # MSAL/Azure AD oppsett
```

### Database (Dexie/IndexedDB)

**Viktig**: All data lagres lokalt i IndexedDB via Dexie.

**Legge til nye tabeller:**
1. Definer typen i `lib/types.ts`
2. Legg til Table i `lib/db.ts` klassedefinisjonen
3. Importer typen i db.ts
4. Legg til ny versjon med stores() for migrering
5. Nåværende versjon: **46** (oppdater ved endringer)

**Eksempel på versjonering:**
```typescript
// I db.ts constructor
this.version(46).stores({
    aiMessageCache: '++id, [date+timePeriodId], date, timePeriodId, generatedAt',
});
```

**Aldri slett eksisterende kolonner/tabeller** - kun legg til nye.

### API Routes

- CORS headers for cross-origin (display-app)
- Bruk Vercel KV for delt state mellom enheter
- API-nøkler via environment variables
- Aldri eksponér sensitiv data

**Pattern for API route:**
```typescript
// src/app/api/[feature]/route.ts
import { NextRequest, NextResponse } from 'next/server';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

export async function GET(req: NextRequest) {
  // ... implementasjon
  return NextResponse.json(data, { headers: corsHeaders() });
}
```

### UI/Styling

- Bruk shadcn/ui komponenter fra `components/ui/`
- Tailwind CSS utility classes
- Mobile-first design (responsive)
- Dark mode support via next-themes
- Konsistent spacing: 4, 8, 16, 24, 32px

### TypeScript

- Strikt typing - unngå `any` hvor mulig
- Definer typer i `lib/types.ts`
- Bruk type guards for runtime-validering
- Eksporter typer som brukes på tvers av filer

### Services (lib/)

- Én service per feature-område
- Eksporter rene funksjoner
- Håndter feil gracefully med try/catch
- Logg til console for debugging
- Returner konsistente result-typer

**Eksempel:**
```typescript
export type OperationResult = {
  success: boolean;
  message: string;
};

export async function doSomething(): Promise<OperationResult> {
  try {
    // ... logikk
    return { success: true, message: 'Operasjon vellykket' };
  } catch (error) {
    console.error('Feil:', error);
    return { success: false, message: 'Teknisk feil' };
  }
}
```

## NFC/RFID-system

Klasseflyt støtter RFID-kort for betalinger. Se `docs/NFC_RFID_GUIDE.md`.

**Hovedfiler:**
- `nfc-bridge/server.js` - WebSocket-server for kortleser
- `components/NFCPaymentModal.tsx` - Betalingsmodal
- `components/RFIDCardManager.tsx` - Kortadministrasjon
- `lib/db.ts` - rfidCards tabell

## KI-genererte meldinger (Morning Display)

Klasseflyt støtter BYOK (Bring Your Own Key) AI-genererte velkomstmeldinger.

**Hovedfiler:**
- `lib/aiMessageService.ts` - Service for OpenAI/Anthropic API-kall
- `components/settings/AIMessageSettings.tsx` - Innstillinger for AI-meldinger
- `components/morning-display/Slide1.tsx` - Regenerer-knapp i display

**Dataflyt:**
1. Bruker legger inn API-nøkkel (lagres i localStorage, aldri synket)
2. Ved åpning av morning-display sjekkes cache for dagens dato + tidsperiode
3. Hvis cache finnes → vis cached melding
4. Hvis ikke → generer ny melding via API, lagre i cache
5. Ved bytte av tidsperiode → generer ny melding automatisk (hvis skjerm synlig)

**Cache-strategi:**
- Én melding per tidsperiode per dag
- Cache ryddes automatisk etter 7 dager
- Manuell regenerering overskriver cache

## Viktige konvensjoner

### Norske vs engelske termer
- **Kode**: Engelsk (variabelnavn, funksjoner, commits)
- **UI-tekst**: Norsk (brukervendt tekst)
- **Kommentarer**: Norsk for forretningslogikk, engelsk for teknisk
- **Dokumentasjon**: Norsk for brukerdocs, engelsk for teknisk

### Feilhåndtering
- Vis brukervennlige toast-meldinger
- Logg tekniske detaljer til console
- Ikke krasj appen - håndter edge cases

### Datoer
- Bruk `date-fns` med norsk locale (`nb`)
- Lagre som Date-objekter i IndexedDB
- Formater ved visning, ikke ved lagring

## Dokumentvedlikehold

### instructions.md maintenance
- Disse instruksene skal oppdateres underveis i utviklingen når:
  - Nye patterns eller konvensjoner etableres
  - Viktige designbeslutninger tas
  - Tekniske utfordringer løses på en bestemt måte
  - Nye verktøy eller biblioteker legges til
  - Database-versjon endres (oppdater nåværende versjonsnummer)
- Legg til en "Sist oppdatert" seksjon nederst med dato og hva som ble endret

### Relaterte dokumenter
Ved endringer, sjekk og oppdater relevante dokumenter:
- `docs/architecture.md` - Systemdesign og dataflyt
- `docs/design.md` - UI/UX retningslinjer og farger
- `docs/roadmap.md` - Utviklingsplan og features
- `docs/INBOX.md` - Brukerens ideer og bugs

### INBOX.md - Brukerens idé-samling
- **Sjekk `docs/INBOX.md` regelmessig** (ved start av ny økt eller når bruker nevner det)
- Filen inneholder brukerens egne notater: ideer, bugs, tanker
- Når innhold finnes i INBOX.md:
  - **Bugs** → Fiks umiddelbart eller legg i roadmap med prioritet
  - **Feature-ideer** → Flytt til `roadmap.md` (riktig fase eller Future Ideas)
  - **UX-forbedringer** → Flytt til `design.md` eller `roadmap.md`
  - **Tekniske endringer** → Flytt til `architecture.md`
- Marker innhold som "flyttet" eller slett etter behandling
- Spør bruker om uklare punkter før du handler

### User-facing changelog
- **To endringslogger å vedlikeholde** - begge bruker Keep a Changelog-format:

#### 1. In-app endringslogg (`src/app/changelog/page.tsx`)
- Vises på `/changelog` og lenkes fra footer på dashbordet
- **Dette er den viktigste** - det brukerne faktisk ser
- Oppdater ved hver merkbar endring/feature
- Format:
  ```typescript
  {
    version: "1.5.0",
    date: "8. desember 2024",
    changes: [
      { type: "new", text: "Prishistorikk for belønninger" },
      { type: "improvement", text: "Raskere lasting av rapporter" },
      { type: "fix", text: "Fikset problem med PDF-eksport" },
    ]
  }
  ```
- Typer: `new` (Added), `improvement` (Changed), `fix` (Fixed)

#### 2. CHANGELOG.md (i rot)
- Samme innhold som in-app, men i Markdown-format
- Følger Keep a Changelog-format (keepachangelog.com)
- Kategorier: Added, Changed, Fixed, Removed, Security

#### Når oppdatere changelog?
- **Umiddelbart**: Nye features, UI-endringer, bugfikser brukeren har opplevd
- **Samle opp**: Interne/tekniske fikser kan grupperes i neste versjon
- **Spør hvis usikker**: "Skal denne endringen i changelog, eller samler vi opp?"

#### Workflow ved bugfiks fra INBOX
1. Fiks buggen
2. Marker som fikset i INBOX.md (med dato og kort forklaring)
3. Legg til i changelog under "Fixed" (samme eller neste versjon)
4. Commit med beskrivende melding

## Environment Variables

```env
# .env.local (ikke commit til git)

# Azure AD (valgfri - for OneDrive-synk)
NEXT_PUBLIC_AZURE_AD_CLIENT_ID="din-client-id"
NEXT_PUBLIC_AZURE_AD_TENANT_ID="din-tenant-id"

# Vercel KV (for display-app synk)
KV_REST_API_URL="..."
KV_REST_API_TOKEN="..."

# API-nøkkel for synkronisering
API_SECRET_KEY="..."
NEXT_PUBLIC_API_SECRET_KEY="..."
```

## Vanlige oppgaver

### Legge til ny feature
1. Opprett komponent i `components/`
2. Legg til side i `app/[feature]/page.tsx`
3. Legg til i navigasjon (`navigation/SidebarNav.tsx`)
4. Legg til database-tabeller hvis nødvendig
5. Opprett service i `lib/` for logikk

### Legge til ny innstilling
1. Utvid `AppSettings` type i `lib/types.ts`
2. Legg til default i `lib/db.ts` (defaultSettings)
3. Lag migrering som setter default for eksisterende brukere
4. Legg til UI i `components/settings/`

### Feilsøking IndexedDB
1. Åpne DevTools → Application → IndexedDB → KlasseflytDB
2. Sjekk at tabellen eksisterer
3. Verifiser at data lagres korrekt
4. Slett database og refresh for å teste fresh install

## Dokumentasjon

- `docs/instructions.md` - AI coding instructions (dette dokumentet)
- `docs/architecture.md` - Systemdesign og dataflyt
- `docs/design.md` - UI/UX retningslinjer
- `docs/roadmap.md` - Utviklingsplan
- `docs/INBOX.md` - Brukerens ideer/bugs
- `README.md` - Brukerrettet oppsett
- `SITEMAP.md` - Oversikt over alle sider
- `CHANGELOG.md` - Brukervendt endringslogg

## Neste steg
Se `architecture.md` for systemdesign og `roadmap.md` for utviklingsplan.

## Testing

- Manuell testing i nettleser
- Test på mobil (responsive)
- Test med demo-data (QuickStartWizard)
- Test fresh install (slett IndexedDB)
- Typecheck: `npm run typecheck`

## Deployment

- Vercel (automatisk fra main branch)
- Preview deployments for PRs
- Environment variables i Vercel dashboard

---

## Sist oppdatert

**2026-01-04**: Database v46 - Indeksering av generatedAt
- Lagt til `generatedAt` indeks på aiMessageCache for effektiv sortering
- Fikser SchemaError ved henting av nylige meldinger
- Database versjon: 45 → 46

**2025-12-09**: KI-genererte velkomstmeldinger
- Lagt til BYOK AI-meldinger for Morning Display
- Støtte for OpenAI (GPT-4o-mini) og Anthropic (Claude 3.5 Haiku)
- API-nøkler lagres i localStorage (aldri synket)
- Én melding per tidsperiode per dag med automatisk cache
- Database versjon: 44 → 45

**2025-12-08**: Utvidet dokumentasjonsystem
- Lagt til maintenance-seksjoner og INBOX-workflow
- Opprettet architecture.md med systemdesign
- Opprettet design.md med UI/UX retningslinjer
- Opprettet roadmap.md med utviklingsplan
- Opprettet INBOX.md for brukerens ideer/bugs
- Opprettet CHANGELOG.md for brukervendt endringslogg

**2025-12-08**: Initial versjon
- Opprettet instruksjonsfil basert på prosjektstruktur
- Dokumentert teknologi stack og konvensjoner
- Beskrevet database-versjonering og API-patterns
