'use client';
/**
 * useTelegramWeb.ts — GramJS MTProto Authentication Hook (Production-Grade)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * INITIALIZATION SEQUENCE (with persistent session):
 *   1. Mount → check localStorage for saved session.
 *   2a. Session found → connect → checkAuthorization().
 *       ✅ Valid  → step = 'READY', init messaging, fetch contacts silently.
 *       ❌ Invalid → clear session → step = 'WAIT_PHONE'.
 *   2b. No session → step = 'WAIT_PHONE'.
 *   3. User enters phone → submitPhone() → step = 'WAIT_CODE'.
 *   4. User enters OTP  → submitCode() → save session → step = 'READY'.
 *
 * SESSION_EXPIRED_EVENT listener triggers silent re-login prompt when
 * the Telegram server invalidates the auth key (e.g. user kills session
 * in native Telegram app).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSutraConnectStore } from '@/stores/sutraConnectStore';
import {
    SESSION_KEY,
    SESSION_EXPIRED_EVENT,
    setGlobalTelegramClient,
    activateKeepAlive,
    clearGlobalClient,
} from '@/lib/telegramClientManager';

// ─────────────────────────────────────────────────────────────────────────────
// GramJS Lazy Loader (must be dynamic to avoid SSR 'fs' error)
// ─────────────────────────────────────────────────────────────────────────────

export async function loadGramJS() {
    const [{ TelegramClient, Api }, { StringSession }] = await Promise.all([
        import('telegram'),
        import('telegram/sessions/StringSession'),
    ]);
    return { TelegramClient, Api, StringSession };
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type TelegramAuthStep =
    | 'IDLE'
    | 'INITIALIZING'      // Checking localStorage for saved session
    | 'RESTORING'         // Reconnecting to saved session
    | 'WAIT_PHONE'        // No session — show phone entry UI
    | 'WAIT_CODE'         // Waiting for OTP
    | 'WAIT_PASSWORD'     // 2FA password required
    | 'VERIFYING'         // Verifying OTP / password
    | 'READY'             // Fully authenticated and connected
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
    submitCode: (code: string, password?: string) => Promise<void>;
    disconnectTelegram: () => void;
    reset: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const API_ID = parseInt(process.env.NEXT_PUBLIC_TDLIB_API_ID ?? '0', 10);
const API_HASH = process.env.NEXT_PUBLIC_TDLIB_API_HASH ?? '';
const IS_MOCK = !API_ID || !API_HASH;

const CLIENT_CONFIG = {
    connectionRetries: 5,
    retryDelay: 1_000,
    autoReconnect: true,
    deviceModel: 'PranavSamadhaan Web',
    systemVersion: 'Web 2.0',
    appVersion: '2.0.0',
    langCode: 'en',
    useWSS: true, // REQUIRED: browser must use wss:// not ws://
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useTelegramWeb(): UseTelegramWebReturn {
    const [step, setStep] = useState<TelegramAuthStep>('IDLE');
    const [error, setError] = useState<string | null>(null);
    const [contactCount, setContactCount] = useState(0);

    const clientRef = useRef<any>(null);
    const phoneRef = useRef<string>('');
    const phoneCodeHashRef = useRef<string>('');

    const setTelegramSynced = useSutraConnectStore((s) => s.setTelegramSynced);
    const setContactMap = useSutraConnectStore((s) => s.setContactMap);

    // ── Mount: try to restore saved session silently ────────────────────────

    useEffect(() => {
        if (typeof window === 'undefined') return;

        let cancelled = false;

        async function tryRestoreSession() {
            setStep('INITIALIZING');

            // ── Mock mode (no API keys configured) ────────────────────────────
            if (IS_MOCK) {
                console.warn('[GramJS] MOCK MODE — set NEXT_PUBLIC_TDLIB_API_ID to go live.');
                if (!cancelled) setStep('WAIT_PHONE');
                return;
            }

            const savedSession = localStorage.getItem(SESSION_KEY) ?? '';

            // ── No saved session → go to phone entry ─────────────────────────
            if (!savedSession) {
                console.log('[GramJS] No saved session found');
                if (!cancelled) setStep('WAIT_PHONE');
                return;
            }

            // ── Saved session found → try to restore silently ─────────────────
            console.log('[GramJS] 🔄 Restoring saved Telegram session...');
            if (!cancelled) setStep('RESTORING');

            try {
                const { TelegramClient, StringSession } = await loadGramJS();
                const session = new StringSession(savedSession);
                const client = new TelegramClient(session, API_ID, API_HASH, CLIENT_CONFIG);

                await client.connect();

                // Verify the auth key is still accepted by Telegram servers
                const isAuthorised = await client.checkAuthorization();

                if (!isAuthorised) {
                    console.warn('[GramJS] Saved session rejected by Telegram — clearing');
                    localStorage.removeItem(SESSION_KEY);
                    if (!cancelled) setStep('WAIT_PHONE');
                    return;
                }

                // ✅ Session is valid!
                clientRef.current = client;
                setGlobalTelegramClient(client);
                activateKeepAlive();

                // Initialise the messaging service
                const { initializeTelegramMessaging } = await import('@/lib/telegramMessaging');
                await initializeTelegramMessaging(client);

                if (!cancelled) {
                    setStep('READY');
                    console.log('[GramJS] ✅ Session restored — user is logged in');
                }

                // Fetch & cross-reference contacts in background (non-blocking)
                fetchAndStoreContacts(client, setTelegramSynced, setContactMap, setContactCount);

            } catch (err: any) {
                console.error('[GramJS] Session restore error:', err);

                const isAuthError =
                    err?.message?.includes('AUTH_KEY_UNREGISTERED') ||
                    err?.message?.includes('AUTH_KEY_INVALID') ||
                    err?.message?.includes('SESSION_REVOKED');

                if (isAuthError) {
                    localStorage.removeItem(SESSION_KEY);
                }

                if (!cancelled) setStep('WAIT_PHONE');
            }
        }

        tryRestoreSession();

        // ── Listen for session expiry fired by telegramClientManager ───────────
        const onExpired = () => {
            console.log('[GramJS] Session expired event received — showing re-login UI');
            clientRef.current = null;
            setStep('WAIT_PHONE');
            setError('Your Telegram session expired. Please reconnect.');
        };

        window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);

        return () => {
            cancelled = true;
            window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Submit Phone ────────────────────────────────────────────────────────

    const submitPhone = useCallback(async (phone: string) => {
        setError(null);

        if (IS_MOCK) {
            setStep('VERIFYING');
            await sleep(1_500);
            setStep('WAIT_CODE');
            return;
        }

        try {
            setStep('VERIFYING');

            // If we don't have a client yet (fresh login after session restore failed)
            if (!clientRef.current) {
                const { TelegramClient, StringSession } = await loadGramJS();
                const client = new TelegramClient(new StringSession(''), API_ID, API_HASH, CLIENT_CONFIG);
                clientRef.current = client;
                setGlobalTelegramClient(client);
            }

            const normalized = normalizePhone(phone);
            phoneRef.current = normalized;

            // Ensure connection before sending code
            try {
                await clientRef.current.connect();
            } catch (connErr) {
                console.warn('[GramJS] Connection attempt during phone submit:', connErr);
            }

            const result = await clientRef.current.sendCode(
                { apiId: API_ID, apiHash: API_HASH },
                normalized
            );

            phoneCodeHashRef.current = result.phoneCodeHash;
            setStep('WAIT_CODE');

        } catch (err: any) {
            console.error('[GramJS] sendCode error:', err);
            setError(friendlyError(err?.message));
            setStep('WAIT_PHONE');
        }
    }, []);

    // ── Submit OTP Code (+ optional 2FA password) ────────────────────────────

    const submitCode = useCallback(async (code: string, password?: string) => {
        setError(null);

        if (IS_MOCK) {
            setStep('VERIFYING');
            await sleep(1_500);
            setStep('READY');
            setTelegramSynced('mock_tg_user_id_777', '+919876543210');
            setContactCount(4);
            setContactMap({
                '+919876500001': { telegram_user_id: '111001', is_onesutra_user: true, onesutra_uid: 'demo_uid_01' },
                '+919876500002': { telegram_user_id: '111002', is_onesutra_user: false, onesutra_uid: null },
            });
            return;
        }

        if (!clientRef.current || !phoneCodeHashRef.current || !phoneRef.current) {
            setError('Session lost. Please enter your phone number again.');
            setStep('WAIT_PHONE');
            return;
        }

        try {
            setStep('VERIFYING');
            const { Api, StringSession } = await loadGramJS();

            if (password) {
                // 2FA — check password first
                await clientRef.current.invoke(new Api.auth.CheckPassword({
                    password: await computeSRPAnswer(clientRef.current, password),
                }));
            } else {
                await clientRef.current.invoke(new Api.auth.SignIn({
                    phoneNumber: phoneRef.current,
                    phoneCodeHash: phoneCodeHashRef.current,
                    phoneCode: code.trim(),
                }));
            }

            // ✅ Signed in — persist session immediately
            const sessionString = (clientRef.current.session as InstanceType<typeof StringSession>).save();
            localStorage.setItem(SESSION_KEY, sessionString as unknown as string);
            console.log('[GramJS] ✅ Session saved to localStorage');

            setGlobalTelegramClient(clientRef.current);
            activateKeepAlive();

            // Wire up messaging service
            const { initializeTelegramMessaging } = await import('@/lib/telegramMessaging');
            await initializeTelegramMessaging(clientRef.current);

            setStep('READY');

            // Fetch contacts in background
            fetchAndStoreContacts(clientRef.current, setTelegramSynced, setContactMap, setContactCount);

        } catch (err: any) {
            console.error('[GramJS] SignIn error:', err);

            if (err.message?.includes('SESSION_PASSWORD_NEEDED')) {
                setStep('WAIT_PASSWORD');
                setError('2FA password required.');
                return;
            }

            setError(friendlyError(err?.message));
            setStep(password ? 'WAIT_PASSWORD' : 'WAIT_CODE');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setTelegramSynced, setContactMap]);

    // ── Disconnect ────────────────────────────────────────────────────────────

    const disconnectTelegram = useCallback(() => {
        clearGlobalClient();
        clientRef.current = null;
        setStep('WAIT_PHONE');
        setError(null);
        setContactCount(0);
    }, []);

    const reset = useCallback(() => {
        setStep('IDLE');
        setError(null);
        setContactCount(0);
    }, []);

    return {
        step,
        error,
        contactCount,
        isMockMode: IS_MOCK,
        submitPhone,
        submitCode,
        disconnectTelegram,
        reset,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Contact Fetching & Firestore Cross-Reference
// ─────────────────────────────────────────────────────────────────────────────

async function fetchAndStoreContacts(
    client: any,
    setTelegramSynced: (id: string, phone: string) => void,
    setContactMap: (map: Record<string, any>) => void,
    setContactCount: (n: number) => void,
) {
    try {
        const { Api } = await loadGramJS();

        const me = await client.getMe();
        setTelegramSynced(String(me?.id ?? 'tg_user'), me?.phone ?? '');

        const result = await client.invoke(new Api.contacts.GetContacts({ hash: BigInt(0) as any }));

        if (result.className !== 'contacts.Contacts') return;

        const contactsList: TelegramContact[] = result.users
            .filter((u: any) => u.className === 'User' && u.phone)
            .map((u: any) => ({
                id: Number(u.id),
                first_name: u.firstName ?? '',
                last_name: u.lastName ?? '',
                phone_number: normalizePhone(u.phone),
                username: u.username ?? undefined,
            }));

        console.log(`[GramJS] Contacts fetched: ${contactsList.length}`);
        setContactCount(contactsList.length);
        await crossReferenceWithFirestore(contactsList, setContactMap);

    } catch (err) {
        console.error('[GramJS] Contact fetch error:', err);
    }
}

async function crossReferenceWithFirestore(
    contacts: TelegramContact[],
    setContactMap: (map: Record<string, any>) => void,
) {
    try {
        const { getFirebaseFirestore } = await import('@/lib/firebase');
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const db = await getFirebaseFirestore();

        const phones = contacts.map((c) => c.phone_number).filter(Boolean);
        const contactByPhone: Record<string, TelegramContact> = {};
        for (const c of contacts) contactByPhone[c.phone_number] = c;

        const CHUNK = 30;
        const newMap: Record<string, any> = {};

        for (let i = 0; i < phones.length; i += CHUNK) {
            const chunk = phones.slice(i, i + CHUNK);

            for (const field of ['telegram_phone', 'phone']) {
                const snap = await getDocs(query(collection(db, 'onesutra_users'), where(field, 'in', chunk)));
                for (const d of snap.docs) {
                    const data = d.data();
                    const phone: string = data.telegram_phone || data.phone;
                    if (phone && contactByPhone[phone] && !newMap[phone]) {
                        const c = contactByPhone[phone];
                        newMap[phone] = {
                            telegram_user_id: String(c.id),
                            is_onesutra_user: true,
                            onesutra_uid: d.id,
                            first_name: c.first_name,
                            last_name: c.last_name,
                            username: c.username,
                        };
                    }
                }
            }
        }

        // Add Telegram-only contacts not found in Firebase
        for (const c of contacts) {
            if (!newMap[c.phone_number]) {
                newMap[c.phone_number] = {
                    telegram_user_id: String(c.id),
                    is_onesutra_user: false,
                    onesutra_uid: null,
                    first_name: c.first_name,
                    last_name: c.last_name,
                    username: c.username,
                };
            }
        }

        setContactMap(newMap);
        console.log(`[GramJS] Contact map ready: ${Object.keys(newMap).length} entries`);

    } catch (err) {
        console.error('[GramJS] Firestore cross-reference error:', err);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2FA SRP Helper (minimal — calls into GramJS built-in)
// ─────────────────────────────────────────────────────────────────────────────

async function computeSRPAnswer(client: any, password: string) {
    try {
        const { computeCheck } = await import('telegram/Password');
        const pwdInfo = await client.invoke({ className: 'account.GetPassword' });
        return computeCheck(pwdInfo, password);
    } catch {
        return password as any;
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

export function normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 ? `+${digits}` : digits;
}

function friendlyError(msg: string = ''): string {
    if (msg.includes('PHONE_NUMBER_INVALID')) return 'Invalid phone number. Include country code (e.g. +91).';
    if (msg.includes('PHONE_CODE_INVALID')) return 'Incorrect OTP. Please check and retry.';
    if (msg.includes('PHONE_CODE_EXPIRED')) return 'OTP expired. Go back and request a new one.';
    if (msg.includes('FLOOD_WAIT') || msg.includes('TOO_MANY_REQUESTS')) return 'Too many attempts. Please wait a few minutes.';
    if (msg.includes('NETWORK')) return 'Network error. Check your connection.';
    if (msg.includes('AUTH_KEY_UNREGISTERED')) return 'Session expired. Please log in again.';
    return msg || 'Something went wrong. Please try again.';
}
