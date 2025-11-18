import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Student, Subject, Homework, Submission, DailyCheck, Remark, Test, TestResult, LearningGoal, GoalAchievement, SubmissionAttempt, BehaviorType, ReportSettings } from '@/lib/types';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

interface StudentStats {
    studentId: number;
    studentName: string;
    totalHomework: number;
    totalStatusCounts: Record<string, number>;
    totalRemarks: number;
    homeworkDetails: Array<{
        subject: string;
        title: string;
        week: number;
        status: string;
        statusColor: string;
    }>;
    remarkDetails: Array<{
        date: Date;
        text: string;
        behaviorType?: string;
    }>;
    testResults: Array<{
        subjectName: string;
        testTitle: string;
        date: Date;
        score: number;
        maxScore: number;
        percentage: number;
    }>;
    learningGoals: Array<{
        goal: LearningGoal;
        achievement?: GoalAchievement;
        subjectName: string;
    }>;
}

const statusColors: Record<string, string> = {
    "Godkjent": "#22c55e",
    "Må rettes": "#f59e0b",
    "Glemt bok": "#f97316",
    "Ikke levert": "#ef4444",
    "Syk/Fravær": "#3b82f6",
};

export async function generateStudentReportPDF(
    studentStats: StudentStats,
    reportSettings: ReportSettings
): Promise<void> {
    const doc = new jsPDF();
    let yPos = 20;

    // Header
    doc.setFontSize(20);
    doc.text('Elevrapport', 14, yPos);
    yPos += 10;

    doc.setFontSize(16);
    doc.text(studentStats.studentName, 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generert ${format(new Date(), 'PPP', { locale: nb })}`, 14, yPos);
    yPos += 15;

    doc.setTextColor(0);

    // Lekser oversikt
    if (reportSettings.includeHomeworkInReport && studentStats.totalHomework > 0) {
        doc.setFontSize(14);
        doc.text('Lekser - Totaloversikt', 14, yPos);
        yPos += 8;

        const statusData = Object.entries(studentStats.totalStatusCounts).map(([status, count]) => [
            status,
            count.toString(),
            `${Math.round((count / studentStats.totalHomework) * 100)}%`
        ]);

        autoTable(doc, {
            startY: yPos,
            head: [['Status', 'Antall', 'Prosent']],
            body: statusData,
            theme: 'grid',
            headStyles: { fillColor: [66, 66, 66] },
            styles: { fontSize: 10 },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 0) {
                    const status = data.cell.text[0];
                    const color = statusColors[status];
                    if (color) {
                        // Convert hex to RGB
                        const r = parseInt(color.slice(1, 3), 16);
                        const g = parseInt(color.slice(3, 5), 16);
                        const b = parseInt(color.slice(5, 7), 16);
                        data.cell.styles.fillColor = [r, g, b];
                        data.cell.styles.textColor = [255, 255, 255];
                    }
                }
            }
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Detaljert lekseoversikt
    if (reportSettings.includeHomeworkInReport && studentStats.homeworkDetails.length > 0) {
        // Check if we need a new page
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(14);
        doc.text('Detaljert lekseoversikt', 14, yPos);
        yPos += 8;

        const homeworkData = studentStats.homeworkDetails.map(hw => [
            `Uke ${hw.week}`,
            hw.subject,
            hw.title || '-',
            hw.status
        ]);

        autoTable(doc, {
            startY: yPos,
            head: [['Uke', 'Fag', 'Tittel', 'Status']],
            body: homeworkData,
            theme: 'striped',
            headStyles: { fillColor: [66, 66, 66] },
            styles: { fontSize: 9 },
            columnStyles: {
                0: { cellWidth: 20 },
                1: { cellWidth: 40 },
                2: { cellWidth: 70 },
                3: { cellWidth: 35 }
            },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 3) {
                    const status = data.cell.text[0];
                    const color = statusColors[status];
                    if (color) {
                        const r = parseInt(color.slice(1, 3), 16);
                        const g = parseInt(color.slice(3, 5), 16);
                        const b = parseInt(color.slice(5, 7), 16);
                        data.cell.styles.fillColor = [r, g, b];
                        data.cell.styles.textColor = [255, 255, 255];
                    }
                }
            }
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Prøveresultater
    if (reportSettings.includeTestsInReport && studentStats.testResults.length > 0) {
        if (yPos > 220) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(14);
        doc.text('Prøveresultater', 14, yPos);
        yPos += 8;

        const testData = studentStats.testResults.map(test => [
            format(test.date, 'dd.MM.yyyy'),
            test.subjectName,
            test.testTitle,
            `${test.score}/${test.maxScore}`,
            `${test.percentage}%`
        ]);

        autoTable(doc, {
            startY: yPos,
            head: [['Dato', 'Fag', 'Prøve', 'Poeng', 'Prosent']],
            body: testData,
            theme: 'striped',
            headStyles: { fillColor: [66, 66, 66] },
            styles: { fontSize: 9 },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 35 },
                2: { cellWidth: 60 },
                3: { cellWidth: 25 },
                4: { cellWidth: 25 }
            }
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Læringsmål
    if (reportSettings.includeLearningGoalsInReport && studentStats.learningGoals.length > 0) {
        if (yPos > 220) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(14);
        doc.text('Læringsmål', 14, yPos);
        yPos += 8;

        const goalsData = studentStats.learningGoals.map(lg => [
            lg.subjectName || '',
            lg.goal.description || '',
            lg.achievement ? (lg.achievement.status === 'Achieved' ? 'Oppnådd' : 'Ikke oppnådd') : 'Ikke vurdert'
        ]);

        autoTable(doc, {
            startY: yPos,
            head: [['Fag', 'Læringsmål', 'Status']],
            body: goalsData,
            theme: 'striped',
            headStyles: { fillColor: [66, 66, 66] },
            styles: { fontSize: 9 },
            columnStyles: {
                0: { cellWidth: 35 },
                1: { cellWidth: 100 },
                2: { cellWidth: 35 }
            },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 2) {
                    const status = data.cell.text[0];
                    if (status === 'Oppnådd') {
                        data.cell.styles.fillColor = [34, 197, 94];
                        data.cell.styles.textColor = [255, 255, 255];
                    } else if (status === 'Ikke oppnådd') {
                        data.cell.styles.fillColor = [239, 68, 68];
                        data.cell.styles.textColor = [255, 255, 255];
                    }
                }
            }
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Anmerkninger
    if (reportSettings.includeRemarksInReport && studentStats.remarkDetails.length > 0) {
        if (yPos > 220) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(14);
        doc.text(`Anmerkninger (${studentStats.totalRemarks} totalt)`, 14, yPos);
        yPos += 8;

        const remarkData = studentStats.remarkDetails.map(remark => [
            format(remark.date, 'dd.MM.yyyy'),
            remark.behaviorType || '-',
            remark.text
        ]);

        autoTable(doc, {
            startY: yPos,
            head: [['Dato', 'Type', 'Beskrivelse']],
            body: remarkData,
            theme: 'striped',
            headStyles: { fillColor: [66, 66, 66] },
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 35 },
                2: { cellWidth: 110 }
            }
        });
    }

    // Save PDF
    const fileName = `Elevrapport_${studentStats.studentName.replace(/\s/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
}

export async function generateMultipleStudentReportsPDF(
    allStudentStats: StudentStats[],
    reportSettings: ReportSettings
): Promise<void> {
    const doc = new jsPDF();

    for (let i = 0; i < allStudentStats.length; i++) {
        const studentStats = allStudentStats[i];
        let yPos = 20;

        if (i > 0) {
            doc.addPage();
        }

        // Header
        doc.setFontSize(20);
        doc.text('Elevrapport', 14, yPos);
        yPos += 10;

        doc.setFontSize(16);
        doc.text(studentStats.studentName, 14, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generert ${format(new Date(), 'PPP', { locale: nb })}`, 14, yPos);
        yPos += 15;

        doc.setTextColor(0);

        // Lekser oversikt
        if (reportSettings.includeHomeworkInReport && studentStats.totalHomework > 0) {
            doc.setFontSize(14);
            doc.text('Lekser - Totaloversikt', 14, yPos);
            yPos += 8;

            const statusData = Object.entries(studentStats.totalStatusCounts).map(([status, count]) => [
                status,
                count.toString(),
                `${Math.round((count / studentStats.totalHomework) * 100)}%`
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [['Status', 'Antall', 'Prosent']],
                body: statusData,
                theme: 'grid',
                headStyles: { fillColor: [66, 66, 66] },
                styles: { fontSize: 10 },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index === 0) {
                        const status = data.cell.text[0];
                        const color = statusColors[status];
                        if (color) {
                            const r = parseInt(color.slice(1, 3), 16);
                            const g = parseInt(color.slice(3, 5), 16);
                            const b = parseInt(color.slice(5, 7), 16);
                            data.cell.styles.fillColor = [r, g, b];
                            data.cell.styles.textColor = [255, 255, 255];
                        }
                    }
                }
            });

            yPos = (doc as any).lastAutoTable.finalY + 15;
        }

        // Detaljert lekseoversikt
        if (reportSettings.includeHomeworkInReport && studentStats.homeworkDetails.length > 0) {
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(14);
            doc.text('Detaljert lekseoversikt', 14, yPos);
            yPos += 8;

            const homeworkData = studentStats.homeworkDetails.map(hw => [
                `Uke ${hw.week}`,
                hw.subject,
                hw.title || '-',
                hw.status
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [['Uke', 'Fag', 'Tittel', 'Status']],
                body: homeworkData,
                theme: 'striped',
                headStyles: { fillColor: [66, 66, 66] },
                styles: { fontSize: 9 },
                columnStyles: {
                    0: { cellWidth: 20 },
                    1: { cellWidth: 40 },
                    2: { cellWidth: 70 },
                    3: { cellWidth: 35 }
                },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index === 3) {
                        const status = data.cell.text[0];
                        const color = statusColors[status];
                        if (color) {
                            const r = parseInt(color.slice(1, 3), 16);
                            const g = parseInt(color.slice(3, 5), 16);
                            const b = parseInt(color.slice(5, 7), 16);
                            data.cell.styles.fillColor = [r, g, b];
                            data.cell.styles.textColor = [255, 255, 255];
                        }
                    }
                }
            });

            yPos = (doc as any).lastAutoTable.finalY + 15;
        }

        // Prøveresultater
        if (reportSettings.includeTestsInReport && studentStats.testResults.length > 0) {
            if (yPos > 220) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(14);
            doc.text('Prøveresultater', 14, yPos);
            yPos += 8;

            const testData = studentStats.testResults.map(test => [
                format(test.date, 'dd.MM.yyyy'),
                test.subjectName,
                test.testTitle,
                `${test.score}/${test.maxScore}`,
                `${test.percentage}%`
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [['Dato', 'Fag', 'Prøve', 'Poeng', 'Prosent']],
                body: testData,
                theme: 'striped',
                headStyles: { fillColor: [66, 66, 66] },
                styles: { fontSize: 9 },
                columnStyles: {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 35 },
                    2: { cellWidth: 60 },
                    3: { cellWidth: 25 },
                    4: { cellWidth: 25 }
                }
            });

            yPos = (doc as any).lastAutoTable.finalY + 15;
        }

        // Læringsmål
        if (reportSettings.includeLearningGoalsInReport && studentStats.learningGoals.length > 0) {
            if (yPos > 220) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(14);
            doc.text('Læringsmål', 14, yPos);
            yPos += 8;

            const goalsData = studentStats.learningGoals.map(lg => [
                lg.subjectName || '',
                lg.goal.description || '',
                lg.achievement ? (lg.achievement.status === 'Achieved' ? 'Oppnådd' : 'Ikke oppnådd') : 'Ikke vurdert'
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [['Fag', 'Læringsmål', 'Status']],
                body: goalsData,
                theme: 'striped',
                headStyles: { fillColor: [66, 66, 66] },
                styles: { fontSize: 9 },
                columnStyles: {
                    0: { cellWidth: 35 },
                    1: { cellWidth: 100 },
                    2: { cellWidth: 35 }
                },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index === 2) {
                        const status = data.cell.text[0];
                        if (status === 'Oppnådd') {
                            data.cell.styles.fillColor = [34, 197, 94];
                            data.cell.styles.textColor = [255, 255, 255];
                        } else if (status === 'Ikke oppnådd') {
                            data.cell.styles.fillColor = [239, 68, 68];
                            data.cell.styles.textColor = [255, 255, 255];
                        }
                    }
                }
            });

            yPos = (doc as any).lastAutoTable.finalY + 15;
        }

        // Anmerkninger
        if (reportSettings.includeRemarksInReport && studentStats.remarkDetails.length > 0) {
            if (yPos > 220) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(14);
            doc.text(`Anmerkninger (${studentStats.totalRemarks} totalt)`, 14, yPos);
            yPos += 8;

            const remarkData = studentStats.remarkDetails.map(remark => [
                format(remark.date, 'dd.MM.yyyy'),
                remark.behaviorType || '-',
                remark.text
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [['Dato', 'Type', 'Beskrivelse']],
                body: remarkData,
                theme: 'striped',
                headStyles: { fillColor: [66, 66, 66] },
                styles: { fontSize: 9, cellPadding: 3 },
                columnStyles: {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 35 },
                    2: { cellWidth: 110 }
                }
            });
        }
    }

    // Save PDF
    const fileName = `Elevrapporter_Alle_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
}
