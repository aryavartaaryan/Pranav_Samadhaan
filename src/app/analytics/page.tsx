'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BarChart2, TrendingUp, Calendar, Zap, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import styles from './page.module.css';

export default function AnalyticsPage() {
    return (
        <main className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <Link href="/" className={styles.backBtn}>
                    <ArrowLeft size={20} />
                </Link>
                <h1 className={styles.title}>Progress Analytics</h1>
            </header>

            {/* Hero Card */}
            <motion.div
                className={styles.heroCard}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <div className={styles.heroContent}>
                    <div className={styles.statGroup}>
                        <span className={styles.statLabel}>Prana Score</span>
                        <span className={styles.statValue}>840</span>
                    </div>
                    <div className={styles.heroIcon}>
                        <BarChart2 size={40} className={styles.goldGlow} />
                    </div>
                </div>
                <div className={styles.heroFooter}>
                    <span className={styles.trendText}><TrendingUp size={14} /> +12% from last week</span>
                </div>
            </motion.div>

            {/* Stats Grid */}
            <div className={styles.statsGrid}>
                <motion.div
                    className={styles.statCard}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <Calendar size={20} className={styles.cardIcon} />
                    <span className={styles.cardStat}>12 Days</span>
                    <span className={styles.cardLabel}>Sadhana Streak</span>
                </motion.div>

                <motion.div
                    className={styles.statCard}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <Zap size={20} className={styles.cardIcon} />
                    <span className={styles.cardStat}>24 Hours</span>
                    <span className={styles.cardLabel}>Deep Focus</span>
                </motion.div>
            </div>

            {/* Coming Soon Section */}
            <motion.div
                className={styles.comingSoon}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.5 }}
            >
                <div className={styles.divider} />
                <p className={styles.comingSoonText}>
                    Detailed Vedic Insights & Personalized Sadhana Patterns
                    <br />
                    <span>Coming Soon in the next moon phase.</span>
                </p>
                <div className={styles.lotusIcon}>🪷</div>
            </motion.div>
        </main>
    );
}
