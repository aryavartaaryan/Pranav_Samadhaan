'use client';
/**
 * useTelegramWeb.ts — Pure JS MTProto Hook (GramJS)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHY THIS EXISTS:
 *   Previous WASM-based solutions (tdweb) conflicted with Next.js webpack
 *   bundlers and internal Web Worker URL routing.
 *   We use `telegram` (GramJS), which is a pure JavaScript implementation
 *   of MTProto that runs native in the browser without WASM.
 *
 * INITIALIZATION SEQUENCE:
 *   1. We initialize TelegramClient with a StringSession (saved in localStorage).
 *   2. The user inputs their phone -> submitPhone() calls client.sendCode().
 *   3. The user inputs OTP -> submitCode() calls client.invoke(SignIn).
 *   4. On success, we save the StringSession to localStorage and fetch contacts.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSutraConnectStore } from '@/stores/sutraConnectStore';
import { initializeGlobalClient, setGlobalTelegramClient } from '@/lib/telegramClientManager';

// ─────────────────────────────────────────────────────────────────────────────
// CRITICAL: All 'telegram' imports MUST be dynamic (await import(...))
// The 'telegram' package barrel re-exports 'sessions' which pulls in
// node-localstorage → graceful-fs → require('fs') — a Node-only module.
// Static imports cause "Module not found: Can't resolve 'fs'" in Next.js.
// By using dynamic import(), modules load only at runtime in the browser.
// ─────────────────────────────────────────────────────────────────────────────

/** Lazily load GramJS modules — only at runtime in the browser */
export async function loadGramJS() {
    const [{ TelegramClient, Api }, { StringSession }] = await Promise.all([
        import('telegram'),
        import('telegram/sessions/StringSession'),
    ]);
    return { TelegramClient, Api, StringSession };
}

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

const API_ID = parseInt(process.env.NEXT_PUBLIC_TDLIB_API_ID ?? '0', 10);
const API_HASH = process.env.NEXT_PUBLIC_TDLIB_API_HASH ?? '';
const IS_MOCK = !API_ID || !API_HASH;

// Debug API credentials
console.log('[GramJS] API Credentials check:', {
    API_ID,
    API_HASH: API_HASH ? 'SET' : 'MISSING',
    IS_MOCK
});

// Store session in localStorage to persist login
const SESSION_KEY = 'sutraconnect_tg_session';

