'use client';
/**
 * useContactIdentityResolver.ts — Phase 2: Dual-User Detection
 * ─────────────────────────────────────────────────────────────────────────────
 * After fetching Telegram contacts, we check which ones ALSO have a OneSUTRA
 * (Firebase) account by querying the `onesutra_users` collection on the
 * `telegram_phone` field.
 *
 * OPTIMIZATION STRATEGY:
 *   Firestore `in` queries are limited to 30 items per query.
 *   We chunk the request into batches of 30, run them in parallel, and
 *   merge results. This avoids multiple round-trips for large contact lists.
 *
 * RESULT CACHING:
 *   Results are stored in Zustand store (persisted to localStorage).
 *   On next session, we skip the Firestore query for already-resolved contacts.
 *   Only NEW contacts (not in the store) are batch-queried.
 */

import { useState, useCallback } from 'react';
import { getTDLibClient, normalizePhone } from '@/lib/tdlib';
import { useSutraConnectStore } from '@/stores/sutraConnectStore';
import type { ContactEntry } from '@/lib/sutraConnect.types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface UseContactIdentityResolverReturn {
    syncAndResolve: () => Promise<void>;
    isLoading: boolean;
    resolvedCount: number;
    dualUserCount: number;
    error: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

const FIRESTORE_IN_LIMIT = 30; // Firestore `in` operator max per query

export function useContactIdentityResolver(): UseContactIdentityResolverReturn {
    const [isLoading, setIsLoading] = useState(false);
    const [resolvedCount, setResolvedCount] = useState(0);
    const [dualUserCount, setDualUserCount] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const existingContactMap = useSutraConnectStore((s) => s.contactMap);
    const setContactMap = useSutraConnectStore((s) => s.setContactMap);

    /**
     * Main sync function:
     * 1. Fetch Telegram contacts via TDLib
     * 2. Identify which ones are NOT yet in our local cache
     * 3. Batch-query Firestore for those new contacts
     * 4. Merge results into Zustand store
     */
    const syncAndResolve = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // ── Step 1: Fetch Telegram contacts ─────────────────────────────────
            const tdlib = getTDLibClient();
            const rawContacts = await tdlib.getContacts();

            if (rawContacts.length === 0) {
                setIsLoading(false);
                return;
            }

            // ── Step 2: Normalise phone numbers + skip already-resolved contacts ──
            const toResolve: { phone: string; tdlibUserId: string; raw: typeof rawContacts[0] }[] = [];

            rawContacts.forEach((c) => {
                const normalizedPhone = normalizePhone(c.phone_number);
                // Skip if already in our local cache
                if (!existingContactMap[normalizedPhone]) {
                    toResolve.push({
                        phone: normalizedPhone,
                        tdlibUserId: String(c.id),
                        raw: c,
                    });
                }
            });

            // ── Step 3: Batch-query Firestore for dual-user identification ────────
            let oneSutraMatches: Record<string, string> = {}; // phone → Firebase UID

            if (toResolve.length > 0) {
                const newPhones = toResolve.map((c) => c.phone);
                oneSutraMatches = await batchQueryOneSutraUsers(newPhones);
            }

            // ── Step 4: Build enriched ContactEntry Record ────────────────────────
            const enrichedMap: Record<string, ContactEntry> = {};

            // Newly resolved contacts
            for (const { phone, tdlibUserId, raw } of toResolve) {
                enrichedMap[phone] = {
                    telegram_user_id: tdlibUserId,
                    phone_number: phone,
                    first_name: raw.first_name,
                    last_name: raw.last_name ?? undefined,
                    username: raw.username ?? undefined,
                    is_onesutra_user: phone in oneSutraMatches,
                    onesutra_uid: oneSutraMatches[phone] ?? null,
                };
            }

            // Re-merge already-cached contacts (refresh name fields)
            for (const c of rawContacts) {
                const phone = normalizePhone(c.phone_number);
                if (existingContactMap[phone] && !enrichedMap[phone]) {
                    enrichedMap[phone] = {
                        ...existingContactMap[phone],
                        first_name: c.first_name,
                        last_name: c.last_name ?? undefined,
                    };
                }
            }

            // ── Step 5: Write to Zustand store ────────────────────────────────────
            setContactMap(enrichedMap);

            const allEntries = Object.values(enrichedMap);
            const duals = allEntries.filter((c) => c.is_onesutra_user).length;
            setResolvedCount(allEntries.length);
            setDualUserCount(duals);

            console.log(
                `[ContactResolver] ${allEntries.length} contacts resolved. ` +
                `${duals} are dual-users on OneSUTRA.`
            );
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Contact sync failed';
            setError(msg);
            console.error('[ContactResolver] Error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [existingContactMap, setContactMap]);

    return { syncAndResolve, isLoading, resolvedCount, dualUserCount, error };
}

// ─────────────────────────────────────────────────────────────────────────────
// Firestore Batch Query — Phase 2 Core Logic
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Takes an array of E.164 phone numbers and returns a map of
 * { phone → firebase_uid } for any that have an OneSUTRA account.
 *
 * Uses chunked parallel `in` queries to handle large contact lists efficiently.
 *
 * Firestore index REQUIRED (create in Firebase Console):
 *   Collection: onesutra_users
 *   Field: telegram_phone (Ascending)
 *
 * @param phones - Normalised E.164 phone numbers
 * @returns Map of phone → Firebase UID for matched users
 */
async function batchQueryOneSutraUsers(
    phones: string[]
): Promise<Record<string, string>> {
    const { getFirebaseFirestore } = await import('@/lib/firebase');
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const db = await getFirebaseFirestore();

    const result: Record<string, string> = {};

    // Chunk phones into groups of 30 (Firestore `in` limit)
    const chunks: string[][] = [];
    for (let i = 0; i < phones.length; i += FIRESTORE_IN_LIMIT) {
        chunks.push(phones.slice(i, i + FIRESTORE_IN_LIMIT));
    }

    // Run all chunks in parallel for maximum performance
    const allQueryResults = await Promise.allSettled(
        chunks.map(async (chunk) => {
            const q = query(
                collection(db, 'onesutra_users'),
                where('telegram_phone', 'in', chunk),
                where('telegram_synced', '==', true) // Only fully-synced users
            );
            const snap = await getDocs(q);
            return snap.docs;
        })
    );

    // Merge all results
    allQueryResults.forEach((res) => {
        if (res.status === 'fulfilled') {
            res.value.forEach((docSnap) => {
                const data = docSnap.data();
                if (data.telegram_phone) {
                    // Map phone → Firebase UID for the local identity map
                    result[data.telegram_phone as string] = docSnap.id;
                }
            });
        }
    });

    return result;
}
