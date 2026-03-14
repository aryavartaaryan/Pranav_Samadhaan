'use client';
/**
 * useUsers — Live list of all OneSutra users from Firestore
 * - Serves cached users INSTANTLY from localStorage on first render
 * - Updates cache in background via onSnapshot (WhatsApp-style)
 * - Excludes the currently logged-in user
 */
import { useState, useEffect } from 'react';
import type { Unsubscribe } from 'firebase/firestore';

export interface SutraUser {
    uid: string;
    name: string;
    photoURL?: string | null;
    email?: string | null;
    lastSeen?: number;
    bio?: string;
    items?: string[];
    username?: string;
    interests?: string[];
    hobbies?: string[];
    emoji?: string;
    role?: string;
}

const CACHE_KEY = 'onesutra_users_v1';

function readCache(currentUserId: string): SutraUser[] {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return [];
        const all = JSON.parse(raw);
        if (!Array.isArray(all)) return [];
        return all.filter((u: any) => u && u.uid !== currentUserId);
    } catch { return []; }
}

function writeCache(users: SutraUser[]) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(users));
    } catch { /* ignore */ }
}

export function useUsers(currentUserId: string | null) {
    // Initialise immediately from localStorage — zero delay
    const [users, setUsers] = useState<SutraUser[]>(() => {
        if (!currentUserId || typeof window === 'undefined') return [];
        return readCache(currentUserId);
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUserId || typeof window === 'undefined') {
            setLoading(false);
            return;
        }

        let unsub: Unsubscribe | null = null;

        (async () => {
            try {
                const { getFirebaseFirestore } = await import('@/lib/firebase');
                const { collection, onSnapshot, query, orderBy } = await import('firebase/firestore');
                const db = await getFirebaseFirestore();

                const usersRef = collection(db, 'onesutra_users');
                const q = query(usersRef, orderBy('name', 'asc'));

                unsub = onSnapshot(q, (snap) => {
                    const all = snap.docs.map(d => {
                        const data = d.data();
                        const ts = data.lastSeen;
                        const ms = ts?.toMillis ? ts.toMillis() : (ts?.seconds ? ts.seconds * 1000 : 0);
                        return {
                            uid: data.uid ?? d.id,
                            name: data.name ?? 'Traveller',
                            photoURL: data.photoURL ?? null,
                            email: data.email ?? null,
                            lastSeen: ms,
                            bio: data.bio ?? '',
                            interests: data.interests ?? [],
                            hobbies: data.hobbies ?? [],
                        } as SutraUser;
                    });
                    // Write full list to cache (including self, for cross-session use)
                    writeCache(all);
                    setUsers(all.filter(u => u.uid !== currentUserId));
                    setLoading(false);
                }, () => setLoading(false));
            } catch {
                setLoading(false);
            }
        })();

        return () => { unsub?.(); };
    }, [currentUserId]);

    return { users, loading };
}
