# Rask oppstart: NFC/RFID i Klasseflyt

## ✅ Hva er implementert?

### 1. Database og datamodeller
- ✅ `RFIDCard` type i `types.ts`
- ✅ `rfidCards` tabell i Dexie database (versjon 31)
- ✅ `Transaction` utvidet med `paymentMethod` og `cardId`

### 2. NFC-lesing utilities
- ✅ `lib/nfcReader.ts` - Core NFC reading functions
- ✅ `hooks/useNFCReader.ts` - React hooks for enkel integrasjon
- ✅ Støtte for Web NFC og WebHID API

### 3. Brukergrensesnitt
- ✅ **RFID-kort administrasjon** (`/settings/rfid-cards`)
  - Registrer nye kort (skann eller manuelt)
  - Knytt kort til elever
  - Blokkere/aktivere kort
  - Bytte elev for kort
  - Slette kort

- ✅ **POS - Point of Sale** (`/rewardstore/pos`)
  - Velg belønning
  - Tæpp kort for å betale
  - Automatisk saldosjekk
  - Umiddelbar feedback
  - Transaksjonslogging med kort-ID

### 4. Dokumentasjon
- ✅ Fullstendig brukerveiledning i `docs/NFC_RFID_GUIDE.md`

## 🚀 Slik tester du det:

### Steg 0: Start NFC Bridge Server (VIKTIG!)

**For å bruke ACS ACR1255U-J1 kortleser, MÅ du kjøre bridge serveren:**

1. Åpne et NYTT terminal-vindu
2. Naviger til bridge-mappen:
   ```bash
   cd nfc-bridge
   ```
3. Installer avhengigheter (første gang):
   ```bash
   npm install
   ```
4. Start serveren:
   ```bash
   npm start
   ```

Du skal se:
```
🚀 NFC Bridge Server running on http://localhost:3001
📡 Waiting for card readers...
📱 New reader detected: ACS ACR1255U-J1 0
```

**La dette terminal-vinduet stå åpent mens du bruker appen!**

### Steg 1: Opprett testdata (hvis ikke allerede gjort)
Sørg for at du har:
- Noen elever i systemet
- Noen belønninger opprettet
- Elevene har poeng å handle for

### Steg 2: Registrer et kort
1. Start appen: `npm run dev` (i Klasseflyt-mappen, IKKE nfc-bridge)
2. Gå til **Innstillinger → RFID-kort** (`http://localhost:3000/settings/rfid-cards`)
3. Klikk **Registrer nytt kort**
4. Hvis bridge serveren kjører og kortleseren er tilkoblet:
   - Klikk **Skann RFID-kort**
   - Tæpp kortet på kortleseren
   - Kort-ID vil automatisk fylles inn
5. Hvis bridge ikke kjører (testing):
   - Skriv inn et test-kort-ID manuelt, f.eks: `04:5A:B2:3C:D4:E5:F6`
6. Velg en elev fra dropdown
7. Klikk **Registrer kort**

### Steg 3: Test POS
1. Gå til **Terminal → Butikk** (`http://localhost:3000/terminal/pos`)
2. Klikk på en belønning
3. Velg betalingsmåte:
   - **NFC-betaling (anbefalt):**
     - Klikk **Tæpp NFC-kort**
     - Nå kan elevene stå i kø og tæppe kortene sine - ett etter ett!
     - Systemet behandler automatisk hvert kort
   - **Manuell betaling:**
     - Velg elev fra dropdown
     - Klikk OK

### Steg 4: Test kø-funksjonalitet
1. Velg samme belønning
2. Klikk **Tæpp NFC-kort**
3. La 3-4 elever tæppe kortene sine etter hverandre
4. Hver transaksjon behandles automatisk
5. Ingen trykking på knapper mellom hver elev! 🎉

### Steg 5: Verifiser transaksjonslogg
1. Sjekk at kjøpet ble logget
2. Se at `paymentMethod: 'nfc'` og `cardId` er satt
3. Se at kortets `lastUsed` tidspunkt er oppdatert

## 🔧 Tekniske detaljer

### NFC Bridge Server Architecture:
```
Klasseflyt Web App (Next.js)
         ↓ HTTP
NFC Bridge Server (Node.js + Express)
         ↓ PC/SC Protocol
ACS ACR1255U-J1 Kortleser
         ↓ RFID
    Elevens kort
```

**Hvorfor trenger vi bridge serveren?**
- ACS ACR1255U-J1 er en **smartcard-leser**, ikke en vanlig HID-enhet
- Smartcard-lesere bruker **PC/SC protokoll** som ikke er tilgjengelig i nettlesere
- Bridge serveren bruker `@pokusew/pcsclite` npm-pakken for å kommunisere med kortleseren
- Web-appen kommuniserer med bridge serveren via HTTP API

### Nettleser-kompatibilitet:
**Med NFC Bridge Server:**
- ✅ Chrome, Edge, Firefox, Safari - alle nettlesere fungerer!
- ✅ Fungerer på localhost og produksjon

