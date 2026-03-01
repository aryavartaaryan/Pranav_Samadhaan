'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, ChevronLeft, Star, Zap, Leaf, BookOpen, Heart, BarChart3 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCircadianBackground } from '@/hooks/useCircadianBackground';
import styles from './page.module.css';

// ════════════════════════════════════════════════════════
//  VIBE ENERGY BODY — generative animated avatar canvas
// ════════════════════════════════════════════════════════
type Dosha = 'vata' | 'pitta' | 'kapha';

function drawEnergyBody(canvas: HTMLCanvasElement, dosha: Dosha, time: number) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    ctx.clearRect(0, 0, W, H);

    const palette = {
        vata: ['#9d4edd', '#c77dff', '#64b5f6', '#7b2ff7'],
        pitta: ['#ff6b35', '#ffd60a', '#ff4500', '#ff9b00'],
        kapha: ['#40916c', '#52b788', '#2166ac', '#74c69d'],
    }[dosha];

    const aura = ctx.createRadialGradient(cx, cy, 10, cx, cy, W * 0.48);
    aura.addColorStop(0, palette[0] + '22');
    aura.addColorStop(0.6, palette[1] + '11');
    aura.addColorStop(1, 'transparent');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, W, H);

    for (let ring = 0; ring < 4; ring++) {
        const phase = time * (0.4 + ring * 0.2) + ring * 0.8;
        const r = (W * 0.12 * (ring + 1)) + Math.sin(phase) * 6;
        const g = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r);
        g.addColorStop(0, 'transparent');
        g.addColorStop(0.5, palette[ring % palette.length] + '18');
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(1, r), 0, Math.PI * 2);
        ctx.fill();
    }

    if (dosha === 'vata') {
        for (let a = 0; a < 5; a++) {
            ctx.beginPath();
            for (let i = 0; i < 60; i++) {
                const t = i / 60;
                const angle = t * 4 + time * 0.6 + (a / 5) * Math.PI * 2;
                const rad = t * W * 0.42 + Math.sin(time * 1.5 + a) * 5;
                const x = cx + Math.cos(angle) * rad;
                const y = cy + Math.sin(angle) * rad;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = palette[a % palette.length] + '44';
            ctx.lineWidth = 1.2;
            ctx.stroke();
        }
    }
    if (dosha === 'pitta') {
        for (let r = 1; r < 6; r++) {
            const phase = (time * 2 + r * 0.9) % (Math.PI * 2);
            const rad = Math.max(1, (r / 6) * W * 0.42 + Math.sin(phase) * 7);
            ctx.beginPath();
            ctx.arc(cx, cy, rad, 0, Math.PI * 2);
            ctx.strokeStyle = palette[r % palette.length] + '40';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    }
    if (dosha === 'kapha') {
        for (let b = 0; b < 5; b++) {
            const t = time * 0.2 + b * 1.3;
            const bx = cx + Math.cos(t) * W * 0.18;
            const by = cy + Math.sin(t * 0.75) * H * 0.18;
            const br = Math.max(2, W * (0.18 + 0.04 * Math.sin(t * 0.5)));
            const gb = ctx.createRadialGradient(bx, by, 0, bx, by, br);
            gb.addColorStop(0, palette[b % palette.length] + '88');
            gb.addColorStop(1, 'transparent');
            ctx.fillStyle = gb;
            ctx.beginPath();
            ctx.ellipse(bx, by, br, Math.max(2, br * 1.1), t * 0.15, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.globalCompositeOperation = 'source-over';
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.12);
    coreGrad.addColorStop(0, palette[0] + 'cc');
    coreGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, W * 0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'destination-in';
    const clip = ctx.createRadialGradient(cx, cy, W * 0.25, cx, cy, W * 0.5);
    clip.addColorStop(0, 'rgba(0,0,0,1)');
    clip.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = clip;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
}

function VibeAvatarBody({ dosha, size = 110 }: { dosha: Dosha; size?: number }) {
    const ref = useRef<HTMLCanvasElement>(null);
    const raf = useRef<number>(0);
    const t = useRef(0);
    useEffect(() => {
        const c = ref.current;
        if (!c) return;
        c.width = size; c.height = size;
        const loop = () => {
            t.current += 0.014;
            drawEnergyBody(c, dosha, t.current);
            raf.current = requestAnimationFrame(loop);
        };
        raf.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf.current);
    }, [dosha, size]);
    return <canvas ref={ref} style={{ borderRadius: '50%', width: size, height: size }} />;
}

// ════════════════════════════════════════════════════════
//  DATA
// ════════════════════════════════════════════════════════
const PROFILE = {
    name: 'Yogi Aryan',
    title: 'Sattvik Seeker',
    joined: 'Feb 2025',
    prakriti: 'Vata-Pitta',
    dosha: 'vata' as Dosha,
    vibeConnections: 247,
    doshas: [
        { name: 'Vāta', value: 55, color: '#9d4edd', element: 'Space & Air', trait: 'Creative, Quick, Inspired' },
        { name: 'Pitta', value: 35, color: '#ff8a65', element: 'Fire & Water', trait: 'Focused, Passionate, Leader' },
        { name: 'Kapha', value: 10, color: '#66bb6a', element: 'Earth & Water', trait: 'Stable, Nurturing, Patient' },
    ],
    personality: 'Your dominant Vāta gives you bursts of creative inspiration and quick thinking. Channel it with routine and grounding practices. Your Pitta fire drives ambition — balance it with cooling foods and evening walks.',
    badges: [
        { id: 'riser', label: 'Early Riser', emoji: '🌅', earned: true },
        { id: 'sattvik', label: 'Sattvik', emoji: '🌿', earned: true },
        { id: 'calm', label: 'Calm Mind', emoji: '🪷', earned: true },
        { id: 'decision', label: 'Decisive', emoji: '⚡', earned: true },
        { id: 'mindful', label: 'Mindful', emoji: '🧘', earned: true },
        { id: 'streak7', label: '7-Day Streak', emoji: '🔥', earned: true },
        { id: 'scholar', label: 'Vedic Scholar', emoji: '📜', earned: false },
        { id: 'sangha', label: 'Vibe Builder', emoji: '〰️', earned: false },
    ],
    stats: [
        { label: 'Days Active', value: '14', unit: 'days', icon: Star },
        { label: 'Meditations', value: '22', unit: 'sessions', icon: Heart },
        { label: 'Habits Done', value: '68', unit: '%', icon: Zap },
        { label: 'Focus Hours', value: '31', unit: 'hrs', icon: BarChart3 },
    ],
    weekProgress: [60, 80, 45, 90, 70, 55, 85],
    activeSankalps: [
        { text: 'Morning System reboot (15 mins meditation)', done: true },
        { text: 'Enter Deep Work 9 pm', done: false },
        { text: 'Unproductive apps disconnection', done: false },
        { text: 'Listen ragas at least once in morning & evening', done: false },
    ],
};

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// ════════════════════════════════════════════════════════
export default function ProfilePage() {
    const [tab, setTab] = useState<'dosha' | 'badges' | 'progress'>('dosha');
    const router = useRouter();
    // Use same circadian background as home page
    const { imageUrl, loaded } = useCircadianBackground('vedic');

    const handleLogout = () => {
        localStorage.removeItem('pranav_has_started');
        localStorage.removeItem('vedic_user_name');
        router.push('/');
    };

    const tabIcons = { dosha: '🧬', badges: '🏅', progress: '📊' };
    const tabLabels = { dosha: 'Body Type', badges: 'Badges', progress: 'Analytics' };

    return (
        <>
            {/* ── Circadian nature background ── */}
            <div style={{
                position: 'fixed', inset: 0, zIndex: 0,
                backgroundImage: `url(${imageUrl})`,
                backgroundSize: 'cover', backgroundPosition: 'center',
                transition: 'opacity 1.5s ease',
                opacity: loaded ? 1 : 0,
            }} aria-hidden />
            {/* Gradient scrim */}
            <div style={{
                position: 'fixed', inset: 0, zIndex: 1,
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.78) 100%)',
                pointerEvents: 'none',
            }} aria-hidden />

            <main className={styles.page}>

                {/* ── Elegant sticky top bar ── */}
                <motion.header
                    className={styles.topBar}
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                    <button className={styles.backBtn} onClick={() => router.back()} aria-label="Go back">
                        <ChevronLeft size={20} strokeWidth={1.8} />
                    </button>
                    <div className={styles.topBarCenter}>
                        <span className={styles.topBarTitle}>Sanctuary</span>
                        <span className={styles.topBarSub}>Your Conscious Space</span>
                    </div>
                    <button className={styles.logoutBtn} onClick={handleLogout} title="Log Out">
                        <LogOut size={16} strokeWidth={1.8} />
                    </button>
                </motion.header>

                <div className={styles.content}>

                    {/* ── Hero: Energy Avatar + Name ── */}
                    <motion.div
                        className={styles.hero}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                    >
                        <div className={styles.energyBodyWrap}>
                            <motion.div
                                className={styles.energyBodyBreath}
                                animate={{ scale: [1, 1.04, 1], opacity: [0.85, 1, 0.85] }}
                                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                            >
                                <VibeAvatarBody dosha={PROFILE.dosha} size={110} />
                            </motion.div>
                            <span className={styles.avatarOmOverlay}>ॐ</span>
                        </div>
                        <div className={styles.heroInfo}>
                            <h1 className={styles.heroName}>{PROFILE.name}</h1>
                            <span className={styles.heroTitle}>{PROFILE.title}</span>
                            <span className={styles.heroPrakriti}>Prakriti · {PROFILE.prakriti}</span>
                            <span className={styles.heroJoined}>Member since {PROFILE.joined}</span>
                            <div className={styles.vibeConnections}>
                                <span className={styles.vibeCount}>{PROFILE.vibeConnections}</span>
                                <span className={styles.vibeLabel}>Vibe Connections</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* ── Stats bento row ── */}
                    <motion.div
                        className={styles.statsRow}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.12, ease: 'easeOut' }}
                    >
                        {PROFILE.stats.map((s, i) => {
                            const Icon = s.icon;
                            return (
                                <div key={s.label} className={styles.statCard}>
                                    <Icon size={16} strokeWidth={1.6} className={styles.statIcon} />
                                    <span className={styles.statValue}>{s.value}</span>
                                    <span className={styles.statUnit}>{s.unit}</span>
                                    <span className={styles.statLabel}>{s.label}</span>
                                </div>
                            );
                        })}
                    </motion.div>

                    {/* ── Active Sankalps compact card ── */}
                    <motion.div
                        className={styles.sankalpaCard}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.18, ease: 'easeOut' }}
                    >
                        <div className={styles.sankalpaHeader}>
                            <span className={styles.sankalpaIcon}>🪔</span>
                            <span className={styles.sankalpaTitle}>Active Sankalps</span>
                            <span className={styles.sankalpaCounter}>
                                {PROFILE.activeSankalps.filter(s => s.done).length}/{PROFILE.activeSankalps.length}
                            </span>
                        </div>
                        <div className={styles.sankalpsList}>
                            {PROFILE.activeSankalps.map((s, i) => (
                                <div key={i} className={`${styles.sankalpRow} ${s.done ? styles.sankalpDone : ''}`}>
                                    <span className={styles.sankalpCheck}>{s.done ? '✓' : '○'}</span>
                                    <span className={styles.sankalpText}>{s.text}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* ── Tabs ── */}
                    <motion.div
                        className={styles.tabs}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.22 }}
                    >
                        {(['dosha', 'badges', 'progress'] as const).map(t => (
                            <button
                                key={t}
                                className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
                                onClick={() => setTab(t)}
                            >
                                <span>{tabIcons[t]}</span>
                                <span>{tabLabels[t]}</span>
                            </button>
                        ))}
                    </motion.div>

                    {/* ── Tab: Dosha ── */}
                    <AnimatePresence mode="wait">
                        {tab === 'dosha' && (
                            <motion.div key="dosha" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={styles.tabContent}>
                                <p className={styles.tabIntro}>Your Tridosha constitution — the ancient map of your being</p>
                                {PROFILE.doshas.map(d => (
                                    <div key={d.name} className={styles.doshaRow}>
                                        <div className={styles.doshaLabel}>
                                            <span className={styles.doshaName}>{d.name}</span>
                                            <span className={styles.doshaElement}>{d.element}</span>
                                        </div>
                                        <div className={styles.doshaBarTrack}>
                                            <motion.div
                                                className={styles.doshaBarFill}
                                                style={{ background: d.color }}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${d.value}%` }}
                                                transition={{ duration: 0.9, ease: 'easeOut', delay: 0.2 }}
                                            />
                                        </div>
                                        <span className={styles.doshaPct}>{d.value}%</span>
                                        <p className={styles.doshaTrait}>{d.trait}</p>
                                    </div>
                                ))}
                                <div className={styles.personalityBox}>
                                    <span className={styles.personalityLabel}>✨ Prakriti Insight</span>
                                    <p className={styles.personalityText}>{PROFILE.personality}</p>
                                </div>
                            </motion.div>
                        )}

                        {tab === 'badges' && (
                            <motion.div key="badges" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={styles.tabContent}>
                                <p className={styles.tabIntro}>Badges earned through your conscious living journey</p>
                                <div className={styles.badgeGrid}>
                                    {PROFILE.badges.map(b => (
                                        <div key={b.id} className={`${styles.badge} ${!b.earned ? styles.badgeLocked : ''}`}>
                                            <span className={styles.badgeEmoji}>{b.emoji}</span>
                                            <span className={styles.badgeLabel}>{b.label}</span>
                                            {!b.earned && <span className={styles.badgeLock}>🔒</span>}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {tab === 'progress' && (
                            <motion.div key="progress" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={styles.tabContent}>
                                <p className={styles.tabIntro}>Your weekly wellness score</p>
                                <div className={styles.chartSection}>
                                    <div className={styles.chart}>
                                        {PROFILE.weekProgress.map((pct, i) => (
                                            <div key={i} className={styles.chartCol}>
                                                <div className={styles.chartBarTrack}>
                                                    <motion.div
                                                        className={styles.chartBar}
                                                        initial={{ height: 0 }}
                                                        animate={{ height: `${pct}%` }}
                                                        transition={{ delay: i * 0.07, duration: 0.6, ease: 'easeOut' }}
                                                    />
                                                </div>
                                                <span className={styles.chartDay}>{DAYS[i]}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── Logout ── */}
                    <div className={styles.logoutWrapper}>
                        <button className={styles.logoutFull} onClick={handleLogout}>
                            <LogOut size={18} strokeWidth={1.6} />
                            Log Out
                        </button>
                    </div>

                </div>
            </main>
        </>
    );
}
