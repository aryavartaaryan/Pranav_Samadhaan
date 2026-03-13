'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Mic, Send } from 'lucide-react';
import { DhvaniRecorder } from '@/components/SutraTalk/DhvaniNote';

interface ChatInputBarProps {
    accent: string;
    chatId: string | null;
    user: { uid: string; name: string } | null;
    onMessageSend: (text: string, voiceNote?: any) => Promise<void>;
    markTyping: () => void;
    clearTyping: () => void;
}

export default function ChatInputBar({ accent, chatId, user, onMessageSend, markTyping, clearTyping }: ChatInputBarProps) {
    const [input, setInput] = useState('');
    const [showDhvani, setShowDhvani] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 200);
    }, [chatId]);

    const handleSend = useCallback(async () => {
        const text = input.trim();
        console.log('[ChatInputBar] ENTER handleSend', { text, showDhvani });
        if (!text && !showDhvani) {
            console.log('[ChatInputBar] ABORT handleSend: Empty text and no voice note');
            return;
        }
        setInput('');
        clearTyping();
        console.log('[ChatInputBar] CALLING onMessageSend prop...');
        try {
            await onMessageSend(text);
            console.log('[ChatInputBar] SUCCESS onMessageSend');
        } catch (e: any) {
            console.error('[ChatInputBar] ERROR bubbling up from onMessageSend:', e);
            alert('Error in onMessageSend: ' + e?.message);
        }
        setTimeout(() => inputRef.current?.focus(), 50);
    }, [input, onMessageSend, clearTyping, showDhvani]);

    return (
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
                                onSend={async (note: any, transcript: string) => {
                                    await onMessageSend(transcript, note);
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
    );
}
