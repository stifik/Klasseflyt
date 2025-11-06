

import Dexie, { type Table } from 'dexie';
import type { Student, Subject, Homework, Submission, DailyCheck, Remark, SeatingChartRecord, SeatingLayout, AppSettings, HomeworkStatus, HourlyCheck, BehaviorType, DashboardToolKey, DashboardConfig, DPIAAnalysis, Test, TestResult, LearningGoal, GoalAchievement, Workstation, StationAssignmentLog, GroupSet, PickerGroup, PickerLog, Absence, SubmissionAttempt, Transaction, PurchasedReward, Reward, RFIDCard, NFCRegistrationSession, BellTime, CheckInLog, CheckInSettings, WelcomeMessage, InstructionMessage, ScheduleTemplate, ThemeHistory, MorningDisplaySettings, LessonPlan, Theme, UserThemePreference, TimePeriod, TimeBasedMessage, DefaultMessage, CommunityReward, CommunityDonation } from './types';
import { getWeekNumber } from './utils';
import { v4 as uuidv4 } from 'uuid';

// Import PositiveAction type
export type PositiveAction = {
  id: number;
  name: string;
  points: number;
  type: 'system' | 'manual';
  actionKey?: 'IPAD_CHARGED' | 'HOMEWORK_APPROVED' | 'SECRET_AGENT_PASSED';
  emoji?: string;
};

// Define the database schema
export class MySubClassedDexie extends Dexie {
    students!: Table<Student, number>;
    subjects!: Table<Subject, string>;
    homework!: Table<Homework, number>;
    submissions!: Table<Submission, number>;
    submissionAttempts!: Table<SubmissionAttempt, number>;
    dailyChecks!: Table<DailyCheck, number>;
    absences!: Table<Absence, number>;
    remarks!: Table<Remark, number>;
    hourlyChecks!: Table<HourlyCheck, number>;
    seatingChartHistory!: Table<SeatingChartRecord, number>;
    seatingLayouts!: Table<SeatingLayout, string>;
    settings!: Table<AppSettings & { id: string }, string>;
    tests!: Table<Test, number>;
    testResults!: Table<TestResult, number>;
    learningGoals!: Table<LearningGoal, string>;
    goalAchievements!: Table<GoalAchievement, string>;
    stationAssignmentLogs!: Table<StationAssignmentLog, number>;
    groupSets!: Table<GroupSet, string>;
    pickerGroups!: Table<PickerGroup, string>;
    pickerLogs!: Table<PickerLog, number>;
    transactions!: Table<Transaction, number>;
    purchasedRewards!: Table<PurchasedReward, number>;
    rewards!: Table<Reward, number>;
    actions!: Table<PositiveAction, number>;
    rfidCards!: Table<RFIDCard, number>;
    secretAgent!: Table<{ id: string; studentId: number; studentName: string; mission: string; date: Date; status: 'pending' | 'analyzing' | 'passed' | 'failed' }, string>;
    secretAgentHistory!: Table<{ id?: number; studentId: number; studentName: string; mission: string; date: Date; status: 'passed' | 'failed' }, number>;
    nfcRegistrationSessions!: Table<NFCRegistrationSession, string>;
    bellTimes!: Table<BellTime, number>;
    checkInLogs!: Table<CheckInLog, number>;
    welcomeMessages!: Table<WelcomeMessage, number>;
    instructionMessages!: Table<InstructionMessage, number>;
    scheduleTemplates!: Table<ScheduleTemplate, number>;
    themes!: Table<Theme, number>;
    userThemePreferences!: Table<UserThemePreference, number>;
    themeHistory!: Table<ThemeHistory, number>;
    lessonPlans!: Table<LessonPlan, number>;
    timePeriods!: Table<TimePeriod, number>;
    timeBasedMessages!: Table<TimeBasedMessage, number>;
    defaultMessages!: Table<DefaultMessage, number>;
    communityRewards!: Table<CommunityReward, number>;
    communityDonations!: Table<CommunityDonation, number>;


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
        this.version(3).stores({});
        
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
        
        this.version(8).stores({}).upgrade(async (tx) => {
            const userSettings = await tx.table('settings').get('userSettings');
            if (userSettings && !userSettings.dashboardTools) {
                userSettings.dashboardTools = defaultDashboardTools;
                await tx.table('settings').put(userSettings);
            }
        });
        
        // Version 9: Add message and logGroupId to remarks
        this.version(9).stores({
            remarks: '++id, studentId, date, period, logGroupId'
        }).upgrade(async (tx) => {
            await tx.table('remarks').toCollection().modify(remark => {
                if (!remark.logGroupId) {
                    remark.logGroupId = uuidv4();
                }
                if (!remark.message) {
                    remark.message = remark.type; // Backfill message from old type
                }
            });
        });
        
        // Version 10: Add DPIA settings
        this.version(10).stores({}).upgrade(async (tx) => {
            const userSettings = await tx.table('settings').get('userSettings');
            if (userSettings && !userSettings.dpiaAnalysis) {
                userSettings.dpiaAnalysis = defaultDPIAAnalysis;
                await tx.table('settings').put(userSettings);
            }
        });

        // Version 11: Add tests and testResults tables for Assessments feature
        this.version(11).stores({
            tests: '++id, subjectId, date',
            testResults: '++id, &[studentId+testId], studentId, testId',
        }).upgrade(async (tx) => {
            const userSettings = await tx.table('settings').get('userSettings');
            if (userSettings) {
                if (userSettings.tabs.assessments === undefined) {
                    userSettings.tabs.assessments = true;
                }
                if (!userSettings.tabOrder.includes('assessments')) {
                    const overviewIndex = userSettings.tabOrder.indexOf('overview');
                    userSettings.tabOrder.splice(overviewIndex + 1, 0, 'assessments');
                }
                 // Add assessments to dashboard tools if it doesn't exist
                if (userSettings.dashboardTools && !userSettings.dashboardTools.find((t: DashboardConfig) => t.key === 'assessments')) {
                    const overviewIndex = userSettings.dashboardTools.findIndex((t: DashboardConfig) => t.key === 'overview');
                    if (overviewIndex !== -1) {
                         userSettings.dashboardTools.splice(overviewIndex + 1, 0, { key: 'assessments' as DashboardToolKey, visible: true });
                    } else {
                        userSettings.dashboardTools.push({ key: 'assessments' as DashboardToolKey, visible: true });
                    }
                }
                if (userSettings.reportSettings.includeTests === undefined) {
                    userSettings.reportSettings.includeTests = false;
                }
                await tx.table('settings').put(userSettings);
            }
        });

