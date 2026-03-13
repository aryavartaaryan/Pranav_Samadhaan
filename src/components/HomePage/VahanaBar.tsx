'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, Globe, Briefcase, Mic } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';

export default function VahanaBar() {
    const { lang } = useLanguage();
    const pathname = usePathname();

    // 5 bottom items: Home | Sutra | Jobs & Skills | Acharya | PranaVIBEs
    const NAV = [
        {
            id: 'home', href: '/', Icon: Home,
            label: lang === 'hi' ? 'गृह' : 'Home',
        },
        {
            id: 'onesutra', href: '/onesutra', Icon: MessageCircle,
            label: lang === 'hi' ? 'सूत्र' : 'SUTRAConnect',
            isOm: true,
        },
        {
            id: 'jobs', href: '/jobs-skills', Icon: Briefcase,
            label: lang === 'hi' ? 'नौकरी & कौशल' : 'Jobs & Skills',
        },
        {
            id: 'acharya', href: '/acharya-samvad', Icon: Mic,
            label: lang === 'hi' ? 'आचार्य' : 'Acharya',
            color: '#A68AFA',
        },
        {
            id: 'pranaverse', href: '/pranaverse', Icon: Globe,
            label: lang === 'hi' ? 'ReZo' : 'PranaVIBEs',
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
            {NAV.map(({ id, href, Icon, label, ...rest }) => {
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
