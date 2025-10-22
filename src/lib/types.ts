

export type Student = {
  id?: number;
  name: string;
  points?: number; // Antall poeng, default 0 hvis ikke satt
};

export type Transaction = {
  id?: number;
  studentId: number;
  date: Date;
  pointsChange: number;
  description: string;
  paymentMethod?: 'manual' | 'nfc'; // How the transaction was made
  cardId?: string; // RFID card ID if paid with NFC
};

export type PurchasedReward = {
  id?: number;
  purchaseId: string;
  studentId: number;
  rewardId: number;
  rewardName: string;
  purchaseDate: Date;
  status: 'unused' | 'used';
};

export type Reward = {
  id: number;
  name: string;
  cost: number; // For backward compatibility (same as currentPrice initially)
  basePrice: number; // Base/starting price
  currentPrice: number; // Dynamic price that changes with demand
  emoji?: string;
};

export type RFIDCard = {
  id?: number;
  cardId: string; // The RFID UID (unique identifier)
  studentId: number;
  status: 'active' | 'blocked';
  createdAt: Date;
  lastUsed?: Date;
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

// Represents a "folder" for a student's submissions for a specific homework
export type Submission = {
  id?: number;
  studentId: string;
  homeworkId: number;
};

// Represents a single attempt/grading for a submission
export type SubmissionAttempt = {
  id?: number;
  submissionId: number;
  status: HomeworkStatus;
  comment?: string;
  date: Date;
};

export type DailyCheck = {
  id?: number;
  studentId: string;
  date: Date;
  ipadCharged: boolean;
  ipadBrought: boolean;
};

export type Absence = {
  id?: number;
  studentId: string;
  date: Date;
};

export type Remark = {
  id?: number;
  studentId: string;
  date: Date;
  period: number;
  type: string;
  message?: string;
  logGroupId?: string;
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

export type Test = {
  id?: number;
  title: string;
  subjectId: string;
  date: Date;
  maxScore: number;
  linkedGoalIds?: string[]; // New field to link learning goals
};

export type TestResult = {
  id?: number;
  studentId: string;
  testId: number;
  score: number | null;
  comment?: string;
  reportedInWeek?: number;
};

export type LearningGoal = {
  id: string;
  title: string;
  description?: string;
  subjectId: string;
  createdAt: Date;
};

export type GoalStatus = 'NotAchieved' | 'InProgress' | 'Achieved';

export type GoalAchievement = {
  id: string;
  studentId: string;
  goalId: string;
  status: GoalStatus;
  updatedAt: Date;
};


export type SeatingChartData = (string[] | null)[][];

export type SeatingChartRecord = {
  id?: number;
  chartJson: string; // Stored as a JSON string
  rows: number;
  cols: number;
  createdAt: Date;
};

export type LockedDesk = {
    deskId: string; // "rowIndex-colIndex"
    studentName: string;
};

export type SeatingLayout = {
  id?: string;
  name: string;
  rows: number;
  cols: number;
  layout: boolean[][]; 
  seatCount: number;
  createdAt: Date;
  lockedDesks?: LockedDesk[];
};

export type AvoidPair = [string, string];
export type PlacementRule = { studentName: string; placement: 'front' | 'back' };

export type SeatingChartRules = {
  avoidPairs: AvoidPair[];
  placementRules: PlacementRule[];
  avoidSameNeighbors: boolean;
}

export type GroupingRules = {
  keepTogether: string[][];
  keepApart: AvoidPair[];
};


export type TabKey = 'overview' | 'dailyCheck' | 'observations' | 'reports' | 'classroomTools' | 'settings' | 'assessments';

export type DashboardToolKey = 
  | 'overview' 
  | 'assessments'
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
  | 'reports.analysis'
  | 'rewardDashboard'
  | 'rewardStore'
  | 'activityFeed'
  | 'terminal';

export type DashboardConfig = {
    key: DashboardToolKey;
    visible: boolean;
};

export type ReportSettings = {
  // Weekly Summary Settings
  includeHomework: boolean;
  includeIpad: boolean;
  includeRemarks: boolean;
  includePositiveFeedback: boolean;
  includeTests: boolean;
  greeting: string;
  closing: string;
  teacherName: string;
  positiveFeedbackMessage?: string;
  positiveFeedbackHomework?: string;
  positiveFeedbackIpad?: string;
  positiveFeedbackBoth?: string;
  
  // Secret Agent Settings
  includeSecretAgent?: boolean;
  secretAgentMessage?: string;

  // Student Report Settings
  includeHomeworkInReport?: boolean;
  includeIpadInReport?: boolean;
  includeRemarksInReport?: boolean;
  includeHourlyCheckInReport?: boolean;
  includeTestsInReport?: boolean;
  includeLearningGoalsInReport?: boolean;
};

export type PeriodTime = {
    period: number;
    startTime: string;
    endTime: string;
};

export type DPIAAnalysis = {
  scope: string;
  values: string;
  unwantedEvents: string;
  probabilityAndConsequence: string;
  measures: string;
  dataProcessingDescription: string;
  necessityAndProportionality: string;
  riskAssessment: string;
  riskMeasures: string;
};

export type Workstation = {
  id: string;
  name: string;
  capacity?: number;
};

export type GroupInSet = {
  id: string; // Unique ID for this group within this set
  studentIds: string[];
};

export type GroupSet = {
  id?: string;
  name: string;
  createdAt: Date;
  groups: GroupInSet[];
};

export type StationAssignmentLog = {
  id?: number;
  studentId: string;
  stationId: string;
  date: Date;
  groupSetId?: string; // Optional: ID of the GroupSet
  groupId?: string;    // Optional: ID of the specific group within the set
};

export type PickerGroup = {
  id?: string;
  name: string;
  studentIds: string[];
  createdAt: Date;
};

export type PickerLog = {
  id?: number;
  groupId: string;
  studentId: string;
  date: Date;
};

export type PickerColor = 'default' | 'blue' | 'green' | 'yellow' | 'red' | 'rainbow';

export type PickerSettings = {
    animationDuration: number;
    soundEnabled: boolean;
    animationColor: PickerColor;
};


export type ClassGoal = {
  target: number; // Målsum for felles belønning
  lastAchieved?: string; // ISO-dato for sist oppnådd
};

export type RewardSystemSettings = {
  mode: 'simple' | 'dynamic'; // Simple = statiske priser, Dynamic = børs
  priceIncreasePercent: number; // Default 5 - hvor mye kjøpt vare øker
  priceDecreasePercent: number; // Default 2 - hvor mye andre varer synker
  priceFloorPercent: number; // Default 50 - minimum pris som % av basePrice
  priceCeilingPercent: number; // Default 200 - maksimum pris som % av basePrice
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
  workstations?: Workstation[];
  dpiaAnalysis?: DPIAAnalysis;
  onboardingCompleted?: boolean;
  seatingChartRules?: SeatingChartRules;
  groupingRules?: GroupingRules;
  pickerSettings?: PickerSettings;
  classGoal?: ClassGoal;
  communityGoalTitle?: string;
  rewardSystem?: RewardSystemSettings;
  nfcEnabled?: boolean; // Enable/disable NFC scanning feature
};
