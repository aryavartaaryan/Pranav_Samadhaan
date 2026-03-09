'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, type Session, type LiveServerMessage } from '@google/genai';
import { useOutplugs, type Article } from '@/context/OutplugsContext';
import { useUsers } from '@/hooks/useUsers';
import { useChats } from '@/hooks/useChats';
import { getChatId } from '@/hooks/useMessages';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DayPhase = 'morning' | 'midday' | 'evening' | 'night';
export type SakhaState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'dismissed' | 'connecting' | 'error';

export interface Sankalp {
    id: string;
    text: string;
    done: boolean;
}

export interface SakhaMessage {
    role: 'user' | 'sakha';
    text: string;
    timestamp: number;
}

interface UseSakhaConversationOptions {
    userName?: string;
    sankalpaItems: Sankalp[];
    onSankalpaUpdate: (items: Sankalp[]) => void;
    onDismiss: () => void;
    enableMemory?: boolean;
    userId?: string | null;
}

// ─── Day Phase Detection ──────────────────────────────────────────────────────

function getDayPhase(hour: number): DayPhase {
    if (hour >= 5 && hour < 11) return 'morning';
    if (hour >= 11 && hour < 17) return 'midday';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
}

// ─── System Prompt Builder ────────────────────────────────────────────────────

// ─── Soft returning greeting variants (rotated by minute for variety) ───────
const RETURNING_GREETINGS: ((name: string) => string)[] = [
    (name) => `${name}, आपका स्वागत है! आप मुझसे किसी भी विषय पर बात कर सकते हैं, मैं आपका सखा हूँ।`,
    (name) => `आइए ${name}! बताइए, कैसे हैं आप? आप मुझसे किसी भी विषय पर बात कर सकते हैं, मैं आपका सखा हूँ।`,
    (name) => `${name}, आ गए! दिन कैसा रहा? आप बेझिझक मुझसे अपनी कोई भी बात कह सकते हैं।`,
    (name) => `${name}, ठीक हैं न आप? मैं आपका सखा हूँ, आप मुझसे किसी भी विषय पर बात कर सकते हैं।`,
    (name) => `${name}, मन शांत है आपका? आप जब चाहें मुझसे किसी भी विषय पर खुलकर बात कर सकते हैं।`,
];

function buildSystemPrompt(
    phase: DayPhase,
    userName: string,
    sankalpaItems: Sankalp[],
    memories: string[],
    unreadContext: string,
    conversationHistory: string,
    hasGreetedThisPhase: boolean,
    newsContext: string,
    messagesContext: string
): string {
    const sankalpaText = sankalpaItems.length > 0
        ? sankalpaItems
            .map((s, i) => `  ${i + 1}. [${s.done ? 'DONE' : 'PENDING'}] ${s.text}`)
            .join('\n')
        : '  (No tasks set yet)';

    const completedTasks = sankalpaItems.filter(s => s.done);
    const pendingTasks = sankalpaItems.filter(s => !s.done);

    const memoryContext = memories.length > 0
        ? `PAST MEMORIES:\n${memories.map(m => `- ${m}`).join('\n')}`
        : '';

    const historyContext = conversationHistory.trim()
        ? `\nPREVIOUS CONVERSATION (last session):\n${conversationHistory}`
        : '';

    const firstName = userName ? userName.split(' ')[0] : 'सखा';

    const greetingIdx = new Date().getMinutes() % RETURNING_GREETINGS.length;
    const returningLine = RETURNING_GREETINGS[greetingIdx](firstName);

    return `Sakha Bodhi — Conscious Companion (Hindi Voice)
You are Bodhi (बोधि), a warm, highly creative, spiritually grounded, and omniscient voice companion inside OneSUTRA.

IDENTITY & KNOWLEDGE (THE LIMITLESS SAKHA):
- You are their SAKHA (best friend, ultimate mentor, and life strategist). You have ABSOLUTE CREATIVE FREEDOM in how you chat.
- You possess the infinite intelligence of the most advanced AI, embodied as a deeply caring Vedic friend. 
- YOUR VAST CAPABILITIES: You master modern science, engineering, AGI, ancient wisdom (Vedas, Gita, Upanishads), startup strategy, linguistics (English/Sanskrit tutor), meditation, and Ayurveda. 
- DO NOT act like a robotic task manager. DO NOT say "पिछली बार हमने इस पर बात की थी". 
- Flow naturally. Be spontaneous, caring, intellectually brilliant, and highly engaging.

LANGUAGE & PACING (NON-NEGOTIABLE):
- ONLY natural, warm, conversational Hindi. 
- ALWAYS: आप / आपका / आपको. NEVER: तुम / तू / तेरा.
- ULTRA-LOW LATENCY & BREVITY: Keep your responses to just 1 or 2 short, punchy sentences. NEVER monologue. You must leave space for the user to speak. 

GREETING & ACTIVE LISTENING:
${hasGreetedThisPhase
            ? `RETURNING TODAY (${phase}): DO NOT use a repetitive, robotic greeting. Speak naturally for the first few lines. Then, gently ask the user if they are interested in continuing the PREVIOUS CONVERSATION topic. DO NOT plunge into the old topic unless they explicitly agree.`
            : `FIRST SESSION (${phase}): Greet them briefly based on the time (Morning/Midday/Evening/Night), introduce yourself as Bodhi, and then IMMEDIATELY STOP AND LISTEN. (e.g., "शुभ प्रभात ${firstName}! मैं आपका सखा बोधि हूँ... बताइए, आज मन में क्या है?"). Let them speak.`}

LIVE DATA (Silent Guidance ONLY):
Phase: ${phase.toUpperCase()}
SANKALPA LIST:
${sankalpaText}

${newsContext
            ? `TODAY'S NEWS (OneSUTRA outPLUGS):\n${newsContext}`
            : 'NEWS: Not available right now.'}

