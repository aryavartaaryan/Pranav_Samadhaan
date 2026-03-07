'use client';
/**
 * ReelActionSidebar — Pranaverse Reaction Sidebar v3
 * ─────────────────────────────────────────────────────────────────────────────
 *  ❤️  VIBE   — Crown Aura     (#7E22CE → #FBBF24) — real-time Firebase
 *  💬  ECHO   — Mindful Breath (#2DD4BF → #F472B6) — real-time comments
 *  ✈️  RADIATE — Dawn Awakening (#F97316 → #FDA4AF) — Instagram share sheet
 *  🌿  PLANT  — Sacred Green   (#22C55E → #86EFAC)  — real-time Firebase
 *
 * All counts start at 0 and increment globally in Firebase for every user.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePostReactions } from '@/hooks/usePostReactions';
import CommentSheet from '@/components/PranaVerse/CommentSheet';

// ─── SVG Gradient Registry ────────────────────────────────────────────────────
function GradientDefs() {
    return (
        <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none', overflow: 'hidden' }}>
            <defs>
                <linearGradient id="crown-aura" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#7E22CE" />
                    <stop offset="100%" stopColor="#FBBF24" />
                </linearGradient>
                <linearGradient id="mindful-breath" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2DD4BF" />
                    <stop offset="100%" stopColor="#F472B6" />
                </linearGradient>
                <linearGradient id="dawn-awakening" x1="0%" y1="50%" x2="100%" y2="50%">
                    <stop offset="0%" stopColor="#F97316" />
                    <stop offset="100%" stopColor="#FDA4AF" />
                </linearGradient>
                <linearGradient id="sacred-green" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#22C55E" />
                    <stop offset="100%" stopColor="#86EFAC" />
                </linearGradient>
            </defs>
        </svg>
    );
}

const orbBase: React.CSSProperties = {
    width: 54, height: 54, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(255,255,255,0.07)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(255,255,255,0.16)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.14)',
    cursor: 'pointer', position: 'relative', overflow: 'visible',
};

function Glare() {
    return (
        <div style={{
            position: 'absolute', top: 7, left: 9, width: 16, height: 8,
            borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
            filter: 'blur(4px)', pointerEvents: 'none',
        }} />
    );
}

function ParticleBurst({ active, colorA, colorB }: { active: boolean; colorA: string; colorB: string }) {
    return (
        <AnimatePresence>
            {active && Array.from({ length: 8 }).map((_, i) => {
                const angle = (i / 8) * 360;
                const rad = (angle * Math.PI) / 180;
                const dist = 36 + (i % 3) * 9;
                return (
                    <motion.span key={i}
                        initial={{ x: 0, y: 0, scale: 1, opacity: 0.9 }}
                        animate={{ x: Math.cos(rad) * dist, y: Math.sin(rad) * dist, scale: 0, opacity: 0 }}
                        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: i * 0.02 }}
                        style={{
                            position: 'absolute', width: 4 + (i % 3), height: 4 + (i % 3),
                            borderRadius: '50%', background: i % 2 === 0 ? colorA : colorB,
                            pointerEvents: 'none', zIndex: 5,
                        }}
                    />
                );
            })}
        </AnimatePresence>
    );
}

function RippleRing({ trigger, color }: { trigger: number; color: string }) {
    return (
        <AnimatePresence>
            {trigger > 0 && (
                <motion.span key={trigger}
                    initial={{ scale: 0.8, opacity: 0.7 }}
                    animate={{ scale: 2.8, opacity: 0 }}
                    transition={{ duration: 0.65, ease: 'easeOut' }}
                    style={{
                        position: 'absolute', inset: 0, borderRadius: '50%',
                        border: `2px solid ${color}`, pointerEvents: 'none', zIndex: 1,
                    }}
                />
            )}
        </AnimatePresence>
    );
}

function CountBadge({ count, color }: { count: number; color: string }) {
    return (
        <AnimatePresence mode="popLayout">
            <motion.span key={count}
                initial={{ y: -8, opacity: 0, scale: 0.7 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 6, opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 600, damping: 28 }}
                style={{
                    fontSize: '0.62rem', fontWeight: 800, textAlign: 'center',
                    color: count > 0 ? color : 'rgba(255,255,255,0.35)',
                    textShadow: count > 0 ? `0 0 10px ${color}88` : 'none',
                    letterSpacing: '0.02em', lineHeight: 1, display: 'block', minWidth: 24,
                    fontVariantNumeric: 'tabular-nums',
                }}
            >
                {count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count)}
            </motion.span>
        </AnimatePresence>
    );
}

// ─── SVGs ─────────────────────────────────────────────────────────────────────
function HeartSvg({ filled }: { filled: boolean }) {
    return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            {filled
                ? <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="url(#crown-aura)" />
                : <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                    stroke="rgba(255,255,255,0.72)" strokeWidth="1.6" strokeLinejoin="round" />}
        </svg>
    );
}

function EchoSvg({ active }: { active: boolean }) {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            {active ? (
                <>
                    <path d="M12 3C7.03 3 3 6.58 3 11c0 2.4 1.1 4.56 2.88 6.1L5 21l4.27-1.53C10.43 19.82 11.2 20 12 20c4.97 0 9-3.58 9-8s-4.03-9-9-9z" fill="url(#mindful-breath)" />
                    <circle cx="8.5" cy="11" r="1.1" fill="white" opacity="0.92" />
                    <circle cx="12" cy="11" r="1.1" fill="white" opacity="0.92" />
                    <circle cx="15.5" cy="11" r="1.1" fill="white" opacity="0.92" />
                </>
            ) : (
                <>
                    <path d="M12 3C7.03 3 3 6.58 3 11c0 2.4 1.1 4.56 2.88 6.1L5 21l4.27-1.53C10.43 19.82 11.2 20 12 20c4.97 0 9-3.58 9-8s-4.03-9-9-9z"
                        stroke="rgba(255,255,255,0.72)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="8.5" cy="11" r="1" fill="rgba(255,255,255,0.55)" />
                    <circle cx="12" cy="11" r="1" fill="rgba(255,255,255,0.55)" />
                    <circle cx="15.5" cy="11" r="1" fill="rgba(255,255,255,0.55)" />
                </>
            )}
        </svg>
    );
}

function RadiateSvg({ active }: { active: boolean }) {
    return (
        <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"
                stroke={active ? 'url(#dawn-awakening)' : 'rgba(255,255,255,0.72)'}
                strokeWidth={active ? '2.1' : '1.7'}
                strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function PlantSvg({ active }: { active: boolean }) {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            {active ? (
                <>
                    <path d="M12 22V12" stroke="url(#sacred-green)" strokeWidth="2" strokeLinecap="round" />
                    <path d="M12 12C12 7 7 4 3 5c0 5 3 8 9 7z" fill="url(#sacred-green)" opacity="0.9" />
                    <path d="M12 12c0-5 5-8 9-7-1 5-4 8-9 7z" fill="url(#sacred-green)" opacity="0.9" />
                </>
            ) : (
                <path d="M12 22V12M12 12C12 7 7 4 3 5c0 5 3 8 9 7zM12 12c0-5 5-8 9-7-1 5-4 8-9 7z"
                    stroke="rgba(255,255,255,0.72)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            )}
        </svg>
    );
}

// ─── Instagram-scale Share Sheet ──────────────────────────────────────────────
const PLATFORMS = [
    { id: 'whatsapp', label: 'WhatsApp', color: '#25D366', bg: 'rgba(37,211,102,0.15)', icon: '💬' },
    { id: 'instagram', label: 'Instagram', color: '#E1306C', bg: 'rgba(225,48,108,0.15)', icon: '📸' },
    { id: 'facebook', label: 'Facebook', color: '#1877F2', bg: 'rgba(24,119,242,0.15)', icon: '🌐' },
    { id: 'twitter', label: 'X / Twitter', color: '#ffffff', bg: 'rgba(255,255,255,0.1)', icon: '𝕏' },
    { id: 'telegram', label: 'Telegram', color: '#2CA5E0', bg: 'rgba(44,165,224,0.15)', icon: '✈️' },
    { id: 'copy', label: 'Copy Link', color: '#FBBF24', bg: 'rgba(251,191,36,0.15)', icon: '🔗' },
];

function ShareSheet({ shareUrl, shareText, onClose }: { shareUrl: string; shareText: string; onClose: () => void }) {
    const [copied, setCopied] = useState(false);
    const getUrl = (id: string) => {
        const e = encodeURIComponent;
        if (id === 'whatsapp') return `https://api.whatsapp.com/send?text=${e(shareText + ' ' + shareUrl)}`;
        if (id === 'facebook') return `https://www.facebook.com/sharer/sharer.php?u=${e(shareUrl)}`;
        if (id === 'twitter') return `https://twitter.com/intent/tweet?text=${e(shareText)}&url=${e(shareUrl)}`;
        if (id === 'telegram') return `https://t.me/share/url?url=${e(shareUrl)}&text=${e(shareText)}`;
        return '';
    };
    const handle = async (p: typeof PLATFORMS[0]) => {
        if (p.id === 'copy') {
            try { await navigator.clipboard.writeText(shareUrl); } catch { /**/ }
            setCopied(true); setTimeout(() => { setCopied(false); onClose(); }, 1800); return;
        }
        const u = getUrl(p.id);
        if (u) window.open(u, '_blank', 'noopener,noreferrer');
        onClose();
    };

    return (
        <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
                style={{ position: 'fixed', inset: 0, zIndex: 950, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
            >
                <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 36 }}
                    onClick={e => e.stopPropagation()}
                    style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: 'rgba(10,6,22,0.97)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
                        borderTopLeftRadius: 24, borderTopRightRadius: 24,
                        border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none',
                        boxShadow: '0 -16px 60px rgba(0,0,0,0.65)', padding: '0 0 36px',
                    }}
                >
                    <div style={{ position: 'absolute', top: 0, left: '25%', right: '25%', height: 1, background: 'linear-gradient(to right, transparent, rgba(249,115,22,0.7), rgba(253,164,175,0.7), transparent)' }} />
                    <div style={{ width: 38, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '14px auto 16px' }} />
                    <div style={{ textAlign: 'center', fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '1rem', color: 'rgba(255,255,255,0.92)', marginBottom: 22 }}>
                        Radiate This Vibe ✨
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px 8px', padding: '0 20px 18px' }}>
                        {PLATFORMS.map(p => (
                            <motion.button key={p.id} whileTap={{ scale: 0.86 }} whileHover={{ y: -3 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                                onClick={() => handle(p)}
                                style={{
                                    background: p.id === 'copy' && copied ? 'rgba(100,220,100,0.15)' : p.bg,
                                    border: `1px solid ${p.id === 'copy' && copied ? 'rgba(100,220,100,0.4)' : p.color + '44'}`,
                                    borderRadius: 16, padding: '13px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer',
                                }}
                            >
                                <div style={{ width: 46, height: 46, borderRadius: '50%', background: p.bg, border: `1.5px solid ${p.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', boxShadow: `0 0 16px ${p.color}28` }}>
                                    {p.id === 'copy' && copied ? '✓' : p.icon}
                                </div>
                                <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: '0.68rem', fontWeight: 600, color: p.id === 'copy' && copied ? '#7ddc9f' : 'rgba(255,255,255,0.72)', lineHeight: 1 }}>
                                    {p.id === 'copy' && copied ? 'Copied!' : p.label}
                                </span>
                            </motion.button>
                        ))}
                    </div>
                    <div style={{ padding: '0 20px' }}>
                        <motion.button whileTap={{ scale: 0.96 }}
                            onClick={async () => {
                                if (navigator.share) { try { await navigator.share({ title: 'Pranaverse', text: shareText, url: shareUrl }); } catch { /**/ } onClose(); }
                            }}
                            style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, rgba(249,115,22,0.28), rgba(253,164,175,0.18))', border: '1px solid rgba(249,115,22,0.4)', borderRadius: 14, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.88rem', color: '#FDA4AF' }}
                        >
                            📡 Share via Device
                        </motion.button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface ReelActionSidebarProps {
    trackId: string;
    trackTitle: string;
    onOpenComments: () => void;
    showComments: boolean;
}

export default function ReelActionSidebar({ trackId, trackTitle, onOpenComments, showComments }: ReelActionSidebarProps) {
    const {
        heartCount, commentCount,
        hasHearted,
        comments, toggleHeart, addComment,
    } = usePostReactions(trackId);

    const [heartBurst, setHeartBurst] = useState(false);
    const [heartRipple, setHeartRipple] = useState(0);
    const [echoRipple, setEchoRipple] = useState(0);
    const [shareOpen, setShareOpen] = useState(false);
    const [shareLaunched, setShareLaunched] = useState(false);

    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/pranaverse#reel-${trackId}` : '';
    const shareText = `✨ "${trackTitle}" — feel this vibe on Pranaverse`;

    const handleVibe = useCallback(() => {
        toggleHeart();
        if (!hasHearted) {
            setHeartBurst(true); setHeartRipple(r => r + 1);
            setTimeout(() => setHeartBurst(false), 700);
        }
    }, [toggleHeart, hasHearted]);

    const handleEcho = useCallback(() => {
        setEchoRipple(r => r + 1);
        onOpenComments();
    }, [onOpenComments]);

    const handleRadiate = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setShareLaunched(true);
        setTimeout(() => setShareLaunched(false), 600);
        setShareOpen(true);
    }, []);

    const labelStyle: React.CSSProperties = {
        fontSize: '0.47rem', fontWeight: 800, letterSpacing: '0.12em',
        textTransform: 'uppercase', lineHeight: 1, fontFamily: "'Outfit', sans-serif",
    };

    const pulseAnim = {
        animate: { scale: [1, 1.42, 1], opacity: [0.3, 0.08, 0.3] },
        transition: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' as const },
    };

    return (
        <>
            <GradientDefs />

            <div style={{
                position: 'absolute', right: '0.65rem', bottom: '11%',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '1.2rem', zIndex: 20,
            }} onClick={e => e.stopPropagation()}>

                {/* ════ ❤️  VIBE ════ */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                    <motion.button
                        style={{
                            ...orbBase,
                            background: hasHearted ? 'linear-gradient(145deg,rgba(126,34,206,0.4),rgba(251,191,36,0.25))' : orbBase.background,
                            borderColor: hasHearted ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.16)',
                            boxShadow: hasHearted
                                ? '0 0 24px rgba(126,34,206,0.55),0 0 48px rgba(251,191,36,0.12),0 8px 32px rgba(0,0,0,0.45),inset 0 1px 0 rgba(255,255,255,0.14)'
                                : orbBase.boxShadow,
                        } as React.CSSProperties}
                        whileTap={{ scale: 0.82 }} whileHover={{ scale: 1.08, y: -2 }}
                        transition={{ type: 'spring', stiffness: 480, damping: 18 }}
                        onClick={handleVibe} aria-label="Vibe"
                    >
                        <Glare />
                        <ParticleBurst active={heartBurst} colorA="#FBBF24" colorB="#7E22CE" />
                        <RippleRing trigger={heartRipple} color="#FBBF24" />
                        <motion.div
                            animate={hasHearted ? { scale: [1, 1.32, 0.9, 1.06, 1], rotate: [0, -8, 5, -2, 0] } : { scale: 1, rotate: 0 }}
                            transition={{ type: 'tween', duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        ><HeartSvg filled={hasHearted} /></motion.div>
                        {hasHearted && (
                            <motion.div {...pulseAnim} style={{
                                position: 'absolute', inset: -7, borderRadius: '50%',
                                background: 'radial-gradient(circle,rgba(126,34,206,0.4) 0%,transparent 70%)', pointerEvents: 'none',
                            }} />
                        )}
                    </motion.button>
                    <CountBadge count={heartCount} color="#FBBF24" />
                </div>

                {/* ════ 💬  ECHO ════ */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                    <motion.button
                        style={{
                            ...orbBase,
                            background: showComments ? 'linear-gradient(145deg,rgba(45,212,191,0.35),rgba(244,114,182,0.22))' : orbBase.background,
                            borderColor: showComments ? 'rgba(45,212,191,0.5)' : 'rgba(255,255,255,0.16)',
                            boxShadow: showComments ? '0 0 22px rgba(45,212,191,0.5),0 8px 32px rgba(0,0,0,0.45),inset 0 1px 0 rgba(255,255,255,0.14)' : orbBase.boxShadow,
                        } as React.CSSProperties}
                        whileTap={{ scale: 0.82, rotate: -10 }} whileHover={{ scale: 1.08, y: -2 }}
                        transition={{ type: 'spring', stiffness: 480, damping: 18 }}
                        onClick={handleEcho} aria-label="Echo"
                    >
                        <Glare />
                        <RippleRing trigger={echoRipple} color="#2DD4BF" />
                        <motion.div
                            animate={showComments ? { rotate: [0, -14, 7, -3, 0], scale: [1, 1.18, 0.94, 1.04, 1] } : { rotate: 0, scale: 1 }}
                            transition={{ type: 'tween', duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        ><EchoSvg active={showComments} /></motion.div>
                        {showComments && (
                            <motion.div {...pulseAnim} style={{
                                position: 'absolute', inset: -7, borderRadius: '50%',
                                background: 'radial-gradient(circle,rgba(45,212,191,0.35) 0%,transparent 70%)', pointerEvents: 'none',
                            }} />
                        )}
                    </motion.button>
                    <CountBadge count={commentCount} color="#2DD4BF" />
                </div>

                {/* ════ ✈️  RADIATE ════ */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                    <motion.button
                        style={{
                            ...orbBase,
                            background: shareOpen ? 'linear-gradient(145deg,rgba(249,115,22,0.38),rgba(253,164,175,0.22))' : orbBase.background,
                            borderColor: shareOpen ? 'rgba(249,115,22,0.55)' : 'rgba(255,255,255,0.16)',
                            boxShadow: shareOpen ? '0 0 26px rgba(249,115,22,0.5),0 8px 32px rgba(0,0,0,0.45),inset 0 1px 0 rgba(255,255,255,0.14)' : orbBase.boxShadow,
                        } as React.CSSProperties}
                        whileTap={{ scale: 0.78, rotate: -12 }} whileHover={{ scale: 1.08, y: -2 }}
                        transition={{ type: 'spring', stiffness: 480, damping: 18 }}
                        onClick={handleRadiate} aria-label="Radiate"
                    >
                        <Glare />
                        <AnimatePresence mode="wait">
                            {shareLaunched
                                ? <motion.div key="launch" initial={{ y: 0, x: 0, opacity: 1 }} animate={{ y: -30, x: 12, opacity: 0 }} exit={{}} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}><RadiateSvg active={true} /></motion.div>
                                : <motion.div key="rest" initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 22 }}><RadiateSvg active={shareOpen} /></motion.div>
                            }
                        </AnimatePresence>
                    </motion.button>
                </div>


            </div>

            {/* ── Echo (Comment) Sheet — position:fixed ── */}
            {showComments && (
                <CommentSheet
                    postCaption={trackTitle}
                    commentCount={commentCount}
                    comments={comments}
                    onClose={onOpenComments}
                    onAddComment={addComment}
                />
            )}

            {/* ── Instagram Share Sheet — position:fixed ── */}
            {shareOpen && (
                <ShareSheet shareUrl={shareUrl} shareText={shareText} onClose={() => setShareOpen(false)} />
            )}
        </>
    );
}
