
import Dexie, { type Table } from 'dexie';
import type { Student, Subject, Homework, Submission, DailyCheck, Remark, SeatingChartRecord, SeatingLayout, AppSettings, HomeworkStatus } from './types';
import { getWeekNumber } from './utils';

// Define the database schema
export class MySubClassedDexie extends Dexie {
    students!: Table<Student, string>;
    subjects!: Table<Subject, string>;
    homework!: Table<Homework, number>;
    submissions!: Table<Submission, number>;
    dailyChecks!: Table<DailyCheck, number>;
    remarks!: Table<Remark, number>;
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
            settings: 'id' // primary key is 'id', which will be 'userSettings'
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
    overview: true, dailyCheck: true, remarks: true, reports: true,
    seatingChart: true, groupTool: true, studentPicker: true, remarkAnalysis: true,
    settings: true,
  },
  tabOrder: ['overview', 'dailyCheck', 'remarks', 'reports', 'seatingChart', 'groupTool', 'studentPicker', 'remarkAnalysis'],
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
        // After clearing, Dexie's "populate" event will re-add the default settings.
     });
}

// Function to clear all data and re-seed with mock data
export async function resetDatabase() {
    await db.transaction('rw', db.tables, async () => {
        // Clear all tables
        await Promise.all(db.tables.map(table => table.clear()));

        // Add settings
        await db.settings.put({ id: 'userSettings', ...defaultSettings, onboardingCompleted: true }); // Mark onboarding as completed for demo data

        // Add students and subjects
        await db.students.bulkAdd(mockStudents);
        await db.subjects.bulkAdd(mockSubjects);
        
        const allStudents = await db.students.toArray();
        const studentIds = allStudents.map(s => s.id!);
        const subjects = await db.subjects.toArray();

        // --- Create Mock Homework ---
        const today = new Date();
        const thisWeek = getWeekNumber(today);
        const homeworkToAdd: Omit<Homework, 'id'>[] = [
            { title: "Lesing kap. 2", subjectId: subjects.find(s => s.name === 'Norsk')?.id!, week: thisWeek, date: new Date() },
            { title: "Gloser", subjectId: subjects.find(s => s.name === 'Engelsk')?.id!, week: thisWeek, date: new Date() },
            { title: "Oppg. 3.1-3.5", subjectId: subjects.find(s => s.name === 'Matematikk')?.id!, week: thisWeek, date: new Date() },
            { title: "Verdensrommet", subjectId: subjects.find(s => s.name === 'Naturfag')?.id!, week: thisWeek - 1, date: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) },
        ];
        
        await db.homework.bulkAdd(homeworkToAdd);
        const allHomework = await db.homework.toArray();
        const homeworkIds = allHomework.map(h => h.id!);

        // --- Create Mock Submissions ---
        const submissionsToAdd: Omit<Submission, 'id'>[] = [];
        const statuses: HomeworkStatus[] = ["Godkjent", "Ikke levert", "Må rettes", "Syk/Fravær", "Glemt bok"];
        studentIds.forEach(studentId => {
            homeworkIds.forEach(homeworkId => {
                const chance = Math.random();
                if (chance > 0.1) { // 90% chance of a submission
                    let status: HomeworkStatus = "Godkjent";
                    if (chance < 0.2) status = "Ikke levert";
                    else if (chance < 0.25) status = "Må rettes";
                    submissionsToAdd.push({
                        studentId,
                        homeworkId,
                        status,
                        comment: status === "Må rettes" ? "Gjør oppgavene på nytt." : undefined,
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

        console.log("Database has been reset and seeded with extensive demo data.");
    });
}
