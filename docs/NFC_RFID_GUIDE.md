# NFC/RFID Kortfunksjonalitet i Klasseflyt

## Oversikt
Klasseflyt støtter nå RFID/NFC-kort for å la elever handle i belønningsbutikken ved å bare tæppe sitt personlige kort. Systemet støtter ACS ACR1255U-J1 kortleser (og lignende PC/SC-kompatible lesere).

## Funksjonalitet

### 1. Kortadministrasjon (`/settings/rfid-cards`)
Her kan læreren administrere RFID-kort:

**Funksjoner:**
- ✅ **Registrere nye kort** - Skann kort eller skriv inn manuelt
- ✅ **Knytte kort til elev** - Velg hvilken elev som eier kortet
- ✅ **Blokkere/aktivere kort** - Sperr kort ved tap eller misbruk
- ✅ **Bytte elev** - Tilordne eksisterende kort til ny elev
- ✅ **Slette kort** - Fjern kort fra systemet

**Datafelt per kort:**
- `cardId` - Unik RFID UID (8, 14 eller 20 hex-tegn)
- `studentId` - Hvilken elev kortet tilhører
- `status` - `active` eller `blocked`
- `createdAt` - Når kortet ble registrert
- `lastUsed` - Siste gang kortet ble brukt

### 2. POS - Point of Sale (`/rewardstore/pos`)
Kjøpsgrensesnitt for belønninger med NFC-betaling:

**Flyt:**
1. Lærer velger belønning på skjermen
2. Elev tæpper sitt RFID-kort på kortleseren
3. Systemet:
   - Identifiserer eleven via kortet
   - Sjekker om kortet er aktivt
   - Verifiserer at eleven har nok poeng
   - Gjennomfører kjøpet eller avviser
4. Feedback vises umiddelbart på skjermen

**Sikkerhet:**
- ❌ Blokkerte kort avvises automatisk
- ❌ Uregistrerte kort avvises
- ❌ Kjøp avvises ved utilstrekkelig saldo
- ✅ Alle transaksjoner logges med kortID

### 3. Transaksjonslogg
Alle NFC-kjøp logges med:
- Tidspunkt
- Elev
- Produkt
- Beløp
- Betalingsmetode (`nfc`)
- Kort-ID

Dette gjør det mulig å:
- Spore kortbruk
- Reversere feilaktige kjøp
- Se handelshistorikk per elev eller kort

## Teknisk implementasjon

### Database (Dexie v31)
Ny tabell: `rfidCards`
```typescript
{
  id: number (auto-increment),
  cardId: string (unique),
  studentId: string,
  status: 'active' | 'blocked',
  createdAt: Date,
  lastUsed?: Date
}
```

Utvidet `Transaction` type:
```typescript
{
  ...existing fields,
  paymentMethod?: 'manual' | 'nfc',
  cardId?: string
}
```

### NFC Reader Utility (`lib/nfcReader.ts`)
Støtter flere metoder for kortlesing:
1. **Web NFC API** - For Android Chrome (mobil)
2. **WebHID API** - For PC/SC lesere via USB
3. **Fallback** - Manuell input for testing/utvikling

Hovedfunksjoner:
- `connectReader()` - Koble til kortleser
- `readCard()` - Les kort-UID
- `writeCard()` - Skriv data til kort (fremtidig)
- `listenForCards()` - Kontinuerlig lytting
- `formatCardUID()` - Formater UID for visning
- `isValidCardUID()` - Valider UID-format

### React Hook (`hooks/useNFCReader.ts`)
Enkel React-integrasjon:
```typescript
const nfc = useCardScanner();

// Skann kort
const card = await nfc.scanCard();

// Status
nfc.status; // 'disconnected' | 'connecting' | 'connected' | 'reading' | 'error'
nfc.isSupported; // true/false
nfc.error; // Feilmelding
```

## Kompatibilitet

