'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSakhaConversation, type DayPhase } from '@/hooks/useSakhaConversation';
import { type TaskItem } from '@/hooks/useDailyTasks';
import styles from './SakhaBodhiOrb.module.css';

// ─── Phase meta ───────────────────────────────────────────────────────────────

const PHASE_CONFIG: Record<DayPhase, { label: string; emoji: string }> = {
    morning: { label: 'Brahma Muhurta · Morning', emoji: '🌅' },
    midday: { label: 'Deep Work · Mid-Day', emoji: '☀️' },
    evening: { label: 'Sandhya · Evening', emoji: '🪔' },
    night: { label: 'Nisha · Late Night', emoji: '🌙' },
};

// ─── Geometric 4-point clarity star (SVG, no religious meaning) ───────────────

function ClarityStar() {
    return (
        <svg
            className={styles.starGeo}
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
        >
            {/* Four slim elongated diamond points — a pure geometric form */}
            <path
                d="M20 2 L21.4 18.6 L38 20 L21.4 21.4 L20 38 L18.6 21.4 L2 20 L18.6 18.6 Z"
                fill="rgba(255,255,255,0.55)"
            />
            <circle cx="20" cy="20" r="1.5" fill="rgba(255,255,255,0.85)" />
        </svg>
    );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SakhaBodhiOrbProps {
    sankalpaItems: TaskItem[];
    onSankalpaUpdate: (items: TaskItem[]) => void;
    onDismiss: () => void;
    userName?: string;
    userId?: string | null;
    /** Persists new Bodhi-added tasks to Firestore */
    onAddTask?: (task: TaskItem) => Promise<void>;
    /** Persists Bodhi-removed tasks to Firestore */
    onRemoveTask?: (taskId: string) => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SakhaBodhiOrb({
    sankalpaItems,
    onSankalpaUpdate,
    onDismiss,
    userName = 'Aryan',
    userId = null,
    onAddTask,
    onRemoveTask,
}: SakhaBodhiOrbProps) {
    const {
        sakhaState,
        phase,
        micVolume,
        activate,
        deactivate,
    } = useSakhaConversation({
        userName,
        sankalpaItems,
        onSankalpaUpdate,
        onDismiss,
        userId,
        onAddTask,
        onRemoveTask,
    });

    useEffect(() => {
        let mounted = true;
        // Small delay to ensure clean mount handling in Strict Mode
        const play = setTimeout(() => {
            if (mounted) activate();
        }, 100);

        return () => {
            mounted = false;
            clearTimeout(play);
            deactivate();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Phase info ────────────────────────────────────────────────────────────
    const phaseInfo = PHASE_CONFIG[phase];

    // ── State label content ───────────────────────────────────────────────────
    const stateLabel =
        sakhaState === 'listening' ? 'Listening' :
            sakhaState === 'thinking' ? 'Thinking' :
                sakhaState === 'speaking' ? 'Speaking' : '';

    const showLiveDot = sakhaState === 'listening' || sakhaState === 'speaking';

    // ── Blob scale driven by mic volume while listening ───────────────────────
    const listenBlobScale = sakhaState === 'listening' ? 1 + micVolume * 0.22 : 1;

    // ── Breathing rhythm (idle / between turns) ───────────────────────────────
    // 4-7-8 inspired: subtle slow expansion
    const breathTransition = {
        duration: 8,
        repeat: Infinity,
        ease: 'easeInOut' as const,
        times: [0, 0.44, 0.55, 1],
    };

    // ── Central blob common props ─────────────────────────────────────────────
    const mainBlobVariants = {
        idle: {
            scale: [1, 1.04, 1.04, 1],
            y: [0, -10, -10, 0],
            transition: breathTransition,
        },
        listening: {
            scale: listenBlobScale,
            transition: { duration: 0.12, ease: 'linear' as const },
        },
        thinking: {
            scale: [1, 1.02, 1, 0.98, 1],
            transition: {
                duration: 2.8,
                repeat: Infinity,
                ease: 'easeInOut' as const,
            },
        },
        speaking: {
            scale: [1, 1.07, 0.96, 1.05, 1],
            transition: {
                duration: 1.6,
                repeat: Infinity,
                ease: 'easeInOut' as const,
            },
        },
        dismissed: { scale: 0, opacity: 0 },
    };

    // Map sakhaState to a blob animation key
    const blobAnimKey =
        sakhaState === 'idle' ? 'idle' :
            sakhaState === 'listening' ? 'listening' :
                sakhaState === 'thinking' ? 'thinking' :
                    sakhaState === 'speaking' ? 'speaking' : 'idle';

    return (
        <AnimatePresence>
            {sakhaState !== 'dismissed' && (
                <motion.div
                    className={styles.backdrop}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45 }}
                >
                    {/* ── HIDDEN SVG — Goo filter definition ────────────────────── */}
                    <svg
                        style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
                        aria-hidden
                    >
                        <defs>
                            <filter id="sakha-goo" x="-30%" y="-30%" width="160%" height="160%">
                                <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
                                <feColorMatrix
                                    in="blur"
                                    mode="matrix"
                                    values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8"
                                    result="goo"
                                />
                                <feBlend in="SourceGraphic" in2="goo" />
                            </filter>
                        </defs>
                    </svg>

                    {/* ── Phase badge ────────────────────────────────────────────── */}
                    <motion.div
                        className={styles.phaseBadge}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35, duration: 0.5 }}
                    >
                        {phaseInfo.emoji} {phaseInfo.label}
                    </motion.div>

                    {/* ── Aura stage ────────────────────────────────────────────── */}
                    <motion.div
                        className={styles.auraStage}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 180, damping: 22, duration: 0.7 }}
                    >
                        {/* ── Cymatic soundwave rings (speaking state) ──────────── */}
                        {sakhaState === 'speaking' && (
                            <>
                                <div className={styles.soundRing} />
                                <div className={styles.soundRing} />
                                <div className={styles.soundRing} />
                                <div className={styles.soundRing} />
                            </>
                        )}

                        {/* ── Liquid "Goo" blob container ───────────────────────── */}
                        <motion.div
                            className={styles.gooContainer}
                            animate={
                                blobAnimKey === 'idle'
                                    ? { y: [0, -10, -10, 0], transition: breathTransition }
                                    : { y: 0 }
                            }
                        >
                            {/* Core blob — indigo base */}
                            <motion.div
                                className={`${styles.blob} ${styles.blobCore}`}
                                animate={mainBlobVariants[blobAnimKey]}
                            />

                            {/* Satellite blob A — champagne gold tint, orbits top-left */}
                            <motion.div
                                className={`${styles.blob} ${styles.blobA}`}
                                animate={{
                                    x: [0, 14, -8, 14, 0],
                                    y: [0, -10, 6, -6, 0],
                                    scale:
                                        sakhaState === 'speaking'
                                            ? [1, 1.3, 0.85, 1.2, 1]
                                            : sakhaState === 'listening'
                                                ? [1, 1 + micVolume * 0.5, 1]
                                                : [1, 1.08, 1],
                                }}
                                transition={{
                                    duration: sakhaState === 'speaking' ? 1.8 : 9,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                }}
                            />

                            {/* Satellite blob B — lavender tint, orbits bottom-right */}
                            <motion.div
                                className={`${styles.blob} ${styles.blobB}`}
                                animate={{
                                    x: [0, -12, 10, -10, 0],
                                    y: [0, 10, -8, 8, 0],
                                    scale:
                                        sakhaState === 'speaking'
                                            ? [1, 0.75, 1.25, 0.9, 1]
                                            : [1, 1.06, 1],
                                }}
                                transition={{
                                    duration: sakhaState === 'speaking' ? 2.1 : 11,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                    delay: 0.5,
                                }}
                            />

                            {/* Satellite blob C — pearl tint, top-right */}
                            <motion.div
                                className={`${styles.blob} ${styles.blobC}`}
                                animate={{
                                    x: [0, 8, -12, 6, 0],
                                    y: [0, -8, 4, -10, 0],
                                    scale: sakhaState === 'speaking' ? [1, 1.2, 0.8, 1] : [1, 1.04, 1],
                                }}
                                transition={{
                                    duration: sakhaState === 'speaking' ? 1.5 : 13,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                    delay: 1.2,
                                }}
                            />

                            {/* Satellite blob D — soft lavender, bottom-left */}
                            <motion.div
                                className={`${styles.blob} ${styles.blobD}`}
                                animate={{
                                    x: [0, -10, 8, -6, 0],
                                    y: [0, 12, -6, 10, 0],
                                    scale: sakhaState === 'speaking' ? [1, 1.15, 0.85, 1] : [1, 1.05, 1],
                                }}
                                transition={{
                                    duration: sakhaState === 'speaking' ? 2.4 : 10,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                    delay: 1.8,
                                }}
                            />
                        </motion.div>

                        {/* ── Bindu + 4-point star overlay (above the goo filter) ── */}
                        <div className={styles.bindusWrap}>
                            <motion.div
                                animate={{
                                    rotate: sakhaState === 'thinking' ? 360 : [0, 5, -5, 0],
                                }}
                                transition={
                                    sakhaState === 'thinking'
                                        ? { duration: 6, repeat: Infinity, ease: 'linear' }
                                        : { duration: 12, repeat: Infinity, ease: 'easeInOut' }
                                }
                                style={{ position: 'relative', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <ClarityStar />
                            </motion.div>
                            <div className={styles.bindu} />
                        </div>
                    </motion.div>

                    {/* ── Glass pill state indicator ────────────────────────────── */}
                    <AnimatePresence mode="wait">
                        {stateLabel && (
                            <motion.div
                                key={stateLabel}
                                className={styles.glassIndicator}
                                initial={{ opacity: 0, y: 8, scale: 0.92 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.92 }}
                                transition={{ duration: 0.28 }}
                            >
                                {showLiveDot && <span className={styles.liveDot} />}
                                {stateLabel}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Subtitles intentional hidden from UI */}

                    {/* ── Dismiss button ────────────────────────────────────────── */}
                    <button
                        className={styles.dismissBtn}
                        onClick={() => { deactivate(); onDismiss(); }}
                    >
                        Dismiss Sakha
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
