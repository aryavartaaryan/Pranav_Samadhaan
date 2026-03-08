'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import styles from './UserProfile.module.css';
import { useOneSutraAuth } from '@/hooks/useOneSutraAuth';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AyurvedicProfile {
    name?: string;
    age?: string;
    sex?: string;
    prakriti: string;
    vikriti?: string;
    doshas: string;
    diseases?: string;
    plan_lifestyle: string;
    plan_food: string;
    plan_herbs?: string;
    plan_mantra: string;
    savedAt?: unknown;
}

// ─── Static fallback profile data ─────────────────────────────────────────────

const PROFILE_FALLBACK = {
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
    weekProgress: [60, 80, 45, 90, 70, 55, 85],
};

// ─── Dosha parsing helper (from string like "Vata-Pitta") ─────────────────────
function parseDoshaValues(prakriti: string): { name: string; value: number; color: string; element: string; trait: string }[] {
    const map: Record<string, { color: string; element: string; trait: string; base: number }> = {
        Vata: { color: '#7E57C2', element: 'Space & Air', trait: 'Creative, Quick, Inspired', base: 33 },
        Pitta: { color: '#FF8A65', element: 'Fire & Water', trait: 'Focused, Passionate, Leader', base: 33 },
        Kapha: { color: '#66BB6A', element: 'Earth & Water', trait: 'Stable, Nurturing, Patient', base: 34 },
    };
    const parts = prakriti.split(/[-/]/).map(p => p.trim());
    const total = parts.length;
    return Object.keys(map).map((dosha) => {
        const idx = parts.indexOf(dosha);
        const value = idx === 0 ? Math.round(55 / total + 20)
            : idx === 1 ? Math.round(35 / total + 10)
                : Math.round(10 / total + 5);
        return { name: dosha === 'Vata' ? 'Vāta' : dosha === 'Kapha' ? 'Kapha' : 'Pitta', value, ...map[dosha] };
    }).sort((a, b) => b.value - a.value);
}

// ── Props ──────────────────────────────────────────────────────────────────────
interface UserProfileProps {
    isOpen: boolean;
    onClose: () => void;
    userName?: string | null;
}