        this.version(12).stores({
            learningGoals: 'id, subjectId',
            goalAchievements: 'id, &[studentId+goalId], studentId, goalId'
        });

        // Version 13: Add linkedGoalIds to tests table
        this.version(13).stores({
            tests: '++id, subjectId, date, *linkedGoalIds',
        });

        // Version 14: Add student report settings
        this.version(14).stores({}).upgrade(async (tx) => {
            const userSettings = await tx.table('settings').get('userSettings');
            if (userSettings) {
                const reportSettings = userSettings.reportSettings || {};
                if (reportSettings.includeHomeworkInReport === undefined) {
                    reportSettings.includeHomeworkInReport = true;
                }
                if (reportSettings.includeIpadInReport === undefined) {
                    reportSettings.includeIpadInReport = true;
                }
                if (reportSettings.includeRemarksInReport === undefined) {
                    reportSettings.includeRemarksInReport = true;
                }
                if (reportSettings.includeHourlyCheckInReport === undefined) {
                    reportSettings.includeHourlyCheckInReport = true;
                }
                if (reportSettings.includeTestsInReport === undefined) {
                    reportSettings.includeTestsInReport = true;
                }
                if (reportSettings.includeLearningGoalsInReport === undefined) {
                    reportSettings.includeLearningGoalsInReport = true;
                }
                userSettings.reportSettings = reportSettings;
                await tx.table('settings').put(userSettings);
            }
        });

        // Version 15: Add lockedDesks to seatingLayouts
        this.version(15).stores({
            seatingLayouts: '++id, name, *lockedDesks'
        });

        // Version 16: Add default values for positive feedback text templates
        this.version(16).stores({}).upgrade(async (tx) => {
            const userSettings = await tx.table('settings').get('userSettings');
            if (userSettings && userSettings.reportSettings) {
                const { reportSettings } = userSettings;
                if (!reportSettings.positiveFeedbackMessage) {
                    reportSettings.positiveFeedbackMessage = "Alt har vært helt supert! God innsats.";
                }
                if (!reportSettings.positiveFeedbackHomework) {
                    reportSettings.positiveFeedbackHomework = "Alle lekser denne uken er godkjent. Veldig bra!";
                }
                if (!reportSettings.positiveFeedbackIpad) {
                    reportSettings.positiveFeedbackIpad = "Full pott på iPad-ansvar denne uken. Supert!";
                }
                if (!reportSettings.positiveFeedbackBoth) {
                    reportSettings.positiveFeedbackBoth = "Veldig bra innsats med både lekser og iPad-ansvar denne uken!";
                }
                userSettings.reportSettings = reportSettings;
                await tx.table('settings').put(userSettings);
            }
        });
        
        this.version(17).stores({
            stationAssignmentLogs: '++id, &[studentId+date], studentId, date',
        }).upgrade(async (tx) => {
            const userSettings = await tx.table('settings').get('userSettings');
            if (userSettings && !userSettings.workstations) {
                userSettings.workstations = [
                    { id: uuidv4(), name: 'Bibliotek' },
                    { id: uuidv4(), name: 'Grupperom 1' },
                    { id: uuidv4(), name: 'I klasserommet' },
                ];
                await tx.table('settings').put(userSettings);
            }
        });

        this.version(18).stores({
            groupSets: '++id, name, createdAt',
            stationAssignmentLogs: '++id, &[studentId+date], studentId, date, groupSetId, groupId',
        });

        this.version(19).stores({
            pickerGroups: '++id, name, createdAt',
            pickerLogs: '++id, groupId, studentId, date',
        });

        this.version(20).stores({
            absences: '++id, &[studentId+date], studentId, date',
        });

        this.version(21).stores({
            testResults: '++id, &[studentId+testId], studentId, testId, reportedInWeek',
        });
        
        // Version 22: Submission History
        this.version(22).stores({
            submissionAttempts: '++id, submissionId, date',
            submissions: '++id, &[studentId+homeworkId], studentId, homeworkId', // removed status and comment
        }).upgrade(async (tx) => {
            const oldSubmissions = await tx.table('submissions').toArray();
            if (oldSubmissions.length === 0) return;

            const newSubmissionsMap = new Map<string, { studentId: string, homeworkId: number, id?: number }>();
            
            // Create unique submission "folders"
            for (const oldSub of oldSubmissions) {
                const key = `${oldSub.studentId}-${oldSub.homeworkId}`;
                if (!newSubmissionsMap.has(key)) {
                    newSubmissionsMap.set(key, { studentId: oldSub.studentId, homeworkId: oldSub.homeworkId });
                }
            }

            const newSubmissions = Array.from(newSubmissionsMap.values());
            await tx.table('submissions').clear();
            const newSubmissionIds = await tx.table('submissions').bulkAdd(newSubmissions, { allKeys: true });

            const newAttempts: Omit<SubmissionAttempt, 'id'>[] = [];
            
            const newSubmissionsWithIds = newSubmissions.map((sub, index) => ({...sub, id: newSubmissionIds[index] as number}));
            const submissionIdMap = new Map(newSubmissionsWithIds.map(sub => [`${sub.studentId}-${sub.homeworkId}`, sub.id]));
            
            // Find corresponding homework to get the date
            const homeworks = await tx.table('homework').toArray();
            const homeworkDateMap = new Map(homeworks.map(h => [h.id, h.date]));

            for (const oldSub of oldSubmissions) {
                if (oldSub.status) { // Only migrate if there was a status
                    const submissionId = submissionIdMap.get(`${oldSub.studentId}-${oldSub.homeworkId}`);
                    if (submissionId) {
                         newAttempts.push({
                            submissionId: submissionId,
                            status: oldSub.status,
                            comment: oldSub.comment,
                            date: homeworkDateMap.get(oldSub.homeworkId) || new Date() // Fallback to now
                        });
                    }
                }
            }
            
            await tx.table('submissionAttempts').bulkAdd(newAttempts);
        });

