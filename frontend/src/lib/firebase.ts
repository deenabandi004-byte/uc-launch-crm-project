import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD1PcnAOw6gAG8cThOkVZ_8sSGd3vsMfMo",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "outboundcrm.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "outboundcrm",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "outboundcrm.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "251175456395",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:251175456395:web:9d077e7973b30266df4e8e",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
