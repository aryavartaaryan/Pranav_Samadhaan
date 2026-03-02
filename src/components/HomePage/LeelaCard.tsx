'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Waves } from 'lucide-react';

// ── Time-of-day Rāga metadata — changes the header dynamically ───────────────
const TOD_RAAG: Record<string, { label: string; sublabel: string; tag: string; accent: string; canvasPalette: string[] }> = {
    morning: {
        label: 'Rāga Bhairav · Golden Hour · 15 Min Leela',
        sublabel: 'Elevate Your Productivity — Ancient frequencies engineered to ignite focus. Awaken with the sound.',
        tag: '🌅 Dawn · Awaken',
        accent: 'rgba(255,185,60,0.95)',
        canvasPalette: ['255,185,60', '255,120,30', '200,140,0'],      // golden/amber — Muladhara sunrise
    },
    noon: {
        label: 'Rāga Bhimpalasi · Midday Power · 15 Min Leela',
        sublabel: 'Elevate Your Focus — Ancient frequencies engineered to sharpen attention. Surrender to the sound.',
        tag: '☀️ Noon · Power',
        accent: 'rgba(255,220,80,0.95)',
        canvasPalette: ['255,220,80', '200,180,20', '255,160,0'],      // bright gold
    },
    evening: {
        label: 'Rāga Yaman · Twilight Flow · 15 Min Leela',
        sublabel: 'Elevate Your Creativity — Ancient frequencies engineered to unlock creative flow. Surrender to the sound.',
        tag: '🌆 Dusk · Create',
        accent: 'rgba(180,130,255,0.95)',
        canvasPalette: ['180,100,255', '100,60,200', '220,80,180'],   // violet/lavender — Sahasrara
    },
    night: {
        label: 'Night Rāga · Deep Rest · Sacred Dark · 15 Min Leela',
        sublabel: 'Elevate Your Productivity — Ancient frequencies engineered to align your focus. Surrender to the sound.',
        tag: '🌙 Night · Rest',
        accent: 'rgba(80,160,255,0.95)',
        canvasPalette: ['40,100,220', '80,40,160', '0,160,200'],      // deep indigo/blue — Anahata night
    },
};

// Get current period from real-time hour
function getTimePeriod(): string {
    const h = new Date().getHours();
    if (h >= 5 && h < 11) return 'morning';
    if (h >= 11 && h < 17) return 'noon';
    if (h >= 17 && h < 21) return 'evening';
    return 'night';
}

// ── Track list — Leela Sparsha FIRST ─────────────────────────────────────────
const TRACKS = [
    {
        id: 'leela-sparsha',
        title: 'Leela · Sparsha',
        artist: 'Rāga Bhairav · 15 Min · First Contact',
        src: 'https://ik.imagekit.io/rcsesr4xf/sitar.mp3',
        stems: [
            { url: 'https://ik.imagekit.io/rcsesr4xf/sitar.mp3', vol: 0.85 },
            { url: 'https://ik.imagekit.io/rcsesr4xf/flute.mp3', vol: 0.55 },
            { url: 'https://ik.imagekit.io/rcsesr4xf/0m_chant.mp3', vol: 0.30 },
        ],
        isLeela: true,
        tag: '15 Min · Sparsha',
    },
    { id: 'gayatri', title: 'Gayatri Ghanpaath', artist: 'Vedic Chant', src: 'https://ik.imagekit.io/rcsesr4xf/gayatri-mantra-ghanpaath.mp3', tag: 'Mantra' },
    { id: 'lalitha', title: 'Lalitha Sahasranamam', artist: 'Devotional', src: 'https://ik.imagekit.io/rcsesr4xf/Lalitha-Sahasranamam.mp3', tag: 'Bhakti' },
    { id: 'shiva', title: 'Shiva Tandava Stotram', artist: 'Power Mantra', src: 'https://ik.imagekit.io/rcsesr4xf/Shiva-Tandav.mp3', tag: 'Śakti' },
    { id: 'brahma', title: 'Brahma Yagya', artist: 'Sacred Fire', src: 'https://ik.imagekit.io/rcsesr4xf/BrahmaYagya.mp3', tag: 'Ritual' },
    { id: 'agnihotra', title: 'Dainik Agnihotra', artist: 'Morning Ritual', src: 'https://ik.imagekit.io/aup4wh6lq/DainikAgnihotra.mp3?updatedAt=1771246817070', tag: 'Prāṇa' },
];