        // Version 23: Add transactions table for reward system
        this.version(23).stores({
            transactions: '++id, studentId, date',
        });

        // Version 24: Add purchasedRewards table for gift card functionality
        this.version(24).stores({
            purchasedRewards: '++id, purchaseId, studentId, rewardId, status',
        });

        // Version 25: Add rewards table for dynamic pricing system
        this.version(25).stores({
            rewards: '++id, name',
        }).upgrade(async (tx) => {
            // Import default rewards
            const { defaultRewards } = await import('./rewards');
            await tx.table('rewards').bulkAdd(defaultRewards);
        });

        // Version 26: Add actions table for positive actions (POD)
        this.version(26).stores({
            actions: '++id, name, actionKey',
        }).upgrade(async (tx) => {
            // Import default positive actions
            const { positiveActions } = await import('./positiveActions');
            // Only add if table is empty
            const existingCount = await tx.table('actions').count();
            if (existingCount === 0) {
                await tx.table('actions').bulkAdd(positiveActions);
            }
        });

        // Version 27: Add secretAgent table for storing current secret agent
        this.version(27).stores({
            secretAgent: 'id, date',
        });

        // Version 28: Add secretAgentHistory table for storing agent history
        this.version(28).stores({
            secretAgentHistory: '++id, studentId, date',
        });

        // Version 29: Add emoji support for actions
        this.version(29).stores({}).upgrade(async (tx) => {
            // Add default emoji to existing actions if they don't have one
            await tx.table('actions').toCollection().modify(action => {
                if (!action.emoji) {
                    // Set default emojis based on actionKey or just use ⭐
                    if (action.actionKey === 'IPAD_CHARGED') action.emoji = '🔋';
                    else if (action.actionKey === 'HOMEWORK_APPROVED') action.emoji = '📚';
                    else if (action.actionKey === 'SECRET_AGENT_PASSED') action.emoji = '🕵️';
                    else action.emoji = '⭐';
                }
            });
        });

        // Version 30: Add emoji support for rewards
        this.version(30).stores({}).upgrade(async (tx) => {
            // Add default emoji to existing rewards if they don't have one
            await tx.table('rewards').toCollection().modify(reward => {
                if (!reward.emoji) {
                    reward.emoji = '🎁';
                }
            });
        });

        // Version 31: Add RFID card support
        this.version(31).stores({
            rfidCards: '++id, &cardId, studentId, status',
        });

        // Version 32: Add NFC registration sessions table for iPad check-in
        this.version(32).stores({
            nfcRegistrationSessions: 'id, date, isActive, isCompleted',
        });

        // Version 33: Add auto check-in system (bell times and check-in logs)
        this.version(33).stores({
            bellTimes: '++id, weekday, time, [weekday+time]',
            checkInLogs: '++id, &[studentId+bellTimeId+date], studentId, bellTimeId, date',
        }).upgrade(async (tx) => {
            const userSettings = await tx.table('settings').get('userSettings');
            if (userSettings && !userSettings.checkInSettings) {
                userSettings.checkInSettings = defaultCheckInSettings;
                await tx.table('settings').put(userSettings);
            }
        });

        // Version 34: Add morning display tables
        this.version(34).stores({
            welcomeMessages: '++id, createdAt',
            instructionMessages: '++id, createdAt',
            scheduleTemplates: '++id, name, dayOfWeek',
            themeHistory: '++id, date',
        }).upgrade(async (tx) => {
            const userSettings = await tx.table('settings').get('userSettings');
            if (userSettings && !userSettings.morningDisplaySettings) {
                userSettings.morningDisplaySettings = defaultMorningDisplaySettings;
                await tx.table('settings').put(userSettings);
            }
        });

        // Version 35: Add lesson plans table
        this.version(35).stores({
            lessonPlans: '++id, [templateId+sessionId+date], templateId, sessionId, date, subject',
        });

        // Version 36: Add themes and userThemePreferences tables
        this.version(36).stores({
            themes: '++id, name, type, isSystem',
            userThemePreferences: '++id, themeId, isActive',
        }).upgrade(async (tx) => {
            // Seed predefined themes
            const predefinedThemes = [
                { name: 'Ocean Breeze', type: 'predefined', colors: ['#667eea', '#764ba2', '#f093fb'], isSystem: true },
                { name: 'Sunset', type: 'predefined', colors: ['#f093fb', '#f5576c', '#fa709a'], isSystem: true },
                { name: 'Forest', type: 'predefined', colors: ['#4facfe', '#00f2fe', '#43e97b'], isSystem: true },
                { name: 'Lavender', type: 'predefined', colors: ['#c471f5', '#fa71cd', '#e0c3fc'], isSystem: true },
                { name: 'Peach', type: 'predefined', colors: ['#fa709a', '#fee140', '#ffecd2'], isSystem: true },
                { name: 'Mint', type: 'predefined', colors: ['#30cfd0', '#330867', '#667eea'], isSystem: true },
                { name: 'Fire', type: 'predefined', colors: ['#ff9a56', '#ff6a88', '#ff7eb3'], isSystem: true },
                { name: 'Sky', type: 'predefined', colors: ['#a1c4fd', '#c2e9fb', '#e0f9ff'], isSystem: true },
                { name: 'Rose', type: 'predefined', colors: ['#ffecd2', '#fcb69f', '#ff9a9e'], isSystem: true },
                { name: 'Northern Lights', type: 'predefined', colors: ['#00c6ff', '#0072ff', '#667eea'], isSystem: true },
                { name: 'Tropical', type: 'predefined', colors: ['#f857a6', '#ff5858', '#feca57'], isSystem: true },
                { name: 'Emerald', type: 'predefined', colors: ['#11998e', '#38ef7d', '#a8ff78'], isSystem: true },
                { name: 'Purple Dream', type: 'predefined', colors: ['#9d50bb', '#6e48aa', '#a8c0ff'], isSystem: true },
                { name: 'Coral', type: 'predefined', colors: ['#ff6b6b', '#feca57', '#ee5a6f'], isSystem: true },
                { name: 'Arctic', type: 'predefined', colors: ['#00d2ff', '#3a7bd5', '#00d2ff'], isSystem: true },
            ];

            // Add all predefined themes
            for (const theme of predefinedThemes) {
                const themeId = await tx.table('themes').add({
                    ...theme,
                    createdAt: new Date(),
                });

                // Activate all predefined themes by default
                await tx.table('userThemePreferences').add({
                    themeId,
                    isActive: true,
                });
            }
        });

