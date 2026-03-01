import { useRef, useCallback, useState, useEffect } from 'react';

// ── Module-level voice cache (survives re-renders, populated by voiceschanged) ──
let _cachedVoices: SpeechSynthesisVoice[] = [];

function initVoiceCache() {
    if (typeof window === 'undefined') return;
    const synth = window.speechSynthesis;

    const load = () => {
        const v = synth.getVoices();
        if (v.length) _cachedVoices = v;
    };

    load(); // immediate (Firefox returns voices synchronously)
    synth.addEventListener('voiceschanged', load);
}

if (typeof window !== 'undefined') {
    initVoiceCache();
}

// ── Chrome "phantom silence" keep-alive ───────────────────────────────────────
// Chrome has a bug where utterances silently stop after ~15s without firing
// onend. A brief pause/resume every 10s resets the internal watchdog timer.
let _chromeKeepaliveTimer: ReturnType<typeof setInterval> | null = null;

function startChromeKeepalive() {
    if (typeof window === 'undefined') return;
    if (_chromeKeepaliveTimer) return;
    _chromeKeepaliveTimer = setInterval(() => {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
            console.log('[JARVIS KEEPALIVE]: Chrome watchdog reset.');
        }
    }, 10_000);
}

function stopChromeKeepalive() {
    if (_chromeKeepaliveTimer) {
        clearInterval(_chromeKeepaliveTimer);
        _chromeKeepaliveTimer = null;
    }
}

/**
 * useSakhaVoice — Zero-Latency Sentence Chunking for Sakha Bodhi
 *
 * Implements all 5 Phantom Audio fixes:
 * 1. voiceschanged module-level cache
 * 2. Queue Defibrillator (cancel() before first sentence)
 * 3. Chrome 15s keepalive (pause/resume every 10s)
 * 4. Bulletproof voice fallback (lang.startsWith("en") → voices[0])
 * 5. Granular [JARVIS] diagnostic logs
 */