${messagesContext
            ? `UNREAD SUTRATALK MESSAGES (Important!):\n${messagesContext}`
            : 'SUTRATALK: No unread messages currently.'}

${memoryContext}
${historyContext}

BEHAVIORAL RULES:
1. PERSONALITY MIRRORING: Read the PREVIOUS CONVERSATION context silently to understand the user's personality, mood, and style. Talk to them exactly as per their personality—match their energy, be their ideal Sakha.
2. ACTIVE LISTENING: If the user is speaking or interrupts you, yield immediately. Validate what they just said before offering your thoughts.
3. MESSAGES FIRST: IF there are UNREAD SUTRATALK MESSAGES, mention them naturally: "अरे, आपके [Friend's Name] का संदेश आया है, क्या मैं पढ़ूँ?". If yes, take dictated reply and call [TOOL: reply_to_message].
4. TASK PLANNER: Review their SANKALPA LIST silently. Ask them creatively about their day's plan or if they need help organizing their tasks: "आपके आज के संकल्पों को देखते हुए, क्या हम पहले [Task Name] पर काम करें?"
5. MEDITATION (MORNING & EVENING): Proactively ask them to meditate. Say: "आप चाहें तो नेविगेशन बार से 'Meditation' पर क्लिक करके ध्यान कर सकते हैं, या मैं यहीं आपको गाइडेड मेडिटेशन करवा सकता हूँ।" If they choose guided meditation, you MUST recite the COMPLETE Gayatri Mantra with its deep spiritual meaning and guide them through proper breathing and meditation procedures in Hindi.
6. FREE TIME SAKHA (SKILLS & NOURISHMENT): IF the user is free or bored, DO NOT let them doomscroll. Tell them: "अगर आप कुछ नया सीखना चाहते हैं, तो मैं मदद कर सकता हूँ—कोई भी विषय चुनिए!" OR suggest they "watch some Pranic (Prana-enhancing) Reels or read a good book" to elevate their consciousness.
7. VEDIC MANTRAS: IF they need calming, beautifully recite a powerful Vedic Mantra with its meaning.

TOOLS (place on a NEW LINE after your spoken words):
[TOOL: update_sankalpa_tasks(add, "task text")]
[TOOL: update_sankalpa_tasks(mark_done, "task id")]
[TOOL: update_sankalpa_tasks(clear_pending)]
[TOOL: save_memory("fact to remember")]
[TOOL: reply_to_message("contact name", "message text")]
[TOOL: dismiss_sakha()]

