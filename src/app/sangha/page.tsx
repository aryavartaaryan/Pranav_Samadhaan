'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface Message {
    id: string;
    text: string;
    sender: 'me' | 'other';
    time: string;
}

const DEMO_MESSAGES: Message[] = [
    { id: '1', sender: 'other', text: 'Hari Om 🙏 How did your morning Sadhana go today?', time: '7:14 AM' },
    { id: '2', sender: 'me', text: 'Shubh Prabhat! It was very peaceful. Completed the Gayatri 108 cycle.', time: '7:18 AM' },
    { id: '3', sender: 'other', text: 'That\'s beautiful. I could feel a shift in energy since yesterday\'s session too.', time: '7:20 AM' },
];

function formatTime(): string {
    const now = new Date();
    return now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Spandana (vibration) wave — replaces "typing..." indicator
function SpandanaWave() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.4 }}
            style={{
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.5rem 1rem',
            }}
        >
            <span style={{ fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(196,181,253,0.65)' }}>
                Spandana
            </span>
            <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                {[0, 1, 2, 3, 4].map(i => (
                    <motion.div
                        key={i}
                        animate={{ height: [4, 14, 4], opacity: [0.4, 1, 0.4] }}
                        transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: i * 0.12,
                        }}
                        style={{
                            width: 2.5,
                            borderRadius: 2,
                            background: 'linear-gradient(to top, rgba(109,40,217,0.5), rgba(196,181,253,0.9))',
                        }}
                    />
                ))}
            </div>
        </motion.div>
    );
}

