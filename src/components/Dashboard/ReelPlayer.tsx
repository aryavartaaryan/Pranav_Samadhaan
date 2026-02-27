'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import styles from './ReelPlayer.module.css';
import WaterWaveVisualizer from './WaterWaveVisualizer';
import OmInfinityLogo from '../OmInfinityLogo';

// ── Types ────────────────────────────────────────────────────────────────────
interface PanchangData {
    time: string;
    period: string;
    vara: string;
    paksha: string;
    tithi: string;
    dateStr: string;
}

interface ReelPlayerProps {
    greeting: { emoji: string; text: string; period: string } | null;
    displayName: string;
    panchangData: PanchangData;
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
        id: 'fusion',
        title: 'SuperFusion',
        likes: 1008,
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

// ── Insights ─────────────────────────────────────────────────────────────────
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

// ── Single Reel Slide ─────────────────────────────────────────────────────────
interface ReelSlideProps {
    track: typeof TRACKS[0];
    scene: ReturnType<typeof getTimeScene>;
    isActive: boolean;
    isFullScreen: boolean;
    onActivate: () => void;
}

function ReelSlide({ track, scene, isActive, isFullScreen, onActivate }: ReelSlideProps) {
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [showInsight, setShowInsight] = useState(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const dualRef = useRef<HTMLAudioElement | null>(null);
    const insight = getDailyInsight();

    // Create audio elements on mount
    useEffect(() => {
        const a = new Audio();
        a.preload = 'metadata';
        a.src = track.src;
        audioRef.current = a;

        const d = new Audio();
        if (track.dualSrc) { d.src = track.dualSrc; d.preload = 'metadata'; }
        dualRef.current = d;

        a.addEventListener('timeupdate', () => {
            if (a.duration) setProgress(a.currentTime / a.duration);
        });

        a.addEventListener('ended', () => {
            a.currentTime = 0;
            if (track.dualSrc) { d.currentTime = 0; }
            setPlaying(false);
            setProgress(0);
        });

        return () => {
            a.pause(); a.src = '';
            d.pause(); d.src = '';
        };
    }, [track]);

    // Pause when not active
    useEffect(() => {
        if (!isActive && playing) {
            audioRef.current?.pause();
            dualRef.current?.pause();
            setPlaying(false);
        }
    }, [isActive]);

    const toggle = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        const a = audioRef.current;
        const d = dualRef.current;
        if (!a) return;

        if (playing) {
            a.pause();
            d?.pause();
            setPlaying(false);
        } else {
            if (a.ended || a.currentTime >= a.duration - 0.1) {
                a.currentTime = 0;
                if (track.dualSrc && d) d.currentTime = 0;
            }
            a.play().catch(console.error);
            if (track.dualSrc && d) d.play().catch(console.error);
            setPlaying(true);
        }
    }, [playing, track]);