// TOD video backgrounds matching the Leela page atmosphere
const TOD_VIDEOS: Record<string, string> = {
    morning: 'https://ik.imagekit.io/rcsesr4xf/nature-morning.mp4',
    noon: 'https://ik.imagekit.io/rcsesr4xf/nature-noon.mp4',
    evening: 'https://ik.imagekit.io/rcsesr4xf/nature-evening.mp4',
    night: 'https://ik.imagekit.io/rcsesr4xf/nature-night.mp4',
    _fallback: 'https://cdn.pixabay.com/video/2020/07/12/44940-439608654_large.mp4',
};

function fmtTime(s: number) {
    if (!s || isNaN(s)) return '--:--';
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// ── Leela Canvas — Mirrors the actual LeelaCanvas phase aesthetics ─────────────
// Phase palette is injected from TOD_RAAG to match what actually renders on /project-leela
// Morning   → Muladhara phase  (gold/amber/fire)
// Night     → Anahata phase    (deep indigo/blue/teal)
// Evening   → Sahasrara phase  (violet/cosmic purple)
function LeelaMinCanvas({ isPlaying, palette }: { isPlaying: boolean; palette: string[] }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number>(0);
    const t = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const [p0, p1, p2] = palette;

        const draw = () => {
            const W = canvas.width, H = canvas.height;
            const cx = W / 2, cy = H / 2;
            t.current += isPlaying ? 0.020 : 0.005;

            ctx.clearRect(0, 0, W, H);

            // ── Background gradient (matches Leela page deep dark) ──────────
            const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.75);
            bg.addColorStop(0, 'rgba(10,4,28,1)');
            bg.addColorStop(0.6, 'rgba(4,2,14,1)');
            bg.addColorStop(1, 'rgba(2,1,8,1)');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, W, H);

            // ── Outer nebula glow — changes with TOD palette ─────────────────
            const nebula = ctx.createRadialGradient(cx, cy, W * 0.10, cx, cy, W * 0.58);
            nebula.addColorStop(0, `rgba(${p0},${0.18 + Math.sin(t.current * 0.55) * 0.08})`);
            nebula.addColorStop(0.45, `rgba(${p1},${0.10 + Math.sin(t.current * 0.40) * 0.05})`);
            nebula.addColorStop(0.8, `rgba(${p2},0.04)`);
            nebula.addColorStop(1, 'transparent');
            ctx.fillStyle = nebula;
            ctx.beginPath();
            ctx.arc(cx, cy, W * 0.58, 0, Math.PI * 2);
            ctx.fill();

            // ── Star field (static micro-points like Leela canvas) ──────────
            if (t.current < 0.05) {
                // seed stars only once
                (canvas as HTMLCanvasElement & { _stars?: [number, number, number][] })._stars =
                    Array.from({ length: 40 }, () => [
                        Math.random() * W, Math.random() * H, Math.random() * 0.5 + 0.2
                    ]);
            }
            const stars = (canvas as HTMLCanvasElement & { _stars?: [number, number, number][] })._stars ?? [];
            stars.forEach(([sx, sy, sr]) => {
                ctx.beginPath();
                ctx.arc(sx, sy, sr, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,255,${0.25 + Math.sin(t.current * 2 + sx) * 0.15})`;
                ctx.fill();
            });

            // ── 3 rotating geometric rings (Leela mandala phases) ───────────
            const rings = [
                { r: 0.40, petals: 6, speed: 0.30, dot: 0.030, col: p0, opacity: 0.55 },
                { r: 0.28, petals: 8, speed: -0.50, dot: 0.022, col: p1, opacity: 0.45 },
                { r: 0.17, petals: 12, speed: 0.80, dot: 0.014, col: p2, opacity: 0.38 },
            ];
            rings.forEach(({ r, petals, speed, dot, col, opacity }) => {
                const spd = isPlaying ? speed : speed * 0.18;
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(t.current * spd);
                // Connecting polygon
                ctx.beginPath();
                for (let i = 0; i <= petals; i++) {
                    const ang = (i / petals) * Math.PI * 2;
                    const x = Math.cos(ang) * W * r, y = Math.sin(ang) * W * r;
                    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
                }
                ctx.strokeStyle = `rgba(${col},${opacity * 0.25})`;
                ctx.lineWidth = 0.8;
                ctx.stroke();
                // Nodes
                for (let i = 0; i < petals; i++) {
                    const ang = (i / petals) * Math.PI * 2;
                    const x = Math.cos(ang) * W * r, y = Math.sin(ang) * W * r;
                    // glow
                    const g = ctx.createRadialGradient(x, y, 0, x, y, W * dot * 2.5);
                    g.addColorStop(0, `rgba(${col},${opacity})`);
                    g.addColorStop(1, 'transparent');
                    ctx.fillStyle = g;
                    ctx.beginPath();
                    ctx.arc(x, y, W * dot * 2.5, 0, Math.PI * 2);
                    ctx.fill();
                    // solid dot
                    ctx.fillStyle = `rgba(${col},${opacity + 0.1})`;
                    ctx.beginPath();
                    ctx.arc(x, y, W * dot, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            });

            // ── Central orb — Leela OM pulsing core ─────────────────────────
            const pulse = 1 + Math.sin(t.current * 1.6) * (isPlaying ? 0.14 : 0.04);
            const sz = W * 0.13 * pulse;

            // outer glow bloom
            const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, sz * 2.8);
            bloom.addColorStop(0, `rgba(${p0},0.40)`);
            bloom.addColorStop(0.4, `rgba(${p1},0.15)`);
            bloom.addColorStop(1, 'transparent');
            ctx.fillStyle = bloom;
            ctx.beginPath();
            ctx.arc(cx, cy, sz * 2.8, 0, Math.PI * 2);
            ctx.fill();

            // core orb
            const orb = ctx.createRadialGradient(cx, cy, 0, cx, cy, sz);
            orb.addColorStop(0, 'rgba(255,252,230,1)');
            orb.addColorStop(0.3, `rgba(${p0},0.92)`);
            orb.addColorStop(0.7, `rgba(${p1},0.50)`);
            orb.addColorStop(1, 'transparent');
            ctx.fillStyle = orb;
            ctx.beginPath();
            ctx.arc(cx, cy, sz, 0, Math.PI * 2);
            ctx.fill();

            // OM symbol
            ctx.save();
            ctx.translate(cx, cy);
            ctx.fillStyle = `rgba(8,3,20,0.90)`;
            ctx.font = `bold ${W * 0.12}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('ॐ', 0, W * 0.01);
            ctx.restore();

            rafRef.current = requestAnimationFrame(draw);
        };

        rafRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(rafRef.current);
    }, [isPlaying, palette]);

    return (
        <canvas
            ref={canvasRef}
            width={240}
            height={240}
            style={{ width: '100%', height: '100%', display: 'block' }}
        />
    );
}

