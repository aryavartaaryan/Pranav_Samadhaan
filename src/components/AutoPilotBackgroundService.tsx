'use client';
/**
 * AutoPilotBackgroundService
 *
 * Listens to onesutra_autopilot_queue for jobs enqueued by sendMessage.
 * When recipient has AutoPilot ON, fetches chat history for style context,
 * calls /api/autopilot with a proper Gemini system instruction, and writes the reply.
 *
 * ✅ Works on ANY page (not just when chat is open)
 * ✅ Proper Gemini 2.5 Flash reply with style context (same quality as Cloud Function)
 * ✅ Dedup: marks job processed: true BEFORE generating to prevent double replies
 */
import { useEffect, useRef } from 'react';

interface Props {
    userId: string | null;
    userName: string;
    isAutoPilotEnabled: boolean;
}

export default function AutoPilotBackgroundService({ userId, userName, isAutoPilotEnabled }: Props) {
    const processingRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!userId || !isAutoPilotEnabled || typeof window === 'undefined') return;

        let unsub: (() => void) | undefined;

        (async () => {
            try {
                const { getFirebaseFirestore } = await import('@/lib/firebase');
                const {
                    collection, query, where, orderBy, limit,
                    onSnapshot, addDoc, updateDoc, doc, setDoc,
                    increment, serverTimestamp, getDocs,
                } = await import('firebase/firestore');
                const db = await getFirebaseFirestore();

                const q = query(
                    collection(db, 'onesutra_autopilot_queue'),
                    where('recipientId', '==', userId),
                    where('processed', '==', false),
                    orderBy('createdAt', 'desc'),
                    limit(5),
                );

                unsub = onSnapshot(q, async (snap) => {
                    for (const change of snap.docChanges()) {
                        if (change.type !== 'added') continue;
                        const jobId = change.doc.id;

                        // Hard dedup gate — never process same job twice in this session
                        if (processingRef.current.has(jobId)) continue;
                        processingRef.current.add(jobId);

                        const job = change.doc.data();
                        const { chatId, messageText, senderId, senderName } = job;

                        // Mark as processed IMMEDIATELY to prevent other tabs from processing
                        await updateDoc(change.doc.ref, {
                            processed: true,
                            processedAt: serverTimestamp(),
                            processedBy: userId,
                        });

                        try {
                            // ── Build style context: last 15 messages the user sent ──────────────
                            const ctxSnap = await getDocs(
                                query(
                                    collection(db, `onesutra_chats/${chatId}/messages`),
                                    where('senderId', '==', userId),
                                    orderBy('createdAt', 'desc'),
                                    limit(15)
                                )
                            );
                            const styleContext = ctxSnap.docs
                                .reverse()
                                .map(d => d.data().text as string)
                                .filter(Boolean)
                                .join('\n');

                            // ── Same system instruction quality as the Cloud Function ────────────
                            const systemInstruction = `You are an AI proxy for ${userName}.
Reply to incoming messages in EXACTLY ${userName}'s conversational style.

${styleContext ? `STYLE CONTEXT (${userName}'s recent messages — learn their tone, emoji, and phrasing):
---
${styleContext}
---` : ''}

RULES:
- Reply in max 2 short sentences, matching their usual length.
- Mirror their emoji usage, casing, and punctuation exactly.
- Sound natural and personal — NOT like a bot or assistant.
- Never say "I'll get back to you" unless their style shows that phrase.
- Never reveal you are an AI.`;

                            // ── The incoming message context ─────────────────────────────────────
                            const prompt = `${senderName} just sent: "${messageText}"\n\nReply as ${userName}:`;

                            // ── Call Gemini via /api/autopilot ───────────────────────────────────
                            const res = await fetch('/api/autopilot', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ prompt, systemInstruction }),
                            });

                            if (!res.ok) throw new Error(`API ${res.status}`);
                            const data = await res.json();
                            const aiText = data.text?.trim();
                            if (!aiText) throw new Error('Empty reply');

                            // ── Write AI reply to chat ───────────────────────────────────────────
                            const now = serverTimestamp();
                            await addDoc(collection(db, `onesutra_chats/${chatId}/messages`), {
                                text: aiText,
                                senderId: userId,
                                senderName: `${userName} (AI)`,
                                sentBy: 'ai',
                                summarized: false,
                                createdAt: now,
                            });

                            // Update chat metadata
                            await setDoc(doc(db, 'onesutra_chats', chatId), {
                                lastMessage: {
                                    text: aiText,
                                    senderId: userId,
                                    senderName: `${userName} (AI)`,
                                    sentBy: 'ai',
                                    createdAt: now,
                                },
                                [`isAutoPilotActive.${userId}`]: true,
                                [`unreadCounts.${senderId}`]: increment(1),
                            }, { merge: true });

                            console.log(`[AutoPilot] ✅ Replied in ${chatId}:`, aiText.slice(0, 60));
                        } catch (err) {
                            console.error('[AutoPilot] Reply failed for job', jobId, err);
                            // Re-enable for retry on next load if it failed
                            try {
                                await updateDoc(change.doc.ref, { processed: false, retryError: String(err) });
                            } catch { /* ignore */ }
                            processingRef.current.delete(jobId);
                        }
                    }
                });
            } catch (err) {
                console.error('[AutoPilot] Service failed to start:', err);
            }
        })();

        return () => unsub?.();
    }, [userId, isAutoPilotEnabled, userName]);

    return null;
}
