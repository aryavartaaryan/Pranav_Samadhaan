'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCircadianBackground } from '@/hooks/useCircadianBackground';
import styles from './ReelPlayer.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface Sankalp { id: string; text: string; done: boolean; }

export interface TodaysMissionProps {
    items: Sankalp[];
    onToggle: (id: string) => void;
    onRemove: (id: string) => void;
    onAdd: (text: string) => void;
    /** 'vedic' = sacred temple/Himalaya images (home page). 'nature' = ocean/forest (JustVibe). */
    variant?: 'vedic' | 'nature';
    /** When true, renders as a full-screen overlay (inside the reel). Default: false (stand-alone on home). */
    isFullScreen?: boolean;
    onExpand?: () => void;
}

// ── Rotating taglines (day-of-week) ──────────────────────────────────────────
const MISSION_TAGLINES = [
    'Your Sacred Intentions for Today',
    'Set Your Saṅkalpa · Rise with Purpose',
    'What Will You Accomplish Today?',
    'The Inner Fire That Moves Mountains',
    'Today\'s Dharma · Act with Intention',
    'Set Your Saṅkalpa · Rise with Purpose',
    'Begin with Intention · End with Gratitude',
];

// ════════════════════════════════════════════════════════════════════════════
//  TodaysMission — standalone card with circadian background
//  Can be used on home page (isFullScreen=false) or inside ReelPlayer (true)
// ════════════════════════════════════════════════════════════════════════════
export default function TodaysMission({
    items,
    onToggle,
    onRemove,
    onAdd,
    variant = 'nature',
    isFullScreen = false,
    onExpand,
}: TodaysMissionProps) {
    const [draft, setDraft] = useState('');
    const [adding, setAdding] = useState(false);
    const done = items.filter(s => s.done).length;

    const tagline = MISSION_TAGLINES[new Date().getDay() % MISSION_TAGLINES.length];

    // ── Circadian background ─────────────────────────────────────────────────
    const { phase, imageUrl, loaded } = useCircadianBackground(variant);
    const isDay = phase.name === 'day';

    const add = () => {
        if (!draft.trim()) return;
        onAdd(draft.trim());
        setDraft('');
        setAdding(false);
    };

    return (
        <div
            className={`${styles.reelSlide} ${isFullScreen ? styles.reelSlideFull : styles.missionStandalone}`}
            style={{ '--reel-accent': phase.accentHex } as React.CSSProperties}
            onClick={!isFullScreen && onExpand ? onExpand : undefined}
        >
            {/* ── Dynamic Nature Background (Only in Full-Screen Reels) ── */}
            {isFullScreen && (
                <>
                    <div className={styles.circadianBg} />
                    <motion.div
                        className={styles.circadianBg}
                        style={{ backgroundImage: `url(${imageUrl})` }}
                        animate={{ opacity: loaded ? 1 : 0 }}
                        initial={{ opacity: 0 }}
                        transition={{ duration: 1.5, ease: 'easeInOut' }}
                    />

                    {/* ── Sattvic Glass Overlay ── */}
                    <div
                        className={styles.circadianOverlay}
                        style={{ background: isDay ? 'rgba(5,15,35,0.38)' : 'rgba(0,2,12,0.62)' }}
                    />
                </>
            )}

            {/* ── Phase badge (Only in Full-Screen Reels) ── */}
            {isFullScreen && (
                <div className={styles.phaseBadge} style={{ color: phase.accentHex }}>
                    <span className={styles.phaseLabel}>{phase.label}</span>
                    <span className={styles.phaseTagline}>{phase.tagline}</span>
                </div>
            )}

            {/* Dismiss button (only in full-screen reel mode) */}
            {isFullScreen && onExpand && (
                <button className={styles.dismissBtn} onClick={onExpand} aria-label="Exit full screen">✕</button>
            )}

            {/* ── Content ───────────────────────────────────────────────── */}
            <div className={styles.sankalpaContent} onClick={e => e.stopPropagation()}>
                <div className={styles.missionHeader}>
                    <span className={styles.missionFlame}>🪔</span>
                    <div className={styles.missionTitles}>
                        <span className={styles.missionTitle} style={{ color: phase.accentHex }}>
                            {isFullScreen ? "Your Today's Mission" : "Today's Mission"}
                        </span>
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
                        <span style={{ color: `${phase.accentHex}88` }}>✦ Your daily intentions, beautifully set</span>
                    </div>
                )}
            </div>
        </div>
    );
}
