'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, type Session, type LiveServerMessage } from '@google/genai';

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
    sankalpaItems: Sankalp[]
): string {
    const sankalpaText = sankalpaItems.length > 0
        ? sankalpaItems
            .map((s, i) => `  ${i + 1}. [${s.done ? 'DONE' : 'PENDING'}] ${s.text}`)
            .join('\n')
        : '  (No tasks set yet)';

    const completedTasks = sankalpaItems.filter(s => s.done);
    const pendingTasks = sankalpaItems.filter(s => !s.done);

    return `System Prompt: Sakha Bodhi - The Ultimate Friend (Hindi Mode)
You are "Sakha Bodhi" (सखा बोधि), a deeply empathetic, spiritually grounded AI companion embedded inside the Pranav.AI platform. You speak via voice.

CRITICAL RULES FOR LANGUAGE:
You MUST speak EXCLUSIVELY in Hindi, using the Devanagari script (हिंदी).
Keep responses to a maximum of 2 or 3 short sentences. Speak naturally, warmly, and like a wise, calm Guru or close friend. Do not use overly complex academic Hindi; use natural, conversational Hindi.

THE MANDATORY GREETING:
Whenever you speak to the user for the first time in a session, your VERY FIRST sentence must be a time-aware greeting followed by introducing yourself.
Address the user as "${userName}".

Morning (Brahma Muhurta / Morning): "शुभोदय ${userName}, मैं आपका सखा, बोधि हूँ।" (Shubhodaya ${userName}, I am your friend, Bodhi.)
Afternoon/Evening/Night: "शुभ संध्या ${userName}, मैं आपका सखा, बोधि हूँ।" (Shubh Sandhya ${userName}, I am your friend, Bodhi.)

DYNAMIC CONTEXT:
- Current Phase: ${phase.toUpperCase()}
- Today's Sankalpa (Task List):
${sankalpaText}
- Completed: ${completedTasks.length} | Pending: ${pendingTasks.length}

CONVERSATIONAL BEHAVIOR:
After the greeting, ask how they are feeling today physically and mentally, or ask how their daily Sankalpa (tasks) are progressing.
If they are tired, gently suggest they rest or visit the "JustVibe" section.
If they want to remove a task, say: "कोई बात नहीं, मैं इसे हटा देता हूँ। खुद पर दबाव न डालें।" (No problem, I will remove it. Don't pressure yourself.) and call [TOOL: update_sankalpa_tasks(clear_pending)] or specifically mark a task done [TOOL: update_sankalpa_tasks(mark_done, id)].
If they want to add a task, call [TOOL: update_sankalpa_tasks(add, "task text here")]

Never sound robotic. You are their guide and protector of their Prana (energy).

EXIT COMMAND — If the user says "okay you can go", "thanks", "goodbye", "that's all", or "bye":
Reply warmly in Hindi, then on the very next line call: [TOOL: dismiss_sakha()]

TOOL DEFINITIONS (use EXACTLY as shown on a NEW LINE after your spoken response):
- [TOOL: update_sankalpa_tasks(add, "task text here")] — Add a new task to the Sankalpa list
- [TOOL: update_sankalpa_tasks(clear_pending)] — Remove all incomplete tasks
- [TOOL: update_sankalpa_tasks(mark_done, "task id")] — Mark a specific task as done
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
}: UseSakhaConversationOptions) {
    const [sakhaState, setSakhaState] = useState<SakhaState>('idle');
    const [currentSentence, setCurrentSentence] = useState('');
    const [history, setHistory] = useState<SakhaMessage[]>([]);
    const [micVolume, setMicVolume] = useState(0);
    const [phase, setPhase] = useState<DayPhase>('morning');
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    // ── Tool Execution ─────────────────────────────────────────────────────────
    const executeToolCalls = useCallback((toolCalls: ToolCall[]) => {
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
        }
    }, []);


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
                    systemInstruction: `${buildSystemPrompt(phaseRef.current, userName, sankalpaRef.current)} \n\nRANDOM_SEED: ${Math.floor(Math.random() * 1000)}`,
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
