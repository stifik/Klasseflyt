# Prishistorikk for Belønningssystemet

## Oversikt

Prishistorikk-funksjonen sporer alle prisendringer for belønninger i det dynamiske prissystemet. Data lagres lokalt i IndexedDB og kan hentes for å vise prisutvikling over tid.

## Hvordan det fungerer

### 1. Automatisk logging av prisendringer

Hver gang en belønning kjøpes i dynamisk modus, logges prisendringene automatisk:

```typescript
// I rewardService.ts - buyReward() og updatePricesAfterPurchase()
const priceHistoryEntries = updatedRewards
  .filter(r => r.currentPrice !== allRewards.find(old => old.id === r.id)?.currentPrice)
  .map(r => ({
    rewardId: r.id,
    price: r.currentPrice,
    timestamp: new Date()
  }));

await db.priceHistory.bulkAdd(priceHistoryEntries);
```

### 2. Database-struktur

**Tabell:** `priceHistory`

**Type:**
```typescript
export type PriceHistory = {
  id?: number;
  rewardId: number;
  price: number;
  timestamp: Date;
};
```

**Indekser:**
- `++id` - Auto-increment primærnøkkel
- `rewardId` - For å hente all historikk for en belønning
- `timestamp` - For sortering

### 3. Hente prishistorikk

**Funksjon:** `getPriceHistory(rewardId: number)`

**Eksempel:**
```typescript
import { getPriceHistory } from '@/lib/rewardService';

const history = await getPriceHistory(123);

// Resultat:
{
  rewardId: 123,
  rewardName: "Ekstra friminutt",
  history: [
    {
      timestamp: "2025-11-19T08:00:00.000Z",
      price: 100,
      date: "2025-11-19"
    },
    {
      timestamp: "2025-11-19T10:30:00.000Z",
      price: 105,
      date: "2025-11-19"
    }
  ]
}
```

## Brukseksempler

### React-komponent

Se `src/components/examples/PriceHistoryExample.tsx` for et komplett eksempel.

```typescript
import { getPriceHistory } from '@/lib/rewardService';
import { useEffect, useState } from 'react';

function MyComponent({ rewardId }: { rewardId: number }) {
  const [history, setHistory] = useState(null);

  useEffect(() => {
    getPriceHistory(rewardId).then(setHistory);
  }, [rewardId]);

  return (
    <div>
      {history?.history.map(entry => (
        <div key={entry.timestamp}>
          {entry.date}: {entry.price} poeng
        </div>
      ))}
    </div>
  );
}
```

### Med Chart (recharts)

```typescript
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { getPriceHistory } from '@/lib/rewardService';

function PriceChart({ rewardId }: { rewardId: number }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    getPriceHistory(rewardId).then(result => {
      setData(result.history);
    });
  }, [rewardId]);

  return (
    <LineChart width={600} height={300} data={data}>
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      <Line type="monotone" dataKey="price" stroke="#8884d8" />
    </LineChart>
  );
}
```

## API-endepunkt

**URL:** `/api/price-history?rewardId={rewardId}`

**Merk:** Siden alle data er lagret i IndexedDB (client-side), returnerer dette endepunktet en feilmelding som anbefaler å bruke client-side funksjonen `getPriceHistory()` i stedet.

For eksterne applikasjoner (som display-appen), bruk heller `/api/prices` som synkroniserer gjeldende priser til Vercel KV.

## Når logges prishistorikk?

Prishistorikk logges kun når:

1. **Dynamisk modus er aktivert** (`rewardSystem.mode === 'dynamic'`)
2. **En belønning kjøpes** (via `buyReward()` eller `updatePricesAfterPurchase()`)
3. **Prisen faktisk endres** (filtrerer ut belønninger der prisen forblir den samme)

## Datalagringsstruktur

```
IndexedDB: KlasseflytDB
  └── priceHistory
      ├── id: 1
      │   ├── rewardId: 123
      │   ├── price: 100
      │   └── timestamp: 2025-11-19T08:00:00.000Z
      ├── id: 2
      │   ├── rewardId: 123
      │   ├── price: 105
      │   └── timestamp: 2025-11-19T10:30:00.000Z
      └── ...
```

## Migrering og versjonering

Database-versjon 44 legger til `priceHistory`-tabellen:

```typescript
// I db.ts
this.version(44).stores({
  priceHistory: '++id, rewardId, timestamp',
});
```

Eksisterende brukere vil automatisk få oppgradert sin database neste gang de laster appen.

## Ytelse

- **Skrivinger:** Bulk-insert ved hver prisoppdatering (effektivt)
- **Lesinger:** Indeksert søk på `rewardId` (raskt)
- **Lagringsforbruk:** Minimal (ca. 50 bytes per entry)

## Fremtidige forbedringer

- [ ] Automatisk sletting av gammel historikk (>90 dager)
- [ ] Aggregering av data per dag for lang historikk
- [ ] Export til CSV/Excel
- [ ] Sammenligning av flere belønninger
- [ ] Statistikk og trender

## Feilsøking

### Ingen historikk vises

1. Sjekk at dynamisk modus er aktivert i innstillinger
2. Verifiser at belønninger faktisk er kjøpt
3. Åpne DevTools → Application → IndexedDB → KlasseflytDB → priceHistory

### Historikk vises ikke i riktig rekkefølge

Bruk `.sortBy('timestamp')` når du henter fra databasen:

```typescript
const history = await db.priceHistory
  .where('rewardId')
  .equals(rewardId)
  .sortBy('timestamp');
```

## Support

For spørsmål eller problemer, se hovedprosjektets README eller kontakt utvikler.
