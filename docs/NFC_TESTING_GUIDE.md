# 🧪 NFC Testing Guide

Omfattende test-guide for NFC/RFID-funksjonalitet i Klasseflyt.

---

## 📋 Hva skal testes?

### Implementert funksjonalitet
- ✅ **Debouncing** - 3 sekunders cooldown mellom scans av samme kort
- ✅ **Processing lock** - Kun én transaksjon om gangen
- ✅ **Visuell feedback** - Processing og success overlays
- ✅ **Lydsignaler** - Success og error-lyder
- ✅ **Error handling** - Ikke nok poeng, blokkert kort, ukjent kort
- ✅ **Kø-funksjonalitet** - Flere elever etter hverandre

---

## 🚀 Før du starter testing

### Forberedelser
1. **NFC Bridge Server må kjøre**
   ```bash
   cd nfc-bridge
   npm start
   ```

2. **Klasseflyt-app må kjøre**
   ```bash
   npm run dev
   ```

3. **Registrer testkort**
   - Gå til **Innstillinger → RFID-kort**
   - Registrer 3-5 kort til forskjellige elever
   - Blokker ett kort (for testing)

4. **Gi elever poeng**
   - Minst én elev med `>100 poeng` (success-testing)
   - Minst én elev med `<10 poeng` (error-testing)

5. **Opprett belønninger**
   - Billig belønning (10 poeng)
   - Dyr belønning (50 poeng)

6. **Last ned lydfiler** *(anbefalt)*
   - Se [`SOUND_FILES_GUIDE.md`](./SOUND_FILES_GUIDE.md)
   - Plasser `success.mp3` og `error.mp3` i `public/sounds/`

---

## 🧪 Testscenarier

### ✅ Scenario 1: Normal flyt

**Formål:** Verifisere at basic NFC-kjøp fungerer

**Steg:**
1. Gå til **Terminal → Butikk**
2. Velg en belønning (student har nok poeng)
3. Klikk **Tæpp NFC-kort**
4. Tæpp kortet på leseren
5. Vent på tilbakemelding

**Forventet resultat:**
- ✅ "Processing..." overlay vises (med spinner)
- ✅ Grønn "Kjøp vellykket!" overlay vises i 2 sekunder
- ✅ Success-lyd spilles 🔊
- ✅ Status oppdateres til "Klar for neste kort..."
- ✅ Poeng trekkes fra eleven
- ✅ Transaksjon logges med `paymentMethod: 'nfc'` og `cardId`

**Console output:**
```
📖 Reading NFC card...
✅ Card read via Bridge: 04:A1:B2:C3
✅ Transaksjon fullført for [Student]
🔊 Sound enabled
```

---

### 🔁 Scenario 2: Kort blir liggende på leseren

**Formål:** Teste at debouncing forhindrer duplikat-transaksjoner

**Steg:**
1. Gjennomfør en transaksjon (Scenario 1)
2. **IKKE** fjern kortet fra leseren
3. Vent på at success overlay forsvinner (2 sek)
4. Vent i 5 sekunder mens kortet ligger på leseren

**Forventet resultat:**
- ✅ Første transaksjon fullføres normalt
- ✅ Kortet ignoreres i 3 sekunder (cooldown)
- ✅ Console viser: `🚫 Cooldown aktiv - ignorerer lesning (Xs gjenstår)`
- ✅ **INGEN** ny transaksjon startes
- ✅ Eleven trekkes kun poeng **én gang**

**Console output:**
```
📖 Reading NFC card...
🚫 Cooldown aktiv - ignorerer lesning (3s gjenstår)
🚫 Cooldown aktiv - ignorerer lesning (2s gjenstår)
🚫 Cooldown aktiv - ignorerer lesning (1s gjenstår)
```

---

### ⚡ Scenario 3: Fjern og legg på igjen raskt (< 3 sek)

**Formål:** Teste at cooldown fungerer selv når kort fjernes

**Steg:**
1. Gjennomfør en transaksjon
2. Fjern kortet fra leseren
3. Tell til 1
4. Legg kortet på igjen

**Forventet resultat:**
- ✅ Kortet ignoreres (cooldown fortsatt aktiv)
- ✅ Console viser cooldown-melding
- ✅ **Ingen** ny transaksjon

---

### ⏰ Scenario 4: Fjern og legg på igjen sent (> 3 sek)

**Formål:** Teste at samme kort kan brukes igjen etter cooldown

**Steg:**
1. Gjennomfør en transaksjon
2. Fjern kortet fra leseren
3. Tell til 4 (eller vent til cooldown-meldinger slutter)
4. Legg kortet på igjen

