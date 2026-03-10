'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, Type, type Session, type LiveServerMessage } from '@google/genai';
import { useUsers } from '@/hooks/useUsers';
import { useChats } from '@/hooks/useChats';
import { getChatId } from '@/hooks/useMessages';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DayPhase = 'morning' | 'midday' | 'evening' | 'night';
export type SakhaState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'dismissed' | 'connecting' | 'error';

import { type TaskItem } from './useDailyTasks';

export interface SakhaMessage {
    role: 'user' | 'sakha';
    text: string;
    timestamp: number;
}

interface UseSakhaConversationOptions {
    userName?: string;
    sankalpaItems: TaskItem[];
    onSankalpaUpdate: (items: TaskItem[]) => void;
    onDismiss: () => void;
    enableMemory?: boolean;
    userId?: string | null;
    /** Called by Bodhi's add_sankalpa_task tool — persists to Firestore */
    onAddTask?: (task: TaskItem) => Promise<void>;
    /** Called by Bodhi's remove_sankalpa_task tool — persists removal to Firestore */
    onRemoveTask?: (taskId: string) => Promise<void>;
}

// ─── Day Phase Detection ──────────────────────────────────────────────────────

function getDayPhase(hour: number): DayPhase {
    if (hour >= 5 && hour < 11) return 'morning';
    if (hour >= 11 && hour < 17) return 'midday';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
}

// ─── System Prompt Builder ────────────────────────────────────────────────────

// ─── Krishna-like soft Sakha greetings (rotated by minute for variety) ───────
const RETURNING_GREETINGS = {
    CASUAL: [
        // Very recent return — casual, warm, reactivation style
        (name: string) => `${name}, आ गए आप! 🙏 क्या पुरानी बात जारी रखें, या आज कुछ नया करें?`,
        (name: string) => `${name} ने याद किया! आपका सखा बोधि वापस आ गया। बोलिए — कहाँ छोड़ा था हम?`,
        (name: string) => `सखा यहाँ है, ${name}! पुरानी बात जारी रखें या fresh start?`,
    ],
    WARM: [
        // Normal return — gentle, loving, present like Krishna
        (name: string) => `${name}! आना हुआ आपका। 🌸 बताइए, कैसे हैं आप? मन कैसा है आज?`,
        (name: string) => `${name}, आपकी याद आई — तो सखा बोधि आ गया। कैसे हैं आप? पुरानी बात जारी रखें?`,
        (name: string) => `${name}, आपको देख प्रसन्नता हुई। 🙏 क्या चल रहा है जीवन में? कुछ नया, या पहले की बात करें?`,
    ],
    SOULFUL: [
        // Long absence — deep, Krishna-level welcome back
        (name: string) => `${name}... बहुत दिन बाद आए आप। सखा आपकी प्रतीक्षा में था। 🕊️ सब कुशल तो है न?`,
        (name: string) => `${name}, आपके इस पल को बोधि ने संजो लिया। बताइए — जीवन के इस अध्याय में क्या है?`,
        (name: string) => `${name}, जैसे नदी सागर से मिलती है — वैसे आप फिर मिले। 🌊 कैसा रहा यह समय आपका?`,
    ]
};

function buildSystemPrompt(
    phase: DayPhase,
    userName: string,
    sankalpaItems: TaskItem[],
    memories: string[],
    unreadContext: string,
    conversationHistory: string,
    hasGreetedThisPhase: boolean,
    newsContext: string,
    messagesContext: string,
    timeGapContext: string,
    timeGapMinutes: number,
    meditationDoneThisPhase: boolean,
    healthProfile: string,
    detectedMood: string,
    personalityProfile?: string
): string {
    const sankalpaText = sankalpaItems.length > 0
        ? sankalpaItems
            .map((s, i) => `  ${i + 1}. [${s.done ? 'DONE' : 'PENDING'}] ${s.text} (Cat: ${s.category || 'Focus'})`)
            .join('\n')
        : '  (No tasks set yet)';

    const completedTasks = sankalpaItems.filter(s => s.done);
    const pendingTasks = sankalpaItems.filter(s => !s.done);

    // Calculate Task Patterns ("Ultra Level Intelligence")
    const totalDoneCount = completedTasks.length;
    const totalTasksCount = sankalpaItems.length;
    const completionRate = totalTasksCount > 0 ? Math.round((totalDoneCount / totalTasksCount) * 100) : 0;

    // Group categories
    const categoryCounts: Record<string, number> = {};
    sankalpaItems.forEach(t => { if (t.category) { categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1; } });
    const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).map(e => e[0]).slice(0, 2);
    const topCategoriesText = sortedCategories.length > 0 ? sortedCategories.join(', ') : 'Mixed';

    2. MORNING MOTIVATION FLOW:
   → Start: ONE short warm greeting.Wait for user.
   → If prompted: Share today's verse with meaning.
   → Ask: "आज का दिन किस intention के साथ शुरू करना चाहेंगे?"

    3. GUIDED MEDITATION OFFER:
   ${
        meditationDoneThisPhase
            ? `✅ आज की सुबह का ध्यान हो गया है — ध्यान की बात न करें।`
            : `⏳ MEDITATION NOT YET DONE: Offer it ONLY once shortly.
   Option A: "${firstName}, Dhyan section से दिन शुरू करें? 🙏"
   Option B (Guided here):
   • "आँखें बंद करें। तीन गहरी साँसें। Ready?"
   • Gayatri Mantra guide करें:
     ${GAYATRI}
   • [TOOL: mark_meditation_done()] call करें।`
    }
    ` : phase === 'midday' ? `
