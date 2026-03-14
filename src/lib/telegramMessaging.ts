'use client';
/**
 * telegramMessaging.ts — GramJS Messaging Service (Production-Grade)
 * ─────────────────────────────────────────────────────────────────────────────
 * Bidirectional Telegram messaging via GramJS.
 *
 * Key improvements over previous version:
 *   ✅ ensureConnected() wrapper on every API call — auto-reconnects silently
 *   ✅ reinitMessagingListener() — re-attaches NewMessage handler after reconnect
 *   ✅ reinitialize(client) — updates client ref without full reconstruction
 *   ✅ handleClientError() wired in for AUTH_KEY_UNREGISTERED detection
 *
 * ARCHITECTURE:
 *   - Uses the same TelegramClient instance from useTelegramWeb
 *   - Sends messages via client.sendMessage()
 *   - Receives messages via client.addEventHandler(NewMessage)
 *   - Normalizes Telegram messages to UnifiedMessage format
 */

// CRITICAL: All 'telegram' imports MUST be dynamic (await import(...))
// The 'telegram' package re-exports 'sessions' → node-localstorage → fs
// Static imports cause "Module not found: Can't resolve 'fs'" in Next.js.

import type { UnifiedMessage, DeliveryStatus } from './sutraConnect.types';
import { ensureConnected, handleClientError } from './telegramClientManager';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TelegramMessageService {
    sendMessage: (chatId: string | number, text: string) => Promise<void>;
    getChatHistory: (chatId: string | number, limit?: number) => Promise<UnifiedMessage[]>;
    addMessageListener: (callback: (msg: UnifiedMessage) => void) => () => void;
    getDialogs: () => Promise<TelegramDialog[]>;
    reinitialize: (client: any) => Promise<void>;
    isReady: boolean;
}

export interface TelegramDialog {
    id: string;
    name: string;
    phone?: string;
    username?: string;
    lastMessage?: string;
    unreadCount: number;
    isUser: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// GramJS Messaging Service — Singleton Class
// ─────────────────────────────────────────────────────────────────────────────

class GramJSMessagingService implements TelegramMessageService {
    private client: any = null;
    private messageListeners: Array<(msg: UnifiedMessage) => void> = [];
    private currentUserId: string | null = null;
    private eventHandlerRef: any = null; // Keep ref to remove/re-add on reconnect
    public isReady = false;

    // ── Initialization ────────────────────────────────────────────────────────

    async initialize(client: any): Promise<void> {
        if (this.client && this.isReady && this.client === client) {
            console.log('[GramJS Messaging] Already initialised with this client — skipping');
            return;
        }

        this.client = client;
        this.isReady = false;

        try {
            const me = await client.getMe();
            this.currentUserId = String(me?.id ?? '');
            console.log('[GramJS Messaging] Current user ID:', this.currentUserId);

            await this.attachMessageListener();
            this.isReady = true;
            console.log('[GramJS Messaging] ✅ Service ready');
        } catch (err) {
            console.error('[GramJS Messaging] ❌ Initialization failed:', err);
            this.isReady = false;
            this.client = null;
            throw err;
        }
    }

    /**
     * Hot-swap the client reference after reconnection (no full re-init needed).
     * Re-attaches the NewMessage event handler to the new connection.
     */
    async reinitialize(client: any): Promise<void> {
        console.log('[GramJS Messaging] Re-initialising with new client...');
        this.client = client;
        if (!this.currentUserId) {
            try {
                const me = await client.getMe();
                this.currentUserId = String(me?.id ?? '');
            } catch (_) { /* non-critical */ }
        }
        await this.attachMessageListener();
        this.isReady = true;
        console.log('[GramJS Messaging] ✅ Re-initialised');
    }

    // ── Message Listener ──────────────────────────────────────────────────────

    private async attachMessageListener(): Promise<void> {
        if (!this.client) return;

        try {
            const { NewMessage } = await import('telegram/events');

            // Remove previously registered handler to avoid duplicate listeners
            if (this.eventHandlerRef) {
                try {
                    this.client.removeEventHandler(this.eventHandlerRef, new NewMessage({}));
                } catch (_) { /* may throw if client was replaced */ }
                this.eventHandlerRef = null;
            }

            const handler = (event: any) => {
                try {
                    if (!this.client || !this.isReady) return;
                    const message = event.message;
                    if (!message) return;

                    const unified = this.normalizeMessage(message);
                    this.messageListeners.forEach(cb => cb(unified));
                } catch (err: any) {
                    if (err?.message?.includes('Not connected')) return; // Normal during disconnect
                    console.error('[GramJS Messaging] Error in message handler:', err);
                }
            };

            this.eventHandlerRef = handler;
            this.client.addEventHandler(handler, new NewMessage({}));
            console.log('[GramJS Messaging] 📡 Real-time listener active');
        } catch (err) {
            console.error('[GramJS Messaging] Failed to attach listener:', err);
        }
    }

    // ── Send Message ──────────────────────────────────────────────────────────

