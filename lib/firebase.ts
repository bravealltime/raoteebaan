import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDtZQ_gX9xWqGQgxQMBzTH8c9o6t-ZsvKc",
  authDomain: "raoteebaan.firebaseapp.com",
  databaseURL: "https://raoteebaan-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "raoteebaan",
  storageBucket: "raoteebaan.appspot.com",
  messagingSenderId: "986271509277",
  appId: "1:986271509277:web:ff35142f2eabe2063c0ff4",
  measurementId: "G-YW7ZP3B4TC"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app); 