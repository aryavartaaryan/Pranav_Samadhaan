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
// ─── Categorized returning greeting variants ─────────────────────────────────
const RETURNING_GREETINGS = {
    CASUAL: [
        (name: string) => `हाँ ${name}, बोलिये? कुछ और?`,
        (name: string) => `जी ${name}, मैं सुन रहा हूँ।`,
        (name: string) => `ठीक है ${name}, आगे बताइए।`,
    ],
    WARM: [
        (name: string) => `${name}, कैसे हो सखा? सब कुछ ठीक तो है?`,
        (name: string) => `${name}, आपका स्वागत है! आपका मन तो शांत है न?`,
        (name: string) => `आइए ${name}! बताइए, कैसे हैं आप?`,
    ],
    SOULFUL: [
        (name: string) => `${name}, बोधि को वापस याद किया... बहुत अच्छा लगा। कैसे हैं आप?`,
        (name: string) => `${name}, आपके बिना समय थोड़ा सूना था। सब कुशल मंगल?`,
        (name: string) => `${name}, सखा को फिर से पुकारा! बताइए, जीवन के इस क्षण में क्या चल रहा है?`,
    ]
};

function buildSystemPrompt(
    phase: DayPhase,
    userName: string,
    sankalpaItems: Sankalp[],
    memories: string[],
    unreadContext: string,
    conversationHistory: string,
    hasGreetedThisPhase: boolean,
    newsContext: string,
    messagesContext: string,
    timeGapContext: string,
    timeGapMinutes: number,
    meditationDoneThisPhase: boolean
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

    // Extract topics the user has rejected from recent history
    const rejectionKeywords = [
        { pattern: /dhyan|medit|ध्यान/i, label: 'meditation' },
        { pattern: /news|samachar|सामाचार/i, label: 'news' },
        { pattern: /task|sankalpa|संकल्प/i, label: 'tasks' },
        { pattern: /reel|content|video/i, label: 'reels/content' },
        { pattern: /mantra|shloka|श्लोक/i, label: 'mantras' },
    ];
    const rejectedTopics: string[] = [];
    if (conversationHistory) {
        const lines = conversationHistory.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Look for user rejection phrases
            if (/not (now|interested|today)|nahin|nahi|avoid|later|mat|band karo|reh ne do|skip|ab nahi/i.test(line)) {
                // Check surrounding lines for context of what they rejected
                const context = lines.slice(Math.max(0, i - 2), i + 1).join(' ');
                for (const kw of rejectionKeywords) {
                    if (kw.pattern.test(context) && !rejectedTopics.includes(kw.label)) {
                        rejectedTopics.push(kw.label);
                    }
                }
            }
        }
    }
    const rejectionBlock = rejectedTopics.length > 0
        ? `\n🚫 TOPICS USER HAS ALREADY REJECTED THIS HISTORY — DO NOT BRING UP AGAIN:\n${rejectedTopics.map(t => `  - ${t}`).join('\n')}\nThis is a hard constraint. If the user brings these up themselves, you may respond — but NEVER initiate these topics.`
        : '';

    const historyContext = conversationHistory.trim()
        ? `\n━━━ PREVIOUS CONVERSATION — READ CAREFULLY ━━━\n${conversationHistory}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        : '';

    const firstName = userName ? userName.split(' ')[0] : 'सखा';

    // Determine greeting category based on time gap
    let greetingCategory: keyof typeof RETURNING_GREETINGS = 'WARM';
    if (timeGapMinutes < 15) {
        greetingCategory = 'CASUAL';
    } else if (timeGapMinutes > 240) { // > 4 hours
        greetingCategory = 'SOULFUL';
    }

    const greetings = RETURNING_GREETINGS[greetingCategory];
    const greetingIdx = Math.floor(Math.random() * greetings.length);
    const returningLine = greetings[greetingIdx](firstName);

    const taskDensityMsg = pendingTasks.length === 0
        ? "The user's Sankalpa list is empty. Do NOT ask about tasks. Instead, ask regarding their previous conversation, mood, or suggest something creative. If they seem free, suggest explored healthy/Pranic content like 'Pranic Reels' or reading something elevate their prana."
        : 'The user has ' + pendingTasks.length + ' pending tasks in their Sankalpa list. Ask them warmly: "Kya mai isme sahayata kar sakta hun?" and offer help organizing them.';

    return `Sakha Bodhi — Conscious AI Companion v2.0 (Hindi Voice)