**Uten Bridge (fallback metoder):**
- ⚠️ Web NFC: Kun Chrome på Android
- ❌ WebHID: Fungerer IKKE med smartcard-lesere
- ✅ Manuell input: Alltid tilgjengelig

### Kortleser oppsett:
1. Koble ACS ACR1255U-J1 til USB
2. Windows vil installere drivere automatisk
   - Hvis ikke, last ned fra: https://www.acs.com.hk/en/driver/3/acr1255u-j1-secure-bluetooth-nfc-reader/
3. Start NFC Bridge Server (se Steg 0 over)
4. Kortleseren skal vises i konsollen

### Feilsøking Bridge Server:

**Problem: "No readers found"**
```bash
# Sjekk at kortleseren er tilkoblet
# Åpne Device Manager (devmgmt.msc)
# Se etter "Smart card readers" eller "ACS ACR1255U-J1"
```

**Problem: "Cannot find module '@pokusew/pcsclite'"**
```bash
cd nfc-bridge
npm install  # Kjør på nytt
```

**Problem: "Port 3001 already in use"**
```javascript
// Rediger nfc-bridge/server.js
const PORT = 3002;  // Endre til ledig port
```

**Problem: "Access denied" eller "PC/SC Error"**
- Lukk andre programmer som bruker kortleseren
- Kjør terminal som Administrator
- Restart kortleseren (trekk ut USB og sett inn igjen)

## 📋 Hva mangler/kan forbedres?

### Umiddelbare forbedringer:
1. **Mock NFC-scanning for utvikling**
   - Legg til en "Test-modus" knapp i POS
   - Simuler kort-scanning med dropdown av registrerte kort
   - Dette gjør testing enklere uten hardware

2. **Transaksjonshistorikk visning**
   - Lag en dedikert side for NFC-transaksjoner
   - Filtrer transaksjoner på betalingsmetode
   - Vis kort-ID i historikken

3. **iPad-ladet integrasjon**
   - Når vi implementerer dette, kan elever tæppe kort
   - Automatisk registrering i daglig sjekk
   - Automatisk belønningspoeng

### Fremtidige features:
- Bluetooth-støtte for kortleser (mer kronglete, men mulig)
- Bulk-registrering av kort (CSV import)
- Rapport over kortbruk
- "Tap to check balance" funksjon

## 🐛 Kjente begrensninger

1. **Web NFC API er begrenset**
   - Fungerer ikke i Safari
   - Begrenset støtte i Firefox
   - Krever HTTPS i produksjon

2. **WebHID API krever brukerinteraksjon**
   - Kan ikke automatisk koble til kortleser
   - Bruker må klikke knapp for å aktivere scanning
   - Dette er en sikkerhetsfunksjon i nettlesere

3. **Kortleser-spesifikke kommandoer**
   - ACS ACR1255U-J1 bruker PC/SC protokoll
   - Koden har placeholder for APDU-kommandoer
   - Kan trenge finpussing avhengig av korttype

## 💡 Tips for best opplevelse

1. **Kø-basert flyt**
   - Klikk **Tæpp NFC-kort** én gang
   - La elevene stå i kø og tæppe etter hverandre
   - Systemet behandler automatisk hver transaksjon
   - Ingen trykking mellom hver elev!

2. **Bruk NFC Bridge Server for best ytelse**
   - Raskere responstid enn Web NFC
   - Fungerer på alle nettlesere (ikke bare Chrome)
   - Ingen sikkerhetsprompts for hver scanning

3. **Test med manuell input først**
   - Verifiser at all logikk fungerer
   - Lettere å debugge uten hardware
   - Fallback når bridge server ikke kjører

4. **Registrer testdata**
   - Opprett 3-5 test-kort
   - Knytt til ulike elever
   - Test alle scenarioer (nok poeng, ikke nok, blokkert, etc.)

5. **Sjekk konsollen**
   - F12 → Console
   - Vi logger mye debug-info
   - Hjelper å se hva som skjer

## 🎯 Oppsummering

✅ **Ferdig implementert:**
- NFC-kort registrering og administrasjon
- PC/SC bridge server for ACS ACR1255U-J1
- Integrert NFC-betaling i Terminal (POD/POS)
- Kø-basert flyt (klikk én gang, scan mange kort)
- Automatisk transaksjonslogging med cardId og paymentMethod
- Manuell fallback hvis NFC ikke er tilgjengelig
- **Debouncing (3 sekunder cooldown)** - forhindrer duplikater
- **Processing lock** - kun én transaksjon om gangen
- **Visuell feedback** - processing og success overlays
- **Lydsignaler** - success og error-lyder

🎉 **Fordeler:**
- Elevene kan stå i kø - ingen teacher overhead
- Raskere transaksjonsprosess
- Ingen duplikat-transaksjoner (selv om kort blir liggende)
- Bedre oversikt over hvem som kjøper hva
- Kortene kan blokkeres hvis nødvendig
- Full transaksjonshistorikk med kortinformasjon
- Audio feedback for umiddelbar bekreftelse

📋 **Testing:**
Se detaljert test-guide: `docs/NFC_DEBOUNCING_TEST_GUIDE.md`
