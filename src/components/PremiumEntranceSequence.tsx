'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Per-TOD rich configuration ────────────────────────────────────────────────
const TOD_CONFIG = {
    morning: {
        sanskrit: 'शुभोदय',
        romanized: 'Shubhodaya',
        raag: 'Rāga Bhairav',
        period: 'Morning Rāga · Sunrise to 11 AM',
        blessing: 'May the golden dawn fill your mind with purpose and endless light.',
        shloka: 'ब्राह्मे मुहूर्ते उत्तिष्ठेत्',
        shlokaTranslation: 'Arise in the Brahma Muhurta — the hour of creation',
        glowRgb: '200,130,30',
        accentHex: '#E8A030',
        bg: '#06030A',
        stars: false,
    },
    noon: {
        sanskrit: 'शुभ मध्याह्न',
        romanized: 'Shubh Madhyahna',
        raag: 'Rāga Bhimpalasi',
        period: 'Midday Rāga · Power Hour',
        blessing: 'At the peak of the sun, awaken the peak of your mind.',
        shloka: 'कर्म श्रेष्ठं मनुष्याणाम्',
        shlokaTranslation: 'Action is the highest virtue of the human being',
        glowRgb: '200,168,32',
        accentHex: '#E8C840',
        bg: '#060500',
        stars: false,
    },
    evening: {
        sanskrit: 'शुभ सन्ध्या',
        romanized: 'Shubh Sandhya',
        raag: 'Rāga Yaman',
        period: 'Twilight Rāga · Creative Flow',
        blessing: 'The twilight hour is sacred — a bridge between doing and being.',
        shloka: 'तमसो मा ज्योतिर्गमय',
        shlokaTranslation: 'Lead me from darkness into light',
        glowRgb: '140,90,210',
        accentHex: '#A870E0',
        bg: '#040212',
        stars: true,
    },
    night: {
        sanskrit: 'शुभ रात्रि',
        romanized: 'Shubh Ratri',
        raag: 'Rāga Bhairavi',
        period: 'Night Rāga · Deep Rest · Sacred Dark',
        blessing: 'The sacred dark is where the deepest restoration is born.',
        shloka: 'ॐ शान्तिः शान्तिः शान्तिः',
        shlokaTranslation: 'Peace in body, mind, and spirit',
        glowRgb: '44,95,170',
        accentHex: '#4A8EE8',
        bg: '#02040E',
        stars: true,
    },
};

// Hard-coded star positions (avoids hydration mismatch)
const STARS = [
    { t: 8, l: 12, s: 1.5, o: 0.55 }, { t: 15, l: 78, s: 1.0, o: 0.40 },
    { t: 22, l: 34, s: 0.8, o: 0.30 }, { t: 6, l: 55, s: 1.2, o: 0.50 },
    { t: 31, l: 88, s: 0.7, o: 0.25 }, { t: 9, l: 92, s: 1.4, o: 0.45 },
    { t: 42, l: 6, s: 0.9, o: 0.30 }, { t: 18, l: 48, s: 0.6, o: 0.20 },
    { t: 5, l: 25, s: 1.8, o: 0.60 }, { t: 28, l: 70, s: 1.0, o: 0.35 },
    { t: 72, l: 15, s: 0.8, o: 0.22 }, { t: 80, l: 82, s: 1.1, o: 0.32 },
    { t: 68, l: 60, s: 0.7, o: 0.20 }, { t: 85, l: 40, s: 1.3, o: 0.28 },
    { t: 90, l: 72, s: 0.9, o: 0.35 }, { t: 78, l: 25, s: 0.6, o: 0.18 },
    { t: 12, l: 65, s: 1.6, o: 0.50 }, { t: 36, l: 44, s: 0.8, o: 0.25 },
    { t: 52, l: 95, s: 1.0, o: 0.30 }, { t: 63, l: 8, s: 1.2, o: 0.40 },
    { t: 3, l: 82, s: 0.9, o: 0.35 }, { t: 47, l: 28, s: 0.7, o: 0.22 },
    { t: 58, l: 50, s: 1.4, o: 0.30 }, { t: 88, l: 58, s: 0.8, o: 0.24 },
    { t: 24, l: 18, s: 1.0, o: 0.38 }, { t: 95, l: 18, s: 0.7, o: 0.20 },
];

