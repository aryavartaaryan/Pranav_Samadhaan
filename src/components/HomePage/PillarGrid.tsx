'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import styles from './PillarGrid.module.css';

// ── SVG icons for Bento Dimensions ──────────────────────────────────────────

const BrainSparkIcon = () => (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={styles.bentoIcon}>
        <path d="M24 6 C14 6 8 13 8 20 C8 28 14 32 18 34 L18 42 L30 42 L30 34 C34 32 40 28 40 20 C40 13 34 6 24 6Z" strokeOpacity="0.7" />
        <path d="M24 14 L25.5 19 L30 20 L25.5 21 L24 26 L22.5 21 L18 20 L22.5 19Z" fill="currentColor" fillOpacity="0.6" stroke="none" />
        <circle cx="24" cy="20" r="14" strokeDasharray="3 2" strokeOpacity="0.25" />
        <path d="M16 10 C12 8 8 6 6 4" strokeOpacity="0.4" />
        <path d="M32 10 C36 8 40 6 42 4" strokeOpacity="0.4" />
    </svg>
);

const InfinityWaveIcon = () => (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={styles.bentoIcon}>
        <path d="M8 24 C8 18 14 14 20 20 C26 26 30 22 36 20 C42 18 42 30 36 28 C30 26 26 22 20 28 C14 34 8 30 8 24Z" strokeOpacity="0.9" />
        <path d="M4 20 Q12 14 20 24 Q28 34 36 24 Q44 14 44 24" strokeOpacity="0.3" strokeDasharray="2 3" />
    </svg>
);

const LotusMessageIcon = () => (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={styles.bentoIcon}>
        <path d="M8 10 L40 10 Q44 10 44 14 L44 30 Q44 34 40 34 L28 34 L20 42 L20 34 L8 34 Q4 34 4 30 L4 14 Q4 10 8 10Z" strokeOpacity="0.85" />
        <path d="M24 24 C24 18 20 14 16 16 C14 20 16 26 24 28 C32 26 34 20 32 16 C28 14 24 18 24 24Z" strokeOpacity="0.5" />
    </svg>
);

const DiyaLeafIcon = () => (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={styles.bentoIcon}>
        <path d="M24 38 C14 38 8 30 10 22 C12 14 20 10 28 14 C36 18 38 30 30 36 C28 37.5 26 38 24 38Z" strokeOpacity="0.8" />
        <path d="M24 38 L24 20" strokeOpacity="0.4" />
        <path d="M24 20 C20 14 22 8 24 6 C26 8 28 14 24 20Z" strokeOpacity="0.7" />
        <ellipse cx="24" cy="6" rx="2" ry="3" fill="currentColor" fillOpacity="0.5" stroke="none" />
    </svg>
);

const MeditateIcon = () => (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={styles.bentoIcon}>
        <circle cx="24" cy="12" r="5" />
        <path d="M24 18 v4" />
        <path d="M14 38 c0-8 4-12 10-14 c6 2 10 6 10 14" />
        <path d="M10 34 c2-3 5-4 8-3" />
        <path d="M38 34 c-2-3-5-4-8-3" />
        <circle cx="24" cy="8" r="16" strokeDasharray="2 3" strokeOpacity="0.3" />
    </svg>
);

// ── Bento Dimension Data ─────────────────────────────────────────────────────

const DIMENSIONS = [
    {
        id: 'ai',
        icon: BrainSparkIcon,
        label: 'Agentic AI',
        titleEn: 'Agentic AI Partner',
        titleHi: 'AI सखा',
        descEn: 'Let Sakha Bodhi automate your schedule and manage your Sankalpa.',
        descHi: 'सखा बोधि आपका रोज़ का काम स्वचालित करता है।',
        gradient: 'linear-gradient(135deg, rgba(99,102,241,0.22) 0%, rgba(168,85,247,0.14) 100%)',
        glow: 'rgba(168,85,247,0.3)',
        accent: '#c084fc',
        href: '#',
        span: 'tall', // taller card
    },
    {
        id: 'feed',
        icon: InfinityWaveIcon,
        label: 'Holistic Feed',
        titleEn: 'Holistic Feed',
        titleHi: 'जागृत फ़ीड',
        descEn: 'Scroll through peace, not noise. Mantras, wisdom, and sacred video.',
        descHi: 'शांति से स्क्रोल करें, शोर से नहीं।',
        gradient: 'linear-gradient(135deg, rgba(20,184,166,0.22) 0%, rgba(59,130,246,0.14) 100%)',
        glow: 'rgba(20,184,166,0.3)',
        accent: '#5eead4',
        href: '/pranaverse',
        span: 'wide',
    },
    {
        id: 'chat',
        icon: LotusMessageIcon,
        label: 'Intentional Chat',
        titleEn: 'Intentional Chat',
        titleHi: 'सचेत संदेश',
        descEn: 'Connect without anxiety. Mindful messaging for meaningful connections.',
        descHi: 'बिना चिंता के जुड़ें। अर्थपूर्ण संवाद।',
        gradient: 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(239,68,68,0.12) 100%)',
        glow: 'rgba(245,158,11,0.28)',
        accent: '#fbbf24',
        href: '#',
        span: 'normal',
    },
    {
        id: 'vedic',
        icon: DiyaLeafIcon,
        label: 'Vedic Wisdom',
        titleEn: 'Vedic Wisdom & Ayurveda',
        titleHi: 'वैदिक ज्ञान',
        descEn: 'Your holistic health consultant. Ancient science, modern lifestyle.',
        descHi: 'आपका समग्र स्वास्थ्य सलाहकार।',
        gradient: 'linear-gradient(135deg, rgba(34,197,94,0.2) 0%, rgba(16,185,129,0.12) 100%)',
        glow: 'rgba(34,197,94,0.28)',
        accent: '#86efac',
        href: '/dhyan-kshetra',
        span: 'normal',
    },
    {
        id: 'meditate',
        icon: MeditateIcon,
        label: 'Dhyan Kshetra',
        titleEn: 'Dhyan Kshetra',
        titleHi: 'ध्यान क्षेत्र',
        descEn: 'Sacred mantras, Vedic chants and breath-work for inner stillness.',
        descHi: 'मंत्र, ध्यान और प्राणायाम का पवित्र क्षेत्र।',
        gradient: 'linear-gradient(135deg, rgba(251,191,36,0.18) 0%, rgba(234,179,8,0.10) 100%)',
        glow: 'rgba(251,191,36,0.28)',
        accent: '#fde68a',
        href: '/dhyan-kshetra',
        span: 'wide',
    },
];

