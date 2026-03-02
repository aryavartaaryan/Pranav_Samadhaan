'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Music2 } from 'lucide-react';
import { useTimeOfDay } from '@/hooks/useTimeOfDay';

// ── Track list ────────────────────────────────────────────────────────────────
const TRACKS = [
    { id: 'gayatri', title: 'Gayatri Ghanpaath', artist: 'Vedic Chant', src: 'https://ik.imagekit.io/rcsesr4xf/gayatri-mantra-ghanpaath.mp3' },
    { id: 'lalitha', title: 'Lalitha Sahasranamam', artist: 'Devotional', src: 'https://ik.imagekit.io/rcsesr4xf/Lalitha-Sahasranamam.mp3' },
    { id: 'shiva', title: 'Shiva Tandava Stotram', artist: 'Power Mantra', src: 'https://ik.imagekit.io/rcsesr4xf/Shiva-Tandav.mp3' },
    { id: 'brahma', title: 'Brahma Yagya', artist: 'Sacred Fire', src: 'https://ik.imagekit.io/rcsesr4xf/BrahmaYagya.mp3' },
    { id: 'shanti', title: 'Shanti Path', artist: 'Peace Mantra', src: 'https://ik.imagekit.io/rcsesr4xf/shanti-path.mp3' },
    { id: 'dainik', title: 'Dainik Agnihotra', artist: 'Morning Ritual', src: 'https://ik.imagekit.io/aup4wh6lq/DainikAgnihotra.mp3?updatedAt=1771246817070' },
];

// Time-of-day nature video loops (muted visual atmosphere)
const TOD_VIDEOS: Record<string, string> = {
    morning: 'https://ik.imagekit.io/rcsesr4xf/nature-morning.mp4',
    noon: 'https://ik.imagekit.io/rcsesr4xf/nature-noon.mp4',
    evening: 'https://ik.imagekit.io/rcsesr4xf/nature-evening.mp4',
    night: 'https://ik.imagekit.io/rcsesr4xf/nature-night.mp4',
    // Fallback to a publicly available loop if CDN asset is missing
    _fallback: 'https://cdn.pixabay.com/video/2020/07/12/44940-439608654_large.mp4',
};

