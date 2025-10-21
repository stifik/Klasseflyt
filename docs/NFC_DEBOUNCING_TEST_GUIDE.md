# NFC Debouncing Test Guide

## ✅ Implementert funksjonalitet

### 1. Debouncing (3 sekunder cooldown)
- Samme kort kan ikke brukes innen 3 sekunder
- Forhindrer duplikat-transaksjoner hvis kortet ligger på leseren

### 2. Processing Lock
- Kun én transaksjon kan prosesseres om gangen
- Nye kort ignoreres mens en transaksjon pågår

### 3. Visuell Feedback
- **Processing Overlay**: Vises mens transaksjonen behandles
- **Success Overlay**: Grønn fullskjerm med sjekkmerke (2 sekunder)
- **Status Alerts**: Live status i transaksjonsdialogen

### 4. Lydsignaler
- **Success**: Spilles ved vellykket kjøp
- **Error**: Spilles ved feil (ikke nok poeng, blokkert kort, ukjent kort)

## 🧪 Testscenarioer

### Scenario 1: Normal flyt
**Steg:**
1. Gå til Terminal → Butikk
2. Velg en belønning
3. Klikk **Tæpp NFC-kort**
4. Tæpp kortet på leseren

**Forventet resultat:**
- ✅ "Processing..." overlay vises
- ✅ Grønt "Kjøp vellykket!" overlay vises i 2 sekunder
- ✅ Success-lyd spilles
- ✅ Status oppdateres til "Klar for neste kort..."

---

### Scenario 2: Kort blir liggende på leseren
**Steg:**
1. Gjennomfør en transaksjon (Scenario 1)
2. **IKKE** fjern kortet fra leseren
3. Vent på at success overlay forsvinner

**Forventet resultat:**
- ✅ Første transaksjon fullføres
- ✅ Kortet ignoreres i 3 sekunder (cooldown)
- ✅ Console viser: "🚫 Cooldown aktiv - ignorerer lesning (Xs gjenstår)"
- ✅ INGEN ny transaksjon startes

---

### Scenario 3: Fjern og legg på igjen raskt (< 3 sek)
**Steg:**
1. Gjennomfør en transaksjon
2. Fjern kortet
3. Vent 1 sekund
4. Legg kortet på igjen

**Forventet resultat:**
- ✅ Kortet ignoreres
- ✅ Console viser cooldown-melding
- ✅ Ingen ny transaksjon

---

### Scenario 4: Fjern og legg på igjen sent (> 3 sek)
**Steg:**
1. Gjennomfør en transaksjon
2. Fjern kortet
3. Vent 4 sekunder
4. Legg kortet på igjen

**Forventet resultat:**
- ✅ Ny transaksjon behandles normalt
- ✅ Processing → Success overlay
- ✅ Success-lyd spilles

---

### Scenario 5: Ikke nok poeng (error-lyd)
**Steg:**
1. Velg en belønning som koster mer enn eleven har poeng
2. Klikk **Tæpp NFC-kort**
3. Tæpp kortet

**Forventet resultat:**
- ✅ Error-lyd spilles
- ✅ Rød error-status vises
- ✅ Melding: "X har kun Y poeng, men Z koster W poeng"
- ✅ Etter 4 sekunder: tilbake til "Venter på kort..."

---

### Scenario 6: Blokkert kort (error-lyd)
**Steg:**
1. Gå til Innstillinger → RFID-kort
2. Blokker et kort
3. Prøv å bruke det blokkerte kortet i butikken

**Forventet resultat:**
- ✅ Error-lyd spilles
- ✅ Rød error-status
- ✅ Melding: "Dette kortet er blokkert. Kontakt lærer."
- ✅ Etter 3 sekunder: tilbake til "Venter på kort..."

---

### Scenario 7: Ukjent kort (error-lyd)
**Steg:**
1. Tæpp et kort som ikke er registrert i systemet

**Forventet resultat:**
- ✅ Error-lyd spilles
- ✅ Rød error-status
- ✅ Melding: "Kort XX:XX:XX:XX er ikke registrert."
- ✅ Etter 3 sekunder: tilbake til "Venter på kort..."

---

### Scenario 8: Kø-funksjonalitet (multiple students)
**Steg:**
1. Velg en belønning
2. Klikk **Tæpp NFC-kort**
3. La 4 elever tæppe kortene sine etter hverandre
4. Vent til success overlay forsvinner mellom hver elev

