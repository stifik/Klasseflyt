

"use server";

import { db } from './firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, getDoc, Timestamp, writeBatch, limit, orderBy } from 'firebase/firestore';
import type { Student, Subject, Homework, Submission, DailyCheck, HomeworkStatus, SeatingChartRecord, SeatingChartData, Remark, SeatingLayout } from './types';
import { getWeekNumber } from './utils';

// Helper to convert Firestore Timestamps to JS Dates in nested objects
const convertTimestamps = (data: any): any => {
    if (data === null || typeof data !== 'object') {
        return data;
    }

    if (data instanceof Timestamp) {
        return data.toDate();
    }

    if (Array.isArray(data)) {
        return data.map(convertTimestamps);
    }

    const convertedData: { [key: string]: any } = {};
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            convertedData[key] = convertTimestamps(data[key]);
        }
    }
    return convertedData;
};


const docToData = <T>(docSnap: any): T => {
    const data = docSnap.data();
    return {
        id: docSnap.id,
        ...convertTimestamps(data)
    } as T;
};

// Generic fetch function for a user's subcollection
async function fetchUserCollection<T>(userId: string, collectionName: string): Promise<T[]> {
  const collectionRef = collection(db, 'users', userId, collectionName);
  const q = query(collectionRef, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => docToData<T>(doc));
}

// Generic add function for a user's subcollection
async function addUserDocument<T extends object>(userId: string, collectionName: string, data: T): Promise<T & { id: string }> {
  const collectionRef = collection(db, 'users', userId, collectionName);
  const docRef = await addDoc(collectionRef, data);
  const docSnap = await getDoc(docRef);
  return docToData<T & { id: string }>(docSnap);
}

// Generic update function for a user's subcollection
async function updateUserDocument<T extends object>(userId: string, collectionName:string, id: string, data: Partial<T>): Promise<void> {
  const docRef = doc(db, 'users', userId, collectionName, id);
  await updateDoc(docRef, data);
}

// Generic delete function for a user's subcollection
async function deleteUserDocument(userId: string, collectionName: string, id: string): Promise<void> {
  const docRef = doc(db, 'users', userId, collectionName, id);
  await deleteDoc(docRef);
}

// Student functions
export async function getStudents(userId: string): Promise<Student[]> { 
  const collectionRef = collection(db, 'users', userId, 'students');
  const querySnapshot = await getDocs(collectionRef);
  return querySnapshot.docs.map(doc => docToData<Student>(doc));
}
export async function addStudent(userId: string, student: Omit<Student, 'id'>) { return addUserDocument(userId, 'students', student); }
export async function deleteStudent(userId: string, id: string) { return deleteUserDocument(userId, 'students', id); }

// Subject functions
export async function getSubjects(userId: string): Promise<Subject[]> { 
    const collectionRef = collection(db, 'users', userId, 'subjects');
    const querySnapshot = await getDocs(collectionRef);
    return querySnapshot.docs.map(doc => docToData<Subject>(doc));
}
export async function addSubject(userId: string, subject: Omit<Subject, 'id'>) { return addUserDocument(userId, 'subjects', subject); }
export async function deleteSubject(userId: string, id: string) { return deleteUserDocument(userId, 'subjects', id); }

// Homework functions
export async function getHomework(userId: string): Promise<Homework[]> { return fetchUserCollection<Homework>(userId, 'homework'); }
export async function addHomework(userId: string, homework: Omit<Homework, 'id'>) { 
    const homeworkWithTimestamp = { ...homework, date: Timestamp.fromDate(homework.date), createdAt: Timestamp.now() };
    return addUserDocument(userId, 'homework', homeworkWithTimestamp);
}