        // Version 37: Add missing "Hemmelig Agent" action if it doesn't exist
        this.version(37).stores({}).upgrade(async (tx) => {
            // Check if SECRET_AGENT_PASSED action exists
            const actions = await tx.table('actions').toArray();
            const hasSecretAgent = actions.some((action: any) => action.actionKey === 'SECRET_AGENT_PASSED');

            if (!hasSecretAgent) {
                // Add the missing Hemmelig Agent action
                await tx.table('actions').add({
                    id: 7,
                    name: 'Hemmelig Agent - Oppdrag fullført',
                    points: 50,
                    type: 'system',
                    actionKey: 'SECRET_AGENT_PASSED',
                    emoji: '🕵️'
                });
                console.log('✅ Added missing "Hemmelig Agent" action');
            }
        });

        // Version 38: Ensure actions.actionKey is indexed so queries like
        // db.actions.where('actionKey') work without throwing SchemaError.
        // This creates the missing index in existing databases during upgrade.
        this.version(38).stores({
            actions: '++id, name, actionKey'
        }).upgrade(async (tx) => {
            // No special migration required — adding the index is sufficient.
            // But ensure existing rows have the actionKey property populated when possible.
            await tx.table('actions').toCollection().modify(action => {
                if (!('actionKey' in action) && action.name) {
                    // best-effort: keep as-is, index will be undefined for these entries
                }
            });
        });

        // Version 39: Add sessionId to dailyChecks so multiple registration sessions can exist per day
        this.version(39).stores({
            dailyChecks: '++id, &[studentId+date+sessionId], studentId, date, sessionId'
        }).upgrade(async (tx) => {
            // Migrate existing dailyChecks to include a sessionId so legacy data is preserved.
            const allChecks = await tx.table('dailyChecks').toArray();
            for (const chk of allChecks) {
                if (!('sessionId' in chk) || !chk.sessionId) {
                    const dateStr = new Date(chk.date).toISOString().split('T')[0];
                    chk.sessionId = `${dateStr}_legacy`;
                    try {
                        await tx.table('dailyChecks').put(chk);
                    } catch (err) {
                        console.error('Failed to migrate dailyCheck', chk, err);
                    }
                }
            }
        });

        // Version 39: Add time-based message system tables
        this.version(39).stores({
            timePeriods: '++id, order',
            timeBasedMessages: '++id, [weekday+timePeriodId+messageType], weekday, timePeriodId, messageType',
            defaultMessages: '++id, messageType',
        }).upgrade(async (tx) => {
            // Initialize with default time periods
            const defaultPeriods = [
                { name: 'Morgen', startTime: '08:00', order: 1 },
                { name: 'Etter 1. friminutt', startTime: '09:45', order: 2 },
                { name: 'Etter 2. friminutt', startTime: '11:30', order: 3 },
            ];

            for (const period of defaultPeriods) {
                await tx.table('timePeriods').add({
                    ...period,
                    createdAt: new Date(),
                });
            }

            // Initialize default fallback messages
            await tx.table('defaultMessages').add({
                messageType: 'welcome',
                messages: 'Velkommen til skolen!\nGod dag!',
                createdAt: new Date(),
            });

            await tx.table('defaultMessages').add({
                messageType: 'instruction',
                messages: 'Ta fram bøkene dine\nBegynn på oppgavene',
                createdAt: new Date(),
            });

            // Update settings to include useTimeBasedMessages flag
            const userSettings = await tx.table('settings').get('userSettings');
            if (userSettings && userSettings.morningDisplaySettings) {
                userSettings.morningDisplaySettings.useTimeBasedMessages = false; // Disabled by default
                await tx.table('settings').put(userSettings);
            }
        });

        // Version 40: Add nfcCard index on students so we can lookup students by NFC UID
        this.version(40).stores({
            students: '++id, name, nfcCard'
        }).upgrade(async (tx) => {
            // No special migration required — existing student rows will have undefined nfcCard
            // but adding the index ensures db.students.where('nfcCard') queries work without SchemaError.
        });

        // Version 41: Add community rewards system (shared class goals)
        this.version(41).stores({
            communityRewards: '++id, status, priority',
            communityDonations: '++id, studentId, rewardId, date'
        });

        // Version 42: Add new dashboard tools (weekly-planner, rewardDashboard, rewardStore, activityFeed, secret-agent)
        this.version(42).stores({}).upgrade(async (tx) => {
            const userSettings = await tx.table('settings').get('userSettings');
            if (userSettings && userSettings.dashboardTools) {
                const existingKeys = userSettings.dashboardTools.map((t: DashboardConfig) => t.key);
                const newTools: DashboardConfig[] = [
                    { key: 'weekly-planner', visible: true },
                    { key: 'rewardDashboard', visible: true },
                    { key: 'rewardStore', visible: false },
                    { key: 'activityFeed', visible: false },
                    { key: 'secret-agent', visible: false },
                ];

                // Add only tools that don't already exist
                for (const tool of newTools) {
                    if (!existingKeys.includes(tool.key)) {
                        userSettings.dashboardTools.push(tool);
                    }
                }

                await tx.table('settings').put(userSettings);
            }
        });

        // Version 43: Add timestamp index to checkInLogs for efficient date-range queries
        this.version(43).stores({
            checkInLogs: '++id, &[studentId+bellTimeId+date], studentId, bellTimeId, date, timestamp',
        });

        this.on('populate', async () => {
            await this.settings.add({ id: 'userSettings', ...defaultSettings });
        });
    }
}

export const db = new MySubClassedDexie();

