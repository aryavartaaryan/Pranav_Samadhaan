'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import styles from './ReelPlayer.module.css';
import WaterWaveVisualizer from './WaterWaveVisualizer';
import { useCircadianBackground } from '@/hooks/useCircadianBackground';
import TodaysMission from './TodaysMission';

// ── Types ────────────────────────────────────────────────────────────────────
interface PanchangData {
    time: string; period: string; vara: string;
    paksha: string; tithi: string; dateStr: string;
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
    if (h >= 4 && h < 6) return { bg: 'linear-gradient(180deg, #0d0820 0%, #1a0a3d 35%, #2d1b69 70%, #4a2c8a 100%)', accent: '#b388ff', celestial: '🌙', raagLine: 'Brahma Muhurta · The Sacred Dawn Hour', raagSub: 'Silence before creation · Ancient rising' };
    if (h >= 6 && h < 12) return { bg: 'linear-gradient(180deg, #0a0400 0%, #5B2000 25%, #C4580E 55%, #F5A623 80%, #FFD580 100%)', accent: '#FFD580', celestial: '🌅', raagLine: 'Morning Raag · Awakening & Clarity', raagSub: 'Prabhata · Sacred energy · Divine morning' };
    if (h >= 12 && h < 15) return { bg: 'linear-gradient(180deg, #001020 0%, #002B6B 30%, #0055B8 65%, #1a78c2 100%)', accent: '#64C8FF', celestial: '☀️', raagLine: 'Noon Raag · Focus & midday clarity', raagSub: 'Madhyana · Full power · Divine Light' };
    if (h >= 15 && h < 18) return { bg: 'linear-gradient(180deg, #100500 0%, #5C1800 25%, #B04000 55%, #E88030 80%, #FFB060 100%)', accent: '#FFAA58', celestial: '🌤', raagLine: 'Afternoon Raag · Creative Flow', raagSub: 'Apraahna · Sacred creativity · Soft light' };
    if (h >= 18 && h < 20) return { bg: 'linear-gradient(180deg, #050010 0%, #1a0535 25%, #4a0d5c 50%, #8B2070 75%, #C8507C 100%)', accent: '#E8A0FF', celestial: '🪔', raagLine: 'Sandhya Raag · Evening Calm', raagSub: 'Dusk · Peace · Sacred settling' };
    if (h >= 20 && h < 23) return { bg: 'linear-gradient(180deg, #000208 0%, #030a20 30%, #081530 60%, #0f2050 100%)', accent: '#88AAFF', celestial: '🌙', raagLine: 'Night Raag for Deep Sleep', raagSub: 'Ratri · Stillness · Rest & restore' };
    return { bg: 'linear-gradient(180deg, #000005 0%, #010310 40%, #020820 100%)', accent: '#6677cc', celestial: '✨', raagLine: 'Midnight Raag · Deep stillness', raagSub: 'Nisha · Sacred dark · Dreamscape' };
}

