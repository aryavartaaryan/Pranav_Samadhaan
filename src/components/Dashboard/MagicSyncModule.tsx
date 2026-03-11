'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Clock, Check, X, ChevronRight, Brain, Calendar, ChevronLeft } from 'lucide-react';
import { getFirebaseAuth } from '@/lib/firebase';
import { getFirebaseFirestore } from '@/lib/firebase';

// ── Types ──────────────────────────────────────────────────────────────────
export interface Sankalp { id: string; text: string; done: boolean; }

export interface TaskItem {
    id: string;
    text: string;
    icon: string;
    colorClass: string;
    accentColor: string;
    category: string;
    done: boolean;
    scheduledDate?: string;   // ISO date string  "2026-03-03"
    scheduledTime?: string;   // "3:00 PM"
    aiAdvice?: string;
    createdAt: number;        // epoch ms
    uid?: string;
}

interface MagicSyncModuleProps {
    items: TaskItem[];
    onToggle: (id: string) => void;
    onRemove: (id: string) => void;
    onAdd: (task: TaskItem) => void;
    onUpdate: (id: string, updates: Partial<TaskItem>) => void;
}

// ── Gemini helpers ─────────────────────────────────────────────────────────
let _apiKeyCache: string | null = null;
async function fetchApiKey(): Promise<string | null> {
    if (_apiKeyCache) return _apiKeyCache;
    try { const r = await fetch('/api/gemini-live-token', { method: 'POST' }); if (!r.ok) return null; const d = await r.json(); _apiKeyCache = d.apiKey; return _apiKeyCache; } catch { return null; }
}

async function categorizeViaGemini(text: string) {
    const instant = keywordCategorize(text);
    try {
        const apiKey = await fetchApiKey(); if (!apiKey) return instant;
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: 'gemini-2.5-flash' });
        const raw = (await model.generateContent(`Categorize into ONE: DeepWork, Health, Connection, Creative, Spiritual, Rest. Reply ONLY as CATEGORY|EMOJI\nTask: "${text}"`)).response.text().trim();
        const [cat, emoji] = raw.split('|');
        if (emoji && cat) return mapCategoryToStyle(cat.trim(), emoji.trim());
    } catch { /* fallback */ }
    return instant;
}

async function getAIAdvice(text: string, category: string): Promise<string> {
    try {
        const apiKey = await fetchApiKey(); if (!apiKey) return localAdvice(category);
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: 'gemini-2.5-flash' });
        const advice = (await model.generateContent(
            `You are a calm Vedic productivity AI coach. Give ONE short actionable tip (max 20 words, specific, warm) for completing this task efficiently.\nTask: "${text}"\nCategory: ${category}`
        )).response.text().trim().replace(/[*_#`]/g, '').slice(0, 120);
        return advice;
    } catch { return localAdvice(category); }
}

function localAdvice(cat: string): string {
    const m: Record<string, string> = { 'Deep Work': 'Block 90 min. Start with the hardest part first — momentum is everything.', Health: 'Do it right after this session. The body moves when the mind clears first.', Spiritual: 'Morning practice compounds daily. Even 10 minutes reshapes your whole day.', Creative: 'Begin without judging. The muse always arrives after you start.', Connection: 'Be fully present — one genuine moment matters more than the perfect words.', Rest: 'Rest is Prāna recovery. Protect it like your most important meeting.' };
    return m[cat] || 'Begin now. Done imperfectly beats waiting for perfect conditions.';
}

function keywordCategorize(text: string) {
    const t = text.toLowerCase();
    if (t.match(/code|work|build|debug|report|project|meeting|email|review|call/)) return mapCategoryToStyle('DeepWork', '💻');
    if (t.match(/meditat|breathe|yoga|pranayam|dhyan|mantra|puja|aarti/)) return mapCategoryToStyle('Spiritual', '🧘');
    if (t.match(/water|exercise|run|walk|gym|eat|sleep|rest|health|cook|meal/)) return mapCategoryToStyle('Health', '🌿');
    if (t.match(/friend|family|message|connect|talk|birthday|visit/)) return mapCategoryToStyle('Connection', '🤝');
    if (t.match(/draw|design|music|art|guitar|paint|sketch|create/)) return mapCategoryToStyle('Creative', '🎨');
    if (t.match(/read|book|study|learn|journal|gratitude|reflect/)) return mapCategoryToStyle('Creative', '📖');
    return mapCategoryToStyle('Spiritual', '✨');
}

