
"use server";

import { db } from './firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, getDoc, Timestamp, writeBatch, limit, orderBy } from 'firebase/firestore';
import type { Student, Subject, Homework, Submission, DailyCheck, HomeworkStatus, SeatingChartRecord, SeatingChartData } from './types';
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

// Generic fetch function
async function fetchCollection<T>(collectionName: string): Promise<T[]> {
  const querySnapshot = await getDocs(collection(db, collectionName));
  return querySnapshot.docs.map(doc => docToData<T>(doc));
}


// Generic add function
async function addDocument<T extends object>(collectionName: string, data: T): Promise<T & { id: string }> {
  const docRef = await addDoc(collection(db, collectionName), data);
  const docSnap = await getDoc(docRef);
  return docToData<T & { id: string }>(docSnap);
}

// Generic update function
async function updateDocument<T extends object>(collectionName:string, id: string, data: Partial<T>): Promise<void> {
  const docRef = doc(db, collectionName, id);
  await updateDoc(docRef, data);
}

// Generic delete function
async function deleteDocument(collectionName: string, id: string): Promise<void> {
  await deleteDoc(doc(db, collectionName, id));
}

// Student functions
export async function getStudents(): Promise<Student[]> { 
  return fetchCollection<Student>('students'); 
}
export async function addStudent(student: Omit<Student, 'id'>) { return addDocument('students', student); }
export async function deleteStudent(id: string) { return deleteDocument('students', id); }

// Subject functions
export async function getSubjects(): Promise<Subject[]> { return fetchCollection<Subject>('subjects'); }
export async function addSubject(subject: Omit<Subject, 'id'>) { return addDocument('subjects', subject); }
export async function deleteSubject(id: string) { return deleteDocument('subjects', id); }

// Homework functions
export async function getHomework(): Promise<Homework[]> { return fetchCollection<Homework>('homework'); }
export async function addHomework(homework: Omit<Homework, 'id'>) { 
    const homeworkWithTimestamp = { ...homework, date: Timestamp.fromDate(homework.date) };
    return addDocument('homework', homeworkWithTimestamp);
}

// Submission functions
export async function getSubmissions(): Promise<Submission[]> { return fetchCollection<Submission>('submissions'); }
export async function setSubmission(submission: Partial<Submission>): Promise<Submission> {
    const { studentId, homeworkId, ...rest } = submission;
    if (!studentId || !homeworkId) {
        throw new Error("studentId and homeworkId are required.");
    }

    const q = query(
        collection(db, 'submissions'),
        where('studentId', '==', studentId),
        where('homeworkId', '==', homeworkId)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        // Document doesn't exist, create it.
        const newSubmissionData = {
            studentId,
            homeworkId,
            status: rest.status || 'Godkjent', // Provide a default status
            comment: rest.comment || "",
            ...rest,
        };
        // remove id if it was temporary
        if ('id' in newSubmissionData) {
            delete (newSubmissionData as any).id;
        }
        return addDocument('submissions', newSubmissionData);
    } else {
        // Document exists, update it.
        const docId = querySnapshot.docs[0].id;
        await updateDocument('submissions', docId, rest);
        const docSnap = await getDoc(doc(db, 'submissions', docId));
        return docToData<Submission>(docSnap);
    }
};

export async function batchAddSubmissions(submissions: Omit<Submission, 'id'>[]): Promise<void> {
    const batch = writeBatch(db);
    const submissionsCollection = collection(db, 'submissions');

    submissions.forEach(submission => {
        const docRef = doc(submissionsCollection); // Create a new doc with a unique ID
        batch.set(docRef, submission);
    });

    await batch.commit();
}


// DailyCheck functions
export async function getDailyChecks(): Promise<DailyCheck[]> { return fetchCollection<DailyCheck>('dailyChecks'); }
export async function setDailyCheck(check: Omit<DailyCheck, 'id'>): Promise<DailyCheck> {
    const { studentId, date, ...rest } = check;
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    const q = query(
        collection(db, 'dailyChecks'),
        where('studentId', '==', studentId)
    );

    const querySnapshot = await getDocs(q);
    const checkWithTimestamp = { ...check, date: Timestamp.fromDate(new Date(date)) };
    
    const existingDoc = querySnapshot.docs.find(doc => {
        const checkData = docToData<DailyCheck>(doc);
        const checkDate = new Date(checkData.date);
        checkDate.setHours(0,0,0,0);
        return checkDate.getTime() === dateOnly.getTime();
    });

    if (!existingDoc) {
        return addDocument('dailyChecks', checkWithTimestamp);
    } else {
        const docId = existingDoc.id;
        const updateData = { ...rest, date: Timestamp.fromDate(new Date(date)) };
        await updateDocument('dailyChecks', docId, updateData);
        const docSnap = await getDoc(doc(db, 'dailyChecks', docId));
        return docToData<DailyCheck>(docSnap);
    }
};
export async function deleteDailyCheckByStudentAndDate(studentId: string, date: Date) {
     const dateOnly = new Date(date);
     dateOnly.setHours(0, 0, 0, 0);
     
     const q = query(
        collection(db, 'dailyChecks'),
        where('studentId', '==', studentId)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
        const docToDelete = querySnapshot.docs.find(doc => {
            const check = docToData<DailyCheck>(doc);
            const checkDate = new Date(check.date);
            checkDate.setHours(0, 0, 0, 0);
            return checkDate.getTime() === dateOnly.getTime();
        });

        if (docToDelete) {
            await deleteDocument('dailyChecks', docToDelete.id);
        }
    }
}

