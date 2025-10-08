import { rewards } from "./rewards";
import type { Transaction } from "./types";
import { db } from "./db";

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

// Funksjon for å bruke poeng på en belønning
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

    // Legg til transaksjon i database
    await db.transactions.add({
      studentId,
      date: new Date(),
      pointsChange: -reward.cost,
      description: `Kjøpte '${reward.name}'`,
    });

    return true;
  } catch (error) {
    console.error('Feil ved kjøp av belønning:', error);
    return false;
  }
}
