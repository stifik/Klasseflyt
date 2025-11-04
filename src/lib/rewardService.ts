import { db } from "./db";
import type { Reward } from "./types";
import { processAutoContribution } from './communityRewardService';
import { v4 as uuidv4 } from 'uuid';

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
  console.log('📋 All rewards before calculation:', rewards.map(r => `ID ${r.id}(${typeof r.id}): ${r.name} = ${r.currentPrice}`));
  
  return rewards.map(reward => {
    let newPrice = reward.currentPrice;
    const oldPrice = newPrice;

    // Ensure we're comparing same types
    const isBought = reward.id === boughtRewardId || reward.id === Number(boughtRewardId) || Number(reward.id) === Number(boughtRewardId);
    console.log(`  🔍 Checking ID ${reward.id}(${typeof reward.id}) vs ${boughtRewardId}(${typeof boughtRewardId}): isBought=${isBought}`);

    if (isBought) {
      // Increase price of bought item by configured % of base price
      newPrice += reward.basePrice * (increasePercent / 100);
      // Round up to ensure price always increases
      newPrice = Math.ceil(newPrice);
      console.log(`  ✅ ID ${reward.id} (${reward.name}): BOUGHT - ${oldPrice} → ${newPrice}`);
    } else {
      // Other items always decrease by configured % of base price
      // This creates downward pressure on all non-purchased items
      const decayAmount = reward.basePrice * (decreasePercent / 100);
      newPrice -= decayAmount;
      // Round down to ensure price always decreases (unless at floor)
      newPrice = Math.floor(newPrice);
      console.log(`  📉 ID ${reward.id} (${reward.name}): DECREASED - ${oldPrice} → ${newPrice}`);
    }

    // Enforce price bounds (configurable % of basePrice)
    const minPrice = reward.basePrice * (floorPercent / 100);
    const maxPrice = reward.basePrice * (ceilingPercent / 100);
    if (newPrice < minPrice) newPrice = minPrice;
    if (newPrice > maxPrice) newPrice = maxPrice;
    
    return { 
      ...reward, 
      currentPrice: newPrice,
      cost: newPrice // Keep cost in sync for backward compatibility
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

    // Hent Børs-ID fra localStorage
    const borsId = localStorage.getItem('klasseflyt_bors_id');
    if (!borsId) {
      console.warn('⚠️ Børs-ID not set in localStorage, skipping price sync');
      console.warn('💡 Please set your Børs-ID in Settings → Min Unike Børs-ID');
      return;
    }

    // Hent felles belønning-info - både communityReward og enkel classGoal
    const settings = await db.settings.get('userSettings');
    let classGoal = null; // Fellesspotter (Delte Mål)
    let simpleClassGoal = null; // Enkel felles belønning

    // Sjekk om det finnes aktive communityRewards (Fellesspotter/Delte Mål)
    const activeCommunityRewards = await db.communityRewards
      .where('status')
      .equals('active')
      .sortBy('priority');

    if (activeCommunityRewards && activeCommunityRewards.length > 0) {
      // Bruk den første aktive belønningen (høyest prioritet)
      const topReward = activeCommunityRewards[0];
      classGoal = {
        current: topReward.currentAmount,
        target: topReward.target,
        title: topReward.title
      };
    }

    // Sjekk også om enkel classGoal er konfigurert
    if (settings?.classGoal) {
      const transactions = await db.transactions.toArray();
      
      // Beregn total klasse-poeng (kun positive transaksjoner)
      const classTotalPoints = transactions.reduce((sum, t) => {
        const change = t.pointsChange || 0;
        return change > 0 ? sum + change : sum;
      }, 0);

      simpleClassGoal = {
        current: classTotalPoints,
        target: settings.classGoal.target || 200,
        title: settings.communityGoalTitle || 'Felles belønning'
      };
    }

    console.log('📤 Syncing prices to API...', rewards.length, 'rewards, borsId:', borsId);
    if (classGoal) {
      console.log('🎯 Fellesspotter (Delte Mål):', classGoal);
    }
    if (simpleClassGoal) {
      console.log('🎯 Enkel felles belønning:', simpleClassGoal);
    }
    
    const response = await fetch('/api/prices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ 
        borsId, 
        rewards,
        classGoal,
        simpleClassGoal
      }),
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

// Funksjon for å overføre poeng mellom elever med kostnad
export async function transferPoints(
  fromStudentId: number,
  toStudentId: number,
  amount: number,
  feePercent: number,
  fromCardId?: string,
  toCardId?: string
): Promise<RewardResult> {
  try {
    // Validering
    if (fromStudentId === toStudentId) {
      return { success: false, message: 'Kan ikke overføre poeng til seg selv' };
    }

    if (amount <= 0) {
      return { success: false, message: 'Beløp må være større enn 0' };
    }

    // Hent studenter
    const fromStudent = await db.students.get(fromStudentId);
    const toStudent = await db.students.get(toStudentId);

    if (!fromStudent) {
      return { success: false, message: `Avsender med ID ${fromStudentId} ikke funnet` };
    }

    if (!toStudent) {
      return { success: false, message: `Mottaker med ID ${toStudentId} ikke funnet` };
    }

    // Beregn totalkostnad for avsender (beløp + gebyr)
    const totalCost = Math.ceil(amount * (1 + feePercent / 100));
    const fee = totalCost - amount;

    // Sjekk at avsender har nok poeng
    const fromPoints = fromStudent.points || 0;
    if (fromPoints < totalCost) {
      const missing = totalCost - fromPoints;
      return {
        success: false,
        message: `${fromStudent.name} har kun ${fromPoints} poeng, men trenger ${totalCost} poeng (${amount} + ${fee} gebyr). Mangler ${missing} poeng.`
      };
    }

    // Trekk fra avsender
    const newFromPoints = fromPoints - totalCost;
    await db.students.update(fromStudentId, { points: newFromPoints });

    // Gi til mottaker
    const toPoints = toStudent.points || 0;
    const newToPoints = toPoints + amount;
    await db.students.update(toStudentId, { points: newToPoints });

    // Logg transaksjon for avsender
    await db.transactions.add({
      studentId: fromStudentId,
      date: new Date(),
      pointsChange: -totalCost,
      description: `Overført ${amount} poeng til ${toStudent.name} (inkl. ${fee} poeng gebyr)`,
      paymentMethod: fromCardId ? 'nfc' : 'manual',
      cardId: fromCardId,
    });

    // Logg transaksjon for mottaker
    await db.transactions.add({
      studentId: toStudentId,
      date: new Date(),
      pointsChange: amount,
      description: `Mottatt ${amount} poeng fra ${fromStudent.name}`,
      paymentMethod: toCardId ? 'nfc' : 'manual',
      cardId: toCardId,
    });

    // Oppdater kort sist brukt hvis NFC
    if (fromCardId) {
      const rfidCard = await db.rfidCards.where('cardId').equals(fromCardId).first();
      if (rfidCard?.id) {
        await db.rfidCards.update(rfidCard.id, { lastUsed: new Date() });
      }
    }
    if (toCardId) {
      const rfidCard = await db.rfidCards.where('cardId').equals(toCardId).first();
      if (rfidCard?.id) {
        await db.rfidCards.update(rfidCard.id, { lastUsed: new Date() });
      }
    }

    return {
      success: true,
      message: `Overføring vellykket! ${fromStudent.name} har overført ${amount} poeng til ${toStudent.name} (kostnad: ${totalCost} poeng)`
    };
  } catch (error) {
    console.error('Feil ved overføring av poeng:', error);
    return { success: false, message: 'Teknisk feil ved overføring av poeng' };
  }
}

// Funksjon for å gi poeng til en elev
export async function givePoints(
  studentId: number,
  amount: number,
  description: string,
  cardId?: string
): Promise<RewardResult> {
  try {
    const student = await db.students.get(studentId);
    if (!student) {
      return { success: false, message: `Student med ID ${studentId} ikke funnet` };
    }

    // Process auto-contribution to community rewards (if enabled)
    const autoDeducted = await processAutoContribution(studentId, amount);

    // Calculate net points after auto-contribution
    const netPoints = amount - autoDeducted;

    // Oppdater student med nye poeng (after auto-deduction)
    const newPoints = (student.points || 0) + netPoints;
    await db.students.update(studentId, { points: newPoints });

    // Legg til transaksjon i database med NFC metadata hvis tilgjengelig
    const transactionDescription = autoDeducted > 0
      ? `${description} (${amount} poeng, ${autoDeducted} auto-donert til fellespot)`
      : description;

    await db.transactions.add({
      studentId: studentId,
      date: new Date(),
      pointsChange: netPoints,
      description: transactionDescription,
      paymentMethod: cardId ? 'nfc' : 'manual',
      cardId: cardId,
    });

    return { success: true, message: 'Poeng gitt!' };
  } catch (error) {
    console.error('Feil ved å gi poeng:', error);
    return { success: false, message: 'Teknisk feil ved giving av poeng' };
  }
}

// Funksjon for å bruke poeng på en belønning (direkte kjøp, ikke gavekort)
export async function buyReward(
  studentId: number,
  rewardId: number,
  cardId?: string
): Promise<RewardResult> {
  try {
    // Hent alle belønninger fra database
    const allRewards = await db.rewards.toArray();

    // Finn belønning
    const reward = allRewards.find((r: Reward) => r.id === rewardId);
    if (!reward) {
      return { success: false, message: `Belønning med ID ${rewardId} ikke funnet` };
    }

    // Hent student fra database
    const student = await db.students.get(studentId);
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
    await db.students.update(studentId, { points: newPoints });

    // 2. Logg transaksjonen med NFC metadata hvis tilgjengelig
    await db.transactions.add({
      studentId: studentId,
      date: new Date(),
      pointsChange: -priceToCharge,
      description: reward.name,
      paymentMethod: cardId ? 'nfc' : 'manual',
      cardId: cardId,
    });

    // 3. Add purchased reward record
    await db.purchasedRewards.add({
      purchaseId: uuidv4(),
      studentId,
      rewardId,
      rewardName: reward.name,
      purchaseDate: new Date(),
      status: 'unused'
    });

    // 4. Update card last used if NFC payment
    if (cardId) {
      const rfidCard = await db.rfidCards.where('cardId').equals(cardId).first();
      if (rfidCard?.id) {
        await db.rfidCards.update(rfidCard.id, { lastUsed: new Date() });
      }
    }

    // 5. Check if dynamic pricing is enabled
    const settings = await db.settings.get('userSettings');
    const rewardSystem = settings?.rewardSystem || {
      mode: 'simple',
      priceIncreasePercent: 5,
      priceDecreasePercent: 2,
      priceFloorPercent: 50,
      priceCeilingPercent: 200,
      transferFeePercent: 10,
    };

    // 6. Only calculate and update prices if in dynamic mode
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

// Update prices after a purchase (for external use, e.g., POS)
export async function updatePricesAfterPurchase(rewardId: number): Promise<void> {
  try {
    const allRewards = await db.rewards.toArray();
    const settings = await db.settings.get('userSettings');
    const rewardSystem = settings?.rewardSystem || {
      mode: 'simple',
      priceIncreasePercent: 5,
      priceDecreasePercent: 2,
      priceFloorPercent: 50,
      priceCeilingPercent: 200,
      transferFeePercent: 10,
    };

    // Only update if in dynamic mode
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
  } catch (error) {
    console.error('Error updating prices after purchase:', error);
  }
}

// Sync agent status to API endpoint
export async function syncAgentStatusWithApi(
  status: 'pending' | 'analyzing' | 'passed' | 'failed',
  agentName?: string,
  mission?: string
): Promise<RewardResult> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_API_SECRET_KEY;
    if (!apiKey) {
      console.warn('⚠️ API_SECRET_KEY not set, skipping agent status sync');
      return { success: false, message: 'API key not configured' };
    }

    // Hent Børs-ID fra localStorage
    const borsId = localStorage.getItem('klasseflyt_bors_id');
    if (!borsId) {
      console.warn('⚠️ Børs-ID not set in localStorage, skipping agent status sync');
      return { success: false, message: 'Børs-ID not configured. Please set it in Settings.' };
    }

    console.log('📤 Syncing agent status to API...', { borsId, status, agentName });
    
    const response = await fetch('/api/agent-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ borsId, status, agentName, mission }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Agent status synced successfully:', data);
      return { success: true, message: 'Agent status synchronized' };
    } else {
      console.error('❌ Failed to sync agent status:', response.status, response.statusText);
      return { success: false, message: 'Failed to sync agent status' };
    }
  } catch (error) {
    console.error("❌ Failed to sync agent status to API:", error);
    return { success: false, message: 'Network error' };
  }
}