// Seating Chart functions
export async function getSeatingChart(): Promise<SeatingChartData | null> {
    const q = query(collection(db, 'seatingCharts'), orderBy('createdAt', 'desc'), limit(1));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return null;
    }
    const latestChartRecord = docToData<SeatingChartRecord>(querySnapshot.docs[0]);
    try {
        // Parse the JSON string back into the nested array structure
        return JSON.parse(latestChartRecord.chartJson);
    } catch (error) {
        console.error("Error parsing seating chart JSON:", error);
        return null;
    }
}

export async function saveSeatingChart(chart: SeatingChartData): Promise<void> {
    const newChartRecord = {
        // Convert the nested array into a JSON string
        chartJson: JSON.stringify(chart),
        createdAt: Timestamp.now(),
    };
    await addDocument('seatingCharts', newChartRecord);
}


async function clearCollection(collectionName: string) {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const batch = writeBatch(db);
    querySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
}


export async function resetAndSeedDatabase() {
  await clearCollection('students');
  await clearCollection('subjects');
  await clearCollection('homework');
  await clearCollection('submissions');
  await clearCollection('dailyChecks');
  await clearCollection('seatingCharts');
  await seedDatabase();
}


async function seedDatabase() {
  const students: Omit<Student, 'id'>[] = [
    { name: 'Liam Jensen' }, { name: 'Olivia Nguyen' }, { name: 'Noah Olsen' },
    { name: 'Emma Johansen' }, { name: 'Lucas Andersen' }, { name: 'Mia Hansen' },
    { name: 'Aksel Kristiansen' }, { name: 'Frida Pedersen' },
  ];
  
  const subjects: Omit<Subject, 'id'>[] = [
    { name: 'Norsk' }, { name: 'Matematikk' }, { name: 'Engelsk' }, { name: 'Naturfag' },
  ];

  const studentDocs = await Promise.all(students.map(s => addDoc(collection(db, "students"), s)));
  const subjectDocs = await Promise.all(subjects.map(s => addDoc(collection(db, "subjects"), s)));
  
  const studentIds = studentDocs.map(doc => doc.id);
  const subjectIds = subjectDocs.map(doc => doc.id);

  const today = new Date();
  const dataBatch = writeBatch(db);

  for (let i = 180; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const week = getWeekNumber(date);

    if (Math.random() < 0.4) {
      const subjectId = subjectIds[Math.floor(Math.random() * subjectIds.length)];
      
      const hwRef = doc(collection(db, 'homework'));
      const newHomework = {
        title: `Leselekse dag ${180 - i}`,
        subjectId: subjectId,
        week,
        date: Timestamp.fromDate(date),
      };
      dataBatch.set(hwRef, newHomework);

      studentIds.forEach(studentId => {
        const randomStatus = Math.random();
        let status: HomeworkStatus = 'Godkjent';
        if (randomStatus < 0.05) status = 'Ikke levert';
        else if (randomStatus < 0.1) status = 'Må rettes';
        else if (randomStatus < 0.13) status = 'Syk/Fravær';
        else if (randomStatus < 0.16) status = 'Glemt bok';
        
        const subRef = doc(collection(db, 'submissions'));
        const newSubmission: Omit<Submission, 'id' | 'comment'> & { comment?: string } = {
          studentId: studentId,
          homeworkId: hwRef.id,
          status,
        };

        if (status !== 'Godkjent' && Math.random() < 0.5) {
          newSubmission.comment = `Gjorde en god innsats, men trenger å se over ${Math.floor(Math.random() * 3) + 1} oppgaver.`;
        }
        dataBatch.set(subRef, newSubmission);
      });
    }

    studentIds.forEach(studentId => {
      const randomCheck = Math.random();
      if (randomCheck < 0.1) {
          const checkRef = doc(collection(db, 'dailyChecks'));
          dataBatch.set(checkRef, {
              studentId: studentId,
              date: Timestamp.fromDate(date),
              ipadCharged: randomCheck > 0.05,
              ipadBrought: randomCheck < 0.05 ? false : true,
          });
      }
    });
  }

  await dataBatch.commit();
}

    