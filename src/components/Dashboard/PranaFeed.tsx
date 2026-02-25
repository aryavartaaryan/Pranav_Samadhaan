'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import styles from './PranaFeed.module.css';
import PranaField from './PranaField';
import SankalpaList from './SankalpaList';
// ── Time-aware raag data ──────────────────────────────────────────────────────
function getRaagForHour(h: number) {
    if (h >= 5 && h < 12) return {
        title: 'Morning Raag for Focus',
        raag: 'Bhairav · Yaman Kalyan',
        duration: '45 min',
        label: 'प्रभात राग',
        gradient: 'linear-gradient(135deg, #f6d365 0%, #fda085 40%, #f093fb 100%)',
        emoji: '🌅',
    };
    if (h >= 12 && h < 17) return {
        title: 'Afternoon Raag for Clarity',
        raag: 'Bhimpalasi · Multani',
        duration: '35 min',
        label: 'मध्याह्न राग',
        gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 40%, #667eea 100%)',
        emoji: '☀️',
    };
    if (h >= 17 && h < 21) return {
        title: 'Evening Raag for Calm',
        raag: 'Yaman · Puriya Dhanashri',
        duration: '40 min',
        label: 'सन्ध्या राग',
        gradient: 'linear-gradient(135deg, #f83600 0%, #f9d423 45%, #a18cd1 100%)',
        emoji: '🌆',
    };
    return {
        title: 'Night Raag for Deep Sleep',
        raag: 'Bhairavi · Darbari Kanada',
        duration: '50 min',
        label: 'रात्रि राग',
        gradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
        emoji: '🌙',
    };
}

// ── Diya like button with simple scale burst ──────────────────────────────────
function DiyaLike({ count }: { count: number }) {
    const [liked, setLiked] = useState(false);
    const [tally, setTally] = useState(count);
    const [burst, setBurst] = useState(false);

    const handleLike = () => {
        if (liked) return;
        setLiked(true);
        setTally(n => n + 1);
        setBurst(true);
        setTimeout(() => setBurst(false), 600);
    };

    return (
        <button className={`${styles.diyaBtn} ${liked ? styles.diyaLit : ''}`} onClick={handleLike}>
            <motion.span
                animate={burst ? { scale: [1, 1.6, 0.9, 1.1, 1] } : { scale: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className={styles.diyaIcon}
            >
                🪔
            </motion.span>
            <span className={styles.diyaCount}>{tally}</span>
        </button>
    );
}

// ── Waveform bars (Audio Nectar) ──────────────────────────────────────────────
function Waveform() {
    const bars = [0.4, 0.7, 1, 0.6, 0.9, 0.5, 0.8, 0.45, 0.75, 1, 0.6, 0.4];
    return (
        <div className={styles.waveform}>
            {bars.map((h, i) => (
                <motion.div
                    key={i}
                    className={styles.bar}
                    animate={{ scaleY: [h, h * 0.4, h * 1.2, h] }}
                    transition={{ duration: 1.4 + i * 0.09, repeat: Infinity, ease: 'easeInOut', delay: i * 0.07 }}
                />
            ))}
        </div>
    );
}

// ── Fade-up card wrapper ──────────────────────────────────────────────────────
function FeedCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
    return (
        <motion.div
            className={styles.card}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ duration: 0.7, delay, ease: 'easeInOut' as const }}
        >
            {children}
        </motion.div>
    );
}

// ── Card 1: Audio Nectar ─────────────────────────────────────────────────────
const SITAR_URL = 'https://ik.imagekit.io/rcsesr4xf/sitar.mp3?updatedAt=1771983562343';
const FLUTE_URL = 'https://ik.imagekit.io/rcsesr4xf/flute.mp3?updatedAt=1771983487495';

