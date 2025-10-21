# 🔊 Hvordan laste ned lydfiler for NFC-transaksjoner

Systemet trenger to lydfiler for å gi audio-feedback ved NFC-transaksjoner:
- `success.mp3` - Spilles ved vellykket kjøp
- `error.mp3` - Spilles ved feil (ikke nok poeng, blokkert kort, etc.)

## Raskeste Metode: Last ned fra Mixkit (gratis)

### Success Sound
1. Gå til: https://mixkit.co/free-sound-effects/success/
2. Velg en lyd du liker (anbefalt: "Notification bell alert" eller "Prize winning")
3. Klikk **Download** (MP3 format)
4. Omdøp filen til `success.mp3`
5. Legg den i `public/sounds/` mappen

### Error Sound
1. Gå til: https://mixkit.co/free-sound-effects/fail/
2. Velg en lyd (anbefalt: "Wrong answer fail" eller "System error buzzer")
3. Klikk **Download** (MP3 format)
4. Omdøp filen til `error.mp3`
5. Legg den i `public/sounds/` mappen

## Alternative Kilder

### Freesound.org (krever gratis konto)
1. Gå til: https://freesound.org/
2. Registrer gratis konto
3. Søk etter "success chime" og "error beep"
4. Last ned MP3-filer
5. Omdøp og legg i `public/sounds/`

### ZapSplat (krever gratis konto)
1. Gå til: https://www.zapsplat.com/
2. Registrer gratis konto
3. Søk i kategoriene:
   - Success: "UI" → "Positive"
   - Error: "UI" → "Negative"
4. Last ned MP3-format
5. Omdøp og legg i `public/sounds/`

## Lag egne lyder med Audacity (gratis software)

### Installer Audacity
1. Last ned fra: https://www.audacityteam.org/
2. Installer programmet

### Lag Success Sound
1. Åpne Audacity
2. Generate → Tone
   - Waveform: Sine
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
