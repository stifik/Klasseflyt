# 🗺️ Klasseflyt - Sitemap

En komplett oversikt over applikasjonens struktur, sider og funksjoner.

---

## 🌳 Tree Structure - Rute Oversikt

```
Klasseflyt/
│
├── / (Hjem/Dashboard)
│   ├── 📊 Oversikt (Lekseoversikt)
│   ├── 📝 Vurderinger (Tester & Læringsmål)
│   ├── ✅ Daglig Sjekk (iPad/Lekse Check-in)
│   ├── 👁️ Observasjoner
│   │   ├── Timesobservasjoner
│   │   └── Merknader
│   ├── 🎯 Klasseromverktøy
│   │   ├── Sitteplassering
│   │   ├── Gruppeverktøy
│   │   ├── Elevtrekking
│   │   └── 🕵️ Hemmelig Agent
│   ├── 📋 Rapporter (Ukesmeldinger)
│   └── ⚙️ Innstillinger
│
├── /login
│   └── Microsoft autentisering + Onboarding
│
├── /privacy
│   └── Personvernserklæring
│
├── /changelog
│   └── Endringslogg
│
├── /activityfeed
│   └── Live aktivitetsfeed
│
├── 🏆 Belønningssystem
│   ├── /rewarddashboard
│   │   └── Poengoversikt per elev
│   ├── /rewardstore
│   │   └── Belønningsbutikk
│   └── /settings
│       └── Belønningsinnstillinger
│
├── 💻 Terminal
│   ├── /terminal
│   │   └── Velg modus (POD/POS)
│   ├── /terminal/pod
│   │   └── Point Of Distribution (Tildel poeng)
│   └── /terminal/pos
│       └── Point Of Sale (Kjøp belønninger)
│
├── 🔍 Offentlige Displayer
│   ├── /bors
│   │   └── Live børspriser
│   └── /agent-reveal
│       └── Animert agent-avsløring
│
└── 🔌 API
    ├── /api/agent-status
    │   └── GET agent status
    └── /api/prices
        └── GET børspriser
```

---

## 📂 Filstruktur - Komponenter