// --- Mock Data and Seeding ---
const mockStudents = [
    { name: 'Ola Nordmann', points: 0 }, { name: 'Kari Normann', points: 0 }, { name: 'Aisha Khan', points: 0 },
    { name: 'Lucas Moen', points: 0 }, { name: 'Emilie Kristiansen', points: 0 }, { name: 'Jakob Olsen', points: 0 },
    { name: 'Nora Pedersen', points: 0 }, { name: 'Filip Larsen', points: 0 }, { name: 'Ingrid Andersen', points: 0 },
    { name: 'Mathias Nilsen', points: 0 }, { name: 'Leah Halvorsen', points: 0 }, { name: 'William Jensen', points: 0 },
    { name: 'Sofia Hagen', points: 0 }, { name: 'Oskar Johansen', points: 0 }, { name: 'Maja Eriksen', points: 0 },
    { name: 'Isak Dahl', points: 0 }, { name: 'Hedda Berg', points: 0 }, { name: 'Tobias Aas', points: 0 },
    { name: 'Thea Kaasa', points: 0 }, { name: 'Sander Lien', points: 0 }
];

const mockSubjects = [ { name: 'Norsk' }, { name: 'Matematikk' }, { name: 'Engelsk' }, { name: 'Samfunnsfag' }, { name: 'Naturfag' }];

const defaultBehaviorTypes: BehaviorType[] = [
    { id: 'workedWell', label: 'Jobbet godt', icon: 'Smile', color: 'green' },
    { id: 'disturbed', label: 'Forstyrret', icon: 'Annoyed', color: 'yellow' },
    { id: 'helpedOthers', label: 'Hjalp andre', icon: 'Handshake', color: 'blue' }
];

const defaultDashboardTools: DashboardConfig[] = [
    { key: 'overview', visible: true },
    { key: 'assessments', visible: true },
    { key: 'dailyCheck', visible: true },
    { key: 'innsjekking', visible: true },
    { key: 'observations', visible: true },
    { key: 'reports', visible: true },
    { key: 'weekly-planner', visible: true },
    { key: 'rewardDashboard', visible: true },
    { key: 'rewardStore', visible: false },
    { key: 'activityFeed', visible: false },
    { key: 'secret-agent', visible: false },
    { key: 'observations.hourly', visible: false },
    { key: 'observations.remarks', visible: false },
    { key: 'classroomTools.seatingChart', visible: false },
    { key: 'classroomTools.groupTool', visible: false },
    { key: 'classroomTools.studentPicker', visible: false },
    { key: 'reports.summary', visible: false },
    { key: 'reports.studentReports', visible: false },
    { key: 'reports.analysis', visible: false },
    { key: 'morning-display', visible: true },
];

const defaultDPIAAnalysis: DPIAAnalysis = {
    scope: "Denne analysen dekker Klasseflyt-applikasjonen i sin helhet, inkludert all datainnsamling, lagring i nettleserens IndexedDB, og den valgfrie synkroniseringen til den enkelte lærers Microsoft OneDrive-konto. Den dekker ikke skolens overordnede Microsoft 365-infrastruktur, som reguleres av skolens egen databehandleravtale med Microsoft.",
    values: "1. Elevdata: Navn, anmerkninger, lekseresultater, og annen klasseromsrelatert informasjon.\n2. Tjenestens integritet: Sikre at appen er stabil, pålitelig og tilgjengelig for læreren.\n3. Lærerens effektivitet: Appen skal være et verktøy som forenkler, ikke kompliserer, lærerens hverdag.",
    unwantedEvents: "- Teknisk feil: Datatap fra IndexedDB ved nettleserfeil. Synkroniseringsfeil mot OneDrive.\n- Menneskelig feil: Læreren logger inn på en usikret/offentlig datamaskin og glemmer å logge ut.\n- Ondsinnede handlinger: Uautorisert fysisk tilgang til lærerens enhet for å hente ut lokal data.\n- Datalekkasje: Kompromittering av lærerens Microsoft-konto gir tilgang til app-datafilen på OneDrive.",
    probabilityAndConsequence: "- Sannsynligheten for datatap pga. teknisk feil er lav, men konsekvensen kan være middels (tapt arbeidsdata for læreren).\n- Sannsynligheten for uautorisert tilgang via kompromittert M35-konto er lav (krever målrettet angrep), men konsekvensen er høy (elevdata på avveie).\n- Sannsynligheten for feilbruk på offentlig maskin er lav, konsekvensen er høy.",
    measures: "- Teknisk: All data lagres lokalt i nettleser, reduserer eksponering. Synkronisering skjer kun til appens egen sandboxed mappe på OneDrive (Files.ReadWrite.AppFolder). Ingen sentral server.\n- Organisatorisk: Oppfordre til bruk av tofaktorautentisering på Microsoft-konto. Tydeliggjøre i dokumentasjon at læreren er behandlingsansvarlig.\n- Juridiske tiltak: En klar personvernerklæring forklarer databehandlingen. Appen legger seg under skolens eksisterende databehandleravtale med Microsoft, og introduserer ingen nye tredjeparter.",
    dataProcessingDescription: "- Hvilke data: Elevnavn, anmerkninger (type, tidspunkt), lekse-status, iPad-status, timeinnsjekk-atferd. Ingen sensitive personopplysninger etter GDPR art. 9 samles inn.\n- Formål: Å gi læreren et effektivt verktøy for klasseromsadministrasjon, dokumentasjon og rapportering.\n- Livssyklus: Data legges inn av lærer, lagres i IndexedDB, og synkroniseres (valgfritt) til OneDrive. Data slettes når læreren sletter det i appen, eller sletter datafilen fra OneDrive.\n- Tilgang: Kun den innloggede læreren har tilgang til dataen på sin enhet og i sin OneDrive. Ingen andre (inkludert app-utvikler) har tilgang.",
    necessityAndProportionality: "Ja, de innsamlede dataene er begrenset til det som er strengt nødvendig for at en lærer skal kunne utføre sine pedagogiske og administrative oppgaver. Mengden data er proporsjonal med formålet om å ha en effektiv klasseromsoversikt.",
    riskAssessment: "- Risiko for datalekkasje er minimert ved at appen ikke har en sentral database. Risikoen er flyttet til sikring av den enkelte lærers enhet og Microsoft-konto, som er et kjent og etablert trusselbilde skolen allerede må håndtere.\n- Potensielle konsekvenser ved lekkasje kan være eksponering av elevers atferd og faglige prestasjoner, noe som kan være en belastning for eleven det gjelder.",
    riskMeasures: "- Tekniske tiltak: Bruk av Microsofts sikre autentiseringsløsning (MSAL). Data isoleres i app-spesifikk mappe på OneDrive. Appen kjører helt på klienten.\n- Organisatoriske tiltak: Personvernerklæring er tilgjengelig. Ansvaret som behandlingsansvarlig er tydeliggjort. Anbefaling om bruk av sikre enheter og 2FA.\n- Juridiske tiltak: En klar personvernerklæring forklarer databehandlingen. Appen legger seg under skolens eksisterende databehandleravtale med Microsoft, og introduserer ingen nye tredjeparter.",
};

