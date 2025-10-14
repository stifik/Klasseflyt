import { db } from "./db";
import type { Reward } from "./types";

// Resultat-type for belønningsfunksjoner
export type RewardResult = {
  success: boolean;
  message: string;
};

// Dynamic pricing algorithm with configurable parameters
export function calculateNewPrices(
  rewards: Reward[], 
  boughtRewardId: number,
  increasePercent: number = 5,
  decreasePercent: number = 2,
  floorPercent: number = 50,
  ceilingPercent: number = 200
): Reward[] {
  console.log('🔄 Calculating prices for bought reward ID:', boughtRewardId, 'type:', typeof boughtRewardId);
  
  return rewards.map(reward => {
    let newPrice = reward.currentPrice;
    const oldPrice = newPrice;

    // Ensure we're comparing same types
    const isBought = reward.id === boughtRewardId || reward.id === Number(boughtRewardId) || Number(reward.id) === Number(boughtRewardId);

    if (isBought) {
      // Increase price of bought item by configured % of base price
      newPrice += reward.basePrice * (increasePercent / 100);
      console.log(`  ✅ ID ${reward.id} (${reward.name}): BOUGHT - ${oldPrice} → ${Math.round(newPrice)}`);
    } else {
      // Other items always decrease by configured % of base price
      // This creates downward pressure on all non-purchased items
      const decayAmount = reward.basePrice * (decreasePercent / 100);
      newPrice -= decayAmount;
      console.log(`  📉 ID ${reward.id} (${reward.name}): DECREASED - ${oldPrice} → ${Math.round(newPrice)}`);
    }

    // Enforce price bounds (configurable % of basePrice)
    const minPrice = reward.basePrice * (floorPercent / 100);
    const maxPrice = reward.basePrice * (ceilingPercent / 100);
    if (newPrice < minPrice) newPrice = minPrice;
    if (newPrice > maxPrice) newPrice = maxPrice;
    
    return { 
      ...reward, 
      currentPrice: Math.round(newPrice),
      cost: Math.round(newPrice) // Keep cost in sync for backward compatibility
    };
  });
}

// Sync prices to API endpoint
async function syncPricesWithApi(rewards: Reward[]) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_API_SECRET_KEY;
    if (!apiKey) {
      console.warn('⚠️ API_SECRET_KEY not set, skipping price sync');
      return;
    }

    console.log('📤 Syncing prices to API...', rewards.length, 'rewards');
    
    const response = await fetch('/api/prices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ rewards }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Prices synced successfully:', data);
    } else {
      console.error('❌ Failed to sync prices:', response.status, response.statusText);
    }
  } catch (error) {
    console.error("❌ Failed to sync prices to API:", error);
  }
}

// Funksjon for å gi poeng til en elev
// Hjelpefunksjon: Forsøk å hente elev med både streng- og tall-ID (Dexie PK er typesensitiv)
async function getStudentByFlexibleId(studentId: string | number) {
  // 1) Prøv som mottatt
  let student = await db.students.get(studentId as any);
  if (student) return { student, key: studentId };

  // 2) Hvis mottatt ID er string som kun består av siffer, prøv tall
  if (typeof studentId === 'string' && /^\d+$/.test(studentId)) {
    const numericId = Number(studentId);
    student = await db.students.get(numericId as any);
    if (student) return { student, key: numericId };
  }

  // 3) Hvis mottatt ID er number, prøv string-varianten
  if (typeof studentId === 'number') {
    const stringId = String(studentId);
    student = await db.students.get(stringId as any);
    if (student) return { student, key: stringId };
  }

  return { student: undefined, key: studentId } as const;
}

export async function givePoints(studentId: string | number, amount: number, description: string): Promise<RewardResult> {
  try {
    // Hent student fra database med fleksibel ID-håndtering
    const { student, key } = await getStudentByFlexibleId(studentId);
    if (!student) {
      return { success: false, message: `Student med ID ${studentId} ikke funnet` };
    }

    // Oppdater student med nye poeng (reaktiv oppdatering)
    const newPoints = (student.points || 0) + amount;
    await db.students.update(key as any, { points: newPoints });

    // Legg til transaksjon i database
    await db.transactions.add({
      studentId: String(key),
      date: new Date(),
      pointsChange: amount,
      description,
    });

    return { success: true, message: 'Poeng gitt!' };
  } catch (error) {
    console.error('Feil ved å gi poeng:', error);
    return { success: false, message: 'Teknisk feil ved giving av poeng' };
  }
}

// Funksjon for å bruke poeng på en belønning (direkte kjøp, ikke gavekort)
export async function buyReward(studentId: string | number, rewardId: number): Promise<RewardResult> {
  try {
    // Hent alle belønninger fra database
    const allRewards = await db.rewards.toArray();
    
    // Finn belønning
    const reward = allRewards.find((r: Reward) => r.id === rewardId);
    if (!reward) {
      return { success: false, message: `Belønning med ID ${rewardId} ikke funnet` };
    }

    // Hent student fra database med fleksibel ID-håndtering
    const { student, key } = await getStudentByFlexibleId(studentId);
    if (!student) {
      return { success: false, message: `Student med ID ${studentId} ikke funnet` };
    }

    // Sjekk om student har nok poeng
    const currentPoints = student.points || 0;
    const priceToCharge = reward.currentPrice || reward.cost;
    if (currentPoints < priceToCharge) {
      const missingPoints = priceToCharge - currentPoints;
      return { 
        success: false, 
        message: `Ikke nok poeng. Mangler ${missingPoints} poeng` 
      };
    }

    // 1. Trekk poeng fra studenten
    const newPoints = currentPoints - priceToCharge;
    await db.students.update(key as any, { points: newPoints });

    // 2. Logg transaksjonen
    await db.transactions.add({
      studentId: String(key),
      date: new Date(),
      pointsChange: -priceToCharge,
      description: reward.name,
    });

    // 3. Check if dynamic pricing is enabled
    const settings = await db.settings.get('userSettings');
    const rewardSystem = settings?.rewardSystem || {
      mode: 'simple',
      priceIncreasePercent: 5,
      priceDecreasePercent: 2,
      priceFloorPercent: 50,
      priceCeilingPercent: 200,
    };

    // 4. Only calculate and update prices if in dynamic mode
    if (rewardSystem.mode === 'dynamic') {
      const updatedRewards = calculateNewPrices(
        allRewards, 
        rewardId,
        rewardSystem.priceIncreasePercent,
        rewardSystem.priceDecreasePercent,
        rewardSystem.priceFloorPercent,
        rewardSystem.priceCeilingPercent
      );
      
      // Update all rewards in database
      await Promise.all(
        updatedRewards.map(r => db.rewards.update(r.id, {
          currentPrice: r.currentPrice,
          cost: r.cost
        }))
      );

      // Synchronize prices to API (non-blocking)
      syncPricesWithApi(updatedRewards);
    }

    return { 
      success: true, 
      message: `Kjøp vellykket! "${reward.name}" er kjøpt.` 
    };
  } catch (error) {
    console.error('Feil ved kjøp av belønning:', error);
    return { 
      success: false, 
      message: 'Teknisk feil ved kjøp av belønning. Prøv igjen senere.' 
    };
  }
}