```
src/
├── app/
│   ├── page.tsx ................................. Hjem/Dashboard
│   ├── layout.tsx ............................... Root layout
│   ├── globals.css .............................. Global styles
│   │
│   ├── login/
│   │   └── page.tsx ............................. Login-side
│   │
│   ├── privacy/
│   │   └── page.tsx ............................. Personvern
│   │
│   ├── changelog/
│   │   └── page.tsx ............................. Endringslogg
│   │
│   ├── activityfeed/
│   │   └── page.tsx ............................. Aktivitetsfeed
│   │
│   ├── rewarddashboard/
│   │   └── page.tsx ............................. Belønningsoversikt
│   │
│   ├── rewardstore/
│   │   └── page.tsx ............................. Belønningsbutikk
│   │
│   ├── settings/
│   │   └── page.tsx ............................. Belønningsinnstillinger
│   │
│   ├── terminal/
│   │   ├── page.tsx ............................. Terminal-valg
│   │   ├── pod/
│   │   │   └── page.tsx ......................... POD Terminal
│   │   └── pos/
│   │       └── page.tsx ......................... POS Terminal
│   │
│   ├── bors/
│   │   └── page.tsx ............................. Børs-display
│   │
│   ├── agent-reveal/
│   │   └── page.tsx ............................. Agent-avsløring
│   │
│   └── api/
│       ├── agent-status/
│       │   └── route.ts ......................... Agent status API
│       └── prices/
│           └── route.ts ......................... Børspriser API
│
├── components/
│   ├── Dashboard.tsx ............................ Dashboard med quick actions
│   ├── AppView.tsx .............................. Hovedvisning med faner
│   │
│   ├── 📊 Oversikt
│   │   └── HomeworkOverview.tsx ................. Lekseoversikt
│   │
│   ├── 📝 Vurderinger
│   │   └── Assessments.tsx ...................... Tester & Læringsmål
│   │
│   ├── ✅ Daglig Sjekk
│   │   └── DailyChecklist.tsx ................... iPad/Lekse check-in
│   │
│   ├── 👁️ Observasjoner
│   │   ├── HourlyCheck.tsx ...................... Timesobservasjoner
│   │   ├── Observations.tsx ..................... Observasjoner wrapper
│   │   ├── Remarks.tsx .......................... Merknader
│   │   └── RemarkAnalysis.tsx ................... Merknadsanalyse
│   │
│   ├── 🎯 Klasseromverktøy
│   │   ├── ClassroomTools.tsx ................... Hovedkomponent
│   │   ├── SeatingChart.tsx ..................... Sitteplassering
│   │   ├── NewSeatingChart.tsx .................. Ny sitteplassering
│   │   ├── SeatingChartArchive.tsx .............. Arkiv
│   │   ├── GroupTool.tsx ........................ Gruppegenerator
│   │   ├── StudentPicker.tsx .................... Elevtrekking
│   │   └── SecretAgentPicker.tsx ................ Hemmelig agent
│   │
│   ├── 📋 Rapporter
│   │   ├── Reports.tsx .......................... Ukesmeldinger
│   │   └── Analysis.tsx ......................... Analyse & statistikk
│   │
│   ├── ⚙️ Innstillinger
│   │   └── Settings.tsx ......................... Hovedinnstillinger
│   │
│   ├── 🏆 Belønningssystem
│   │   ├── RewardDashboard.tsx .................. Poengoversikt
│   │   ├── RewardStore.tsx ...................... Butikk
│   │   ├── SettingsPage.tsx ..................... Belønningsinnstillinger
│   │   ├── RewardSystemLayout.tsx ............... Layout wrapper
│   │   └── ActivityFeed.tsx ..................... Aktivitetsfeed
│   │
│   ├── 💻 Terminal
│   │   ├── Terminal.tsx ......................... Terminal-valg
│   │   ├── PodView.tsx .......................... POD Terminal
│   │   └── PosView.tsx .......................... POS Terminal
│   │
│   ├── 🔧 Utility Components
│   │   ├── Providers.tsx ........................ Context providers
│   │   ├── ThemeProvider.tsx .................... Tema-håndtering
│   │   ├── ThemeToggle.tsx ...................... Tema-toggle
│   │   ├── Onboarding.tsx ....................... Onboarding wizard
│   │   ├── StudentLockStatus.tsx ................ Låst elev-status
│   │   └── DPIA.tsx ............................. GDPR/Privacy info
│   │
│   └── ui/
│       ├── accordion.tsx
│       ├── alert-dialog.tsx
│       ├── alert.tsx
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── calendar.tsx
│       ├── card.tsx
│       ├── carousel.tsx
│       ├── chart.tsx
│       ├── checkbox.tsx
│       ├── collapsible.tsx
│       ├── command.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── form.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── menubar.tsx
│       ├── popover.tsx
│       ├── progress.tsx
│       ├── radio-group.tsx
│       ├── scroll-area.tsx
│       ├── select.tsx
│       ├── separator.tsx
│       ├── sheet.tsx
│       ├── sidebar.tsx
│       ├── skeleton.tsx
│       ├── slider.tsx
│       ├── switch.tsx
│       ├── table.tsx
│       ├── tabs.tsx
│       ├── textarea.tsx
│       ├── toast.tsx
│       ├── toaster.tsx
│       └── tooltip.tsx
│
├── lib/
│   ├── db.ts .................................... Dexie database
│   ├── types.ts ................................. TypeScript types
│   ├── utils.ts ................................. Utility functions
│   ├── rewardService.ts ......................... Belønningslogikk
│   ├── positiveActions.ts ....................... Positive handlinger
│   ├── rewards.ts ............................... Belønninger konfig
│   ├── transactions.ts .......................... Transaksjonshåndtering
│   └── mock-data.ts ............................. Mock data for testing
│
├── hooks/
│   ├── use-mobile.tsx ........................... Mobile detection
│   ├── use-toast.ts ............................. Toast notifications
│   ├── useLocalStorage.ts ....................... LocalStorage hook
│   └── useNfc.ts ................................ NFC handling
│
└── ai/
    └── genkit.ts ................................ AI/Genkit config
```

---

## 📱 Hovedapplikasjon

### **`/` (Hjem/Dashboard)**
**Komponent:** `page.tsx` → `Dashboard.tsx` + `AppView.tsx`

Hovedside med dashboard og faner for alle verktøy.

#### Dashboard Quick Actions:
- 📊 Oversikt (Lekseoversikt)
- 📝 Vurderinger (Tester & Læringsmål)
- ✅ Daglig Sjekk (iPad/Lekse Check-in)
- 👁️ Observasjoner (Timesobservasjoner & Merknader)
- 🎯 Klasseromverktøy (Sitteplassering, Gruppeverktøy, Elevtrekking)
- 📋 Rapporter (Ukesmeldinger)
- 💻 Terminal (NFC/Belønningssystem)

---

## 🔐 Autentisering & Info

### **`/login`**
**Komponent:** `login/page.tsx`
- Login-side for Microsoft autentisering
- Onboarding for nye brukere

### **`/privacy`**
**Komponent:** `privacy/page.tsx`
- Personvernserklæring
- GDPR-informasjon

### **`/changelog`**
**Komponent:** `changelog/page.tsx`
- Endringslogg
- Versjonshistorikk

---

## 📚 Hovedfaner (Inne i Dashboard)

### **1. 📊 Oversikt** 
**Komponent:** `HomeworkOverview.tsx`