**Forventet resultat:**
- ✅ **Ny** transaksjon behandles normalt
- ✅ Processing → Success overlay
- ✅ Success-lyd spilles
- ✅ Poeng trekkes (for andre belønning)

---

### 💰 Scenario 5: Ikke nok poeng

**Formål:** Teste error handling ved utilstrekkelig saldo

**Forberedelser:**
- Velg en elev med `<10 poeng`
- Velg en belønning som koster `>10 poeng`

**Steg:**
1. Velg dyr belønning (50 poeng)
2. Klikk **Tæpp NFC-kort**
3. Tæpp kort tilhørende eleven med lav saldo

**Forventet resultat:**
- ✅ Error-lyd spilles 🔊
- ✅ Rød error-status vises
- ✅ Melding: "[Navn] har kun [X] poeng, men [Belønning] koster [Y] poeng"
- ✅ Ingen transaksjon logges
- ✅ Ingen poeng trekkes
- ✅ Etter 4 sekunder: tilbake til "Venter på kort..."

**Console output:**
```
❌ Ikke nok poeng
```

---

### 🚫 Scenario 6: Blokkert kort

**Formål:** Teste at blokkerte kort avvises

**Forberedelser:**
1. Gå til **Innstillinger → RFID-kort**
2. Blokker et kort (klikk på kort → **Blokker kort**)

**Steg:**
1. Velg en belønning
2. Klikk **Tæpp NFC-kort**
3. Tæpp det blokkerte kortet

**Forventet resultat:**
- ✅ Error-lyd spilles 🔊
- ✅ Rød error-status
- ✅ Melding: "Dette kortet er blokkert. Kontakt lærer."
- ✅ Ingen transaksjon logges
- ✅ Etter 3 sekunder: tilbake til "Venter på kort..."

**Console output:**
```
❌ Dette kortet er blokkert
```

---

### ❓ Scenario 7: Ukjent kort

**Formål:** Teste at uregistrerte kort avvises

**Steg:**
1. Velg en belønning
2. Klikk **Tæpp NFC-kort**
3. Tæpp et kort som **ikke** er registrert i systemet

**Forventet resultat:**
- ✅ Error-lyd spilles 🔊
- ✅ Rød error-status
- ✅ Melding: "Kort XX:XX:XX:XX er ikke registrert."
- ✅ Ingen transaksjon logges
- ✅ Etter 3 sekunder: tilbake til "Venter på kort..."

**Console output:**
```
❌ Kort 04:XX:YY:ZZ er ikke registrert
```

---

### 👥 Scenario 8: Kø-funksjonalitet (multiple students)

**Formål:** Teste at systemet håndterer kø av elever

**Forberedelser:**
- 4 forskjellige elever med registrerte kort
- Alle har nok poeng

**Steg:**
1. Velg en belønning
2. Klikk **Tæpp NFC-kort** **én gang**
3. La Elev 1 tæppe kortet sitt
4. Vent til success overlay forsvinner (~2 sek)
5. La Elev 2 tæppe kortet sitt
6. Vent til success overlay forsvinner
7. Gjenta for Elev 3 og 4

**Forventet resultat:**
- ✅ **Elev 1**: Transaksjon fullføres, success overlay, lyd
- ✅ **Pause** (success overlay 2 sek)
- ✅ **Elev 2**: Transaksjon fullføres, success overlay, lyd
- ✅ **Pause**
- ✅ **Elev 3**: Transaksjon fullføres, success overlay, lyd
- ✅ **Pause**
- ✅ **Elev 4**: Transaksjon fullføres, success overlay, lyd
- ✅ **Ingen** duplikat-transaksjoner
- ✅ Alle 4 elever får poeng trukket **én gang**

**Viktig:** Hvis elev tæpper mens processing overlay vises, vil kortet ignoreres (processing lock). Dette er forventet oppførsel.

---

### ❌ Scenario 9: Avbryt scanning

**Formål:** Teste at avbryt-funksjonalitet fungerer

**Steg:**
1. Velg en belønning
2. Klikk **Tæpp NFC-kort**
3. **IKKE** tæpp kort ennå
4. Klikk **Avbryt**

**Forventet resultat:**
- ✅ NFC-scanning stopper
- ✅ Tilbake til butikk-visning
- ✅ Ingen kort aksepteres lenger
- ✅ Må klikke **Tæpp NFC-kort** på nytt for å aktivere scanning

---

### 🔄 Scenario 10: Manuell betaling etter NFC-feil

**Formål:** Teste at manuell fallback fungerer

