'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Music2, Zap } from 'lucide-react';

// ── Time-of-day configuration ─────────────────────────────────────────────────
const TIME_CONFIG = {
    morning: {
        sanskrit: 'शुभोदय', romanized: 'Shubhodaya', greeting: 'Good Morning', emoji: '🌅',
        blessing: 'May this dawn fill your mind with clarity, purpose, and boundless light.',
        raagName: 'Rāga Bhairav', raagType: 'Morning Rāga · Sunrise to 11 AM',
        headline: 'Your sacred morning frequency is ready',
        sciences: [
            { icon: '🧠', label: 'Alpha Waves', detail: '8–13 Hz focus induction in 7 min' },
            { icon: '🔬', label: '–34% Cortisol', detail: 'NIMHANS clinical study' },
            { icon: '❤️', label: 'Heart Coherence', detail: 'HRV improvement in 20-min sessions' },
            { icon: '⚡', label: '+2–3hr Focus', detail: 'Post-listen cognitive uplift' },
        ],
        accent: '255,185,60', glow: 'rgba(255,155,30,0.30)',
        bg: 'radial-gradient(ellipse at 40% 20%, rgba(255,140,20,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(200,100,0,0.08) 0%, transparent 60%)',
    },
    noon: {
        sanskrit: 'शुभ मध्याह्न', romanized: 'Shubh Madhyahna', greeting: 'Good Afternoon', emoji: '☀️',
        blessing: 'The sun is at its peak — and so is your capacity to achieve.',
        raagName: 'Rāga Bhimpalasi', raagType: 'Afternoon Rāga · Midday Power',
        headline: 'Your midday power frequency awaits',
        sciences: [
            { icon: '🎯', label: 'Peak Attention', detail: 'Counters the 2–4 PM cognitive dip' },
            { icon: '🌊', label: 'Theta Bridge', detail: '6–8 Hz for fluid problem-solving' },
            { icon: '😌', label: 'Stress Reset', detail: 'Parasympathetic activation in 5 min' },
            { icon: '💡', label: 'Creative Flow', detail: 'Enhanced divergent thinking' },
        ],
        accent: '255,210,60', glow: 'rgba(255,180,20,0.28)',
        bg: 'radial-gradient(ellipse at 40% 20%, rgba(255,200,20,0.10) 0%, transparent 60%)',
    },
    evening: {
        sanskrit: 'शुभ सन्ध्या', romanized: 'Shubh Sandhya', greeting: 'Good Evening', emoji: '🪔',
        blessing: 'The twilight hour is sacred — a bridge between doing and being.',
        raagName: 'Rāga Yaman', raagType: 'Twilight Rāga · 5 PM to 9 PM',
        headline: 'Your creative twilight frequency is live',
        sciences: [
            { icon: '🌀', label: 'Theta Induction', detail: '4–7 Hz — gateway to intuition' },
            { icon: '🎨', label: 'Right-Brain Lit', detail: 'fMRI-confirmed DMN activation' },
            { icon: '😌', label: 'Amygdala Calmed', detail: 'Stress response off in 7 min' },
            { icon: '💡', label: 'Insight State', detail: 'Ideal for creativity and reflection' },
        ],
        accent: '190,130,255', glow: 'rgba(160,90,255,0.28)',
        bg: 'radial-gradient(ellipse at 40% 20%, rgba(130,60,220,0.13) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(180,80,255,0.06) 0%, transparent 60%)',
    },
    night: {
        sanskrit: 'शुभ रात्रि', romanized: 'Shubh Ratri', greeting: 'Good Night', emoji: '🌙',
        blessing: 'The sacred dark is where the deepest restoration and insight is born.',
        raagName: 'Rāga Bhairavi', raagType: 'Night Rāga · Deep Rest · Sacred Dark',
        headline: 'Your night recovery frequency awaits',
        sciences: [
            { icon: '🌙', label: 'Delta Bridge', detail: '0.5–4 Hz total neural restoration' },
            { icon: '🧬', label: 'Glymphatic Flush', detail: 'Beta-amyloid clearance (Nature 2022)' },
            { icon: '💤', label: 'GABA Release', detail: 'Inhibitory neurotransmitter elevation' },
            { icon: '⚗️', label: 'Memory Seal', detail: 'Day\'s learning locked into long-term' },
        ],
        accent: '80,165,255', glow: 'rgba(50,130,255,0.28)',
        bg: 'radial-gradient(ellipse at 40% 20%, rgba(30,80,200,0.13) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(60,120,255,0.06) 0%, transparent 60%)',
    },
};

function getTimeKey() {
    const h = new Date().getHours();
    if (h >= 5 && h < 11) return 'morning' as const;
    if (h >= 11 && h < 17) return 'noon' as const;
    if (h >= 17 && h < 21) return 'evening' as const;
    return 'night' as const;
}

interface Props { displayName?: string; onClose: () => void; }

