'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import styles from './UserProfile.module.css';
import { useOneSutraAuth } from '@/hooks/useOneSutraAuth';

// ─── Static profile data (in production: fetched from API) ────────────────────
const PROFILE = {
    name: 'Yogi Aryan',
    title: 'Sattvik Seeker',
    joined: 'Feb 2025',
    prakriti: 'Vata-Pitta',
    doshas: [
        { name: 'Vāta', value: 55, color: '#7E57C2', element: 'Space & Air', trait: 'Creative, Quick, Inspired' },
        { name: 'Pitta', value: 35, color: '#FF8A65', element: 'Fire & Water', trait: 'Focused, Passionate, Leader' },
        { name: 'Kapha', value: 10, color: '#66BB6A', element: 'Earth & Water', trait: 'Stable, Nurturing, Patient' },
    ],
    personality: 'Your dominant Vāta gives you bursts of creative inspiration and quick thinking. Channel it with routine and grounding practices. Your Pitta fire drives ambition — balance it with cooling foods and evening walks.',
    badges: [
        { id: 'riser', label: 'Early Riser', emoji: '🌅', earned: true },
        { id: 'sattvik', label: 'Sattvik', emoji: '🌿', earned: true },
        { id: 'calm', label: 'Calm Mind', emoji: '🪷', earned: true },
        { id: 'decision', label: 'Decision Maker', emoji: '⚡', earned: true },
        { id: 'mindful', label: 'Mindful', emoji: '🧘', earned: true },
        { id: 'streak7', label: '7-Day Streak', emoji: '🔥', earned: true },
        { id: 'scholar', label: 'Vedic Scholar', emoji: '📜', earned: false },
        { id: 'sangha', label: 'Sangha Builder', emoji: '🤝', earned: false },
    ],
    stats: [
        { label: 'Days Active', value: '14', unit: 'days' },
        { label: 'Meditations', value: '22', unit: 'sessions' },
        { label: 'Habits Completed', value: '68', unit: '%' },
        { label: 'Focus Hours', value: '31', unit: 'hrs' },
    ],
    weekProgress: [60, 80, 45, 90, 70, 55, 85], // Mon–Sun %
};

interface UserProfileProps {
    isOpen: boolean;
    onClose: () => void;
    userName?: string | null;
}

export default function UserProfile({ isOpen, onClose, userName }: UserProfileProps) {
    const { user } = useOneSutraAuth();
    const [tab, setTab] = useState<'dosha' | 'badges' | 'progress'>('dosha');
    // Prioritize the incoming userName prop, then the globally authenticated user, then the fallback profile
    const displayName = userName || user?.name || PROFILE.name;
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className={styles.backdrop}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Sheet */}
                    <motion.div
                        className={styles.sheet}
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
                    >
                        {/* Drag handle */}
                        <div className={styles.handle} />

                        {/* Close */}
                        <button className={styles.closeBtn} onClick={onClose}>
                            <X size={18} strokeWidth={1.8} />
                        </button>

                        <div className={styles.scrollArea}>
                            {/* ── Avatar + name ── */}
                            <div className={styles.hero}>
                                <div className={styles.avatar}>
                                    <span className={styles.avatarOm}>ॐ</span>
                                </div>
                                <div className={styles.heroInfo}>
                                    <h2 className={styles.heroName}>{displayName}</h2>
                                    <span className={styles.heroTitle}>{PROFILE.title}</span>
                                    <span className={styles.heroPrakriti}>Prakriti: {PROFILE.prakriti}</span>
                                    <span className={styles.heroJoined}>Member since {PROFILE.joined}</span>
                                </div>
                            </div>

                            {/* ── Tab bar ── */}
                            <div className={styles.tabs}>
                                {(['dosha', 'badges', 'progress'] as const).map(t => (
                                    <button
                                        key={t}
                                        className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
                                        onClick={() => setTab(t)}
                                    >
                                        {t === 'dosha' ? '🧬 Dosha' : t === 'badges' ? '🏅 Badges' : '📊 Progress'}
                                    </button>
                                ))}
                            </div>

                            {/* ── Tab: Dosha ── */}
                            {tab === 'dosha' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.tabContent}>
                                    <p className={styles.doshaIntro}>Your Tridosha constitution — the ancient map of your being</p>

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
                                                    transition={{ duration: 0.9, ease: 'easeOut' as const, delay: 0.1 }}
                                                />
                                            </div>
                                            <span className={styles.doshaPct}>{d.value}%</span>
                                            <p className={styles.doshaTrait}>{d.trait}</p>
                                        </div>
                                    ))}

                                    <div className={styles.personalityBox}>
                                        <span className={styles.personalityLabel}>Your Prakriti Insight</span>
                                        <p className={styles.personalityText}>{PROFILE.personality}</p>
                                    </div>
                                </motion.div>
                            )}

                            {/* ── Tab: Badges ── */}
                            {tab === 'badges' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.tabContent}>
                                    <p className={styles.doshaIntro}>Badges earned through your conscious living journey</p>
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

                            {/* ── Tab: Progress ── */}
                            {tab === 'progress' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.tabContent}>
                                    <div className={styles.statsGrid}>
                                        {PROFILE.stats.map(s => (
                                            <div key={s.label} className={styles.statCard}>
                                                <span className={styles.statValue}>{s.value}</span>
                                                <span className={styles.statUnit}>{s.unit}</span>
                                                <span className={styles.statLabel}>{s.label}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Weekly bar chart */}
                                    <div className={styles.chartSection}>
                                        <p className={styles.chartTitle}>This Week's Wellness Score</p>
                                        <div className={styles.chart}>
                                            {PROFILE.weekProgress.map((pct, i) => (
                                                <div key={i} className={styles.chartCol}>
                                                    <div className={styles.chartBarTrack}>
                                                        <motion.div
                                                            className={styles.chartBar}
                                                            initial={{ height: 0 }}
                                                            animate={{ height: `${pct}%` }}
                                                            transition={{ delay: i * 0.07, duration: 0.6, ease: 'easeOut' as const }}
                                                        />
                                                    </div>
                                                    <span className={styles.chartDay}>{days[i]}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
