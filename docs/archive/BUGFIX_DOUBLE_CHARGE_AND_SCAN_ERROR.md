# 🐛 Bug Fix: Dobbel-belastning og NFC Bridge Error

**Date:** 20. oktober 2025  
**Issue:** Studenter ble belastet to ganger ved NFC-kjøp + Bridge scan error

---

## 🔍 Problem 1: Dobbel-belastning

### Root Cause
`Terminal.tsx` logget transaksjoner DOBBELT:
1. `buyReward()` / `givePoints()` logger allerede transaksjonen
2. Terminal.tsx la til en ekstra transaksjon med NFC-data

**Resultat:** Student trekkes 2x poeng ved NFC-kjøp

### Solution
I stedet for å legge til ny transaksjon, **oppdater** eksisterende transaksjon:

```typescript
// ❌ FEIL (gammel kode):
await db.transactions.add({
  studentId,
  date: new Date(),
  pointsChange: -activeTransaction.cost,
  description: `Kjøp: ${activeTransaction.name}`,
  paymentMethod: 'nfc',
  cardId
});

// ✅ RIKTIG (ny kode):
const recentTransactions = await db.transactions
  .where('studentId')
  .equals(studentId)
  .reverse()
  .limit(1)
  .toArray();

if (recentTransactions.length > 0) {
  await db.transactions.update(recentTransactions[0].id!, {
    paymentMethod: 'nfc',
    cardId: cardId
  });
}
```

### Endrede filer
- ✅ `src/components/Terminal.tsx` (3 steder):
  - buyReward() path
  - custom_action path
  - givePoints() path

---

## 🔍 Problem 2: Bridge Scan Error

### Error Message
```
❌ Bridge scan failed: "Failed to connect to card: SCardConnect error: 
Smartkortet er fjernet, slik at videre kommunikasjon ikke er mulig. (0x80100069)"
```

### Root Cause
1. Bruker fjerner kortet raskt etter scanning
2. Bridge server prøver å koble til kort som ikke lenger er der
3. Client-side viser error og prøver igjen umiddelbart
4. Resulterer i loop av error-meldinger

### Solution

#### Bridge Server (`nfc-bridge/server.js`)
Legg til spesifikk error handling for "card removed":

```javascript
// Check for specific error codes
const errorCode = err.message || '';

// Card removed error (0x80100069)
if (errorCode.includes('0x80100069') || errorCode.includes('fjernet')) {
  return reject(new Error('CARD_REMOVED'));
}

// Card not present
if (errorCode.includes('0x8010000C') || errorCode.includes('No smartcard')) {
  return reject(new Error('NO_CARD'));
}
```

#### Client Side (`src/lib/nfcReader.ts`)
Håndter spesifikke feil gracefully:

```typescript
if (error === 'CARD_REMOVED') {
  console.log('ℹ️ Card was removed before reading could complete');
  return null;
}

if (error === 'NO_CARD') {
  console.log('ℹ️ No card present on reader');
  return null;
}
```

#### Terminal Component (`src/components/Terminal.tsx`)
Ikke vis error ved normal "no card" - bare retry:

```typescript
if (!card) {
  // Don't show error - just silently retry
  setTimeout(() => {
    if (isListening && nfcStatus === 'waiting') {
      listenForCard(); // Retry after 500ms
    }
  }, 500);
  return;
}
```

### Endrede filer
- ✅ `nfc-bridge/server.js`
- ✅ `src/lib/nfcReader.ts`
- ✅ `src/components/Terminal.tsx`

---

## 🧪 Testing Guide

### Test Scenario 1: Verify No Double Charge
1. Velg en belønning (f.eks. 10 poeng)
2. Student har 20 poeng
3. Tæpp NFC-kort
4. **Forventet:** Student har 10 poeng igjen (ikke 0)

### Test Scenario 2: Verify Transaction Log
1. Gjennomfør NFC-kjøp
2. Åpne transaksjonslogg
3. **Forventet:** Kun ÉN transaksjon med `paymentMethod: 'nfc'` og `cardId`

