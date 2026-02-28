'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import styles from './ReelPlayer.module.css';
import SpandanaLake from './SpandanaLake';
import WaterWaveVisualizer from './WaterWaveVisualizer';
import OmInfinityLogo from '../OmInfinityLogo';
import { useCircadianBackground } from '@/hooks/useCircadianBackground';
import TodaysMission from './TodaysMission';


// ── Types ────────────────────────────────────────────────────────────────────
interface PanchangData {
    time: string;
    period: string;
    vara: string;
    paksha: string;
    tithi: string;
    dateStr: string;
}

interface Sankalp { id: string; text: string; done: boolean; }

interface ReelPlayerProps {
    greeting: { emoji: string; text: string; period: string } | null;
    displayName: string;
    panchangData: PanchangData;
    sankalpaItems: Sankalp[];
    onSankalpaToggle: (id: string) => void;
    onSankalpaRemove: (id: string) => void;
    onSankalpaAdd: (text: string) => void;
}

// ── Time-based background config ─────────────────────────────────────────────
function getTimeScene(h: number) {
    if (h >= 4 && h < 6) return {
        bg: 'linear-gradient(180deg, #0d0820 0%, #1a0a3d 35%, #2d1b69 70%, #4a2c8a 100%)',
        accent: '#b388ff', celestial: '🌙',
        raagLine: 'Brahma Muhurta · The Sacred Dawn Hour',
        raagSub: 'Silence before creation · Ancient rising',
    };
    if (h >= 6 && h < 12) return {
        bg: 'linear-gradient(180deg, #0a0400 0%, #5B2000 25%, #C4580E 55%, #F5A623 80%, #FFD580 100%)',
        accent: '#FFD580', celestial: '🌅',
        raagLine: 'Morning Raag · Awakening & Clarity',
        raagSub: 'Prabhata · Sacred energy · Divine morning',
    };
    if (h >= 12 && h < 15) return {
        bg: 'linear-gradient(180deg, #001020 0%, #002B6B 30%, #0055B8 65%, #1a78c2 100%)',
        accent: '#64C8FF', celestial: '☀️',
        raagLine: 'Noon Raag · Focus & midday clarity',
        raagSub: 'Madhyana · Full power · Divine Light',
    };
    if (h >= 15 && h < 18) return {
        bg: 'linear-gradient(180deg, #100500 0%, #5C1800 25%, #B04000 55%, #E88030 80%, #FFB060 100%)',
        accent: '#FFAA58', celestial: '🌤',
        raagLine: 'Afternoon Raag · Creative Flow',
        raagSub: 'Apraahna · Sacred creativity · Soft light',
    };
    if (h >= 18 && h < 20) return {
        bg: 'linear-gradient(180deg, #050010 0%, #1a0535 25%, #4a0d5c 50%, #8B2070 75%, #C8507C 100%)',
        accent: '#E8A0FF', celestial: '🪔',
        raagLine: 'Sandhya Raag · Evening Calm',
        raagSub: 'Dusk · Peace · Sacred settling',
    };
    if (h >= 20 && h < 23) return {
        bg: 'linear-gradient(180deg, #000208 0%, #030a20 30%, #081530 60%, #0f2050 100%)',
        accent: '#88AAFF', celestial: '🌙',
        raagLine: 'Night Raag for Deep Sleep',
        raagSub: 'Ratri · Stillness · Rest & restore',
    };
    return {
        bg: 'linear-gradient(180deg, #000005 0%, #010310 40%, #020820 100%)',
        accent: '#6677cc', celestial: '✨',
        raagLine: 'Midnight Raag · Deep stillness',
        raagSub: 'Nisha · Sacred dark · Dreamscape',
    };
}

