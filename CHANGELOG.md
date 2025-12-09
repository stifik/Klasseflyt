# Changelog

Alle viktige endringer i Klasseflyt dokumenteres her.

Formatet er basert på [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Ikke utgitt]

### Nytt
- Prishistorikk for belønninger - se hvordan prisene endrer seg over tid
- PDF-eksport av elevrapporter - profesjonelle rapporter du kan laste ned

### Forbedret
- Bedre utskriftsfunksjon for rapporter

---

## [1.5.0] - 2025-01-07

### Nytt
- **KI-genererte velkomstmeldinger** for Morning Display
  - Støtte for OpenAI (GPT-4o-mini) og Anthropic (Claude Sonnet 4)
  - BYOK (Bring Your Own Key) - API-nøkler lagres kun lokalt
  - Meldinger tilpasses automatisk til tidsperiode, ukedag og tid på døgnet
  - Regenerer-knapp for å få ny melding med ett klikk
  - Caching av meldinger per tidsperiode for å spare API-kall
  - Tilpassbar kontekst, tone og språk

---

## [1.0.0] - 2025-12-01

### Nytt
- **Belønningssystem** med poeng og butikk
  - Dynamisk prising basert på etterspørsel
  - NFC/RFID-kort for enkel betaling
  - Fellesspottpotter for klassemål
- **Morning Display** - skjermvisning for klasserommet
  - Viser priser i sanntid
  - Hemmelig agent-status
  - Tilpassbare temaer
- **Hemmelig Agent** - motivasjonssystem for god oppførsel
- **Ukerapporter** - automatisk generering av meldinger til foresatte
- **PDF-rapporter** - last ned elevrapporter

### Forbedret
- Raskere lasting av store tabeller
- Bedre mobilvisning

---

## [0.9.0] - 2025-11-01

### Nytt
- **Lekseoversikt** med statuser og kommentarer
- **Daglig sjekk** for iPad-ansvar
- **Observasjoner** - anmerkninger og timesjekk
- **Klasseromsverktøy**
  - Bordplassering
  - Gruppegenerator
  - Elevvelger
- **Innstillinger** - tilpass appen til din klasse

### Teknisk
- Lokal lagring i IndexedDB
- Fungerer offline
- Backup og gjenoppretting

---

## Dokumentvedlikehold

### Når oppdatere denne filen
- Ved hver ny feature som er synlig for brukeren
- Ved viktige bugfixes som påvirker brukeren
- Ved forbedringer i ytelse eller UX
- **Ikke** ved tekniske endringer som brukeren ikke merker

### Format
```markdown
## [Versjon] - YYYY-MM-DD

### Nytt
- Feature-beskrivelse

### Forbedret
- Forbedring av eksisterende funksjon

### Fikset
- Bug som er fikset

### Fjernet
- Funksjon som er fjernet
```

### Relaterte dokumenter
- `roadmap.md` - Se hva som kommer
- `INBOX.md` - Rapporter bugs og ønsker

---

## Sist oppdatert

**2025-12-08**: Opprettet CHANGELOG
- Dokumentert eksisterende features
- Lagt til maintenance-instrukser
