/**
 * src/lib/firebaseServer.ts
 * Server-safe Firebase client SDK initialisation for API routes.
 *
 * Unlike firebase.ts (which uses IndexedDB-backed offline persistence),
 * this module initialises Firestore WITHOUT offline cache so it works
 * safely inside Node.js serverless functions (Next.js API routes).
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Use a dedicated named app so it never clashes with the client-side instance
const SERVER_APP_NAME = '__server__';

let serverApp: FirebaseApp | null = null;
let serverDb: Firestore | null = null;

function getServerApp(): FirebaseApp {
    if (serverApp) return serverApp;
    const existing = getApps().find(a => a.name === SERVER_APP_NAME);
    serverApp = existing ?? initializeApp(firebaseConfig, SERVER_APP_NAME);
    return serverApp;
}

/**
 * Returns a plain Firestore instance with NO offline persistence.
 * Safe to call from Next.js API routes / middleware.
 */
export function getServerFirestore(): Firestore {
    if (serverDb) return serverDb;
    serverDb = getFirestore(getServerApp());
    return serverDb;
}