// ── Tracks ───────────────────────────────────────────────────────────────────
const TRACKS = [
    {
        id: 'fusion', title: 'SuperFusion', likes: 1008,
        src: 'https://ik.imagekit.io/rcsesr4xf/flute.mp3?updatedAt=1771983487495',
        dualSrc: 'https://ik.imagekit.io/rcsesr4xf/sitar.mp3?updatedAt=1771983562343'
    },
    { id: 'gayatri', title: 'Gayatri Ghanpaath', likes: 248, src: 'https://ik.imagekit.io/rcsesr4xf/gayatri-mantra-ghanpaath.mp3', dualSrc: '' },
    { id: 'lalitha', title: 'Lalitha Sahasranamam', likes: 312, src: 'https://ik.imagekit.io/rcsesr4xf/Lalitha-Sahasranamam.mp3', dualSrc: '' },
    { id: 'shiva', title: 'Shiva Tandava Stotram', likes: 521, src: 'https://ik.imagekit.io/rcsesr4xf/Shiva-Tandav.mp3', dualSrc: '' },
    { id: 'brahma', title: 'Brahma Yagya', likes: 189, src: 'https://ik.imagekit.io/aup4wh6lq/BrahmaYagya.mp3', dualSrc: '' },
    { id: 'shanti', title: 'Shanti Path', likes: 403, src: 'https://ik.imagekit.io/rcsesr4xf/shanti-path.mp3', dualSrc: '' },
    { id: 'dainik', title: 'Dainik Agnihotra', likes: 167, src: 'https://ik.imagekit.io/aup4wh6lq/DainikAgnihotra.mp3?updatedAt=1771246817070', dualSrc: '' },
];

const INSIGHTS = [
    { icon: '✦', quote: '"The quiet mind is not empty — it is full of the universe."', source: 'Vedic Sutra' },
    { icon: '☽', quote: '"The moon does not fight. It waits. Patience is its mastery."', source: 'Vedic Wisdom' },
    { icon: '◈', quote: '"Let your actions be your temple. Let stillness be your prayer."', source: 'Bhagavad Gita' },
    { icon: '✧', quote: '"Rise before the sun, and the day belongs entirely to you."', source: 'Charaka Samhita' },
    { icon: '◉', quote: '"When the mind is pure, joy follows like a shadow that never leaves."', source: 'Dhammapada' },
    { icon: '⊕', quote: '"Serve, love, give, purify, meditate, realise."', source: 'Swami Sivananda' },
];

function getDailyInsight() {
    const d = new Date();
    return INSIGHTS[(d.getDate() * 3 + d.getMonth()) % INSIGHTS.length];
}

// ── Sankalpa Slide (first reel) ───────────────────────────────────────────────
interface SankalpaSlideProps {
    items: Sankalp[];
    scene: ReturnType<typeof getTimeScene>;  // kept for type compat, not used in this slide
    onToggle: (id: string) => void;
    onRemove: (id: string) => void;
    onAdd: (text: string) => void;
    isFullScreen: boolean;
    onExpand: () => void;
}

// Rotating catchy taglines for Today's Mission
const MISSION_TAGLINES = [
    'Your Sacred Intentions for Today',
    'Set Your Saṅkalpa · Rise with Purpose',
    'What Will You Accomplish Today?',
    'The Inner Fire That Moves Mountains',
    'Today\'s Dharma · Act with Intention',
];

