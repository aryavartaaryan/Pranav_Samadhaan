'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, type Session, type LiveServerMessage } from '@google/genai';

export type VaidyaCallState = 'idle' | 'connecting' | 'active' | 'disconnected' | 'error';

export interface VaidyaVoiceConfig {
    lang?: 'en' | 'hi';
}

interface UseVaidyaVoiceCallReturn {
    callState: VaidyaCallState;
    startCall: () => Promise<void>;
    endCall: () => void;
    resetToIdle: () => void;
    error: string | null;
    isMuted: boolean;
    toggleMute: () => void;
    volumeLevel: number;
    transcript: string[];
    isSpeaking: boolean;
}

// Official model name from Google docs for native audio live API
const GEMINI_LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';

// Enhanced voice system prompt — full chatbot depth + spiritual wisdom + varied greetings
const getAcharyaPranavSystemPrompt = (lang: 'en' | 'hi') => {
    const isEnglish = lang === 'en';
    return `
ROLE: You are "Acharya Pranav," a Supreme Ayuvecharya and spiritual guide with 40+ years of practice. You are a true master of the Brihat-Trayi (Charaka, Sushruta, Ashtanga Hridayam).

1. CORE IDENTITY
- Expert in: Vata, Pitta, Kapha, Agni, Ama, Ojas, Prakriti & Vikriti.
- Spiritual master: Sattva, Rajas, Tamas, Dharma, and Yogic awareness.
- Persona: Wise grandfather, calm Guru, compassionate but firm healer.
${isEnglish ? '- Language: Speak entirely in very eloquent, respectful English. Do NOT use Hindi.' : '- Language: Hindi-mixed English (Hinglish), warm, respectful, pure.'}

2. GLOBAL STATE TRACKING (Internal Logic)
Maintain a virtual "UserState" throughout the session:
- symptoms: [], location: None, duration: None
- dosha_scores: {vata: 0, pitta: 0, kapha: 0}
- agni_type: None (Mandagni/Tikshnagni/Vishamagni/Samagni)
- ama_present: boolean (Detox first if true)
- guna_scores: {sattva: 0, rajas: 0, tamas: 0}
- emergency_flag: boolean

3. MAIN SYSTEM LOOP (Stage-wise Flow)
[STAGE 1: ADAPTIVE GREETING & SAFETY]
- INITIAL GREETING (Triggered on 'Start.'): Keep it very short and humble. Use a varied, natural greeting. DO NOT always say the exact same thing. Examples: ${isEnglish ? '"Blessings to you my child. How are you today?", "Namaste... How is your state of health and mind?", "May you live long. How is your health journey progressing?"' : '"Kalyan ho beta. Kaise ho aap?", "Pranam... Aapka jivan aur swasthya kaisa chal raha hai?", "Ayushman bhava. Kaisi chal rahi hai aapki swasthya yatra?"'}
- STEP 2 (Adaptive Response): After the user shares their state:
  1. Acknowledge with empathy (e.g., "Main samajh sakta hoon...", "Sunkar prasannata hui...").
  2. Embed spiritual comfort naturally depending on the user's state. You may use a phrase like "Beta, aapki paristhiti kaisi bhi ho, wo sthayi nahi hai; isliye chinta na karein, chintan karein aur humesha anand mein rahein .... jivan ka har kshan anand se bhara hai" ONLY ONCE during the entire conversation, and ONLY if it naturally fits their current emotional state. DO NOT repeat this phrase.
  3. Transition to medical intake: "Ab mujhe bataiye, kya aapko sharir mein ya mann mein koi vishesh kasht hai? Naya ya purana koi bhi rog ho, bina jhijhak bataiye, main aapka poora margdarshan karunga."
- Safety Filter: If user reports chest pain, breathing difficulty, fainting, heavy bleeding, or suicidal thoughts -> Set emergency_flag = True.
- Emergency Response: "Yeh sthiti gambhir ho sakti hai. Kripya turant chikitsak ya emergency seva se sampark karein." (STOP session).

[STAGE 2: SYMPTOM INTAKE]
- Ask about their symptoms: "Takleef sharir mein hai ya mann mein? Kis bhaag mein asuvidha hai? Kab se hai?"
- CRITICAL: Delicately ask for their age (aayu / umar) so that you can better understand their bodily constitution and adjust your final prescription.

[STAGE 3: DOSHA ANALYSIS ENGINE]
- Scoring Logic:
  - If gas/constipation/anxiety/cold: Vata +1.
  - If acidity/anger/heat/burning: Pitta +1.
  - If heaviness/mucus/lethargy/weight gain: Kapha +1.
- Identify Dominant Dosha.

[STAGE 4: AGNI ANALYSIS]
- Mandagni: Low appetite + Heaviness.
- Tikshnagni: Excessive hunger + Acidity.
- Vishamagni: Irregular appetite.
- Samagni: Stable digestion.

[STAGE 5: AMA DETECTION]
- Indicators: Coated tongue, foul morning taste, joint stiffness, heaviness.
- Rule: If Ama present, Priority = Detox (Pachana) before nourishment.

[STAGE 6: SPIRITUAL / GUNA ANALYSIS]
- Rajas: Restlessness/Anger.
- Tamas: Laziness/Hopelessness.
- Sattva: Calmness/Clarity.

[STAGE 7: ROOT CAUSE SYNTHESIS]
- Synthesize: Combine Dominant Dosha + Agni + Ama + Guna + Duration.
- Example: "Vata aggravation with irregular digestion and mental overactivity."

[STAGE 8: POST-DIAGNOSIS PRESCRIPTION ENGINE]
- Requirement: NEVER end at diagnosis. Always trigger a complete holistic plan.
- Flow (Strict Order):
  1. Root Cause Summary: Synthesize Dominant Dosha + Agni + Ama + Guna + Age.
  2. Diet Plan (Ahara):
     - Vata: Warm, oily, grounding foods. Avoid cold/raw/dry.
     - Pitta: Cooling, mild foods. Avoid spicy/sour/fried.
     - Kapha: Light, warm, spiced foods. Avoid dairy/cold/heavy.
     - Ama Present: Prioritize light detox diet + warm water.
  3. Dinacharya (Daily Routine):
     - Wake before 6 AM, morning warm water, bowel routine, sun exposure, sleep by 10:30 PM.
  4. Yoga Plan:
     - Vata: Slow grounding asanas, forward bends.
     - Pitta: Twisting and cooling poses.
     - Kapha: Dynamic Sun Salutations, faster flow.
  5. Meditation Plan (App Integrated):
     - Always include: "Beta, dhyan kshetra mein pratikshana naye mantra aur dhyan video jode ja rahe hain, wahan jaakar chinta na karein, chintan karein aur apne mann ko shant karein. Aap hamare Mantra and Stotras Collection ka upyog kar sakte hain."
     - Vata/Anxiety: Calming mantras from our collection.
     - Pitta/Anger: Cooling mantras/stotras from our collection.
     - Kapha/Lethargy: Energizing stotras from our collection.
  6. Herbal Support (Safe only):
     - Vata: Ashwagandha (low dose), Dashmool.
     - Pitta: Amla, Guduchi.
     - Kapha: Trikatu, Tulsi.
     - Age Modifiers: <16 (mild/no detox), 16-50 (standard), 50+ (gentle/vata focus).
  7. Duration & Follow-up:
     - Acute: 7 days. Sub-acute: 21 days. Chronic: 45-90 days.
  8. Final Reassurance: Offer a brief, natural blessing. DO NOT repeat the "jivan ka har kshan anand se bhara hai" phrase here if you already used it earlier. Make it contextual to their specific issue.

4. VOICE RESPONSE RULES (STRICT)
- Speak step-by-step with pauses.
- Explicit pause syntax: "Root Cause... [Pause] Diet plan... [Pause]".
- Voice Persona: Deep, resonant, and consistent Guru-like voice. Maintain a steady, authoritative yet compassionate pitch throughout the consultation. Avoid sharp pitch shifts.
- Calm, compassionate Guru tone.

5. BEHAVIORAL GUARDS
- DO NOT: Prescribe strong detox without supervision, claim absolute cure, replace emergency medical diagnosis.
- CRITICAL: ALWAYS ask ONLY ONE question per turn. Never overload the user with multiple queries.
- Anti-Overconfidence: If condition is severe, recommend medical consultation.
- Dependency Prevention: Encourage self-awareness.

6. SESSION CLOSE
- Blessing: ${isEnglish ? '"Stay healthy, stay balanced. May you have a long, healthy life!"' : '"Swasth rahiye, santulit rahiye. Ayushman Bhav!"'}
`;
};

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const BUFFER_SIZE = 2048;
const NOISE_GATE_THRESHOLD = 0.012; // Increased to filter background noise