Lekseoversikt med grid-view:
- ✅ Bulk-godkjenning av lekser
- 📊 Filter på fag og uke
- 💬 Kommentarer og historikk per elev
- 🎯 "Merk resterende" funksjon
- 📈 Status-tracking (Godkjent, Må rettes, Ikke levert, Syk/Fravær, Glemt bok)

---

### **2. 📝 Vurderinger**
**Komponent:** `Assessments.tsx`

#### Tester & Prøver
- Opprett og administrer tester
- Registrer resultater per elev
- Oversikt over prestasjoner

#### Læringsmål
- Definér læringsmål
- Track oppnåelse per elev
- Visuelle indikatorer for måloppnåelse

---

### **3. ✅ Daglig Sjekk**
**Komponent:** `DailyChecklist.tsx`

Visuell sitteplassering med daglige checks:
- 📱 iPad-sjekk (har eleven iPad?)
- 📚 Lekse-sjekk (er leksen gjort?)
- 🎁 Bulk-belønning for alle som har gjort lekser
- 🚫 Fraværsregistrering
- 🪑 Sitteplassbasert layout

---

### **4. 👁️ Observasjoner**

#### **Timesobservasjoner**
**Komponent:** `HourlyCheck.tsx`
- Registrer atferd per time
- Valgbare atferdstyper
- Historikk per elev

#### **Merknader**
**Komponent:** `Remarks.tsx`
- Positive og negative merknader
- Kategorisering
- Eksport til ukesmeldinger

---

### **5. 🎯 Klasseromverktøy**

#### **Sitteplassering**
**Komponent:** `ClassroomTools.tsx` + `SeatingChart.tsx`
- 🎨 Design egen klasseromslayout
- 🔀 Automatisk generering med regler:
  - Unngå-par (hold elever fra hverandre)
  - Hold-sammen par
  - Plassering ved lærer/smart board
- 📜 Arkiv over tidligere sitteordninger
- 💾 Lagre og aktiver forskjellige layouts

#### **Gruppeverktøy**
**Komponent:** `GroupTool.tsx`
- Generer tilfeldige grupper
- Sett gruppestørrelse
- Historikk over gruppesammensetninger

#### **Elevtrekking**
**Komponent:** `StudentPicker.tsx`
- 🎲 Tilfeldig elevtrekking
- 📊 Tracker hvem som er trukket
- 🔄 Med/uten tilbakelegging
- 👥 Grupper (for å unngå å trekke samme elev for fort)
- 📈 Statistikk per elev

#### **Hemmelig Agent** 🕵️
**Komponent:** `SecretAgentPicker.tsx`
- Trekk ukens hemmelige agent
- Tilfeldig genererte oppdrag
- Godkjenn/Avslå oppdrag
- 📜 Historikk over agenter
- 🎁 Poengbelønning ved godkjenning
- 📧 Integrert med ukesmeldinger

---

### **6. 📋 Rapporter**
**Komponent:** `Reports.tsx`

#### Ukesmeldinger
- 📝 Automatisk generering per elev
- Inkluderer:
  - Lekseoversikt
  - iPad-status
  - Merknader
  - Tester
  - Hemmelig agent-oppdrag
- ✍️ Rediger før sending
- 📧 Eksporter til tekst
- ✅ Marker som rapportert

#### Analyse
**Komponent:** `Analysis.tsx` + `RemarkAnalysis.tsx`
- Statistikk over klassen
- Trender i atferd og prestasjoner
- Grafisk fremstilling

---

### **7. ⚙️ Innstillinger**
**Komponent:** `Settings.tsx`

#### Elever & Fag
- Administrer elevliste
- Administrer fag

#### Timeplan
- Sett opp skoletimer
- Definér perioder

#### Rapportinnstillinger
- Velg hva som inkluderes i ukesmeldinger
- Tilpass melding for hemmelig agent
- Hilsener og avslutning

#### Merknadstyper
- Definer egne merknadstyper
- Atferdstyper for observasjoner

#### Sitteplassregler
- Unngå-par
- Hold-sammen par
- Plasseringsregler

#### Arbeidsstasjoner
- Definer stasjoner i klasserommet
- For stasjonslæring

#### Database
- 💾 Eksport/Import av data
- 🔄 Reset database
- 🗑️ Slett alle data

---

## 🏆 Belønningssystem

### **`/rewarddashboard`**
**Komponent:** `rewarddashboard/page.tsx` → `RewardDashboard.tsx`

Oversikt over elevenes poeng:
- 💰 Poengbalanse per elev
- 📊 Sorterings-alternativer
- 🎁 Giveaway-funksjon
- 📱 NFC-aktivering
- 🔄 Sync med hovedsystem

---

### **`/rewardstore`**
**Komponent:** `rewardstore/page.tsx` → `RewardStore.tsx`

