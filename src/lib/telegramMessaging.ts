'use client';
/**
 * telegramMessaging.ts — GramJS Messaging Service
 * ─────────────────────────────────────────────────────────────────────────────
 * This module provides bidirectional messaging using the GramJS (telegram) library.
 * It replaces the TDLib approach with a pure GramJS implementation that works
 * seamlessly with the existing useTelegramWeb authentication hook.
 *
 * ARCHITECTURE:
 *   - Uses the same TelegramClient instance from useTelegramWeb
 *   - Sends messages via client.sendMessage()
 *   - Receives messages via client.addEventHandler(NewMessage)
 *   - Normalizes Telegram messages to UnifiedMessage format
 *
 * CRITICAL: This must be initialized AFTER successful Telegram authentication.
 */

// ─────────────────────────────────────────────────────────────────────────────
// CRITICAL: All 'telegram' imports MUST be dynamic (await import(...))
// The 'telegram' package barrel re-exports 'sessions' → node-localstorage → fs
// Static imports cause "Module not found: Can't resolve 'fs'" in Next.js.
// ─────────────────────────────────────────────────────────────────────────────
import type { UnifiedMessage, DeliveryStatus } from './sutraConnect.types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TelegramMessageService {
    sendMessage: (chatId: string | number, text: string) => Promise<void>;
    getChatHistory: (chatId: string | number, limit?: number) => Promise<UnifiedMessage[]>;
    addMessageListener: (callback: (msg: UnifiedMessage) => void) => () => void;
    getDialogs: () => Promise<TelegramDialog[]>;
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
// Singleton Service
// ─────────────────────────────────────────────────────────────────────────────

class GramJSMessagingService implements TelegramMessageService {
    private client: any = null;
    private messageListeners: Array<(msg: UnifiedMessage) => void> = [];
    private currentUserId: string | null = null;
    public isReady = false;

    /**
     * Initialize the messaging service with an authenticated TelegramClient.
     * This should be called after successful authentication in useTelegramWeb.
     */
    async initialize(client: any): Promise<void> {
        console.log('[GramJS Messaging] 🚀 Starting initialization...');
        console.log('[GramJS Messaging] Client provided:', !!client);
        console.log('[GramJS Messaging] Already initialized:', !!this.client);
        
        if (this.client) {
            console.warn('[GramJS Messaging] ⚠️ Already initialized, skipping');
            return;
        }

        this.client = client;
        console.log('[GramJS Messaging] Client assigned to service');

        try {
            // Get current user info
            console.log('[GramJS Messaging] Fetching current user info...');
            const me = await client.getMe();
            this.currentUserId = String(me?.id ?? '');
            console.log('[GramJS Messaging] Current user ID:', this.currentUserId);
            
            // Set up real-time message listener
            console.log('[GramJS Messaging] Setting up message listener...');
            await this.setupMessageListener();
            
            this.isReady = true;
            console.log('[GramJS Messaging] ✅ Service initialized successfully');
            console.log('[GramJS Messaging] isReady:', this.isReady);
        } catch (err) {
            console.error('[GramJS Messaging] ❌ Initialization failed:', err);
            this.isReady = false;
            throw err;
        }
    }

    /**
     * Set up the NewMessage event handler to receive incoming messages in real-time.
     */
    private async setupMessageListener(): Promise<void> {
        if (!this.client) return;

        try {
            const { NewMessage } = await import('telegram/events');

            this.client.addEventHandler((event: any) => {
                try {
                    // Silently ignore connection errors - they're expected when client disconnects
                    if (!this.client || !this.isReady) return;
                    
                    const message = event.message;
                    console.log('[GramJS Messaging] 📨 New message received:', {
                        id: message.id,
                        text: message.message?.substring(0, 50),
                        senderId: message.senderId,
                        peerId: message.peerId,
                        out: message.out,
                    });
                    
                    const unified = this.normalizeMessage(message);
                    console.log('[GramJS Messaging] Normalized message:', unified);
                    
                    // Notify all registered listeners
                    console.log(`[GramJS Messaging] Notifying ${this.messageListeners.length} listeners`);
                    this.messageListeners.forEach(listener => listener(unified));
                } catch (err: any) {
                    // Suppress "Not connected" errors - they're normal during disconnect
                    if (err?.message?.includes('Not connected')) return;
                    console.error('[GramJS Messaging] Error processing incoming message:', err);
                }
            }, new NewMessage({}));

            console.log('[GramJS Messaging] Real-time message listener active');
        } catch (err) {
            console.error('[GramJS Messaging] Failed to setup message listener:', err);
        }
    }

    /**
     * Send a text message to a Telegram chat.
     * @param chatId - Can be username (@username), phone (+1234567890), or numeric user ID
     * @param text - Message text to send
     */
    async sendMessage(chatId: string | number, text: string): Promise<void> {
        console.log('[GramJS Messaging] sendMessage called:', {
            hasClient: !!this.client,
            isReady: this.isReady,
            currentUserId: this.currentUserId,
        });
        
        if (!this.client || !this.isReady) {
            console.error('[GramJS Messaging] Service not ready:', {
                hasClient: !!this.client,
                isReady: this.isReady,
            });
            throw new Error('Telegram messaging service not initialized');
        }

        try {
            console.log(`[GramJS Messaging] Attempting to send message to chatId: ${chatId}, text: "${text}"`);
            
            // Send the message
            const result = await this.client.sendMessage(chatId, { message: text });
            
            console.log(`[GramJS Messaging] ✅ Message sent successfully to ${chatId}`);
            console.log('[GramJS Messaging] Send result:', result);
        } catch (err: any) {
            console.error('[GramJS Messaging] ❌ Send failed:', err);
            console.error('[GramJS Messaging] Error details:', {
                chatId,
                text,
                errorMessage: err.message,
                errorCode: err.errorMessage,
            });
            
            // Handle common errors
            if (err.message?.includes('FLOOD_WAIT')) {
                throw new Error('Rate limited by Telegram. Please wait a few minutes.');
            } else if (err.message?.includes('PEER_ID_INVALID')) {
                throw new Error('Invalid chat ID. Contact may not exist.');
            }
            throw err;
        }
    }

