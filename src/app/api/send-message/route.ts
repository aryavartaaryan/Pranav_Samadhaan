/**
 * POST /api/send-message
 *
 * Event-Driven Autopilot Interceptor for SUTRAConnect.
 * This is the ONLY route used for sending messages.
 *
 * Flow (all within one Vercel serverless function execution):
 *   1. Save sender's message to Firestore immediately.
 *   2. Return response to sender (message delivered).
 *   3. Check if receiver has is_autopilot_active === true.
 *   4. Infinite-loop guard: if incoming message is_autopilot_reply === true → STOP.
 *   5. Ghost Typing Delay: wait 2.5–3.5s to humanize the reply timing.
 *   6. Call Gemini 2.5 Flash with the context-aware system prompt.
 *   7. Save AI reply to Firestore with is_ai_generated: true & is_autopilot_reply: true.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SendMessageBody {
    senderId: string;
    senderName: string;
    receiverId: string;
    receiverName: string;
    text: string;
    chatId: string;           // deterministic: [uid1, uid2].sort().join('_')
    isAiGenerated?: boolean;
    is_autopilot_reply?: boolean; // 🛡️ Module 3 loop guard flag
}

interface ChatMessage {
    id?: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: unknown;
    isAiGenerated: boolean;
    is_autopilot_reply?: boolean;
}

// ─── Gemini Client ────────────────────────────────────────────────────────────

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');

// ─── Module 5: Gemini 2.5 Flash System Prompt ────────────────────────────────

/**
 * Builds a warm, proxy-style system prompt for Gemini.
 * The AI clearly presents itself as an Autopilot assistant, not a fake human.
 */
function buildAutopilotSystemPrompt(receiverName: string, autopilotContext: string): string {
    return `You are managing the inbox for ${receiverName}. They are currently away.

Their current status is: "${autopilotContext}"

Your task: Read the incoming message and write a warm, brief, 1–2 sentence reply on behalf of ${receiverName}.

RULES:
1. Do NOT pretend to be a human. Gracefully acknowledge you are their Autopilot Assistant keeping their space peaceful.
2. Reference their current status context naturally in your reply.
3. Offer to take a message or let them know ${receiverName} will respond personally later.
4. Keep it warm, brief, and conversational. This is a real-time chat, not an email.
5. Do NOT use robotic or corporate language. Keep the OneSUTRA spirit — conscious, warm, human.`;
}

// ─── Helper: Fetch and Format Chat Context ────────────────────────────────────

async function fetchAndFormatContext(
    chatId: string,
    receiverName: string
): Promise<{ formattedContext: string; totalCount: number }> {
    const { getServerFirestore } = await import('@/lib/firebaseServer');
    const { collection, query, orderBy, getDocs } = await import('firebase/firestore');
    const db = getServerFirestore();

    const snapshot = await getDocs(
        query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'))
    );

    const allMessages = snapshot.docs.map(d => ({
        ...(d.data() as ChatMessage),
        id: d.id,
    }));

    const totalCount = allMessages.length;
    const contextMessages = allMessages.slice(-20);

    const formattedContext = contextMessages
        .map(msg => `${msg.senderName}: ${msg.text}`)
        .join('\n');

    return { formattedContext, totalCount };
}

// ─── Helper: Call Gemini 2.5 Flash ───────────────────────────────────────────

async function callGeminiAutopilot(
    receiverName: string,
    autopilotContext: string,
    formattedChatHistory: string,
    newestMessage: string,
    senderName: string
): Promise<string> {
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: buildAutopilotSystemPrompt(receiverName, autopilotContext),
        generationConfig: {
            maxOutputTokens: 150,
            temperature: 0.75,
        },
    });

    const prompt = formattedChatHistory
        ? `Recent chat history:\n\n${formattedChatHistory}\n\nNew message from ${senderName}: "${newestMessage}"\n\nReply as ${receiverName}'s Autopilot assistant — warmly, briefly.`
        : `${senderName} sent: "${newestMessage}"\n\nReply as ${receiverName}'s Autopilot assistant — warmly, briefly.`;

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    return result.response.text().trim() || `Hey! I'm ${receiverName}'s Autopilot. They're currently away — I'll make sure they see your message 🙏`;
}

