import { db } from './db';

/**
 * Loads demo data into the database for new users who want to try the app
 */
export async function loadDemoData() {
  // Clear all existing data first
  await db.students.clear();
  await db.subjects.clear();
  await db.homework.clear();
  await db.submissions.clear();
  await db.dailyChecks.clear();
  await db.remarks.clear();
  await db.hourlyChecks.clear();
  await db.tests.clear();
  await db.testResults.clear();
  
  // Add 15 demo students
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
    { name: 'Sara Eriksen', points: 128 }
  ];
  
  const studentIds = await db.students.bulkAdd(demoStudents, { allKeys: true });
  
  // Add 3 demo subjects
  const demoSubjects = [
    { name: 'Norsk' },
    { name: 'Matematikk' },
    { name: 'Engelsk' }
  ];
  
  const subjectIds = await db.subjects.bulkAdd(demoSubjects, { allKeys: true });
  
  // Add some demo homework (last 2 weeks)
  const now = new Date();
  
  // Calculate week numbers
  const currentWeek = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  
  const demoHomework = [
    {
      title: 'Les kapittel 3 og svar på spørsmål',
      subjectId: subjectIds[0] as string,
      week: currentWeek - 1,
      date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
    },
    {
      title: 'Oppgave 4.1-4.15 i læreboka',
      subjectId: subjectIds[1] as string,
      week: currentWeek,
      date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    },
    {
      title: 'Write a text about your weekend',
      subjectId: subjectIds[2] as string,
      week: currentWeek,
      date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
    }
  ];
  
  const homeworkIds = await db.homework.bulkAdd(demoHomework, { allKeys: true }) as number[];
  
  // Add some demo submissions (10 students submitted first homework)
  const demoSubmissions = [];
  for (let i = 0; i < 10; i++) {
    demoSubmissions.push({
      homeworkId: homeworkIds[0],
      studentId: studentIds[i] as number
    });
  }
  
  await db.submissions.bulkAdd(demoSubmissions);
  
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
  
  // Add some daily checks for today
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  
  const demoDailyChecks = [];
  for (let i = 0; i < 12; i++) {
    demoDailyChecks.push({
      studentId: studentIds[i],
      date: today,
      ipadCharged: Math.random() > 0.3,
      ipadBrought: Math.random() > 0.2
    });
  }
  
  await db.dailyChecks.bulkAdd(demoDailyChecks);
  
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
  await db.dailyChecks.clear();
  await db.remarks.clear();
  await db.hourlyChecks.clear();
  await db.tests.clear();
  await db.testResults.clear();
  await db.absences.clear();
  await db.learningGoals.clear();
  await db.goalAchievements.clear();
  
  // Remove demo flag
  if (typeof window !== 'undefined') {
    localStorage.removeItem('isDemoMode');
  }
}
