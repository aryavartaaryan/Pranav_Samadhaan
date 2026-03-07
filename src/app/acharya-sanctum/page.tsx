'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAcharyaOnboarding, type AyurvedicProfile } from '@/hooks/useAcharyaOnboarding';
import AcharyaGuruOrb from '@/components/Dashboard/AcharyaGuruOrb';
import type { OrbStatus } from '@/components/Dashboard/AcharyaGuruOrb';

// ── Circadian background images (free-to-use Unsplash) ───────────────────────
function getCircadianBg(): string {
    const h = new Date().getHours();
    if (h >= 5 && h < 8) return 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80'; // misty dawn mountains
    if (h >= 8 && h < 17) return 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&q=80'; // sunlit forest
    if (h >= 17 && h < 20) return 'https://images.unsplash.com/photo-1502483896914-59a2b2b8df86?w=1200&q=80'; // sunset peaks
    return 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1200&q=80'; // starry night cosmos
}

// ── Save profile to Firestore + mark onboarding complete ────────────────────
async function saveProfileToFirestore(profile: AyurvedicProfile): Promise<void> {
    try {
        const { getFirebaseAuth, getFirebaseFirestore } = await import('@/lib/firebase');
        const { onAuthStateChanged } = await import('firebase/auth');
        const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');

        const auth = await getFirebaseAuth();
        const db = await getFirebaseFirestore();

        await new Promise<void>((resolve) => {
            const unsub = onAuthStateChanged(auth, (user) => {
                if (user) {
                    unsub();
                    setDoc(doc(db, 'users', user.uid), {
                        profile: {
                            ...profile,
                            savedAt: serverTimestamp(),
                        },
                        hasCompletedOnboarding: true,
                    }, { merge: true })
                        .then(() => resolve())
                        .catch(() => resolve()); // always resolve — don't block navigation
                } else {
                    unsub();
                    resolve();
                }
            });
        });
    } catch { /* silent — offline graceful degradation */ }
}

