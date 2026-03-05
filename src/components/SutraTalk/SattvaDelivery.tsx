'use client';
/**
 * SattvaDelivery — delivery mode picker.
 * Triggered by long-pressing the Send button.
 * Normal | Soft Send (no ping) | Dawn Send (held until 6am recipient time)
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type DeliveryMode = 'normal' | 'soft' | 'dawn';

interface Option {
    mode: DeliveryMode;
    emoji: string;
    label: string;
    sub: string;
}

const OPTIONS: Option[] = [
    { mode: 'normal', emoji: '⚡', label: 'Send Now', sub: 'Standard delivery with notification' },
    { mode: 'soft', emoji: '🌙', label: 'Soft Send', sub: 'Delivers silently — no ping, no pressure' },
    { mode: 'dawn', emoji: '🌅', label: 'Dawn Send', sub: 'Held until recipient\'s morning (6 AM)' },
];

interface Props {
    isVisible: boolean;
    accent: string;
    current: DeliveryMode;
    onSelect: (mode: DeliveryMode) => void;
    onClose: () => void;
}

export default function SattvaDelivery({ isVisible, accent, current, onSelect, onClose }: Props) {
    return (
        <AnimatePresence>
            {isVisible && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 300,
                            background: 'rgba(0,0,0,0.25)',
                            backdropFilter: 'blur(4px)',
                        }}
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ opacity: 0, y: 24, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 24, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        style={{
                            position: 'fixed', bottom: '6rem', left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 301,
                            background: 'rgba(4,6,18,0.90)',
                            backdropFilter: 'blur(40px)',
                            WebkitBackdropFilter: 'blur(40px)',
                            border: `1px solid ${accent}44`,
                            borderRadius: 20, padding: '1rem',
                            width: 'min(92vw, 360px)',
                            boxShadow: `0 0 60px ${accent}22, 0 20px 48px rgba(0,0,0,0.6)`,
                        }}
                    >
                        <p style={{
                            margin: '0 0 0.75rem 0.4rem',
                            fontSize: '0.52rem',
                            color: `${accent}88`,
                            letterSpacing: '0.22em',
                            textTransform: 'uppercase',
                            fontFamily: 'monospace',
                        }}>
                            ✦ Sattva Delivery
                        </p>

                        {OPTIONS.map((opt, i) => (
                            <motion.button
                                key={opt.mode}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.07 }}
                                whileHover={{ background: `rgba(255,255,255,0.08)` }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => { onSelect(opt.mode); onClose(); }}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                                    padding: '0.75rem 0.85rem',
                                    background: current === opt.mode ? `${accent}18` : 'transparent',
                                    border: `1px solid ${current === opt.mode ? `${accent}55` : 'rgba(255,255,255,0.07)'}`,
                                    borderRadius: 12, marginBottom: i < 2 ? '0.45rem' : 0,
                                    cursor: 'pointer', textAlign: 'left',
                                    transition: 'all 0.15s',
                                }}
                            >
                                <span style={{ fontSize: '1.4rem', width: 28, textAlign: 'center' }}>{opt.emoji}</span>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: current === opt.mode ? accent : 'rgba(255,255,255,0.88)', fontFamily: "'Inter', sans-serif" }}>
                                        {opt.label}
                                    </p>
                                    <p style={{ margin: 0, fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', fontFamily: "'Inter', sans-serif", marginTop: '0.12rem' }}>
                                        {opt.sub}
                                    </p>
                                </div>
                                {current === opt.mode && (
                                    <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: accent, boxShadow: `0 0 8px ${accent}` }} />
                                )}
                            </motion.button>
                        ))}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