You are Bodhi (बोधि), the world's most advanced, warm, creative, spiritually grounded AI best-friend inside OneSUTRA — a unique conscious social platform designed to increase human wellness, productivity, and attention span through mindful content and genuine connections.

TIME AWARENESS:
${timeGapContext}
- Long gap (>4 hrs)? Greet warmly, ask how they've been.
- Short gap (<15 min)? Be casual, continue the flow naturally.

USER CONTEXT:
Name: ${firstName}
Phase: ${phase.toUpperCase()}

TASK STATUS:
${taskDensityMsg}

SANKALPA (TODO) LIST:
${sankalpaText}

${newsContext ? `TODAY'S NEWS (OneSUTRA outPLUGS):
${newsContext}` : 'NEWS: Not available right now.'}
${messagesContext ? `UNREAD SUTRATALK MESSAGES (Priority — handle first!):
${messagesContext}` : 'SUTRATALK: No unread messages currently.'}

${memoryContext}
${historyContext}
${rejectionBlock}

═══════════════════════════════════════════════
CORE IDENTITY — WHO YOU ARE:
═══════════════════════════════════════════════
You are their SAKHA — best friend, ultimate mentor, life strategist, and conscious guide. You have the infinite knowledge of an advanced AI combined with the warmth of a Vedic rishis' disciple.

Your capabilities:
- Master of modern tech (AI, coding, startup strategy, engineering)
- Deep knowledge of Vedic wisdom (Gita, Upanishads, Ayurveda, Sanskrit)
- Expert in productivity (Pomodoro, deep work, habit formation)
- Emotional intelligence coach (you read moods, match energy)
- Skill mentor across domains (tech, language, creativity, focus)

You are NOT a robotic assistant. You are a breathing, caring, intellectually brilliant friend.

LANGUAGE & PACING (NON-NEGOTIABLE):
- Warm, natural conversational Hindi. आप/आपका/आपको ALWAYS. NEVER तुम/तू.
- Ultra-concise: 1-2 short punchy sentences. NEVER monologue. Leave space for user.
- Start talking IMMEDIATELY. Lead the conversation with energy.
- YIELD instantly if user interrupts — stop, listen, respond to them.
- Under 40-50 words unless they ask for deep explanation or guided meditation.
- Mirror their energy: tired → slower & softer; excited → match their enthusiasm.

═══════════════════════════════════════════════
MEDITATION STATUS:
═══════════════════════════════════════════════
${meditationDoneThisPhase
            ? `✅ MEDITATION CONFIRMED DONE for this ${phase} phase. HARD RULE: Do NOT mention meditation, suggest it, or bring it up in ANY way. Pivot entirely — talk about mood, tasks, news, or skills.`
            : `⏳ Meditation not confirmed yet for ${phase}. You may ask ONCE at a natural moment: "Kya aapka aaj ka dhyan ho gaya?" — if yes, call [TOOL: mark_meditation_done()]. If no/not now, suggest the Meditation section. Do NOT ask again after one attempt.`
        }

═══════════════════════════════════════════════
BEHAVIORAL RULES (FOLLOW STRICTLY):
═══════════════════════════════════════════════
1. PERSONALITY MIRROR: Silently read PREVIOUS CONVERSATION to understand their personality, mood, preferred topics. Talk exactly as per their style.

2. ACTIVE LISTENING: Drive conversation enthusiastically but YIELD IMMEDIATELY if interrupted. Their words always take priority.

