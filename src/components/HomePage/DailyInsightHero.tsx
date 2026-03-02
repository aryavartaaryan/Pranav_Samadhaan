'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User, Briefcase, Flame, Globe } from 'lucide-react';
import { useTimeOfDay } from '@/hooks/useTimeOfDay';
import { useLanguage } from '@/context/LanguageContext';
import CelestialHeaderIcon from '@/components/Dashboard/CelestialHeaderIcon';

// ── Expanding search bar ──────────────────────────────────────────────────────
function SearchPill() {
    const [open, setOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <motion.div
            animate={{ width: open ? 160 : 40 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            style={{
                height: 40, borderRadius: 999,
                background: open ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'center', overflow: 'hidden',
                cursor: 'pointer',
            }}
            onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        >
            <span style={{ flexShrink: 0, width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Search size={15} strokeWidth={1.8} color="rgba(255,255,255,0.65)" />
            </span>
            <AnimatePresence>
                {open && (
                    <motion.input
                        ref={inputRef}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onBlur={() => setOpen(false)}
                        placeholder="Search…"
                        style={{
                            flex: 1, background: 'none', border: 'none', outline: 'none',
                            color: 'rgba(255,255,255,0.9)', fontSize: 13, paddingRight: 12,
                        }}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ── Nav link with icon + label ────────────────────────────────────────────────
function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
    const [hovered, setHovered] = useState(false);
    return (
        <Link
            href={href}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                textDecoration: 'none', padding: '0 0.5rem',
                transition: 'all 0.25s',
            }}
        >
            <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, borderRadius: '50%',
                background: hovered ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.06)',
                border: hovered ? '1px solid rgba(212,175,55,0.35)' : '1px solid rgba(255,255,255,0.08)',
                color: hovered ? 'rgba(212,175,55,0.95)' : 'rgba(255,255,255,0.62)',
                filter: hovered ? 'drop-shadow(0 0 8px rgba(212,175,55,0.5))' : 'none',
                transition: 'all 0.25s ease',
            }}>
                {icon}
            </span>
            <span style={{
                fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
                fontFamily: 'system-ui, sans-serif',
                color: hovered ? 'rgba(212,175,55,0.85)' : 'rgba(255,255,255,0.38)',
                transition: 'color 0.25s',
                whiteSpace: 'nowrap',
            }}>
                {label}
            </span>
        </Link>
    );
}

interface Props {
    displayName?: string;
    greeting?: { emoji: string; text: string; period: string } | null;
}

export default function DailyInsightHero({ displayName = 'Traveller', greeting }: Props) {
    const tod = useTimeOfDay();
    const { lang } = useLanguage();

    const greetText = greeting?.text ?? tod.label;
    const greetSub = greeting?.period ?? (lang === 'hi' ? tod.sanskrit : 'Your Conscious OS · Good to see you');

    return (
        <section style={{
            width: '100%',
            padding: '0 0 1.5rem',
            display: 'flex',
            flexDirection: 'column',
        }}>
            {/* ── Floating glassmorphic header pill ────────────────── */}
            <motion.header
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                style={{
                    margin: '0.75rem 0.75rem 0',
                    padding: '0.55rem 1rem 0.55rem 1rem',
                    borderRadius: '2rem',
                    background: 'rgba(8,8,18,0.58)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                }}
            >
                {/* Left: wordmark */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                        fontSize: '1.05rem', fontWeight: 700,
                        color: 'rgba(255,255,255,0.92)',
                    }}>ReZo</span>
                    <span style={{
                        fontSize: '0.48rem', letterSpacing: '0.22em', textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.32)', fontFamily: 'monospace',
                    }}>Pranav.AI</span>
                </div>

                {/* Right: nav links + search */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <NavLink href="/profile" icon={<User size={13} strokeWidth={1.7} />} label="Profile" />
                    <NavLink href="/jobs" icon={<Briefcase size={13} strokeWidth={1.7} />} label="Jobs" />
                    <NavLink href="/dhyan-kshetra" icon={<Flame size={13} strokeWidth={1.7} />} label="Meditate" />
                    <NavLink href="/project-leela" icon={<Globe size={13} strokeWidth={1.7} />} label="Leela" />
                    <SearchPill />
                </div>
            </motion.header>

            {/* ── Greeting — editorial, whisper-quiet ────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.35 }}
                style={{
                    padding: '3rem 1.5rem 2.5rem',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', textAlign: 'center', gap: '0.6rem',
                }}
            >
                {/* Period badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.25rem' }}>
                    <CelestialHeaderIcon />
                    <span style={{
                        fontSize: '0.55rem', letterSpacing: '0.32em', textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace',
                    }}>{tod.period}</span>
                </div>

                {/* Main greeting — scaled down */}
                <motion.h1
                    key={greetText}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.9 }}
                    style={{
                        margin: 0,
                        fontFamily: "'Playfair Display', Georgia, serif",
                        fontSize: 'clamp(1.6rem, 5vw, 2.4rem)',   // ← max text-4xl
                        fontWeight: 600, lineHeight: 1.18,
                        color: 'rgba(255,255,255,0.92)',
                        letterSpacing: '-0.01em',
                        textShadow: '0 2px 24px rgba(0,0,0,0.5)',
                    }}
                >
                    {greetText},{' '}
                    <span style={{
                        color: tod.accent,
                        filter: `drop-shadow(0 0 14px ${tod.accent}80)`,
                    }}>
                        {displayName}
                    </span>
                </motion.h1>

                {/* Subtext — calm whisper */}
                <p style={{
                    margin: 0, fontSize: '0.72rem',
                    color: 'rgba(255,255,255,0.38)',
                    letterSpacing: '0.06em', fontStyle: 'italic',
                    fontFamily: 'system-ui, sans-serif',
                }}>
                    {greetSub}
                </p>

                {/* Sanskrit period label */}
                <span style={{
                    marginTop: '0.5rem',
                    fontSize: '0.62rem', letterSpacing: '0.24em', textTransform: 'uppercase',
                    color: `${tod.accent}60`, fontFamily: 'monospace',
                }}>
                    {tod.sanskrit} · {tod.raagTitle}
                </span>
            </motion.div>
        </section>
    );
}
