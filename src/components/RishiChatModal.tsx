'use client';

import React, { useState, useRef, useCallback, useLayoutEffect, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { X, Mic, MicOff, PhoneOff, BookOpen, Send } from 'lucide-react';
import styles from './RishiChatModal.module.css';
import TypewriterMessage from './TypewriterMessage';
import { useRishiVoiceCall } from '@/hooks/useRishiVoiceCall';
import { useLanguage } from '@/context/LanguageContext';

// ── Rishi data ────────────────────────────────────────────────────────────────

export interface RishiInfo {
    id: string;
    name: string;
    nameEn: string;
    title: string;
    titleEn: string;
    symbol: string;
    color: string;
    bgGradient: string;
}

export const RISHIS: RishiInfo[] = [
    {
        id: 'veda-vyasa',
        name: 'वेद व्यास',
        nameEn: 'Veda Vyasa',
        title: 'महाभारत रचयिता',
        titleEn: 'Composer of Mahabharata',
        symbol: '📖',
        color: '#FFD700',
        bgGradient: 'radial-gradient(circle, rgba(255,215,0,0.18) 0%, transparent 70%)',
    },
    {
        id: 'valmiki',
        name: 'महर्षि वाल्मीकि',
        nameEn: 'Maharshi Valmiki',
        title: 'आदिकवि',
        titleEn: 'First Poet — Ramayana',
        symbol: '🏹',
        color: '#FF8C42',
        bgGradient: 'radial-gradient(circle, rgba(255,140,66,0.18) 0%, transparent 70%)',
    },
    {
        id: 'patanjali',
        name: 'महर्षि पतंजलि',
        nameEn: 'Maharshi Patanjali',
        title: 'योगसूत्र रचयिता',
        titleEn: 'Yoga Sutras — Ashtanga',
        symbol: '🧘',
        color: '#A78BFA',
        bgGradient: 'radial-gradient(circle, rgba(167,139,250,0.18) 0%, transparent 70%)',
    },
    {
        id: 'sushruta',
        name: 'महर्षि सुश्रुत',
        nameEn: 'Maharshi Sushruta',
        title: 'शल्य चिकित्सा जनक',
        titleEn: 'Father of Surgery',
        symbol: '⚕️',
        color: '#34D399',
        bgGradient: 'radial-gradient(circle, rgba(52,211,153,0.18) 0%, transparent 70%)',
    },
    {
        id: 'charaka',
        name: 'महर्षि चरक',
        nameEn: 'Maharshi Charaka',
        title: 'आयुर्वेद महाचार्य',
        titleEn: 'Pillar of Ayurveda',
        symbol: '🌿',
        color: '#F87171',
        bgGradient: 'radial-gradient(circle, rgba(248,113,113,0.18) 0%, transparent 70%)',
    },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
    role: 'rishi' | 'user';
    content: string;
    isTyping?: boolean;
}

type PersistedChatMessage = {
    role: 'rishi' | 'user';
    content: string;
};

function getAnonUserId(): string {
    if (typeof window === 'undefined') return 'anon';
    let uid = localStorage.getItem('pranaverse_uid');
    if (!uid) {
        uid = 'user_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
        localStorage.setItem('pranaverse_uid', uid);
    }
    return uid;
}

async function loadRishiChatHistory(uid: string, rishiId: string): Promise<PersistedChatMessage[]> {
    try {
        const { getFirebaseFirestore } = await import('@/lib/firebase');
        const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
        const db = await getFirebaseFirestore();
        const q = query(
            collection(db, 'rishi_conversations', uid, 'rishi_messages', rishiId, 'messages'),
            orderBy('createdAt', 'asc')
        );
        const snap = await getDocs(q);
        return snap.docs
            .map(d => d.data() as PersistedChatMessage)
            .filter(m => !!m?.content && (m.role === 'user' || m.role === 'rishi'));
    } catch {
        return [];
    }
}

async function saveRishiChatMessages(uid: string, rishiId: string, msgs: PersistedChatMessage[]) {
    try {
        const { getFirebaseFirestore } = await import('@/lib/firebase');
        const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
        const db = await getFirebaseFirestore();
        const colRef = collection(db, 'rishi_conversations', uid, 'rishi_messages', rishiId, 'messages');
        for (const msg of msgs) {
            await addDoc(colRef, { role: msg.role, content: msg.content, createdAt: serverTimestamp() });
        }
    } catch {
        // Silent failure to keep chat usable offline.
    }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface RishiChatModalProps {
    rishi: RishiInfo;
    onClose: () => void;
}

const FULL_PAGE_RISHIS = ['veda-vyasa', 'valmiki', 'patanjali', 'sushruta', 'charaka'];

export default function RishiChatModal({ rishi, onClose }: RishiChatModalProps) {
    const router = useRouter();
    const { lang } = useLanguage();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const prevCountRef = useRef(0);
    const uidRef = useRef(getAnonUserId());
    const requestInFlightRef = useRef(false);
    const allowSendRef = useRef(false); // ALWAYS false except during button clicks
    const lastRequestTimeRef = useRef(0); // Debounce requests
    const ongoingRequestRef = useRef<AbortController | null>(null); // Cancel ongoing requests

    const {
        callState, startCall, endCall,
        isMuted, toggleMute,
        isSpeaking,
        error: voiceError,
    } = useRishiVoiceCall({ rishiId: rishi.id, lang });

    // Scroll on new message
    useLayoutEffect(() => {
        if (messages.length > prevCountRef.current) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
        prevCountRef.current = messages.length;
    }, [messages]);

    // ── Clean modal state on open ──
    useEffect(() => {
        // Start fresh each time modal opens
        setMessages([]);

        return () => {
            // Cancel any ongoing requests when modal closes
            if (ongoingRequestRef.current) {
                ongoingRequestRef.current.abort();
            }
        };
    }, [rishi.id]);

    // Auto-resize textarea
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
    };

    // ── Send message ──────────────────────────────────────────────────────────
    const sendMessage = useCallback(async (source: 'button' | 'intro', text?: string, isIntro = false) => {
        const now = Date.now();
        console.log('[RishiChat] sendMessage called:', { 
            source, 
            allowSendRef: allowSendRef.current, 
            loading, 
            requestInFlight: requestInFlightRef.current,
            timeSinceLastRequest: now - lastRequestTimeRef.current,
            rishiId: rishi.id 
        });

        // ── SAFEGUARD 1: allowSendRef must be true (button must have set it) ──
        if (!allowSendRef.current) {
            console.warn('[RishiChat] ❌ BLOCKED: allowSendRef is false');
            return;
        }
        allowSendRef.current = false; // Consume immediately
        console.log('[RishiChat] ✅ allowSendRef consumed');
        
        // ── SAFEGUARD 2: No simultaneous requests ──
        if (loading || requestInFlightRef.current) {
            console.warn('[RishiChat] ❌ BLOCKED: Request already in flight');
            return;
        }

        // ── SAFEGUARD 3: Debounce (minimum 500ms between requests) ──
        if (now - lastRequestTimeRef.current < 500) {
            console.warn('[RishiChat] ❌ BLOCKED: Request debounced (too fast)');
            return;
        }
        lastRequestTimeRef.current = now;

        // ── SAFEGUARD 4: Source validation ──
        if (source !== 'button' && source !== 'intro') {
            console.warn('[RishiChat] ❌ BLOCKED: Invalid source:', source);
            return;
        }

        // ── SAFEGUARD 5: Input validation ──
        const userText = (text ?? input).trim();
        if (!userText && !isIntro) {
            console.warn('[RishiChat] ❌ BLOCKED: Empty text and not intro');
            return;
        }

        // Cancel any previous ongoing request
        if (ongoingRequestRef.current) {
            console.log('[RishiChat] ⚠️ Cancelling previous request');
            ongoingRequestRef.current.abort();
        }
        ongoingRequestRef.current = new AbortController();

        const userMsg: ChatMessage = {
            role: 'user',
            content: isIntro
                ? (lang === 'hi' ? '🙏 अपना परिचय दें' : '🙏 Please introduce yourself')
                : userText,
        };
        
        console.log('[RishiChat] 📤 Sending message:', userMsg);

        // Optimistically update UI
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        if (textAreaRef.current) {
            textAreaRef.current.style.height = 'auto';
            textAreaRef.current.blur();
        }
        setLoading(true);
        requestInFlightRef.current = true;

        try {
            const messagesForAPI = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
            
            const res = await fetch('/api/rishi-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rishiId: rishi.id,
                    messages: messagesForAPI,
                    language: lang,
                    isIntro,
                }),
                signal: ongoingRequestRef.current.signal,
            });

            console.log('[RishiChat] API Response Status:', res.status, res.statusText);

            if (!res.ok) {
                const errorText = await res.text();
                console.error('[RishiChat] ❌ API Error Response:', errorText);
                throw new Error(`API returned ${res.status}: ${errorText || 'Failed to reach the sage'}`);
            }

            const data = await res.json();
            console.log('[RishiChat] API Response Data:', data);

            if (data.rishiMessage) {
                const rishiReply: ChatMessage = { role: 'rishi', content: data.rishiMessage };
                setMessages(prev => [...prev, rishiReply]);
                
                console.log('[RishiChat] ✅ Response received:', rishiReply.content.substring(0, 50) + '...');

                // Persist to Firestore
                await saveRishiChatMessages(uidRef.current, rishi.id, [
                    { role: 'user', content: userMsg.content },
                    { role: 'rishi', content: rishiReply.content },
                ]);
            }
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                console.log('[RishiChat] ⏸️ Request was cancelled');
                return;
            }
            console.error('[RishiChat] ❌ Error:', err);
            
            const fallbackMsg: ChatMessage = {
                role: 'rishi',
                content: lang === 'hi'
                    ? 'क्षमा करें, संपर्क में बाधा आई। कृपया पुनः प्रयास करें।'
                    : 'Forgive me, the connection was disturbed. Please try again.',
            };
            setMessages(prev => [...prev, fallbackMsg]);
            await saveRishiChatMessages(uidRef.current, rishi.id, [
                { role: 'user', content: userMsg.content },
                { role: 'rishi', content: fallbackMsg.content },
            ]);
        } finally {
            requestInFlightRef.current = false;
            ongoingRequestRef.current = null;
            setLoading(false);
        }
    }, [input, loading, messages, rishi.id, lang]);

    // ── Load history on modal open ──
    useEffect(() => {
        let mounted = true;
        // Start fresh each time modal opens
        setMessages([]);

        return () => {
            mounted = false;
            // Cancel any ongoing requests when modal closes
            if (ongoingRequestRef.current) {
                ongoingRequestRef.current.abort();
            }
        };
    }, [rishi.id]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Rishi chat: absolutely NO keyboard-based send. Only the Send button
        // or the explicit "Intro" button may trigger messages.
        if (e.key === 'Enter') {
            e.preventDefault();
        }
    };

    // ── Safe button handlers: set flag, then call send ──
    const handleSendButtonClick = () => {
        console.log('[RishiChat] 🔘 SEND BUTTON CLICKED');
        allowSendRef.current = true;
        void sendMessage('button');
    };

    const handleIntroButtonClick = () => {
        console.log('[RishiChat] 🔘 INTRO BUTTON CLICKED');
        allowSendRef.current = true;
        void sendMessage('intro', undefined, true);
    };

    const voiceStatusText =
        callState === 'connecting' ? (lang === 'hi' ? '· जुड़ रहे हैं ·' : '· Connecting ·')
            : callState === 'active' && isSpeaking ? (lang === 'hi' ? '· ऋषि वाणी ·' : '· Sage Speaking ·')
                : callState === 'active' ? (lang === 'hi' ? '· सुन रहे हैं ·' : '· Listening ·')
                    : callState === 'error' ? '· Error ·'
                        : '';

    return (
        <>
            {/* Backdrop */}
            <motion.div
                key="rishi-backdrop"
                className={styles.backdrop}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={onClose}
            />

            {/* Modal */}
            <motion.div
                key="rishi-modal"
                className={styles.modal}
                initial={{ opacity: 0, scale: 0.8, x: '-50%', y: '-40%' }}
                animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
                exit={{ opacity: 0, scale: 0.9, x: '-50%', y: '-40%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            >
                {/* Handle (optional now, since it's an alert-like box) */}
                <div className={styles.handle} style={{ display: 'none' }} />

                {/* Header */}
                <div className={styles.header}>
                    <div
                        className={styles.rishiAvatar}
                        style={{ background: rishi.bgGradient }}
                    >
                        <span style={{ fontSize: '1.4rem' }}>{rishi.symbol}</span>
                    </div>
                    <div className={styles.headerInfo}>
                        <h2 className={styles.rishiName} style={{ color: rishi.color }}>
                            {lang === 'hi' ? rishi.name : rishi.nameEn}
                        </h2>
                        <p className={styles.rishiTitle}>
                            {lang === 'hi' ? rishi.title : rishi.titleEn}
                        </p>
                    </div>
                    <div className={styles.headerActions}>
                        <button className={styles.iconBtn} onClick={onClose} aria-label="Close">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Voice call bar (For ALL Rishis) */}
                <div className={styles.voiceArea}>
                    {callState === 'idle' || callState === 'disconnected' || callState === 'error' ? (
                        <button
                            className={styles.voiceBtn}
                            onClick={startCall}
                        >
                            <Mic size={13} />
                            {lang === 'hi' ? 'वाणी से बात करें' : 'Talk by Voice'}
                        </button>
                    ) : (
                        <>
                            <div className={styles.voicePulse} />
                            <span className={styles.voiceStatus}>{voiceStatusText}</span>
                            {callState === 'active' && (
                                <button className={styles.muteBtn} onClick={toggleMute}>
                                    {isMuted ? <MicOff size={11} /> : <Mic size={11} />}
                                    <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                                </button>
                            )}
                            <button
                                className={`${styles.voiceBtn} ${styles.voiceBtnActive}`}
                                style={{ marginLeft: 'auto' }}
                                onClick={endCall}
                            >
                                <PhoneOff size={13} />
                                {lang === 'hi' ? 'समाप्त' : 'End'}
                            </button>
                        </>
                    )}
                    {voiceError && callState === 'error' && (
                        <span style={{ fontSize: '0.65rem', color: 'rgba(252,165,165,0.7)', marginLeft: '0.5rem' }}>
                            {voiceError}
                        </span>
                    )}
                </div>

                {/* Chat area */}
                <div className={styles.chatArea}>
                    {messages.length === 0 && (
                        <div className={styles.welcomeState}>
                            <div className={styles.welcomeSymbol}>{rishi.symbol}</div>
                        <button
                            className={styles.introButton}
                            onClick={() => router.push(`/rishi/${rishi.id}`)}
                            style={{ 
                                background: rishi.color + '15',
                                borderColor: rishi.color + '40',
                                color: rishi.color,
                                padding: '12px 24px',
                                borderRadius: '8px',
                                border: '1.5px solid',
                                fontSize: '0.95rem',
                                fontWeight: '500',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.3s ease',
                            }}
                        >
                            <BookOpen size={16} />
                            {lang === 'hi' ? 'परिचय पढ़ें' : 'Read Introduction'}
                        </button>
                    </div>
                )}

                    {/* Messages */}
                    {messages.map((msg, idx) => (
                        <div key={idx} className={styles.msgWrap}>
                            {msg.role === 'rishi' ? (
                                <div
                                    className={styles.rishiMsg}
                                    style={{ borderLeftColor: rishi.color + '99' }}
                                    lang="hi"
                                    dir="auto"
                                >
                                    {idx === messages.length - 1 ? (
                                        <TypewriterMessage
                                            content={msg.content}
                                            speed={22}
                                            onUpdate={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })}
                                        />
                                    ) : msg.content}
                                </div>
                            ) : (
                                <div className={styles.userMsg}>{msg.content}</div>
                            )}
                        </div>
                    ))}

                    {loading && (
                        <div className={styles.thinkingWrap}>
                            <div className={styles.dot} />
                            <div className={styles.dot} />
                            <div className={styles.dot} />
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Coming Soon Message - No Chat Input */}
                <div style={{
                    padding: '1rem',
                    textAlign: 'center',
                    background: 'rgba(255,255,255,0.01)',
                    borderTop: '1px solid rgba(255,255,255,0.05)'
                }}>
                </div>
            </motion.div>
        </>
    );
}
