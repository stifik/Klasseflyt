# Multi-Tenant Børs & Hemmelig Agent - Oppsettguide

## 📋 Oversikt

Klasseflyt støtter nå **multi-tenant arkitektur** som lar hver lærer ha sin egen unike børs-ID. Dette gjør det mulig å:
- Vise børspriser på en offentlig skjerm/nettside
- Kjøre "Hemmelig Agent"-spillet med dramatisk avsløring på storskjerm

## 🔑 Del 1: Sett opp din Børs-ID

### Steg 1: Velg en unik ID
1. Gå til **Innstillinger** i Klasseflyt
2. Finn seksjonen **"📊 Min Unike Børs-ID"**
3. Velg en unik ID for din klasse, f.eks:
   - `7a-norsk-2024`
   - `matematikk-5b`
   - `naturfag-9c-host`

> **Tips:** Bruk små bokstaver, tall og bindestrek. Unngå mellomrom og spesialtegn.

### Steg 2: Lagre ID-en
- Skriv inn ID-en i tekstfeltet
- Trykk **"Lagre Børs-ID"**
- Du vil se en bekreftelse med URL-format: `https://din-bors-side.vercel.app/bors/{din-id}`

### Steg 3: Sett opp API-nøkkel (hvis ikke allerede gjort)
1. I **Innstillinger**, finn seksjonen **"🔗 API-nøkkel"**
2. Sett inn API-nøkkelen du fikk fra administratoren
3. Trykk **"Lagre API-nøkkel"**

> **Viktig:** Uten API-nøkkel vil ikke børspriser eller agentstatus synkroniseres til skyen.

---

## 🎯 Del 2: Hemmelig Agent - Spillmodus

### Hva er Hemmelig Agent?
Et morsomt engasjementsspill hvor én elev trekkes som "hemmelig agent" og får et hemmelig oppdrag. På slutten av dagen viser læreren resultatet på storskjerm med dramatisk avsløring!

### Slik bruker du det:

#### **På morgenen: Trekk agent**
1. Gå til **Klasseverktøy → Elevtrekker**
2. Velg fanen **"🕵️ Hemmelig Agent"**
3. Skriv inn dagens oppdrag (f.eks. "Hjelp 3 medelever uten å avsløre deg")
4. Trykk **"Trekk Dagens Hemmelige Agent"**
5. En tilfeldig elev trekkes - **hold dette hemmelig!**
6. Fortell agenten i stillhet om oppdraget

#### **På slutten av dagen: Godkjenn eller avvis**
1. Gå tilbake til **🕵️ Hemmelig Agent**-fanen
2. Vurder om agenten har fullført oppdraget
3. Trykk:
   - **"Godkjenn Oppdrag"**: Agenten får 50 poeng + dramatisk "MISSION ACCOMPLISHED" på storskjerm
   - **"Avvis Oppdrag"**: Ingen poeng, "MISSION FAILED" vises på storskjerm

#### **Belønning**
- Godkjent agent får **50 poeng** automatisk
- Poengsummen legges til i børssystemet
- Handlingen logges som "🕵️ Hemmelig Agent - Oppdrag fullført"

### Eksempler på oppdrag:
- "Hjelp 3 medelever uten å avsløre deg selv"
- "Hold klasserommet ryddig hele dagen"
- "Lytt ekstra godt og stille spørsmål"
- "Vær positiv og oppmuntre andre"

---

## 🖥️ Del 3: Offentlig Børs-visning (Valgfritt)

For å vise børspriser på en offentlig skjerm eller nettside, trenger du å deploye en separat visningsside.

### Oppsett:

#### 1. **Klon display-repository**
```bash
git clone https://github.com/your-org/klasseflyt-display.git
cd klasseflyt-display
```

#### 2. **Installer avhengigheter**
```bash
npm install
```

#### 3. **Konfigurer miljøvariabler**
Opprett `.env.local`:
```
NEXT_PUBLIC_API_BASE_URL=https://klasseflyt.vercel.app
```

#### 4. **Deploy til Vercel**
```bash
vercel --prod
```

#### 5. **Åpne børsvisningen**
Gå til: `https://din-display-side.vercel.app/bors/{din-bors-id}`