**Forventet resultat:**
- ✅ Første elev: transaksjon fullføres
- ✅ Success overlay vises i 2 sekunder
- ✅ Andre elev (tæpper mens overlay vises): ignoreres (processing lock)
- ✅ Andre elev (tæpper etter overlay): transaksjon fullføres
- ✅ Samme mønster for elev 3 og 4
- ✅ Success-lyd spilles for hver vellykket transaksjon

---

### Scenario 9: Avbryt midt i scanning
**Steg:**
1. Velg en belønning
2. Klikk **Tæpp NFC-kort**
3. Klikk **Avbryt** før du tæpper kort

**Forventet resultat:**
- ✅ Transaksjon avbrytes
- ✅ Tilbake til butikk-visning
- ✅ Ingen kort aksepteres lenger

---

### Scenario 10: Manuell betaling etter NFC-feil
**Steg:**
1. Prøv NFC-betaling med blokkert kort
2. Se error-melding
3. Klikk **Velg manuelt**
4. Velg samme elev fra dropdown
5. Klikk **OK**

**Forventet resultat:**
- ✅ Manuell betaling fungerer
- ✅ Success-lyd spilles
- ✅ Transaksjon fullføres

---

## 🔊 Test lydfunksjonalitet

### Test success-lyd
1. Åpne Developer Console (F12)
2. Kjør: `new Audio('/sounds/success.mp3').play()`
3. Du skal høre en lyd

### Test error-lyd
1. Åpne Developer Console (F12)
2. Kjør: `new Audio('/sounds/error.mp3').play()`
3. Du skal høre en annen lyd

**Hvis ingen lyd:**
- Sjekk at `public/sounds/success.mp3` og `error.mp3` eksisterer
- Se `public/sounds/README.md` for hvordan laste ned lyder

---

## 🐛 Feilsøking

### Problem: Kort registreres flere ganger
**Løsning:**
- Sjekk console for cooldown-meldinger
- Verifiser at `DEBOUNCE_MS` er satt til 3000

### Problem: Ingen lyd
**Løsning:**
1. Sjekk at lydfiler eksisterer i `public/sounds/`
2. Åpne Developer Console for feilmeldinger
3. Test manuelt med: `soundEffects.play('success')`
4. Sjekk nettleserens lydinnstillinger

### Problem: Processing overlay forsvinner ikke
**Løsning:**
- Refresh siden
- Sjekk console for JavaScript-feil
- Verifiser at `setNFCProcessing(false)` kalles

### Problem: Success overlay vises ikke
**Løsning:**
- Sjekk at `showSuccessOverlay` state oppdateres
- Verifiser at transaksjonen faktisk lykkes (sjekk console)

---

## 📊 Console Output Forklaring

### Normal flow:
```
📖 Reading NFC card...
✅ Card read via Bridge: 04:A1:B2:C3
✅ Transaksjon fullført for Student
🔊 Sound enabled
```

### Cooldown aktiv:
```
📖 Reading NFC card...
🚫 Cooldown aktiv - ignorerer lesning (2s gjenstår)
```

### Processing lock:
```
⏳ Transaksjon pågår - ignorerer ny lesning
```

### Error scenarios:
```
❌ Kort XX:XX:XX:XX er ikke registrert
❌ Dette kortet er blokkert
❌ Ikke nok poeng
```

---

## ✅ Checklist for Fullstendig Testing

- [ ] Scenario 1: Normal flyt
- [ ] Scenario 2: Kort blir liggende
- [ ] Scenario 3: Fjern/legg raskt (< 3s)
- [ ] Scenario 4: Fjern/legg sent (> 3s)
- [ ] Scenario 5: Ikke nok poeng
- [ ] Scenario 6: Blokkert kort
- [ ] Scenario 7: Ukjent kort
- [ ] Scenario 8: Kø-funksjonalitet (4 elever)
- [ ] Scenario 9: Avbryt scanning
- [ ] Scenario 10: Manuell fallback
- [ ] Test success-lyd
- [ ] Test error-lyd
- [ ] Sjekk console output
- [ ] Verifiser transaksjonslogg

---

## 🎯 Success Criteria

System er klar for produksjon når:
1. ✅ Ingen duplikat-transaksjoner registreres
2. ✅ Success/error-lyder fungerer
3. ✅ Overlays vises korrekt
4. ✅ Kø-funksjonalitet fungerer smooth
5. ✅ Error-handling håndterer alle edge cases
6. ✅ Cooldown fungerer som forventet
7. ✅ Console output er ren (ingen uventede errors)

**Når alle 10 scenarier + lydtester er godkjent: 🎉 READY FOR PRODUCTION**