const defaultCheckInSettings: CheckInSettings = {
  morning: {
    percent100Minutes: 3,
    percent50Minutes: 5,
    percent10Minutes: 7,
    absenceMinutes: 7,
        postCloseGraceMinutes: 2,
  },
  regular: {
    percent100Minutes: 3,
    stopMinutes: 3,
        postCloseGraceMinutes: 2,
  },
};

const defaultMorningDisplaySettings: MorningDisplaySettings = {
  className: 'klassen',
  messageRotationMode: 'daily',
  instructionRotationMode: 'daily',
  lastThemeId: undefined,
  lastThemeDate: undefined,
  useTimeBasedMessages: false,
  welcomeMessage: '',
  dailyInstructions: '',
  showPointsList: true,
  showProgressBar: true,
  showSecretAgent: true,
};const defaultSettings: AppSettings = {
  tabs: {
    overview: true, assessments: true, dailyCheck: true, observations: true, reports: true,
    classroomTools: true,
    settings: true,
  },
  tabOrder: ['overview', 'assessments', 'dailyCheck', 'observations', 'classroomTools', 'reports'],
  dashboardTools: defaultDashboardTools,
  reportSettings: {
    includeHomework: true, includeIpad: true, includeRemarks: true,
    includePositiveFeedback: false, includeTests: false, greeting: "Hei,", closing: "Vennlig hilsen,", teacherName: "Læreren",
    positiveFeedbackMessage: "Alt har vært helt supert! God innsats.",
    positiveFeedbackHomework: "Alle lekser denne uken er godkjent. Veldig bra!",
    positiveFeedbackIpad: "Full pott på iPad-ansvar denne uken. Supert!",
    positiveFeedbackBoth: "Veldig bra innsats med både lekser og iPad-ansvar denne uken!",
    includeHomeworkInReport: true,
    includeIpadInReport: true,
    includeRemarksInReport: true,
    includeHourlyCheckInReport: true,
    includeTestsInReport: true,
    includeLearningGoalsInReport: true,
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
  workstations: [
    { id: uuidv4(), name: 'Bibliotek' },
    { id: uuidv4(), name: 'Grupperom 1' },
    { id: uuidv4(), name: 'I klasserommet' },
  ],
  dpiaAnalysis: defaultDPIAAnalysis,
  onboardingCompleted: false,
    classGoal: {
        target: 200,
        lastAchieved: undefined,
    },
    communityGoalTitle: 'Felles belønning',
    rewardSystem: {
        mode: 'simple', // Start with simple mode by default
        priceIncreasePercent: 5,
        priceDecreasePercent: 2,
        priceFloorPercent: 50,
        priceCeilingPercent: 200,
        transferFeePercent: 10,
    },
    nfcEnabled: false, // NFC disabled by default
    checkInSettings: defaultCheckInSettings, // Auto check-in system settings
    morningDisplaySettings: defaultMorningDisplaySettings, // Morning display settings
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
            workstations: defaultSettings.workstations,
            dpiaAnalysis: defaultSettings.dpiaAnalysis,
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
        if (engelskSubject?.id) homeworkToAdd.push({ title: "", subjectId: engelskSubject.id, week: thisWeek, date: new Date() });
        if (matteSubject?.id) homeworkToAdd.push({ title: "Oppg. 3.1-3.5", subjectId: matteSubject.id, week: thisWeek, date: new Date() });
        if (naturfagSubject?.id) homeworkToAdd.push({ title: "Verdensrommet", subjectId: naturfagSubject.id, week: thisWeek - 1, date: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) });
        
        await db.homework.bulkAdd(homeworkToAdd);
        const addedHomework = await db.homework.toArray();
        const homeworkIds = addedHomework.map(h => h.id!);


        // --- Create Mock Submissions ---
        const submissionsToAdd: Omit<Submission, 'id'>[] = [];
        const submissionAttemptsToAdd: Omit<SubmissionAttempt, 'id'>[] = [];

        for (const student of allStudents) {
            for (const hw of addedHomework) {
                const chance = Math.random();
                if (chance > 0.1) { // 90% chance of submission
                    const submissionId = await db.submissions.add({ studentId: student.id!, homeworkId: hw.id! });
                    
                    let status: HomeworkStatus = "Godkjent";
                    if (chance < 0.2) status = "Ikke levert";
                    else if (chance < 0.25) status = "Må rettes";
                    
                    submissionAttemptsToAdd.push({
                        submissionId: submissionId!,
                        status: status,
                        comment: status === "Må rettes" ? "Gjør oppgavene på nytt." : undefined,
                        date: hw.date,
                    });
                }
            }
        }
        await db.submissionAttempts.bulkAdd(submissionAttemptsToAdd);


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
                    type: remarkTypes[Math.floor(Math.random() * remarkTypes.length)],
                    message: remarkTypes[Math.floor(Math.random() * remarkTypes.length)],
                    logGroupId: uuidv4()
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
        
        // --- Create Mock Tests and Results ---
        if (norskSubject?.id && matteSubject?.id) {
            const testsToAdd: Omit<Test, 'id'>[] = [
                { title: 'Kapittelprøve 1', subjectId: norskSubject.id, date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000), maxScore: 50 },
                { title: 'Brøkregning', subjectId: matteSubject.id, date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000), maxScore: 25 },
            ];
            await db.tests.bulkAdd(testsToAdd);
            const addedTests = await db.tests.toArray();
            
            const testResultsToAdd: Omit<TestResult, 'id'>[] = [];
            allStudents.forEach(student => {
                addedTests.forEach(test => {
                    const chance = Math.random();
                    if (chance > 0.05) { // 95% chance of result
                        testResultsToAdd.push({
                            studentId: student.id!,
                            testId: test.id!,
                            score: Math.floor(Math.random() * (test.maxScore + 1)),
                        });
                    }
                });
            });
            await db.testResults.bulkAdd(testResultsToAdd);
        }

        console.log("Database has been reset and seeded with extensive demo data.");
    });
}

