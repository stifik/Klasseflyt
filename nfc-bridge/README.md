# NFC Reader Bridge Server

En robust Node.js server som fungerer som bro mellom Klasseflyt webapp og ACS ACR1255U-J1 kortleser via PC/SC protokoll.

## Funksjoner

- ✅ **Automatisk reader-deteksjon** - Finner og velger tilgjengelige kortlesere
- ✅ **Timeout-håndtering** - Forhindrer at requests henger
- ✅ **Polling-vennlig** - Støtter kontinuerlig skanning for køer
- ✅ **Automatisk reconnect** - Bytter til ny reader hvis den aktive fjernes
- ✅ **Standardiserte feilkoder** - Konsistent feilhåndtering
- ✅ **Stille feilhåndtering** - Logger kun uventede feil
- ✅ **Norske feilmeldinger** - Brukervennlige tilbakemeldinger
- ✅ **Konfigurerbar via miljøvariabler** - PORT og SCAN_TIMEOUT

## Installasjon

### Steg 1: Installer avhengigheter

```bash
cd nfc-bridge
npm install
```

### Steg 2: Konfigurer miljøvariabler (valgfritt)

Kopier `.env.example` til `.env` og tilpass etter behov:

```bash
cp .env.example .env
```

### Steg 3: Koble til kortleser
Koble ACS ACR1255U-J1 til USB-porten.

### Steg 4: Start serveren

```bash
npm start
```

Serveren starter på `http://localhost:3001` (eller den porten du har konfigurert)

## API Endepunkter

### `GET /api/readers`
Liste over tilgjengelige kortlesere.

**Response:**
```json
{
  "readers": ["ACS ACR1255U-J1 0"],
  "count": 1,
  "currentReader": "ACS ACR1255U-J1 0"
}
```

### `POST /api/scan`
Skann kort på kortleseren. Kun én skanning om gangen.

**Response (success):**
```json
{
  "success": true,
  "uid": "04:5A:B2:3C:D4:E5:F6",
  "cardId": "04:5A:B2:3C:D4:E5:F6",
  "length": 7,
  "reader": "ACS ACR1255U-J1 0",
  "timestamp": "2025-10-22T12:34:56.789Z"
}
```

**Response (error):**
```json
{
  "success": false,
  "error": "NO_CARD",
  "message": "Intet kort påvist"
}
```

**Feilkoder:**
- `NO_READER` (503) - Ingen kortleser tilgjengelig
- `NO_CARD` (404) - Intet kort påvist *(ikke logget - normal polling)*
- `CARD_REMOVED` (404) - Intet kort påvist *(ikke logget - normal polling)*
- `TIMEOUT` (408) - Tidsavbrudd - kortet svarte ikke
- `CONNECT_ERROR` (400) - Kunne ikke koble til kort
- `TRANSMIT_ERROR` (400) - Feil ved kommunikasjon med kort
- `INVALID_RESPONSE` (400) - Ugyldig svar fra kort
- `CARD_ERROR` (400) - Kortet returnerte en feil

**Note:** `NO_CARD` og `CARD_REMOVED` er forventede situasjoner ved kontinuerlig polling og logges ikke som errors.

### `GET /api/status`
Server status og tilstand.

**Response:**
```json
{
  "status": "ok",
  "readersConnected": 1,
  "currentReader": "ACS ACR1255U-J1 0",
  "isScanning": false,
  "version": "1.1.0"
}
```

### `GET /health`
Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "ok",
  "healthy": true,
  "readers": 1
}
```

## Feilsøking

### Problem: "No readers found"
- Sjekk at kortleseren er tilkoblet
- Installer ACS drivere fra: https://www.acs.com.hk/en/driver/3/acr1255u-j1-secure-bluetooth-nfc-reader/
- Restart serveren
- På Windows, kan det være nødvendig å installere Visual Studio Build Tools for å kompilere `pcsclite` modulen

### Problem: "Access denied"
- Kjør terminal som Administrator
- Sjekk at ingen andre programmer bruker kortleseren

### Problem: Port 3001 allerede i bruk
Opprett en `.env` fil og sett ønsket port:
```bash
PORT=3002
```

### Problem: "Scan timeout"
Hvis kortet tar lang tid å svare, øk timeout i `.env`:
```bash
SCAN_TIMEOUT=10000
```

## Konfigurasjon

Du kan konfigurere serveren via miljøvariabler i `.env` filen:

```bash
# Server port (default: 3001)
PORT=3001

# Scan timeout i millisekunder (default: 5000)
SCAN_TIMEOUT=5000
```

## Integrasjon med Klasseflyt

I Klasseflyt, sett miljøvariabel:
```
NEXT_PUBLIC_NFC_BRIDGE_URL=http://localhost:3001
```

Serveren vil automatisk bli brukt når tilgjengelig.

## Changelog v1.1.0

- ✅ Lagt til timeout-håndtering (5 sekunder default)
- ✅ Polling-støtte - tillater kontinuerlig skanning
- ✅ Stille håndtering av NO_CARD/CARD_REMOVED (reduserer logging)
- ✅ Automatisk reader reconnect ved fjerning
- ✅ Standardiserte feilkoder og norske meldinger
- ✅ Konfigurerbar via miljøvariabler (PORT, SCAN_TIMEOUT)
- ✅ Forbedret error handling og logging
- ✅ Timestamp på scan-resultater
- ✅ Utvidet status endpoint med version