function PauseIcon() {
    return (
        <svg width="14" height="16" viewBox="0 0 14 16" fill="none" style={{ flexShrink: 0 }}>
            <rect x="1" y="0" width="4" height="16" rx="2" fill="currentColor" />
            <rect x="9" y="0" width="4" height="16" rx="2" fill="currentColor" />
        </svg>
    );
}

// ── Live Cosmic Wave Canvas (Web Audio AnalyserNode) ──────────────────────────
// ── Sacred Water Surface — sound energy rippling through a cosmic lake ──────────
function WaveCanvas({ analyser }: { analyser: AnalyserNode }) {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const rafRef = React.useRef<number>(0);
    const prevBass = React.useRef<number>(0);
    const ripples = React.useRef<{ x: number; y: number; r: number; alpha: number; born: number }[]>([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const c = canvas.getContext('2d')!;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.offsetWidth * dpr;
        canvas.height = canvas.offsetHeight * dpr;
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        const W = canvas.offsetWidth;
        const H = canvas.offsetHeight;

        const FFT = analyser.frequencyBinCount;
        const freq = new Uint8Array(FFT);
        const wave = new Uint8Array(FFT);

        // quadratic bezier smoothing
        const smoothPath = (pts: [number, number][]) => {
            if (pts.length < 2) return;
            c.moveTo(pts[0][0], pts[0][1]);
            for (let i = 1; i < pts.length - 1; i++) {
                const mx = (pts[i][0] + pts[i + 1][0]) / 2;
                const my = (pts[i][1] + pts[i + 1][1]) / 2;
                c.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
            }
            c.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
        };

        const draw = (ts: number) => {
            rafRef.current = requestAnimationFrame(draw);
            const t = ts * 0.001;
            analyser.getByteFrequencyData(freq);
            analyser.getByteTimeDomainData(wave);

            // Energy bands
            const bassEnergy = freq.slice(0, 10).reduce((s, v) => s + v, 0) / 10 / 255;
            const midEnergy = freq.slice(10, 60).reduce((s, v) => s + v, 0) / 50 / 255;
            const treble = freq.slice(60, 120).reduce((s, v) => s + v, 0) / 60 / 255;
            const energy = wave.reduce((s, v) => s + Math.abs(v - 128), 0) / wave.length / 128;

            // Bass beat — trigger new ripple
            if (bassEnergy > prevBass.current + 0.10 && bassEnergy > 0.18) {
                const sx = W * 0.2 + Math.random() * W * 0.6;
                const sy = H * 0.42 + Math.random() * H * 0.08;
                ripples.current.push({ x: sx, y: sy, r: 0, alpha: 0.75, born: t });
                if (ripples.current.length > 10) ripples.current.shift();
            }
            prevBass.current += (bassEnergy - prevBass.current) * 0.12; // smooth follower

            // ── 0. Clear & sky background ──
            c.clearRect(0, 0, W, H);
            const skyGrd = c.createLinearGradient(0, 0, 0, H * 0.48);
            skyGrd.addColorStop(0, 'rgba(3,1,14,1)');
            skyGrd.addColorStop(1, `rgba(${8 + bassEnergy * 15},${12 + midEnergy * 20},${40 + bassEnergy * 30},0.95)`);
            c.fillStyle = skyGrd;
            c.fillRect(0, 0, W, H);

            // ── 1. Sky stars — treble-driven sparkle ──
            for (let i = 0; i < 22; i++) {
                const sx = W * ((i * 0.137508 * W) % 1 || (i * 73) % W / W);
                const sy = H * 0.04 + H * 0.36 * ((i * 0.2137) % 1);
                const twinkle = 0.15 + treble * 0.7 * Math.abs(Math.sin(t * 0.8 + i * 1.3));
                c.save();
                c.beginPath();
                c.arc((i * 79 + 30) % W, sy, 0.7 + treble * 1.8, 0, Math.PI * 2);
                c.fillStyle = `rgba(255,220,120,${twinkle})`;
                c.shadowColor = 'rgba(255,200,80,0.9)';
                c.shadowBlur = 5 + treble * 8;
                c.fill();
                c.restore();
            }

            // ── 2. OM in sky — pulses with bass ──
            c.save();
            c.font = `bold ${H * (0.17 + bassEnergy * 0.06)}px "Noto Serif Devanagari", serif`;
            c.fillStyle = `rgba(255,210,70,${0.05 + bassEnergy * 0.09})`;
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.shadowColor = 'rgba(255,180,30,0.4)';
            c.shadowBlur = 20 + bassEnergy * 30;
            c.fillText('ॐ', W / 2, H * 0.20);
            c.restore();

            // ── 3. Build water surface wave from audio ──
            const surfaceY = H * 0.45;
            const step = Math.max(1, Math.floor(wave.length / (W / 3)));
            const wpts: [number, number][] = [];
            for (let i = 0; i < wave.length; i += step) {
                const x = (i / wave.length) * W;
                const v = wave[i] / 128 - 1;
                wpts.push([x, surfaceY + v * H * (0.08 + energy * 0.14)]);
            }

            // ── 4. Water body fill (below surface → bottom) ──
            const waterGrd = c.createLinearGradient(0, surfaceY, 0, H);
            waterGrd.addColorStop(0, `rgba(${15 + bassEnergy * 25},${70 + midEnergy * 60},${140 + bassEnergy * 60},0.88)`);
            waterGrd.addColorStop(0.35, `rgba(8,35,80,0.94)`);
            waterGrd.addColorStop(1, `rgba(2,5,18,1)`);
            c.save();
            c.beginPath();
            if (wpts.length) {
                c.moveTo(0, wpts[0][1]);
                smoothPath(wpts);
            }
            c.lineTo(W, H); c.lineTo(0, H); c.closePath();
            c.fillStyle = waterGrd;
            c.fill();
            c.restore();

            // ── 5. Caustics — drifting light blobs inside water ──
            for (let i = 0; i < 14; i++) {
                const cx = (W * 0.05 + (W * 0.9) * ((i * 0.1547 + t * 0.025) % 1));
                const cy = surfaceY + H * 0.04 + (H * 0.4) * ((i * 0.2347 + t * 0.018) % 1);
                const sz = 4 + midEnergy * 14 * Math.abs(Math.sin(t * 0.35 + i * 0.9));
                c.save();
                c.beginPath();
                c.ellipse(cx, cy, sz * 2.5, sz * 0.45, Math.sin(t * 0.2 + i) * 0.4, 0, Math.PI * 2);
                c.fillStyle = `rgba(${80 + midEnergy * 120},${160 + midEnergy * 80},255,${0.035 + midEnergy * 0.07})`;
                c.shadowColor = 'rgba(80,180,255,0.5)';
                c.shadowBlur = 10;
                c.fill();
                c.restore();
            }

            // ── 6. Expanding ripple rings (bass beat triggered) ──
            ripples.current = ripples.current.filter(r => r.alpha > 0.015);
            ripples.current.forEach(rip => {
                rip.r += 1.2 + bassEnergy * 2.5;
                rip.alpha *= 0.965;
                for (let ring = 0; ring < 3; ring++) {
                    const rr = rip.r - ring * 9;
                    if (rr < 0) continue;
                    c.save();
                    // Ellipse — narrow vertically (water perspective)
                    c.beginPath();
                    c.ellipse(rip.x, rip.y, rr, rr * 0.28, 0, 0, Math.PI * 2);
                    c.strokeStyle = `rgba(${120 + bassEnergy * 100},${200 + midEnergy * 55},255,${rip.alpha * (0.65 - ring * 0.2)})`;
                    c.lineWidth = 1.2 - ring * 0.35;
                    c.shadowColor = 'rgba(80,180,255,0.7)';
                    c.shadowBlur = 8 - ring * 2;
                    c.stroke();
                    c.restore();
                }
            });

            // ── 7. Reflection — wave re-drawn into water with distortion ──
            c.save();
            c.globalAlpha = 0.18 + energy * 0.12;
            c.beginPath();
            // Reflect wpts into water (flip Y around surfaceY, compress to 45%)
            const rpts: [number, number][] = wpts.map(([x, y]) => [
                x + Math.sin(t * 0.5 + x * 0.02) * 2.5, // slight horizontal shimmer
                surfaceY + (surfaceY - y) * 0.45,
            ]);
            smoothPath(rpts);
            c.lineWidth = 1.2;
            c.strokeStyle = `rgba(${140 + bassEnergy * 80},${210},255,0.5)`;
            c.shadowColor = 'rgba(100,200,255,0.4)';
            c.shadowBlur = 6;
            c.stroke();
            c.restore();

            // ── 8. Water surface edge — 3 glow layers ──
            const surfHue = 36 + energy * 35;
            const drawSurf = (color: string, lw: number, blur: number) => {
                c.save();
                c.beginPath();
                smoothPath(wpts);
                c.lineWidth = lw;
                c.strokeStyle = color;
                c.shadowColor = color;
                c.shadowBlur = blur;
                c.lineJoin = 'round';
                c.lineCap = 'round';
                c.stroke();
                c.restore();
            };
            drawSurf(`hsla(${surfHue},100%,50%,0.06)`, 24, 40);
            drawSurf(`hsla(${surfHue},100%,65%,0.38)`, 5, 16);
            drawSurf(`hsla(${surfHue},100%,90%,1.00)`, 1.6, 5);

            // ── 9. Foam / white-caps at wave peaks ──
            for (let i = 2; i < wpts.length - 2; i++) {
                const [px, py] = wpts[i];
                const isPeak = py < wpts[i - 1][1] && py < wpts[i + 1][1];
                const depth = surfaceY - py;
                if (isPeak && depth > 2.5) {
                    const alpha = Math.min(1, depth / (H * 0.055)) * (0.35 + energy * 0.65);
                    c.save();
                    c.beginPath();
                    c.arc(px, py, 1.2 + depth * 0.09, 0, Math.PI * 2);
                    c.fillStyle = `rgba(255,255,255,${alpha})`;
                    c.shadowColor = `rgba(200,230,255,0.9)`;
                    c.shadowBlur = 5;
                    c.fill();
                    c.restore();
                }
            }
        };

        rafRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(rafRef.current);
    }, [analyser]);

    return (
        <canvas ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block', borderRadius: 'inherit' }}
        />
    );
}


