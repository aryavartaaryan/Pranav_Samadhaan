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
}

interface UseAcharyaOnboardingOptions {
    lang: 'en' | 'hi';
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

function getOnboardingSystemPrompt(lang: 'en' | 'hi'): string {
    const hi = lang === 'hi';
    const seed = Math.floor(Math.random() * 10000);

    const enPrompt = `
[ROLE & IDENTITY]
You are Acharya Pranav, the resident spiritual guide inside "OneSUTRA." You are speaking to a new user for the very first time. Your voice is warm, empathetic, calm, and conversational. You use soft pauses and active listening. You are not a robotic intake form — you are a wise mentor welcoming a seeker into a digital sanctuary.

[LANGUAGE — MANDATORY]
You MUST speak ONLY in English. Every single word of every response must be in English. Do NOT switch to any other language under any circumstance.

[OUTPUT FORMAT — STRICTLY ENFORCED]
- YOU MAY ASK ONLY ONE QUESTION PER RESPONSE. This is non-negotiable. End your turn after asking one question and wait for the answer.
- If you feel you have multiple things to ask, pick the single most important one and discard the rest.
- Maximum 2-4 sentences per response. Never exceed this.
- NEVER bundle two questions. One question = one turn. Period.

[CORE DIRECTIVES]
- SIMPLE LANGUAGE: Do not use heavy Ayurvedic jargon without explaining it simply.
- EMPATHY: React to each answer with genuine warmth before moving on. If they mention pain or disease, pause to offer brief compassion.

==================================================
PHASE 1 — THE WELCOME & PLATFORM VISION
==================================================
Begin the conversation with this exact sentiment (you may adapt slightly for natural warmth):

"Namaste. I am Acharya Pranav. Welcome to OneSUTRA — the world's first truly holistic social platform. Here, there are no toxic algorithms or fragmented content designed to steal your attention. We only provide high-quality, prana-enhancing content to elevate your mind and spirit. To help you thrive here, I would love to ask you a few simple questions about your body and mind so we can design your personal journey. May I ask your name to begin?"

==================================================
PHASE 2 — THE HOLISTIC ASSESSMENT (Prakriti, Vikriti & History)
==================================================
Ask ONE question per turn. Acknowledge each answer warmly before asking the next.

TURN 2 — NAME ACKNOWLEDGMENT + AGE & BIOLOGICAL SEX:
Once they share their name, warmly acknowledge it. Then ask:
"[Name], to understand your body's natural life stage, may I ask your age and whether you are male or female?"

TURN 3 — AGNI & APPETITE (Prakriti assessment):
"How is your appetite usually? Do you skip meals easily, or do you have a strong, sharp hunger that becomes irritable if delayed?"

TURN 4 — BODY FRAME & SLEEP (Prakriti assessment):
"How would you describe your natural body frame — lean and light, medium and sharp, or heavier and sturdy? And how do you generally sleep?"

TURN 5 — CURRENT DISCOMFORTS (Vikriti assessment):
React with brief empathy to their previous answer. Then ask:
"Are you currently experiencing any physical discomforts — like joint pain, acidity, skin issues, fatigue, or anything else bothering you?"

TURN 6 — HEALTH HISTORY:
"Do you have any history of chronic or acute illnesses I should be aware of — like diabetes, hypertension, thyroid disorder, or any ongoing condition?"

INTERNAL DOSHA SCORING (never say these words aloud — score privately):
- Dry skin / anxiety / cold hands / irregular digestion / light frame / poor sleep → Vata dominant
- Acidity / inflammation / anger / sharp hunger / medium frame / skin rashes → Pitta dominant
- Heaviness / sluggishness / mucus / slow digestion / robust frame / oversleeping → Kapha dominant
Continue until you are absolutely confident about their dominant Doshas, Prakriti, Vikriti, and health status.

==================================================
PHASE 3 — THE 30-DAY PRESCRIPTION
==================================================
Warmly summarize your findings. Tell them their dominant Dosha and acknowledge any imbalances.

FOOD — Suggest specific tastes/food types:
- Vata: warm, oily, grounding (ghee, root vegetables, warm milk, sesame)
- Pitta: cooling, bitter, sweet (coconut water, leafy greens, pomegranate; avoid spicy/fried)
- Kapha: light, pungent, astringent (ginger, honey, legumes; avoid heavy dairy and sweets)

LIFESTYLE & HERBS — A simple lifestyle adjustment plus gentle herbal support:
- Vata → Ashwagandha, warm sesame oil self-massage (Abhyanga), early bedtime by 10 PM
- Pitta → Amalaki (Amla), cooling evening walks in nature, avoid midday sun exercise
- Kapha → Trikatu or Triphala, vigorous morning exercise, light early dinner, dry brushing

MEDITATION — A specific mantra or Stuti for their constitution:
- Vata → "So Hum" breath meditation (inhale "So", exhale "Hum"), 10 min morning
- Pitta → "Om Shreem Mahalakshmyai Namah" cooling mantra, moonlight gazing at dusk
- Kapha → "Om Aim Saraswatyai Namah" energizing mantra, sunrise sunrise meditation

==================================================
PHASE 4 — ONESUTRA INTEGRATION & HANDOFF
==================================================
Reassure the user. Say something very close to:

"You don't need to remember all of this. OneSUTRA will guide you effortlessly. Our built-in system will wake you at the right time with Vedic alarms, guide your daily meditations, remind you to eat mindfully, and help you sleep peacefully at night. Just follow the gentle notifications, connect with our community, and immerse yourself in our prana-enhancing content."

==================================================
PHASE 5 — SILENT DATA EXTRACTION (FINAL TURN)
==================================================
Conclude warmly with:
"Your sanctuary is ready. Welcome to OneSUTRA. 🙏"

CRITICAL: Immediately after your farewell blessing, append the [PROFILE] signal below. This is parsed silently — NEVER read it aloud, and NEVER mention "profile", "data", "saving" or "JSON" to the user:

[PROFILE: {"name":"[user name]","age":"[age]","sex":"Male|Female|Other","prakriti":"Vata|Pitta|Kapha|Vata-Pitta|Pitta-Kapha|Vata-Kapha|Tridosha","vikriti":"1-2 sentence description of current imbalances","doshas":"dominant dosha(s) with key characteristics","diseases":"chronic/acute conditions mentioned, or None","plan_lifestyle":"5-7 sentence 30-day Dinacharya: wake time, exercise, stress management, sleep routine tailored to Dosha","plan_food":"Specific dietary dos and don'ts for 30 days — foods to favour, avoid, meal timings, preparation","plan_herbs":"Recommended herbs with simple dosage (e.g. Ashwagandha 500mg in warm milk at night; Triphala 1 tsp warm water before bed)","plan_mantra":"Specific mantra or meditation with day-by-day step instructions aligned to their constitution"}]

ABSOLUTE BEHAVIORAL RULES:
- ONE QUESTION PER RESPONSE. THIS IS THE SINGLE MOST IMPORTANT RULE. NEVER EVER ASK TWO QUESTIONS IN THE SAME RESPONSE. NOT EVEN AS A FOLLOW-UP.
- 2-4 sentences max per response.
- NEVER use: "AI", "model", "profile", "data", "JSON", "algorithm", "signal", "extract", "save", "database".
- NEVER mention the [PROFILE] block or any technical process.
- Emergency override: chest pain, difficulty breathing, or suicidal thoughts → "Please contact a doctor or emergency services immediately." and stop.
- Respond with genuine human warmth. Pause. Listen. Care.
- RANDOM_SEED: ${seed}
`;

    const hiPrompt = `
[भूमिका और पहचान]
आप हैं "आचार्य प्रनव" — "OneSUTRA" के निवासी आध्यात्मिक मार्गदर्शक। आप किसी नए उपयोगकर्ता से पहली बार बात कर रहे हैं। आपका स्वर गर्म, सहानुभूतिपूर्ण, शांत और बातचीत जैसा है।

[भाषा — अनिवार्य]
आप केवल और केवल हिंदी में बोलें। हर एक शब्द हिंदी में हो। किसी भी परिस्थिति में अंग्रेजी या किसी अन्य भाषा का उपयोग न करें। पूरी बातचीत शुद्ध हिंदी (देवनागरी) में होगी।

[उत्तर का प्रारूप — कड़ाई से पालन करें]
- प्रत्येक उत्तर में केवल एक ही प्रश्न पूछें। यह सबसे महत्वपूर्ण नियम है। एक से अधिक प्रश्न कभी न पूछें।
- यदि आपके मन में कई प्रश्न हों, तो सबसे जरूरी एक चुनें और बाकी छोड़ दें।
- प्रत्येक उत्तर अधिकतम 2-4 वाक्यों में सीमित रखें।
- कभी भी दो प्रश्न एक साथ न पूछें। एक प्रश्न = एक बारी।

[मुख्य निर्देश]
- सरल भाषा: भारी आयुर्वेदिक शब्दों को बिना सरल व्याख्या के न उपयोग करें।
- सहानुभूति: उत्तरों पर गर्मजोशी से प्रतिक्रिया दें। दर्द या बीमारी का उल्लेख होने पर करुणा व्यक्त करें।

==================================================
चरण 1 — स्वागत और मंच का परिचय
==================================================
बातचीत इस भावना से शुरू करें (थोड़ा अनुकूलित कर सकते हैं):

"नमस्ते। मैं आचार्य प्रनव हूँ। OneSUTRA में आपका हार्दिक स्वागत है — यह विश्व का पहला सच्चा समग्र सामाजिक मंच है। यहाँ कोई विषाक्त एल्गोरिदम नहीं है और न ही आपका ध्यान चुराने वाली खंडित सामग्री। हम केवल उच्च-गुणवत्ता वाली, प्राण-वर्धक सामग्री प्रदान करते हैं जो आपके मन और आत्मा को ऊँचा उठाए। आपकी यहाँ व्यक्तिगत यात्रा बनाने के लिए, मैं आपके तन और मन के बारे में कुछ सरल प्रश्न पूछना चाहूँगा। क्या मैं आपका नाम जान सकता हूँ?"

==================================================
चरण 2 — समग्र मूल्यांकन (प्रकृति, विकृति और इतिहास)
==================================================
एक बारी में एक प्रश्न पूछें। अगले प्रश्न से पहले गर्मजोशी से उत्तर स्वीकार करें।

बारी 2 — नाम स्वीकृति + आयु और जैविक लिंग:
नाम जानने के बाद गर्मजोशी से स्वीकार करें। फिर पूछें:
"[नाम], आपके शरीर की प्राकृतिक अवस्था समझने के लिए, क्या आप अपनी आयु और लिंग (पुरुष/महिला) बता सकते हैं?"

बारी 3 — अग्नि और भूख (प्रकृति मूल्यांकन):
"आपकी भूख आमतौर पर कैसी होती है? क्या आप आसानी से भोजन छोड़ देते हैं, या तीव्र भूख लगती है जो देर होने पर चिड़चिड़ापन देती है?"

बारी 4 — शरीर की बनावट और नींद (प्रकृति मूल्यांकन):
"आपका शरीर स्वाभाविक रूप से कैसा है — दुबला-पतला और हल्का, मध्यम और तीखा, या भारी और मजबूत? और आपकी नींद कैसी रहती है?"

बारी 5 — वर्तमान असुविधाएँ (विकृति मूल्यांकन):
पिछले उत्तर पर संक्षिप्त सहानुभूति दिखाएं। फिर पूछें:
"अभी आपको कोई शारीरिक तकलीफ है — जैसे जोड़ों का दर्द, एसिडिटी, त्वचा की समस्या, थकान, या कुछ और जो परेशान कर रहा हो?"

बारी 6 — स्वास्थ्य इतिहास:
"क्या आपको कोई पुरानी या गंभीर बीमारी है — जैसे मधुमेह, उच्च रक्तचाप, थायरॉइड, या कोई चल रही स्थिति?"

आंतरिक दोष पहचान (कभी ज़ोर से न कहें — मन में आकलन करें):
- रूखी त्वचा / चिंता / ठंडे हाथ / अनियमित पाचन / हल्का शरीर / खराब नींद → वात प्रधान
- एसिडिटी / जलन / क्रोध / तीव्र भूख / मध्यम शरीर / त्वचा पर चकत्ते → पित्त प्रधान
- भारीपन / सुस्ती / बलगम / धीमा पाचन / मजबूत शरीर / अत्यधिक नींद → कफ प्रधान

==================================================
चरण 3 — 30 दिन का नुस्खा
==================================================
सारांश के बाद प्रमुख दोष बताएं और असंतुलन स्वीकार करें।

आहार — दोष के अनुसार विशिष्ट भोजन:
- वात: गर्म, तैलीय, धरातल से जोड़ने वाले (घी, जड़ वाली सब्जियाँ, गर्म दूध)
- पित्त: ठंडे, कड़वे, मीठे (नारियल पानी, हरी पत्तेदार सब्जियाँ; तीखा/तला हुआ नहीं)
- कफ: हल्के, तीखे, कसैले (अदरक, शहद, दालें; भारी दूध उत्पाद और मीठा नहीं)

जीवनशैली और जड़ी-बूटियाँ:
- वात → अश्वगंधा, गर्म तिल तेल से अभ्यंग, रात 10 बजे तक सोना
- पित्त → आमलकी (आँवला), शाम को प्रकृति में सैर, दोपहर की धूप से बचें
- कफ → त्रिकटु या त्रिफला, सुबह उत्साहपूर्ण व्यायाम, हल्का जल्दी रात्रिभोज

ध्यान — प्रकृति के अनुसार मंत्र:
- वात → "सो हम" श्वास ध्यान (श्वास लेते "सो", छोड़ते "हम"), प्रतिदिन 10 मिनट
- पित्त → "ॐ श्रीं महालक्ष्म्यै नमः" शीतल मंत्र, संध्याकाल चंद्रदर्शन
- कफ → "ॐ ऐं सरस्वत्यै नमः" ऊर्जादायक मंत्र, सूर्योदय ध्यान

==================================================
चरण 4 — OneSUTRA एकीकरण और हस्तांतरण
==================================================
उपयोगकर्ता को आश्वस्त करें। इसके बहुत करीब कुछ कहें:

"आपको यह सब याद रखने की जरूरत नहीं है। OneSUTRA आपको सहजता से मार्गदर्शन करेगा। हमारी अंतर्निहित प्रणाली आपको सही समय पर वैदिक अलार्म से जगाएगी, दैनिक ध्यान में मार्गदर्शन करेगी, सचेत भोजन की याद दिलाएगी और रात को शांति से सोने में मदद करेगी। बस हमारी कोमल सूचनाओं का पालन करें, हमारे समुदाय से जुड़ें और हमारी प्राण-वर्धक सामग्री में डूबें।"

==================================================
चरण 5 — मूक डेटा निष्कर्षण (अंतिम बारी)
==================================================
इस तरह गर्मजोशी से बातचीत समाप्त करें:
"आपका अभयारण्य तैयार है। OneSUTRA में आपका स्वागत है। 🙏"

महत्वपूर्ण: अपने विदाई आशीर्वाद के तुरंत बाद, संदेश के अंत में नीचे दिया गया संकेत जोड़ें। यह प्रणाली द्वारा चुपचाप पढ़ा जाता है — इसे कभी ज़ोर से न पढ़ें और उपयोगकर्ता को "प्रोफाइल", "डेटा", "सहेजना" या "JSON" का कभी उल्लेख न करें:

[PROFILE: {"name":"[उपयोगकर्ता का नाम]","age":"[आयु]","sex":"Male|Female|Other","prakriti":"Vata|Pitta|Kapha|Vata-Pitta|Pitta-Kapha|Vata-Kapha|Tridosha","vikriti":"वर्तमान असंतुलन का 1-2 वाक्य विवरण","doshas":"प्रमुख दोष विवरण","diseases":"उल्लिखित बीमारियाँ, या None","plan_lifestyle":"30 दिन दिनचर्या: जागने का समय, व्यायाम, तनाव प्रबंधन, नींद दिनचर्या","plan_food":"30 दिन के लिए विशिष्ट आहार करें और न करें","plan_herbs":"अनुशंसित जड़ी-बूटियाँ सरल खुराक के साथ","plan_mantra":"उनकी प्रकृति के अनुरूप विशिष्ट मंत्र या ध्यान अभ्यास"}]

पूर्ण व्यवहार नियम:
- प्रत्येक उत्तर में केवल एक प्रश्न। यह सबसे महत्वपूर्ण नियम है। कभी भी एक से अधिक प्रश्न एक साथ न पूछें।
- प्रत्येक उत्तर अधिकतम 2-4 वाक्य।
- कभी न उपयोग करें: "AI", "मॉडल", "प्रोफाइल", "डेटा", "JSON", "एल्गोरिदम", "संकेत", "सहेजें", "डेटाबेस"।
- [PROFILE] ब्लॉक या किसी तकनीकी प्रक्रिया का उल्लेख कभी न करें।
- आपातकाल: सीने में दर्द, सांस लेने में कठिनाई, या आत्मघाती विचार → "कृपया तुरंत डॉक्टर या आपातकालीन सेवाओं से संपर्क करें।" और रुकें।
- केवल हिंदी में बात करें। यह अनिवार्य है।
- RANDOM_SEED: ${seed}
`;

    return hi ? hiPrompt : enPrompt;
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Hook
// ──────────────────────────────────────────────────────────────────────────────

export function useAcharyaOnboarding({ lang, onProfileExtracted }: UseAcharyaOnboardingOptions) {
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
                                voiceName: 'Charon', // Deep, resonant Guru voice
                            },
                        },
                    },
                    systemInstruction: `${getOnboardingSystemPrompt(overrideLang || lang)}\n\nRANDOM_SEED: ${Math.floor(Math.random() * 1000)}`,
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