// Submission functions
export async function getSubmissions(userId: string): Promise<Submission[]> { 
    const collectionRef = collection(db, 'users', userId, 'submissions');
    const querySnapshot = await getDocs(collectionRef);
    return querySnapshot.docs.map(doc => docToData<Submission>(doc));
}
export async function setSubmission(userId: string, submission: Partial<Submission>): Promise<Submission> {
    const { studentId, homeworkId, ...rest } = submission;
    if (!studentId || !homeworkId) {
        throw new Error("studentId and homeworkId are required.");
    }

    const submissionsRef = collection(db, 'users', userId, 'submissions');
    const q = query(
        submissionsRef,
        where('studentId', '==', studentId),
        where('homeworkId', '==', homeworkId)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        const newSubmissionData = { studentId, homeworkId, status: rest.status || 'Godkjent', comment: rest.comment || "", ...rest, createdAt: Timestamp.now() };
        if ('id' in newSubmissionData) delete (newSubmissionData as any).id;
        return addUserDocument(userId, 'submissions', newSubmissionData);
    } else {
        const docId = querySnapshot.docs[0].id;
        await updateUserDocument(userId, 'submissions', docId, rest);
        const docSnap = await getDoc(doc(submissionsRef, docId));
        return docToData<Submission>(docSnap);
    }
};

export async function batchAddSubmissions(userId: string, submissions: Omit<Submission, 'id'>[]): Promise<void> {
    const batch = writeBatch(db);
    const submissionsCollection = collection(db, 'users', userId, 'submissions');
    submissions.forEach(submission => {
        const docRef = doc(submissionsCollection);
        batch.set(docRef, {...submission, createdAt: Timestamp.now() });
    });
    await batch.commit();
}


// DailyCheck functions
export async function getDailyChecks(userId: string): Promise<DailyCheck[]> { 
    const collectionRef = collection(db, 'users', userId, 'dailyChecks');
    const querySnapshot = await getDocs(collectionRef);
    return querySnapshot.docs.map(doc => docToData<DailyCheck>(doc));
}
export async function setDailyCheck(userId: string, check: Omit<DailyCheck, 'id'>): Promise<DailyCheck> {
    const { studentId, date, ...rest } = check;
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    const checksRef = collection(db, 'users', userId, 'dailyChecks');
    const q = query(checksRef, where('studentId', '==', studentId));
    const querySnapshot = await getDocs(q);
    
    const checkWithTimestamp = { ...check, date: Timestamp.fromDate(new Date(date)), createdAt: Timestamp.now() };
    
    const existingDoc = querySnapshot.docs.find(doc => {
        const checkData = docToData<DailyCheck>(doc);
        const checkDate = new Date(checkData.date);
        checkDate.setHours(0,0,0,0);
        return checkDate.getTime() === dateOnly.getTime();
    });

    if (!existingDoc) {
        return addUserDocument(userId, 'dailyChecks', checkWithTimestamp);
    } else {
        const docId = existingDoc.id;
        const updateData = { ...rest, date: Timestamp.fromDate(new Date(date)) };
        await updateUserDocument(userId, 'dailyChecks', docId, updateData);
        const docSnap = await getDoc(doc(checksRef, docId));
        return docToData<DailyCheck>(docSnap);
    }
};

export async function deleteDailyCheckByStudentAndDate(userId: string, studentId: string, date: Date) {
     const dateOnly = new Date(date);
     dateOnly.setHours(0, 0, 0, 0);
     
     const checksRef = collection(db, 'users', userId, 'dailyChecks');
     const q = query(checksRef, where('studentId', '==', studentId));
     const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
        const docToDelete = querySnapshot.docs.find(doc => {
            const check = docToData<DailyCheck>(doc);
            const checkDate = new Date(check.date);
            checkDate.setHours(0, 0, 0, 0);
            return checkDate.getTime() === dateOnly.getTime();
        });

        if (docToDelete) {
            await deleteUserDocument(userId, 'dailyChecks', docToDelete.id);
        }
    }
}

