'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { Play, Pause, X, SkipBack, SkipForward } from 'lucide-react';
import dynamic from 'next/dynamic';

const LeelaGraphicsEmbed = dynamic(
    () => import('@/components/Leela/LeelaGraphicsEmbed'),
    { ssr: false, loading: () => <div style={{ width: '100%', height: '100%', background: '#010006' }} /> }
);

// ── Hover wrapper shared by all 4 portals ────────────────────────────────────
function PortalSlot({
    href,
    children,
    style,
    className,
}: {
    href: string;
    children: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
}) {
    return (
        <Link href={href} style={{ textDecoration: 'none', display: 'contents' }}>
            <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                className={className}
                style={{
                    cursor: 'pointer',
                    borderRadius: '1.5rem',
                    overflow: 'hidden',
                    position: 'relative',
                    ...style,
                }}
            >
                {children}
            </motion.div>
        </Link>
    );
}

// ── 1. PranaVerse — Square Portal (col-span-1) ─────────────────────────────────
function PranaVerseCard() {
    return (
        <PortalSlot
            href="/pranaverse"
            style={{
                gridColumn: 'span 1',
                gridRow: 'span 1',
                aspectRatio: '1 / 1',
                background: 'rgba(6,25,30,0.55)',
                border: '1px solid rgba(20,184,166,0.15)',
                backdropFilter: 'blur(20px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                padding: '1rem',
            }}
        >
            {/* Teal orb */}
            <div style={{
                width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
                background: 'radial-gradient(circle, rgba(20,184,166,0.30) 0%, rgba(6,182,212,0.12) 70%)',
                border: '1.5px solid rgba(20,184,166,0.50)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem', boxShadow: '0 0 28px rgba(20,184,166,0.25)',
            }}>🌀</div>
            {/* Text */}
            <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(20,184,166,0.95)', fontFamily: 'monospace', fontWeight: 600 }}>PranaVIBEs</p>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.6rem', color: 'rgba(255,255,255,0.38)', letterSpacing: '0.05em' }}>Conscious feed</p>
            </div>
        </PortalSlot>
    );
}

// ── outPLUGS — Square Portal (col-span-1) ────────────────────────────────────
function OutPlugsCard() {
    return (
        <PortalSlot
            href="/outplugs"
            style={{
                gridColumn: 'span 1',
                gridRow: 'span 1',
                aspectRatio: '1 / 1',
                background: 'rgba(232,93,4,0.07)',
                border: '1px solid rgba(232,93,4,0.22)',
                backdropFilter: 'blur(20px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                padding: '1rem',
            }}
        >
            {/* Calm, glowing spark orb */}
            <motion.div
                animate={{ scale: [1, 1.05, 1], opacity: [0.85, 1, 0.85] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                    width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
                    background: 'radial-gradient(circle, rgba(232,93,4,0.35) 0%, rgba(180,50,0,0.15) 70%)',
                    border: '1.5px solid rgba(232,93,4,0.55)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.8rem', boxShadow: '0 0 28px rgba(232,93,4,0.28)',
                }}>✧</motion.div>
            {/* Text */}
            <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(232,93,4,0.95)', fontFamily: 'monospace', fontWeight: 600 }}>outPLUGS</p>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.6rem', color: 'rgba(255,255,255,0.38)', letterSpacing: '0.05em' }}>Mindful news</p>
            </div>
        </PortalSlot>
    );
}


