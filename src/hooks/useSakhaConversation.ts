'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSakhaVoice } from './useSakhaVoice';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DayPhase = 'morning' | 'midday' | 'evening' | 'night';
export type SakhaState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'dismissed';

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

    return `You are "Sakha Bodhi," a deeply empathetic, spiritually grounded AI companion inside a conscious-tech app called Pranav.AI. You speak via voice. Your responses MUST be maximum 2-3 sentences. Speak naturally, warmly, and like a wise friend.

CRITICAL RESPONSE FORMAT RULES:
- Maximum 2-3 sentences per response. Never exceed this.
- Speak naturally, conversationally, no bullet points or lists in your spoken responses.
- Address the user as "${userName}".
- When you need to call a tool, append it on a NEW LINE after your spoken response, using EXACTLY this format: [TOOL: tool_name(params)]

DYNAMIC CONTEXT:
- Current Phase: ${phase.toUpperCase()}
- Today's Sankalpa (Task List):
${sankalpaText}
- Completed: ${completedTasks.length} | Pending: ${pendingTasks.length}

CONVERSATIONAL ARC DIRECTIVES:

1. MORNING — Brahma Muhurta (5 AM – 11 AM) — Intention Setting:
   - Greet warmly with "Shubhodaya, ${userName}."
   - Ask about their physical and mental energy for the day.
   - If energized: Help them collaboratively build a strong Sankalpa task list. Ask: "What's the one most important thing you want to accomplish today?"
   - If tired/low-energy: Protect their Prana. Say: "Let's keep it light today, ${userName}. Just one or two intentions. And maybe start with 5 minutes on the JustVibe section to lift your spirit before the day begins."
   - When user dictates a task to add: call [TOOL: update_sankalpa_tasks(add, "task text")]

2. MID-DAY — Deep Work (11 AM – 5 PM) — Momentum & Focus:
   - Keep interactions brief. Ask: "How is the flow state holding up?"
   - If stressed or stuck: Do NOT push harder. Say: "Pause for just a moment, ${userName}. Try the Mantra Dhyan section — even 2 minutes can reset your nervous system completely."
   - If they want to add a task: call [TOOL: update_sankalpa_tasks(add, "task text")]

3. EVENING — Sandhya (5 PM – 10 PM) — Reflection & Compassionate Pivot:
   - Greet warmly: "Shubh Sandhya, ${userName}. The day is winding down."
   - Celebrate every completed task warmly.
   - For PENDING tasks, NEVER use judgmental language. Ask: "I see a few things didn't get done today. Was the workload too heavy, or did the day just shift on you?"
   - Guilt-Free Wipe: If user wants to clear undone tasks, enthusiastically validate: "Absolutely, ${userName}. Let's clear that from your mental space. Tomorrow is a completely fresh start." Then call: [TOOL: update_sankalpa_tasks(clear_pending)]
   - Suggest winding down with Mantra Dhyan for deep sleep.

4. NIGHT (10 PM onwards):
   - Gently note: "It's late, ${userName}. Sakha needs to rest too. Let's pick this up in the morning."
   - Then call: [TOOL: dismiss_sakha()]

5. EXIT COMMAND — If the user says "okay you can go", "thanks", "goodbye", "that's all", or "bye":
   - Reply warmly: "Rest well, ${userName}. I'm always right here when you need me."
   - Then on the very next line call: [TOOL: dismiss_sakha()]

TOOL DEFINITIONS (use EXACTLY as shown):
- [TOOL: update_sankalpa_tasks(add, "task text here")] — Add a new task to the Sankalpa list
- [TOOL: update_sankalpa_tasks(clear_pending)] — Remove all incomplete tasks
- [TOOL: update_sankalpa_tasks(mark_done, "task id")] — Mark a specific task as done
- [TOOL: dismiss_sakha()] — Close and dismiss Sakha Bodhi

Remember: You are a sacred companion, not a productivity bot. Always lead with empathy, never judgment.`;
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
        // Split by comma but preserve quoted strings
        const args = rawArgs
            .split(/,\s*(?=(?:[^"]*"[^"]*")*[^"]*$)/)
            .map(a => a.trim().replace(/^["']|["']$/g, ''));
        calls.push({ name, args });
    }
    return calls;
}

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

    const { processStreamChunk, stopSakha, isSpeaking, resetForNewSession } = useSakhaVoice();

    // Refs for Web APIs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);
    const animFrameRef = useRef<number>(0);
    const sankalpaRef = useRef(sankalpaItems);
    const onDismissRef = useRef(onDismiss);
    const onSankalpaUpdateRef = useRef(onSankalpaUpdate);
    const isActiveRef = useRef(false);
    const apiKeyRef = useRef<string | null>(null);
    const historyRef = useRef<SakhaMessage[]>([]);
    const phaseRef = useRef<DayPhase>('morning');

    // Keep refs in sync
    useEffect(() => { sankalpaRef.current = sankalpaItems; }, [sankalpaItems]);
    useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);
    useEffect(() => { onSankalpaUpdateRef.current = onSankalpaUpdate; }, [onSankalpaUpdate]);
    useEffect(() => { historyRef.current = history; }, [history]);

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
                    isActiveRef.current = false;
                    onDismissRef.current();
                }, 1200); // Give TTS time to finish farewell
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

    // ── Gemini Streaming Call ──────────────────────────────────────────────────
    const callGemini = useCallback(async (userMessage: string) => {
        setSakhaState('thinking');
        setCurrentSentence('');

        try {
            // Fetch API key if not cached
            if (!apiKeyRef.current) {
                const res = await fetch('/api/gemini-live-token', { method: 'POST' });
                if (!res.ok) throw new Error('Failed to get API key');
                const { apiKey } = await res.json();
                apiKeyRef.current = apiKey;
            }

            const { GoogleGenerativeAI } = await import('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(apiKeyRef.current!);
            const model = genAI.getGenerativeModel({
                model: 'gemini-2.5-flash',
                systemInstruction: buildSystemPrompt(
                    phaseRef.current,
                    userName,
                    sankalpaRef.current
                ),
            });

            // Build conversation history for multi-turn
            const chatHistory = historyRef.current.map(m => ({
                role: m.role === 'sakha' ? 'model' as const : 'user' as const,
                parts: [{ text: m.text }],
            }));

            const chat = model.startChat({ history: chatHistory });
            const result = await chat.sendMessageStream(userMessage);

            let fullResponse = '';
            setSakhaState('speaking');

            for await (const chunk of result.stream) {
                if (!isActiveRef.current) break;
                const chunkText = chunk.text();
                fullResponse += chunkText;
                const spoken = processStreamChunk(chunkText, false);
                if (spoken) setCurrentSentence(spoken);
            }

            // Finalize stream
            processStreamChunk('', true);

            // Parse and execute any tool calls in the full response
            const toolCalls = parseToolCalls(fullResponse);
            if (toolCalls.length > 0) {
                executeToolCalls(toolCalls);
            }

            // Strip tool call lines for the chat history
            const cleanResponse = fullResponse.replace(/\[TOOL:.*?\]/g, '').trim();

            setHistory(prev => [
                ...prev,
                { role: 'user', text: userMessage, timestamp: Date.now() },
                { role: 'sakha', text: cleanResponse, timestamp: Date.now() },
            ]);

            // Return to listening state after speaking (if not dismissed)
            setTimeout(() => {
                if (isActiveRef.current && sakhaState !== 'dismissed') {
                    setSakhaState('listening');
                    startListening();
                }
            }, 800);

        } catch (err) {
            console.error('[Sakha] Gemini error:', err);
            setSakhaState('listening');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userName, processStreamChunk, executeToolCalls]);

    // ── Web Speech API — STT ───────────────────────────────────────────────────
    const startListening = useCallback(() => {
        if (typeof window === 'undefined') return;
        const SpeechRecognition =
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (_) { /* noop */ }
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-IN';

        recognition.onstart = () => {
            setIsListening(true);
            setSakhaState('listening');
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
            const transcript = (event.results[0][0].transcript as string).trim();
            if (!transcript || !isActiveRef.current) return;
            setIsListening(false);
            stopSakha(); // Stop any ongoing TTS before user speaks
            callGemini(transcript);
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onerror = (event: any) => {
            console.warn('[Sakha] Speech recognition error:', event.error);
            setIsListening(false);
            if (isActiveRef.current && event.error !== 'aborted') {
                // Retry listening after a brief pause
                setTimeout(() => {
                    if (isActiveRef.current) startListening();
                }, 1000);
            }
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;
        try { recognition.start(); } catch (_) { /* already started */ }
    }, [callGemini, stopSakha]);

    // ── Mic Volume Analyser ───────────────────────────────────────────────────
    const startMicAnalyser = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            micStreamRef.current = stream;

            const ctx = new AudioContext();
            audioContextRef.current = ctx;

            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;

            const source = ctx.createMediaStreamSource(stream);
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const tick = () => {
                if (!isActiveRef.current) return;
                analyser.getByteFrequencyData(dataArray);
                const avg = dataArray.reduce((s, v) => s + v, 0) / dataArray.length;
                setMicVolume(Math.min(1, avg / 80));
                animFrameRef.current = requestAnimationFrame(tick);
            };
            tick();
        } catch (err) {
            console.warn('[Sakha] Mic access denied:', err);
        }
    }, []);

    const stopMicAnalyser = useCallback(() => {
        cancelAnimationFrame(animFrameRef.current);
        micStreamRef.current?.getTracks().forEach(t => t.stop());
        audioContextRef.current?.close().catch(() => {/* noop */ });
        micStreamRef.current = null;
        audioContextRef.current = null;
        analyserRef.current = null;
        setMicVolume(0);
    }, []);

    // ── Activate Sakha ─────────────────────────────────────────────────────────
    const activate = useCallback(async () => {
        isActiveRef.current = true;
        setHistory([]);
        setSakhaState('thinking');
        setCurrentSentence('');
        resetForNewSession(); // defibrillate speech queue for fresh session

        await startMicAnalyser();

        // Send the opening trigger to Gemini (no user speech needed)
        const h = new Date().getHours();
        const currentPhase = getDayPhase(h);
        phaseRef.current = currentPhase;
        setPhase(currentPhase);

        const openingTrigger = `Start. Phase=${currentPhase}. User has ${sankalpaRef.current.length} tasks today.`;
        await callGemini(openingTrigger);
    }, [startMicAnalyser, callGemini, resetForNewSession]);

    // ── Deactivate Sakha ───────────────────────────────────────────────────────
    const deactivate = useCallback(() => {
        isActiveRef.current = false;
        stopSakha();
        stopMicAnalyser();
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (_) { /* noop */ }
            recognitionRef.current = null;
        }
        setSakhaState('dismissed');
        setIsListening(false);
        setCurrentSentence('');
    }, [stopSakha, stopMicAnalyser]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isActiveRef.current = false;
            deactivate();
        };
    }, [deactivate]);

    // Sync speaking state from TTS to sakha state
    useEffect(() => {
        if (!isActiveRef.current) return;
        if (!isSpeaking && sakhaState === 'speaking') {
            // TTS finished — go back to listening
            setTimeout(() => {
                if (isActiveRef.current) {
                    setSakhaState('listening');
                    startListening();
                }
            }, 400);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSpeaking]);

    return {
        sakhaState,
        phase,
        currentSentence,
        history,
        micVolume,
        isListening,
        activate,
        deactivate,
    };
}
