'use client';
/**
 * WelcomeFirstSpark — shown when a chat is opened but has no messages.
 * Floating 🙏 with bioluminescent glow + 3 ice-breaker glass pills.
 */
import React from 'react';
import { motion } from 'framer-motion';

interface Props {
    contactName: string;
    accent: string;
    onIceBreaker: (text: string) => void;
    onAutoPilotHi: () => void;
}

const ICE_BREAKERS = [
    { emoji: '🙏', label: 'Send Namaste', text: 'Namaste 🙏 — Wishing you a peaceful, purposeful day.' },
    { emoji: '🍃', label: 'Share my Vibe', text: null }, // handled separately
    { emoji: '🤖', label: 'AI AutoPilot Hi', text: null }, // handled separately
];

export default function WelcomeFirstSpark({ contactName, accent, onIceBreaker, onAutoPilotHi }: Props) {
    const handlePill = (idx: number) => {
        if (idx === 0) {
            onIceBreaker(ICE_BREAKERS[0].text!);
        } else if (idx === 1) {
            // Share "my vibe" card
            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
            const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
            onIceBreaker(`🍃 Sharing my vibe —\nTime: ${timeStr} | ${dateStr}\nFeeling: Present & grounded ✨`);
        } else {
            onAutoPilotHi();
        }
    };

    return (
        <div style={{
            flex: 1,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '1.5rem', padding: '2rem',
            textAlign: 'center',
        }}>
            {/* Floating Namaste glyph */}
            <motion.div
                animate={{
                    y: [0, -10, 0],
                    filter: [
                        `drop-shadow(0 0 18px ${accent}80)`,
                        `drop-shadow(0 0 40px ${accent}cc)`,
                        `drop-shadow(0 0 18px ${accent}80)`,
                    ],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                style={{ fontSize: '5rem', lineHeight: 1, userSelect: 'none' }}
            >
                🙏
            </motion.div>

            {/* Glow halo behind the icon */}
            <motion.div
                animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.2, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                    position: 'absolute',
                    width: 120, height: 120,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${accent}44 0%, transparent 70%)`,
                    pointerEvents: 'none',
                    marginBottom: '8rem',
                }}
            />

            {/* Text */}
            <div>
                <p style={{
                    margin: 0,
                    fontSize: 'clamp(1rem, 3vw, 1.25rem)',
                    fontWeight: 700,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    color: 'rgba(255,255,255,0.90)',
                    letterSpacing: '-0.01em',
                }}>
                    Start the flow with {contactName} ✨
                </p>
                <p style={{
                    margin: '0.35rem 0 0',
                    fontSize: '0.75rem',
                    color: 'rgba(255,255,255,0.32)',
                    fontStyle: 'italic',
                    fontFamily: "'Inter', system-ui, sans-serif",
                }}>
                    Every great conversation begins with one spark
                </p>
            </div>

            {/* Ice-breaker glass pills */}
            <div style={{
                display: 'flex', flexWrap: 'wrap',
                gap: '0.65rem', justifyContent: 'center',
            }}>
                {ICE_BREAKERS.map((item, idx) => (
                    <motion.button
                        key={item.label}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.12, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        whileHover={{ scale: 1.04, boxShadow: `0 0 22px ${accent}44` }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => handlePill(idx)}
                        style={{
                            padding: '0.6rem 1.1rem',
                            borderRadius: 999,
                            background: 'rgba(255,255,255,0.07)',
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            border: `1px solid ${accent}40`,
                            color: 'rgba(255,255,255,0.82)',
                            fontSize: '0.80rem',
                            fontWeight: 500,
                            fontFamily: "'Inter', system-ui, sans-serif",
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            boxShadow: `0 0 12px ${accent}22`,
                            transition: 'all 0.18s',
                        }}
                    >
                        <span>{item.emoji}</span>
                        <span>{item.label}</span>
                    </motion.button>
                ))}
            </div>
        </div>
    );
}
