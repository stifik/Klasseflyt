import type { Student, Subject, Homework, Submission, DailyCheck, HomeworkStatus, Remark, SeatingChartData } from './types';

// This file is no longer used by the application but is kept for reference.
// The seeding logic has been moved to a server action in firestore.ts

export const students: Student[] = [];
export const subjects: Subject[] = [];
export const homework: Homework[] = [];
export const submissions: Submission[] = [];
export const dailyChecks: DailyCheck[] = [];
export const remarks: Remark[] = [];
export const seatingChart: SeatingChartData | null = null;