function SankalpaSlide({ items, onToggle, onRemove, onAdd, isFullScreen, onExpand }: SankalpaSlideProps) {
    const [draft, setDraft] = useState('');
    const [adding, setAdding] = useState(false);
    const done = items.filter(s => s.done).length;

    // Rotate taglines based on day-of-week
    const tagline = MISSION_TAGLINES[new Date().getDay() % MISSION_TAGLINES.length];

    // ── Circadian background ─────────────────────────────────────────────────
    const { phase, imageUrl, loaded } = useCircadianBackground();
    const isDay = phase.name === 'day';

    const add = () => {
        if (!draft.trim()) return;
        onAdd(draft.trim());
        setDraft('');
        setAdding(false);
    };

    return (
        <div
            className={`${styles.reelSlide} ${isFullScreen ? styles.reelSlideFull : ''}`}
            style={{ '--reel-accent': phase.accentHex } as React.CSSProperties}
            onClick={!isFullScreen ? onExpand : undefined}
        >
            {/* ── Dynamic Nature Background ──────────────────────────────── */}
            {/* Black placeholder prevents FOUC while image loads */}
            <div className={styles.circadianBg} />
            <motion.div
                className={styles.circadianBg}
                style={{ backgroundImage: `url(${imageUrl})` }}
                animate={{ opacity: loaded ? 1 : 0 }}
                initial={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: 'easeInOut' }}
            />

            {/* ── Sattvic Glass Overlay ──────────────────────────────────── */}
            <div
                className={styles.circadianOverlay}
                style={{ background: isDay ? 'rgba(5,15,35,0.38)' : 'rgba(0,2,12,0.62)' }}
            />

            {/* ── Phase badge ───────────────────────────────────────────── */}
            <div className={styles.phaseBadge} style={{ color: phase.accentHex }}>
                <span className={styles.phaseLabel}>{phase.label}</span>
                <span className={styles.phaseTagline}>{phase.tagline}</span>
            </div>

            {/* Dismiss button */}
            {isFullScreen && (
                <button className={styles.dismissBtn} onClick={onExpand} aria-label="Exit full screen">✕</button>
            )}

            {/* Content */}
            <div className={styles.sankalpaContent} onClick={e => e.stopPropagation()}>
                <div className={styles.missionHeader}>
                    <span className={styles.missionFlame}>🪔</span>
                    <div className={styles.missionTitles}>
                        <span className={styles.missionTitle} style={{ color: phase.accentHex }}>Today's Mission</span>
                        <span className={styles.missionTagline}>{tagline}</span>
                    </div>
                    <span className={styles.sankalpaProgress}>{done}/{items.length}</span>
                </div>

                <div className={styles.progressBar}>
                    <motion.div
                        className={styles.progressFill}
                        style={{ background: `linear-gradient(90deg, ${phase.accentHex}99, ${phase.accentHex})` }}
                        animate={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>

                <div className={styles.sankalpaList}>
                    <AnimatePresence initial={false}>
                        {items.map(item => (
                            <motion.div
                                key={item.id}
                                className={`${styles.sankalpaItem} ${item.done ? styles.sankalpaItemDone : ''}`}
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 12, height: 0 }}
                                transition={{ duration: 0.22 }}
                                layout
                            >
                                <button
                                    className={styles.sankalpaCheck}
                                    style={{ borderColor: `${phase.accentHex}66` }}
                                    onClick={() => onToggle(item.id)}
                                >
                                    {item.done ? '✓' : ''}
                                </button>
                                <span className={styles.sankalpaText}>{item.text}</span>
                                <button className={styles.sankalpaRemove} onClick={() => onRemove(item.id)}>×</button>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    <AnimatePresence>
                        {adding ? (
                            <motion.div className={styles.sankalpaAddRow}
                                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                                <input
                                    className={styles.sankalpaInput}
                                    placeholder="Add a sacred intention…"
                                    value={draft}
                                    onChange={e => setDraft(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') add(); if (e.key === 'Escape') setAdding(false); }}
                                    autoFocus
                                />
                                <button className={styles.sankalpaConfirm} style={{ background: phase.accentHex }} onClick={add}>+</button>
                                <button className={styles.sankalpaCancel} onClick={() => { setAdding(false); setDraft(''); }}>✕</button>
                            </motion.div>
                        ) : (
                            <motion.button
                                className={styles.sankalpaAddBtn}
                                style={{ borderColor: `${phase.accentHex}55`, color: phase.accentHex }}
                                onClick={() => setAdding(true)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                                layout
                            >
                                + Add Saṅkalpa
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>

                {!isFullScreen && (
                    <div className={styles.tapHint}>
                        <span style={{ color: `${phase.accentHex}88` }}>↑ Swipe up for mantras</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── JustVibe Reactions — right sidebar ───────────────────────────────────────
// Appears on every mantra reel, matching the JustVibe social feed aesthetic.
interface ReelReactionsProps { accentColor: string; likes: number; }
function ReelReactions({ accentColor, likes }: ReelReactionsProps) {
    const [vibed, setVibed] = useState(false);
    const [radiated, setRadiated] = useState(false);
    const [planted, setPlanted] = useState(false);
    const [vibeCount, setVibeCount] = useState(likes);
    const [ripple, setRipple] = useState(false);

    const handleVibe = (e: React.MouseEvent) => {
        e.stopPropagation();
        setVibed(v => { if (!v) { setVibeCount(c => c + 1); setRipple(true); setTimeout(() => setRipple(false), 700); } else setVibeCount(c => c - 1); return !v; });
    };

    return (
        <div className={styles.reelReactions} onClick={e => e.stopPropagation()}>
            {/* Vibe (like) */}
            <div className={styles.reactionItem} onClick={handleVibe}>
                <div className={`${styles.reactionIcon} ${vibed ? styles.reactionIconVibedOn : ''}`} style={vibed ? { borderColor: `${accentColor}88`, boxShadow: `0 0 22px ${accentColor}44` } : {}}>
                    {ripple && (
                        <motion.div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `radial-gradient(circle, ${accentColor}99 0%, transparent 70%)` }}
                            initial={{ scale: 0.3, opacity: 0.9 }} animate={{ scale: 2.5, opacity: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }} />
                    )}
                    <span>{vibed ? '✨' : '🌊'}</span>
                </div>
                <span className={styles.reactionCount}>{vibeCount.toLocaleString()}<br />{vibed ? 'Vibed' : 'Vibe'}</span>
            </div>
            {/* Cloud (save) */}
            <div className={styles.reactionItem} onClick={e => e.stopPropagation()}>
                <div className={styles.reactionIcon}><span>☁️</span></div>
                <span className={styles.reactionCount}>Save</span>
            </div>
            {/* Radiate (share) */}
            <div className={styles.reactionItem} onClick={e => { e.stopPropagation(); setRadiated(r => !r); }}>
                <div className={`${styles.reactionIcon} ${radiated ? styles.reactionIconRadiateOn : ''}`}>
                    <span>{radiated ? '💎' : '✦'}</span>
                </div>
                <span className={styles.reactionCount}>Radiate</span>
            </div>
            {/* Plant (gratitude) */}
            <div className={styles.reactionItem} onClick={e => { e.stopPropagation(); setPlanted(p => !p); }}>
                <div className={`${styles.reactionIcon} ${planted ? styles.reactionIconPlantOn : ''}`}>
                    <span>{planted ? '🌱' : '🌿'}</span>
                </div>
                <span className={styles.reactionCount}>{planted ? 'Planted' : 'Plant'}</span>
            </div>
        </div>
    );
}

// ── Mantra Reel Slide ─────────────────────────────────────────────────────────
interface ReelSlideProps {
    track: typeof TRACKS[0];
    scene: ReturnType<typeof getTimeScene>;
    isActive: boolean;
    isFullScreen: boolean;
    onActivate: () => void;
    /** Called once on mount so the parent can pause this slide's audio immediately */
    onRegisterPause: (fn: () => void) => () => void;
}

function ReelSlide({ track, scene, isActive, isFullScreen, onActivate, onRegisterPause }: ReelSlideProps) {
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [showInsight, setShowInsight] = useState(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const dualRef = useRef<HTMLAudioElement | null>(null);
    const playingRef = useRef(false); // mirror of `playing` accessible synchronously
    const insight = getDailyInsight();

    useEffect(() => {
        // Set crossOrigin BEFORE assigning src so CORS headers are sent
        // with the very first request — prevents 'already connected node' errors.
        const a = new Audio();
        a.crossOrigin = 'anonymous';
        a.preload = 'metadata';
        a.src = track.src;
        audioRef.current = a;

        if (track.dualSrc) {
            const d = new Audio();
            d.crossOrigin = 'anonymous';
            d.preload = 'metadata';
            d.src = track.dualSrc;
            dualRef.current = d;
        }

        a.addEventListener('timeupdate', () => {
            if (a.duration) setProgress(a.currentTime / a.duration);
        });
        a.addEventListener('ended', () => { a.currentTime = 0; setPlaying(false); playingRef.current = false; setProgress(0); });

        return () => { a.pause(); a.src = ''; dualRef.current?.pause(); };
    }, [track]);

    // ── Register an instant-pause callback with the parent.  ─────────────────
    // This runs synchronously in the scroll handler (no React render cycle).
    useEffect(() => {
        const pauseNow = () => {
            if (!playingRef.current) return;
            audioRef.current?.pause();
            dualRef.current?.pause();
            // Use flushSync-equivalent: set ref first so the button icon
            // updates on the next animation frame without waiting for state.
            playingRef.current = false;
            setPlaying(false);
        };
        return onRegisterPause(pauseNow);
    }, [onRegisterPause]);

    // Fallback via isActive prop (keeps existing safety net)
    useEffect(() => {
        if (!isActive && playingRef.current) {
            audioRef.current?.pause();
            dualRef.current?.pause();
            playingRef.current = false;
            setPlaying(false);
        }
    }, [isActive]);

    const toggle = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        const a = audioRef.current;
        const d = dualRef.current;
        if (!a) return;
        if (playing) {
            a.pause(); d?.pause(); setPlaying(false); playingRef.current = false;
        } else {
            if (a.ended || (a.duration > 0 && a.currentTime >= a.duration - 0.1)) {
                a.currentTime = 0; if (d) d.currentTime = 0;
            }
            // Resume AudioContext if browser suspended it (required after user gesture)
            const win = window as any;
            const actx: AudioContext | undefined = win.__sharedActx;
            if (actx && actx.state === 'suspended') actx.resume().catch(() => { });
            a.play().catch(err => console.warn('[ReelSlide] play failed:', err));
            if (track.dualSrc && d) d.play().catch(() => { });
            setPlaying(true); playingRef.current = true;
        }
    }, [playing, track]);

    return (
        <div
            className={`${styles.reelSlide} ${isFullScreen ? styles.reelSlideFull : ''}`}
            style={{ '--reel-bg': scene.bg, '--reel-accent': scene.accent } as React.CSSProperties}
            onClick={!isFullScreen ? onActivate : undefined}
        >
            {/* Audio-reactive WaterWave visualizer */}
            <div className={styles.vizWrap}>
                <WaterWaveVisualizer audioRef={audioRef} playing={playing} height={600} accentColor={scene.accent} />
            </div>

            {/* Top scene label — Playfair Display serif */}
            <div className={styles.slideTopLabel}>
                <div className={styles.slideRaagBlock}>
                    <span className={styles.slideRaagLine}>{scene.raagLine}</span>
                    <span className={styles.slideRaagSub}>{scene.raagSub}</span>
                </div>
            </div>

            {/* ── Mantra Title Centered Overlay ── */}
            <div className={styles.mantraTitle} onClick={e => e.stopPropagation()}>
                <p className={styles.mantraTitleText}>{track.title}</p>
                <p className={styles.mantraTitleSub}>{scene.raagSub}</p>
            </div>

            {/* Center frosted-glass play button */}
            <div className={styles.centerArea} onClick={e => e.stopPropagation()}>
                <motion.button
                    className={`${styles.playBtn} ${playing ? styles.playBtnActive : ''}`}
                    onClick={toggle}
                    whileTap={{ scale: 0.90 }}
                    whileHover={{ scale: 1.04 }}
                    aria-label={playing ? 'Pause' : 'Play'}
                >
                    <AnimatePresence mode="wait">
                        <motion.span
                            key={playing ? 'pause' : 'play'}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            transition={{ duration: 0.16 }}
                            className={styles.playIconWrap}
                        >
                            {playing ? (
                                /* Thin SVG pause bars */
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                                    <rect x="5" y="3" width="4" height="18" rx="1.5" fill="white" />
                                    <rect x="15" y="3" width="4" height="18" rx="1.5" fill="white" />
                                </svg>
                            ) : (
                                /* Thin SVG play triangle */
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 3 }}>
                                    <path d="M6 3.5L20.5 12L6 20.5V3.5Z" fill="white" />
                                </svg>
                            )}
                        </motion.span>
                    </AnimatePresence>
                    {playing && (
                        <>
                            <motion.span
                                className={styles.pulseRing}
                                animate={{ scale: [1, 2.0], opacity: [0.5, 0] }}
                                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                            />
                            <motion.span
                                className={styles.pulseRing}
                                animate={{ scale: [1, 1.5], opacity: [0.3, 0] }}
                                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
                            />
                        </>
                    )}
                </motion.button>
            </div>

            {/* ── JustVibe Reactions — right sidebar ── */}
            <ReelReactions accentColor={scene.accent} likes={track.likes} />


            {/* Bottom panel removed as per user request to match Instagram Reels fullscreen experience */}

            {/* Full screen dismiss */}
            {isFullScreen && (
                <button className={styles.dismissBtn} onClick={e => { e.stopPropagation(); onActivate(); }}>✕</button>
            )}
        </div>
    );
}

// ── Right Desktop Sidebar ─────────────────────────────────────────────────────
function ReelRightSidebar({ accent }: { accent: string }) {
    const prompts = [
        { icon: '🪷', title: 'Speak with an Acharya', sub: 'Live 1:1 Vedic guidance', cta: 'Connect' },
        { icon: '🌿', title: 'Dosha Wellness Tip', sub: 'Today · Vata balancing', cta: 'Learn more' },
        { icon: '🧘', title: 'Mental Clarity Session', sub: '5-min breathwork ritual', cta: 'Begin' },
    ];
    return (
        <aside className={styles.desktopRightSidebar}>
            <p className={styles.sidebarHeading} style={{ color: accent }}>Wellness Corner</p>
            {prompts.map(p => (
                <div key={p.title} className={styles.sidebarCard}>
                    <span className={styles.sidebarCardIcon}>{p.icon}</span>
                    <div className={styles.sidebarCardText}>
                        <strong>{p.title}</strong>
                        <span>{p.sub}</span>
                    </div>
                    <button className={styles.sidebarCardCta} style={{ color: accent }}>{p.cta} →</button>
                </div>
            ))}
        </aside>
    );
}

// ── Main ReelPlayer ───────────────────────────────────────────────────────────
export default function ReelPlayer({ greeting: _greeting, displayName: _displayName, panchangData: _panchangData, sankalpaItems, onSankalpaToggle, onSankalpaRemove, onSankalpaAdd }: ReelPlayerProps) {
    const [activeIdx, setActiveIdx] = useState(0);
    const [fullScreenIdx, setFullScreenIdx] = useState<number | null>(null);
    const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
    const scrollerRef = useRef<HTMLDivElement | null>(null);
    const scene = getTimeScene(new Date().getHours());

    // Registry of instant-pause callbacks — one per ReelSlide.
    // Stored as a plain mutable ref (NOT state) so we can call them
    // synchronously inside the scroll handler without triggering re-renders.
    const pauseRegistry = useRef<Map<number, () => void>>(new Map());

    /** Pause ALL slides immediately — call this before updating activeIdx */
    const pauseAll = useCallback(() => {
        pauseRegistry.current.forEach(fn => fn());
    }, []);

    // Total slides = sankalpa (index 0) + 7 tracks (indices 1–7)
    const totalCount = TRACKS.length + 1;

    useEffect(() => {
        // Use the scroller element as root — slides snap-scroll inside it,
        // not inside the viewport, so root:null (viewport) never fires.
        const root = scrollerRef.current;
        if (!root) return;
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && entry.intersectionRatio >= 0.75) {
                        const idx = slideRefs.current.findIndex(el => el === entry.target);
                        if (idx !== -1) setActiveIdx(idx);
                    }
                });
            },
            { threshold: 0.75, root }
        );
        slideRefs.current.forEach(el => { if (el) observer.observe(el); });
        return () => observer.disconnect();
    }, []);

    // Scroll-event fallback — recalculate activeIdx by finding the slide
    // most centred within the scroller. Also pauses ALL audio immediately
    // before the React state update propagates — this is the key to
    // Instagram-level instant mute on scroll.
    useEffect(() => {
        const scroller = scrollerRef.current;
        if (!scroller) return;
        const onScroll = () => {
            const scrollTop = scroller.scrollTop;
            const height = scroller.clientHeight;
            const center = scrollTop + height / 2;
            let best = 0;
            let bestDist = Infinity;
            slideRefs.current.forEach((el, i) => {
                if (!el) return;
                const mid = el.offsetTop + el.offsetHeight / 2;
                const dist = Math.abs(mid - center);
                if (dist < bestDist) { bestDist = dist; best = i; }
            });
            // ⚡ Pause ALL audio SYNCHRONOUSLY right here — zero React cycle delay
            pauseAll();
            setActiveIdx(best);
        };
        scroller.addEventListener('scroll', onScroll, { passive: true });
        return () => scroller.removeEventListener('scroll', onScroll);
    }, [pauseAll]);

    const handleTap = useCallback((idx: number) => {
        setFullScreenIdx(prev => (prev === idx ? null : idx));
    }, []);

    return (
        <div className={styles.reelWrapper}>
            {/* Desktop left placeholder — nav is handled by VahanaBar globally */}
            <div className={styles.desktopLeftSidebar} aria-hidden />

            {/* Snap scroll container — shows exactly 1 reel at a time */}
            <div className={styles.reelScroller} ref={scrollerRef}>
                {/* Slide 0: Sankalpa / Mission */}
                <div
                    className={styles.reelSlideWrapper}
                    ref={el => { slideRefs.current[0] = el; }}
                >
                    <TodaysMission
                        items={sankalpaItems}
                        onToggle={onSankalpaToggle}
                        onRemove={onSankalpaRemove}
                        onAdd={onSankalpaAdd}
                        isFullScreen={true}
                    />
                </div>

                {/* Slides 1–N: Mantra Reels */}
                {TRACKS.map((track, i) => {
                    const realIdx = i + 1;
                    return (
                        <div
                            key={track.id}
                            className={styles.reelSlideWrapper}
                            ref={el => { slideRefs.current[realIdx] = el; }}
                        >
                            <ReelSlide
                                track={track}
                                scene={scene}
                                isActive={activeIdx === realIdx}
                                isFullScreen={fullScreenIdx === realIdx}
                                onActivate={() => handleTap(realIdx)}
                                onRegisterPause={(fn) => {
                                    pauseRegistry.current.set(realIdx, fn);
                                    return () => { pauseRegistry.current.delete(realIdx); };
                                }}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Dot indicators */}
            <div className={styles.dots}>
                {Array.from({ length: totalCount }).map((_, i) => (
                    <button
                        key={i}
                        className={`${styles.dot} ${i === activeIdx ? styles.dotOn : ''}`}
                        style={{ '--reel-accent': scene.accent } as React.CSSProperties}
                        onClick={() => {
                            slideRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            setActiveIdx(i);
                        }}
                        aria-label={i === 0 ? 'Mission' : TRACKS[i - 1].title}
                    />
                ))}
            </div>

            {/* Desktop right sidebar — Ayurvedic wellness prompts */}
            <ReelRightSidebar accent={scene.accent} />
        </div>
    );
}