    async sendMessage(chatId: string | number, text: string): Promise<void> {
        if (!this.client) throw new Error('Telegram client not available');

        try {
            // ← THE KEY IMPROVEMENT: ensure we are connected before sending
            await ensureConnected();
            await this.client.sendMessage(chatId, { message: text });
            console.log(`[GramJS Messaging] ✅ Sent to ${chatId}`);
        } catch (err: any) {
            handleClientError(err);

            if (err.message?.includes('FLOOD_WAIT')) {
                throw new Error('Rate limited by Telegram. Please wait a few minutes.');
            }
            if (err.message?.includes('PEER_ID_INVALID')) {
                throw new Error('Invalid contact. They may not have Telegram.');
            }
            throw err;
        }
    }

    // ── Chat History ──────────────────────────────────────────────────────────

    async getChatHistory(chatId: string | number, limit = 50): Promise<UnifiedMessage[]> {
        if (!this.client) throw new Error('Telegram client not available');

        try {
            await ensureConnected();
            const messages = await this.client.getMessages(chatId, { limit });
            return messages.map((msg: any) => this.normalizeMessage(msg)).reverse();
        } catch (err: any) {
            handleClientError(err);
            console.error('[GramJS Messaging] getChatHistory failed:', err);
            return [];
        }
    }

    // ── Dialogs ───────────────────────────────────────────────────────────────

    async getDialogs(): Promise<TelegramDialog[]> {
        if (!this.client) throw new Error('Telegram client not available');

        try {
            await ensureConnected();
            const dialogs = await this.client.getDialogs({ limit: 100 });

            return dialogs
                .map((dialog: any) => {
                    const entity = dialog.entity;
                    const isUser = entity?.className === 'User';
                    return {
                        id: String(entity?.id),
                        name: isUser
                            ? `${entity.firstName || ''} ${entity.lastName || ''}`.trim()
                            : entity?.title || 'Unknown',
                        phone: isUser ? entity.phone : undefined,
                        username: entity?.username,
                        lastMessage: dialog.message?.message || '',
                        unreadCount: dialog.unreadCount || 0,
                        isUser,
                    };
                })
                .filter((d: TelegramDialog) => d.isUser);
        } catch (err: any) {
            handleClientError(err);
            console.error('[GramJS Messaging] getDialogs failed:', err);
            return [];
        }
    }

    // ── Message Listener Registration ─────────────────────────────────────────

    addMessageListener(callback: (msg: UnifiedMessage) => void): () => void {
        this.messageListeners.push(callback);
        return () => {
            this.messageListeners = this.messageListeners.filter(cb => cb !== callback);
        };
    }

    // ── Message Normalizer ────────────────────────────────────────────────────

    private normalizeMessage(msg: any): UnifiedMessage {
        let text = '';
        if (typeof msg.message === 'string') {
            text = msg.message;
        } else if (msg.text) {
            text = msg.text;
        } else if (msg.media) {
            text = `[Media: ${msg.media.className || 'Unknown'}]`;
        }

        let deliveryStatus: DeliveryStatus = 'SENT';
        if (msg.pending) deliveryStatus = 'SENDING';
        else if (msg.failed) deliveryStatus = 'FAILED';

        const senderId = String(
            msg.senderId?.value ??
            msg.fromId?.userId?.value ??
            msg.peerId?.userId?.value ??
            ''
        );
        const isMine = senderId === this.currentUserId || msg.out === true;

        return {
            internal_id: `TELEGRAM_${msg.id}`,
            source_network: 'TELEGRAM',
            timestamp: msg.date ? msg.date * 1000 : Date.now(),
            text,
            sender_id: senderId,
            sender_name: isMine ? 'You' : 'Contact',
            delivery_status: deliveryStatus,
            is_mine: isMine,
            _raw_telegram: msg,
        };
    }

    // ── Destroy ───────────────────────────────────────────────────────────────

    destroy(): void {
        this.messageListeners = [];
        this.client = null;
        this.currentUserId = null;
        this.eventHandlerRef = null;
        this.isReady = false;
        console.log('[GramJS Messaging] Service destroyed');
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Instance
// ─────────────────────────────────────────────────────────────────────────────

let _messagingService: GramJSMessagingService | null = null;

export function getTelegramMessagingService(): GramJSMessagingService {
    if (!_messagingService) {
        _messagingService = new GramJSMessagingService();
    }
    return _messagingService;
}

export async function initializeTelegramMessaging(client: any): Promise<void> {
    const service = getTelegramMessagingService();
    if (service.isReady) {
        // Already initialised with a client — do a hot reinit
        await service.reinitialize(client);
    } else {
        await service.initialize(client);
    }
}

/**
 * Called by telegramClientManager after a keep-alive reconnect
 * to re-attach the NewMessage event handler to the live connection.
 */
export async function reinitMessagingListener(): Promise<void> {
    const service = getTelegramMessagingService();
    if (service.isReady) {
        const { getGlobalTelegramClient } = await import('./telegramClientManager');
        const client = getGlobalTelegramClient();
        if (client) await service.reinitialize(client);
    }
}