Eksempel: `https://klasseflyt-display.vercel.app/bors/7a-norsk-2024`

### Hva vises?
- Alle belønninger med navn, ikon og børspris
- Priser oppdateres automatisk når du endrer dem i Klasseflyt
- Ren, fullskjermsvennlig visning for storskjerm

---

## 🎬 Del 4: Agent Reveal-side (Valgfritt)

For maksimal dramatikk, sett opp en agent-avsløring på storskjerm!

### Oppsett:

#### 1. **Åpne agent-reveal siden**
Gå til: `https://din-display-side.vercel.app/agent/{din-bors-id}`

Eksempel: `https://klasseflyt-display.vercel.app/agent/7a-norsk-2024`

#### 2. **Hva skjer?**
- Siden poller API hvert 2. sekund for oppdateringer
- Når du godkjenner/avviser i Klasseflyt, vises resultatet på storskjerm:
  - **"⏳ Venter på dagens agent..."** (pending)
  - **"🔍 Analyserer oppdrag..."** (analyzing, 2 sek)
  - **"✅ MISSION ACCOMPLISHED!"** med agentens navn (passed)
  - **"❌ MISSION FAILED"** (failed)

#### 3. **Brukstips**
- La siden være åpen på storskjermen hele dagen
- Når du godkjenner, vil klassen se den dramatiske avsløringen
- Perfekt for å bygge spenning og engasjement!

---

## 🔧 Teknisk Informasjon (for utviklere)

### API Endepunkter

#### **GET /api/prices?borsId={id}**
Henter børspriser for en spesifikk børs-ID.

**Response:**
```json
{
  "rewards": [
    {"id": "1", "name": "iPad-tid", "price": 100, ...},
    ...
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### **POST /api/prices**
Oppdaterer børspriser (krever autentisering).

**Headers:**
```
Authorization: Bearer {API_SECRET_KEY}
Content-Type: application/json
```

**Body:**
```json
{
  "borsId": "7a-norsk-2024",
  "rewards": [...]
}
```

#### **GET /api/agent-status?borsId={id}**
Henter agentstatus for en børs-ID.

**Response:**
```json
{
  "status": "passed",
  "agentName": "Emma Hansen",
  "mission": "Hjelpe 3 medelever",
  "timestamp": "2024-01-15T14:30:00Z"
}
```

#### **POST /api/agent-status**
Oppdaterer agentstatus (krever autentisering).

**Body:**
```json
{
  "borsId": "7a-norsk-2024",
  "status": "passed",
  "agentName": "Emma Hansen",
  "mission": "Hjelpe 3 medelever"
}
```

### Datalagring
- **Vercel KV** brukes som key-value store
- Nøkkelformat: `price_list_{borsId}` og `agent_status_{borsId}`
- Hver børs-ID har sitt eget namespace (multi-tenancy)

### Sikkerhet
- POST-endepunkter krever Bearer token
- GET-endepunkter er offentlige (for visningssider)
- CORS er aktivert for cross-origin requests

---

## ❓ Ofte Stilte Spørsmål

### Kan to lærere ha samme børs-ID?
Nei, hver lærer må ha en unik ID. Hvis to lærere bruker samme ID, vil de overskrive hverandres data.

### Hva skjer hvis jeg endrer børs-ID?
- Du mister tilgang til gamle børspriser i skyen
- Må sette opp visningssider med ny ID
- Lokal data i Klasseflyt påvirkes ikke

### Trenger jeg å deploye visningssider?
Nei, det er valgfritt. Børssystemet fungerer fullt ut uten offentlige visninger. De offentlige sidene er kun for å vise data på storskjerm.

### Hvordan får jeg API-nøkkel?
Kontakt administrator eller se `README.md` for instruksjoner om å generere egen nøkkel.

### Kan elever se børsprisene?
Ja, hvis du deler URL-en til børsvisningen. Dette kan være motiverende! Agent-reveal siden viser kun status, ikke hvem som er agent før godkjenning.

---

## 📞 Support

Problemer eller spørsmål? Åpne en issue på GitHub eller kontakt utvikleren.

**Lykke til med børsen og Hemmelig Agent! 🎉**
