'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import OmInfinityLogo from '@/components/OmInfinityLogo';
import styles from './VedicDashboard.module.css';

// ── Panchang helpers ─────────────────────────────────────────────────────────
const VARA_EN = ['Ravivāra', 'Somavāra', 'Maṅgalavāra', 'Budhavāra', 'Guruvāra', 'Śukravāra', 'Śanivāra'];
const PAKSHA_EN = ['Śukla Pakṣa', 'Kṛṣṇa Pakṣa'];
const TITHI_EN = [
    'Pratipada', 'Dvitīyā', 'Tṛtīyā', 'Caturthī', 'Pañcamī', 'Ṣaṣṭhī', 'Saptamī',
    'Aṣṭamī', 'Navamī', 'Daśamī', 'Ekādaśī', 'Dvādaśī', 'Trayodaśī', 'Caturdaśī', 'Pūrṇimā',
];
const NAKSHATRA_EN = [
    'Ashvinī', 'Bharaṇī', 'Kṛttikā', 'Rohiṇī', 'Mṛgaśīrṣā', 'Ārdrā', 'Punarvasu',
    'Puṣya', 'Āśleṣā', 'Maghā', 'Pūrva Phālgunī', 'Uttara Phālgunī', 'Hasta', 'Citrā',
    'Svātī', 'Viśākhā', 'Anurādhā', 'Jyeṣṭhā', 'Mūla', 'Pūrvāṣāḍhā', 'Uttarāṣāḍhā',
    'Śravaṇa', 'Dhaniṣṭhā', 'Śatabhiṣā', 'Pūrva Bhādrapadā', 'Uttara Bhādrapadā', 'Revatī',
];
const MAAS_EN = [
    'Caitra', 'Vaiśākha', 'Jyeṣṭha', 'Āṣāḍha', 'Śrāvaṇa', 'Bhādrapada',
    'Āśvina', 'Kārtika', 'Mārgaśīrṣa', 'Pauṣa', 'Māgha', 'Phālguna',
];

function getLunarInfo(date: Date) {
    const newMoon = new Date('2000-01-06T18:14:00Z').getTime();
    const lunation = 29.53058867 * 86400000;
    const age = ((date.getTime() - newMoon) % lunation + lunation) % lunation;
    const dayFraction = age / lunation;
    const tithiIdx = Math.floor(dayFraction * 30);
    const nakshatraIdx = Math.floor(dayFraction * 27) % 27;
    const maasIdx = Math.floor((date.getMonth() + (dayFraction > 0.5 ? 1 : 0) + 10) % 12);
    return {
        paksha: tithiIdx >= 15 ? 1 : 0,
        tithi: tithiIdx % 15,
        nakshatra: nakshatraIdx,
        maas: maasIdx,
    };
}

function fmt12h(h: number, m: number) {
    const p = h >= 12 ? 'PM' : 'AM';
    return { time: `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')}`, period: p };
}



// ── Sankalpa item type ──────────────────────────────────────────────────────
interface Sankalp { id: string; text: string; done: boolean; }

const DEFAULT: Sankalp[] = [
    { id: '1', text: 'Morning System reboot (15 mins mediation)', done: false },
    { id: '2', text: 'Enter Deep Work 9 pm', done: false },
    { id: '3', text: 'Unproductive apps disconnection', done: false },
    { id: '4', text: 'Listen ragas at least one time morning,evening & Noon to improve productivity', done: false },
];

// ── Props ──────────────────────────────────────────────────────────────────
interface Props {
    displayName: string;
    greeting: { emoji: string; text: string; period: string } | null;
}

