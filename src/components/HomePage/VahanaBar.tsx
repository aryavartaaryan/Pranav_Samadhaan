'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageSquare, Search, MessageCircle, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';

// ── Expanding inline search overlay ──────────────────────────────────────────
function SearchItem() {
    const [open, setOpen] = useState(false);
    return (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <AnimatePresence>
                {open && (
                    <motion.div
                        key="search-overlay"
                        initial={{ opacity: 0, scaleX: 0.7 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        exit={{ opacity: 0, scaleX: 0.7 }}
                        transition={{ type: 'spring', stiffness: 360, damping: 26 }}
                        style={{
                            position: 'absolute',
                            bottom: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            marginBottom: 8,
                            width: 220,
                            background: 'rgba(6,4,18,0.92)',
                            backdropFilter: 'blur(24px)',
                            WebkitBackdropFilter: 'blur(24px)',
                            border: '1px solid rgba(255,255,255,0.10)',
                            borderRadius: 14,
                            padding: '0.45rem 0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            boxShadow: '0 -6px 30px rgba(0,0,0,0.6)',
                        }}
                    >
                        <Search size={13} style={{ color: 'rgba(212,175,55,0.7)', flexShrink: 0 }} />
                        <input
                            autoFocus
                            onBlur={() => setOpen(false)}
                            placeholder="Search Pranav.AI…"
                            style={{
                                flex: 1, background: 'none', border: 'none', outline: 'none',
                                color: 'rgba(255,255,255,0.88)', fontSize: 12.5,
                                fontFamily: 'system-ui, sans-serif',
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                whileTap={{ scale: 0.86 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                onClick={() => setOpen(o => !o)}
                style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: 3, paddingBlock: '0.35rem',
                    borderRadius: '1.25rem', cursor: 'pointer',
                    width: '100%',
                }}
            >
                <Search
                    size={19} strokeWidth={open ? 2.1 : 1.6}
                    style={{
                        color: open ? 'rgba(212,175,55,0.95)' : 'rgba(255,255,255,0.40)',
                        transition: 'color 0.25s',
                    }}
                />
                <span style={{
                    fontSize: 9.5, fontWeight: open ? 600 : 400,
                    fontFamily: 'system-ui, sans-serif',
                    letterSpacing: '0.01em',
                    color: open ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.34)',
                    transition: 'color 0.25s',
                }}>Search</span>
            </motion.div>
        </div>
    );
}

export default function VahanaBar() {
    const { lang } = useLanguage();
    const pathname = usePathname();

    // Profile lives in StickyTopNav (top header) only.
    // 5 bottom items: Home | Sutra | Search | Acharya | +VeFeeds
    const NAV = [
        {
            id: 'home', href: '/', Icon: Home,
            label: lang === 'hi' ? 'गृह' : 'Home',
        },
        {
            id: 'sutra', href: '/sutra', Icon: MessageSquare,
            label: lang === 'hi' ? 'सूत्र' : 'SUTRA',
        },
        // 'search' is rendered separately via <SearchItem />
        {
            id: 'acharya', href: '/acharya-samvad', Icon: MessageCircle,
            label: lang === 'hi' ? 'आचार्य' : 'Acharya',
        },
        {
            id: 'pranaverse', href: '/pranaverse', Icon: Globe,
            label: lang === 'hi' ? 'ReZo' : '+VeFeeds',
            accent: true,
        },
    ] as const;

    return (
        <nav style={{
            position: 'fixed', bottom: 14, left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9000,
            width: 'min(96vw, 440px)',   // wider to fit 5 items
            padding: '0.45rem 0.75rem',
            borderRadius: '2rem',
            background: 'rgba(6,4,18,0.80)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            border: '1px solid rgba(255,255,255,0.09)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        }}>
            {/* Home */}
            {NAV.slice(0, 2).map(({ id, href, Icon, label, ...rest }) => {
                const isActive = (id === 'home' && pathname === '/') ||
                    (id !== 'home' && pathname.startsWith(href));
                const isAccent = 'accent' in rest && rest.accent;
                return (
                    <Link key={id} href={href} style={{ textDecoration: 'none', flex: 1 }}>
                        <motion.div
                            whileTap={{ scale: 0.86 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                            style={{
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center',
                                gap: 3, paddingBlock: '0.35rem',
                                borderRadius: '1.25rem', position: 'relative',
                            }}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="vahana-active"
                                    style={{
                                        position: 'absolute', inset: 0, borderRadius: '1.25rem',
                                        background: 'rgba(255,255,255,0.08)',
                                    }}
                                    transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                                />
                            )}
                            <Icon
                                size={19} strokeWidth={isActive ? 2.1 : 1.6}
                                style={{
                                    color: isActive ? 'rgba(255,255,255,0.95)'
                                        : isAccent ? 'rgba(251,146,60,0.85)'
                                            : 'rgba(255,255,255,0.40)',
                                    transition: 'color 0.25s', position: 'relative', zIndex: 1,
                                }}
                            />
                            <span style={{
                                fontSize: 9.5, fontWeight: isActive ? 600 : 400,
                                fontFamily: 'system-ui, sans-serif',
                                letterSpacing: '0.01em',
                                color: isActive ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.34)',
                                transition: 'color 0.25s', position: 'relative', zIndex: 1,
                            }}>{label}</span>
                        </motion.div>
                    </Link>
                );
            })}

            {/* Search — center position */}
            <SearchItem />

            {/* Acharya + +VeFeeds */}
            {NAV.slice(2).map(({ id, href, Icon, label, ...rest }) => {
                const isActive = pathname.startsWith(href);
                const isAccent = 'accent' in rest && rest.accent;
                return (
                    <Link key={id} href={href} style={{ textDecoration: 'none', flex: 1 }}>
                        <motion.div
                            whileTap={{ scale: 0.86 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                            style={{
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center',
                                gap: 3, paddingBlock: '0.35rem',
                                borderRadius: '1.25rem', position: 'relative',
                            }}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="vahana-active"
                                    style={{
                                        position: 'absolute', inset: 0, borderRadius: '1.25rem',
                                        background: 'rgba(255,255,255,0.08)',
                                    }}
                                    transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                                />
                            )}
                            {isAccent && (
                                <motion.div
                                    animate={{ boxShadow: ['0 0 0 0 rgba(251,146,60,0)', '0 0 0 5px rgba(251,146,60,0.22)', '0 0 0 0 rgba(251,146,60,0)'] }}
                                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                                    style={{ position: 'absolute', width: 36, height: 36, borderRadius: '50%', border: '1.5px solid rgba(251,146,60,0.50)' }}
                                />
                            )}
                            <Icon
                                size={19} strokeWidth={isActive ? 2.1 : 1.6}
                                style={{
                                    color: isActive ? 'rgba(255,255,255,0.95)'
                                        : isAccent ? 'rgba(251,146,60,0.85)'
                                            : 'rgba(255,255,255,0.40)',
                                    transition: 'color 0.25s', position: 'relative', zIndex: 1,
                                }}
                            />
                            <span style={{
                                fontSize: 9.5, fontWeight: isActive ? 600 : 400,
                                fontFamily: 'system-ui, sans-serif',
                                letterSpacing: isAccent ? '0.04em' : '0.01em',
                                color: isActive ? 'rgba(255,255,255,0.88)'
                                    : isAccent ? 'rgba(251,146,60,0.78)'
                                        : 'rgba(255,255,255,0.34)',
                                transition: 'color 0.25s', position: 'relative', zIndex: 1,
                            }}>{label}</span>
                        </motion.div>
                    </Link>
                );
            })}
        </nav>
    );
}
