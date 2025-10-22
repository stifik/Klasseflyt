# 🚀 Kom i gang med NFC/RFID i Klasseflyt

Komplett guide for å sette opp og bruke NFC-kortfunksjonalitet med ACS ACR1255U-J1 kortleser.

---

## 📋 Hva er implementert?

### Funksjonalitet
- ✅ **RFID-kort administrasjon** - Registrer, knytt til elever, blokker/aktiver kort
- ✅ **NFC-betaling i Terminal** - Elever tæpper kort for å handle i belønningsbutikken
- ✅ **Kø-basert flyt** - Ingen teacher overhead, elevene tæpper selv
- ✅ **Debouncing** - 3 sekunders cooldown forhindrer duplikat-transaksjoner
- ✅ **Processing lock** - Kun én transaksjon om gangen
- ✅ **Visuell feedback** - Processing og success overlays med animasjoner
- ✅ **Lydsignaler** - Success og error-lyder for umiddelbar feedback
- ✅ **Transaksjonslogging** - Full historikk med kort-ID og betalingsmetode

### Teknisk stack
- **Database**: Dexie v31 med `rfidCards` tabell og utvidet `Transaction` type
- **NFC-lesing**: Bridge server med PC/SC protokoll (Windows) + Web NFC fallback (Android)
- **Hardware**: ACS ACR1255U-J1 via USB **eller Bluetooth** ✅
- **React hooks**: `useNFCReader.ts` for enkel integrasjon

---

## 🎯 Del 1: Første gangs oppsett

### 1️⃣ Sjekk at kortleseren er tilkoblet

**Via USB:**
1. Koble ACS ACR1255U-J1 til USB
2. Åpne **Device Manager** (Windows-tast → skriv "device manager")
3. Se etter **Smart card readers** → `ACS ACR1255U-J1 0`
4. Hvis gul advarselsikon: Høyreklikk → Update driver

**Via Bluetooth:** ✅
1. Slå på kortleseren
2. Åpne Bluetooth-innstillinger
3. Par enheten "ACS ACR1255U-J1"
4. Sjekk Device Manager som over

**Hvis den ikke vises:**
- Last ned drivere: https://www.acs.com.hk/en/driver/3/acr1255u-j1-secure-bluetooth-nfc-reader/
- Installer og restart PC

---

### 2️⃣ Installer NFC Bridge Server

Åpne terminal (PowerShell eller Command Prompt):

```bash
# Naviger til Klasseflyt-prosjektet
cd C:\Dev\Klasseflyt

# Gå inn i nfc-bridge mappen
cd nfc-bridge

# Installer avhengigheter (første gang)
npm install
```

**Hvis `npm install` feiler:**
- Sjekk Node.js: `node --version` (må være installert)
- Last ned fra: https://nodejs.org/

---

### 3️⃣ Start Bridge Server

**Enkel metode (Windows):**
Dobbeltklikk på: `nfc-bridge\start.bat`

**Eller via kommandolinje:**
```bash
cd nfc-bridge
npm start
```

**✅ Forventet output:**
```
🚀 NFC Bridge Server running on http://localhost:3001
📡 Waiting for card readers...
📱 New reader detected: ACS ACR1255U-J1 0
```

**❌ Vanlige feil:**

| Problem | Løsning |
|---------|---------|
| `No readers found` | Sjekk Device Manager, restart kortleser |
| `Cannot find module...` | Kjør `npm install` på nytt |
| `Port 3001 already in use` | Endre port i `server.js` til 3002 |
| `Access denied` | Kjør terminal som Administrator |

**La dette vinduet stå åpent!**

---

### 4️⃣ Start Klasseflyt (i nytt vindu)

Åpne et **NYTT** terminal-vindu:

```bash
# Naviger til Klasseflyt
cd C:\Dev\Klasseflyt

# Start Next.js appen
npm run dev
```

**VIKTIG:** Hold BEGGE vinduene åpne:
- **Vindu 1**: NFC Bridge Server (port 3001)
- **Vindu 2**: Klasseflyt App (port 3000)

---

## 🏃 Del 2: Kom i gang med testing

### 5️⃣ Test at bridge fungerer