**Steg:**
1. Prøv NFC-betaling med blokkert kort (får error)
2. Se error-melding
3. Klikk **Velg manuelt**
4. Velg samme elev fra dropdown
5. Klikk **OK**

**Forventet resultat:**
- ✅ Manuell betaling fungerer
- ✅ Success-lyd spilles (hvis implementert for manuell også)
- ✅ Transaksjon fullføres
- ✅ Poeng trekkes
- ✅ Transaksjon logges med `paymentMethod: 'manual'`

---

## 🔊 Lydtesting

### Test success-lyd direkte

1. Åpne Developer Console (F12)
2. Kjør kommando:
   ```javascript
   new Audio('/sounds/success.mp3').play()
   ```
3. Du skal høre en positiv lyd (chime, ding, etc.)

### Test error-lyd direkte

1. Åpne Developer Console (F12)
2. Kjør kommando:
   ```javascript
   new Audio('/sounds/error.mp3').play()
   ```
3. Du skal høre en negativ lyd (buzz, beep, etc.)

### Hvis ingen lyd høres

**Troubleshooting:**
1. Sjekk at lydfiler eksisterer:
   - Gå til `public/sounds/success.mp3`
   - Gå til `public/sounds/error.mp3`
2. Last ned lydfiler (se [`SOUND_FILES_GUIDE.md`](./SOUND_FILES_GUIDE.md))
3. Test direkte i nettleser:
   - http://localhost:3000/sounds/success.mp3
   - http://localhost:3000/sounds/error.mp3
4. Sjekk nettleserens lydinnstillinger (ikke muted)
5. Sjekk console for feilmeldinger

---

## 🎨 Visuell Feedback Testing

### Processing Overlay
- **Når vises:** Under transaksjonsprosessering
- **Utseende:** Blå/grå overlay med spinner-ikon
- **Tekst:** "Prosesserer..." eller "Ikke fjern kortet"
- **Varighet:** Til transaksjon er ferdig (~1-2 sekunder)

### Success Overlay
- **Når vises:** Ved vellykket transaksjon
- **Utseende:** Grønn fullskjerm overlay
- **Ikon:** Stort sjekkmerke med bounce-animasjon ✓
- **Tekst:** "Kjøp vellykket! Du kan fjerne kortet nå"
- **Varighet:** 2 sekunder (auto-dismiss)

### Status Alerts
- **Blå**: "Venter på kort..." / "Prosesserer..."
- **Grønn**: "Kjøp vellykket!"
- **Rød**: "Feil: [melding]" (ikke nok poeng, blokkert, ukjent)

---

## 🐛 Feilsøking

### Problem: Duplikat-transaksjoner

**Diagnose:**
- Sjekk console for cooldown-meldinger
- Hvis ingen cooldown-meldinger: bug i debouncing-logikk

**Løsning:**
- Verifiser at `DEBOUNCE_MS = 3000` i koden
- Sjekk at `lastScannedCard` state oppdateres
- Se implementering i `Terminal.tsx`

---

### Problem: Ingen lyd

**Diagnose:**
- Lydfiler mangler i `public/sounds/`
- Nettleser blokkerer audio
- Feil filformat

**Løsning:**
1. Last ned lydfiler (se [`SOUND_FILES_GUIDE.md`](./SOUND_FILES_GUIDE.md))
2. Sjekk console for audio-feil
3. Test manuelt: `new Audio('/sounds/success.mp3').play()`
4. Verifiser filformat er MP3

---

### Problem: Processing overlay forsvinner ikke

**Diagnose:**
- JavaScript-feil midtveis i transaksjon
- State ikke oppdatert korrekt

**Løsning:**
1. Refresh siden
2. Sjekk console for feilmeldinger
3. Verifiser at `setNFCProcessing(false)` kalles

---

### Problem: Success overlay vises ikke

**Diagnose:**
- State `showSuccessOverlay` ikke oppdatert
- Transaksjon feiler uten error-melding

**Løsning:**
1. Sjekk console - ble transaksjonen fullført?
2. Verifiser at `setShowSuccessOverlay(true)` kalles
3. Sjekk timing (vises kun i 2 sekunder)

---

### Problem: Kort ikke lest av bridge

**Diagnose:**
- Bridge server ikke kjører
- Kortleser ikke tilkoblet
- Feil korttype

**Løsning:**
1. Sjekk at bridge server kjører (vindu 1)
2. Test: http://localhost:3001/health → `{"status":"ok"}`
3. Sjekk Device Manager (Smart card readers)
4. Test med et annet kort (ISO 14443A RFID)
5. Hold kortet nærmere leseren (1-2 sekunder)

---

## 📊 Console Output Reference