// --- ENSURE ACTIONS ARE INITIALIZED ---
export async function ensureActionsInitialized() {
    const count = await db.actions.count();
    if (count === 0) {
        console.log("⚠️ Actions table is empty, initializing with default actions...");
        const { positiveActions } = await import('./positiveActions');
        await db.actions.bulkAdd(positiveActions);
        console.log("✅ Actions initialized successfully");
    }
}

// --- ENCRYPTION HELPERS ---

/**
 * Derive an encryption key from a password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt backup data with AES-256-GCM
 */
export async function encryptBackup(data: any, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const jsonString = JSON.stringify(data);

  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Derive key from password
  const key = await deriveKey(password, salt);

  // Encrypt data
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encoder.encode(jsonString)
  );

  // Convert to base64 for JSON storage
  // Use chunked conversion to avoid stack overflow on large arrays
  const arrayToBase64 = (array: Uint8Array): string => {
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < array.length; i += chunkSize) {
      const chunk = array.slice(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  };

  return JSON.stringify({
    version: 1,
    encrypted: arrayToBase64(new Uint8Array(encryptedData)),
    salt: arrayToBase64(salt),
    iv: arrayToBase64(iv),
  });
}

/**
 * Decrypt backup data with AES-256-GCM
 */
export async function decryptBackup(encryptedString: string, password: string): Promise<any> {
  try {
    const { version, encrypted, salt, iv } = JSON.parse(encryptedString);

    if (version !== 1) {
      throw new Error('Ukjent krypteringsversjon');
    }

    // Convert from base64
    const encryptedData = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    const saltArray = Uint8Array.from(atob(salt), c => c.charCodeAt(0));
    const ivArray = Uint8Array.from(atob(iv), c => c.charCodeAt(0));

    // Derive key from password
    const key = await deriveKey(password, saltArray);

    // Decrypt data
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivArray },
      key,
      encryptedData
    );

    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decryptedData);

    return JSON.parse(jsonString);
  } catch (error) {
    if (error instanceof Error && error.message === 'Ukjent krypteringsversjon') {
      throw error;
    }
    throw new Error('Feil passord eller korrupt fil');
  }
}

/**
 * Check if a backup file is encrypted
 */
export function isEncryptedBackup(data: any): boolean {
  return typeof data === 'object' && data !== null && 'encrypted' in data && 'version' in data;
}

// --- EXPORT/IMPORT LOGIC ---
export async function exportDatabase(password?: string) {
  const data: { [key: string]: any[] } = {};
  for (const table of db.tables) {
    data[table.name] = await table.toArray();
  }

  // Encrypt if password provided
  if (password && password.length > 0) {
    return await encryptBackup(data, password);
  }

  return data;
}

/**
 * Migrate old submissions structure to new structure (v22+)
 * Old: submission has status/comment directly
 * New: submission is a folder, submissionAttempts has status/comment
 */
async function migrateSubmissions(oldSubmissions: any[], homeworkData: any[]): Promise<void> {
    // Create homework date lookup
    const homeworkDateMap = new Map(homeworkData.map(h => [h.id, h.date]));

    // Group old submissions by student-homework pair
    const submissionGroups = new Map<string, any[]>();
    
    for (const oldSub of oldSubmissions) {
        const key = `${oldSub.studentId}-${oldSub.homeworkId}`;
        if (!submissionGroups.has(key)) {
            submissionGroups.set(key, []);
        }
        submissionGroups.get(key)!.push(oldSub);
    }

    // Process each group: create one submission with multiple attempts
    for (const [key, oldSubs] of submissionGroups) {
        const [studentId, homeworkId] = key.split('-').map(Number);
        
        // Create the submission "folder"
        const submissionId = await db.submissions.add({
            studentId,
            homeworkId
        });

        // Create attempts for each old submission with status
        const attempts: Omit<SubmissionAttempt, 'id'>[] = [];
        for (const oldSub of oldSubs) {
            if (oldSub.status) {
                attempts.push({
                    submissionId: submissionId as number,
                    status: oldSub.status,
                    comment: oldSub.comment,
                    date: homeworkDateMap.get(oldSub.homeworkId) || new Date()
                });
            }
        }

        // Add all attempts for this submission
        if (attempts.length > 0) {
            await db.submissionAttempts.bulkAdd(attempts);
        }
    }
}

/**
 * Migrate old settings structure to include missing new fields
 */
