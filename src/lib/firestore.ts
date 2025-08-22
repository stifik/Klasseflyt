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
  return { id: docRef.id, ...data };
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
export const getStudents = () => fetchCollection<Student>('students');
export const addStudent = (student: Omit<Student, 'id'>) => addDocument('students', student);
export const deleteStudent = (id: string) => deleteDocument('students', id);

// Subject functions
export const getSubjects = () => fetchCollection<Subject>('subjects');
export const addSubject = (subject: Omit<Subject, 'id'>) => addDocument('subjects', subject);
export const deleteSubject = (id: string) => deleteDocument('subjects', id);

// Homework functions
export const getHomework = () => fetchCollection<Homework>('homework');
export const addHomework = (homework: Omit<Homework, 'id'>) => addDocument('homework', homework);

// Submission functions
export const getSubmissions = () => fetchCollection<Submission>('submissions');
export const setSubmission = async (submission: Omit<Submission, 'id'>) => {
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
export const getDailyChecks = () => fetchCollection<DailyCheck>('dailyChecks');
export const setDailyCheck = async (check: Omit<DailyCheck, 'id'>) => {
    const { studentId, date, ...rest } = check;
    const dateString = new Date(date).toISOString().split('T')[0];
    
    const q = query(
        collection(db, 'dailyChecks'),
        where('studentId', '==', studentId),
        // Firestore doesn't support date object equality directly in where clauses well.
        // A common pattern is to store the date as a string or timestamp.
        // For this query to work, we'd need to adjust how we store/query dates.
        // A simpler approach for this app is to fetch and filter client-side or store a date string.
        // Let's assume we store the full date and need to find the specific day's check.
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
export const deleteDailyCheckByStudentAndDate = async (studentId: string, date: Date) => {
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
export const seedDatabase = async () => {
  const studentsSnapshot = await getDocs(collection(db, 'students'));
  if (!studentsSnapshot.empty) {
    console.log('Database already seeded.');
    return;
  }

  console.log('Seeding database...');
  const { students, subjects, homework, submissions, dailyChecks } = await import('@/lib/mock-data');
  const batch = writeBatch(db);

  students.forEach(s => batch.set(doc(collection(db, 'students')), {name: s.name}));
  subjects.forEach(s => batch.set(doc(collection(db, 'subjects')), {name: s.name}));
  
  // Note: Seeding relational data like this is complex.
  // For a real app, you'd need to get the newly created IDs for students/subjects
  // and use them to create homework/submissions.
  // For this demo, we'll skip seeding the more complex data.
  // homework.forEach(h => batch.set(doc(collection(db, 'homework')), h));
  // submissions.forEach(s => batch.set(doc(collection(db, 'submissions')), s));
  // dailyChecks.forEach(dc => batch.set(doc(collection(db, 'dailyChecks')), dc));

  await batch.commit();
  console.log('Database seeded successfully.');
};
