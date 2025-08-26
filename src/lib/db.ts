

import Dexie, { type Table } from 'dexie';
import type { Student, Subject, Homework, Submission, DailyCheck, Remark, SeatingChartRecord, SeatingLayout, AppSettings, HomeworkStatus, HourlyCheck, BehaviorType, DashboardToolKey, DashboardConfig } from './types';
import { getWeekNumber } from './utils';
import { v4 as uuidv4 } from 'uuid';


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

        // Version 5: Make HourlyCheck behavior configurable
        this.version(5).stores({
            hourlyChecks: '++id, studentId, date, period, behaviorId'
        }).upgrade(async (tx) => {
            // Rename 'behavior' to 'behaviorId' and set default value
            await tx.table('hourlyChecks').toCollection().modify(check => {
                if (check.behavior) {
                    let behaviorId = 'workedWell'; // default
                    if (check.behavior === 'Disturbed') behaviorId = 'disturbed';
                    if (check.behavior === 'HelpedOthers') behaviorId = 'helpedOthers';
                    check.behaviorId = behaviorId;
                    delete check.behavior;
                }
            });
            // Add default behaviorTypes to settings
            const userSettings = await tx.table('settings').get('userSettings');
            if (userSettings && !userSettings.behaviorTypes) {
                userSettings.behaviorTypes = defaultBehaviorTypes;
                await tx.table('settings').put(userSettings);
            }
        });

        // Version 6: Add icon and color to BehaviorType
        this.version(6).stores({}).upgrade(async (tx) => {
            const userSettings = await tx.table('settings').get('userSettings');
            if (userSettings && userSettings.behaviorTypes) {
                const updatedTypes = userSettings.behaviorTypes.map((type: any) => {
                    // If type is a string, convert to object with defaults
                    if (typeof type === 'string') {
                        return { id: uuidv4(), label: type, icon: 'Star', color: 'gray' };
                    }
                    // If it's an object but lacks new properties, add them
                    if (!type.icon || !type.color) {
                        let icon = 'Star';
                        let color: BehaviorType['color'] = 'blue';
                        if (type.id === 'workedWell') { icon = 'Smile'; color = 'green'; }
                        if (type.id === 'disturbed') { icon = 'Annoyed'; color = 'yellow'; }
                        if (type.id === 'helpedOthers') { icon = 'Handshake'; color = 'blue'; }
                        return { ...type, icon, color };
                    }
                    return type;
                });
                userSettings.behaviorTypes = updatedTypes;
                await tx.table('settings').put(userSettings);
            }
        });
        
        // Version 7: Restructure navigation
        this.version(7).stores({}).upgrade(async (tx) => {
             const userSettings = await tx.table('settings').get('userSettings');
             if (userSettings) {
                // Rename/remove old keys
                userSettings.tabs.observations = userSettings.tabs.hourlyCheck || userSettings.tabs.remarks;
                delete userSettings.tabs.hourlyCheck;
                delete userSettings.tabs.remarks;
                delete userSettings.tabs.seatingChart;
                
                // Update tabOrder
                const newTabOrder: (string | undefined)[] = userSettings.tabOrder.map((tab: string) => {
                    if (tab === 'hourlyCheck' || tab === 'remarks') return 'observations';
                    if (tab === 'seatingChart') return undefined; // remove
                    return tab;
                });
                
                // Remove duplicates and undefined
                userSettings.tabOrder = [...new Set(newTabOrder.filter(t => t))] as any[];

                await tx.table('settings').put(userSettings);
             }
        });
        
        // Version 8: Add dashboard configuration
        this.version(8).stores({}).upgrade(async (tx) => {
            const userSettings = await tx.table('settings').get('userSettings');
            if (userSettings && !userSettings.dashboardTools) {
                userSettings.dashboardTools = defaultDashboardTools;
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

const defaultBehaviorTypes: BehaviorType[] = [
    { id: 'workedWell', label: 'Jobbet godt', icon: 'Smile', color: 'green' },
    { id: 'disturbed', label: 'Forstyrret', icon: 'Annoyed', color: 'yellow' },
    { id: 'helpedOthers', label: 'Hjalp andre', icon: 'Handshake', color: 'blue' }
];

const defaultDashboardTools: DashboardConfig[] = [
    { key: 'overview', visible: true },
    { key: 'dailyCheck', visible: true },
    { key: 'observations.hourly', visible: true },
    { key: 'observations.remarks', visible: false },
    { key: 'classroomTools.seatingChart', visible: true },
    { key: 'classroomTools.groupTool', visible: true },
    { key: 'classroomTools.studentPicker', visible: true },
    { key: 'reports.summary', visible: false },
    { key: 'reports.studentReports', visible: false },
    { key: 'reports.analysis', visible: true },
];

const defaultSettings: AppSettings = {
  tabs: {
    overview: true, dailyCheck: true, observations: true, reports: true,
    classroomTools: true,
    settings: true,
  },
  tabOrder: ['overview', 'dailyCheck', 'observations', 'classroomTools', 'reports'],
  dashboardTools: defaultDashboardTools,
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
  behaviorTypes: defaultBehaviorTypes,
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
        const settingsToPut: AppSettings & { id: string } = { 
            id: 'userSettings',
            tabs: defaultSettings.tabs,
            tabOrder: defaultSettings.tabOrder,
            dashboardTools: defaultSettings.dashboardTools,
            reportSettings: {
                ...defaultSettings.reportSettings,
                teacherName: 'Læreren'
            },
            schedule: defaultSettings.schedule,
            selectedSeatingLayoutId: defaultSettings.selectedSeatingLayoutId,
            remarkTypes: defaultSettings.remarkTypes,
            behaviorTypes: defaultSettings.behaviorTypes,
            onboardingCompleted: true,
        };
        await db.settings.put(settingsToPut);
        

        // Add students and subjects
        await db.students.bulkAdd(mockStudents);
        await db.subjects.bulkAdd(mockSubjects);

        const allSubjects = await db.subjects.toArray();
        const allStudents = await db.students.toArray();

        const norskSubject = allSubjects.find(s => s.name === 'Norsk');
        const engelskSubject = allSubjects.find(s => s.name === 'Engelsk');
        const matteSubject = allSubjects.find(s => s.name === 'Matematikk');
        const naturfagSubject = allSubjects.find(s => s.name === 'Naturfag');

        // --- Create Mock Homework ---
        const today = new Date();
        const thisWeek = getWeekNumber(today);
        const homeworkToAdd: Omit<Homework, 'id'>[] = [];

        if (norskSubject?.id) homeworkToAdd.push({ title: "Lesing kap. 2", subjectId: norskSubject.id, week: thisWeek, date: new Date() });
        if (engelskSubject?.id) homeworkToAdd.push({ title: "Gloser", subjectId: engelskSubject.id, week: thisWeek, date: new Date() });
        if (matteSubject?.id) homeworkToAdd.push({ title: "Oppg. 3.1-3.5", subjectId: matteSubject.id, week: thisWeek, date: new Date() });
        if (naturfagSubject?.id) homeworkToAdd.push({ title: "Verdensrommet", subjectId: naturfagSubject.id, week: thisWeek - 1, date: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) });
        
        await db.homework.bulkAdd(homeworkToAdd);
        const addedHomework = await db.homework.toArray();
        const homeworkIds = addedHomework.map(h => h.id!);


        // --- Create Mock Submissions ---
        const submissionsToAdd: Omit<Submission, 'id'>[] = [];
        allStudents.forEach(student => {
            homeworkIds.forEach(homeworkId => {
                const chance = Math.random();
                if (chance > 0.1) { // 90% chance of a submission
                    let status: HomeworkStatus = "Godkjent";
                    let isDelayed = false;
                    if (chance < 0.2) { status = "Ikke levert"; isDelayed = true; }
                    else if (chance < 0.25) { status = "Må rettes"; isDelayed = true; }
                    submissionsToAdd.push({
                        studentId: student.id!,
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
            allStudents.forEach(student => {
                const chance = Math.random();
                if (chance < 0.1) {
                    dailyChecksToAdd.push({ studentId: student.id!, date, ipadCharged: true, ipadBrought: false });
                } else if (chance < 0.2) {
                    dailyChecksToAdd.push({ studentId: student.id!, date, ipadCharged: false, ipadBrought: true });
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
                    studentId: allStudents[Math.floor(Math.random() * allStudents.length)].id!,
                    date,
                    period: Math.floor(Math.random() * 5) + 1,
                    type: remarkTypes[Math.floor(Math.random() * remarkTypes.length)]
                });
            }
        }
        await db.remarks.bulkAdd(remarksToAdd);
        
        // --- Create Mock Hourly Checks ---
        const hourlyChecksToAdd: Omit<HourlyCheck, 'id'>[] = [];
        const behaviorTypes = defaultSettings.behaviorTypes || [];
        for (let i = 0; i < 7; i++) { // Last 7 days
            const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
            if (date.getDay() === 0 || date.getDay() === 6) continue;
            
            for (let period = 1; period <= 6; period++) {
                allStudents.forEach(student => {
                    const chance = Math.random();
                     if (chance < 0.6) {
                        hourlyChecksToAdd.push({ studentId: student.id!, date, period, behaviorId: behaviorTypes.find(b => b.id === 'workedWell')?.id || 'workedWell' });
                    }
                    if (chance > 0.9) {
                        hourlyChecksToAdd.push({ studentId: student.id!, date, period, behaviorId: behaviorTypes.find(b => b.id === 'disturbed')?.id || 'disturbed' });
                    }
                    if (chance > 0.5 && chance < 0.55) {
                        hourlyChecksToAdd.push({ studentId: student.id!, date, period, behaviorId: behaviorTypes.find(b => b.id === 'helpedOthers')?.id || 'helpedOthers' });
                    }
                });
            }
        }
        await db.hourlyChecks.bulkAdd(hourlyChecksToAdd);


        console.log("Database has been reset and seeded with extensive demo data.");
    });
}