### Normal flow
```
📡 About to call nfc.scan() - status is: connected
🔍 scan() called - current status: connected
✅ Status OK, proceeding with scan
📡 Calling readCard()...
📡 Fetching from bridge /api/scan...
📡 Bridge response status: 200 OK
✅ Card read via Bridge: 04:A1:B2:C3:D4:E5:F6:07
📡 readCard() returned: {uid: '04:A1:B2:C3:D4:E5:F6:07', type: 'RFID/PC-SC'}
✅ Card detected in Terminal: 04:A1:B2:C3:D4:E5:F6:07
🔵 handleNFCCard called with UID: 04:A1:B2:C3:D4:E5:F6:07
🔍 Looking for card: 04:A1:B2:C3:D4:E5:F6:07
✅ Transaksjon fullført for [Student]
🔊 Sound enabled
```

### Debouncing aktiv
```
📖 Reading NFC card...
🚫 Cooldown aktiv - ignorerer lesning (3s gjenstår)
🚫 Cooldown aktiv - ignorerer lesning (2s gjenstår)
🚫 Cooldown aktiv - ignorerer lesning (1s gjenstår)
```

### Processing lock
```
⏳ Transaksjon pågår - ignorerer ny lesning
```

### Error scenarios
```
❌ Kort 04:XX:YY:ZZ er ikke registrert
❌ Dette kortet er blokkert. Kontakt lærer.
❌ [Navn] har kun [X] poeng, men [Belønning] koster [Y] poeng
```

---

## ✅ Testing Checklist

### Grunnleggende funksjonalitet
- [ ] Normal NFC-betaling fullføres
- [ ] Poeng trekkes korrekt
- [ ] Transaksjon logges med `paymentMethod: 'nfc'`
- [ ] Kort-ID lagres i transaksjon

### Debouncing
- [ ] Kort liggende på leser → ingen duplikat
- [ ] Fjern/legg raskt (< 3s) → ignoreres
- [ ] Fjern/legg sent (> 3s) → ny transaksjon OK

### Error handling
- [ ] Ikke nok poeng → error-lyd + melding
- [ ] Blokkert kort → error-lyd + melding
- [ ] Ukjent kort → error-lyd + melding

### Kø-funksjonalitet
- [ ] 4 elever etter hverandre → alle får 1 transaksjon
- [ ] Ingen duplikater
- [ ] Success feedback for hver elev

### Visuell feedback
- [ ] Processing overlay vises
- [ ] Success overlay vises (2 sek)
- [ ] Status alerts oppdateres korrekt
- [ ] Animasjoner fungerer smooth

### Lydfeedback
- [ ] Success-lyd spilles ved vellykket kjøp
- [ ] Error-lyd spilles ved feil
- [ ] Lydfiler eksisterer og laster

### Avbryt/Fallback
- [ ] Avbryt-knapp stopper scanning
- [ ] Manuell betaling fungerer som fallback

---

## 🎯 Success Criteria

System er klar for produksjon når:

1. ✅ **Ingen duplikat-transaksjoner** registreres (selv ved gjentatt scanning)
2. ✅ **Success og error-lyder** fungerer konsekvent
3. ✅ **Overlays** vises og forsvinner korrekt
4. ✅ **Kø-funksjonalitet** håndterer 4+ elever smooth
5. ✅ **Error-handling** dekker alle edge cases
6. ✅ **Debouncing** fungerer som forventet (3s cooldown)
7. ✅ **Console output** er ren (ingen uventede errors)
8. ✅ **Transaksjonslogg** er korrekt (riktig beløp, cardId, paymentMethod)

**Når alle 10 scenarier + lydfesting + visuell testing er godkjent:**

🎉 **READY FOR PRODUCTION** 🎉

---

## 📚 Se også

- **[NFC_GETTING_STARTED.md](./NFC_GETTING_STARTED.md)** - Oppsett og kom i gang
- **[NFC_RFID_GUIDE.md](./NFC_RFID_GUIDE.md)** - Funksjonalitetsoversikt
- **[SOUND_FILES_GUIDE.md](./SOUND_FILES_GUIDE.md)** - Hvordan laste ned lyder
- **[NFC_TRANSACTION_FLOW_VISUAL.md](./NFC_TRANSACTION_FLOW_VISUAL.md)** - Visuelle diagrammer
- **[NFC_DEBOUNCING_IMPLEMENTATION_SUMMARY.md](./NFC_DEBOUNCING_IMPLEMENTATION_SUMMARY.md)** - Tekniske detaljer

**Versjon:** 2.0  
**Sist oppdatert:** 22. oktober 2025  
**Kompatibel med:** Klasseflyt v3.1+
