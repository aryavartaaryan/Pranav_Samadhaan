'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './PremiumHeader.module.css';

interface PremiumHeaderProps {
    /** Page-level title shown when no greeting is needed (e.g. "Acharya Samvad") */
    title?: string;
    /** Subtitle below the title */
    subtitle?: string;
    /** Greeting object — overrides title when present */
    greeting?: { emoji: string; text: string } | null;
    /** Display name for the greeting */
    displayName?: string;
    /** Right-side action slot */
    rightSlot?: React.ReactNode;
}

export default function PremiumHeader({
    title,
    subtitle,
    greeting,
    displayName,
    rightSlot,
}: PremiumHeaderProps) {
    const [userName, setUserName] = useState(displayName || 'Traveller');
    useEffect(() => {
        if (!displayName) {
            setUserName(localStorage.getItem('vedic_user_name') || 'Traveller');
        }
    }, [displayName]);

    return (
        <header className={styles.header}>
            {/* LEFT: greeting or page title */}
            <div className={styles.left}>
                {greeting ? (
                    <>
                        <span className={styles.greetingEmoji}>{greeting.emoji}</span>
                        <div className={styles.greetingBlock}>
                            <span className={styles.greetingText}>{greeting.text}</span>
                            <span className={styles.greetingName}>{userName}</span>
                        </div>
                    </>
                ) : (
                    <div className={styles.greetingBlock}>
                        <span className={styles.pageTitle}>{title}</span>
                        {subtitle && <span className={styles.pageSub}>{subtitle}</span>}
                    </div>
                )}
            </div>

            {/* CENTER: Sanskrit wordmark */}
            <div className={styles.center}>
                <span className={styles.wordmark}>सनंव</span>
                <span className={styles.wordmarkSub}>Pranav.AI</span>
            </div>

            {/* RIGHT: bell + avatar or custom slot */}
            <div className={styles.right}>
                {rightSlot ?? (
                    <>
                        <button className={styles.bellBtn} aria-label="Notifications">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                        </button>
                        <Link href="/profile" className={styles.avatarBtn} aria-label="Profile">
                            <span>🧘</span>
                        </Link>
                    </>
                )}
            </div>
        </header>
    );
}