// ── 2. SUTRA — Portal Ring Style (col-span-1 square) ─────────────────────────
function SutraCard() {
    return (
        <PortalSlot
            href="/onesutra"
            style={{
                gridColumn: 'span 1',
                gridRow: 'span 1',
                aspectRatio: '1 / 1',
                background: 'rgba(109,40,217,0.08)',
                border: '1px solid rgba(192,132,252,0.15)',
                backdropFilter: 'blur(16px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                padding: '1rem',
            }}
        >
            {/* Pulsing amethyst ring */}
            <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
                {[0, 1, 2].map(i => (
                    <motion.div
                        key={i}
                        style={{
                            position: 'absolute', inset: 0, borderRadius: '50%',
                            border: '1px solid rgba(192,132,252,0.35)',
                        }}
                        animate={{
                            scale: [1, 1.5 + i * 0.3, 1],
                            opacity: [0.7, 0, 0.7],
                        }}
                        transition={{
                            duration: 2.4,
                            repeat: Infinity,
                            ease: 'easeOut',
                            delay: i * 0.6,
                        }}
                    />
                ))}
                <div style={{
                    position: 'absolute', inset: 0,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(192,132,252,0.28) 0%, rgba(109,40,217,0.12) 70%)',
                    border: '1.5px solid rgba(192,132,252,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.4rem',
                    boxShadow: '0 0 30px rgba(192,132,252,0.30)',
                }}>
                    🪷
                </div>
            </div>
            <div style={{ textAlign: 'center' }}>
                <p style={{
                    margin: 0,
                    fontSize: '0.6rem',
                    letterSpacing: '0.35em',
                    textTransform: 'uppercase',
                    color: 'rgba(192,132,252,0.9)',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                }}>
                    SUTRAConnect
                </p>
                <p style={{
                    margin: '0.2rem 0 0',
                    fontSize: '0.6rem',
                    color: 'rgba(255,255,255,0.38)',
                    letterSpacing: '0.05em',
                }}>
                    Conscious Connect
                </p>
            </div>
        </PortalSlot>
    );
}

// ── 3. Acharya — Mini Cosmic Orb Portal (col-span-1 square) ──────────────────
function AcharyaCard() {
    return (
        <PortalSlot
            href="/acharya-samvad"
            style={{
                gridColumn: 'span 1',
                gridRow: 'span 1',
                aspectRatio: '1 / 1',
                background: 'rgba(30,27,75,0.18)',
                border: '1px solid rgba(99,102,241,0.15)',
                backdropFilter: 'blur(16px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                padding: '1rem',
            }}
        >
            {/* Mini cosmic orb */}
            <motion.div
                animate={{
                    boxShadow: [
                        '0 0 30px rgba(67,56,202,0.35), inset 0 0 20px rgba(224,231,255,0.08)',
                        '0 0 55px rgba(67,56,202,0.55), inset 0 0 35px rgba(224,231,255,0.16)',
                        '0 0 30px rgba(67,56,202,0.35), inset 0 0 20px rgba(224,231,255,0.08)',
                    ],
                    scale: [1, 1.05, 1],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                    width: 64, height: 64,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 32% 32%, #4338ca 0%, #1e1b4b 50%, #020617 100%)',
                    border: '1px solid rgba(165,180,252,0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    flexShrink: 0,
                }}
            >
                {/* Specular highlight */}
                <div style={{
                    position: 'absolute', top: '10%', left: '14%',
                    width: '28%', height: '16%',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.18)',
                    filter: 'blur(4px)',
                    transform: 'rotate(-20deg)',
                }} />
                <span style={{
                    fontSize: '1.2rem',
                    filter: 'drop-shadow(0 0 8px rgba(165,180,252,0.6))',
                    userSelect: 'none',
                }}>ॐ</span>
            </motion.div>
            <div style={{ textAlign: 'center' }}>
                <p style={{
                    margin: 0,
                    fontSize: '0.6rem',
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: 'rgba(165,180,252,0.9)',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                }}>
                    Acharya
                </p>
                <p style={{
                    margin: '0.2rem 0 0',
                    fontSize: '0.6rem',
                    color: 'rgba(255,255,255,0.38)',
                    letterSpacing: '0.05em',
                }}>
                    Awaken Guidance
                </p>
            </div>
        </PortalSlot>
    );
}

