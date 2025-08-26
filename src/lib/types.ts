

export type Student = {
  id?: string;
  name: string;
};

export type Subject = {
  id?: string;
  name: string;
};

export type HomeworkStatus = 'Godkjent' | 'Ikke levert' | 'Må rettes' | 'Syk/Fravær' | 'Glemt bok';

export type Homework = {
  id?: number;
  title: string;
  subjectId: string;
  week: number;
  date: Date;
};

export type Submission = {
  id?: number;
  studentId: string;
  homeworkId: number;
  status: HomeworkStatus;
  comment?: string;
  isDelayed?: boolean; // New field to track if it was ever late/incomplete
};

export type DailyCheck = {
  id?: number;
  studentId: string;
  date: Date;
  ipadCharged: boolean;
  ipadBrought: boolean;
};

export type Remark = {
  id?: number;
  studentId: string;
  date: Date;
  period: number;
  type?: string;
};

export type BehaviorType = {
  id: string;
  label: string;
  icon: string;
  color: 'green' | 'yellow' | 'blue' | 'red' | 'purple' | 'gray';
};

export type HourlyCheck = {
    id?: number;
    studentId: string;
    date: Date;
    period: number;
    behaviorId: string;
};


export type SeatingChartData = (string[] | null)[][];

export type SeatingChartRecord = {
  id?: number;
  chartJson: string; // Stored as a JSON string
  rows: number;
  cols: number;
  createdAt: Date;
};

export type SeatingLayout = {
  id?: string;
  name: string;
  rows: number;
  cols: number;
  layout: boolean[][]; 
  seatCount: number;
  createdAt: Date;
};

export type TabKey = 'overview' | 'dailyCheck' | 'observations' | 'reports' | 'classroomTools' | 'settings';

export type DashboardToolKey = 
  | 'overview' 
  | 'dailyCheck' 
  | 'observations'
  | 'observations.hourly' 
  | 'observations.remarks' 
  | 'classroomTools'
  | 'classroomTools.seatingChart' 
  | 'classroomTools.groupTool' 
  | 'classroomTools.studentPicker' 
  | 'reports'
  | 'reports.summary' 
  | 'reports.studentReports' 
  | 'reports.analysis';

export type DashboardConfig = {
    key: DashboardToolKey;
    visible: boolean;
};

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
  dashboardTools: DashboardConfig[];
  reportSettings: ReportSettings;
  schedule: PeriodTime[];
  selectedSeatingLayoutId?: string | null;
  remarkTypes?: string[];
  behaviorTypes?: BehaviorType[];
  onboardingCompleted?: boolean;
};