function migrateSettings(oldSettings: any): AppSettings & { id: string } {
    const migrated: any = { ...oldSettings, id: 'userSettings' };

    // Ensure all tabs exist
    migrated.tabs = migrated.tabs || {};
    if (migrated.tabs.hourlyCheck || migrated.tabs.remarks) {
        migrated.tabs.observations = true;
        delete migrated.tabs.hourlyCheck;
        delete migrated.tabs.remarks;
    }
    migrated.tabs.observations = migrated.tabs.observations ?? true;
    migrated.tabs.assessments = migrated.tabs.assessments ?? true;
    migrated.tabs.classroomTools = migrated.tabs.classroomTools ?? true;
    migrated.tabs.settings = migrated.tabs.settings ?? true;

    // Migrate tab order
    if (migrated.tabOrder) {
        migrated.tabOrder = migrated.tabOrder
            .map((tab: string) => {
                if (tab === 'hourlyCheck' || tab === 'remarks') return 'observations';
                if (tab === 'seatingChart') return null;
                return tab;
            })
            .filter((tab: string | null) => tab !== null);
        migrated.tabOrder = [...new Set(migrated.tabOrder)];
    } else {
        migrated.tabOrder = defaultSettings.tabOrder;
    }

    // Ensure dashboardTools exists with all new tools
    if (!migrated.dashboardTools) {
        migrated.dashboardTools = defaultDashboardTools;
    } else {
        // Add any missing dashboard tools
        const existingKeys = migrated.dashboardTools.map((t: DashboardConfig) => t.key);
        for (const tool of defaultDashboardTools) {
            if (!existingKeys.includes(tool.key)) {
                migrated.dashboardTools.push(tool);
            }
        }
    }

    // Ensure all report settings exist
    migrated.reportSettings = migrated.reportSettings || {};
    const rs = migrated.reportSettings;
    rs.includeHomeworkInReport = rs.includeHomeworkInReport ?? true;
    rs.includeIpadInReport = rs.includeIpadInReport ?? true;
    rs.includeRemarksInReport = rs.includeRemarksInReport ?? true;
    rs.includeHourlyCheckInReport = rs.includeHourlyCheckInReport ?? true;
    rs.includeTestsInReport = rs.includeTestsInReport ?? false;
    rs.includeLearningGoalsInReport = rs.includeLearningGoalsInReport ?? false;
    rs.positiveFeedbackMessage = rs.positiveFeedbackMessage || defaultSettings.reportSettings.positiveFeedbackMessage;
    rs.positiveFeedbackHomework = rs.positiveFeedbackHomework || defaultSettings.reportSettings.positiveFeedbackHomework;
    rs.positiveFeedbackIpad = rs.positiveFeedbackIpad || defaultSettings.reportSettings.positiveFeedbackIpad;
    rs.positiveFeedbackBoth = rs.positiveFeedbackBoth || defaultSettings.reportSettings.positiveFeedbackBoth;

    // Ensure other new fields exist
    migrated.behaviorTypes = migrated.behaviorTypes || defaultBehaviorTypes;
    migrated.workstations = migrated.workstations || defaultSettings.workstations;
    migrated.dpiaAnalysis = migrated.dpiaAnalysis || defaultDPIAAnalysis;
    migrated.checkInSettings = migrated.checkInSettings || defaultCheckInSettings;
    migrated.morningDisplaySettings = migrated.morningDisplaySettings || defaultMorningDisplaySettings;
    migrated.rewardSystem = migrated.rewardSystem || defaultSettings.rewardSystem;
    migrated.classGoal = migrated.classGoal || defaultSettings.classGoal;
    migrated.communityGoalTitle = migrated.communityGoalTitle || defaultSettings.communityGoalTitle;
    migrated.nfcEnabled = migrated.nfcEnabled ?? false;

    return migrated;
}

export async function importDatabase(data: { [key: string]: any[] } | string, password?: string) {
    let parsedData: { [key: string]: any[] };

    // Check if data is encrypted
    if (typeof data === 'string' || isEncryptedBackup(data)) {
      if (!password) {
        throw new Error('Denne filen er kryptert. Vennligst oppgi passord.');
      }
      const encryptedString = typeof data === 'string' ? data : JSON.stringify(data);
      parsedData = await decryptBackup(encryptedString, password);
    } else {
      parsedData = data as { [key: string]: any[] };
    }

    // Clear all tables first
    await db.transaction('rw', db.tables, async () => {
        await Promise.all(db.tables.map(table => table.clear()));
    });

    // Check if we need to migrate submissions (old format has status field)
    let needsSubmissionMigration = false;
    if (parsedData['submissions'] && parsedData['submissions'].length > 0) {
        const firstSub = parsedData['submissions'][0];
        needsSubmissionMigration = 'status' in firstSub;
    }

    // Migrate submissions OUTSIDE of transaction to avoid TransactionInactiveError
    if (needsSubmissionMigration) {
        console.log('🔄 Migrerer submissions fra gammel til ny struktur...');
        await migrateSubmissions(
            parsedData['submissions'],
            parsedData['homework'] || []
        );
        // Remove from parsedData to avoid double import
        delete parsedData['submissions'];
        delete parsedData['submissionAttempts'];
        console.log('✅ Migrering av submissions fullført');
    }

    // Import remaining tables in a transaction
    await db.transaction('rw', db.tables, async () => {
        // Special handling for settings migration
        if (parsedData['settings'] && parsedData['settings'].length > 0) {
            const oldSettings = parsedData['settings'][0];
            const migratedSettings = migrateSettings(oldSettings);
            await db.settings.put(migratedSettings);
            delete parsedData['settings'];
            console.log('✅ Migrert innstillinger til ny struktur');
        }

        // Import remaining tables
        for (const tableName in parsedData) {
            if (db.table(tableName)) {
                try {
                    // For date fields, we need to ensure they are Date objects
                    const tableData = parsedData[tableName].map(item => {
                        if (item.date) item.date = new Date(item.date);
                        if (item.createdAt) item.createdAt = new Date(item.createdAt);
                        if (item.updatedAt) item.updatedAt = new Date(item.updatedAt);
                        if (item.timestamp) item.timestamp = new Date(item.timestamp);
                        return item;
                    });
                    
                    if (tableData.length > 0) {
                        await db.table(tableName).bulkAdd(tableData);
                        console.log(`✅ Importert ${tableData.length} rader til ${tableName}`);
                    }
                } catch (error) {
                    console.warn(`⚠️ Kunne ikke importere tabell ${tableName}:`, error);
                    // Continue with other tables even if one fails
                }
            } else {
                console.warn(`⚠️ Tabell ${tableName} finnes ikke i gjeldende database-versjon (hoppet over)`);
            }
        }
    });

    // Ensure actions and rewards are populated OUTSIDE transaction to avoid timeout
    const actionsCount = await db.actions.count();
    if (actionsCount === 0) {
        const { positiveActions } = await import('./positiveActions');
        await db.actions.bulkAdd(positiveActions);
        console.log('✅ La til standard positive handlinger (POD)');
    }

    const rewardsCount = await db.rewards.count();
    if (rewardsCount === 0) {
        const { defaultRewards } = await import('./rewards');
        await db.rewards.bulkAdd(defaultRewards);
        console.log('✅ La til standard belønninger');
    }
    
    console.log('🎉 Import fullført!');
}
    



  





    




