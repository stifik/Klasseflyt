import { rewards } from "./rewards";
import { db } from "./db";

// Resultat-type for belønningsfunksjoner
export type RewardResult = {
  success: boolean;
  message: string;
};

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
    // Finn belønning
    const reward = rewards.find(r => r.id === rewardId);
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
    if (currentPoints < reward.cost) {
      const missingPoints = reward.cost - currentPoints;
      return { 
        success: false, 
        message: `Ikke nok poeng. Mangler ${missingPoints} poeng` 
      };
    }

    // 1. Trekk poeng fra studenten
    const newPoints = currentPoints - reward.cost;
    await db.students.update(key as any, { points: newPoints });

    // 2. Logg transaksjonen
    await db.transactions.add({
      studentId: String(key),
      date: new Date(),
      pointsChange: -reward.cost,
      description: reward.name, // Beskrivelsen er nå navnet på belønningen
    });

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
