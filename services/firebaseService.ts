
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  doc,
  writeBatch
} from "firebase/firestore";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User
} from "firebase/auth";
import { SurveyRecord } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyAdBqNn8AW49veNeJJ4CjiTmwLEonvg8Mg",
  authDomain: "quest-analytics-native.firebaseapp.com",
  projectId: "quest-analytics-native",
  storageBucket: "quest-analytics-native.firebasestorage.app",
  messagingSenderId: "19725162334",
  appId: "1:19725162334:web:211af1008c72e2225e21cf",
  measurementId: "G-3S2RZXTDGR"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const surveysCol = collection(db, "surveys");

export const firebaseService = {
  auth,
  
  async loginAdmin(email, password): Promise<User | null> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error: any) {
      console.error("Login Error:", error.message);
      throw error;
    }
  },

  async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error: any) {
      console.error("Logout Error:", error.message);
    }
  },

  subscribeToAuthChanges(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  async getAllSurveys(): Promise<SurveyRecord[]> {
    try {
      const snapshot = await getDocs(surveysCol);
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as SurveyRecord));
    } catch (error) {
      console.error("Firestore Error (Get):", error);
      return [];
    }
  },

  async addSurveys(newSurveys: SurveyRecord[], fileName: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      newSurveys.forEach(survey => {
        const docRef = doc(surveysCol);
        batch.set(docRef, { ...survey, fileName });
      });
      await batch.commit();
    } catch (error) {
      console.error("Firestore Error (Add):", error);
      throw error;
    }
  },

  async deleteSurveysByFileName(fileName: string): Promise<void> {
    try {
      const q = query(surveysCol, where("fileName", "==", fileName));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
    } catch (error) {
      console.error("Firestore Error (Delete File):", error);
      throw error;
    }
  },

  async clearAllData(): Promise<void> {
    try {
      const snapshot = await getDocs(surveysCol);
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
    } catch (error) {
      console.error("Firestore Error (Clear All):", error);
      throw error;
    }
  }
};
