# Automatisk Backup til Lokal PC-mappe

## Oversikt

Klasseflyt kan nå automatisk lagre backup-filer til en valgfri mappe på brukerens PC. Dette gir ekstra datasikkerhet ved å regelmessig lagre sikkerhetskopier lokalt.

## Funksjoner

### 🗂️ Mappevalg
- Brukeren velger en mappe på PC-en én gang
- Appen husker mappen og kan skrive dit automatisk
- Mappe-tilgang lagres i nettleserens IndexedDB

### ⏰ Backup-frekvens
Velg mellom:
- **Hver time** - Backup hvert time
- **Daglig** - Én gang per dag
- **Ukentlig** - Én gang per uke
- **Bare manuelt** - Kun når du klikker "Test backup nå"

### 🔒 Kryptering
- Valgfri AES-256-GCM kryptering av backup-filer
- Samme kryptering som manuell backup
- Passord lagres lokalt hvis valgt (kan aktiveres/deaktiveres)

### 🧹 Automatisk opprydding
- Beholder kun de N siste backup-filene
- Valgbart: 5, 10, 20, 50 eller ubegrenset
- Eldre backups slettes automatisk

### 📊 Status og overvåking
- Viser tidspunkt for siste backup
- Indikerer om siste backup var vellykket
- Viser feilmeldinger hvis backup feiler
- "Test backup nå"-knapp for umiddelbar backup

## Teknisk implementasjon

### File System Access API
- Bruker moderne [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)
- Kun støttet i **Chromium-baserte nettlesere** (Chrome, Edge, Opera)
- Ikke tilgjengelig i Firefox eller Safari

### Filnavn
Backup-filer navngis automatisk med tidsstempel:
```
klasseflyt_backup_2026-01-14_143022.json
```

### Datalagring
Backup-innstillinger lagres i ny `backupSettings`-tabell i IndexedDB:
- `enabled` - Om automatisk backup er aktivert
- `frequency` - Hvor ofte backup skal kjøres
- `directoryHandle` - Referanse til valgt mappe (FileSystemDirectoryHandle)
- `useEncryption` - Om backup skal krypteres
- `lastBackupDate` - Tidspunkt for siste backup
- `maxBackupsToKeep` - Antall backups å beholde

### Backup-logikk
1. Intervall-sjekking hvert 5. minutt
2. Sammenligner siste backup-tid med valgt frekvens
3. Eksporterer database med `exportDatabase()`
4. Skriver til fil i valgt mappe
5. Sletter gamle backups hvis konfigurert
6. Oppdaterer status i database

### Sikkerhet og tillatelser
- Brukeren må gi tillatelse til mappen via nettleserens dialog
- Tillatelse kan utløpe når nettleseren lukkes
- Appen re-validerer tilgang ved hver backup
- Ingen data sendes til server - alt er lokalt

## Brukerveiledning

### Oppsett
1. Gå til **Innstillinger → Database**
2. Åpne **"Automatisk backup til PC"**
3. Klikk **"Velg mappe"** og velg hvor backups skal lagres
4. Aktiver **"Aktiver automatisk backup"**-bryteren
5. Velg ønsket **frekvens** og andre innstillinger
6. Klikk **"Test backup nå"** for å bekrefte at det fungerer

### Krav
- **Nettleser:** Chrome, Edge, Opera eller annen Chromium-basert nettleser
- **Tillatelser:** Skrivetilgang til valgt mappe
- **HTTPS:** Appen må kjøres over HTTPS (eller localhost)

### Feilsøking

**"File System Access API er ikke støttet"**
- Bytt til Chrome eller Edge
- Sjekk at appen kjører over HTTPS

**"Tilgang til mappen ble ikke gitt"**
- Velg mappe på nytt
- Sjekk at du har skrivetilgang til mappen

**Backup feiler etter nettleser-restart**
- Nettleseren kan ha fjernet tillatelsen
- Åpne innstillinger og klikk "Test backup nå" for å re-autorisere

## Fordeler vs. Manuell Backup

| Funksjon | Automatisk | Manuell |
|----------|-----------|---------|
| Krever brukerinteraksjon | ❌ Nei | ✅ Ja |
| Lagres til fast mappe | ✅ Ja | ❌ Nei |
| Planlagt frekvens | ✅ Ja | ❌ Nei |
| Automatisk opprydding | ✅ Ja | ❌ Nei |
| Nettleserstøtte | Chrome/Edge | Alle |
| "Glemmer aldri" | ✅ Ja | ⚠️ Avhenger av bruker |

## Kompatibilitet med Eksisterende Backup

Automatisk backup-filer er **100% kompatible** med manuell import:
- Samme JSON-format
- Samme kryptering (hvis aktivert)
- Kan importeres via "Importer"-knappen

## Fremtidige forbedringer

Potensielle forbedringer (ikke implementert ennå):
- [ ] OneDrive/cloud-synkronisering som alternativ
- [ ] Backup-historikk med detaljer
- [ ] Notifikasjoner når backup fullføres
- [ ] Backup ved viktige hendelser (før sletting av data osv.)
- [ ] Forskjellsbasert backup (delta) for mindre filer

## Kodestruktur

### Nye filer
- `src/hooks/useAutomaticBackup.ts` - Hook for backup-logikk
- `docs/AUTOMATIC_BACKUP.md` - Denne dokumentasjonen

### Modifiserte filer
- `src/lib/types.ts` - Ny `AutoBackupSettings` type
- `src/lib/db.ts` - Ny `backupSettings` tabell (version 45)
- `src/components/settings/DatabaseSettings.tsx` - UI for automatisk backup

## Lisens og personvern

Automatisk backup lagrer **kun lokalt på brukerens PC**. Ingen data sendes til server eller skytjeneste. Brukeren har full kontroll over:
- Hvor backup lagres
- Når backup kjøres
- Om data krypteres
- Hvor lenge gamle backups beholdes

Dette er i tråd med Klasseflyt sin offline-first arkitektur og GDPR-prinsipper.
