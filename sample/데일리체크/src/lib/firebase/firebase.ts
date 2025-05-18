
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth"; // Import Auth type

console.log("firebase.ts module evaluation started (top of file)");

// Log individual environment variables directly from process.env
console.log("Attempting to read NEXT_PUBLIC_FIREBASE_API_KEY:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
console.log("Attempting to read NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:", process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
console.log("Attempting to read NEXT_PUBLIC_FIREBASE_PROJECT_ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
console.log("Attempting to read NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:", process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
console.log("Attempting to read NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:", process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID);
console.log("Attempting to read NEXT_PUBLIC_FIREBASE_APP_ID:", process.env.NEXT_PUBLIC_FIREBASE_APP_ID);

// Log all NEXT_PUBLIC_ prefixed environment variables Next.js sees
const nextPublicEnvVars: Record<string, string | undefined> = {};
for (const key in process.env) {
  if (key.startsWith("NEXT_PUBLIC_")) {
    nextPublicEnvVars[key] = process.env[key];
  }
}
console.log("All NEXT_PUBLIC_ environment variables seen by Next.js:", nextPublicEnvVars);


const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log("Firebase Config object constructed in firebase.ts:", firebaseConfig);

// Initialize Firebase
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

try {
  if (!getApps().length) {
    console.log("firebase.ts: Initializing Firebase app...");
    app = initializeApp(firebaseConfig);
    console.log("firebase.ts: Firebase app initialized successfully: App object exists - ", !!app);
  } else {
    console.log("firebase.ts: Getting existing Firebase app...");
    app = getApp();
    console.log("firebase.ts: Existing Firebase app retrieved: App object exists - ", !!app);
  }

  console.log("firebase.ts: Getting Firestore instance...");
  db = getFirestore(app);
  console.log("firebase.ts: Firestore instance: DB object exists - ", !!db);

  console.log("firebase.ts: Getting Auth instance...");
  auth = getAuth(app);
  console.log("firebase.ts: Auth instance: Auth object exists - ", !!auth);

  // Enable offline persistence for Firestore
  if (typeof window !== 'undefined') {
    enableIndexedDbPersistence(db)
      .then(() => console.log("Firestore offline persistence enabled."))
      .catch((err) => {
        if (err.code == 'failed-precondition') {
          console.log('Offline persistence failed: Multiple tabs open.');
        } else if (err.code == 'unimplemented') {
          console.log('Offline persistence failed: Browser does not support.');
        } else {
          console.error('Offline persistence failed with error:', err);
        }
      });
  }
} catch (error) {
  console.error("firebase.ts: CRITICAL ERROR during Firebase initialization:", error);
  console.error("firebase.ts: Firebase config used during error:", firebaseConfig);
  // To prevent further errors if initialization fails, assign placeholder/null values
  // This is not ideal for production but helps in debugging.
  // @ts-ignore
  app = app || null;
  // @ts-ignore
  db = db || null;
  // @ts-ignore
  auth = auth || null;
}

export { app, db, auth };