// ─── Main Route Handler ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    // Parse body
    let body: SendMessageBody;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const {
        senderId,
        senderName,
        receiverId,
        receiverName,
        text,
        chatId,
        isAiGenerated = false,
        is_autopilot_reply = false,   // 🛡️ Module 3: Incoming loop guard flag
    } = body;

    if (!senderId || !receiverId || !text || !chatId) {
        return NextResponse.json(
            { error: 'Missing required fields: senderId, receiverId, text, chatId' },
            { status: 400 }
        );
    }

    const { getServerFirestore } = await import('@/lib/firebaseServer');
    const { doc, collection, setDoc, getDoc, serverTimestamp } = await import('firebase/firestore');
    const db = getServerFirestore();

    const messagesCol = collection(db, 'chats', chatId, 'messages');
    const newMsgRef = doc(messagesCol);

    // ── STEP 1: Save incoming message immediately ─────────────────────────────
    await setDoc(newMsgRef, {
        senderId,
        senderName: senderName || 'Unknown',
        receiverId,
        text,
        timestamp: serverTimestamp(),
        isAiGenerated,
        is_autopilot_reply,
    });

    // Update parent chat document
    await setDoc(doc(db, 'chats', chatId),
        {
            participants: [senderId, receiverId],
            lastMessage: text,
            lastMessageAt: serverTimestamp(),
            lastSenderId: senderId,
        },
        { merge: true }
    );

    const savedMessageId = newMsgRef.id;

    // ── STEP 2: Check if receiver has Autopilot enabled ───────────────────────
    //    Module 1: Read `is_autopilot_active` and `autopilot_context` from the user profile.
    let autopilotEnabled = false;
    let autopilotContext = 'I am currently away and will reply soon.';

    try {
        const receiverDoc = await getDoc(doc(db, 'onesutra_users', receiverId));
        if (receiverDoc.exists()) {
            const data = receiverDoc.data();
            autopilotEnabled = data?.is_autopilot_active === true;
            autopilotContext = data?.autopilot_context || autopilotContext;
        }
    } catch (err) {
        console.error('[send-message] Failed to fetch receiver profile:', err);
    }

    if (!autopilotEnabled) {
        // Autopilot is off — message saved, we're done.
        return NextResponse.json({ success: true, messageId: savedMessageId });
    }

    // ── STEP 3: 🛡️ Infinite Loop Guardrail ───────────────────────────────────
    //    If the incoming message was itself generated by an Autopilot, STOP immediately.
    //    This prevents AI <-> AI infinite reply loops.
    if (is_autopilot_reply === true || isAiGenerated === true) {
        console.log('[send-message] 🛡️ Autopilot loop guard triggered — skipping AI reply.');
        return NextResponse.json({ success: true, messageId: savedMessageId });
    }

    // ── STEP 4: Module 4 — Ghost Typing Delay ────────────────────────────────
    //    Artificially delay 2.5–3.5s so the reply feels human-like, not instant-robotic.
    const ghostDelay = 2500 + Math.random() * 1000; // 2.5s to 3.5s
    await new Promise(resolve => setTimeout(resolve, ghostDelay));

    // ── STEP 5: Fetch recent chat context for Gemini ──────────────────────────
    let formattedContext = '';
    try {
        const { formattedContext: ctx } = await fetchAndFormatContext(chatId, receiverName);
        formattedContext = ctx;
    } catch (err) {
        console.error('[send-message] Failed to fetch chat context:', err);
        // Not fatal — we can still reply with just the new message
    }

    // ── STEP 6: Call Gemini 2.5 Flash ────────────────────────────────────────
    let aiReplyText = '';
    try {
        aiReplyText = await callGeminiAutopilot(
            receiverName,
            autopilotContext,
            formattedContext,
            text,
            senderName
        );
    } catch (err) {
        console.error('[send-message] Gemini API call failed:', err);
        return NextResponse.json({ success: true, messageId: savedMessageId });
    }

    // ── STEP 7: Save AI reply as the receiver ─────────────────────────────────
    //    Explicitly tagged with both is_ai_generated and is_autopilot_reply
    //    so any future incoming message from the sender can be detected as auto-generated.
    try {
        const { doc: docFn, collection: colFn, setDoc: setDocFn, serverTimestamp: sts } = await import('firebase/firestore');
        const aiMsgRef = docFn(colFn(db, 'chats', chatId, 'messages'));
        await setDocFn(aiMsgRef, {
            senderId: receiverId,
            senderName: receiverName || 'Unknown',
            receiverId: senderId,
            text: aiReplyText,
            timestamp: sts(),
            isAiGenerated: true,
            is_ai_generated: true,
            is_autopilot_reply: true,   // 🛡️ Critical: prevents future loop triggers
        });

        await setDocFn(docFn(db, 'chats', chatId),
            {
                lastMessage: aiReplyText,
                lastMessageAt: sts(),
                lastSenderId: receiverId,
            },
            { merge: true }
        );

        console.log(`[send-message] ✅ Autopilot reply sent for ${receiverName}. Delay: ${Math.round(ghostDelay)}ms`);
    } catch (err) {
        console.error('[send-message] Failed to save AI reply:', err);
    }

    return NextResponse.json({ success: true, messageId: savedMessageId });
}
