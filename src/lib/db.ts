
import Dexie, { type Table } from 'dexie';
import type { Student, Subject, Homework, Submission, DailyCheck, Remark, SeatingChartRecord, SeatingLayout, AppSettings } from './types';

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
        super('LeksehjelperenDB');
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
  },
  tabOrder: ['overview', 'dailyCheck', 'remarks', 'reports', 'seatingChart', 'groupTool', 'studentPicker', 'remarkAnalysis'],
  reportSettings: {
    includeHomework: true, includeIpad: true, includeRemarks: true,
    includePositiveFeedback: false, greeting: "Hei,", closing: "Vennlig hilsen,", teacherName: "Læreren"
  },
  schedule: [
    { period: 1, startTime: "08:30", endTime: "09:30" },
    { period: 2, startTime: "09:45", endTime: "10:45" },
    { period: 3, startTime: "11:30", endTime: "12:30" },
    { period: 4, startTime: "12:45", endTime: "13:45" },
    { period: 5, startTime: "14:00", endTime: "15:00" },
    { period: 6, startTime: "", endTime: "" },
  ],
  selectedSeatingLayoutId: null,
  remarkTypes: ["Generell", "Forstyrrer andre", "Mangler utstyr", "Upassende språk", "Gjorde en god innsats"],
};


// Function to clear all data and re-seed with mock data
export async function resetDatabase() {
    await db.transaction('rw', db.tables, async () => {
        // Clear all tables
        await Promise.all(db.tables.map(table => table.clear()));

        // Add mock data
        await db.students.bulkAdd(mockStudents);
        await db.subjects.bulkAdd(mockSubjects);
        await db.settings.put({ id: 'userSettings', ...defaultSettings });
        console.log("Database has been reset and seeded.");
    });
}
