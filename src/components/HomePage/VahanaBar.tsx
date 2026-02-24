'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, BarChart2, MessageCircle, Users, Flower2, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import styles from './VahanaBar.module.css';

interface ExplorerOption {
    icon: React.FC<{ size?: number; className?: string }>;
    labelHi: string;
    labelEn: string;
    descHi: string;
    descEn: string;
    href: string;
}

const EXPLORER_OPTIONS: ExplorerOption[] = [
    {
        icon: MessageCircle,
        labelHi: 'AI गुरु आचार्य प्रणव',
        labelEn: 'AI Guru Acharya Pranav',
        descHi: 'आयुर्वेदिक स्वास्थ्य सलाह प्राप्त करें',
        descEn: 'Get Ayurvedic health guidance',
        href: '/acharya-samvad',
    },
    {
        icon: Users,
        labelHi: 'समुदाय',
        labelEn: 'Community',
        descHi: 'वैदिक साधकों से जुड़ें',
        descEn: 'Connect with Vedic seekers',
        href: '#',
    },
    {
        icon: Flower2,
        labelHi: 'ध्यान कक्ष',
        labelEn: 'Meditation Room',
        descHi: 'दिव्य ध्यान क्षेत्र में प्रवेश करें',
        descEn: 'Enter the divine meditation zone',
        href: '/dhyan-kshetra',
    },
];

export default function VahanaBar() {
    const { lang } = useLanguage();
    const pathname = usePathname();
    const [explorerOpen, setExplorerOpen] = useState(false);

    const toggleExplorer = useCallback(() => {
        setExplorerOpen((prev) => !prev);
    }, []);

    const closeExplorer = useCallback(() => {
        setExplorerOpen(false);
    }, []);

    return (
        <>
            {/* Explorer backdrop overlay */}
            {explorerOpen && (
                <div className={styles.explorerOverlay} onClick={closeExplorer} />
            )}

            {/* Explorer slide-up panel */}
            <div className={`${styles.explorerPanel} ${explorerOpen ? styles.explorerPanelOpen : ''}`}>
                <div className={styles.explorerHeader}>
                    <span className={styles.explorerTitle}>
                        {lang === 'hi' ? '🧭 अन्वेषक' : '🧭 Explorer'}
                    </span>
                    <button className={styles.explorerClose} onClick={closeExplorer}>
                        <X size={18} />
                    </button>
                </div>

                <div className={styles.explorerItems}>
                    {EXPLORER_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        return (
                            <Link
                                key={opt.href + opt.labelEn}
                                href={opt.href}
                                className={styles.explorerItem}
                                onClick={closeExplorer}
                            >
                                <div className={styles.explorerItemIcon}>
                                    <Icon size={22} />
                                </div>
                                <div className={styles.explorerItemText}>
                                    <span className={styles.explorerItemLabel}>
                                        {lang === 'hi' ? opt.labelHi : opt.labelEn}
                                    </span>
                                    <span className={styles.explorerItemDesc}>
                                        {lang === 'hi' ? opt.descHi : opt.descEn}
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Navigation Bar */}
            <nav className={styles.vahanaBar}>
                {/* Home */}
                <Link
                    href="/"
                    className={`${styles.navItem} ${pathname === '/' ? styles.navItemActive : ''}`}
                >
                    <Home size={20} />
                    <span className={styles.navLabel}>
                        {lang === 'hi' ? 'गृह' : 'Home'}
                    </span>
                </Link>

                {/* Explorer */}
                <button
                    className={`${styles.navItem} ${styles.explorerBtn} ${explorerOpen ? styles.navItemActive : ''}`}
                    onClick={toggleExplorer}
                >
                    <Compass size={20} />
                    <span className={styles.navLabel}>
                        {lang === 'hi' ? 'अन्वेषक' : 'Explorer'}
                    </span>
                </button>

                {/* Progress Analytics */}
                <Link
                    href="/analytics"
                    className={`${styles.navItem} ${pathname === '/analytics' ? styles.navItemActive : ''}`}
                >
                    <BarChart2 size={20} />
                    <span className={styles.navLabel}>
                        {lang === 'hi' ? 'प्रगति' : 'Progress'}
                    </span>
                </Link>
            </nav>
        </>
    );
}
