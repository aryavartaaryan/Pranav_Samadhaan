'use client';
/**
 * useTelegramWeb.ts — Web-Safe TDLib Hook
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHY THIS EXISTS:
 *   The native TDLib packages are compiled for mobile/desktop environments.
 *   In a browser, we MUST use `tdweb` — the official Telegram-provided WebAssembly
 *   build. It runs TDLib inside a Web Worker, so the MTProto cryptography and
 *   networking never block the main UI thread.
 *
 * HOW TDWEB INITIALIZES (the sequence):
 *   1. We dynamically import `tdweb` only on the client (avoids SSR crash).
 *   2. TdClient boots a Web Worker that loads the WASM binary from /public/tdlib/
 *   3. TDLib emits `updateAuthorizationState` events to drive the auth state machine:
 *      → authorizationStateWaitTdlibParameters  (we send our API credentials)
 *      → authorizationStateWaitPhoneNumber      (ready for user to enter phone)
 *      → authorizationStateWaitCode             (Telegram sent SMS/app code)
 *      → authorizationStateReady                (session fully established!)
 *   4. Once READY, we call getContacts() to pull contacts from Telegram Cloud.
 *
 * BROWSER COMPATIBILITY:
 *   - Uses SharedArrayBuffer (requires COOP/COEP headers) OR falls back to
 *     single-threaded WASM. Both work in Chrome 90+ and Safari 15.2+.
 *   - All network calls go through Telegram's own MTProto servers. No proxy needed.
 *
 * MOCK MODE:
 *   When NEXT_PUBLIC_TDLIB_API_ID is not set, the hook runs in full mock mode
 *   for UI development — no real Telegram connection is made.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSutraConnectStore } from '@/stores/sutraConnectStore';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type TelegramAuthStep =
    | 'IDLE'
    | 'INITIALIZING'
    | 'WAIT_PHONE'
    | 'WAIT_CODE'
    | 'VERIFYING'
    | 'READY'
    | 'ERROR';

export interface TelegramContact {
    id: number;
    first_name: string;
    last_name: string;
    phone_number: string;
    username?: string;
}

export interface UseTelegramWebReturn {
    step: TelegramAuthStep;
    error: string | null;
    contactCount: number;
    isMockMode: boolean;
    submitPhone: (phone: string) => Promise<void>;
    submitCode: (code: string) => Promise<void>;
    reset: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const API_ID = parseInt(process.env.NEXT_PUBLIC_TDLIB_API_ID ?? '0', 10);
const API_HASH = process.env.NEXT_PUBLIC_TDLIB_API_HASH ?? '';
const IS_MOCK = !API_ID || !API_HASH;

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useTelegramWeb(): UseTelegramWebReturn {
    const [step, setStep] = useState<TelegramAuthStep>('IDLE');
    const [error, setError] = useState<string | null>(null);
    const [contactCount, setContactCount] = useState(0);

    // tdweb TdClient instance — stored in a ref so it persists across renders
    // without triggering re-renders when it changes.
    const tdClientRef = useRef<any>(null);

    const setTelegramSynced = useSutraConnectStore((s) => s.setTelegramSynced);
    const setContactMap = useSutraConnectStore((s) => s.setContactMap);

    // ── Initialize tdweb on component mount ────────────────────────────────────
    useEffect(() => {
        // Guard: only run in browser, not SSR
        if (typeof window === 'undefined') return;

        let destroyed = false;

        async function initTDLib() {
            setStep('INITIALIZING');

            if (IS_MOCK) {
                // ── MOCK MODE: Simulate the initialization delay, then become ready ──
                console.warn('[useTelegramWeb] Running in MOCK mode. Set NEXT_PUBLIC_TDLIB_API_ID to go live.');
                await sleep(800);
                if (!destroyed) setStep('WAIT_PHONE');
                return;
            }

            try {
                /**
                 * STEP 1: Dynamically import tdweb.
                 *
                 * We use dynamic import() to:
                 *   a) Prevent this heavy library from entering the server-side bundle
                 *   b) Let the page render first, then load the Web Worker
                 *
                 * The tdweb package ships its own Web Worker + WASM build. When
                 * `new TdClient(...)` is called, it posts a message to the worker which
                 * then fetches and instantiates the WASM binary from `tdlibPath`.
                 */
                const { default: TdClient } = await import('tdweb');

                /**
                 * STEP 2: Instantiate TdClient with our configuration.
                 *
                 * `onUpdate` is the single callback that receives ALL TDLib events.
                 * This is the heart of the reactive architecture — we route each
                 * event type to the appropriate state update below.
                 *
                 * `tdlibPath` points to the WASM files we copied to /public/tdlib/.
                 * Next.js serves all /public files as static assets, so this is
                 * guaranteed to exist after our setup step.
                 */
                const client = new TdClient({
                    /**
                     * jsPath → the main tdweb JS bundle served from /public/tdlib/tdweb.js
                     * The WASM file is auto-discovered from the same directory.
                     */
                    jsPath: '/tdlib/tdweb.js',
                    onUpdate: (update: any) => handleUpdate(update, destroyed),
                });

                tdClientRef.current = client;

                /**
                 * STEP 3: Set verbosity level first (suppress TDLib debug spam),
                 * then send our app credentials via setTdlibParameters.
                 *
                 * CRITICAL: Must wrap all fields inside `parameters: {}` per TDLib JSON API spec.
                 */
                await client.send({
                    '@type': 'setLogVerbosityLevel',
                    new_verbosity_level: 2,
                });

                await client.send({
                    '@type': 'setTdlibParameters',
                    parameters: {
                        api_id: API_ID,
                        api_hash: API_HASH,
                        system_language_code: navigator?.language || 'en',
                        device_model: 'Web Browser',
                        system_version: 'Web',
                        application_version: '1.0',
                        enable_storage_optimizer: true,
                        use_secret_chats: false,
                        use_message_database: false,
                        use_file_database: false,
                        use_test_dc: false,
                    },
                });

                // TDLib will respond with authorizationStateWaitPhoneNumber
                // which handleUpdate catches and moves step → WAIT_PHONE.

            } catch (err: any) {
                console.error('[useTelegramWeb] Init failed:', err);
                if (!destroyed) {
                    setStep('ERROR');
                    setError('Failed to initialize Telegram. Please refresh the page.');
                }
            }
        }

        /**
         * THE TDLib UPDATE HANDLER
         *
         * This function is called by TdClient.onUpdate for every single event
         * that TDLib fires. We only handle the events that matter to our auth flow.
         * All other event types are silently ignored.
         */
        function handleUpdate(update: any, _destroyed: boolean) {
            if (_destroyed) return;

            const type: string = update?.['@type'];

            switch (type) {
                case 'updateAuthorizationState': {
                    const authStateType: string = update?.authorization_state?.['@type'];
                    console.log('[TDLib] Auth state →', authStateType);

                    switch (authStateType) {
                        case 'authorizationStateWaitTdlibParameters':
                            // TDLib is asking for credentials — we send them in initTDLib() above
                            break;

                        case 'authorizationStateWaitPhoneNumber':
                            // ✅ TDLib is ready and waiting for the user's phone number
                            setStep('WAIT_PHONE');
                            break;

                        case 'authorizationStateWaitCode':
                            // ✅ Telegram sent an OTP — UI should now show the code input
                            setStep('WAIT_CODE');
                            break;

                        case 'authorizationStateWaitPassword':
                            // User has 2FA enabled — rare but handle gracefully
                            setError('2FA password required. Please temporarily disable 2FA in Telegram settings and try again.');
                            setStep('ERROR');
                            break;

                        case 'authorizationStateReady':
                            // ✅ SESSION ESTABLISHED — fetch cloud contacts
                            setStep('READY');
                            fetchAndStoreContacts();
                            break;

                        case 'authorizationStateClosed':
                            if (!IS_MOCK) setStep('IDLE');
                            break;
                    }
                    break;
                }

                case 'error': {
                    const msg: string = update?.message ?? 'Unknown Telegram error';
                    console.error('[TDLib] Error:', update);
                    setError(friendlyError(msg));
                    // Don't set step to ERROR for all errors — some are recoverable
                    // (e.g., wrong code → just show the error, stay in WAIT_CODE)
                    break;
                }
            }
        }

        initTDLib();

        // Cleanup: mark as destroyed so stale async callbacks don't update state
        return () => { destroyed = true; };
    }, []); // Run once on mount

    // ── SUBMIT PHONE ────────────────────────────────────────────────────────────
    const submitPhone = useCallback(async (phone: string) => {
        setError(null);

        if (IS_MOCK) {
            // Mock: simulate the Telegram SMS delay
            setStep('VERIFYING');
            await sleep(1500);
            setStep('WAIT_CODE');
            return;
        }

        if (!tdClientRef.current) {
            setError('Telegram client not ready. Please wait a moment and try again.');
            return;
        }

        try {
            setStep('VERIFYING');
            /**
             * setAuthenticationPhoneNumber — sends the phone number to Telegram's
             * MTProto servers. Telegram will send an OTP via SMS or in-app notification.
             * The response is delivered asynchronously via updateAuthorizationState.
             */
            await tdClientRef.current.send({
                '@type': 'setAuthenticationPhoneNumber',
                phone_number: phone.trim(),
                settings: {
                    '@type': 'phoneNumberAuthenticationSettings',
                    allow_flash_call: false,
                    allow_missed_call: false,
                    is_current_phone_number: false,
                    allow_sms_retriever_api: false,
                },
            });
            // The handleUpdate listener will move step → WAIT_CODE when TDLib confirms
        } catch (err: any) {
            setError(friendlyError(err?.message));
            setStep('WAIT_PHONE');
        }
    }, []);

    // ── SUBMIT OTP CODE ─────────────────────────────────────────────────────────
    const submitCode = useCallback(async (code: string) => {
        setError(null);

        if (IS_MOCK) {
            setStep('VERIFYING');
            await sleep(1500);
            // Mock: Accept any 5-digit code for dev testing
            setStep('READY');
            setTelegramSynced('mock_tg_user_id_777', '+919876543210');
            setContactCount(4);
            // Populate store with mock contacts for testing
            setContactMap({
                '+919876500001': { telegram_user_id: '111001', is_onesutra_user: true, onesutra_uid: 'demo_uid_01' },
                '+919876500002': { telegram_user_id: '111002', is_onesutra_user: false, onesutra_uid: null },
                '+919876500003': { telegram_user_id: '111003', is_onesutra_user: true, onesutra_uid: 'demo_uid_03' },
                '+919876500004': { telegram_user_id: '111004', is_onesutra_user: false, onesutra_uid: null },
            });
            return;
        }

        if (!tdClientRef.current) return;

        try {
            setStep('VERIFYING');
            /**
             * checkAuthenticationCode — validates the OTP the user typed.
             * On success, TDLib fires authorizationStateReady.
             * On failure, TDLib fires an error update with PHONE_CODE_INVALID.
             */
            await tdClientRef.current.send({
                '@type': 'checkAuthenticationCode',
                code: code.trim(),
            });
            // handleUpdate will move step → READY when TDLib confirms
        } catch (err: any) {
            setError(friendlyError(err?.message));
            setStep('WAIT_CODE'); // Stay on code screen, let user retry
        }
    }, [setTelegramSynced, setContactMap]);

    // ── FETCH CLOUD CONTACTS ────────────────────────────────────────────────────
    const fetchAndStoreContacts = useCallback(async () => {
        try {
            /**
             * getMe() — retrieve the authenticated user's own profile.
             * We store their Telegram user_id and phone_number to mark them
             * as "Telegram-synced" in Firestore.
             */
            let myId = 'tg_user';
            let myPhone = '';

            if (!IS_MOCK && tdClientRef.current) {
                const me = await tdClientRef.current.send({ '@type': 'getMe' });
                myId = String(me?.id ?? 'tg_user');
                myPhone = me?.phone_number ?? '';
                setTelegramSynced(myId, myPhone);

                /**
                 * getContacts() — fetches the user's Telegram contact list from
                 * Telegram's cloud servers. This returns an array of Telegram user IDs.
                 *
                 * We then batch-call getUser() to resolve each ID into a full user
                 * object with phone number, name, etc. These phone numbers are what
                 * we compare against our OneSUTRA user database to find Dual Users.
                 */
                const contactsResult = await tdClientRef.current.send({ '@type': 'getContacts' });
                const userIds: number[] = contactsResult?.user_ids ?? [];

                // Fetch full user profiles in parallel (batches of 10 for safety)
                const contacts: TelegramContact[] = [];
                for (let i = 0; i < userIds.length; i += 10) {
                    const batch = userIds.slice(i, i + 10);
                    const users = await Promise.all(
                        batch.map((id) =>
                            tdClientRef.current.send({ '@type': 'getUser', user_id: id }).catch(() => null)
                        )
                    );
                    for (const u of users) {
                        if (u && u.phone_number) {
                            contacts.push({
                                id: u.id,
                                first_name: u.first_name ?? '',
                                last_name: u.last_name ?? '',
                                phone_number: normalizePhone(u.phone_number),
                                username: u.usernames?.active_usernames?.[0],
                            });
                        }
                    }
                }

                setContactCount(contacts.length);

                // ── Cross-reference with OneSUTRA Firestore users ─────────────────
                // This is the "Dual User Detection" — find which Telegram contacts
                // are also registered in our native OneSUTRA platform.
                await crossReferenceWithFirestore(contacts, setContactMap);
            }
        } catch (err) {
            console.error('[useTelegramWeb] Contact fetch error:', err);
            // Non-blocking — auth was successful, contacts just failed. Not critical.
        }
    }, [setTelegramSynced, setContactMap]);

    const reset = useCallback(() => {
        setStep('IDLE');
        setError(null);
        setContactCount(0);
    }, []);

    return { step, error, contactCount, isMockMode: IS_MOCK, submitPhone, submitCode, reset };
}