// ── Pulsing CTA ──────────────────────────────────────────────────────────────

function PulseCTA() {
    return (
        <motion.div
            className={styles.ctaWrapper}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
        >
            {/* Pulse glow */}
            <motion.div
                className={styles.ctaGlow}
                animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0.18, 0.4] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <Link href="/pranaverse" className={styles.ctaButton}>
                <span className={styles.ctaButtonInner}>
                    <span className={styles.ctaIcon}>🕉️</span>
                    <span className={styles.ctaText}>Enter the PranaVerse</span>
                    <span className={styles.ctaSubtext}>Begin Your Stress-Free Day →</span>
                </span>
            </Link>
        </motion.div>
    );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function PillarGrid() {
    const { lang } = useLanguage();

    return (
        <section className={styles.pillarSection}>

            {/* ── Anti-Noise Manifesto ─────────────────────────── */}
            <motion.div
                className={styles.manifesto}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
            >
                <p className={styles.manifestoEyebrow}>✦ Conscious Platform ✦</p>
                <h2 className={styles.manifestoHeading}>
                    The <span className={styles.manifestoAccent}>Next Generation</span>
                    {' '}Social Platform.
                </h2>
                <p className={styles.manifestoBody}>
                    Increase productivity and decrease confusion. While other social platforms increase
                    noise and anxiety with addictive algorithms, ReZo increases your attention span and
                    synchronizes your life. Manage your everyday tasks in a stress-free, automated way.
                    Remove unnecessary confusion. Just chill and relax... we will help you manage your life.
                </p>
            </motion.div>

            {/* ── Section label ─────────────────────────────────── */}
            <motion.h3
                className={styles.sectionTitle}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.1 }}
            >
                {lang === 'hi' ? 'ReZo के' : 'The Dimensions of'}{' '}
                <span className={styles.sectionTitleAccent}>{lang === 'hi' ? 'आयाम' : 'ReZo'}</span>
            </motion.h3>

            {/* ── Bento Grid ────────────────────────────────────── */}
            <div className={styles.bentoGrid}>
                {DIMENSIONS.map((dim, i) => {
                    const Icon = dim.icon;
                    return (
                        <motion.div
                            key={dim.id}
                            className={`${styles.bentoCard} ${styles[`span_${dim.span}`]}`}
                            initial={{ opacity: 0, y: 22 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-40px' }}
                            transition={{ duration: 0.55, delay: i * 0.07, ease: 'easeOut' }}
                            whileHover={{ scale: 1.025, y: -3 }}
                        >
                            <Link href={dim.href} className={styles.bentoLink}>
                                {/* Glass bg with individual gradient */}
                                <div
                                    className={styles.bentoBg}
                                    style={{ background: dim.gradient }}
                                />
                                {/* Icon */}
                                <div className={styles.bentoIconWrap} style={{ color: dim.accent }}>
                                    <Icon />
                                </div>
                                {/* Label chip */}
                                <span className={styles.bentoLabel} style={{ color: dim.accent }}>
                                    {dim.label}
                                </span>
                                {/* Title */}
                                <h4 className={styles.bentoTitle}>
                                    {lang === 'hi' ? dim.titleHi : dim.titleEn}
                                </h4>
                                {/* Description */}
                                <p className={styles.bentoDesc}>
                                    {lang === 'hi' ? dim.descHi : dim.descEn}
                                </p>
                                {/* Hover shimmer line */}
                                <div className={styles.bentoShimmer} style={{ background: dim.accent }} />
                            </Link>
                        </motion.div>
                    );
                })}
            </div>

            {/* ── Pulsing CTA ───────────────────────────────────── */}
            <PulseCTA />

        </section>
    );
}
