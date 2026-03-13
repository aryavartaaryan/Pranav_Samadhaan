'use client';
/**
 * useSmartSend.ts — Phase 4: The "Smart Send" Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * ROUTING LOGIC:
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │  Override = 'TELEGRAM'  →  Always route via TDLib (manual override) │
 *   │  Override = 'NATIVE'    →  Always route via Firestore               │
 *   │  Override = 'AUTO'      →  Dual-user? → NATIVE : TELEGRAM           │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 * NATIVE send: Writes to `onesutra_chats/{chatId}/messages` in Firestore.
 *              Also updates lastMessage, unreadCounts, triggers FCM push.
 *
 * TELEGRAM send: Calls TDLib.sendMessage(chatId, text) → MTProto delivery.
 *
 * The result is a `sendMessage()` function the UI can call with just the text.
 * Routing is totally transparent to the UI layer.
 */

import { useCallback, useState } from 'react';
import { getTelegramMessagingService } from '@/lib/telegramMessaging';
import {
    useSutraConnectStore,
    selectContact,
    selectIsDualUser,
} from '@/stores/sutraConnectStore';
import type { SendNetworkOverride, UnifiedMessage, DeliveryStatus } from '@/lib/sutraConnect.types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface UseSmartSendProps {
    contactPhone: string;            // E.164 — used to look up identity
    currentUserId: string;           // Firebase UID of sender
    currentUserName: string;
    nativeChatId: string | null;     // Firestore chat doc ID (null if Tg-only)
    tgChatId: number | null;         // TDLib numeric chat ID
}

interface UseSmartSendReturn {
    sendMessage: (text: string) => Promise<void>;
    isSending: boolean;
    lastSendNetwork: 'NATIVE' | 'TELEGRAM' | null;
    override: SendNetworkOverride;
    setOverride: (o: SendNetworkOverride) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useSmartSend({
    contactPhone,
    currentUserId,
    currentUserName,
    nativeChatId,
    tgChatId,
}: UseSmartSendProps): UseSmartSendReturn {
    const [isSending, setIsSending] = useState(false);
    const [lastSendNetwork, setLastSendNetwork] = useState<'NATIVE' | 'TELEGRAM' | null>(null);

    const override = useSutraConnectStore((s) => s.sendOverride);
    const setSendOverride = useSutraConnectStore((s) => s.setSendOverride);
    const isDualUser = useSutraConnectStore(selectIsDualUser(contactPhone));
    const upsertMessages = useSutraConnectStore((s) => s.upsertMessages);

    /**
     * THE SMART SEND CONTROLLER
     *
     * Determines the routing network, creates an optimistic message for
     * immediate UI feedback, then dispatches to the correct backend.
     */
    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim() || isSending) return;

        // ── Determine routing network ─────────────────────────────────────────
        let network: 'NATIVE' | 'TELEGRAM';

        if (override === 'TELEGRAM') {
            network = 'TELEGRAM';
        } else if (override === 'NATIVE') {
            network = 'NATIVE';
        } else {
            // AUTO: prefer NATIVE if contact is a dual-user, else TELEGRAM
            network = isDualUser && nativeChatId ? 'NATIVE' : 'TELEGRAM';
        }

        // Fallback: if chosen network is unavailable, try the other
        if (network === 'NATIVE' && !nativeChatId) network = 'TELEGRAM';
        if (network === 'TELEGRAM' && !tgChatId) network = 'NATIVE';

        setIsSending(true);

        // ── Optimistic UI insert ───────────────────────────────────────────────
        const optimisticId = `OPTIMISTIC_${Date.now()}`;
        const optimisticMsg: UnifiedMessage = {
            internal_id: optimisticId,
            source_network: network,
            timestamp: Date.now(),
            text: text.trim(),
            sender_id: currentUserId,
            sender_name: currentUserName,
            delivery_status: 'SENDING',
            is_mine: true,
        };
        upsertMessages(contactPhone, [optimisticMsg]);

        try {
            if (network === 'NATIVE') {
                await sendNative(nativeChatId!, text, currentUserId, currentUserName);
            } else {
                await sendTelegram(tgChatId!, text);
            }
            setLastSendNetwork(network);

            // Update optimistic message to SENT
            upsertMessages(contactPhone, [{
                ...optimisticMsg,
                delivery_status: 'SENT',
            }]);
        } catch (err) {
            console.error(`[SmartSend] ${network} send failed:`, err);

            // Mark optimistic message as FAILED
            upsertMessages(contactPhone, [{
                ...optimisticMsg,
                delivery_status: 'FAILED',
            }]);
        } finally {
            setIsSending(false);
        }
    }, [
        isSending, override, isDualUser, nativeChatId, tgChatId,
        contactPhone, currentUserId, currentUserName, upsertMessages,
    ]);

    return {
        sendMessage,
        isSending,
        lastSendNetwork,
        override,
        setOverride: setSendOverride,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// NATIVE Send: Write to Firestore
// ─────────────────────────────────────────────────────────────────────────────

async function sendNative(
    chatId: string,
    text: string,
    currentUserId: string,
    senderName: string
): Promise<void> {
    const { getFirebaseFirestore } = await import('@/lib/firebase');
    const { collection, doc, addDoc, setDoc, increment, serverTimestamp } =
        await import('firebase/firestore');
    const db = await getFirebaseFirestore();

    // Write message to sub-collection (matches existing useMessages schema)
    await addDoc(collection(db, 'onesutra_chats', chatId, 'messages'), {
        text: text.trim(),
        senderId: currentUserId,
        senderName,
        createdAt: serverTimestamp(),
        summarized: false,
    });

    // Derive recipient ID from the chat doc ID (format: uid1_uid2 sorted)
    const recipientId = chatId.split('_').find((u) => u !== currentUserId) ?? '';

    // Update chat metadata
    const chatRef = doc(db, 'onesutra_chats', chatId);
    const updateData: Record<string, unknown> = {
        lastMessage: {
            text: text.trim(),
            senderId: currentUserId,
            senderName,
            sentBy: 'user',
            createdAt: serverTimestamp(),
        },
    };
    if (recipientId) {
        updateData[`unreadCounts.${recipientId}`] = increment(1);
    }
    await setDoc(chatRef, updateData, { merge: true });

    // FCM push notification (non-blocking, best-effort)
    if (recipientId) {
        fetch('/api/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                senderId: currentUserId, senderName, receiverId: recipientId,
                messageText: text.trim(), chatId,
            }),
        }).catch(() => { });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// TELEGRAM Send: Dispatch via GramJS
// ─────────────────────────────────────────────────────────────────────────────

async function sendTelegram(chatId: number | string, text: string): Promise<void> {
    const telegramService = getTelegramMessagingService();
    await telegramService.sendMessage(chatId, text);
}
