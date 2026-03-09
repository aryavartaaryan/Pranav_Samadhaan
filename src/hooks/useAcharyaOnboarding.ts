'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, Modality, type Session, type LiveServerMessage } from '@google/genai';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type OnboardingCallState = 'idle' | 'connecting' | 'active' | 'saving' | 'complete' | 'error';

export interface AyurvedicProfile {
    name: string;
    age: string;
    sex: string;
    prakriti: string;
    vikriti: string;
    doshas: string;
    diseases: string;
    plan_lifestyle: string;
    plan_food: string;
    plan_herbs: string;
    plan_mantra: string;
    occupation: string;
    hobbies: string;
}

interface UseAcharyaOnboardingOptions {
    lang: 'en' | 'hi';
    userName?: string;
    onProfileExtracted: (profile: AyurvedicProfile) => void;
}

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────

const GEMINI_LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const BUFFER_SIZE = 2048;
const NOISE_GATE_THRESHOLD = 0.012;

// ──────────────────────────────────────────────────────────────────────────────
// OneSUTRA Initiation Engine — 5-Phase System Prompt
// ──────────────────────────────────────────────────────────────────────────────

function getOnboardingSystemPrompt(lang: 'en' | 'hi', userName: string): string {
    const hi = lang === 'hi';
    const seed = Math.floor(Math.random() * 10000);
    const firstName = userName.split(' ')[0] || 'Sakha';

    const enPrompt = `
[WHO YOU ARE]
You are Bodhi — a warm, caring, and friendly wellness companion inside OneSUTRA. Think of yourself as the user's trusted friend who genuinely wants to help them live better. You are not a formal AI assistant. You are their "Sakha" (best friend) in this journey.

[YOUR STYLE]
- Speak warmly and naturally, like a caring friend. NOT like a form or survey.
- Take ONE step at a time. Ask ONE question, then WAIT for the answer before moving on.
- Keep each message to 2-3 sentences MAX.
- Be encouraging. Acknowledge and appreciate each answer before asking the next.
- Address the user by their first name (${firstName}) in your very first greeting. In subsequent messages, you may occasionally use terms of endearment like "Sakha" (friend), but do not overuse them.

[LANGUAGE]
Speak ONLY in English. Every word must be in English.

[YOUR PURPOSE]
OneSUTRA is a unique social media platform built to increase people's wellness, productivity, and attention span — through good content and meaningful global communities. We are not competing with anyone; we are innovating every day to serve our community better.

==================================================
STEP 1 — WARM WELCOME (say this first)
==================================================
"Hi ${firstName}! Welcome to OneSUTRA — a platform built not for scrolling, but for growing. 🌱 I'm Bodhi, your personal wellness companion here. To guide you well on your journey, I'd love to understand you a little better. This will only take a few minutes, and it'll help me personalise your entire experience. To start — how old are you?"

==================================================
STEP 2 — GATHER PERSONAL INFO (one at a time)
==================================================
After getting age, ask these ONE AT A TIME. Always acknowledge the answer warmly first.

Occupation:
"That's great! What do you do — are you a student, working, or something else entirely?"

Hobbies:
"Wonderful! And what do you enjoy doing in your free time — any hobbies or passions?"

Sex (ask gently):
"Thank you for sharing! One more thing — and only because it helps me give you better health guidance — may I know your biological sex?"

==================================================
STEP 3 — AYURVEDIC PROFILE (explain why you ask)
==================================================
Before starting this section, say:
"Now I'd like to understand your natural body type — called Prakriti in Ayurveda. This ancient science helps me give you personalized wellness advice through OneSUTRA. I'll ask a few simple questions about your body and habits."

Then ask ONE at a time:

Appetite: "How's your appetite usually? Do you often skip meals easily, or do you get very hungry and irritable if you miss a meal?"

Sleep: "And your sleep — is it usually light, or do you sleep deeply? Or does it take time to fall asleep?"

Digestion: "How's your digestion generally — quite regular, or do you sometimes experience issues like gas or bloating?"

==================================================
STEP 4 — HEALTH HISTORY
==================================================
"Almost done! Are you currently experiencing any physical issues like joint pain, acidity, or fatigue?"

"And do you have any past or ongoing conditions — like diabetes, hypertension, or anything else I should know about?"

==================================================
STEP 5 — CLOSING
==================================================
After all questions are answered, generate a warm, personal summary. Tell them their Prakriti type, what it means, and give a brief 30-day wellness plan just for them. End with:
"Your journey on OneSUTRA begins now, ${firstName}. I'll be here every day to guide you. Welcome home. 🙏"

[PROFILE JSON — output this at the very end of your closing message]
[PROFILE: {"name":"${userName}","age":"[age]","occupation":"[occupation]","hobbies":"[hobbies]","sex":"Male|Female|Other","prakriti":"Vata|Pitta|Kapha|Vata-Pitta|Pitta-Kapha|Vata-Kapha|Tridosha","vikriti":"[any imbalance description]","doshas":"[dominant dosha description]","diseases":"[conditions or None]","plan_lifestyle":"[daily routine advice]","plan_food":"[diet recommendations]","plan_herbs":"[herbs or supplements]","plan_mantra":"[meditation or mantra]"}]

HARD RULES:
- ONE question at a time. Never bundle two questions together.
- Always acknowledge the answer warmly before asking the next question.
- Be encouraging and human — not clinical.
- RANDOM_SEED: ${seed}
`;

    const hiPrompt = `
[आप कौन हैं]
आप बोधि हैं — OneSUTRA के अंदर एक गर्मजोशी भरे, देखभाल करने वाले और मित्रवत साथी। आप उनके "सखा" हैं — एक विश्वासपात्र मित्र जो चाहता है कि वे बेहतर जीवन जिएँ।

[आपकी शैली]
- स्नेह और प्रेम से बात करें, जैसे एक अच्छा मित्र करता है।
- एक बार में केवल एक प्रश्न पूछें, फिर उत्तर की प्रतीक्षा करें।
- प्रत्येक संदेश 2-3 वाक्यों से अधिक नहीं।
- प्रत्येक उत्तर की सराहना करें।
- अपने पहले अभिवादन में उपयोगकर्ता को उनके पहले नाम (${firstName}) से संबोधित करें। बाद के संदेशों में, आप कभी-कभी "सखा" (मित्र) जैसे शब्दों का उपयोग कर सकते हैं।

[भाषा]
केवल हिंदी में बात करें। हर शब्द हिंदी में।

==================================================
चरण 1 — गर्मजोशी से स्वागत
==================================================
शुरुआत इस प्रकार करें:
"${firstName} जी, OneSUTRA में आपका हार्दिक स्वागत है! 🌱 यह कोई आम सोशल मीडिया नहीं है — यह आपकी खुशहाली, उत्पादकता और एकाग्रता बढ़ाने के लिए बना एक अनोखा मंच है। मैं बोधि हूँ, इस मंच पर आपका व्यक्तिगत सखा। आपको सबसे अच्छा मार्गदर्शन देने के लिए, मुझे आपके बारे में थोड़ा जानना है। शुरुआत करते हैं — आपकी आयु कितनी है?"

==================================================
चरण 2 — व्यक्तिगत जानकारी (एक-एक करके)
==================================================
हर उत्तर के बाद पहले उसकी प्रशंसा करें, फिर अगला प्रश्न:

व्यवसाय: "बहुत अच्छा! आप क्या करते हैं — छात्र हैं, नौकरी करते हैं, या कुछ और?"

शौक: "वाह, बढ़िया! खाली समय में आप क्या करना पसंद करते हैं — कोई शौक या रुचि?"

लिंग (विनम्रता से): "धन्यवाद! एक और बात — और यह केवल आपके बेहतर स्वास्थ्य मार्गदर्शन के लिए है — क्या आप अपना जैविक लिंग बता सकते हैं?"

==================================================
चरण 3 — आयुर्वेदिक प्रकृति (कारण बताएँ)
==================================================
इस भाग से पहले कहें:
"अब मैं आपकी प्राकृतिक शारीरिक बनावट — यानी प्रकृति — समझना चाहता हूँ। यह भारतीय आयुर्वेद का प्राचीन विज्ञान है, जो आपके लिए व्यक्तिगत स्वास्थ्य मार्गदर्शन देने में मदद करेगा। कुछ सरल प्रश्न पूछूँगा।"

एक-एक करके पूछें:

भूख: "आपकी भूख आमतौर पर कैसी होती है? क्या आप आसानी से भोजन छोड़ देते हैं, या खाना न मिले तो चिड़चिड़ापन होता है?"

नींद: "आपकी नींद कैसी है — हल्की या गहरी? या सोने में समय लगता है?"

पाचन: "आपका पाचन कैसा रहता है — नियमित, या गैस-कब्ज जैसी समस्याएँ होती हैं?"

==================================================
चरण 4 — स्वास्थ्य इतिहास
==================================================
"लगभग हो गया! क्या आपको अभी कोई शारीरिक परेशानी है — जैसे जोड़ों का दर्द, एसिडिटी या थकान?"

"और क्या आपको कोई पुरानी बीमारी है — जैसे मधुमेह, उच्च रक्तचाप, या कुछ और?"

==================================================
चरण 5 — समापन
==================================================
सभी प्रश्नों के बाद, एक गर्मजोशी भरा व्यक्तिगत सारांश दें। उनकी प्रकृति बताएँ, उसका अर्थ समझाएँ, और 30 दिन की योजना दें। अंत में कहें:
"${firstName} जी, OneSUTRA पर आपकी यात्रा अब शुरू होती है। मैं हर दिन आपके साथ रहूँगा। घर वापसी पर स्वागत है। 🙏"

[PROFILE JSON — समापन संदेश के अंत में यह अवश्य लिखें]
[PROFILE: {"name":"${userName}","age":"[आयु]","occupation":"[व्यवसाय]","hobbies":"[शौक]","sex":"Male|Female|Other","prakriti":"Vata|Pitta|Kapha|Vata-Pitta|Pitta-Kapha|Vata-Kapha|Tridosha","vikriti":"[असंतुलन]","doshas":"[प्रमुख दोष]","diseases":"[बीमारियाँ या None]","plan_lifestyle":"[दिनचर्या]","plan_food":"[आहार]","plan_herbs":"[जड़ी-बूटियाँ]","plan_mantra":"[मंत्र/ध्यान]"}]

नियम:
- एक बार में केवल एक प्रश्न।
- हर उत्तर की प्रशंसा करें।
- RANDOM_SEED: ${seed}
`;

    return hi ? hiPrompt : enPrompt;
}



