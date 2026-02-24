// src/lib/firebase.ts
// ──────────────────────────────────────────────────────────────────────────────
// SSR-SAFE Firebase initialisation.
// All Firebase code is gated behind `typeof window !== 'undefined'` and
// lazy-initialised so Next.js server-side prerendering never touches it.
// Set NEXT_PUBLIC_FIREBASE_* vars in .env.local (dev) and Vercel dashboard (prod).
// ──────────────────────────────────────────────────────────────────────────────
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { type Auth, type GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _provider: GoogleAuthProvider | null = null;

/** Returns the Auth instance. Must only be called inside a browser context. */
export async function getFirebaseAuth(): Promise<Auth> {
    if (_auth) return _auth;

    if (!app) {
        app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    }

    // Dynamic import keeps firebase/auth out of the SSR bundle entirely
    const { getAuth } = await import('firebase/auth');
    _auth = getAuth(app);
    return _auth;
}

/** Returns the GoogleAuthProvider instance (client-side only). */
export async function getGoogleProvider(): Promise<GoogleAuthProvider> {
    if (_provider) return _provider;
    const { GoogleAuthProvider } = await import('firebase/auth');
    _provider = new GoogleAuthProvider();
    _provider.setCustomParameters({ prompt: 'select_account' });
    return _provider;
}