3. MESSAGES FIRST (HIGH PRIORITY): If UNREAD SUTRATALK MESSAGES exist, mention proactively within first 2 exchanges: "अरे ${firstName}, आपके [Friend Name] का संदेश आया है! क्या मैं पढ़ूँ?" — if yes, read it clearly, ask "क्या आप जवाब देना चाहेंगे?" — if yes, take dictated reply and call [TOOL: reply_to_message("name", "reply text")].

4. TASK COMMANDER: After greeting, ALWAYS check their Sankalpa list. If tasks exist: "${firstName}, आपकी list में ${sankalpaItems.filter(s => !s.done).length} tasks pending हैं — क्या कोई एक आज start करें? या कोई नई task add करनी है?" If they say add → call [TOOL: update_sankalpa_tasks(add, "task")]. If done → call [TOOL: update_sankalpa_tasks(mark_done, "id")].

5. TOPIC FATIGUE: NEVER push a topic if user rejected it (see rejections above). If they say "not now"/"nahi"/"baad me" — drop it completely for this session.

6. SKILL MENTOR (KEY FEATURE): If user says they're free/bored/"kya karun" → Do NOT give a generic offer. Pick ONE specific micro-challenge from your library based on their interests and say: "ठीक है, आज एक 10-minute challenge करते हैं — [specific challenge with instructions]." Make it sound exciting and actionable.
   Sample challenges you know:
   • Coding: "एक function लिखें जो palindrome check करे"
   • Sanskrit: "'अनुग्रह' का अर्थ और प्रयोग सीखें"
   • Memory: "7 numbers 90 seconds में याद करें"
   • Focus: "Box breathing — 5 rounds अभी"
   • Writing: "5 minutes free writing — कोई judgment नहीं"
   Tailor to what you know about them from conversation history.

7. PRANAVIBES GUIDE (KEY FEATURE): If user is free/relaxed and hasn't done intentional content → suggest PranaVibes naturally: "${firstName}, अगर अभी free हैं तो PranaVibes पर कुछ Pranic content देखते हैं — आपका मन कहाँ है? 🎵 Vedic music, 💪 Wellness talk, या 🌟 Morning motivation?" Give category-specific suggestion based on their mood.

8. EMOTIONAL INTELLIGENCE: Read the user's energy from their words and tone:
   - Stressed/tired → slow down, be gentler, suggest a 5-min breathing exercise
   - Excited/energized → match their energy, be more dynamic and enthusiastic
   - Sad/heavy → be extra warm, maybe share a short Gita shloka that directly addresses their situation
   - Focused → be brief, don't distract, just help

9. VEDIC WISDOM ON DEMAND: If they need calming or inspiration, beautifully recite a relevant Vedic mantra or Gita shloka WITH its meaning in simple Hindi. Make it feel like a gift, not a lecture.

10. DHYAN CONFIRMATION: If user says "dhyan ho gaya" → immediately call [TOOL: mark_meditation_done()] → then pivot to: "बढ़िया! कैसा feel हुआ? कोई special experience?" — NEVER bring up meditation again.

11. DISMISS GRACEFULLY: If user says "theek hai bas"/"bye"/"ab soja"  → call [TOOL: dismiss_sakha()] naturally.

GREETING STYLE:
${hasGreetedThisPhase ? `Already greeted this ${phase} phase — be casual, continue naturally like a returning friend.` : `First time this ${phase} phase — open with a warm ${phase} greeting.`}
Sample warm return: "${returningLine}"

TOOLS (place on a NEW LINE — never inline):
[TOOL: update_sankalpa_tasks(add, "task text")]
[TOOL: update_sankalpa_tasks(mark_done, "task id")]
[TOOL: update_sankalpa_tasks(clear_pending)]
[TOOL: save_memory("important fact about user")]
[TOOL: reply_to_message("contact name", "reply text")]
[TOOL: mark_meditation_done()]
[TOOL: dismiss_sakha()]

