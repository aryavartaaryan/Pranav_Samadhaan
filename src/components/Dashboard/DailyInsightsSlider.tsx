'use client';

import React from 'react';
import styles from './DailyInsightsSlider.module.css';
import { useCircadianBackground } from '@/hooks/useCircadianBackground';

interface Insight {
    id: string;
    quote: string;
    source: string;
    imageVariant: 'nature' | 'vedic';
}

const INSIGHTS: Insight[] = [
    {
        id: '1',
        quote: "The quiet mind is not empty; it is full of the universe.",
        source: "VEDIC SUTRA",
        imageVariant: 'nature'
    },
    {
        id: '2',
        quote: "Harmony is not the absence of chaos, but the mastery of breath.",
        source: "YOGA VASISHTHA",
        imageVariant: 'nature' // using nature for calming unsplash backgrounds
    },
    {
        id: '3',
        quote: "You are the sky. Everything else is just the weather.",
        source: "ASHTAVAKRA GITA",
        imageVariant: 'nature'
    }
];

function InsightCard({ insight }: { insight: Insight }) {
    // using the same high-quality circadian background hook to easily fetch unsplash nature images
    const { phase, imageUrl, loaded } = useCircadianBackground(insight.imageVariant);

    return (
        <div className={styles.card}>
            {/* Nature Background from Unsplash */}
            <div
                className={styles.bgImage}
                style={{
                    backgroundImage: `url(${imageUrl})`,
                    opacity: loaded ? 1 : 0
                }}
            />

            {/* Heavy Glassmorphism Overlay */}
            <div className={styles.glassOverlay} />

            {/* Content Layer */}
            <div className={styles.content}>
                <div className={styles.topIcon}>
                    <span>❋</span>
                </div>

                <h3 className={styles.quote}>"{insight.quote}"</h3>

                <div className={styles.footer}>
                    <span className={styles.source}>{insight.source}</span>
                    <button className={styles.reflectBtn}>Reflect →</button>
                </div>
            </div>
        </div>
    );
}

export default function DailyInsightsSlider() {
    return (
        <section className={styles.sliderSection}>
            <div className={styles.header}>
                <h2 className={styles.title}>DAILY INSIGHT</h2>
            </div>

            <div className={styles.sliderContainer}>
                {INSIGHTS.map(insight => (
                    <InsightCard key={insight.id} insight={insight} />
                ))}
            </div>
        </section>
    );
}
