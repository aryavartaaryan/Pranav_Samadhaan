'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCircadianBackground } from '@/hooks/useCircadianBackground';
import styles from './LivingInsightHero.module.css';

// A placeholder quote that feels deeply Sattvic. In a real app, this would be fetched daily or from an array.
const DAILY_QUOTE = {
    text: "Stillness is the language God speaks. Everything else is a bad translation.",
    author: "Eckhart Tolle",
    source: "DAILY VIBE"
};

export default function LivingInsightHero() {
    // We use the 'nature' variant which will automatically pull the correctly 
    // tailored time-of-day morning/afternoon/evening/night landscape.
    const { imageUrl, loaded } = useCircadianBackground('nature');

    return (
        <section className={styles.heroContainer}>
            {/* The Circadian Background Image */}
            <motion.div
                className={styles.heroImage}
                style={{ backgroundImage: `url(${imageUrl})` }}
                initial={{ opacity: 0 }}
                animate={{ opacity: loaded ? 1 : 0 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
            />

            {/* Sattvic Glass Overlay: dark at bottom, clear at top */}
            <div className={styles.heroOverlay} />

            {/* Content properly positioned at the lower-center */}
            <div className={styles.contentWrapper}>
                <div className={styles.iconWrapper} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* Glowing circular backdrop for the Om */}
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v2h-2zm0 4h2v6h-2z" fill="currentColor" />
                    </svg>
                    <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '1.2rem', fontFamily: 'serif', marginTop: '1px' }}>ॐ</span>
                </div>

                <h1 className={styles.quoteText}>
                    "{DAILY_QUOTE.text}"
                </h1>

                <div className={styles.sourceGroup}>
                    <span className={styles.sourceTag}>{DAILY_QUOTE.source}</span>
                    <span className={styles.sourceTitle}>{DAILY_QUOTE.author}</span>
                </div>
            </div>
        </section>
    );
}
