// scripts/seed-db.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { students, subjects } from "@/lib/mock-data";

// Manually insert your Firebase config details here for the script
const firebaseConfig = {
  projectId: "leksehjelperen",
  appId: "1:921278946270:web:e33466e16e07e626b71b4f",
  storageBucket: "leksehjelperen.firebasestorage.app",
  apiKey: "AIzaSyAc84hVWcY8zY2JpUVQP90k6SylmyoryKQ",
  authDomain: "leksehjelperen.firebaseapp.com",
  messagingSenderId: "921278946270"
};


const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

async function seedDatabase() {
  console.log("Starting to seed database...");

  const studentsRef = collection(db, "students");
  const subjectsRef = collection(db, "subjects");
  
  const studentsSnapshot = await getDocs(studentsRef);
  if (!studentsSnapshot.empty) {
    console.log("Database already contains data. Skipping seed.");
    return;
  }

  const batch = writeBatch(db);

  students.forEach(student => {
    const docRef = doc(studentsRef, student.id);
    batch.set(docRef, { name: student.name });
  });

  subjects.forEach(subject => {
     const docRef = doc(subjectsRef, subject.id);
    batch.set(docRef, { name: subject.name });
  });

  try {
    await batch.commit();
    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

seedDatabase().then(() => {
  console.log("Script finished.");
  process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
