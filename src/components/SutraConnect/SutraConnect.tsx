'use client';
/**
 * SutraConnect.tsx — Unified Messaging Hub Component
 * ─────────────────────────────────────────────────────────────────────────────
 * This is the single, self-contained SutraConnect feature component.
 *
 * WHAT IT RENDERS (based on state):
 *   ┌─────────────────────────────────────────────────────────────────────────┐
 *   │  telegram_synced = false   →  "Link Telegram" banner + modal           │
 *   │  telegram_synced = true    →  Synced status card + Dual-user chat      │
 *   └─────────────────────────────────────────────────────────────────────────┘
 *
 * PHASE 2 FIXES:
 *   - The "Link Telegram" CTA is ALWAYS rendered when not synced.
 *     Previous implementation relied on a parent to pass state down —
 *     now this component owns all Telegram UI logic internally.
 *   - The modal is mobile-responsive with a full-screen overlay.
 *   - Input validation and keyboard-submit handlers are included.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelegramWeb } from '@/hooks/useTelegramWeb';
import { useSutraConnectStore } from '@/stores/sutraConnectStore';
import { useOneSutraAuth } from '@/hooks/useOneSutraAuth';
import { setInDecOnTelegramLink } from '@/lib/inDecUtils';

// ─────────────────────────────────────────────────────────────────────────────
// SutraConnect — Top-level export
// ─────────────────────────────────────────────────────────────────────────────

export default function SutraConnect() {
    // Global auth state
    const { user } = useOneSutraAuth();

    // THIS is the critical conditional check: is this user's Telegram linked?
    const isTelegramSynced = useSutraConnectStore((s) => s.isTelegramSynced);
    const contactMap = useSutraConnectStore((s) => s.contactMap);
    const contactCount = Object.keys(contactMap).length;
    const dualUserCount = Object.values(contactMap).filter((c) => c.is_onesutra_user).length;

    // Modal open/close state
    const [showModal, setShowModal] = useState(false);

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div style={{ width: '100%', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
            {/* ── PHASE 2: CONDITIONAL RENDERING ─────────────────────────────────
          This is the critical fix: if NOT synced, always show the banner.
          Previously this was hidden. Now it's the FIRST thing rendered.
      ─────────────────────────────────────────────────────────────────────── */}
            {!isTelegramSynced ? (
                <TelegramLinkBanner onLink={() => setShowModal(true)} />
            ) : (
                <TelegramSyncedCard contactCount={contactCount} dualUserCount={dualUserCount} />
            )}

            {/* ── TELEGRAM AUTH MODAL ─────────────────────────────────────────── */}
            <AnimatePresence>
                {showModal && (
                    <TelegramAuthModal
                        firebaseUid={user?.uid ?? ''}
                        onSuccess={() => setShowModal(false)}
                        onClose={() => setShowModal(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// TelegramLinkBanner — The ALWAYS-VISIBLE "Link Telegram" call-to-action
// This was the source of the "UI not visible" bug — it's now a standalone card.
// ─────────────────────────────────────────────────────────────────────────────

function TelegramLinkBanner({ onLink }: { onLink: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{
                margin: '1rem',
                padding: '1.25rem',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(29,161,242,0.12) 0%, rgba(29,161,242,0.05) 100%)',
                border: '1px solid rgba(29,161,242,0.3)',
                display: 'flex', flexDirection: 'column', gap: '0.85rem',
            }}
        >
            {/* Icon + Title row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'rgba(29,161,242,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.4rem', flexShrink: 0,
                }}>✈️</div>
                <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: 'rgba(255,255,255,0.9)' }}>
                        Link Your Telegram
                    </p>
                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.73rem', color: 'rgba(255,255,255,0.45)' }}>
                        Merge Telegram contacts into your unified inbox
                    </p>
                </div>
            </div>

            {/* Feature bullets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {[
                    '● See OneSUTRA friends already on Telegram',
                    '✓ Send messages via the fastest route automatically',
                    '⚡ One tap for both Native + Telegram in one thread',
                ].map((txt) => (
                    <p key={txt} style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>{txt}</p>
                ))}
            </div>

            {/* CTA Button */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={onLink}
                style={{
                    width: '100%', padding: '0.75rem',
                    background: 'rgba(29,161,242,0.9)',
                    border: 'none', borderRadius: '12px',
                    color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                    cursor: 'pointer', letterSpacing: '0.02em',
                    boxShadow: '0 4px 20px rgba(29,161,242,0.35)',
                }}
            >
                ✈️  Connect Telegram Account
            </motion.button>
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// TelegramSyncedCard — Success state after linking
// ─────────────────────────────────────────────────────────────────────────────

function TelegramSyncedCard({
    contactCount, dualUserCount,
}: { contactCount: number; dualUserCount: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
                margin: '1rem',
                padding: '1.1rem',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.04) 100%)',
                border: '1px solid rgba(16,185,129,0.3)',
                display: 'flex', alignItems: 'center', gap: '1rem',
            }}
        >
            <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(16,185,129,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.3rem', flexShrink: 0,
            }}>✅</div>
            <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)' }}>
                    Telegram Synced Successfully
                </p>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)' }}>
                    {contactCount} cloud contacts imported · {dualUserCount} on OneSUTRA
                </p>
            </div>
            <div style={{
                padding: '0.3rem 0.65rem', borderRadius: 999,
                background: 'rgba(16,185,129,0.15)',
                border: '1px solid rgba(16,185,129,0.3)',
                fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'rgba(16,185,129,0.9)',
            }}>LIVE</div>
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// TelegramAuthModal — Mobile-responsive full-screen auth flow
// ─────────────────────────────────────────────────────────────────────────────