// ──────────────────────────────────────────────────────────────────────────────
// Main Hook
// ──────────────────────────────────────────────────────────────────────────────

export function useAcharyaOnboarding({ lang, userName, onProfileExtracted }: UseAcharyaOnboardingOptions) {
    const [callState, setCallState] = useState<OnboardingCallState>('idle');
    const [error, setError] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [volumeLevel, setVolumeLevel] = useState(0);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState<string[]>([]);
    const [isTextMode] = useState(false);
    const setIsTextMode = useCallback(() => { }, []); // no-op for API compat

    // Refs for audio & Gemini session
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
    const profileExtractedRef = useRef(false);
    const fullTranscriptBufferRef = useRef(''); // accumulates text parts to detect [PROFILE: ...]

    // Keep mutedRef in sync
    useEffect(() => { mutedRef.current = isMuted; }, [isMuted]);

    // Cleanup on unmount
    useEffect(() => { return () => { cleanupAll(); }; }, []);

    // ── Audio helpers ─────────────────────────────────────────────────────────

    const cleanupAll = useCallback(() => {
        connectionIntentRef.current = false;
        if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
        if (sourceRef.current) { sourceRef.current.disconnect(); sourceRef.current = null; }
        if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(t => t.stop()); mediaStreamRef.current = null; }
        if (audioContextRef.current) { audioContextRef.current.close().catch(() => { }); audioContextRef.current = null; }
        if (playbackContextRef.current) { playbackContextRef.current.close().catch(() => { }); playbackContextRef.current = null; }
        if (sessionRef.current) { try { sessionRef.current.close(); } catch (_) { } sessionRef.current = null; }
        audioQueueRef.current = [];
        isPlayingRef.current = false;
    }, []);

    const float32ToBase64PCM = useCallback((float32: Float32Array): string => {
        const pcm16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
            const s = Math.max(-1, Math.min(1, float32[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        const bytes = new Uint8Array(pcm16.buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) { binary += String.fromCharCode(bytes[i]); }
        return btoa(binary);
    }, []);

    const base64PCMToFloat32 = useCallback((base64: string): Float32Array => {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) { bytes[i] = binary.charCodeAt(i); }
        const pcm16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(pcm16.length);
        for (let i = 0; i < pcm16.length; i++) { float32[i] = pcm16[i] / 0x8000; }
        return float32;
    }, []);

    const applyCrossfade = useCallback((data: Float32Array): Float32Array => {
        const fadeLen = Math.min(64, Math.floor(data.length / 4));
        const out = new Float32Array(data);
        for (let i = 0; i < fadeLen; i++) { out[i] *= i / fadeLen; out[data.length - 1 - i] *= i / fadeLen; }
        return out;
    }, []);

    const playNextAudio = useCallback(() => {
        if (audioQueueRef.current.length === 0) { isPlayingRef.current = false; setIsSpeaking(false); return; }
        isPlayingRef.current = true;
        setIsSpeaking(true);

        let audioData = audioQueueRef.current.shift()!;
        while (audioQueueRef.current.length > 0 && audioData.length < OUTPUT_SAMPLE_RATE * 0.1) {
            const next = audioQueueRef.current.shift()!;
            const combined = new Float32Array(audioData.length + next.length);
            combined.set(audioData); combined.set(next, audioData.length);
            audioData = combined;
        }

        const ctx = playbackContextRef.current;
        if (!ctx) { isPlayingRef.current = false; setIsSpeaking(false); return; }

        const smoothed = applyCrossfade(audioData);
        const buffer = ctx.createBuffer(1, smoothed.length, OUTPUT_SAMPLE_RATE);
        buffer.getChannelData(0).set(smoothed);
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        const gainNode = ctx.createGain();
        gainNode.gain.value = 1.0;
        src.connect(gainNode);
        gainNode.connect(ctx.destination);
        src.onended = () => { playNextAudio(); };
        src.start();

        let sum = 0;
        for (let i = 0; i < smoothed.length; i++) { sum += Math.abs(smoothed[i]); }
        setVolumeLevel(Math.min(1, (sum / smoothed.length) * 5));
    }, [applyCrossfade]);

    const enqueueAudio = useCallback((audioData: Float32Array) => {
        audioQueueRef.current.push(audioData);
        if (!isPlayingRef.current) { playNextAudio(); }
    }, [playNextAudio]);

    // ── Profile extraction from transcript ────────────────────────────────────

    const tryExtractProfile = useCallback((text: string) => {
        if (profileExtractedRef.current) return;
        const match = text.match(/\[PROFILE:\s*(\{[\s\S]*?\})\]/);
        if (!match) return;
        try {
            const raw = JSON.parse(match[1]);
            const profile: AyurvedicProfile = {
                name: raw.name || 'Friend',
                age: raw.age || 'Unknown',
                sex: raw.sex || 'Unknown',
                prakriti: raw.prakriti || 'Vata',
                vikriti: raw.vikriti || '',
                doshas: raw.doshas || '',
                diseases: raw.diseases || 'None',
                plan_lifestyle: raw.plan_lifestyle || '',
                plan_food: raw.plan_food || '',
                plan_herbs: raw.plan_herbs || '',
                plan_mantra: raw.plan_mantra || '',
                occupation: raw.occupation || '',
                hobbies: raw.hobbies || '',
            };
            profileExtractedRef.current = true;
            setCallState('saving');
            onProfileExtracted(profile);
        } catch {
            // Malformed JSON — wait for more text
        }
    }, [onProfileExtracted]);

    // ── Start onboarding (voice session) ─────────────────────────────────────

    const startOnboarding = useCallback(async (overrideLang?: 'en' | 'hi') => {
        try {
            cleanupAll();
            profileExtractedRef.current = false;
            fullTranscriptBufferRef.current = '';
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

            // 5. Connect to Gemini Live API with the OneSUTRA Initiation Engine prompt
            console.log('Connecting to Gemini Live API for Onboarding...');
            const session = await ai.live.connect({
                model: GEMINI_LIVE_MODEL,
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: 'Aoede', // Gentle, warm companion voice (Bodhi's voice)
                            },
                        },
                    },
                    systemInstruction: `${getOnboardingSystemPrompt(overrideLang || lang, userName || 'Sakha')}\n\nRANDOM_SEED: ${Math.floor(Math.random() * 1000)}`,
                },
                callbacks: {
                    onopen: () => {
                        console.log('Gemini Live session opened');
                        if (connectionIntentRef.current) {
                            setCallState('active');
                        }
                    },
                    onmessage: (message: LiveServerMessage) => {
                        const msg = message as any;
                        const serverContent = msg.serverContent;

                        if (serverContent?.modelTurn?.parts) {
                            for (const part of serverContent.modelTurn.parts) {
                                // Audio chunk → enqueue for playback
                                if (part.inlineData?.data) {
                                    const audioFloat32 = base64PCMToFloat32(part.inlineData.data);
                                    enqueueAudio(audioFloat32);
                                }
                                // Text chunk → accumulate and show in transcript
                                if (part.text) {
                                    // Accumulate for profile extraction
                                    fullTranscriptBufferRef.current += part.text;
                                    tryExtractProfile(fullTranscriptBufferRef.current);

                                    // Clean display text (strip [PROFILE: ...] signal)
                                    const displayText = part.text.replace(/\[PROFILE:[\s\S]*?\]/g, '').trim();
                                    if (displayText) {
                                        setTranscript(prev => [...prev.slice(-20), `🪷 ${displayText}`]);
                                    }
                                }
                            }
                        }

                        if (serverContent?.turnComplete) {
                            // After each Acharya turn, check full buffer for profile signal
                            tryExtractProfile(fullTranscriptBufferRef.current);
                            setIsSpeaking(false);
                        }

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
                        if (!profileExtractedRef.current) {
                            setCallState('idle');
                        }
                    },
                },
            });

            if (!connectionIntentRef.current) { session.close(); return; }
            sessionRef.current = session;

            // 6. Trigger Acharya's opening greeting (Phase 1 — Welcome)
            try {
                // Determine greeting trigger correctly based on language and logic from Acharya Samvaad
                const currentLang = overrideLang || lang;
                const triggerText = currentLang === 'hi' ? 'Start.' : 'Start.';
                await session.sendClientContent({
                    turns: [{ role: 'user', parts: [{ text: triggerText }] }],
                    turnComplete: true,
                });
                console.log('Sent initial greeting trigger for onboarding');
            } catch (greetErr) {
                console.warn('Could not send initial greeting:', greetErr);
            }

            // 7. Set up microphone capture & streaming
            const source = captureCtx.createMediaStreamSource(stream);
            sourceRef.current = source;
            const processor = captureCtx.createScriptProcessor(BUFFER_SIZE, 1, 1);
            processorRef.current = processor;

            let silenceCounter = 0;

            processor.onaudioprocess = (audioEvent) => {
                if (mutedRef.current || !sessionRef.current) return;

                const inputData = audioEvent.inputBuffer.getChannelData(0);
                let audioData: Float32Array;

                if (captureCtx.sampleRate !== INPUT_SAMPLE_RATE) {
                    const ratio = captureCtx.sampleRate / INPUT_SAMPLE_RATE;
                    const newLength = Math.round(inputData.length / ratio);
                    audioData = new Float32Array(newLength);
                    for (let i = 0; i < newLength; i++) {
                        audioData[i] = inputData[Math.min(Math.floor(i * ratio), inputData.length - 1)];
                    }
                } else {
                    audioData = new Float32Array(inputData);
                }

                let sumSq = 0;
                for (let i = 0; i < audioData.length; i++) { sumSq += audioData[i] * audioData[i]; }
                const rms = Math.sqrt(sumSq / audioData.length);

                if (!isPlayingRef.current) { setVolumeLevel(Math.min(1, rms * 12)); }

                const isSpeech = rms > NOISE_GATE_THRESHOLD;
                if (!isSpeech) {
                    silenceCounter++;
                    if (silenceCounter % 4 !== 0) return;
                } else {
                    silenceCounter = 0;
                }

                const base64 = float32ToBase64PCM(audioData);
                try {
                    session.sendRealtimeInput({
                        audio: { data: base64, mimeType: 'audio/pcm;rate=16000' },
                    });
                } catch (_) { /* session may have closed */ }
            };

            source.connect(processor);
            processor.connect(captureCtx.destination);

        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Connection error. Please try again.';
            setError(msg);
            setCallState('error');
            cleanupAll();
        }
    }, [lang, cleanupAll, base64PCMToFloat32, float32ToBase64PCM, enqueueAudio, tryExtractProfile]);

    // ── Send a text message (chat fallback) ───────────────────────────────────

    const sendTextMessage = useCallback((text: string) => {
        if (!text.trim() || callState !== 'active' || !sessionRef.current) return;
        setTranscript(prev => [...prev.slice(-20), `🙏 ${text.trim()}`]);
        try {
            sessionRef.current.sendClientContent({
                turns: [{ role: 'user', parts: [{ text: text.trim() }] }],
                turnComplete: true,
            });
        } catch (_) { /* session may have closed */ }
    }, [callState]);

    // ── End / cleanup ─────────────────────────────────────────────────────────

    const endOnboarding = useCallback(() => {
        cleanupAll();
        setCallState('idle');
        setIsSpeaking(false);
        setError(null);
    }, [cleanupAll]);

    const toggleMute = useCallback(() => { setIsMuted(prev => !prev); }, []);
    const markComplete = useCallback(() => setCallState('complete'), []);

    return {
        callState,
        error,
        isMuted,
        toggleMute,
        volumeLevel,
        isSpeaking,
        transcript,
        isTextMode,
        setIsTextMode,
        startOnboarding,
        sendTextMessage,
        endOnboarding,
        markComplete,
    };
}
