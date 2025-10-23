# Sound Effects for NFC Transactions

## ⚠️ Missing Sound Files

This directory needs two sound files for NFC transaction feedback (MP3 or WAV):
- Prefer MP3 if possible: **success.mp3**, **error.mp3**
- WAV also works: **success.wav**, **error.wav**
  
Tip: If you downloaded WAV files by mistake, you can keep them as `.wav` (no need to convert).

### Multiple sounds per category (randomized)

You can add multiple sounds and one will be picked at random.

Supported naming patterns under `public/sounds/`:
- success.mp3 or success.wav
- success-1.mp3, success-2.mp3, ... success-10.mp3
- success-1.wav, success-2.wav, ... success-10.wav
- Same for `error.*`

The app will auto-detect which files exist and randomize playback.

## 📥 How to Add Sound Files

**See detailed guide:** `docs/SOUND_FILES_GUIDE.md`

### Quick Start (Mixkit - Free)

1. **Success sound:**
   - Go to: https://mixkit.co/free-sound-effects/success/
   - Download any pleasant chime/bell sound
   - Rename to `success.mp3` (or `success.wav`)
   - Place in this directory

2. **Error sound:**
   - Go to: https://mixkit.co/free-sound-effects/fail/
   - Download a short alert/buzzer sound
   - Rename to `error.mp3` (or `error.wav`)
   - Place in this directory

## ✅ Verify Installation

Open browser console (F12) and run (one of these should play depending on your file types):
```javascript
// MP3
new Audio('/sounds/success.mp3').play()
new Audio('/sounds/error.mp3').play()

// or WAV
new Audio('/sounds/success.wav').play()
new Audio('/sounds/error.wav').play()
```

If you hear sounds, you're ready! 🎉

---

**For detailed instructions, alternatives, and troubleshooting:**  
See `docs/SOUND_FILES_GUIDE.md`