// Remark functions
export async function getRemarks(userId: string): Promise<Remark[]> {
    const collectionRef = collection(db, 'users', userId, 'remarks');
    const querySnapshot = await getDocs(collectionRef);
    return querySnapshot.docs.map(doc => docToData<Remark>(doc));
}
export async function addRemark(userId: string, remark: Omit<Remark, 'id'>): Promise<Remark> {
    const remarkWithTimestamp = { ...remark, date: Timestamp.fromDate(new Date(remark.date)), createdAt: Timestamp.now() };
    return addUserDocument(userId, 'remarks', remarkWithTimestamp);
}
export async function deleteRemark(userId: string, id: string) { return deleteUserDocument(userId, 'remarks', id); }

// Seating Chart Layout functions
export async function getSeatingLayouts(userId: string): Promise<SeatingLayout[]> {
    const layouts = await fetchUserCollection<{ id: string, layoutJson: string, [key: string]: any }>(userId, 'seatingLayouts');
    return layouts.map(l => ({ ...l, layout: JSON.parse(l.layoutJson) as boolean[][] }));
}

export async function saveSeatingLayout(userId: string, layout: Omit<SeatingLayout, 'id' | 'createdAt' | 'layoutJson'> & { layout: boolean[][] }): Promise<SeatingLayout> {
    const { layout: layoutArray, ...rest } = layout;
    const layoutJson = JSON.stringify(layoutArray);

    const layoutWithTimestamp = { ...rest, layoutJson, createdAt: Timestamp.now() };
    
    const savedDoc = await addUserDocument(userId, 'seatingLayouts', layoutWithTimestamp);
    
    return { ...savedDoc, layout: layoutArray };
}

export async function deleteSeatingLayout(userId: string, id: string) {
    return deleteUserDocument(userId, 'seatingLayouts', id);
}

// Seating Chart History functions
type SeatingChartSettings = { rows: number; cols: number; groupSize: number };
export async function getLatestSeatingChart(userId: string): Promise<{ chart: SeatingChartData; settings: SeatingChartSettings } | null> {
    const chartsRef = collection(db, 'users', userId, 'seatingCharts');
    const q = query(chartsRef, orderBy('createdAt', 'desc'), limit(1));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return null;
    }
    const latestChartRecord = docToData<SeatingChartRecord>(querySnapshot.docs[0]);
    try {
        const chart = JSON.parse(latestChartRecord.chartJson);
        const settings = {
            rows: latestChartRecord.rows,
            cols: latestChartRecord.cols,
            groupSize: latestChartRecord.groupSize,
        };
        return { chart, settings };
    } catch (error) {
        console.error("Error parsing seating chart JSON:", error);
        return null;
    }
}

export async function getSeatingChartHistory(userId: string): Promise<SeatingChartRecord[]> {
    const chartsRef = collection(db, 'users', userId, 'seatingCharts');
    const q = query(chartsRef, orderBy('createdAt', 'desc'), limit(10));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => docToData<SeatingChartRecord>(doc));
}


export async function saveSeatingChart(userId: string, chart: SeatingChartData, settings: SeatingChartSettings): Promise<void> {
    const newChartRecord: Omit<SeatingChartRecord, 'id' | 'createdAt'> & { createdAt: Timestamp } = {
        chartJson: JSON.stringify(chart),
        rows: settings.rows,
        cols: settings.cols,
        groupSize: settings.groupSize,
        createdAt: Timestamp.now(),
    };
    await addUserDocument(userId, 'seatingCharts', newChartRecord);
}

async function clearUserCollection(userId: string, collectionName: string) {
    const collectionRef = collection(db, 'users', userId, collectionName);
    const querySnapshot = await getDocs(collectionRef);
    const batch = writeBatch(db);
    querySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
}

export async function resetAndSeedDatabase(userId: string) {
  await clearUserCollection(userId, 'students');
  await clearUserCollection(userId, 'subjects');
  await clearUserCollection(userId, 'homework');
  await clearUserCollection(userId, 'submissions');
  await clearUserCollection(userId, 'dailyChecks');
  await clearUserCollection(userId, 'seatingCharts');
  await clearUserCollection(userId, 'seatingLayouts');
  await clearUserCollection(userId, 'remarks');
  await clearUserCollection(userId, 'settings');
  await seedDatabase(userId);
}


