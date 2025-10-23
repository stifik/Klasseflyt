import { db } from "./db";
import { givePoints } from "./rewardService";
import type { NFCRegistrationSession } from "./types";

// Dev mode: Allow multiple registrations per day for testing
// Set to true in localStorage: localStorage.setItem('nfc_dev_mode', 'true')
const isDevMode = () => {
  if (typeof window === 'undefined') return false;
  return window.localStorage?.getItem('nfc_dev_mode') === 'true';
};

export type CheckInResult = {
  success: boolean;
  message: string;
  studentName?: string;
  points?: number;
};

/**
 * Get today's date as a string (YYYY-MM-DD)
 */
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Start a new NFC registration session for today
 */
export async function startRegistrationSession(): Promise<{ success: boolean; message: string }> {
  const todayString = getTodayString();

  try {
    // Check if there's already a session for today
    const existingSession = await db.nfcRegistrationSessions.get(todayString);

    if (existingSession && !isDevMode()) {
      if (existingSession.isActive) {
        return { success: false, message: "En registrering er allerede aktiv for i dag." };
      }
      if (existingSession.isCompleted) {
        return { success: false, message: "Registreringen for i dag er allerede fullført." };
      }

      // Reactivate the session
      await db.nfcRegistrationSessions.update(todayString, {
        isActive: true,
        startTime: new Date(),
      });

      return { success: true, message: "NFC-registrering gjenopptatt" };
    }

    // Create new session
    const newSession: NFCRegistrationSession = {
      id: todayString,
      date: new Date(),
      startTime: new Date(),
      isActive: true,
      isCompleted: false,
    };

    await db.nfcRegistrationSessions.add(newSession);

    return { success: true, message: "NFC-registrering startet" };
  } catch (error) {
    console.error("Error starting registration session:", error);
    return { success: false, message: "Kunne ikke starte registrering" };
  }
}

/**
 * Get the active registration session for today (if any)
 */
export async function getActiveSession(): Promise<NFCRegistrationSession | null> {
  const todayString = getTodayString();
  const session = await db.nfcRegistrationSessions.get(todayString);

  if (session && session.isActive && !session.isCompleted) {
    return session;
  }

  return null;
}

/**
 * Handle NFC card tap during registration
 */
export async function handleCardTap(cardId: string): Promise<CheckInResult> {
  try {
    // 1. Check if there's an active session
    const activeSession = await getActiveSession();
    if (!activeSession) {
      return {
        success: false,
        message: "Ingen aktiv registrering. Start registrering først."
      };
    }

    // 2. Get student ID from RFID card
    const card = await db.rfidCards.where('cardId').equals(cardId).first();
    if (!card) {
      return {
        success: false,
        message: "Ukjent kort. Registrer kortet i innstillinger først."
      };
    }

    if (card.status === 'blocked') {
      return {
        success: false,
        message: "Dette kortet er blokkert."
      };
    }

    // 3. Get student info
    const student = await db.students.get(card.studentId);
    if (!student) {
      return {
        success: false,
        message: "Eleven knyttet til dette kortet ble ikke funnet."
      };
    }

    // 4. Check if student is absent
    const todayString = getTodayString();
    const todayDate = new Date(todayString);
    const absence = await db.absences
      .where('studentId').equals(card.studentId)
      .and(a => new Date(a.date).toISOString().split('T')[0] === todayString)
      .first();

    if (absence) {
      return {
        success: false,
        message: `${student.name} er registrert som fraværende.`
      };
    }

    // 5. Check if student already registered today (skip in dev mode)
    if (!isDevMode()) {
      const existingCheck = await db.dailyChecks
        .where('studentId').equals(card.studentId)
        .and(c => new Date(c.date).toISOString().split('T')[0] === todayString)
        .first();

      if (existingCheck) {
        return {
          success: false,
          message: `${student.name} er allerede registrert.`,
          studentName: student.name
        };
      }
    }

    // 6. Get iPad charged action points
    const ipadAction = await db.actions
      .where('actionKey').equals('IPAD_CHARGED')
      .first();

    if (!ipadAction) {
      return {
        success: false,
        message: "Konfigurasjon for 'iPad ladet' ikke funnet."
      };
    }

    // 7. Create daily check entry
    await db.dailyChecks.add({
      studentId: card.studentId,
      date: todayDate,
      ipadCharged: true,
      ipadBrought: true,
      registrationMethod: 'nfc',
      registeredAt: new Date(),
    });

    // 8. Give points
    const pointsResult = await givePoints(
      card.studentId,
      ipadAction.points,
      ipadAction.name
    );

    if (!pointsResult.success) {
      console.error("Failed to give points:", pointsResult.message);
      // We still consider this a success since the check was registered
    }

    // 9. Update card last used
    await db.rfidCards.update(card.id!, { lastUsed: new Date() });

    return {
      success: true,
      message: `${student.name} registrert!`,
      studentName: student.name,
      points: ipadAction.points
    };

  } catch (error) {
    console.error("Error handling card tap:", error);
    return {
      success: false,
      message: "Det oppstod en feil. Prøv igjen."
    };
  }
}