function AudioNectarCard() {
    const [raag, setRaag] = useState<ReturnType<typeof getRaagForHour> | null>(null);
    useEffect(() => { setRaag(getRaagForHour(new Date().getHours())); }, []);

    const [playing, setPlaying] = useState(false);
    const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
    const sitarRef = React.useRef<HTMLAudioElement | null>(null);
    const fluteRef = React.useRef<HTMLAudioElement | null>(null);
    const audioCtx = React.useRef<AudioContext | null>(null);

    const listenHere = () => {
        const sitar = new Audio(SITAR_URL);
        const flute = new Audio(FLUTE_URL);
        // CORS required for createMediaElementSource
        sitar.crossOrigin = 'anonymous';
        flute.crossOrigin = 'anonymous';
        sitar.volume = 0.70; flute.volume = 0.65;
        sitar.loop = flute.loop = true;

        const ctx = new AudioContext();
        const analy = ctx.createAnalyser();
        analy.fftSize = 2048;           // 1024 frequency bins, high resolution
        analy.smoothingTimeConstant = 0.82; // smooth transitions

        try {
            ctx.createMediaElementSource(sitar).connect(analy);
            ctx.createMediaElementSource(flute).connect(analy);
        } catch { /* already connected */ }
        analy.connect(ctx.destination);

        Promise.all([sitar.play(), flute.play()]).catch(() => sitar.play().catch(() => { }));
        sitarRef.current = sitar; fluteRef.current = flute; audioCtx.current = ctx;
        setAnalyser(analy);
        setPlaying(true);
    };

    const stopListening = () => {
        [sitarRef, fluteRef].forEach(r => {
            if (r.current) { r.current.pause(); r.current.currentTime = 0; r.current = null; }
        });
        audioCtx.current?.close();
        audioCtx.current = null;
        setAnalyser(null);
        setPlaying(false);
    };

    useEffect(() => () => {
        sitarRef.current?.pause(); fluteRef.current?.pause(); audioCtx.current?.close();
    }, []);

    const openLeela = () => { stopListening(); window.location.href = '/project-leela'; };

    if (!raag) return (
        <FeedCard delay={0}>
            <div className={styles.coverArt} style={{ background: 'linear-gradient(135deg,#e8d5b0,#c9a87c)' }} />
            <div className={styles.cardBody}>
                <div className={styles.cardMeta}><span className={styles.cardTag}>Audio Nectar · Project Leela</span></div>
                <h3 className={styles.cardTitle}>Loading today's Raag…</h3>
            </div>
        </FeedCard>
    );

    return (
        <FeedCard delay={0}>
            <div className={styles.coverArt} style={{ background: playing ? '#050212' : raag.gradient }}>
                {playing && analyser ? (
                    <WaveCanvas analyser={analyser} />
                ) : (
                    <>
                        <span className={styles.coverLabel}>{raag.label}</span>
                        <span className={styles.coverEmoji}>{raag.emoji}</span>
                    </>
                )}
            </div>

            <div className={styles.cardBody}>
                <div className={styles.cardMeta}>
                    <span className={styles.cardTag}>Audio Nectar · Project Leela</span>
                    <DiyaLike count={248} />
                </div>
                <h3 className={styles.cardTitle}>{raag.title}</h3>
                <p className={styles.cardDesc}>{raag.raag} · {raag.duration} · Sacred space</p>

                <div className={styles.raagActions}>
                    <button
                        className={`${styles.raagBtn} ${playing ? styles.raagBtnActive : ''}`}
                        onClick={playing ? stopListening : listenHere}
                    >
                        {playing
                            ? <><PauseIcon /><span>Pause</span></>
                            : <><span className={styles.raagBtnIcon}>▶</span><span>Listen</span></>}
                    </button>
                    <button className={`${styles.raagBtn} ${styles.raagBtnLeela}`} onClick={openLeela}>
                        <span className={styles.raagBtnIcon}>🌊</span>
                        <span>Open Leela</span>
                    </button>
                </div>
            </div>
        </FeedCard>
    );
}






