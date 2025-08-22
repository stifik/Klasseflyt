// firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  authDomain: "dev-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.firebaseapp.com",
  projectId: "dev-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  storageBucket: "dev-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.appspot.com",
  messagingSenderId: "xxxxxxxxxxxx",
  appId: "x:xxxxxxxxxxxx:web:xxxxxxxxxxxxxxxxxxxxxx"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };
