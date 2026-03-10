'use client';

import { useState, useEffect, useCallback } from 'react';
import { getFirebaseAuth, getFirebaseFirestore } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export interface TaskItem {
    id: string;
    text: string;
    icon: string;
    colorClass: string;
    accentColor: string;
    category: string;
    done: boolean;
    scheduledDate?: string;
    scheduledTime?: string;
    aiAdvice?: string;
    createdAt: number;
    uid?: string;
}

export function useDailyTasks() {
    const [tasks, setTasks] = useState<TaskItem[]>(() => {
        if (typeof window !== 'undefined') {
            try {
                const s = localStorage.getItem('pranav_tasks_v3');
                if (s) return JSON.parse(s);
            } catch { /* ignore */ }
        }
        return [];
    });
    const [uid, setUid] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Track authentication state
    useEffect(() => {
        let unsubscribe = () => { };
        (async () => {
            try {
                const auth = await getFirebaseAuth();
                unsubscribe = onAuthStateChanged(auth, (user) => {
                    setUid(user?.uid ?? null);
                    if (!user) setIsLoading(false);
                });
            } catch (err) {
                console.error("Failed to init auth for tasks", err);
                setIsLoading(false);
            }
        })();
        return () => unsubscribe();
    }, []);

    // Real-time Firestore sync
    useEffect(() => {
        if (!uid) return;

        let unsubscribe = () => { };
        (async () => {
            try {
                const db = await getFirebaseFirestore();
                const q = query(
                    collection(db, 'users', uid, 'tasks'),
                    orderBy('createdAt', 'desc')
                );

                unsubscribe = onSnapshot(q, (snapshot) => {
                    const fetchedTasks = snapshot.docs.map(doc => doc.data() as TaskItem);
                    setTasks(fetchedTasks);
                    setIsLoading(false);
                    // Update cache for quick offline/initial load
                    try {
                        localStorage.setItem('pranav_tasks_v3', JSON.stringify(fetchedTasks));
                    } catch { /* ignore */ }
                }, (error) => {
                    console.error("Firestore tasks snapshot error:", error);
                    setIsLoading(false);
                });
            } catch (error) {
                console.error("Failed to init Firestore tasks listener:", error);
                setIsLoading(false);
            }
        })();

        return () => unsubscribe();
    }, [uid]);

    // Actions
    const addTask = useCallback(async (task: TaskItem) => {
        setTasks(prev => [task, ...prev]); // Optimistic update
        if (uid) {
            try {
                const db = await getFirebaseFirestore();
                await setDoc(doc(db, 'users', uid, 'tasks', task.id), { ...task, uid });
            } catch (error) {
                console.error("Error adding task:", error);
            }
        } else {
            localStorage.setItem('pranav_tasks_v3', JSON.stringify([task, ...tasks]));
        }
    }, [uid, tasks]);

    const updateTask = useCallback(async (taskId: string, updates: Partial<TaskItem>) => {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
        if (uid) {
            try {
                const db = await getFirebaseFirestore();
                await updateDoc(doc(db, 'users', uid, 'tasks', taskId), updates);
            } catch (error) {
                console.error("Error updating task:", error);
            }
        } else {
            const updated = tasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
            localStorage.setItem('pranav_tasks_v3', JSON.stringify(updated));
        }
    }, [uid, tasks]);

    const toggleTaskDone = useCallback(async (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        const newDone = !task.done;
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: newDone } : t));

        if (uid) {
            try {
                const db = await getFirebaseFirestore();
                await updateDoc(doc(db, 'users', uid, 'tasks', taskId), { done: newDone });
            } catch (error) {
                console.error("Error toggling task:", error);
            }
        } else {
            const updated = tasks.map(t => t.id === taskId ? { ...t, done: newDone } : t);
            localStorage.setItem('pranav_tasks_v3', JSON.stringify(updated));
        }
    }, [uid, tasks]);

    const removeTask = useCallback(async (taskId: string) => {
        setTasks(prev => prev.filter(t => t.id !== taskId));
        if (uid) {
            try {
                const db = await getFirebaseFirestore();
                await deleteDoc(doc(db, 'users', uid, 'tasks', taskId));
            } catch (error) {
                console.error("Error removing task:", error);
            }
        } else {
            const updated = tasks.filter(t => t.id !== taskId);
            localStorage.setItem('pranav_tasks_v3', JSON.stringify(updated));
        }
    }, [uid, tasks]);

    return {
        tasks,
        isLoading,
        addTask,
        updateTask,
        toggleTaskDone,
        removeTask
    };
}
