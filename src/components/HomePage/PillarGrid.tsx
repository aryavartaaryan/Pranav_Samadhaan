'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import styles from './PillarGrid.module.css';

/* Minimalist gold line-art SVG icons */
const MeditateIcon = () => (
    <svg className={styles.iconSvg} viewBox="0 0 48 48" fill="none" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="12" r="5" />
        <path d="M24 18 v4" />
        <path d="M14 38 c0-8 4-12 10-14 c6 2 10 6 10 14" />
        <path d="M10 34 c2-3 5-4 8-3" />
        <path d="M38 34 c-2-3-5-4-8-3" />
        <circle cx="24" cy="8" r="16" strokeDasharray="2 3" opacity="0.3" />
    </svg>
);

const JournalIcon = () => (
    <svg className={styles.iconSvg} viewBox="0 0 48 48" fill="none" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="10" y="6" width="28" height="36" rx="3" />
        <line x1="16" y1="14" x2="32" y2="14" />
        <line x1="16" y1="20" x2="28" y2="20" />
        <line x1="16" y1="26" x2="30" y2="26" />
        <line x1="16" y1="32" x2="24" y2="32" />
        <path d="M10 6 L10 42" strokeWidth="2.5" />
    </svg>
);

const ChantIcon = () => (
    <svg className={styles.iconSvg} viewBox="0 0 48 48" fill="none" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <text x="14" y="30" fontFamily="serif" fontSize="20" fill="#D4AF37" stroke="none" opacity="0.8">ॐ</text>
        <circle cx="24" cy="24" r="18" strokeDasharray="3 2" opacity="0.4" />
        <path d="M24 4 v4" opacity="0.5" />
        <path d="M24 40 v4" opacity="0.5" />
        <path d="M4 24 h4" opacity="0.5" />
        <path d="M40 24 h4" opacity="0.5" />
    </svg>
);

const BreatheIcon = () => (
    <svg className={styles.iconSvg} viewBox="0 0 48 48" fill="none" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="24" r="8" opacity="0.3" />
        <circle cx="24" cy="24" r="14" strokeDasharray="4 3" opacity="0.5" />
        <circle cx="24" cy="24" r="20" strokeDasharray="2 4" opacity="0.3" />
        <path d="M24 4 c0 6-6 10-6 16 s6 10 6 16" opacity="0.6" />
        <path d="M24 4 c0 6 6 10 6 16 s-6 10-6 16" opacity="0.6" />
    </svg>
);

const GratitudeIcon = () => (
    <svg className={styles.iconSvg} viewBox="0 0 48 48" fill="none" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M24 38 S10 28 10 18 a8 8 0 0 1 14-5 a8 8 0 0 1 14 5 c0 10-14 20-14 20z" />
        <path d="M24 20 v10" opacity="0.5" />
        <path d="M20 26 h8" opacity="0.5" />
    </svg>
);

interface PillarData {
    id: string;
    icon: React.FC;
    titleHi: string;
    titleEn: string;
    subtitleHi: string;
    subtitleEn: string;
    descHi: string;
    descEn: string;
    href: string;
}

const PILLARS: PillarData[] = [
    {
        id: 'meditate',
        icon: MeditateIcon,
        titleHi: 'ध्यान',
        titleEn: 'Meditate',
        subtitleHi: 'अंतर्मुख',
        subtitleEn: 'Go Within',
        descHi: 'गहन ध्यान से आत्मशांति प्राप्त करें',
        descEn: 'Find inner peace through deep meditation',
        href: '/dhyan-kshetra',
    },
    {
        id: 'journal',
        icon: JournalIcon,
        titleHi: 'पत्रिका',
        titleEn: 'Journal',
        subtitleHi: 'आत्मचिंतन',
        subtitleEn: 'Self-Reflect',
        descHi: 'अपने विचार और अनुभव लिखें',
        descEn: 'Write your thoughts and reflections',
        href: '#',
    },
    {
        id: 'chant',
        icon: ChantIcon,
        titleHi: 'जप',
        titleEn: 'Chant',
        subtitleHi: 'मन्त्र शक्ति',
        subtitleEn: 'Mantra Power',
        descHi: 'मंत्रों की शक्ति से ऊर्जा प्राप्त करें',
        descEn: 'Harness energy through sacred mantras',
        href: '/dhyan-kshetra',
    },
    {
        id: 'breathe',
        icon: BreatheIcon,
        titleHi: 'प्राणायाम',
        titleEn: 'Breathe',
        subtitleHi: 'प्राणवायु',
        subtitleEn: 'Life Force',
        descHi: 'प्राणायाम से जीवन शक्ति बढ़ाएं',
        descEn: 'Enhance life force through pranayama',
        href: '/dhyan-kshetra',
    },
    {
        id: 'gratitude',
        icon: GratitudeIcon,
        titleHi: 'कृतज्ञता',
        titleEn: 'Gratitude',
        subtitleHi: 'धन्यवाद',
        subtitleEn: 'Give Thanks',
        descHi: 'कृतज्ञता से हृदय को प्रकाशित करें',
        descEn: 'Illuminate your heart with gratitude',
        href: '#',
    },
];

const containerVariants = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.1 },
    },
};

const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: 'easeOut' as const },
    },
};

export default function PillarGrid() {
    const { lang } = useLanguage();

    const titleLabel = lang === 'hi' ? 'पंच' : 'The Five';
    const titleAccent = lang === 'hi' ? 'स्तम्भ' : 'Pillars';

    return (
        <section className={styles.pillarSection}>
            <motion.h2
                className={styles.sectionTitle}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
            >
                {titleLabel}{' '}
                <span className={styles.sectionTitleAccent}>{titleAccent}</span>
            </motion.h2>

            <motion.div
                className={styles.grid}
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
            >
                {PILLARS.map((pillar) => {
                    const Icon = pillar.icon;
                    return (
                        <motion.div key={pillar.id} variants={cardVariants}>
                            <Link href={pillar.href} className={styles.card}>
                                <div className={styles.iconWrapper}>
                                    <Icon />
                                </div>
                                <div className={styles.cardTitle}>
                                    {lang === 'hi' ? pillar.titleHi : pillar.titleEn}
                                </div>
                                <div className={styles.cardSubtitle}>
                                    {lang === 'hi' ? pillar.subtitleHi : pillar.subtitleEn}
                                </div>
                                <div className={styles.cardDescription}>
                                    {lang === 'hi' ? pillar.descHi : pillar.descEn}
                                </div>
                            </Link>
                        </motion.div>
                    );
                })}
            </motion.div>
        </section>
    );
}
