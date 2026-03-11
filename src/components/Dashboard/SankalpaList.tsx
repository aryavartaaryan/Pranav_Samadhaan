'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import styles from './SankalpaList.module.css';

interface Task {
    id: string;
    text: string;
    done: boolean;
    allocatedMinutes?: number;   // Set by Bodhi's add_sankalpa_task tool
    startTime?: string;          // Optional start time from Bodhi
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

export default function SankalpaList() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [hydrated, setHydrated] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [input, setInput] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setTasks(load()); setHydrated(true); }, []);
    useEffect(() => { if (isAdding) inputRef.current?.focus(); }, [isAdding]);

    const save = useCallback((next: Task[]) => {
        setTasks(next);
        localStorage.setItem(todayKey(), JSON.stringify(next));
    }, []);

    const toggle = (id: string) => save(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
    const remove = (id: string) => save(tasks.filter(t => t.id !== id));

    const addTask = () => {
        if (!input.trim()) { setIsAdding(false); return; }
        save([...tasks, { id: Date.now().toString(), text: input.trim(), done: false }]);
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

            {/* Task list — only written tasks, no empty state clutter */}
            <div className={styles.taskList}>
                <AnimatePresence>
                    {tasks.map(task => (
                        <motion.div
                            key={task.id}
                            className={styles.taskRow}
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                            layout
                        >
                            <button
                                className={`${styles.checkbox} ${task.done ? styles.checkboxDone : ''}`}
                                onClick={() => toggle(task.id)}
                            >
                                {task.done ? '✓' : ''}
                            </button>
                            <div className={styles.taskContent}>
                                <span className={`${styles.taskText} ${task.done ? styles.taskDone : ''}`}>
                                    {task.text}
                                </span>
                                {(task.allocatedMinutes !== undefined || task.startTime) && (
                                    <span className={styles.taskTimeBadge}>
                                        {task.allocatedMinutes !== undefined && `⏱ ${task.allocatedMinutes} min`}
                                        {task.startTime && task.allocatedMinutes !== undefined && ' · '}
                                        {task.startTime && `🕐 ${task.startTime}`}
                                    </span>
                                )}
                            </div>

                            <button className={styles.removeBtn} onClick={() => remove(task.id)}>
                                <X size={11} strokeWidth={2} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Collapsible add area — expands when + is clicked */}
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
