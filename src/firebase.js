import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDFGUncdKL-5_DD3_11e05HKBqrQWMDzSU",
    authDomain: "rater-joes.firebaseapp.com",
    projectId: "rater-joes",
    storageBucket: "rater-joes.firebasestorage.app",
    messagingSenderId: "679567127281",
    appId: "1:679567127281:web:bac0ccb4b6656defdfaf50"
  };  

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Lazy load storage to reduce initial bundle size
let storageInstance = null;
export const getStorage = async () => {
  if (!storageInstance) {
    const { getStorage } = await import("firebase/storage");
    storageInstance = getStorage(app);
  }
  return storageInstance;
};