### Støttede nettlesere:
- ✅ Chrome/Edge på Windows (via WebHID)
- ✅ Chrome på Android (via Web NFC)
- ⚠️ Firefox - begrenset støtte
- ❌ Safari - ingen NFC-støtte ennå

### Anbefalt oppsett:
- **Kortleser**: ACS ACR1255U-J1 (USB eller Bluetooth)
- **Nettleser**: Chrome eller Edge (desktop)
- **Kort**: ISO 14443A RFID-kort (MIFARE, NTAG, etc.)

## Fremtidig utvikling

### Planlagt funksjonalitet:
- 🔄 Bluetooth-støtte for kortleser
- 🔄 NFC-basert innskudd/uttak av poeng
- 🔄 Integrasjon med "ladet iPad"-funksjon
- 🔄 Bulk-registrering av kort (CSV import)
- 🔄 Rapport over kortbruk per elev
- 🔄 Automatisk blokkering ved mistenkelig aktivitet

### For "Ladet iPad"-integrasjon:
Når dette implementeres:
1. Elev tæpper kort på leseren
2. System registrerer at iPad er ladet (på daglig sjekk)
3. Belønningspoeng gis automatisk
4. Elev får umiddelbar feedback

## Feilsøking

### Problem: Kortleser ikke funnet
**Løsning:**
1. Sjekk at kortleseren er koblet til via USB
2. Bruk Chrome eller Edge nettleser
3. Gi nettleseren tillatelse til å bruke HID-enheter
4. Prøv å refresh siden

### Problem: "NFC ikke støttet"
**Løsning:**
1. Bruk Chrome/Edge på Windows/Android
2. Ikke Safari eller Firefox (begrenset støtte)
3. Alternativt: Bruk manuell input av kort-ID

### Problem: Kort ikke lest
**Løsning:**
1. Hold kortet nær kortleseren i 1-2 sekunder
2. Sjekk at kortet er et ISO 14443A RFID-kort
3. Prøv å restarte kortleseren
4. Sjekk at kortleseren har strøm (lyser)

### Problem: "Kort ikke registrert"
**Løsning:**
1. Gå til `/settings/rfid-cards`
2. Registrer kortet først
3. Knytt det til en elev

## Sikkerhet og personvern

### GDPR-hensyn:
- ✅ Kort-UID lagres kun lokalt (Dexie/IndexedDB)
- ✅ Ingen persondata sendes over nettverk
- ✅ Kort kan slettes fra systemet når som helst
- ✅ Transaksjonslogg kan tømmes

### Anbefalinger:
- 🔒 Ikke del kort mellom elever
- 🔒 Blokker kort umiddelbart ved tap
- 🔒 Tøm gamle kort fra systemet ved årsskifte
- 🔒 Informer foresatte om kortbruk i klassen

## Oppsett - Komme i gang

### Trinn 1: Registrer kort
1. Gå til **Innstillinger → RFID-kort**
2. Klikk **Registrer nytt kort**
3. Tæpp kortet på kortleseren ELLER skriv inn kort-ID manuelt
4. Velg elev fra dropdown
5. Klikk **Registrer kort**

### Trinn 2: Test POS
1. Gå til **Belønningsbutikk → POS**
2. Velg en belønning
3. Klikk **Tæpp kort for å betale**
4. Tæpp kortet
5. Verifiser at kjøpet gjennomføres

### Trinn 3: Sjekk transaksjonslogg
1. Gå til **Dashbord** eller **Elevoversikt**
2. Se transaksjoner med NFC-badge
3. Verifiser at kortID er logget

## Support

For tekniske problemer eller spørsmål:
- Sjekk denne dokumentasjonen først
- Sjekk konsollen i nettleseren (F12) for feilmeldinger
- Kontakt utvikler med:
  - Nettleser og versjon
  - Kortleser modell
  - Feilmelding fra konsollen
  - Skjermbilder av problemet

---

**Versjon:** 1.0  
**Sist oppdatert:** 2025-10-20  
**Kompatibel med:** Klasseflyt v3.1+
