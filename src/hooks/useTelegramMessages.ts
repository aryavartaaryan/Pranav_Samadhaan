'use client';
/**
 * useTelegramMessages.ts — Telegram Messaging Hook (Independent from Firebase)
 * ─────────────────────────────────────────────────────────────────────────────
 * This hook provides Telegram message send/receive functionality that is
 * COMPLETELY INDEPENDENT from Firebase. Messages are stored in memory/localStorage
 * and sent/received directly via GramJS.
 * 
 * ARCHITECTURE:
 *   - OneSutra messages → Firebase Firestore (existing system)
 *   - Telegram messages → GramJS + localStorage (this hook)
 *   - Both displayed in same UI but work independently
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getTelegramMessagingService } from '@/lib/telegramMessaging';
import { initializeGlobalClient, reinitializeMessagingService, getGlobalTelegramClient } from '@/lib/telegramClientManager';

export interface TelegramMessage {
    id: string;
    text: string;
    timestamp: number;
    senderId: string;
    senderName?: string;
    sentBy?: 'user' | 'ai';
    voiceNote?: any;
}

const STORAGE_KEY = 'telegram_messages_cache';

/**
 * Load Telegram messages from localStorage
 */
function loadMessagesFromStorage(chatId: string): TelegramMessage[] {
    if (typeof window === 'undefined') return [];

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];

        const allMessages: Record<string, TelegramMessage[]> = JSON.parse(stored);
        return allMessages[chatId] || [];
    } catch (err) {
        console.error('[TG Messages] Failed to load from storage:', err);
        return [];
    }
}

/**
 * Save Telegram messages to localStorage
 */
function saveMessagesToStorage(chatId: string, messages: TelegramMessage[]) {
    if (typeof window === 'undefined') return;

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const allMessages: Record<string, TelegramMessage[]> = stored ? JSON.parse(stored) : {};
        allMessages[chatId] = messages;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allMessages));
    } catch (err) {
        console.error('[TG Messages] Failed to save to storage:', err);
    }
}

/**
 * Hook for Telegram messaging (independent from Firebase)
 */
