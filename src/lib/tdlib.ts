/**
 * tdlib.ts — TDLib Web Bridge
 * ─────────────────────────────────────────────────────────────────────────────
 * This module provides a typed, promise-based wrapper around TDLib-WASM.
 *
 * WHY THIS APPROACH:
 *   TDLib (Telegram Database Library) communicates via JSON events. In a web
 *   environment, tdlib-wasm exposes a `send()` and `receive()` polling loop.
 *   Here we wrap that in an event emitter + request/response map so the rest
 *   of the app can use clean async/await patterns.
 *
 * PRODUCTION SETUP (for the developer):
 *   1. Download tdlib-wasm from https://github.com/nicktindall/cyclon.p2p-rtc-client
 *      or build from source: https://github.com/tdlib/td
 *   2. Place `td_wasm.wasm` + `td_wasm.js` in /public/tdlib/
 *   3. Set NEXT_PUBLIC_TDLIB_API_ID and NEXT_PUBLIC_TDLIB_API_HASH in .env.local
 *
 * IN THIS FILE:
 *   - isDev mode: all TDLib calls are mocked for development/simulator use.
 *   - Production: real TDLib WASM is loaded dynamically.
 */

import type { TDLibMessage, TDLibContact, TDLibAuthState } from './sutraConnect.types';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const TDLIB_API_ID = parseInt(process.env.NEXT_PUBLIC_TDLIB_API_ID ?? '0', 10);
const TDLIB_API_HASH = process.env.NEXT_PUBLIC_TDLIB_API_HASH ?? '';

/** True when running in dev without real TDLib credentials */
const IS_MOCK_MODE = typeof window === 'undefined' || !TDLIB_API_ID || !TDLIB_API_HASH;

// ─────────────────────────────────────────────────────────────────────────────
// Event Emitter (minimal, no deps)
// ─────────────────────────────────────────────────────────────────────────────

type EventCallback = (data: unknown) => void;

class TDLibEventEmitter {
    private listeners: Record<string, EventCallback[]> = {};

    on(event: string, cb: EventCallback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(cb);
        return () => this.off(event, cb); // Returns unsubscriber
    }

    off(event: string, cb: EventCallback) {
        this.listeners[event] = (this.listeners[event] ?? []).filter(fn => fn !== cb);
    }

    emit(event: string, data: unknown) {
        (this.listeners[event] ?? []).forEach(cb => cb(data));
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// TDLib Client Class
// ─────────────────────────────────────────────────────────────────────────────

let _tdClient: TDLibClient | null = null;

export class TDLibClient extends TDLibEventEmitter {
    private _authState: TDLibAuthState = 'authorizationStateWaitPhoneNumber';
    private _isReady = false;
    private _tdwebClient: any = null;

    /**
     * Initialize TDLib WASM. Call once at app startup.
     * In mock mode, simulates auth states for UI development.
     */
    async init() {
        if (IS_MOCK_MODE) {
            console.warn('[TDLib] Running in MOCK mode — no real TDLib loaded.');
            return;
        }

        if (this._tdwebClient) return; // Already initialized

        // ── PRODUCTION: Load TDLib WASM dynamically ───────────────────────────
        try {
            // Dynamically load tdweb the module (it's heavy, avoid SSR issues)
            const TdClient = (await import('tdweb')).default;

            // Adjust to your tdweb dist path map:
            const wasmUrl = '/tdlib/3dee0f934ca1a5946a253599e3e442c6.wasm';
            const logMessage = console.log;

            this._tdwebClient = new TdClient({
                useDatabase: true,
                instanceName: 'onesutra',
                mode: 'wasm',
                wasmUrl,
                onUpdate: (update: unknown) => this._handleUpdate(update),
            });
            console.info('[TDLib] Production mode initialized successfully!');

            // Initialize API ID / HASH for the application
            await this._tdwebClient.send({
                '@type': 'setTdlibParameters',
                parameters: {
                    use_test_dc: false,
                    api_id: TDLIB_API_ID,
                    api_hash: TDLIB_API_HASH,
                    system_language_code: 'en',
                    device_model: 'Desktop',
                    system_version: 'macOS',
                    application_version: '1.0.0',
                    enable_storage_optimizer: true,
                }
            });
        } catch (error) {
            console.error('[TDLib] Failed to initialize tdweb client:', error);
        }
    }

    /** Handle incoming TDLib updates — routes to typed events */
    private _handleUpdate(update: any) {
        const type = update['@type'] as string;

        switch (type) {
            case 'updateAuthorizationState': {
                const state = (update.authorization_state)?.['@type'] as TDLibAuthState;
                if (!state) break;

                this._authState = state;
                this._isReady = state === 'authorizationStateReady';
                this.emit('authStateChange', state);
                break;
            }
            case 'updateNewMessage': {
                const msg = update.message as TDLibMessage;
                this.emit('newMessage', msg);
                break;
            }
            case 'updateMessageSendSucceeded': {
                this.emit('messageSent', update);
                break;
            }
            case 'updateMessageSendFailed': {
                this.emit('messageFailed', update);
                break;
            }
            default:
            // Ignore other update types
        }
    }

    // ───────────────────────────────────────────────────────────────────────────
    // AUTH METHODS (Phase 1)
    // ───────────────────────────────────────────────────────────────────────────

    /**
     * Step 1 of Telegram auth: submit phone number.
     * TDLib will respond with authorizationStateWaitCode.
     */
    async setAuthenticationPhoneNumber(phoneNumber: string): Promise<void> {
        if (IS_MOCK_MODE) {
            // Simulate async TDLib auth flow for UI dev
            await delay(1200);
            this._authState = 'authorizationStateWaitCode';
            this.emit('authStateChange', 'authorizationStateWaitCode');
            console.log(`[TDLib MOCK] Phone submitted: ${phoneNumber}`);
            return;
        }

        // PRODUCTION:
        await this._tdwebClient.send({
            '@type': 'setAuthenticationPhoneNumber',
            phone_number: phoneNumber,
            settings: { allow_sms_retriever_api: false },
        });
    }

    /**
     * Step 2 of Telegram auth: submit the 5-digit OTP/code.
     * TDLib responds with authorizationStateReady on success.
     */
    async checkAuthenticationCode(code: string): Promise<void> {
        if (IS_MOCK_MODE) {
            await delay(1500);
            // Simulate success for any code starting with correct prefix
            if (code.length === 5) {
                this._isReady = true;
                this._authState = 'authorizationStateReady';
                this.emit('authStateChange', 'authorizationStateReady');
                console.log(`[TDLib MOCK] Auth code accepted: ${code}`);
            } else {
                this.emit('authError', 'PHONE_CODE_INVALID');
                throw new Error('PHONE_CODE_INVALID');
            }
            return;
        }

        // PRODUCTION:
        await this._tdwebClient.send({
            '@type': 'checkAuthenticationCode',
            code,
        });
    }

    /**
     * Get the current authenticated Telegram user info.
     * Returns null in mock mode with no active session.
     */
    async getMe(): Promise<{ id: number; phone_number: string; first_name: string } | null> {
        if (IS_MOCK_MODE) {
            if (!this._isReady) return null;
            return { id: 777000001, phone_number: '+919876543210', first_name: 'Demo User' };
        }

        // PRODUCTION:
        return await this._tdwebClient.send({ '@type': 'getMe' });
    }

    // ───────────────────────────────────────────────────────────────────────────
    // CONTACTS (Phase 2)
    // ───────────────────────────────────────────────────────────────────────────

    /**
     * Fetch user's Telegram contacts.
     * Returns array of TDLibContact objects with phone numbers.
     */
    async getContacts(): Promise<TDLibContact[]> {
        if (IS_MOCK_MODE) {
            await delay(800);
            return MOCK_CONTACTS;
        }

        // PRODUCTION:
        const result = await this._tdwebClient.send({ '@type': 'getContacts' });
        const userIds: number[] = result.user_ids || [];
        const users = await Promise.all(
            userIds.map(id => this._tdwebClient.send({ '@type': 'getUser', user_id: id }))
        );
        return users as TDLibContact[];
    }

    // ───────────────────────────────────────────────────────────────────────────
    // MESSAGING (Phase 4)
    // ───────────────────────────────────────────────────────────────────────────

    /**
     * Send a text message to a Telegram chat.
     * @param chatId — TDLib numeric chat ID
     * @param text — Message text
     */
    async sendMessage(chatId: number, text: string): Promise<void> {
        if (IS_MOCK_MODE) {
            await delay(600);
            const mockMsg: TDLibMessage = {
                id: Date.now(),
                chat_id: chatId,
                content: { '@type': 'messageText', text: { text } },
                date: Math.floor(Date.now() / 1000),
                is_outgoing: true,
                sending_state: { '@type': 'messageSendingStatePending' },
            };
            // Simulate delivery after 1s
            setTimeout(() => this.emit('newMessage', { ...mockMsg, sending_state: undefined }), 1000);
            console.log(`[TDLib MOCK] Sent to chat ${chatId}: "${text}"`);
            return;
        }

        // PRODUCTION:
        await this._tdwebClient.send({
            '@type': 'sendMessage',
            chat_id: chatId,
            input_message_content: {
                '@type': 'inputMessageText',
                text: { '@type': 'formattedText', text },
            },
        });
    }

    /**
     * Get or create a private chat with a Telegram user.
     * Returns the TDLib chat_id for that user.
     */
    async getPrivateChatId(telegramUserId: number): Promise<number> {
        if (IS_MOCK_MODE) {
            await delay(300);
            return telegramUserId * 100; // Deterministic mock chat ID
        }

        // PRODUCTION:
        const chat = await this._tdwebClient.send({
            '@type': 'createPrivateChat',
            user_id: telegramUserId,
            force: true,
        });
        return chat.id;
    }

    /**
     * Fetch recent messages from a Telegram chat.
     * Used to hydrate the unified thread on initial load.
     */
    async getChatHistory(chatId: number, limit = 50): Promise<TDLibMessage[]> {
        if (IS_MOCK_MODE) {
            await delay(500);
            return MOCK_TELEGRAM_MESSAGES(chatId);
        }

        // PRODUCTION:
        const result = await this._tdwebClient.send({
            '@type': 'getChatHistory',
            chat_id: chatId,
            limit,
            from_message_id: 0,
            offset: 0,
        });
        return result.messages as TDLibMessage[];
    }

    get authState() { return this._authState; }
    get isReady() { return this._isReady; }
    get isMockMode() { return IS_MOCK_MODE; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton accessor
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the singleton TDLib client instance.
 * Safe to call from any hook — returns the same instance every time.
 */
export function getTDLibClient(): TDLibClient {
    if (!_tdClient) {
        _tdClient = new TDLibClient();
    }
    return _tdClient;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

/** Normalise phone numbers to E.164 for consistent comparison */
export function normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    // If it starts with a country code (10+ digits), add +
    return digits.length >= 10 ? `+${digits}` : digits;
}

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock data (used when IS_MOCK_MODE = true for UI development)
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_CONTACTS: TDLibContact[] = [
    { '@type': 'user', id: 111001, first_name: 'Arjun', last_name: 'Sharma', username: 'arjunsharma', phone_number: '+919876500001' },
    { '@type': 'user', id: 111002, first_name: 'Meera', last_name: 'Devi', username: 'meeradevi', phone_number: '+919876500002' },
    { '@type': 'user', id: 111003, first_name: 'Rishi', last_name: 'Kumar', username: 'rishikumar', phone_number: '+919876500003' },
    { '@type': 'user', id: 111004, first_name: 'Priya', last_name: 'Nair', username: 'priyanair', phone_number: '+919876500004' },
];

function MOCK_TELEGRAM_MESSAGES(chatId: number): TDLibMessage[] {
    const now = Math.floor(Date.now() / 1000);
    return [
        {
            id: chatId * 10 + 1,
            chat_id: chatId,
            content: { '@type': 'messageText', text: { text: 'Jai Shri Ram 🙏' } },
            date: now - 3600,
            is_outgoing: false,
        },
        {
            id: chatId * 10 + 2,
            chat_id: chatId,
            content: { '@type': 'messageText', text: { text: 'Om Namah Shivaya! When is the next satsang?' } },
            date: now - 1800,
            is_outgoing: true,
        },
    ];
}