export default function WelcomeSplash({ displayName = 'Traveller', onClose }: Props) {
    const [visible, setVisible] = useState(true);
    const cfg = TIME_CONFIG[getTimeKey()];
    const accentCss = `rgba(${cfg.accent},1)`;
    const accentSoft = `rgba(${cfg.accent},0.80)`;
    const accentFaint = `rgba(${cfg.accent},0.12)`;
    const accentBorder = `rgba(${cfg.accent},0.22)`;

    // Animated particle canvas behind the card
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current; if (!canvas) return;
        const ctx = canvas.getContext('2d'); if (!ctx) return;
        const [r, g, b] = cfg.accent.split(',').map(Number);
        let raf = 0, t = 0;
        const particles = Array.from({ length: 22 }, () => ({
            x: Math.random() * 520, y: Math.random() * 640,
            vx: (Math.random() - 0.5) * 0.25, vy: -Math.random() * 0.35 - 0.08,
            size: Math.random() * 2 + 0.6, op: Math.random() * 0.4 + 0.1,
        }));
        const tick = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height); t += 0.01;
            particles.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                if (p.y < -8) { p.y = canvas.height + 8; p.x = Math.random() * canvas.width; }
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${r},${g},${b},${p.op * (0.7 + Math.sin(t + p.x * 0.01) * 0.3)})`;
                ctx.fill();
            });
            raf = requestAnimationFrame(tick);
        };
        tick();
        return () => cancelAnimationFrame(raf);
    }, [cfg.accent]);

    // Auto-dismiss after 14 s
    useEffect(() => {
        const t = setTimeout(() => setVisible(false), 14000);
        return () => clearTimeout(t);
    }, []);

    return (
        <AnimatePresence onExitComplete={onClose}>
            {visible && (
                <>
                    {/* ── Full-screen frosted backdrop ── */}
                    <motion.div
                        key="ws-backdrop"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        onClick={() => setVisible(false)}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 300,
                            background: 'rgba(0,0,4,0.80)',
                            backdropFilter: 'blur(18px)',
                            WebkitBackdropFilter: 'blur(18px)',
                            cursor: 'pointer',
                        }}
                    />

                    {/* Floating particles — uses plain CSS translate so it's unaffected by FM */}
                    <canvas ref={canvasRef} width={520} height={640}
                        style={{ position: 'fixed', top: '50%', left: '50%', translate: '-50% -50%', zIndex: 301, pointerEvents: 'none', opacity: 0.65 }} />

                    {/* ── Centering shell — plain div so FM transforms don't fight with translate ── */}
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 302,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '1rem', pointerEvents: 'none',
                    }}>
                        {/* ── Unified Card ── */}
                        <motion.div
                            key="ws-card"
                            initial={{ opacity: 0, scale: 0.92, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20, filter: 'blur(12px)' }}
                            transition={{ duration: 0.70, ease: [0.16, 1, 0.3, 1] }}
                            style={{
                                pointerEvents: 'auto',
                                // Responsive: full width on mobile, max 460px on desktop
                                width: 'min(calc(100vw - 2rem), 460px)',
                                maxHeight: 'calc(100dvh - 3rem)',
                                overflowY: 'auto',
                                borderRadius: '1.75rem',
                                background: `${cfg.bg}, rgba(5,3,16,0.94)`,
                                border: `1px solid ${accentBorder}`,
                                boxShadow: `0 0 80px ${cfg.glow}, 0 24px 80px rgba(0,0,0,0.80), inset 0 1px 0 rgba(255,255,255,0.06)`,
                                backdropFilter: 'blur(32px)',
                                WebkitBackdropFilter: 'blur(32px)',
                            }}
                        >
                            {/* Animated shimmer top bar */}
                            <motion.div
                                animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                                style={{
                                    height: 2, flexShrink: 0,
                                    background: `linear-gradient(90deg, transparent, ${accentCss}, rgba(255,255,255,0.65), ${accentCss}, transparent)`,
                                    backgroundSize: '200% 100%',
                                }}
                            />

                            <div style={{ padding: 'clamp(1.4rem, 5vw, 1.9rem)' }}>

                                {/* ── Close button ── */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                                    <button onClick={() => setVisible(false)} style={{
                                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '50%', width: 28, height: 28, display: 'flex',
                                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                        color: 'rgba(255,255,255,0.35)',
                                    }}><X size={13} /></button>
                                </div>

                                {/* ── GREETING SECTION ── */}
                                <motion.div
                                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1, duration: 0.55 }}
                                    style={{ textAlign: 'center', paddingBottom: '1.5rem', borderBottom: `1px solid rgba(${cfg.accent},0.14)` }}
                                >
                                    {/* Emoji */}
                                    <div style={{ fontSize: '2.2rem', lineHeight: 1, marginBottom: '0.7rem' }}>
                                        {cfg.emoji}
                                    </div>
                                    {/* Sanskrit greeting — the hero */}
                                    <h1 style={{
                                        margin: 0,
                                        fontFamily: "'Playfair Display', Georgia, serif",
                                        fontSize: 'clamp(2rem, 8vw, 2.5rem)',
                                        fontWeight: 700, letterSpacing: '-0.01em',
                                        color: 'rgba(255,255,255,0.97)', lineHeight: 1.1,
                                    }}>{cfg.sanskrit}</h1>
                                    {/* Romanized */}
                                    <p style={{
                                        margin: '0.35rem 0 0', fontSize: '0.58rem', letterSpacing: '0.32em',
                                        textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700,
                                        color: accentSoft,
                                    }}>{cfg.romanized}</p>
                                    {/* Personalized line */}
                                    <p style={{
                                        margin: '0.9rem 0 0', fontSize: '1rem',
                                        fontFamily: "'Playfair Display', Georgia, serif",
                                        color: 'rgba(255,255,255,0.68)',
                                    }}>
                                        {cfg.greeting},{' '}
                                        <span style={{ color: accentSoft, fontWeight: 700 }}>{displayName}</span>
                                    </p>
                                    {/* Blessing */}
                                    <p style={{
                                        margin: '0.5rem auto 0', maxWidth: 300,
                                        fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)',
                                        lineHeight: 1.75, fontStyle: 'italic',
                                        fontFamily: "'Playfair Display', Georgia, serif",
                                    }}>{cfg.blessing}</p>
                                </motion.div>

                                {/* ── RAAG SECTION ── */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.25, duration: 0.55 }}
                                    style={{ paddingTop: '1.3rem' }}
                                >
                                    {/* Raag label */}
                                    <p style={{
                                        margin: '0 0 0.55rem', fontSize: '0.5rem', letterSpacing: '0.26em',
                                        textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700,
                                        color: accentSoft, opacity: 0.75,
                                    }}>Current Resonance</p>

                                    {/* Raag pill */}
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '0.65rem',
                                        background: accentFaint, border: `1px solid ${accentBorder}`,
                                        borderRadius: '1rem', padding: '0.7rem 0.9rem',
                                        marginBottom: '0.9rem',
                                    }}>
                                        <Music2 size={15} style={{ color: accentCss, flexShrink: 0 }} />
                                        <div>
                                            <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: accentCss, fontFamily: "'Playfair Display', serif" }}>{cfg.raagName}</p>
                                            <p style={{ margin: 0, fontSize: '0.5rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'monospace' }}>{cfg.raagType}</p>
                                        </div>
                                    </div>

                                    {/* Headline */}
                                    <p style={{
                                        margin: '0 0 0.8rem',
                                        fontSize: '0.82rem', fontWeight: 600,
                                        fontFamily: "'Playfair Display', Georgia, serif",
                                        color: 'rgba(255,255,255,0.88)',
                                    }}>{cfg.headline}</p>

                                    {/* 2×2 science grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem', marginBottom: '1.25rem' }}>
                                        {cfg.sciences.map((s, i) => (
                                            <motion.div
                                                key={s.label}
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.35 + i * 0.06 }}
                                                style={{
                                                    background: 'rgba(255,255,255,0.03)',
                                                    border: '1px solid rgba(255,255,255,0.06)',
                                                    borderRadius: '0.85rem', padding: '0.6rem 0.7rem',
                                                }}
                                            >
                                                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1 }}>{s.icon}</p>
                                                <p style={{ margin: '0.22rem 0 0.1rem', fontSize: '0.56rem', fontWeight: 700, color: accentSoft, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'monospace' }}>{s.label}</p>
                                                <p style={{ margin: 0, fontSize: '0.55rem', color: 'rgba(255,255,255,0.36)', lineHeight: 1.55 }}>{s.detail}</p>
                                            </motion.div>
                                        ))}
                                    </div>

                                    {/* ── Begin Journey CTA ── */}
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        whileHover={{ scale: 1.02 }}
                                        onClick={() => setVisible(false)}
                                        style={{
                                            width: '100%', display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', gap: '0.5rem',
                                            padding: '0.85rem 1.5rem', borderRadius: 999,
                                            background: accentFaint,
                                            border: `1px solid ${accentBorder}`,
                                            cursor: 'pointer', color: accentCss,
                                            fontSize: '0.7rem', fontWeight: 700,
                                            letterSpacing: '0.18em', textTransform: 'uppercase',
                                            fontFamily: 'monospace',
                                            boxShadow: `0 0 24px ${cfg.glow}`,
                                        }}
                                    >
                                        <Zap size={13} />
                                        Begin Journey
                                    </motion.button>

                                    {/* Auto-dismiss countdown bar */}
                                    <div style={{ marginTop: '1rem', height: 2, borderRadius: 999, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                                        <motion.div
                                            initial={{ width: '100%' }} animate={{ width: '0%' }}
                                            transition={{ duration: 14, ease: 'linear' }}
                                            style={{ height: '100%', borderRadius: 999, background: `linear-gradient(90deg, transparent, ${accentCss})` }}
                                        />
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
