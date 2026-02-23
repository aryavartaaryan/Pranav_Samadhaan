'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Flame, User, Sparkles, Leaf, Home, MessageCircle, Menu, X, Languages } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import styles from './Navbar.module.css';

export default function Navbar() {
    const { lang, toggleLanguage } = useLanguage();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Lock body scroll when menu is open
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isMenuOpen]);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const closeMenu = () => setIsMenuOpen(false);

    const navTranslations = {
        hi: {
            home: "प्रारम्भ",
            rasoi: "आयुर्वेदिक भोजन",
            rasoiSecondary: "(अन्नपूर्णा)",
            rasoiMobile: "भोजन परामर्श",
            acharya: "आचार्य संवाद",
            dhyan: "विशेष ध्यान क्षेत्र"
        },
        en: {
            home: "Home",
            rasoi: "Ayurvedic Food",
            rasoiSecondary: "(Annapurna)",
            rasoiMobile: "Food Consultation",
            acharya: "Acharya Samvad",
            dhyan: "Dhyan Kshetra"
        }
    };

    const t = navTranslations[lang] || navTranslations.hi;

    return (
        <nav className={styles.navbar}>
            <div className={styles.navHeader}>
                <Link href="/" className={styles.logoLink} onClick={closeMenu}>
                    <Flame size={28} className={styles.logoIcon} />
                    <span>Pranav Samadhaan</span>
                </Link>

                <button
                    className={styles.hamburgerBtn}
                    onClick={toggleMenu}
                    aria-label="Toggle menu"
                >
                    {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
                </button>
            </div>

            {/* Desktop Links */}
            <div className={`${styles.navLinks} ${styles.desktopOnly}`}>
                <Link href="/" className={styles.navLink}>
                    <Home size={18} /> {t.home}
                </Link>
                <Link href="/vedic-rasoi" className={styles.navLink}>
                    <Sparkles size={18} color="var(--accent-saffron)" />
                    <span>
                        {t.rasoi}
                        <span style={{ display: 'block', fontSize: '0.75em', marginTop: '-2px', opacity: 0.8 }}>
                            {t.rasoiSecondary}
                        </span>
                    </span>
                </Link>
                <Link href="/acharya-samvad" className={styles.navLink}>
                    <MessageCircle size={18} /> {t.acharya}
                </Link>
                <Link href="/dhyan-kshetra" className={`${styles.navLink} ${styles.dhyanLink}`}>
                    <Leaf size={18} color="var(--accent-amber)" /> {t.dhyan}
                </Link>
            </div>

            <div className={`${styles.actions} ${styles.desktopOnly}`}>
                <button
                    className={styles.profileBtn}
                    onClick={toggleLanguage}
                    title={lang === 'hi' ? 'Switch to English' : 'हिन्दी में बदलें'}
                >
                    <Languages size={20} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                        {lang === 'hi' ? 'EN' : 'HI'}
                    </span>
                </button>
                <button className={styles.profileBtn} aria-label="Profile">
                    <User size={20} />
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            <div className={`${styles.mobileMenuOverlay} ${isMenuOpen ? styles.open : ''}`}>
                <div className={styles.mobileLinks}>
                    <Link href="/" className={styles.mobileLink} onClick={closeMenu}>
                        <Home size={24} /> {t.home}
                    </Link>
                    <Link href="/vedic-rasoi" className={styles.mobileLink} onClick={closeMenu}>
                        <Sparkles size={24} color="var(--accent-saffron)" /> {t.rasoiMobile}
                    </Link>
                    <Link href="/acharya-samvad" className={styles.mobileLink} onClick={closeMenu}>
                        <MessageCircle size={24} /> {t.acharya}
                    </Link>
                    <Link href="/dhyan-kshetra" className={`${styles.mobileLink} ${styles.dhyanMobileLink}`} onClick={closeMenu}>
                        <Leaf size={24} color="var(--accent-amber)" /> {t.dhyan}
                    </Link>
                </div>
            </div>
        </nav>
    );
}
