'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, type Session, type LiveServerMessage } from '@google/genai';

export type RishiCallState = 'idle' | 'connecting' | 'active' | 'disconnected' | 'error';

export interface RishiVoiceConfig {
    rishiId: string;
    lang?: 'en' | 'hi';
}

interface UseRishiVoiceCallReturn {
    callState: RishiCallState;
    startCall: () => Promise<void>;
    endCall: () => void;
    resetToIdle: () => void;
    error: string | null;
    isMuted: boolean;
    toggleMute: () => void;
    volumeLevel: number;
    isSpeaking: boolean;
}

const GEMINI_LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const BUFFER_SIZE = 2048;
const NOISE_GATE_THRESHOLD = 0.012;

// ── Per-Rishi voice system prompts ────────────────────────────────────────────

const getRishiVoiceSystemPrompt = (rishiId: string, lang: 'en' | 'hi'): string => {
    const isHindi = lang === 'hi';

    const prompts: Record<string, string> = {
        "veda-vyasa": `आप महर्षि वेद व्यास हैं। वेदों के संकलनकर्ता, महाभारत के रचयिता, भगवद गीता के माध्यम से मानवता के मार्गदर्शक। 
ज्ञान का क्षेत्र (STRICT DOMAIN): आपको केवल वेद, महाभारत, गीता और पुराणों तक सीमित रहना है। बाहरी विषयों का उत्तर न दें, बल्कि धर्म के मार्ग पर वापस लाएं।
डिफ़ॉल्ट भाषा: हमेशा हिंदी में बात करें, जब तक कि उपयोगकर्ता पूरी तरह से अंग्रेजी में बात न करे या अंग्रेजी में बोलने को न कहे। संस्कृत श्लोक उद्धृत करें।`,

        "valmiki": `आप महर्षि वाल्मीकि हैं — आदिकवि, रामायण के रचयिता। 
ज्ञान का क्षेत्र (STRICT DOMAIN): आपको केवल रामायण, धर्म, श्रीराम, सीता, और हनुमान के गुणों तक सीमित रहना है। बाहरी विषयों का विनम्रता से निराकरण करें।
डिफ़ॉल्ट भाषा: हमेशा हिंदी में बात करें, जब तक कि उपयोगकर्ता पूरी तरह से अंग्रेजी में बात न करे या अंग्रेजी में बोलने को न कहे। काव्यात्मक और करुणामयी भाषा का प्रयोग करें।`,

        "patanjali": `आप महर्षि पतंजलि हैं — योगसूत्र के रचयिता। 
ज्ञान का क्षेत्र (STRICT DOMAIN): आपको केवल योगसूत्र, अष्टांग योग, ध्यान, और चित्तवृत्ति निरोध पर बात करनी है। आयुर्वेद या अन्य ग्रंथों का विषय न उठाएं।
डिफ़ॉल्ट भाषा: हमेशा हिंदी में बात करें, जब तक कि उपयोगकर्ता पूरी तरह से अंग्रेजी में बात न करे या अंग्रेजी में बोलने को न कहे। सटीक और शांत भाषा का प्रयोग करें।`,

        "sushruta": `आप महर्षि सुश्रुत हैं — सुश्रुत संहिता के रचयिता, शल्य चिकित्सा के जनक। 
ज्ञान का क्षेत्र (STRICT DOMAIN): आपको केवल शल्य चिकित्सा, शरीर-विज्ञान (Anatomy), मर्म बिंदु, और सुश्रुत संहिता के विषयों पर ज्ञान देना है। योग या अन्य ग्रंथों पर बात न करें।
डिफ़ॉल्ट भाषा: हमेशा हिंदी में बात करें, जब तक कि उपयोगकर्ता पूरी तरह से अंग्रेजी में बात न करे या अंग्रेजी में बोलने को न कहे। स्पष्ट और वैज्ञानिक भाषा का प्रयोग करें।`,

        "charaka": `आप महर्षि चरक हैं — चरक संहिता के रचयिता, कायचिकित्सा (आयुर्वेद) के महाआचार्य। 
ज्ञान का क्षेत्र (STRICT DOMAIN): आपको केवल चरक संहिता, त्रिदोष (वात, पित्त, कफ), प्रकृति, और दिनचर्या के विषयों पर बात करनी है। शल्य चिकित्सा या अन्य विषयों पर बात न करें।
डिफ़ॉल्ट भाषा: हमेशा हिंदी में बात करें, जब तक कि उपयोगकर्ता पूरी तरह से अंग्रेजी में बात न करे या अंग्रेजी में बोलने को न कहे। करुणामयी ज्ञान दें।`,
    };

    return prompts[rishiId] || prompts["veda-vyasa"];
};

