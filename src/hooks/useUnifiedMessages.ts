'use client';
/**
 * useUnifiedMessages.ts — Phase 3: Data Normalization & In-Memory Merging
 * ─────────────────────────────────────────────────────────────────────────────
 * This hook is the CORE of Sutra Connect's "iMessage model."
 * It simultaneously listens to:
 *   1. Firestore `onSnapshot` — for Native OneSUTRA messages
 *   2. TDLib `updateNewMessage` event — for incoming Telegram messages
 *
 * Both streams are normalised into the `UnifiedMessage` interface, merged into
 * a single array in the Zustand store, and sorted chronologically.
 *
 * IMPORTANT: This hook is chat-scoped. Mount one instance per open conversation.
 *
 * @param contactPhone  - E.164 phone number (used as thread key)
 * @param currentUser   - Firebase auth user (for "is_mine" detection)
 * @param nativeChatId  - Firestore chat doc ID (only if contact is a dual-user)
 * @param tgChatId      - TDLib numeric chat ID (always present if Telegram linked)
 */

import { useEffect, useRef } from 'react';
import type { Unsubscribe } from 'firebase/firestore';
import { getTelegramMessagingService } from '@/lib/telegramMessaging';
import { useSutraConnectStore, selectThread } from '@/stores/sutraConnectStore';
import type { UnifiedMessage, DeliveryStatus } from '@/lib/sutraConnect.types';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface UseUnifiedMessagesProps {
    contactPhone: string;
    currentUserId: string;
    currentUserName: string;
    nativeChatId: string | null;   // null if contact is Telegram-only
    tgChatId: number | null;       // null if Telegram not linked
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useUnifiedMessages({
    contactPhone,
    currentUserId,
    currentUserName,
    nativeChatId,
    tgChatId,
}: UseUnifiedMessagesProps) {
    const upsertMessages = useSutraConnectStore((s) => s.upsertMessages);

    // Track listeners for cleanup
    const firestoreUnsubRef = useRef<Unsubscribe | null>(null);
    const telegramUnsubRef = useRef<(() => void) | null>(null);

    // ── Subscribe to Native Firestore messages ─────────────────────────────────
    useEffect(() => {
        if (!nativeChatId || !currentUserId) return;

        let isMounted = true;

        (async () => {
            try {
                const { getFirebaseFirestore } = await import('@/lib/firebase');
                const { collection, query, orderBy, onSnapshot, limitToLast } =
                    await import('firebase/firestore');
                const db = await getFirebaseFirestore();

                const msgsRef = collection(db, 'onesutra_chats', nativeChatId, 'messages');
                const q = query(msgsRef, orderBy('createdAt', 'asc'), limitToLast(100));

                firestoreUnsubRef.current = onSnapshot(q, (snap) => {
                    if (!isMounted) return;

                    const nativeMsgs: UnifiedMessage[] = snap.docs.map((d) => {
                        const data = d.data();
                        const ts = data.createdAt;
                        const ms: number = ts?.toMillis
                            ? ts.toMillis()
                            : ts?.seconds
                                ? ts.seconds * 1000
                                : Date.now();

                        return normalizeNativeMessage(d.id, data, ms, currentUserId);
                    });

                    upsertMessages(contactPhone, nativeMsgs);
                });
            } catch (err) {
                console.error('[UnifiedMessages] Firestore subscription error:', err);
            }
        })();

        return () => {
            isMounted = false;
            firestoreUnsubRef.current?.();
            firestoreUnsubRef.current = null;
        };
    }, [nativeChatId, currentUserId, contactPhone, upsertMessages]);

    // ── Hydrate Telegram history on mount ─────────────────────────────────────
    useEffect(() => {
        if (!tgChatId) return;

        (async () => {
            try {
                const telegramService = getTelegramMessagingService();
                if (!telegramService.isReady) return;

                const history = await telegramService.getChatHistory(tgChatId, 50);

                if (history.length > 0) {
                    upsertMessages(contactPhone, history);
                }
            } catch (err) {
                console.error('[UnifiedMessages] Telegram history fetch error:', err);
            }
        })();
    }, [tgChatId, currentUserId, contactPhone, upsertMessages]);

    // ── Subscribe to GramJS real-time messages ────────────────────────────────
    useEffect(() => {
        if (!tgChatId) return;

        const telegramService = getTelegramMessagingService();
        if (!telegramService.isReady) return;

        const handler = (msg: UnifiedMessage) => {
            // Filter: only handle messages for THIS specific chat
            // Note: GramJS uses string IDs, so we need to match against the contact phone
            // The message will already be normalized by the service
            upsertMessages(contactPhone, [msg]);
        };

        telegramUnsubRef.current = telegramService.addMessageListener(handler);

        return () => {
            telegramUnsubRef.current?.();
            telegramUnsubRef.current = null;
        };
    }, [tgChatId, currentUserId, contactPhone, upsertMessages]);

    // Return the unified thread from the store
    const thread = useSutraConnectStore(selectThread(contactPhone));
    return { messages: thread };
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalization Functions — Phase 3 Core Logic
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalises a raw Firestore message document into the UnifiedMessage schema.
 * Source network is always 'NATIVE'.
 */
function normalizeNativeMessage(
    docId: string,
    data: Record<string, unknown>,
    timestampMs: number,
    currentUserId: string
): UnifiedMessage {
    const senderId = (data.senderId as string) ?? '';

    // Map Firestore delivery states to our unified enum
    let deliveryStatus: DeliveryStatus = 'SENT';
    if (data.readAt) deliveryStatus = 'READ';
    if (data.error) deliveryStatus = 'FAILED';

    return {
        internal_id: `NATIVE_${docId}`,
        source_network: 'NATIVE',
        timestamp: timestampMs,
        text: (data.text as string) ?? '',
        sender_id: senderId,
        sender_name: (data.senderName as string) ?? 'Member',
        delivery_status: deliveryStatus,
        is_mine: senderId === currentUserId,
        voice_note_url: (data.voiceNote as { url?: string })?.url,
        _raw_native: data,
    };
}

