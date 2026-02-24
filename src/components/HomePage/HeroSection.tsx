'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, LogIn, UserPlus } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import styles from './HeroSection.module.css';

function getTimeGreeting(lang: 'hi' | 'en') {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 12) {
        return lang === 'hi'
            ? { emoji: '🙏', text: 'शुभोदय', period: 'प्रातःकाल' }
            : { emoji: '🙏', text: 'Shubhodaya', period: 'Morning' };
    }
    if (hour >= 12 && hour < 17) {
        return lang === 'hi'
            ? { emoji: '☀️', text: 'शुभ मध्याह्न', period: 'मध्याह्न' }
            : { emoji: '☀️', text: 'Shubh Madhyahna', period: 'Afternoon' };
    }
    if (hour >= 17 && hour < 21) {
        return lang === 'hi'
            ? { emoji: '🪔', text: 'शुभ सन्ध्या', period: 'सायंकाल' }
            : { emoji: '🪔', text: 'Shubh Sandhya', period: 'Evening' };
    }
    return lang === 'hi'
        ? { emoji: '🌙', text: 'शुभ रात्रि', period: 'रात्रि' }
        : { emoji: '🌙', text: 'Shubh Ratri', period: 'Night' };
}

interface HeroSectionProps {
    onOpenAuth: () => void;
}

export default function HeroSection({ onOpenAuth }: HeroSectionProps) {
    const { lang } = useLanguage();
    const [greeting, setGreeting] = useState(getTimeGreeting(lang));

    useEffect(() => {
        setGreeting(getTimeGreeting(lang));
    }, [lang]);

    const t = {
        hi: {
            subtitle: 'कृत्रिम बुद्धिमत्ता और ऋषियों के ज्ञान का संगम — आपके शरीर, मन और आत्मा के उपचार के लिए',
            cta: 'अपनी समाधान यात्रा आरम्भ करें',
            signIn: 'साइन इन करें',
            signUp: 'साइन अप करें',
            brand: 'PRANAV.AI',
        },
        en: {
            subtitle: 'A sacred fusion of Artificial Intelligence & Wisdom of Rishis — for healing your body, mind, and spirit',
            cta: 'Begin Your Samadhaan Journey',
            signIn: 'Sign In',
            signUp: 'Sign Up',
            brand: 'PRANAV.AI',
        },
    }[lang] || {
        subtitle: 'A sacred fusion of Artificial Intelligence & Wisdom of Rishis — for healing your body, mind, and spirit',
        cta: 'Begin Your Samadhaan Journey',
        signIn: 'Sign In',
        signUp: 'Sign Up',
        brand: 'PRANAV.AI',
    };

    return (
        <section className={styles.heroContainer}>
            {/* Background Sri Yantra */}
            <div className={styles.heroBgYantra}>
                <img
                    src="/sri-yantra-authentic.png"
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
            </div>

            {/* Ambient orb */}
            <div className={styles.ambientOrb} />

            {/* Content */}
            <motion.div
                className={styles.heroContent}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, ease: 'easeOut' as const }}
            >
                <motion.div
                    className={styles.timeIcon}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' as const }}
                >
                    {greeting.emoji}
                </motion.div>

                <h1 className={styles.greeting}>
                    <span className={styles.greetingHighlight}>{greeting.text}</span>
                </h1>

                <motion.p
                    className={styles.heroSubtitle}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 1 }}
                >
                    {t.subtitle}
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.8 }}
                >
                    <Link href="/dashboard">
                        <button className={styles.heroCta}>
                            <Sparkles size={18} />
                            {t.cta}
                        </button>
                    </Link>
                </motion.div>

                <motion.div
                    className={styles.authRow}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2, duration: 0.6 }}
                >
                    <button
                        className={styles.authTrigger}
                        onClick={onOpenAuth}
                    >
                        <LogIn size={16} />
                        {t.signIn}
                    </button>
                    <button
                        className={styles.signUpTrigger}
                        onClick={onOpenAuth}
                    >
                        <UserPlus size={16} />
                        {t.signUp}
                    </button>
                </motion.div>

                <motion.div
                    className={styles.brandLine}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5, duration: 1 }}
                >
                    A Product Crafted by <span>{t.brand}</span>
                </motion.div>
            </motion.div>
        </section>
    );
}