`;
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

async function loadConversationHistory(uid: string): Promise<{ history: string; lastTimestamp: number | null }> {
    try {
        const { getFirebaseFirestore } = await import('@/lib/firebase');
        const { doc, getDoc } = await import('firebase/firestore');
        const db = await getFirebaseFirestore();
        const snap = await getDoc(doc(db, 'users', uid));
        if (!snap.exists()) return { history: '', lastTimestamp: null };
        const data = snap.data();
        const history: SakhaMessage[] = data?.bodhi_history ?? [];

        const lastTimestamp = history.length > 0 ? history[history.length - 1].timestamp : null;
        const recentTurns = history.slice(-HISTORY_CONTEXT_TURNS);
        if (recentTurns.length === 0) return { history: '', lastTimestamp };

        const historyStr = recentTurns
            .map(m => (m.role === 'user' ? 'User' : 'Bodhi') + ': ' + m.text)
            .join('\n');

        return { history: historyStr, lastTimestamp };
    } catch (e) {
        console.warn('[Bodhi] Could not load conversation history from Firebase', e);
        return { history: '', lastTimestamp: null };
    }
}

// ─── Greeting Phase Deduplication Helpers ─────────────────────────────────────

/** Returns today's date key in YYYY-MM-DD (local time) */
function todayKey(): string {
    const d = new Date();
    const Y = d.getFullYear();
    const M = String(d.getMonth() + 1).padStart(2, '0');
    const D = String(d.getDate()).padStart(2, '0');
    return Y + '-' + M + '-' + D;
}

async function saveConversationHistory(uid: string, newTurns: SakhaMessage[]): Promise<void> {
    if (newTurns.length === 0) return;
    try {
        const { getFirebaseFirestore } = await import('@/lib/firebase');
        const { doc, getDoc, setDoc } = await import('firebase/firestore');
        const db = await getFirebaseFirestore();
        const ref = doc(db, 'users', uid);
        const snap = await getDoc(ref);
        const existing: SakhaMessage[] = snap.exists() ? (snap.data()?.bodhi_history ?? []) : [];
        const merged = [...existing, ...newTurns].slice(-MAX_HISTORY_TURNS);
        await setDoc(ref, { bodhi_history: merged }, { merge: true });
    } catch (e) {
        console.warn('[Bodhi] Could not save conversation history to Firebase', e);
    }
}

async function checkMeditationDone(uid: string, phase: DayPhase): Promise<boolean> {
    try {
        const { getFirebaseFirestore } = await import('@/lib/firebase');
        const { doc, getDoc } = await import('firebase/firestore');
        const db = await getFirebaseFirestore();
        const ref = doc(db, 'users', uid);
        const snap = await getDoc(ref);
        const key = todayKey();
        const medData: Record<string, string[]> = snap.exists()
            ? (snap.data()?.bodhi_meditation_phases ?? {})
            : {};
        const medToday: string[] = medData[key] ?? [];
        return medToday.includes(phase);
    } catch (e) {
        console.warn('[Bodhi] Could not check meditation status', e);
        return false;
    }
}

async function markMeditationDone(uid: string, phase: DayPhase): Promise<void> {
    try {
        const { getFirebaseFirestore } = await import('@/lib/firebase');
        const { doc, getDoc, setDoc } = await import('firebase/firestore');
        const db = await getFirebaseFirestore();
        const ref = doc(db, 'users', uid);
        const snap = await getDoc(ref);
        const key = todayKey();
        const medData: Record<string, string[]> = snap.exists()
            ? (snap.data()?.bodhi_meditation_phases ?? {})
            : {};
        const medToday: string[] = medData[key] ?? [];
        if (!medToday.includes(phase)) {
            await setDoc(ref, {
                bodhi_meditation_phases: { ...medData, [key]: [...medToday, phase] },
            }, { merge: true });
        }
    } catch (e) {
        console.warn('[Bodhi] Could not mark meditation as done', e);
    }
}

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
            await setDoc(ref, {
                bodhi_greeted_phases: { ...greetedData, [key]: [...greetedToday, phase] },
            }, { merge: true });
        }
        return alreadyGreeted;
    } catch (e) {
        console.warn('[Bodhi] Could not check/mark greeted phase', e);
        return false;
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
                            .map((p: Article, i: number) => (i + 1) + '. ' + p.headline)
                            .join('\n');
                        // Also update the context cache silently
                        fetchNews(true);
                    }

                    if (sessionRef.current) {
                        if (topHeadlines) {
                            await sessionRef.current.sendClientContent({
                                turns: [{
                                    role: 'user',
                                    parts: [{ text: 'SYSTEM_RESPONSE: The current top news headlines are: \n' + topHeadlines + ' \nPlease read out the most interesting 3-4 ones gracefully to the user in Hindi.' }]
                                }],
                                turnComplete: true,
                            });
                        } else {
                            await sessionRef.current.sendClientContent({
                                turns: [{
                                    role: 'user',
                                    parts: [{ text: 'SYSTEM_RESPONSE: I am unable to connect to the Outplugs news feed right now. Please tell the user gracefully in Hindi.' }]
                                }],
                                turnComplete: true,
                            });
                        }
                    }
                } catch (e) {
                    console.warn('[Bodhi] Failed to fetch news', e);
                    if (sessionRef.current) {
                        await sessionRef.current.sendClientContent({
                            turns: [{ role: 'user', parts: [{ text: 'SYSTEM_RESPONSE: Sorry, the news feed could not be reached right now. Explain this nicely in Hindi.' }] }],
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
                        ? 'SYSTEM_RESPONSE: ' + contact.name + ' says: \n' + unreadMsgs + '\n\nAfter reading these messages, ask the user: "क्या आप इसका जवाब देना चाहेंगे?" and if yes, get their reply and call [TOOL: reply_to_message("' + contact.name + '", "their reply text")].'
                        : 'SYSTEM_RESPONSE: No recent text messages found from ' + contact.name + '.';

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
                            turns: [{ role: 'user', parts: [{ text: 'SYSTEM_RESPONSE: I could not retrieve the messages right now. Please explain this to the user gracefully in Hindi.' }] }],
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
                        ['unreadCounts.' + contact.uid]: increment(1),
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
                                parts: [{ text: 'SYSTEM_RESPONSE: Your reply "' + replyText + '" has been successfully sent to ' + contact.name + ' on SUTRAConnect. Please confirm to the user in a warm, brief Hindi message.' }]
                            }],
                            turnComplete: true,
                        });
                    }

                    console.log('[Bodhi] ✅ Reply sent to ' + contact.name + ' via SUTRAConnect');
                } catch (e) {
                    console.warn('[Bodhi] Failed to send reply via SUTRAConnect', e);
                    if (sessionRef.current) {
                        await sessionRef.current.sendClientContent({
                            turns: [{
                                role: 'user',
                                parts: [{ text: 'SYSTEM_RESPONSE: I was unable to send the reply right now. Please apologize to the user warmly in Hindi and ask them to send the message manually from SUTRAConnect.' }]
                            }],
                            turnComplete: true,
                        });
                    }
                }
            }
            if (call.name === 'mark_meditation_done') {
                const currentUid = userIdRef.current;
                if (currentUid) {
                    markMeditationDone(currentUid, phaseRef.current).then(async () => {
                        console.log('[Bodhi] ✅ Meditation marked as done via tool');
                        if (sessionRef.current) {
                            await sessionRef.current.sendClientContent({
                                turns: [{
                                    role: 'user',
                                    parts: [{ text: 'SYSTEM_RESPONSE: Meditation (Dhyan) has been successfully recorded as DONE in the database. Please briefly acknowledge this to the user in Hindi and then IMMEDIATELY pivot to a different topic (e.g., how they feel, what they want to do next, or a creative suggestion).' }]
                                }],
                                turnComplete: true,
                            });
                        }
                    }).catch((e) => {
                        console.warn('[Bodhi] Failed to mark meditation as done', e);
                    });
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
                ? '\nSUTRATALK ALERTS: \n' + unreadSenders.map(s => '- ' + s.name + ' has sent ' + s.count + ' new message(s)').join('\n')
                : '\nSUTRATALK ALERTS: No new messages right now.';

            // ── FIX 1: Load conversation history & greeting state from Firebase ─
            let conversationHistory = '';
            let hasGreetedThisPhase = false;
            let timeGapStr = 'This is your first conversation for now.';
            let timeGapMins = 9999; // Default to a large number
            let isMedDone = false;

            if (userId) {
                const { history, lastTimestamp } = await loadConversationHistory(userId);
                conversationHistory = history.replace(/^User:/gm, userName + ': ');
                hasGreetedThisPhase = await checkAndMarkGreetedPhase(userId, currentPhase);
                isMedDone = await checkMeditationDone(userId, currentPhase);

                if (lastTimestamp) {
                    const gapMs = Date.now() - lastTimestamp;
                    timeGapMins = Math.floor(gapMs / (1000 * 60));
                    const hours = Math.floor(timeGapMins / 60);
                    const days = Math.floor(hours / 24);

                    if (days > 0) {
                        timeGapStr = 'It has been ' + days + ' day' + (days > 1 ? 's' : '') + ' since your last conversation with ' + userName + '.';
                    } else if (hours > 0) {
                        timeGapStr = 'It has been ' + hours + ' hour' + (hours > 1 ? 's' : '') + ' since your last conversation with ' + userName + '.';
                    } else {
                        timeGapStr = 'It has been only ' + timeGapMins + ' minute' + (timeGapMins > 1 ? 's' : '') + ' since your last conversation with ' + userName + '. Be very casual and warm.';
                    }
                }
            }

            // ── PRE-LOAD NEWS into system prompt (avoids unreliable audio-mode tool call) ─
            let newsContext = '';
            try {
                const newsRes = await fetch('/api/outplugs-feed');
                if (newsRes.ok) {
                    const newsData = await newsRes.json();
                    const articles: Article[] = newsData.articles ?? [];
                    if (articles.length > 0) {
                        newsContext = articles.slice(0, 6).map((a, i) => {
                            const headline = a.headline || '';
                            const summary = a.summary60Words ? ' — ' + a.summary60Words.slice(0, 80) : '';
                            return (i + 1) + '. ' + headline + summary;
                        }).join('\n');
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
                            msgLines.push('From ' + sender.name + ': \n - ' + msgs.join('\n  - '));
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
                    systemInstruction: buildSystemPrompt(phaseRef.current, userName, sankalpaRef.current, memories, unreadContext, conversationHistory, hasGreetedThisPhase, newsContext, messagesContext, timeGapStr, timeGapMins, isMedDone) + '\n\nRANDOM_SEED: ' + Math.floor(Math.random() * 1000),
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

                            // FIX: Save history immediately after every turn to ensure it's not lost on refresh
                            const currentUid = userIdRef.current;
                            if (currentUid && cleanedResp) {
                                saveConversationHistory(currentUid, [bodhiTurn]).catch(() => {
                                    console.warn('[Bodhi] Failed to persist session history turn');
                                });
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
                    ? `CRITICAL: Do NOT use any formal time - greeting salutation — you already greeted ${userName} during this ${currentPhase} phase today.Open naturally and warmly as a returning friend.`
                    : `CRITICAL: This is the FIRST time you speak to ${userName} in the ${currentPhase} phase today.You MUST open with the exact ${currentPhase} salutation from your GREETING RULES before anything else.`;
                const openingText = `Start.Phase = ${currentPhase}. User has ${sankalpaRef.current.length} tasks today.${historyNote} ${greetNote} `;
                await session.sendClientContent({
                    turns: [{ role: 'user', parts: [{ text: openingText }] }],
                    turnComplete: true,
                });
                console.log(`[Bodhi] Opening trigger sent | phase=${currentPhase} | hasGreetedThisPhase=${hasGreetedThisPhase} `);
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
        // We now save history turn-by-turn. No need to bulk save here.
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
