'use client';
/**
 * useMessages — Extended with sentBy, voiceNote, and AutoPilot interception
 */
import { useState, useEffect, useCallback } from 'react';
import type { Unsubscribe } from 'firebase/firestore';

export interface VoiceNote {
    url: string;        // Firebase Storage download URL
    durationSec: number;
    transcript?: string;          // Full transcript text
    words?: WordToken[];          // Word-level timing for tap-to-seek
}

export interface WordToken {
    word: string;
    startSec: number;
    endSec: number;
}

export interface ChatMessage {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    createdAt: number;
    sentBy?: 'user' | 'ai';          // 'ai' = AutoPilot generated
    voiceNote?: VoiceNote;           // present for Dhvani audio messages
    deliveryMode?: 'normal' | 'soft' | 'dawn';
}

export function getChatId(uid1: string, uid2: string): string {
    return [uid1, uid2].sort().join('_');
}

export function useMessages(chatId: string | null, currentUserId: string | null) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!chatId || !currentUserId || typeof window === 'undefined') {
            setMessages([]);
            return;
        }
        setLoading(true);
        let unsub: Unsubscribe | null = null;

        (async () => {
            try {
                const { getFirebaseFirestore } = await import('@/lib/firebase');
                const { collection, query, orderBy, onSnapshot, limitToLast } = await import('firebase/firestore');
                const db = await getFirebaseFirestore();

                const msgsRef = collection(db, 'onesutra_chats', chatId, 'messages');
                // limitToLast(100) ensures fast re-subscription on navigate-back.
                // onSnapshot keeps real-time: new messages push in instantly.
                const q = query(msgsRef, orderBy('createdAt', 'asc'), limitToLast(100));

                unsub = onSnapshot(q, { includeMetadataChanges: false }, (snap) => {
                    setMessages(snap.docs.map(d => {
                        const data = d.data();
                        const ts = data.createdAt;
                        const ms = ts?.toMillis ? ts.toMillis() : (ts?.seconds ? ts.seconds * 1000 : Date.now());
                        return {
                            id: d.id,
                            text: data.text ?? '',
                            senderId: data.senderId ?? '',
                            senderName: data.senderName ?? 'Traveller',
                            createdAt: ms,
                            sentBy: data.sentBy,
                            voiceNote: data.voiceNote,
                            deliveryMode: data.deliveryMode,
                        };
                    }));
                    setLoading(false);
                }, () => setLoading(false));
            } catch {
                setLoading(false);
            }
        })();

        return () => { unsub?.(); };
    }, [chatId, currentUserId]);


    const sendMessage = useCallback(async (
        text: string,
        senderName: string,
        extras?: { sentBy?: 'user' | 'ai'; voiceNote?: VoiceNote; deliveryMode?: string }
    ) => {
        if ((!text.trim() && !extras?.voiceNote) || !chatId || !currentUserId) return;
        try {
            const { getFirebaseFirestore } = await import('@/lib/firebase');
            const { collection, doc, addDoc, setDoc, increment, serverTimestamp } = await import('firebase/firestore');
            const db = await getFirebaseFirestore();

            const messageText = extras?.voiceNote ? '🎙️ Voice note' : text.trim();

            // Derive recipientId from chatId (sorted uid1_uid2)
            const recipientId = chatId.split('_').find((u: string) => u !== currentUserId) ?? '';

            // Write message to sub-collection
            const payload: Record<string, unknown> = {
                text: messageText,
                senderId: currentUserId,
                senderName,
                createdAt: serverTimestamp(),
                summarized: false,
            };
            if (extras?.sentBy) payload.sentBy = extras.sentBy;
            if (extras?.voiceNote) payload.voiceNote = extras.voiceNote;
            if (extras?.deliveryMode) payload.deliveryMode = extras.deliveryMode;
            await addDoc(collection(db, 'onesutra_chats', chatId, 'messages'), payload);

            // ── Instant keyword Vibe classification (no CF dependency) ──────────────
            const lower = messageText.toLowerCase();
            let vibe: string;
            if (/urgent|asap|emergency|now|immediately|deadline|critical|help me|!!/.test(lower)) {
                vibe = 'URGENT';
            } else if (/feel|miss|love|heart|soul|sad|lonely|deep|mean|beautiful|hope|life/.test(lower)) {
                vibe = 'DEEP';
            } else {
                vibe = 'CALM';
            }

            // ── Atomic chat metadata update ──────────────────────────────────────────
            const chatRef = doc(db, 'onesutra_chats', chatId);
            const updateData: Record<string, unknown> = {
                lastMessage: {
                    text: messageText,
                    senderId: currentUserId,
                    senderName,
                    sentBy: extras?.sentBy ?? 'user',
                    createdAt: serverTimestamp(),
                },
                vibe,               // instant vibe (Cloud Function will refine later)
            };

            // Only increment unread for human-sent messages — not AI AutoPilot replies
            if (recipientId && extras?.sentBy !== 'ai') {
                updateData[`unreadCounts.${recipientId}`] = increment(1);
            }

            await setDoc(chatRef, updateData, { merge: true });

            // ── FCM Push Notification (non-blocking, best-effort) ────────────────────
            if (recipientId && extras?.sentBy !== 'ai') {
                fetch('/api/send-notification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        senderId: currentUserId,
                        senderName,
                        receiverId: recipientId,
                        messageText,
                        chatId,
                    }),
                }).catch(() => { /* non-critical — never block send */ });
            }

            // ── AutoPilot flag: check if recipient has it enabled → enqueue job ────
            if (recipientId && extras?.sentBy !== 'ai') {
                try {
                    const { getDoc } = await import('firebase/firestore');
                    const recipientSnap = await getDoc(doc(db, 'onesutra_users', recipientId));
                    if (recipientSnap.exists() && recipientSnap.data()?.isAutoPilotEnabled) {
                        // Write a queue job — AutoPilotBackgroundService will pick it up
                        await addDoc(collection(db, 'onesutra_autopilot_queue'), {
                            chatId,
                            messageText: messageText,
                            senderId: currentUserId,
                            senderName,
                            recipientId,
                            processed: false,
                            createdAt: serverTimestamp(),
                        });
                    }
                } catch { /* ignore — AutoPilot is best-effort */ }
            }
        } catch { /* silent */ }
    }, [chatId, currentUserId]);

    return { messages, loading, sendMessage };
}

