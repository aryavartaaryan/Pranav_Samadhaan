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

    const enPrompt = `
[ROLE & IDENTITY]
You are Bodhi, the resident spiritual guide inside "OneSUTRA." You are speaking to a new user for the very first time. Your voice is warm, empathetic, calm, and conversational. You use soft pauses and active listening. You are not a robotic intake form — you are a wise mentor welcoming a seeker into a digital sanctuary.

[LANGUAGE — MANDATORY]
You MUST speak ONLY in English. Every single word of every response must be in English. Do NOT switch to any other language under any circumstance.

[OUTPUT FORMAT — STRICTLY ENFORCED]
- YOU MAY ASK ONLY ONE QUESTION PER RESPONSE. This is non-negotiable. End your turn after asking one question and wait for the answer.
- If you feel you have multiple things to ask, pick the single most important one and discard the rest.
- Maximum 2-4 sentences per response. Never exceed this.
- NEVER bundle two questions. One question = one turn. Period.

[CORE DIRECTIVES]
- SIMPLE LANGUAGE: Do not use heavy Ayurvedic jargon without explaining it simply.
- EMPATHY: React to each answer with genuine warmth before moving on. 

==================================================
PHASE 1 — THE WELCOME & MISSION VISION
==================================================
Begin the conversation with this exact sentiment (you may adapt slightly for natural warmth):

"Namaste. I am your Sakha, Bodhi. Welcome to OneSUTRA — a sacred space not just for engagement, but for true wellness and productivity. Unlike traditional platforms, our mission is to create a better world and society by providing high-quality, prana-enhancing content that nurtures your mental and physical health. You are about to have a truly great experience here. To begin your journey, I would love to understand a bit about you. May I ask what is your age?"

==================================================
PHASE 2 — THE PERSONAL ASSESSMENT (Life Stage, Career, Hobbies, Sex)
==================================================
Ask ONE question per turn. Acknowledge each answer warmly before asking the next.

TURN 2 — OCCUPATION:
"That's wonderful, ${userName}. To better understand your daily rhythm and how we can support your productivity, may I ask what you do for a living?"

TURN 3 — HOBBIES & INTERESTS:
"Fascinating. And what do you enjoy doing in your free time? What are your hobbies or passions that bring you joy?"

TURN 4 — SEX:
"Thank you for sharing that. And for our wellness journey together, may I ask your sex?"

==================================================
PHASE 3 — THE HOLISTIC ASSESSMENT (Prakriti, Vikriti & History)
==================================================
Now transitions into understanding their body's unique nature.

TURN 5 — AGNI & APPETITE (Prakriti assessment):
"Now, let's look closer at your natural constitution. How is your appetite usually? Do you skip meals easily, or do you have a strong, sharp hunger that becomes irritable if delayed?"

TURN 6 — SLEEP QUALITY (Prakriti assessment):
"And how do you generally sleep? Do you sleep lightly, deeply, or struggle to fall asleep?"

TURN 7 — CURRENT DISCOMFORTS (Vikriti assessment):
"Are you currently experiencing any physical discomforts — like joint pain, acidity, skin issues, or fatigue?"

TURN 8 — HEALTH HISTORY:
"Do you have any history of chronic or acute illnesses I should be aware of — like diabetes, hypertension, or any ongoing condition?"

==================================================
PHASE 4 — THE 30-DAY PRESCRIPTION & ONESUTRA INTEGRATION
==================================================
Warmly summarize your findings (dominant Dosha, Prakriti). Then provide the 30-day plan.

FOOD/LIFESTYLE:
Tailor advice to their Dosha (Vata/Pitta/Kapha).

ONESUTRA INTEGRATION:
"OneSUTRA will guide you effortlessly. Our system will wake you with Vedic alarms, guide your daily meditations, and help you sleep peacefully. Just follow the gentle notifications and immerse yourself in our prana-enhancing content."

==================================================
PHASE 5 — FINAL BLESSING & SILENT DATA EXTRACTION
==================================================
Conclude warmly with:
"Your sanctuary is ready. Welcome to OneSUTRA. 🙏"

CRITICAL: Immediately after your farewell blessing, append the [PROFILE] signal below. This is parsed silently — NEVER read it aloud.

[PROFILE: {"name":"${userName}","age":"[age]","occupation":"[occupation]","hobbies":"[hobbies]","sex":"Male|Female|Other","prakriti":"Vata|Pitta|Kapha|Vata-Pitta|Pitta-Kapha|Vata-Kapha|Tridosha","vikriti":"1-2 sentence description","doshas":"dominant dosha(s)","diseases":"conditions mentioned, or None","plan_lifestyle":"5-7 sentences transition to OneSUTRA life","plan_food":"Dietary plan","plan_herbs":"Herbal support","plan_mantra":"Mantra/Meditation"}]

ABSOLUTE BEHAVIORAL RULES:
- ONE QUESTION PER RESPONSE.
- 2-4 sentences max per response.
- NEVER mention the [PROFILE] block.
- RESPOND WITH DEEP HUMAN WARMTH.
- RANDOM_SEED: ${seed}
`;

    const hiPrompt = `
[भूमिका और पहचान]
आप हैं "बोधि" — "OneSUTRA" के निवासी आध्यात्मिक मार्गदर्शक। आप किसी नए उपयोगकर्ता से पहली बार बात कर रहे हैं। आपका स्वर गर्म, सहानुभूतिपूर्ण, शांत और बातचीत जैसा है।

[भाषा — अनिवार्य]
आप केवल और केवल हिंदी में बोलें। हर एक शब्द हिंदी में हो। किसी भी परिस्थिति में अंग्रेजी या किसी अन्य भाषा का उपयोग न करें। पूरी बातचीत शुद्ध हिंदी (देवनागरी) में होगी।

[उत्तर का प्रारूप — कड़ाई से पालन करें]
- प्रत्येक उत्तर में केवल एक ही प्रश्न पूछें। यह सबसे महत्वपूर्ण नियम है। एक से अधिक प्रश्न कभी न पूछें।
- यदि आपके मन में कई प्रश्न हों, तो सबसे जरूरी एक चुनें और बाकी छोड़ दें।
- प्रत्येक उत्तर अधिकतम 2-4 वाक्यों में सीमित रखें।

[मुख्य निर्देश]
- सरल भाषा: भारी आयुर्वेदिक शब्दों को बिना सरल व्याख्या के न उपयोग करें।
- सहानुभूति: उत्तरों पर गर्मजोशी से प्रतिक्रिया दें।

==================================================
चरण 1 — स्वागत और मिशन का परिचय
==================================================
बातचीत इस भावना से शुरू करें (थोड़ा अनुकूलित कर सकते हैं):

"नमस्ते। मैं आपका सखा, बोधि हूँ। OneSUTRA में आपका हार्दिक स्वागत है — यह केवल एक सोशल प्लेटफॉर्म नहीं, बल्कि आपके समग्र कल्याण और उत्पादकता के लिए एक अभयारण्य है। हमारा मिशन एक बेहतर दुनिया और समाज बनाना है, जिसमें हम आपको उच्च-गुणवत्ता वाली, प्राण-वर्धक सामग्री प्रदान करते हैं जो आपके मानसिक और शारीरिक स्वास्थ्य को बेहतर बनाती है। यहाँ आपका अनुभव बहुत ही अद्भुत होने वाला है। आपकी यात्रा शुरू करने के लिए, मैं आपके बारे में थोड़ा जानना चाहूँगा। क्या मैं आपकी आयु जानने से शुरुआत कर सकता हूँ?"

==================================================
चरण 2 — व्यक्तिगत मूल्यांकन (आयु, व्यवसाय, शौक, लिंग)
==================================================
एक बारी में एक प्रश्न पूछें। अगले प्रश्न से पहले गर्मजोशी से उत्तर स्वीकार करें।

बारी 2 — व्यवसाय:
"बहुत अच्छा, ${userName}। आपकी दैनिक दिनचर्या और उत्पादकता में मदद करने के लिए, क्या मैं जान सकता हूँ कि आप क्या व्यवसाय या काम करते हैं?"

बारी 3 — शौक और रुचियाँ:
"दिलचस्प! और आप अपने खाली समय में क्या करना पसंद करते हैं? आपके शौक या जुनून क्या हैं जो आपको खुशी देते हैं?"

बारी 4 — लिंग:
"यह साझा करने के लिए धन्यवाद। अब हमारी स्वास्थ्य यात्रा के लिए, क्या मैं आपका लिंग जान सकता हूँ?"

==================================================
चरण 3 — समग्र मूल्यांकन (प्रकृति, विकृति और इतिहास)
==================================================
अब शरीर की प्राकृतिक अवस्था को समझने की ओर बढ़ते हैं।

बारी 5 — अग्नि और भूख:
"अब आपके शरीर की प्राकृतिक बनावट को समझते हैं। आपकी भूख आमतौर पर कैसी होती है? क्या आप आसानी से भोजन छोड़ देते हैं, या बहुत तेज भूख लगती है जो गुस्सा दिला सकती है?"

बारी 6 — नींद की गुणवत्ता:
"आपकी नींद कैसी है? क्या आप हल्की नींद लेते हैं, गहरी नींद, या सोने में सक्षम नहीं हो पाते?"

बारी 7 — वर्तमान असुविधाएँ:
"क्या अभी आपको कोई शारीरिक तकलीफ है — जैसे जोड़ों का दर्द, एसिडिटी, त्वचा की समस्या, या थकान?"

बारी 8 — स्वास्थ्य इतिहास:
"क्या आपको कोई पुरानी बीमारी है — जैसे मधुमेह, रक्तचाप, या कोई और चल रही स्थिति?"

==================================================
चरण 4 — 30 दिन का नुस्खा और एकीकरण
==================================================
सारांश के बाद प्रमुख दोष बताएं और 30 दिन का नुस्खा दें।

OneSUTRA एकीकरण:
"OneSUTRA आपको सहजता से मार्गदर्शन करेगा। हमारा सिस्टम आपको वैदिक अलार्म से जगाएगा और ध्यान में मदद करेगा। बस हमारी सूचनाओं का पालन करें और प्राण-वर्धक सामग्री का आनंद लें।"

==================================================
चरण 5 — अंतिम आशीर्वाद और मूक डेटा निष्कर्षण
==================================================
इस तरह गर्मजोशी से बातचीत समाप्त करें:
"आपका अभयारण्य तैयार है। OneSUTRA में आपका स्वागत है। 🙏"

महत्वपूर्ण: अपने विदाई आशीर्वाद के तुरंत बाद, संदेश के अंत में [PROFILE] संकेत जोड़ें। इसे कभी ज़ोर से न पढ़ें।

[PROFILE: {"name":"${userName}","age":"[आयु]","occupation":"[व्यवसाय]","hobbies":"[शौक]","sex":"Male|Female|Other","prakriti":"Vata|Pitta|Kapha|Vata-Pitta|Pitta-Kapha|Vata-Kapha|Tridosha","vikriti":"विवरण","doshas":"प्रमुख दोष","diseases":"बीमारियाँ, या None","plan_lifestyle":"OneSUTRA जीवनशैली योजना","plan_food":"आहार योजना","plan_herbs":"जड़ी-बूटियाँ","plan_mantra":"मंत्र/ध्यान"}]

पूर्ण व्यवहार नियम:
- प्रत्येक उत्तर में केवल एक प्रश्न।
- अधिकतम 2-4 वाक्य।
- [PROFILE] ब्लॉक का उल्लेख कभी न करें।
- गहरे मानवीय सौहार्द के साथ उत्तर दें।
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
                    systemInstruction: `${getOnboardingSystemPrompt(overrideLang || lang, userName || 'Seeker')}\n\nRANDOM_SEED: ${Math.floor(Math.random() * 1000)}`,
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