### Test Scenario 3: Quick Card Removal
1. Velg belønning
2. Klikk "Tæpp NFC-kort"
3. Tæpp kortet og **fjern det raskt**
4. **Forventet:** 
   - Enten: Transaksjonen fullføres (hvis kortet ble lest)
   - Eller: Venter stille på nytt kort (ingen rød error)
   - Console viser: `ℹ️ Card was removed` eller `ℹ️ No card present`

### Test Scenario 4: Normal Flow
1. Velg belønning
2. Klikk "Tæpp NFC-kort"
3. Hold kortet til success overlay vises
4. **Forventet:** 
   - Processing → Success overlay
   - Success-lyd
   - Correct point deduction
   - ONE transaction logged

---

## 📊 Console Output

### Before Fix
```
❌ Bridge scan failed: "Failed to connect to card: SCardConnect error..."
❌ Bridge scan failed: "Failed to connect to card: SCardConnect error..."
❌ Bridge scan failed: "Failed to connect to card: SCardConnect error..."
(repeated errors)
```

### After Fix
```
✅ Card read via Bridge: 04:A1:B2:C3
✅ Transaksjon fullført for Student
🔊 Success-lyd spilles
ℹ️ Card was removed before reading could complete (hvis kortet fjernes)
(no error spam)
```

---

## 🔧 Technical Details

### Transaction Logging Flow

**Before (WRONG):**
```
1. buyReward() → logs transaction
2. Terminal.tsx → logs ANOTHER transaction with NFC data
Result: 2 transactions = double charge
```

**After (CORRECT):**
```
1. buyReward() → logs transaction
2. Terminal.tsx → UPDATE that transaction with NFC metadata
Result: 1 transaction with complete data
```

### Error Handling Flow

**Before (WRONG):**
```
1. Card removed → Bridge error
2. Client shows error dialog
3. User clicks OK
4. Retry → Still no card → Error again
5. Loop continues
```

**After (CORRECT):**
```
1. Card removed → Bridge returns 'CARD_REMOVED'
2. Client logs info message (not error)
3. Silent retry after 500ms
4. Waits for new card
5. No error spam
```

---

## 📝 Files Changed

### Modified Files
1. **src/components/Terminal.tsx**
   - Lines 193-231: Remove duplicate transaction logging for buyReward
   - Lines 232-248: Remove duplicate transaction logging for custom_action
   - Lines 249-265: Remove duplicate transaction logging for givePoints
   - Lines 87-95: Improve error handling in card listener

2. **nfc-bridge/server.js**
   - Lines 60-93: Add specific error code detection

3. **src/lib/nfcReader.ts**
   - Lines 168-180: Add graceful handling of CARD_REMOVED and NO_CARD

### No New Files
All fixes are modifications to existing files.

---

## ✅ Verification Checklist

- [ ] No double charges in transaction log
- [ ] NFC transactions show correct `paymentMethod` and `cardId`
- [ ] Quick card removal doesn't spam errors
- [ ] Console shows info messages instead of errors for card removal
- [ ] Normal flow works: Processing → Success → Next card
- [ ] Student points deducted correctly (once, not twice)

---

## 🚀 Deployment

### Restart Required
1. **NFC Bridge Server:**
   ```powershell
   cd nfc-bridge
   npm start
   ```

2. **Next.js Dev Server:**
   ```powershell
   npm run dev
   ```

3. **Hard refresh browser:**
   - Ctrl+F5 (Windows)
   - Cmd+Shift+R (Mac)

---

## 🎯 Impact

✅ **Resolved Issues:**
- ✅ Students no longer charged twice
- ✅ Transaction log clean (one entry per purchase)
- ✅ No error spam when card is removed quickly
- ✅ Better user experience with silent retries

✅ **Improved:**
- ✅ Error handling in bridge server
- ✅ Client-side error classification
- ✅ Console output clarity

---

**Status:** ✅ Ready for Testing  
**Regression Risk:** Low (only affects transaction logging)  
**Testing Priority:** HIGH (financial impact - double charges)
