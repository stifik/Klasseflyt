# 🔊 Lydfiler for NFC-transaksjoner

Systemet trenger to lydfiler for å gi audio-feedback ved NFC-transaksjoner:
- `success.mp3` - Spilles ved vellykket kjøp ✅
- `error.mp3` - Spilles ved feil (ikke nok poeng, blokkert kort) ❌

---

## ⚡ Raskeste metode: Mixkit (gratis, ingen registrering)

### 1. Success Sound

**Anbefalt lyd:** "Notification bell alert"

1. Gå til: https://mixkit.co/free-sound-effects/notification/
2. Finn "Notification bell alert" eller "Prize winning"  
   *(Scroll nedover - det er en kort, positiv "ding" lyd)*
3. Klikk **Free Download** knappen
4. Omdøp filen til `success.mp3`
5. Flytt til: `public/sounds/success.mp3` i Klasseflyt-prosjektet

**Direkte link:**  
https://mixkit.co/free-sound-effects/notification/

---

### 2. Error Sound

**Anbefalt lyd:** "System error buzzer"

1. Gå til: https://mixkit.co/free-sound-effects/fail/
2. Finn "Wrong answer fail" eller "System error buzzer"  
   *(Kort "buzz" eller "beep" lyd)*
3. Klikk **Free Download** knappen
4. Omdøp filen til `error.mp3`
5. Flytt til: `public/sounds/error.mp3`

**Direkte link:**  
https://mixkit.co/free-sound-effects/fail/

---

## 📁 Plassering av filer

Lag mappen hvis den ikke finnes:
```bash
mkdir public\sounds
```

Legg lydfilene her:
```
Klasseflyt/
  public/
    sounds/
      success.mp3  ← Positiv lyd (ding, chime)
      error.mp3    ← Negativ lyd (buzz, beep)
```

---

## ✅ Test at det fungerer

### Test i nettleser

1. Start Klasseflyt: `npm run dev`
2. Åpne: http://localhost:3000/sounds/success.mp3  
   → Du skal høre en positiv lyd
3. Åpne: http://localhost:3000/sounds/error.mp3  
   → Du skal høre en negativ lyd

### Test i Developer Console

1. Åpne Developer Console (F12)
2. Test success-lyd:
   ```javascript
   new Audio('/sounds/success.mp3').play()
   ```
3. Test error-lyd:
   ```javascript
   new Audio('/sounds/error.mp3').play()
   ```

### Test i NFC-flow

1. Gå til **Terminal → Butikk**
2. Velg en belønning
3. Tæpp et kort med nok poeng → `success.mp3` skal spille ✅
4. Tæpp et blokkert kort → `error.mp3` skal spille ❌

---

## 🎨 Alternative kilder

### Freesound.org (krever gratis konto)

1. Gå til: https://freesound.org/
2. Registrer gratis konto
3. Søk etter:
   - **Success**: "success chime", "positive beep", "notification"
   - **Error**: "error beep", "buzzer", "wrong"
4. Last ned MP3-filer
5. Omdøp og legg i `public/sounds/`

**Fordel:** Stort bibliotek, høy kvalitet  
**Ulempe:** Krever registrering

---

### ZapSplat (krever gratis konto)

1. Gå til: https://www.zapsplat.com/
2. Registrer gratis konto
3. Gå til kategorier:
   - **Success**: "UI" → "Positive"
   - **Error**: "UI" → "Negative"
4. Last ned MP3-format
5. Omdøp og legg i `public/sounds/`

**Fordel:** Kategorisert, lett å finne  
**Ulempe:** Krever registrering

---

## 🛠️ Lag egne lyder med Audacity (gratis)

### Installer Audacity

Last ned fra: https://www.audacityteam.org/

### Lag success-lyd

1. Åpne Audacity
2. **Generate → Tone**
   - Waveform: `Sine`
   - Frequency: `800 Hz`
   - Amplitude: `0.8`
   - Duration: `0.2 seconds`
3. **Effect → Fade Out** (siste 0.1 sek)
4. **File → Export → Export as MP3**
5. Navn: `success.mp3`

### Lag error-lyd

1. **Generate → Tone**
   - Waveform: `Square`
   - Frequency: `200 Hz`
   - Amplitude: `0.6`
   - Duration: `0.3 seconds`
2. **Effect → Repeat** (2 ganger for dobbel beep)
3. **File → Export → Export as MP3**
4. Navn: `error.mp3`

---

## 🐛 Feilsøking

### Ingen lyd spilles i appen

**Sjekkliste:**
- [ ] Lydfiler finnes i `public/sounds/` mappen
- [ ] Filnavn er nøyaktig `success.mp3` og `error.mp3` (små bokstaver)
- [ ] Nettleser er ikke muted
- [ ] Lydtest i console fungerer: `new Audio('/sounds/success.mp3').play()`
- [ ] Sjekk console (F12) for feilmeldinger

### Feil filformat

Systemet krever **MP3**-format. Hvis du har andre formater:

**Konverter til MP3:**
1. Åpne Audacity
2. **File → Open** (velg lydfil)
3. **File → Export → Export as MP3**
4. Lagre som `success.mp3` eller `error.mp3`

### Lyd spiller i nettleser, men ikke i appen