export function useTelegramWeb(): UseTelegramWebReturn {
    const [step, setStep] = useState<TelegramAuthStep>('IDLE');
    const [error, setError] = useState<string | null>(null);
    const [contactCount, setContactCount] = useState(0);

    const clientRef = useRef<any>(null);
    const phoneRef = useRef<string>('');
    const phoneCodeHashRef = useRef<string>('');

    const setTelegramSynced = useSutraConnectStore((s) => s.setTelegramSynced);
    const setContactMap = useSutraConnectStore((s) => s.setContactMap);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        let destroyed = false;

        async function initGramJS() {
            setStep('INITIALIZING');

            if (IS_MOCK) {
                console.warn('[GramJS] MOCK MODE — set NEXT_PUBLIC_TDLIB_API_ID to go live.');
                await sleep(600);
                if (!destroyed) setStep('WAIT_PHONE');
                return;
            }

            try {
                const { TelegramClient, StringSession } = await loadGramJS();

                const savedSession = localStorage.getItem(SESSION_KEY) || '';
                console.log('[GramJS] Session found:', savedSession ? 'YES' : 'NO');
                const stringSession = new StringSession(savedSession);

                const client = new TelegramClient(stringSession, API_ID, API_HASH, {
                    connectionRetries: 5, // Increase retries for better reliability
                    deviceModel: 'PranavSamadhaan Web',
                    systemVersion: 'Web 2.0',
                    appVersion: '2.0.0',
                    langCode: 'en',
                    useWSS: true, // MUST be true for browser environments (wss://)
                    proxy: undefined, // No proxy
                });

                clientRef.current = client;
                setGlobalTelegramClient(client);

                try {
                    console.log('[GramJS] Attempting to connect...');
                    console.log('[GramJS] Client details:', {
                        API_ID,
                        hasAPIHash: !!API_HASH,
                        sessionId: stringSession.save().substring(0, 20) + '...'
                    });
                    await client.connect();
                    console.log('[GramJS] ✅ Connected to Telegram servers');
                } catch (connErr: any) {
                    console.error('[GramJS] ❌ Connection failed:', connErr);
                    console.error('[GramJS] Error details:', {
                        name: connErr.name,
                        message: connErr.message,
                        stack: connErr.stack,
                        errorCode: connErr.errorCode,
                        errorMessage: connErr.errorMessage
                    });

                    // Don't throw - try to continue with authorization check
                    console.log('[GramJS] Continuing to authorization check despite connection error...');
                }

                if (!destroyed) {
                    // Skip connection issues and go directly to phone input
                    console.log('[GramJS] Skipping connection check - going directly to phone input');
                    setStep('WAIT_PHONE');

                    // Store client for later use when user enters phone
                }
            } catch (err: any) {
                console.error('[GramJS] Init failed:', err);
                if (!destroyed) {
                    setStep('ERROR');
                    setError('Telegram could not connect. Please check your internet and try again.');
                }
            }
        }

        initGramJS();

        return () => { destroyed = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── SUBMIT PHONE ────────────────────────────────────────────────────────────
    const submitPhone = useCallback(async (phone: string) => {
        setError(null);

        if (IS_MOCK) {
            setStep('VERIFYING');
            await sleep(1500);
            setStep('WAIT_CODE');
            return;
        }

        if (!clientRef.current) {
            setError('Telegram client not ready. Please wait a moment and try again.');
            return;
        }

        try {
            setStep('VERIFYING');
            const normalizedPhone = normalizePhone(phone);
            phoneRef.current = normalizedPhone;

            // Ensure client is connected before sending code
            console.log('[GramJS] Ensuring client is connected before sending code...');
            try {
                await clientRef.current.connect();
                console.log('[GramJS] Client connected for phone submission');
            } catch (connectErr) {
                console.log('[GramJS] Connection failed during phone submission, continuing anyway...');
            }

            // Send auth code
            console.log('[GramJS] Sending code to phone:', normalizedPhone);
            const result = await clientRef.current.sendCode({
                apiId: API_ID,
                apiHash: API_HASH,
            }, normalizedPhone);
            console.log('[GramJS] Code sent successfully');

            phoneCodeHashRef.current = result.phoneCodeHash;
            setStep('WAIT_CODE');

        } catch (err: any) {
            console.error('[GramJS] sendCode error:', err);
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
            setStep('READY');
            setTelegramSynced('mock_tg_user_id_777', '+919876543210');
            setContactCount(4);
            setContactMap({
                '+919876500001': { telegram_user_id: '111001', is_onesutra_user: true, onesutra_uid: 'demo_uid_01' },
                '+919876500002': { telegram_user_id: '111002', is_onesutra_user: false, onesutra_uid: null },
            });
            return;
        }

        if (!clientRef.current || !phoneCodeHashRef.current || !phoneRef.current) return;

        try {
            setStep('VERIFYING');

            const { Api, StringSession } = await loadGramJS();

            await clientRef.current.invoke(new Api.auth.SignIn({
                phoneNumber: phoneRef.current,
                phoneCodeHash: phoneCodeHashRef.current,
                phoneCode: code.trim()
            }));

            // Successfully logged in — save session to local storage
            const sessionString = (clientRef.current.session as InstanceType<typeof StringSession>).save();
            localStorage.setItem(SESSION_KEY, sessionString as unknown as string);

            console.log('[GramJS] ✅ Sign in successful');
            setStep('READY');

            // Set global client and initialize messaging service
            setGlobalTelegramClient(clientRef.current);
            console.log('[GramJS] Initializing messaging service after sign in...');
            const { initializeTelegramMessaging } = await import('@/lib/telegramMessaging');
            await initializeTelegramMessaging(clientRef.current);
            console.log('[GramJS] Messaging service initialization complete after sign in');

            console.log('[GramJS] Fetching contacts after sign in...');
            fetchAndStoreContacts(clientRef.current);

        } catch (err: any) {
            console.error('[GramJS] SignIn error:', err);
            if (err.message && err.message.includes('SESSION_PASSWORD_NEEDED')) {
                setError('2FA password required. Please temporarily disable it in Telegram and try again.');
                setStep('ERROR');
            } else {
                setError(friendlyError(err?.message));
                setStep('WAIT_CODE');
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setTelegramSynced, setContactMap]);

    // ── FETCH CLOUD CONTACTS ────────────────────────────────────────────────────
    const fetchAndStoreContacts = useCallback(async (client: any) => {
        try {
            const { Api } = await loadGramJS();

            // Get our own profile
            const me = await client.getMe();

            const myId = String(me?.id ?? 'tg_user');
            const myPhone = me?.phone ?? '';
            setTelegramSynced(myId, myPhone);

            // Get contacts
            const result = await client.invoke(new Api.contacts.GetContacts({
                hash: BigInt(0) as any,
            }));

            // result is contacts.Contacts or contacts.ContactsNotModified
            if (result.className === 'contacts.Contacts') {
                const users = result.users;

                const contactsList: TelegramContact[] = [];
                for (const u of users) {
                    if (u.className === 'User' && u.phone) {
                        const contact = {
                            id: Number(u.id),
                            first_name: u.firstName ?? '',
                            last_name: u.lastName ?? '',
                            phone_number: normalizePhone(u.phone),
                            username: u.username ?? undefined,
                        };
                        console.log('[GramJS] Contact fetched:', {
                            id: contact.id,
                            name: `${contact.first_name} ${contact.last_name}`.trim(),
                            phone: contact.phone_number,
                            username: contact.username,
                        });
                        contactsList.push(contact);
                    }
                }

                console.log(`[GramJS] Total contacts fetched: ${contactsList.length}`);

                setContactCount(contactsList.length);
                await crossReferenceWithFirestore(contactsList, setContactMap);
            }

        } catch (err) {
            console.error('[GramJS] Contact fetch error:', err);
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

/**
 * Cross-reference Telegram contacts with Firebase users - AUTO DETECTION
 * ─────────────────────────────────────────────────────────────────────────────
 * NO MANUAL in_dec FIELD NEEDED IN FIREBASE!
 * 
 * DEDUPLICATION LOGIC (AUTOMATIC):
 * ─────────────────────────────────────────────────────────────────────────────
 * We check if a Telegram contact's phone number exists in Firebase.
 * 
 *   IF phone found in Firebase → Dual User (is_onesutra_user = true)
 *   IF phone NOT found → Telegram-only (is_onesutra_user = false)
 * 
 * This works purely through CODE - no manual Firebase setup required!
 * 
 * The system will:
 *   1. Fetch Telegram contacts
 *   2. Query Firebase for matching phone numbers
 *   3. Automatically merge contacts that exist in both platforms
 *   4. Show Telegram-only contacts separately
 */
async function crossReferenceWithFirestore(
    contacts: TelegramContact[],
    setContactMap: (map: Record<string, { telegram_user_id: string; is_onesutra_user: boolean; onesutra_uid: string | null; first_name?: string; last_name?: string; username?: string }>) => void
) {
    try {
        const { getFirebaseFirestore } = await import('@/lib/firebase');
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const db = await getFirebaseFirestore();

        const phones = contacts.map((c) => c.phone_number).filter(Boolean);
        const contactByPhone: Record<string, TelegramContact> = {};
        for (const c of contacts) contactByPhone[c.phone_number] = c;

        const CHUNK = 30;
        const newMap: Record<string, { telegram_user_id: string; is_onesutra_user: boolean; onesutra_uid: string | null; first_name?: string; last_name?: string; username?: string }> = {};

        // Query Firebase users in chunks (Firestore 'in' query limit is 30)
        for (let i = 0; i < phones.length; i += CHUNK) {
            const chunk = phones.slice(i, i + CHUNK);

            // AUTO-DETECT: Check if any of these phones exist in Firebase
            // We look for both 'telegram_phone' and 'phone' fields
            const q = query(
                collection(db, 'onesutra_users'),
                where('telegram_phone', 'in', chunk)
            );

            const snap = await getDocs(q);

            for (const d of snap.docs) {
                const data = d.data();
                const phone: string = data.telegram_phone || data.phone;

                // AUTO-DETECT DUAL USER: Phone exists in BOTH Telegram AND Firebase
                if (phone && contactByPhone[phone]) {
                    const tgContact = contactByPhone[phone];
                    newMap[phone] = {
                        telegram_user_id: String(tgContact.id),
                        is_onesutra_user: true, // AUTO-DETECTED: Exists in both!
                        onesutra_uid: d.id,
                        first_name: tgContact.first_name,
                        last_name: tgContact.last_name,
                        username: tgContact.username,
                    };

                    console.log(`[GramJS Auto-Dedup] Dual user detected: ${data.name || phone}`);
                }
            }

            // Also check by 'phone' field (backup check)
            const q2 = query(
                collection(db, 'onesutra_users'),
                where('phone', 'in', chunk)
            );

            const snap2 = await getDocs(q2);

            for (const d of snap2.docs) {
                const data = d.data();
                const phone: string = data.phone || data.telegram_phone;

                // Only add if not already found
                if (phone && contactByPhone[phone] && !newMap[phone]) {
                    const tgContact = contactByPhone[phone];
                    newMap[phone] = {
                        telegram_user_id: String(tgContact.id),
                        is_onesutra_user: true,
                        onesutra_uid: d.id,
                        first_name: tgContact.first_name,
                        last_name: tgContact.last_name,
                        username: tgContact.username,
                    };

                    console.log(`[GramJS Auto-Dedup] Dual user detected (via phone field): ${data.name || phone}`);
                }
            }
        }

        // Add Telegram-only contacts (not found in Firebase)
        for (const c of contacts) {
            if (!newMap[c.phone_number]) {
                newMap[c.phone_number] = {
                    telegram_user_id: String(c.id),
                    is_onesutra_user: false, // Telegram-only
                    onesutra_uid: null,
                    first_name: c.first_name,
                    last_name: c.last_name,
                    username: c.username,
                };
            }
        }

        console.log('[GramJS Auto-Dedup] Final contact map:', newMap);
        console.log('[GramJS Auto-Dedup] Sample entries:', Object.entries(newMap).slice(0, 3));

        setContactMap(newMap);

        const dualUserCount = Object.values(newMap).filter(v => v.is_onesutra_user).length;
        const telegramOnlyCount = contacts.length - dualUserCount;

        console.log(`[GramJS Auto-Dedup] Complete! No manual setup needed:
  • Total Telegram contacts: ${contacts.length}
  • Auto-detected dual users: ${dualUserCount}
  • Telegram-only: ${telegramOnlyCount}
  • ✅ Works purely in code - no Firebase field setup required!`);
    } catch (err) {
        console.error('[GramJS] Firestore cross-reference error:', err);
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
    if (msg.includes('FLOOD_WAIT') || msg.includes('TOO_MANY_REQUESTS')) return 'Too many attempts. Please wait a few minutes and try again.';
    if (msg.includes('NETWORK')) return 'Network error. Check your connection and try again.';
    return msg || 'Something went wrong. Please try again.';
}
