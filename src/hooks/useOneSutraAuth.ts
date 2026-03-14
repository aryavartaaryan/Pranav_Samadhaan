'use client';
/**
 * useOneSutraAuth — Firebase Auth for OneSutra
 * WhatsApp-style: reads cached user profile from localStorage immediately (0ms),
 * then Firebase confirms/refreshes in background.
 * No sign-in screen — uses the same Firebase project as the main app.
 */
import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';

export interface OneSutraUser {
    uid: string;
    name: string;
    photoURL: string | null;
    email: string | null;
}

const CACHE_KEY = 'onesutra_auth_v1';

function readCachedUser(): OneSutraUser | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.uid) {
            return parsed as OneSutraUser;
        }
        return null;
    } catch { return null; }
}

function writeCachedUser(u: OneSutraUser | null) {
    try {
        if (u) localStorage.setItem(CACHE_KEY, JSON.stringify(u));
        else localStorage.removeItem(CACHE_KEY);
    } catch { /* ignore */ }
}

export function useOneSutraAuth() {
    // Start null/true on BOTH server and client to avoid hydration mismatch.
    // Cache is read in the first useEffect (runs only on client, before Firebase responds).
    const [user, setUser] = useState<OneSutraUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // ✅ Read cache synchronously in first client frame — no hydration mismatch,
        // still near-instant (sets state before Firebase async chain starts).
        const cached = readCachedUser();
        if (cached) { setUser(cached); setLoading(false); }

        let unsub: (() => void) | null = null;

        (async () => {
            try {
                const { getFirebaseAuth } = await import('@/lib/firebase');
                const { onAuthStateChanged } = await import('firebase/auth');
                const auth = await getFirebaseAuth();

                unsub = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
                    if (firebaseUser) {
                        const profile: OneSutraUser = {
                            uid: firebaseUser.uid,
                            name: firebaseUser.displayName ?? 'Traveller',
                            photoURL: firebaseUser.photoURL,
                            email: firebaseUser.email,
                        };
                        writeCachedUser(profile);
                        setUser(profile);

                        // Upsert to Firestore in background (non-blocking)
                        try {
                            const { getFirebaseFirestore } = await import('@/lib/firebase');
                            const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
                            const db = await getFirebaseFirestore();
                            await setDoc(doc(db, 'onesutra_users', firebaseUser.uid), {
                                uid: firebaseUser.uid,
                                name: firebaseUser.displayName ?? 'Traveller',
                                photoURL: firebaseUser.photoURL ?? null,
                                email: firebaseUser.email ?? null,
                                lastSeen: serverTimestamp(),
                            }, { merge: true });
                        } catch { /* offline — ok */ }
                    } else {
                        writeCachedUser(null);
                        setUser(null);
                    }
                    setLoading(false);
                });
            } catch {
                setLoading(false);
            }
        })();

        return () => { unsub?.(); };
    }, []);

    const signIn = async () => {
        try {
            const { getFirebaseAuth, getGoogleProvider } = await import('@/lib/firebase');
            const { signInWithPopup } = await import('firebase/auth');
            const auth = await getFirebaseAuth();
            const provider = await getGoogleProvider();
            await signInWithPopup(auth, provider);
        } catch { /* user cancelled */ }
    };

    const signOut = async () => {
        try {
            writeCachedUser(null);
            const { getFirebaseAuth } = await import('@/lib/firebase');
            const { signOut: fbSignOut } = await import('firebase/auth');
            const auth = await getFirebaseAuth();
            await fbSignOut(auth);
        } catch { /* ignore */ }
    };

    return { user, loading, signIn, signOut };
}
