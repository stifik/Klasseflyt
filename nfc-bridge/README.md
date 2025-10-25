# NFC Reader Bridge Server v2.0

En robust Node.js server med **WebSocket-støtte** som fungerer som bro mellom Klasseflyt webapp og ACS ACR1255U-J1 kortleser via PC/SC protokoll.

## 🚀 Hva er nytt i v2.0?

- ✨ **WebSocket-basert event-driven arkitektur** - Ingen mer polling!
- ⚡ **Sanntids kortdeteksjon** - Umiddelbar respons når kort settes på
- 🔌 **Automatisk kortlesing** - Serveren leser kort automatisk når de settes på
- 📉 **Redusert CPU og nettverksbruk** - Mye mer effektiv enn polling
- 🎯 **Enklere klient-integrasjon** - En enkel WebSocket hook erstatter kompleks polling-logikk
- ⬆️ **Bakoverkompatibel** - Gamle HTTP-endepunkter fungerer fortsatt

## Funksjoner

- ✅ **Event-basert kortdeteksjon** - WebSocket pusher events når kort oppdages
- ✅ **Automatisk reader-deteksjon** - Finner og velger tilgjengelige kortlesere
- ✅ **Timeout-håndtering** - Forhindrer at requests henger
- ✅ **Automatisk reconnect** - Bytter til ny reader hvis den aktive fjernes
- ✅ **Standardiserte feilkoder** - Konsistent feilhåndtering
- ✅ **Stille feilhåndtering** - Logger kun uventede feil
- ✅ **Norske feilmeldinger** - Brukervennlige tilbakemeldinger
- ✅ **Konfigurerbar via miljøvariabler** - PORT og SCAN_TIMEOUT
- ✅ **Legacy HTTP API** - Støtter fortsatt polling for bakoverkompatibilitet

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

## WebSocket API (Anbefalt)

Koble til WebSocket-serveren på `ws://localhost:3001` for sanntids kortdeteksjon.

### WebSocket Events (Server → Klient)

**`status`** - Sendt ved tilkobling
```json
{
  "type": "status",
  "readersConnected": 1,
  "currentReader": "ACS ACR1255U-J1 0",
  "isMonitoring": false,
  "timestamp": "2025-10-22T12:34:56.789Z"
}
```

**`card_detected`** - Sendt når kort oppdages (kun hvis monitoring er aktivert)
```json
{
  "type": "card_detected",
  "uid": "04:5A:B2:3C:D4:E5:F6",
  "cardId": "04:5A:B2:3C:D4:E5:F6",
  "length": 7,
  "reader": "ACS ACR1255U-J1 0",
  "timestamp": "2025-10-22T12:34:56.789Z"
}
```

**`card_removed`** - Sendt når kort fjernes
```json
{
  "type": "card_removed",
  "reader": "ACS ACR1255U-J1 0",
  "timestamp": "2025-10-22T12:34:56.789Z"
}
```

**`error`** - Sendt ved feil
```json
{
  "type": "error",
  "error": "TIMEOUT",
  "message": "Tidsavbrudd - kortet svarte ikke",
  "timestamp": "2025-10-22T12:34:56.789Z"
}
```

### WebSocket Commands (Klient → Server)

**Start monitoring** - Aktiver automatisk kortdeteksjon
```json
{ "command": "start_monitoring" }
```

**Stop monitoring** - Deaktiver automatisk kortdeteksjon
```json
{ "command": "stop_monitoring" }
```

**Scan once** - Skann én gang (uten monitoring)
```json
{ "command": "scan_once" }
```

### Bruk i Klasseflyt

```typescript
import { useNFCWebSocket } from '@/hooks/useNFCWebSocket';

const nfc = useNFCWebSocket({
  enabled: true,
  autoConnect: true,
  onCardDetected: (card) => {
    console.log('Card detected:', card.uid);
    // Handle card...
  }
});

// Start monitoring when ready
nfc.startMonitoring();

// Stop monitoring when done
nfc.stopMonitoring();
```

## HTTP API (Legacy - Bakoverkompatibilitet)

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
Skann kort på kortleseren (krever polling fra klient).

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
- `NO_CARD` (404) - Intet kort påvist
- `CARD_REMOVED` (404) - Intet kort påvist
- `TIMEOUT` (408) - Tidsavbrudd - kortet svarte ikke
- `CONNECT_ERROR` (400) - Kunne ikke koble til kort
- `TRANSMIT_ERROR` (400) - Feil ved kommunikasjon med kort
- `INVALID_RESPONSE` (400) - Ugyldig svar fra kort
- `CARD_ERROR` (400) - Kortet returnerte en feil

### `GET /api/status`
Server status og tilstand.

**Response:**
```json
{
  "status": "ok",
  "readersConnected": 1,
  "currentReader": "ACS ACR1255U-J1 0",
  "pollingSupported": true,
  "websocketSupported": true,
  "isMonitoring": false,
  "connectedClients": 1,
  "version": "2.0.0"
}
```

### `GET /health`
Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "ok",
  "healthy": true,
  "readers": 1,
  "websocket": true
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

## Hvorfor WebSocket er bedre enn polling?

**Polling-basert arkitektur (gammel):**
```
Klient → [250ms] → Server → PC/SC → Connect → Read → Disconnect → Klient
Klient → [250ms] → Server → PC/SC → Connect → Read → Disconnect → Klient
Klient → [250ms] → Server → PC/SC → Connect → Read → Disconnect → Klient
```
- ❌ Konstant CPU-bruk (hvert 250ms)
- ❌ Mange HTTP-requests (4 per sekund)
- ❌ Gjentatte connect/disconnect-kall kan destabilisere kortleseren
- ❌ Latency: Opptil 250ms forsinkelse før kort oppdages
- ❌ Kompleks debouncing-logikk nødvendig

**Event-basert arkitektur (ny):**
```
Klient ←→ WebSocket ←→ Server ←→ PC/SC (holder forbindelse åpen)
                                    ↓
                              Card inserted event
                                    ↓
                            Automatisk lesing → Klient
```
- ✅ Minimal CPU-bruk (kun når kort settes på)
- ✅ Én WebSocket-forbindelse (persistent)
- ✅ PC/SC holder forbindelse åpen (mer stabilt)
- ✅ Latency: ~10-50ms (umiddelbar deteksjon)
- ✅ Ingen behov for kompleks debouncing

## Changelog

### v2.0.0 (Nåværende)
- ✨ **WebSocket-støtte** - Sanntids event-basert kortdeteksjon
- ⚡ **Automatisk kortlesing** - Leser kort automatisk når de settes på
- 📉 **Drastisk redusert nettverksbruk** - Ingen mer polling
- 🔌 **Persistent PC/SC-forbindelse** - Mer stabilt enn gjentatte connect/disconnect
- 🎯 **Enklere klient-integrasjon** - useNFCWebSocket hook
- ⬆️ **Bakoverkompatibel** - HTTP API fungerer fortsatt

### v1.1.0
- ✅ Lagt til timeout-håndtering (5 sekunder default)
- ✅ Polling-støtte - tillater kontinuerlig skanning
- ✅ Stille håndtering av NO_CARD/CARD_REMOVED (reduserer logging)
- ✅ Automatisk reader reconnect ved fjerning
- ✅ Standardiserte feilkoder og norske meldinger
- ✅ Konfigurerbar via miljøvariabler (PORT, SCAN_TIMEOUT)
- ✅ Forbedret error handling og logging
- ✅ Timestamp på scan-resultater
- ✅ Utvidet status endpoint med version
