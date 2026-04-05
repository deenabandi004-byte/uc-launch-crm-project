import React, { createContext, useContext, useState, useEffect } from "react";
import {
  User as FirebaseUser,
  signInWithPopup,
  signOut as firebaseSignOut,
  onIdTokenChanged,
  setPersistence,
  browserLocalPersistence,
  getAdditionalUserInfo,
  GoogleAuthProvider,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

interface User {
  uid: string;
  email: string;
  name: string;
  picture?: string;
  companyName?: string;
  industry?: string;
  needsOnboarding?: boolean;
  gmailConnected?: boolean;
}

type NextRoute = "onboarding" | "home";

interface AuthContextType {
  user: User | null;
  signIn: () => Promise<NextRoute>;
  signOut: () => void;
  updateUser: (updates: Partial<User>) => Promise<void>;
  completeOnboarding: (data: any) => Promise<void>;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

const FirebaseAuthContext = createContext<AuthContextType | undefined>(undefined);

export const useFirebaseAuth = () => {
  const context = useContext(FirebaseAuthContext);
  if (!context) throw new Error("useFirebaseAuth must be used within FirebaseAuthProvider");
  return context;
};

export const FirebaseAuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch {}
      unsub = onIdTokenChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          await loadUserData(firebaseUser);
        } else {
          setUser(null);
        }
        setIsLoading(false);
      });
    })();
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const loadUserData = async (firebaseUser: FirebaseUser) => {
    try {
      const ref = doc(db, "users", firebaseUser.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const d = snap.data();
        // If user has company data, they've completed onboarding regardless of flag
        const hasCompanyData = !!(d.companyName && d.industry);
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          name: firebaseUser.displayName || "",
          picture: firebaseUser.photoURL || undefined,
          companyName: d.companyName,
          industry: d.industry,
          needsOnboarding: hasCompanyData ? false : (d.needsOnboarding ?? true),
          gmailConnected: d.gmailConnected ?? false,
        });
      } else {
        const newUser: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          name: firebaseUser.displayName || "",
          picture: firebaseUser.photoURL || undefined,
          needsOnboarding: true,
        };
        await setDoc(ref, { ...newUser, createdAt: new Date().toISOString() });
        setUser(newUser);
      }
    } catch (err) {
      console.error("Error loading user data:", err);
      setUser(null);
    }
  };

  const signIn = async (): Promise<NextRoute> => {
    try {
      setIsLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const uid = result.user.uid;
      const ref = doc(db, "users", uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        await setDoc(ref, {
          uid,
          email: result.user.email || "",
          name: result.user.displayName || "",
          picture: result.user.photoURL || undefined,
          needsOnboarding: true,
          createdAt: new Date().toISOString(),
          lastSignIn: new Date().toISOString(),
        });
        return "onboarding";
      }

      await updateDoc(ref, { lastSignIn: new Date().toISOString() });
      const data = snap.data();
      const info = getAdditionalUserInfo(result);
      const needs = data.needsOnboarding ?? !!info?.isNewUser;
      return needs ? "onboarding" : "home";
    } catch (error) {
      console.error("Auth failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    await updateDoc(ref, updates);
    setUser({ ...user, ...updates });
  };

  const completeOnboarding = async (onboardingData: any) => {
    if (!user) throw new Error("Not authenticated");
    const ref = doc(db, "users", user.uid);
    try {
      await updateDoc(ref, { ...onboardingData, needsOnboarding: false });
    } catch (err) {
      console.warn("Client-side Firestore update failed (backend write is primary):", err);
    }
    setUser({ ...user, ...onboardingData, needsOnboarding: false });
  };

  const refreshUser = async () => {
    if (auth.currentUser) await loadUserData(auth.currentUser);
  };

  return (
    <FirebaseAuthContext.Provider
      value={{ user, signIn, signOut, updateUser, completeOnboarding, refreshUser, isLoading }}
    >
      {children}
    </FirebaseAuthContext.Provider>
  );
};
