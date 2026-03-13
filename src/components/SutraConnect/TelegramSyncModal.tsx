'use client';
/**
 * TelegramSyncModal.tsx — Phase 1 UI: Telegram Account Linking
 * ─────────────────────────────────────────────────────────────────────────────
 * A premium bottom-sheet style modal that guides the user through:
 *   Step 1 → Enter mobile number
 *   Step 2 → Enter the 5-digit OTP Telegram sends
 *   Step 3 → Success animation + Firestore write happens in the hook
 *
 * Triggered automatically on the Sutra Connect page when:
 *   `user.telegram_synced === false`
 *
 * Design: Matches the existing dark purple + saffron aesthetic.
 * Uses framer-motion for smooth step transitions.
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelegramAuth } from '@/hooks/useTelegramAuth';

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface TelegramSyncModalProps {
    firebaseUid: string;
    onSuccess: () => void;
    onDismiss: () => void;
}

export default function TelegramSyncModal({
    firebaseUid,
    onSuccess,
    onDismiss,
}: TelegramSyncModalProps) {
    const { authStep, isLoading, error, startFlow, submitPhone, submitCode } =
        useTelegramAuth(firebaseUid);

    const [phoneInput, setPhoneInput] = useState('');
    const [codeDigits, setCodeDigits] = useState(['', '', '', '', '']);
    const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Auto-start the flow when modal mounts
    useEffect(() => { startFlow(); }, [startFlow]);

    // Fire the onSuccess callback once auth completes
    useEffect(() => {
        if (authStep === 'AUTHENTICATED') {
            setTimeout(onSuccess, 1400); // Allow success animation to play
        }
    }, [authStep, onSuccess]);

    // Auto-focus first OTP digit when step transitions to CODE_ENTRY
    useEffect(() => {
        if (authStep === 'CODE_ENTRY') {
            setTimeout(() => digitRefs.current[0]?.focus(), 300);
        }
    }, [authStep]);

    // Handle OTP digit input with auto-advance + backspace
    const handleDigitInput = (index: number, value: string) => {
        if (!/^\d?$/.test(value)) return; // Only digits
        const next = [...codeDigits];
        next[index] = value;
        setCodeDigits(next);

        if (value && index < 4) {
            digitRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all 5 digits filled
        if (value && index === 4) {
            const fullCode = [...next.slice(0, 4), value].join('');
            submitCode(fullCode);
        }
    };

    const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
            digitRefs.current[index - 1]?.focus();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'fixed', inset: 0, zIndex: 100,
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}
        >
            <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                style={{
                    width: '100%', maxWidth: 520,
                    background: 'linear-gradient(160deg, #0d0820 0%, #110b2d 100%)',
                    borderTop: '1px solid rgba(109,40,217,0.3)',
                    borderRadius: '24px 24px 0 0',
                    padding: '1.5rem 1.5rem 2.5rem',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Ambient glow */}
                <div style={{
                    position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
                    width: 260, height: 120,
                    background: 'radial-gradient(ellipse, rgba(29,161,242,0.25) 0%, transparent 70%)',
                    filter: 'blur(30px)', pointerEvents: 'none',
                }} />

                {/* Drag handle */}
                <div style={{
                    width: 40, height: 4, borderRadius: 999,
                    background: 'rgba(255,255,255,0.15)',
                    margin: '0 auto 1.5rem',
                }} />

                <AnimatePresence mode="wait">
                    {/* ── PHONE ENTRY STEP ─────────────────────────────────────────── */}
                    {(authStep === 'PHONE_ENTRY' || authStep === 'IDLE') && (
                        <motion.div
                            key="phone"
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            transition={{ duration: 0.28 }}
                        >
                            {/* Telegram logo + title */}
                            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                <div style={{
                                    fontSize: '3rem', marginBottom: '0.75rem',
                                    filter: 'drop-shadow(0 0 12px rgba(29,161,242,0.6))',
                                }}>✈️</div>
                                <h2 style={{
                                    color: 'rgba(255,255,255,0.92)', fontSize: '1.2rem',
                                    fontWeight: 700, margin: '0 0 0.4rem',
                                }}>Connect Telegram</h2>
                                <p style={{
                                    color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem',
                                    margin: 0, lineHeight: 1.5,
                                }}>
                                    Link your Telegram to see all messages<br />in one unified thread with your contacts.
                                </p>
                            </div>

                            {/* Phone input */}
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{
                                    display: 'block', fontSize: '0.7rem', letterSpacing: '0.12em',
                                    textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)',
                                    marginBottom: '0.5rem',
                                }}>Mobile Number</label>
                                <input
                                    type="tel"
                                    value={phoneInput}
                                    onChange={(e) => setPhoneInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') submitPhone(phoneInput); }}
                                    placeholder="+91 98765 43210"
                                    autoFocus
                                    style={{
                                        width: '100%', boxSizing: 'border-box',
                                        background: 'rgba(255,255,255,0.07)',
                                        border: '1px solid rgba(29,161,242,0.35)',
                                        borderRadius: 12,
                                        padding: '0.85rem 1.1rem',
                                        color: 'rgba(255,255,255,0.88)',
                                        fontSize: '1rem', outline: 'none',
                                        fontFamily: 'monospace',
                                    }}
                                />
                                <p style={{
                                    fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)',
                                    margin: '0.5rem 0 0', textAlign: 'center',
                                }}>
                                    Telegram will send a verification code. Standard rates apply.
                                </p>
                            </div>

                            {error && <ErrorNote text={error} />}

                            <SendButton
                                label={isLoading ? 'Sending code…' : 'Send Telegram Code'}
                                loading={isLoading}
                                accent="#1da1f2"
                                onClick={() => submitPhone(phoneInput)}
                                disabled={phoneInput.length < 8}
                            />

                            <button
                                onClick={onDismiss}
                                style={{
                                    display: 'block', margin: '0.75rem auto 0', background: 'none', border: 'none',
                                    color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', cursor: 'pointer',
                                }}>
                                Skip for now
                            </button>
                        </motion.div>
                    )}

                    {/* ── OTP ENTRY STEP ──────────────────────────────────────────── */}
                    {authStep === 'CODE_ENTRY' && (
                        <motion.div
                            key="otp"
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            transition={{ duration: 0.28 }}
                        >
                            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📱</div>
                                <h2 style={{
                                    color: 'rgba(255,255,255,0.92)', fontSize: '1.15rem',
                                    fontWeight: 700, margin: '0 0 0.4rem',
                                }}>Enter Telegram Code</h2>
                                <p style={{
                                    color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem',
                                    margin: 0, lineHeight: 1.5,
                                }}>
                                    Telegram sent a 5-digit code to your<br />Telegram app or via SMS.
                                </p>
                            </div>

                            {/* OTP digit inputs */}
                            <div style={{
                                display: 'flex', gap: '0.65rem', justifyContent: 'center',
                                marginBottom: '1.25rem',
                            }}>
                                {codeDigits.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={(el) => { digitRefs.current[i] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleDigitInput(i, e.target.value)}
                                        onKeyDown={(e) => handleDigitKeyDown(i, e)}
                                        style={{
                                            width: 52, height: 56, textAlign: 'center',
                                            background: digit ? 'rgba(29,161,242,0.15)' : 'rgba(255,255,255,0.07)',
                                            border: `1.5px solid ${digit ? 'rgba(29,161,242,0.6)' : 'rgba(255,255,255,0.12)'}`,
                                            borderRadius: 12,
                                            color: 'rgba(255,255,255,0.92)', fontSize: '1.4rem',
                                            fontWeight: 700, fontFamily: 'monospace', outline: 'none',
                                            transition: 'all 0.15s',
                                        }}
                                    />
                                ))}
                            </div>

                            {error && <ErrorNote text={error} />}

                            <SendButton
                                label={isLoading ? 'Verifying…' : 'Confirm Code'}
                                loading={isLoading}
                                accent="#1da1f2"
                                onClick={() => submitCode(codeDigits.join(''))}
                                disabled={codeDigits.some((d) => !d)}
                            />
                        </motion.div>
                    )}

                    {/* ── VERIFYING ───────────────────────────────────────────────── */}
                    {authStep === 'VERIFYING' && (
                        <motion.div
                            key="verify"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            style={{ textAlign: 'center', padding: '2rem 0' }}
                        >
                            <PulseRing color="#1da1f2" />
                            <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '1rem', fontSize: '0.88rem' }}>
                                Connecting…
                            </p>
                        </motion.div>
                    )}

                    {/* ── SUCCESS ─────────────────────────────────────────────────── */}
                    {authStep === 'AUTHENTICATED' && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            style={{ textAlign: 'center', padding: '2rem 0' }}
                        >
                            <motion.div
                                animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                                transition={{ duration: 0.6 }}
                                style={{ fontSize: '3rem', marginBottom: '1rem' }}
                            >
                                ✅
                            </motion.div>
                            <h3 style={{ color: '#4ade80', fontWeight: 700, margin: '0 0 0.4rem' }}>
                                Telegram Connected!
                            </h3>
                            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem', margin: 0 }}>
                                Your conversations are now unified.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SendButton({
    label, loading, onClick, disabled, accent,
}: {
    label: string; loading: boolean; onClick: () => void;
    disabled: boolean; accent: string;
}) {
    return (
        <motion.button
            whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
            whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
            onClick={onClick}
            disabled={disabled || loading}
            style={{
                width: '100%',
                background: disabled || loading
                    ? 'rgba(255,255,255,0.07)'
                    : `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                border: `1px solid ${disabled ? 'rgba(255,255,255,0.1)' : accent}`,
                borderRadius: 14,
                padding: '0.9rem',
                color: disabled || loading ? 'rgba(255,255,255,0.35)' : 'white',
                fontSize: '0.92rem', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s', boxShadow: disabled ? 'none' : `0 4px 20px ${accent}44`,
            }}
        >
            {loading ? '⏳ ' : ''}{label}
        </motion.button>
    );
}

function ErrorNote({ text }: { text: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 10, padding: '0.6rem 0.9rem', marginBottom: '0.9rem',
                color: '#f87171', fontSize: '0.78rem', textAlign: 'center',
            }}
        >{text}</motion.div>
    );
}

function PulseRing({ color }: { color: string }) {
    return (
        <div style={{ position: 'relative', display: 'inline-block', width: 60, height: 60 }}>
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.5 }}
                    style={{
                        position: 'absolute', inset: 0, borderRadius: '50%',
                        border: `2px solid ${color}`, transformOrigin: 'center',
                    }}
                />
            ))}
            <div style={{
                position: 'absolute', inset: '25%', borderRadius: '50%',
                background: color, boxShadow: `0 0 16px ${color}`,
            }} />
        </div>
    );
}
