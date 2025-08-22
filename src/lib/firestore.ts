
"use server";

import { db } from './firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch, query, where, getDoc, Timestamp, setDoc } from 'firebase/firestore';
import type { Student, Subject, Homework, Submission, DailyCheck } from './types';
import { students, subjects, homework, submissions, dailyChecks } from '@/lib/mock-data';

// Helper to convert Firestore Timestamps to JS Dates
const convertTimestamps = (data: any) => {
  if (data?.date && data.date instanceof Timestamp) {
    return { ...data, date: data.date.toDate() };
  }
  return data;
};

// Function to seed database if it's empty
async function seedDatabase() {
  console.log('Checking if database needs seeding...');
  const studentsSnapshot = await getDocs(collection(db, 'students'));
  if (!studentsSnapshot.empty) {
    console.log('Database already contains data. Skipping seed.');
    return;
  }
  
  console.log('Seeding database...');
  const batch = writeBatch(db);

  students.forEach(s => {
    const docRef = doc(db, 'students', s.id);
    batch.set(docRef, { name: s.name });
  });

  subjects.forEach(s => {
    const docRef = doc(db, 'subjects', s.id);
    batch.set(docRef, { name: s.name });
  });

  homework.forEach(h => {
    const docRef = doc(db, 'homework', h.id);
    batch.set(docRef, {
      title: h.title,
      subjectId: h.subjectId,
      week: h.week,
      date: Timestamp.fromDate(h.date)
    });
  });

  submissions.forEach(s => {
    const docRef = doc(db, 'submissions', s.id);
    batch.set(docRef, {
      studentId: s.studentId,
      homeworkId: s.homeworkId,
      status: s.status,
      comment: s.comment || ""
    });
  });
  
  dailyChecks.forEach(c => {
    const docRef = doc(db, 'dailyChecks', c.id);
    batch.set(docRef, {
      studentId: c.studentId,
      date: Timestamp.fromDate(c.date),
      ipadCharged: c.ipadCharged,
      ipadBrought: c.ipadBrought
    });
  });
  
  await batch.commit();
  console.log('Database seeded successfully.');
};

(async () => {
  await seedDatabase();
})();


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
export async function addHomework(homework: Omit<Homework, 'id'>) { return addDocument('homework', homework); }

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

    const startOfDay = Timestamp.fromDate(dateOnly);
    
    const nextDay = new Date(dateOnly);
    nextDay.setDate(dateOnly.getDate() + 1);
    const endOfDay = Timestamp.fromDate(nextDay);

    const q = query(
        collection(db, 'dailyChecks'),
        where('studentId', '==', studentId),
        where('date', '>=', startOfDay),
        where('date', '<', endOfDay)
    );

    const querySnapshot = await getDocs(q);
    
    const checkWithTimestamp = { ...check, date: Timestamp.fromDate(new Date(date)) };
    
    if (querySnapshot.empty) {
        return addDocument('dailyChecks', checkWithTimestamp);
    } else {
        const docId = querySnapshot.docs[0].id;
        const updateData = { ...rest, date: Timestamp.fromDate(new Date(date)) };
        await updateDocument('dailyChecks', docId, updateData);
        const docSnap = await getDoc(doc(db, 'dailyChecks', docId));
        return {id: docId, ...(convertTimestamps(docSnap.data()) as Omit<DailyCheck, 'id'>)} as DailyCheck;
    }
};
export async function deleteDailyCheckByStudentAndDate(studentId: string, date: Date) {
     const dateOnly = new Date(date);
     dateOnly.setHours(0, 0, 0, 0);

     const startOfDay = Timestamp.fromDate(dateOnly);
     
     const nextDay = new Date(dateOnly);
     nextDay.setDate(dateOnly.getDate() + 1);
     const endOfDay = Timestamp.fromDate(nextDay);
     
     const q = query(
        collection(db, 'dailyChecks'),
        where('studentId', '==', studentId),
        where('date', '>=', startOfDay),
        where('date', '<', endOfDay)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
        const docId = querySnapshot.docs[0].id;
        await deleteDocument('dailyChecks', docId);
    }
}

