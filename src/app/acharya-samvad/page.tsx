'use client';

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, Suspense } from 'react';
import styles from './digital-vaidya.module.css';
import { Mic, MicOff, PhoneOff, X, ChevronRight, Search } from 'lucide-react';
import { BilingualString, BilingualList } from '@/lib/types';
import translations from '@/lib/vaidya-translations.json';
import { useSearchParams } from 'next/navigation';
import TypewriterMessage from '@/components/TypewriterMessage';
import { useLanguage } from '@/context/LanguageContext';
import AcharyaGuruOrb, { OrbStatus } from '@/components/Dashboard/AcharyaGuruOrb';
import { useVaidyaVoiceCall } from '@/hooks/useVaidyaVoiceCall';
import { motion, AnimatePresence } from 'framer-motion';
import { useCircadianUnsplash } from '@/hooks/useCircadianUnsplash';
import RishiChatModal, { RISHIS, type RishiInfo } from '@/components/RishiChatModal';
import GranthLibraryModal from '@/components/GranthLibrary/GranthLibraryModal';


// ── Darshanik Data ─────────────────────────────────────────────────────────

const DARSHANIK_CATEGORIES: {
    id: string;
    titleHi: string;
    titleEn: string;
    rishis: RishiInfo[];
}[] = [
    {
        id: 'shad-darshan',
        titleHi: 'षड आस्तिक दर्शन',
        titleEn: 'Six Orthodox Schools',
        rishis: [
            { id: 'kanada', name: 'महर्षि कणाद', nameEn: 'Maharshi Kanada', title: 'वैशेषिक सूत्र', titleEn: 'Vaisheshika Sutra', symbol: '⚛️', color: '#FCD34D', bgGradient: 'radial-gradient(circle, rgba(252,211,77,0.15) 0%, transparent 70%)' },
            { id: 'gautama', name: 'महर्षि गौतम', nameEn: 'Maharshi Gautama', title: 'न्याय सूत्र', titleEn: 'Nyaya Sutra', symbol: '⚖️', color: '#93C5FD', bgGradient: 'radial-gradient(circle, rgba(147,197,253,0.15) 0%, transparent 70%)' },
            { id: 'kapila', name: 'महर्षि कपिल', nameEn: 'Maharshi Kapila', title: 'सांख्य सूत्र', titleEn: 'Samkhya Sutra', symbol: '🔢', color: '#FCA5A5', bgGradient: 'radial-gradient(circle, rgba(252,165,165,0.15) 0%, transparent 70%)' },
            { id: 'patanjali', name: 'महर्षि पतंजलि', nameEn: 'Maharshi Patanjali', title: 'योग सूत्र', titleEn: 'Yoga Sutra', symbol: '🧘', color: '#A78BFA', bgGradient: 'radial-gradient(circle, rgba(167,139,250,0.15) 0%, transparent 70%)' },
            { id: 'jaimini', name: 'महर्षि जैमिनी', nameEn: 'Maharshi Jaimini', title: 'मीमांसा सूत्र', titleEn: 'Mimamsa Sutra', symbol: '🔥', color: '#FDBA74', bgGradient: 'radial-gradient(circle, rgba(253,186,116,0.15) 0%, transparent 70%)' },
            { id: 'veda-vyasa', name: 'महर्षि व्यास', nameEn: 'Maharshi Vyasa', title: 'वेदान्त सूत्र', titleEn: 'Vedanta Sutra', symbol: '📜', color: '#FDE047', bgGradient: 'radial-gradient(circle, rgba(253,224,71,0.15) 0%, transparent 70%)' },
        ]
    },
    {
        id: 'scientific',
        titleHi: 'वैज्ञानिक और गणितीय दार्शनिक',
        titleEn: 'Scientific & Mathematical',
        rishis: [
            { id: 'aryabhata', name: 'आर्यभट्ट', nameEn: 'Aryabhata', title: 'खगोल विज्ञान', titleEn: 'Astronomy', symbol: '🌍', color: '#60A5FA', bgGradient: 'radial-gradient(circle, rgba(96,165,250,0.15) 0%, transparent 70%)' },
            { id: 'brahmagupta', name: 'ब्रह्मगुप्त', nameEn: 'Brahmagupta', title: 'शून्य के नियम', titleEn: 'Rules of Zero', symbol: '0️⃣', color: '#34D399', bgGradient: 'radial-gradient(circle, rgba(52,211,153,0.15) 0%, transparent 70%)' },
            { id: 'chanakya', name: 'चाणक्य', nameEn: 'Chanakya', title: 'अर्थशास्त्र', titleEn: 'Economics', symbol: '🏰', color: '#F87171', bgGradient: 'radial-gradient(circle, rgba(248,113,113,0.15) 0%, transparent 70%)' },
        ]
    },
    {
        id: 'spiritual',
        titleHi: 'आध्यात्मिक और धार्मिक दार्शनिक',
        titleEn: 'Spiritual & Religious',
        rishis: [
            { id: 'vivekananda', name: 'स्वामी विवेकानंद', nameEn: 'Swami Vivekananda', title: 'राजयोग और कर्मयोग', titleEn: 'Raja Yoga & Karma Yoga', symbol: '🔥', color: '#F97316', bgGradient: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%)' },
            { id: 'dayanand-saraswati', name: 'स्वामी दयानन्द सरस्वती', nameEn: 'Swami Dayanand Saraswati', title: 'आर्य समाज संस्थापक', titleEn: 'Founder of Arya Samaj', symbol: '🕉️', color: '#FFA500', bgGradient: 'radial-gradient(circle, rgba(255,165,0,0.15) 0%, transparent 70%)' },
            { id: 'buddha', name: 'महात्मा बुद्ध', nameEn: 'Mahatma Buddha', title: 'अष्टांगिक मार्ग', titleEn: 'Noble Eightfold Path', symbol: '☸️', color: '#FCD34D', bgGradient: 'radial-gradient(circle, rgba(252,211,77,0.15) 0%, transparent 70%)' },
            { id: 'shankaracharya', name: 'आदि शंकराचार्य', nameEn: 'Adi Shankaracharya', title: 'अद्वैत वेदान्त', titleEn: 'Advaita Vedanta', symbol: '🔱', color: '#A78BFA', bgGradient: 'radial-gradient(circle, rgba(167,139,250,0.15) 0%, transparent 70%)' },
            { id: 'rajiv-dixit', name: 'राजीव दीक्षित', nameEn: 'Rajiv Dixit', title: 'स्वदेशी आंदोलन', titleEn: 'Swadeshi Movement', symbol: '🇮🇳', color: '#F87171', bgGradient: 'radial-gradient(circle, rgba(248,113,113,0.15) 0%, transparent 70%)' },
        ]
    }
];

