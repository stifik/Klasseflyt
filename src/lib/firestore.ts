"use server";

import { db } from './firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch, query, where, getDoc } from 'firebase/firestore';
import type { Student, Subject, Homework, Submission, DailyCheck } from './types';

// Generic fetch function
async function fetchCollection<T>(collectionName: string): Promise<T[]> {
  const querySnapshot = await getDocs(collection(db, collectionName));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
}

// Generic add function
async function addDocument<T extends object>(collectionName: string, data: T): Promise<T & { id: string }> {
  const docRef = await addDoc(collection(db, collectionName), data);
  const docSnap = await getDoc(docRef);
  return { id: docRef.id, ...(docSnap.data() as T) };
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
export async function getStudents(): Promise<Student[]> { return fetchCollection<Student>('students'); }
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
        return {id: docId, ...docSnap.data()} as Submission;
    }
};


// DailyCheck functions
export async function getDailyChecks(): Promise<DailyCheck[]> { return fetchCollection<DailyCheck>('dailyChecks'); }
export async function setDailyCheck(check: Omit<DailyCheck, 'id'>): Promise<DailyCheck> {
    const { studentId, date, ...rest } = check;
    const dateString = new Date(date).toISOString().split('T')[0];
    
    const q = query(
        collection(db, 'dailyChecks'),
        where('studentId', '==', studentId),
    );

    const querySnapshot = await getDocs(q);
    const checks = querySnapshot.docs.map(doc => ({id: doc.id, ...doc.data()})) as DailyCheck[];
    const existingDoc = checks.find(c => new Date(c.date).toISOString().split('T')[0] === dateString);


    if (!existingDoc) {
        return addDocument('dailyChecks', check);
    } else {
        await updateDocument('dailyChecks', existingDoc.id, rest);
        const docSnap = await getDoc(doc(db, 'dailyChecks', existingDoc.id));
        return {id: existingDoc.id, ...docSnap.data()} as DailyCheck;
    }
};
export async function deleteDailyCheckByStudentAndDate(studentId: string, date: Date) {
     const dateString = new Date(date).toISOString().split('T')[0];
     const q = query(
        collection(db, 'dailyChecks'),
        where('studentId', '==', studentId),
    );
    const querySnapshot = await getDocs(q);
    const checks = querySnapshot.docs.map(doc => ({id: doc.id, ...doc.data()})) as DailyCheck[];
    const existingDoc = checks.find(c => new Date(c.date).toISOString().split('T')[0] === dateString);

    if (existingDoc) {
        await deleteDocument('dailyChecks', existingDoc.id);
    }
}


// Function to seed database if it's empty
export async function seedDatabase() {
  const studentsSnapshot = await getDocs(collection(db, 'students'));
  if (!studentsSnapshot.empty) {
    console.log('Database already seeded.');
    throw new Error("Database already contains data. Seeding aborted.");
  }

  console.log('Seeding database...');
  const { students, subjects } = await import('@/lib/mock-data');
  const batch = writeBatch(db);

  students.forEach(s => {
    const docRef = doc(collection(db, 'students'));
    batch.set(docRef, { name: s.name });
  });
  subjects.forEach(s => {
    const docRef = doc(collection(db, 'subjects'));
    batch.set(docRef, { name: s.name });
  });
  
  await batch.commit();
  console.log('Database seeded successfully with students and subjects.');
};