// ── Card 2: Micro-Practice ────────────────────────────────────────────────────
function MicroPracticeCard() {
    return (
        <FeedCard delay={0.1}>
            {/* Yoga gradient art */}
            <div className={styles.coverArt} style={{
                background: 'linear-gradient(160deg, #134e5e 0%, #71b280 50%, #ffd89b 100%)',
            }}>
                <span className={styles.coverLabel}>प्राणायाम</span>
                <span className={styles.coverEmoji} style={{ fontSize: '3rem' }}>🧘</span>
            </div>

            <div className={styles.cardBody}>
                <div className={styles.cardMeta}>
                    <span className={styles.cardTag}>Micro-Practice</span>
                    <DiyaLike count={182} />
                </div>
                <h3 className={styles.cardTitle}>3-Minute Breathwork to De-stress</h3>
                <p className={styles.cardDesc}>Box breathing · Reduce cortisol · Anytime</p>

                <button className={styles.startBtn}>
                    Start Practice &nbsp;→
                </button>
            </div>
        </FeedCard>
    );
}

// ── Card 3: Our Great Community ─────────────────────────────────────────────
const MEMBERS = [
    { name: 'Sourabh', flag: '🇮🇳', country: 'India', initials: 'SO', color: '#FF7043' },
    { name: 'Jodyasa', flag: '🇺🇸', country: 'USA', initials: 'JO', color: '#7E57C2' },
    { name: 'Brian', flag: '🇿🇦', country: 'South Africa', initials: 'BR', color: '#26A69A' },
];

