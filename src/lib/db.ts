
import Dexie, { type Table } from 'dexie';
import type { Student, Subject, Homework, Submission, DailyCheck, Remark, SeatingChartRecord, SeatingLayout, AppSettings, HomeworkStatus, HourlyCheck } from './types';
import { getWeekNumber } from './utils';

// Define the database schema
export class MySubClassedDexie extends Dexie {
    students!: Table<Student, string>;
    subjects!: Table<Subject, string>;
    homework!: Table<Homework, number>;
    submissions!: Table<Submission, number>;
    dailyChecks!: Table<DailyCheck, number>;
    remarks!: Table<Remark, number>;
    hourlyChecks!: Table<HourlyCheck, number>;
    seatingChartHistory!: Table<SeatingChartRecord, number>;
    seatingLayouts!: Table<SeatingLayout, string>;
    settings!: Table<AppSettings & { id: string }, string>;

    constructor() {
        super('KlasseflytDB');
        this.version(1).stores({
            students: '++id, name',
            subjects: '++id, name',
            homework: '++id, subjectId, week, date',
            submissions: '++id, &[studentId+homeworkId], studentId, homeworkId',
            dailyChecks: '++id, &[studentId+date], studentId, date',
            remarks: '++id, studentId, date, period',
            seatingChartHistory: '++id, createdAt',
            seatingLayouts: '++id, name',
            settings: 'id'
        });
        
        // Version 2: Added isDelayed to submissions
        this.version(2).stores({
            submissions: '++id, &[studentId+homeworkId], studentId, homeworkId, isDelayed',
        });

        // Version 3: Correctly add classroomTools to default settings on upgrade
        this.version(3).stores({}).upgrade(async (tx) => {
            const userSettings = await tx.table('settings').get('userSettings');
            if (userSettings) {
                // If classroomTools tab setting doesn't exist, add it.
                if (userSettings.tabs.classroomTools === undefined) {
                    userSettings.tabs.classroomTools = true;
                }
                // If classroomTools is not in tabOrder, add it.
                if (!userSettings.tabOrder.includes('classroomTools')) {
                    // Place it before settings if possible, otherwise at the end.
                    const settingsIndex = userSettings.tabOrder.indexOf('settings');
                    if (settingsIndex !== -1) {
                        userSettings.tabOrder.splice(settingsIndex, 0, 'classroomTools');
                    } else {
                        userSettings.tabOrder.push('classroomTools');
                    }
                }
                await tx.table('settings').put(userSettings);
            }
        });
        
        this.version(4).stores({
            hourlyChecks: '++id, &[studentId+date+period], studentId, date, period'
        }).upgrade(async (tx) => {
             const userSettings = await tx.table('settings').get('userSettings');
             if (userSettings) {
                if (userSettings.tabs.hourlyCheck === undefined) {
                    userSettings.tabs.hourlyCheck = true;
                }
                if (!userSettings.tabOrder.includes('hourlyCheck')) {
                    const remarksIndex = userSettings.tabOrder.indexOf('remarks');
                    if (remarksIndex !== -1) {
                        userSettings.tabOrder.splice(remarksIndex, 0, 'hourlyCheck');
                    } else {
                        userSettings.tabOrder.push('hourlyCheck');
                    }
                }
                await tx.table('settings').put(userSettings);
            }
        });

        this.on('populate', async () => {
            await this.settings.add({ id: 'userSettings', ...defaultSettings });
        });
    }
}

export const db = new MySubClassedDexie();

// --- Mock Data and Seeding ---
const mockStudents = [
  { name: 'Ola Nordmann' }, { name: 'Kari Normann' }, { name: 'Aisha Khan' },
  { name: 'Lucas Moen' }, { name: 'Emilie Kristiansen' }, { name: 'Jakob Olsen' },
  { name: 'Nora Pedersen' }, { name: 'Filip Larsen' }, { name: 'Ingrid Andersen' },
  { name: 'Mathias Nilsen' }, { name: 'Leah Halvorsen' }, { name: 'William Jensen' },
  { name: 'Sofia Hagen' }, { name: 'Oskar Johansen' }, { name: 'Maja Eriksen' },
  { name: 'Isak Dahl' }, { name: 'Hedda Berg' }, { name: 'Tobias Aas' },
  { name: 'Thea Kaasa' }, { name: 'Sander Lien' }
];

