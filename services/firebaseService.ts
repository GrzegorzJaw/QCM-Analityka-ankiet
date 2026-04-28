import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  doc,
  writeBatch,
  deleteDoc,
  getDoc
} from "firebase/firestore";
import { 
  getAuth, 
  signInWithPopup,
  GoogleAuthProvider,
  signOut, 
  onAuthStateChanged,
  User
} from "firebase/auth";
import { SurveyRecord } from "../types";
import firebaseConfig from "../firebase-applet-config.json";

// Inicjalizacja aplikacji
const app = initializeApp(firebaseConfig);

// ROZWIĄZANIE BŁĘDU: Jawne wskazanie nazwy bazy danych "ankiety"
// Zamiast (default), podajemy drugi parametr odpowiadający nazwie bazy z konsoli Firebase
export const db = getFirestore(app, "ankiety");

export const auth = getAuth(app);

// Kolekcja również nazywa się "ankiety"
const ankietyCol = collection(db, "ankiety");

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const firebaseService = {
  auth,
  
  async loginAdmin(): Promise<User | null> {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
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

  async getIsAdmin(uid: string): Promise<boolean> {
    try {
      const docRef = doc(db, "admins", uid);
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch (error) {
      console.error("Admin check failed", error);
      return false;
    }
  },

  async getAllSurveys(): Promise<SurveyRecord[]> {
    const path = "ankiety";
    try {
      const snapshot = await getDocs(ankietyCol);
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as SurveyRecord));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },

  async addSurveys(newSurveys: SurveyRecord[], fileName: string): Promise<void> {
    const path = "ankiety";
    try {
      const batch = writeBatch(db);
      newSurveys.forEach(survey => {
        const docRef = doc(ankietyCol);
        const { id, ...data } = survey;
        batch.set(docRef, { ...data, fileName, createdAt: new Date() });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async deleteSurveysByFileName(fileName: string): Promise<void> {
    const path = `ankiety?fileName=${fileName}`;
    try {
      const q = query(ankietyCol, where("fileName", "==", fileName));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async clearAllData(): Promise<void> {
    const path = "ankiety";
    try {
      const snapshot = await getDocs(ankietyCol);
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
};