// ── 5. Dhyan Kshetra — Golden Mantra Portal (col-span-1 square) ──────────────
function DhyanCard() {
    return (
        <PortalSlot
            href="/dhyan-kshetra"
            style={{
                gridColumn: 'span 1',
                gridRow: 'span 1',
                aspectRatio: '1 / 1',
                background: 'rgba(251,191,36,0.06)',
                border: '1px solid rgba(251,191,36,0.15)',
                backdropFilter: 'blur(16px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                padding: '1rem',
            }}
        >
            {/* Golden aura disk */}
            <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
                <motion.div
                    animate={{ opacity: [0.45, 0.75, 0.45], scale: [1, 1.18, 1] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                        position: 'absolute', inset: -10, borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(251,191,36,0.28) 0%, transparent 70%)',
                    }}
                />
                <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(251,191,36,0.22) 0%, rgba(234,179,8,0.10) 70%)',
                    border: '1.5px solid rgba(251,191,36,0.45)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.5rem',
                    boxShadow: '0 0 28px rgba(251,191,36,0.25)',
                }}>🪔</div>
            </div>
            <div style={{ textAlign: 'center' }}>
                <p style={{
                    margin: 0, fontSize: '0.6rem', letterSpacing: '0.25em',
                    textTransform: 'uppercase', color: 'rgba(253,230,138,0.90)',
                    fontFamily: 'monospace', fontWeight: 600,
                }}>Meditate</p>
                <p style={{
                    margin: '0.2rem 0 0', fontSize: '0.6rem',
                    color: 'rgba(255,255,255,0.38)', letterSpacing: '0.05em',
                }}>Sacred Mantras</p>
            </div>
        </PortalSlot>
    );
}

// ── Time helpers ──────────────────────────────────────────────────────────────
function getSacredTimePeriod() {
    const h = new Date().getHours();
    if (h >= 5 && h < 11) return 'morning';
    if (h >= 11 && h < 16) return 'noon';
    if (h >= 16 && h < 21) return 'evening';
    return 'night';
}
const SACRED_META: Record<string, { name: string; raag: string; accent: string; p0: string; phase: number; science: string; stat1: string; stat2: string; stat3: string; bloom: number; speed: number }> = {
    morning: { name: 'Morning Rāag', raag: 'Rāga Bhairav · 432 Hz · Dawn Frequencies', accent: 'rgba(255,185,60,1)', p0: '255,185,60', phase: 0, science: 'Calm your mind · Refresh your mood · Ancient, engineered frequencies that trigger dopamine, serotonin and deep brainwave states — the same sounds India’s greatest minds have used for 5,000 years.', stat1: '3.2× Focus', stat2: '−38% Cortisol', stat3: '+61% Output', bloom: 1.6, speed: 0.55 },
    noon: { name: 'Noon Rāag', raag: 'Rāga Bhimpalasi · 528 Hz · Midday Power', accent: 'rgba(255,215,60,1)', p0: '255,215,60', phase: 0, science: 'Calm your mind · Refresh your mood · Ancient, engineered frequencies that trigger dopamine, serotonin and deep brainwave states — the same sounds India’s greatest minds have used for 5,000 years.', stat1: '4× Flow', stat2: '+52% Alpha', stat3: '+74% Clarity', bloom: 1.8, speed: 0.65 },
    evening: { name: 'Evening Rāag', raag: 'Rāga Yaman · 639 Hz · Creative Twilight', accent: 'rgba(190,130,255,1)', p0: '180,100,255', phase: 2, science: 'Calm your mind · Refresh your mood · Ancient, engineered frequencies that trigger dopamine, serotonin and deep brainwave states — the same sounds India’s greatest minds have used for 5,000 years.', stat1: '+89% Creative', stat2: '+44% Theta', stat3: '6× Ideas', bloom: 2.2, speed: 0.55 },
    night: { name: 'Night Rāag', raag: 'Rāga Yaman Kalyan · 396 Hz · Deep Reset', accent: 'rgba(80,160,255,1)', p0: '80,140,255', phase: 1, science: 'Calm your mind · Refresh your mood · Ancient, engineered frequencies that trigger dopamine, serotonin and deep brainwave states — the same sounds India’s greatest minds have used for 5,000 years.', stat1: '+67% Sleep', stat2: '+41% Delta', stat3: '−45% Stress', bloom: 1.6, speed: 0.45 },
};

const TRACKS = [
    { id: 'leela-sparsha', title: 'Leela · Sparsha', artist: 'Rāga Bhairav · 15 Min', src: 'https://ik.imagekit.io/rcsesr4xf/sitar.mp3' },
    { id: 'gayatri', title: 'Gāyatrī Ghanpāth', artist: 'Vedic Chant', src: 'https://ik.imagekit.io/rcsesr4xf/gayatri-mantra-ghanpaath.mp3' },
    { id: 'lalitha', title: 'Lalithā Sahasranāmam', artist: 'Bhakti Yoga', src: 'https://ik.imagekit.io/rcsesr4xf/Lalitha-Sahasranamam.mp3' },
];

