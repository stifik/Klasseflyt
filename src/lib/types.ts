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
  date: Date;
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
  date: Date;
  ipadCharged: boolean;
  ipadBrought: boolean;
};

export type SeatingChartData = (string[] | null)[][];

export type SeatingChartRecord = {
  id: string;
  chart: SeatingChartData;
  createdAt: Date;
};
