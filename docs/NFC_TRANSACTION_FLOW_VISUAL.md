# NFC Transaction Flow - Visual Guide

## 🔄 Normal Transaction Flow

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Lærer velger belønning                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  [🛒 Butikk]                                            │ │
│ │                                                          │ │
│ │  ┌──────────┐  ┌──────────┐  ┌──────────┐             │ │
│ │  │🍬 Godteri│  │📚 Bok   │  │🎮 Spill  │             │ │
│ │  │10 poeng │  │50 poeng │  │100 poeng │             │ │
│ │  └──────────┘  └──────────┘  └──────────┘             │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Aktivér NFC-modus                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  Valgt: 🍬 Godteri (10 poeng)                           │ │
│ │                                                          │ │
│ │  ┌────────────────────┐  ┌────────────────────┐        │ │
│ │  │  💳 Tæpp NFC-kort  │  │  👤 Velg manuelt  │        │ │
│ │  └────────────────────┘  └────────────────────┘        │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Venter på kort                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  🔵 Venter på kort...                                   │ │
│ │  Hold kortet mot kortleseren...                         │ │
│ │                                                          │ │
│ │  [NFC-ikon blinker] 💳 ⚡                               │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  NFC Bridge Server: AKTIV                                   │
│  Processing Lock: ÅPEN                                      │
│  Cooldown: INAKTIV                                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Kort detektert - Processing                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                                                          │ │
│ │      🌀 Prosesserer...                                  │ │
│ │                                                          │ │
│ │      Ikke fjern kortet                                  │ │
│ │                                                          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  UID Read: 04:A1:B2:C3                                     │
│  Processing Lock: LÅST 🔒                                  │
│  Sjekker: Kort registrert? → JA                           │
│  Sjekker: Kort blokkert? → NEI                            │
│  Sjekker: Student har nok poeng? → JA (25 poeng)          │
│  Trekker: -10 poeng                                        │
│  Logger: Transaction med cardId + paymentMethod='nfc'     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: SUCCESS! 🎉                                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                                                          │ │
│ │                    ✓                                    │ │
│ │                (bounce)                                 │ │
│ │                                                          │ │
│ │            Kjøp vellykket!                              │ │
│ │                                                          │ │
│ │       Du kan fjerne kortet nå                           │ │
│ │                                                          │ │
│ │       Klar for neste elev...                            │ │
│ │                                                          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  🔊 SPILLER: success.mp3                                   │
│  ⏱️  Varighet: 2 sekunder                                  │
│  🔄 Cooldown: STARTER (3 sekunder)                         │
│  🔓 Processing Lock: LÅSES OPP (etter 2 sek)              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 6: Tilbake til "Venter på kort"                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  🔵 Venter på kort...                                   │ │
│ │  Klar for neste kort...                                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  Processing Lock: ÅPEN 🔓                                  │
│  Cooldown: AKTIV ⏱️ (1 sekund gjenstår for forrige kort)  │
│  Klar for: NESTE ELEV                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## ❌ Error Flow - Ikke nok poeng

```
STEP 3: Venter på kort
        ↓
STEP 4: Kort detektert (04:A1:B2:C3)
        ↓
    Processing Lock: LÅST 🔒
    Sjekker poeng: Student har 5 poeng, trenger 10
        ↓
┌─────────────────────────────────────────────┐
│ ❌ Feil                                     │
│                                             │
│ Ole har kun 5 poeng,                        │
│ men Godteri koster 10 poeng                 │
│                                             │
│ 🔊 SPILLER: error.mp3                      │
└─────────────────────────────────────────────┘
        ↓
    Etter 4 sekunder: Tilbake til "Venter på kort"
    Processing Lock: ÅPEN 🔓
    Cooldown: RESET
```

---

## 🚫 Debouncing in Action

### Scenario: Kort blir liggende på leseren