// ── Tracks ────────────────────────────────────────────────────────────────────
const TRACKS = [
    { id: 'sv-dhyan2', title: 'Sacred River', likes: 812, videoSrc: '/Slide%20Videos/Dhyan2.mp4', src: '' },
    { id: 'sv-dhyan4', title: 'Mount Kailash I', likes: 634, videoSrc: '/Slide%20Videos/Dhyan4.mp4', src: '' },
    { id: 'sv-dhyan5', title: 'Serene Forest', likes: 509, videoSrc: '/Slide%20Videos/Dhyan5.mp4', src: '' },
    { id: 'sv-dhyan7', title: 'Vedic Horizon', likes: 741, videoSrc: '/Slide%20Videos/Dhyan7.mp4', src: '' },
    { id: 'sv-dhyan10', title: 'Dawn Meditation', likes: 928, videoSrc: '/Slide%20Videos/Dhyan10.mp4', src: '' },
    { id: 'sv-dhyan11', title: 'Sacred Waters', likes: 863, videoSrc: '/Slide%20Videos/Dhyan11.mp4', src: '' },
    { id: 'sv-kedar', title: 'Kedarnath Darshan', likes: 1204, videoSrc: '/Slide%20Videos/Kedar.mp4', src: '' },
    { id: 'sv-shiva', title: 'Shiva Lingam', likes: 987, videoSrc: '/Slide%20Videos/Shiva.mp4', src: '' },
    { id: 'sv-sunset', title: 'Sacred Sunset', likes: 756, videoSrc: '/Slide%20Videos/sunset.mp4', src: '' },
    { id: 'sv-kailash2', title: 'Kailash Yatra II', likes: 678, videoSrc: '/Slide%20Videos/kailash2.mp4', src: '' },
    { id: 'sv-kailash10', title: 'Kailash Journey', likes: 832, videoSrc: '/Slide%20Videos/kailash10.mp4', src: '' },
    { id: 'sv-kailash11', title: 'Holy Peak', likes: 719, videoSrc: '/Slide%20Videos/kailash11.mp4', src: '' },
    { id: 'sv-kailash12', title: 'Divine Mountain', likes: 903, videoSrc: '/Slide%20Videos/kaolash12.mp4', src: '' },
    { id: 'sv-shreyantra', title: 'Shri Yantra', likes: 1089, videoSrc: encodeURI('/Slide Videos/🔱 श्री यंत्र — सिर्फ एक प्रतीक नहीं…ये है चेतना का Blueprint।4 त्रिकोण — शिव।5 त्रिकोण — शक्ति।.mp4'), src: '' },
    { id: 'sv-om-shiv', title: 'Om Namah Shivaya', likes: 1341, videoSrc: encodeURI('/Slide Videos/Om Namah Shivaay🙏🏻🛕...📍📌 Timbersaim Mahadev ( Chota Kailash ) ..#temple #shiv #shiva #mahad.mp4'), src: '' },
    { id: 'sv-sc1', title: 'Vedic Vision I', likes: 588, videoSrc: '/Slide%20Videos/SaveClip.App_AQNNfA3VTBjMRS0DKZ2tv3-vhevWxwrMPZKhPI1H9xoLpaHrHIJx3ci5R1abFzFby8aZYL9-YQ5vxtaHUmwHUzuh.mp4', src: '' },
    { id: 'sv-sc2', title: 'Vedic Vision II', likes: 621, videoSrc: '/Slide%20Videos/SaveClip.App_AQO00LBqdJg_L4Nm4P8HiJPBZYaOlGFEgj32vsgzjb3hcuQ0xDkNYBSDdt7nymEfx9ATsU9C-A_Dcr0eSO5ZVDT0g9jiaWlZ3OpxDAI.mp4', src: '' },
    { id: 'sv-sc3', title: 'Vedic Vision III', likes: 544, videoSrc: '/Slide%20Videos/SaveClip.App_AQP8N4Skw0SXoFQ7nc9oyvI7KrnvzlivBE6xiEhoNFv-pNRCjmdED51KsXE3jxoDmGBwhbCCd-jS16GMLLWwlHBi.mp4', src: '' },
    { id: 'sv-sc4', title: 'Vedic Vision IV', likes: 567, videoSrc: '/Slide%20Videos/SaveClip.App_AQP9f7S1Rp42JmgD6FCdl2L7_ym9OeWZ8FJt6Qc0fjXcyoCNqU6QxXZzLiTjT-5v2-16R1mzx0VAsRzyVhf-vfybov5XARoPy6RCRP4.mp4', src: '' },
    { id: 'fv-kailash', title: 'Kailash Flash', likes: 1102, videoSrc: '/Flash%20Videos/kailash.mp4', src: '' },
    { id: 'fv-kailash2', title: 'Kailash Ascent', likes: 956, videoSrc: '/Flash%20Videos/kailash2.mp4', src: '' },
    { id: 'fusion', title: 'SuperFusion', likes: 1008, videoSrc: '', src: 'https://ik.imagekit.io/rcsesr4xf/flute.mp3?updatedAt=1771983487495' },
    { id: 'gayatri', title: 'Gayatri Ghanpaath', likes: 248, videoSrc: '', src: 'https://ik.imagekit.io/rcsesr4xf/gayatri-mantra-ghanpaath.mp3' },
    { id: 'lalitha', title: 'Lalitha Sahasranamam', likes: 312, videoSrc: '', src: 'https://ik.imagekit.io/rcsesr4xf/Lalitha-Sahasranamam.mp3' },
    { id: 'shiva', title: 'Shiva Tandava Stotram', likes: 521, videoSrc: '', src: 'https://ik.imagekit.io/rcsesr4xf/Shiva-Tandav.mp3' },
    { id: 'brahma', title: 'Brahma Yagya', likes: 189, videoSrc: '', src: 'https://ik.imagekit.io/aup4wh6lq/BrahmaYagya.mp3' },
    { id: 'shanti', title: 'Shanti Path', likes: 403, videoSrc: '', src: 'https://ik.imagekit.io/rcsesr4xf/shanti-path.mp3' },
    { id: 'dainik', title: 'Dainik Agnihotra', likes: 167, videoSrc: '', src: 'https://ik.imagekit.io/aup4wh6lq/DainikAgnihotra.mp3?updatedAt=1771246817070' },
    { id: 'sahana', title: 'Guru Shishya Mantra', likes: 290, videoSrc: '', src: '/audio/Om_Sahana_Vavatu_Shanti_Mantra.mp3' },
    { id: 'agnihotra', title: 'Agnihotra Shantipath', likes: 215, videoSrc: '', src: '/audio/Agnihotra_Shantipath_-_Vedic_Chants_for_Universal_Peace_and_Well-Being_part_2_(mp3.pm).mp3' },
    { id: 'shrisuktam', title: 'Shri Suktam', likes: 334, videoSrc: '', src: '/audio/Challakere_Brothers_vedic_chanting_-_Shri_suktam_(mp3.pm).mp3' },
    { id: 'narayana', title: 'Narayana Suktam', likes: 278, videoSrc: '', src: '/audio/Anant_-_a_collection_of_vedic_chants_-_05._Narayana_Suktam_(mp3.pm).mp3' },
    { id: 'brahma-kanya', title: 'Brahma Yagya Kanya', likes: 198, videoSrc: '', src: 'https://ik.imagekit.io/aup4wh6lq/BrahmaYagyaKanya.mp3' },
];