// ── Also save profile to users/uid in onesutra_users ─────────────────────────
// (so UserProfile.tsx can read it from either collection)
async function markOnboardingLocalStorage(): Promise<void> {
    try {
        localStorage.setItem('acharya_onboarding_done', 'true');
    } catch { /* noop */ }
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════

type Phase = 'language-select' | 'sanctum' | 'saving' | 'complete';

export default function AcharyaSanctumPage() {
    const router = useRouter();
    const [phase, setPhase] = useState<Phase>('language-select');
    const [lang, setLang] = useState<'en' | 'hi'>('en');
    const [bgUrl] = useState(getCircadianBg());
    const [chatInput, setChatInput] = useState('');
    const transcriptRef = useRef<HTMLDivElement>(null);

    // ── Firebase: if user already completed onboarding, redirect instantly ────
    useEffect(() => {
        const done = localStorage.getItem('acharya_onboarding_done');
        if (done === 'true') { router.replace('/'); return; }

        // Also check Firestore
        (async () => {
            try {
                const { getFirebaseAuth, getFirebaseFirestore } = await import('@/lib/firebase');
                const { onAuthStateChanged } = await import('firebase/auth');
                const { doc, getDoc } = await import('firebase/firestore');
                const auth = await getFirebaseAuth();
                const db = await getFirebaseFirestore();
                onAuthStateChanged(auth, async (user) => {
                    if (user) {
                        const snap = await getDoc(doc(db, 'users', user.uid));
                        if (snap.data()?.hasCompletedOnboarding) {
                            localStorage.setItem('acharya_onboarding_done', 'true');
                            router.replace('/');
                        }
                    }
                });
            } catch { /* offline */ }
        })();
    }, [router]);

    // ── Profile extracted callback ────────────────────────────────────────────
    const handleProfileExtracted = useCallback(async (profile: AyurvedicProfile) => {
        setPhase('saving');
        // Cache profile to localStorage for UserProfile fallback
        try { localStorage.setItem('acharya_profile', JSON.stringify(profile)); } catch { /* noop */ }
        await saveProfileToFirestore(profile);
        await markOnboardingLocalStorage();
        setPhase('complete');
        // Wait for the Acharya's final goodbye audio to finish (~4s), then navigate
        setTimeout(() => router.push('/'), 4500);
    }, [router]);

    // ── Onboarding hook ───────────────────────────────────────────────────────
    const {
        callState, error, isMuted, toggleMute,
        volumeLevel, isSpeaking, transcript,
        isTextMode, setIsTextMode,
        startOnboarding, sendTextMessage, endOnboarding,
    } = useAcharyaOnboarding({ lang, onProfileExtracted: handleProfileExtracted });

    // Auto-scroll transcript
    useEffect(() => {
        if (transcriptRef.current) {
            transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
        }
    }, [transcript]);

    // ── Orb status ────────────────────────────────────────────────────────────
    const orbStatus: OrbStatus =
        (callState === 'saving' || phase === 'saving' || phase === 'complete') ? 'processing'
            : (callState === 'active' && isSpeaking) ? 'speaking'
                : callState === 'active' ? 'listening'
                    : callState === 'connecting' ? 'processing'
                        : 'idle';

    // ── Orb scale driven by volumeLevel ───────────────────────────────────────
    const orbScale = 1 + volumeLevel * 0.35; // 1.0 → 1.35 based on audio amplitude

    // ── Handle language selection ─────────────────────────────────────────────
    const handleLangSelect = useCallback((selectedLang: 'en' | 'hi') => {
        setLang(selectedLang);
        setPhase('sanctum');
        // Start the voice session after framer motion fade (300ms)
        setTimeout(() => startOnboarding(), 500);
    }, [startOnboarding]);

    // ── Chat fallback send ────────────────────────────────────────────────────
    const handleTextSend = useCallback(() => {
        const msg = chatInput.trim();
        if (!msg) return;
        sendTextMessage(msg);
        setChatInput('');
    }, [chatInput, sendTextMessage]);

    return (
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>

            {/* ── Circadian background ── */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 0,
                backgroundImage: `url(${bgUrl})`,
                backgroundSize: 'cover', backgroundPosition: 'center',
                filter: 'brightness(0.65) saturate(1.2)',
                transition: 'opacity 1s ease',
            }} />

            {/* ── Sacred radial vignette (forces focus to center) ── */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 1,
                background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.82) 100%)',
                pointerEvents: 'none',
            }} />

            {/* ── Subtle particle dust overlay ── */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 1,
                background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.5) 100%)',
                pointerEvents: 'none',
            }} />

            {/* ════════════════════════════════════════════════════════════════
                MODULE 1 — Language Selection
            ════════════════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {phase === 'language-select' && (
                    <motion.div
                        key="lang-select"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.5 }}
                        style={{
                            position: 'absolute', inset: 0, zIndex: 10,
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            gap: '2rem', padding: '2rem',
                        }}
                    >
                        {/* Sacred ॐ symbol */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                            style={{
                                fontSize: 'clamp(3rem, 12vw, 5rem)',
                                color: 'rgba(200,155,40,0.9)',
                                textShadow: '0 0 40px rgba(200,155,40,0.7), 0 0 80px rgba(200,155,40,0.3)',
                                lineHeight: 1,
                            }}
                        >
                            ॐ
                        </motion.div>

                        {/* Title */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.8 }}
                            style={{ textAlign: 'center' }}
                        >
                            <h1 style={{
                                fontSize: 'clamp(1.3rem, 5vw, 2rem)',
                                fontWeight: 300, letterSpacing: '0.15em',
                                color: 'rgba(255,255,255,0.92)',
                                fontFamily: 'Georgia, serif',
                                margin: 0, marginBottom: '0.5rem',
                            }}>
                                Acharya Pranav
                            </h1>
                            <p style={{
                                fontSize: 'clamp(0.8rem, 3vw, 1rem)',
                                color: 'rgba(200,155,40,0.75)',
                                letterSpacing: '0.25em', textTransform: 'uppercase',
                                fontFamily: 'system-ui', margin: 0,
                            }}>
                                Your Ayurvedic Guru · Awaits
                            </p>
                        </motion.div>

                        {/* Language buttons */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.9, duration: 0.8 }}
                            style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap', justifyContent: 'center' }}
                        >
                            {[
                                { code: 'en' as const, label: 'English', sub: 'Speak in English' },
                                { code: 'hi' as const, label: 'हिंदी', sub: 'हिंदी में बोलें' },
                            ].map(({ code, label, sub }) => (
                                <motion.button
                                    key={code}
                                    whileHover={{ scale: 1.04, y: -3 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => handleLangSelect(code)}
                                    style={{
                                        width: 'clamp(130px, 38vw, 170px)',
                                        padding: '1.4rem 1rem',
                                        borderRadius: '1.2rem',
                                        background: 'rgba(255,255,255,0.05)',
                                        backdropFilter: 'blur(20px)',
                                        WebkitBackdropFilter: 'blur(20px)',
                                        border: '1px solid rgba(200,155,40,0.35)',
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
                                        color: 'white', cursor: 'pointer',
                                        display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', gap: '0.4rem',
                                        transition: 'border-color 0.3s, box-shadow 0.3s',
                                    }}
                                    onMouseEnter={e => {
                                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(200,155,40,0.7)';
                                        (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.4), 0 0 24px rgba(200,155,40,0.25), inset 0 1px 0 rgba(255,255,255,0.08)';
                                    }}
                                    onMouseLeave={e => {
                                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(200,155,40,0.35)';
                                        (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)';
                                    }}
                                >
                                    <span style={{ fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', fontFamily: 'Georgia, serif' }}>{label}</span>
                                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.12em' }}>{sub}</span>
                                </motion.button>
                            ))}
                        </motion.div>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.45 }}
                            transition={{ delay: 1.4 }}
                            style={{
                                fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)',
                                letterSpacing: '0.1em', textAlign: 'center',
                                maxWidth: 280, lineHeight: 1.6,
                            }}
                        >
                            This sacred conversation occurs only once.<br />
                            Acharya will craft your personal 30-day journey.
                        </motion.p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ════════════════════════════════════════════════════════════════
                MODULE 2 + 3 — Digital Ashram (Sanctum)
            ════════════════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {(phase === 'sanctum' || phase === 'saving' || phase === 'complete') && (
                    <motion.div
                        key="sanctum"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8 }}
                        style={{
                            position: 'absolute', inset: 0, zIndex: 10,
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            gap: '2rem', padding: '1.5rem',
                            paddingBottom: callState === 'active' ? '8rem' : '3rem',
                        }}
                    >
                        {/* ── State header label ── */}
                        <motion.div
                            animate={{ opacity: [0.4, 0.85, 0.4] }}
                            transition={{ duration: 2.5, repeat: Infinity }}
                            style={{
                                position: 'absolute', top: '1.8rem',
                                fontSize: '0.58rem', letterSpacing: '0.32em',
                                textTransform: 'uppercase', fontFamily: 'monospace',
                                color: 'rgba(200,155,40,0.75)',
                            }}
                        >
                            {phase === 'saving' || phase === 'complete'
                                ? '· Crafting Your Sacred Journey ·'
                                : callState === 'connecting' ? '· Awakening ·'
                                    : callState === 'active' && isSpeaking ? '· Acharya Speaks ·'
                                        : callState === 'active' ? '· Acharya Listens ·'
                                            : '· Preparing ·'}
                        </motion.div>

                        {/* ── Audio-Reactive Holographic Orb ── */}
                        <motion.div
                            animate={{
                                scale: orbScale,
                                filter: `brightness(${1 + volumeLevel * 0.6}) drop-shadow(0 0 ${40 + volumeLevel * 60}px rgba(165,180,252,${0.3 + volumeLevel * 0.5}))`,
                            }}
                            transition={{ type: 'spring', stiffness: 180, damping: 22, mass: 0.6 }}
                        >
                            <AcharyaGuruOrb status={orbStatus} zenMode={true} sizePx={160} />
                        </motion.div>

                        {/* ── Transcript scroll area ── */}
                        <div
                            ref={transcriptRef}
                            style={{
                                width: '100%', maxWidth: 400,
                                maxHeight: '28vh', overflowY: 'auto',
                                display: 'flex', flexDirection: 'column', gap: '0.5rem',
                                scrollbarWidth: 'none',
                                maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)',
                                WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)',
                            }}
                        >
                            <AnimatePresence mode="popLayout">
                                {transcript.map((line, i) => (
                                    <motion.p
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        layout
                                        style={{
                                            margin: 0, padding: '0.6rem 1rem',
                                            fontSize: 'clamp(0.78rem, 2.5vw, 0.88rem)',
                                            lineHeight: 1.55,
                                            color: line.startsWith('🙏')
                                                ? 'rgba(255,255,255,0.45)'
                                                : 'rgba(255,255,255,0.85)',
                                            textAlign: 'center',
                                            fontFamily: 'Georgia, serif',
                                            fontStyle: 'italic',
                                            background: line.startsWith('🙏')
                                                ? 'rgba(255,255,255,0.04)'
                                                : 'rgba(165,180,252,0.06)',
                                            borderRadius: '0.5rem',
                                            backdropFilter: 'blur(4px)',
                                        }}
                                    >
                                        {line.replace(/^[🪷🙏]\s/, '')}
                                    </motion.p>
                                ))}
                            </AnimatePresence>
                        </div>

                        {/* ── Status / Saving indicator ── */}
                        <AnimatePresence>
                            {(phase === 'saving' || phase === 'complete') && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    style={{
                                        padding: '0.8rem 1.8rem',
                                        borderRadius: 999,
                                        background: 'rgba(200,155,40,0.12)',
                                        border: '1px solid rgba(200,155,40,0.35)',
                                        backdropFilter: 'blur(12px)',
                                        color: 'rgba(200,155,40,0.95)',
                                        fontSize: '0.75rem', letterSpacing: '0.12em',
                                        textAlign: 'center',
                                    }}
                                >
                                    {phase === 'complete'
                                        ? lang === 'hi' ? '✨ आपकी यात्रा तैयार हो रही है...' : '✨ Entering your sanctuary...'
                                        : lang === 'hi' ? '🕉️ आपकी प्राकृति सुरक्षित की जा रही है...' : '🕉️ Saving your sacred profile...'}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ── Error display ── */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    style={{
                                        position: 'absolute', bottom: '7rem',
                                        color: 'rgba(252,165,165,0.8)',
                                        fontSize: '0.72rem', textAlign: 'center',
                                        maxWidth: 300, letterSpacing: '0.05em',
                                    }}
                                >
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ── Subtle hint while Acharya is thinking ── */}
                        {callState === 'active' && isSpeaking && phase === 'sanctum' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0.4, 0.85, 0.4] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                style={{
                                    fontSize: '0.62rem', letterSpacing: '0.18em',
                                    textTransform: 'uppercase', fontFamily: 'monospace',
                                    color: 'rgba(200,155,40,0.65)',
                                }}
                            >
                                {lang === 'hi' ? '· आचार्य सोच रहे हैं ·' : '· Acharya is reflecting ·'}
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ════════════════════════════════════════════════════════════════
                MODULE 3 CHAT FALLBACK — Slides up from bottom
            ════════════════════════════════════════════════════════════════ */}
            {/* ── Chat input — always visible when session is active ── */}
            <AnimatePresence>
                {callState === 'active' && phase === 'sanctum' && (
                    <motion.div
                        key="chat-bar"
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 30 }}
                        style={{
                            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20,
                            padding: '0.75rem 1rem 1.25rem',
                            background: 'rgba(10,10,20,0.88)',
                            backdropFilter: 'blur(24px)',
                            WebkitBackdropFilter: 'blur(24px)',
                            borderTop: '1px solid rgba(200,155,40,0.12)',
                            display: 'flex', gap: '0.6rem', alignItems: 'center',
                        }}
                    >
                        <input
                            type="text"
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !isSpeaking) handleTextSend(); }}
                            placeholder={lang === 'hi' ? 'आचार्य को उत्तर दें...' : 'Reply to Acharya...'}
                            disabled={isSpeaking}
                            autoFocus
                            style={{
                                flex: 1, background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                borderRadius: 999, padding: '0.6rem 1rem',
                                color: 'white', fontSize: '0.85rem',
                                outline: 'none', fontFamily: 'inherit',
                                opacity: isSpeaking ? 0.5 : 1,
                                transition: 'opacity 0.3s',
                            }}
                        />
                        <button
                            onClick={handleTextSend}
                            disabled={!chatInput.trim() || isSpeaking}
                            style={{
                                background: (chatInput.trim() && !isSpeaking) ? 'rgba(200,155,40,0.85)' : 'rgba(255,255,255,0.08)',
                                border: 'none', borderRadius: 999,
                                padding: '0.6rem 1.2rem',
                                color: (chatInput.trim() && !isSpeaking) ? 'white' : 'rgba(255,255,255,0.3)',
                                cursor: (chatInput.trim() && !isSpeaking) ? 'pointer' : 'default',
                                fontSize: '0.8rem', fontWeight: 600,
                                transition: 'all 0.2s',
                            }}
                        >
                            ↑
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
