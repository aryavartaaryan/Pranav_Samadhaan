'use client';
/**
 * ConsciousGateway.tsx — v4  "World's Best Landing Page" Edition
 *
 * LAYOUT
 *   Mobile  (<1100px): Full-screen OneSUTRA.png, buttons pinned bottom-center.
 *   Desktop (≥1100px): Left half = replica of same image; Right half = controls panel.
 *
 * BUTTONS (only two, no labels except the two CTA):
 *   1. Continue with Google  (triggers Firebase Google sign-in)
 *   2. Continue as Traveller (guest access)
 *
 * DESIGN: Liquid glassmorphism, golden aurora, floating Sanskrit particles.
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { Loader2 } from 'lucide-react';

// ─── Floating golden dust ─────────────────────────────────────────────────────
function GoldenDust() {
    const [pts, setPts] = useState<{ id: number; x: number; y: number; s: number; d: number; dl: number }[]>([]);
    useEffect(() => {
        setPts(Array.from({ length: 36 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: 20 + Math.random() * 80,
            s: 1 + Math.random() * 2.5,
            d: 7 + Math.random() * 10,
            dl: Math.random() * 12,
        })));
    }, []);
    return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5, overflow: 'hidden' }}>
            {pts.map(p => (
                <motion.div key={p.id}
                    animate={{ y: [0, -110, 0], opacity: [0, 0.75, 0] }}
                    transition={{ duration: p.d, repeat: Infinity, ease: 'easeInOut', delay: p.dl }}
                    style={{
                        position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
                        width: p.s, height: p.s, borderRadius: '50%',
                        background: 'rgba(220,180,80,0.95)',
                        boxShadow: '0 0 6px rgba(220,180,80,0.9)',
                    }}
                />
            ))}
        </div>
    );
}

// ─── Slow rotating sacred mandala overlay ────────────────────────────────────
function Mandala({ size = 480, opacity = 0.04 }: { size?: number; opacity?: number }) {
    return (
        <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 180, repeat: Infinity, ease: 'linear' }}
            style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 3 }}
        >
            <svg width={size} height={size} viewBox="0 0 500 500" fill="none" style={{ opacity }}>
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(a => {
                    const r = a * Math.PI / 180;
                    return <line key={a} x1={250} y1={250} x2={250 + 230 * Math.cos(r)} y2={250 + 230 * Math.sin(r)} stroke="#D4A840" strokeWidth="0.6" />;
                })}
                {[220, 170, 120, 80, 45, 18].map(r => (
                    <circle key={r} cx={250} cy={250} r={r} stroke="#D4A840" strokeWidth="0.5" />
                ))}
                {[0, 60, 120].map(rot => (
                    <g key={rot} transform={`rotate(${rot} 250 250)`}>
                        <polygon points="250,40 440,220 60,220" fill="none" stroke="#D4A840" strokeWidth="0.6" opacity="0.6" />
                    </g>
                ))}
                {[0, 45, 90, 135, 180, 225, 270, 315].map(a => {
                    const r = a * Math.PI / 180;
                    return <circle key={`node-${a}`} cx={250 + 120 * Math.cos(r)} cy={250 + 120 * Math.sin(r)} r={3} fill="#D4A840" opacity="0.5" />;
                })}
            </svg>
        </motion.div>
    );
}

// ─── SUTRAConnect Icon (replacing Google G) ──────────────────────────────────
function SUTRAConnectIcon({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgba(255,255,255,0.9)' }}>
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
        </svg>
    );
}

// ─── Compass / Traveller glyph ───────────────────────────────────────────────
function TravellerGlyph({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.8)" strokeWidth="1.4" />
            <circle cx="12" cy="12" r="2" fill="rgba(255,255,255,0.85)" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="rgba(255,255,255,0.55)" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M8 8l2.5 2.5M13.5 13.5L16 16M16 8l-2.5 2.5M10.5 13.5L8 16" stroke="rgba(255,255,255,0.38)" strokeWidth="1" strokeLinecap="round" />
            <path d="M14.5 9.5l-5 2-2 5 5-2 2-5z" stroke="rgba(255,220,100,0.85)" strokeWidth="1.2" fill="rgba(255,220,100,0.12)" />
        </svg>
    );
}

// ─── Glassmorphic button ──────────────────────────────────────────────────────
interface GlassButtonProps {
    icon: React.ReactNode;
    label: string;
    sublabel?: string;
    onClick: () => void;
    isLoading?: boolean;
    disabled?: boolean;
    variant: 'google' | 'traveller';
    delay?: number;
}

function GlassButton({ icon, label, sublabel, onClick, isLoading, disabled, variant, delay = 0 }: GlassButtonProps) {
    const [hov, setHov] = useState(false);

    const isGoogle = variant === 'google';
    const glowRgb = isGoogle ? '80,140,255' : '255,210,80';
    const borderClr = isGoogle ? 'rgba(80,140,255,0.45)' : 'rgba(255,210,80,0.45)';
    // Pure water-bubble: heavy inset and outset shadows, thick iridescent border
    const bgHov = 'transparent';
    const bgRest = 'transparent';

    return (
        <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
            {/* The little floating bubbles around the main bubble */}
            <svg style={{ position: 'absolute', top: -14, right: '5%', zIndex: 1, pointerEvents: 'none' }} width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="8" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                <circle cx="10" cy="10" r="3" fill="rgba(255,255,255,0.5)" filter="blur(1px)" />
            </svg>
            <svg style={{ position: 'absolute', bottom: -12, right: '15%', zIndex: 1, pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="5" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                <circle cx="6" cy="6" r="1.5" fill="rgba(255,255,255,0.4)" filter="blur(0.5px)" />
            </svg>
            <svg style={{ position: 'absolute', top: 10, left: '-2%', zIndex: 1, pointerEvents: 'none' }} width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="4" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
            </svg>

            <motion.button
                initial={{ opacity: 0, y: 30, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ scale: disabled ? 1 : 1.022, y: disabled ? 0 : -3 }}
                whileTap={{ scale: disabled ? 1 : 0.968 }}
                onHoverStart={() => !disabled && setHov(true)}
                onHoverEnd={() => setHov(false)}
                onClick={disabled ? undefined : onClick}
                disabled={disabled}
                style={{
                    width: 'clamp(160px, 45vw, 200px)', height: 'clamp(160px, 45vw, 200px)',
                    padding: '1rem',
                    background: 'transparent',
                    border: `1.5px solid ${hov ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.45)'}`,
                    borderRadius: '50%', // Perfect circle
                    cursor: disabled ? 'default' : 'pointer',
                    color: 'white',
                    // The core water droplet effect with magical golden lighting
                    boxShadow: hov
                        ? `inset 0 16px 32px rgba(255,255,255,0.35), inset 0 -8px 20px rgba(255,215,0,0.4), 0 0 60px rgba(255,215,0,0.65), 0 0 0 1.5px rgba(255,255,255,0.5)`
                        : `inset 0 10px 24px rgba(255,255,255,0.2), inset 0 -4px 12px rgba(255,215,0,0.15), 0 0 35px rgba(255,215,0,0.4), 0 0 0 1px rgba(255,255,255,0.25)`,
                    transition: 'all 0.4s cubic-bezier(0.22,1,0.36,1)',
                    position: 'relative', overflow: 'hidden',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '0.6rem',
                    fontFamily: "'Inter', system-ui, sans-serif",
                    margin: '0 auto', // auto horizontally center
                }}
            >
                {/* Main upper specular highlight (water droplet top reflection) */}
                <div style={{
                    position: 'absolute', top: '2%', left: '15%', right: '15%', height: '30%',
                    background: `linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 100%)`,
                    borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
                    opacity: hov ? 1 : 0.85, transition: 'opacity 0.32s',
                    pointerEvents: 'none',
                    filter: 'blur(1px)'
                }} />

                {/* Sub-surface bottom reflection */}
                <div style={{
                    position: 'absolute', bottom: '2%', left: '20%', right: '20%', height: '10%',
                    background: `radial-gradient(ellipse at bottom, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 70%)`,
                    opacity: hov ? 0.8 : 0.4, transition: 'opacity 0.32s',
                    pointerEvents: 'none',
                }} />

                {/* Hover ripple */}
                <AnimatePresence>
                    {hov && (
                        <motion.div
                            initial={{ scale: 0, opacity: 0.35 }}
                            animate={{ scale: 4, opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1.1 }}
                            style={{
                                position: 'absolute', width: 80, height: 80, borderRadius: '50%',
                                background: `radial-gradient(circle, rgba(${glowRgb},0.3) 0%, transparent 70%)`,
                                pointerEvents: 'none', left: '15%', top: '50%', transform: 'translate(-50%,-50%)',
                            }}
                        />
                    )}
                </AnimatePresence>

                {/* Icon orb */}
                <motion.div
                    animate={hov ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                    transition={{ duration: 0.7, repeat: hov ? Infinity : 0 }}
                    style={{
                        width: 'clamp(44px, 10vw, 52px)', height: 'clamp(44px, 10vw, 52px)', flexShrink: 0,
                        borderRadius: '50%',
                        background: `radial-gradient(circle at 35% 35%, rgba(${glowRgb},0.55) 0%, rgba(${glowRgb},0.10) 100%)`,
                        border: `1px solid rgba(${glowRgb},0.38)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: hov ? `0 0 28px rgba(${glowRgb},0.5)` : `0 0 10px rgba(${glowRgb},0.15)`,
                        transition: 'box-shadow 0.32s',
                    }}
                >
                    {isLoading
                        ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: `rgba(${glowRgb},1)` }} />
                        : icon}
                </motion.div>

                {/* Text */}
                <div style={{ textAlign: 'center', zIndex: 2 }}>
                    <div style={{
                        fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)', fontWeight: 700, letterSpacing: '0.02em',
                        color: 'rgba(255,255,255,0.98)', lineHeight: 1.2,
                        textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                    }}>
                        {label}
                    </div>
                </div>
            </motion.button>
        </div>
    );
}

// ─── Main Interface Panel ─────────────────────────────────────────────────────
interface Props { onSuccess: (n: string) => void; onGuest: () => void; }

function UIPanel({ onSuccess, onGuest, compact = false }: Props & { compact?: boolean }) {
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGoogle = async () => {
        setGoogleLoading(true); setError(null);
        try {
            const { getFirebaseAuth, getGoogleProvider, getFirebaseFirestore } = await import('@/lib/firebase');
            const { signInWithPopup } = await import('firebase/auth');
            const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
            const auth = await getFirebaseAuth();
            const provider = await getGoogleProvider();
            const result = await signInWithPopup(auth, provider);
            const name = result.user.displayName || result.user.email || 'Sadhaka';
            const profile = { uid: result.user.uid, name, photoURL: result.user.photoURL, email: result.user.email };
            localStorage.setItem('vedic_user_name', name);
            localStorage.setItem('vedic_user_email', result.user.email || '');
            localStorage.setItem('vedic_user_photo', result.user.photoURL || '');
            localStorage.setItem('onesutra_auth_v1', JSON.stringify(profile));
            try {
                const db = await getFirebaseFirestore();
                await setDoc(doc(db, 'onesutra_users', result.user.uid), {
                    uid: result.user.uid, name,
                    photoURL: result.user.photoURL ?? null,
                    email: result.user.email ?? null,
                    lastSeen: serverTimestamp(),
                }, { merge: true });
            } catch { /* offline ok */ }
            onSuccess(name);
        } catch (err: any) {
            if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
                setError('Sign-in failed. Please try again.');
            }
        } finally { setGoogleLoading(false); }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>

            {/* ── Logo pulse ── */}
            <motion.div
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 1, ease: [0.22, 1, 0.36, 1] }}
                style={{ marginBottom: compact ? '0.7rem' : '1.1rem' }}
            >
                <motion.div
                    animate={{ filter: ['drop-shadow(0 0 8px rgba(200,155,40,0.45))', 'drop-shadow(0 0 36px rgba(200,155,40,1))', 'drop-shadow(0 0 8px rgba(200,155,40,0.45))'] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <svg width={compact ? 46 : 58} height={compact ? 46 : 58} viewBox="0 0 60 60" fill="none" style={{ display: 'block' }}>
                        {[0, 60, 120, 180, 240, 300].map(a => {
                            const rad = a * Math.PI / 180;
                            const cx = 30 + 11 * Math.cos(rad), cy = 30 + 11 * Math.sin(rad);
                            return <ellipse key={a} cx={cx} cy={cy} rx={5} ry={10}
                                transform={`rotate(${a + 90} ${cx} ${cy})`}
                                fill="rgba(200,155,40,0.13)" stroke="#C89828" strokeWidth="0.9" />;
                        })}
                        <circle cx="30" cy="30" r="7" fill="rgba(200,155,40,0.28)" stroke="#C89828" strokeWidth="1" />
                        <circle cx="30" cy="30" r="2.5" fill="#C89828" />
                        <line x1="30" y1="43" x2="30" y2="56" stroke="#C89828" strokeWidth="0.9" strokeLinecap="round" opacity="0.38" />
                        <line x1="25" y1="54" x2="35" y2="54" stroke="#C89828" strokeWidth="0.9" strokeLinecap="round" opacity="0.28" />
                    </svg>
                </motion.div>
            </motion.div>

            {/* ── Brand name — shown only on desktop panel ── */}
            {compact && (
                <>
                    <motion.h1
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.48, duration: 0.9, ease: 'easeOut' }}
                        style={{
                            margin: '0 0 0.2rem',
                            fontSize: 'clamp(2rem,4vw,2.8rem)',
                            fontWeight: 700, fontFamily: "'Playfair Display', Georgia, serif",
                            letterSpacing: '-0.02em', lineHeight: 1.05, textAlign: 'center',
                            background: 'linear-gradient(120deg, #ffffff 0%, #C89828 30%, #fff 55%, #E8C870 100%)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                        }}
                    >
                        OneSUTRA
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.62 }}
                        style={{
                            margin: '0 0 clamp(0.5rem,1.5vh,0.8rem)',
                            fontSize: 'clamp(0.38rem,1vw,0.48rem)',
                            letterSpacing: 'clamp(0.18em,0.8vw,0.28em)',
                            color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', fontWeight: 600,
                            textAlign: 'center',
                        }}
                    >
                        NOT AN APP · YOUR CONSCIOUS OS
                    </motion.p>
                </>
            )}

            {/* ── BUTTON 1: Continue with Google ── */}
            <div style={{ width: '100%', marginBottom: compact ? '0.8rem' : '1.2rem', marginTop: compact ? 0 : '1rem' }}>
                <GlassButton
                    delay={1.1}
                    variant="google"
                    icon={<SUTRAConnectIcon size={25} />}
                    label="No Scrolls Just Vibes"
                    sublabel="Secure · Instant · Remembered across"
                    onClick={handleGoogle}
                    isLoading={googleLoading}
                    disabled={googleLoading}
                />
            </div>


            {/* ── Error ── */}
            <AnimatePresence>
                {error && (
                    <motion.p
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        style={{ color: '#f87171', fontSize: 'clamp(0.6rem,1.8vw,0.68rem)', margin: '0 0 0.6rem', letterSpacing: '0.03em', textAlign: 'center' }}
                    >
                        {error}
                    </motion.p>
                )}
            </AnimatePresence>

            {/* ── Footer micro-text ── */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.7 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', paddingBottom: 'max(env(safe-area-inset-bottom,0px),10px)' }}
            >
                <p style={{ margin: 0, fontSize: 'clamp(0.4rem,1.2vw,0.46rem)', color: 'rgba(255,255,255,0.13)', letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                    Conscious OS v1.0  ·  Atithi Devo Bhava
                </p>
            </motion.div>
        </div>
    );
}

// ─── Shared background (OneSUTRA.png + overlays) ─────────────────────────────
function BgImage({ children }: { children?: React.ReactNode }) {
    return (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            {/* Core image */}
            <motion.div
                initial={{ opacity: 0, scale: 1.06 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 2.4, ease: 'easeOut' }}
                style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'url(/OneSUTRA.png)',
                    backgroundSize: 'cover', backgroundPosition: 'center top',
                    zIndex: 0,
                }}
            />
            {/* Cinematic vignette */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 1,
                background: 'linear-gradient(180deg, rgba(0,1,10,0.38) 0%, rgba(0,2,12,0.22) 35%, rgba(0,1,10,0.55) 68%, rgba(0,0,8,0.88) 100%)',
            }} />
            {/* Side vignettes */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 1,
                background: 'linear-gradient(90deg, rgba(0,0,8,0.18) 0%, transparent 18%, transparent 82%, rgba(0,0,8,0.18) 100%)',
            }} />
            {/* Aurora glow */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
                background: `
                    radial-gradient(ellipse at 12% 6%, rgba(70,40,130,0.28) 0%, transparent 46%),
                    radial-gradient(ellipse at 88% 8%, rgba(20,100,65,0.22) 0%, transparent 42%),
                    radial-gradient(ellipse at 50% 98%, rgba(200,150,40,0.12) 0%, transparent 50%)
                `,
            }} />
            <Mandala size={520} opacity={0.045} />
            <GoldenDust />
            {children}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════
export default function ConsciousGateway({ onSuccess, onGuest }: Props) {
    const [mounted, setMounted] = useState(false);
    const [isWide, setIsWide] = useState(false);
    const [timeStr, setTimeStr] = useState('');

    useEffect(() => {
        setMounted(true);
        const tick = () => setTimeStr(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
        tick();
        const mq = window.matchMedia('(min-width: 1100px)');
        setIsWide(mq.matches);
        const h = (e: MediaQueryListEvent) => setIsWide(e.matches);

        // Use addEventListener if supported, otherwise fallback to addListener (older safari)
        if (mq.addEventListener) {
            mq.addEventListener('change', h);
        } else if (mq.addListener) {
            mq.addListener(h);
        }

        const interval = setInterval(tick, 30000);
        return () => {
            if (mq.removeEventListener) {
                mq.removeEventListener('change', h);
            } else if (mq.removeListener) {
                mq.removeListener(h);
            }
            clearInterval(interval);
        };
    }, []);

    if (!mounted) return null;



    // ════════════════════════════════════════════════════════════════════════
    // DESKTOP (≥1100px): Image left | Controls right (side-by-side)
    // ════════════════════════════════════════════════════════════════════════
    if (isWide) {
        return (
            <div style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                display: 'flex', fontFamily: "'Inter', system-ui, sans-serif",
            }}>
                {/* ── LEFT: the OneSUTRA image ── */}
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                    <BgImage />
                </div>

                {/* ── RIGHT: Controls glass panel ── */}
                <div style={{
                    width: 'clamp(380px, 38%, 500px)',
                    position: 'relative',
                    background: 'rgba(2,3,14,0.82)',
                    backdropFilter: 'blur(48px)', WebkitBackdropFilter: 'blur(48px)',
                    borderLeft: '1px solid rgba(255,255,255,0.065)',
                    display: 'flex', flexDirection: 'column',
                    overflowY: 'auto',
                }}>
                    {/* Gradient tie-in */}
                    <div style={{
                        position: 'absolute', inset: 0, pointerEvents: 'none',
                        background: `
                            linear-gradient(180deg, rgba(70,40,120,0.10) 0%, transparent 30%, rgba(200,155,40,0.06) 100%),
                            radial-gradient(ellipse at 50% 0%, rgba(80,140,255,0.07) 0%, transparent 60%)
                        `,
                    }} />
                    {/* Mini mandala for panel */}
                    <Mandala size={360} opacity={0.035} />
                    <GoldenDust />
                    <div style={{
                        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
                        padding: 'clamp(80px,10vh,120px) clamp(28px,6%,44px) clamp(24px,5vh,40px)',
                        position: 'relative', zIndex: 5,
                    }}>
                        <UIPanel onSuccess={onSuccess} onGuest={onGuest} compact />
                    </div>
                </div>

                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div >
        );
    }

    // ════════════════════════════════════════════════════════════════════════
    // MOBILE / TABLET: Full-screen image, UI pinned bottom
    // ════════════════════════════════════════════════════════════════════════
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', flexDirection: 'column',
            fontFamily: "'Inter', system-ui, sans-serif", overflow: 'hidden',
        }}>
            <BgImage />

            {/* Scrollable UI — buttons shifted to land exactly in the foundation */}
            <div style={{
                flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
                alignItems: 'center',
                position: 'relative', zIndex: 5,
                paddingLeft: 'clamp(18px,5vw,28px)',
                paddingRight: 'clamp(18px,5vw,28px)',
                marginTop: '15vh', // adjust this specifically to drop the circle into the foundation bowl
            }}>
                <div style={{ width: '100%', maxWidth: 'clamp(320px, 90vw, 420px)' }}>
                    <UIPanel onSuccess={onSuccess} onGuest={onGuest} />
                </div>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
