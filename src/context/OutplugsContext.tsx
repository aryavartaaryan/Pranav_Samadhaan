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
    try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (raw) return JSON.parse(raw) as Article[];
    } catch { /* ignore */ }
    return [];
}

function writeCache(articles: Article[]) {
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(articles)); } catch { /* ignore */ }
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function OutplugsProvider({ children }: { children: ReactNode }) {
    // Server and client both start with the same empty/loading state → no hydration mismatch
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [newBadgeCount, setNewBadgeCount] = useState(0);

    // Ref tracks article count so fetchNews doesn't need articles as a dep (avoids infinite loop)
    const articlesCountRef = useRef(0);
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
    }, []); // stable — uses ref, no articles dependency

    const clearNewBadge = useCallback(() => {
        setNewBadgeCount(0);
    }, []);

    // Runs once on mount (client-only — never on server):
    // 1. Read sessionStorage cache → show articles instantly with no spinner
    // 2. Fire background refresh to get fresh articles
    useEffect(() => {
        const cached = readCache();
        if (cached.length > 0) {
            setArticles(cached);
            articlesCountRef.current = cached.length;
            setLoading(false);
            // Silently refresh in background — user already sees content
            fetchNews(true);
        } else {
            // Nothing cached — show spinner and fetch
            fetchNews(false);
        }

        // Background poll every 10 minutes
        const interval = setInterval(() => fetchNews(true), 10 * 60 * 1000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // empty deps — run once on mount only

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
