'use client';

import { useState, useRef, useCallback } from 'react';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type OnboardingCallState = 'idle' | 'connecting' | 'active' | 'saving' | 'complete' | 'error';

export interface AyurvedicProfile {
    sex: string;
    prakriti: string;
    doshas: string;
    plan_lifestyle: string;
    plan_food: string;
    plan_mantra: string;
}

interface Message {
    role: 'acharya' | 'user';
    content: string;
}

interface UseAcharyaOnboardingOptions {
    lang: 'en' | 'hi';
    onProfileExtracted: (profile: AyurvedicProfile) => void;
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Hook
// ──────────────────────────────────────────────────────────────────────────────

export function useAcharyaOnboarding({ lang, onProfileExtracted }: UseAcharyaOnboardingOptions) {
    const [callState, setCallState] = useState<OnboardingCallState>('idle');
    const [error, setError] = useState<string | null>(null);
    const [isMuted] = useState(false);       // kept for UI compat — not used in text mode
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState<string[]>([]);
    const [isTextMode] = useState(true);      // always text mode now
    const setIsTextMode = useCallback(() => { }, []); // no-op for UI compat

    // Internal conversation history for the API
    const messagesRef = useRef<Message[]>([]);
    const profileExtractedRef = useRef(false);

    // ── Send a message to the /api/acharya-onboarding server route ───────────
    const sendToAPI = useCallback(async (userText: string) => {
        setIsSpeaking(true);

        // Add user message to history
        if (userText !== '__START__') {
            messagesRef.current = [
                ...messagesRef.current,
                { role: 'user', content: userText },
            ];
            setTranscript(prev => [...prev.slice(-40), `🙏 ${userText}`]);
        }

        try {
            const res = await fetch('/api/acharya-onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: messagesRef.current,
                    language: lang,
                }),
            });

            if (!res.ok) throw new Error(`Server error: ${res.status}`);

            const data = await res.json();

            if (!data || (!data.activeMessage)) {
                throw new Error('Invalid response from Acharya');
            }

            // Pick the correct language response
            const responseText: string =
                data.activeMessage?.[lang] ||
                data.activeMessage?.['en'] ||
                '';

            if (responseText && responseText.trim()) {
                // Add Acharya response to history
                messagesRef.current = [
                    ...messagesRef.current,
                    { role: 'acharya', content: responseText.trim() },
                ];
                setTranscript(prev => [...prev.slice(-40), `🪷 ${responseText.trim()}`]);
            }

            // Check if consultation is complete
            if (data.isComplete && data.profile && !profileExtractedRef.current) {
                profileExtractedRef.current = true;
                setCallState('saving');

                const profile: AyurvedicProfile = {
                    sex: data.profile.sex || 'Unknown',
                    prakriti: data.profile.prakriti || 'Vata',
                    doshas: data.profile.doshas || '',
                    plan_lifestyle: data.profile.plan_lifestyle || '',
                    plan_food: data.profile.plan_food || '',
                    plan_mantra: data.profile.plan_mantra || '',
                };

                onProfileExtracted(profile);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Connection error. Please try again.';
            setError(msg);
            // Show a graceful fallback in transcript
            const fallback = lang === 'hi'
                ? 'क्षमा करें, एक पल रुकें। कृपया पुनः प्रयास करें।'
                : 'Forgive me, dear child. Please try once more.';
            setTranscript(prev => [...prev.slice(-40), `🪷 ${fallback}`]);
        } finally {
            setIsSpeaking(false);
        }
    }, [lang, onProfileExtracted]);

    // ── Start the onboarding session ─────────────────────────────────────────
    const startOnboarding = useCallback(async () => {
        messagesRef.current = [];
        profileExtractedRef.current = false;
        setError(null);
        setTranscript([]);
        setCallState('connecting');

        // Brief delay for UX transition
        await new Promise(r => setTimeout(r, 400));
        setCallState('active');

        // Trigger Acharya's opening greeting (no user text for first turn)
        await sendToAPI('__START__');
    }, [sendToAPI]);

    // ── Send a text message (main interaction) ────────────────────────────────
    const sendTextMessage = useCallback((text: string) => {
        if (!text.trim() || callState !== 'active') return;
        sendToAPI(text.trim());
    }, [sendToAPI, callState]);

    // ── End / cleanup ─────────────────────────────────────────────────────────
    const endOnboarding = useCallback(() => {
        messagesRef.current = [];
        setCallState('idle');
        setIsSpeaking(false);
        setError(null);
    }, []);

    const toggleMute = useCallback(() => { }, []); // no-op — no mic in text mode
    const markComplete = useCallback(() => setCallState('complete'), []);

    return {
        callState,
        error,
        isMuted,
        toggleMute,
        volumeLevel: isSpeaking ? 0.6 : 0,  // drives orb animation while "thinking"
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