function mapCategoryToStyle(category: string, icon: string) {
    const cat = category.trim().toLowerCase();
    if (cat.includes('deep') || cat.includes('work')) return { icon, category: 'Deep Work', colorClass: 'blue', accentColor: 'rgba(96,165,250,0.85)' };
    if (cat.includes('health')) return { icon, category: 'Health', colorClass: 'green', accentColor: 'rgba(110,231,183,0.85)' };
    if (cat.includes('connect')) return { icon, category: 'Connection', colorClass: 'teal', accentColor: 'rgba(45,212,191,0.85)' };
    if (cat.includes('creat')) return { icon, category: 'Creative', colorClass: 'purple', accentColor: 'rgba(196,181,253,0.85)' };
    if (cat.includes('spirit') || cat.includes('meditat')) return { icon, category: 'Spiritual', colorClass: 'gold', accentColor: 'rgba(251,191,36,0.85)' };
    if (cat.includes('rest') || cat.includes('sleep')) return { icon, category: 'Rest', colorClass: 'pink', accentColor: 'rgba(249,168,212,0.85)' };
    return { icon, category: 'Intention', colorClass: 'gold', accentColor: 'rgba(251,191,36,0.85)' };
}

const CM: Record<string, { text: string; border: string; bg: string; glow: string }> = {
    blue: { text: 'rgba(147,197,253,0.95)', border: 'rgba(96,165,250,0.30)', bg: 'rgba(30,64,175,0.15)', glow: 'rgba(96,165,250,0.18)' },
    green: { text: 'rgba(110,231,183,0.95)', border: 'rgba(52,211,153,0.30)', bg: 'rgba(6,78,59,0.15)', glow: 'rgba(52,211,153,0.18)' },
    teal: { text: 'rgba(94,234,212,0.95)', border: 'rgba(20,184,166,0.30)', bg: 'rgba(19,78,74,0.15)', glow: 'rgba(20,184,166,0.18)' },
    purple: { text: 'rgba(216,180,254,0.95)', border: 'rgba(167,139,250,0.30)', bg: 'rgba(88,28,135,0.15)', glow: 'rgba(167,139,250,0.18)' },
    gold: { text: 'rgba(252,211,77,0.95)', border: 'rgba(251,191,36,0.30)', bg: 'rgba(120,53,15,0.15)', glow: 'rgba(251,191,36,0.18)' },
    pink: { text: 'rgba(249,168,212,0.95)', border: 'rgba(244,114,182,0.30)', bg: 'rgba(131,24,67,0.15)', glow: 'rgba(244,114,182,0.18)' },
};

// ── Firebase Firestore helpers ─────────────────────────────────────────────
// (Removed local load/save/delete logic, handled by useDailyTasks hook globally)

// ── Time suggestions ───────────────────────────────────────────────────────
function getTimeSuggestions() {
    const h = new Date().getHours();
    if (h < 9) return ['8:00 AM', '9:00 AM', '11:00 AM', 'This evening'];
    if (h < 13) return ['1:00 PM', '3:00 PM', '5:00 PM', 'Tomorrow AM'];
    if (h < 17) return ['5:00 PM', '7:00 PM', '9:00 PM', 'Tomorrow AM'];
    return ['9:00 PM', 'Tomorrow AM', 'Tomorrow PM', 'This weekend'];
}