    const handleCopyLink = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(track.src).then(() => {
            // flash feedback handled by CSS
        });
    }, [track.src]);

    return (
        <div
            className={`${styles.reelSlide} ${isFullScreen ? styles.reelSlideFull : ''}`}
            style={{ '--reel-bg': scene.bg, '--reel-accent': scene.accent } as React.CSSProperties}
            onClick={onActivate}
        >
            {/* Animated gradient background */}
            <div className={styles.reelBg} />

            {/* Beautiful water visualizer — always shown */}
            <div className={styles.vizWrap}>
                <WaterWaveVisualizer audioRef={audioRef} playing={playing} height={isFullScreen ? window.innerHeight : 420} accentColor={scene.accent} />
            </div>

            {/* Top UI — fades out in full screen while playing */}
            <AnimatePresence>
                {(!isFullScreen || !playing) && (
                    <motion.div
                        className={styles.headerOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <div className={styles.hdrLeft}>
                            <OmInfinityLogo size={28} className={styles.hdrLogo} />
                            <div>
                                <span className={styles.hdrTitle}>
                                    {scene.celestial} {scene.raagLine}
                                </span>
                                <span className={styles.hdrSub}>{scene.raagSub}</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Big play button — center */}
            <div className={styles.centerArea} onClick={(e) => e.stopPropagation()}>
                <motion.button
                    className={`${styles.playBtn} ${playing ? styles.playBtnActive : ''}`}
                    onClick={toggle}
                    whileTap={{ scale: 0.88 }}
                    aria-label={playing ? 'Pause' : 'Play'}
                >
                    <AnimatePresence mode="wait">
                        <motion.span
                            key={playing ? 'pause' : 'play'}
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.6, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className={styles.playIcon}
                        >
                            {playing ? '⏸' : '▶'}
                        </motion.span>
                    </AnimatePresence>
                    {playing && (
                        <motion.span
                            className={styles.pulseRing}
                            animate={{ scale: [1, 1.9], opacity: [0.6, 0] }}
                            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
                        />
                    )}
                </motion.button>
            </div>

            {/* Bottom panel */}
            <AnimatePresence>
                {(!isFullScreen || !playing) && (
                    <motion.div
                        className={styles.bottomPanel}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.4 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Raag line */}
                        <div className={styles.raagLine}>
                            <span className={styles.raagTitle}>{scene.raagLine}</span>
                            <span className={styles.raagSub}>{scene.raagSub}</span>
                        </div>

                        {/* Track info */}
                        <div className={styles.trackInfo}>
                            <span className={styles.trackBadge}>AUDIO NECTAR · PROJECT LEELA</span>
                            <div className={styles.trackTitleRow}>
                                <span className={styles.trackTitle}>{track.title}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button className={styles.linkBtn} onClick={handleCopyLink} title="Share">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                        </svg>
                                    </button>
                                    <span className={styles.trackLikes}>🔥 {track.likes}</span>
                                </div>
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div className={styles.progressBar}>
                            <motion.div
                                className={styles.progressFill}
                                style={{ width: `${progress * 100}%` }}
                                transition={{ duration: 0.1 }}
                            />
                        </div>

                        {/* Insight card */}
                        <AnimatePresence>
                            {showInsight && (
                                <motion.div
                                    className={styles.insightCard}
                                    initial={{ opacity: 0, y: 14 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 14 }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <button className={styles.insightClose} onClick={() => setShowInsight(false)} aria-label="Close">×</button>
                                    <span className={styles.insightIcon}>{insight.icon}</span>
                                    <p className={styles.insightQuote}>{insight.quote}</p>
                                    <span className={styles.insightSource}>{insight.source}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Open Leela */}
                        <Link href="/dhyan-kshetra" className={styles.leelaLink}>
                            <OmInfinityLogo size={18} className={styles.leelaIcon} />
                            Open in Leela
                        </Link>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Full-screen expand hint (only when not full screen) */}
            {!isFullScreen && (
                <div className={styles.expandHint}>
                    <span>Tap to expand</span>
                </div>
            )}

            {/* Full-screen dismiss button */}
            {isFullScreen && (
                <button className={styles.dismissBtn} onClick={(e) => { e.stopPropagation(); onActivate(); }} aria-label="Exit full screen">
                    ✕
                </button>
            )}
        </div>
    );
}

// ── Main ReelPlayer ───────────────────────────────────────────────────────────
export default function ReelPlayer({ greeting, displayName, panchangData }: ReelPlayerProps) {
    const [activeIdx, setActiveIdx] = useState(0);
    const [fullScreenIdx, setFullScreenIdx] = useState<number | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
    const scene = getTimeScene(new Date().getHours());

    // IntersectionObserver to detect which slide is in view
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                        const idx = slideRefs.current.findIndex(el => el === entry.target);
                        if (idx !== -1) setActiveIdx(idx);
                    }
                });
            },
            { threshold: 0.5 }
        );

        slideRefs.current.forEach(el => { if (el) observer.observe(el); });
        return () => observer.disconnect();
    }, []);

    const handleTap = useCallback((idx: number) => {
        if (fullScreenIdx === idx) {
            setFullScreenIdx(null);
        } else {
            setFullScreenIdx(idx);
        }
    }, [fullScreenIdx]);

    return (
        <div className={styles.reelWrapper}>
            {/* Greeting header like Instagram */}
            <div className={styles.reelHeader} style={{ '--reel-accent': scene.accent } as React.CSSProperties}>
                <div className={styles.hdrLeft}>
                    <OmInfinityLogo size={30} className={styles.hdrLogo} />
                    <div>
                        <div className={styles.hdrGreeting}>
                            <span className={styles.hdrEmoji}>{greeting?.emoji ?? '🙏'}</span>
                            <span className={styles.hdrTitle}>
                                {greeting?.text ?? 'Namaste'},{' '}
                                <span className={styles.hdrName}>{displayName}</span>
                            </span>
                        </div>
                        <span className={styles.hdrSub}>{greeting?.period ?? ''}</span>
                    </div>
                </div>
                <div className={styles.hdrRight}>
                    <div className={styles.timePill}>
                        <span className={styles.timeDigits}>{panchangData.time}</span>
                        <span className={styles.timePeriod}>{panchangData.period}</span>
                    </div>
                    <div className={styles.panchangRow}>
                        <span className={styles.pTag}>{panchangData.tithi}</span>
                        <span className={styles.pDot}>·</span>
                        <span className={styles.pTag}>{panchangData.paksha}</span>
                    </div>
                </div>
            </div>

            {/* Snap scroll container */}
            <div className={styles.reelScroller} ref={scrollRef}>
                {TRACKS.map((track, i) => {
                    const trackScene = getTimeScene(new Date().getHours());
                    return (
                        <div
                            key={track.id}
                            className={styles.reelSlideWrapper}
                            ref={el => { slideRefs.current[i] = el; }}
                        >
                            <ReelSlide
                                track={track}
                                scene={trackScene}
                                isActive={activeIdx === i}
                                isFullScreen={fullScreenIdx === i}
                                onActivate={() => handleTap(i)}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Track dot indicators */}
            <div className={styles.dots}>
                {TRACKS.map((t, i) => (
                    <button
                        key={t.id}
                        className={`${styles.dot} ${i === activeIdx ? styles.dotOn : ''}`}
                        style={{ '--reel-accent': scene.accent } as React.CSSProperties}
                        onClick={() => {
                            slideRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            setActiveIdx(i);
                        }}
                        aria-label={t.title}
                    />
                ))}
            </div>
        </div>
    );
}
