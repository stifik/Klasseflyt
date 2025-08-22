
"use server";

import { db } from './firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, getDoc, Timestamp, writeBatch } from 'firebase/firestore';
import type { Student, Subject, Homework, Submission, DailyCheck, HomeworkStatus } from './types';

// Helper to convert Firestore Timestamps to JS Dates
const convertTimestamps = (data: any) => {
  if (data?.date && data.date instanceof Timestamp) {
    return { ...data, date: data.date.toDate() };
  }
  return data;
};

// Generic fetch function
async function fetchCollection<T>(collectionName: string): Promise<T[]> {
  const querySnapshot = await getDocs(collection(db, collectionName));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as T));
}

// Generic add function
async function addDocument<T extends object>(collectionName: string, data: T): Promise<T & { id: string }> {
  const docRef = await addDoc(collection(db, collectionName), data);
  const docSnap = await getDoc(docRef);
  const docData = docSnap.data();
  return { id: docRef.id, ...(convertTimestamps(docData) as T) };
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
export async function addHomework(homework: Omit<Homework, 'id'>) { return addDocument('homework', { ...homework, date: Timestamp.fromDate(homework.date) }); }

// Submission functions
export async function getSubmissions(): Promise<Submission[]> { return fetchCollection<Submission>('submissions'); }
export async function setSubmission(submission: Omit<Submission, 'id'>): Promise<Submission> {
    const { studentId, homeworkId, ...rest } = submission;
    const q = query(
        collection(db, 'submissions'),
        where('studentId', '==', studentId),
        where('homeworkId', '==', homeworkId)
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return addDocument('submissions', submission);
    } else {
        const docId = querySnapshot.docs[0].id;
        await updateDocument('submissions', docId, rest);
        const docSnap = await getDoc(doc(db, 'submissions', docId));
        return {id: docId, ...(convertTimestamps(docSnap.data()) as Omit<Submission, 'id'>)} as Submission;
    }
};


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
        const checkData = convertTimestamps(doc.data()) as DailyCheck;
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
        return {id: docId, ...(convertTimestamps(docSnap.data()) as Omit<DailyCheck, 'id'>)} as DailyCheck;
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
            const check = convertTimestamps(doc.data()) as DailyCheck;
            const checkDate = new Date(check.date);
            checkDate.setHours(0, 0, 0, 0);
            return checkDate.getTime() === dateOnly.getTime();
        });

        if (docToDelete) {
            await deleteDocument('dailyChecks', docToDelete.id);
        }
    }
}

export async function seedDatabase() {
    
  if (!('getWeek' in Date.prototype)) {
    Date.prototype.getWeek = function() {
        const d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
    };
  }

  const students: Omit<Student, 'id'>[] = [
    { name: 'Liam Jensen' }, { name: 'Olivia Nguyen' }, { name: 'Noah Olsen' },
    { name: 'Emma Johansen' }, { name: 'Lucas Andersen' }, { name: 'Mia Hansen' },
    { name: 'Aksel Kristiansen' }, { name: 'Frida Pedersen' },
  ];
  
  const subjects: Omit<Subject, 'id'>[] = [
    { name: 'Norsk' }, { name: 'Matematikk' }, { name: 'Engelsk' }, { name: 'Naturfag' },
  ];

  const initialBatch = writeBatch(db);

  // Add students and subjects, and keep track of their new IDs
  const studentRefs = students.map(s => {
      const ref = doc(collection(db, "students"));
      initialBatch.set(ref, s);
      return ref;
  });
  const subjectRefs = subjects.map(s => {
      const ref = doc(collection(db, "subjects"));
      initialBatch.set(ref, s);
      return ref;
  });

  await initialBatch.commit();

  // We need to get the documents back to get their IDs
  const studentDocs = await Promise.all(studentRefs.map(ref => getDoc(ref)));
  const subjectDocs = await Promise.all(subjectRefs.map(ref => getDoc(ref)));
  
  const studentIds = studentDocs.map(doc => doc.id);
  const subjectIds = subjectDocs.map(doc => doc.id);
  
  const today = new Date();
  
  const dataBatch = writeBatch(db);

  // Generate 6 months of demo data
  for (let i = 180; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const week = date.getWeek();

    if (Math.random() < 0.4) {
      const subjectId = subjectIds[Math.floor(Math.random() * subjectIds.length)];
      const hwRef = doc(collection(db, 'homework'));
      const newHomework = {
        title: `Leselekse ${i}`,
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
              ipadBrought: randomCheck < 0.05 || randomCheck > 0.07,
          });
      }
    });
  }

  // Commit all the generated data
  await dataBatch.commit();
}
