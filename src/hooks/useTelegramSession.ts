'use client';
/**
 * useTelegramSession.ts — App-Root Session Bootstrap Hook
 * ─────────────────────────────────────────────────────────────────────────────
 * Mount this in the app root (or any top-level layout) to silently restore
 * a saved Telegram session as soon as the app loads, so that components
 * deeper in the tree find the messaging service already initialised.
 *
 * Usage:
 *   // In page.tsx or layout.tsx
 *   const { isRestoring, isSessionExpired } = useTelegramSession();
 *
 * This hook is SAFE to mount even if the user is not logged into Telegram.
 * It reads localStorage and exits gracefully if no session is found.
 */

import { useState, useEffect } from 'react';
import {
    initializeGlobalClient,
    SESSION_EXPIRED_EVENT,
    SESSION_KEY,
} from '@/lib/telegramClientManager';

interface UseTelegramSessionReturn {
    /** True while the background session restore is in progress */
    isRestoring: boolean;
    /** True if Telegram server rejected the saved auth key */
    isSessionExpired: boolean;
    /** True if a Telegram session is saved in localStorage */
    hasSavedSession: boolean;
}

export function useTelegramSession(): UseTelegramSessionReturn {
    const [isRestoring, setIsRestoring] = useState(false);
    const [isSessionExpired, setIsSessionExpired] = useState(false);
    const [hasSavedSession, setHasSavedSession] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const savedSession = localStorage.getItem(SESSION_KEY);
        setHasSavedSession(!!savedSession);

        // Nothing to restore — exit early
        if (!savedSession) return;

        // Silently restore in the background
        setIsRestoring(true);
        initializeGlobalClient()
            .then((restored) => {
                if (!restored) {
                    // Session existed but auth failed — already cleared by manager
                    setHasSavedSession(false);
                }
            })
            .catch((err) => {
                console.warn('[useTelegramSession] Restore failed:', err);
            })
            .finally(() => setIsRestoring(false));

        // Listen for session expiry fired by the keep-alive watchdog
        const onExpired = () => setIsSessionExpired(true);
        window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);

        return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
    }, []);

    return { isRestoring, isSessionExpired, hasSavedSession };
}