```
T=0s   │ Transaksjons START
       │ UID: 04:A1:B2:C3
       │ Processing Lock: LÅST 🔒
       │
T=0.5s │ Processing...
       │
T=1.5s │ SUCCESS overlay vises ✓
       │ Success-lyd spilles 🔊
       │ Cooldown STARTER ⏱️
       │
T=2s   │ Processing Lock: ÅPEN 🔓
       │ SUCCESS overlay forsvinner
       │
T=2.5s │ Tilbake til "Venter på kort"
       │
       │ 💡 Kortet ligger fortsatt på leseren!
       │
T=3s   │ ❌ NY LESNING DETEKTERT
       │ UID: 04:A1:B2:C3 (samme kort!)
       │
       │ Cooldown-sjekk:
       │   now (3s) - lastReadTime (0s) = 3s
       │   3s < 3s? NEI (grensen nådd akkurat)
       │
       │ → IGNORERT! 🚫
       │ Console: "🚫 Cooldown aktiv - ignorerer lesning"
       │
T=4s   │ Cooldown fortsetter...
       │ Kortet ignoreres fortsatt
       │
T=5s   │ Kortet FORTSATT ignorert
       │ (må vente 3 sekunder FRA siste lesning)
```

---

## 🔄 Queue Mode - 4 studenter

```
┌─────────────┬────────────────────────────────────────────────┐
│   Tid       │  Hendelse                                      │
├─────────────┼────────────────────────────────────────────────┤
│ T=0s        │ 🎒 ELEV 1 tæpper kort                          │
│             │ Processing → Success (2s) → Venter             │
│             │ 🔊 Success-lyd                                 │
├─────────────┼────────────────────────────────────────────────┤
│ T=2.5s      │ 🎒 ELEV 2 tæpper kort                          │
│             │ Processing → Success (2s) → Venter             │
│             │ 🔊 Success-lyd                                 │
├─────────────┼────────────────────────────────────────────────┤
│ T=5s        │ 🎒 ELEV 3 tæpper kort                          │
│             │ Processing → Success (2s) → Venter             │
│             │ 🔊 Success-lyd                                 │
├─────────────┼────────────────────────────────────────────────┤
│ T=7.5s      │ 🎒 ELEV 4 tæpper kort                          │
│             │ Processing → Success (2s) → Venter             │
│             │ 🔊 Success-lyd                                 │
├─────────────┼────────────────────────────────────────────────┤
│ T=10s       │ ✅ Alle 4 elever ferdig!                       │
│             │ Total tid: 10 sekunder                         │
│             │ Gjennomsnitt: 2.5 sek per elev                 │
└─────────────┴────────────────────────────────────────────────┘

💡 Ingen lærer-interaksjon mellom elevene!
```

---

## 🧠 Decision Tree

```
                    [Kort tæppet]
                         │
                         ↓
         ┌───────────────────────────────┐
         │  Er processing lock aktiv?    │
         └───────┬───────────────────┬───┘
                 │                   │
             JA │                   │ NEI
                 ↓                   ↓
         ┌───────────────┐   ┌──────────────────┐
         │ IGNORER       │   │ Sjekk cooldown   │
         │ Console:      │   │ (3 sekunder)     │
         │ "Transaksjon  │   └────┬─────────┬───┘
         │ pågår"        │        │         │
         └───────────────┘    AKTIV│         │IKKE AKTIV
                                   ↓         ↓
                         ┌──────────────┐  ┌────────────────────┐
                         │ IGNORER      │  │ Sjekk kort i DB    │
                         │ Console:     │  └────┬───────────┬───┘
                         │ "Cooldown"   │       │           │
                         └──────────────┘   FUNNET│         │IKKE FUNNET
                                                  ↓         ↓
                                       ┌────────────────┐  ┌─────────────┐
                                       │ Sjekk blokkert │  │ ERROR       │
                                       └────┬───────┬───┘  │ "Ukjent     │
                                        NEI │       │JA    │  kort"      │
                                            ↓       ↓      │ 🔊 error    │
                         ┌─────────────────┐  ┌─────────┐ └─────────────┘
                         │ Sjekk poeng     │  │ ERROR   │
                         └────┬────────┬───┘  │"Blokkert│
                          NOK │        │LITE  │ kort"   │
                              ↓        ↓      │🔊 error │
                    ┌─────────────┐ ┌────────┴─────────┐
                    │ SUCCESS ✓   │ │ ERROR            │
                    │ Processing  │ │ "Ikke nok poeng" │
                    │ → Overlay   │ │ 🔊 error         │
                    │ 🔊 success  │ └──────────────────┘
                    └─────────────┘
```