    /**
     * Fetch message history for a specific chat.
     * @param chatId - Chat identifier (username, phone, or ID)
     * @param limit - Number of messages to fetch (default 50)
     */
    async getChatHistory(chatId: string | number, limit = 50): Promise<UnifiedMessage[]> {
        if (!this.client || !this.isReady) {
            throw new Error('Telegram messaging service not initialized');
        }

        try {
            const messages = await this.client.getMessages(chatId, { limit });
            return messages.map((msg: any) => this.normalizeMessage(msg)).reverse();
        } catch (err) {
            console.error('[GramJS Messaging] Failed to fetch history:', err);
            return [];
        }
    }

    /**
     * Get all dialogs (chats) for the current user.
     * Used to populate the contact list with Telegram chats.
     */
    async getDialogs(): Promise<TelegramDialog[]> {
        if (!this.client || !this.isReady) {
            throw new Error('Telegram messaging service not initialized');
        }

        try {
            const dialogs = await this.client.getDialogs({ limit: 100 });
            
            return dialogs.map((dialog: any) => {
                const entity = dialog.entity;
                const isUser = entity.className === 'User';
                
                return {
                    id: String(entity.id),
                    name: isUser 
                        ? `${(entity as any).firstName || ''} ${(entity as any).lastName || ''}`.trim()
                        : (entity as any).title || 'Unknown',
                    phone: isUser ? (entity as any).phone : undefined,
                    username: (entity as any).username,
                    lastMessage: dialog.message?.message || '',
                    unreadCount: dialog.unreadCount || 0,
                    isUser,
                };
            }).filter((d: any) => d.isUser); // Only return user chats, not groups/channels
        } catch (err) {
            console.error('[GramJS Messaging] Failed to fetch dialogs:', err);
            return [];
        }
    }

    /**
     * Register a callback to receive real-time incoming messages.
     * Returns an unsubscribe function.
     */
    addMessageListener(callback: (msg: UnifiedMessage) => void): () => void {
        this.messageListeners.push(callback);
        
        // Return unsubscribe function
        return () => {
            this.messageListeners = this.messageListeners.filter(cb => cb !== callback);
        };
    }

    /**
     * Normalize a GramJS message to the UnifiedMessage format.
     */
    private normalizeMessage(msg: any): UnifiedMessage {
        // Extract text content
        let text = '';
        if (typeof msg.message === 'string') {
            text = msg.message;
        } else if (msg.text) {
            text = msg.text;
        } else if (msg.media) {
            text = `[Media: ${msg.media.className || 'Unknown'}]`;
        }

        // Determine delivery status
        let deliveryStatus: DeliveryStatus = 'SENT';
        if (msg.pending) {
            deliveryStatus = 'SENDING';
        } else if (msg.failed) {
            deliveryStatus = 'FAILED';
        }

        // Determine if this is my message
        const senderId = String(msg.senderId?.value ?? msg.fromId?.userId?.value ?? msg.peerId?.userId?.value ?? '');
        const isMine = senderId === this.currentUserId || msg.out === true;

        console.log('[GramJS Messaging] Message normalization:', {
            msgId: msg.id,
            senderId,
            currentUserId: this.currentUserId,
            out: msg.out,
            isMine,
            text: text.substring(0, 50),
        });

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

    /**
     * Clean up resources when the service is no longer needed.
     */
    destroy(): void {
        this.messageListeners = [];
        this.client = null;
        this.isReady = false;
        console.log('[GramJS Messaging] Service destroyed');
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Instance
// ─────────────────────────────────────────────────────────────────────────────

let _messagingService: GramJSMessagingService | null = null;

/**
 * Get the singleton GramJS messaging service instance.
 * Must be initialized with an authenticated client before use.
 */
export function getTelegramMessagingService(): GramJSMessagingService {
    if (!_messagingService) {
        _messagingService = new GramJSMessagingService();
    }
    return _messagingService;
}

/**
 * Initialize the messaging service with an authenticated TelegramClient.
 * Call this after successful authentication in useTelegramWeb.
 */
export async function initializeTelegramMessaging(client: any): Promise<void> {
    console.log('[GramJS Messaging] initializeTelegramMessaging called');
    console.log('[GramJS Messaging] Client exists:', !!client);
    
    const service = getTelegramMessagingService();
    console.log('[GramJS Messaging] Service instance obtained');
    console.log('[GramJS Messaging] Service isReady before init:', service.isReady);
    
    try {
        await service.initialize(client);
        console.log('[GramJS Messaging] Service isReady after init:', service.isReady);
    } catch (err) {
        console.error('[GramJS Messaging] Failed to initialize service:', err);
        throw err;
    }
}
