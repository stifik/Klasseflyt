import { rewards } from "./rewards";
import type { Transaction, PurchasedReward } from "./types";
import { db } from "./db";
import { v4 as uuidv4 } from 'uuid';

// Oppdaterte reaktive funksjoner som bruker database

// Funksjon for å gi poeng til en elev
export async function givePoints(studentId: string, amount: number, description: string) {
  try {
    // Hent student fra database
    const student = await db.students.get(studentId);
    if (!student) {
      throw new Error(`Student med ID ${studentId} ikke funnet`);
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

    return true;
  } catch (error) {
    console.error('Feil ved å gi poeng:', error);
    return false;
  }
}

// Funksjon for å bruke poeng på en belønning (kjøpe gavekort)
export async function buyReward(studentId: string, rewardId: number): Promise<boolean> {
  try {
    // Finn belønning
    const reward = rewards.find(r => r.id === rewardId);
    if (!reward) {
      throw new Error(`Belønning med ID ${rewardId} ikke funnet`);
    }

    // Hent student fra database
    const student = await db.students.get(studentId);
    if (!student) {
      throw new Error(`Student med ID ${studentId} ikke funnet`);
    }

    // Sjekk om student har nok poeng
    const currentPoints = student.points || 0;
    if (currentPoints < reward.cost) {
      throw new Error(`Ikke nok poeng. Har ${currentPoints}, trenger ${reward.cost}`);
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

    return true;
  } catch (error) {
    console.error('Feil ved kjøp av belønning:', error);
    return false;
  }
}

// Ny funksjon for å løse inn gavekort
export async function redeemReward(purchaseId: string): Promise<boolean> {
  try {
    // Finn gavekortet
    const purchasedReward = await db.purchasedRewards
      .where('purchaseId')
      .equals(purchaseId)
      .first();
    
    if (!purchasedReward) {
      throw new Error(`Gavekort med ID ${purchaseId} ikke funnet`);
    }

    if (purchasedReward.status === 'used') {
      throw new Error('Dette gavekortet er allerede brukt');
    }

    // Oppdater status til 'used'
    await db.purchasedRewards.update(purchasedReward.id!, { status: 'used' });

    return true;
  } catch (error) {
    console.error('Feil ved innløsning av gavekort:', error);
    return false;
  }
}