const INSIGHTS = [
    { icon: '✦', quote: '"The quiet mind is not empty — it is full of the universe."', source: 'Vedic Sutra' },
    { icon: '☽', quote: '"The moon does not fight. It waits. Patience is its mastery."', source: 'Vedic Wisdom' },
    { icon: '◈', quote: '"Let your actions be your temple. Let stillness be your prayer."', source: 'Bhagavad Gita' },
    { icon: '✧', quote: '"Rise before the sun, and the day belongs entirely to you."', source: 'Charaka Samhita' },
];

function getDailyInsight() {
    const d = new Date();
    return INSIGHTS[(d.getDate() * 3 + d.getMonth()) % INSIGHTS.length];
}

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 2: safePlay — wraps every play() call in a try/catch Promise handler.
// If the browser blocks autoplay, logs a friendly warning and can show a UI hint.
// Never throw a DOMException silently.
// ══════════════════════════════════════════════════════════════════════════════
async function safePlay(el: HTMLMediaElement | null): Promise<boolean> {
    if (!el) return false;
    try {
        await el.play();
        return true;
    } catch (err) {
        // DOMException: play() failed because of autoplay policy
        console.warn('[PranaVerse] Autoplay blocked by browser — awaiting user interaction.', err);
        return false;
    }
}

function safePause(el: HTMLMediaElement | null, resetTime = false) {
    if (!el) return;
    try {
        el.pause();
        if (resetTime) el.currentTime = 0;
    } catch {
        // ignore
    }
}

// ── Sankalpa Slide ────────────────────────────────────────────────────────────
const MISSION_TAGLINES = [
    'Your Sacred Intentions for Today',
    'Set Your Saṅkalpa · Rise with Purpose',
    'What Will You Accomplish Today?',
    'The Inner Fire That Moves Mountains',
    "Today's Dharma · Act with Intention",
];

interface SankalpaSlideProps {
    items: Sankalp[];
    scene: ReturnType<typeof getTimeScene>;
    onToggle: (id: string) => void;
    onRemove: (id: string) => void;
    onAdd: (text: string) => void;
    isFullScreen: boolean;
    onExpand: () => void;
}