export default function LeelaCard() {
    const [period] = useState(() => getTimePeriod());
    const raagMeta = TOD_RAAG[period];

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const stemsRef = useRef<HTMLAudioElement[]>([]);

    const [isPlaying, setIsPlaying] = useState(false);
    const [idx, setIdx] = useState(0);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [videoError, setVideoError] = useState(false);

    const track = TRACKS[idx];
    const isLeela = !!track.isLeela;
    const videoSrc = videoError ? TOD_VIDEOS._fallback : (TOD_VIDEOS[period] ?? TOD_VIDEOS._fallback);

    // Bootstrap single audio element
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
            stemsRef.current.forEach(s => { s.pause(); s.src = ''; });
            stemsRef.current = [];
        };
    }, []);

    // Load track on index change
    useEffect(() => {
        const wasPlaying = isPlaying;
        stemsRef.current.forEach(s => { s.pause(); s.src = ''; });
        stemsRef.current = [];
        setProgress(0); setCurrentTime(0); setDuration(0);

        const a = audioRef.current; if (!a) return;
        if (isLeela && track.stems) {
            a.pause(); a.src = '';
            const stems = track.stems.map(({ url, vol }) => {
                const el = new Audio(url);
                el.crossOrigin = 'anonymous';
                el.loop = true;
                el.volume = vol;
                el.preload = 'metadata';
                return el;
            });
            stemsRef.current = stems;
            stems[0].ontimeupdate = () => {
                setCurrentTime(stems[0].currentTime);
                setProgress(stems[0].duration ? stems[0].currentTime / stems[0].duration : 0);
            };
            stems[0].onloadedmetadata = () => setDuration(stems[0].duration);
            if (wasPlaying) stems.forEach(el => el.play().catch(() => setIsPlaying(false)));
        } else {
            a.src = TRACKS[idx].src; a.loop = false; a.load();
            a.onended = () => setIdx(i => (i + 1) % TRACKS.length);
            if (wasPlaying) a.play().catch(() => setIsPlaying(false));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idx]);

    // Unified play/pause
    const togglePlayback = useCallback(() => {
        setIsPlaying(prev => {
            const next = !prev;
            if (next) {
                videoRef.current?.play().catch(() => { });
                if (isLeela && stemsRef.current.length > 0) {
                    stemsRef.current.forEach(el => el.play().catch(() => setIsPlaying(false)));
                } else {
                    audioRef.current?.play().catch(() => setIsPlaying(false));
                }
            } else {
                videoRef.current?.pause();
                if (isLeela && stemsRef.current.length > 0) {
                    stemsRef.current.forEach(el => el.pause());
                } else {
                    audioRef.current?.pause();
                }
            }
            return next;
        });
    }, [isLeela]);

    useEffect(() => {
        if (!videoRef.current) return;
        if (isPlaying) videoRef.current.play().catch(() => { });
        else videoRef.current.pause();
    }, [isPlaying]);

    const prev = useCallback(() => setIdx(i => (i - 1 + TRACKS.length) % TRACKS.length), []);
    const next = useCallback(() => setIdx(i => (i + 1) % TRACKS.length), []);

    const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (isLeela) {
            stemsRef.current.forEach(el => {
                if (!el.duration) return;
                const rect = e.currentTarget.getBoundingClientRect();
                el.currentTime = ((e.clientX - rect.left) / rect.width) * el.duration;
            });
        } else {
            const a = audioRef.current; if (!a || !a.duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            a.currentTime = ((e.clientX - rect.left) / rect.width) * a.duration;
        }
    }, [isLeela]);

    return (
        <motion.section
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{
                position: 'relative',
                maxWidth: 920,
                margin: '0.75rem auto 1.5rem',
                width: 'calc(100% - 2rem)',
                borderRadius: '1.5rem',
                overflow: 'hidden',
                minHeight: 'clamp(220px, 32vw, 280px)',
                border: `1px solid rgba(${raagMeta.canvasPalette[0]},0.18)`,
                boxShadow: `0 6px 50px rgba(0,0,0,0.60), 0 0 0 1px rgba(${raagMeta.canvasPalette[0]},0.07), 0 0 60px rgba(${raagMeta.canvasPalette[0]},0.06)`,
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'stretch',
            }}
        >
            {/* ── FULL CARD GLASS BACKGROUND ─────────────────────────────── */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 0,
                background: 'rgba(5,3,16,0.88)',
                backdropFilter: 'blur(22px)',
                WebkitBackdropFilter: 'blur(22px)',
            }} />

            {/* TOD accent line — changes color with period */}
            <div style={{
                position: 'absolute', top: 0, left: '4%', right: '4%', height: 1.5, zIndex: 2,
                background: `linear-gradient(90deg, transparent, rgba(${raagMeta.canvasPalette[0]},0.65), rgba(${raagMeta.canvasPalette[1]},0.40), transparent)`,
            }} />

            {/* ── LEFT PANEL — Video always plays. Canvas overlaid for Leela ── */}
            <div style={{
                position: 'relative', width: '42%', flexShrink: 0, overflow: 'hidden',
                background: 'rgba(3,2,10,1)',
            }}>
                {/* Video — always visible, z:0 */}
                <video
                    ref={videoRef}
                    src={videoSrc}
                    autoPlay muted loop playsInline disablePictureInPicture
                    onError={() => setVideoError(true)}
                    style={{
                        position: 'absolute', inset: 0, zIndex: 0,
                        width: '100%', height: '100%', objectFit: 'cover',
                        opacity: isLeela ? 0.30 : 0.62,
                        transform: isPlaying ? 'scale(1.07)' : 'scale(1.02)',
                        transition: 'transform 8s ease-out, opacity 1.2s ease',
                    }}
                />
                {/* Dark gradient — z:1 */}
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 1,
                    background: isLeela
                        ? `linear-gradient(to right, rgba(5,2,18,0.45) 0%, rgba(5,2,18,0.88) 100%)`
                        : `linear-gradient(to right, rgba(8,6,22,0.12) 0%, rgba(8,6,22,0.82) 100%)`,
                }} />
                {/* Leela Canvas — z:2, mirrors Leela page visual phase */}
                {isLeela && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
                        <LeelaMinCanvas isPlaying={isPlaying} palette={raagMeta.canvasPalette} />
                    </div>
                )}
                {/* Blend edge — z:3 */}
                <div style={{
                    position: 'absolute', top: 0, right: 0, bottom: 0, width: 56, zIndex: 3,
                    background: 'linear-gradient(to right, transparent, rgba(5,3,16,0.92))',
                    pointerEvents: 'none',
                }} />
            </div>

            {/* ── RIGHT PANEL — Time-aware header + controls ──────────────── */}
            <div style={{
                flex: 1, position: 'relative', zIndex: 3,
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                padding: 'clamp(0.9rem,2.5vw,1.4rem) clamp(1rem,2.8vw,1.6rem)',
                minWidth: 0, gap: '0.4rem',
            }}>
                {/* Top: TOD raag label + track title */}
                <div>
                    {/* Time-aware raag band */}
                    <p style={{
                        margin: 0, fontSize: '0.62rem', letterSpacing: '0.18em',
                        textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700,
                        color: raagMeta.accent, lineHeight: 1.5,
                    }}>
                        {raagMeta.label}
                    </p>
                    {/* Track title */}
                    <h3 style={{
                        margin: '0.22rem 0 0',
                        fontFamily: "'Playfair Display', Georgia, serif",
                        fontSize: 'clamp(0.92rem, 2.8vw, 1.18rem)',
                        fontWeight: 700, color: 'rgba(255,255,255,0.96)',
                        lineHeight: 1.15, letterSpacing: '-0.01em',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{track.title}</h3>
                    {/* Track artist */}
                    <p style={{
                        margin: '0.1rem 0 0', fontSize: '0.65rem',
                        color: 'rgba(255,255,255,0.50)', letterSpacing: '0.04em',
                        textTransform: 'uppercase', fontFamily: 'monospace',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{track.artist}</p>

                    {/* ── Productivity tagline — gold italic serif ──────── */}
                    <p style={{
                        margin: '0.45rem 0 0',
                        fontSize: '0.82rem', fontStyle: 'italic',
                        color: 'rgba(255,255,255,0.58)',
                        lineHeight: 1.55, letterSpacing: '0.01em',
                        fontFamily: "'Playfair Display', Georgia, serif",
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                    }}>{raagMeta.sublabel}</p>
                </div>

                {/* Middle: Track dots + tag */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                        {TRACKS.map((tr, i) => (
                            <button key={tr.id} onClick={() => { setIdx(i); setIsPlaying(true); }}
                                style={{
                                    width: i === idx ? 22 : 9, height: 9, borderRadius: 999,
                                    background: i === idx ? `rgba(${raagMeta.canvasPalette[0]},0.92)` : 'rgba(255,255,255,0.28)',
                                    border: 'none', cursor: 'pointer', padding: 0,
                                    transition: 'all 0.3s ease',
                                }}
                                aria-label={tr.title}
                            />
                        ))}
                    </div>
                    {/* Time tag */}
                    <span style={{
                        fontSize: '0.58rem', letterSpacing: '0.12em', fontWeight: 700,
                        textTransform: 'uppercase', fontFamily: 'monospace',
                        color: raagMeta.accent,
                        background: `rgba(${raagMeta.canvasPalette[0]},0.12)`,
                        border: `1px solid rgba(${raagMeta.canvasPalette[0]},0.25)`,
                        borderRadius: 999, padding: '0.22rem 0.65rem', whiteSpace: 'nowrap',
                    }}>{raagMeta.tag}</span>
                </div>

                {/* Progress bar */}
                <div>
                    <div onClick={seek} style={{
                        width: '100%', height: 4, borderRadius: 999,
                        background: 'rgba(255,255,255,0.10)', cursor: 'pointer', position: 'relative',
                    }}>
                        <div style={{
                            height: '100%', borderRadius: 999,
                            width: `${progress * 100}%`,
                            background: `linear-gradient(90deg, rgba(${raagMeta.canvasPalette[0]},0.55), rgba(${raagMeta.canvasPalette[0]},1))`,
                            position: 'relative', transition: 'width 0.25s linear',
                        }}>
                            <div style={{
                                position: 'absolute', right: -5, top: '50%', transform: 'translateY(-50%)',
                                width: 12, height: 12, borderRadius: '50%', background: 'white',
                                boxShadow: `0 0 10px 3px rgba(${raagMeta.canvasPalette[0]},0.80)`,
                            }} />
                        </div>
                    </div>
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', marginTop: '0.28rem',
                        fontSize: '0.60rem', color: 'rgba(255,255,255,0.40)',
                        letterSpacing: '0.08em', fontFamily: 'monospace',
                    }}>
                        <span>{fmtTime(currentTime)}</span>
                        <span>{fmtTime(duration)}</span>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.1rem' }}>

                    {/* ◀ Prev — solid glass circle */}
                    <button onClick={prev} style={{
                        background: 'rgba(255,255,255,0.14)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        border: '1.5px solid rgba(255,255,255,0.30)',
                        borderRadius: '50%', width: 40, height: 40,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'rgba(255,255,255,0.90)', lineHeight: 0,
                        boxShadow: '0 2px 14px rgba(0,0,0,0.35)',
                        transition: 'all 0.2s ease',
                    }}>
                        <SkipBack size={17} strokeWidth={2.2} />
                    </button>

                    {/* ▶ Play / Pause — THE hero button: always crystal-clear */}
                    <motion.button
                        onClick={togglePlayback}
                        whileTap={{ scale: 0.86 }}
                        whileHover={{ scale: 1.08 }}
                        animate={isPlaying ? {
                            boxShadow: [
                                `0 0 0 0 rgba(${raagMeta.canvasPalette[0]},0.55)`,
                                `0 0 0 16px rgba(${raagMeta.canvasPalette[0]},0)`,
                                `0 0 0 0 rgba(${raagMeta.canvasPalette[0]},0.55)`,
                            ],
                        } : {
                            boxShadow: '0 4px 24px rgba(0,0,0,0.50)',
                        }}
                        transition={{ duration: 1.6, repeat: Infinity }}
                        style={{
                            width: 58, height: 58, borderRadius: '50%',
                            // PAUSED: solid white-glass — impossible to miss
                            // PLAYING: vivid accent glow
                            background: isPlaying
                                ? `linear-gradient(145deg, rgba(${raagMeta.canvasPalette[0]},0.55), rgba(${raagMeta.canvasPalette[0]},0.28))`
                                : 'linear-gradient(145deg, rgba(255,255,255,0.28), rgba(255,255,255,0.10))',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            border: isPlaying
                                ? `2px solid rgba(${raagMeta.canvasPalette[0]},0.85)`
                                : '2px solid rgba(255,255,255,0.55)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            color: isPlaying ? raagMeta.accent : '#FFFFFF',
                            transition: 'background 0.35s ease, border 0.35s ease, color 0.35s ease',
                        }}
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                        {isPlaying
                            ? <Pause size={22} fill="currentColor" />
                            : <Play size={22} fill="currentColor" style={{ marginLeft: 3 }} />}
                    </motion.button>

                    {/* ▶▶ Next — solid glass circle */}
                    <button onClick={next} style={{
                        background: 'rgba(255,255,255,0.14)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        border: '1.5px solid rgba(255,255,255,0.30)',
                        borderRadius: '50%', width: 40, height: 40,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'rgba(255,255,255,0.90)', lineHeight: 0,
                        boxShadow: '0 2px 14px rgba(0,0,0,0.35)',
                        transition: 'all 0.2s ease',
                    }}>
                        <SkipForward size={17} strokeWidth={2.2} />
                    </button>

                    {isLeela && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Waves size={13} style={{ color: `rgba(${raagMeta.canvasPalette[0]},0.75)` }} />
                            <span style={{
                                fontSize: '0.62rem', letterSpacing: '0.14em',
                                fontFamily: 'monospace', textTransform: 'uppercase',
                                color: `rgba(${raagMeta.canvasPalette[0]},0.75)`,
                            }}>3 Stems</span>
                        </div>
                    )}
                </div>
            </div>
        </motion.section>
    );
}
