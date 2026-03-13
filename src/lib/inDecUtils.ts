'use client';
/**
 * inDecUtils.ts — in_dec Field Management Utilities
 * ─────────────────────────────────────────────────────────────────────────────
 * This module provides functions to set and manage the `in_dec` field in Firebase.
 * 
 * WHAT IS in_dec?
 * ─────────────────────────────────────────────────────────────────────────────
 * `in_dec` is a boolean field in Firestore (onesutra_users collection) that indicates:
 * 
 *   TRUE  → User exists in BOTH OneSUTRA app AND Telegram contacts
 *   FALSE → User exists in only ONE platform (either OneSUTRA or Telegram)
 * 
 * PURPOSE:
 * ─────────────────────────────────────────────────────────────────────────────
 * When a user syncs their Telegram contacts, we need to check if any of those
 * contacts are ALSO registered in our OneSUTRA app. Without `in_dec`, the same
 * person would appear TWICE in the contact list:
 *   1. As a OneSUTRA user (from Firebase)
 *   2. As a Telegram contact (from Telegram)
 * 
 * With `in_dec=true`, we MERGE these into a SINGLE contact entry that shows:
 *   - One unified chat thread
 *   - Option to message via Firebase OR Telegram
 *   - Visual indicator showing dual-platform availability
 */

import { getFirebaseFirestore } from './firebase';
import { collection, query, where, getDocs, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface InDecStatus {
    userId: string;
    phone: string;
    name: string;
    in_dec: boolean;
    telegram_synced: boolean;
    telegram_phone?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: Set in_dec when a user links their Telegram
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Call this function when a user successfully links their Telegram account.
 * It sets in_dec=true for the current user and checks if any other users
 * have this person in their Telegram contacts.
 * 
 * @param userId - Firebase Auth UID of the user linking Telegram
 * @param phone - Phone number in E.164 format (e.g., +919876543210)
 */
export async function setInDecOnTelegramLink(
    userId: string,
    phone: string
): Promise<void> {
    const db = await getFirebaseFirestore();
    
    // Set in_dec=true for this user (they're now in both platforms)
    await setDoc(
        doc(db, 'onesutra_users', userId),
        {
            in_dec: true,
            telegram_synced: true,
            telegram_phone: phone,
            telegram_linked_at: Date.now(),
        },
        { merge: true }
    );
    
    console.log(`[inDecUtils] Set in_dec=true for user ${userId}`);
    
    // Check if any other users have this phone in their Telegram contacts
    // and update their contactMap accordingly (optional enhancement)
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: Check and set in_dec for all users (Admin Function)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks all users in Firebase and sets their in_dec field based on whether
 * they have linked their Telegram account.
 * 
 * Run this ONCE when setting up the feature, or periodically to sync data.
 */
export async function syncAllInDecFields(): Promise<InDecStatus[]> {
    const db = await getFirebaseFirestore();
    const usersRef = collection(db, 'onesutra_users');
    const snapshot = await getDocs(usersRef);
    
    const results: InDecStatus[] = [];
    
    for (const userDoc of snapshot.docs) {
        const data = userDoc.data();
        const userId = userDoc.id;
        
        // Determine if this user should have in_dec=true
        // Logic: If they have telegram_synced=true, they exist in both platforms
        const hasTelegramLinked = data.telegram_synced === true;
        const hasPhone = !!data.telegram_phone;
        
        const shouldBeDualUser = hasTelegramLinked && hasPhone;
        
        // Update the document
        await updateDoc(doc(db, 'onesutra_users', userId), {
            in_dec: shouldBeDualUser,
        });
        
        results.push({
            userId,
            phone: data.telegram_phone || data.phone || 'N/A',
            name: data.name || 'Unknown',
            in_dec: shouldBeDualUser,
            telegram_synced: hasTelegramLinked,
            telegram_phone: data.telegram_phone,
        });
        
        console.log(`[inDecUtils] Updated ${userId}: in_dec=${shouldBeDualUser}`);
    }
    
    console.log(`[inDecUtils] Synced ${results.length} users`);
    return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3: Find dual users after Telegram contact sync
// ─────────────────────────────────────────────────────────────────────────────

/**
 * After fetching Telegram contacts, use this to find which ones are
 * also registered in OneSUTRA (dual users).
 * 
 * @param telegramPhones - Array of phone numbers from Telegram contacts
 * @returns Array of user IDs that exist in both platforms
 */
export async function findDualUsers(
    telegramPhones: string[]
): Promise<Array<{ userId: string; phone: string; name: string }>> {
    const db = await getFirebaseFirestore();
    
    // Normalize phones to E.164 format
    const normalizedPhones = telegramPhones.map(normalizePhone);
    
    // Firestore 'in' query has a limit of 30 items, so we chunk
    const CHUNK_SIZE = 30;
    const dualUsers: Array<{ userId: string; phone: string; name: string }> = [];
    
    for (let i = 0; i < normalizedPhones.length; i += CHUNK_SIZE) {
        const chunk = normalizedPhones.slice(i, i + CHUNK_SIZE);
        
        const q = query(
            collection(db, 'onesutra_users'),
            where('telegram_phone', 'in', chunk)
        );
        
        const snapshot = await getDocs(q);
        
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            dualUsers.push({
                userId: doc.id,
                phone: data.telegram_phone,
                name: data.name || 'Unknown',
            });
        });
    }
    
    console.log(`[inDecUtils] Found ${dualUsers.length} dual users`);
    return dualUsers;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4: Manual in_dec setter for single user
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Manually set the in_dec field for a specific user.
 * Use this in the Firebase Console or for testing.
 * 
 * @param userId - Firebase Auth UID
 * @param inDec - true if dual user, false otherwise
 */
export async function setInDecManual(
    userId: string,
    inDec: boolean
): Promise<void> {
    const db = await getFirebaseFirestore();
    
    await updateDoc(doc(db, 'onesutra_users', userId), {
        in_dec: inDec,
    });
    
    console.log(`[inDecUtils] Manually set in_dec=${inDec} for ${userId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5: Check in_dec status (for debugging)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check the current in_dec status of a user.
 */
export async function getInDecStatus(userId: string): Promise<InDecStatus | null> {
    const db = await getFirebaseFirestore();
    const docRef = doc(db, 'onesutra_users', userId);
    const snapshot = await getDoc(docRef);
    
    if (!snapshot.exists()) return null;
    
    const data = snapshot.data();
    return {
        userId: snapshot.id,
        phone: data.telegram_phone || data.phone || 'N/A',
        name: data.name || 'Unknown',
        in_dec: data.in_dec ?? false,
        telegram_synced: data.telegram_synced ?? false,
        telegram_phone: data.telegram_phone,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 ? `+${digits}` : digits;
}

// ─────────────────────────────────────────────────────────────────────────────
// React Hook for convenience
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';

export function useInDecManager() {
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<InDecStatus[]>([]);
    
    const syncAll = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await syncAllInDecFields();
            setResults(data);
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    const setManual = useCallback(async (userId: string, inDec: boolean) => {
        setIsLoading(true);
        try {
            await setInDecManual(userId, inDec);
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    return {
        syncAll,
        setManual,
        isLoading,
        results,
    };
}
