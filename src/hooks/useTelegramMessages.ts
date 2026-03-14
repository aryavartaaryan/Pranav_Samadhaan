'use client';
/**
 * useTelegramMessages.ts — Telegram Messaging Hook (Production-Grade)
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides Telegram message send/receive, completely independent of Firebase.
 * Messages are cached in localStorage and delivered via GramJS.
 *
 * Improvements over previous version:
 *   ✅ No alert() calls — errors go to state
 *   ✅ On mount, if service is not ready, silently calls initializeGlobalClient()
 *      to restore a saved Telegram session before fetching history
 *   ✅ sendMessage wraps ensureConnected() via the messaging service
 *   ✅ isReady is derived reactively, not polled
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getTelegramMessagingService } from '@/lib/telegramMessaging';
import { initializeGlobalClient } from '@/lib/telegramClientManager';

export interface TelegramMessage {
    id: string;
    text: string;
    timestamp: number;
    senderId: string;
    senderName?: string;
    sentBy?: 'user' | 'ai';
    voiceNote?: any; // optional – matches ChatMessage union used in OneSutra page
}

const STORAGE_KEY = 'telegram_messages_cache';

// ─────────────────────────────────────────────────────────────────────────────
// localStorage helpers
// ─────────────────────────────────────────────────────────────────────────────

function loadMessages(chatId: string): TelegramMessage[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        const all: Record<string, TelegramMessage[]> = JSON.parse(stored);
        return all[chatId] ?? [];
    } catch { return []; }
}

function saveMessages(chatId: string, messages: TelegramMessage[]) {
    if (typeof window === 'undefined') return;
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const all: Record<string, TelegramMessage[]> = stored ? JSON.parse(stored) : {};
        all[chatId] = messages;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch { /* non-critical */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useTelegramMessages(chatId: string | null, telegramUserId?: string) {
    const [messages, setMessages] = useState<TelegramMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [isServiceReady, setIsServiceReady] = useState(false);

    const listenerCleanup = useRef<(() => void) | null>(null);

    // ── Ensure messaging service is bootstrapped ──────────────────────────────

    useEffect(() => {
        const service = getTelegramMessagingService();
        if (service.isReady) {
            setIsServiceReady(true);
            return;
        }

        // Service not ready — attempt silent session restore
        initializeGlobalClient()
            .then((restored) => {
                if (restored) setIsServiceReady(getTelegramMessagingService().isReady);
            })
            .catch((err) => {
                console.warn('[TG Messages] Session restore attempt failed:', err);
            });
    }, []);

    // ── Load history when chatId changes ──────────────────────────────────────

    useEffect(() => {
        if (!chatId) {
            setMessages([]);
            return;
        }

        // Instant load from cache
        const cached = loadMessages(chatId);
        setMessages([...cached].sort((a, b) => a.timestamp - b.timestamp));

        const service = getTelegramMessagingService();
        if (!service.isReady || !telegramUserId) return;

        setIsLoading(true);
        service.getChatHistory(telegramUserId, 50)
            .then((unifiedMessages) => {
                const tgMessages: TelegramMessage[] = unifiedMessages.map((msg) => ({
                    id: msg.internal_id,
                    text: msg.text,
                    timestamp: msg.timestamp,
                    senderId: msg.is_mine ? 'me' : msg.sender_id,
                    senderName: msg.sender_name,
                    sentBy: 'user',
                }));
                const sorted = tgMessages.sort((a, b) => a.timestamp - b.timestamp);
                setMessages(sorted);
                saveMessages(chatId, sorted);
            })
            .catch((err) => console.error('[TG Messages] History fetch failed:', err))
            .finally(() => setIsLoading(false));

    }, [chatId, telegramUserId, isServiceReady]);

    // ── Real-time incoming message listener ───────────────────────────────────

    useEffect(() => {
        if (!chatId) return;

        const service = getTelegramMessagingService();
        if (!service.isReady) return;

        if (listenerCleanup.current) {
            listenerCleanup.current();
        }

        listenerCleanup.current = service.addMessageListener((unifiedMsg) => {
            const isFromTelegramUser = unifiedMsg.sender_id === telegramUserId && !unifiedMsg.is_mine;
            const isFromMe = unifiedMsg.is_mine;

            if (!isFromTelegramUser && !isFromMe) return;

            const newMsg: TelegramMessage = {
                id: unifiedMsg.internal_id,
                text: unifiedMsg.text,
                timestamp: unifiedMsg.timestamp,
                senderId: unifiedMsg.is_mine ? 'me' : unifiedMsg.sender_id,
                senderName: unifiedMsg.sender_name,
                sentBy: 'user',
            };

            setMessages((prev) => {
                const filtered = prev.filter((m) => !m.id.startsWith('temp_'));
                if (filtered.some((m) => m.id === newMsg.id)) return prev;
                const updated = [...filtered, newMsg].sort((a, b) => a.timestamp - b.timestamp);
                saveMessages(chatId, updated);
                scrollToBottom();
                return updated;
            });
        });

        return () => {
            listenerCleanup.current?.();
            listenerCleanup.current = null;
        };
    }, [chatId, telegramUserId, isServiceReady]);

    // ── Send Message ──────────────────────────────────────────────────────────

    const sendMessage = useCallback(async (text: string) => {
        if (!chatId || !telegramUserId || !text.trim()) return;

        setSendError(null);
        setIsSending(true);

        // Optimistic message — appears instantly
        const optimisticId = `temp_${Date.now()}`;
        const optimisticMsg: TelegramMessage = {
            id: optimisticId,
            text,
            timestamp: Date.now(),
            senderId: 'me',
            sentBy: 'user',
        };

        setMessages((prev) => {
            const updated = [...prev, optimisticMsg];
            saveMessages(chatId, updated);
            scrollToBottom();
            return updated;
        });

        try {
            let service = getTelegramMessagingService();

            // If service went down, try re-init
            if (!service.isReady) {
                console.warn('[TG Messages] Service not ready — attempting re-init');
                const restored = await initializeGlobalClient();
                if (!restored) throw new Error('Telegram is not connected. Please open OneSutra settings and reconnect.');
                service = getTelegramMessagingService();
                setIsServiceReady(service.isReady);
            }

            // Numeric ID is required for most Telegram user lookups
            const peer = /^\d+$/.test(telegramUserId) ? Number(telegramUserId) : telegramUserId;
            await service.sendMessage(peer, text);

        } catch (err: any) {
            console.error('[TG Messages] Send failed:', err);
            setSendError(err.message ?? 'Failed to send message');

            // Remove the failed optimistic message
            setMessages((prev) => {
                const rolled = prev.filter((m) => m.id !== optimisticId);
                saveMessages(chatId, rolled);
                return rolled;
            });
        } finally {
            setIsSending(false);
        }
    }, [chatId, telegramUserId]);

    return {
        messages,
        isLoading,
        isSending,
        sendError,
        sendMessage,
        isReady: isServiceReady,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function scrollToBottom() {
    setTimeout(() => {
        document.getElementById('messages-bottom')?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
}
