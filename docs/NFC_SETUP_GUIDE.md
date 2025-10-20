# 🚀 Start her - NFC oppsett for ACS ACR1255U-J1

Følg disse stegene nøyaktig for å få NFC-funksjonen til å fungere.

## Problem du opplevde:
- ❌ "Fant ingen kompatible enheter" i nettleseren
- ❌ WebHID fungerer IKKE med smartcard-lesere

## Løsning:
Vi bruker en **NFC Bridge Server** som kommuniserer med kortleseren via PC/SC protokoll.

---

## 📝 Trinn-for-trinn oppsett:

### 1️⃣ Sjekk at kortleseren er tilkoblet

1. Koble ACS ACR1255U-J1 til USB
2. Åpne **Device Manager** (Windows-tast → skriv "device manager")
3. Se etter:
   - **Smart card readers** → `ACS ACR1255U-J1 0` eller lignende
   - Hvis du ser en gul advarselsikon: Høyreklikk → Update driver

**Hvis den ikke vises:**
- Last ned drivere fra: https://www.acs.com.hk/en/driver/3/acr1255u-j1-secure-bluetooth-nfc-reader/
- Installer og restart PC

---

### 2️⃣ Installer NFC Bridge Server

Åpne **PowerShell** eller **Command Prompt**:

```bash
# Naviger til Klasseflyt-prosjektet
cd C:\Dev\Klasseflyt

# Gå inn i nfc-bridge mappen
cd nfc-bridge

# Installer avhengigheter (bare første gang)
npm install
```

**Hvis `npm install` feiler:**
- Sjekk at du har Node.js installert: `node --version`
- Hvis ikke, last ned fra: https://nodejs.org/

---

### 3️⃣ Start Bridge Server

**Enkel metode (Windows):**
```bash
# Dobbeltklikk på denne filen:
nfc-bridge\start.bat
```

**Eller via kommandolinje:**
```bash
cd nfc-bridge
npm start
```

**✅ Det skal se slik ut:**
```
🚀 NFC Bridge Server running on http://localhost:3001
📡 Waiting for card readers...
📱 New reader detected: ACS ACR1255U-J1 0
```

**❌ Hvis du ser feil:**

**Problem: "No readers found"**
- Sjekk at kortleseren er tilkoblet i Device Manager
- Restart kortleseren (trekk ut USB og sett inn igjen)
- Lukk andre programmer som kan bruke kortleseren

**Problem: "Cannot find module..."**
- Kjør `npm install` på nytt

**Problem: "Port 3001 already in use"**
- Noe annet kjører på port 3001
- Endre port i `server.js` (linje 4): `const PORT = 3002;`

---

### 4️⃣ Start Klasseflyt (i et NYTT vindu)

Åpne et **NYTT** PowerShell/Command Prompt vindu:

```bash
# Naviger til Klasseflyt
cd C:\Dev\Klasseflyt

# Start Next.js appen
npm run dev
```

**VIKTIG:** La BEGGE vinduene stå åpne:
- Vindu 1: NFC Bridge Server (port 3001)
- Vindu 2: Klasseflyt App (port 3000)

---

### 5️⃣ Test at det fungerer

1. Åpne nettleser: http://localhost:3000
2. Gå til **Innstillinger** → **RFID-kort**
3. Klikk **Registrer nytt kort**
4. Klikk **Skann RFID-kort**
5. Tæpp et kort på kortleseren

**✅ Hvis det fungerer:**
- Kort-ID fylles automatisk inn i feltet
- Du ser en suksessmelding

**❌ Hvis det ikke fungerer:**
- Sjekk at bridge serveren kjører (se vindu 1)
- Åpne konsollen (F12) og se etter feilmeldinger
- Prøv å refresh siden

---

### 6️⃣ Registrer kort til elever

1. Skann kortet (som over)
2. Velg en elev fra dropdown
3. Klikk **Registrer kort**

Gjenta for alle elever.

---

### 7️⃣ Test POS (Point of Sale)

1. Sørg for at eleven har noen poeng
2. Gå til **Belønningsbutikk** → **POS**
3. Klikk på en belønning
4. Klikk **Tæpp kort for å betale**
5. Tæpp eleven sitt kort

**✅ Kjøpet skal gjennomføres automatisk!**

---

## 🧪 Test uten kortleser (for utvikling)

Hvis du vil teste uten å ha kortleseren tilkoblet:

1. Gå til POS
2. Velg en belønning
3. Klikk **🧪 Test-modus**
4. Velg et registrert kort fra dropdown
5. Klikk **Simuler kort-scanning**

---

## 🔄 Daglig bruk

**Hver gang du skal bruke NFC:**

1. Start NFC Bridge Server:
   ```bash
   cd nfc-bridge
   npm start
   ```
   (Eller dobbeltklikk `start.bat`)

2. Start Klasseflyt:
   ```bash
   cd ..
   npm run dev
   ```

3. Bruk appen som normalt!

---

## ❓ Feilsøking

### Kortleseren virker ikke lenger

1. Sjekk Device Manager - er den der?
2. Restart bridge serveren (Ctrl+C, så `npm start` igjen)
3. Trekk ut USB og sett inn igjen
4. Restart PC

### "Bridge server not available"

1. Er vinduet med bridge serveren fortsatt åpent?
2. Går det til http://localhost:3001/health? (skal vise "status: ok")
3. Restart serveren

### Kort blir ikke lest

1. Hold kortet nær leseren i 1-2 sekunder
2. Prøv et annet kort (noen kort er defekte)
3. Sjekk at det er et ISO 14443A kort (MIFARE, NTAG, etc.)

---

## 📞 Hvis ingenting fungerer

Ta skjermbilder av:
1. Device Manager (Smart card readers seksjon)
2. Bridge server konsoll output
3. Nettleser konsoll (F12 → Console)
4. Feilmeldinger

Send til utvikler for hjelp! 🚑

---

## ✅ Du er klar!

Når alt fungerer:
- ✅ Bridge server starter og finner kortleser
- ✅ Kort kan skannes i RFID-kort administrasjon
- ✅ POS kan lese kort og gjennomføre kjøp
- ✅ Transaksjoner logges med kort-ID

**Gratulerer! NFC-systemet er klart til bruk! 🎉**
