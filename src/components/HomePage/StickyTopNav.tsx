'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Briefcase, Flame, Globe } from 'lucide-react';

// ── Single nav link: icon + label with gold hover glow ────────────────────────
function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
    const [hovered, setHovered] = useState(false);
    return (
        <Link
            href={href}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '0 0.35rem' }}
        >
            <span style={{
                width: 30, height: 30, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: hovered ? 'rgba(212,175,55,0.14)' : 'rgba(255,255,255,0.05)',
                border: hovered ? '1px solid rgba(212,175,55,0.32)' : '1px solid rgba(255,255,255,0.07)',
                color: hovered ? 'rgba(212,175,55,0.95)' : 'rgba(255,255,255,0.58)',
                filter: hovered ? 'drop-shadow(0 0 7px rgba(212,175,55,0.45))' : 'none',
                transition: 'all 0.22s ease',
            }}>{icon}</span>
            <span style={{
                fontSize: 8.5, letterSpacing: '0.08em', textTransform: 'uppercase',
                fontFamily: 'system-ui, sans-serif',
                color: hovered ? 'rgba(212,175,55,0.80)' : 'rgba(255,255,255,0.32)',
                transition: 'color 0.22s', whiteSpace: 'nowrap',
            }}>{label}</span>
        </Link>
    );
}

export default function StickyTopNav() {
    return (
        <header style={{
            // ── STRICTLY FIXED — never scrolls away ──────────────────────────
            position: 'fixed', top: 0, left: 0, right: 0,
            zIndex: 1000,
            padding: '0.5rem 1rem',
            background: 'rgba(6,4,18,0.60)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
        }}>
            {/* Wordmark */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <span style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: '1rem', fontWeight: 700, color: 'rgba(255,255,255,0.90)',
                }}>ReZo</span>
                <span style={{
                    fontSize: '0.44rem', letterSpacing: '0.2em', textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.28)', fontFamily: 'monospace',
                }}>Pranav.AI</span>
            </div>

            {/* Nav links — Profile lives EXCLUSIVELY here */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <NavLink href="/profile" icon={<User size={12} strokeWidth={1.7} />} label="Profile" />
                <NavLink href="/jobs" icon={<Briefcase size={12} strokeWidth={1.7} />} label="Jobs" />
                <NavLink href="/dhyan-kshetra" icon={<Flame size={12} strokeWidth={1.7} />} label="Meditate" />
                <NavLink href="/project-leela" icon={<Globe size={12} strokeWidth={1.7} />} label="Leela" />
            </div>
        </header>
    );
}
