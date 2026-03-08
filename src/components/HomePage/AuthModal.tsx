'use client';
/**
 * AuthModal — Full-screen immersive oneSUTRA sign-in.
 * Single unified screen: nature background shifts with time of day.
 * No greeting, no Pranav.AI credits. Just oneSUTRA + two actions.
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, Loader2, UserCircle2 } from 'lucide-react';
import { useCircadianBackground } from '@/hooks/useCircadianBackground';
import { useRouter } from 'next/navigation';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (displayName: string) => void;
}

// ── Floating particle orb ─────────────────────────────────────────────────────
function FloatingOrb({ x, y, size, color, delay }: { x: string; y: string; size: number; color: string; delay: number }) {
    return (
        <motion.div
            animate={{
                y: [0, -18, 0],
                opacity: [0.18, 0.45, 0.18],
                scale: [1, 1.12, 1],
            }}
            transition={{ duration: 5 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
            style={{
                position: 'absolute', left: x, top: y,
                width: size, height: size,
                borderRadius: '50%',
                background: `radial-gradient(circle at 35% 35%, ${color}cc, ${color}22)`,
                filter: `blur(${size * 0.3}px)`,
                pointerEvents: 'none',
            }}
        />
    );
}

// ── Sacred geometry mandala ───────────────────────────────────────────────────
function SacredMandala({ accent }: { accent: string }) {
    return (
        <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 90, repeat: Infinity, ease: 'linear' }}
            style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}
        >
            <svg viewBox="0 0 500 500" width="500" height="500" style={{ opacity: 0.07 }}>
                {[0, 30, 60, 90, 120, 150].map(rot => (
                    <g key={rot} transform={`rotate(${rot} 250 250)`}>
                        <ellipse cx="250" cy="130" rx="60" ry="120" fill="none" stroke={accent} strokeWidth="1" />
                    </g>
                ))}
                <circle cx="250" cy="250" r="200" fill="none" stroke={accent} strokeWidth="1" />
                <circle cx="250" cy="250" r="150" fill="none" stroke={accent} strokeWidth="0.5" />
                <circle cx="250" cy="250" r="100" fill="none" stroke={accent} strokeWidth="0.5" />
                <circle cx="250" cy="250" r="50" fill="none" stroke={accent} strokeWidth="1" />
            </svg>
        </motion.div>
    );
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [imgLoaded, setImgLoaded] = useState(false);
    const { phase, imageUrl } = useCircadianBackground('nature');
    const accent = phase.accentHex;
    const router = useRouter();

    // Reset loaded state when imageUrl changes
    useEffect(() => { setImgLoaded(false); }, [imageUrl]);

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

            localStorage.setItem('vedic_user_name', displayName);
            localStorage.setItem('vedic_user_email', result.user.email || '');
            localStorage.setItem('vedic_user_photo', result.user.photoURL || '');
            localStorage.setItem('onesutra_auth_v1', JSON.stringify(profile));

            // ── Save user record to Firestore ──────────────────────────────────
            try {
                const { getFirebaseFirestore } = await import('@/lib/firebase');
                const { doc, setDoc, getDoc, serverTimestamp } = await import('firebase/firestore');
                const db = await getFirebaseFirestore();

                // Always upsert user presence record
                await setDoc(doc(db, 'onesutra_users', result.user.uid), {
                    uid: result.user.uid,
                    name: displayName,
                    photoURL: result.user.photoURL ?? null,
                    email: result.user.email ?? null,
                    lastSeen: serverTimestamp(),
                }, { merge: true });

                // ── ONBOARDING ROUTING GUARD ──────────────────────────────────
                // Check Firestore (authoritative source) for completed onboarding
                const userDoc = await getDoc(doc(db, 'users', result.user.uid));
                const userData = userDoc.data();
                const hasOnboarded = userData?.onboardingCompleted === true ||
                    userData?.hasCompletedOnboarding === true;

                if (hasOnboarded) {
                    // User has Prakriti/Dosha data — go straight to home
                    localStorage.setItem('acharya_onboarding_done', 'true');
                    onSuccess?.(displayName);
                    onClose();
                } else {
                    // New user — route to Acharya Sanctum for onboarding
                    localStorage.removeItem('acharya_onboarding_done');
                    onSuccess?.(displayName);
                    onClose();
                    router.push('/acharya-sanctum');
                }
            } catch {
                // Firestore unavailable (offline) — allow through, onboarding will catch up
                onSuccess?.(displayName);
                onClose();
            }
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
                    transition={{ duration: 0.5 }}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden',
                        fontFamily: "'Inter', system-ui, sans-serif",
                    }}
                >
                    {/* ── Layer 1: Nature photo ── */}
                    <motion.img
                        key={imageUrl}
                        src={imageUrl}
                        alt=""
                        suppressHydrationWarning
                        onLoad={() => setImgLoaded(true)}
                        initial={{ opacity: 0, scale: 1.04 }}
                        animate={{ opacity: imgLoaded ? 1 : 0, scale: 1 }}
                        transition={{ duration: 1.4, ease: 'easeOut' }}
                        style={{
                            position: 'absolute', inset: 0,
                            width: '100%', height: '100%',
                            objectFit: 'cover', objectPosition: 'center',
                        }}
                    />

                    {/* ── Layer 2: Deep dark gradient overlay ── */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: `linear-gradient(
                            160deg,
                            rgba(2,4,14,0.78) 0%,
                            rgba(4,8,22,0.65) 40%,
                            rgba(2,4,12,0.80) 100%
                        )`,
                    }} />

                    {/* ── Layer 3: Colorful accent glow ── */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: `radial-gradient(ellipse at 50% 30%, ${accent}18 0%, transparent 65%)`,
                        pointerEvents: 'none',
                    }} />

                    {/* ── Layer 4: Floating orbs ── */}
                    <FloatingOrb x="8%" y="12%" size={180} color={accent} delay={0} />
                    <FloatingOrb x="72%" y="60%" size={220} color={accent} delay={1.5} />
                    <FloatingOrb x="55%" y="5%" size={120} color="#A870E0" delay={2.8} />
                    <FloatingOrb x="5%" y="70%" size={150} color="#4A8EE8" delay={0.8} />

                    {/* ── Layer 5: Sacred mandala watermark ── */}
                    <SacredMandala accent={accent} />

                    {/* ── Main content — vertically centred, no card ── */}
                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '2rem', maxWidth: 420, width: '100%' }}>

                        {/* Logo mark */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                            style={{ marginBottom: '1.2rem' }}
                        >
                            <motion.div
                                animate={{
                                    filter: [
                                        `drop-shadow(0 0 16px ${accent}80)`,
                                        `drop-shadow(0 0 40px ${accent}ee)`,
                                        `drop-shadow(0 0 16px ${accent}80)`,
                                    ],
                                }}
                                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                            >
                                <svg viewBox="0 0 80 80" fill="none" width="80" height="80">
                                    {/* Lotus petals */}
                                    <path d="M40 68 C40 68 18 56 18 36 C18 25 25 18 33 20 C29 13 36 7 40 7 C44 7 51 13 47 20 C55 18 62 25 62 36 C62 56 40 68 40 68Z"
                                        fill={`${accent}28`} stroke={accent} strokeWidth="1.5" strokeLinejoin="round" />
                                    {/* Stem */}
                                    <path d="M40 68 L40 75" stroke={accent} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
                                    <path d="M34 74 L46 74" stroke={accent} strokeWidth="1.2" strokeLinecap="round" opacity="0.35" />
                                    {/* Centre dot */}
                                    <circle cx="40" cy="36" r="4" fill={accent} opacity="0.7" />
                                    {/* Inner glow ring */}
                                    <circle cx="40" cy="36" r="8" fill="none" stroke={accent} strokeWidth="0.8" opacity="0.35" />
                                </svg>
                            </motion.div>
                        </motion.div>

                        {/* App name */}
                        <motion.h1
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.35, duration: 0.6, ease: 'easeOut' }}
                            style={{
                                margin: '0 0 0.25rem',
                                fontSize: 'clamp(2.4rem, 9vw, 3.2rem)',
                                fontWeight: 700,
                                fontFamily: "'Playfair Display', Georgia, serif",
                                color: 'white',
                                letterSpacing: '-0.02em',
                                textShadow: `0 0 40px ${accent}44`,
                            }}
                        >
                            oneSUTRA
                        </motion.h1>

                        {/* Tagline pill */}
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.5 }}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '0.28rem 0.9rem',
                                background: `${accent}18`,
                                border: `1px solid ${accent}44`,
                                borderRadius: 999,
                                marginBottom: '2.5rem',
                            }}
                        >
                            <span style={{ fontSize: '0.52rem', color: accent, letterSpacing: '0.25em', textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }}>
                                ✦ Conscious Living Platform
                            </span>
                        </motion.div>

                        {/* ── Time-of-day ambience strip ── */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                marginBottom: '2.5rem',
                            }}
                        >
                            <div style={{ height: 1, flex: 1, background: `linear-gradient(to right, transparent, ${accent}44)` }} />
                            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                                {phase.label}
                            </span>
                            <div style={{ height: 1, flex: 1, background: `linear-gradient(to left, transparent, ${accent}44)` }} />
                        </motion.div>

                        {/* ── Google Sign In ── */}
                        <motion.button
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.65, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                            whileHover={{ scale: 1.03, boxShadow: `0 0 40px ${accent}55, 0 0 0 1px ${accent}66` }}
                            whileTap={{ scale: 0.97 }}
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                            style={{
                                width: '100%', padding: '1rem 1.5rem',
                                background: loading
                                    ? 'rgba(255,255,255,0.06)'
                                    : `linear-gradient(135deg, ${accent}60 0%, ${accent}28 100%)`,
                                border: `1.5px solid ${accent}66`,
                                borderRadius: 999,
                                cursor: loading ? 'default' : 'pointer',
                                color: 'white',
                                fontSize: '1rem', fontWeight: 700,
                                fontFamily: "'Inter', sans-serif",
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                backdropFilter: 'blur(20px)',
                                WebkitBackdropFilter: 'blur(20px)',
                                boxShadow: `0 0 28px ${accent}33, 0 8px 24px rgba(0,0,0,0.35)`,
                                transition: 'all 0.2s',
                                letterSpacing: '0.01em',
                                marginBottom: '0.9rem',
                            }}
                        >
                            {loading
                                ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Signing in…</>
                                : <><LogIn size={18} /> Continue with Google</>
                            }
                        </motion.button>

                        {/* ── Divider ── */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.75 }}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', margin: '0.1rem 0 0.9rem' }}
                        >
                            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.10)' }} />
                            <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.12em', fontFamily: 'monospace' }}>OR</span>
                            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.10)' }} />
                        </motion.div>

                        {/* ── Continue as Guest ── */}
                        <motion.button
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8, duration: 0.5 }}
                            whileHover={{ background: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.25)' }}
                            whileTap={{ scale: 0.97 }}
                            onClick={handleGuest}
                            style={{
                                width: '100%', padding: '0.9rem',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1.5px solid rgba(255,255,255,0.14)',
                                borderRadius: 999,
                                cursor: 'pointer',
                                color: 'rgba(255,255,255,0.62)',
                                fontSize: '0.95rem', fontWeight: 500,
                                fontFamily: "'Inter', sans-serif",
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                backdropFilter: 'blur(16px)',
                                WebkitBackdropFilter: 'blur(16px)',
                                transition: 'all 0.18s',
                                letterSpacing: '0.005em',
                            }}
                        >
                            <UserCircle2 size={18} />
                            Continue as Guest
                        </motion.button>

                        {error && (
                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                style={{ color: '#f87171', fontSize: '0.72rem', marginTop: 12 }}>
                                {error}
                            </motion.p>
                        )}

                        {/* Bottom privacy note */}
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.95 }}
                            style={{
                                margin: '2rem 0 0',
                                fontSize: '0.58rem',
                                color: 'rgba(255,255,255,0.18)',
                                lineHeight: 1.7,
                                letterSpacing: '0.04em',
                            }}
                        >
                            Your journey is sacred & private · Atithi Devo Bhava
                        </motion.p>
                    </div>

                    {/* CSS for spinner */}
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