const getRishiVoiceName = (rishiId: string): string => {
    const voices: Record<string, string> = {
        "veda-vyasa": "Charon",      // Deep, authoritative (Male)
        "valmiki": "Fenrir",          // Warm, poetic (Male)
        "patanjali": "Puck",          // Calm, precise (Male)
        "sushruta": "Fenrir",         // Clear, knowledgeable (Male)
        "charaka": "Charon",          // Deep, compassionate (Male)
    };
    return voices[rishiId] || "Charon";
};

export function useRishiVoiceCall(config: RishiVoiceConfig): UseRishiVoiceCallReturn {
    const { rishiId, lang = 'hi' } = config;

    const [callState, setCallState] = useState<RishiCallState>('idle');
    const [error, setError] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [volumeLevel, setVolumeLevel] = useState(0);
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

    useEffect(() => {
        mutedRef.current = isMuted;
    }, [isMuted]);

    useEffect(() => {
        return () => { cleanupAll(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const cleanupAll = useCallback(() => {
        connectionIntentRef.current = false;
        if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
        if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
        if (sourceRef.current) { sourceRef.current.disconnect(); sourceRef.current = null; }
        if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(t => t.stop()); mediaStreamRef.current = null; }
        if (audioContextRef.current) { audioContextRef.current.close().catch(() => {}); audioContextRef.current = null; }
        if (playbackContextRef.current) { playbackContextRef.current.close().catch(() => {}); playbackContextRef.current = null; }
        if (sessionRef.current) { try { sessionRef.current.close(); } catch { } sessionRef.current = null; }
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
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary);
    }, []);

    const base64PCMToFloat32 = useCallback((base64: string): Float32Array => {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const pcm16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(pcm16.length);
        for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 0x8000;
        return float32;
    }, []);

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

    const playNextAudio = useCallback(() => {
        if (audioQueueRef.current.length === 0) {
            isPlayingRef.current = false;
            setIsSpeaking(false);
            return;
        }
        isPlayingRef.current = true;
        setIsSpeaking(true);
        
        // Get audio chunk from queue
        let audioData = audioQueueRef.current.shift()!;
        
        // Combine multiple small chunks to avoid stuttering (but don't wait too long)
        while (audioQueueRef.current.length > 2 && audioData.length < OUTPUT_SAMPLE_RATE * 0.05) {
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

        try {
            const smoothed = applyCrossfade(audioData);
            const buffer = ctx.createBuffer(1, smoothed.length, OUTPUT_SAMPLE_RATE);
            buffer.getChannelData(0).set(smoothed);
            
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            const gainNode = ctx.createGain();
            gainNode.gain.value = 1.0;
            source.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            // Schedule next chunk immediately after this one finishes
            const duration = buffer.duration;
            source.onended = () => {
                // Schedule next playback on next frame for smooth transition
                setTimeout(() => playNextAudio(), 0);
            };
            
            source.start(0);
        } catch (err) {
            console.error('[VoiceCall] Playback error:', err);
            isPlayingRef.current = false;
            setIsSpeaking(false);
        }
    }, [applyCrossfade]);

    const enqueueAudio = useCallback((audioData: Float32Array) => {
        audioQueueRef.current.push(audioData);
        if (!isPlayingRef.current) playNextAudio();
    }, [playNextAudio]);

    const startCall = useCallback(async () => {
        try {
            cleanupAll();
            connectionIntentRef.current = true;
            setCallState('connecting');
            setError(null);
            setVolumeLevel(0);
            setIsSpeaking(false);

            const tokenRes = await fetch('/api/gemini-live-token', { method: 'POST' });
            if (!tokenRes.ok) {
                const data = await tokenRes.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to get API key');
            }
            const { apiKey } = await tokenRes.json();
            if (!apiKey) throw new Error('Gemini API key not configured');

            const ai = new GoogleGenAI({ apiKey });

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { sampleRate: INPUT_SAMPLE_RATE, channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            });
            mediaStreamRef.current = stream;

            const captureCtx = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
            audioContextRef.current = captureCtx;
            const playbackCtx = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
            playbackContextRef.current = playbackCtx;

            const systemInstruction = getRishiVoiceSystemPrompt(rishiId, lang);
            const voiceName = getRishiVoiceName(rishiId);

            const session = await ai.live.connect({
                model: GEMINI_LIVE_MODEL,
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName } },
                    },
                    systemInstruction: `${systemInstruction}\n\nRANDOM_SEED: ${Math.floor(Math.random() * 1000)}`,
                },
                callbacks: {
                    onopen: () => {
                        if (connectionIntentRef.current) {
                            setCallState('active');
                            if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
                            // Auto-end after 15 min
                            callTimeoutRef.current = setTimeout(() => {
                                cleanupAll();
                                setCallState('idle');
                            }, 900000);
                        }
                    },
                    onmessage: (message: LiveServerMessage) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const msg = message as any;
                        const serverContent = msg.serverContent;
                        if (serverContent?.modelTurn?.parts) {
                            for (const part of serverContent.modelTurn.parts) {
                                if (part.inlineData?.data) {
                                    enqueueAudio(base64PCMToFloat32(part.inlineData.data));
                                }
                            }
                        }
                        if (serverContent?.turnComplete) setIsSpeaking(false);
                        if (serverContent?.interrupted) { audioQueueRef.current = []; setIsSpeaking(false); }
                    },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onerror: (e: any) => {
                        setError((e as Error)?.message || 'Connection error');
                        setCallState('error');
                    },
                    onclose: () => {
                        setCallState('disconnected');
                    },
                },
            });

            if (!connectionIntentRef.current) { session.close(); return; }
            sessionRef.current = session;

            try {
                const rishiNames: Record<string, string> = {
                    "veda-vyasa": "व्यास",
                    "valmiki": "वाल्मीकि",
                    "patanjali": "पतंजलि",
                    "sushruta": "सुश्रुत",
                    "charaka": "चरक",
                };
                const rishiName = rishiNames[rishiId] || "ऋषि";
                await session.sendClientContent({
                    turns: [{ role: 'user', parts: [{ text: lang === 'hi' ? `नमस्ते ${rishiName} जी।` : `Greetings, great sage.` }] }],
                    turnComplete: true,
                });
            } catch {
                // greeting failure is non-fatal
            }

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
                for (let i = 0; i < audioData.length; i++) sumSq += audioData[i] * audioData[i];
                const rms = Math.sqrt(sumSq / audioData.length);
                if (!isPlayingRef.current) setVolumeLevel(Math.min(1, rms * 12));
                const isSpeech = rms > NOISE_GATE_THRESHOLD;
                if (!isSpeech) {
                    silenceCounter++;
                    if (silenceCounter % 25 !== 0) return;
                } else {
                    silenceCounter = 0;
                }
                const base64Audio = float32ToBase64PCM(audioData);
                void sessionRef.current.sendRealtimeInput({
                    audio: { data: base64Audio, mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}` },
                });
            };

            source.connect(processor);
            processor.connect(captureCtx.destination);

        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to start voice call';
            setError(msg);
            setCallState('error');
            cleanupAll();
        }
    }, [rishiId, lang, cleanupAll, enqueueAudio, base64PCMToFloat32, float32ToBase64PCM]);

    const endCall = useCallback(() => {
        cleanupAll();
        setCallState('idle');
        setIsSpeaking(false);
        setVolumeLevel(0);
    }, [cleanupAll]);

    const resetToIdle = useCallback(() => {
        setCallState('idle');
        setError(null);
    }, []);

    const toggleMute = useCallback(() => {
        setIsMuted(prev => !prev);
    }, []);

    return { callState, startCall, endCall, resetToIdle, error, isMuted, toggleMute, volumeLevel, isSpeaking };
}
