'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import styles from './SadhanaTimeline.module.css';

interface SadhanaTask {
    id: string;
    icon: string;
    titleHi: string;
    titleEn: string;
    timeHi: string;
    timeEn: string;
    defaultCompleted: boolean;
}

const SADHANA_TASKS: SadhanaTask[] = [
    {
        id: 'brahma-muhurta',
        icon: '🌅',
        titleHi: 'ब्रह्म मुहूर्त जागरण',
        titleEn: 'Brahma Muhurta Awakening',
        timeHi: 'प्रातः ४:३०',
        timeEn: '4:30 AM',
        defaultCompleted: true,
    },
    {
        id: 'pranayama',
        icon: '🌬️',
        titleHi: 'प्राणायाम अभ्यास',
        titleEn: 'Pranayama Practice',
        timeHi: 'प्रातः ५:००',
        timeEn: '5:00 AM',
        defaultCompleted: true,
    },
    {
        id: 'surya-namaskar',
        icon: '☀️',
        titleHi: 'सूर्यनमस्कार',
        titleEn: 'Surya Namaskar',
        timeHi: 'प्रातः ५:३०',
        timeEn: '5:30 AM',
        defaultCompleted: true,
    },
    {
        id: 'dhyan',
        icon: '🧘',
        titleHi: 'ध्यान साधना',
        titleEn: 'Meditation Session',
        timeHi: 'प्रातः ६:००',
        timeEn: '6:00 AM',
        defaultCompleted: false,
    },
    {
        id: 'mantra-jap',
        icon: '📿',
        titleHi: 'मन्त्र जप',
        titleEn: 'Mantra Chanting',
        timeHi: 'मध्याह्न १२:००',
        timeEn: '12:00 PM',
        defaultCompleted: false,
    },
    {
        id: 'sandhya-vandana',
        icon: '🪔',
        titleHi: 'सन्ध्या वन्दना',
        titleEn: 'Sandhya Vandana',
        timeHi: 'सायं ६:३०',
        timeEn: '6:30 PM',
        defaultCompleted: false,
    },
];

const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
        opacity: 1,
        x: 0,
        transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' as const },
    }),
};


export default function SadhanaTimeline() {
    const { lang } = useLanguage();
    const [completed, setCompleted] = useState<Record<string, boolean>>(
        Object.fromEntries(SADHANA_TASKS.map((t) => [t.id, t.defaultCompleted]))
    );

    const toggleTask = (id: string) => {
        setCompleted((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const titleLabel = lang === 'hi' ? 'दैनिक' : 'Daily';
    const titleAccent = lang === 'hi' ? 'साधना पथ' : 'Sadhana Path';

    return (
        <section className={styles.timelineSection}>
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

            <div className={styles.timeline}>
                {SADHANA_TASKS.map((task, i) => {
                    const done = completed[task.id];
                    return (
                        <motion.div
                            key={task.id}
                            className={styles.timelineItem}
                            custom={i}
                            variants={itemVariants}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: '-20px' }}
                            onClick={() => toggleTask(task.id)}
                        >
                            {/* Node circle */}
                            <motion.div
                                className={`${styles.node} ${done ? styles.nodeCompleted : ''}`}
                                animate={done ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                                transition={{ duration: 0.4 }}
                            />

                            {/* Card content */}
                            <div className={`${styles.itemCard} ${done ? styles.itemCardCompleted : ''}`}>
                                <div className={styles.itemHeader}>
                                    <span className={styles.itemIcon}>{task.icon}</span>
                                    <span className={`${styles.itemTitle} ${done ? styles.itemTitleCompleted : ''}`}>
                                        {lang === 'hi' ? task.titleHi : task.titleEn}
                                    </span>
                                    <motion.div
                                        className={`${styles.checkmark} ${done ? styles.checkmarkCompleted : ''}`}
                                        animate={done ? { scale: [0.8, 1.2, 1] } : {}}
                                        transition={{ duration: 0.3 }}
                                    >
                                        {done && <Check size={14} />}
                                    </motion.div>
                                </div>
                                <div className={styles.itemTime}>
                                    {lang === 'hi' ? task.timeHi : task.timeEn}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </section>
    );
}