**Debugging:**
1. Åpne Developer Console (F12) under testing
2. Se etter feilmeldinger når transaksjon fullføres
3. Test manuelt:
   ```javascript
   const audio = new Audio('/sounds/success.mp3');
   audio.play().then(() => console.log('✅ Lyd spilte'))
     .catch(err => console.error('❌ Lydfeil:', err));
   ```

---

## 📋 Rask sjekkliste

- [ ] `success.mp3` lastet ned fra Mixkit
- [ ] `error.mp3` lastet ned fra Mixkit
- [ ] Begge filer ligger i `public/sounds/` mappen
- [ ] Test i nettleser: http://localhost:3000/sounds/success.mp3
- [ ] Test i console: `new Audio('/sounds/success.mp3').play()`
- [ ] Test i NFC-flow: Tæpp kort og hør success-lyd
- [ ] Test error-lyd: Tæpp blokkert kort og hør error-lyd

---

## 💡 Tips for beste lydopplevelse

### Volum
- Ikke for høy (kan skremme elever)
- Ikke for lav (må høres i klasserom)
- Test i faktisk klasseromsmiljø

### Lengde
- **Success**: 0.2-0.5 sekunder (kort og positiv)
- **Error**: 0.3-0.6 sekunder (litt lengre, tydelig)

### Type
- **Success**: Høy frekvens (pleasant, "ding")
- **Error**: Lav frekvens (attention-grabbing, "buzz")

---

## 🎯 Anbefalte lydfiler

### Mine favoritter fra Mixkit:

**Success:**
- "Notification bell alert" - kort, positiv ding
- "Prize winning" - litt lenger, mer "celebration"
- "Positive notification" - moderne, clean

**Error:**
- "System error buzzer" - klassisk error-buzz
- "Wrong answer fail" - litt mer "game-like"
- "Negative notification" - subtil men tydelig

**Alle er gratis uten registrering!** 🎉

---

**Versjon:** 2.0  
**Sist oppdatert:** 22. oktober 2025  
**Kompatibel med:** Klasseflyt v3.1+
   - Frequency: 800 Hz
   - Amplitude: 0.8
   - Duration: 0.5 seconds
3. Effect → Fade Out (siste 0.2 sekunder)
4. File → Export → Export as MP3
5. Lagre som `success.mp3`

### Lag Error Sound
1. Åpne Audacity
2. Generate → Tone
   - Waveform: Square
   - Frequency: 200 Hz
   - Amplitude: 0.6
   - Duration: 0.3 seconds
3. File → Export → Export as MP3
4. Lagre som `error.mp3`

## Bruk Online Generator (ingen programvare nødvendig)

### SFXR.me
1. Gå til: https://sfxr.me/
2. For success-lyd:
   - Klikk **Pickup/Coin**
   - Juster til du liker lyden
   - Klikk **Export WAV**
   - Konverter til MP3 (se under)
3. For error-lyd:
   - Klikk **Hit/Hurt**
   - Juster parametere
   - Export og konverter

### Konverter WAV til MP3 (hvis nødvendig)
Bruk: https://cloudconvert.com/wav-to-mp3
1. Last opp WAV-filen
2. Klikk **Convert**
3. Last ned MP3-filen
4. Omdøp og legg i `public/sounds/`

## Anbefalte Karakteristikker

### Success Sound
- **Varighet**: 0.5-1 sekund
- **Tone**: Oppadstigende, positiv (f.eks. to-tone chime)
- **Volum**: Moderat (ikke for høyt)
- **Frekvens**: 600-1000 Hz

### Error Sound
- **Varighet**: 0.3-0.5 sekunder
- **Tone**: Kort, varsom alert (ikke skremmende)
- **Volum**: Litt lavere enn success
- **Frekvens**: 150-300 Hz

## Verifiser at lydene fungerer

### Test i nettleseren
1. Åpne applikasjonen
2. Åpne Developer Console (F12)
3. Kjør disse kommandoene:

```javascript
// Test success sound
new Audio('/sounds/success.mp3').play()

// Test error sound
new Audio('/sounds/error.mp3').play()
```

**Hører du lyd?** ✅ Ferdig!  
**Ingen lyd?** ⚠️ Sjekk at filene ligger i `public/sounds/` og heter eksakt `success.mp3` og `error.mp3`

## Viktige Notater

1. **Filnavn må være eksakt**: `success.mp3` og `error.mp3` (små bokstaver)
2. **Format**: MP3 (ikke WAV, OGG eller andre formater)
3. **Plassering**: `public/sounds/` mappen
4. **Størrelse**: Ideelt under 100 KB per fil
5. **Nettleser**: Lydavspilling kan blokkeres av nettleseren første gang - brukeren må klikke "Tillat"

## Slå av lyd (valgfritt)

Hvis du ikke vil ha lydsignaler:
1. Åpne Developer Console (F12)
2. Kjør: `localStorage.setItem('nfc_sound_enabled', 'false')`
3. Refresh siden

For å slå på igjen:
```javascript
localStorage.setItem('nfc_sound_enabled', 'true')
```

---

**Trenger hjelp?** Se full dokumentasjon i `NFC_QUICKSTART.md` og `NFC_DEBOUNCING_TEST_GUIDE.md`