Belønningsbutikk:
- 🛍️ Vis tilgjengelige belønninger
- 💵 Pris per belønning
- 🛒 Kjøp-funksjon
- 📜 Transaksjonshistorikk

---

### **`/settings` (Belønningssystem)**
**Komponent:** `settings/page.tsx` → `SettingsPage.tsx`

Belønningsinnstillinger:
- 🎯 Sett klassemål (total poeng å nå)
- 🎁 Administrer belønninger
- 💰 Sett priser
- ⚡ Administrer positive handlinger (actions)
- 🔄 Reset priser til standard

---

## 💻 Terminal (NFC/Belønning)

### **`/terminal`**
**Komponent:** `terminal/page.tsx` → `Terminal.tsx`

Velg terminal-modus:
- **POD**: Felles skjerm for å tildele poeng
- **POS**: Butikk-terminal for å kjøpe belønninger

---

### **`/terminal/pod`**
**Komponent:** `terminal/pod/page.tsx` → `PodView.tsx`

POD Terminal (Point Of Distribution):
- 📱 NFC scanning
- 🎁 Velg positiv handling
- ➕ Tildel poeng til elev
- 📊 Sanntidsoppdatering

---

### **`/terminal/pos`**
**Komponent:** `terminal/pos/page.tsx` → `PosView.tsx`

POS Terminal (Point Of Sale):
- 📱 NFC scanning
- 🛍️ Velg belønning
- 💰 Kjøp med poeng
- ✅ Transaksjon-bekreftelse

---

## 🔍 Offentlige Displayer

### **`/bors` (Børs-oversikt)**
**Komponent:** `bors/page.tsx`
- Velg børs-ID
- Viser live børspriser for klassen

### **`/agent-reveal`**
**Komponent:** `agent-reveal/page.tsx`
- 🎬 Animert visning av hemmelig agent
- Flere stadier:
  - "Søker etter verdig kandidat..." (drawing animation)
  - Agent revealed
  - "Analyserer oppdrag..." (analyzing)
  - Passed ✅ eller Failed ❌
- 🎊 Konfetti ved godkjenning

---

## 🔌 API Endepunkter

### **`/api/agent-status`**
Returnerer status for dagens hemmelige agent
- Brukes av `/agent-reveal`

### **`/api/prices`**
Returnerer børspriser for børs-ID
- Brukes av `/bors`

---

## 📊 Aktivitetsfeed

### **`/activityfeed`**
**Komponent:** `activityfeed/page.tsx` → `ActivityFeed.tsx`

Visuell feed av aktiviteter i klassen:
- 🎁 Poeng tildelt
- 🛍️ Belønninger kjøpt
- 📝 Lekser godkjent
- 🕵️ Hemmelige agenter
- 📊 Sanntidsoppdateringer

---

## 🧩 Komponenter & Arkitektur

### Core Components
- **`AppView.tsx`**: Hovedvisning med fane-system
- **`Dashboard.tsx`**: Dashboard med quick actions
- **`Providers.tsx`**: Context providers
- **`ThemeProvider.tsx`**: Tema-håndtering (mørk/lys)
- **`ThemeToggle.tsx`**: Tema-toggle knapp

### Database
- **`db.ts`**: Dexie (IndexedDB) database
- **`types.ts`**: TypeScript type definisjoner
- **`rewardService.ts`**: Belønningslogikk
- **`positiveActions.ts`**: Positive handlinger konfig

### Layout Components
- **`RewardSystemLayout.tsx`**: Layout for belønningssystem
- **`ui/*`**: shadcn/ui komponenter (buttons, dialogs, etc.)

---

## 🎯 Nøkkelfunksjoner

### ✅ Bulk Operations
- Velg flere elever med checkboxes
- Bulk-godkjenning av lekser
- Bulk-belønning for hele klassen

### 📊 Real-time Updates
- Live database queries med `useLiveQuery`
- Instant UI-oppdateringer
- Ingen side-refresh nødvendig

### 🎨 Customization
- Design egne klasseromslayouts
- Tilpass rapportmeldinger
- Konfigurer positive handlinger
- Sett egne merknadstyper

### 📱 NFC Support
- Terminal-modus for NFC-scanning
- Rask poeng-tildeling
- Rask belønningskjøp

### 🕵️ Gamification
- Hemmelig agent-system
- Poeng og belønninger
- Klassemål
- Live børs-priser

---

## 📱 Responsive Design
- ✅ Desktop-optimalisert
- ✅ Tablet-støtte
- ✅ Mobil-vennlig
- 🎨 Mørk/Lys modus

---

## 🔒 Data Privacy
- 💾 Lokalt lagret (IndexedDB)
- 🔐 Ingen skylagring (standard)
- 📤 Eksport/Import funksjon
- 🗑️ Full datakontroll

---

_Sist oppdatert: Oktober 2025_
