'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCircadianBackground } from '@/hooks/useCircadianBackground';
import { useHalfHourImage } from '@/hooks/useHalfHourImage';
import styles from './TodaysMission.module.css';

export interface Sankalp { id: string; text: string; done: boolean; }

const AFFIRMATIONS = [
    'Breathe deeply — your path is unfolding perfectly.',
    'You are rooted like the Himalaya. Unmoved. Serene.',
    'Each breath is a gift from Prana. Receive it with gratitude.',
    'The universe is guiding you. Trust the sacred timing.',
    'You are not your thoughts. You are the awareness behind them.',
    'Like the river that always finds the ocean — so shall you.',
];

function getDailyAffirmation(): string {
    const now = new Date();
    const dayOfYear = Math.floor(
        (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
            Date.UTC(now.getFullYear(), 0, 0)) / 86400000
    );
    return AFFIRMATIONS[dayOfYear % AFFIRMATIONS.length];
}

export interface TodaysMissionProps {
    items: Sankalp[];
    onToggle: (id: string) => void;
    onRemove: (id: string) => void;
    onAdd: (text: string) => void;
    variant?: 'vedic' | 'nature';
    isFullScreen?: boolean;
    onExpand?: () => void;
}

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
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const done = items.filter(s => s.done).length;

    // In Home Page (not full screen), use classic circadian.
    // In Reels (full screen), use our stunning 30-min Unsplash wallpapers.
    const circadian = useCircadianBackground(variant);
    const halfHour = useHalfHourImage();
    const imageUrl = isFullScreen ? halfHour.imageUrl : circadian.imageUrl;
    const loaded = isFullScreen ? halfHour.loaded : circadian.loaded;

    const add = () => {
        if (!draft.trim()) return;
        onAdd(draft.trim());
        setDraft('');
        setAdding(false);
    };

    const cardContent = (
        <div
            className={isFullScreen ? styles.innerCard : ''}
            onClick={e => e.stopPropagation()}
        >
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.headerIcon}>🪔</div>
                    <div className={styles.titles}>
                        <span className={`${styles.title} ${isFullScreen ? styles.titleFull : ''}`}>
                            {isFullScreen ? "Today's Sankalpa" : "Today's Sankalpa"}
                        </span>
                        <span className={`${styles.subtext} ${isFullScreen ? styles.subtextFull : ''}`}>
                            {!isFullScreen && `${isMounted ? done : 0}/${isMounted ? (items.length || 1) : 1} intentions fulfilled`}
                        </span>
                    </div>
                </div>
                {!adding && !isFullScreen && (
                    <button className={styles.addBtn} onClick={() => setAdding(true)} aria-label="Add Sankalpa">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Affirmation Quote — only on home page, not in Reels */}
            {!isFullScreen && isMounted && (
                <div className={styles.affirmationBlock}>
                    <p className={styles.affirmationQuote}>{getDailyAffirmation()}</p>
                    <div className={styles.affirmationDivider}>✦ &nbsp; ✦ &nbsp; ✦</div>
                </div>
            )}

            {/* Thin glowing progress bar — home page only */}
            {!isFullScreen && isMounted && items.length > 0 && (
                <div className={styles.progressTrack}>
                    <motion.div
                        className={styles.progressFill}
                        initial={{ width: 0 }}
                        animate={{ width: `${(done / items.length) * 100}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                </div>
            )}

            <div className={styles.list}>
                <AnimatePresence initial={false}>
                    {isMounted && items.map(item => (
                        <motion.div
                            key={item.id}
                            className={`${styles.item} ${isFullScreen ? styles.itemFull : ''} ${item.done ? styles.itemDone : ''}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                            transition={{ duration: 0.2 }}
                            layout
                        >
                            {isFullScreen ? (
                                <div className={`${styles.checkDecorative} ${item.done ? styles.checkDecorativeDone : ''}`}>
                                    {item.done && (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    )}
                                </div>
                            ) : (
                                <button
                                    className={`${styles.checkBtn} ${item.done ? styles.checkBtnDone : ''}`}
                                    onClick={() => onToggle(item.id)}
                                    aria-label={item.done ? 'Mark incomplete' : 'Mark complete'}
                                >
                                    <AnimatePresence mode="wait">
                                        {item.done && (
                                            <motion.svg
                                                key="check"
                                                width="12" height="12" viewBox="0 0 24 24" fill="none"
                                                stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0, opacity: 0 }}
                                                transition={{ duration: 0.18, type: 'spring', stiffness: 400 }}
                                            >
                                                <polyline points="20 6 9 17 4 12" />
                                            </motion.svg>
                                        )}
                                    </AnimatePresence>
                                </button>
                            )}
                            <span className={`${styles.text} ${isFullScreen ? styles.textFull : ''}`}>{item.text}</span>
                            {!isFullScreen && (
                                <button className={styles.removeBtn} onClick={() => onRemove(item.id)} aria-label="Remove">
                                    {/* Feather-light SVG X icon */}
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {!isFullScreen && (
                    <AnimatePresence>
                        {adding && (
                            <motion.div
                                className={styles.addRow}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <input
                                    className={styles.addInput}
                                    placeholder="E.g., Drink 8 glasses of water 💧"
                                    value={draft}
                                    onChange={e => setDraft(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') add(); if (e.key === 'Escape') setAdding(false); }}
                                    autoFocus
                                />
                                <button className={styles.addConfirm} onClick={add}>+</button>
                                <button className={styles.addCancel} onClick={() => { setAdding(false); setDraft(''); }}>✕</button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );

    if (isFullScreen) {
        return (
            <div className={styles.containerFull} onClick={onExpand}>
                <div className={styles.reelCircadianBg} />
                <motion.div
                    className={styles.reelCircadianBg}
                    style={{ backgroundImage: `url(${imageUrl})` }}
                    animate={{ opacity: loaded ? 1 : 0 }}
                    initial={{ opacity: 0 }}
                    transition={{ duration: 1.5 }}
                />
                <div className={styles.reelOverlay} />

                {onExpand && (
                    <button className={styles.dismissBtn} onClick={onExpand} aria-label="Exit full screen">✕</button>
                )}

                {/* The Sankalpa content anchored to bottom via containerFull CSS */}
                <div style={{ width: '100%' }}>
                    {cardContent}
                </div>

                {/* Swipe Up Cue */}
                <div className={styles.swipeCue}>
                    <span className={styles.swipeArrow}>↑</span>
                    <span className={styles.swipeText}>Scroll for Vibes</span>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container} onClick={onExpand}>
            {cardContent}
        </div>
    );
}