async function seedDatabase(userId: string) {
  const students: Omit<Student, 'id'>[] = [
    { name: 'Liam Jensen' }, { name: 'Olivia Nguyen' }, { name: 'Noah Olsen' },
    { name: 'Emma Johansen' }, { name: 'Lucas Andersen' }, { name: 'Mia Hansen' },
    { name: 'Aksel Kristiansen' }, { name: 'Frida Pedersen' }, { name: 'Filip Eriksen' },
    { name: 'Astrid Larsen' }, { name: 'Oskar Nilsen' }, { name: 'Ingrid Berg' },
    { name: 'Jakob Dahl' }, { name: 'Linnea Solberg' }, { name: 'Henrik Pettersen' },
  ];
  
  const subjects: Omit<Subject, 'id'>[] = [
    { name: 'Norsk' }, { name: 'Matematikk' }, { name: 'Engelsk' }, { name: 'Naturfag' },
  ];

  const studentDocs = await Promise.all(students.map(s => addUserDocument(userId, "students", s)));
  const subjectDocs = await Promise.all(subjects.map(s => addUserDocument(userId, "subjects", s)));
  
  const studentIds = studentDocs.map(doc => doc.id);
  const subjectIds = subjectDocs.map(doc => doc.id);

  const today = new Date();
  const dataBatch = writeBatch(db);

  const homeworkRef = collection(db, 'users', userId, 'homework');
  const submissionsRef = collection(db, 'users', userId, 'submissions');
  const dailyChecksRef = collection(db, 'users', userId, 'dailyChecks');
  const remarksRef = collection(db, 'users', userId, 'remarks');

  for (let i = 180; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const week = getWeekNumber(date);

    if (Math.random() < 0.4) {
      const subjectId = subjectIds[Math.floor(Math.random() * subjectIds.length)];
      
      const newHomeworkRef = doc(homeworkRef);
      const newHomework = {
        title: `Leselekse dag ${180 - i}`,
        subjectId: subjectId,
        week,
        date: Timestamp.fromDate(date),
        createdAt: Timestamp.fromDate(date)
      };
      dataBatch.set(newHomeworkRef, newHomework);

      studentIds.forEach(studentId => {
        const randomStatus = Math.random();
        let status: HomeworkStatus = 'Godkjent';
        if (randomStatus < 0.05) status = 'Ikke levert';
        else if (randomStatus < 0.1) status = 'Må rettes';
        else if (randomStatus < 0.13) status = 'Syk/Fravær';
        else if (randomStatus < 0.16) status = 'Glemt bok';
        
        const newSubmissionRef = doc(submissionsRef);
        const newSubmission: Omit<Submission, 'id' | 'comment'> & { comment?: string, createdAt: Timestamp } = {
          studentId: studentId,
          homeworkId: newHomeworkRef.id,
          status,
          createdAt: Timestamp.fromDate(date)
        };

        if (status !== 'Godkjent' && Math.random() < 0.5) {
          newSubmission.comment = `Gjorde en god innsats, men trenger å se over ${Math.floor(Math.random() * 3) + 1} oppgaver.`;
        }
        dataBatch.set(newSubmissionRef, newSubmission);
      });
    }

    studentIds.forEach(studentId => {
      const randomCheck = Math.random();
      if (randomCheck < 0.1) {
          const newCheckRef = doc(dailyChecksRef);
          dataBatch.set(newCheckRef, {
              studentId: studentId,
              date: Timestamp.fromDate(date),
              ipadCharged: randomCheck > 0.05,
              ipadBrought: randomCheck < 0.05 ? false : true,
              createdAt: Timestamp.fromDate(date)
          });
      }
      if (Math.random() < 0.02) {
        const newRemarkRef = doc(remarksRef);
        dataBatch.set(newRemarkRef, {
          studentId: studentId,
          date: Timestamp.fromDate(date),
          period: Math.floor(Math.random() * 6) + 1,
          createdAt: Timestamp.fromDate(date)
        });
      }
    });
  }

  await dataBatch.commit();
}
