import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

const requiredFirebaseConfig = [
  "apiKey",
  "authDomain",
  "projectId",
  "appId",
] as const;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim(),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim(),
  appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim(),
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID?.trim(),
};

const missingFirebaseConfig = requiredFirebaseConfig.filter(
  (key) => !firebaseConfig[key],
);

export const isFirebaseConfigured = missingFirebaseConfig.length === 0;

export function getFirebaseConfigIssues() {
  return missingFirebaseConfig.map((key) => `VITE_FIREBASE_${toEnvName(key)}`);
}

let app: FirebaseApp | undefined;
let auth: Auth | undefined;

export function getFirebaseAuth() {
  if (!isFirebaseConfigured) {
    return undefined;
  }

  app ??= initializeApp(firebaseConfig);
  auth ??= getAuth(app);
  return auth;
}

export const googleProvider = new GoogleAuthProvider();

function toEnvName(key: (typeof requiredFirebaseConfig)[number]) {
  return key.replace(/[A-Z]/g, (value) => `_${value}`).toUpperCase();
}