// ── Firebase helpers ─────────────────────────────────────────────────────────
function getAnonUserId(): string {
    if (typeof window === 'undefined') return 'anon';
    let uid = localStorage.getItem('pranaverse_uid');
    if (!uid) {
        uid = 'user_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
        localStorage.setItem('pranaverse_uid', uid);
    }
    return uid;
}

async function loadChatHistory(uid: string): Promise<Message[]> {
    try {
        const { getFirebaseFirestore } = await import('@/lib/firebase');
        const { collection, getDocs, query, orderBy, limit } = await import('firebase/firestore');
        const db = await getFirebaseFirestore();
        const q = query(
            collection(db, 'acharya_conversations', uid, 'messages'),
            orderBy('createdAt', 'asc'),
            limit(50)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => {
            const data = d.data();
            return {
                role: data.role as 'vaidya' | 'user',
                content: data.content as string,
                isHistory: true // Mark as history to prevent typewriter effect
            };
        });
    } catch {
        return [];
    }
}

async function saveChatMessages(uid: string, msgs: { role: 'vaidya' | 'user'; content: string }[]) {
    try {
        const { getFirebaseFirestore } = await import('@/lib/firebase');
        const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
        const db = await getFirebaseFirestore();
        const colRef = collection(db, 'acharya_conversations', uid, 'messages');
        for (const msg of msgs) {
            await addDoc(colRef, { role: msg.role, content: msg.content, createdAt: serverTimestamp() });
        }
    } catch { /* silent — app works offline too */ }
}