---

## 📊 State Machine

```
┌─────────────────────────────────────────────────────────────┐
│                     NFC STATUS STATES                       │
└─────────────────────────────────────────────────────────────┘

    [IDLE]
      │
      │ (Bruker klikker "Tæpp NFC-kort")
      ↓
  [WAITING] ◄─────────────────────────┐
      │                                │
      │ (Kort detektert)              │ (Etter error)
      ↓                                │ (3 sek timeout)
 [PROCESSING] ─────────────────────────┤
      │                                │
      │ (Transaksjon fullført)        │
      ↓                                │
  [SUCCESS] ───────────────────────────┤
      │                                │
      │ (2 sekunder)                  │
      │                                │
      └────────────────────────────────┘
      
      │ (Bruker avbryter)
      ↓
    [IDLE]


┌─────────────────────────────────────────────────────────────┐
│                  PROCESSING LOCK STATES                     │
└─────────────────────────────────────────────────────────────┘

  [UNLOCKED 🔓]
      │
      │ (Kort detektert)
      ↓
   [LOCKED 🔒] ──────┐
      │              │ (Nye kort ignoreres)
      │              │
      │ (Success)    │
      ↓              │
   Hold 2 sek        │
      │              │
      ↓              │
  [UNLOCKED 🔓] ◄────┘


┌─────────────────────────────────────────────────────────────┐
│                   COOLDOWN TIMER                            │
└─────────────────────────────────────────────────────────────┘

    lastReadTime = null
    lastCardId = null
           │
           │ (Kort lest)
           ↓
    lastReadTime = now
    lastCardId = "04:A1:B2:C3"
           │
           │ (0-3 sekunder)
           │
      ┌────┴────┐
      │ COOLDOWN│ ←─────┐
      │ ACTIVE  │       │ (Samme kort prøver igjen)
      └────┬────┘       │ → IGNORERT
           │            │
           │ (3+ sek)   │
           ↓            │
    Cooldown expired    │
    (men state beholdes)│
           │            │
           │ (Nytt kort)│
           └────────────┘
```

---

## 🎨 UI States

### 1. IDLE (ingen aktiv transaksjon)
```
┌─────────────────────────────┐
│  🛒 Butikk                   │
│                              │
│  [Velg belønning]            │
└─────────────────────────────┘
```

### 2. WAITING (venter på kort)
```
┌─────────────────────────────┐
│  🔵 Venter på kort...        │
│  Hold kortet mot kortleseren │
│                              │
│  💳 ⚡ (blinker)              │
│                              │
│  [Avbryt] [Velg manuelt]     │
└─────────────────────────────┘
```

### 3. PROCESSING (behandler)
```
┌───────────────────────────────┐
│ ╔════════════════════════════╗│
│ ║                            ║│
│ ║      🌀 Prosesserer...     ║│
│ ║                            ║│
│ ║   Ikke fjern kortet        ║│
│ ║                            ║│
│ ╚════════════════════════════╝│
└───────────────────────────────┘
     (Fullskjerm overlay)
```

### 4. SUCCESS (vellykket)
```
┌───────────────────────────────┐
│ ╔════════════════════════════╗│
│ ║                            ║│
│ ║            ✓               ║│
│ ║        (bounce)            ║│
│ ║                            ║│
│ ║    Kjøp vellykket!         ║│
│ ║                            ║│
│ ║  Du kan fjerne kortet nå   ║│
│ ║                            ║│
│ ║  Klar for neste elev...    ║│
│ ║                            ║│
│ ╚════════════════════════════╝│
└───────────────────────────────┘
  (Grønn fullskjerm, 2 sek)
```

### 5. ERROR (feil oppstått)
```
┌─────────────────────────────┐
│  ❌ Feil                     │
│  Ole har kun 5 poeng,        │
│  men Godteri koster 10 poeng │
│                              │
│  (Tilbake til WAITING etter  │
│   3-4 sekunder)              │
└─────────────────────────────┘
```

---

**For fullstendig test-guide:** Se `NFC_DEBOUNCING_TEST_GUIDE.md`