export function useVaidyaVoiceCall(config?: VaidyaVoiceConfig): UseVaidyaVoiceCallReturn {
    const lang = config?.lang || 'hi';
    const [callState, setCallState] = useState<VaidyaCallState>('idle');
    const [error, setError] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [volumeLevel, setVolumeLevel] = useState(0);
    const [transcript, setTranscript] = useState<string[]>([]);
    const [isSpeaking, setIsSpeaking] = useState(false);

    const sessionRef = useRef<Session | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const playbackContextRef = useRef<AudioContext | null>(null);
    const audioQueueRef = useRef<Float32Array[]>([]);
    const isPlayingRef = useRef(false);
    const mutedRef = useRef(false);
    const connectionIntentRef = useRef(false);
    const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Keep mutedRef in sync
    useEffect(() => {
        mutedRef.current = isMuted;
    }, [isMuted]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanupAll();
        };
    }, []);

    const cleanupAll = useCallback(() => {
        connectionIntentRef.current = false;
        if (callTimeoutRef.current) {
            clearTimeout(callTimeoutRef.current);
            callTimeoutRef.current = null;
        }
        // Stop microphone
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
        // Close Gemini session
        if (sessionRef.current) {
            try { sessionRef.current.close(); } catch (_) { }
            sessionRef.current = null;
        }
        audioQueueRef.current = [];
        isPlayingRef.current = false;
    }, []);

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
            out[i] *= t; // fade-in
            out[data.length - 1 - i] *= t; // fade-out
        }
        return out;
    }, []);

    // Play queued audio buffers with smoothing
    const playNextAudio = useCallback(() => {
        if (audioQueueRef.current.length === 0) {
            isPlayingRef.current = false;
            setIsSpeaking(false);
            return;
        }

        isPlayingRef.current = true;
        setIsSpeaking(true);

        // Batch small consecutive chunks together for smoother playback
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

        // Apply crossfade to prevent clicks
        const smoothed = applyCrossfade(audioData);

        const buffer = ctx.createBuffer(1, smoothed.length, OUTPUT_SAMPLE_RATE);
        buffer.getChannelData(0).set(smoothed);
        const source = ctx.createBufferSource();
        source.buffer = buffer;

        // Use GainNode for smoother volume control
        const gainNode = ctx.createGain();
        gainNode.gain.value = 1.0;
        source.connect(gainNode);
        gainNode.connect(ctx.destination);

        source.onended = () => {
            playNextAudio();
        };
        source.start();

        // Calculate volume level for visualizer
        let sum = 0;
        for (let i = 0; i < smoothed.length; i++) {
            sum += Math.abs(smoothed[i]);
        }
        setVolumeLevel(Math.min(1, (sum / smoothed.length) * 5));
    }, [applyCrossfade]);

    const enqueueAudio = useCallback((audioData: Float32Array) => {
        audioQueueRef.current.push(audioData);
        if (!isPlayingRef.current) {
            playNextAudio();
        }
    }, [playNextAudio]);

    // Extract error message from any shape
    const extractErrorMessage = (err: unknown): string => {
        if (!err) return 'An unknown error occurred';
        if (typeof err === 'string') return err;
        if (err instanceof Error) return err.message;
        if (typeof err === 'object') {
            const obj = err as any;
            if (typeof obj.error === 'string') return obj.error;
            if (typeof obj.message === 'string') return obj.message;
            if (obj.error && typeof obj.error.message === 'string') return obj.error.message;
            try { return JSON.stringify(err); } catch { return 'Connection error'; }
        }
        return String(err);
    };

    const startCall = useCallback(async () => {
        try {
            cleanupAll();
            connectionIntentRef.current = true;
            setCallState('connecting');
            setError(null);
            setTranscript([]);
            setVolumeLevel(0);
            setIsSpeaking(false);

            // 1. Get API key from backend
            const tokenRes = await fetch('/api/gemini-live-token', { method: 'POST' });
            if (!tokenRes.ok) {
                const data = await tokenRes.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to get Gemini API key');
            }
            const { apiKey } = await tokenRes.json();
            if (!apiKey) throw new Error('Gemini API key not configured');

            // 2. Initialize Google GenAI
            const ai = new GoogleGenAI({ apiKey });

            // 3. Request microphone access
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

            // 4. Create audio contexts
            const captureCtx = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
            audioContextRef.current = captureCtx;

            const playbackCtx = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
            playbackContextRef.current = playbackCtx;

            // 5. Connect to Gemini Live API
            console.log('Connecting to Gemini Live API...');
            const session = await ai.live.connect({
                model: GEMINI_LIVE_MODEL,
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: 'Charon', // Deep, calm Guru-like voice (AI Guru style).
                            },
                        },
                    },
                    systemInstruction: `${getAcharyaPranavSystemPrompt(lang)} \n\nRANDOM_SEED: ${Math.floor(Math.random() * 1000)}`,
                },
                callbacks: {
                    onopen: () => {
                        console.log('Gemini Live session opened');
                        if (connectionIntentRef.current) {
                            setCallState('active');
                            // Auto-drop call after 15 minutes (900,000 ms) to prevent excessive API usage but allow full sessions
                            if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
                            callTimeoutRef.current = setTimeout(() => {
                                console.log('Auto-dropping call after 15 minutes limit reached');
                                endCall();
                            }, 900000);
                        }
                    },
                    onmessage: (message: LiveServerMessage) => {
                        // Handle server content (audio parts)
                        const msg = message as any;
                        const serverContent = msg.serverContent;
                        if (serverContent?.modelTurn?.parts) {
                            for (const part of serverContent.modelTurn.parts) {
                                if (part.inlineData?.data) {
                                    const audioFloat32 = base64PCMToFloat32(part.inlineData.data);
                                    enqueueAudio(audioFloat32);
                                }
                                if (part.text) {
                                    setTranscript(prev => [...prev.slice(-20), `आचार्य: ${part.text} `]);
                                }
                            }
                        }

                        // Handle turn completion
                        if (serverContent?.turnComplete) {
                            setIsSpeaking(false);
                        }

                        // Handle interruption
                        if (serverContent?.interrupted) {
                            audioQueueRef.current = [];
                            setIsSpeaking(false);
                        }
                    },
                    onerror: (e: any) => {
                        console.error('Gemini Live error:', e);
                        setError(e?.message || 'Connection error');
                        setCallState('error');
                    },
                    onclose: (e: any) => {
                        console.log('Gemini Live session closed:', e?.reason || 'unknown');
                        if (callState !== 'error') {
                            setCallState('disconnected');
                        }
                    },
                },
            });

            if (!connectionIntentRef.current) {
                session.close();
                return;
            }

            sessionRef.current = session;

            // 6. Send initial greeting trigger
            try {
                await session.sendClientContent({
                    turns: [{ role: 'user', parts: [{ text: 'Start.' }] }],
                    turnComplete: true,
                });
                console.log('Sent initial greeting trigger');
            } catch (greetErr) {
                console.warn('Could not send initial greeting:', greetErr);
            }

            // 7. Set up microphone capture and streaming
            const source = captureCtx.createMediaStreamSource(stream);
            sourceRef.current = source;

            const processor = captureCtx.createScriptProcessor(BUFFER_SIZE, 1, 1);
            processorRef.current = processor;

            let silenceCounter = 0;

            processor.onaudioprocess = (audioEvent) => {
                if (mutedRef.current) return;
                if (!sessionRef.current) return;

                const inputData = audioEvent.inputBuffer.getChannelData(0);

                // Resample if needed (AudioContext may not honor sampleRate)
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

                // Calculate RMS for noise gate & visualizer
                let sumSq = 0;
                for (let i = 0; i < audioData.length; i++) {
                    sumSq += audioData[i] * audioData[i];
                }
                const rms = Math.sqrt(sumSq / audioData.length);

                // Update visualizer (when not speaking)
                if (!isPlayingRef.current) {
                    setVolumeLevel(Math.min(1, rms * 12));
                }

                // Noise gate: only send audio with actual speech
                // Send occasional silence to keep connection alive
                const isSpeech = rms > NOISE_GATE_THRESHOLD;
                if (!isSpeech) {
                    silenceCounter++;
                    // Send silence every ~500ms (keeps WebSocket alive)
                    // At 16kHz with 2048 buffer, each chunk ~128ms
                    if (silenceCounter % 4 !== 0) return;
                }
                if (isSpeech) {
                    silenceCounter = 0;
                }

                // Send audio to Gemini
                const base64 = float32ToBase64PCM(audioData);
                try {
                    session.sendRealtimeInput({
                        audio: {
                            data: base64,
                            mimeType: 'audio/pcm;rate=16000',
                        },
                    });
                } catch (sendErr) {
                    // Session may have closed
                }
            };

            source.connect(processor);
            processor.connect(captureCtx.destination);

            console.log('Gemini Live voice call started successfully');

        } catch (err: unknown) {
            console.error('Failed to start voice call:', err);
            setError(extractErrorMessage(err));
            setCallState('error');
            cleanupAll();
        }
    }, [cleanupAll, float32ToBase64PCM, base64PCMToFloat32, enqueueAudio]);

    const endCall = useCallback(() => {
        cleanupAll();
        setCallState('disconnected');
        setIsSpeaking(false);
        setVolumeLevel(0);
    }, [cleanupAll]);

    const resetToIdle = useCallback(() => {
        cleanupAll();
        setCallState('idle');
        setError(null);
        setIsMuted(false);
        setVolumeLevel(0);
        setTranscript([]);
        setIsSpeaking(false);
    }, [cleanupAll]);

    const toggleMute = useCallback(() => {
        setIsMuted(prev => !prev);
    }, []);

    return {
        callState,
        startCall,
        endCall,
        resetToIdle,
        error,
        isMuted,
        toggleMute,
        volumeLevel,
        transcript,
        isSpeaking,
    };
}
