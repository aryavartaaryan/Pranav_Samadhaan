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
function getTimeScene(h: number): {
    bg: string;
    accent: string;
    celestial: string;
    raagLine: string;
    raagSub: string;
} {
    if (h >= 4 && h < 6) return {
        bg: 'linear-gradient(180deg, #0d0820 0%, #1a0a3d 35%, #2d1b69 70%, #4a2c8a 100%)',
        accent: '#b388ff',
        celestial: '🌙',
        raagLine: 'Brahma Muhurta · The Sacred Dawn Hour',
        raagSub: 'Silence before creation · Ancient rising',
    };
    if (h >= 6 && h < 12) return {
        bg: 'linear-gradient(180deg, #1a0a00 0%, #8B3A00 30%, #D4700E 65%, #F5A623 100%)',
        accent: '#FFD580',
        celestial: '🌅',
        raagLine: 'Morning Raag · Awakening & Clarity',
        raagSub: 'Prabhata · Sacred energy · Divine morning',
    };
    if (h >= 12 && h < 15) return {
        bg: 'linear-gradient(180deg, #001430 0%, #003580 35%, #0057B3 65%, #1a78c2 100%)',
        accent: '#64C8FF',
        celestial: '☀️',
        raagLine: 'Noon Raag · Focus & midday clarity',
        raagSub: 'Madhyana · Full power · Divine Light',
    };
    if (h >= 15 && h < 18) return {
        bg: 'linear-gradient(180deg, #1a0a00 0%, #7B2D00 30%, #C05000 60%, #E07840 100%)',
        accent: '#FFAA58',
        celestial: '🌤',
        raagLine: 'Afternoon Raag · Creative Flow',
        raagSub: 'Apraahna · Sacred creativity · Soft light',
    };
    if (h >= 18 && h < 20) return {
        bg: 'linear-gradient(180deg, #0d001a 0%, #2d0a3d 30%, #5c1a6e 60%, #8b3a9e 100%)',
        accent: '#E8A0FF',
        celestial: '🪔',
        raagLine: 'Sandhya Raag · Evening Calm',
        raagSub: 'Dusk · Peace · Sacred settling',
    };
    if (h >= 20 && h < 23) return {
        bg: 'linear-gradient(180deg, #000511 0%, #050d2e 35%, #0a1a4d 65%, #122060 100%)',
        accent: '#88AAFF',
        celestial: '🌙',
        raagLine: 'Night Raag for Deep Sleep',
        raagSub: 'Ratri · Stillness · Rest & restore',
    };
    return {
        bg: 'linear-gradient(180deg, #000208 0%, #020510 40%, #030820 100%)',
        accent: '#6677cc',
        celestial: '✨',
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
    { id: 'gayatri', title: 'Gayatri Ghanpaath', likes: 248, src: 'https://ik.imagekit.io/rcsesr4xf/gayatri-mantra-ghanpaath.mp3' },
    { id: 'lalitha', title: 'Lalitha Sahasranamam', likes: 312, src: 'https://ik.imagekit.io/rcsesr4xf/Lalitha-Sahasranamam.mp3' },
    { id: 'shiva', title: 'Shiva Tandava Stotram', likes: 521, src: 'https://ik.imagekit.io/rcsesr4xf/Shiva-Tandav.mp3' },
    { id: 'brahma', title: 'Brahma Yagya', likes: 189, src: 'https://ik.imagekit.io/rcsesr4xf/BrahmaYagya.mp3' },
    { id: 'shanti', title: 'Shanti Path', likes: 403, src: 'https://ik.imagekit.io/rcsesr4xf/shanti-path.mp3' },
    { id: 'dainik', title: 'Dainik Agnihotra', likes: 167, src: 'https://ik.imagekit.io/aup4wh6lq/DainikAgnihotra.mp3?updatedAt=1771246817070' },
];

// ── Insight pool ─────────────────────────────────────────────────────────────
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
    const idx = (d.getDate() * 3 + d.getMonth()) % INSIGHTS.length;
    return INSIGHTS[idx];
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ReelPlayer({ greeting, displayName, panchangData }: ReelPlayerProps) {
    const [idx, setIdx] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [scene] = useState(() => getTimeScene(new Date().getHours()));
    const [insight] = useState(() => getDailyInsight());
    const [slideDir, setSlideDir] = useState<'left' | 'right'>('left');
    const [showInsight, setShowInsight] = useState(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const dualAudioRef = useRef<HTMLAudioElement | null>(null);

    // Touch swipe state
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);

    const track = TRACKS[idx];

    // Init audio elements
    useEffect(() => {
        const a = new Audio();
        const d = new Audio();
        a.crossOrigin = 'anonymous';
        d.crossOrigin = 'anonymous';
        a.preload = 'metadata';
        d.preload = 'metadata';

        a.onended = () => {
            if (audioRef.current) audioRef.current.currentTime = 0;
            if (dualAudioRef.current) dualAudioRef.current.currentTime = 0;
            setPlaying(false);
        };

        audioRef.current = a;
        dualAudioRef.current = d;
        return () => {
            a.pause(); a.src = '';
            d.pause(); d.src = '';
        };
    }, []);

    // Change track src
    useEffect(() => {
        const a = audioRef.current;
        const d = dualAudioRef.current;
        if (!a || !d) return;

        const currentTrack = TRACKS[idx];
        a.src = currentTrack.src;
        a.load();

        if (currentTrack.dualSrc) {
            d.src = currentTrack.dualSrc;
            d.load();
        } else {
            d.src = '';
        }

        if (playing) {
            a.play().catch(() => setPlaying(false));
            if (currentTrack.dualSrc) d.play().catch(console.error);
        }
    }, [idx]);

    const toggle = useCallback(() => {
        const a = audioRef.current;
        const d = dualAudioRef.current;
        if (!a || !d) return;

        if (playing) {
            a.pause();
            d.pause();
            setPlaying(false);
        } else {
            // If ended, reset to beginning
            if (a.currentTime === a.duration || a.ended) {
                a.currentTime = 0;
                if (TRACKS[idx].dualSrc) d.currentTime = 0;
            }
            a.play().catch(console.error);
            if (TRACKS[idx].dualSrc) d.play().catch(console.error);
            setPlaying(true);
        }
    }, [playing, idx]);

    const goNext = useCallback(() => {
        setSlideDir('up');
        setIdx(i => (i + 1) % TRACKS.length);
    }, []);

    const goPrev = useCallback(() => {
        setSlideDir('down');
        setIdx(i => (i - 1 + TRACKS.length) % TRACKS.length);
    }, []);

    // Touch handlers for swipe (Vertical for Reels)
    const onTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    }, []);

    const onTouchEnd = useCallback((e: React.TouchEvent) => {
        const dx = Math.abs(e.changedTouches[0].clientX - touchStartX.current);
        const dy = e.changedTouches[0].clientY - touchStartY.current;
        if (Math.abs(dy) > 40 && dx < 60) {
            dy < 0 ? goNext() : goPrev(); // swipe up -> next, swipe down -> prev
        }
    }, [goNext, goPrev]);

    const lastWheelTime = useRef(0);
    const onWheel = useCallback((e: React.WheelEvent) => {
        const now = Date.now();
        if (now - lastWheelTime.current < 800) return; // Debounce

        if (e.deltaY > 50) {
            goNext();
            lastWheelTime.current = now;
        } else if (e.deltaY < -50) {
            goPrev();
            lastWheelTime.current = now;
        }
    }, [goNext, goPrev]);

    const handleCopyLink = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(track.src);
        alert('Track URL copied to clipboard!');
    }, [track.src]);

    return (
        <div
            className={styles.reelContainer}
            style={{ '--reel-bg': scene.bg, '--reel-accent': scene.accent } as React.CSSProperties}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onWheel={onWheel}
        >
            {/* ── Animated background ───────────────────────────────────── */}
            <div className={styles.reelBg} />

            {/* ── Celestial overlay (when paused) ──────────────────────── */}
            <AnimatePresence>
                {!playing && (
                    <motion.div
                        className={styles.celestialWrap}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <motion.span
                            className={styles.celestialIcon}
                            animate={{ scale: [1, 1.06, 1], filter: [`drop-shadow(0 0 18px ${scene.accent}80)`, `drop-shadow(0 0 42px ${scene.accent}cc)`, `drop-shadow(0 0 18px ${scene.accent}80)`] }}
                            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            {scene.celestial}
                        </motion.span>
                        {/* Floating star particles */}
                        {[...Array(8)].map((_, i) => (
                            <motion.span
                                key={i}
                                className={styles.starParticle}
                                style={{
                                    left: `${12 + (i * 11) % 76}%`,
                                    top: `${18 + (i * 13) % 50}%`,
                                    fontSize: `${0.4 + (i % 3) * 0.18}rem`,
                                }}
                                animate={{
                                    opacity: [0.2, 0.9, 0.2],
                                    y: [0, -8, 0],
                                }}
                                transition={{ duration: 2.5 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
                            >
                                ✦
                            </motion.span>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── WaveVisualizer (when playing) ────────────────────────── */}
            <AnimatePresence>
                {playing && (
                    <motion.div
                        className={styles.vizWrap}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <WaterWaveVisualizer audioRef={audioRef} playing={playing} height={320} />
                    </motion.div>
                )}
            </AnimatePresence>


            {/* ── CENTER AREA ──────────────────────────────────────────────── */}
            <div className={styles.centerArea}>
                {/* Nav arrows */}
                <button className={styles.navL} onClick={goPrev} aria-label="Previous Reel">↑</button>

                {/* CENTER: big play/pause button */}
                <div className={styles.playZone}>
                    <motion.button
                        className={`${styles.playBtn} ${playing ? styles.playBtnActive : ''}`}
                        onClick={toggle}
                        whileTap={{ scale: 0.92 }}
                        aria-label={playing ? 'Pause' : 'Play'}
                    >
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={playing ? 'pause' : 'play'}
                                initial={{ scale: 0.6, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.6, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className={styles.playIcon}
                            >
                                {playing ? '⏸' : '▶'}
                            </motion.span>
                        </AnimatePresence>
                        {/* pulse ring */}
                        {playing && (
                            <motion.span
                                className={styles.pulseRing}
                                animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
                            />
                        )}
                    </motion.button>
                </div>

                <button className={styles.navR} onClick={goNext} aria-label="Next Reel">↓</button>
            </div>

            {/* ── BOTTOM PANEL: track info + raag line + insight + dots ─── */}
            <div className={styles.bottomPanel}>

                {/* Raag time line */}
                <motion.div
                    className={styles.raagLine}
                    key={`raag-${idx}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <span className={styles.raagTitle}>{scene.raagLine}</span>
                    <span className={styles.raagSub}>{scene.raagSub}</span>
                </motion.div>

                {/* Track title + likes + Link Button */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={`track-${idx}`}
                        className={styles.trackInfo}
                        initial={{ opacity: 0, y: slideDir === 'up' ? 30 : -30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: slideDir === 'up' ? -30 : 30 }}
                        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <span className={styles.trackBadge}>AUDIO NECTAR · PROJECT LEELA</span>
                        <div className={styles.trackTitleRow}>
                            <span className={styles.trackTitle}>{track.title}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button className={styles.linkBtn} onClick={handleCopyLink} title="Copy URL">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                </button>
                                <span className={styles.trackLikes}>🔥 {track.likes}</span>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Daily Insight Card */}
                <AnimatePresence>
                    {showInsight && (
                        <motion.div
                            className={styles.insightCard}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 14 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                        >
                            <button
                                className={styles.insightClose}
                                onClick={() => setShowInsight(false)}
                                aria-label="Close insight"
                            >×</button>
                            <span className={styles.insightIcon}>{insight.icon}</span>
                            <p className={styles.insightQuote}>{insight.quote}</p>
                            <span className={styles.insightSource}>{insight.source}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Track dots */}
                <div className={styles.dots}>
                    {TRACKS.map((t, i) => (
                        <button
                            key={t.id}
                            className={`${styles.dot} ${i === idx ? styles.dotOn : ''}`}
                            onClick={() => { setSlideDir(i > idx ? 'up' : 'down'); setIdx(i); setPlaying(true); }}
                            aria-label={t.title}
                        />
                    ))}
                </div>

                {/* Open Leela link */}
                <Link href="/dhyan-kshetra" className={styles.leelaLink}>
                    <OmInfinityLogo size={20} className={styles.leelaIcon} />
                    Open in Leela
                </Link>
            </div>
        </div>
    );
}