const mockSubjects = [ { name: 'Norsk' }, { name: 'Matematikk' }, { name: 'Engelsk' }, { name: 'Samfunnsfag' }, { name: 'Naturfag' }];

const defaultSettings: AppSettings = {
  tabs: {
    overview: true, dailyCheck: true, hourlyCheck: true, remarks: true, reports: true,
    seatingChart: true, classroomTools: true,
    settings: true,
  },
  tabOrder: ['overview', 'dailyCheck', 'hourlyCheck', 'remarks', 'reports', 'seatingChart', 'classroomTools'],
  reportSettings: {
    includeHomework: true, includeIpad: true, includeRemarks: true,
    includePositiveFeedback: false, greeting: "Hei,", closing: "Vennlig hilsen,", teacherName: "Læreren"
  },
  schedule: [
    { period: 1, startTime: "08:30", endTime: "09:00" },
    { period: 2, startTime: "09:00", endTime: "10:00" },
    { period: 3, startTime: "10:30", endTime: "11:00" },
    { period: 4, startTime: "11:00", endTime: "12:00" },
    { period: 5, startTime: "12:30", endTime: "13:30" },
    { period: 6, startTime: "13:30", endTime: "14:00" },
  ],
  selectedSeatingLayoutId: null,
  remarkTypes: ["Generell", "Forstyrrer andre", "Mangler utstyr", "Upassende språk", "Gjorde en god innsats"],
  onboardingCompleted: false,
};

// Function to clear all data from the database
export async function clearDatabase() {
     await db.transaction('rw', db.tables, async () => {
        await Promise.all(db.tables.map(table => table.clear()));
        // After clearing, re-populate with default settings
        await db.settings.add({ id: 'userSettings', ...defaultSettings });
     });
}

