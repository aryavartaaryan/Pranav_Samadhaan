'use client';
/**
 * sutra/page.tsx — SutraConnect Entry Point
 * Embeds the self-contained <SutraConnect> component which manages
 * all Telegram auth, contact syncing, and unified messaging UI internally.
 */

import React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Lazy-load SutraConnect (it pulls in framer-motion + tdweb)
const SutraConnect = dynamic(
    () => import('@/components/SutraConnect/SutraConnect'),
    { ssr: false, loading: () => <PageSkeleton /> }
);

export default function SutraPage() {
    return (
        <div style={{
            minHeight: '100dvh',
            display: 'flex', flexDirection: 'column',
            background: 'linear-gradient(160deg, #0d0820 0%, #110b2d 40%, #0a0a18 100%)',
            fontFamily: 'var(--font-body, Inter, sans-serif)',
        }}>
            {/* ── Ambient glow ──────────────────────────────────────────────────── */}
            <div style={{
                position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 420, height: 180,
                background: 'radial-gradient(ellipse, rgba(109,40,217,0.15) 0%, transparent 70%)',
                filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0,
            }} />

            {/* ── HEADER ──────────────────────────────────────────────────────────── */}
            <header style={{
                position: 'sticky', top: 0, zIndex: 50,
                display: 'flex', alignItems: 'center', gap: '0.85rem',
                padding: '0.85rem 1rem',
                background: 'rgba(13,8,32,0.88)',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                borderBottom: '1px solid rgba(109,40,217,0.15)',
            }}>
                <Link href="/" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', textDecoration: 'none',
                }}>←</Link>

                <div style={{ flex: 1 }}>
                    <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
                        Sutra Connect
                    </h1>
                    <p style={{ margin: 0, fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)' }}>
                        Unified Native · Telegram Inbox
                    </p>
                </div>

                {/* Network status badge */}
                <div style={{
                    padding: '0.25rem 0.6rem', borderRadius: 999,
                    background: 'rgba(109,40,217,0.18)',
                    border: '1px solid rgba(109,40,217,0.3)',
                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                }}>
                    <div style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: 'rgba(109,40,217,0.9)',
                    }} />
                    <span style={{ fontSize: '0.6rem', color: 'rgba(167,139,250,0.9)', fontWeight: 600 }}>
                        LIVE
                    </span>
                </div>
            </header>

            {/* ── MAIN CONTENT — The SutraConnect component ───────────────────────── */}
            <main style={{ flex: 1, position: 'relative', zIndex: 1, overflowY: 'auto' }}>
                <SutraConnect />
            </main>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton loader shown while SutraConnect hydrates
// ─────────────────────────────────────────────────────────────────────────────

function PageSkeleton() {
    return (
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[80, 60, 100, 50].map((w, i) => (
                <div key={i} style={{
                    height: 14, width: `${w}%`,
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.06)',
                }} />
            ))}
        </div>
    );
}
