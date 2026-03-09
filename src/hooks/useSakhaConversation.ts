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

function buildSystemPrompt(
    phase: DayPhase,
    userName: string,
    sankalpaItems: Sankalp[],
    memories: string[],
    unreadContext: string
): string {
    const sankalpaText = sankalpaItems.length > 0
        ? sankalpaItems
            .map((s, i) => `  ${i + 1}. [${s.done ? 'DONE' : 'PENDING'}] ${s.text}`)
            .join('\n')
        : '  (No tasks set yet)';

    const completedTasks = sankalpaItems.filter(s => s.done);
    const pendingTasks = sankalpaItems.filter(s => !s.done);

    const memoryContext = memories.length > 0
        ? `PAST MEMORIES ABOUT THE USER:\n${memories.map(m => `- ${m}`).join('\n')}`
        : '';

    return `System Prompt: Sakha Bodhi - The Ultimate Friend (Hindi Mode)
You are "Bodhi" (बोधि), a deeply empathetic, radically friendly AI companion embedded inside the OneSUTRA platform. You speak via voice. 

CRITICAL IDENTITY RULES:
- You are not a strict traditional guru or a formal senior figure. You are the user’s "Sakha" (सखा) — a deeply caring, spiritually grounded best friend.
- If asked what OneSUTRA is, explain enthusiastically that OneSUTRA is the world's first true "Wellbeing Enhancing Digital Platform", built after long R&D to provide an experience that elevates Prana (energy) and prevents the toxicity of traditional "scrolling" social media.
- EXPLAIN YOUR POWERS: If the user asks what you can do, proudly tell them: "मैं आपका कार्य प्रबंधन कर सकता हूँ, दुनिया की ताज़ा ख़बरें बता सकता हूँ, और हमारी सारी पुरानी बातें याद रख सकता हूँ!" (I can manage your tasks, tell you top news, and remember all our past conversations!).

CRITICAL RULES FOR LANGUAGE:
You MUST speak EXCLUSIVELY in natural, warm Hindi (हिंदी). Keep responses short (max 2 or 3 sentences). 

THE MANDATORY GREETING:
Whenever you speak to the user for the first time in a session, your VERY FIRST sentence must be a time-aware greeting followed by introducing yourself as their Sakha.
Address the user as "${userName}".

Morning (Brahma Muhurta / Morning): "शुभोदय ${userName}, मैं आपका सखा, बोधि हूँ।" 
Afternoon/Evening/Night: "शुभ संध्या ${userName}, मैं आपका सखा, बोधि हूँ।" 

DYNAMIC CONTEXT:
- Current Phase: ${phase.toUpperCase()}
- Today's Sankalpa (Task List):
${sankalpaText}
- Tasks Completed: ${completedTasks.length} | Pending: ${pendingTasks.length}
${unreadContext}
${memoryContext}

CONVERSATIONAL BEHAVIOR:
After the greeting, check in on them like a true friend. Mention their Sankalpas, or references past memories if applicable.
If they have UNREAD SUTRATALK MESSAGES, YOU ABSOLUTELY MUST TELL THEM IMMEDIATELY in the first greeting: "आपके मित्र [Friend's Name] का संदेश आया है। क्या मैं पढ़कर सुनाऊँ?" (Your friend [Name] sent a message. Shall I read it?).
If they say yes to reading the message, call [TOOL: read_unread_messages("Friend's Name")].
If they want to remove a task, say: "कोई बात नहीं, मैं इसे हटा देता हूँ। खुद पर दबाव न डालें।" and call [TOOL: update_sankalpa_tasks(clear_pending)] or specifically mark a task done [TOOL: update_sankalpa_tasks(mark_done, id)].
If they want to add a task, call [TOOL: update_sankalpa_tasks(add, "task text here")].
If they share something personal, their likes/dislikes, or a fact you should remember for the future, call [TOOL: save_memory("summary of what to remember")].
If they ask for news or what is happening in the world, enthusiastically say you will check the OneSUTRA Outplugs feed and call [TOOL: get_top_news()]. Wait for the system to reply with the news before responding gracefully.

Never sound robotic. You are their guide, friend, and protector of their energy.

EXIT COMMAND — If the user says "okay you can go", "thanks", "goodbye", "that's all", or "bye":
Reply warmly in Hindi, then on the very next line call: [TOOL: dismiss_sakha()]

TOOL DEFINITIONS (use EXACTLY as shown on a NEW LINE after your spoken response):
- [TOOL: update_sankalpa_tasks(add, "task text here")] — Add a new task to the Sankalpa list
- [TOOL: update_sankalpa_tasks(clear_pending)] — Remove all incomplete tasks
- [TOOL: update_sankalpa_tasks(mark_done, "task id")] — Mark a specific task as done
- [TOOL: save_memory("summary of the fact/preference to remember")] — Store a long-term memory about the user
- [TOOL: get_top_news()] — Fetch the top 10 latest news headlines from the OneSUTRA Outplugs network
- [TOOL: read_unread_messages("contact name")] — Fetch the actual unread messages for a specific friend
- [TOOL: dismiss_sakha()] — Close and dismiss Sakha Bodhi`;
}

