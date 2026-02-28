'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCircadianBackground } from '@/hooks/useCircadianBackground';
import { useHalfHourImage } from '@/hooks/useHalfHourImage';
import styles from './TodaysMission.module.css';

const DAILY_QUOTE = {
    text: "Stillness is the language God speaks. Everything else is a bad translation.",
    author: "Eckhart Tolle",
    source: "DAILY VIBE"
};

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

    // Always use the stunning 30-min Unsplash cinematic wallpaper
    const { imageUrl, loaded } = useHalfHourImage();

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
                        <span className={styles.title}>
                            {isFullScreen ? "Today's Sankalpa" : "Today's Sankalpa"}
                        </span>
                        <span className={styles.subtext}>
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
                            className={`${styles.item} ${item.done ? styles.itemDone : ''}`}
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
                            <span className={styles.text}>{item.text}</span>
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

    // Shared Background & Quote layout
    const heroBackground = (
        <>
            <div className={styles.reelCircadianBg} />
            <motion.div
                className={styles.reelCircadianBg}
                style={{ backgroundImage: `url(${imageUrl})` }}
                animate={{ opacity: loaded ? 1 : 0 }}
                initial={{ opacity: 0 }}
                transition={{ duration: 1.5 }}
            />
            <div className={styles.reelOverlay} />
        </>
    );

    const insightQuote = (
        <div className={styles.quoteWrapper}>
            <div className={styles.iconWrapper}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v2h-2zm0 4h2v6h-2z" fill="currentColor" />
                </svg>
                <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '1.2rem', fontFamily: 'serif', marginTop: '1px' }}>ॐ</span>
            </div>

            <h1 className={styles.quoteText}>"{DAILY_QUOTE.text}"</h1>

            <div className={styles.sourceGroup}>
                <span className={styles.sourceTag}>{DAILY_QUOTE.source}</span>
                <span className={styles.sourceTitle}>{DAILY_QUOTE.author}</span>
            </div>
        </div>
    );

    if (isFullScreen) {
        return (
            <div className={styles.containerFull} onClick={onExpand}>
                {heroBackground}

                {onExpand && (
                    <button className={styles.dismissBtn} onClick={onExpand} aria-label="Exit full screen">✕</button>
                )}

                {insightQuote}

                {/* The Sankalpa content anchored to bottom via containerFull CSS */}
                <div style={{ width: '100%', position: 'absolute', bottom: '5rem', left: 0 }}>
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
            {heroBackground}
            {insightQuote}
            <div style={{ width: '100%', zIndex: 10 }}>
                {cardContent}
            </div>
        </div>
    );
}
