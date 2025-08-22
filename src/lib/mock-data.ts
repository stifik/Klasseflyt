import type { Student, Subject, Homework, Submission, DailyCheck, HomeworkStatus } from './types';

// Extend Date prototype for week number if it doesn't exist
declare global {
  interface Date {
    getWeek(): number;
  }
}

if (!('getWeek' in Date.prototype)) {
  Date.prototype.getWeek = function() {
      const d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
      return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
  };
}

export const students: Student[] = [
  { id: 's1', name: 'Liam Jensen' },
  { id: 's2', name: 'Olivia Nguyen' },
  { id: 's3', name: 'Noah Olsen' },
  { id: 's4', name: 'Emma Johansen' },
  { id: 's5', name: 'Lucas Andersen' },
  { id: 's6', name: 'Mia Hansen' },
  { id: 's7', name: 'Aksel Kristiansen' },
  { id: 's8', name: 'Frida Pedersen' },
];

export const subjects: Subject[] = [
  { id: 'sub1', name: 'Norsk' },
  { id: 'sub2', name: 'Matematikk' },
  { id: 'sub3', name: 'Engelsk' },
  { id: 'sub4', name: 'Naturfag' },
];

export const homework: Homework[] = [];
export const submissions: Submission[] = [];
export const dailyChecks: DailyCheck[] = [];

const today = new Date();
const statuses: HomeworkStatus[] = ['Godkjent', 'Ikke levert', 'Må rettes', 'Syk/Fravær', 'Glemt bok'];

// Generate 6 months of demo data
for (let i = 180; i >= 0; i--) {
  const date = new Date(today);
  date.setDate(today.getDate() - i);
  const week = date.getWeek();

  // Generate homework (approx. 2-3 times a week)
  if (Math.random() < 0.4) {
    const subject = subjects[Math.floor(Math.random() * subjects.length)];
    const hw: Homework = {
      id: `hw${homework.length + 1}`,
      title: `Leselekse ${homework.length + 1}`,
      subjectId: subject.id,
      week,
      date,
    };
    homework.push(hw);

    // Generate submissions for this homework
    students.forEach(student => {
      // Not everyone gets a non-approved status
      const randomStatus = Math.random();
      let status: HomeworkStatus = 'Godkjent';
      if (randomStatus < 0.05) status = 'Ikke levert';
      else if (randomStatus < 0.1) status = 'Må rettes';
      else if (randomStatus < 0.13) status = 'Syk/Fravær';
      else if (randomStatus < 0.16) status = 'Glemt bok';

      const sub: Submission = {
        id: `sub${submissions.length + 1}`,
        studentId: student.id,
        homeworkId: hw.id,
        status,
      };
      // Add a comment to some
      if (status !== 'Godkjent' && Math.random() < 0.5) {
        sub.comment = `Gjorde en god innsats, men trenger å se over ${Math.floor(Math.random() * 3) + 1} oppgaver.`;
      }
      submissions.push(sub);
    });
  }

  // Generate daily checks
  students.forEach(student => {
    const randomCheck = Math.random();
    if (randomCheck < 0.1) { // 10% chance of an issue
        dailyChecks.push({
            id: `dc${dailyChecks.length + 1}`,
            studentId: student.id,
            date,
            ipadCharged: randomCheck > 0.05,
            ipadBrought: randomCheck < 0.05 || randomCheck > 0.07,
        });
    }
  });
}