// Function to clear all data and re-seed with mock data
export async function resetDatabase() {
    await db.transaction('rw', db.tables, async () => {
        // Clear all tables
        await Promise.all(db.tables.map(table => table.clear()));

        // Add settings
        const settingsToPut = { 
            id: 'userSettings', 
            ...defaultSettings, 
            onboardingCompleted: true, 
            reportSettings: {...defaultSettings.reportSettings, teacherName: 'Læreren'}
        };
        await db.settings.put(settingsToPut);
        

        // Add students and subjects
        const studentIds = await db.students.bulkAdd(mockStudents, { returning: true }) as string[];
        const subjectIds = await db.subjects.bulkAdd(mockSubjects, { returning: true }) as string[];
        
        // Re-fetch subjects to get full objects with IDs
        const subjects = await db.subjects.bulkGet(subjectIds) as Subject[];

        const norskSubject = subjects.find(s => s && s.name === 'Norsk');
        const engelskSubject = subjects.find(s => s && s.name === 'Engelsk');
        const matteSubject = subjects.find(s => s && s.name === 'Matematikk');
        const naturfagSubject = subjects.find(s => s && s.name === 'Naturfag');

        // --- Create Mock Homework ---
        const today = new Date();
        const thisWeek = getWeekNumber(today);
        const homeworkToAdd: Omit<Homework, 'id'>[] = [];

        if (norskSubject?.id) homeworkToAdd.push({ title: "Lesing kap. 2", subjectId: norskSubject.id, week: thisWeek, date: new Date() });
        if (engelskSubject?.id) homeworkToAdd.push({ title: "Gloser", subjectId: engelskSubject.id, week: thisWeek, date: new Date() });
        if (matteSubject?.id) homeworkToAdd.push({ title: "Oppg. 3.1-3.5", subjectId: matteSubject.id, week: thisWeek, date: new Date() });
        if (naturfagSubject?.id) homeworkToAdd.push({ title: "Verdensrommet", subjectId: naturfagSubject.id, week: thisWeek - 1, date: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) });
        
        const homeworkIds = await db.homework.bulkAdd(homeworkToAdd, { returning: true }) as number[];

        // --- Create Mock Submissions ---
        const submissionsToAdd: Omit<Submission, 'id'>[] = [];
        const statuses: HomeworkStatus[] = ["Godkjent", "Ikke levert", "Må rettes", "Syk/Fravær", "Glemt bok"];
        studentIds.forEach(studentId => {
            homeworkIds.forEach(homeworkId => {
                const chance = Math.random();
                if (chance > 0.1) { // 90% chance of a submission
                    let status: HomeworkStatus = "Godkjent";
                    let isDelayed = false;
                    if (chance < 0.2) { status = "Ikke levert"; isDelayed = true; }
                    else if (chance < 0.25) { status = "Må rettes"; isDelayed = true; }
                    submissionsToAdd.push({
                        studentId,
                        homeworkId,
                        status,
                        comment: status === "Må rettes" ? "Gjør oppgavene på nytt." : undefined,
                        isDelayed,
                    });
                }
            });
        });
        await db.submissions.bulkAdd(submissionsToAdd);

        // --- Create Mock Daily Checks ---
        const dailyChecksToAdd: Omit<DailyCheck, 'id'>[] = [];
        for (let i = 0; i < 5; i++) { // Last 5 days
            const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
            studentIds.forEach(studentId => {
                const chance = Math.random();
                if (chance < 0.1) {
                    dailyChecksToAdd.push({ studentId, date, ipadCharged: true, ipadBrought: false });
                } else if (chance < 0.2) {
                    dailyChecksToAdd.push({ studentId, date, ipadCharged: false, ipadBrought: true });
                }
                // No entry means OK
            });
        }
        await db.dailyChecks.bulkAdd(dailyChecksToAdd);

        // --- Create Mock Remarks ---
        const remarksToAdd: Omit<Remark, 'id'>[] = [];
        const remarkTypes = defaultSettings.remarkTypes || ["Generell"];
        for (let i = 0; i < 14; i++) { // Last 14 days
            const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
            if (date.getDay() === 0 || date.getDay() === 6) continue; // Skip weekends

            for (let j = 0; j < Math.floor(Math.random() * 5); j++) { // 0-4 remarks per day
                remarksToAdd.push({
                    studentId: studentIds[Math.floor(Math.random() * studentIds.length)],
                    date,
                    period: Math.floor(Math.random() * 5) + 1,
                    type: remarkTypes[Math.floor(Math.random() * remarkTypes.length)]
                });
            }
        }
        await db.remarks.bulkAdd(remarksToAdd);
        
        // --- Create Mock Hourly Checks ---
        const hourlyChecksToAdd: Omit<HourlyCheck, 'id'>[] = [];
        for (let i = 0; i < 7; i++) { // Last 7 days
            const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
            if (date.getDay() === 0 || date.getDay() === 6) continue;
            
            for (let period = 1; period <= 6; period++) {
                studentIds.forEach(studentId => {
                    const chance = Math.random();
                     if (chance < 0.6) {
                        hourlyChecksToAdd.push({ studentId, date, period, behavior: 'WorkedWell' });
                    }
                    if (chance > 0.9) {
                        hourlyChecksToAdd.push({ studentId, date, period, behavior: 'Disturbed' });
                    }
                    if (chance > 0.5 && chance < 0.55) {
                        hourlyChecksToAdd.push({ studentId, date, period, behavior: 'HelpedOthers' });
                    }
                });
            }
        }
        await db.hourlyChecks.bulkAdd(hourlyChecksToAdd);


        console.log("Database has been reset and seeded with extensive demo data.");
    });
}
