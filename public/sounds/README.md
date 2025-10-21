# Sound Effects for NFC Transactions

## ⚠️ Missing Sound Files

This directory needs two MP3 files for NFC transaction feedback:
- **success.mp3** - Played on successful purchase
- **error.mp3** - Played on errors (insufficient points, blocked card, etc.)

## 📥 How to Add Sound Files

**See detailed guide:** `docs/SOUND_FILES_GUIDE.md`

### Quick Start (Mixkit - Free)

1. **Success sound:**
   - Go to: https://mixkit.co/free-sound-effects/success/
   - Download any pleasant chime/bell sound
   - Rename to `success.mp3`
   - Place in this directory

2. **Error sound:**
   - Go to: https://mixkit.co/free-sound-effects/fail/
   - Download a short alert/buzzer sound
   - Rename to `error.mp3`
   - Place in this directory

## ✅ Verify Installation

Open browser console (F12) and run:
```javascript
new Audio('/sounds/success.mp3').play()
new Audio('/sounds/error.mp3').play()
```

If you hear sounds, you're ready! 🎉

---

**For detailed instructions, alternatives, and troubleshooting:**  
See `docs/SOUND_FILES_GUIDE.md`
