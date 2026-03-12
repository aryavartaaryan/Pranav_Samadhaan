'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Search, Phone, Video,
    Send, LogOut, MessageCircle, Users, Bot,
    CheckCheck, Zap, Plus, Mic,
} from 'lucide-react';
import Link from 'next/link';
import { useOneSutraAuth } from '@/hooks/useOneSutraAuth';
import { useUsers } from '@/hooks/useUsers';
import { useMessages, getChatId, type VoiceNote } from '@/hooks/useMessages';
import { useChats } from '@/hooks/useChats';
import { useCircadianBackground } from '@/hooks/useCircadianBackground';
import { usePranaPresence } from '@/hooks/usePranaPresence';
import ActionDashboard from '@/components/SutraTalk/ActionDashboard';
import WelcomeFirstSpark from '@/components/SutraTalk/WelcomeFirstSpark';
import { DhvaniRecorder, DhvaniPlayback } from '@/components/SutraTalk/DhvaniNote';

// ─── AI Contacts ───────────────────────────────────────────────────────────────
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

function fmtTime(ms: number): string {
    return new Date(ms).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

// ── Date separator label ───────────────────────────────────────────────────────
function dateSeparatorLabel(ms: number): string {
    const d = new Date(ms);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
    if (sameDay(d, today)) return 'Today';
    if (sameDay(d, yesterday)) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Prana breathing Bindu ──────────────────────────────────────────────────────
function PranaBindu({ accent }: { accent: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.4rem 0.8rem' }}>
            <div style={{ position: 'relative', width: 28, height: 28 }}>
                {/* Outer expanding ring */}
                <motion.div
                    animate={{ scale: [1, 2.2, 1], opacity: [0.35, 0.08, 0.35] }}
                    transition={{ duration: 8, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
                    style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1px solid ${accent}`, pointerEvents: 'none' }}
                />
                {/* Middle ring */}
                <motion.div
                    animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0.15, 0.5] }}
                    transition={{ duration: 8, repeat: Infinity, ease: [0.45, 0, 0.55, 1], delay: 1 }}
                    style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1px solid ${accent}88`, pointerEvents: 'none' }}
                />
                {/* Core Bindu */}
                <motion.div
                    animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 8, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
                    style={{ position: 'absolute', inset: 6, borderRadius: '50%', background: accent }}
                />
            </div>
            <motion.span
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                style={{ fontSize: '0.65rem', color: `${accent}99`, fontFamily: 'monospace', letterSpacing: '0.08em', fontStyle: 'italic' }}
            >
                present…
            </motion.span>
        </div>
    );
}

// ── AutoPilot intercept function ───────────────────────────────────────────────
async function callAutoPilot(params: {
    userName: string;
    contactName: string;
    lastMessages: Array<{ text: string; isMe: boolean; senderName: string }>;
}): Promise<string> {
    try {
        const prompt = `You are an AI proxy for ${params.userName}. Respond concisely, empathetically, and functionally to the incoming message based on the chat history below. Keep it under 2 sentences. Do not say you are an AI.

Chat history (last messages):
${params.lastMessages.map(m => `${m.isMe ? params.userName : params.contactName}: ${m.text}`).join('\n')}

Now reply as ${params.userName}'s proxy:`;

        const res = await fetch('/api/autopilot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
        });
        const data = await res.json();
        return data.text ?? '🙏 Thank you for your message.';
    } catch {
        return '🙏 Thank you for your message.';
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function OneSutraPage() {
    const { user, signOut } = useOneSutraAuth();
    const { users: realUsers } = useUsers(user?.uid ?? null);

    const [activeContact, setActiveContact] = useState<{
        uid: string; name: string; emoji?: string; photoURL?: string | null;
        aura: string; auraGlow: string; isAI: boolean; statusLabel: string; online: boolean; role: string;
    } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [input, setInput] = useState('');
    const [isAutoPilot, setIsAutoPilot] = useState(false);
    const [isAutoPilotGenerating, setIsAutoPilotGenerating] = useState(false);
    const [fabOpen, setFabOpen] = useState(false);
    const [showDhvani, setShowDhvani] = useState(false);

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const prevMsgCount = useRef(0);

    const chatId = user && activeContact && !activeContact.isAI
        ? getChatId(user.uid, activeContact.uid)
        : null;
    const { messages, sendMessage } = useMessages(chatId, user?.uid ?? null);
    const { remoteIsPresent, markTyping, clearTyping } = usePranaPresence(
        chatId,
        user?.uid ?? null,
        activeContact?.isAI ? null : activeContact?.uid ?? null
    );

    const { phase, imageUrl } = useCircadianBackground('nature');
    const accent = phase.accentHex;
    const tint = phase.tint;

    // Auto-scroll on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length, remoteIsPresent]);

    // Focus input when chat opens
    useEffect(() => {
        if (activeContact) setTimeout(() => inputRef.current?.focus(), 200);
    }, [activeContact]);

    // ── Mobile back button: intercept OS back when chat is open ─────────────
    // Strategy: push a dummy history entry when a contact opens. The OS back
    // button fires `popstate` (which pops that dummy entry). We intercept it,
    // prevent the navigation, and close the chat instead.
    useEffect(() => {
        if (activeContact) {
            // Push a sentinel so back button has something to pop
            window.history.pushState({ chatOpen: true }, '');
        }

        const handlePopState = (e: PopStateEvent) => {
            if (activeContact) {
                // Back pressed while chat is open → close it (stay on /onesutra)
                e.preventDefault?.();
                setActiveContact(null);
                // Re-push sentinel so a second back doesn't double-pop
                // (The user is now on the contact list; next back goes to home)
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [activeContact]);

    // ── AutoPilot: intercept NEW incoming messages ──────────────────────────
    useEffect(() => {
        if (!isAutoPilot || !user || !activeContact || !chatId) {
            prevMsgCount.current = messages.length;
            return;
        }
        // Detect a new message that's NOT from me
        if (messages.length > prevMsgCount.current) {
            const newMsgs = messages.slice(prevMsgCount.current);
            const incomingFromOther = newMsgs.find(m => m.senderId !== user.uid && m.sentBy !== 'ai');
            if (incomingFromOther) {
                // Generate AI reply
                setIsAutoPilotGenerating(true);
                const ctx = messages.slice(-10).map(m => ({
                    text: m.text,
                    isMe: m.senderId === user.uid,
                    senderName: m.senderName,
                }));
                callAutoPilot({
                    userName: user.name,
                    contactName: activeContact.name,
                    lastMessages: ctx,
                }).then(async (reply) => {
                    await sendMessage(reply, user.name, { sentBy: 'ai' });
                }).finally(() => setIsAutoPilotGenerating(false));
            }
        }
        prevMsgCount.current = messages.length;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages.length]);

    // ── Build contact list ──────────────────────────────────────────────────
    const AURA_PALETTE = ['#4A8EE8', '#60C860', '#E8A030', '#A880E0', '#E860A0', '#40C8E8'];
    const realContacts = realUsers.map((u, i) => ({
        uid: u.uid, name: u.name, photoURL: u.photoURL,
        aura: AURA_PALETTE[i % AURA_PALETTE.length],
        auraGlow: 'rgba(80,120,200,0.28)',
        isAI: false, statusLabel: 'oneSUTRA Member', online: false,
        role: u.email ?? 'Member',
    }));

    // Derive chatIds for realContacts so useChats can subscribe to metadata
    const realChatIds = user ? realContacts.map(c => getChatId(user.uid, c.uid)) : [];
    const chatMeta = useChats(realChatIds, user?.uid ?? null);

    const allContacts = [
        ...AI_CONTACTS.map(c => ({ ...c, photoURL: undefined as undefined })),
        ...realContacts,
    ];
    const filtered = allContacts.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const openChat = async (c: typeof allContacts[0]) => {
        setActiveContact(c);
        prevMsgCount.current = 0;
        setShowDhvani(false);
        // Clear my unread count when I open the chat
        if (!c.isAI && user) {
            try {
                const cid = getChatId(user.uid, c.uid);
                const { getFirebaseFirestore } = await import('@/lib/firebase');
                const { doc, setDoc } = await import('firebase/firestore');
                const db = await getFirebaseFirestore();
                await setDoc(doc(db, 'onesutra_chats', cid),
                    { [`unreadCounts.${user.uid}`]: 0 },
                    { merge: true }
                );
            } catch { /* ignore */ }
        }
    };

    // ── Send text message ───────────────────────────────────────────────────
    const handleSend = useCallback(async () => {
        const text = input.trim();
        if (!text) return;
        setInput('');
        clearTyping();
        await sendMessage(text, user?.name ?? 'Traveller', { sentBy: 'user' });
        setTimeout(() => inputRef.current?.focus(), 50);
    }, [input, sendMessage, user, clearTyping]);

    // ── AutoPilot toggle ────────────────────────────────────────────────────
    const handleAutoPilotToggle = useCallback(async () => {
        const next = !isAutoPilot;
        setIsAutoPilot(next);
        if (!user?.uid || !chatId) return;
        try {
            const { getFirebaseFirestore } = await import('@/lib/firebase');
            const { doc, setDoc } = await import('firebase/firestore');
            const db = await getFirebaseFirestore();
            // Write on the user doc (for Cloud Function AutoPilot reply trigger)
            await setDoc(doc(db, 'onesutra_users', user.uid),
                { isAutoPilotEnabled: next }, { merge: true });
            // Write on the chat doc (for sidebar AutoPilot amber border)
            await setDoc(doc(db, 'onesutra_chats', chatId),
                { [`isAutoPilotActive.${user.uid}`]: next }, { merge: true });
        } catch { /* ignore */ }
    }, [isAutoPilot, user?.uid, chatId]);

    // ── Build date-grouped messages ─────────────────────────────────────────
    type Row = { type: 'date'; label: string } | { type: 'msg'; msg: (typeof messages)[0] };
    const rows: Row[] = [];
    let lastDateStr = '';
    for (const msg of messages) {
        const label = dateSeparatorLabel(msg.createdAt);
        if (label !== lastDateStr) {
            rows.push({ type: 'date', label });
            lastDateStr = label;
        }
        rows.push({ type: 'msg', msg });
    }

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div style={{ minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif", color: 'white', overflowX: 'hidden', position: 'relative' }}>

            {/* Nature background */}
            <div style={{ position: 'fixed', inset: 0, zIndex: -3, background: phase.name === 'night' ? 'linear-gradient(160deg,#020508 0%,#080e1a 60%,#030710 100%)' : 'linear-gradient(160deg,#0a1a30 0%,#0e2a18 50%,#081828 100%)' }} />
            {imageUrl && <img key={imageUrl} src={imageUrl} alt="" suppressHydrationWarning style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', zIndex: -2, transition: 'opacity 0.8s ease' }} />}
            <div style={{ position: 'fixed', inset: 0, zIndex: -1, background: tint, pointerEvents: 'none' }} />

            {/* ── Guest Access Gate ────────────────────────────────────────────── */}
            {!user && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(2,3,14,0.65)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                    padding: '1rem'
                }}>
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        style={{
                            width: '100%', maxWidth: '420px',
                            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '28px', padding: '2rem', textAlign: 'center',
                            boxShadow: '0 24px 60px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.15)'
                        }}
                    >
                        <div style={{ width: 64, height: 64, margin: '0 auto 1.5rem', background: 'radial-gradient(circle, rgba(200,150,40,0.2) 0%, transparent 70%)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: '#D4A840' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                        </div>
                        <h2 style={{ margin: '0 0 0.8rem', fontSize: '1.4rem', fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>Welcome Traveller</h2>
                        <p style={{ margin: '0 0 2rem', fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                            SUTRAConnect is a private sanctuary. Sign up with Google to connect with our people's network.
                            <br /><br />
                            Do you want to sign up and enter?
                        </p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <Link href="/" style={{ flex: 1, textDecoration: 'none' }}>
                                <button style={{ width: '100%', padding: '0.9rem', borderRadius: '16px', background: 'white', color: 'black', border: 'none', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(255,255,255,0.25)' }}>
                                    Yes
                                </button>
                            </Link>
                            <Link href="/" style={{ flex: 1, textDecoration: 'none' }}>
                                <button style={{ width: '100%', padding: '0.9rem', borderRadius: '16px', background: 'transparent', color: 'white', border: '1.5px solid rgba(255,255,255,0.2)', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer' }}>
                                    No
                                </button>
                            </Link>
                        </div>
                    </motion.div>
                </div>
            )}

            {user && (
                <div style={{ minHeight: '100vh', display: 'flex', maxWidth: 1280, margin: '0 auto' }}>

                    {/* ════ SIDEBAR ════ */}
                    <div className="sutratalk-sidebar" style={{ width: 'clamp(300px,35%,400px)', flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.07)', minHeight: '100vh' }}>

                        {/* Header */}
                        <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(2,4,12,0.72)', backdropFilter: 'blur(28px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0.75rem 1rem 0.55rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.55rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Link href="/" style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 0 }}><ArrowLeft size={18} strokeWidth={1.6} /></Link>
                                    <motion.div animate={{ filter: [`drop-shadow(0 0 5px ${accent}60)`, `drop-shadow(0 0 14px ${accent}aa)`, `drop-shadow(0 0 5px ${accent}60)`] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} style={{ width: 26, height: 26, flexShrink: 0 }}>
                                        <svg viewBox="0 0 28 28" fill="none" width="26" height="26">
                                            <path d="M14 22 C14 22 6 18 6 12 C6 8 9 6 12 7 C10 4 13 2 14 2 C15 2 18 4 16 7 C19 6 22 8 22 12 C22 18 14 22 14 22Z" fill={`${accent}22`} stroke={accent} strokeWidth="1.2" strokeLinejoin="round" />
                                            <path d="M14 22 L14 26" stroke={accent} strokeWidth="1.1" strokeLinecap="round" opacity="0.5" />
                                        </svg>
                                    </motion.div>
                                    <div>
                                        <h1 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, fontFamily: "'Playfair Display', serif", color: 'rgba(255,255,255,0.95)' }}>SUTRAConnect</h1>
                                        <p style={{ margin: 0, fontSize: '0.5rem', color: `${accent}aa`, letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            Conscious Messenger
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: accent, marginLeft: 2 }}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                        </p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <div style={{ width: 30, height: 30, borderRadius: '50%', border: `1.5px solid ${accent}55`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {user.photoURL?.trim() ? <img src={user.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '0.75rem' }}>🧘</span>}
                                    </div>
                                    <button onClick={signOut} title="Sign out" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.45)' }}>
                                        <LogOut size={13} />
                                    </button>
                                </div>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <Search size={13} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.22)', pointerEvents: 'none' }} />
                                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search…" style={{ width: '100%', padding: '0.55rem 1rem 0.55rem 2.2rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, color: 'rgba(255,255,255,0.75)', fontSize: '0.82rem', outline: 'none', fontFamily: "'Inter', sans-serif", boxSizing: 'border-box' }} />
                            </div>
                        </div>

                        {/* Contacts */}
                        <div style={{ flex: 1, padding: '0.8rem 0.75rem 5rem', overflowY: 'auto' }}>
                            {filtered.map(c => {
                                const isRealContact = !c.isAI && user;
                                const cChatId = isRealContact ? getChatId(user!.uid, c.uid) : null;
                                const meta = cChatId ? chatMeta.get(cChatId) : null;

                                // Vibe aura color
                                const vibeRing = meta?.vibe === 'URGENT'
                                    ? { color: '#F59E0B', glow: 'rgba(245,158,11,0.6)' }
                                    : meta?.vibe === 'CALM'
                                        ? { color: '#10B981', glow: 'rgba(16,185,129,0.6)' }
                                        : meta?.vibe === 'DEEP'
                                            ? { color: '#3B82F6', glow: 'rgba(59,130,246,0.6)' }
                                            : null;

                                // Preview text logic
                                const unread = meta?.unreadCount ?? 0;
                                const hasLastMsg = meta && meta.lastMessageText;
                                const aiHandling = meta?.isAutoPilotActive && meta.lastMessageSenderId !== user?.uid;

                                let previewText: string;
                                let previewIsAI = false;
                                let previewIsTatva = false;

                                if (!hasLastMsg || !isRealContact) {
                                    previewText = c.isAI
                                        ? ((c as typeof AI_CONTACTS[0]).lastMsg)
                                        : 'Say Namaste 🙏';
                                } else if (unread > 2 && meta?.tatvaSummary) {
                                    previewText = meta.tatvaSummary;
                                    previewIsTatva = true;
                                } else if (aiHandling) {
                                    previewText = meta!.lastMessageText;
                                    previewIsAI = true;
                                } else {
                                    previewText = meta!.lastMessageText;
                                }

                                const isAutoPilotChat = meta?.isAutoPilotActive ?? false;
                                const isActive = activeContact?.uid === c.uid;
                                const hasUnread = unread > 0 && !isActive;

                                // Last message time string
                                const lastMsgTime = meta?.lastMessageAt
                                    ? new Date(meta.lastMessageAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                                    : null;

                                return (
                                    <motion.div key={c.uid}
                                        onClick={() => openChat(c)}
                                        whileHover={!isActive ? { scale: 1.015 } : {}}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 14,
                                            padding: '0.85rem 1.1rem', marginBottom: '0.55rem',
                                            cursor: 'pointer',
                                            // WhatsApp-style: active = accent tint, unread = green tint, normal = glass
                                            background: isActive
                                                ? `${accent}22`
                                                : hasUnread
                                                    ? 'rgba(37,211,102,0.10)'
                                                    : 'rgba(255,255,255,0.06)',
                                            backdropFilter: 'blur(24px)',
                                            WebkitBackdropFilter: 'blur(24px)',
                                            border: isActive
                                                ? `1px solid ${accent}44`
                                                : hasUnread
                                                    ? '1px solid rgba(37,211,102,0.35)'
                                                    : isAutoPilotChat
                                                        ? '1px solid rgba(245,158,11,0.40)'
                                                        : '1px solid rgba(255,255,255,0.10)',
                                            borderRadius: 18,
                                            boxShadow: hasUnread
                                                ? '0 0 18px rgba(37,211,102,0.12), 0 4px 16px rgba(0,0,0,0.25)'
                                                : isAutoPilotChat
                                                    ? 'inset 0 0 12px rgba(245,158,11,0.08), 0 4px 16px rgba(0,0,0,0.25)'
                                                    : '0 2px 10px rgba(0,0,0,0.18)',
                                            transition: 'all 0.18s ease',
                                        }}
                                    >
                                        {/* Avatar with Vibe ring */}
                                        <div style={{ position: 'relative', flexShrink: 0 }}>
                                            <div style={{
                                                width: 48, height: 48, borderRadius: '50%',
                                                border: vibeRing
                                                    ? `2px solid ${vibeRing.color}`
                                                    : `1.5px solid ${c.aura}66`,
                                                boxShadow: vibeRing
                                                    ? `0 0 16px ${vibeRing.glow}`
                                                    : `0 0 10px ${c.aura}33`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '1.4rem', overflow: 'hidden',
                                                background: `radial-gradient(circle at 35% 35%, ${c.aura}22, rgba(0,0,0,0.3))`,
                                            }}>
                                                {(c as { photoURL?: string | null }).photoURL?.trim()
                                                    ? <img src={(c as { photoURL?: string | null }).photoURL!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    : <span>{(c as { emoji?: string }).emoji ?? '🧘'}</span>}
                                            </div>
                                            {c.online && <div style={{ position: 'absolute', bottom: 2, right: 2, width: 9, height: 9, borderRadius: '50%', background: '#5DDD88', border: '2px solid rgba(4,6,16,0.8)' }} />}
                                        </div>

                                        {/* Name + preview + timestamp */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.22rem' }}>
                                                <span style={{
                                                    fontSize: '0.85rem',
                                                    // Bold + bright white when unread, normal when read
                                                    fontWeight: hasUnread ? 700 : 500,
                                                    color: hasUnread ? '#ffffff' : 'rgba(255,255,255,0.80)',
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                                                }}>{c.name}</span>
                                                {c.isAI && <span style={{ fontSize: '0.44rem', padding: '0.06rem 0.32rem', background: `${accent}22`, border: `1px solid ${accent}44`, borderRadius: 999, color: accent, letterSpacing: '0.12em', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'monospace', flexShrink: 0 }}>AI</span>}
                                                {isAutoPilotChat && !c.isAI && <span style={{ fontSize: '0.72rem', flexShrink: 0 }}>✨</span>}
                                                {/* Timestamp — top right */}
                                                {lastMsgTime && (
                                                    <span style={{
                                                        fontSize: '0.6rem', flexShrink: 0, marginLeft: 'auto',
                                                        color: hasUnread ? '#25D366' : 'rgba(255,255,255,0.28)',
                                                        fontFamily: 'monospace', letterSpacing: '0.02em',
                                                        fontWeight: hasUnread ? 700 : 400,
                                                    }}>{lastMsgTime}</span>
                                                )}
                                            </div>
                                            <p style={{
                                                margin: 0, fontSize: '0.73rem',
                                                // Unread: bright white. AI/Tatva: their colors. Read: muted.
                                                color: previewIsAI
                                                    ? 'rgba(245,158,11,0.80)'
                                                    : previewIsTatva
                                                        ? 'rgba(168,130,220,0.85)'
                                                        : hasUnread
                                                            ? 'rgba(255,255,255,0.85)'
                                                            : (!hasLastMsg || previewText === 'Say Namaste 🙏')
                                                                ? 'rgba(255,255,255,0.22)'
                                                                : 'rgba(255,255,255,0.45)',
                                                fontWeight: hasUnread ? 600 : 400,
                                                fontStyle: (previewIsTatva || (!hasLastMsg && !c.isAI)) ? 'italic' : 'normal',
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                lineHeight: 1.4,
                                            }}>
                                                {previewIsTatva && <span style={{ marginRight: 3 }}>✨</span>}
                                                {previewText}
                                            </p>
                                        </div>

                                        {/* WhatsApp-style unread count badge */}
                                        {hasUnread && (
                                            <motion.div
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                                                style={{
                                                    minWidth: 22, height: 22,
                                                    borderRadius: 999, flexShrink: 0,
                                                    background: '#25D366',
                                                    boxShadow: '0 2px 8px rgba(37,211,102,0.55)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '0.62rem', fontWeight: 800, color: '#ffffff',
                                                    padding: '0 5px',
                                                    letterSpacing: '-0.01em',
                                                    fontFamily: 'system-ui, sans-serif',
                                                }}
                                            >
                                                {unread > 99 ? '99+' : unread}
                                            </motion.div>
                                        )}
                                    </motion.div>
                                );
                            })}
                            {realContacts.length === 0 && <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'rgba(255,255,255,0.22)', fontStyle: 'italic', padding: '2rem 1rem', lineHeight: 1.8 }}>No other souls yet 🌿<br />Invite a friend to begin</p>}
                        </div>

                        {/* FAB */}
                        <div style={{ position: 'fixed', bottom: '1.5rem', left: 'max(1.2rem, calc(50vw - 640px + 1.2rem))', zIndex: 200 }}>
                            <AnimatePresence>
                                {fabOpen && (
                                    <motion.div initial={{ opacity: 0, y: 20, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.8 }} style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                                        {[{ icon: <MessageCircle size={16} />, label: 'New Chat' }, { icon: <Bot size={16} />, label: 'Consult AI Vaidya' }, { icon: <Users size={16} />, label: 'Invite Friend' }].map(({ icon, label }) => (
                                            <button key={label} onClick={() => setFabOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.55rem 1rem', borderRadius: 999, background: 'rgba(10,6,28,0.92)', backdropFilter: 'blur(20px)', border: `1px solid ${accent}55`, color: accent, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>{icon} {label}</button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <motion.button onClick={() => setFabOpen(f => !f)} animate={{ rotate: fabOpen ? 45 : 0 }} style={{ width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer', background: `radial-gradient(circle at 35% 35%, ${accent}ee, ${accent}88)`, boxShadow: `0 0 24px ${accent}66`, color: 'white', fontSize: '1.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="New conversation">
                                <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>✦</span>
                            </motion.button>
                        </div>
                    </div>

                    {/* ════ CHAT PANEL ════ */}
                    <div className="sutratalk-chatpanel" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', minWidth: 0, position: 'relative' }}>

                        {activeContact ? (
                            <>
                                {/* Header */}
                                <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(6,4,18,0.78)', backdropFilter: 'blur(32px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0.75rem 1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <button onClick={() => { setActiveContact(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', lineHeight: 0, padding: '4px' }}><ArrowLeft size={20} strokeWidth={2} /></button>
                                        <div style={{ position: 'relative' }}>
                                            <div style={{ width: 40, height: 40, borderRadius: '50%', border: `2px solid ${activeContact.aura}`, boxShadow: `0 0 14px ${activeContact.auraGlow}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', background: `radial-gradient(circle, ${activeContact.auraGlow}, rgba(0,0,0,0.4))`, overflow: 'hidden' }}>
                                                {activeContact.photoURL?.trim() ? <img src={activeContact.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>{activeContact.emoji ?? '🧘'}</span>}
                                            </div>
                                            {activeContact.online && <div style={{ position: 'absolute', bottom: 1, right: 1, width: 9, height: 9, borderRadius: '50%', background: '#44DD44', border: '2px solid rgba(6,4,18,1)' }} />}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, fontFamily: "'Playfair Display', serif", color: 'white' }}>{activeContact.name}</h2>
                                                {activeContact.isAI && <span style={{ fontSize: '0.52rem', padding: '0.1rem 0.38rem', background: `${accent}22`, border: `1px solid ${accent}44`, borderRadius: 999, color: accent, letterSpacing: '0.1em', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'monospace' }}>AI</span>}
                                                {/* AutoPilot ON badge */}
                                                {isAutoPilot && <span style={{ fontSize: '0.48rem', padding: '0.08rem 0.3rem', background: 'rgba(245,158,11,0.18)', border: '1px solid rgba(245,158,11,0.45)', borderRadius: 999, color: '#fbbf24', fontFamily: 'monospace', letterSpacing: '0.12em', textTransform: 'uppercase' }}>✨ AutoPilot</span>}
                                            </div>
                                            <p style={{ margin: 0, fontSize: '0.67rem', color: remoteIsPresent ? '#44DD44' : (activeContact.online ? '#44DD44' : 'rgba(255,255,255,0.35)'), fontFamily: 'monospace' }}>
                                                {remoteIsPresent ? 'present…' : (activeContact.isAI ? activeContact.statusLabel : 'Conscious connection')}
                                            </p>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999, padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.65)' }}><Phone size={13} /></button>
                                            <button style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999, padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.65)' }}><Video size={13} /></button>
                                            {!activeContact.isAI && (
                                                <button onClick={handleAutoPilotToggle} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.4rem 0.75rem', borderRadius: 999, background: isAutoPilot ? 'rgba(245,158,11,0.22)' : 'rgba(255,255,255,0.06)', border: `1px solid ${isAutoPilot ? 'rgba(245,158,11,0.55)' : 'rgba(255,255,255,0.10)'}`, cursor: 'pointer', color: isAutoPilot ? '#fbbf24' : 'rgba(255,255,255,0.45)', fontSize: '0.68rem', fontWeight: 600, fontFamily: "'Inter', sans-serif", boxShadow: isAutoPilot ? '0 0 12px rgba(245,158,11,0.3)' : 'none', transition: 'all 0.2s' }}>
                                                    <Zap size={12} />{isAutoPilot ? 'AI ON' : 'AutoPilot'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {!activeContact.isAI && <ActionDashboard chatId={chatId} accent={accent} />}

                                {/* ── Message Feed ── */}
                                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1rem 8rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>

                                    {/* Welcome state */}
                                    {messages.length === 0 && !activeContact.isAI && (
                                        <WelcomeFirstSpark
                                            contactName={activeContact.name} accent={accent}
                                            onIceBreaker={async (text) => { await sendMessage(text, user?.name ?? 'Traveller', { sentBy: 'user' }); }}
                                            onAutoPilotHi={() => { }}
                                        />
                                    )}

                                    {/* System Join Message */}
                                    {messages.length > 0 && !activeContact.isAI && (
                                        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0 0.4rem' }}>
                                            <div style={{ padding: '0.4rem 1rem', background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 999, fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                                <span style={{ fontSize: '0.9rem' }}>✨</span>
                                                <span><strong style={{ color: 'white' }}>{activeContact.name}</strong> joined OneSUTRA</span>
                                            </div>
                                        </div>
                                    )}

                                    {rows.map((row, rowIdx) => {
                                        if (row.type === 'date') {
                                            // ── Date separator pill ──
                                            return (
                                                <div key={`date-${rowIdx}`} style={{ display: 'flex', justifyContent: 'center', padding: '0.6rem 0' }}>
                                                    <div style={{ padding: '0.22rem 0.8rem', background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999, fontSize: '0.62rem', color: 'rgba(255,255,255,0.42)', fontFamily: 'monospace', letterSpacing: '0.08em' }}>
                                                        {row.label}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        const msg = row.msg;
                                        const isMe = msg.senderId === user.uid;
                                        const isAIMade = msg.sentBy === 'ai';

                                        return (
                                            <motion.div key={msg.id}
                                                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                transition={{ duration: 0.25, ease: 'easeOut' }}
                                                style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8 }}
                                            >
                                                {/* Avatar */}
                                                {!isMe && (
                                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: `radial-gradient(circle, ${activeContact.auraGlow}, rgba(0,0,0,0.4))`, border: `1.5px solid ${activeContact.aura}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0, overflow: 'hidden' }}>
                                                        {activeContact.photoURL?.trim() ? <img src={activeContact.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>{activeContact.emoji ?? '🧘'}</span>}
                                                    </div>
                                                )}

                                                <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 3 }}>
                                                    {/* Bubble
                                                        Me:    semi-transparent white/20 with white border — glassmorphism
                                                        Them:  dark black/30 with faint white border
                                                        AI:    amber glow border
                                                    */}
                                                    <div style={{
                                                        background: isMe
                                                            ? 'rgba(255,255,255,0.14)'
                                                            : 'rgba(0,0,0,0.35)',
                                                        backdropFilter: 'blur(20px)',
                                                        WebkitBackdropFilter: 'blur(20px)',
                                                        border: isMe
                                                            ? isAIMade
                                                                ? '1px solid rgba(245,158,11,0.55)'
                                                                : '1px solid rgba(255,255,255,0.28)'
                                                            : '1px solid rgba(255,255,255,0.10)',
                                                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                                        padding: '0.65rem 1rem',
                                                        boxShadow: isAIMade && isMe
                                                            ? '0 0 16px rgba(245,158,11,0.22), 0 4px 16px rgba(0,0,0,0.3)'
                                                            : '0 4px 16px rgba(0,0,0,0.25)',
                                                    }}>
                                                        {/* Voice note OR text */}
                                                        {msg.voiceNote
                                                            ? <DhvaniPlayback note={msg.voiceNote} accent={accent} isMe={isMe} />
                                                            : <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.58, color: isMe ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.85)' }}>{msg.text}</p>
                                                        }
                                                    </div>

                                                    {/* Timestamp + tick + AI badge */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <span style={{ fontSize: '0.60rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>{fmtTime(msg.createdAt)}</span>
                                                        {isAIMade && <span style={{ fontSize: '0.55rem', color: 'rgba(245,158,11,0.7)' }}>✨</span>}
                                                        {isMe && <CheckCheck size={12} style={{ color: `${accent}cc` }} />}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}

                                    {/* AutoPilot generating indicator */}
                                    {isAutoPilotGenerating && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', fontSize: '0.65rem', color: 'rgba(245,158,11,0.65)', fontFamily: 'monospace', letterSpacing: '0.08em', padding: '0.4rem' }}>
                                            ✨ AutoPilot is crafting a reply…
                                        </motion.div>
                                    )}

                                    {/* Prana Bindu — remote user is typing */}
                                    <AnimatePresence>
                                        {remoteIsPresent && !activeContact.isAI && (
                                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.4 }}>
                                                <PranaBindu accent={accent} />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div ref={bottomRef} />
                                </div>

                                {/* ══ GLASS ALTAR — floating input bar ══ */}
                                <div style={{ position: 'fixed', bottom: '1rem', left: 0, right: 0, padding: '0 1rem', zIndex: 50, display: 'flex', justifyContent: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 720, gap: '0.5rem' }}>

                                        {/* Dhvani recorder (expands above bar) */}
                                        <AnimatePresence>
                                            {showDhvani && chatId && user && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10, scale: 0.97 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 10, scale: 0.97 }}
                                                    style={{ background: 'rgba(6,4,18,0.82)', backdropFilter: 'blur(32px)', border: `1px solid ${accent}30`, borderRadius: 20, padding: '0.75rem 1rem' }}
                                                >
                                                    <DhvaniRecorder
                                                        accent={accent} chatId={chatId} userId={user.uid} userName={user.name}
                                                        onSend={async (note: VoiceNote, transcript: string) => {
                                                            await sendMessage(transcript, user.name, { sentBy: 'user', voiceNote: note });
                                                            setShowDhvani(false);
                                                        }}
                                                        onCancel={() => setShowDhvani(false)}
                                                    />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Main pill */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(6,4,18,0.72)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', border: `1px solid ${accent}30`, borderRadius: 999, padding: '0.5rem 0.6rem 0.5rem 1rem', boxShadow: `0 0 24px ${accent}18, 0 8px 28px rgba(0,0,0,0.45)` }}>

                                            {/* + / attachment */}
                                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.38)', lineHeight: 0, padding: '4px', flexShrink: 0 }}>
                                                <Plus size={20} strokeWidth={1.8} />
                                            </button>

                                            {/* Text input */}
                                            <input
                                                ref={inputRef}
                                                type="text"
                                                value={input}
                                                onChange={e => { setInput(e.target.value); markTyping(); }}
                                                onBlur={clearTyping}
                                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                                placeholder="Type a message…"
                                                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'rgba(255,255,255,0.90)', fontSize: '0.95rem', fontFamily: "'Inter', sans-serif", caretColor: accent, minWidth: 0 }}
                                            />

                                            {/* Mic / voice note button */}
                                            {!input.trim() && (
                                                <motion.button
                                                    whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                                                    onClick={() => setShowDhvani(d => !d)}
                                                    style={{ width: 42, height: 42, borderRadius: '50%', border: 'none', cursor: 'pointer', background: showDhvani ? `${accent}44` : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: showDhvani ? accent : 'rgba(255,255,255,0.55)', transition: 'all 0.2s' }}>
                                                    <Mic size={17} strokeWidth={2} />
                                                </motion.button>
                                            )}

                                            {/* Send button */}
                                            {input.trim() && (
                                                <motion.button
                                                    whileHover={{ scale: 1.08, boxShadow: `0 0 20px ${accent}88` }}
                                                    whileTap={{ scale: 0.92 }}
                                                    onClick={handleSend}
                                                    style={{ width: 42, height: 42, borderRadius: '50%', border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${accent}dd, ${accent}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'white', boxShadow: `0 0 14px ${accent}55`, transition: 'all 0.2s' }}>
                                                    <Send size={17} strokeWidth={2.2} style={{ transform: 'translateX(1px)' }} />
                                                </motion.button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, opacity: 0.35 }}>
                                <svg viewBox="0 0 64 64" fill="none" width="64" height="64">
                                    <path d="M32 52 C32 52 14 42 14 28 C14 20 20 15 26 17 C23 11 29 6 32 6 C35 6 41 11 38 17 C44 15 50 20 50 28 C50 42 32 52 32 52Z" fill={`${accent}18`} stroke={accent} strokeWidth="1.5" strokeLinejoin="round" />
                                    <circle cx="32" cy="28" r="3" fill={accent} opacity="0.5" />
                                </svg>
                                <p style={{ fontSize: '0.85rem', fontStyle: 'italic', color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 1.7 }}>Select a contact to begin<br />a conscious conversation</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

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
                input::placeholder { color: rgba(255,255,255,0.32); }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
