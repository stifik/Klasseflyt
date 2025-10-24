# Dagsplan-system - Dokumentasjon

## Oversikt

Dagsplan-systemet gir lærere mulighet til å:
1. **Opprette ukesmaler** - Lag ferdige dagsplaner for hver ukedag (mandag-fredag)
2. **Automatisk visning** - Morning Display laster automatisk riktig mal basert på dagens ukedag
3. **Hurtigredigering** - Rediger dagsplanen direkte fra Morning Display med 🔓-knappen
4. **Kopiere maler** - Kopier en dags plan til andre dager for å spare tid

---

## Arkitektur

### Database (Dexie/IndexedDB)

**Tabell: `scheduleTemplates`**
```typescript
{
  id?: number;
  name: string;  // "Mandag-mal", "Tirsdag-mal", etc.
  dayOfWeek?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
  sessions: ScheduleSession[];
  createdAt?: Date;
  updatedAt?: Date;
}
```

**Type: `ScheduleSession`**
```typescript
{
  id: number;
  time: string;     // "08:30"
  subject: string;  // "Norsk"
  topic: string;    // "Fortellinger som fenger"
}
```

**Indekser:**
- `++id` - Auto-increment primærnøkkel
- `name` - For søk på navn
- `dayOfWeek` - For å finne template for spesifikk dag

---

## Funksjoner

### 1. Administrasjon (Innstillinger → Ukesmaler)

**Plassering:** `/settings/weekly-schedule`

**Funksjonalitet:**
- **Dag-velger**: 5 tabs for mandag-fredag
- **Session-editor**: Legg til, rediger, slett økter
- **Lagring**: Lagrer til database med versjonering (updatedAt)
- **Kopiering**: Modal for å kopiere en dags mal til andre dager

**Komponenter:**
- `src/app/settings/weekly-schedule/page.tsx` - Hovedkomponent
- `src/app/settings/weekly-schedule/weekly-schedule.css` - Styling

**Viktige funksjoner:**
```typescript
loadTemplate(dayOfWeek) - Henter template fra database
addSession() - Legger til ny økt
updateSession(id, field, value) - Oppdaterer økt
deleteSession(id) - Sletter økt
saveTemplate() - Lagrer til database
copyToDay() - Kopierer til annen dag
```

---

### 2. Morning Display - Visning

**Automatisk lading:**
- Komponenten detekterer dagens ukedag (0-6)
- Konverterer til dayOfWeek ('monday', 'tuesday', etc.)
- Henter template fra database: `db.scheduleTemplates.where('dayOfWeek').equals(day).first()`
- Viser økter i kronologisk rekkefølge

**Helg-håndtering:**
- Lørdag/søndag (day 0 eller 6) viser: "Ingen skole i dag! 🎉"

**Layout:**
- Header: "DAGSPLAN - Mandag 24. oktober"
- Content: Liste over økter med tid, fag, tema
- Font: Skalerer automatisk basert på skjermstørrelse (clamp)

---

### 3. Morning Display - Redigering

**Aktivering:**
- Klikk 🔓-knappen i header
- Bytter til edit-modus

**Edit-modus funksjoner:**
- ➕ "Legg til økt"-knapp øverst
- Alle økter vises med input-felter
- 🗑️-knapp for å slette økt
- 💾 "Lagre" / ❌ "Avbryt" i header

**Lagring:**
```typescript
// Oppdaterer eksisterende template
await db.scheduleTemplates.update(templateId, {
  sessions: sessions.map((s, index) => ({ ...s, id: index })),
  updatedAt: new Date(),
});

// Eller oppretter ny hvis ikke finnes
await db.scheduleTemplates.add({
  name: "Mandag-mal",
  dayOfWeek: 'monday',
  sessions: [...],
  createdAt: new Date(),
  updatedAt: new Date(),
});
```

---

## Dataflyt

### Scenario 1: Lærer oppretter mal i Innstillinger

1. Lærer går til **Innstillinger → Ukesmaler**
2. Velger **Mandag**-tab
3. Klikker **+ Legg til økt**
4. Fyller inn: `08:30`, `Norsk`, `Fortellinger som fenger`
5. Klikker **Lagre endringer**
6. Database oppdateres:
   ```javascript
   await db.scheduleTemplates.add({
     name: "Mandag-mal",
     dayOfWeek: 'monday',
     sessions: [{ id: 0, time: '08:30', subject: 'Norsk', topic: '...' }],
     createdAt: new Date(),
     updatedAt: new Date()
   });
   ```

### Scenario 2: Morning Display laster dagsplan

1. Lærer åpner **Morning Display** på en mandag
2. Slide2-komponenten kjører `useEffect` → `loadTodaySchedule()`
3. Finner dagens ukedag: `getTodayDayOfWeek()` → `'monday'`
4. Henter fra database:
   ```javascript
   const template = await db.scheduleTemplates
     .where('dayOfWeek')
     .equals('monday')
     .first();
   ```
5. Setter state: `setSessions(template.sessions)`
6. Renderer økter i read-only modus

### Scenario 3: Hurtigredigering på Morning Display

1. Lærer ser dagsplanen på Morning Display
2. Klikker **🔓** for å aktivere edit-modus
3. Legger til ny økt eller endrer eksisterende
4. Klikker **💾 Lagre**
5. Oppdaterer database direkte fra Morning Display
6. Bytter tilbake til visnings-modus

### Scenario 4: Kopiering av mal