export default function SanghaPage() {
    const [messages, setMessages] = useState<Message[]>(DEMO_MESSAGES);
    const [input, setInput] = useState('');
    const [otherActive, setOtherActive] = useState(true); // simulates other person being active
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = () => {
        if (!input.trim()) return;
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);
        const newMsg: Message = {
            id: Date.now().toString(),
            text: input.trim(),
            sender: 'me',
            time: formatTime(),
        };
        setMessages(prev => [...prev, newMsg]);
        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Allow send only when user explicitly presses Enter (or taps the send icon) on desktop.
        // On mobile, block Enter-to-send entirely to avoid IME auto-submit.
        if (e.keyCode === 229 || (e.nativeEvent as any).isComposing) return;

        if (e.key === 'Enter' && !e.shiftKey) {
            const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            if (isMobile) {
                e.preventDefault();
                return;
            }
            e.preventDefault();
            if (input.trim()) {
                sendMessage();
            }
        }
    };

    return (
        <div style={{
            minHeight: '100dvh',
            display: 'flex', flexDirection: 'column',
            background: 'linear-gradient(160deg, #0d0820 0%, #110b2d 40%, #0a0a18 100%)',
            position: 'relative',
            fontFamily: 'var(--font-body, Inter, sans-serif)',
        }}>
            {/* Ambient purple glow */}
            <div style={{
                position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 400, height: 200,
                background: 'radial-gradient(ellipse, rgba(109,40,217,0.18) 0%, transparent 70%)',
                filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0,
            }} />

            {/* ── TOP HEADER ──────────────────────────────── */}
            <header style={{
                position: 'sticky', top: 0, zIndex: 50,
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.85rem 1rem',
                background: 'rgba(13,8,32,0.82)',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                borderBottom: '1px solid rgba(109,40,217,0.15)',
            }}>
                <Link href="/" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem',
                }}>←</Link>

                {/* Avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #4c1d95, #7c3aed)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.1rem', border: '1.5px solid rgba(167,139,250,0.3)',
                    }}>🙏</div>
                    {/* Active indicator */}
                    <motion.div
                        animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.15, 1] }}
                        transition={{ duration: 2.5, repeat: Infinity }}
                        style={{
                            position: 'absolute', bottom: 1, right: 1,
                            width: 9, height: 9, borderRadius: '50%',
                            background: 'rgba(109,40,217,0.9)',
                            border: '1.5px solid rgba(13,8,32,0.9)',
                        }}
                    />
                </div>

                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, fontSize: '0.95rem' }}>
                            Meera Devi
                        </span>
                        <span style={{
                            fontSize: '0.52rem', letterSpacing: '0.15em', textTransform: 'uppercase',
                            color: 'rgba(167,139,250,0.7)', background: 'rgba(109,40,217,0.15)',
                            border: '1px solid rgba(109,40,217,0.25)', borderRadius: 999,
                            padding: '0.1rem 0.5rem',
                        }}>
                            Sangha
                        </span>
                    </div>
                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.38)' }}>
                        Conscious Community · Active now
                    </span>
                </div>

                {/* Sound icon — intentionally no red dot, no aggressive notifications */}
                <button style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    ☽
                </button>
            </header>

            {/* ── MESSAGES AREA ────────────────────────────── */}
            <div style={{
                flex: 1, overflowY: 'auto',
                padding: '1.2rem 0.9rem 0.5rem',
                display: 'flex', flexDirection: 'column', gap: '0.65rem',
                position: 'relative', zIndex: 1,
            }}>
                {/* Day divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.25rem 0 0.5rem' }}>
                    <div style={{ flex: 1, height: 0.5, background: 'rgba(255,255,255,0.07)' }} />
                    <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.12em' }}>Today</span>
                    <div style={{ flex: 1, height: 0.5, background: 'rgba(255,255,255,0.07)' }} />
                </div>

                <AnimatePresence initial={false}>
                    {messages.map(msg => {
                        const isMe = msg.sender === 'me';
                        return (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                                style={{
                                    display: 'flex',
                                    justifyContent: isMe ? 'flex-end' : 'flex-start',
                                }}
                            >
                                <div style={{
                                    maxWidth: '75%',
                                    background: isMe
                                        ? 'rgba(180,83,9,0.20)'   // Warm saffron for user — no aggressive neon
                                        : 'rgba(255,255,255,0.08)', // Frosted glass for others
                                    backdropFilter: 'blur(16px)',
                                    WebkitBackdropFilter: 'blur(16px)',
                                    border: isMe
                                        ? '1px solid rgba(251,146,60,0.22)'
                                        : '1px solid rgba(255,255,255,0.10)',
                                    borderRadius: isMe ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                                    padding: '0.65rem 0.9rem',
                                    position: 'relative',
                                }}>
                                    <p style={{
                                        color: 'rgba(255,255,255,0.88)',
                                        fontSize: '0.88rem',
                                        lineHeight: 1.5,
                                        margin: 0,
                                        // Serif for long spiritual quotes, sans-serif for short messages
                                        fontFamily: msg.text.length > 60
                                            ? "'Playfair Display', Georgia, serif"
                                            : 'var(--font-body, Inter, sans-serif)',
                                        fontWeight: msg.text.length > 60 ? 400 : 400,
                                    }}>
                                        {msg.text}
                                    </p>
                                    <div style={{
                                        marginTop: '0.3rem',
                                        display: 'flex', alignItems: 'center',
                                        justifyContent: isMe ? 'flex-end' : 'flex-start',
                                        gap: '0.3rem',
                                    }}>
                                        <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.28)' }}>
                                            {msg.time}
                                        </span>
                                        {/* No read ticks — intentional calm design */}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {/* Spandana wave — replaces "Typing..." */}
                <AnimatePresence>
                    {otherActive && <SpandanaWave key="spandana" />}
                </AnimatePresence>

                <div ref={bottomRef} />
            </div>

            {/* ── INPUT BAR ────────────────────────────────── */}
            <div style={{
                position: 'sticky', bottom: 0, zIndex: 50,
                padding: '0.7rem 0.9rem 0.9rem',
                background: 'rgba(13,8,32,0.88)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderTop: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', gap: '0.6rem', alignItems: 'center',
            }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    {/* Glow aura on focus */}
                    <div style={{
                        position: 'absolute', inset: -8, borderRadius: 999,
                        background: 'radial-gradient(ellipse, rgba(109,40,217,0.15) 0%, transparent 70%)',
                        filter: 'blur(12px)', pointerEvents: 'none',
                    }} />
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Send a conscious message..."
                        style={{
                            position: 'relative', zIndex: 1,
                            width: '100%', boxSizing: 'border-box',
                            background: 'rgba(255,255,255,0.07)',
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            border: '1px solid rgba(109,40,217,0.25)',
                            borderRadius: 999,
                            padding: '0.65rem 1.2rem',
                            color: 'rgba(255,255,255,0.88)',
                            fontSize: '0.88rem',
                            fontWeight: 300, outline: 'none',
                            fontFamily: 'var(--font-body, Inter, sans-serif)',
                        }}
                    />
                </div>

                <motion.button
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.93 }}
                    onClick={sendMessage}
                    style={{
                        width: 44, height: 44, flexShrink: 0,
                        background: 'linear-gradient(135deg, #4c1d95, #7c3aed)',
                        border: 'none', borderRadius: '50%',
                        color: 'rgba(255,255,255,0.92)', fontSize: '1.1rem',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 18px rgba(109,40,217,0.4)',
                    }}
                >
                    ✦
                </motion.button>
            </div>
        </div>
    );
}
