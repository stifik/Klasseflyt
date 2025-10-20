# NFC Reader Bridge Server

En enkel Node.js server som fungerer som bro mellom Klasseflyt webapp og ACS ACR1255U-J1 kortleser via PC/SC protokoll.

## Installasjon

### Steg 1: Installer avhengigheter

```bash
cd nfc-bridge
npm install
```

### Steg 2: Koble til kortleser
Koble ACS ACR1255U-J1 til USB-porten.

### Steg 3: Start serveren

```bash
npm start
```

Serveren starter på `http://localhost:3001`

## API Endepunkter

### `GET /api/readers`
Liste over tilgjengelige kortlesere.

**Response:**
```json
{
  "readers": ["ACS ACR1255U-J1 0"]
}
```

### `POST /api/scan`
Skann kort på kortleseren.

**Response (success):**
```json
{
  "success": true,
  "cardId": "04:5A:B2:3C:D4:E5:F6",
  "atr": "3B8F8001804F0CA0000003060300030000000068"
}
```

**Response (no card):**
```json
{
  "success": false,
  "error": "No card present"
}
```

### `GET /api/status`
Server status.

**Response:**
```json
{
  "status": "ok",
  "readersConnected": 1
}
```

## Feilsøking

### Problem: "No readers found"
- Sjekk at kortleseren er koblet til
- Installer ACS drivere fra: https://www.acs.com.hk/en/driver/3/acr1255u-j1-secure-bluetooth-nfc-reader/
- Restart serveren

### Problem: "Access denied"
- Kjør terminal som Administrator
- Sjekk at ingen andre programmer bruker kortleseren

### Problem: Port 3001 allerede i bruk
Endre port i `server.js`:
```javascript
const PORT = 3002; // eller annen ledig port
```

## Integrasjon med Klasseflyt

I Klasseflyt, sett miljøvariabel:
```
NEXT_PUBLIC_NFC_BRIDGE_URL=http://localhost:3001
```

Serveren vil automatisk bli brukt når tilgjengelig.
