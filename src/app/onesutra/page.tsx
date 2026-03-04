'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Search, Phone, Video,
    Paperclip, Mic, Send, Smile, Moon,
    MessageCircle, Users, Bot, LogOut,
    CheckCheck, Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useOneSutraAuth } from '@/hooks/useOneSutraAuth';
import { useUsers } from '@/hooks/useUsers';
import { useMessages, getChatId } from '@/hooks/useMessages';
import { useCircadianBackground } from '@/hooks/useCircadianBackground';
import ToneBar from '@/components/SutraTalk/ToneBar';
import ActionDashboard from '@/components/SutraTalk/ActionDashboard';

// ─── AI Contacts (always pinned) ─────────────────────────────────────────────

// ─── AI Contacts (always pinned) ───────────────────────────────────────────────
const AI_CONTACTS = [
    {
        uid: 'ai_vaidya', name: 'Digital Vaidya', role: 'AI Agent · Ayurvedic Guide',
        emoji: '🤖', aura: '#E8A030', auraGlow: 'rgba(232,160,48,0.35)', isAI: true,
        statusLabel: 'Available', online: true,
        lastMsg: 'ॐ Your Pitta score is optimal today. Begin with Rāga Bhairav.',
    },
    {
        uid: 'ai_rishi', name: 'Rishi AI Coach', role: 'AI Agent · Life Architect',
        emoji: '🔮', aura: '#E860A0', auraGlow: 'rgba(220,80,150,0.28)', isAI: true,
        statusLabel: 'Available', online: true,
        lastMsg: 'Your weekly Sankalpa report is ready. 73% completion — excellent!',
    },
];

// ── Voice waveform ─────────────────────────────────────────────────────────────
function VoiceWaveform({ tone, isPlaying }: { tone: 'calm' | 'energetic' | 'meditative'; isPlaying: boolean }) {
    const colors = { calm: ['#60C860', '#4A8EE8'], energetic: ['#E8A030', '#E86030'], meditative: ['#A870E0', '#6040A0'] };
    const [c1, c2] = colors[tone];
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 28 }}>
            {Array.from({ length: 28 }).map((_, i) => {
                const h = 4 + Math.sin(i * 0.6) * 10 + Math.cos(i * 1.1) * 6;
                return (
                    <motion.div key={i}
                        animate={isPlaying ? { scaleY: [1, 1.4 + Math.random() * 0.8, 1] } : { scaleY: 1 }}
                        transition={{ duration: 0.5 + i * 0.03, repeat: isPlaying ? Infinity : 0, ease: 'easeInOut' }}
                        style={{ width: 3, height: Math.max(4, h), borderRadius: 999, background: `linear-gradient(180deg, ${c1}, ${c2})`, opacity: 0.75 + Math.sin(i * 0.4) * 0.25, transformOrigin: 'center' }}
                    />
                );
            })}
        </div>
    );
}

// ── Time formatter ────────────────────────────────────────────────────────────
function fmtTime(ms: number): string {
    return new Date(ms).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}