function SankalpaSlide({ items, onToggle, onRemove, onAdd, isFullScreen, onExpand }: SankalpaSlideProps) {
    const [draft, setDraft] = useState('');
    const [adding, setAdding] = useState(false);
    const done = items.filter(s => s.done).length;
    const tagline = MISSION_TAGLINES[new Date().getDay() % MISSION_TAGLINES.length];
    const { phase, imageUrl, loaded } = useCircadianBackground();
    const isDay = phase.name === 'day';
    const add = () => { if (!draft.trim()) return; onAdd(draft.trim()); setDraft(''); setAdding(false); };

    return (
        <div
            className={`${styles.reelSlide} ${isFullScreen ? styles.reelSlideFull : ''}`}
            style={{ '--reel-accent': phase.accentHex } as React.CSSProperties}
            onClick={!isFullScreen ? onExpand : undefined}
        >
            <div className={styles.circadianBg} />
            <motion.div className={styles.circadianBg} style={{ backgroundImage: `url(${imageUrl})` }}
                animate={{ opacity: loaded ? 1 : 0 }} initial={{ opacity: 0 }} transition={{ duration: 1.5, ease: 'easeInOut' }} />
            <div className={styles.circadianOverlay} style={{ background: isDay ? 'rgba(5,15,35,0.38)' : 'rgba(0,2,12,0.62)' }} />
            <div className={styles.phaseBadge} style={{ color: phase.accentHex }}>
                <span className={styles.phaseLabel}>{phase.label}</span>
                <span className={styles.phaseTagline}>{phase.tagline}</span>
            </div>
            {isFullScreen && <button className={styles.dismissBtn} onClick={onExpand} aria-label="Exit full screen">✕</button>}
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
                    <motion.div className={styles.progressFill}
                        style={{ background: `linear-gradient(90deg, ${phase.accentHex}99, ${phase.accentHex})` }}
                        animate={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }} transition={{ duration: 0.5 }} />
                </div>
                <div className={styles.sankalpaList}>
                    <AnimatePresence initial={false}>
                        {items.map(item => (
                            <motion.div key={item.id}
                                className={`${styles.sankalpaItem} ${item.done ? styles.sankalpaItemDone : ''}`}
                                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 12, height: 0 }} transition={{ duration: 0.22 }} layout>
                                <button className={styles.sankalpaCheck} style={{ borderColor: `${phase.accentHex}66` }} onClick={() => onToggle(item.id)}>
                                    {item.done ? '✓' : ''}
                                </button>
                                <span className={styles.sankalpaText}>{item.text}</span>
                                <button className={styles.sankalpaRemove} onClick={() => onRemove(item.id)}>×</button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    <AnimatePresence>
                        {adding ? (
                            <motion.div className={styles.sankalpaAddRow} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                                <input className={styles.sankalpaInput} placeholder="Add a sacred intention…" value={draft}
                                    onChange={e => setDraft(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') add(); if (e.key === 'Escape') setAdding(false); }} autoFocus />
                                <button className={styles.sankalpaConfirm} style={{ background: phase.accentHex }} onClick={add}>+</button>
                                <button className={styles.sankalpaCancel} onClick={() => { setAdding(false); setDraft(''); }}>✕</button>
                            </motion.div>
                        ) : (
                            <motion.button className={styles.sankalpaAddBtn}
                                style={{ borderColor: `${phase.accentHex}55`, color: phase.accentHex }}
                                onClick={() => setAdding(true)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} layout>
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

// ── JustVibe Reactions ────────────────────────────────────────────────────────
interface ReelReactionsProps { accentColor: string; likes: number; }
function ReelReactions({ accentColor, likes }: ReelReactionsProps) {
    const [vibed, setVibed] = useState(false);
    const [radiated, setRadiated] = useState(false);
    const [planted, setPlanted] = useState(false);
    const [vibeCount, setVibeCount] = useState(likes);
    const [ripple, setRipple] = useState(false);

    return (
        <div className={styles.reelReactions} onClick={e => e.stopPropagation()}>
            <div className={styles.reactionItem} onClick={e => { e.stopPropagation(); setVibed(v => { if (!v) { setVibeCount(c => c + 1); setRipple(true); setTimeout(() => setRipple(false), 700); } else setVibeCount(c => c - 1); return !v; }); }}>
                <div className={`${styles.reactionIcon} ${vibed ? styles.reactionIconVibedOn : ''}`} style={vibed ? { borderColor: `${accentColor}88`, boxShadow: `0 0 22px ${accentColor}44` } : {}}>
                    {ripple && <motion.div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `radial-gradient(circle, ${accentColor}99 0%, transparent 70%)` }} initial={{ scale: 0.3, opacity: 0.9 }} animate={{ scale: 2.5, opacity: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }} />}
                    <span>{vibed ? '✨' : '🌊'}</span>
                </div>
                <span className={styles.reactionCount}>{vibeCount.toLocaleString()}<br />{vibed ? 'Vibed' : 'Vibe'}</span>
            </div>
            <div className={styles.reactionItem} onClick={e => e.stopPropagation()}>
                <div className={styles.reactionIcon}><span>☁️</span></div>
                <span className={styles.reactionCount}>Save</span>
            </div>
            <div className={styles.reactionItem} onClick={e => { e.stopPropagation(); setRadiated(r => !r); }}>
                <div className={`${styles.reactionIcon} ${radiated ? styles.reactionIconRadiateOn : ''}`}>
                    <span>{radiated ? '💎' : '✦'}</span>
                </div>
                <span className={styles.reactionCount}>Radiate</span>
            </div>
            <div className={styles.reactionItem} onClick={e => { e.stopPropagation(); setPlanted(p => !p); }}>
                <div className={`${styles.reactionIcon} ${planted ? styles.reactionIconPlantOn : ''}`}>
                    <span>{planted ? '🌱' : '🌿'}</span>
                </div>
                <span className={styles.reactionCount}>{planted ? 'Planted' : 'Plant'}</span>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 3 + 4 + 5: ReelSlide
// - Unified play/pause driven by isActive prop (observer on OUTER WRAPPER div)
// - safePlay() for every play() call
// - playsInline + loop + muted on <video>
// - loop + muted on <audio>
// - Center tap = play/pause; bottom-right volume icon handled by parent
// ══════════════════════════════════════════════════════════════════════════════
interface ReelSlideProps {
    track: typeof TRACKS[0];
    scene: ReturnType<typeof getTimeScene>;
    isActive: boolean;
    isGlobalMuted: boolean;
    onTapCenter: () => void;   // play/pause center tap
    onRegisterPause: (fn: () => void) => () => void;
}

function ReelSlide({ track, scene, isActive, isGlobalMuted, onTapCenter, onRegisterPause }: ReelSlideProps) {
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [videoProgress, setVideoProgress] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const playingRef = useRef(false);
    const isVideoTrack = Boolean(track.videoSrc);
    // Keep latest isActive available synchronously (no stale closures in callbacks)
    const isActiveRef = useRef(isActive);
    useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
    const isGlobalMutedRef = useRef(isGlobalMuted);
    useEffect(() => { isGlobalMutedRef.current = isGlobalMuted; }, [isGlobalMuted]);

    // ── MODULE 4: Audio element setup ─────────────────────────────────────────
    useEffect(() => {
        if (isVideoTrack) return;
        const a = new Audio();
        a.crossOrigin = 'anonymous';
        a.preload = 'metadata';
        a.src = track.src;
        // MODULE 4: loop + muted attributes on <audio>
        a.loop = true;
        a.muted = isGlobalMutedRef.current;
        audioRef.current = a;
        a.addEventListener('timeupdate', () => { if (a.duration) setProgress(a.currentTime / a.duration); });
        a.addEventListener('ended', () => { a.currentTime = 0; setPlaying(false); playingRef.current = false; setProgress(0); });
        return () => { safePause(a); a.src = ''; };
    }, [track.src, isVideoTrack]);

    // ── Sync isGlobalMuted to live media elements ─────────────────────────────
    useEffect(() => {
        if (isVideoTrack && videoRef.current) videoRef.current.muted = isGlobalMuted;
        if (!isVideoTrack && audioRef.current) audioRef.current.muted = isGlobalMuted;
    }, [isGlobalMuted, isVideoTrack]);

    // ── MODULE 3: Register pause callback with parent ─────────────────────────
    useEffect(() => {
        const pauseNow = () => {
            if (isVideoTrack) {
                safePause(videoRef.current, true);
            } else {
                if (!playingRef.current) return;
                safePause(audioRef.current, true);
                playingRef.current = false;
                setPlaying(false);
                setProgress(0);
            }
        };
        return onRegisterPause(pauseNow);
    }, [onRegisterPause, isVideoTrack]);

    // ── MODULE 3 + 4: VIDEO callback ref — fires when element mounts ─────────
    const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
        videoRef.current = el;
        if (!el) return;
        // MODULE 4: required mobile/iOS attributes
        el.muted = true;         // starts muted — parent unmutes on first tap
        el.loop = true;
        el.playsInline = true;
        // Progress tracking
        el.addEventListener('timeupdate', () => { if (el.duration) setVideoProgress(el.currentTime / el.duration); });
        // MODULE 2: safePlay once data is ready
        const tryPlay = () => { if (isActiveRef.current) safePlay(el); };
        if (el.readyState >= 3) tryPlay();
        else el.addEventListener('canplay', tryPlay, { once: true });
    }, []);

    // ── MODULE 3: Auto-play / auto-pause when isActive changes ───────────────
    useEffect(() => {
        if (isActive) {
            if (isVideoTrack) {
                if (videoRef.current) {
                    videoRef.current.muted = isGlobalMuted;
                    safePlay(videoRef.current);
                }
            } else {
                const a = audioRef.current;
                if (a && !playingRef.current) {
                    a.muted = isGlobalMuted;
                    safePlay(a).then(ok => {
                        if (ok) { setPlaying(true); playingRef.current = true; }
                    });
                }
            }
        } else {
            // Reel left view → pause + hard reset (Module 3)
            if (isVideoTrack) {
                safePause(videoRef.current, true);
            } else if (playingRef.current) {
                safePause(audioRef.current, true);
                playingRef.current = false;
                setPlaying(false);
                setProgress(0);
            }
        }
    }, [isActive, isVideoTrack]);

    // ── MODULE 5: Center tap → play/pause ────────────────────────────────────
    const handleCenterTap = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onTapCenter();  // parent handles unmute-on-first-tap
        if (isVideoTrack) {
            const v = videoRef.current;
            if (!v) return;
            if (v.paused) { v.muted = isGlobalMutedRef.current; safePlay(v); setPlaying(true); playingRef.current = true; }
            else { safePause(v); setPlaying(false); playingRef.current = false; }
        } else {
            const a = audioRef.current;
            if (!a) return;
            if (playing) { safePause(a); setPlaying(false); playingRef.current = false; }
            else { a.muted = isGlobalMutedRef.current; safePlay(a).then(ok => { if (ok) { setPlaying(true); playingRef.current = true; } }); }
        }
    }, [playing, isVideoTrack, onTapCenter]);

    // ── Progress scrub ────────────────────────────────────────────────────────
    const handleVideoScrub = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const v = videoRef.current;
        if (!v || !v.duration) return;
        v.currentTime = parseFloat(e.target.value) * v.duration;
        setVideoProgress(parseFloat(e.target.value));
    }, []);

    const handleAudioScrub = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const a = audioRef.current;
        if (!a || !a.duration) return;
        a.currentTime = parseFloat(e.target.value) * a.duration;
        setProgress(parseFloat(e.target.value));
    }, []);

    const currentProgress = isVideoTrack ? videoProgress : progress;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div
            className={styles.reelSlide}
            style={{ '--reel-bg': scene.bg, '--reel-accent': scene.accent } as React.CSSProperties}
            onClick={handleCenterTap}
        >
            {isVideoTrack ? (
                // MODULE 4: playsInline + loop + muted always declared
                <video
                    ref={setVideoRef}
                    src={track.videoSrc}
                    className={styles.reelVideo}
                    playsInline
                    loop
                    muted
                />
            ) : (
                <div className={styles.vizWrap}>
                    <WaterWaveVisualizer audioRef={audioRef} playing={playing} height={600} accentColor={scene.accent} />
                </div>
            )}

            {/* Top scene label */}
            <div className={styles.slideTopLabel}>
                <div className={styles.slideRaagBlock}>
                    <span className={styles.slideRaagLine}>{scene.raagLine}</span>
                    <span className={styles.slideRaagSub}>{scene.raagSub}</span>
                </div>
            </div>

            {/* Mantra title */}
            <div className={styles.mantraTitle}>
                <p className={styles.mantraTitleText}>{track.title}</p>
                <p className={styles.mantraTitleSub}>{scene.raagSub}</p>
            </div>

            {/* Center play/pause indicator — shows when paused */}
            <AnimatePresence>
                {!playing && !isVideoTrack && (
                    <motion.div className={styles.centerArea}
                        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.2 }}>
                        <div className={styles.playBtn}>
                            <span className={styles.playIconWrap}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 3 }}>
                                    <path d="M6 3.5L20.5 12L6 20.5V3.5Z" fill="white" />
                                </svg>
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom scrubber — MODULE 2 */}
            <div className={styles.reelScrubberWrap} onClick={e => e.stopPropagation()}>
                <input type="range" className={styles.reelScrubber}
                    min={0} max={1} step={0.0001} value={currentProgress}
                    onChange={isVideoTrack ? handleVideoScrub : handleAudioScrub}
                    style={{ '--reel-accent': scene.accent, '--progress': currentProgress } as React.CSSProperties}
                />
            </div>

            {/* JustVibe Reactions */}
            <ReelReactions accentColor={scene.accent} likes={track.likes} />
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
                    <div className={styles.sidebarCardText}><strong>{p.title}</strong><span>{p.sub}</span></div>
                    <button className={styles.sidebarCardCta} style={{ color: accent }}>{p.cta} →</button>
                </div>
            ))}
        </aside>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 1 + 3 + 5: Main ReelPlayer
