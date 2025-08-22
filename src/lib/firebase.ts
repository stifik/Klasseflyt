// firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "leksehjelperen",
  appId: "1:921278946270:web:e33466e16e07e626b71b4f",
  storageBucket: "leksehjelperen.firebasestorage.app",
  apiKey: "AIzaSyAc84hVWcY8zY2JpUVQP90k6SylmyoryKQ",
  authDomain: "leksehjelperen.firebaseapp.com",
  messagingSenderId: "921278946270"
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