1. Åpne nettleser: http://localhost:3000
2. Gå til **Innstillinger → RFID-kort**
3. Klikk **Registrer nytt kort**
4. Klikk **Skann RFID-kort**
5. Tæpp et kort på kortleseren

**✅ Suksess**: Kort-ID fylles automatisk inn  
**❌ Feil**: Sjekk konsollen (F12) og bridge server-vinduet

---

### 6️⃣ Registrer kort til elever

For hver elev:
1. Skann kortet (steg 5)
2. Velg elev fra dropdown
3. Klikk **Registrer kort**
4. Kortet vises nå i listen

**Tips:** Registrer 3-5 testkort for å teste ulike scenarier

---

### 7️⃣ Test POS (Point of Sale)

**Forberedelser:**
- Sørg for at elever har poeng (gå til Dashboard → gi poeng)
- Opprett noen belønninger i belønningsbutikken

**Test normal flyt:**
1. Gå til **Terminal → Butikk**
2. Klikk på en belønning
3. Klikk **Tæpp NFC-kort**
4. Tæpp kortet

**Forventet resultat:**
- 🌀 "Processing..." overlay vises
- ✅ Grønn "Kjøp vellykket!" overlay (2 sek)
- 🔊 Success-lyd spilles
- ↻ Automatisk tilbake til "Klar for neste kort..."

---

### 8️⃣ Test kø-funksjonalitet

Dette er det kule! 🎉

1. Velg samme belønning
2. Klikk **Tæpp NFC-kort** én gang
3. La 3-4 elever tæppe kortene sine etter hverandre
4. Ingen trykking mellom hver elev!
5. Hver transaksjon behandles automatisk

**Ingen teacher overhead - elevene tæpper selv!**

---

## 🧪 Del 3: Testing og validering

### Testscenarier

Se fullstendig testguide: [`NFC_TESTING_GUIDE.md`](./NFC_TESTING_GUIDE.md)

**Viktige scenarier å teste:**

| Scenario | Hva skjer |
|----------|-----------|
| **Kort blir liggende** | Debouncing forhindrer duplikat i 3 sek |
| **Ikke nok poeng** | Error-lyd, rød melding, ingen transaksjon |
| **Blokkert kort** | Error-lyd, advarsel, ingen transaksjon |
| **Ukjent kort** | Error-lyd, "kort ikke registrert" melding |
| **Rask tæpping** | Processing lock, andre kort må vente |

---

## 🔄 Del 4: Daglig bruk

**Hver gang du skal bruke NFC:**

1. **Start bridge server** (vindu 1):
   ```bash
   cd nfc-bridge
   npm start
   ```
   Eller dobbeltklikk `start.bat`

2. **Start Klasseflyt** (vindu 2):
   ```bash
   cd C:\Dev\Klasseflyt
   npm run dev
   ```

3. **Bruk appen som normalt!**

**Tips:** Opprett shortcuts eller batch-filer for rask oppstart

---

## 🎨 Del 5: Lydfiler

Systemet bruker to lydfiler for audio-feedback:
- `public/sounds/success.mp3` - Ved vellykket kjøp
- `public/sounds/error.mp3` - Ved feil

**Raskeste metode:**
1. Gå til: https://mixkit.co/free-sound-effects/
2. Last ned:
   - **Success**: "Notification bell alert" eller "Prize winning"
   - **Error**: "Wrong answer fail" eller "System error buzzer"
3. Omdøp til `success.mp3` og `error.mp3`
4. Legg i `public/sounds/` mappen

Se detaljert guide: [`SOUND_FILES_GUIDE.md`](./SOUND_FILES_GUIDE.md)

---

## 🏗️ Teknisk arkitektur

```
Klasseflyt Web App (Next.js)
         ↓ HTTP API
NFC Bridge Server (Node.js + Express)
         ↓ PC/SC Protocol
ACS ACR1255U-J1 Kortleser
         ↓ RFID (13.56 MHz)
    Elevens kort (ISO 14443A)
```

**Hvorfor bridge server?**
- Smartcard-lesere bruker PC/SC protokoll (ikke tilgjengelig i nettlesere)
- Bridge server bruker `@pokusew/pcsclite` for å kommunisere med kortleser
- Web-appen kommuniserer med bridge via HTTP API
- Fungerer i alle nettlesere (ikke bare Chrome)

