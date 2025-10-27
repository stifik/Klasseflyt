# Tidsbaserte meldinger - Implementeringsguide

## Oversikt

Systemet for tidsbaserte meldinger lar lærere konfigurere forskjellige velkomstmeldinger og instruksjoner basert på ukedag og tidspunkt. Dette gir mer relevant og kontekst-spesifikk informasjon til elevene gjennom skoledagen.

## Funksjonalitet

### 1. Tidsperiode-konfigurasjon
- Definer tidsperioder for skoledagen (f.eks. "Morgen", "Etter 1. friminutt", "Etter 2. friminutt")
- Hver periode har:
  - Et redigerbart navn
  - Et starttidspunkt (HH:MM)
  - Mulighet til å fjerne perioden
- Minimum 1 periode, ingen maksgrense
- Endringer lagres til databasen

### 2. Meldingsstruktur
- 5 dager (mandag-fredag)
- X antall perioder (basert på lærerens konfigurasjon)
- Totalt 5 × X "slots" for velkomstmeldinger
- Totalt 5 × X "slots" for instruksjoner
- Hver slot kan inneholde flere meldinger (én per linje)
- Standard/fallback melding for både velkomstmeldinger og instruksjoner

### 3. Meldingsvalg
Systemet bruker følgende logikk:

1. Identifiser gjeldende ukedag
2. Finn riktig periode basert på klokkeslett
   - Velger den siste perioden hvis klokkeslett er etter alle perioder
3. Hent meldinger fra riktig slot
4. Hvis slot er tom: bruk standard/fallback-melding
5. Velg tilfeldig melding fra tilgjengelige (med smart rotasjon uten gjentakelse)

### 4. Smart rotasjon
- Systemet bruker localStorage for å tracke hvilke meldinger som er brukt
- Ingen melding gjentas før alle meldinger i en slot er brukt
- Separate rotasjonskøer for hver kombinasjon av dag/periode/meldingstype

## Database-struktur

### Nye tabeller

#### `timePeriods`
```typescript
{
  id?: number;
  name: string;        // "Morgen", "Etter 1. friminutt", etc.
  startTime: string;   // HH:MM format
  order: number;       // For sortering (1, 2, 3...)
  createdAt?: Date;
}
```

#### `timeBasedMessages`
```typescript
{
  id?: number;
  weekday: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
  timePeriodId: number;
  messageType: 'welcome' | 'instruction';
  messages: string;    // Én melding per linje
  createdAt?: Date;
  updatedAt?: Date;
}
```

#### `defaultMessages`
```typescript
{
  id?: number;
  messageType: 'welcome' | 'instruction';
  messages: string;    // Én melding per linje
  createdAt?: Date;
  updatedAt?: Date;
}
```

### Oppdatert settings-struktur
```typescript
MorningDisplaySettings {
  // ... eksisterende felter
  useTimeBasedMessages?: boolean; // Aktiverer/deaktiverer systemet
}
```

## Komponenter

### 1. `TimePeriodConfig.tsx`
- Administrerer tidsperioder
- Legg til/fjern perioder
- Rediger periodenavn og starttidspunkt
- Validering (minimum 1 periode)
- Håndterer migrering av meldinger når perioder endres

### 2. `TimeBasedMessageTable.tsx`
- Viser tabell med dag × periode grid
- Hver celle viser antall meldinger eller "+ Legg til"
- Åpner modal for redigering ved klikk
- Separate tabeller for velkomstmeldinger og instruksjoner
- Knapp for å redigere standard/fallback-melding

### 3. `MessageEditModal.tsx`
- Modal for redigering av meldinger
- Textarea med én melding per linje
- Viser antall meldinger
- Lagre/avbryt-funksjonalitet

### 4. Hovedside: `/settings/time-based-messages/page.tsx`
- Toggle for å aktivere/deaktivere tidsbaserte meldinger
- Tidsperiode-konfigurasjon
- Tabeller for velkomstmeldinger og instruksjoner
- Brukerveiledning

## Hjelpefunksjoner (`timeBasedMessages.ts`)

### `getCurrentWeekday(date?: Date): Weekday | null`
Returnerer gjeldende ukedag som Weekday type, eller null for helg.

### `getCurrentTimePeriod(currentTime?: string): Promise<TimePeriod | null>`
Finner riktig periode basert på klokkeslett.
- Støtter dev-mode override via `localStorage.getItem('dev_time_override')`
- Returnerer første periode hvis tiden er før alle perioder

### `getTimeBasedMessage(messageType, weekday?, timePeriod?): Promise<string>`
Henter riktig melding basert på kontekst.
- Bruker fallback hvis ingen melding finnes
- Implementerer smart rotasjon

### `isTimeBasedMessagesEnabled(): Promise<boolean>`
Sjekker om tidsbaserte meldinger er aktivert i innstillinger.

## Bruk

### For lærere

1. **Aktiver funksjonen**
   - Gå til Innstillinger → Morning Display Innstillinger
   - Klikk på "Tidsbaserte meldinger"
   - Aktiver toggle-knappen

2. **Konfigurer tidsperioder**
   - Definer når hver periode starter
   - Gi periodene beskrivende navn
   - Lagre endringer

3. **Legg til meldinger**
   - Klikk på celler i tabellene
   - Skriv inn meldinger (én per linje)
   - Lagre endringer

4. **Sett fallback-meldinger**
   - Rediger standard melding for velkomst
   - Rediger standard melding for instruksjoner

### For utviklere

#### Integrering i morning-display
```typescript
// I loadData() funksjonen
const useTimeBased = await isTimeBasedMessagesEnabled();

if (useTimeBased) {
  const welcomeMsg = await getTimeBasedMessage('welcome');
  setWelcomeMessage(welcomeMsg);

  const instructionMsg = await getTimeBasedMessage('instruction');
  setInstructions(instructionMsg);
} else {
  // Bruk eksisterende logikk
}
```

#### Testing med dev-mode
```javascript
// Sett spesifikk tid
localStorage.setItem('dev_time_override', '10:30');

// Sett spesifikk ukedag
localStorage.setItem('dev_weekday_override', 'mandag');
```

## Migrering

Eksisterende meldinger i `welcomeMessages` og `instructionMessages` tabellene påvirkes ikke. Systemet bruker:
- Tidsbaserte meldinger når `useTimeBasedMessages` er `true`
- Tradisjonelle tilfeldige meldinger når `useTimeBasedMessages` er `false`

Dette gjør at lærere kan:
1. Konfigurere tidsbaserte meldinger uten å miste eksisterende data
2. Enkelt bytte mellom de to systemene
3. Teste tidsbaserte meldinger før full utrulling

## Database-versjon

Implementert i database versjon 39:
- Legger til 3 nye tabeller
- Initialiserer med 3 standardperioder
- Legger til fallback-meldinger
- Setter `useTimeBasedMessages` til `false` som standard

## Fremtidige utvidelser

Mulige forbedringer:
1. Import/eksport av meldingskonfigurasjoner
2. Kopier meldinger fra en dag til en annen
3. Bulkredigering av meldinger
4. Forhåndsvisning av meldinger for en spesifikk tid
5. Statistikk over hvilke meldinger som vises oftest
6. Sesongbaserte meldinger (høst, vinter, vår, før ferier)