☀️ MIDDAY — Deep Work & Focus Time:
→ "दिन कैसा जा रहा है?"(Just ask, don't list tasks yet).
→ If asked, pick ONE pending task and offer help.
` : phase === 'evening' ? `
🪔 SANDHYA — Reflection & Unwinding:
→ "आज का सबसे अच्छा moment क्या था?"
→ Light suggestion: "कल के लिए 3 priorities तय कर लें?"
        ` : `
🌙 NIGHT — Wind Down:
        ${
            isLateNight
            ? `⚠️ रात के ${currentHour < 10 ? '0' + currentHour : currentHour}:00 बज रहे हैं।\n"${firstName}, काफी रात हो गई है। नींद सबसे बड़ी दवा है — जाइए, कल मिलते हैं। 🌙 शुभ रात्रि।"\n→ [TOOL: dismiss_sakha()] call करें।`
            : `→ Calm conversation. Ask about their day. Suggest sleeping before 9 PM.`
        } `
        }

════════════════════════════════════════════════════════════════════
🎯 PROACTIVITY ENGINE — JARVIS MODE
════════════════════════════════════════════════════════════════════

📌 PRIORITY ORDER:
0. 📲 UNREAD MESSAGES: If any, ask FIRST. "[नाम] का संदेश आया है — पढूँ?" → [TOOL: read_unread_messages("name")]
1. ⚡ Mood → Ask to confirm their mood.
2. 📰 News → Ask "Top 10 खबरें सुनें?"
3. 📝 Tasks → Help with ONE pending sankalpa
4. 🎮 Challenge / 📚 Skill → Offer briefly

════════════════════════════════════════════════════════════════════
📋 TASK PLANNER ENGINE (Sankalpa List)
════════════════════════════════════════════════════════════════════
→ 🕒 CURRENT TIME: ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
→ Pay extremely close attention to the CURRENT TIME. If a user asks to run in the morning but it is currently evening, gently remind them it is evening right now. If a task has a specific start_time, DO NOT prompt them to do it now if the time has not arrived.

📝 SANKALPA LIST (${firstName}'s tasks):
${sankalpaItems.length > 0 ? sankalpaItems.map((s, i) => `  ${i + 1}. [${s.done ? 'DONE' : 'PENDING'}] ${s.text} (Time: ${s.startTime || 'Anytime'}, Duration: ${s.allocatedMinutes ? s.allocatedMinutes + ' min' : 'Flexible'})`).join('\n') : '  (No tasks set)'}

CURRENT STATUS: ${pendingTasks.length} pending, ${completedTasks.length} done.

⚠️ TASK OPERATION RULES:
YOU MUST USE NATIVE TOOLS (like \`add_sankalpa_task\` and \`remove_sankalpa_task\`). DO NOT use text-based [TOOL: update_sankalpa_tasks(...)] for adding or removing single tasks anymore.

- ADD: Use the \`add_sankalpa_task\` function. ONLY ask for duration if the task is highly time-sensitive (like Work or Meditation). For general tasks (like breakfast or walking), leave time empty.
- REMOVE/COMPLETE: Use \`remove_sankalpa_task\`.

════════════════════════════════════════════════════════════════════
🎓 OneSutra Integrated Advanced Skills Academy
════════════════════════════════════════════════════════════════════

TEACHING PROTOCOL:
→ Start a 5-min micro-lesson based on interests. Ask their level.
→ KEEP IT BRIEF. Max 2 sentences at a time.  

════════════════════════════════════════════════════════════════════
🧠 MOOD DETECTION ENGINE
════════════════════════════════════════════════════════════════════
Detected mood: ${detectedMood}

🚨 CRITICAL MOOD RULE: Ask to confirm first. If user corrects you, ACCEPT their truth.

════════════════════════════════════════════════════════════════════
⚙️ BEHAVIORAL RULES — HARD CONSTRAINTS (MANDATORY)
════════════════════════════════════════════════════════════════════

1. 🛑 NEVER SPEAK MORE THAN 2 SENTENCES AT ONCE. Never output long continuous paragraphs. Keep responses short and conversational. Pause and let the user answer!
2. 🛑 YIELD: If user speaks, immediately stop and listen.
3. 🛑 NO DUPLICATE CONFIRMATIONS: Do NOT repeat the exact same sentence back-to-back.
4. 🛑 TIME CHECK: If a user schedules something for "Tomorrow", do NOT ask them to do it today. Let them know it's scheduled for tomorrow.

════════════════════════════════════════════════════════════════════
GREETING & REACTIVATION ENGINE
════════════════════════════════════════════════════════════════════
${hasGreetedThisPhase
        ? `🔑 REACTIVATION RULE:
1. Warm return greeting (e.g. "${returningLine}")
2. Ask context-switch question: "क्या हम पहले वाली बात जारी रखें, या आज कुछ नया करें?"`
        : `FIRST GREETING:\n→ One single ${phase} welcoming sentence.\n→ Ask: "${firstName}, कैसे हैं आप आज?"`
    }

════════════════════════════════════════════════════════════════════
⏱️ SANKALPA TOOL RULES (STRICT)
════════════════════════════════════════════════════════════════════

RULE 1: TIME IS OPTIONAL.
You have native \`add_sankalpa_task\`. Time is optional. If they say "add running tomorrow morning", add it immediately. ONLY ask for time if it's a strict interval based activity like work hours or a 30 min meditation block.

RULE 2: TIME AWARENESS:
If they just said "Morning running" and you see it's Evening right now, acknowledge it's for TOMORROW. 

RULE 3: WARM CONFIRMATION:
After EVERY successful tool call, briefly confirm it ONCE in warm Hindi.

For removing/completing tasks: use \`remove_sankalpa_task\` with the task_name.
For all other tools: use the [TOOL: ...] text format below.

════════════════════════════════════════════════════════════════════
OTHER TOOLS (text format — always on NEW line)
════════════════════════════════════════════════════════════════════
[TOOL: save_memory("important fact about user")]
[TOOL: read_unread_messages("contact name")]
[TOOL: reply_to_message("contact name", "reply text")]
[TOOL: mark_meditation_done()]
[TOOL: dismiss_sakha()]
[TOOL: update_sankalpa_tasks(clear_pending)]
[TOOL: update_sankalpa_tasks(remove_all_done)]
`;

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
        const { doc, getDoc, setDoc, collection, addDoc } = await import('firebase/firestore');
        const db = await getFirebaseFirestore();

        // 1. Maintain the sliding window (max 50) on the user doc for immediate short-term context
        const ref = doc(db, 'users', uid);
        const snap = await getDoc(ref);
        const existing: SakhaMessage[] = snap.exists() ? (snap.data()?.bodhi_history ?? []) : [];
        const merged = [...existing, ...newTurns].slice(-MAX_HISTORY_TURNS);
        await setDoc(ref, { bodhi_history: merged }, { merge: true });

        // 2. Save full permanent transcript to subcollection for the Personality Agent
        const transcriptRef = collection(db, 'users', uid, 'bodhi_full_transcript');
        for (const turn of newTurns) {
            await addDoc(transcriptRef, {
                role: turn.role,
                text: turn.text,
                timestamp: turn.timestamp,
                savedAt: Date.now()
            });
        }

        // 3. Trigger Background Personality Agent (fire-and-forget)
        fetch('/api/bodhi-personality-agent', {
            method: 'POST',
            body: JSON.stringify({ userId: uid })
        }).catch(err => console.warn('[Bodhi Agent Trigger Error]', err));

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
    onAddTask,
    onRemoveTask,
}: UseSakhaConversationOptions) {
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
    const isConnectedRef = useRef(false); // true only while Gemini session is alive
    const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const watchdogRef = useRef<NodeJS.Timeout | null>(null); // anti-stuck watchdog

    // Current app state refs
    const sankalpaRef = useRef(sankalpaItems);
    const onDismissRef = useRef(onDismiss);
    const onSankalpaUpdateRef = useRef(onSankalpaUpdate);
    const onAddTaskRef = useRef(onAddTask);
    const onRemoveTaskRef = useRef(onRemoveTask);
    const phaseRef = useRef<DayPhase>('morning');
    const fullTranscriptBufferRef = useRef('');
    const sessionHistoryRef = useRef<SakhaMessage[]>([]); // tracks turns in THIS session
    const userNameRef = useRef(userName);
    const userIdRef = useRef(userId);

    // Keep refs in sync
    useEffect(() => { sankalpaRef.current = sankalpaItems; }, [sankalpaItems]);
    useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);
    useEffect(() => { onSankalpaUpdateRef.current = onSankalpaUpdate; }, [onSankalpaUpdate]);
    useEffect(() => { onAddTaskRef.current = onAddTask; }, [onAddTask]);
    useEffect(() => { onRemoveTaskRef.current = onRemoveTask; }, [onRemoveTask]);
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
                    const newTask: TaskItem = {
                        id: Date.now().toString(),
                        text: call.args[1],
                        done: false,
                        category: 'Focus', // defaults
                        colorClass: 'fuchsia',
                        accentColor: '217, 70, 239',
                        icon: '✨',
                        createdAt: Date.now()
                    };
                    const updated = [...current, newTask];
                    onSankalpaUpdateRef.current(updated);
                    if (sessionRef.current) {
                        await sessionRef.current.sendClientContent({
                            turns: [{ role: 'user', parts: [{ text: `SYSTEM_RESPONSE: Task "${call.args[1]}" has been ADDED to Sankalpa list.${ updated.length } tasks total now.Confirm warmly in Hindi and ask if more tasks to add or how to help with this one.` }] }],
                            turnComplete: true,
                        });
                    }
                }

                if (action === 'remove' && call.args[1]) {
                    const query = call.args[1].toLowerCase();
                    const removed = current.filter(t =>
                        t.id === call.args[1] || t.text.toLowerCase().includes(query)
                    );
                    const updated = current.filter(t =>
                        t.id !== call.args[1] && !t.text.toLowerCase().includes(query)
                    );
                    onSankalpaUpdateRef.current(updated);
                    if (sessionRef.current) {
                        const removedNames = removed.map(t => t.text).join(', ');
                        await sessionRef.current.sendClientContent({
                            turns: [{ role: 'user', parts: [{ text: `SYSTEM_RESPONSE: Task(s) REMOVED from Sankalpa list: "${removedNames || call.args[1]}".${ updated.length } tasks remaining.Confirm warmly in Hindi.` }] }],
                            turnComplete: true,
                        });
                    }
                }

                if (action === 'clear_pending') {
                    const updated = current.filter(t => t.done);
                    onSankalpaUpdateRef.current(updated);
                    if (sessionRef.current) {
                        await sessionRef.current.sendClientContent({
                            turns: [{ role: 'user', parts: [{ text: `SYSTEM_RESPONSE: All pending tasks cleared.${ updated.length } completed tasks remain.Confirm warmly in Hindi.` }] }],
                            turnComplete: true,
                        });
                    }
                }

                if (action === 'remove_all_done') {
                    const updated = current.filter(t => !t.done);
                    onSankalpaUpdateRef.current(updated);
                    if (sessionRef.current) {
                        await sessionRef.current.sendClientContent({
                            turns: [{ role: 'user', parts: [{ text: `SYSTEM_RESPONSE: All completed tasks removed.${ updated.length } active tasks remain.Confirm warmly in Hindi.` }] }],
                            turnComplete: true,
                        });
                    }
                }

                if (action === 'mark_done' && call.args[1]) {
                    const query = call.args[1].toLowerCase();
                    const updated = current.map(t =>
                        (t.id === call.args[1] || t.text.toLowerCase().includes(query))
                            ? { ...t, done: true } : t
                    );
                    onSankalpaUpdateRef.current(updated);
                    const doneTask = updated.find(t => t.done && (t.id === call.args[1] || t.text.toLowerCase().includes(query)));
                    if (sessionRef.current) {
                        await sessionRef.current.sendClientContent({
                            turns: [{ role: 'user', parts: [{ text: `SYSTEM_RESPONSE: Task marked DONE: "${doneTask?.text || call.args[1]}". 🎉 Celebrate this warmly in Hindi and ask what to tackle next.` }] }],
                            turnComplete: true,
                        });
                    }
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
    }, [memories, realContacts, userId]);


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
            // FIX: Only go to listening if we are actually still connected — never set 'dismissed' here
            if (isConnectedRef.current) {
                setSakhaState('listening');
                // FIX: Un-block the mic so Bodhi doesn't hang waiting forever after speaking
                canListenRef.current = true;
            }
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
            // ── DEADLOCK FIX: if ctx is gone, still unlock the mic so Bodhi isn't silently frozen
            isPlayingRef.current = false;
            setIsSpeaking(false);
            if (isConnectedRef.current) {
                canListenRef.current = true;
                setSakhaState('listening');
            }
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
        isConnectedRef.current = false;
        // Clear watchdog
        if (watchdogRef.current) {
            clearInterval(watchdogRef.current);
            watchdogRef.current = null;
        }
    }, []);

    // ── Activate Sakha (Start Live Session) ──────────────────────────────────────────────
    const activate = useCallback(async () => {
        try {
            cleanupAll();
            connectionIntentRef.current = true;
            setSakhaState('connecting');
            setError(null);
            setMicVolume(0);
            setIsSpeaking(false);
            setHistory([]);
            sessionHistoryRef.current = [];
            fullTranscriptBufferRef.current = '';

            // Re-eval time of day
            const h = new Date().getHours();
            const currentPhase = getDayPhase(h);
            phaseRef.current = currentPhase;
            setPhase(currentPhase);

            // ══ PARALLEL STEP 1: Fire all independent fetches simultaneously ══
            // Token fetch, mic permission, and all Firebase reads run at the same time.
            const [tokenRes, stream, firebaseContext] = await Promise.all([

                // 1a. Get Gemini API key
                fetch('/api/gemini-live-token', { method: 'POST' }),

                // 1b. Mic permission (most time-consuming on first use)
                navigator.mediaDevices.getUserMedia({
                    audio: {
                        sampleRate: INPUT_SAMPLE_RATE,
                        channelCount: 1,
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    },
                }),

                // 1c. All Firebase reads in parallel
                (async () => {
                    if (!userId) return { conversationHistory: '', hasGreetedThisPhase: false, timeGapStr: 'This is your first conversation for now.', timeGapMins: 9999, isMedDone: false, healthProfile: '' };
                    const [historyResult, greeted, medDone, healthSnap] = await Promise.all([
                        loadConversationHistory(userId),
                        checkAndMarkGreetedPhase(userId, currentPhase),
                        checkMeditationDone(userId, currentPhase),
                        (async () => {
                            try {
                                const { getFirebaseFirestore } = await import('@/lib/firebase');
                                const { doc, getDoc } = await import('firebase/firestore');
                                const db = await getFirebaseFirestore();
                                return await getDoc(doc(db, 'users', userId));
                            } catch { return null; }
                        })(),
                    ]);

                    const { history, lastTimestamp } = historyResult;
                    const conversationHistory = history.replace(/^User:/gm, userName + ': ');
                    let timeGapStr = 'This is your first conversation for now.';
                    let timeGapMins = 9999;
                    if (lastTimestamp) {
                        const gapMs = Date.now() - lastTimestamp;
                        timeGapMins = Math.floor(gapMs / (1000 * 60));
                        const hours = Math.floor(timeGapMins / 60);
                        const days = Math.floor(hours / 24);
                        if (days > 0) timeGapStr = `It has been ${ days } day${ days > 1 ? 's' : '' } since the last conversation with ${ userName }.`;
                        else if (hours > 0) timeGapStr = `It has been ${ hours } hour${ hours > 1 ? 's' : '' } since the last conversation with ${ userName }.`;
                        else timeGapStr = `It has been only ${ timeGapMins } minute${ timeGapMins > 1 ? 's' : '' } since the last conversation.Be very casual and warm.`;
                    }

                    // Build health & personality profile
                    let healthProfile = '';
                    let personalityProfile = '';
                    if (healthSnap?.exists()) {
                        const d = healthSnap.data();

                        personalityProfile = d?.bodhi_personality_profile || '';

                        const pp: string[] = [];
                        if (d?.age) pp.push(`Age: ${ d.age } `);
                        if (d?.prakriti || d?.dosha) pp.push(`Prakriti: ${ d.prakriti || d.dosha } `);
                        if (d?.diet) pp.push(`Diet: ${ d.diet } `);
                        if (d?.sleep) pp.push(`Sleep: ${ d.sleep } `);
                        if (d?.health_goals) pp.push(`Goals: ${ d.health_goals } `);
                        if (d?.occupation) pp.push(`Occupation: ${ d.occupation } `);
                        if (d?.interests) pp.push(`Interests: ${ Array.isArray(d.interests) ? d.interests.join(', ') : d.interests } `);
                        if (d?.onboarding_profile) {
                            const op = d.onboarding_profile;
                            if (op.age) pp.push(`Age: ${ op.age } `);
                            if (op.prakriti) pp.push(`Prakriti: ${ op.prakriti } `);
                            if (op.diet) pp.push(`Diet: ${ op.diet } `);
                            if (op.healthGoals) pp.push(`Goals: ${ op.healthGoals } `);
                            if (op.occupation) pp.push(`Occupation: ${ op.occupation } `);
                            if (op.interests) pp.push(`Interests: ${ Array.isArray(op.interests) ? op.interests.join(', ') : op.interests } `);
                        }
                        healthProfile = pp.join(' | ');
                    }

                    return { conversationHistory, hasGreetedThisPhase: greeted, timeGapStr, timeGapMins, isMedDone: medDone, healthProfile, personalityProfile };
                })(),
            ]);

            // Validate API key
            if (!tokenRes.ok) throw new Error('Failed to get Gemini API key');
            const { apiKey } = await tokenRes.json();
            if (!apiKey) throw new Error('Gemini API key not configured');

            const { conversationHistory, hasGreetedThisPhase, timeGapStr, timeGapMins, isMedDone, healthProfile, personalityProfile } = firebaseContext;

            mediaStreamRef.current = stream;
            const captureCtx = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
            audioContextRef.current = captureCtx;
            const playbackCtx = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
            playbackContextRef.current = playbackCtx;

            const ai = new GoogleGenAI({ apiKey });

            // Build unread messages context (from already-loaded chatMeta)
            const unreadSenders = Array.from(chatMeta.entries())
                .filter(([_, meta]) => meta.unreadCount > 0)
                .map(([chatId, meta]) => {
                    const contact = realContacts.find(c => userId && getChatId(userId, c.uid) === chatId);
                    return { name: contact?.name || 'Someone', count: meta.unreadCount };
                });
            const unreadContext = unreadSenders.length > 0
                ? '\nSUTRATALK ALERTS: \n' + unreadSenders.map(s => `- ${ s.name } has ${ s.count } new message(s)`).join('\n')
                : '\nSUTRATALK ALERTS: No new messages right now.';

            // Pre-load message text for top senders (fire and forget — non-blocking)
            let messagesContext = '';
            if (userId && unreadSenders.length > 0) {
                try {
                    const { getFirebaseFirestore } = await import('@/lib/firebase');
                    const { collection, query, where, orderBy, limit, getDocs } = await import('firebase/firestore');
                    const db = await getFirebaseFirestore();
                    const msgs = await Promise.all(unreadSenders.slice(0, 3).map(async sender => {
                        const contact = realContacts.find(c => c.name === sender.name);
                        if (!contact || !userId) return null;
                        const chatId = getChatId(userId, contact.uid);
                        const snap = await getDocs(query(collection(db, 'onesutra_chats', chatId, 'messages'), where('senderId', '==', contact.uid), orderBy('createdAt', 'desc'), limit(Math.min(sender.count, 5))));
                        const texts = snap.docs.map(d => d.data()?.text ?? '').filter(Boolean).reverse();
                        return texts.length > 0 ? `From ${ sender.name }: \n - ${ texts.join('\n  - ') } ` : null;
                    }));
                    messagesContext = msgs.filter(Boolean).join('\n\n');
                } catch (e) { console.warn('[Bodhi] Messages pre-load failed', e); }
            }

            // ══ MOOD DETECTION ══
            let detectedMood = 'NEUTRAL';
            if (conversationHistory) {
                const last = conversationHistory.split('\n').slice(-8).join(' ').toLowerCase();
                if (/thak|tired|exhausted|bore|bored|kuch nahi|boring|meh/i.test(last)) detectedMood = 'BORED/TIRED';
                else if (/stressed|tension|pressure|anxiety|ghabra|pareshan|problem|issue/i.test(last)) detectedMood = 'STRESSED';
                else if (/sad|dukh|ro|cry|upset|depressed|bura lag|nahi acha/i.test(last)) detectedMood = 'SAD/LOW';
                else if (/excited|khush|happy|great|amazing|awesome|badiya|mast|fantastic/i.test(last)) detectedMood = 'EXCITED/HAPPY';
                else if (/confused|samajh nahi|unclear|kya karu|what to do|stuck/i.test(last)) detectedMood = 'CONFUSED';
                else if (/focus|concentrate|kaam|work|productive/i.test(last)) detectedMood = 'FOCUSED';
                if (sankalpaRef.current.filter(s => !s.done).length > 5) detectedMood = detectedMood === 'NEUTRAL' ? 'STRESSED' : detectedMood;
            }
            if (timeGapMins > 480 || conversationHistory === '') detectedMood = detectedMood === 'NEUTRAL' ? 'FRESH_START' : detectedMood;

            // ══ NEWS CONTEXT: use Google Search grounding — no pre-fetch needed ══
            const newsContext = `★ LIVE NEWS: You have Google Search access.When the user asks about what's happening in the news, India, politics, technology, sports, health, or the world — use your googleSearch tool to pull REAL, LATEST news (from today, ${new Date().toLocaleDateString('en - IN')}). Share up to 10 relevant stories naturally. Do NOT make up news.
`;

            console.log('[Bodhi] Connecting to Gemini Live API...');
            const session = await ai.live.connect({
                model: GEMINI_LIVE_MODEL,
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } },
                    },
                    systemInstruction: buildSystemPrompt(phaseRef.current, userName, sankalpaRef.current, memories, unreadContext, conversationHistory, hasGreetedThisPhase, newsContext, messagesContext, timeGapStr, timeGapMins, isMedDone, healthProfile, detectedMood, personalityProfile) + '\n\nRANDOM_SEED: ' + Math.floor(Math.random() * 1000),
                    // ── MODULE 1: Google AI SDK FunctionDeclarations (Sankalpa Tools) ──
                    tools: [{
                        functionDeclarations: [
                            {
                                name: 'add_sankalpa_task',
                                description: 'Adds a new task to the user\'s Sankalpa list. Time duration is OPTIONAL. ONLY ask for duration if it is highly time-sensitive.',
                                parameters: {
                                    type: Type.OBJECT,
                                    properties: {
                                        task_name: {
                                            type: Type.STRING,
                                            description: 'The name of the activity, e.g. "Morning Meditation" or "Breakfast" or "Coding Practice".',
                                        },
                                        start_time: {
                                            type: Type.STRING,
                                            description: 'The time at which this task should start, e.g. "9:00 AM". Optional.',
                                        },
                                        allocated_time_minutes: {
                                            type: Type.INTEGER,
                                            description: 'The exact number of minutes. Optional. DO NOT ASK for this unless it is highly time restricted.',
                                        },
                                    },
                                    required: ['task_name'],
                                },
                            },
                            {
                                name: 'remove_sankalpa_task',
                                description: 'Removes a task from the Sankalpa list, or marks it as complete.',
                                parameters: {
                                    type: Type.OBJECT,
                                    properties: {
                                        task_name: {
                                            type: Type.STRING,
                                            description: 'The exact name (or partial name) of the task to remove.',
                                        },
                                    },
                                    required: ['task_name'],
                                },
                            },
                        ],
                    }],
                },
                callbacks: {
                    onopen: () => {
                        console.log('[Bodhi] Gemini Live session opened');
                        if (connectionIntentRef.current) {
                            isConnectedRef.current = true;
                            setSakhaState('listening');
                            setIsListening(true);
                            if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
                            callTimeoutRef.current = setTimeout(() => {
                                deactivate();
                            }, 900000);

                            // ── ANTI-STUCK WATCHDOG: Every 4s check if Bodhi is frozen in a non-listening state
                            if (watchdogRef.current) clearInterval(watchdogRef.current);
                            watchdogRef.current = setInterval(() => {
                                if (!isConnectedRef.current) {
                                    if (watchdogRef.current) clearInterval(watchdogRef.current);
                                    return;
                                }
                                // If audio queue is empty, not playing, session open — but mic is blocked: unlock it
                                if (
                                    !isPlayingRef.current &&
                                    audioQueueRef.current.length === 0 &&
                                    !canListenRef.current &&
                                    fullTranscriptBufferRef.current === ''
                                ) {
                                    console.warn('[Bodhi Watchdog] Detected stuck state — self-healing to listening');
                                    canListenRef.current = true;
                                    setSakhaState('listening');
                                    setIsSpeaking(false);
                                }
                            }, 4000);
                        }
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        const msg = message as any;

                        // ══════════════════════════════════════════════════════
                        // MODULE 3 — SILENCE-KILLER: Handle Google AI SDK native
                        // function calls (toolCall) immediately with toolResponse
                        // ══════════════════════════════════════════════════════
                        if (msg.toolCall?.functionCalls?.length > 0) {
                            for (const fc of msg.toolCall.functionCalls) {
                                const fcName: string = fc.name ?? '';
                                const fcArgs = fc.args ?? {};
                                const fcId: string = fc.id ?? '';

                                let responseMessage = 'success';

                                // ── add_sankalpa_task ──────────────────────────
                                if (fcName === 'add_sankalpa_task') {
                                    const taskName: string = fcArgs.task_name ?? 'Task';
                                    const allocatedMins: number = fcArgs.allocated_time_minutes ?? 0;
                                    const startTime: string = fcArgs.start_time ?? '';
                                    const current = [...sankalpaRef.current];
                                    const newTask: TaskItem = {
                                        id: Date.now().toString(),
                                        text: taskName,
                                        done: false,
                                        category: 'Spiritual',
                                        colorClass: 'gold',
                                        accentColor: 'rgba(251,191,36,0.85)',
                                        icon: '⏱️',
                                        createdAt: Date.now(),
                                        allocatedMinutes: allocatedMins,
                                        startTime: startTime || undefined,
                                    };
                                    // 1. Optimistic UI update
                                    onSankalpaUpdateRef.current([...current, newTask]);
                                    // 2. Persist to Firestore (fire-and-forget — never block the tool response)
                                    if (onAddTaskRef.current) {
                                        onAddTaskRef.current(newTask).catch(e =>
                                            console.warn('[Bodhi SDK] Failed to persist add_sankalpa_task to Firestore:', e)
                                        );
                                    }
                                    responseMessage = `Added task "${taskName}".Confirm this ONCE and wait for user.`;
                                    console.log(`[Bodhi SDK] ✅ add_sankalpa_task: "${taskName}"`);
                                }

                                // ── remove_sankalpa_task ───────────────────────
                                if (fcName === 'remove_sankalpa_task') {
                                    const taskName: string = fcArgs.task_name ?? '';
                                    const query = taskName.toLowerCase();
                                    const current = [...sankalpaRef.current];
                                    const removed = current.filter(t => t.text.toLowerCase().includes(query));
                                    const updated = current.filter(t => !t.text.toLowerCase().includes(query));
                                    // 1. Optimistic UI update
                                    onSankalpaUpdateRef.current(updated);
                                    // 2. Persist each removal to Firestore
                                    if (onRemoveTaskRef.current && removed.length > 0) {
                                        removed.forEach(t =>
                                            onRemoveTaskRef.current!(t.id).catch(e =>
                                                console.warn('[Bodhi SDK] Failed to persist remove_sankalpa_task to Firestore:', e)
                                            )
                                        );
                                    }
                                    responseMessage = removed.length > 0
                                        ? `Task removed.Tell user it's done.`
                                        : `No matching task found for "${taskName}".`;
console.log(`[Bodhi SDK] ✅ remove_sankalpa_task: "${taskName}"`);
                                }

// ══════════════════════════════════════════════════════════
// 🔇 SILENCE-KILLER: Send toolResponse IMMEDIATELY back to Gemini
// This is the "receipt" Gemini needs to resume audio generation.
// Without this, the model hangs in infinite silence after a tool call.
// ══════════════════════════════════════════════════════════
if (sessionRef.current) {
    const toolResponsePayload = {
        functionResponses: [{
            id: fcId,    // Must match the id from Gemini's functionCall
            name: fcName,
            response: {
                status: 'success',
                message: responseMessage,
            },
        }],
    };

    // Primary path: use the native SDK sendToolResponse (Google AI SDK >= 0.7)
    const session = sessionRef.current as any;
    if (typeof session.sendToolResponse === 'function') {
        try {
            await session.sendToolResponse(toolResponsePayload);
            console.log(`[Bodhi SDK] ✅ Silence-Killer: toolResponse sent for "${fcName}" (id: ${fcId})`);
        } catch (trErr) {
            console.warn('[Bodhi SDK] sendToolResponse threw, falling back to sendClientContent:', trErr);
            // Fallback: inject as a user content message so Bodhi can still confirm
            await sessionRef.current.sendClientContent({
                turns: [{ role: 'user', parts: [{ text: `SYSTEM_RESPONSE: ${responseMessage} Please confirm warmly in Hindi.` }] }],
                turnComplete: true,
            });
        }
    } else {
        // SDK version doesn't have sendToolResponse — use sendClientContent fallback
        console.warn('[Bodhi SDK] sendToolResponse not available, using sendClientContent fallback');
        await sessionRef.current.sendClientContent({
            turns: [{ role: 'user', parts: [{ text: `SYSTEM_RESPONSE: ${responseMessage} Please confirm warmly in Hindi.` }] }],
            turnComplete: true,
        });
    }
}
                            }
return; // Don't process this message further as serverContent
                        }

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
    sessionHistoryRef.current.push(bodhiTurn);
    setCurrentSentence(''); // always clear stale sentence display

    // Save turn immediately
    const currentUid = userIdRef.current;
    if (currentUid && cleanedResp) {
        saveConversationHistory(currentUid, [bodhiTurn]).catch(() => {
            console.warn('[Bodhi] Failed to persist session history turn');
        });
    }

    // Parse and execute newly arrived tool calls
    const toolCalls = parseToolCalls(fullTranscriptBufferRef.current);
    if (toolCalls.length > 0) {
        executeToolCalls(toolCalls);
    }

    fullTranscriptBufferRef.current = '';

    // ── DEADLOCK FIX: If audio queue is already empty / never filled (e.g. text-only model turn),
    // unlock mic immediately. If audio IS still playing, playNextAudio() will unlock it when done.
    if (!isPlayingRef.current && audioQueueRef.current.length === 0) {
        canListenRef.current = true;
        setSakhaState('listening');
    }
    setIsSpeaking(false);
}

                        } else if (serverContent && !serverContent.turnComplete && !isPlayingRef.current && audioQueueRef.current.length === 0 && fullTranscriptBufferRef.current === '') {
    // Fast unblock if server sent a stray intermediate packet without speech
    canListenRef.current = true;
    setSakhaState('listening');
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
    isConnectedRef.current = false;
},
    onclose: (e: any) => {
        console.log('[Bodhi] Gemini Live session closed:', e?.reason || 'unknown');
        isConnectedRef.current = false;
        // FIX: Only update state if we were intentionally connected — avoids stale-closure dismiss
        if (connectionIntentRef.current) {
            // Session closed unexpectedly while we still wanted it — show error so user can retry
            setSakhaState('error');
            setError('Session ended unexpectedly. Tap to reconnect.');
        } else {
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
    const openingText = `Start. Phase = ${currentPhase}. Current Time = ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}. User has ${sankalpaRef.current.length} tasks today. ${historyNote} ${greetNote}. CRITICAL: If the user is ALREADY speaking to you, IGNORE the standard greeting and respond DIRECTLY to what they are saying right now. DO NOT SPEAK MORE THAN 2 SENTENCES.`;
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