// - isGlobalMuted starts true; first tap on wrapper unmutes everything
// - Unified IntersectionObserver on outer wrapper divs (not on <audio>)
// - Volume icon bottom-right toggles isGlobalMuted + shows toast
// ══════════════════════════════════════════════════════════════════════════════
export default function ReelPlayer({ greeting: _g, displayName: _d, panchangData: _p, sankalpaItems, onSankalpaToggle, onSankalpaRemove, onSankalpaAdd }: ReelPlayerProps) {
    const [activeIdx, setActiveIdx] = useState(0);
    const [fullScreenIdx, setFullScreenIdx] = useState<number | null>(null);

    // ── MODULE 1: Global muted state — starts true ────────────────────────────
    const [isGlobalMuted, setIsGlobalMuted] = useState(true);
    const hasInteractedRef = useRef(false);

    // ── MODULE 5: Volume toast ────────────────────────────────────────────────
    const [toastMsg, setToastMsg] = useState('');
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const showToast = useCallback((msg: string) => {
        setToastMsg(msg);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToastMsg(''), 2000);
    }, []);

    // ── MODULE 1: First tap on player = unmute all ────────────────────────────
    const handleFirstTap = useCallback(() => {
        if (hasInteractedRef.current) return;
        hasInteractedRef.current = true;
        setIsGlobalMuted(false);
        showToast('🔊 Audio On');
    }, [showToast]);

    const feed = useRef([
        { id: 'sankalpa-0', type: 'sankalpa' as const },
        ...TRACKS.map(t => ({ ...t, type: 'mantra' as const })),
    ]);
    const [feedVersion, setFeedVersion] = useState(0); // triggers re-render when feed appended
    const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
    const scrollerRef = useRef<HTMLDivElement | null>(null);
    const scene = getTimeScene(new Date().getHours());

    // Pause registry — instant pause of all reels on scroll.
    // pauseAllExcept(idx): skips the new active reel so it never gets killed by a competing handler.
    const pauseRegistry = useRef<Map<number, () => void>>(new Map());
    const activeIdxRef = useRef(0); // always current, safe for scroll closures
    const pauseAllExcept = useCallback((exceptIdx: number) => {
        pauseRegistry.current.forEach((fn, idx) => {
            if (idx !== exceptIdx) fn();
        });
    }, []);
    // Legacy alias used in a few places
    const pauseAll = useCallback(() => pauseAllExcept(-1), [pauseAllExcept]);
    void pauseAll; // suppress unused-var lint

    // Infinite feed: append when near end
    const prevIdxRef = useRef(0);
    useEffect(() => {
        if (activeIdx <= prevIdxRef.current) { prevIdxRef.current = activeIdx; return; }
        prevIdxRef.current = activeIdx;
        if (activeIdx >= feed.current.length - 3) {
            const shuffled = [...TRACKS].sort(() => Math.random() - 0.5);
            shuffled.forEach((t, i) => feed.current.push({ ...t, type: 'mantra', id: `${t.id}-ext${feed.current.length + i}` }));
            setFeedVersion(v => v + 1);
        }
    }, [activeIdx]);

    // ── SINGLE SOURCE OF TRUTH: scroll handler drives activeIdx ─────────────
    // The IntersectionObserver is intentionally removed — having two independent
    // sources both calling setActiveIdx() is what caused the 0.5s play-then-stop
    // race (observer fires first → reel starts → scroll handler calls pauseAll → reel stops).
    // The scroll handler IS the single source of truth, executed synchronously.

    // Keep a ref to the mute setter so the scroll closure can call it without going stale
    const setIsGlobalMutedRef = useRef<((v: boolean | ((p: boolean) => boolean)) => void) | null>(null);
    useEffect(() => { setIsGlobalMutedRef.current = setIsGlobalMuted; }, []);

    // ── SCROLL HANDLER: single source of truth for active reel ───────────────
    // ★ Instagram flow:
    //   1. Detect which reel is centered
    //   2. pauseAllExcept(newIdx)  ← new reel is SKIPPED so it never gets killed
    //   3. setActiveIdx(newIdx)    ← isActive prop flips → reel's effect calls safePlay()
    //   4. On first scroll → unlock audio (browser treats scroll as user gesture)
    useEffect(() => {
        const scroller = scrollerRef.current;
        if (!scroller) return;
        const onScroll = () => {
            // Unlock audio on first scroll (trusted user gesture)
            if (!hasInteractedRef.current) {
                hasInteractedRef.current = true;
                setIsGlobalMutedRef.current?.(false);
                showToast('🔊 Vibe On');
            }
            const center = scroller.scrollTop + scroller.clientHeight / 2;
            let best = activeIdxRef.current, bestDist = Infinity;
            slideRefs.current.forEach((el, i) => {
                if (!el) return;
                const dist = Math.abs(el.offsetTop + el.offsetHeight / 2 - center);
                if (dist < bestDist) { bestDist = dist; best = i; }
            });
            if (best === activeIdxRef.current) return; // no change, skip
            activeIdxRef.current = best;
            // ⚡ Pause all OTHER reels FIRST, skip the incoming active one
            pauseAllExcept(best);
            setActiveIdx(best);
        };
        scroller.addEventListener('scroll', onScroll, { passive: true });
        return () => scroller.removeEventListener('scroll', onScroll);
    }, [pauseAllExcept, showToast]);

    // Keep activeIdxRef in sync when activeIdx changes via any path
    useEffect(() => { activeIdxRef.current = activeIdx; }, [activeIdx]);


    // ── MODULE 5: Volume icon toggle ──────────────────────────────────────────
    const toggleMute = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        hasInteractedRef.current = true; // counts as interaction
        setIsGlobalMuted(m => {
            const next = !m;
            showToast(next ? '🔇 Audio Off' : '🔊 Audio On');
            return next;
        });
    }, [showToast]);

    // ── MODULE 5: Center tap handler passed to each slide ────────────────────
    const handleCenterTap = useCallback(() => {
        if (!hasInteractedRef.current) {
            hasInteractedRef.current = true;
            setIsGlobalMuted(false);
            showToast('🔊 Audio On');
        }
    }, [showToast]);

    return (
        // MODULE 1: onClick on wrapper — first tap anywhere unmutes
        <div className={styles.reelWrapper} onClick={handleFirstTap}>
            {/* Desktop left sidebar */}
            <div className={styles.desktopLeftSidebar}>
                <div className={styles.sidebarBrandMark}><span className={styles.sidebarBrandText}>PranaVerse</span></div>
                <Link href="/" className={styles.sidebarNavLink}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                    </svg><span>Home</span>
                </Link>
                <Link href="/pranaverse" className={`${styles.sidebarNavLink} ${styles.sidebarNavLinkActive}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3" />
                    </svg><span>Vibes</span>
                </Link>
                <Link href="/acharya-samvad" className={styles.sidebarNavLink}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg><span>Acharya</span>
                </Link>
                <Link href="/profile" className={styles.sidebarNavLink}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg><span>Profile</span>
                </Link>
            </div>

            {/* Center reel column */}
            <div className={styles.reelCenterCol}>
                <div className={styles.reelScroller} ref={scrollerRef}>
                    {feed.current.map((item, i) => {
                        const isNear = Math.abs(i - activeIdx) <= 2;
                        return (
                            <div
                                key={item.id}
                                className={styles.reelSlideWrapper}
                                ref={el => { slideRefs.current[i] = el; }}
                            >
                                {item.type === 'sankalpa' ? (
                                    <TodaysMission
                                        items={sankalpaItems}
                                        onToggle={onSankalpaToggle}
                                        onRemove={onSankalpaRemove}
                                        onAdd={onSankalpaAdd}
                                        isFullScreen={true}
                                    />
                                ) : isNear ? (
                                    <ReelSlide
                                        track={item}
                                        scene={scene}
                                        isActive={activeIdx === i}
                                        isGlobalMuted={isGlobalMuted}
                                        onTapCenter={handleCenterTap}
                                        onRegisterPause={fn => {
                                            pauseRegistry.current.set(i, fn);
                                            return () => { pauseRegistry.current.delete(i); };
                                        }}
                                    />
                                ) : (
                                    <div className={styles.reelSlidePlaceholder} />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* MODULE 5: Volume icon bottom-right, always visible */}
                <button
                    className={styles.volumeBtn}
                    onClick={toggleMute}
                    aria-label={isGlobalMuted ? 'Unmute' : 'Mute'}
                >
                    {isGlobalMuted ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                            <line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
                        </svg>
                    ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                        </svg>
                    )}
                </button>

                {/* MODULE 5: Audio On/Off toast */}
                <AnimatePresence>
                    {toastMsg && (
                        <motion.div
                            className={styles.audioToast}
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                            transition={{ duration: 0.25 }}
                        >
                            {toastMsg}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Dot indicators */}
            <div className={styles.dots}>
                {Array.from({ length: Math.min(TRACKS.length + 1, 8) }).map((_, i) => (
                    <button key={i}
                        className={`${styles.dot} ${i === activeIdx % (TRACKS.length + 1) ? styles.dotOn : ''}`}
                        style={{ '--reel-accent': scene.accent } as React.CSSProperties}
                        onClick={e => { e.stopPropagation(); slideRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setActiveIdx(i); }}
                        aria-label={i === 0 ? 'Mission' : (TRACKS[i - 1]?.title ?? `Track ${i}`)}
                    />
                ))}
            </div>

            {/* Desktop right sidebar */}
            <ReelRightSidebar accent={scene.accent} />
        </div>
    );
}
