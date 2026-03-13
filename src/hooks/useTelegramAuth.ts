'use client';
/**
 * useTelegramAuth.ts — Phase 1: Telegram Authentication Flow
 * ─────────────────────────────────────────────────────────────────────────────
 * Drives the TDLib auth state machine:
 *   IDLE → WAITING_PHONE → WAITING_CODE → AUTHENTICATED
 *
 * On success: updates Firestore user doc with telegram_phone + telegram_user_id
 * and updates the Zustand store so the rest of the app knows Telegram is linked.
 *
 * Usage:
 *   const { authStep, submitPhone, submitCode, error } = useTelegramAuth(uid);
 */

import { useState, useCallback, useEffect } from 'react';
import { getTDLibClient, normalizePhone } from '@/lib/tdlib';
import type { TDLibAuthState } from '@/lib/sutraConnect.types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type TelegramAuthStep =
    | 'IDLE'           // User hasn't started yet
    | 'PHONE_ENTRY'    // Showing phone input
    | 'CODE_ENTRY'     // Showing OTP input (Telegram sent SMS)
    | 'VERIFYING'      // Waiting for TDLib confirmation
    | 'AUTHENTICATED'  // Auth complete
    | 'ERROR';         // Something went wrong

interface UseTelegramAuthReturn {
    /** Current step in the auth flow */
    authStep: TelegramAuthStep;
    /** Phone number user entered (E.164) */
    phone: string;
    /** True while async TDLib operations are pending */
    isLoading: boolean;
    /** Human-readable error message */
    error: string | null;
    /** Step-initiating actions */
    startFlow: () => void;
    submitPhone: (phone: string) => Promise<void>;
    submitCode: (code: string) => Promise<void>;
    reset: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useTelegramAuth(firebaseUid: string | null): UseTelegramAuthReturn {
    const [authStep, setAuthStep] = useState<TelegramAuthStep>('IDLE');
    const [phone, setPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Listen to TDLib auth state changes
    useEffect(() => {
        const tdlib = getTDLibClient();

        const unsub = tdlib.on('authStateChange', (state) => {
            const s = state as TDLibAuthState;
            switch (s) {
                case 'authorizationStateWaitCode':
                    setAuthStep('CODE_ENTRY');
                    setIsLoading(false);
                    break;
                case 'authorizationStateReady':
                    // Auth confirmed! Now sync to Firestore (handled in submitCode)
                    break;
                case 'authorizationStateClosed':
                case 'authorizationStateLoggingOut':
                    setAuthStep('IDLE');
                    break;
                default:
                    break;
            }
        });

        return () => unsub();
    }, []);

    /** Begin the flow — show phone entry */
    const startFlow = useCallback(() => {
        setAuthStep('PHONE_ENTRY');
        setError(null);
    }, []);

    /**
     * Phase 1, Step 1: Submit the phone number to TDLib.
     * TDLib asynchronously sends an SMS/OTP and emits authorizationStateWaitCode.
     */
    const submitPhone = useCallback(async (inputPhone: string) => {
        if (!inputPhone.trim()) {
            setError('Please enter a valid phone number.');
            return;
        }

        const normalized = normalizePhone(inputPhone);
        setPhone(normalized);
        setIsLoading(true);
        setError(null);

        try {
            // Initialise TDLib if not already done
            const tdlib = getTDLibClient();
            await tdlib.init();

            // This triggers TDLib to send an OTP to the user's Telegram app/SMS
            await tdlib.setAuthenticationPhoneNumber(normalized);
            // State update (PHONE_ENTRY → CODE_ENTRY) happens via the event listener above
        } catch (err) {
            setAuthStep('ERROR');
            setError(err instanceof Error ? err.message : 'Failed to send code. Check the phone number.');
            setIsLoading(false);
        }
    }, []);

    /**
     * Phase 1, Step 2: Submit the 5-digit OTP.
     * On success: fetch Telegram profile → write to Firestore → update Zustand store.
     */
    const submitCode = useCallback(async (code: string) => {
        if (code.length < 5) {
            setError('Please enter the complete 5-digit code.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setAuthStep('VERIFYING');

        try {
            const tdlib = getTDLibClient();
            await tdlib.checkAuthenticationCode(code);

            // ── Auth succeeded. Fetch Telegram profile. ───────────────────────────
            const me = await tdlib.getMe();
            if (!me) throw new Error('Could not fetch Telegram profile.');

            const tgPhone = normalizePhone(me.phone_number);
            const tgUserId = String(me.id);

            // ── Write to Firestore user document (Phase 1 schema update) ──────────
            if (firebaseUid) {
                await writeUserTelegramFields(firebaseUid, tgPhone, tgUserId);
            }

            // ── Update Zustand store on success ─────────────────────────────────
            // Lazy-import to avoid circular deps
            const { useSutraConnectStore } = await import('@/stores/sutraConnectStore');
            useSutraConnectStore.getState().setTelegramSynced(tgUserId, tgPhone);

            setAuthStep('AUTHENTICATED');
            setIsLoading(false);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Invalid code. Please try again.';
            setError(msg === 'PHONE_CODE_INVALID' ? 'Incorrect code. Please check and retry.' : msg);
            setAuthStep('CODE_ENTRY'); // Return to code entry so user can retry
            setIsLoading(false);
        }
    }, [firebaseUid]);

    const reset = useCallback(() => {
        setAuthStep('IDLE');
        setPhone('');
        setError(null);
        setIsLoading(false);
    }, []);

    return { authStep, phone, isLoading, error, startFlow, submitPhone, submitCode, reset };
}

// ─────────────────────────────────────────────────────────────────────────────
// Firestore writer — Phase 1 database update
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Updates the user's Firestore document with their Telegram credentials.
 * Uses merge: true so existing fields are intact.
 *
 * Firestore path: onesutra_users/{uid}
 * Fields set:
 *   - telegram_synced: true
 *   - telegram_phone:  "+91XXXXXXXXXX"
 *   - telegram_user_id: "123456789"
 */
async function writeUserTelegramFields(
    uid: string,
    telegramPhone: string,
    telegramUserId: string
): Promise<void> {
    try {
        const { getFirebaseFirestore } = await import('@/lib/firebase');
        const { doc, setDoc } = await import('firebase/firestore');
        const db = await getFirebaseFirestore();

        await setDoc(
            doc(db, 'onesutra_users', uid),
            {
                telegram_synced: true,
                telegram_phone: telegramPhone,
                telegram_user_id: telegramUserId,
            },
            { merge: true } // CRITICAL: never overwrite existing uid/email fields
        );

        console.log(`[TelegramAuth] Firestore updated for uid=${uid}`);
    } catch (err) {
        // Non-blocking: local state is still valid even if Firestore write fails
        console.error('[TelegramAuth] Firestore write failed:', err);
        throw err; // Re-throw to surface in UI
    }
}