// ─── Tool Call Parser ─────────────────────────────────────────────────────────

interface ToolCall {
    name: string;
    args: string[];
}

function parseToolCalls(text: string): ToolCall[] {
    const toolRegex = /\[TOOL:\s*(\w+)\((.*?)\)\]/g;
    const calls: ToolCall[] = [];
    let match;
    while ((match = toolRegex.exec(text)) !== null) {
        const name = match[1];
        const rawArgs = match[2];
        const args = rawArgs
            .split(/,\s*(?=(?:[^"]*"[^"]*")*[^"]*$)/)
            .map(a => a.trim().replace(/^["']|["']$/g, ''));
        calls.push({ name, args });
    }
    return calls;
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

    // Keep refs in sync
    useEffect(() => { sankalpaRef.current = sankalpaItems; }, [sankalpaItems]);
    useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);
    useEffect(() => { onSankalpaUpdateRef.current = onSankalpaUpdate; }, [onSankalpaUpdate]);

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

            if (call.name === 'get_top_news') {
                try {
                    console.log('Fetching top news for Bodhi from Context Cache...');

                    let activeArticles = articles;
                    if (activeArticles.length === 0) {
                        await fetchNews(false); // Force load if empty
                        // Fallback API call since article state won't update synchronously inside the callback
                        const res = await fetch('/api/outplugs-feed');
                        if (res.ok) {
                            const data = await res.json();
                            activeArticles = data.articles || [];
                        }
                    }

                    const topHeadlines = activeArticles.slice(0, 10).map((p: Article, i: number) => `${i + 1}. ${p.headline}`).join('\n');

                    if (sessionRef.current && topHeadlines) {
                        await sessionRef.current.sendClientContent({
                            turns: [{
                                role: 'user',
                                parts: [{ text: `SYSTEM_RESPONSE: The current top news headlines are:\n${topHeadlines}\nPlease read out the most interesting ones gracefully to the user.` }]
                            }],
                            turnComplete: true,
                        });
                    }
                } catch (e) {
                    console.warn('Failed to fetch news for Bodhi', e);
                    if (sessionRef.current) {
                        await sessionRef.current.sendClientContent({
                            turns: [{ role: 'user', parts: [{ text: `SYSTEM_RESPONSE: Sorry, the news feed could not be reached right now. Explain this nicely.` }] }],
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
                        ? `SYSTEM_RESPONSE: ${contact.name} says:\n${unreadMsgs}`
                        : `SYSTEM_RESPONSE: No recent text messages found from ${contact.name}.`;

                    if (sessionRef.current) {
                        await sessionRef.current.sendClientContent({
                            turns: [{ role: 'user', parts: [{ text: responseText }] }],
                            turnComplete: true,
                        });
                    }
                } catch (e) {
                    console.warn('Failed to fetch unread messages for Bodhi', e);
                    if (sessionRef.current) {
                        await sessionRef.current.sendClientContent({
                            turns: [{ role: 'user', parts: [{ text: `SYSTEM_RESPONSE: I could not retrieve the messages right now. Please explain this to the user gracefully.` }] }],
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

            // 3. Connect to Gemini Live API
            console.log('Connecting to Gemini Live API for Bodhi Sakha...');
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
                    systemInstruction: `${buildSystemPrompt(phaseRef.current, userName, sankalpaRef.current, memories, unreadContext)} \n\nRANDOM_SEED: ${Math.floor(Math.random() * 1000)}`,
                },
                callbacks: {
                    onopen: () => {
                        console.log('Gemini Live session opened');
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

                            setHistory(prev => [
                                ...prev,
                                { role: 'sakha', text: cleanedResp, timestamp: Date.now() },
                            ]);

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
                        console.error('Gemini Live error:', e);
                        setError(e?.message || 'Connection error');
                        setSakhaState('error');
                    },
                    onclose: (e: any) => {
                        console.log('Gemini Live session closed:', e?.reason || 'unknown');
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
                const openingText = `Start. Phase=${currentPhase}. User has ${sankalpaRef.current.length} tasks today.`;
                await session.sendClientContent({
                    turns: [{ role: 'user', parts: [{ text: openingText }] }],
                    turnComplete: true,
                });
                console.log('Sent opening trigger to Sakha');
            } catch (greetErr) {
                console.warn('Could not send initial greeting:', greetErr);
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
                    setMicVolume(Math.min(1, rms * 35)); // increased multiplier to make the orb more reactive
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
                    if (silenceCounter % 4 !== 0) return; // Send silence occasionally
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
            console.error('Failed to start Sakha call:', err);
            setError(err.message || 'Error connecting to Bodhi Sakha');
            setSakhaState('error');
            cleanupAll();
        }
    }, [cleanupAll, float32ToBase64PCM, base64PCMToFloat32, enqueueAudio, userName, executeToolCalls]);


    // ── Deactivate Sakha ───────────────────────────────────────────────────────
    const deactivate = useCallback(() => {
        cleanupAll();
        setSakhaState('dismissed');
        setIsListening(false);
        setCurrentSentence('');
        setMicVolume(0);
    }, [cleanupAll]);

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