/**
 * End the registration session and mark remaining students as "not charged"
 */
export async function endRegistrationSession(): Promise<{
  success: boolean;
  message: string;
  registered?: number;
  notCharged?: number;
  absent?: number;
}> {
  try {
    const activeSession = await getActiveSession();
    if (!activeSession) {
      return {
        success: false,
        message: "Ingen aktiv registrering å avslutte."
      };
    }

    const todayString = getTodayString();
    const todayDate = new Date(todayString);

    // Get all students
    const allStudents = await db.students.toArray();

    // Get today's absences
    const todaysAbsences = await db.absences
      .where('date').equals(todayDate)
      .toArray();
    const absentIds = new Set(todaysAbsences.map(a => a.studentId));

    // Get today's checks
    const todaysChecks = await db.dailyChecks
      .filter(c => new Date(c.date).toISOString().split('T')[0] === todayString)
      .toArray();
    const registeredIds = new Set(todaysChecks.map(c => c.studentId));

    // Find remaining students (not absent and not registered)
    const remainingStudents = allStudents.filter(s =>
      s.id && !absentIds.has(s.id) && !registeredIds.has(s.id)
    );

    // Mark remaining students as "not charged" - bulk operation
    if (remainingStudents.length > 0) {
      const checksToAdd = remainingStudents.map(student => ({
        studentId: student.id!,
        date: todayDate,
        ipadCharged: false,
        ipadBrought: true,
        registrationMethod: 'manual' as const,
      }));

      await db.dailyChecks.bulkAdd(checksToAdd);
    }

    // Update session
    await db.nfcRegistrationSessions.update(activeSession.id, {
      isActive: false,
      isCompleted: true,
      endTime: new Date(),
    });

    return {
      success: true,
      message: "Registrering avsluttet",
      registered: registeredIds.size,
      notCharged: remainingStudents.length,
      absent: absentIds.size,
    };

  } catch (error) {
    console.error("Error ending registration session:", error);
    return {
      success: false,
      message: "Kunne ikke avslutte registrering"
    };
  }
}

/**
 * Get registration statistics for today
 */
export async function getRegistrationStats(): Promise<{
  totalStudents: number;
  registered: number;
  notRegistered: number;
  absent: number;
}> {
  const todayString = getTodayString();

  const allStudents = await db.students.toArray();
  const totalStudents = allStudents.filter(s => s.id).length;

  const todaysAbsences = await db.absences
    .filter(a => new Date(a.date).toISOString().split('T')[0] === todayString)
    .toArray();
  const absent = todaysAbsences.length;

  const todaysChecks = await db.dailyChecks
    .filter(c => new Date(c.date).toISOString().split('T')[0] === todayString)
    .toArray();
  const registered = todaysChecks.filter(c => c.ipadCharged && c.ipadBrought).length;

  const notRegistered = totalStudents - registered - absent;

  return {
    totalStudents,
    registered,
    notRegistered,
    absent,
  };
}

/**
 * Get list of registered students today (with timestamps)
 */
export async function getRegisteredStudentsToday(): Promise<Array<{
  studentId: number;
  studentName: string;
  registeredAt: Date;
}>> {
  const todayString = getTodayString();

  const todaysChecks = await db.dailyChecks
    .filter(c =>
      new Date(c.date).toISOString().split('T')[0] === todayString &&
      c.registrationMethod === 'nfc' &&
      c.registeredAt
    )
    .toArray();

  const result = [];

  for (const check of todaysChecks) {
    const student = await db.students.get(check.studentId);
    if (student && student.name) {
      result.push({
        studentId: check.studentId,
        studentName: student.name,
        registeredAt: check.registeredAt!,
      });
    }
  }

  // Sort by registration time (newest first)
  result.sort((a, b) => b.registeredAt.getTime() - a.registeredAt.getTime());

  return result;
}
