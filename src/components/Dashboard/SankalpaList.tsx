'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, ChevronDown, ChevronUp, Clock, Timer, Calendar, Tag } from 'lucide-react';
import styles from './SankalpaList.module.css';

interface Task {
    id: string;
    text: string;
    done: boolean;
    allocatedMinutes?: number;   // Set by Bodhi's add_sankalpa_task tool
    startTime?: string;          // Optional start time from Bodhi
    category?: string;
    createdAt?: number;
}

const DEFAULT_ITEMS: Task[] = [
    { id: 'm1', text: 'Morning System reboot (15 mins mediation)', done: false },
    { id: 'n1', text: 'Enter Deep Work 9 pm', done: false },
    { id: 'j1', text: 'Unproductive apps disconnection', done: false },
    { id: 'l1', text: 'Listen ragas at least one time morning,evening & Noon to improve productivity', done: false },
];

const todayKey = () => `sankalpa_v2_${new Date().toISOString().slice(0, 10)}`;

function load(): Task[] {
    try { const s = localStorage.getItem(todayKey()); return s ? JSON.parse(s) : DEFAULT_ITEMS; }
    catch { return DEFAULT_ITEMS; }
}

function formatCreatedAt(ts?: number): string {
    if (!ts) return 'Today';
    const d = new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
        ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function SankalpaList() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [hydrated, setHydrated] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [input, setInput] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setTasks(load()); setHydrated(true); }, []);
    useEffect(() => { if (isAdding) inputRef.current?.focus(); }, [isAdding]);

    const save = useCallback((next: Task[]) => {
        setTasks(next);
        localStorage.setItem(todayKey(), JSON.stringify(next));
    }, []);

    const toggle = (id: string) => save(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
    const remove = (id: string) => {
        if (expandedId === id) setExpandedId(null);
        save(tasks.filter(t => t.id !== id));
    };

    const toggleExpand = (id: string) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    const addTask = () => {
        if (!input.trim()) { setIsAdding(false); return; }
        save([...tasks, {
            id: Date.now().toString(),
            text: input.trim(),
            done: false,
            createdAt: Date.now(),
        }]);
        setInput('');
        setIsAdding(false);
    };

    const done = tasks.filter(t => t.done).length;
    const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

    if (!hydrated) return null;

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <span className={styles.titleEmoji}>📿</span>
                    <div>
                        <h2 className={styles.title}>Today&apos;s Sankalpa</h2>
                        <p className={styles.subtitle}>{done}/{tasks.length} intentions fulfilled</p>
                    </div>
                </div>
                <button
                    className={`${styles.addTrigger} ${isAdding ? styles.addTriggerActive : ''}`}
                    onClick={() => setIsAdding(v => !v)}
                    title="Add intention"
                >
                    <motion.span animate={{ rotate: isAdding ? 45 : 0 }} transition={{ duration: 0.22 }}>
                        <Plus size={16} strokeWidth={2.2} />
                    </motion.span>
                </button>
            </div>

            {/* Progress bar */}
            {tasks.length > 0 && (
                <div className={styles.progressTrack}>
                    <motion.div
                        className={styles.progressFill}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: 'easeInOut' }}
                    />
                </div>
            )}

            {/* Task list */}
            <div className={styles.taskList}>
                <AnimatePresence>
                    {tasks.map(task => (
                        <motion.div
                            key={task.id}
                            className={styles.taskWrapper}
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                            layout
                        >
                            {/* Main task row */}
                            <div className={`${styles.taskRow} ${expandedId === task.id ? styles.taskRowExpanded : ''}`}>
                                <button
                                    className={`${styles.checkbox} ${task.done ? styles.checkboxDone : ''}`}
                                    onClick={() => toggle(task.id)}
                                >
                                    {task.done ? '✓' : ''}
                                </button>

                                {/* Clickable content area — expands on click (Fix 4) */}
                                <div
                                    className={styles.taskContent}
                                    onClick={() => toggleExpand(task.id)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') toggleExpand(task.id); }}
                                    style={{ cursor: 'pointer', flex: 1 }}
                                >
                                    <span className={`${styles.taskText} ${task.done ? styles.taskDone : ''}`}>
                                        {task.text}
                                    </span>
                                    {/* Compact badges visible always */}
                                    {(task.allocatedMinutes !== undefined || task.startTime) && (
                                        <span className={styles.taskTimeBadge}>
                                            {task.allocatedMinutes !== undefined && `⏱ ${task.allocatedMinutes} min`}
                                            {task.startTime && task.allocatedMinutes !== undefined && ' · '}
                                            {task.startTime && `🕐 ${task.startTime}`}
                                        </span>
                                    )}
                                </div>

                                {/* Expand chevron */}
                                <button
                                    className={styles.expandBtn}
                                    onClick={() => toggleExpand(task.id)}
                                    title={expandedId === task.id ? 'Collapse' : 'View details'}
                                >
                                    {expandedId === task.id
                                        ? <ChevronUp size={12} strokeWidth={2.2} />
                                        : <ChevronDown size={12} strokeWidth={2.2} />
                                    }
                                </button>

                                <button className={styles.removeBtn} onClick={() => remove(task.id)}>
                                    <X size={11} strokeWidth={2} />
                                </button>
                            </div>

                            {/* Expanded detail panel (Fix 4) */}
                            <AnimatePresence>
                                {expandedId === task.id && (
                                    <motion.div
                                        className={styles.detailPanel}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                                    >
                                        <div className={styles.detailGrid}>
                                            {/* Status */}
                                            <div className={styles.detailItem}>
                                                <span className={styles.detailIcon}>
                                                    {task.done ? '✅' : '⏳'}
                                                </span>
                                                <div>
                                                    <span className={styles.detailLabel}>Status</span>
                                                    <span className={styles.detailValue}>
                                                        {task.done ? 'Completed' : 'Pending'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Start time */}
                                            {task.startTime && (
                                                <div className={styles.detailItem}>
                                                    <Clock size={13} className={styles.detailIconLucide} strokeWidth={1.8} />
                                                    <div>
                                                        <span className={styles.detailLabel}>Scheduled At</span>
                                                        <span className={styles.detailValue}>{task.startTime}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Duration */}
                                            {task.allocatedMinutes !== undefined && (
                                                <div className={styles.detailItem}>
                                                    <Timer size={13} className={styles.detailIconLucide} strokeWidth={1.8} />
                                                    <div>
                                                        <span className={styles.detailLabel}>Duration</span>
                                                        <span className={styles.detailValue}>
                                                            {task.allocatedMinutes >= 60
                                                                ? `${Math.floor(task.allocatedMinutes / 60)}h ${task.allocatedMinutes % 60 ? (task.allocatedMinutes % 60) + 'm' : ''}`
                                                                : `${task.allocatedMinutes} min`
                                                            }
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Category */}
                                            {task.category && (
                                                <div className={styles.detailItem}>
                                                    <Tag size={13} className={styles.detailIconLucide} strokeWidth={1.8} />
                                                    <div>
                                                        <span className={styles.detailLabel}>Category</span>
                                                        <span className={styles.detailValue}>{task.category}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Added on */}
                                            <div className={styles.detailItem}>
                                                <Calendar size={13} className={styles.detailIconLucide} strokeWidth={1.8} />
                                                <div>
                                                    <span className={styles.detailLabel}>Added On</span>
                                                    <span className={styles.detailValue}>{formatCreatedAt(task.createdAt)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Mark as done button inside panel */}
                                        {!task.done && (
                                            <button
                                                className={styles.markDoneBtn}
                                                onClick={() => { toggle(task.id); setExpandedId(null); }}
                                            >
                                                ✓ Mark as Complete
                                            </button>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Collapsible add area */}
            <AnimatePresence>
                {isAdding && (
                    <motion.div
                        className={styles.addArea}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                    >
                        <input
                            ref={inputRef}
                            className={styles.addInput}
                            placeholder="Set your intention…"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') addTask();
                                if (e.key === 'Escape') { setIsAdding(false); setInput(''); }
                            }}
                        />
                        <button className={styles.confirmBtn} onClick={addTask}>Add</button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