export function useSakhaVoice() {
    const textBuffer = useRef('');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const isSpeakingRef = useRef(false);     // non-stale ref for keepalive check
    const sentenceCountRef = useRef(0);      // 0 = queue defibrillator not yet fired
    const defibrillatedRef = useRef(false);  // true after first cancel() of new session

    // ── Sync speaking ref ──────────────────────────────────────────────────────
    useEffect(() => {
        isSpeakingRef.current = isSpeaking;
        if (isSpeaking) {
            startChromeKeepalive();
        } else {
            stopChromeKeepalive();
        }
    }, [isSpeaking]);

    // ── Bulletproof voice selection ────────────────────────────────────────────
    const getSakhaVoice = useCallback((): SpeechSynthesisVoice | null => {
        if (typeof window === 'undefined') return null;

        // Refresh cache if still empty
        if (!_cachedVoices.length) {
            const v = window.speechSynthesis.getVoices();
            if (v.length) _cachedVoices = v;
        }

        const voices = _cachedVoices;

        if (!voices || voices.length === 0) {
            console.error('[JARVIS FATAL]: No voices available in the OS. Speech will fail.');
            return null;
        }

        return (
            voices.find(v => v.name.includes('Rishi')) ||   // iOS/Mac — Indian male
            voices.find(v => v.name.includes('Daniel')) ||   // iOS/Mac — British male
            voices.find(v => v.name.includes('Ravi')) ||   // Windows — Indian male
            voices.find(v => v.name.includes('Google UK English Male')) ||  // Android
            voices.find(v => v.lang.startsWith('en')) ||   // ANY English voice
            voices[0]                                          // Absolute ultimate fallback
        );
    }, []);

    // ── Core speak function with all diagnostics ───────────────────────────────
    const speakSentence = useCallback((text: string) => {
        if (typeof window === 'undefined') return;
        const cleaned = text.trim();
        if (!cleaned) return;

        // ── MODULE 1: Queue Defibrillator ──────────────────────────────────────
        // On the very first sentence of a new session, nuke any stuck queue
        if (!defibrillatedRef.current) {
            console.log('[JARVIS QUEUE]: Defibrillating speech queue (cancel() for clean start).');
            window.speechSynthesis.cancel();
            defibrillatedRef.current = true;
        }

        // ── MODULE 4: Diagnostic log before utterance ──────────────────────────
        const targetVoice = getSakhaVoice();

        if (!targetVoice) {
            console.error('[JARVIS FATAL]: No voices available in the OS. Speech will fail.');
            return; // guard — don't queue an utterance that can't speak
        }

        console.log(`[JARVIS QUEUE]: Queuing sentence: "${cleaned.substring(0, 35)}..."`);
        console.log(`[JARVIS VOICE]: Assigned Voice Profile: ${targetVoice.name} (${targetVoice.lang})`);

        const utterance = new SpeechSynthesisUtterance(cleaned);

        // Assign voice MUST be a real voice object, never null
        utterance.voice = targetVoice;
        utterance.lang = targetVoice.lang || 'en-IN';

        // Bodhi persona: slightly slower, slightly deeper
        utterance.rate = 0.92;
        utterance.pitch = 0.90;
        utterance.volume = 1.0;

        utterance.onstart = () => {
            console.log('[JARVIS PLAYBACK]: Audio has physically started playing.');
            setIsSpeaking(true);
        };

        utterance.onend = () => {
            console.log('[JARVIS PLAYBACK]: Utterance ended.');
            if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
                setIsSpeaking(false);
            }
        };

        utterance.onerror = (e) => {
            console.error(`[JARVIS ERROR]: Synthesis failed. Reason: ${e.error}`);
            if (!window.speechSynthesis.pending) {
                setIsSpeaking(false);
            }
        };

        window.speechSynthesis.speak(utterance);
        sentenceCountRef.current += 1;
    }, [getSakhaVoice]);

    // ── Stream processor ───────────────────────────────────────────────────────
    const processStreamChunk = useCallback((newChunk: string, isDone = false): string => {
        textBuffer.current += newChunk;

        const sentenceRegex = /([\s\S]*?[.?!])(?:\s+|$)/;
        let lastSpoken = '';
        let match: RegExpMatchArray | null;

        while ((match = textBuffer.current.match(sentenceRegex)) !== null) {
            const fullSentence = match[1].trim();
            if (fullSentence && !fullSentence.includes('[TOOL:')) {
                speakSentence(fullSentence);
                lastSpoken = fullSentence;
            }
            textBuffer.current = textBuffer.current.slice(match[0].length);
        }

        // On stream end: speak any remaining partial sentence
        if (isDone && textBuffer.current.trim().length > 0) {
            const remaining = textBuffer.current.trim();
            if (!remaining.includes('[TOOL:')) {
                speakSentence(remaining);
                lastSpoken = remaining;
            }
            textBuffer.current = '';
        }

        return lastSpoken;
    }, [speakSentence]);

    // ── Emergency stop ─────────────────────────────────────────────────────────
    const stopSakha = useCallback(() => {
        if (typeof window === 'undefined') return;
        console.log('[JARVIS QUEUE]: stopSakha() — cancelling all queued utterances.');
        window.speechSynthesis.cancel();
        textBuffer.current = '';
        sentenceCountRef.current = 0;
        defibrillatedRef.current = false; // Reset for next session
        stopChromeKeepalive();
        setIsSpeaking(false);
    }, []);

    // ── New session reset (call when Sakha activates) ──────────────────────────
    const resetForNewSession = useCallback(() => {
        defibrillatedRef.current = false;
        sentenceCountRef.current = 0;
        textBuffer.current = '';
    }, []);

    return {
        processStreamChunk,
        stopSakha,
        resetForNewSession,
        isSpeaking,
        getSakhaVoice,
    };
}
