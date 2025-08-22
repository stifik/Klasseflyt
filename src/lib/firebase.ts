// firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAc84hVWcY8zY2JpUVQP90k6SylmyoryKQ",
  authDomain: "leksehjelperen.firebaseapp.com",
  projectId: "leksehjelperen",
  storageBucket: "leksehjelperen.firebasestorage.app",
  messagingSenderId: "921278946270",
  appId: "1:921278946270:web:e33466e16e07e626b71b4f"
};

function initializeFirebase() {
    return !getApps().length ? initializeApp(firebaseConfig) : getApp();
}

const app = initializeFirebase();
const db = getFirestore(app);

// Export a function that ensures initialization and returns db
const getDb = () => {
    initializeFirebase();
    return db;
};


export { db, getDb };