// ── Main Component ────────────────────────────────────────────────────────────
export default function OneSutraPage() {
    const { user, signOut } = useOneSutraAuth();
    const { users: realUsers } = useUsers(user?.uid ?? null);

    const [view, setView] = useState<'list' | 'chat'>('list');
    const [activeContact, setActiveContact] = useState<{
        uid: string; name: string; emoji?: string; photoURL?: string | null;
        aura: string; auraGlow: string; isAI: boolean; statusLabel: string; online: boolean; role: string;
    } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [input, setInput] = useState('');
    const [isSilent, setIsSilent] = useState(false);
    const [fabOpen, setFabOpen] = useState(false);
    const [playingVoice, setPlayingVoice] = useState<string | null>(null);
    const [isTypingAI, setIsTypingAI] = useState(false);
    const [isAutoPilot, setIsAutoPilot] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    // ── AutoPilot toggle — writes to Firestore user doc ──────────────────────
    const handleAutoPilotToggle = useCallback(async () => {
        if (!user?.uid) return;
        const next = !isAutoPilot;
        setIsAutoPilot(next);
        try {
            const { getApp } = await import('firebase/app');
            const { getFirestore, doc, setDoc } = await import('firebase/firestore');
            const db = getFirestore(getApp());
            await setDoc(doc(db, 'onesutra_users', user.uid), { isAutoPilotEnabled: next }, { merge: true });
        } catch (e) { console.error('AutoPilot toggle failed', e); }
    }, [user?.uid, isAutoPilot]);

    // Chat ID: current user ↔ contact
    const chatId = user && activeContact && !activeContact.isAI
        ? getChatId(user.uid, activeContact.uid)
        : null;

    const { messages, sendMessage } = useMessages(chatId, user?.uid ?? null);

    // ── Background: nature variant — sunrise · lake · forest · sunset per time of day
    const { phase, imageUrl } = useCircadianBackground('nature');
    const accent = phase.accentHex;
    const tint = phase.tint;
    // tod alias — keeps all existing tod.accent / tod.glow references working
    const tod = { accent, glow: accent };

    // Auto-scroll on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length, isTypingAI]);

    // Build combined contact list: AI first, then real users
    const AURA_PALETTE = ['#4A8EE8', '#60C860', '#E8A030', '#A880E0', '#E860A0', '#40C8E8'];
    const realContacts = realUsers.map((u, i) => ({
        uid: u.uid, name: u.name, photoURL: u.photoURL,
        aura: AURA_PALETTE[i % AURA_PALETTE.length],
        auraGlow: `rgba(80,120,200,0.28)`,
        isAI: false, statusLabel: 'OneSutra Member', online: false,
        role: u.email ?? 'Member',
        lastMsg: 'Say Namaste 🙏',
    }));

    const allContacts = [
        ...AI_CONTACTS.map(c => ({ ...c, photoURL: undefined, lastMsg: c.lastMsg })),
        ...realContacts,
    ];

    const filtered = allContacts.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const openChat = (c: typeof allContacts[0]) => {
        setActiveContact(c);
        setView('chat');
    };

    const handleSend = useCallback(async () => {
        if (!input.trim()) return;
        const text = input.trim();
        setInput('');

        if (activeContact?.isAI) {
            // Simulate AI reply
            setIsTypingAI(true);
            setTimeout(() => {
                setIsTypingAI(false);
            }, 2200);
        } else {
            await sendMessage(text, user?.name ?? 'Traveller');
        }
    }, [input, activeContact, sendMessage, user]);

    const CHIPS = activeContact?.isAI
        ? ['Send a Mantra 🕉', 'Analyse my Dosha', 'Summarise this']
        : ['Namaste 🙏', 'Schedule a call', 'Send a blessing'];

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div style={{ minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif", color: 'white', overflowX: 'hidden', position: 'relative' }}>

            {/* ══ BACKGROUND ══ */}
            {/* 1. Instant gradient — renders immediately, hides before photo loads */}
            <div style={{
                position: 'fixed', inset: 0, zIndex: -3,
                background: phase.name === 'dawn'
                    ? 'linear-gradient(160deg,#1a0830 0%,#3d1a10 50%,#1a0820 100%)'
                    : phase.name === 'dusk'
                        ? 'linear-gradient(160deg,#1a0820 0%,#3d1a08 50%,#200a10 100%)'
                        : phase.name === 'night'
                            ? 'linear-gradient(160deg,#020508 0%,#080e1a 60%,#030710 100%)'
                            : 'linear-gradient(160deg,#0a1a30 0%,#0e2a18 50%,#081828 100%)',
            }} />
            {/* 2. Nature photo — fades in once loaded */}
            <img
                key={imageUrl}
                src={imageUrl}
                alt=""
                suppressHydrationWarning
                style={{
                    position: 'fixed', inset: 0, width: '100%', height: '100%',
                    objectFit: 'cover', objectPosition: 'center',
                    zIndex: -2, transition: 'opacity 0.8s ease',
                }}
            />
            {/* 3. Dark tint for readability */}
            <div style={{
                position: 'fixed', inset: 0, zIndex: -1,
                background: tint,
                pointerEvents: 'none',
            }} />


            {/* ═══════════════════════════════════════════════════════════
                Main App — WhatsApp-style responsive layout
                Desktop ≥768px : side-by-side (contacts + chat)
                Mobile  <768px : single panel (list or chat)
            ═══════════════════════════════════════════════════════════ */}
            {user && (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    maxWidth: 1280,
                    margin: '0 auto',
                    position: 'relative',
                }}>

                    {/* ═══ LEFT PANEL — Contact List ═══
                        Mobile: full-width when view==='list', hidden when view==='chat'
                        Desktop: always visible, fixed ~380px width */}
                    <div style={{
                        width: 'clamp(300px, 35%, 400px)',
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        borderRight: `1px solid rgba(255,255,255,0.07)`,
                        minHeight: '100vh',
                        /* Mobile: show only when on list view */
                    }} className="sutratalk-sidebar">

                        {/* ── Sidebar Header ── */}
                        <div style={{
                            position: 'sticky', top: 0, zIndex: 100,
                            background: 'rgba(2,4,12,0.72)',
                            backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
                            borderBottom: `1px solid rgba(255,255,255,0.08)`,
                            padding: '0.75rem 1rem 0.55rem',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.55rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Link href="/" style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 0, padding: '2px' }}><ArrowLeft size={18} strokeWidth={1.6} /></Link>
                                    <motion.div
                                        animate={{ filter: [`drop-shadow(0 0 5px ${accent}60)`, `drop-shadow(0 0 14px ${accent}aa)`, `drop-shadow(0 0 5px ${accent}60)`] }}
                                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                                        style={{ width: 26, height: 26, flexShrink: 0 }}
                                    >
                                        <svg viewBox="0 0 28 28" fill="none" width="26" height="26">
                                            <path d="M14 22 C14 22 6 18 6 12 C6 8 9 6 12 7 C10 4 13 2 14 2 C15 2 18 4 16 7 C19 6 22 8 22 12 C22 18 14 22 14 22Z"
                                                fill={`${accent}22`} stroke={accent} strokeWidth="1.2" strokeLinejoin="round" />
                                            <path d="M14 22 L14 26" stroke={accent} strokeWidth="1.1" strokeLinecap="round" opacity="0.5" />
                                            <path d="M11 25 L17 25" stroke={accent} strokeWidth="0.9" strokeLinecap="round" opacity="0.35" />
                                        </svg>
                                    </motion.div>
                                    <div>
                                        <h1 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, fontFamily: "'Playfair Display', serif", color: 'rgba(255,255,255,0.95)', letterSpacing: '0.01em' }}>oneSUTRA</h1>
                                        <p style={{ margin: 0, fontSize: '0.5rem', color: `${accent}aa`, letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: 'monospace' }}>Conscious Messenger</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <div style={{ width: 30, height: 30, borderRadius: '50%', border: `1.5px solid ${accent}55`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {user.photoURL
                                            ? <img src={user.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            : <span style={{ fontSize: '0.75rem' }}>🧘</span>}
                                    </div>
                                    <button onClick={signOut} title="Sign out" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.45)' }}>
                                        <LogOut size={13} />
                                    </button>
                                </div>
                            </div>

                            {/* Search */}
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <Search size={13} style={{ position: 'absolute', left: '0.8rem', color: 'rgba(255,255,255,0.22)', pointerEvents: 'none' }} />
                                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search…"
                                    style={{ width: '100%', padding: '0.55rem 1rem 0.55rem 2.2rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, color: 'rgba(255,255,255,0.75)', fontSize: '0.82rem', outline: 'none', fontFamily: "'Inter', sans-serif", boxSizing: 'border-box' }} />
                            </div>

                            {/* Tabs */}
                            <div style={{ display: 'flex', gap: 6, marginTop: '0.5rem', overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
                                {['All', 'AI Agents', 'People'].map((tab, i) => (
                                    <button key={tab} style={{ flexShrink: 0, padding: '0.22rem 0.7rem', background: i === 0 ? `${accent}22` : 'transparent', border: i === 0 ? `1px solid ${accent}44` : '1px solid rgba(255,255,255,0.07)', borderRadius: 999, color: i === 0 ? accent : 'rgba(255,255,255,0.38)', fontSize: '0.65rem', fontWeight: 500, cursor: 'pointer', letterSpacing: '0.05em', fontFamily: "'Inter', sans-serif" }}>{tab}</button>
                                ))}
                            </div>
                        </div>

                        {/* ── Contact List ── */}
                        <div style={{ flex: 1, padding: '0.8rem 0.75rem 6rem', overflowY: 'auto' }}>
                            {filtered.map((c) => (
                                <div key={c.uid}
                                    onClick={() => openChat(c)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 14,
                                        padding: '0.85rem 1.1rem',
                                        marginBottom: '0.55rem',
                                        cursor: 'pointer',
                                        background: activeContact?.uid === c.uid ? `${accent}18` : 'rgba(255,255,255,0.05)',
                                        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                                        border: activeContact?.uid === c.uid ? `1px solid ${accent}44` : '1px solid rgba(255,255,255,0.09)',
                                        borderRadius: 18,
                                        transition: 'all 0.18s ease',
                                    }}
                                    onMouseEnter={e => { if (activeContact?.uid !== c.uid) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.09)'; }}
                                    onMouseLeave={e => { if (activeContact?.uid !== c.uid) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                                >
                                    {/* Avatar */}
                                    <div style={{ position: 'relative', flexShrink: 0 }}>
                                        <div style={{ width: 48, height: 48, borderRadius: '50%', border: `1.5px solid ${c.aura}66`, boxShadow: `0 0 14px ${c.aura}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', overflow: 'hidden', background: `radial-gradient(circle at 35% 35%, ${c.aura}22, rgba(0,0,0,0.3))` }}>
                                            {c.photoURL
                                                ? <img src={c.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                : <span>{(c as { emoji?: string }).emoji ?? '🧘'}</span>}
                                        </div>
                                        {c.online && <div style={{ position: 'absolute', bottom: 2, right: 2, width: 9, height: 9, borderRadius: '50%', background: '#5DDD88', border: '2px solid rgba(4,6,16,0.8)', boxShadow: '0 0 6px rgba(80,220,120,0.7)' }} />}
                                    </div>

                                    {/* Text */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.16rem' }}>
                                            <span style={{ fontSize: '0.82rem', fontWeight: 500, fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.88)', letterSpacing: '0.01em' }}>{c.name}</span>
                                            {c.isAI && <span style={{ fontSize: '0.44rem', padding: '0.06rem 0.32rem', background: `${accent}22`, border: `1px solid ${accent}44`, borderRadius: 999, color: accent, letterSpacing: '0.12em', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'monospace' }}>AI</span>}
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.33)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif", lineHeight: 1.4 }}>
                                            {(c as { lastMsg?: string }).lastMsg ?? 'Begin a conscious conversation…'}
                                        </p>
                                        <p style={{ margin: '0.14rem 0 0', fontSize: '0.52rem', color: `${c.aura}88`, fontFamily: 'monospace', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{c.statusLabel}</p>
                                    </div>

                                    {/* Chevron */}
                                    <div style={{ color: 'rgba(255,255,255,0.14)', flexShrink: 0 }}>
                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    </div>
                                </div>
                            ))}

                            {realContacts.length === 0 && (
                                <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                                    <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic', lineHeight: 1.8, fontFamily: "'Inter', sans-serif" }}>
                                        No other souls yet 🌿<br />Invite a friend to begin
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* FAB */}
                        <div style={{ position: 'fixed', bottom: '1.5rem', left: 'max(1.2rem, calc(50vw - 640px + 1.2rem))', zIndex: 200 }}>
                            <AnimatePresence>
                                {fabOpen && (
                                    <motion.div initial={{ opacity: 0, y: 20, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.8 }}
                                        style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                                        {[{ icon: <MessageCircle size={16} />, label: 'New Chat' }, { icon: <Bot size={16} />, label: 'Consult AI Vaidya' }, { icon: <Users size={16} />, label: 'Invite Friend' }].map(({ icon, label }) => (
                                            <button key={label} onClick={() => setFabOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.55rem 1rem', borderRadius: 999, background: 'rgba(10,6,28,0.92)', backdropFilter: 'blur(20px)', border: `1px solid ${accent}55`, color: accent, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>{icon} {label}</button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <motion.button onClick={() => setFabOpen(f => !f)}
                                animate={{ rotate: fabOpen ? 45 : 0 }}
                                style={{ width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer', background: `radial-gradient(circle at 35% 35%, ${accent}ee, ${accent}88)`, boxShadow: `0 0 24px ${accent}66, 0 4px 20px rgba(0,0,0,0.4)`, color: 'white', fontSize: '1.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                aria-label="New conversation"
                            >
                                <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>✦</span>
                            </motion.button>
                        </div>
                    </div>

                    {/* ═══ RIGHT PANEL — Chat View ═══
                        Mobile: full-width when view==='chat', hidden when view==='list'
                        Desktop: always visible, fills remaining width */}
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: '100vh',
                        minWidth: 0,
                    }} className="sutratalk-chatpanel">

                        {activeContact ? (
                            <>
                                {/* Chat header */}
                                <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(6,4,18,0.78)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', borderBottom: `1px solid rgba(255,255,255,0.08)`, padding: '0.75rem 1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <button onClick={() => { setView('list'); setActiveContact(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', lineHeight: 0, padding: '4px' }}><ArrowLeft size={20} strokeWidth={2} /></button>

                                        <div style={{ position: 'relative' }}>
                                            <div style={{ width: 40, height: 40, borderRadius: '50%', border: `2px solid ${activeContact.aura}`, boxShadow: `0 0 14px ${activeContact.auraGlow}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', background: `radial-gradient(circle, ${activeContact.auraGlow}, rgba(0,0,0,0.4))`, overflow: 'hidden' }}>
                                                {activeContact.photoURL
                                                    ? <img src={activeContact.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    : <span>{activeContact.emoji ?? '🧘'}</span>}
                                            </div>
                                            {activeContact.online && <div style={{ position: 'absolute', bottom: 1, right: 1, width: 9, height: 9, borderRadius: '50%', background: '#44DD44', border: '2px solid rgba(6,4,18,1)', boxShadow: '0 0 5px rgba(60,220,60,0.6)' }} />}
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, fontFamily: "'Playfair Display', serif", color: 'white' }}>{activeContact.name}</h2>
                                                {activeContact.isAI && <span style={{ fontSize: '0.52rem', padding: '0.1rem 0.38rem', background: `${accent}22`, border: `1px solid ${accent}44`, borderRadius: 999, color: accent, letterSpacing: '0.1em', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'monospace' }}>AI</span>}
                                            </div>
                                            <p style={{ margin: 0, fontSize: '0.67rem', color: activeContact.online ? '#44DD44' : 'rgba(255,255,255,0.35)', fontFamily: 'monospace', letterSpacing: '0.04em' }}>
                                                {activeContact.isAI ? activeContact.statusLabel : (messages.length > 0 ? 'Active · real-time sync' : 'Tap to start chatting')}
                                            </p>
                                        </div>

                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999, padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', color: 'rgba(255,255,255,0.65)', fontSize: '0.7rem', fontFamily: 'inherit' }}><Phone size={13} /></button>
                                            <button style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999, padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', color: 'rgba(255,255,255,0.65)', fontSize: '0.7rem', fontFamily: 'inherit' }}><Video size={13} /></button>
                                            {/* ✨ Feature 1: AutoPilot toggle */}
                                            {!activeContact.isAI && (
                                                <button
                                                    onClick={handleAutoPilotToggle}
                                                    title={isAutoPilot ? 'AutoPilot ON — AI is replying for you' : 'Enable AutoPilot'}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: 5,
                                                        padding: '0.4rem 0.75rem', borderRadius: 999,
                                                        background: isAutoPilot ? `${accent}28` : 'rgba(255,255,255,0.06)',
                                                        border: `1px solid ${isAutoPilot ? accent + '66' : 'rgba(255,255,255,0.10)'}`,
                                                        cursor: 'pointer',
                                                        color: isAutoPilot ? accent : 'rgba(255,255,255,0.45)',
                                                        fontSize: '0.68rem', fontWeight: 600,
                                                        fontFamily: "'Inter', sans-serif",
                                                        transition: 'all 0.2s',
                                                    }}
                                                >
                                                    <Zap size={12} />
                                                    {isAutoPilot ? 'AI ON' : 'AutoPilot'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* 📋 Feature 3: Pinned Action Dashboard */}
                                {!activeContact.isAI && (
                                    <ActionDashboard chatId={chatId} accent={accent} />
                                )}

                                {/* Messages */}
                                <div style={{ flex: 1, padding: '1rem 1rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.55rem', overflowY: 'auto', minHeight: 0 }}>
                                    {messages.length === 0 && !activeContact.isAI && (
                                        <div style={{ margin: 'auto', textAlign: 'center', opacity: 0.4 }}>
                                            <p style={{ fontSize: '2rem' }}>🙏</p>
                                            <p style={{ fontSize: '0.8rem', fontStyle: 'italic', lineHeight: 1.6 }}>
                                                This is the beginning of your<br />conscious conversation with {activeContact.name}
                                            </p>
                                        </div>
                                    )}

                                    {messages.map((msg, i) => {
                                        const isMe = msg.senderId === user.uid;
                                        return (
                                            <motion.div key={msg.id}
                                                initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                                                transition={{ delay: i < 10 ? i * 0.03 : 0, duration: 0.28, ease: 'easeOut' }}
                                                style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8 }}
                                            >
                                                {!isMe && (
                                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: `radial-gradient(circle, ${activeContact.auraGlow}, rgba(0,0,0,0.4))`, border: `1.5px solid ${activeContact.aura}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0, overflow: 'hidden' }}>
                                                        {activeContact.photoURL
                                                            ? <img src={activeContact.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            : <span>{activeContact.emoji ?? '🧘'}</span>}
                                                    </div>
                                                )}

                                                <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 4 }}>
                                                    {!isMe && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.38)', paddingLeft: 4 }}>{msg.senderName}</span>
                                                            {/* 🤖 Feature 1: AI twin badge */}
                                                            {(msg as { sentBy?: string }).sentBy === 'ai' && (
                                                                <span style={{ fontSize: '0.48rem', padding: '0.05rem 0.3rem', background: `${accent}22`, border: `1px solid ${accent}55`, borderRadius: 999, color: accent, fontFamily: 'monospace', letterSpacing: '0.1em' }}>🤖 AI replied</span>
                                                            )}
                                                        </div>
                                                    )}
                                                    <div style={{
                                                        background: isMe
                                                            ? `linear-gradient(135deg, ${accent}44 0%, ${accent}18 100%)`
                                                            : 'rgba(255,255,255,0.08)',
                                                        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                                                        border: isMe ? `1px solid ${accent}44` : '1px solid rgba(255,255,255,0.10)',
                                                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                                        padding: '0.65rem 0.9rem',
                                                    }}>
                                                        <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.58, color: 'rgba(255,255,255,0.92)' }}>{msg.text}</p>
                                                        {isSilent && isMe && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: '0.25rem' }}>
                                                                <Moon size={9} style={{ color: 'rgba(255,255,255,0.28)' }} />
                                                                <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'monospace' }}>Silent send</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <span style={{ fontSize: '0.60rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>{fmtTime(msg.createdAt)}</span>
                                                        {isMe && <span style={{ color: `${accent}cc`, lineHeight: 0 }}><CheckCheck size={12} /></span>}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}

                                    {/* AI typing */}
                                    {isTypingAI && (
                                        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: `radial-gradient(circle, ${activeContact.auraGlow}, rgba(0,0,0,0.4))`, border: `1.5px solid ${activeContact.aura}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>{activeContact.emoji}</div>
                                            <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '18px 18px 18px 4px', padding: '0.75rem 1rem', display: 'flex', gap: 5, alignItems: 'center' }}>
                                                {[0, 1, 2].map(i => <motion.div key={i} animate={{ y: [0, -5, 0] }} transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }} style={{ width: 7, height: 7, borderRadius: '50%', background: accent, opacity: 0.7 }} />)}
                                            </div>
                                        </motion.div>
                                    )}
                                    <div ref={bottomRef} />
                                </div>

                                {/* Input area */}
                                <div style={{ position: 'sticky', bottom: 0, background: 'rgba(6,4,18,0.85)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', borderTop: `1px solid ${accent}22`, padding: '0.6rem 0.9rem 0.9rem' }}>

                                    {/* ✨ Feature 2: Tone Translator */}
                                    <ToneBar
                                        draft={input}
                                        accent={accent}
                                        onApprove={(transformed) => {
                                            setInput(transformed);
                                        }}
                                    />

                                    {/* Chips */}
                                    <div style={{ display: 'flex', gap: 7, marginBottom: '0.65rem', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
                                        {CHIPS.map(chip => (
                                            <motion.button key={chip} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                                onClick={() => setInput(chip.replace(/[🕉🙏]/g, '').trim())}
                                                style={{ flexShrink: 0, padding: '0.32rem 0.75rem', background: 'rgba(255,255,255,0.06)', border: `1px solid ${accent}33`, borderRadius: 999, color: 'rgba(255,255,255,0.62)', fontSize: '0.73rem', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                                            >{chip}</motion.button>
                                        ))}
                                    </div>

                                    {/* Input row */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <button onClick={() => setIsSilent(s => !s)} style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: isSilent ? `${accent}28` : 'rgba(255,255,255,0.06)', border: `1px solid ${isSilent ? `${accent}55` : 'rgba(255,255,255,0.10)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: isSilent ? accent : 'rgba(255,255,255,0.38)' }}><Moon size={14} /></button>
                                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.40)', lineHeight: 0, padding: 4, flexShrink: 0 }}><Paperclip size={18} strokeWidth={1.8} /></button>

                                        <div style={{ flex: 1, position: 'relative' }}>
                                            <input value={input} onChange={e => setInput(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                                placeholder={isSilent ? '🌙 Silent message…' : 'Message…'}
                                                style={{ width: '100%', padding: '0.7rem 1rem', background: 'rgba(255,255,255,0.07)', border: `1px solid ${accent}28`, borderRadius: 999, color: 'rgba(255,255,255,0.88)', fontSize: '0.88rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.2s' }} />
                                        </div>

                                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.38)', lineHeight: 0, padding: 4, flexShrink: 0 }}><Smile size={18} strokeWidth={1.8} /></button>

                                        {input.trim() ? (
                                            <motion.button onClick={handleSend} whileTap={{ scale: 0.88 }} whileHover={{ scale: 1.07 }}
                                                style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, background: `radial-gradient(circle at 35% 35%, ${accent}ee, ${accent}88)`, border: 'none', cursor: 'pointer', lineHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 18px ${accent}66`, color: 'white' }}>
                                                <Send size={17} strokeWidth={2} />
                                            </motion.button>
                                        ) : (
                                            <motion.button whileTap={{ scale: 0.88 }} whileHover={{ scale: 1.07 }}
                                                style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, background: `radial-gradient(circle at 35% 35%, ${accent}ee, ${accent}88)`, border: 'none', cursor: 'pointer', lineHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 20px ${accent}66`, color: 'white' }}>
                                                <Mic size={18} strokeWidth={2} />
                                            </motion.button>
                                        )}
                                    </div>

                                    {isSilent && <p style={{ margin: '0.45rem 0 0', fontSize: '0.62rem', color: `${accent}88`, textAlign: 'center', fontStyle: 'italic' }}>🌙 Mindful Delivery — recipient will not be disturbed</p>}
                                </div>
                            </>
                        ) : (
                            /* Desktop empty state when no chat selected */
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, opacity: 0.35 }}>
                                <svg viewBox="0 0 64 64" fill="none" width="64" height="64">
                                    <path d="M32 52 C32 52 14 42 14 28 C14 20 20 15 26 17 C23 11 29 6 32 6 C35 6 41 11 38 17 C44 15 50 20 50 28 C50 42 32 52 32 52Z"
                                        fill={`${accent}18`} stroke={accent} strokeWidth="1.5" strokeLinejoin="round" />
                                    <circle cx="32" cy="28" r="3" fill={accent} opacity="0.5" />
                                </svg>
                                <p style={{ fontSize: '0.85rem', fontStyle: 'italic', fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 1.7 }}>
                                    Select a contact to begin<br />a conscious conversation
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Responsive CSS ── */}
            <style>{`
                @media (max-width: 767px) {
                    .sutratalk-sidebar {
                        width: 100% !important;
                        max-width: 100% !important;
                        border-right: none !important;
                        display: ${activeContact ? 'none' : 'flex'} !important;
                    }
                    .sutratalk-chatpanel {
                        display: ${activeContact ? 'flex' : 'none'} !important;
                        width: 100% !important;
                        position: fixed !important;
                        inset: 0 !important;
                    }
                }
                @media (min-width: 768px) {
                    .sutratalk-sidebar {
                        display: flex !important;
                    }
                    .sutratalk-chatpanel {
                        display: flex !important;
                    }
                }
            `}</style>
        </div>
    );
}
