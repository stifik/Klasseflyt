

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
  studentId: number;
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
  studentId: number;
  date: Date;
  ipadCharged: boolean;
  ipadBrought: boolean;
  registrationMethod?: 'manual' | 'nfc';
  registeredAt?: Date;
  sessionId?: string; // optional session identifier to support multiple check-in periods per day
};

export type NFCRegistrationSession = {
  id: string; // Date string: YYYY-MM-DD
  date: Date;
  startTime: Date;
  endTime?: Date;
  isActive: boolean;
  isCompleted: boolean;
};

// Check-in system types
export type BellTime = {
  id?: number;
  weekday: 'mandag' | 'tirsdag' | 'onsdag' | 'torsdag' | 'fredag';
  time: string; // HH:MM format
  points: number;
  type: 'morgen' | 'ordinær';
};

export type CheckInLog = {
  id?: number;
  studentId: number;
  bellTimeId: number;
  timestamp: Date;
  pointsPercent: 100 | 50 | 10;
  pointsAwarded: number;
  date: Date; // For easy filtering by date
};

export type CheckInSettings = {
  // Morning check-in (with absence registration)
  morning: {
    percent100Minutes: number; // Default: 3
    percent50Minutes: number;  // Default: 5
    percent10Minutes: number;  // Default: 7
    absenceMinutes: number;    // Default: 7
    postCloseGraceMinutes?: number; // Optional grace period to keep red after absence window
  };
  // Regular check-in
  regular: {
    percent100Minutes: number; // Default: 3
    stopMinutes: number;       // Default: 3
    postCloseGraceMinutes?: number; // Optional grace period to keep red after stop
  };
};

// Morning Display types
export type WelcomeMessage = {
  id?: number;
  message: string;
  createdAt?: Date;
};

export type InstructionMessage = {
  id?: number;
  message: string;
  createdAt?: Date;
};

export type ScheduleSession = {
  id: number;
  time: string; // HH:MM format
  subject: string;
  topic: string;
};

export type ScheduleTemplate = {
  id?: number;
  name: string;
  dayOfWeek?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
  sessions: ScheduleSession[];
  createdAt?: Date;
  updatedAt?: Date;
};

export type LessonPlan = {
  id?: number;
  sessionId: number; // Links to the session ID
  templateId: number; // Links to which template this belongs to
  date: string; // YYYY-MM-DD format
  subject: string; // Snapshot from session
  topic: string; // Snapshot from session
  time: string; // Snapshot from session
  objectives: string[]; // Learning objectives for the lesson
  activities: string[]; // Activities/flow without timestamps
  notes?: string; // Optional teacher notes
  createdAt?: Date;
  updatedAt?: Date;
};

export type Theme = {
  id?: number;
  name: string;
  type: 'predefined' | 'custom';
  colors: string[]; // Array of hex colors
  isSystem: boolean; // true for predefined themes
  createdAt?: Date;
};

export type UserThemePreference = {
  id?: number;
  themeId: number;
  isActive: boolean; // Whether this theme is active for rotation
};

export type ThemeHistory = {
  id?: number;
  themeId: number;
  date: string; // YYYY-MM-DD
};

export type MorningDisplaySettings = {
  className: string;
  messageRotationMode: 'daily' | 'per-ringetid';
  instructionRotationMode: 'daily' | 'per-ringetid';
  lastThemeId?: number;
  lastThemeDate?: string;
  useTimeBasedMessages?: boolean; // Enable/disable time-based message system
};

// Time-based message system types
export type TimePeriod = {
  id?: number;
  name: string; // e.g., "Morgen", "Etter 1. friminutt"
  startTime: string; // HH:MM format
  order: number; // For sorting (1, 2, 3...)
  createdAt?: Date;
};

export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

export type TimeBasedMessage = {
  id?: number;
  weekday: Weekday;
  timePeriodId: number;
  messageType: 'welcome' | 'instruction';
  messages: string; // One message per line
  createdAt?: Date;
  updatedAt?: Date;
};

export type DefaultMessage = {
  id?: number;
  messageType: 'welcome' | 'instruction';
  messages: string; // One message per line
  createdAt?: Date;
  updatedAt?: Date;
};

export type Absence = {
  id?: number;
  studentId: number;
  date: Date;
};

export type Remark = {
  id?: number;
  studentId: number;
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
    studentId: number;
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
  studentId: number;
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
  studentId: number;
  goalId: string;
  status: GoalStatus;
  updatedAt: Date;
};


export type SeatingChartData = (string[] | null)[][];

export type SeatingChartRecord = {
  id?: number;
  chartJson: string; // Stored as a JSON string
  rows?: number;
  cols?: number;
  createdAt: Date;
  source?: 'generation' | 'drag' | 'load';
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
  | 'terminal'
  | 'morning-display';

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
  studentIds: number[];
};

export type GroupSet = {
  id?: string;
  name: string;
  createdAt: Date;
  groups: GroupInSet[];
};

export type StationAssignmentLog = {
  id?: number;
  studentId: number;
  stationId: string;
  date: Date;
  groupSetId?: string; // Optional: ID of the GroupSet
  groupId?: string;    // Optional: ID of the specific group within the set
};

export type PickerGroup = {
  id?: string;
  name: string;
  studentIds: number[];
  createdAt: Date;
};

export type PickerLog = {
  id?: number;
  groupId: string;
  studentId: number;
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
  transferFeePercent: number; // Default 10 - kostnad ved overføring av poeng mellom elever
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
  checkInSettings?: CheckInSettings; // Auto check-in system settings
  morningDisplaySettings?: MorningDisplaySettings; // Morning display settings
};