interface DiagnosisResult {
    diagnosis: BilingualString;
    rootCause: BilingualString;
    ahara: { title: string, en: string[], hi: string[] };
    vihara: { title: string, en: string[], hi: string[] };
    closing: BilingualString;
    doshaMeter: { vata: number, pitta: number, kapha: number };
}

interface Message {
    role: 'vaidya' | 'user';
    content: string;
    status?: 'sending' | 'sent' | 'error';
    isTyping?: boolean;
    isHistory?: boolean;
}

function AcharyaContent() {
    const searchParams = useSearchParams();
    const initialLang = (searchParams?.get('lang') as 'en' | 'hi') || 'hi';

    // ── Text chat state ───────────────────────────────────────────────────────
    const [messages, setMessages] = useState<Message[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [input, setInput] = useState('');
    const [sanitizedInput, setSanitizedInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<DiagnosisResult | null>(null);
    const { lang, toggleLanguage } = useLanguage();
    const bottomRef = useRef<HTMLDivElement>(null);
    const uidRef = useRef(getAnonUserId());
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // ── Circadian background ─────────────────────────────────────────────────
    const { imageUrl } = useCircadianUnsplash();

    // ── Rishi modal state ────────────────────────────────────────────────────
    const [selectedRishi, setSelectedRishi] = useState<RishiInfo | null>(null);
    const [showDarshanikModal, setShowDarshanikModal] = useState(false);
    const [darshanikSearch, setDarshanikSearch] = useState('');
    const [showGranthModal, setShowGranthModal] = useState(false);

    // ── Inline voice engine ──────────────────────────────────────────────────
    const {
        callState, startCall, endCall,
        isMuted, toggleMute,
        transcript, isSpeaking,
    } = useVaidyaVoiceCall({ lang });
    const [zenMode, setZenMode] = useState(false);

    const orbStatus: OrbStatus =
        loading ? 'processing'
            : (callState === 'active' && isSpeaking) ? 'speaking'
                : (callState === 'active') ? 'listening'
                    : zenMode ? 'processing'
                        : 'idle';

    const handleAwakenAcharya = () => {
        setZenMode(true);
        setTimeout(() => startCall(), 120);
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([30, 50, 30]);
    };

    const handleEndSession = () => {
        endCall();
        setZenMode(false);
    };

    const t = translations[lang];

    const sanitizeText = useCallback((text: string): string => {
        if (!text) return '';
        let s = text.normalize('NFC');
        s = s.replace(/[\u200B-\u200D\uFEFF]/g, '');
        s = s.trim();
        s = s.replace(/\s+/g, ' ');
        return s;
    }, []);

    // ── Load history from Firestore on mount ─────────────────────────────────
    useEffect(() => {
        loadChatHistory(uidRef.current).then(history => {
            if (history.length > 0) setMessages(history);
            setHistoryLoading(false);
        });
    }, []);

    useEffect(() => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
            setSanitizedInput(sanitizeText(input));
        }, 150);
        return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); };
    }, [input, sanitizeText]);

    const prevMessageCountRef = useRef(0);
    useLayoutEffect(() => {
        if (messages.length > prevMessageCountRef.current && prevMessageCountRef.current > 0) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
        prevMessageCountRef.current = messages.length;
    }, [messages]);

    const handleScrollToBottom = useCallback(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, []);

    const handleSend = async () => {
        const userMsg = sanitizeText(input);
        if (!userMsg) return;
        const optimisticMessage: Message = { role: 'user', content: userMsg, status: 'sending' };
        setMessages(prev => [...prev, optimisticMessage]);
        setInput('');
        setSanitizedInput('');
        setLoading(true);

        try {
            const messagesForAPI = [...messages, optimisticMessage]
                .filter(m => m.content && m.content.trim() && typeof m.content === 'string')
                .map(m => ({ role: m.role === 'vaidya' ? 'assistant' : 'user', content: m.content.trim() }));

            const userName = localStorage.getItem('pranav_user_name') || '';
            const res = await fetch('/api/digital-vaidya', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: messagesForAPI, language: lang, userName }),
            });

            if (!res.ok) throw new Error(`Vaidya connection failed: ${res.status}`);
            const data = await res.json();

            if (!data || (!data.activeVaidyaMessage && !data.vaidyaMessage)) throw new Error('Invalid response');

            setMessages(prev => prev.map((msg, idx) =>
                idx === prev.length - 1 && msg.status === 'sending' ? { ...msg, status: 'sent' } : msg
            ));

            const responseText = (data.activeVaidyaMessage || data.vaidyaMessage)?.[lang]
                || (data.activeVaidyaMessage || data.vaidyaMessage)?.['hi'] || '';
            if (responseText && responseText.trim() && responseText.toLowerCase() !== 'undefined') {
                setMessages(prev => [...prev, { role: 'vaidya', content: responseText.trim() }]);
                // ── Persist exchange to Firestore ──
                saveChatMessages(uidRef.current, [
                    { role: 'user', content: userMsg },
                    { role: 'vaidya', content: responseText.trim() },
                ]);
            }
            if (data.isComplete && data.result) setResult(data.result);

        } catch (error: any) {
            setMessages(prev => prev.map((msg, idx) =>
                idx === prev.length - 1 && msg.status === 'sending' ? { ...msg, status: 'error' } : msg
            ));
            const errorMsg = lang === 'hi'
                ? 'क्षमा करें, ब्रह्मांडीय ऊर्जा अभी तीव्र है। कृपया कुछ क्षण प्रतीक्षा करें।'
                : 'Forgive me, the cosmic energies are intense. Please wait a moment.';
            setMessages(prev => [...prev, { role: 'vaidya', content: errorMsg }]);
        } finally {
            setLoading(false);
        }
    };

    const getText = (field: BilingualString | undefined) => {
        if (!field) return '';
        if (typeof field === 'string') return field;
        return field[lang] || field['en'] || '';
    };
    const getList = (field: any) => {
        if (!field) return [];
        if (Array.isArray(field)) return field;
        return field[lang] || field['en'] || [];
    };

    return (
        <div style={{ minHeight: '100dvh', position: 'relative', overflowX: 'hidden' }}>

            {/* ── Circadian nature background ── */}
            {imageUrl && (
                <img
                    src={imageUrl}
                    alt=""
                    style={{
                        position: 'fixed', inset: 0,
                        width: '100%', height: '100%',
                        objectFit: 'cover',
                        zIndex: -2,
                        opacity: 0.7,
                    }}
                />
            )}
            {/* Permanent dark gradient overlay */}
            <div style={{
                position: 'fixed', inset: 0, zIndex: -1,
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.60) 50%, #0A0A0A 100%)',
            }} />

            {/* ── ZEN MODE: Full-screen deep blur overlay ── */}
            <AnimatePresence>
                {zenMode && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6 }}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 10,
                            backdropFilter: 'blur(28px)',
                            WebkitBackdropFilter: 'blur(28px)',
                            background: 'rgba(0,0,0,0.50)',
                            pointerEvents: 'none',
                        }}
                    />
                )}
            </AnimatePresence>

            {/* ── ZEN MODE: Orb-centered full-screen experience ── */}
            <AnimatePresence>
                {zenMode && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 30,
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            gap: '2.5rem',
                        }}
                    >
                        {/* Hidden X exit button top-right */}
                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.3 }}
                            whileHover={{ opacity: 0.9 }}
                            onClick={handleEndSession}
                            style={{
                                position: 'absolute', top: '1.5rem', right: '1.5rem',
                                background: 'none', border: 'none',
                                color: 'rgba(255,255,255,0.8)', cursor: 'pointer',
                                padding: '0.5rem',
                            }}
                        >
                            <X size={22} />
                        </motion.button>

                        {/* Cosmic orb in Zen Mode — 1.8x expansion handled inside component */}
                        <AcharyaGuruOrb
                            status={orbStatus}
                            zenMode={true}
                            sizePx={148}
                        />

                        {/* Status whisper — minimal, no transcript text */}
                        <motion.div
                            animate={{ opacity: [0.4, 0.85, 0.4] }}
                            transition={{ duration: callState === 'active' ? 1.5 : 3, repeat: Infinity }}
                            style={{
                                fontSize: '0.65rem', letterSpacing: '0.28em',
                                textTransform: 'uppercase',
                                color: 'rgba(165,180,252,0.72)',
                                fontFamily: 'monospace',
                                marginTop: '5rem',
                            }}
                        >
                            {callState === 'connecting' ? '· जुड़ रहे हैं ·'
                                : callState === 'active' && isSpeaking ? '· आचार्य वाणी ·'
                                    : callState === 'active' ? '· शुनियत · Listening ·'
                                        : callState === 'error' ? '· Error — tap × to exit ·'
                                            : '· जागृत · Awakening ·'}
                        </motion.div>

                        {/* Mute control (very subtle) */}
                        {callState === 'active' && (
                            <motion.button
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 0.55, y: 0 }}
                                whileHover={{ opacity: 0.9 }}
                                onClick={toggleMute}
                                style={{
                                    position: 'absolute', bottom: '3rem',
                                    background: 'rgba(255,255,255,0.06)',
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(255,255,255,0.10)',
                                    borderRadius: 999, padding: '0.65rem 1.4rem',
                                    color: isMuted ? 'rgba(252,165,165,0.85)' : 'rgba(165,180,252,0.85)',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    fontSize: '0.72rem', letterSpacing: '0.1em',
                                }}
                            >
                                {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                                <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                            </motion.button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── NORMAL MODE: Full page content ── */}
            <AnimatePresence>
                {!zenMode && (
                    <motion.div
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.4 }}
                        style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}
                    >
                        {/* Sticky Rishi Navbar */}
                        <nav className={styles.rishiNavbar}>
                            <h1 className={styles.navbarTitle}>ऋषि मण्डली</h1>
                        </nav>
                        {/* ══════════════════════════════════════════════════════
                            RISHI MANDAL — Sacred Circle of Sages
                            ══════════════════════════════════════════════════════ */}
                        <section className={styles.rishiMandalSection}>

                            {/* Rotating Sri Yantra Chakra */}
                            <div className={styles.chakraBg} aria-hidden="true">
                                <svg viewBox="0 0 100 100" fill="none" stroke="#C49102" style={{ width: '100%', height: '100%' }}>
                                    <circle cx="50" cy="50" r="47" strokeWidth="0.25" opacity="0.5" />
                                    <circle cx="50" cy="50" r="40" strokeWidth="0.3" opacity="0.45" />
                                    <circle cx="50" cy="50" r="32" strokeWidth="0.25" opacity="0.35" />
                                    <circle cx="50" cy="50" r="22" strokeWidth="0.2" opacity="0.25" />
                                    {/* Outer diamond */}
                                    <path d="M50 3 L90 50 L50 97 L10 50 Z" strokeWidth="0.4" opacity="0.5" />
                                    {/* Inner diamond rotated 45deg */}
                                    <path d="M50 15 L85 50 L50 85 L15 50 Z" strokeWidth="0.3" opacity="0.4" />
                                    {/* Upward triangle */}
                                    <path d="M50 20 L78 68 L22 68 Z" strokeWidth="0.3" opacity="0.35" />
                                    {/* Downward triangle */}
                                    <path d="M50 80 L78 32 L22 32 Z" strokeWidth="0.3" opacity="0.35" />
                                    {/* Petals */}
                                    <circle cx="50" cy="30" r="5" strokeWidth="0.25" opacity="0.3" />
                                    <circle cx="67" cy="39" r="5" strokeWidth="0.25" opacity="0.3" />
                                    <circle cx="67" cy="61" r="5" strokeWidth="0.25" opacity="0.3" />
                                    <circle cx="50" cy="70" r="5" strokeWidth="0.25" opacity="0.3" />
                                    <circle cx="33" cy="61" r="5" strokeWidth="0.25" opacity="0.3" />
                                    <circle cx="33" cy="39" r="5" strokeWidth="0.25" opacity="0.3" />
                                    {/* Bindu */}
                                    <circle cx="50" cy="50" r="2.5" fill="#C49102" opacity="0.45" strokeWidth="0" />
                                </svg>
                            </div>




                            {/* 5 Rishi nodes — pentagonal arrangement */}
                            {RISHIS.map((rishi) => (
                                <motion.button
                                    key={rishi.id}
                                    className={styles.rishiNode}
                                    style={{ '--rishi-color': rishi.color } as React.CSSProperties}
                                    data-rishi={rishi.id}
                                    onClick={() => setSelectedRishi(rishi)}
                                    whileHover={{ scale: 1.08 }}
                                    whileTap={{ scale: 0.94 }}
                                    initial={{ opacity: 0, scale: 0.7 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: RISHIS.indexOf(rishi) * 0.1 + 0.2, type: 'spring', stiffness: 260, damping: 20 }}
                                >
                                    <span className={styles.rishiNodeSymbol}>{rishi.symbol}</span>
                                    <span className={styles.rishiNodeName} style={{ color: rishi.color }}>
                                        {lang === 'hi' ? rishi.name : rishi.nameEn}
                                    </span>
                                    <span className={styles.rishiNodeTitle}>
                                        {lang === 'hi' ? rishi.title : rishi.titleEn}
                                    </span>
                                </motion.button>
                            ))}

                            {/* Center: Acharya Orb + Voice button */}
                            <div className={styles.chakraCenterArea}>
                                <AcharyaGuruOrb
                                    status={orbStatus}
                                    zenMode={false}
                                    sizePx={110}
                                />
                                <motion.button
                                    whileHover={{ scale: 1.04 }}
                                    whileTap={{ scale: 0.96 }}
                                    onClick={handleAwakenAcharya}
                                    className={styles.awakenBtn}
                                >
                                    <Mic size={12} />
                                    {lang === 'hi' ? 'आचार्य जागृत करें' : 'Awaken Acharya'}
                                </motion.button>
                            </div>

                            {/* Side pillars: Darshanik (left) & Granth / Pustak (right) */}
                            <div className={styles.mandalSideLeft}>
                                <button 
                                    className={`${styles.mandalSideButton} ${styles.mandalDarshanikBtn}`}
                                    onClick={() => setShowDarshanikModal(true)}
                                >
                                    <span className={styles.mandalSideLabelHi}>दार्शनिक</span>
                                    <span className={styles.mandalSideLabelEn}>Philosophy</span>
                                </button>
                            </div>
                            <div className={styles.mandalSideRight}>
                                <button
                                    className={`${styles.mandalSideButton} ${styles.mandalGranthBtn}`}
                                    onClick={() => setShowGranthModal(true)}
                                >
                                    <span className={styles.mandalSideLabelHi}>ग्रंथ · पुस्तकें</span>
                                    <span className={styles.mandalSideLabelEn}>Texts &amp; Scriptures</span>
                                </button>
                            </div>
                        </section>

                        {/* ── Main content layer ── */}
                        <div className={styles.contentLayer}>
                            {/* Language toggle header */}
                            <header className={styles.headerSection}>
                                <button onClick={toggleLanguage} className={styles.langToggle}>
                                    {lang === 'hi' ? 'English' : 'हिन्दी'}
                                </button>
                                <h1 className={styles.headerTitle}>
                                    {lang === 'hi' ? 'आचार्य संवाद' : 'Acharya Samvad'}
                                </h1>
                            </header>

                            {/* ── Chat display — completely untouched ── */}
                            <section className={styles.chatContainer}>
                                {!result ? (
                                    <div className={styles.manuscriptCard}>
                                        {historyLoading ? (
                                            <div className={styles.welcomeMessage}>
                                                <p className={styles.welcomeText} style={{ opacity: 0.5 }}>
                                                    {lang === 'hi' ? '…स्मृति जाग रही है' : '…Awakening memory'}
                                                </p>
                                            </div>
                                        ) : messages.length === 0 && (
                                            <div className={styles.welcomeMessage}>
                                                <p className={styles.welcomeText}>
                                                    {lang === 'hi'
                                                        ? 'कैसे हो बेटाजी! आपको कोई भी स्वास्थ्य समस्या हो, आप यहाँ चैट पर लिखकर आयुर्वेद के अनुसार मुझसे स्वास्थ्य सलाह ले सकते हैं।'
                                                        : 'How are you, Beta! If you have any health concerns, you can message me here for Ayurvedic health advice.'}
                                                </p>
                                            </div>
                                        )}

                                        {messages
                                            .filter(msg => msg.content && msg.content.trim() && msg.content.toLowerCase() !== 'undefined')
                                            .map((msg, idx) => (
                                                <div key={idx} className={styles.messageWrapper}>
                                                    {msg.role === 'vaidya' ? (
                                                        <div className={styles.vaidyaMessage} lang="hi" dir="auto">
                                                            {idx === messages.length - 1 && !msg.isHistory ? (
                                                                <TypewriterMessage
                                                                    content={msg.content || ''}
                                                                    speed={25}
                                                                    onUpdate={handleScrollToBottom}
                                                                />
                                                            ) : (msg.content || '')}
                                                        </div>
                                                    ) : (
                                                        <div className={styles.userMessage}>
                                                            "{msg.content || ''}"
                                                            {msg.status === 'sending' && (
                                                                <span className={styles.sendingIndicator}>
                                                                    {' '}({lang === 'hi' ? 'भेज रहे हैं...' : 'Sending...'})
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}

                                        {loading && (
                                            <div className={styles.contemplating}>
                                                <div className={styles.diyaContainer}>
                                                    <div className={styles.diyaFlame} />
                                                    <div className={styles.diyaBase} />
                                                </div>
                                            </div>
                                        )}
                                        <div ref={bottomRef} />
                                    </div>
                                ) : (
                                    <div className={styles.resultSheet}>
                                        <h2 className={styles.resultTitle}>
                                            {lang === 'hi' ? 'परीक्षण का परिणाम' : 'Diagnosis Results'}
                                        </h2>
                                        <div className="mb-6">
                                            <h3 className="text-xl font-bold text-[#8A3324] mb-2">{lang === 'hi' ? 'निदान' : 'Diagnosis'}</h3>
                                            <p className="text-lg leading-relaxed">{getText(result.diagnosis)}</p>
                                        </div>
                                        <div className="mb-6">
                                            <h3 className="text-xl font-bold text-[#8A3324] mb-2">{lang === 'hi' ? 'मूल कारण' : 'Root Cause'}</h3>
                                            <p className="text-lg leading-relaxed">{getText(result.rootCause)}</p>
                                        </div>
                                        <div className="mt-8 text-left">
                                            <h3 style={{ color: '#C49102', fontFamily: 'var(--font-header)' }}>{t.dietLabel}</h3>
                                            <ul style={{ marginBottom: '2rem', paddingLeft: '1.5rem', color: '#5D4037' }}>
                                                {getList(result.ahara).map((item: string, i: number) => (
                                                    <li key={i} style={{ marginBottom: '0.5rem' }}>{item}</li>
                                                ))}
                                            </ul>
                                            <h3 style={{ color: '#C49102', fontFamily: 'var(--font-header)' }}>{t.routineLabel}</h3>
                                            <ul style={{ marginBottom: '2rem', paddingLeft: '1.5rem', color: '#5D4037' }}>
                                                {getList(result.vihara).map((item: string, i: number) => (
                                                    <li key={i} style={{ marginBottom: '0.5rem' }}>{item}</li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div style={{ marginTop: '2rem', fontStyle: 'italic', color: '#8A3324', fontSize: '1.2rem', textAlign: 'center' }}>
                                            "{getText(result.closing)}"
                                        </div>
                                        <div className="text-center mt-8">
                                            <button
                                                onClick={() => window.location.reload()}
                                                className={styles.submitButton}
                                                style={{ position: 'relative', border: '1px solid #C49102', padding: '0.5rem 2rem', borderRadius: '4px' }}
                                            >
                                                {lang === 'hi' ? 'नया परामर्श' : 'New Consultation'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* ── Input zone — completely untouched ── */}
                            {!result && (
                                <footer className={styles.inputZone}>
                                    <div className={styles.inputWrapper}>
                                        <textarea
                                            className={styles.goldInput}
                                            placeholder={lang === 'hi' ? 'अपनी समस्या यहाँ लिखें...' : 'Share your ailment here...'}
                                            value={input}
                                            onChange={e => setInput(e.target.value)}
                                            onKeyDown={e => {
                                                const nativeEvt: any = e.nativeEvent;
                                                if ((nativeEvt && nativeEvt.isComposing) || (e as any).keyCode === 229) return;

                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    // On mobile, completely block Enter-to-send to avoid IME auto-submit.
                                                    const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                                                    if (isMobile) {
                                                        e.preventDefault();
                                                        return;
                                                    }
                                                    e.preventDefault();
                                                    if (input.trim()) {
                                                        handleSend();
                                                    }
                                                }
                                            }}
                                            disabled={loading}
                                            rows={1}
                                            spellCheck={false}
                                            autoCorrect="off"
                                            autoCapitalize="none"
                                            autoComplete="off"
                                        />
                                        <button
                                            className={styles.submitButton}
                                            onClick={handleSend}
                                            disabled={loading || !sanitizedInput.trim()}
                                            aria-label={lang === 'hi' ? 'भेजें' : 'Send'}
                                        />
                                    </div>
                                    <div className={styles.footerDedication}>Dedicated to the Lineage of Ayurveda</div>
                                </footer>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Darshanik Modal ── */}
            <AnimatePresence>
                {showDarshanikModal && (
                    <motion.div 
                        className={styles.modalOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowDarshanikModal(false)}
                    >
                        <motion.div 
                            className={styles.modalContainer}
                            onClick={e => e.stopPropagation()}
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                        >
                            <header className={styles.modalHeader}>
                                <h2 className={styles.modalTitle}>
                                    {lang === 'hi' ? 'दार्शनिक मंडल' : 'Philosophers Council'}
                                </h2>
                                <button className={styles.closeButton} onClick={() => setShowDarshanikModal(false)}>
                                    <X size={20} />
                                </button>
                            </header>

                            {/* Search Bar */}
                            <div className={styles.searchBarContainer} style={{ margin: '1rem 2rem 0' }}>
                                <Search size={18} className={styles.searchIcon} />
                                <input
                                    type="text"
                                    placeholder={lang === 'hi' ? 'दार्शनिक खोजें...' : 'Search Philosophers...'}
                                    value={darshanikSearch}
                                    onChange={(e) => setDarshanikSearch(e.target.value)}
                                    className={styles.searchInput}
                                    autoFocus
                                />
                            </div>
                            
                            <div className={styles.modalScroll}>
                                {DARSHANIK_CATEGORIES.map(category => {
                                    const filteredRishis = category.rishis.filter(rishi => {
                                        const query = darshanikSearch.toLowerCase();
                                        return (
                                            rishi.name.toLowerCase().includes(query) ||
                                            rishi.nameEn.toLowerCase().includes(query) ||
                                            rishi.title.toLowerCase().includes(query) ||
                                            rishi.titleEn.toLowerCase().includes(query)
                                        );
                                    });

                                    if (filteredRishis.length === 0) return null;

                                    return (
                                    <div key={category.id} className={styles.categorySection}>
                                        <h3 className={styles.categoryTitle}>
                                            <ChevronRight size={16} />
                                            <span>{lang === 'hi' ? category.titleHi : category.titleEn}</span>
                                        </h3>
                                        <div className={styles.rishiGrid}>
                                            {filteredRishis.map(rishi => (
                                                <button
                                                    key={rishi.id}
                                                    className={styles.rishiCard}
                                                    onClick={() => {
                                                        setSelectedRishi(rishi);
                                                        setShowDarshanikModal(false);
                                                    }}
                                                >
                                                    <div className={styles.rishiCardSymbol}>{rishi.symbol}</div>
                                                    <div className={styles.rishiCardName}>
                                                        {lang === 'hi' ? rishi.name : rishi.nameEn}
                                                    </div>
                                                    <div className={styles.rishiCardTitle}>
                                                        {lang === 'hi' ? rishi.title : rishi.titleEn}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>

                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Granth Library Modal ── */}
            <AnimatePresence>
                {showGranthModal && <GranthLibraryModal isOpen={true} onClose={() => setShowGranthModal(false)} />}
            </AnimatePresence>

            {/* ── Rishi Chat Modal ── */}
            <AnimatePresence>
                {selectedRishi && (
                    <RishiChatModal
                        key={selectedRishi.id}
                        rishi={selectedRishi}
                        onClose={() => setSelectedRishi(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

export default function AcharyaSamvadPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', background: '#020617' }} />}>
            <AcharyaContent />
        </Suspense>
    );
}