function fmtT(s: number) { return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`; }

// ── Full Raag Player Modal ─────────────────────────────────────────────────────
function RaagModal({ onClose }: { onClose: () => void }) {
    const period = getSacredTimePeriod();
    const meta = SACRED_META[period];
    const { p0, accent } = meta;
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [playing, setPlaying] = useState(false);
    const [idx, setIdx] = useState(0);
    const [prog, setProg] = useState(0);
    const [cur, setCur] = useState(0);
    const [dur, setDur] = useState(0);

    useEffect(() => {
        const a = new Audio();
        a.crossOrigin = 'anonymous';
        a.onended = () => setIdx(i => (i + 1) % TRACKS.length);
        a.ontimeupdate = () => { setCur(a.currentTime); setProg(a.duration ? a.currentTime / a.duration : 0); };
        a.onloadedmetadata = () => setDur(a.duration);
        audioRef.current = a;
        // Close on Escape
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => { a.pause(); a.src = ''; window.removeEventListener('keydown', onKey); };
    }, [onClose]);

    useEffect(() => {
        const a = audioRef.current; if (!a) return;
        a.src = TRACKS[idx].src; a.load();
        if (playing) a.play().catch(() => setPlaying(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idx]);

    const toggle = useCallback(() => {
        setPlaying(prev => {
            const next = !prev;
            const a = audioRef.current; if (!a) return next;
            if (next) { a.play().catch(() => setPlaying(false)); videoRef.current?.play().catch(() => { }); }
            else { a.pause(); videoRef.current?.pause(); }
            return next;
        });
    }, []);

    const seek = (e: React.MouseEvent<HTMLDivElement>) => {
        const a = audioRef.current; if (!a || !a.duration) return;
        const r = e.currentTarget.getBoundingClientRect();
        a.currentTime = ((e.clientX - r.left) / r.width) * a.duration;
    };

    const track = TRACKS[idx];

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <motion.div
                initial={{ scale: 0.93, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 24 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                style={{ width: 'min(860px, 96vw)', borderRadius: '2rem', overflow: 'hidden', background: 'rgba(2,1,8,0.98)', border: `1px solid rgba(${p0},0.18)`, boxShadow: `0 20px 100px rgba(0,0,0,0.90), 0 0 0 1px rgba(${p0},0.06)`, position: 'relative' }}
            >
                {/* Close */}
                <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.75)', lineHeight: 0 }}>
                    <X size={16} />
                </button>

                {/* ── SCREEN ── */}
                <div style={{ position: 'relative', aspectRatio: '16/9', background: '#010006', overflow: 'hidden' }}>
                    <video ref={videoRef} src="/videos/mahashivratri_darshan.mp4" muted loop playsInline
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: playing ? 0.20 : 0.10, filter: 'saturate(0.35) brightness(0.4)', transition: 'opacity 2s ease', zIndex: 0 }} />
                    <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                        <Suspense fallback={null}>
                            <LeelaGraphicsEmbed phaseIdx={meta.phase} isPlaying={playing} speed={meta.speed} bloom={meta.bloom} />
                        </Suspense>
                    </div>
                    {/* Bottom gradient + track name (paused only) */}
                    <AnimatePresence>
                        {!playing && (
                            <motion.div key="paused" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'linear-gradient(to top, rgba(1,0,6,0.80) 0%, transparent 60%)', pointerEvents: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 'clamp(0.9rem,2.5vw,1.4rem)' }}>
                                <h3 style={{ margin: '0 0 0.2rem', fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.1rem,3.5vw,1.8rem)', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', textShadow: `0 2px 20px rgba(${p0},0.50)` }}>{track.title}</h3>
                                <p style={{ margin: 0, fontSize: 'clamp(0.55rem,1.4vw,0.64rem)', letterSpacing: '0.14em', fontFamily: 'monospace', color: `rgba(${p0},0.70)`, textTransform: 'uppercase' }}>{track.artist}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    {/* Ambient gradient when playing */}
                    {playing && <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'linear-gradient(to top, rgba(1,0,6,0.30) 0%, transparent 35%)', pointerEvents: 'none' }} />}
                    {/* Play/Pause button */}
                    <div style={{ position: 'absolute', inset: 0, zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                        <motion.button onClick={toggle} whileTap={{ scale: 0.88 }} whileHover={{ scale: 1.07 }}
                            animate={playing ? { boxShadow: [`0 0 0 0 rgba(${p0},0.50)`, `0 0 0 22px rgba(${p0},0.00)`, `0 0 0 0 rgba(${p0},0.50)`] } : { boxShadow: '0 8px 40px rgba(0,0,0,0.60)' }}
                            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                            style={{ width: 70, height: 70, borderRadius: '50%', background: playing ? 'rgba(0,0,0,0.38)' : 'linear-gradient(145deg,rgba(255,255,255,0.35),rgba(255,255,255,0.14))', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: playing ? `2px solid rgba(${p0},0.55)` : '2px solid rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: playing ? accent : '#fff', transition: 'all 0.4s ease', pointerEvents: 'auto' }}>
                            {playing ? <Pause size={24} fill="currentColor" /> : <Play size={28} fill="currentColor" style={{ marginLeft: 3 }} />}
                        </motion.button>
                    </div>
                </div>

                {/* ── CONTROLS ── */}
                <div style={{ padding: 'clamp(1rem,2.5vw,1.4rem) clamp(1.2rem,3vw,2rem)', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: `1px solid rgba(${p0},0.10)` }}>
                    {/* Science line */}
                    <p style={{ margin: 0, fontSize: 'clamp(0.58rem,1.3vw,0.70rem)', color: 'rgba(255,255,255,0.50)', fontStyle: 'italic', letterSpacing: '0.01em', lineHeight: 1.55, borderLeft: `2px solid rgba(${p0},0.40)`, paddingLeft: '0.75rem' }}>
                        {meta.science}
                    </p>
                    {/* Stats row */}
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {[meta.stat1, meta.stat2, meta.stat3].map((s, i) => (
                            <div key={i} style={{ background: `rgba(${p0},0.08)`, border: `1px solid rgba(${p0},0.18)`, borderRadius: 12, padding: '0.35rem 0.75rem' }}>
                                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: `rgba(${p0},0.90)`, fontFamily: 'monospace', letterSpacing: '0.06em' }}>{s}</span>
                            </div>
                        ))}
                    </div>
                    {/* Track dots */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                        {TRACKS.map((t, i) => (
                            <button key={t.id} onClick={() => { setIdx(i); if (playing && audioRef.current) { audioRef.current.src = TRACKS[i].src; audioRef.current.load(); audioRef.current.play().catch(() => { }); } }}
                                style={{ width: i === idx ? 24 : 8, height: 8, borderRadius: 999, background: i === idx ? `rgba(${p0},0.90)` : 'rgba(255,255,255,0.18)', border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.35s ease', boxShadow: i === idx ? `0 0 8px rgba(${p0},0.55)` : 'none' }} />
                        ))}
                    </div>
                    {/* Progress bar */}
                    <div>
                        <div onClick={seek} style={{ width: '100%', height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.07)', cursor: 'pointer', position: 'relative' }}>
                            <div style={{ height: '100%', borderRadius: 999, width: `${prog * 100}%`, background: `linear-gradient(90deg, rgba(${p0},0.50), rgba(${p0},1.00))`, position: 'relative', transition: 'width 0.22s linear', boxShadow: `0 0 8px rgba(${p0},0.50)` }}>
                                <div style={{ position: 'absolute', right: -7, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, borderRadius: '50%', background: '#fff', boxShadow: `0 0 12px 4px rgba(${p0},0.90)` }} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.52rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', letterSpacing: '0.08em' }}>
                            <span>{fmtT(cur)}</span><span>{fmtT(dur)}</span>
                        </div>
                    </div>
                    {/* Prev / Next */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.2rem' }}>
                        <button onClick={() => setIdx(i => (i - 1 + TRACKS.length) % TRACKS.length)} style={{ background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.14)', borderRadius: '50%', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.55)', lineHeight: 0 }}><SkipBack size={16} /></button>
                        <div style={{ width: 70, height: 70 }} />{/* Spacer aligning with central play button ghost */}
                        <button onClick={() => setIdx(i => (i + 1) % TRACKS.length)} style={{ background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.14)', borderRadius: '50%', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.55)', lineHeight: 0 }}><SkipForward size={16} /></button>
                    </div>
                    {/* Brand footer */}
                    <p style={{ margin: 0, textAlign: 'center', fontSize: '0.44rem', letterSpacing: '0.24em', fontFamily: 'monospace', textTransform: 'uppercase', color: `rgba(${p0},0.28)` }}>✦ Pranav Samādhān · Vedic Neuroscience · Ancient Frequencies for Modern Minds ✦</p>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ── 6. Leela — Square Portal (col-span-1) ───────────────────────────────────
function LeelaPortalCard() {
    const [open, setOpen] = useState(false);
    const period = getSacredTimePeriod();
    const meta = SACRED_META[period];
    const { p0, accent } = meta;

    return (
        <>
            <motion.div
                whileHover={{ scale: 1.012 }} whileTap={{ scale: 0.988 }}
                transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                onClick={() => setOpen(true)}
                style={{
                    gridColumn: 'span 1', gridRow: 'span 1', aspectRatio: '1 / 1',
                    borderRadius: '1.5rem', overflow: 'hidden', cursor: 'pointer',
                    background: `rgba(${p0},0.05)`, border: `1px solid rgba(${p0},0.16)`,
                    backdropFilter: 'blur(16px)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: '0.75rem', padding: '1rem',
                }}
            >
                {/* Rotating orb */}
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
                    style={{
                        width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
                        background: `conic-gradient(from 0deg, rgba(${p0},0.90), rgba(255,255,255,0.12), rgba(${p0},0.90))`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: `0 0 28px rgba(${p0},0.35)`, position: 'relative'
                    }}>
                    <div style={{ position: 'absolute', inset: 4, borderRadius: '50%', background: 'rgba(2,1,8,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>✦</div>
                </motion.div>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.6rem', letterSpacing: '0.25em', fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase', color: `rgba(${p0},0.90)` }}>{meta.name}</p>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.6rem', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.38)' }}>Resonances</p>
                </div>
            </motion.div>

            {/* Fullscreen modal */}
            <AnimatePresence>
                {open && <RaagModal onClose={() => setOpen(false)} />}
            </AnimatePresence>
        </>
    );
}



// ── Main Export ───────────────────────────────────────────────────────────────
export default function SacredPortalGrid() {
    const { lang } = useLanguage();

    return (
        <section style={{
            marginTop: '3.5rem',
            marginBottom: '6rem',
            padding: '0 1rem',
        }}>
            {/* Section title */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{ marginBottom: '1rem', paddingLeft: '0.25rem' }}
            >
                <span style={{
                    fontSize: '0.52rem', letterSpacing: '0.28em',
                    textTransform: 'uppercase', color: 'rgba(245,158,11,0.60)',
                    fontFamily: 'monospace', fontWeight: 700,
                }}>✦ SUTRA Dimensions</span>
                <h2 style={{
                    margin: '0.15rem 0 0',
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: 'clamp(1.3rem,3.5vw,1.65rem)', fontWeight: 700,
                    color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.015em',
                }}>
                    {lang === 'hi' ? 'SUTRA आयाम' : 'Your Sacred Toolkit.'}
                </h2>
            </motion.div>

            {/* Hybrid 2-column grid */}
            <motion.div
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem',
                }}
            >
                {/* Row 0: Raag Player — compact with inline info */}
                <LeelaPortalCard />
                {/* Row 1: outPLUGS — new mindful news aggregator */}
                <OutPlugsCard />
                {/* Row 2: PranaVerse compact pill */}
                <PranaVerseCard />
                {/* Row 3: SUTRA ring + Acharya orb */}
                <SutraCard />
                <AcharyaCard />
                {/* Row 4: Dhyan Kshetra */}
                <DhyanCard />
            </motion.div>
        </section>
    );
}