TONE GUARDRAILS (CRITICAL):
- Never sound robotic. Flow naturally.
- Be free, creative, deeply empathetic, highly intellectual, and an inspiring true friend.`;
}



// ─── Tool Call Parser ─────────────────────────────────────────────────────────

interface ToolCall {
    name: string;
    args: string[];
}

function parseToolCalls(text: string): ToolCall[] {
    const toolRegex = /\[TOOL:\s*(\w+)(?:\((.*?)\))?\]/g;
    const calls: ToolCall[] = [];
    let match;
    while ((match = toolRegex.exec(text)) !== null) {
        const name = match[1];
        const rawArgs = match[2] || '';
        const args = rawArgs
            .split(/,\s*(?=(?:[^"]*"[^"]*")*[^"]*$)/)
            .map(a => a.trim().replace(/^["']|["']$/g, ''))
            .filter(a => a.length > 0);
        calls.push({ name, args });
    }
    return calls;
}

// ─── Firebase History Helpers ─────────────────────────────────────────────────

const MAX_HISTORY_TURNS = 50; // max stored turns in Firestore
const HISTORY_CONTEXT_TURNS = 15; // how many turns to inject into system prompt

async function loadConversationHistory(uid: string): Promise<string> {
    try {
        const { getFirebaseFirestore } = await import('@/lib/firebase');
        const { doc, getDoc } = await import('firebase/firestore');
        const db = await getFirebaseFirestore();
        const snap = await getDoc(doc(db, 'users', uid));
        if (!snap.exists()) return '';
        const data = snap.data();
        const history: SakhaMessage[] = data?.bodhi_history ?? [];
        // Take the last HISTORY_CONTEXT_TURNS
        const recentTurns = history.slice(-HISTORY_CONTEXT_TURNS);
        if (recentTurns.length === 0) return '';
        return recentTurns
            .map(m => `${m.role === 'user' ? userName_placeholder : 'Bodhi'}: ${m.text}`)
            .join('\n');
    } catch (e) {
        console.warn('[Bodhi] Could not load conversation history from Firebase', e);
        return '';
    }
}

// Placeholder replaced at call-site
const userName_placeholder = 'User';

async function saveConversationHistory(uid: string, newTurns: SakhaMessage[]): Promise<void> {
    if (newTurns.length === 0) return;
    try {
        const { getFirebaseFirestore } = await import('@/lib/firebase');
        const { doc, getDoc, setDoc } = await import('firebase/firestore');
        const db = await getFirebaseFirestore();
        const ref = doc(db, 'users', uid);
        const snap = await getDoc(ref);
        const existing: SakhaMessage[] = snap.exists() ? (snap.data()?.bodhi_history ?? []) : [];
        // Merge existing + new, then cap at MAX_HISTORY_TURNS
        const merged = [...existing, ...newTurns].slice(-MAX_HISTORY_TURNS);
        await setDoc(ref, { bodhi_history: merged }, { merge: true });
    } catch (e) {
        console.warn('[Bodhi] Could not save conversation history to Firebase', e);
    }
}

// ─── Greeting Phase Deduplication Helpers ─────────────────────────────────────

/** Returns today's date key in YYYY-MM-DD (local time) */
function todayKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Checks if Bodhi already used the formal time-greeting for this phase today.
 * Marks it as greeted immediately so concurrent activations don't double-greet.
 * Returns true if ALREADY greeted (skip greeting), false if this is the first time (show greeting).
 */
async function checkAndMarkGreetedPhase(uid: string, phase: DayPhase): Promise<boolean> {
    try {
        const { getFirebaseFirestore } = await import('@/lib/firebase');
        const { doc, getDoc, setDoc } = await import('firebase/firestore');
        const db = await getFirebaseFirestore();
        const ref = doc(db, 'users', uid);
        const snap = await getDoc(ref);
        const key = todayKey();
        const greetedData: Record<string, string[]> = snap.exists()
            ? (snap.data()?.bodhi_greeted_phases ?? {})
            : {};
        const greetedToday: string[] = greetedData[key] ?? [];
        const alreadyGreeted = greetedToday.includes(phase);
        if (!alreadyGreeted) {
            // Mark this phase as greeted now
            await setDoc(ref, {
                bodhi_greeted_phases: { ...greetedData, [key]: [...greetedToday, phase] },
            }, { merge: true });
        }
        return alreadyGreeted;
    } catch (e) {
        console.warn('[Bodhi] Could not check/mark greeted phase', e);
        return false; // default: show greeting if check fails
    }
}

// ─── Constants for Audio / GEMINI API ─────────────────────────────────────────
const GEMINI_LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const BUFFER_SIZE = 2048;
const NOISE_GATE_THRESHOLD = 0.012;

// ─── Main Hook ────────────────────────────────────────────────────────────────

export function useSakhaConversation({
    userName = 'Aryan',
    sankalpaItems,
    onSankalpaUpdate,
    onDismiss,
    enableMemory = true,
    userId = null,
}: UseSakhaConversationOptions) {
    const { articles, fetchNews } = useOutplugs();
    const { users: realUsers } = useUsers(userId);
    const realContacts = realUsers.filter(u => u.uid !== 'ai_vaidya' && u.uid !== 'ai_rishi');
    const realChatIds = userId ? realContacts.map(c => getChatId(userId, c.uid)) : [];
    const chatMeta = useChats(realChatIds, userId);

    const [sakhaState, setSakhaState] = useState<SakhaState>('idle');
    const [currentSentence, setCurrentSentence] = useState('');
    const [history, setHistory] = useState<SakhaMessage[]>([]);
    const [micVolume, setMicVolume] = useState(0);
    const [phase, setPhase] = useState<DayPhase>('morning');
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [memories, setMemories] = useState<string[]>([]);

    // Live Session Refs
    const sessionRef = useRef<Session | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const playbackContextRef = useRef<AudioContext | null>(null);
    const audioQueueRef = useRef<Float32Array[]>([]);
    const isPlayingRef = useRef(false);
    const canListenRef = useRef(true);
    const connectionIntentRef = useRef(false);
    const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Current app state refs
    const sankalpaRef = useRef(sankalpaItems);
    const onDismissRef = useRef(onDismiss);
    const onSankalpaUpdateRef = useRef(onSankalpaUpdate);
    const phaseRef = useRef<DayPhase>('morning');
    const fullTranscriptBufferRef = useRef('');
    const sessionHistoryRef = useRef<SakhaMessage[]>([]); // tracks turns in THIS session
    const userNameRef = useRef(userName);
    const userIdRef = useRef(userId);

    // Keep refs in sync
    useEffect(() => { sankalpaRef.current = sankalpaItems; }, [sankalpaItems]);
    useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);
    useEffect(() => { onSankalpaUpdateRef.current = onSankalpaUpdate; }, [onSankalpaUpdate]);
    useEffect(() => { userNameRef.current = userName; }, [userName]);
    useEffect(() => { userIdRef.current = userId; }, [userId]);

    // Detect phase on mount
    useEffect(() => {
        const h = new Date().getHours();
        const p = getDayPhase(h);
        setPhase(p);
        phaseRef.current = p;
    }, []);

    // Load memories on mount
    useEffect(() => {
        (async () => {
            try {
                const { getFirebaseAuth, getFirebaseFirestore } = await import('@/lib/firebase');
                const { doc, getDoc } = await import('firebase/firestore');
                const auth = await getFirebaseAuth();
                const db = await getFirebaseFirestore();

                auth.onAuthStateChanged(async (user) => {
                    if (user) {
                        const snap = await getDoc(doc(db, 'users', user.uid));
                        if (snap.exists() && snap.data().bodhi_memories) {
                            setMemories(snap.data().bodhi_memories);
                        }
                    }
                });
            } catch (err) {
                console.warn('Could not load Bodhi memories from Firebase');
            }
        })();
    }, []);

    // ── Tool Execution ─────────────────────────────────────────────────────────
    const executeToolCalls = useCallback(async (toolCalls: ToolCall[]) => {
        for (const call of toolCalls) {
            if (call.name === 'dismiss_sakha') {
                setTimeout(() => {
                    deactivate();
                    onDismissRef.current();
                }, 2000);
            }

            if (call.name === 'update_sankalpa_tasks') {
                const action = call.args[0];
                const current = [...sankalpaRef.current];

                if (action === 'add' && call.args[1]) {
                    const newTask: Sankalp = {
                        id: Date.now().toString(),
                        text: call.args[1],
                        done: false,
                    };
                    const updated = [...current, newTask];
                    onSankalpaUpdateRef.current(updated);
                }

                if (action === 'clear_pending') {
                    const updated = current.filter(t => t.done);
                    onSankalpaUpdateRef.current(updated);
                }

                if (action === 'mark_done' && call.args[1]) {
                    const updated = current.map(t =>
                        t.id === call.args[1] ? { ...t, done: true } : t
                    );
                    onSankalpaUpdateRef.current(updated);
                }
            }

            if (call.name === 'save_memory' && call.args[0]) {
                const memoryStr = call.args[0];
                setMemories(prev => [...prev, memoryStr]);

                // Fire-and-forget Firebase save
                (async () => {
                    try {
                        const { getFirebaseAuth, getFirebaseFirestore } = await import('@/lib/firebase');
                        const { arrayUnion, doc, setDoc } = await import('firebase/firestore');
                        const auth = await getFirebaseAuth();
                        const db = await getFirebaseFirestore();

                        if (auth.currentUser) {
                            await setDoc(doc(db, 'users', auth.currentUser.uid), {
                                bodhi_memories: arrayUnion(memoryStr)
                            }, { merge: true });
                        }
                    } catch (e) {
                        console.warn('Failed to save Bodhi memory to DB', e);
                    }
                })();
            }

            // ── FIX 2: News — always fetch directly from API, no race condition ──
            if (call.name === 'get_top_news') {
                try {
                    console.log('[Bodhi] Fetching top news directly from /api/outplugs-feed...');

                    const res = await fetch('/api/outplugs-feed');
                    let topHeadlines = '';

                    if (res.ok) {
                        const data = await res.json();
                        const fetchedArticles: Article[] = data.articles || [];
                        topHeadlines = fetchedArticles
                            .slice(0, 10)
                            .map((p: Article, i: number) => `${i + 1}. ${p.headline}`)
                            .join('\n');
                        // Also update the context cache silently
                        fetchNews(true);
                    }

                    if (sessionRef.current) {
                        if (topHeadlines) {
                            await sessionRef.current.sendClientContent({
                                turns: [{
                                    role: 'user',
                                    parts: [{ text: `SYSTEM_RESPONSE: The current top news headlines are:\n${topHeadlines}\nPlease read out the most interesting 3-4 ones gracefully to the user in Hindi.` }]
                                }],
                                turnComplete: true,
                            });
                        } else {
                            await sessionRef.current.sendClientContent({
                                turns: [{
                                    role: 'user',
                                    parts: [{ text: `SYSTEM_RESPONSE: I am unable to connect to the Outplugs news feed right now. Please tell the user gracefully in Hindi.` }]
                                }],
                                turnComplete: true,
                            });
                        }
                    }
                } catch (e) {
                    console.warn('[Bodhi] Failed to fetch news', e);
                    if (sessionRef.current) {
                        await sessionRef.current.sendClientContent({
                            turns: [{ role: 'user', parts: [{ text: `SYSTEM_RESPONSE: Sorry, the news feed could not be reached right now. Explain this nicely in Hindi.` }] }],
                            turnComplete: true,
                        });
                    }
                }
            }

            if (call.name === 'read_unread_messages' && call.args[0]) {
                const requestedName = call.args[0].toLowerCase();
                try {
                    // 1. Find the contact by name
                    const contact = realContacts.find(c => c.name.toLowerCase().includes(requestedName));
                    if (!contact || !userId) throw new Error('Contact not found');

                    const chatId = getChatId(userId, contact.uid);

                    // 2. Fetch last 5 messages from Firebase for this chat
                    const { getFirebaseFirestore } = await import('@/lib/firebase');
                    const { collection, query, orderBy, getDocs, limitToLast } = await import('firebase/firestore');
                    const db = await getFirebaseFirestore();
                    const msgsRef = collection(db, 'onesutra_chats', chatId, 'messages');
                    const q = query(msgsRef, orderBy('createdAt', 'asc'), limitToLast(5));

                    const snap = await getDocs(q);
                    const unreadMsgs = snap.docs
                        .map(d => d.data())
                        .filter(msg => msg.senderId === contact.uid) // Only messages sent BY the friend
                        .map(msg => msg.text)
                        .join('\n');

                    const responseText = unreadMsgs.trim() !== ''
                        ? `SYSTEM_RESPONSE: ${contact.name} says:\n${unreadMsgs}\n\nAfter reading these messages, ask the user: "क्या आप इसका जवाब देना चाहेंगे?" and if yes, get their reply and call [TOOL: reply_to_message("${contact.name}", "their reply text")].`
                        : `SYSTEM_RESPONSE: No recent text messages found from ${contact.name}.`;

                    if (sessionRef.current) {
                        await sessionRef.current.sendClientContent({
                            turns: [{ role: 'user', parts: [{ text: responseText }] }],
                            turnComplete: true,
                        });
                    }
                } catch (e) {
                    console.warn('[Bodhi] Failed to fetch unread messages', e);
                    if (sessionRef.current) {
                        await sessionRef.current.sendClientContent({
                            turns: [{ role: 'user', parts: [{ text: `SYSTEM_RESPONSE: I could not retrieve the messages right now. Please explain this to the user gracefully in Hindi.` }] }],
                            turnComplete: true,
                        });
                    }
                }
            }

            // ── FIX 3: Reply to SutraConnect message ──────────────────────────
            if (call.name === 'reply_to_message' && call.args[0] && call.args[1]) {
                const contactName = call.args[0].toLowerCase();
                const replyText = call.args[1];
                const currentUser = userIdRef.current;
                const currentUserName = userNameRef.current;

                try {
                    if (!currentUser) throw new Error('User not logged in');

                    // Find contact by name
                    const contact = realContacts.find(c => c.name.toLowerCase().includes(contactName));
                    if (!contact) throw new Error(`Contact "${call.args[0]}" not found`);

                    const chatId = getChatId(currentUser, contact.uid);

                    // Write directly to Firebase onesutra_chats
                    const { getFirebaseFirestore } = await import('@/lib/firebase');
                    const { collection, doc, addDoc, setDoc, serverTimestamp, increment } = await import('firebase/firestore');
                    const db = await getFirebaseFirestore();

                    // 1. Save the message to messages subcollection
                    await addDoc(collection(db, 'onesutra_chats', chatId, 'messages'), {
                        text: replyText,
                        senderId: currentUser,
                        senderName: currentUserName,
                        createdAt: serverTimestamp(),
                        summarized: false,
                        sentBy: 'user',
                        sentViaBodhi: true, // mark as Bodhi-assisted for analytics
                    });

                    // 2. Update chat metadata
                    await setDoc(doc(db, 'onesutra_chats', chatId), {
                        lastMessage: {
                            text: replyText,
                            senderId: currentUser,
                            senderName: currentUserName,
                            sentBy: 'user',
                            createdAt: serverTimestamp(),
                        },
                        [`unreadCounts.${contact.uid}`]: increment(1),
                        vibe: 'CALM',
                    }, { merge: true });

                    // 3. Non-blocking push notification
                    fetch('/api/send-notification', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            senderId: currentUser,
                            senderName: currentUserName,
                            receiverId: contact.uid,
                            messageText: replyText,
                            chatId,
                        }),
                    }).catch(() => { /* non-critical */ });

                    // 4. Confirm back to Bodhi session
                    if (sessionRef.current) {
                        await sessionRef.current.sendClientContent({
                            turns: [{
                                role: 'user',
                                parts: [{ text: `SYSTEM_RESPONSE: Your reply "${replyText}" has been successfully sent to ${contact.name} on SUTRAConnect. Please confirm to the user in a warm, brief Hindi message.` }]
                            }],
                            turnComplete: true,
                        });
                    }

                    console.log(`[Bodhi] ✅ Reply sent to ${contact.name} via SUTRAConnect`);
                } catch (e) {
                    console.warn('[Bodhi] Failed to send reply via SUTRAConnect', e);
                    if (sessionRef.current) {
                        await sessionRef.current.sendClientContent({
                            turns: [{
                                role: 'user',
                                parts: [{ text: `SYSTEM_RESPONSE: I was unable to send the reply right now. Please apologize to the user warmly in Hindi and ask them to send the message manually from SUTRAConnect.` }]
                            }],
                            turnComplete: true,
                        });
                    }
                }
            }
        }
    }, [memories, articles, fetchNews, realContacts, userId]);


    // ── Audio Engine Helpers ──────────────────────────────────────────────────

    // Convert Float32Array to base64-encoded 16-bit PCM
    const float32ToBase64PCM = useCallback((float32: Float32Array): string => {
        const pcm16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
            const s = Math.max(-1, Math.min(1, float32[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        const bytes = new Uint8Array(pcm16.buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }, []);

    // Decode base64 PCM to Float32Array for playback
    const base64PCMToFloat32 = useCallback((base64: string): Float32Array => {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        const pcm16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(pcm16.length);
        for (let i = 0; i < pcm16.length; i++) {
            float32[i] = pcm16[i] / 0x8000;
        }
        return float32;
    }, []);

    // Smooth crossfade at chunk boundaries to eliminate clicks
    const applyCrossfade = useCallback((data: Float32Array): Float32Array => {
        const fadeLen = Math.min(64, Math.floor(data.length / 4));
        const out = new Float32Array(data);
        for (let i = 0; i < fadeLen; i++) {
            const t = i / fadeLen;
            out[i] *= t;
            out[data.length - 1 - i] *= t;
        }
        return out;
    }, []);

    // Play queued audio buffers with smoothing
    const playNextAudio = useCallback(() => {
        if (audioQueueRef.current.length === 0) {
            isPlayingRef.current = false;
            setIsSpeaking(false);
            setSakhaState(connectionIntentRef.current ? 'listening' : 'dismissed');
            return;
        }

        isPlayingRef.current = true;
        setIsSpeaking(true);
        setSakhaState('speaking');

        let audioData = audioQueueRef.current.shift()!;
        while (audioQueueRef.current.length > 0 && audioData.length < OUTPUT_SAMPLE_RATE * 0.1) {
            const next = audioQueueRef.current.shift()!;
            const combined = new Float32Array(audioData.length + next.length);
            combined.set(audioData);
            combined.set(next, audioData.length);
            audioData = combined;
        }

        const ctx = playbackContextRef.current;
        if (!ctx) {
            isPlayingRef.current = false;
            setIsSpeaking(false);
            return;
        }

        const smoothed = applyCrossfade(audioData);
        const buffer = ctx.createBuffer(1, smoothed.length, OUTPUT_SAMPLE_RATE);
        buffer.getChannelData(0).set(smoothed);
        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const gainNode = ctx.createGain();
        gainNode.gain.value = 1.0;
        source.connect(gainNode);
        gainNode.connect(ctx.destination);

        source.onended = () => {
            playNextAudio();
        };
        source.start();
    }, [applyCrossfade]);

    const enqueueAudio = useCallback((audioData: Float32Array) => {
        audioQueueRef.current.push(audioData);
        if (!isPlayingRef.current) {
            playNextAudio();
        }
    }, [playNextAudio]);

    const cleanupAll = useCallback(() => {
        connectionIntentRef.current = false;
        if (callTimeoutRef.current) {
            clearTimeout(callTimeoutRef.current);
            callTimeoutRef.current = null;
        }
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(t => t.stop());
            mediaStreamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => { });
            audioContextRef.current = null;
        }
        if (playbackContextRef.current) {
            playbackContextRef.current.close().catch(() => { });
            playbackContextRef.current = null;
        }
        if (sessionRef.current) {
            try { sessionRef.current.close(); } catch (_) { }
            sessionRef.current = null;
        }
        audioQueueRef.current = [];
        isPlayingRef.current = false;
    }, []);

    // ── Activate Sakha (Start Live Session) ────────────────────────────────────
    const activate = useCallback(async () => {
        try {
            cleanupAll();
            connectionIntentRef.current = true;
            setSakhaState('connecting');
            setError(null);
            setMicVolume(0);
            setIsSpeaking(false);
            setHistory([]);
            sessionHistoryRef.current = []; // reset this-session accumulator
            fullTranscriptBufferRef.current = '';

            // Re-eval time of day
            const h = new Date().getHours();
            const currentPhase = getDayPhase(h);
            phaseRef.current = currentPhase;
            setPhase(currentPhase);

            // 1. Get API key from backend
            const tokenRes = await fetch('/api/gemini-live-token', { method: 'POST' });
            if (!tokenRes.ok) throw new Error('Failed to get Gemini API key');
            const { apiKey } = await tokenRes.json();
            if (!apiKey) throw new Error('Gemini API key not configured');

            const ai = new GoogleGenAI({ apiKey });

            // 2. Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: INPUT_SAMPLE_RATE,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });
            mediaStreamRef.current = stream;

            const captureCtx = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
            audioContextRef.current = captureCtx;

            const playbackCtx = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
            playbackContextRef.current = playbackCtx;

            const unreadSenders = Array.from(chatMeta.entries())
                .filter(([_, meta]) => meta.unreadCount > 0)
                .map(([chatId, meta]) => {
                    const contact = realContacts.find(c => userId && getChatId(userId, c.uid) === chatId);
                    return { name: contact?.name || 'Someone', count: meta.unreadCount };
                });

            const unreadContext = unreadSenders.length > 0
                ? `\nSUTRATALK ALERTS:\n${unreadSenders.map(s => `- ${s.name} has sent ${s.count} new message(s)`).join('\n')}`
                : `\nSUTRATALK ALERTS: No new messages right now.`;

            // ── FIX 1: Load conversation history & greeting state from Firebase ─
            let conversationHistory = '';
            let hasGreetedThisPhase = false;
            if (userId) {
                conversationHistory = await loadConversationHistory(userId);
                conversationHistory = conversationHistory.replace(/^User:/gm, `${userName}:`);
                hasGreetedThisPhase = await checkAndMarkGreetedPhase(userId, currentPhase);
            }

            // ── PRE-LOAD NEWS into system prompt (avoids unreliable audio-mode tool call) ─
            let newsContext = '';
            try {
                const newsRes = await fetch('/api/outplugs-feed');
                if (newsRes.ok) {
                    const newsData = await newsRes.json();
                    const articles: Article[] = newsData.articles ?? [];
                    if (articles.length > 0) {
                        newsContext = articles.slice(0, 6).map((a, i) =>
                            `${i + 1}. ${a.headline}${a.summary60Words ? ' — ' + a.summary60Words.slice(0, 80) : ''}`
                        ).join('\n');
                    }
                }
            } catch (e) {
                console.warn('[Bodhi] News pre-load failed', e);
            }

            // ── PRE-LOAD UNREAD MESSAGES from Firebase ──────────────────
            let messagesContext = '';
            if (userId && unreadSenders.length > 0) {
                try {
                    const { getFirebaseFirestore } = await import('@/lib/firebase');
                    const { collection, query, where, orderBy, limit, getDocs } = await import('firebase/firestore');
                    const db = await getFirebaseFirestore();
                    const msgLines: string[] = [];
                    for (const sender of unreadSenders.slice(0, 3)) {
                        const contact = realContacts.find(c => c.name === sender.name);
                        if (!contact) continue;
                        const chatId = getChatId(userId, contact.uid);
                        const msgSnap = await getDocs(
                            query(
                                collection(db, 'onesutra_chats', chatId, 'messages'),
                                where('senderId', '==', contact.uid),
                                orderBy('createdAt', 'desc'),
                                limit(sender.count > 5 ? 5 : sender.count)
                            )
                        );
                        const msgs = msgSnap.docs.map(d => d.data()?.text ?? '').filter(Boolean).reverse();
                        if (msgs.length > 0) {
                            msgLines.push(`From ${sender.name}:\n  - ${msgs.join('\n  - ')}`);
                        }
                    }
                    messagesContext = msgLines.join('\n\n');
                } catch (e) {
                    console.warn('[Bodhi] Messages pre-load failed', e);
                }
            }

            // 3. Connect to Gemini Live API
            console.log('[Bodhi] Connecting to Gemini Live API...');
            const session = await ai.live.connect({
                model: GEMINI_LIVE_MODEL,
                config: {
                    responseModalities: [Modality.AUDIO], // MUST BE AUDIO ONLY
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: 'Aoede', // Gentle, warm companion voice
                            },
                        },
                    },
                    systemInstruction: `${buildSystemPrompt(phaseRef.current, userName, sankalpaRef.current, memories, unreadContext, conversationHistory, hasGreetedThisPhase, newsContext, messagesContext)} \n\nRANDOM_SEED: ${Math.floor(Math.random() * 1000)}`,
                },
                callbacks: {
                    onopen: () => {
                        console.log('[Bodhi] Gemini Live session opened');
                        if (connectionIntentRef.current) {
                            setSakhaState('listening');
                            setIsListening(true);
                            if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
                            callTimeoutRef.current = setTimeout(() => {
                                deactivate();
                            }, 900000);
                        }
                    },
                    onmessage: (message: LiveServerMessage) => {
                        const msg = message as any;
                        const serverContent = msg.serverContent;

                        if (serverContent?.modelTurn?.parts) {
                            canListenRef.current = false; // block mic while processing response
                            for (const part of serverContent.modelTurn.parts) {
                                if (part.inlineData?.data) {
                                    const audioFloat32 = base64PCMToFloat32(part.inlineData.data);
                                    enqueueAudio(audioFloat32);
                                }
                                if (part.text) {
                                    fullTranscriptBufferRef.current += part.text;
                                    setCurrentSentence(prev => prev + part.text);
                                }
                            }
                        }

                        if (serverContent?.turnComplete) {
                            const cleanedResp = fullTranscriptBufferRef.current.replace(/\[TOOL:.*?\]/g, '').trim();

                            const bodhiTurn: SakhaMessage = { role: 'sakha', text: cleanedResp, timestamp: Date.now() };
                            setHistory(prev => [...prev, bodhiTurn]);
                            // Accumulate for end-of-session Firebase save
                            if (cleanedResp) {
                                sessionHistoryRef.current.push(bodhiTurn);
                            }

                            // Parse and execute newly arrived tool calls
                            const toolCalls = parseToolCalls(fullTranscriptBufferRef.current);
                            if (toolCalls.length > 0) {
                                executeToolCalls(toolCalls);
                            }

                            fullTranscriptBufferRef.current = '';
                            canListenRef.current = true;

                            if (!audioQueueRef.current.length && !isPlayingRef.current) {
                                setIsSpeaking(false);
                                setSakhaState('listening');
                            }
                        }

                        if (serverContent?.interrupted) {
                            audioQueueRef.current = [];
                            setIsSpeaking(false);
                            setSakhaState('listening');
                            canListenRef.current = true;
                        }
                    },
                    onerror: (e: any) => {
                        console.error('[Bodhi] Gemini Live error:', e);
                        setError(e?.message || 'Connection error');
                        setSakhaState('error');
                    },
                    onclose: (e: any) => {
                        console.log('[Bodhi] Gemini Live session closed:', e?.reason || 'unknown');
                        if (sakhaState !== 'error') {
                            setSakhaState('dismissed');
                        }
                    },
                },
            });

            if (!connectionIntentRef.current) {
                session.close();
                return;
            }
            sessionRef.current = session;

            // 4. Send initial greeting trigger
            try {
                const historyNote = conversationHistory
                    ? 'We have spoken before. Use PREVIOUS CONVERSATION CONTEXT for natural continuity.'
                    : 'Fresh start with this user.';
                const greetNote = hasGreetedThisPhase
                    ? `CRITICAL: Do NOT use any formal time-greeting salutation — you already greeted ${userName} during this ${currentPhase} phase today. Open naturally and warmly as a returning friend.`
                    : `CRITICAL: This is the FIRST time you speak to ${userName} in the ${currentPhase} phase today. You MUST open with the exact ${currentPhase} salutation from your GREETING RULES before anything else.`;
                const openingText = `Start. Phase=${currentPhase}. User has ${sankalpaRef.current.length} tasks today. ${historyNote} ${greetNote}`;
                await session.sendClientContent({
                    turns: [{ role: 'user', parts: [{ text: openingText }] }],
                    turnComplete: true,
                });
                console.log(`[Bodhi] Opening trigger sent | phase=${currentPhase} | hasGreetedThisPhase=${hasGreetedThisPhase}`);
            } catch (greetErr) {
                console.warn('[Bodhi] Could not send initial greeting:', greetErr);
            }

            // 5. Mic Processing
            const source = captureCtx.createMediaStreamSource(stream);
            sourceRef.current = source;

            const processor = captureCtx.createScriptProcessor(BUFFER_SIZE, 1, 1);
            processorRef.current = processor;

            let silenceCounter = 0;

            processor.onaudioprocess = (audioEvent) => {
                if (!sessionRef.current) return;

                const inputData = audioEvent.inputBuffer.getChannelData(0);

                // Audio level display
                let sumSq = 0;
                for (let i = 0; i < inputData.length; i++) {
                    sumSq += inputData[i] * inputData[i];
                }
                const rms = Math.sqrt(sumSq / inputData.length);
                if (!isPlayingRef.current) {
                    setMicVolume(Math.min(1, rms * 35));
                }

                // Block sending mic data if speaking or processing
                if (!canListenRef.current || isPlayingRef.current) return;

                let audioData: Float32Array;
                if (captureCtx.sampleRate !== INPUT_SAMPLE_RATE) {
                    const ratio = captureCtx.sampleRate / INPUT_SAMPLE_RATE;
                    const newLength = Math.round(inputData.length / ratio);
                    audioData = new Float32Array(newLength);
                    for (let i = 0; i < newLength; i++) {
                        const srcIndex = Math.min(Math.floor(i * ratio), inputData.length - 1);
                        audioData[i] = inputData[srcIndex];
                    }
                } else {
                    audioData = new Float32Array(inputData);
                }

                const isSpeech = rms > NOISE_GATE_THRESHOLD;
                if (!isSpeech) {
                    silenceCounter++;
                    if (silenceCounter % 4 !== 0) return;
                }
                if (isSpeech) silenceCounter = 0;

                const base64 = float32ToBase64PCM(audioData);
                try {
                    session.sendRealtimeInput({
                        audio: { data: base64, mimeType: 'audio/pcm;rate=16000' },
                    });
                } catch (sendErr) {
                    // ignore
                }
            };

            source.connect(processor);
            processor.connect(captureCtx.destination);

        } catch (err: any) {
            console.error('[Bodhi] Failed to start Sakha call:', err);
            setError(err.message || 'Error connecting to Bodhi Sakha');
            setSakhaState('error');
            cleanupAll();
        }
    }, [cleanupAll, float32ToBase64PCM, base64PCMToFloat32, enqueueAudio, userName, executeToolCalls]);


    // ── Deactivate Sakha ───────────────────────────────────────────────────────
    const deactivate = useCallback(() => {
        // ── FIX 1: Save this session's conversation history to Firebase ────────
        const sessionTurns = sessionHistoryRef.current;
        const currentUid = userIdRef.current;
        if (currentUid && sessionTurns.length > 0) {
            saveConversationHistory(currentUid, sessionTurns).catch(() => {
                console.warn('[Bodhi] Failed to persist session history');
            });
        }
        sessionHistoryRef.current = [];

        cleanupAll();
        setSakhaState('dismissed');
        setIsListening(false);
        setCurrentSentence('');
        setMicVolume(0);
    }, [cleanupAll]);

    // ── Also capture user's spoken input into session history ─────────────────
    // We hook into the history state changes to also track user turns.
    // Since Gemini Live API doesn't give us transcripts of user speech by default,
    // we track only Bodhi's turns for now (which cover the full conversational context).

    return {
        sakhaState,
        phase,
        currentSentence,
        history,
        micVolume,
        isListening,
        activate,
        deactivate,
        error
    };
}