1. Lærer har laget en fin Mandag-mal
2. Går til **Innstillinger → Ukesmaler**
3. Er på **Mandag**-tab
4. Klikker **Kopier til annen dag...**
5. Velger **Tirsdag** i dropdown
6. Klikker **Kopier**
7. Database:
   ```javascript
   const newTemplate = {
     name: "Tirsdag-mal",
     dayOfWeek: 'tuesday',
     sessions: [...mondaySessions], // Deep copy
     createdAt: new Date(),
     updatedAt: new Date()
   };
   await db.scheduleTemplates.add(newTemplate);
   ```

---

## Edge Cases og Håndtering

### Ingen mal for dagens dag
- **Symptom**: Morning Display åpnes på en dag uten lagret mal
- **Håndtering**: Viser "Ingen dagsplan lagt til enda. Klikk '🔓' for å legge til økter."
- **Løsning**: Lærer kan lage mal direkte fra Morning Display

### Helg (lørdag/søndag)
- **Symptom**: `getTodayDayOfWeek()` returnerer `null`
- **Håndtering**: Viser "Ingen skole i dag! 🎉 God helg!"

### Tom dagsplan (alle økter slettet)
- **Symptom**: `sessions.length === 0`
- **Håndtering**: Viser empty-state: "Ingen økter lagt til enda."

### Samtidig redigering fra to steder
- **Symptom**: Lærer redigerer i Innstillinger mens Morning Display er åpen
- **Strategi**: Last-write-wins (siste lagring vinner)
- **Note**: Ingen konflikt-deteksjon implementert ennå

### Svært lang dagsplan (10+ økter)
- **Håndtering**: CSS `overflow-y: auto` på `.schedule-content`
- **Scrollbar**: Custom styling for bedre visuell opplevelse

---

## Testing

### Test 1: Opprett mal i Innstillinger
1. Gå til `/settings/weekly-schedule`
2. Velg "Mandag"
3. Legg til 3 økter
4. Klikk "Lagre"
5. ✅ Verifiser at data lagres i database

### Test 2: Auto-loading på Morning Display
1. Opprett Mandag-mal i Innstillinger
2. Åpne `/morning-display` på en mandag
3. Naviger til Slide 2
4. ✅ Verifiser at Mandag-mal vises automatisk

### Test 3: Hurtig-redigering
1. Åpne Morning Display → Slide 2
2. Klikk 🔓
3. Legg til en ny økt
4. Klikk 💾 Lagre
5. ✅ Verifiser at endringen persisterer

### Test 4: Kopier mal
1. Gå til Innstillinger → Ukesmaler
2. Opprett Mandag-mal med 5 økter
3. Klikk "Kopier til annen dag..."
4. Velg "Tirsdag"
5. Klikk "Kopier"
6. Gå til Tirsdag-tab
7. ✅ Verifiser at økter er kopiert

### Test 5: Tom dagsplan
1. Slett alle økter fra en dag
2. Åpne Morning Display på den dagen
3. ✅ Verifiser at "Ingen dagsplan"-melding vises

### Test 6: Helg
1. Sett systemklokke til lørdag (eller vent til helg)
2. Åpne Morning Display → Slide 2
3. ✅ Verifiser at "Ingen skole i dag! 🎉" vises

---

## Kodestruktur

```
src/
├── app/
│   ├── morning-display/
│   │   ├── page.tsx              # Main display orchestrator
│   │   └── morning-display.css   # All display styles
│   └── settings/
│       └── weekly-schedule/
│           ├── page.tsx          # Admin interface
│           └── weekly-schedule.css
├── components/
│   └── morning-display/
│       ├── Slide2.tsx            # Schedule display + editing
│       └── ...
└── lib/
    ├── db.ts                     # Dexie database schema
    └── types.ts                  # TypeScript types
```

---

## Fremtidige forbedringer

### Nice-to-have (senere):
1. **Drag-and-drop reordering** av økter
2. **Farge-koding** av fag (Norsk = blå, Matte = rød)
3. **Ikoner** per fag (📚 Norsk, ➕ Matte, 🏃 Gym)
4. **Notater** per økt (synlig kun for lærer)
5. **Dupliser økt**-knapp
6. **Import fra Google Calendar**
7. **Ukentlig oversikt** (se alle 5 dager samtidig)
8. **Konflikt-deteksjon** ved samtidig redigering

---

## Feilsøking

### Problem: Dagsplan vises ikke
- **Sjekk 1**: Er det riktig ukedag? (ikke helg)
- **Sjekk 2**: Finnes template i database?
  ```javascript
  const template = await db.scheduleTemplates
    .where('dayOfWeek')
    .equals('monday')
    .first();
  console.log(template);
  ```
- **Løsning**: Opprett mal i Innstillinger eller via 🔓 på Morning Display

### Problem: Endringer lagres ikke
- **Sjekk**: Er database tilgjengelig?
  ```javascript
  const count = await db.scheduleTemplates.count();
  console.log('Templates i database:', count);
  ```
- **Sjekk**: Er det feil i console?
- **Løsning**: Verifiser at `templateId` er satt før update

### Problem: Kopier-funksjon overskriver ikke
- **Forventet**: Skal spørre om overskriving hvis target dag har mal
- **Sjekk**: Se etter `confirm()`-dialog
- **Løsning**: Klikk "OK" for å bekrefte overskriving

---

## Oppsummering

Dette systemet gir:
- ✅ Full dagsplan-administrasjon i Innstillinger
- ✅ Hurtig-redigering direkte på Morning Display
- ✅ Automatisk lading av riktig mal basert på ukedag
- ✅ Persistering av alle endringer i IndexedDB
- ✅ Enkel kopiering av maler mellom dager
- ✅ Diskré redigeringsmodus (🔓-ikon)
- ✅ Responsiv design som fungerer på alle skjermstørrelser
- ✅ Helg-håndtering og empty-states
