'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import styles from './JustVibePortals.module.css';

// ── Portal cards — same structure as original PranaVerse MINI_POSTS ───────────
const PORTALS = [
    {
        id: 'meditate',
        href: '/dhyan-kshetra',
        bg: 'linear-gradient(135deg, #0d001a 0%, #1a0840 100%)',
        emoji: '🧘',
        tag: 'ॐ RezoVibe',
        tagColor: '#b388ff',
        excerpt: 'Enter the Dhyan Kshetra — sacred space of stillness, mantra and inner light.',
        handle: '@DhyanKshetra',
        badge: 'Sacred RezoVibe',
        vibed: '2.1k',
    },
    {
        id: 'leela',
        href: '/project-leela',
        bg: 'linear-gradient(135deg, #001408 0%, #003d2c 100%)',
        emoji: '🌀',
        tag: '✦ Leela',
        tagColor: '#69ffba',
        excerpt: 'Leela — the divine illusion. The cosmic play of consciousness unfolding.',
        handle: '@ProjectLeela',
        badge: 'Divine Play · Illusion',
        vibed: '1.8k',
    },
    {
        id: 'journal',
        href: '/journal',
        bg: 'linear-gradient(135deg, #1a0a00 0%, #4a2200 100%)',
        emoji: '📖',
        tag: '✧ Journal',
        tagColor: '#ffd580',
        excerpt: 'Your sacred journal — reflect, write, and witness the mind in silence.',
        handle: '@SacredJournal',
        badge: 'Reflection · Writing',
        vibed: '934',
    },
    {
        id: 'community',
        href: '/pranaverse',
        bg: 'linear-gradient(135deg, #001535 0%, #0a244e 100%)',
        emoji: '🌐',
        tag: '❋ Community',
        tagColor: '#82cfff',
        excerpt: 'Connect with fellow seekers. Share vibes, insights and sacred moments.',
        handle: '@JustVibeVerse',
        badge: 'Seekers · Community',
        vibed: '3.4k',
    },
];

export default function JustVibePortals() {
    return (
        <div className={styles.wrapper}>
            {/* Header — same as PranaVerseMini */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <span className={styles.liveDot} />
                    <span className={styles.title}>Your Sacred Portals</span>
                </div>
            </div>

            {/* Horizontal scroll — same as PranaVerseMini */}
            <div className={styles.scroll}>
                {PORTALS.map((p, i) => (
                    <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.08 }}
                        whileHover={{ y: -3 }}
                        style={{ flexShrink: 0 }}
                    >
                        <Link href={p.href} className={styles.cardLink}>
                            <div className={styles.card} style={{ background: p.bg }}>
                                {/* Type tag */}
                                <span
                                    className={styles.typeTag}
                                    style={{ color: p.tagColor, borderColor: `${p.tagColor}44`, background: `${p.tagColor}14` }}
                                >
                                    {p.tag}
                                </span>

                                {/* Thumb emoji */}
                                <div className={styles.thumbArea}>
                                    <motion.span
                                        className={styles.thumbEmoji}
                                        animate={{ y: [0, -5, 0], filter: [`drop-shadow(0 0 10px ${p.tagColor}66)`, `drop-shadow(0 0 22px ${p.tagColor}aa)`, `drop-shadow(0 0 10px ${p.tagColor}66)`] }}
                                        transition={{ duration: 3 + i * 0.3, repeat: Infinity, ease: 'easeInOut' }}
                                    >
                                        {p.emoji}
                                    </motion.span>
                                </div>

                                {/* Excerpt */}
                                <p className={styles.excerpt}>{p.excerpt}</p>

                                {/* Footer */}
                                <div className={styles.cardFooter}>
                                    <div className={styles.miniProfile}>
                                        <span className={styles.miniRing} style={{ boxShadow: `0 0 0 2px ${p.tagColor}` }}>
                                            {p.emoji}
                                        </span>
                                        <div>
                                            <span className={styles.miniHandle}>{p.handle}</span>
                                            <span className={styles.miniBadge}>{p.badge}</span>
                                        </div>
                                    </div>
                                    <span className={styles.miniLikes}>✨ {p.vibed}</span>
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
