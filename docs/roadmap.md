# Klasseflyt - Roadmap

## Oversikt

Denne filen dokumenterer planlagte features, forbedringer og tekniske oppgaver for Klasseflyt.

---

## ✅ Ferdig (Recent)

### Prishistorikk for belønninger
- [x] `PriceHistory`-type i types.ts
- [x] Database-tabell med versjon 44
- [x] Logging ved kjøp i rewardService.ts
- [x] `getPriceHistory()` funksjon
- [x] Dokumentasjon i PRICE_HISTORY_README.md

### PDF-eksport av elevrapporter
- [x] jsPDF + jspdf-autotable installert
- [x] pdfGenerator.ts for profesjonelle rapporter
- [x] Last ned enkelt-elev eller alle
- [x] Fargekoding og tabeller

### NFC/RFID-betalingssystem
- [x] NFC Bridge server (Node.js + WebSocket)
- [x] Kortregistrering og administrasjon
- [x] POS-terminal for betalinger
- [x] Debouncing for å unngå dobbeltscan

---

## 🚧 Under arbeid

### OneDrive-synkronisering
- [ ] Azure AD-innlogging fungerer
- [ ] Backup til OneDrive AppFolder
- [ ] Restore fra OneDrive
- [ ] Automatisk synk ved endringer

### Forbedret rapportsystem
- [ ] Mer fleksible ukesrapporter
- [ ] Tilpassbare maler
- [ ] Eksport til flere formater

---

## 📋 Planlagt (Prioritert)

### Fase 1: Stabilitet og polish

#### Bugfixes
- [ ] Sjekk at alle settings migreres korrekt
- [ ] Valider database-oppgraderinger for alle versjoner
- [ ] Forbedre feilhåndtering i services

#### UX-forbedringer
- [ ] Bedre loading-indikatorer
- [ ] Tydeligere feilmeldinger
- [ ] Keyboard shortcuts for vanlige handlinger
- [ ] Forbedret mobil-opplevelse

#### Teknisk gjeld
- [ ] Refaktorer store komponenter (Reports.tsx, etc.)
- [ ] Konsistent error handling
- [ ] Bedre TypeScript-typing (fjern any)

### Fase 2: Nye features

#### Foresatt-kommunikasjon
- [ ] Generering av foreldremeldinger
- [ ] Maler for ulike situasjoner
- [ ] Eksport til e-post/SMS-format

#### Utvidet observasjonssystem
- [ ] Flere observasjonstyper
- [ ] Kategorisering og tagging
- [ ] Trend-analyse over tid

#### Forbedret belønningssystem
- [ ] Sesongbaserte belønninger
- [ ] Lagdelte belønninger (individuell + klasse)
- [ ] Statistikk over kjøp

### Fase 3: Integrasjoner

#### Visma InSchool
- [ ] Importere elever
- [ ] Synkronisere fravær
- [ ] Eksportere data

#### Microsoft Teams
- [ ] Dele rapporter
- [ ] Varsler til foresatte
- [ ] Klassebeskjeder

#### Kalender-integrasjon
- [ ] Synk med skolens kalender
- [ ] Automatiske påminnelser
- [ ] Planlegging av prøver

---

## 💡 Fremtidige ideer

### Elev-app
- Elevene ser sine egne poeng
- Kjøpe belønninger selv
- Se lekser og status

### Gamification
- Achievements/badges
- Ukentlige utfordringer
- Leaderboards (anonymisert)

### KI-funksjoner
- Automatisk meldingsgenerering
- Forslag til tiltak basert på observasjoner
- Prediksjon av problemer

### Multi-klasse støtte
- Håndtere flere klasser
- Delte innstillinger
- Sammenligning mellom klasser

### Avansert analyse
- Dashboard med statistikk
- Eksport til Excel
- Visualisering av trender

---

## 🐛 Kjente problemer

### Lav prioritet
- Noen dialoger lukkes ikke automatisk etter handling
- Scroll-posisjon huskes ikke alltid ved navigasjon
- Print-preview viser ikke alltid riktig

### Teknisk
- QuickStartWizard har TypeScript-feil (reportSettings)
- Noen komponenter er for store og bør splittes

---

## Dokumentvedlikehold

### Når oppdatere dette dokumentet
- Når en feature er ferdig → flytt til "Ferdig"
- Nye ideer fra INBOX.md → legg til riktig seksjon
- Nye bugs oppdaget → legg til "Kjente problemer"
- Prioriteringer endres → reorganiser seksjoner

### Relaterte dokumenter
- `INBOX.md` - Brukerens ideer og bugs (sjekk regelmessig!)
- `instructions.md` - Kode-standarder ved implementering
- `architecture.md` - Tekniske detaljer for nye features
- `CHANGELOG.md` - Oppdater når features er ferdige

---

## Sist oppdatert

**2025-12-08**: Initial versjon
- Dokumentert ferdigstilte features
- Planlagt faser for fremtidig utvikling
- Listet opp kjente problemer
- Lagt til fremtidige ideer
