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
1. Gå til **Belønningsbutikk → POS** (`http://localhost:3000/rewardstore/pos`)
2. Se listen over belønninger
3. Klikk på en belønning
4. Hvis bridge serveren kjører:
   - Klikk **Tæpp kort for å betale**
   - Tæpp kortet på kortleseren
   - Kjøpet gjennomføres automatisk!
5. Hvis bridge ikke kjører (testing):
   - Klikk **🧪 Test-modus**
   - Velg et registrert kort fra dropdown
   - Klikk **Simuler kort-scanning**

### Steg 4: Verifiser transaksjonslogg
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

1. **Bruk Chrome på Windows**
   - Best støtte for WebHID
   - Mest stabil implementasjon

2. **Test med manuell input først**
   - Verifiser at all logikk fungerer
   - Lettere å debugge uten hardware

3. **Registrer testdata**
   - Opprett 3-5 test-kort
   - Knytt til ulike elever
   - Test alle scenarioer (nok poeng, ikke nok, blokkert, etc.)

4. **Sjekk konsollen**
   - F12 → Console
   - Vi logger mye debug-info
   - Hjelper å se hva som skjer

## 🎯 Neste steg

Vil du at jeg skal:
1. **Lage en mock/test-modus** for POS uten hardware?
2. **Utvide transaksjonshistorikken** med bedre visning av NFC-kjøp?
3. **Implementere iPad-ladet integrasjonen** nå?
4. **Forbedre NFC-lesing** med bedre error handling?

La meg vite hva du vil prioritere! 🚀
