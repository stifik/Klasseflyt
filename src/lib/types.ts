
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

export type Remark = {
  id: string;
  studentId: string;
  date: Date;
  period: number;
};

export type SeatingChartData = (string[] | null)[][];

// The chart is stored as a JSON string in Firestore to avoid nested array issues.
export type SeatingChartRecord = {
  id: string;
  chartJson: string; // Stored as a JSON string
  rows: number;
  cols: number;
  createdAt: Date;
};

export type SeatingLayout = {
  id: string;
  name: string;
  rows: number;
  cols: number;
  layout: boolean[][]; 
  layoutJson: string; // Stored as a JSON string
  seatCount: number;
  createdAt: Date;
};

export type TabKey = 'overview' | 'dailyCheck' | 'remarks' | 'reports' | 'seatingChart' | 'groupTool' | 'studentPicker';

export type ReportSettings = {
  includeHomework: boolean;
  includeIpad: boolean;
  includeRemarks: boolean;
  includePositiveFeedback: boolean;
  greeting: string;
  closing: string;
  teacherName: string;
};

export type PeriodTime = {
    period: number;
    startTime: string;
    endTime: string;
};

export type AppSettings = {
  tabs: Record<TabKey, boolean>;
  tabOrder: TabKey[];
  reportSettings: ReportSettings;
  schedule: PeriodTime[];
  selectedSeatingLayoutId?: string | null;
};