function fmtTime(s: number) {
    if (!s || isNaN(s)) return '--:--';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function LeelaCard() {
    const tod = useTimeOfDay();

    // ── Refs — both media elements controlled by a single state ──────────────
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [idx, setIdx] = useState(0);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [videoError, setVideoError] = useState(false);

    const track = TRACKS[idx];
    const videoSrc = videoError
        ? TOD_VIDEOS._fallback
        : (TOD_VIDEOS[tod.period] ?? TOD_VIDEOS._fallback);

    // ── Audio element bootstrap ───────────────────────────────────────────────
    useEffect(() => {
        const a = new Audio();
        a.crossOrigin = 'anonymous';
        a.preload = 'metadata';
        a.onended = () => setIdx(i => (i + 1) % TRACKS.length);
        a.ontimeupdate = () => {
            setCurrentTime(a.currentTime);
            setProgress(a.duration ? a.currentTime / a.duration : 0);
        };
        a.onloadedmetadata = () => setDuration(a.duration);
        audioRef.current = a;
        return () => {
            a.pause(); a.src = '';
            videoRef.current?.pause();
        };
    }, []);

    // Reload audio when track changes; keep playback state
    useEffect(() => {
        const a = audioRef.current; if (!a) return;
        const wasPlaying = !a.paused;
        a.src = TRACKS[idx].src; a.load();
        if (wasPlaying) a.play().catch(() => setIsPlaying(false));
        setProgress(0); setCurrentTime(0);
    }, [idx]);

    // ── Unified play/pause controller ────────────────────────────────────────
    const togglePlayback = useCallback(() => {
        setIsPlaying(prev => {
            const next = !prev;
            if (next) {
                videoRef.current?.play().catch(() => { });
                audioRef.current?.play().catch(() => setIsPlaying(false));
            } else {
                videoRef.current?.pause();
                audioRef.current?.pause();
            }
            return next;
        });
    }, []);

    // Keep video in sync if isPlaying changes externally (track switch etc.)
    useEffect(() => {
        if (!videoRef.current) return;
        if (isPlaying) videoRef.current.play().catch(() => { });
        else videoRef.current.pause();
    }, [isPlaying]);

    const prev = useCallback(() => setIdx(i => (i - 1 + TRACKS.length) % TRACKS.length), []);
    const next = useCallback(() => setIdx(i => (i + 1) % TRACKS.length), []);
    const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const a = audioRef.current; if (!a || !a.duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        a.currentTime = ((e.clientX - rect.left) / rect.width) * a.duration;
    }, []);

    return (
        <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            style={{
                position: 'relative',
                width: '100%',
                margin: '1rem 0 1.5rem',
                borderRadius: '2rem',
                overflow: 'hidden',
                minHeight: 280,
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 8px 48px rgba(0,0,0,0.50)',
            }}
        >
            {/* ── MUTED BACKGROUND VIDEO (visual layer) ────────────────────── */}
            <video
                ref={videoRef}
                src={videoSrc}
                muted
                loop
                playsInline
                disablePictureInPicture
                onError={() => setVideoError(true)}
                style={{
                    position: 'absolute', inset: 0, zIndex: 0,
                    width: '100%', height: '100%',
                    objectFit: 'cover', opacity: 0.42,
                    transform: isPlaying ? 'scale(1.08)' : 'scale(1.04)',
                    transition: 'transform 10s ease-out',
                }}
            />

            {/* Dark gradient overlay — ensures text legibility */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 1,
                background: 'linear-gradient(to top, rgba(10,8,20,0.92) 0%, rgba(10,8,20,0.60) 55%, rgba(10,8,20,0.25) 100%)',
            }} />

            {/* Glassmorphic frosted layer */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 2,
                background: 'rgba(8,8,20,0.35)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
            }} />

            {/* Glow / mandala watermarks */}
            <div style={{
                position: 'absolute', top: '-4rem', right: '-4rem', zIndex: 2,
                width: '18rem', height: '18rem', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(212,175,55,0.14) 0%, transparent 70%)',
                filter: 'blur(40px)', pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute', bottom: '-3rem', left: '-3rem', zIndex: 2,
                width: '14rem', height: '14rem', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 70%)',
                filter: 'blur(36px)', pointerEvents: 'none',
            }} />
            {/* Mandala SVG watermark */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 2, opacity: 0.05,
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Ccircle cx='100' cy='100' r='80' fill='none' stroke='%23D4AF37' stroke-width='0.5'/%3E%3Ccircle cx='100' cy='100' r='60' fill='none' stroke='%23D4AF37' stroke-width='0.5'/%3E%3Ccircle cx='100' cy='100' r='40' fill='none' stroke='%23D4AF37' stroke-width='0.5'/%3E%3Ccircle cx='100' cy='100' r='20' fill='none' stroke='%23D4AF37' stroke-width='0.5'/%3E%3C/svg%3E")`,
                backgroundSize: 'cover', backgroundPosition: 'center', pointerEvents: 'none',
            }} />

            {/* ── Content (z above all layers) ─────────────────────────────── */}
            <div style={{
                position: 'relative', zIndex: 3,
                padding: '2rem 1.75rem',
                display: 'flex', flexDirection: 'column', gap: '1.4rem',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                    <div>
                        <p style={{
                            margin: 0, fontSize: '0.6rem', letterSpacing: '0.28em',
                            textTransform: 'uppercase', color: 'rgba(212,175,55,0.75)',
                            fontFamily: 'monospace', fontWeight: 600,
                        }}>{tod.raagTitle} · 15 Min Leela</p>
                        <h2 style={{
                            margin: '0.4rem 0 0',
                            fontFamily: "'Playfair Display', Georgia, serif",
                            fontSize: 'clamp(1.4rem, 4vw, 2rem)',
                            fontWeight: 700, color: 'rgba(255,255,255,0.95)',
                            lineHeight: 1.15, letterSpacing: '-0.01em',
                        }}>
                            Elevate Your{' '}
                            <span style={{
                                background: 'linear-gradient(90deg, rgba(255,255,255,0.95), rgba(255,255,255,0.55))',
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            }}>Productivity</span>
                        </h2>
                        <p style={{
                            margin: '0.35rem 0 0', fontSize: '0.72rem',
                            color: 'rgba(255,255,255,0.42)', lineHeight: 1.6, maxWidth: '22rem',
                        }}>
                            Ancient frequencies engineered to align your focus. Surrender to the sound.
                        </p>
                    </div>
                    <div style={{
                        flexShrink: 0, width: 42, height: 42, borderRadius: '50%',
                        background: 'rgba(212,175,55,0.12)',
                        border: '1px solid rgba(212,175,55,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Music2 size={18} color="rgba(212,175,55,0.8)" strokeWidth={1.5} />
                    </div>
                </div>

                {/* Track name pill */}
                <div style={{
                    background: 'rgba(255,255,255,0.05)', borderRadius: '0.75rem',
                    padding: '0.7rem 1rem', border: '1px solid rgba(255,255,255,0.07)',
                }}>
                    <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.88)' }}>{track.title}</p>
                    <p style={{ margin: '0.12rem 0 0', fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{track.artist}</p>
                </div>

                {/* Track dots */}
                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                    {TRACKS.map((t, i) => (
                        <button key={t.id} onClick={() => { setIdx(i); setIsPlaying(true); }}
                            style={{
                                width: i === idx ? 20 : 7, height: 7, borderRadius: 999,
                                background: i === idx ? 'rgba(212,175,55,0.85)' : 'rgba(255,255,255,0.20)',
                                border: 'none', cursor: 'pointer', padding: 0,
                                transition: 'all 0.3s ease',
                            }}
                            aria-label={t.title}
                        />
                    ))}
                </div>

                {/* Progress bar */}
                <div>
                    <div onClick={seek} style={{
                        width: '100%', height: 4, borderRadius: 999,
                        background: 'rgba(255,255,255,0.10)', cursor: 'pointer',
                        position: 'relative', overflow: 'visible',
                    }}>
                        <div style={{
                            height: '100%', borderRadius: 999,
                            width: `${progress * 100}%`,
                            background: 'linear-gradient(90deg, rgba(212,175,55,0.5), rgba(212,175,55,1))',
                            position: 'relative', transition: 'width 0.25s linear',
                        }}>
                            <div style={{
                                position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)',
                                width: 10, height: 10, borderRadius: '50%', background: 'white',
                                boxShadow: '0 0 8px 2px rgba(212,175,55,0.75)',
                            }} />
                        </div>
                    </div>
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem',
                        fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)',
                        letterSpacing: '0.08em', fontFamily: 'monospace',
                    }}>
                        <span>{fmtTime(currentTime)}</span>
                        <span>{fmtTime(duration)}</span>
                    </div>
                </div>

                {/* Playback controls */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
                    <button onClick={prev} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', padding: 8, lineHeight: 0 }}>
                        <SkipBack size={18} strokeWidth={1.5} />
                    </button>

                    {/* ── Unified play button — controls both video + audio ── */}
                    <motion.button
                        onClick={togglePlayback}
                        whileTap={{ scale: 0.92 }}
                        animate={isPlaying ? {
                            boxShadow: ['0 0 0 0 rgba(212,175,55,0.45)', '0 0 0 16px rgba(212,175,55,0)', '0 0 0 0 rgba(212,175,55,0.45)'],
                        } : {}}
                        transition={{ duration: 1.8, repeat: Infinity }}
                        style={{
                            width: 60, height: 60, borderRadius: '50%',
                            background: isPlaying ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.10)',
                            border: isPlaying ? '1.5px solid rgba(212,175,55,0.55)' : '1px solid rgba(255,255,255,0.18)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            color: isPlaying ? 'rgba(212,175,55,1)' : 'white',
                            transition: 'all 0.3s ease',
                        }}
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                        {isPlaying
                            ? <Pause size={22} fill="currentColor" />
                            : <Play size={22} fill="currentColor" style={{ marginLeft: 2 }} />
                        }
                    </motion.button>

                    <button onClick={next} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', padding: 8, lineHeight: 0 }}>
                        <SkipForward size={18} strokeWidth={1.5} />
                    </button>
                </div>
            </div>
        </motion.section>
    );
}