**Nettleser-kompatibilitet:**
- **Med bridge**: ✅ Chrome, Edge, Firefox, Safari
- **Uten bridge**: ⚠️ Web NFC kun på Chrome Android, ✅ manuell input alltid tilgjengelig

---

## ❓ Feilsøking

### Bridge server problemer

**"No readers found"**
1. Sjekk Device Manager - er kortleseren der?
2. Restart bridge server (Ctrl+C, så `npm start`)
3. Trekk ut USB og sett inn igjen
4. Restart PC

**"Bridge server not available" i appen**
1. Er bridge server-vinduet fortsatt åpent?
2. Test: http://localhost:3001/health (skal vise `{"status":"ok"}`)
3. Sjekk firewall-innstillinger
4. Restart serveren

### Kortleser problemer

**Kort blir ikke lest**
1. Hold kortet nær leseren i 1-2 sekunder (ikke bare "tæpp")
2. Prøv et annet kort (noen kort er defekte)
3. Sjekk at det er et ISO 14443A RFID-kort (MIFARE, NTAG, etc.)
4. Sjekk at kortleseren lyser (har strøm)

**Kortleseren virker ikke lenger**
1. Sjekk Device Manager - gul advarselsikon?
2. Restart bridge server
3. Trekk ut USB og sett inn igjen
4. Oppdater drivere
5. Restart PC

### App problemer

**"Kort ikke registrert"**
1. Gå til **Innstillinger → RFID-kort**
2. Sjekk at kortet finnes i listen
3. Registrer kortet hvis det mangler

**Duplikat-transaksjoner**
- Skal ikke skje med debouncing!
- Sjekk konsollen for `🚫 Cooldown aktiv` meldinger
- Se [`NFC_TESTING_GUIDE.md`](./NFC_TESTING_GUIDE.md) for testing

**Ingen lyd**
1. Sjekk at lydfiler finnes i `public/sounds/`
2. Sjekk nettleser audio-innstillinger
3. Test lydfilene direkte: http://localhost:3000/sounds/success.mp3

---

## 📞 Hvis ingenting fungerer

Ta skjermbilder av:
1. Device Manager (Smart card readers)
2. Bridge server konsoll output
3. Nettleser konsoll (F12 → Console)
4. Feilmeldinger i appen

**Debug-tips:**
- Sjekk konsollen (F12) - vi logger mye debug-info
- Se bridge server output for PC/SC feil
- Test med manuell input for å isolere problemet

---

## 📚 Mer dokumentasjon

- **Brukerguide**: [`NFC_RFID_GUIDE.md`](./NFC_RFID_GUIDE.md) - Fullstendig funksjonalitetsoversikt
- **Testing**: [`NFC_TESTING_GUIDE.md`](./NFC_TESTING_GUIDE.md) - Detaljerte testscenarier
- **Lydfiler**: [`SOUND_FILES_GUIDE.md`](./SOUND_FILES_GUIDE.md) - Hvordan laste ned lyder
- **Dokumentindex**: [`NFC_README.md`](./NFC_README.md) - Oversikt over all NFC-dokumentasjon

---

## ✅ Sjekkliste for vellykket oppsett

- [ ] Kortleser vises i Device Manager
- [ ] Bridge server starter og finner kortleser
- [ ] Klasseflyt-app kjører på port 3000
- [ ] Kan skanne kort i RFID-kort administrasjon
- [ ] Kort registrert og knyttet til elev
- [ ] POS kan lese kort og gjennomføre kjøp
- [ ] Transaksjoner logges med kort-ID og `paymentMethod: 'nfc'`
- [ ] Debouncing fungerer (ingen duplikater ved gjentatt scanning)
- [ ] Lydfiler spiller (success og error)
- [ ] Kø-funksjonalitet testet (flere elever etter hverandre)

**Når alle er sjekket av: Gratulerer! NFC-systemet er klart til bruk! 🎉**

---

**Versjon:** 2.0  
**Sist oppdatert:** 22. oktober 2025  
**Kompatibel med:** Klasseflyt v3.1+