interface TelegramAuthModalProps {
    firebaseUid: string;
    onSuccess: () => void;
    onClose: () => void;
}

export function TelegramAuthModal({ firebaseUid, onSuccess, onClose }: TelegramAuthModalProps) {
    const { step, error, contactCount, isMockMode, submitPhone, submitCode } = useTelegramWeb();

    const [phone, setPhone] = useState('');
    const [code, setCode] = useState(['', '', '', '', '']); // 5-digit OTP array
    const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Write success to Firestore when session is established
    const setTelegramSynced = useSutraConnectStore((s) => s.setTelegramSynced);

    useEffect(() => {
        if (step === 'READY' && firebaseUid) {
            // Persist telegram_synced flag AND in_dec field to Firestore
            (async () => {
                try {
                    const { getFirebaseFirestore } = await import('@/lib/firebase');
                    const { doc, setDoc } = await import('firebase/firestore');
                    const db = await getFirebaseFirestore();
                    
                    // Get the phone from the auth process (stored in component state)
                    // For now, we'll update with just the synced flag
                    await setDoc(doc(db, 'onesutra_users', firebaseUid), {
                        telegram_synced: true,
                        in_dec: true, // CRITICAL: Mark as dual-user since they linked Telegram
                        telegram_linked_at: Date.now(),
                    }, { merge: true });
                    
                    console.log(`[SutraConnect] Set in_dec=true for user ${firebaseUid}`);
                } catch (err) {
                    console.error('[SutraConnect] Failed to update in_dec:', err);
                }
            })();

            // Delay closing so the user sees the success state
            const t = setTimeout(() => { onSuccess(); }, 2200);
            return () => clearTimeout(t);
        }
    }, [step, firebaseUid, onSuccess]);

    // ── OTP grid interaction ──────────────────────────────────────────────────
    const handleCodeChange = (idx: number, val: string) => {
        const digit = val.replace(/\D/g, '').slice(-1);
        const next = [...code];
        next[idx] = digit;
        setCode(next);
        // Auto-advance to next cell
        if (digit && idx < 4) codeRefs.current[idx + 1]?.focus();
        // Auto-submit when all 5 digits are filled
        if (digit && idx === 4) {
            const full = next.join('');
            if (full.length === 5) submitCode(full);
        }
    };

    const handleCodeKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !code[idx] && idx > 0) {
            codeRefs.current[idx - 1]?.focus();
        }
    };

    const handlePhoneSubmit = () => {
        if (phone.trim().length >= 7) submitPhone(phone.trim());
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <>
            {/* ── Backdrop ──────────────────────────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: 100,
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                }}
            />

            {/* ── Modal Sheet ───────────────────────────────────────────────────── */}
            <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                style={{
                    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101,
                    background: 'linear-gradient(160deg, #12082e 0%, #0e0a22 100%)',
                    borderRadius: '24px 24px 0 0',
                    padding: '1.5rem 1.25rem 2.5rem',
                    border: '1px solid rgba(29,161,242,0.2)',
                    borderBottom: 'none',
                    maxWidth: 520,
                    margin: '0 auto',
                }}
            >
                {/* Drag handle */}
                <div style={{
                    width: 36, height: 4, borderRadius: 2,
                    background: 'rgba(255,255,255,0.15)',
                    margin: '-0.5rem auto 1.25rem',
                }} />

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
                            ✈️ Link Telegram
                        </h2>
                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
                            {isMockMode ? '⚠️ Mock mode — no real SMS sent' : 'Secure login via Telegram MTProto'}
                        </p>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '50%', width: 32, height: 32,
                        color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.9rem',
                    }}>✕</button>
                </div>

                {/* ── Error display ─────────────────────────────────────────────── */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{
                                padding: '0.65rem 0.9rem', borderRadius: 10, marginBottom: '1rem',
                                background: 'rgba(239,68,68,0.12)',
                                border: '1px solid rgba(239,68,68,0.3)',
                                color: 'rgba(248,113,113,0.9)', fontSize: '0.78rem',
                            }}
                        >
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── STEP: INITIALIZING ────────────────────────────────────────── */}
                {(step === 'IDLE' || step === 'INITIALIZING') && (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                        <LoadingSpinner />
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', marginTop: '1rem' }}>
                            Starting secure Telegram connection…
                        </p>
                    </div>
                )}

                {/* ── STEP: WAIT_PHONE — Phone number input ─────────────────────── */}
                <AnimatePresence mode="wait">
                    {step === 'WAIT_PHONE' && (
                        <motion.div
                            key="phone"
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>
                                Mobile Number (with country code)
                            </label>
                            <input
                                type="tel"
                                inputMode="tel"
                                autoFocus
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handlePhoneSubmit()}
                                placeholder="+91 98765 43210"
                                style={{
                                    width: '100%', boxSizing: 'border-box',
                                    background: 'rgba(255,255,255,0.07)',
                                    border: '1px solid rgba(29,161,242,0.35)',
                                    borderRadius: '12px', padding: '0.85rem 1rem',
                                    color: 'rgba(255,255,255,0.9)', fontSize: '1.05rem',
                                    outline: 'none', marginBottom: '1.25rem',
                                    letterSpacing: '0.05em',
                                }}
                            />
                            <motion.button
                                whileTap={{ scale: 0.96 }}
                                onClick={handlePhoneSubmit}
                                disabled={phone.trim().length < 7}
                                style={{
                                    width: '100%', padding: '0.85rem',
                                    background: phone.trim().length >= 7
                                        ? 'rgba(29,161,242,0.9)' : 'rgba(255,255,255,0.08)',
                                    border: 'none', borderRadius: '12px',
                                    color: '#fff', fontWeight: 700, fontSize: '0.95rem',
                                    cursor: phone.trim().length >= 7 ? 'pointer' : 'not-allowed',
                                    transition: 'background 0.2s',
                                }}
                            >
                                Send OTP via Telegram →
                            </motion.button>
                            <p style={{ textAlign: 'center', fontSize: '0.68rem', color: 'rgba(255,255,255,0.28)', marginTop: '0.75rem' }}>
                                Telegram will send you a verification code
                            </p>
                        </motion.div>
                    )}

                    {/* ── STEP: VERIFYING ─────────────────────────────────────────── */}
                    {step === 'VERIFYING' && (
                        <motion.div key="verifying" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                            <LoadingSpinner color="rgba(29,161,242,0.9)" />
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', marginTop: '1rem' }}>
                                Connecting to Telegram…
                            </p>
                        </motion.div>
                    )}

                    {/* ── STEP: WAIT_CODE — 5-digit OTP grid ──────────────────────── */}
                    {step === 'WAIT_CODE' && (
                        <motion.div
                            key="code"
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1.25rem', textAlign: 'center' }}>
                                Enter the 5-digit code from your Telegram app or SMS
                            </p>

                            {/* OTP Grid */}
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                {code.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={(el) => { codeRefs.current[i] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        autoFocus={i === 0}
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleCodeChange(i, e.target.value)}
                                        onKeyDown={(e) => handleCodeKeyDown(i, e)}
                                        style={{
                                            width: 48, height: 58,
                                            textAlign: 'center', fontSize: '1.4rem', fontWeight: 700,
                                            background: digit ? 'rgba(29,161,242,0.15)' : 'rgba(255,255,255,0.07)',
                                            border: `1.5px solid ${digit ? 'rgba(29,161,242,0.6)' : 'rgba(255,255,255,0.12)'}`,
                                            borderRadius: '12px', color: 'rgba(255,255,255,0.9)',
                                            outline: 'none', transition: 'all 0.15s',
                                        }}
                                    />
                                ))}
                            </div>

                            <motion.button
                                whileTap={{ scale: 0.96 }}
                                onClick={() => { const full = code.join(''); if (full.length === 5) submitCode(full); }}
                                disabled={code.join('').length !== 5}
                                style={{
                                    width: '100%', padding: '0.85rem',
                                    background: code.join('').length === 5
                                        ? 'rgba(29,161,242,0.9)' : 'rgba(255,255,255,0.08)',
                                    border: 'none', borderRadius: '12px',
                                    color: '#fff', fontWeight: 700, fontSize: '0.95rem',
                                    cursor: code.join('').length === 5 ? 'pointer' : 'not-allowed',
                                    transition: 'background 0.2s',
                                }}
                            >
                                Verify Code →
                            </motion.button>

                            {/* Back option */}
                            <button
                                onClick={() => { setCode(['', '', '', '', '']); }}
                                style={{
                                    display: 'block', margin: '0.75rem auto 0', background: 'none',
                                    border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem',
                                    cursor: 'pointer', textDecoration: 'underline',
                                }}
                            >
                                Change phone number
                            </button>
                        </motion.div>
                    )}

                    {/* ── STEP: READY — Success state ───────────────────────────────── */}
                    {step === 'READY' && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                            style={{ textAlign: 'center', padding: '2rem 1rem' }}
                        >
                            <motion.div
                                animate={{ rotate: [0, 10, -10, 5, 0], scale: [1, 1.2, 1] }}
                                transition={{ duration: 0.7 }}
                                style={{ fontSize: '3rem', marginBottom: '1rem' }}
                            >
                                ✅
                            </motion.div>
                            <h3 style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontWeight: 700, fontSize: '1.1rem' }}>
                                Telegram Linked!
                            </h3>
                            <p style={{ margin: '0.5rem 0 0', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                                {contactCount > 0
                                    ? `${contactCount} cloud contacts synced successfully`
                                    : 'Syncing your Telegram contacts…'}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading Spinner — A minimal animated indicator
// ─────────────────────────────────────────────────────────────────────────────

function LoadingSpinner({ color = 'rgba(167,139,250,0.8)' }: { color?: string }) {
    return (
        <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            style={{
                width: 36, height: 36,
                borderRadius: '50%',
                border: `3px solid rgba(255,255,255,0.08)`,
                borderTopColor: color,
                margin: '0 auto',
            }}
        />
    );
}
