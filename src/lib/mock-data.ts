import { db } from './db';
import { v4 as uuidv4 } from 'uuid';
import type { Reward } from './types';

/**
 * Loads demo data into the database for new users who want to try the app
 */
export async function loadDemoData() {
  // Clear all existing data first
  await db.students.clear();
  await db.subjects.clear();
  await db.homework.clear();
  await db.submissions.clear();
  await db.submissionAttempts.clear();
  await db.dailyChecks.clear();
  await db.remarks.clear();
  await db.hourlyChecks.clear();
  await db.tests.clear();
  await db.testResults.clear();
  await db.seatingLayouts.clear();
  await db.seatingChartHistory.clear();
  
  // Add 16 demo students
  const demoStudents = [
    { name: 'Emma Hansen', points: 120 },
    { name: 'Noah Johansen', points: 95 },
    { name: 'Olivia Berg', points: 140 },
    { name: 'Lucas Andersen', points: 88 },
    { name: 'Sofie Olsen', points: 110 },
    { name: 'Emil Larsen', points: 102 },
    { name: 'Leah Nielsen', points: 125 },
    { name: 'Oliver Pedersen', points: 78 },
    { name: 'Ella Kristiansen', points: 133 },
    { name: 'Filip Mortensen', points: 91 },
    { name: 'Nora Sørensen', points: 115 },
    { name: 'Aksel Rasmussen', points: 98 },
    { name: 'Ida Pettersen', points: 107 },
    { name: 'Theo Johnsen', points: 84 },
    { name: 'Sara Eriksen', points: 128 },
    { name: 'Mathias Jensen', points: 96 }
  ];
  
  const studentIds = await db.students.bulkAdd(demoStudents, { allKeys: true });
  
  // Add 3 demo subjects
  const demoSubjects = [
    { name: 'Norsk' },
    { name: 'Matematikk' },
    { name: 'Engelsk' }
  ];
  
  const subjectIds = await db.subjects.bulkAdd(demoSubjects, { allKeys: true });
  
  // Add demo homework with varied statuses
  const now = new Date();
  
  // Calculate week numbers
  const currentWeek = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  
  const demoHomework = [
    // LEKSE 1: Forrige uke mandag
    {
      title: 'Les kapittel 3 og svar på spørsmål',
      subjectId: subjectIds[0] as string,
      week: currentWeek - 1,
      date: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000)
    },
    // LEKSE 2: Forrige uke onsdag
    {
      title: 'Oppgave 4.1-4.15 i læreboka',
      subjectId: subjectIds[1] as string,
      week: currentWeek - 1,
      date: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
    },
    // LEKSE 3: Forrige uke fredag
    {
      title: 'Write a short essay about your favorite hobby',
      subjectId: subjectIds[2] as string,
      week: currentWeek - 1,
      date: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000)
    },
    // LEKSE 4: Denne uken mandag (3 dager siden)
    {
      title: 'Forbered presentasjon om ditt favorittdikt',
      subjectId: subjectIds[0] as string,
      week: currentWeek,
      date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    },
    // LEKSE 5: I går
    {
      title: 'Kapittel 5: Brøk og desimaltall, øv deg på oppgavene',
      subjectId: subjectIds[1] as string,
      week: currentWeek,
      date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
    }
  ];
  
  const homeworkIds = await db.homework.bulkAdd(demoHomework, { allKeys: true }) as number[];
  
  // Add submissions with varied statuses
  // We need to add submissions first, get IDs, then add attempts
  
  // ==== LEKSE 1 (overdue, 5 dager siden) ====
  // Fordeling: 5 godkjent, 3 må rettes, 2 syk, 6 ikke levert
  
  const hw1Submissions = [];
  for (let i = 0; i < 10; i++) {
    hw1Submissions.push({
      homeworkId: homeworkIds[0],
      studentId: studentIds[i] as number
    });
  }
  const hw1SubIds = await db.submissions.bulkAdd(hw1Submissions, { allKeys: true }) as number[];
  
  const hw1Attempts = [];
  // 5 godkjent
  for (let i = 0; i < 5; i++) {
    hw1Attempts.push({
      submissionId: hw1SubIds[i],
      status: 'Godkjent' as const,
      date: new Date(now.getTime() - Math.random() * 5 * 24 * 60 * 60 * 1000)
    });
  }
  // 3 må rettes
  for (let i = 5; i < 8; i++) {
    hw1Attempts.push({
      submissionId: hw1SubIds[i],
      status: 'Må rettes' as const,
      comment: 'Må fullføre siste spørsmål',
      date: new Date(now.getTime() - Math.random() * 5 * 24 * 60 * 60 * 1000)
    });
  }
  // 2 syk
  for (let i = 8; i < 10; i++) {
    hw1Attempts.push({
      submissionId: hw1SubIds[i],
      status: 'Syk/Fravær' as const,
      comment: 'Syk',
      date: new Date(now.getTime() - Math.random() * 5 * 24 * 60 * 60 * 1000)
    });
  }
  await db.submissionAttempts.bulkAdd(hw1Attempts);
  // 6 elever (index 10-15): Ikke levert - ingen submission
  
  // ==== LEKSE 2 (overdue, 2 dager siden) ====
  // Fordeling: 8 godkjent, 2 glemt bok, 6 ikke levert
  
  const hw2Submissions = [];
  for (let i = 0; i < 10; i++) {
    hw2Submissions.push({
      homeworkId: homeworkIds[1],
      studentId: studentIds[i] as number
    });
  }
  const hw2SubIds = await db.submissions.bulkAdd(hw2Submissions, { allKeys: true }) as number[];
  
  const hw2Attempts = [];
  // 8 godkjent
  for (let i = 0; i < 8; i++) {
    hw2Attempts.push({
      submissionId: hw2SubIds[i],
      status: 'Godkjent' as const,
      date: new Date(now.getTime() - Math.random() * 2 * 24 * 60 * 60 * 1000)
    });
  }
  // 2 glemt bok
  for (let i = 8; i < 10; i++) {
    hw2Attempts.push({
      submissionId: hw2SubIds[i],
      status: 'Glemt bok' as const,
      comment: 'Glemte boka hjemme',
      date: new Date(now.getTime() - Math.random() * 2 * 24 * 60 * 60 * 1000)
    });
  }
  await db.submissionAttempts.bulkAdd(hw2Attempts);
  // 6 elever (index 10-15): Ikke levert
  
  // ==== LEKSE 3 (forrige uke fredag) ====
  // Fordeling: 9 godkjent, 3 må rettes, 4 ikke levert
  
  const hw3Submissions = [];
  for (let i = 0; i < 12; i++) {
    hw3Submissions.push({
      homeworkId: homeworkIds[2],
      studentId: studentIds[i] as number
    });
  }
  const hw3SubIds = await db.submissions.bulkAdd(hw3Submissions, { allKeys: true }) as number[];
  
  const hw3Attempts = [];
  // 9 godkjent
  for (let i = 0; i < 9; i++) {
    hw3Attempts.push({
      submissionId: hw3SubIds[i],
      status: 'Godkjent' as const,
      date: new Date(now.getTime() - Math.random() * 4 * 24 * 60 * 60 * 1000)
    });
  }
  // 3 må rettes
  for (let i = 9; i < 12; i++) {
    hw3Attempts.push({
      submissionId: hw3SubIds[i],
      status: 'Må rettes' as const,
      comment: 'Mangler svar på siste del',
      date: new Date(now.getTime() - Math.random() * 4 * 24 * 60 * 60 * 1000)
    });
  }
  await db.submissionAttempts.bulkAdd(hw3Attempts);
  // 4 elever (index 12-15): Ikke levert
  
  // ==== LEKSE 4 (denne uken mandag - 3 dager siden) ====
  // Fordeling: 11 godkjent, 2 syk, 3 ikke levert
  
  const hw4Submissions = [];
  for (let i = 0; i < 13; i++) {
    hw4Submissions.push({
      homeworkId: homeworkIds[3],
      studentId: studentIds[i] as number
    });
  }
  const hw4SubIds = await db.submissions.bulkAdd(hw4Submissions, { allKeys: true }) as number[];
  
  const hw4Attempts = [];
  // 11 godkjent
  for (let i = 0; i < 11; i++) {
    hw4Attempts.push({
      submissionId: hw4SubIds[i],
      status: 'Godkjent' as const,
      date: new Date(now.getTime() - Math.random() * 3 * 24 * 60 * 60 * 1000)
    });
  }
  // 2 syk
  for (let i = 11; i < 13; i++) {
    hw4Attempts.push({
      submissionId: hw4SubIds[i],
      status: 'Syk/Fravær' as const,
      comment: 'Syk',
      date: new Date(now.getTime() - Math.random() * 3 * 24 * 60 * 60 * 1000)
    });
  }
  await db.submissionAttempts.bulkAdd(hw4Attempts);
  // 3 elever (index 13-15): Ikke levert
  
  // ==== LEKSE 5 (i går) ====
  // Fordeling: 10 godkjent, 1 glemt bok, 2 må rettes, 3 ikke levert
  
  const hw5Submissions = [];
  for (let i = 0; i < 13; i++) {
    hw5Submissions.push({
      homeworkId: homeworkIds[4],
      studentId: studentIds[i] as number
    });
  }
  const hw5SubIds = await db.submissions.bulkAdd(hw5Submissions, { allKeys: true }) as number[];
  
  const hw5Attempts = [];
  // 10 godkjent
  for (let i = 0; i < 10; i++) {
    hw5Attempts.push({
      submissionId: hw5SubIds[i],
      status: 'Godkjent' as const,
      date: new Date(now.getTime() - Math.random() * 1 * 24 * 60 * 60 * 1000)
    });
  }
  // 1 glemt bok
  hw5Attempts.push({
    submissionId: hw5SubIds[10],
    status: 'Glemt bok' as const,
    comment: 'Glemte boka hjemme',
    date: new Date(now.getTime() - Math.random() * 1 * 24 * 60 * 60 * 1000)
  });
  // 2 må rettes
  for (let i = 11; i < 13; i++) {
    hw5Attempts.push({
      submissionId: hw5SubIds[i],
      status: 'Må rettes' as const,
      comment: 'Sjekk utregningene',
      date: new Date(now.getTime() - Math.random() * 1 * 24 * 60 * 60 * 1000)
    });
  }
  await db.submissionAttempts.bulkAdd(hw5Attempts);
  // 3 elever (index 13-15): Ikke levert
  
  // Add some demo remarks
  const demoRemarks = [
    {
      studentId: studentIds[7] as number,
      type: 'Glemt utstyr',
      date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      period: 3,
      message: 'Glemte blyant'
    },
    {
      studentId: studentIds[3] as number,
      type: 'Forstyrrende',
      date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      period: 2,
      message: 'Pratet mye i timen'
    },
    {
      studentId: studentIds[2] as number,
      type: 'Positivt',
      date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      period: 4,
      message: 'Hjelpsom overfor andre elever'
    }
  ];
  
  await db.remarks.bulkAdd(demoRemarks);
  
  // Add some daily checks for today (12 of 16 students checked in)
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  
  const demoDailyChecks = [];
  for (let i = 0; i < 12; i++) {
    demoDailyChecks.push({
      studentId: studentIds[i] as number,
      date: today,
      ipadCharged: Math.random() > 0.3,
      ipadBrought: Math.random() > 0.2
    });
  }
  
  await db.dailyChecks.bulkAdd(demoDailyChecks);
  
  // ==== UKESPLANLEGGER (demo timeplan for alle ukedager) ====
  
  const demoScheduleTemplates = [
    // Mandag
    {
      name: 'Mandag-mal',
      dayOfWeek: 'monday' as const,
      sessions: [
        { id: 0, time: '08:30', subject: 'Norsk', topic: 'Leseforståelse: Kapittel 3' },
        { id: 1, time: '09:30', subject: 'Matematikk', topic: 'Brøk og desimaltall' },
        { id: 2, time: '10:45', subject: 'Engelsk', topic: 'Verb: Past tense' },
        { id: 3, time: '12:00', subject: 'Naturfag', topic: 'Dyrs livssyklus' }
      ],
      createdAt: now,
      updatedAt: now
    },
    // Tirsdag
    {
      name: 'Tirsdag-mal',
      dayOfWeek: 'tuesday' as const,
      sessions: [
        { id: 0, time: '08:30', subject: 'Matematikk', topic: 'Geometri: Areal' },
        { id: 1, time: '09:30', subject: 'Norsk', topic: 'Skriving: Fortelling' },
        { id: 2, time: '10:45', subject: 'Gym', topic: 'Lagidrett' },
        { id: 3, time: '12:00', subject: 'Engelsk', topic: 'Vocabulary: Hobbies' }
      ],
      createdAt: now,
      updatedAt: now
    },
    // Onsdag
    {
      name: 'Onsdag-mal',
      dayOfWeek: 'wednesday' as const,
      sessions: [
        { id: 0, time: '08:30', subject: 'Engelsk', topic: 'Reading comprehension' },
        { id: 1, time: '09:30', subject: 'Matematikk', topic: 'Repetisjon: Tall og algebra' },
        { id: 2, time: '10:45', subject: 'Samfunnsfag', topic: 'Norges geografi' },
        { id: 3, time: '12:00', subject: 'Norsk', topic: 'Grammatikk: Setningsanalyse' }
      ],
      createdAt: now,
      updatedAt: now
    },
    // Torsdag
    {
      name: 'Torsdag-mal',
      dayOfWeek: 'thursday' as const,
      sessions: [
        { id: 0, time: '08:30', subject: 'Naturfag', topic: 'Eksperiment: Vann og olje' },
        { id: 1, time: '09:30', subject: 'Norsk', topic: 'Diktet: Språklige virkemidler' },
        { id: 2, time: '10:45', subject: 'Matematikk', topic: 'Måling: Vekt og volum' },
        { id: 3, time: '12:00', subject: 'Kunst og håndverk', topic: 'Maling: Fargelære' }
      ],
      createdAt: now,
      updatedAt: now
    },
    // Fredag
    {
      name: 'Fredag-mal',
      dayOfWeek: 'friday' as const,
      sessions: [
        { id: 0, time: '08:30', subject: 'Matematikk', topic: 'Quiz: Ukens tema' },
        { id: 1, time: '09:30', subject: 'Engelsk', topic: 'Presentation: My week' },
        { id: 2, time: '10:45', subject: 'Musikk', topic: 'Rytme og takt' },
        { id: 3, time: '11:30', subject: 'Fellestime', topic: 'Oppsummering og ukesavslutning' }
      ],
      createdAt: now,
      updatedAt: now
    }
  ];
  
  await db.scheduleTemplates.bulkAdd(demoScheduleTemplates);
  
  // ==== BELØNNINGER (demo rewards) ====
  
  const demoRewards: Omit<Reward, 'id'>[] = [
    {
      name: 'Godteri',
      cost: 50,
      basePrice: 50,
      currentPrice: 50,
      emoji: '🍬'
    },
    {
      name: 'Ekstra friminutt',
      cost: 75,
      basePrice: 75,
      currentPrice: 75,
      emoji: '⭐'
    },
    {
      name: 'Spilltime',
      cost: 100,
      basePrice: 100,
      currentPrice: 100,
      emoji: '🎮'
    },
    {
      name: 'Velg lesestoffen',
      cost: 60,
      basePrice: 60,
      currentPrice: 60,
      emoji: '📚'
    },
    {
      name: 'Kunstprosjekt',
      cost: 120,
      basePrice: 120,
      currentPrice: 120,
      emoji: '🎨'
    },
    {
      name: 'Musikk-pause',
      cost: 80,
      basePrice: 80,
      currentPrice: 80,
      emoji: '🎵'
    },
    {
      name: 'Klasseleder for dagen',
      cost: 150,
      basePrice: 150,
      currentPrice: 150,
      emoji: '🏆'
    },
    {
      name: 'Lek-time',
      cost: 200,
      basePrice: 200,
      currentPrice: 200,
      emoji: '🎪'
    }
  ];
  
  await db.rewards.bulkAdd(demoRewards as any);
  
  // ==== KLASSEKART (7×8 layout med 16 pulter) ====
  
  // Definer layout-struktur (7 rader × 8 kolonner)
  // Mønster: xx0xx0xx (rad 0), 00000000 (rad 1 - gangvei), osv.
  const layoutPattern = [
    [true, true, false, true, true, false, true, true],      // Rad 0: 6 pulter
    [false, false, false, false, false, false, false, false], // Rad 1: gangvei
    [true, true, false, true, true, false, true, true],      // Rad 2: 6 pulter
    [false, false, false, false, false, false, false, false], // Rad 3: gangvei
    [true, true, false, true, true, false, false, false],    // Rad 4: 4 pulter
    [false, false, false, false, false, false, false, false], // Rad 5: gangvei
    [true, true, false, true, true, false, false, false]     // Rad 6: 4 pulter
  ];
  
  const demoLayoutId = uuidv4();
  const demoLayout = {
    id: demoLayoutId,
    name: 'Demo Klassekart',
    rows: 7,
    cols: 8,
    layout: layoutPattern,
    seatCount: 16,
    createdAt: now
  };
  
  await db.seatingLayouts.add(demoLayout);
  
  // Generer klassekart med tilfeldig plassering av elever
  // Samle alle pult-koordinater
  const deskPositions: { r: number; c: number }[] = [];
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 8; c++) {
      if (layoutPattern[r][c]) {
        deskPositions.push({ r, c });
      }
    }
  }
  
  // Shuffle elever tilfeldig
  const studentNames = demoStudents.map(s => s.name);
  const shuffledStudents = [...studentNames].sort(() => Math.random() - 0.5);
  
  // Opprett seating chart data-struktur
  const seatingChartData: (string[] | null)[][] = Array(7)
    .fill(null)
    .map(() => Array(8).fill(null).map(() => []));
  
  // Plasser elever på pultene
  deskPositions.forEach((pos, index) => {
    if (index < shuffledStudents.length) {
      seatingChartData[pos.r][pos.c] = [shuffledStudents[index]];
    }
  });
  
  // Lagre klassekart i history
  await db.seatingChartHistory.add({
    chartJson: JSON.stringify(seatingChartData),
    rows: 7,
    cols: 8,
    createdAt: now
  });
  
  // Oppdater settings for å sette aktivt layout
  const existingSettings = await db.settings.get('userSettings');
  if (existingSettings) {
    await db.settings.update('userSettings', {
      selectedSeatingLayoutId: demoLayoutId
    });
  }
  
  // Set flag for demo mode
  if (typeof window !== 'undefined') {
    localStorage.setItem('isDemoMode', 'true');
  }
}

/**
 * Clears all demo data and resets the app
 */
export async function clearDemoData() {
  // Delete all data
  await db.students.clear();
  await db.subjects.clear();
  await db.homework.clear();
  await db.submissions.clear();
  await db.submissionAttempts.clear();
  await db.dailyChecks.clear();
  await db.remarks.clear();
  await db.hourlyChecks.clear();
  await db.tests.clear();
  await db.testResults.clear();
  await db.absences.clear();
  await db.learningGoals.clear();
  await db.goalAchievements.clear();
  await db.seatingLayouts.clear();
  await db.seatingChartHistory.clear();
  
  // Reset settings
  const existingSettings = await db.settings.get('userSettings');
  if (existingSettings) {
    await db.settings.update('userSettings', {
      selectedSeatingLayoutId: null
    });
  }
  
  // Remove demo flag
  if (typeof window !== 'undefined') {
    localStorage.removeItem('isDemoMode');
  }
}
