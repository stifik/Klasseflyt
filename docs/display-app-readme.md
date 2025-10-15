# Klasseflyt Display - Offentlig Børs og Agent Reveal

Dette er en separat applikasjon for å vise Klasseflyt-data offentlig på storskjerm.

## 🎯 Funksjoner

- **Børs-visning**: Viser sanntids børspriser for belønninger
- **Agent Reveal**: Dramatisk avsløring av Hemmelig Agent-resultater
- **Multi-tenant**: Støtter flere lærere med unike børs-IDer

## 🚀 Kom i gang

### Installasjon

```bash
npm install
```

### Miljøvariabler

Opprett `.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=https://klasseflyt.vercel.app
```

### Kjør lokalt

```bash
npm run dev
```

Åpne [http://localhost:3000](http://localhost:3000) i nettleseren.

## 📁 Ruter

### `/bors/[borsId]`
Viser børspriser for en spesifikk børs-ID.

**Eksempel:**
```
http://localhost:3000/bors/7a-norsk-2024
```

**Features:**
- Fullskjermsvennlig layout
- Auto-oppdatering hvert 30. sekund
- Responsivt grid med ikoner og priser
- Animerte prisendringer

### `/agent/[borsId]`
Viser Hemmelig Agent-status med dramatisk avsløring.

**Eksempel:**
```
http://localhost:3000/agent/7a-norsk-2024
```

**Features:**
- Polling hvert 2. sekund
- Animerte status-overganger:
  - ⏳ Pending: "Venter på dagens agent..."
  - 🔍 Analyzing: "Analyserer oppdrag..." (2 sek)
  - ✅ Passed: "MISSION ACCOMPLISHED!" med agentens navn
  - ❌ Failed: "MISSION FAILED"
- Konfetti-animasjon ved godkjenning
- Fullskjerm med mørk bakgrunn for dramatisk effekt

## 🎨 Komponenter

### `BorsDisplay.tsx`
- Henter data fra `/api/prices?borsId={id}`
- Viser grid med belønninger
- Støtter emojis og ikoner
- Formaterer priser med norsk valuta

### `AgentReveal.tsx`
- Poller `/api/agent-status?borsId={id}`
- Håndterer status-overganger
- Animerer avsløringer
- Viser agentens navn ved godkjenning

## 🔧 Teknisk Stack

- **Next.js 15**: React-framework med App Router
- **TypeScript**: Type-sikkerhet
- **Tailwind CSS**: Styling
- **Vercel**: Hosting og deployment
- **SWR/React Query**: Data fetching med caching

## 📦 Deployment

### Vercel (anbefalt)

```bash
vercel --prod
```

### Manuell deployment

1. Bygg prosjektet:
```bash
npm run build
```

2. Start produksjonsserver:
```bash
npm start
```

## 🔐 Sikkerhet

- Ingen autentisering nødvendig (read-only visninger)
- CORS håndteres av hovedapplikasjonen
- Ingen sensitive data lagres i display-appen

## 📝 Eksempel på bruk

### For lærer:
1. Sett børs-ID i Klasseflyt (f.eks. `7a-norsk-2024`)
2. Deploy denne appen til Vercel
3. Åpne `https://din-app.vercel.app/bors/7a-norsk-2024` på storskjermen
4. Børspriser oppdateres automatisk når du endrer dem i Klasseflyt

### For Hemmelig Agent:
1. Trekk agent i Klasseflyt (morgenen)
2. Åpne `https://din-app.vercel.app/agent/7a-norsk-2024` på storskjermen
3. Siden viser "⏳ Venter på dagens agent..."
4. Når du godkjenner/avviser i Klasseflyt, vises resultatet dramatisk på skjermen

## 🐛 Feilsøking

### Børspriser vises ikke
- Sjekk at `NEXT_PUBLIC_API_BASE_URL` er riktig
- Verifiser at børs-ID matcher ID-en i Klasseflyt
- Sjekk nettverkskonsollen for CORS-feil

### Agent-status oppdateres ikke
- Verifiser at API-nøkkel er satt i Klasseflyt
- Sjekk at børs-ID er lagret i localStorage
- Se Network-fanen i utviklerverktøy for API-kall

## 📚 Relaterte ressurser

- [Klasseflyt hovedapplikasjon](https://github.com/your-org/klasseflyt)
- [Multi-tenant oppsettguide](../docs/multi-tenant-setup.md)
- [API dokumentasjon](../docs/api.md)

## 🤝 Bidra

Dette er et open-source prosjekt. Bidrag er velkomne!

1. Fork repository
2. Lag en feature branch (`git checkout -b feature/amazing-feature`)
3. Commit endringer (`git commit -m 'Add amazing feature'`)
4. Push til branch (`git push origin feature/amazing-feature`)
5. Åpne en Pull Request

## 📄 Lisens

MIT License - se LICENSE fil for detaljer.

---

**Laget med ❤️ for engasjerende klasseromsledelse**