// ── Mini Calendar ──────────────────────────────────────────────────────────
function MiniCalendar({ tasks, onDateSelect }: { tasks: TaskItem[]; onDateSelect: (iso: string) => void }) {
    const [viewDate, setViewDate] = useState(() => new Date());
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    const year = viewDate.getFullYear(), month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // build task map
    const taskDates = new Set(tasks.filter(t => t.scheduledDate).map(t => t.scheduledDate));
    const days: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button onClick={() => setViewDate(new Date(year, month - 1, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.40)', padding: 4, lineHeight: 0 }}><ChevronLeft size={14} /></button>
                <span style={{ fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', fontFamily: 'monospace' }}>{MONTHS[month]} {year}</span>
                <button onClick={() => setViewDate(new Date(year, month + 1, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.40)', padding: 4, lineHeight: 0 }}><ChevronRight size={14} /></button>
            </div>
            {/* Day labels */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                {DAYS.map((d, i) => <span key={i} style={{ fontSize: '0.50rem', color: 'rgba(255,255,255,0.25)', textAlign: 'center', fontFamily: 'monospace', letterSpacing: '0.05em' }}>{d}</span>)}
            </div>
            {/* Day grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
                {days.map((d, i) => {
                    if (!d) return <div key={i} />;
                    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const isToday = iso === todayStr;
                    const hasTasks = taskDates.has(iso);
                    return (
                        <button key={iso} onClick={() => onDateSelect(iso)}
                            style={{
                                aspectRatio: '1', borderRadius: '50%', border: isToday ? '1.5px solid rgba(251,191,36,0.65)' : '1px solid transparent',
                                background: hasTasks ? 'rgba(251,191,36,0.15)' : 'transparent',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1,
                                padding: 0, position: 'relative',
                            }}>
                            <span style={{ fontSize: '0.58rem', color: isToday ? 'rgba(251,191,36,0.90)' : 'rgba(255,255,255,0.50)', fontWeight: isToday ? 700 : 400, fontFamily: 'monospace', lineHeight: 1 }}>{d}</span>
                            {hasTasks && <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(251,191,36,0.80)' }} />}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ── Schedule Prompt ────────────────────────────────────────────────────────
function SchedulePrompt({ pill, onSchedule, onSkip }: { pill: TaskItem; onSchedule: (date: string, time: string) => void; onSkip: () => void }) {
    const colors = CM[pill.colorClass] || CM.gold;
    const suggestions = getTimeSuggestions();
    const [custom, setCustom] = useState('');
    const [selDate, setSelDate] = useState(new Date().toISOString().slice(0, 10));
    const [showCal, setShowCal] = useState(false);

    return (
        <motion.div initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{ background: 'rgba(8,6,20,0.96)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', border: `1px solid ${colors.border}`, borderRadius: 20, padding: '1rem 1.1rem', boxShadow: `0 8px 40px rgba(0,0,0,0.60), 0 0 20px ${colors.glow}`, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Clock size={13} style={{ color: colors.text }} />
                <p style={{ margin: 0, fontSize: '0.60rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: colors.text }}>When will you do this?</p>
                <button onClick={onSkip} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.30)', lineHeight: 0, padding: 2 }}><X size={13} /></button>
            </div>
            <p style={{ margin: 0, fontSize: '0.64rem', color: 'rgba(255,255,255,0.40)', fontStyle: 'italic' }}>Tasks with a set time are 3× more likely to get done.</p>

            {/* Date selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button onClick={() => setShowCal(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 999, padding: '0.30rem 0.75rem', cursor: 'pointer', color: colors.text, fontSize: '0.60rem', fontWeight: 600, fontFamily: 'inherit' }}>
                    <Calendar size={10} /> {selDate === new Date().toISOString().slice(0, 10) ? 'Today' : selDate}
                </button>
            </div>
            <AnimatePresence>
                {showCal && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                    <MiniCalendar tasks={[]} onDateSelect={d => { setSelDate(d); setShowCal(false); }} />
                </motion.div>}
            </AnimatePresence>

            {/* Time pills */}
            <div style={{ display: 'flex', gap: '0.38rem', flexWrap: 'wrap' }}>
                {suggestions.map(t => (
                    <button key={t} onClick={() => onSchedule(selDate, t)} style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 999, padding: '0.30rem 0.70rem', cursor: 'pointer', color: colors.text, fontSize: '0.62rem', fontWeight: 600, fontFamily: 'inherit' }}>{t}</button>
                ))}
            </div>

            {/* Custom */}
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <input type="text" placeholder="Or type a time…" value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => e.key === 'Enter' && custom.trim() && onSchedule(selDate, custom.trim())}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999, padding: '0.36rem 0.9rem', color: 'rgba(255,255,255,0.85)', fontSize: '0.64rem', outline: 'none', fontFamily: 'inherit' }} />
                {custom.trim() && <button onClick={() => onSchedule(selDate, custom.trim())} style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 999, padding: '0.36rem 0.70rem', cursor: 'pointer', color: colors.text, fontSize: '0.60rem', fontWeight: 700, fontFamily: 'inherit' }}>Set <ChevronRight size={9} style={{ display: 'inline', verticalAlign: 'middle' }} /></button>}
            </div>
        </motion.div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function MagicSyncModule({ items: tasks, onToggle, onRemove, onAdd, onUpdate }: MagicSyncModuleProps) {
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [schedulingId, setSchedulingId] = useState<string | null>(null);
    const [showCalendar, setShowCalendar] = useState(false);
    const [filterDate, setFilterDate] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = useCallback(async () => {
        const text = inputValue.trim();
        if (!text) return;
        setInputValue('');
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(55);
        const instantStyle = keywordCategorize(text);
        const newTask: TaskItem = { id: Date.now().toString(), text, ...instantStyle, done: false, createdAt: Date.now() };

        // Optimistic UI update handled partly here for schedule prompt showing, 
        // but global state updated via onAdd
        onAdd(newTask);
        setSchedulingId(newTask.id);

        // Parallel: AI categorize + AI advice
        const [style, advice] = await Promise.all([categorizeViaGemini(text), getAIAdvice(text, instantStyle.category)]);
        onUpdate(newTask.id, { ...style, aiAdvice: advice });
    }, [inputValue, onAdd, onUpdate]);

    const handleSchedule = useCallback((taskId: string, date: string, time: string) => {
        onUpdate(taskId, { scheduledDate: date, scheduledTime: time });
        setSchedulingId(null);
    }, [onUpdate]);

    const handleComplete = useCallback((task: TaskItem) => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([20, 30, 20]);
        onToggle(task.id);
        setTimeout(() => {
            onRemove(task.id);
        }, 700);
    }, [onToggle, onRemove]);

    const activeTasks = tasks.filter(t => !t.done && (!filterDate || t.scheduledDate === filterDate));
    const donePct = tasks.length > 0 ? Math.round((tasks.filter(t => t.done).length / tasks.length) * 100) : 0;

    return (
        <div style={{ width: '100%', maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.80rem', padding: '0 0.8rem' }}>

            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.16rem' }}>
                        <Sparkles size={11} style={{ color: 'rgba(251,191,36,0.70)' }} />
                        <span style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(251,191,36,0.70)' }}>
                            ADD YOUR TASKS · PLAN YOUR DAY
                        </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.61rem', color: 'rgba(255,255,255,0.33)', fontStyle: 'italic', lineHeight: 1.5 }}>
                        Calm your mind · Your AI Sakha <strong style={{ color: 'rgba(251,191,36,0.60)', fontStyle: 'normal' }}>Bodhi</strong> will advise and schedule it
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    {tasks.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.18rem' }}>
                            <span style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.32)', fontWeight: 600 }}>{tasks.filter(t => !t.done).length} left · {donePct}%</span>
                            <div style={{ width: 55, height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.08)' }}>
                                <div style={{ height: '100%', width: `${donePct}%`, borderRadius: 999, background: 'rgba(251,191,36,0.70)', transition: 'width 0.6s ease' }} />
                            </div>
                        </div>
                    )}
                    <button onClick={() => setShowCalendar(s => !s)} style={{ background: showCalendar ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.06)', border: showCalendar ? '1px solid rgba(251,191,36,0.30)' : '1px solid rgba(255,255,255,0.10)', borderRadius: 10, padding: '0.30rem 0.55rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={11} style={{ color: showCalendar ? 'rgba(251,191,36,0.85)' : 'rgba(255,255,255,0.40)' }} />
                        <span style={{ fontSize: '0.50rem', fontFamily: 'monospace', letterSpacing: '0.12em', textTransform: 'uppercase', color: showCalendar ? 'rgba(251,191,36,0.85)' : 'rgba(255,255,255,0.35)' }}>Cal</span>
                    </button>
                </div>
            </div>

            {/* ── Calendar (toggleable) ── */}
            <AnimatePresence>
                {showCalendar && (
                    <motion.div key="calendar" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} style={{ overflow: 'hidden' }}>
                        <MiniCalendar tasks={tasks} onDateSelect={d => { setFilterDate(prev => prev === d ? null : d); }} />
                        {filterDate && <p style={{ margin: '0.3rem 0 0', fontSize: '0.54rem', color: 'rgba(251,191,36,0.55)', fontFamily: 'monospace', letterSpacing: '0.10em', textAlign: 'center' }}>Showing: {filterDate} · tap again to clear</p>}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Schedule Prompt ── */}
            <AnimatePresence>
                {schedulingId && (() => {
                    const task = tasks.find(t => t.id === schedulingId);
                    return task ? (
                        <SchedulePrompt key={`sched-${schedulingId}`} pill={task}
                            onSchedule={(date, time) => handleSchedule(schedulingId, date, time)}
                            onSkip={() => setSchedulingId(null)} />
                    ) : null;
                })()}
            </AnimatePresence>

            {/* ── AI Advice Bubble — latest task ── */}
            <AnimatePresence>
                {tasks.filter(t => t.aiAdvice && !t.done && t.id !== schedulingId).slice(0, 1).map(task => (
                    <motion.div key={`adv-${task.id}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.40 }}
                        style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 14, padding: '0.60rem 0.85rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <Brain size={13} style={{ color: 'rgba(251,191,36,0.60)', flexShrink: 0, marginTop: 2 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: '0 0 0.10rem', fontSize: '0.50rem', letterSpacing: '0.18em', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(251,191,36,0.55)', fontFamily: 'monospace' }}>Sakha Bodhi · {task.category}</p>
                            <p style={{ margin: 0, fontSize: '0.70rem', color: 'rgba(255,255,255,0.68)', lineHeight: 1.55, fontStyle: 'italic' }}>{task.aiAdvice}</p>
                            {task.scheduledTime && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.28rem', marginTop: '0.38rem' }}>
                                    <Clock size={9} style={{ color: 'rgba(251,191,36,0.45)' }} />
                                    <span style={{ fontSize: '0.54rem', color: 'rgba(251,191,36,0.55)', fontFamily: 'monospace', letterSpacing: '0.08em' }}>
                                        {task.scheduledDate && task.scheduledDate !== new Date().toISOString().slice(0, 10) ? task.scheduledDate + ' · ' : ''}{task.scheduledTime}
                                    </span>
                                </div>
                            )}
                        </div>
                        <button onClick={() => onUpdate(task.id, { aiAdvice: undefined })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.22)', padding: 2, lineHeight: 0, flexShrink: 0 }}><X size={11} /></button>
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* ── Input ── */}
            <motion.div layout style={{ position: 'relative' }}>
                <motion.div animate={isTyping ? { opacity: 1 } : { opacity: 0 }} transition={{ duration: 0.4 }}
                    style={{ position: 'absolute', inset: -12, borderRadius: 999, background: 'radial-gradient(ellipse, rgba(251,146,60,0.18) 0%, transparent 70%)', filter: 'blur(14px)', pointerEvents: 'none', zIndex: 0 }} />
                <input ref={inputRef} type="text" value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    onFocus={() => setIsTyping(true)} onBlur={() => setIsTyping(false)}
                    placeholder="Type a task — Sakha Bodhi will advise and schedule it..."
                    style={{ position: 'relative', zIndex: 1, width: '100%', background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${isTyping ? 'rgba(251,146,60,0.45)' : 'rgba(255,255,255,0.11)'}`, borderRadius: 999, padding: '0.72rem 3.8rem 0.72rem 1.45rem', color: 'rgba(255,255,255,0.92)', fontSize: '0.86rem', fontWeight: 300, outline: 'none', transition: 'border-color 0.3s ease', boxSizing: 'border-box', fontFamily: 'inherit', letterSpacing: '0.01em' }} />
                <div style={{ position: 'absolute', right: '1.1rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '0.22rem', pointerEvents: 'none', zIndex: 2 }}>
                    <Sparkles size={11} style={{ color: isTyping ? 'rgba(251,191,36,0.70)' : 'rgba(255,255,255,0.18)' }} />
                    <span style={{ fontSize: '0.46rem', fontWeight: 700, letterSpacing: '0.18em', color: isTyping ? 'rgba(251,191,36,0.60)' : 'rgba(255,255,255,0.18)', textTransform: 'uppercase' }}>BODHI</span>
                </div>
            </motion.div>

            {/* ── Task Pills (2-column grid, vertical scroll, max 2 rows visible) ── */}
            <div style={{ position: 'relative' }}>
                {/* Bottom fade gradient for scroll hint */}
                {activeTasks.length > 4 && (
                    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 28, background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.80))', pointerEvents: 'none', zIndex: 2, borderRadius: '0 0 16px 16px' }} />
                )}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '0.48rem',
                    maxHeight: activeTasks.length > 4 ? 260 : 'none',
                    overflowY: activeTasks.length > 4 ? 'auto' : 'visible',
                    overflowX: 'hidden',
                    scrollBehavior: 'smooth',
                    WebkitOverflowScrolling: 'touch',
                    msOverflowStyle: 'none',
                    scrollbarWidth: 'none',
                    paddingBottom: activeTasks.length > 4 ? 24 : 2,
                    paddingRight: 2,
                }}>
                    <style>{`
                        /* Hide scrollbar for task grid */
                        div::-webkit-scrollbar { display: none; }
                    `}</style>
                    <AnimatePresence mode="popLayout">
                        {activeTasks.map(task => {
                            const c = CM[task.colorClass] || CM.gold;
                            return (
                                <motion.div key={task.id} layout
                                    initial={{ opacity: 0, scale: 0.80, filter: 'blur(8px)' }}
                                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                                    exit={{ opacity: 0, scale: 0.72, boxShadow: '0 0 24px rgba(255,210,50,0.70)' }}
                                    transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.22rem', background: c.bg, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: `1px solid ${c.border}`, borderRadius: 16, padding: '0.55rem 0.65rem', position: 'relative', minWidth: 0 }}>
                                    {task.scheduledTime && (
                                        <div style={{ position: 'absolute', top: 5, right: 6, display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Clock size={7} style={{ color: c.text, opacity: 0.50 }} />
                                            <span style={{ fontSize: '0.42rem', color: c.text, opacity: 0.50, fontFamily: 'monospace' }}>{task.scheduledTime}</span>
                                        </div>
                                    )}
                                    <span style={{ fontSize: '1.0rem' }}>{task.icon}</span>
                                    <span style={{ fontSize: '0.68rem', fontWeight: 500, lineHeight: 1.3, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', width: '100%' }}>{task.text}</span>
                                    <span style={{ fontSize: '0.48rem', opacity: 0.38, color: c.text, letterSpacing: '0.06em' }}>{task.category}</span>
                                    <button onClick={() => handleComplete(task)}
                                        style={{ marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, background: 'rgba(255,255,255,0.06)', border: `1px solid ${c.border}`, borderRadius: 999, padding: '0.20rem 0', cursor: 'pointer', color: c.text, fontSize: '0.46rem', fontWeight: 700, fontFamily: 'inherit', letterSpacing: '0.10em', textTransform: 'uppercase', width: '100%' }}>
                                        <Check size={8} /> Done
                                    </button>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                    {activeTasks.length === 0 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            style={{ fontSize: '0.63rem', color: 'rgba(255,255,255,0.20)', fontStyle: 'italic', display: 'flex', alignItems: 'center', minHeight: 72, paddingLeft: '0.3rem', gridColumn: 'span 2' }}>
                            {filterDate ? `No tasks on ${filterDate}` : 'Your canvas is clear — type a task above ✨'}
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}