export default function UserProfile({ isOpen, onClose, userName }: UserProfileProps) {
    const { user } = useOneSutraAuth();
    const [tab, setTab] = useState<'dosha' | 'plan' | 'badges' | 'progress'>('dosha');
    const [firestoreProfile, setFirestoreProfile] = useState<AyurvedicProfile | null>(null);
    const [profileLoading, setProfileLoading] = useState(false);

    const displayName = userName || user?.name || 'Sadhaka';
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    // ── Fetch real Ayurvedic profile from Firestore ────────────────────────────
    useEffect(() => {
        if (!isOpen) return;

        // 1. Try localStorage first (instant)
        try {
            const local = localStorage.getItem('acharya_profile');
            if (local) setFirestoreProfile(JSON.parse(local));
        } catch { /* noop */ }

        // 2. Fetch from Firestore
        (async () => {
            setProfileLoading(true);
            try {
                const { getFirebaseAuth, getFirebaseFirestore } = await import('@/lib/firebase');
                const { onAuthStateChanged } = await import('firebase/auth');
                const { doc, getDoc } = await import('firebase/firestore');
                const auth = await getFirebaseAuth();
                const db = await getFirebaseFirestore();
                onAuthStateChanged(auth, async (firebaseUser) => {
                    if (firebaseUser) {
                        const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
                        if (snap.exists() && snap.data()?.profile) {
                            const p = snap.data().profile as AyurvedicProfile;
                            setFirestoreProfile(p);
                            try { localStorage.setItem('acharya_profile', JSON.stringify(p)); } catch { /* noop */ }
                        }
                    }
                    setProfileLoading(false);
                });
            } catch { setProfileLoading(false); }
        })();
    }, [isOpen]);

    // ── Resolved profile values ────────────────────────────────────────────────
    const prakritiLabel = firestoreProfile?.prakriti || PROFILE_FALLBACK.prakriti;
    const doshaData = firestoreProfile?.prakriti
        ? parseDoshaValues(firestoreProfile.prakriti)
        : PROFILE_FALLBACK.doshas;
    const personalityText = firestoreProfile?.doshas || PROFILE_FALLBACK.personality;
    const hasRealPlan = !!(firestoreProfile?.plan_lifestyle || firestoreProfile?.plan_food || firestoreProfile?.plan_mantra || firestoreProfile?.plan_herbs);
    const vikritiText = firestoreProfile?.vikriti || '';
    const diseasesText = firestoreProfile?.diseases && firestoreProfile.diseases !== 'None' ? firestoreProfile.diseases : '';

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
                                    <span className={styles.heroTitle}>{PROFILE_FALLBACK.title}</span>
                                    <span className={styles.heroPrakriti}>Prakriti: {prakritiLabel}</span>
                                    <span className={styles.heroJoined}>Member since {PROFILE_FALLBACK.joined}</span>
                                </div>
                            </div>

                            {/* ── Onboarding prompt if no profile yet ── */}
                            {!firestoreProfile && !profileLoading && (
                                <div style={{
                                    margin: '0.75rem 0',
                                    padding: '0.75rem 1rem',
                                    background: 'linear-gradient(135deg, rgba(200,155,40,0.08), rgba(165,180,252,0.06))',
                                    borderRadius: '0.75rem',
                                    border: '1px solid rgba(200,155,40,0.2)',
                                    fontSize: '0.75rem',
                                    color: 'rgba(200,155,40,0.85)',
                                    textAlign: 'center',
                                    lineHeight: 1.6,
                                }}>
                                    🕉️ Your Ayurvedic profile will appear here after your Acharya consultation.
                                </div>
                            )}

                            {/* ── Tab bar ── */}
                            <div className={styles.tabs}>
                                {(['dosha', 'plan', 'badges', 'progress'] as const).map(t => (
                                    <button
                                        key={t}
                                        className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
                                        onClick={() => setTab(t)}
                                    >
                                        {t === 'dosha' ? '🧬 Dosha'
                                            : t === 'plan' ? '🗓️ Plan'
                                                : t === 'badges' ? '🏅 Badges'
                                                    : '📊 Progress'}
                                    </button>
                                ))}
                            </div>

                            {/* ── Tab: Dosha ── */}
                            {tab === 'dosha' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.tabContent}>
                                    <p className={styles.doshaIntro}>Your Tridosha constitution — the ancient map of your being</p>

                                    {doshaData.map(d => (
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
                                        <p className={styles.personalityText}>{personalityText}</p>
                                    </div>

                                    {vikritiText && (
                                        <div style={{
                                            padding: '0.75rem 1rem', borderRadius: '0.75rem',
                                            background: 'rgba(255,138,101,0.08)',
                                            border: '1px solid rgba(255,138,101,0.2)',
                                            fontSize: '0.78rem', lineHeight: 1.65,
                                            color: 'rgba(255,255,255,0.72)',
                                        }}>
                                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#FF8A65', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>⚡ Current Imbalance (Vikriti)</div>
                                            {vikritiText}
                                        </div>
                                    )}

                                    {diseasesText && (
                                        <div style={{
                                            padding: '0.75rem 1rem', borderRadius: '0.75rem',
                                            background: 'rgba(126,87,194,0.08)',
                                            border: '1px solid rgba(126,87,194,0.2)',
                                            fontSize: '0.78rem', lineHeight: 1.65,
                                            color: 'rgba(255,255,255,0.72)',
                                        }}>
                                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#7E57C2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>🩺 Health History</div>
                                            {diseasesText}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* ── Tab: 30-Day Plan ── */}
                            {tab === 'plan' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.tabContent}>
                                    {!hasRealPlan ? (
                                        <div style={{
                                            textAlign: 'center', padding: '2rem 1rem',
                                            color: 'rgba(255,255,255,0.38)',
                                            fontSize: '0.8rem', lineHeight: 1.8,
                                        }}>
                                            {profileLoading ? '⌛ Loading your plan...' : (
                                                <>
                                                    <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🕉️</div>
                                                    Your personalized 30-day Ayurvedic plan will appear here after your Acharya consultation.
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {[
                                                {
                                                    emoji: '🌄', label: 'Dinacharya — Daily Lifestyle',
                                                    content: firestoreProfile?.plan_lifestyle,
                                                    accent: '#7E57C2',
                                                },
                                                {
                                                    emoji: '🥗', label: 'Ahara — Food & Diet',
                                                    content: firestoreProfile?.plan_food,
                                                    accent: '#66BB6A',
                                                },
                                                {
                                                    emoji: '🌿', label: 'Aushadhi — Herbs & Supplements',
                                                    content: firestoreProfile?.plan_herbs,
                                                    accent: '#4CAF50',
                                                },
                                                {
                                                    emoji: '🪷', label: 'Mantra & Meditation',
                                                    content: firestoreProfile?.plan_mantra,
                                                    accent: '#FF8A65',
                                                },
                                            ].map(({ emoji, label, content, accent }) => content && (
                                                <motion.div
                                                    key={label}
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    style={{
                                                        padding: '1rem',
                                                        borderRadius: '0.8rem',
                                                        background: `linear-gradient(135deg, ${accent}12, ${accent}06)`,
                                                        border: `1px solid ${accent}28`,
                                                    }}
                                                >
                                                    <div style={{
                                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                        marginBottom: '0.6rem',
                                                        fontSize: '0.75rem', fontWeight: 700,
                                                        color: accent, letterSpacing: '0.06em',
                                                        textTransform: 'uppercase',
                                                    }}>
                                                        <span>{emoji}</span>
                                                        <span>{label}</span>
                                                    </div>
                                                    <p style={{
                                                        margin: 0, fontSize: '0.78rem',
                                                        lineHeight: 1.7,
                                                        color: 'rgba(255,255,255,0.72)',
                                                    }}>
                                                        {content}
                                                    </p>
                                                </motion.div>
                                            ))}

                                            <p style={{
                                                fontSize: '0.62rem',
                                                color: 'rgba(255,255,255,0.25)',
                                                textAlign: 'center', marginTop: '0.25rem',
                                                letterSpacing: '0.05em',
                                            }}>
                                                Prescribed by Acharya Pranav · Consult a physician for medical conditions
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* ── Tab: Badges ── */}
                            {tab === 'badges' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.tabContent}>
                                    <p className={styles.doshaIntro}>Badges earned through your conscious living journey</p>
                                    <div className={styles.badgeGrid}>
                                        {PROFILE_FALLBACK.badges.map(b => (
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
                                        {PROFILE_FALLBACK.stats.map(s => (
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
                                            {PROFILE_FALLBACK.weekProgress.map((pct, i) => (
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
