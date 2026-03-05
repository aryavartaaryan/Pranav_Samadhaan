'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Search, Phone, Video,
    Send, Smile, Moon, Sun,
    MessageCircle, Users, Bot, LogOut,
    CheckCheck, Zap, Paperclip, Flame,
} from 'lucide-react';
import Link from 'next/link';
import { useOneSutraAuth } from '@/hooks/useOneSutraAuth';
import { useUsers } from '@/hooks/useUsers';
import { useMessages, getChatId } from '@/hooks/useMessages';
import { useCircadianBackground } from '@/hooks/useCircadianBackground';
import ToneBar from '@/components/SutraTalk/ToneBar';
import ActionDashboard from '@/components/SutraTalk/ActionDashboard';
import PranaIndicator from '@/components/SutraTalk/PranaIndicator';
import WelcomeFirstSpark from '@/components/SutraTalk/WelcomeFirstSpark';
import SattvaDelivery, { type DeliveryMode } from '@/components/SutraTalk/SattvaDelivery';
import OjasRecorder from '@/components/SutraTalk/OjasRecorder';
import WebRTCCallScreen, { type CallMode } from '@/components/SutraTalk/WebRTCCallScreen';
import { generateAutoPilotReply } from '@/services/AutoPilotService';

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
    const [fabOpen, setFabOpen] = useState(false);
    const [isTypingAI, setIsTypingAI] = useState(false);
    const [isAutoPilot, setIsAutoPilot] = useState(false);

    // ── New feature states ─────────────────────────────────────────────────────
    const [isBrahmastra, setIsBrahmastra] = useState(false);  // ephemeral mode
    const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('normal');
    const [showSattva, setShowSattva] = useState(false);
    const [callState, setCallState] = useState<{ callId: string; mode: CallMode } | null>(null);
    const [isTypingRemote, setIsTypingRemote] = useState(false); // simulate remote typing
    const [ephemeralMsgIds, setEphemeralMsgIds] = useState<Set<string>>(new Set());
    const [isGeneratingAutoPilot, setIsGeneratingAutoPilot] = useState(false);

    const bottomRef = useRef<HTMLDivElement>(null);
    const sendHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Chat ID
    const chatId = user && activeContact && !activeContact.isAI
        ? getChatId(user.uid, activeContact.uid)
        : null;
    const { messages, sendMessage } = useMessages(chatId, user?.uid ?? null);

    // Background
    const { phase, imageUrl } = useCircadianBackground('nature');
    const accent = phase.accentHex;
    const tint = phase.tint;

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length, isTypingAI, isTypingRemote]);

    // AutoPilot toggle
    const handleAutoPilotToggle = useCallback(async () => {
        if (!user?.uid) return;
        const next = !isAutoPilot;
        setIsAutoPilot(next);
        try {
            const { getApp } = await import('firebase/app');
            const { getFirestore, doc, setDoc } = await import('firebase/firestore');
            const db = getFirestore(getApp());
            await setDoc(doc(db, 'onesutra_users', user.uid), { isAutoPilotEnabled: next }, { merge: true });
        } catch { /* ignore */ }
    }, [user?.uid, isAutoPilot]);

    // Real contacts
    const AURA_PALETTE = ['#4A8EE8', '#60C860', '#E8A030', '#A880E0', '#E860A0', '#40C8E8'];
    const realContacts = realUsers.map((u, i) => ({
        uid: u.uid, name: u.name, photoURL: u.photoURL,
        aura: AURA_PALETTE[i % AURA_PALETTE.length],
        auraGlow: 'rgba(80,120,200,0.28)',
        isAI: false, statusLabel: 'oneSUTRA Member', online: false,
        role: u.email ?? 'Member',
        lastMsg: 'Say Namaste 🙏',
    }));

    const allContacts = [
        ...AI_CONTACTS.map(c => ({ ...c, photoURL: undefined as undefined, lastMsg: c.lastMsg })),
        ...realContacts,
    ];
    const filtered = allContacts.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const openChat = (c: typeof allContacts[0]) => {
        setActiveContact(c);
        setView('chat');
        setIsBrahmastra(false);
        setDeliveryMode('normal');
    };

    // ── Send message ──────────────────────────────────────────────────────────
    const handleSend = useCallback(async () => {
        if (!input.trim()) return;
        const text = input.trim();
        setInput('');

        if (activeContact?.isAI) {
            setIsTypingAI(true);
            setTimeout(() => setIsTypingAI(false), 2400);
        } else {
            const msgId = await sendMessage(text, user?.name ?? 'Traveller');
            // Brahmastra: schedule deletion after 10s
            if (isBrahmastra && msgId && typeof msgId === 'string') {
                setTimeout(async () => {
                    setEphemeralMsgIds(prev => new Set(prev).add(msgId));
                    // Also delete from Firestore
                    try {
                        const { getFirebaseFirestore } = await import('@/lib/firebase');
                        const { doc, deleteDoc } = await import('firebase/firestore');
                        const db = await getFirebaseFirestore();
                        await deleteDoc(doc(db, 'chats', chatId!, 'messages', msgId));
                    } catch { /* ignore */ }
                }, 10_000);
            }
        }
    }, [input, activeContact, sendMessage, user, isBrahmastra, chatId]);

    // ── AutoPilot Hi (send first message via AI) ──────────────────────────────
    const handleAutoPilotHi = useCallback(async () => {
        if (!user || !activeContact) return;
        setIsGeneratingAutoPilot(true);
        try {
            const aiText = await generateAutoPilotReply({
                userName: user.name,
                contactName: activeContact.name,
                messages: messages.map(m => ({
                    text: m.text,
                    senderName: m.senderName,
                    isMe: m.senderId === user.uid,
                    createdAt: m.createdAt,
                })),
                isOpening: messages.length === 0,
            });
            await sendMessage(aiText, user.name);
        } finally {
            setIsGeneratingAutoPilot(false);
        }
    }, [user, activeContact, messages, sendMessage]);

    // ── Long-press send logic ─────────────────────────────────────────────────
    const handleSendPointerDown = () => {
        sendHoldTimer.current = setTimeout(() => setShowSattva(true), 600);
    };
    const handleSendPointerUp = () => {
        if (sendHoldTimer.current) clearTimeout(sendHoldTimer.current);
        if (!showSattva) handleSend();
    };

    // ── Brahmastra swipe detection ────────────────────────────────────────────
    const dragStartX = useRef<number | null>(null);
    const handleBarDragStart = (e: React.PointerEvent) => { dragStartX.current = e.clientX; };
    const handleBarDragEnd = (e: React.PointerEvent) => {
        if (dragStartX.current !== null) {
            const dx = e.clientX - dragStartX.current;
            if (dx < -50) setIsBrahmastra(b => !b); // swipe left
            dragStartX.current = null;
        }
    };

    // ── Start WebRTC call ─────────────────────────────────────────────────────
    const startCall = (mode: CallMode) => {
        if (!user || !activeContact) return;
        const callId = `${chatId}_${Date.now()}`;
        setCallState({ callId, mode });
    };

    const CHIPS = activeContact?.isAI
        ? ['Send a Mantra 🕉', 'Analyse my Dosha', 'Summarise today']
        : ['Namaste 🙏', 'Schedule a call', 'Send a blessing'];

    // ──────────────────────────────────────────────────────────────────────────
    return (
        <div style={{ minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif", color: 'white', overflowX: 'hidden', position: 'relative' }}>

            {/* ══ Background ══ */}
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
            <img key={imageUrl} src={imageUrl} alt="" suppressHydrationWarning
                style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', zIndex: -2, transition: 'opacity 0.8s ease' }} />
            <div style={{ position: 'fixed', inset: 0, zIndex: -1, background: tint, pointerEvents: 'none' }} />

            {/* ── Brahmastra dark overlay ── */}
            <AnimatePresence>
                {isBrahmastra && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, zIndex: 0, background: 'rgba(0,0,0,0.50)', pointerEvents: 'none' }}
                    />
                )}
            </AnimatePresence>

            {/* ══ WebRTC Call Screen ══ */}
            <AnimatePresence>
                {callState && activeContact && user && (
                    <WebRTCCallScreen
                        callId={callState.callId}
                        isInitiator={true}
                        mode={callState.mode}
                        localUserId={user.uid}
                        remoteContact={activeContact}
                        accent={accent}
                        onEnd={() => setCallState(null)}
                    />
                )}
            </AnimatePresence>

            {/* ══ Sattva delivery picker ══ */}
            <SattvaDelivery
                isVisible={showSattva}
                accent={accent}
                current={deliveryMode}
                onSelect={setDeliveryMode}
                onClose={() => setShowSattva(false)}
            />

            {/* ══ Main layout ══ */}
            {user && (
                <div style={{ minHeight: '100vh', display: 'flex', maxWidth: 1280, margin: '0 auto', position: 'relative' }}>

                    {/* ═══ LEFT PANEL — Contact List ═══ */}
                    <div style={{ width: 'clamp(300px, 35%, 400px)', flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: `1px solid rgba(255,255,255,0.07)`, minHeight: '100vh' }} className="sutratalk-sidebar">

                        {/* Header */}
                        <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(2,4,12,0.72)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', borderBottom: `1px solid rgba(255,255,255,0.08)`, padding: '0.75rem 1rem 0.55rem' }}>
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

                        {/* Contact List */}
                        <div style={{ flex: 1, padding: '0.8rem 0.75rem 6rem', overflowY: 'auto' }}>
                            {filtered.map((c) => (
                                <div key={c.uid} onClick={() => openChat(c)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0.85rem 1.1rem', marginBottom: '0.55rem', cursor: 'pointer', background: activeContact?.uid === c.uid ? `${accent}18` : 'rgba(255,255,255,0.05)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: activeContact?.uid === c.uid ? `1px solid ${accent}44` : '1px solid rgba(255,255,255,0.09)', borderRadius: 18, transition: 'all 0.18s ease' }}
                                    onMouseEnter={e => { if (activeContact?.uid !== c.uid) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.09)'; }}
                                    onMouseLeave={e => { if (activeContact?.uid !== c.uid) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                                >
                                    <div style={{ position: 'relative', flexShrink: 0 }}>
                                        <div style={{ width: 48, height: 48, borderRadius: '50%', border: `1.5px solid ${c.aura}66`, boxShadow: `0 0 14px ${c.aura}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', overflow: 'hidden', background: `radial-gradient(circle at 35% 35%, ${c.aura}22, rgba(0,0,0,0.3))` }}>
                                            {(c as { photoURL?: string | null }).photoURL
                                                ? <img src={(c as { photoURL?: string | null }).photoURL!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                : <span>{(c as { emoji?: string }).emoji ?? '🧘'}</span>}
                                        </div>
                                        {c.online && <div style={{ position: 'absolute', bottom: 2, right: 2, width: 9, height: 9, borderRadius: '50%', background: '#5DDD88', border: '2px solid rgba(4,6,16,0.8)', boxShadow: '0 0 6px rgba(80,220,120,0.7)' }} />}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.16rem' }}>
                                            <span style={{ fontSize: '0.82rem', fontWeight: 500, fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.88)', letterSpacing: '0.01em' }}>{c.name}</span>
                                            {c.isAI && <span style={{ fontSize: '0.44rem', padding: '0.06rem 0.32rem', background: `${accent}22`, border: `1px solid ${accent}44`, borderRadius: 999, color: accent, letterSpacing: '0.12em', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'monospace' }}>AI</span>}
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.33)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif", lineHeight: 1.4 }}>
                                            {(c as { lastMsg?: string }).lastMsg ?? 'Begin a conscious conversation…'}
                                        </p>
                                    </div>
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
                            <motion.button onClick={() => setFabOpen(f => !f)} animate={{ rotate: fabOpen ? 45 : 0 }}
                                style={{ width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer', background: `radial-gradient(circle at 35% 35%, ${accent}ee, ${accent}88)`, boxShadow: `0 0 24px ${accent}66, 0 4px 20px rgba(0,0,0,0.4)`, color: 'white', fontSize: '1.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="New conversation">
                                <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>✦</span>
                            </motion.button>
                        </div>
                    </div>

                    {/* ═══ RIGHT PANEL — Chat View ═══ */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', minWidth: 0 }} className="sutratalk-chatpanel">

                        {activeContact ? (
                            <>
                                {/* Chat header */}
                                <div style={{ position: 'sticky', top: 0, zIndex: 100, background: isBrahmastra ? 'rgba(12,4,4,0.92)' : 'rgba(6,4,18,0.78)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', borderBottom: `1px solid ${isBrahmastra ? 'rgba(180,40,40,0.35)' : 'rgba(255,255,255,0.08)'}`, padding: '0.75rem 1rem', transition: 'all 0.4s ease' }}>
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
                                                {isBrahmastra && <span style={{ fontSize: '0.48rem', padding: '0.08rem 0.32rem', background: 'rgba(220,40,40,0.22)', border: '1px solid rgba(220,40,40,0.55)', borderRadius: 999, color: '#f87171', letterSpacing: '0.1em', fontFamily: 'monospace' }}>🔥 BRAHMASTRA</span>}
                                            </div>
                                            <p style={{ margin: 0, fontSize: '0.67rem', color: activeContact.online ? '#44DD44' : 'rgba(255,255,255,0.35)', fontFamily: 'monospace', letterSpacing: '0.04em' }}>
                                                {isTypingRemote ? '…thinking' : activeContact.isAI ? activeContact.statusLabel : (messages.length > 0 ? 'Active · real-time sync' : 'Tap to start')}
                                            </p>
                                        </div>

                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button onClick={() => startCall('voice')} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999, padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', color: 'rgba(255,255,255,0.65)', fontSize: '0.7rem', fontFamily: 'inherit' }}><Phone size={13} /></button>
                                            <button onClick={() => startCall('video')} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999, padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', color: 'rgba(255,255,255,0.65)', fontSize: '0.7rem', fontFamily: 'inherit' }}><Video size={13} /></button>
                                            {!activeContact.isAI && (
                                                <button onClick={handleAutoPilotToggle} title={isAutoPilot ? 'AutoPilot ON' : 'Enable AutoPilot'}
                                                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.4rem 0.75rem', borderRadius: 999, background: isAutoPilot ? `${accent}28` : 'rgba(255,255,255,0.06)', border: `1px solid ${isAutoPilot ? accent + '66' : 'rgba(255,255,255,0.10)'}`, cursor: 'pointer', color: isAutoPilot ? accent : 'rgba(255,255,255,0.45)', fontSize: '0.68rem', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
                                                    <Zap size={12} />
                                                    {isAutoPilot ? 'AI ON' : 'AutoPilot'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Action dashboard */}
                                {!activeContact.isAI && (
                                    <ActionDashboard chatId={chatId} accent={accent} />
                                )}

                                {/* ── Messages or Welcome ── */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', minHeight: 0 }}>

                                    {/* Welcome First Spark — empty chat with real user */}
                                    {messages.length === 0 && !activeContact.isAI ? (
                                        <WelcomeFirstSpark
                                            contactName={activeContact.name}
                                            accent={accent}
                                            onIceBreaker={async (text) => { setInput(text); setTimeout(() => handleSend(), 80); }}
                                            onAutoPilotHi={handleAutoPilotHi}
                                        />
                                    ) : (
                                        <div style={{ padding: '1rem 1rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                                            {messages.map((msg, i) => {
                                                const isMe = msg.senderId === user.uid;
                                                const isEphemeral = ephemeralMsgIds.has(msg.id);
                                                const isAIGenerated = (msg as { sentBy?: string }).sentBy === 'ai';
                                                return (
                                                    <AnimatePresence key={msg.id}>
                                                        {!isEphemeral && (
                                                            <motion.div
                                                                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                exit={{ opacity: 0, scale: 0.7, y: -10, filter: 'blur(8px)' }}
                                                                transition={{ delay: i < 10 ? i * 0.03 : 0, duration: 0.28, ease: 'easeOut' }}
                                                                style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8 }}
                                                            >
                                                                {!isMe && (
                                                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: `radial-gradient(circle, ${activeContact.auraGlow}, rgba(0,0,0,0.4))`, border: `1.5px solid ${activeContact.aura}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0, overflow: 'hidden' }}>
                                                                        {activeContact.photoURL ? <img src={activeContact.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>{activeContact.emoji ?? '🧘'}</span>}
                                                                    </div>
                                                                )}
                                                                <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 4 }}>
                                                                    {!isMe && (
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                                            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.38)', paddingLeft: 4 }}>{msg.senderName}</span>
                                                                            {isAIGenerated && <span style={{ fontSize: '0.48rem', padding: '0.05rem 0.3rem', background: `${accent}22`, border: `1px solid ${accent}55`, borderRadius: 999, color: accent, fontFamily: 'monospace', letterSpacing: '0.1em' }}>🤖 AI replied</span>}
                                                                        </div>
                                                                    )}
                                                                    <div style={{
                                                                        background: isMe
                                                                            ? `linear-gradient(135deg, ${accent}44 0%, ${accent}18 100%)`
                                                                            : 'rgba(255,255,255,0.08)',
                                                                        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                                                                        border: isMe
                                                                            ? isAIGenerated ? `1px solid #E8A030aa` : `1px solid ${accent}44`
                                                                            : '1px solid rgba(255,255,255,0.10)',
                                                                        // AI-generated amber glow border
                                                                        boxShadow: isAIGenerated && isMe ? '0 0 12px rgba(232,160,48,0.35)' : undefined,
                                                                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                                                        padding: '0.65rem 0.9rem',
                                                                    }}>
                                                                        <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.58, color: 'rgba(255,255,255,0.92)' }}>{msg.text}</p>
                                                                        {isBrahmastra && isMe && (
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: '0.25rem' }}>
                                                                                <Flame size={9} style={{ color: '#f87171' }} />
                                                                                <span style={{ fontSize: '0.52rem', color: '#f8717188', letterSpacing: '0.1em', fontFamily: 'monospace' }}>Burns in 10s</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                        <span style={{ fontSize: '0.60rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>{fmtTime(msg.createdAt)}</span>
                                                                        {isMe && <span style={{ color: `${accent}cc`, lineHeight: 0 }}><CheckCheck size={12} /></span>}
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                );
                                            })}

                                            {/* Prana typing indicator */}
                                            <PranaIndicator
                                                isVisible={isTypingAI || isTypingRemote}
                                                accent={accent}
                                                name={activeContact.name}
                                                avatarContent={activeContact.photoURL
                                                    ? <img src={activeContact.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    : <span>{activeContact.emoji ?? '🧘'}</span>
                                                }
                                            />
                                            <div ref={bottomRef} />
                                        </div>
                                    )}
                                </div>

                                {/* AutoPilot generating indicator */}
                                {isGeneratingAutoPilot && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '0.6rem', fontSize: '0.68rem', color: `${accent}bb`, fontFamily: 'monospace', letterSpacing: '0.08em' }}>
                                        ✦ AutoPilot is crafting your message…
                                    </motion.div>
                                )}

                                {/* ── Altar Input Bar (floating pill) ── */}
                                <div style={{ padding: '0 0.75rem 1.2rem', position: 'sticky', bottom: 0, zIndex: 10 }}>
                                    {/* ToneBar */}
                                    <div style={{ background: 'rgba(6,4,18,0.75)', backdropFilter: 'blur(20px)', padding: '0 0.25rem 0.4rem' }}>
                                        <ToneBar draft={input} accent={accent} onApprove={setInput} />
                                    </div>

                                    {/* Chips */}
                                    <div style={{ display: 'flex', gap: 7, marginBottom: '0.65rem', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
                                        {CHIPS.map(chip => (
                                            <motion.button key={chip} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                                onClick={() => setInput(chip.replace(/[🕉🙏]/g, '').trim())}
                                                style={{ flexShrink: 0, padding: '0.32rem 0.75rem', background: 'rgba(255,255,255,0.06)', border: `1px solid ${accent}33`, borderRadius: 999, color: 'rgba(255,255,255,0.62)', fontSize: '0.73rem', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                                            >{chip}</motion.button>
                                        ))}
                                    </div>

                                    {/* Floating Altar pill */}
                                    <motion.div
                                        onPointerDown={handleBarDragStart}
                                        onPointerUp={handleBarDragEnd}
                                        animate={{
                                            background: isBrahmastra
                                                ? ['rgba(40,6,6,0.88)', 'rgba(60,8,8,0.92)', 'rgba(40,6,6,0.88)']
                                                : 'rgba(6,4,18,0.82)',
                                            borderColor: isBrahmastra
                                                ? ['rgba(180,40,40,0.55)', 'rgba(220,60,60,0.75)', 'rgba(180,40,40,0.55)']
                                                : `${accent}33`,
                                        }}
                                        transition={{ duration: isBrahmastra ? 2.5 : 0.3, repeat: isBrahmastra ? Infinity : 0, ease: 'easeInOut' }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            padding: '0.55rem 0.65rem',
                                            borderRadius: 999,
                                            backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
                                            border: `1px solid ${accent}33`,
                                            boxShadow: isBrahmastra
                                                ? '0 0 30px rgba(180,40,40,0.35), 0 8px 28px rgba(0,0,0,0.5)'
                                                : `0 0 20px ${accent}18, 0 8px 24px rgba(0,0,0,0.45)`,
                                        }}
                                    >
                                        {/* Brahmastra / Silent toggle */}
                                        <button onClick={() => { }} style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: isBrahmastra ? 'rgba(180,40,40,0.28)' : 'rgba(255,255,255,0.06)', border: `1px solid ${isBrahmastra ? 'rgba(220,60,60,0.55)' : 'rgba(255,255,255,0.10)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: isBrahmastra ? '#f87171' : 'rgba(255,255,255,0.38)', fontSize: '1rem' }}>
                                            {isBrahmastra ? <Flame size={14} /> : <Moon size={14} />}
                                        </button>

                                        {/* Lotus/Attachment */}
                                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.40)', lineHeight: 0, padding: 4, flexShrink: 0 }}>
                                            <Paperclip size={18} strokeWidth={1.8} />
                                        </button>

                                        {/* Text input */}
                                        <div style={{ flex: 1, position: 'relative' }}>
                                            <input value={input} onChange={e => setInput(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                                placeholder={isBrahmastra ? '🔥 Brahmastra — burns after reading…' : 'Message…'}
                                                style={{ width: '100%', padding: '0.7rem 1rem', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.88)', fontSize: '0.88rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                                        </div>

                                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.38)', lineHeight: 0, padding: 4, flexShrink: 0 }}><Smile size={18} strokeWidth={1.8} /></button>

                                        {/* Ojas recorder */}
                                        {!input.trim() && (
                                            <OjasRecorder accent={accent} onRecordingComplete={() => { }} />
                                        )}

                                        {/* Send button with long-press for Sattva */}
                                        {input.trim() && (
                                            <motion.button
                                                onPointerDown={handleSendPointerDown}
                                                onPointerUp={handleSendPointerUp}
                                                whileTap={{ scale: 0.88 }} whileHover={{ scale: 1.07 }}
                                                style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, background: `radial-gradient(circle at 35% 35%, ${accent}ee, ${accent}88)`, border: 'none', cursor: 'pointer', lineHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 18px ${accent}66`, color: 'white' }}>
                                                <Send size={17} strokeWidth={2} />
                                            </motion.button>
                                        )}

                                        {/* Delivery badge */}
                                        {deliveryMode !== 'normal' && (
                                            <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                                                style={{ fontSize: '0.8rem', flexShrink: 0 }}>
                                                {deliveryMode === 'soft' ? '🌙' : '🌅'}
                                            </motion.span>
                                        )}
                                    </motion.div>

                                    {/* Brahmastra hint */}
                                    {isBrahmastra && (
                                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ margin: '0.4rem 0 0', fontSize: '0.6rem', color: '#f8717188', textAlign: 'center', fontFamily: 'monospace', letterSpacing: '0.08em' }}>
                                            🔥 Messages disintegrate 10 seconds after being read
                                        </motion.p>
                                    )}
                                </div>
                            </>
                        ) : (
                            /* Desktop empty state */
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
                    .sutratalk-sidebar { display: flex !important; }
                    .sutratalk-chatpanel { display: flex !important; }
                }
            `}</style>
        </div>
    );
}
