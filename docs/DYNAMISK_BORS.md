# Klasseflyt Dynamisk Børs 📈

## Oversikt

Dette systemet bygger en bro mellom din lokale, private Klasseflyt-app og en offentlig, anonym "Børs"-nettside som viser sanntidspriser på klassebelønninger. Prisene justeres dynamisk basert på etterspørsel, akkurat som i en ekte børs!

## Hvordan det Funger

### 1. **Dynamisk Prisalgoritme**
Når en belønning kjøpes:
- Den kjøpte belønningen øker i pris med **5% av grunnprisen**
- Andre belønninger synker sakte mot sin grunnpris (2% decay per transaksjon)
- Priser holdes innenfor 50%-200% av grunnpris

### 2. **Anonym Deling**
- Lærer-appen sender oppdaterte priser til et sikkert API-endepunkt
- API-et lagrer kun anonyme prisopp

lysninger (ingen elevdata)
- Den offentlige "Børs"-siden henter og viser prisene hvert 5. sekund

### 3. **Arkitektur**

```
┌─────────────────────┐
│   Lærer-App         │
│   (Lokal/Privat)    │
│                     │
│  • Belønningskjøp   │
│  • Prisberegning    │
└──────────┬──────────┘
           │
           │ POST /api/prices
           │ (Sikret med API-nøkkel)
           ▼
┌─────────────────────┐
│   Vercel API        │
│   (/api/prices)     │
│                     │
│  • KV Storage       │
│  • Auth Check       │
└──────────┬──────────┘
           │
           │ GET /api/prices
           │ (Offentlig)
           ▼
┌─────────────────────┐
│   Børs-Side         │
│   (/bors)           │
│                     │
│  • Live priser      │
│  • Auto-refresh     │
└─────────────────────┘
```

## Oppsett

### Steg 1: Installer Avhengigheter

```bash
npm install @vercel/kv
```

### Steg 2: Sett Miljøvariabler

#### Lokalt (for utvikling)
Opprett en `.env.local` fil i prosjektets rot:

```env
API_SECRET_KEY=din-hemmelige-nøkkel-her
NEXT_PUBLIC_API_SECRET_KEY=din-hemmelige-nøkkel-her
```

**Generer en sikker nøkkel:**
```bash
# macOS/Linux
openssl rand -hex 32

# Windows PowerShell
-join ((48..57) + (97..102) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

#### På Vercel (for produksjon)

1. Gå til ditt Vercel-prosjekt → **Settings** → **Environment Variables**
2. Legg til:
   - `API_SECRET_KEY`: Din hemmelige nøkkel
   - `NEXT_PUBLIC_API_SECRET_KEY`: Samme nøkkel
3. Aktiver **Vercel KV** under **Storage** i prosjektinnstillingene

### Steg 3: Test Lokalt

```bash
npm run dev
```

Besøk:
- Lærer-app: `http://localhost:3000`
- Børs-side: `http://localhost:3000/bors`

### Steg 4: Deploy til Vercel

```bash
vercel --prod
```

## API-Endepunkter

### POST `/api/prices`
**Sikret endepunkt for å oppdatere priser**

**Headers:**
```
Authorization: Bearer <API_SECRET_KEY>
Content-Type: application/json
```

**Body:**
```json
{
  "rewards": [
    {
      "id": 1,
      "name": "15 min spilletid",
      "basePrice": 20,
      "currentPrice": 22,
      "cost": 22
    }
  ]
}
```

**Response:**
```json
{
  "message": "Prices updated successfully",
  "count": 5
}
```

### GET `/api/prices`
**Offentlig endepunkt for å hente priser**

**Response:**
```json
{
  "rewards": [...],
  "lastUpdated": "2025-10-14T12:34:56.789Z"
}
```

## Hvordan Bruke

### For Læreren (Privat App)

1. **Gi poeng** til elever som vanlig via Terminal/POS/POD
2. **Kjøp belønninger** via RewardStore
3. Prisene oppdateres automatisk i databasen
4. Nye priser synkroniseres til API-et (skjer i bakgrunnen)

### For Elevene (Offentlig Børs)

1. Besøk børs-siden (f.eks. `https://din-app.vercel.app/bors`)
2. Se sanntidspriser på alle belønninger
3. Følg med på trender (stigende/synkende priser)
4. Planlegg strategisk når de skal kjøpe!

## Sikkerhet

✅ **Hva som ER sikkert:**
- API-endepunktet er sikret med en hemmelig nøkkel
- Kun anonyme prisdata deles offentlig
- Ingen elevnavn, poeng eller persondata eksponeres
- KV-storage er isolert per prosjekt

❌ **Hva du MÅ passe på:**
- **Aldri** commit `.env.local` til Git
- Roter API-nøkkelen regelmessig
- Bruk sterke, unike nøkler
- Begrens tilgang til Vercel-prosjektet

## Feilsøking

### Priser oppdateres ikke på børsen
- Sjekk at `API_SECRET_KEY` er satt korrekt i Vercel
- Sjekk Vercel Functions logs for feilmeldinger
- Verifiser at KV er aktivert i Vercel-prosjektet

### "Unauthorized" feil ved POST
- Sjekk at `NEXT_PUBLIC_API_SECRET_KEY` matcher `API_SECRET_KEY`
- Sjekk at Bearer-token sendes riktig i Authorization-header

### Børs-siden viser ingen data
- Gjør minst ett belønningskjøp i lærer-appen først
- Sjekk nettverksfanen i browser DevTools for API-feil
- Verifiser at `/api/prices` returnerer data (åpne i nettleser)

## Videre Utvikling

### Mulige Forbedringer

1. **Prishistorikk**
   - Lagre historiske priser
   - Vis grafer over tid
   - Beregn volatilitet

2. **Avanserte Algoritmer**
   - Sesongbaserte priser
   - Tidsbegrensede tilbud
   - "Flash sales" ved lave priser

3. **Gamification**
   - Leaderboard for "beste kjøp"
   - Prediksjons-game
   - Belønninger for kloke investeringer

4. **Varsler**
   - Push-notifications ved store prisendringer
   - E-post ved nye rekorder
   - Discord/Slack-integrasjon

## Lisens

Dette er en del av Klasseflyt-prosjektet. Se hovedprosjektets lisens.

## Support

Har du spørsmål? Opprett en issue på GitHub eller kontakt utvikleren.

---

**Lykke til med børsen! 🚀📈**