export default function VedicDashboard({ displayName, greeting }: Props) {
    const [now, setNow] = useState(new Date());
    const [items, setItems] = useState<Sankalp[]>(() => {
        if (typeof window !== 'undefined') {
            try {
                const s = localStorage.getItem('vedic_sankalpa');
                if (s) return JSON.parse(s);
            } catch { /* ignore */ }
        }
        return DEFAULT;
    });
    const [draft, setDraft] = useState('');
    const [adding, setAdding] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Clock tick — update time only
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(id);
    }, []);

    // Persist sankalpa
    useEffect(() => {
        localStorage.setItem('vedic_sankalpa', JSON.stringify(items));
    }, [items]);

    useEffect(() => {
        if (adding) inputRef.current?.focus();
    }, [adding]);

    const toggle = (id: string) =>
        setItems(prev => prev.map(s => s.id === id ? { ...s, done: !s.done } : s));

    const remove = (id: string) =>
        setItems(prev => prev.filter(s => s.id !== id));

    const add = () => {
        if (!draft.trim()) return;
        setItems(prev => [...prev, { id: Date.now().toString(), text: draft.trim(), done: false }]);
        setDraft('');
        setAdding(false);
    };

    const { time, period } = fmt12h(now.getHours(), now.getMinutes());
    const lunar = getLunarInfo(now);
    const tithi = TITHI_EN[lunar.tithi];
    const paksha = PAKSHA_EN[lunar.paksha];
    const nakshatra = NAKSHATRA_EN[lunar.nakshatra];
    const maas = MAAS_EN[lunar.maas];
    const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const done = items.filter(s => s.done).length;

    return (
        <motion.div
            className={styles.dashboard}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
            {/* ── ROW 1: Greeting + Clock ──────────────────────────────────────── */}
            <div className={styles.topRow}>
                {/* Left: logo + greeting */}
                <div className={styles.greetBlock}>
                    <OmInfinityLogo size={40} className={styles.omLogo} />
                    <div>
                        <div className={styles.greetLine}>
                            <motion.span
                                className={styles.greetEmoji}
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                            >
                                {greeting?.emoji ?? '🙏'}
                            </motion.span>
                            <h1 className={styles.greetTitle}>
                                {greeting?.text ?? 'Namaste'} <span className={styles.greetName}>{displayName}</span>
                            </h1>
                        </div>
                        <p className={styles.greetSub}>{greeting?.period ?? ''}</p>
                    </div>
                </div>

                {/* Right: clock */}
                <div className={styles.clockBlock}>
                    <div className={styles.clockPill}>
                        <span className={styles.clockDigits}>{time}</span>
                        <span className={styles.clockAmPm}>{period}</span>
                    </div>
                </div>
            </div>

            {/* ── ROW 2: Vedic Panchang ───────────────────────────────────────── */}
            <div className={styles.panchaangRow}>
                <div className={styles.panchCard}>
                    <span className={styles.panchIcon}>🌙</span>
                    <div>
                        <span className={styles.panchLabel}>Tithi</span>
                        <span className={styles.panchValue}>{tithi}</span>
                    </div>
                </div>
                <div className={styles.panchDivider} />
                <div className={styles.panchCard}>
                    <span className={styles.panchIcon}>✦</span>
                    <div>
                        <span className={styles.panchLabel}>Nakshatra</span>
                        <span className={styles.panchValue}>{nakshatra}</span>
                    </div>
                </div>
                <div className={styles.panchDivider} />
                <div className={styles.panchCard}>
                    <span className={styles.panchIcon}>📅</span>
                    <div>
                        <span className={styles.panchLabel}>Māsa · {paksha}</span>
                        <span className={styles.panchValue}>{maas}</span>
                    </div>
                </div>
                <div className={styles.panchDivider} />
                <div className={styles.panchCard}>
                    <span className={styles.panchIcon}>🗓</span>
                    <div>
                        <span className={styles.panchLabel}>Today</span>
                        <span className={styles.panchValue} style={{ fontSize: '0.6rem' }}>{dateStr}</span>
                    </div>
                </div>
            </div>

            {/* ── ROW 3: Sankalpa (to-do list) ───────────────────────────────── */}
            <div className={styles.sankalpSection}>
                <div className={styles.sankalpHeader}>
                    <span className={styles.sankalpTitle}>🪔 The Mission</span>
                    <div className={styles.sankalpProgress}>
                        <div className={styles.progressTrack}>
                            <motion.div
                                className={styles.progressFill}
                                animate={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                            />
                        </div>
                        <span className={styles.progressText}>{done}/{items.length}</span>
                    </div>
                </div>

                {/* To-do items */}
                <div className={styles.todoList}>
                    <AnimatePresence initial={false}>
                        {items.map(item => (
                            <motion.div
                                key={item.id}
                                className={`${styles.todoItem} ${item.done ? styles.todoDone : ''}`}
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 12, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
                                transition={{ duration: 0.25 }}
                                layout
                            >
                                <button className={styles.todoCheck} onClick={() => toggle(item.id)} aria-label="Toggle">
                                    <span className={styles.checkInner}>{item.done ? '✓' : ''}</span>
                                </button>
                                <span className={styles.todoText}>{item.text}</span>
                                <button className={styles.todoRemove} onClick={() => remove(item.id)} aria-label="Remove">×</button>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Add new */}
                    <AnimatePresence>
                        {adding ? (
                            <motion.div
                                className={styles.addRow}
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                            >
                                <input
                                    ref={inputRef}
                                    className={styles.addInput}
                                    placeholder="Add a sacred intention…"
                                    value={draft}
                                    onChange={e => setDraft(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') add(); if (e.key === 'Escape') setAdding(false); }}
                                />
                                <button className={styles.addConfirm} onClick={add}>+</button>
                                <button className={styles.addCancel} onClick={() => { setAdding(false); setDraft(''); }}>✕</button>
                            </motion.div>
                        ) : (
                            <motion.button
                                className={styles.addBtn}
                                onClick={() => setAdding(true)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                                layout
                            >
                                + Add Saṅkalpa
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
}