// ─────────────────────────────────────────────────────────────────────────────
// Firestore Cross-Reference (Dual User Detection)
// ─────────────────────────────────────────────────────────────────────────────

async function crossReferenceWithFirestore(
    contacts: TelegramContact[],
    setContactMap: (map: Record<string, { telegram_user_id: string; is_onesutra_user: boolean; onesutra_uid: string | null }>) => void
) {
    try {
        const { getFirebaseFirestore } = await import('@/lib/firebase');
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const db = await getFirebaseFirestore();

        const phones = contacts.map((c) => c.phone_number).filter(Boolean);
        const contactByPhone: Record<string, TelegramContact> = {};
        for (const c of contacts) contactByPhone[c.phone_number] = c;

        // Firestore `in` query supports max 30 items — chunk accordingly
        const CHUNK = 30;
        const newMap: Record<string, { telegram_user_id: string; is_onesutra_user: boolean; onesutra_uid: string | null }> = {};

        for (let i = 0; i < phones.length; i += CHUNK) {
            const chunk = phones.slice(i, i + CHUNK);
            const q = query(collection(db, 'onesutra_users'), where('telegram_phone', 'in', chunk));
            const snap = await getDocs(q);

            for (const d of snap.docs) {
                const phone: string = d.data().telegram_phone;
                if (phone) {
                    newMap[phone] = {
                        telegram_user_id: String(contactByPhone[phone]?.id ?? ''),
                        is_onesutra_user: true,
                        onesutra_uid: d.id,
                    };
                }
            }
        }

        // Add Telegram-only contacts that aren't on OneSUTRA
        for (const phone of phones) {
            if (!newMap[phone] && contactByPhone[phone]) {
                newMap[phone] = {
                    telegram_user_id: String(contactByPhone[phone].id),
                    is_onesutra_user: false,
                    onesutra_uid: null,
                };
            }
        }

        setContactMap(newMap);
        console.log(`[useTelegramWeb] Cross-referenced ${contacts.length} contacts. Dual users: ${Object.values(newMap).filter(v => v.is_onesutra_user).length}`);
    } catch (err) {
        console.error('[useTelegramWeb] Firestore cross-reference error:', err);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

function normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 ? `+${digits}` : digits;
}

function friendlyError(msg: string = ''): string {
    if (msg.includes('PHONE_NUMBER_INVALID')) return 'Invalid phone number. Please include your country code (e.g. +91).';
    if (msg.includes('PHONE_CODE_INVALID')) return 'Incorrect code. Please check the OTP and try again.';
    if (msg.includes('PHONE_CODE_EXPIRED')) return 'Your OTP has expired. Please go back and request a new one.';
    if (msg.includes('TOO_MANY_REQUESTS')) return 'Too many attempts. Please wait a few minutes and try again.';
    if (msg.includes('NETWORK')) return 'Network error. Check your connection and try again.';
    return msg || 'Something went wrong. Please try again.';
}
