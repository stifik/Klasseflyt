import { rewards } from "./rewards";
import type { Transaction, PurchasedReward } from "./types";
import { db } from "./db";
import { v4 as uuidv4 } from 'uuid';

// Resultat-type for belønningsfunksjoner
export type RewardResult = {
  success: boolean;
  message: string;
};

// Funksjon for å gi poeng til en elev
export async function givePoints(studentId: string, amount: number, description: string): Promise<RewardResult> {
  try {
    // Hent student fra database
    const student = await db.students.get(studentId);
    if (!student) {
      return { success: false, message: `Student med ID ${studentId} ikke funnet` };
    }

    // Oppdater student med nye poeng (reaktiv oppdatering)
    const newPoints = (student.points || 0) + amount;
    await db.students.update(studentId, { points: newPoints });

    // Legg til transaksjon i database
    await db.transactions.add({
      studentId,
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

// Funksjon for å bruke poeng på en belønning (kjøpe gavekort)
export async function buyReward(studentId: string, rewardId: number): Promise<RewardResult> {
  try {
    // Finn belønning
    const reward = rewards.find(r => r.id === rewardId);
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
    if (currentPoints < reward.cost) {
      const missingPoints = reward.cost - currentPoints;
      return { 
        success: false, 
        message: `Ikke nok poeng. Mangler ${missingPoints} poeng` 
      };
    }

    // Oppdater student med reduserte poeng (reaktiv oppdatering)
    const newPoints = currentPoints - reward.cost;
    await db.students.update(studentId, { points: newPoints });

    // Lag et nytt gavekort i lommeboken
    const purchaseId = uuidv4();
    const newPurchase: Omit<PurchasedReward, 'id'> = {
      purchaseId,
      studentId,
      rewardId,
      rewardName: reward.name,
      purchaseDate: new Date(),
      status: 'unused',
    };
    await db.purchasedRewards.add(newPurchase);

    // Legg til transaksjon i database
    await db.transactions.add({
      studentId,
      date: new Date(),
      pointsChange: -reward.cost,
      description: `Kjøpte gavekort: '${reward.name}'`,
    });

    return { 
      success: true, 
      message: `Gavekort for "${reward.name}" er kjøpt og lagret i lommeboken din!` 
    };
  } catch (error) {
    console.error('Feil ved kjøp av belønning:', error);
    return { 
      success: false, 
      message: 'Teknisk feil ved kjøp av belønning. Prøv igjen senere.' 
    };
  }
}

// Ny funksjon for å løse inn gavekort
export async function redeemReward(purchaseId: string): Promise<RewardResult> {
  try {
    // Finn gavekortet
    const purchasedReward = await db.purchasedRewards
      .where('purchaseId')
      .equals(purchaseId)
      .first();
    
    if (!purchasedReward) {
      return { success: false, message: `Gavekort med ID ${purchaseId} ikke funnet` };
    }

    if (purchasedReward.status === 'used') {
      return { success: false, message: 'Dette gavekortet er allerede brukt' };
    }

    // Oppdater status til 'used'
    await db.purchasedRewards.update(purchasedReward.id!, { status: 'used' });

    return { 
      success: true, 
      message: `Gavekort "${purchasedReward.rewardName}" er innløst!` 
    };
  } catch (error) {
    console.error('Feil ved innløsning av gavekort:', error);
    return { 
      success: false, 
      message: 'Teknisk feil ved innløsning av gavekort. Prøv igjen senere.' 
    };
  }
}