function CommunityCard() {
    return (
        <FeedCard delay={0.2}>
            <div className={styles.cardBody} style={{ paddingTop: '1.5rem' }}>
                <div className={styles.cardMeta}>
                    <span className={styles.cardTag}>Our Great Community</span>
                    <DiyaLike count={94} />
                </div>

                {/* Avatar stack — Instagram style */}
                <div className={styles.avatarSection}>
                    <div className={styles.avatarStack}>
                        {MEMBERS.map((m, i) => (
                            <div
                                key={m.name}
                                className={styles.avatar}
                                style={{
                                    background: m.color,
                                    zIndex: MEMBERS.length - i,
                                    marginLeft: i === 0 ? 0 : '-14px',
                                }}
                            >
                                {m.initials}
                            </div>
                        ))}
                    </div>
                    <div className={styles.memberList}>
                        {MEMBERS.map(m => (
                            <div key={m.name} className={styles.memberRow}>
                                <span className={styles.memberFlag}>{m.flag}</span>
                                <span className={styles.memberName}>{m.name}</span>
                                <span className={styles.memberCountry}>{m.country}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <p className={styles.cardDesc}>
                    +1,248 seekers already in the Sangha circle this morning
                </p>
                <button className={styles.joinBtn}>
                    🙏 &nbsp;Join Circle
                </button>
            </div>
        </FeedCard>
    );
}

// ── Card 4: Habit Tracker ─────────────────────────────────────────────────────
const HABITS = [
    { id: 'walk', label: 'Morning Walk', emoji: '🚶' },
    { id: 'water', label: 'Drink Water', emoji: '💧' },
    { id: 'gratit', label: 'Gratitude', emoji: '🙏' },
    { id: 'noscreen', label: 'No Screen 1hr', emoji: '📵' },
    { id: 'meditate', label: 'Meditate', emoji: '🧘' },
];
const habitKey = () => `habits_${new Date().toISOString().slice(0, 10)}`;

function HabitTrackerCard() {
    const [done, setDone] = useState<string[]>([]);

    useEffect(() => {
        try {
            const s = localStorage.getItem(habitKey());
            if (s) setDone(JSON.parse(s));
        } catch { /* ignore */ }
    }, []);

    const toggle = (id: string) => {
        const next = done.includes(id) ? done.filter(d => d !== id) : [...done, id];
        setDone(next);
        localStorage.setItem(habitKey(), JSON.stringify(next));
    };

    return (
        <FeedCard delay={0.3}>
            <div className={styles.cardBody}>
                <div className={styles.cardMeta}>
                    <span className={styles.cardTag}>Today&apos;s Tasks</span>
                    <span className={styles.diyaCount}>{done.length}/{HABITS.length} today</span>
                </div>
                <div className={styles.habitGrid}>
                    {HABITS.map(h => (
                        <button
                            key={h.id}
                            className={`${styles.habitChip} ${done.includes(h.id) ? styles.habitDone : ''}`}
                            onClick={() => toggle(h.id)}
                        >
                            <span>{h.emoji}</span>
                            <span>{h.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </FeedCard>
    );
}

// ── Main export ────────────────────────────────────────────────────────────
const isMorning = () => { const h = new Date().getHours(); return h >= 4 && h < 8.5; };


export default function PranaFeed() {
    const [morning, setMorning] = useState(false);
    useEffect(() => setMorning(isMorning()), []);

    return (
        <section className={styles.feed}>
            <span className={styles.sectionLabel}>Prana Feed</span>
            <SankalpaList />
            <AudioNectarCard />
            {morning && <MicroPracticeCard />}

        </section>
    );
}
