# Klasseflyt - Arkitektur

## Oversikt

Klasseflyt er en **offline-first** webapplikasjon som kjører 100% i nettleseren. All data lagres lokalt i IndexedDB, med valgfri synkronisering til OneDrive eller ekstern display-app via API.

```
┌─────────────────────────────────────────────────────────────────┐
│                         BRUKER                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS FRONTEND                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Pages     │  │ Components  │  │      Hooks              │  │
│  │  (app/)     │  │             │  │  useLiveQuery, custom   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    SERVICES (lib/)                          ││
│  │   rewardService.ts │ communityRewardService.ts │ utils.ts   ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌───────────────────┐ ┌─────────────┐ ┌─────────────────────┐
│    DEXIE.JS       │ │  API ROUTES │ │   AZURE AD/MSAL     │
│   (IndexedDB)     │ │  (Next.js)  │ │   (Valgfri auth)    │
│                   │ │             │ │                     │
│  Lokal database   │ │ /api/prices │ │  OneDrive-synk      │
│  i nettleser      │ │ /api/agent  │ │  (fremtidig)        │
└───────────────────┘ └─────────────┘ └─────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   VERCEL KV     │
                    │                 │
                    │  Delt state for │
                    │  display-app    │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  DISPLAY APP    │
                    │  (Separat app)  │
                    │                 │
                    │  Viser priser,  │
                    │  agent-status   │
                    └─────────────────┘
```

## Dataflyt

### 1. Lokal lagring (Dexie/IndexedDB)

All primær data lagres i nettleserens IndexedDB via Dexie.js:

```
KlasseflytDB (IndexedDB)
├── students          # Elever med poeng
├── subjects          # Fag
├── homework          # Lekser
├── submissions       # Innleveringer
├── submissionAttempts # Forsøk per innlevering
├── dailyChecks       # Daglig sjekk (iPad etc)
├── remarks           # Anmerkninger
├── hourlyChecks      # Timebasert atferd
├── rewards           # Belønninger i butikken
├── transactions      # Poengtransaksjoner
├── purchasedRewards  # Kjøpte belønninger
├── priceHistory      # Prishistorikk
├── rfidCards         # NFC-kort
├── settings          # Appinnstillinger
├── ... (40+ tabeller)
└── version: 44       # Nåværende skjema-versjon
```

### 2. API-synkronisering

For display-appen synkroniseres utvalgt data til Vercel KV:

```
Lærer-app                    Vercel KV                    Display-app
    │                            │                            │
    │  POST /api/prices          │                            │
    │  {borsId, rewards, ...}    │                            │
    │ ─────────────────────────► │                            │
    │                            │  GET /api/prices?borsId    │
    │                            │ ◄─────────────────────────│
    │                            │                            │
    │  POST /api/agent-status    │                            │
    │  {borsId, status, ...}     │                            │
    │ ─────────────────────────► │                            │
    │                            │  GET /api/agent-status     │
    │                            │ ◄─────────────────────────│
```

### 3. NFC-betalinger

```
┌────────────┐    USB     ┌────────────┐  WebSocket  ┌────────────┐
│ RFID-leser │ ────────► │ NFC Bridge │ ──────────► │  Browser   │
│ (ACR1255)  │            │ (Node.js)  │             │  (React)   │
└────────────┘            └────────────┘             └────────────┘
                               │
                          localhost:8765
```

## Komponent-arkitektur

### Sidehierarki

```
app/
├── page.tsx                    # Dashboard (hovedside)
├── layout.tsx                  # Root layout med providers
├── assessments/page.tsx        # Lekser og prøver
├── bors/page.tsx              # Dynamisk børs-visning
├── classroom/page.tsx          # Klasseromsverktøy
├── daily-check/page.tsx        # Daglig sjekk
├── homework/page.tsx           # Lekseoversikt
├── innsjekking/page.tsx        # Morgeninnsjekking
├── morning-display/page.tsx    # Skjermvisning
├── observations/page.tsx       # Observasjoner
├── poengsentral/page.tsx       # Poengadministrasjon
├── reports/page.tsx            # Rapporter
├── rewarddashboard/page.tsx    # Poeng-dashboard
├── rewardstore/                # Belønningsbutikk
│   ├── page.tsx               # Hovedvisning
│   └── pos/page.tsx           # NFC POS-terminal
├── secret-agent/page.tsx       # Hemmelig agent
├── settings/page.tsx           # Innstillinger
├── terminal/page.tsx           # Full-screen terminal
└── weekly-planner/page.tsx     # Ukeplanlegger
```