export function useTelegramMessages(chatId: string | null, telegramUserId?: string) {
    const [messages, setMessages] = useState<TelegramMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const listenerCleanup = useRef<(() => void) | null>(null);

    // Load messages when chatId changes
    useEffect(() => {
        if (!chatId) {
            setMessages([]);
            return;
        }

        // Load from localStorage first (instant)
        const cached = loadMessagesFromStorage(chatId);
        // Sort cached messages oldest to newest
        const sortedCached = [...cached].sort((a, b) => a.timestamp - b.timestamp);
        setMessages(sortedCached);

        // Then fetch from Telegram API (if service is ready)
        const telegramService = getTelegramMessagingService();
        if (telegramService.isReady && telegramUserId) {
            setIsLoading(true);
            telegramService.getChatHistory(telegramUserId, 50)
                .then(unifiedMessages => {
                    // Convert UnifiedMessage to TelegramMessage
                    const tgMessages: TelegramMessage[] = unifiedMessages.map(msg => ({
                        id: msg.internal_id,
                        text: msg.text,
                        timestamp: msg.timestamp,
                        senderId: msg.is_mine ? 'me' : msg.sender_id,
                        senderName: msg.sender_name,
                        sentBy: 'user',
                    }));

                    // Sort messages oldest to newest
                    const sortedMessages = [...tgMessages].sort((a, b) => a.timestamp - b.timestamp);
                    setMessages(sortedMessages);
                    saveMessagesToStorage(chatId, sortedMessages);
                })
                .catch(err => {
                    console.error('[TG Messages] Failed to fetch history:', err);
                })
                .finally(() => setIsLoading(false));
        }
    }, [chatId, telegramUserId]);

    // Listen for new incoming messages
    useEffect(() => {
        if (!chatId) return;

        const telegramService = getTelegramMessagingService();
        if (!telegramService.isReady) return;

        // Clean up previous listener
        if (listenerCleanup.current) {
            listenerCleanup.current();
        }

        // Add new listener
        listenerCleanup.current = telegramService.addMessageListener((unifiedMsg) => {
            console.log('[TG Messages] 📨 Listener received message:', {
                sender_id: unifiedMsg.sender_id,
                telegramUserId,
                is_mine: unifiedMsg.is_mine,
                text: unifiedMsg.text.substring(0, 50),
                timestamp: new Date(unifiedMsg.timestamp).toISOString(),
            });
            console.log('[TG Messages] Active chat check:', {
                activeChatId: chatId,
                activeTelegramUserId: telegramUserId,
            });

            // Only process messages for this chat
            // Show if: 1) Message is FROM the telegram user, OR 2) Message is FROM me TO the telegram user
            const isFromTelegramUser = unifiedMsg.sender_id === telegramUserId && !unifiedMsg.is_mine;
            const isFromMeToTelegramUser = unifiedMsg.is_mine && unifiedMsg.sender_id !== telegramUserId;

            if (!isFromTelegramUser && !isFromMeToTelegramUser) {
                console.log('[TG Messages] Ignoring message - not for this chat:', {
                    sender_id: unifiedMsg.sender_id,
                    telegramUserId,
                    is_mine: unifiedMsg.is_mine,
                    reason: 'Not from telegram user and not from me to telegram user'
                });
                return;
            }

            const newMsg: TelegramMessage = {
                id: unifiedMsg.internal_id,
                text: unifiedMsg.text,
                timestamp: unifiedMsg.timestamp,
                senderId: unifiedMsg.is_mine ? 'me' : unifiedMsg.sender_id,
                senderName: unifiedMsg.sender_name,
                sentBy: 'user',
            };

            setMessages(prev => {
                // Remove optimistic messages when real message comes in
                const filtered = prev.filter(m => !m.id.startsWith('temp_'));

                // Deduplicate by ID
                const exists = filtered.some(m => m.id === newMsg.id);
                if (exists) return prev; // Keep existing if already there

                const updated = [...filtered, newMsg].sort((a, b) => a.timestamp - b.timestamp);
                saveMessagesToStorage(chatId, updated);

                // Auto-scroll to bottom for new messages
                setTimeout(() => {
                    const bottomEl = document.getElementById('messages-bottom');
                    if (bottomEl) {
                        bottomEl.scrollIntoView({ behavior: 'smooth' });
                    }
                }, 100);

                return updated;
            });
        });

        return () => {
            if (listenerCleanup.current) {
                listenerCleanup.current();
                listenerCleanup.current = null;
            }
        };
    }, [chatId, telegramUserId]);

    /**
     * Send a message via Telegram (NOT Firebase)
     */
    const sendMessage = useCallback(async (text: string) => {
        console.log('[useTelegramMessages] ENTER sendMessage', { chatId, telegramUserId, text });
        if (!chatId || !telegramUserId || !text.trim()) {
            console.warn('[TG Messages] Cannot send - missing data:', { chatId, telegramUserId, hasText: !!text.trim() });
            if (typeof window !== 'undefined') alert(`Cannot send message: Missing Data. \nChatId: ${chatId}\nUserId: ${telegramUserId}`);
            return;
        }

        console.log('[TG Messages] Sending message:', { chatId, telegramUserId, text });
        setIsSending(true);
        try {
            const telegramService = getTelegramMessagingService();
            console.log('[TG Messages] Service ready:', telegramService.isReady);

            // If service not ready, try to re-initialize
            if (!telegramService.isReady) {
                console.warn('[TG Messages] Service not ready, attempting initialization...');
                try {
                    const globalClient = getGlobalTelegramClient();
                    if (!globalClient) {
                        console.warn('[TG Messages] Global client is null, calling initializeGlobalClient()...');
                        await initializeGlobalClient();
                    } else {
                        console.warn('[TG Messages] Global client exists, calling reinitializeMessagingService()...');
                        await reinitializeMessagingService();
                    }
                    console.log('[TG Messages] Service re-initialized successfully');
                } catch (err) {
                    console.error('[TG Messages] Failed to re-initialize service:', err);
                    console.error('[TG Messages] This usually happens if:');
                    console.error('  1. Page was refreshed after Telegram login');
                    console.error('  2. Telegram client disconnected');
                    console.error('  3. Service initialization failed');
                    console.error('');
                    console.error('Solution: Refresh the page to re-authenticate with Telegram');
                    if (typeof window !== 'undefined') alert('Telegram service initialization failed. Try refreshing the page.');
                    throw new Error('Telegram service not initialized. Please refresh the page to re-authenticate.');
                }
            }

            // 1. ADD OPTIMISTIC MESSAGE INSTANTLY
            const optimisticId = `temp_${Date.now()}`;
            const optimisticMsg: TelegramMessage = {
                id: optimisticId,
                text: text,
                timestamp: Date.now(),
                senderId: 'me',
                sentBy: 'user',
            };

            setMessages(prev => {
                const updated = [...prev, optimisticMsg];
                saveMessagesToStorage(chatId, updated);

                // Auto-scroll immediately
                setTimeout(() => {
                    const bottomEl = document.getElementById('messages-bottom');
                    if (bottomEl) bottomEl.scrollIntoView({ behavior: 'smooth' });
                }, 50);

                return updated;
            });

            // 2. SEND OVER NETWORK
            // Convert to number if it's purely digits, because GramJS sometimes gets confused by string IDs vs string usernames
            const targetPeer = /^\d+$/.test(telegramUserId) ? Number(telegramUserId) : telegramUserId;

            await telegramService.sendMessage(targetPeer, text);

            console.log('[TG Messages] Message sent via Telegram:', text);
        } catch (err: any) {
            console.error('[TG Messages] Failed to send:', err);
            if (typeof window !== 'undefined') alert(`Telegram Send Failed: ${err.message || 'Unknown network error'}`);
            throw err;
        } finally {
            setIsSending(false);
        }
    }, [chatId, telegramUserId]);

    return {
        messages,
        isLoading,
        isSending,
        sendMessage,
        isReady: getTelegramMessagingService().isReady,
    };
}
