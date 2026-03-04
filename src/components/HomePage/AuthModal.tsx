'use client';
/**
 * AuthModal — Global sign-in for the entire REZO app.
 * Uses the OneSUTRA glassmorphism design as the unified sign-in experience.
 * One sign-in covers the whole app — OneSUTRA, homepage, every page.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, Loader2 } from 'lucide-react';
import { useCircadianBackground } from '@/hooks/useCircadianBackground';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (displayName: string) => void;
}

// Lotus SVG — brand mark
function LotusIcon({ accent }: { accent: string }) {
    return (
        <motion.div
            animate={{ filter: [`drop-shadow(0 0 12px ${accent}80)`, `drop-shadow(0 0 32px ${accent}cc)`, `drop-shadow(0 0 12px ${accent}80)`] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 64, height: 64, margin: '0 auto 1.2rem' }}
        >
            <svg viewBox="0 0 64 64" fill="none" width="64" height="64">
                <path d="M32 52 C32 52 14 42 14 28 C14 20 20 15 26 17 C23 11 29 6 32 6 C35 6 41 11 38 17 C44 15 50 20 50 28 C50 42 32 52 32 52Z"
                    fill={`${accent}26`} stroke={accent} strokeWidth="2" strokeLinejoin="round" />
                <path d="M32 52 L32 60" stroke={accent} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                <path d="M26 59 L38 59" stroke={accent} strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
                <circle cx="32" cy="28" r="3" fill={accent} opacity="0.6" />
            </svg>
        </motion.div>
    );
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { phase, imageUrl } = useCircadianBackground('nature');
    const accent = phase.accentHex;
    const tint = phase.tint;

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError(null);
        try {
            const { getFirebaseAuth, getGoogleProvider } = await import('@/lib/firebase');
            const { signInWithPopup } = await import('firebase/auth');
            const auth = await getFirebaseAuth();
            const provider = await getGoogleProvider();
            const result = await signInWithPopup(auth, provider);

            const displayName = result.user.displayName || result.user.email || 'Sadhaka';
            const profile = {
                uid: result.user.uid,
                name: displayName,
                photoURL: result.user.photoURL,
                email: result.user.email,
            };

            // Save to all caches so OneSUTRA & dashboard recognize user instantly
            localStorage.setItem('vedic_user_name', displayName);
            localStorage.setItem('vedic_user_email', result.user.email || '');
            localStorage.setItem('vedic_user_photo', result.user.photoURL || '');
            localStorage.setItem('onesutra_auth_v1', JSON.stringify(profile));

            // Upsert to Firestore in background
            try {
                const { getFirebaseFirestore } = await import('@/lib/firebase');
                const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
                const db = await getFirebaseFirestore();
                await setDoc(doc(db, 'onesutra_users', result.user.uid), {
                    uid: result.user.uid,
                    name: displayName,
                    photoURL: result.user.photoURL ?? null,
                    email: result.user.email ?? null,
                    lastSeen: serverTimestamp(),
                }, { merge: true });
            } catch { /* offline — ok */ }

            onSuccess?.(displayName);
            onClose();
        } catch (err: any) {
            if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
                setError(null);
            } else {
                setError('Sign-in failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGuest = () => {
        localStorage.removeItem('vedic_user_name');
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                >
                    {/* Nature background */}
                    <img src={imageUrl} alt="" suppressHydrationWarning
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />
                    {/* Tint overlay */}
                    <div style={{ position: 'absolute', inset: 0, background: tint, zIndex: 1, pointerEvents: 'none' }} />

                    {/* Glassmorphism card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: 24 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 24 }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        style={{
                            position: 'relative', zIndex: 2,
                            background: 'rgba(4,6,16,0.80)',
                            backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
                            border: `1px solid ${accent}44`,
                            borderRadius: 28, padding: '3rem 2.5rem',
                            textAlign: 'center', maxWidth: 360, width: '90%',
                            boxShadow: `0 0 80px ${accent}25, 0 24px 60px rgba(0,0,0,0.55)`,
                            fontFamily: "'Inter', system-ui, sans-serif",
                        }}
                    >
                        <LotusIcon accent={accent} />

                        <h1 style={{ margin: '0 0 0.3rem', fontSize: '1.9rem', fontWeight: 600, fontFamily: "'Playfair Display', serif", color: 'white', letterSpacing: '-0.01em' }}>
                            oneSUTRA
                        </h1>
                        <p style={{ margin: '0 0 0.5rem', fontSize: '0.54rem', color: `${accent}bb`, letterSpacing: '0.24em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                            Conscious Living Platform
                        </p>
                        <p style={{ margin: '0 0 2rem', fontSize: '0.84rem', color: 'rgba(255,255,255,0.42)', lineHeight: 1.7, fontStyle: 'italic' }}>
                            {phase.label} — the perfect moment to begin
                        </p>

                        {/* Google sign-in */}
                        <motion.button
                            whileHover={{ scale: 1.02, boxShadow: `0 0 28px ${accent}55` }}
                            whileTap={{ scale: 0.97 }}
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                            style={{
                                width: '100%', padding: '0.95rem 1.5rem',
                                background: loading ? 'rgba(255,255,255,0.08)' : `linear-gradient(135deg, ${accent}50, ${accent}22)`,
                                border: `1px solid ${accent}66`,
                                borderRadius: 999, cursor: loading ? 'default' : 'pointer',
                                color: 'white', fontFamily: "'Inter', sans-serif",
                                fontSize: '0.92rem', fontWeight: 600,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                transition: 'all 0.2s',
                            }}
                        >
                            {loading
                                ? <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> Signing in…</>
                                : <><LogIn size={17} /> Continue with Google</>
                            }
                        </motion.button>

                        {error && <p style={{ color: '#f87171', fontSize: '0.72rem', marginTop: 10 }}>{error}</p>}

                        {/* Divider */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '1.2rem 0' }}>
                            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                            <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.22)', letterSpacing: '0.1em' }}>OR</span>
                            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                        </div>

                        {/* Guest */}
                        <button
                            onClick={handleGuest}
                            style={{
                                width: '100%', padding: '0.75rem',
                                background: 'transparent', border: '1px solid rgba(255,255,255,0.10)',
                                borderRadius: 999, cursor: 'pointer',
                                color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem',
                                fontFamily: "'Inter', sans-serif", transition: 'all 0.18s',
                            }}
                        >
                            Continue as Guest
                        </button>

                        <p style={{ margin: '1.2rem 0 0', fontSize: '0.6rem', color: 'rgba(255,255,255,0.18)', lineHeight: 1.6 }}>
                            Atithi Devo Bhava · Your journey is sacred &amp; private
                        </p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