### Komponent-typer

1. **Page Components** (`app/[feature]/page.tsx`)
   - Henter data med useLiveQuery
   - Sender props til feature-komponenter
   - Håndterer loading states

2. **Feature Components** (`components/[Feature].tsx`)
   - Hovedlogikk for hver feature
   - Kan være store (500-1000+ linjer)
   - Importerer UI-komponenter

3. **UI Components** (`components/ui/`)
   - shadcn/ui base-komponenter
   - Gjenbrukbare, stateless
   - Styled med Tailwind

4. **Navigation** (`components/navigation/`)
   - SidebarNav, MobileNav
   - PageHeader, Breadcrumbs

5. **Settings** (`components/settings/`)
   - Separate komponenter per innstilling-seksjon

## Database-skjema

### Versjonering

Dexie bruker versjonsnummer for migreringer:

```typescript
// lib/db.ts
class MySubClassedDexie extends Dexie {
  constructor() {
    super('KlasseflytDB');
    
    this.version(1).stores({ ... });
    this.version(2).stores({ ... });
    // ...
    this.version(44).stores({
      priceHistory: '++id, rewardId, timestamp',
    });
  }
}
```

**Regler:**
- Aldri slett eller endre eksisterende kolonner
- Kun legg til nye tabeller/kolonner
- Bruk `.upgrade()` for datamigrasjon

### Hovedtabeller

| Tabell | Primærnøkkel | Beskrivelse |
|--------|--------------|-------------|
| students | ++id | Elever med navn og poeng |
| subjects | ++id | Fag |
| homework | ++id | Lekser per uke/fag |
| submissions | ++id | Elevens innlevering per lekse |
| rewards | ++id | Belønninger i butikken |
| transactions | ++id | Alle poengtransaksjoner |
| settings | id | App-innstillinger (singleton) |

### Relasjoner

```
students ─────┬───► submissions ◄──── homework
              │           │
              │           ▼
              │    submissionAttempts
              │
              ├───► transactions
              │
              ├───► remarks
              │
              ├───► dailyChecks
              │
              └───► rfidCards
```

## State Management

### Dexie useLiveQuery

Reaktiv data-henting direkte fra IndexedDB:

```typescript
const students = useLiveQuery(() => db.students.toArray());
const settings = useLiveQuery(() => db.settings.get('userSettings'));
```

**Fordeler:**
- Automatisk re-render ved endringer
- Ingen manuell cache-invalidering
- Fungerer offline

### React Context (begrenset bruk)

- `ThemeProvider` - Dark/light mode
- `Providers` - Kombinerer providers

### Local State

- `useState` for UI-state (modals, forms)
- `useReducer` for kompleks lokal state

## Sikkerhet

### Lokal data
- All data i IndexedDB er tilgjengelig for brukeren
- Ingen sensitiv data lagres (passord, tokens)
- Backup-funksjon med valgfri kryptering

### API-sikkerhet
- API-nøkler i environment variables
- Authorization header for POST-requests
- CORS-headers for display-app

### Azure AD (valgfri)
- OAuth 2.0 / OIDC
- Delegert tilgang (user_impersonation)
- Tokens lagres i sessionStorage

## Ytelse

### Optimalisering
- IndexedDB er rask for lokale operasjoner
- useLiveQuery cacher og oppdaterer effektivt
- Lazy loading av tunge komponenter

### Begrensninger
- IndexedDB har lagringsbegrensninger (varierer per nettleser)
- Ingen server-side rendering for data
- Første lasting kan være treg med mye data

---

## Dokumentvedlikehold

### Når oppdatere dette dokumentet
- Ved endringer i overordnet arkitektur
- Nye integrasjoner (auth, API, etc.)
- Nye database-tabeller eller relasjoner
- Endringer i dataflyt

### Relaterte dokumenter
- `instructions.md` - Kode-standarder og konvensjoner
- `design.md` - UI/UX retningslinjer
- `roadmap.md` - Planlagte arkitektur-endringer

---

## Sist oppdatert

**2025-12-08**: Initial versjon
- Dokumentert overordnet arkitektur
- Beskrevet dataflyt og integrasjoner
- Listet opp database-skjema og relasjoner
