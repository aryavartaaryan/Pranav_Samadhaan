'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, X, SkipBack, SkipForward } from 'lucide-react';

// ── Raag Modal ─────────────────────────────────────────────────────────────────
const TRACKS = [
    { title: "Raag Bhairav", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", time: "6–9 AM" },
    { title: "Raag Yaman", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", time: "6–9 AM" },
    { title: "Raag Malkauns", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", time: "6–9 PM" },
    { title: "Raag Darbari", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", time: "9 PM–12 AM" },
];
function RaagModal({ onClose }: { onClose: () => void }) {
    const audio = useRef<HTMLAudioElement | null>(null);
    const [playing, setPlaying] = useState(false);
    const [idx, setIdx] = useState(0);
    const [prog, setProg] = useState(0);
    useEffect(() => {
        const a = new Audio(); a.crossOrigin = 'anonymous';
        a.onended = () => setIdx(i => (i + 1) % TRACKS.length);
        a.ontimeupdate = () => setProg(a.duration ? a.currentTime / a.duration : 0);
        audio.current = a;
        const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', k);
        return () => { a.pause(); a.src = ''; window.removeEventListener('keydown', k); };
    }, [onClose]);
    useEffect(() => {
        const a = audio.current; if (!a) return;
        a.src = TRACKS[idx].src; a.load();
        if (playing) a.play().catch(() => setPlaying(false));
    }, [idx, playing]);
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', background: 'rgba(2,1,8,0.95)', backdropFilter: 'blur(24px)' }}>
            <div onClick={e => e.stopPropagation()} style={{ margin: 'auto', width: '88%', maxWidth: 360, background: 'linear-gradient(to bottom,rgba(192,132,252,0.15),transparent)', border: '1px solid rgba(192,132,252,0.3)', borderRadius: 22, padding: '1.75rem', textAlign: 'center', position: 'relative' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={20} /></button>
                <h2 style={{ margin: '0 0 0.3rem', color: '#fff', fontSize: '1.2rem' }}>{TRACKS[idx].title}</h2>
                <p style={{ color: '#c084fc', fontSize: '0.8rem', marginBottom: '1.2rem' }}>{TRACKS[idx].time}</p>
                <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, margin: '1.2rem 0', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${prog * 100}%`, background: '#c084fc', borderRadius: 2 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1.4rem', alignItems: 'center' }}>
                    <button onClick={() => setIdx(i => (i - 1 + TRACKS.length) % TRACKS.length)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><SkipBack size={20} /></button>
                    <button onClick={() => { setPlaying(!playing); if (!playing) audio.current?.play(); else audio.current?.pause(); }}
                        style={{ width: 50, height: 50, borderRadius: '50%', background: '#c084fc', border: 'none', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        {playing ? <Pause size={22} /> : <Play size={22} style={{ marginLeft: 3 }} />}
                    </button>
                    <button onClick={() => setIdx(i => (i + 1) % TRACKS.length)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><SkipForward size={20} /></button>
                </div>
            </div>
        </motion.div>
    );
}

// ── Orbit Items — 9 real features, clockwise from 12 o'clock ──────────────────
// Each maps to a crop region from the generated geode image sheets
// Image source + CSS background-position for sprite cropping
type OrbItem = {
    id: string; title: string; href?: string; isModal?: boolean;
    // Visual: which sprite sheet + approximate CSS for the icon
    color: string; glow: string; icon: string; shape: string;
};

const ORBIT_ITEMS: OrbItem[] = [
    // 0  → 12 o'clock: GURU & AYURVEDA (purple, Om)
    { id: 'ayurhealth', title: 'GURU & AYURVEDA', href: '/acharya-samvad', color: '#a855f7', glow: '#9333ea', icon: 'ॐ', shape: '42% 58% 55% 45%/52% 45% 55% 48%' },
    // 1  → ~1 o'clock: DHYAN (blue, meditator)
    { id: 'dhyan', title: 'DHYAN', href: '/dhyan-kshetra', color: '#3b82f6', glow: '#2563eb', icon: '🧘', shape: '60% 40% 42% 58%/45% 58% 42% 55%' },
    // 2  → ~2 o'clock: VEDIC RASOI (green, wheat)
    { id: 'vedic-rasoi', title: 'VEDIC RASOI', href: '/vedic-rasoi', color: '#22c55e', glow: '#16a34a', icon: '🌾', shape: '50% 50% 58% 42%/42% 52% 48% 58%' },
    // 3  → ~3 o'clock: OUTPLUGS (purple star)
    { id: 'outplugs', title: 'OUTPLUGS', href: '/outplugs', color: '#d946ef', glow: '#a21caf', icon: '⭐', shape: '38% 62% 50% 50%/55% 42% 58% 45%' },
    // 4  → ~4 o'clock: PRANARAAGS (blue, waveform)
    { id: 'prana-raag', title: 'PRANARAAGS', href: '/project-leela', color: '#38bdf8', glow: '#0284c7', icon: '🎵', shape: '55% 45% 40% 60%/48% 55% 45% 52%' },
    // 5  → ~5 o'clock: SWADESHI PRODUCTS (orange, bag)
    { id: 'swadesi', title: 'SWADESHI PRODUCTS', href: '/swadesi-product', color: '#f97316', glow: '#ea580c', icon: '🛍️', shape: '45% 55% 60% 40%/52% 48% 55% 45%' },
    // 6  → ~6 o'clock: VEDIC GAMES (pink, dice)
    { id: 'vedic-games', title: 'VEDIC GAMES', href: '/vedic-games', color: '#ec4899', glow: '#be185d', icon: '🎲', shape: '58% 42% 45% 55%/45% 58% 42% 55%' },
    // 7  → ~7 o'clock: SUTRACONNECT (amethyst, lotus)
    { id: 'sutraconnect', title: 'SUTRACONNECT', href: '/onesutra', color: '#8b5cf6', glow: '#7c3aed', icon: '🪷', shape: '40% 60% 55% 45%/55% 45% 60% 40%' },
    // 8  → ~8-9 o'clock: PRANAVIBES (teal, wave)
    { id: 'pranaverse', title: 'PRANAVIBES', href: '/pranaverse', color: '#14b8a6', glow: '#0d9488', icon: '🌊', shape: '62% 38% 45% 55%/45% 60% 38% 62%' },
    // 9  → ~10 o'clock: VEDIC SANGRAH (indigo, temples/jyotirlinga)
    { id: 'vedic-sangrah', title: 'VEDIC SANGRAH', href: '/vedic-sangrah', color: '#6366f1', glow: '#4f46e5', icon: '🛕', shape: '48% 52% 55% 45%/50% 45% 55% 50%' },
];

// Unique gradient for each geode — mimics photorealistic mineral texture
const GEODE_STYLES: Record<string, { bg: string; innerBg: string; rimColor: string }> = {
    'ayurhealth': { bg: 'radial-gradient(circle at 32% 28%, #d8b4fe, #9333ea 40%, #4c1d95 70%, #1e0836 100%)', innerBg: 'radial-gradient(circle at 40% 35%, rgba(255,255,255,0.22) 0%, transparent 55%)', rimColor: '#e9d5ff' },
    'dhyan': { bg: 'radial-gradient(circle at 32% 28%, #93c5fd, #2563eb 40%, #1e3a8a 70%, #020617 100%)', innerBg: 'radial-gradient(circle at 40% 35%, rgba(255,255,255,0.20) 0%, transparent 55%)', rimColor: '#bfdbfe' },
    'vedic-rasoi': { bg: 'radial-gradient(circle at 32% 28%, #86efac, #16a34a 40%, #14532d 70%, #052e16 100%)', innerBg: 'radial-gradient(circle at 40% 35%, rgba(255,255,255,0.20) 0%, transparent 55%)', rimColor: '#bbf7d0' },
    'outplugs': { bg: 'radial-gradient(circle at 32% 28%, #f0abfc, #a21caf 40%, #701a75 70%, #1a0020 100%)', innerBg: 'radial-gradient(circle at 40% 35%, rgba(255,255,255,0.20) 0%, transparent 55%)', rimColor: '#f5d0fe' },
    'prana-raag': { bg: 'radial-gradient(circle at 32% 28%, #7dd3fc, #0284c7 40%, #075985 70%, #082f49 100%)', innerBg: 'radial-gradient(circle at 40% 35%, rgba(255,255,255,0.20) 0%, transparent 55%)', rimColor: '#bae6fd' },
    'swadesi': { bg: 'radial-gradient(circle at 32% 28%, #fdba74, #ea580c 40%, #9a3412 70%, #431407 100%)', innerBg: 'radial-gradient(circle at 40% 35%, rgba(255,255,255,0.20) 0%, transparent 55%)', rimColor: '#fed7aa' },
    'vedic-games': { bg: 'radial-gradient(circle at 32% 28%, #f9a8d4, #be185d 40%, #831843 70%, #500724 100%)', innerBg: 'radial-gradient(circle at 40% 35%, rgba(255,255,255,0.20) 0%, transparent 55%)', rimColor: '#fecdd3' },
    'sutraconnect': { bg: 'radial-gradient(circle at 32% 28%, #ddd6fe, #8b5cf6 40%, #5b21b6 70%, #2e1065 100%)', innerBg: 'radial-gradient(circle at 40% 35%, rgba(255,255,255,0.20) 0%, transparent 55%)', rimColor: '#ede9fe' },
    'pranaverse': { bg: 'radial-gradient(circle at 32% 28%, #ccfbf1, #14b8a6 40%, #0f766e 70%, #042f2e 100%)', innerBg: 'radial-gradient(circle at 40% 35%, rgba(255,255,255,0.22) 0%, transparent 55%)', rimColor: '#bdeafe' },
    'vedic-sangrah': { bg: 'radial-gradient(circle at 32% 28%, #e0e7ff, #6366f1 40%, #3730a3 70%, #1e1b4b 100%)', innerBg: 'radial-gradient(circle at 40% 35%, rgba(255,255,255,0.22) 0%, transparent 55%)', rimColor: '#c7d2fe' },
};

// ── Photorealistic Geode Orb component ────────────────────────────────────────
function GeodeOrb({ item, sz }: { item: OrbItem; sz: number }) {
    const gs = GEODE_STYLES[item.id] || GEODE_STYLES['ayurhealth'];
    const isOutplugs = item.id === 'outplugs';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: sz * 0.12 }}>
            {/* Outer glow ring */}
            <div style={{
                width: sz, height: sz,
                borderRadius: isOutplugs ? '25% 75% 50% 50% / 50% 50% 70% 30%' : item.shape,
                padding: 2.5,
                background: `conic-gradient(from 0deg, ${gs.rimColor}, rgba(255,255,255,0.90), ${item.color}, rgba(255,215,0,0.80), ${gs.rimColor})`,
                boxShadow: [
                    `0 0 ${sz * 0.30}px ${item.glow}cc`,
                    `0 0 ${sz * 0.65}px ${item.glow}44`,
                    `0 ${sz * 0.08}px ${sz * 0.20}px rgba(0,0,0,0.55)`,
                ].join(','),
                flexShrink: 0,
                position: 'relative',
            }}>
                {/* Inner sphere body */}
                <div style={{
                    width: '100%', height: '100%',
                    borderRadius: isOutplugs ? '25% 75% 50% 50% / 50% 50% 70% 30%' : item.shape,
                    background: gs.bg,
                    position: 'relative', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: [
                        `inset 0 ${sz * 0.06}px ${sz * 0.16}px rgba(255,255,255,0.28)`,  // top inner light
                        `inset 0 -${sz * 0.06}px ${sz * 0.14}px rgba(0,0,0,0.50)`,       // bottom inner shadow
                        `inset ${sz * 0.03}px 0 ${sz * 0.12}px rgba(255,255,255,0.12)`,  // left edge highlight
                    ].join(','),
                }}>
                    {/* Crystal facet overlay */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        borderRadius: 'inherit',
                        background: `conic-gradient(from 30deg, transparent 0%, ${item.color}30 15%, transparent 20%, ${item.color}20 38%, transparent 44%, ${item.color}28 60%, transparent 66%, ${item.color}18 80%, transparent 86%, ${item.color}25 95%, transparent 100%)`,
                    }} />
                    {/* Specular highlight blob */}
                    <div style={{
                        position: 'absolute', top: '6%', left: '14%',
                        width: '42%', height: '26%',
                        background: 'radial-gradient(ellipse, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 100%)',
                        borderRadius: '50%', transform: 'rotate(-22deg)', filter: 'blur(3px)',
                    }} />
                    {/* Secondary specular */}
                    <div style={{
                        position: 'absolute', top: '12%', left: '58%',
                        width: '20%', height: '14%',
                        background: 'radial-gradient(ellipse, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0) 100%)',
                        borderRadius: '50%', filter: 'blur(2px)',
                    }} />
                    {/* Bottom shadow */}
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%',
                        background: 'linear-gradient(to top, rgba(0,0,0,0.45), transparent)',
                        borderRadius: 'inherit',
                    }} />
                    {/* Icon */}
                    <span style={{
                        fontSize: sz * 0.42, position: 'relative', zIndex: 2,
                        filter: `drop-shadow(0 0 ${sz * 0.08}px ${item.color}) drop-shadow(0 2px 4px rgba(0,0,0,0.7))`,
                        lineHeight: 1, textShadow: `0 0 12px ${item.color}`,
                    }}>{item.icon}</span>
                </div>
            </div>

            {/* Gold calligraphy label in pill */}
            <div style={{
                fontSize: Math.max(7, sz * 0.148), fontWeight: 800,
                fontFamily: "'Georgia', serif",
                color: '#ffd060',
                letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'center',
                textShadow: '0 0 12px rgba(251,191,36,0.95), 0 0 24px rgba(251,191,36,0.50), 0 2px 4px rgba(0,0,0,0.9)',
                background: 'rgba(0,0,0,0.62)',
                backdropFilter: 'blur(8px)',
                padding: `2px ${Math.max(5, sz * 0.12)}px`,
                borderRadius: 20,
                border: '1px solid rgba(251,191,36,0.40)',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}>{item.title}</div>
        </div>
    );
}

// ── Gold tendril SVG overlay ──────────────────────────────────────────────────
function Tendrils({ S, rot }: { S: number; rot: number }) {
    const cx = S / 2, cy = S / 2;
    const orbitR = S * 0.43;
    const N = ORBIT_ITEMS.length;
    return (
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 6 }}
            viewBox={`0 0 ${S} ${S}`}>
            <defs>
                <filter id="tglow">
                    <feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                {ORBIT_ITEMS.map((item, i) => {
                    const deg = -90 + i * (360 / N) + rot;
                    const r = deg * Math.PI / 180;
                    return (
                        <linearGradient key={item.id} id={`t${i}`} gradientUnits="userSpaceOnUse"
                            x1={cx} y1={cy}
                            x2={cx + Math.cos(r) * orbitR} y2={cy + Math.sin(r) * orbitR}>
                            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.90" />
                            <stop offset="100%" stopColor={item.color} stopOpacity="0.45" />
                        </linearGradient>
                    );
                })}
            </defs>
            {ORBIT_ITEMS.map((item, i) => {
                const deg = -90 + i * (360 / N) + rot;
                const r = deg * Math.PI / 180;
                const x2 = cx + Math.cos(r) * orbitR;
                const y2 = cy + Math.sin(r) * orbitR;
                const mx = (cx + x2) / 2 + Math.cos(r + Math.PI / 2) * 20;
                const my = (cy + y2) / 2 + Math.sin(r + Math.PI / 2) * 20;
                return (
                    <path key={item.id}
                        d={`M ${cx} ${cy} Q ${mx} ${my} ${x2} ${y2}`}
                        fill="none" stroke={`url(#t${i})`} strokeWidth="1.4"
                        opacity="0.75" filter="url(#tglow)"
                    />
                );
            })}
        </svg>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function SacredPortalGrid() {
    const [raagOpen, setRaagOpen] = useState(false);
    const [orbitSize, setOrbitSize] = useState(480);
    const [rotation, setRotation] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const router = useRouter(); // For programmatic navigation
    const isPointerDown = useRef(false);
    const isDragging = useRef(false);
    const hasMoved = useRef(false);
    const isHovered = useRef(false);
    const startAngle = useRef(0);
    const lastAngle = useRef(0);
    const vel = useRef(0.16); // Increased initial velocity
    const animRef = useRef<number>(0);
    const AUTO = 0.16; // Increased auto-rotation speed

    // Responsive sizing
    useEffect(() => {
        const calc = () => setOrbitSize(Math.min(480, Math.max(280, window.innerWidth * 0.96)));
        calc();
        window.addEventListener('resize', calc);
        return () => window.removeEventListener('resize', calc);
    }, []);

    // Animation loop
    useEffect(() => {
        const tick = () => {
            if (!isDragging.current && !isPointerDown.current) {
                if (!isHovered.current) vel.current += (AUTO - vel.current) * 0.04;
                else vel.current *= 0.85; // smoothly slow down to stop if hovered
            }
            setRotation(r => (r + vel.current + 360) % 360);
            animRef.current = requestAnimationFrame(tick);
        };
        animRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animRef.current);
    }, []);

    const getAngle = useCallback((cx: number, cy: number) => {
        const el = containerRef.current; if (!el) return 0;
        const rc = el.getBoundingClientRect();
        return Math.atan2(cy - (rc.top + rc.height / 2), cx - (rc.left + rc.width / 2)) * 180 / Math.PI;
    }, []);

    const onPD = useCallback((e: React.PointerEvent) => {
        isPointerDown.current = true;
        isDragging.current = false;
        hasMoved.current = false;
        vel.current = 0;
        const ang = getAngle(e.clientX, e.clientY);
        startAngle.current = ang;
        lastAngle.current = ang;
        // setPointerCapture removed to allow child clicks to fire properly
    }, [getAngle]);

    const onPM = useCallback((e: React.PointerEvent) => {
        if (!isPointerDown.current) return;
        const cur = getAngle(e.clientX, e.clientY);

        let totalD = Math.abs(cur - startAngle.current);
        if (totalD > 180) totalD = Math.abs(totalD - 360);

        // If they drag more than 6 degrees, flag it as a drag (blocks clicks)
        if (totalD > 6.0) {
            isDragging.current = true;
            hasMoved.current = true;
        }

        let d = cur - lastAngle.current;
        if (d > 180) d -= 360; if (d < -180) d += 360;

        vel.current = d;
        setRotation(r => (r + d + 360) % 360);
        lastAngle.current = cur;
    }, [getAngle]);

    const onPU = useCallback(() => {
        isPointerDown.current = false;
        isDragging.current = false;
        // hasMoved stays true until next pointerDown so the click handler can read it
        setTimeout(() => { hasMoved.current = false; }, 50);
    }, []);

    const N = ORBIT_ITEMS.length;       // 9
    const orbitR = orbitSize * 0.43;
    const orbSize = Math.max(50, orbitSize * 0.138);
    // Platform image fills the inner orbit area completely
    const platformSize = orbitSize * 0.82;

    return (
        <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: `${orbitSize * 0.04}px 0`, userSelect: 'none' }}>
            <div ref={containerRef}
                style={{ position: 'relative', width: orbitSize, height: orbitSize, flexShrink: 0, touchAction: 'none', cursor: 'grab' }}
                onPointerDown={onPD} onPointerMove={onPM} onPointerUp={onPU}
                onPointerLeave={() => { onPU(); isHovered.current = false; }}
                onPointerEnter={() => { isHovered.current = true; }}
            >

                {/* ── PHOTOREALISTIC PLATFORM IMAGE (fixed/non-rotating center) ── */}
                <div style={{
                    position: 'absolute',
                    left: '50%', top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: platformSize, height: platformSize,
                    zIndex: 8, pointerEvents: 'none',
                }}>
                    {/* Outer glow behind platform */}
                    <motion.div
                        animate={{ opacity: [0.55, 0.85, 0.55], scale: [1, 1.06, 1] }}
                        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                            position: 'absolute', inset: '-12%',
                            background: 'radial-gradient(circle, rgba(251,191,36,0.35) 0%, rgba(180,110,0,0.15) 45%, transparent 72%)',
                            borderRadius: '50%', filter: 'blur(18px)',
                        }}
                    />
                    {/* The central OrbitImage — full fill, black background screened out */}
                    <img
                        src="/images/OneSUTRAOrbit.jpeg"
                        alt="OneSUTRA Orbit Platform"
                        style={{
                            width: '100%', height: '100%',
                            objectFit: 'cover',
                            objectPosition: 'center',
                            borderRadius: '50%',
                            // screen blend removes the black JPEG background completely
                            mixBlendMode: 'screen',
                            // extra luminance contrast to make the lotus pop
                            filter: `brightness(1.35) contrast(1.12) saturate(1.25) drop-shadow(0 0 ${platformSize * 0.07}px rgba(251,191,36,0.9))`,
                            position: 'relative', zIndex: 1,
                        }}
                    />
                    {/* Decorative flame pulse on top */}
                    <motion.div
                        animate={{ scale: [1, 1.35, 1], opacity: [0.4, 0.75, 0.4] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                            position: 'absolute',
                            top: '16%', left: '50%',
                            transform: 'translateX(-50%)',
                            width: platformSize * 0.18, height: platformSize * 0.18,
                            background: 'radial-gradient(circle, rgba(255,160,30,0.75) 0%, transparent 70%)',
                            borderRadius: '50%', filter: 'blur(12px)', zIndex: 2,
                        }}
                    />
                    {/* Long glowing flame covering the chirag image's flame */}
                    <motion.div
                        animate={{ 
                            scaleY: [1, 1.25, 0.9, 1.15, 1],
                            opacity: [0.95, 1, 0.9, 1, 0.95],
                            rotate: [-2, 2, -1, 3, -1] 
                        }}
                        transition={{ 
                            duration: 0.8, 
                            repeat: Infinity, 
                            ease: 'easeInOut' 
                        }}
                        style={{
                            position: 'absolute',
                            top: '29.5%', // Places the base of this flame exactly where the lamp's wick is
                            left: '48%',
                            transform: 'translateX(-50%)',
                            width: platformSize * 0.045, // Back to a thinner width
                            height: platformSize * 0.165, // Shorter to fit the actual wick size
                            background: 'linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(254,240,138,0.98) 20%, rgba(249,115,22,0.9) 60%, rgba(225,29,72,0.6) 90%, transparent 100%)',
                            borderRadius: '50% 50% 20% 20% / 60% 60% 40% 40%', 
                            filter: 'blur(1px) drop-shadow(0 0 16px rgba(249,115,22,0.95)) drop-shadow(0 0 35px rgba(251,191,36,0.8))',
                            zIndex: 3,
                            transformOrigin: 'bottom center', 
                        }}
                    />
                </div>

                {/* Orbit track ring — transparent golden halo */}
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 4 }}
                    viewBox={`0 0 ${orbitSize} ${orbitSize}`}>
                    <defs>
                        <filter id="ringGlow">
                            <feGaussianBlur stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                    </defs>
                    <circle cx={orbitSize / 2} cy={orbitSize / 2} r={orbitR} fill="none"
                        stroke="rgba(251,191,36,0.22)" strokeWidth={orbSize * 0.85} />
                    <circle cx={orbitSize / 2} cy={orbitSize / 2} r={orbitR} fill="none"
                        stroke="rgba(251,191,36,0.88)" strokeWidth="1.8" filter="url(#ringGlow)" />
                    <circle cx={orbitSize / 2} cy={orbitSize / 2} r={orbitR - orbSize * 0.43} fill="none"
                        stroke="rgba(251,191,36,0.20)" strokeWidth="0.7" />
                    <circle cx={orbitSize / 2} cy={orbitSize / 2} r={orbitR + orbSize * 0.43} fill="none"
                        stroke="rgba(251,191,36,0.20)" strokeWidth="0.7" />
                </svg>

                {/* Gold tendril lines */}
                <Tendrils S={orbitSize} rot={rotation} />

                {/* 9 Photorealistic-style Geode Orbs */}
                {ORBIT_ITEMS.map((item, i) => {
                    const deg = -90 + i * (360 / N) + rotation;
                    const rad = deg * Math.PI / 180;
                    const cx = orbitSize / 2 + Math.cos(rad) * orbitR;
                    const cy = orbitSize / 2 + Math.sin(rad) * orbitR;
                    return (
                        <div key={item.id} style={{ position: 'absolute', left: cx, top: cy, transform: 'translate(-50%, -50%)', zIndex: 20 }}>
                            <motion.div whileHover={{ scale: 1.18, filter: `drop-shadow(0 0 ${orbSize * 0.2}px ${item.color})` }} whileTap={{ scale: 0.90 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                                {item.isModal
                                    ? <div onClick={() => setRaagOpen(true)} style={{ cursor: 'pointer' }}><GeodeOrb item={item} sz={orbSize} /></div>
                                    : <div onClick={() => { if (!hasMoved.current && item.href) router.push(item.href); }} style={{ cursor: 'pointer' }}>
                                        <GeodeOrb item={item} sz={orbSize} />
                                    </div>
                                }
                            </motion.div>
                        </div>
                    );
                })}
            </div>

            <AnimatePresence>
                {raagOpen && <RaagModal onClose={() => setRaagOpen(false)} />}
            </AnimatePresence>
        </div>
    );
}
