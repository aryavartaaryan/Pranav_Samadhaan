'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCircadianBackground } from '@/hooks/useCircadianBackground';
import { useHalfHourImage } from '@/hooks/useHalfHourImage';
import styles from './TodaysMission.module.css';

export interface Sankalp { id: string; text: string; done: boolean; }

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
                            {isMounted ? done : 0}/{isMounted ? (items.length || 1) : 1} intentions fulfilled
                        </span>
                    </div>
                </div>
                {!adding && (
                    <button className={styles.addBtn} onClick={() => setAdding(true)} aria-label="Add Sankalpa">
                        +
                    </button>
                )}
            </div>

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
                            <button
                                className={styles.checkBtn}
                                onClick={() => onToggle(item.id)}
                            >
                                <span className={styles.checkIcon}>✓</span>
                            </button>
                            <span className={`${styles.text} ${isFullScreen ? styles.textFull : ''}`}>{item.text}</span>
                            <button className={styles.removeBtn} onClick={() => onRemove(item.id)}>×</button>
                        </motion.div>
                    ))}
                </AnimatePresence>

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