function getTOD(): keyof typeof TOD_CONFIG {
    const h = new Date().getHours();
    if (h >= 5 && h < 11) return 'morning';
    if (h >= 11 && h < 17) return 'noon';
    if (h >= 17 && h < 21) return 'evening';
    return 'night';
}

function formatSacredTime(d: Date) {
    const h = d.getHours(), m = d.getMinutes(), s = d.getSeconds();
    const hh = h % 12 || 12;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    const ap = h >= 12 ? 'PM' : 'AM';
    return `${hh}:${mm}:${ss} ${ap}`;
}

const SESSION_KEY = 'pranav_entrance_v3';

interface Props { children: React.ReactNode; }

export default function PremiumEntranceSequence({ children }: Props) {
    const [showSplash, setShowSplash] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [liveTime, setLiveTime] = useState('');

    useEffect(() => {
        setMounted(true);
        setLiveTime(formatSacredTime(new Date()));
        try {
            if (sessionStorage.getItem(SESSION_KEY)) return;
            setShowSplash(true);
            const t = setTimeout(() => {
                setShowSplash(false);
                sessionStorage.setItem(SESSION_KEY, 'true');
            }, 4800);
            return () => clearTimeout(t);
        } catch { /* SSR guard */ }
    }, []);

    // Live clock ticks every second while splash is visible
    useEffect(() => {
        if (!showSplash) return;
        const tick = setInterval(() => setLiveTime(formatSacredTime(new Date())), 1000);
        return () => clearInterval(tick);
    }, [showSplash]);

    const tod = TOD_CONFIG[getTOD()];

    return (
        <>
            {children}

            <AnimatePresence>
                {mounted && showSplash && (
                    <motion.div
                        key="entrance-v3"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 1.1, ease: 'easeInOut' } }}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 9999,
                            background: tod.bg,
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden',
                        }}
                    >
                        {/* ── Stars (evening / night) ─────────────────────── */}
                        {tod.stars && STARS.map((s, i) => (
                            <motion.div key={i}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0, s.o, s.o * 0.5, s.o] }}
                                transition={{ delay: 0.1 + i * 0.045, duration: 2.8, times: [0, 0.3, 0.7, 1], repeat: Infinity, repeatType: 'reverse' }}
                                style={{ position: 'absolute', top: `${s.t}%`, left: `${s.l}%`, width: s.s * 2, height: s.s * 2, borderRadius: '50%', background: '#fff', pointerEvents: 'none' }}
                            />
                        ))}

                        {/* ── Primary radial glow ──────────────────────────── */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 2.0, ease: 'easeOut' }}
                            style={{
                                position: 'absolute', inset: 0, pointerEvents: 'none',
                                background: `radial-gradient(ellipse 65% 55% at 50% 50%, rgba(${tod.glowRgb},0.22) 0%, rgba(${tod.glowRgb},0.07) 50%, transparent 72%)`,
                            }}
                        />

                        {/* ── Breathing pulse ring ─────────────────────────── */}
                        <motion.div
                            style={{
                                position: 'absolute',
                                width: '50vmin', height: '50vmin',
                                borderRadius: '50%',
                                border: `1px solid rgba(${tod.glowRgb},0.18)`,
                                pointerEvents: 'none',
                            }}
                            animate={{ scale: [1, 1.12, 1], opacity: [0.35, 0.18, 0.35] }}
                            transition={{ duration: 4.0, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        <motion.div
                            style={{
                                position: 'absolute',
                                width: '35vmin', height: '35vmin',
                                borderRadius: '50%',
                                border: `1px solid rgba(${tod.glowRgb},0.12)`,
                                pointerEvents: 'none',
                            }}
                            animate={{ scale: [1, 1.18, 1], opacity: [0.22, 0.10, 0.22] }}
                            transition={{ duration: 4.0, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                        />

                        {/* ── OM symbol — the sacred entry point ──────────── */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 4 }}
                            animate={{ opacity: [0, 0.85, 0.85, 0.30], scale: [0.8, 1, 1, 1], y: [4, 0, 0, 0] }}
                            transition={{ duration: 3.5, times: [0, 0.15, 0.65, 1], ease: 'easeOut' }}
                            style={{
                                position: 'absolute',
                                top: '13%', left: '50%', transform: 'translateX(-50%)',
                                fontFamily: "'Playfair Display', serif",
                                fontSize: 'clamp(1.8rem, 6vw, 2.6rem)',
                                color: tod.accentHex,
                                pointerEvents: 'none',
                                lineHeight: 1,
                                userSelect: 'none',
                            }}
                        >
                            ॐ
                        </motion.div>

                        {/* ── Main text block ──────────────────────────────── */}
                        <div style={{
                            position: 'relative', zIndex: 10,
                            textAlign: 'center', padding: '0 clamp(1.5rem, 5vw, 3rem)',
                            width: '100%', maxWidth: 520,
                        }}>
                            {/* Sanskrit hero */}
                            <motion.h1
                                initial={{ opacity: 0, y: 22 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                                style={{
                                    margin: 0,
                                    fontFamily: "'Playfair Display', 'Noto Serif Devanagari', Georgia, serif",
                                    fontSize: 'clamp(2.4rem, 10vw, 4.2rem)',
                                    fontWeight: 400, letterSpacing: '0.03em', lineHeight: 1.1,
                                    color: '#FFFFFF',
                                }}
                            >
                                {tod.sanskrit}
                            </motion.h1>

                            {/* Romanized */}
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.65 }}
                                transition={{ delay: 0.8, duration: 1.0, ease: 'easeOut' }}
                                style={{
                                    margin: '0.6rem 0 0',
                                    fontFamily: "'Inter', system-ui, sans-serif",
                                    fontSize: 'clamp(0.5rem, 2vw, 0.65rem)',
                                    letterSpacing: '0.34em', textTransform: 'uppercase',
                                    color: tod.accentHex, fontWeight: 500,
                                }}
                            >
                                {tod.romanized}
                            </motion.p>

                            {/* Ornament separator */}
                            <motion.div
                                initial={{ scaleX: 0, opacity: 0 }}
                                animate={{ scaleX: 1, opacity: 1 }}
                                transition={{ delay: 1.1, duration: 0.8, ease: 'easeOut' }}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.55rem', margin: '1.3rem auto', transformOrigin: 'center' }}
                            >
                                <div style={{ width: 28, height: 1, background: `rgba(${tod.glowRgb},0.50)`, borderRadius: 1 }} />
                                <div style={{ width: 5, height: 5, borderRadius: '50%', background: `rgba(${tod.glowRgb},0.80)` }} />
                                <div style={{ width: 28, height: 1, background: `rgba(${tod.glowRgb},0.50)`, borderRadius: 1 }} />
                            </motion.div>

                            {/* Rāga name — italic serif */}
                            <motion.p
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 1.25, duration: 0.9, ease: 'easeOut' }}
                                style={{
                                    margin: 0,
                                    fontFamily: "'Playfair Display', Georgia, serif",
                                    fontSize: 'clamp(1.1rem, 4.5vw, 1.55rem)',
                                    fontWeight: 400, letterSpacing: '0.04em', fontStyle: 'italic',
                                    color: 'rgba(255,255,255,0.90)',
                                }}
                            >
                                {tod.raag}
                            </motion.p>

                            {/* Period */}
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.48 }}
                                transition={{ delay: 1.6, duration: 0.85, ease: 'easeOut' }}
                                style={{
                                    margin: '0.35rem 0 0',
                                    fontFamily: "'Inter', system-ui, sans-serif",
                                    fontSize: 'clamp(0.46rem, 1.8vw, 0.60rem)',
                                    letterSpacing: '0.24em', textTransform: 'uppercase',
                                    color: 'rgba(255,255,255,0.52)',
                                }}
                            >
                                {tod.period}
                            </motion.p>

                            {/* Blessing */}
                            <motion.p
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 0.42, y: 0 }}
                                transition={{ delay: 2.0, duration: 1.0, ease: 'easeOut' }}
                                style={{
                                    margin: '1.3rem auto 0', maxWidth: 340,
                                    fontFamily: "'Playfair Display', Georgia, serif",
                                    fontSize: 'clamp(0.62rem, 2.2vw, 0.78rem)',
                                    fontStyle: 'italic', letterSpacing: '0.02em', lineHeight: 1.9,
                                    color: 'rgba(255,255,255,0.7)',
                                }}
                            >
                                &ldquo;{tod.blessing}&rdquo;
                            </motion.p>

                            {/* ── Creative extra: Shloka section ───────────── */}
                            <motion.div
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 2.6, duration: 1.0, ease: 'easeOut' }}
                                style={{
                                    margin: '1.6rem auto 0',
                                    padding: '0.7rem 1.2rem',
                                    borderRadius: '0.75rem',
                                    background: `rgba(${tod.glowRgb},0.07)`,
                                    border: `1px solid rgba(${tod.glowRgb},0.18)`,
                                    maxWidth: 320, display: 'inline-block',
                                }}
                            >
                                <p style={{
                                    margin: 0,
                                    fontFamily: "'Playfair Display', Georgia, serif",
                                    fontSize: 'clamp(0.9rem, 3vw, 1.1rem)',
                                    color: tod.accentHex, fontWeight: 400,
                                    letterSpacing: '0.04em', lineHeight: 1.5,
                                }}>
                                    {tod.shloka}
                                </p>
                                <p style={{
                                    margin: '0.3rem 0 0',
                                    fontFamily: "'Inter', system-ui, sans-serif",
                                    fontSize: 'clamp(0.46rem, 1.7vw, 0.58rem)',
                                    color: 'rgba(255,255,255,0.38)',
                                    letterSpacing: '0.16em', textTransform: 'uppercase',
                                    fontStyle: 'italic',
                                }}>
                                    {tod.shlokaTranslation}
                                </p>
                            </motion.div>
                        </div>

                        {/* ── Live sacred clock ─────────────────────────────── */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.38 }}
                            transition={{ delay: 1.8, duration: 1.2, ease: 'easeOut' }}
                            style={{
                                position: 'absolute', bottom: '13vh', left: '50%', transform: 'translateX(-50%)',
                                fontFamily: 'monospace',
                                fontSize: 'clamp(0.55rem, 2vw, 0.72rem)',
                                letterSpacing: '0.28em', textTransform: 'uppercase',
                                color: 'rgba(255,255,255,0.55)',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {liveTime}  ·  IST
                        </motion.div>

                        {/* ── Countdown bar ─────────────────────────────────── */}
                        <div style={{
                            position: 'absolute', bottom: '8vh', left: '50%', transform: 'translateX(-50%)',
                            width: 'min(160px, 35vw)', height: 1,
                            background: 'rgba(255,255,255,0.06)', borderRadius: 1, overflow: 'hidden',
                        }}>
                            <motion.div
                                initial={{ width: '100%' }} animate={{ width: '0%' }}
                                transition={{ delay: 0.3, duration: 4.5, ease: 'linear' }}
                                style={{ height: '100%', borderRadius: 1, background: `linear-gradient(90deg, transparent, ${tod.accentHex})` }}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
