export type Student = {
  id: string;
  name: string;
};

export type Subject = {
  id: string;
  name: string;
};

export type HomeworkStatus = 'Godkjent' | 'Ikke levert' | 'Må rettes' | 'Syk/Fravær' | 'Glemt bok';

export type Homework = {
  id: string;
  title: string;
  subjectId: string;
  week: number;
  date: Date | { seconds: number, nanoseconds: number }; // Support Firestore Timestamp
};

export type Submission = {
  id: string;
  studentId: string;
  homeworkId: string;
  status: HomeworkStatus;
  comment?: string;
};

export type DailyCheck = {
  id: string;
  studentId: string;
  date: Date | { seconds: number, nanoseconds: number }; // Support Firestore Timestamp
  ipadCharged: boolean;
  ipadBrought: boolean;
};

declare global {
  interface Date {
    getWeek(): number;
  }
}
