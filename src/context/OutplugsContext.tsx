'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface SutraLayer {
    simpleWords: string;
    historicalContext: string;
    impact: string;
}

interface NewsAction {
    type: 'petition' | 'share' | 'donate';
    label: string;
    link: string;
}

export interface Article {
    id: string;
    headline: string;
    summary60Words: string;
    energyTag: 'Tamasic' | 'Rajasic' | 'Sattvic';
    category: string;
    source: string;
    link?: string;
    imageUrl?: string;
    timeAgo?: string;
    sutraLayer: SutraLayer;
    action?: NewsAction | null;
}

// ── Context Shape ─────────────────────────────────────────────────────────────
interface OutplugsContextValue {
    articles: Article[];
    loading: boolean;
    refreshing: boolean;
    newBadgeCount: number;
    fetchNews: (silent?: boolean) => Promise<void>;
    clearNewBadge: () => void;
}

const OutplugsContext = createContext<OutplugsContextValue | undefined>(undefined);

const CACHE_KEY = 'outplugs_cache_v1';

function readCache(): Article[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (raw) return JSON.parse(raw) as Article[];
    } catch { /* ignore */ }
    return [];
}

function writeCache(articles: Article[]) {
    if (typeof window === 'undefined') return;
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(articles)); } catch { /* ignore */ }
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function OutplugsProvider({ children }: { children: ReactNode }) {
    const cached = readCache();
    const [articles, setArticles] = useState<Article[]>(cached);
    // Only show spinner if no cached articles at all
    const [loading, setLoading] = useState(cached.length === 0);
    const [refreshing, setRefreshing] = useState(false);
    const [newBadgeCount, setNewBadgeCount] = useState(0);

    // Use a ref to track current articles count without adding it to useCallback deps
    const articlesCountRef = useRef(cached.length);
    useEffect(() => { articlesCountRef.current = articles.length; }, [articles.length]);

    const fetchNews = useCallback(async (silent = false) => {
        if (!silent) {
            if (articlesCountRef.current === 0) setLoading(true);
            else setRefreshing(true);
        } else {
            setRefreshing(true);
        }

        try {
            const res = await fetch('/api/outplugs-feed');
            if (!res.ok) throw new Error('Feed fetch failed');

            const data = await res.json();
            if (data.articles?.length) {
                writeCache(data.articles);
                if (silent && articlesCountRef.current > 0) {
                    setNewBadgeCount(data.articles.length);
                } else {
                    setArticles(data.articles);
                    setNewBadgeCount(0);
                }
            }
        } catch (e) {
            console.error('[OutplugsProvider] Failed to fetch news:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
        // No dependency on `articles` — use the ref instead to avoid infinite loop
    }, []);

    const clearNewBadge = useCallback(() => {
        setNewBadgeCount(0);
    }, []);

    // Fire once on mount — silent if we have cached data (no spinner)
    useEffect(() => {
        fetchNews(cached.length > 0);

        // Background polling every 10 minutes
        const interval = setInterval(() => fetchNews(true), 10 * 60 * 1000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty deps — only run once on mount

    return (
        <OutplugsContext.Provider value={{ articles, loading, refreshing, newBadgeCount, fetchNews, clearNewBadge }}>
            {children}
        </OutplugsContext.Provider>
    );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useOutplugs() {
    const context = useContext(OutplugsContext);
    if (!context) {
        throw new Error('useOutplugs must be used within an OutplugsProvider');
    }
    return context;
}
