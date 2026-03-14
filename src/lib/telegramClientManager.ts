'use client';
/**
 * telegramClientManager.ts — Production-Grade Telegram Client Manager
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages a singleton GramJS TelegramClient with:
 *   ✅ Persistent session restore from localStorage on startup
 *   ✅ ensureConnected() wrapper — auto-reconnects before every operation
 *   ✅ 25-second keep-alive ping to prevent MTProto WebSocket drop
 *   ✅ AUTH_KEY_UNREGISTERED detection → clears session + fires UI event
 *   ✅ Idempotent init — concurrent calls share the same Promise
 */

// ─────────────────────────────────────────────────────────────────────────────
// Shared Constants
// ─────────────────────────────────────────────────────────────────────────────

export const SESSION_KEY = 'sutraconnect_tg_session';

// DOM event fired when server invalidates the auth key (e.g. user killed session
// in native Telegram app). UI listens for this to show re-login prompt.
export const SESSION_EXPIRED_EVENT = 'telegram-session-expired';

// ─────────────────────────────────────────────────────────────────────────────
// Internal singleton state
// ─────────────────────────────────────────────────────────────────────────────

let _client: any = null;
let _initPromise: Promise<void> | null = null;
let _keepAliveTimer: ReturnType<typeof setInterval> | null = null;
let _isReady = false;

// ─────────────────────────────────────────────────────────────────────────────
// Public Getters / Setters
// ─────────────────────────────────────────────────────────────────────────────

export function getGlobalTelegramClient(): any {
    return _client;
}

export function setGlobalTelegramClient(client: any): void {
    _client = client;
    _isReady = !!client;
    console.log('[TelegramClient] Global client set:', !!client);
}

export function isGlobalClientInitialized(): boolean {
    return _isReady && !!_client;
}

// ─────────────────────────────────────────────────────────────────────────────
// ensureConnected — call this before EVERY Telegram API operation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ensures the GramJS client is connected before proceeding.
 * If the client is not connected it will silently reconnect.
 * Throws only if there is no client at all (user not logged in).
 */
export async function ensureConnected(): Promise<void> {
    if (!_client) {
        throw new Error('Telegram client not initialised. Please log in first.');
    }

    try {
        // GramJS exposes `.connected` as a getter
        if (!_client.connected) {
            console.log('[TelegramClient] Not connected — reconnecting silently...');
            await _client.connect();
            console.log('[TelegramClient] ✅ Reconnected successfully');
        }
    } catch (err: any) {
        handleClientError(err);
        throw err;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// handleClientError — Detect fatal auth errors and fire UI event
// ─────────────────────────────────────────────────────────────────────────────

export function handleClientError(err: any): void {
    const msg: string = err?.message ?? String(err);
    const isExpired =
        msg.includes('AUTH_KEY_UNREGISTERED') ||
        msg.includes('AUTH_KEY_INVALID') ||
        msg.includes('SESSION_REVOKED') ||
        msg.includes('USER_DEACTIVATED') ||
        err?.errorMessage === 'AUTH_KEY_UNREGISTERED';

    if (isExpired) {
        console.warn('[TelegramClient] ⚠️ Auth key expired or revoked — clearing session');
        clearGlobalClient();

        // Fire UI event so components can react
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Keep-Alive Ping
// ─────────────────────────────────────────────────────────────────────────────

function startKeepAlive(): void {
    stopKeepAlive();

    _keepAliveTimer = setInterval(async () => {
        if (!_client || !_isReady) return;

        try {
            if (!_client.connected) {
                console.log('[TelegramClient] Keep-alive: client disconnected — reconnecting...');
                await _client.connect();

                // Re-attach message listener after reconnect
                const { reinitMessagingListener } = await import('./telegramMessaging');
                await reinitMessagingListener();

                console.log('[TelegramClient] ✅ Keep-alive reconnect succeeded');
            } else {
                // Lightweight ping to keep the MTProto connection alive
                try {
                    const { Api } = await import('telegram');
                    await _client.invoke(new Api.Ping({ pingId: BigInt(Math.floor(Math.random() * 1e12)) as any }));
                } catch (_pingErr) {
                    // Ping failure is non-fatal — connection will self-heal on next check
                }
            }
        } catch (err: any) {
            handleClientError(err);
            // Don't propagate — keep the interval running for next tick
        }
    }, 25_000); // Every 25 seconds
}

function stopKeepAlive(): void {
    if (_keepAliveTimer !== null) {
        clearInterval(_keepAliveTimer);
        _keepAliveTimer = null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// initializeGlobalClient — Restore session on app startup (IDEMPOTENT)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Call ONCE on app startup to silently restore a previous Telegram session.
 * - If no session in localStorage → resolves immediately (returns false via callback)
 * - If session exists → connects, checks auth, initialises messaging service
 * - If auth key is invalid → clears session + fires SESSION_EXPIRED_EVENT
 *
 * Returns `true` if session was successfully restored, `false` otherwise.
 */
export async function initializeGlobalClient(): Promise<boolean> {
    // Already fully initialised
    if (_isReady && _client) return true;

    // Prevent double-init race: share the same Promise across concurrent callers
    if (_initPromise) {
        await _initPromise;
        return _isReady && !!_client;
    }

    let resolveInit!: () => void;
    _initPromise = new Promise<void>((res) => { resolveInit = res; });

    let restored = false;

    try {
        if (typeof window === 'undefined') {
            resolveInit();
            return false;
        }

        const savedSession = localStorage.getItem(SESSION_KEY);
        if (!savedSession) {
            console.log('[TelegramClient] No saved session — skipping restore');
            resolveInit();
            return false;
        }

        const API_ID = parseInt(process.env.NEXT_PUBLIC_TDLIB_API_ID ?? '0', 10);
        const API_HASH = process.env.NEXT_PUBLIC_TDLIB_API_HASH ?? '';

        if (!API_ID || !API_HASH) {
            console.warn('[TelegramClient] API credentials missing');
            resolveInit();
            return false;
        }

        console.log('[TelegramClient] 🔄 Restoring session from localStorage...');
        const { TelegramClient, StringSession } = await loadGramJS();
        const session = new StringSession(savedSession);

        const client = new TelegramClient(session, API_ID, API_HASH, {
            connectionRetries: 5,
            retryDelay: 1000,
            autoReconnect: true,
            deviceModel: 'PranavSamadhaan Web',
            systemVersion: 'Web 2.0',
            appVersion: '2.0.0',
            langCode: 'en',
            useWSS: true,
        });

        await client.connect();

        // Check if auth key is still valid on Telegram servers
        const isAuthorised = await client.checkAuthorization();

        if (!isAuthorised) {
            console.warn('[TelegramClient] Session exists but auth failed — clearing');
            localStorage.removeItem(SESSION_KEY);
            resolveInit();
            return false;
        }

        // ✅ Session valid — wire everything up
        _client = client;
        _isReady = true;

        console.log('[TelegramClient] ✅ Session restored successfully');

        // Initialise the messaging service (sets up NewMessage listener)
        const { initializeTelegramMessaging } = await import('./telegramMessaging');
        await initializeTelegramMessaging(client);

        // Start keep-alive ping
        startKeepAlive();

        restored = true;
    } catch (err: any) {
        console.error('[TelegramClient] Session restore failed:', err);
        handleClientError(err);
        _client = null;
        _isReady = false;
    } finally {
        _initPromise = null;
        resolveInit();
    }

    return restored;
}

// ─────────────────────────────────────────────────────────────────────────────
// Called after a fresh login (phone+OTP) to wire up keep-alive
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Call this after a successful first-time login to activate keep-alive.
 * `setGlobalTelegramClient()` must have already been called.
 */
export function activateKeepAlive(): void {
    if (_client) startKeepAlive();
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-initialize messaging service (after unexpected disconnect/restore)
// ─────────────────────────────────────────────────────────────────────────────

export async function reinitializeMessagingService(): Promise<void> {
    if (!_client) {
        throw new Error('No global client — cannot re-initialise messaging service');
    }
    await ensureConnected();
    const { initializeTelegramMessaging } = await import('./telegramMessaging');
    await initializeTelegramMessaging(_client);
    console.log('[TelegramClient] Messaging service re-initialised');
}

// ─────────────────────────────────────────────────────────────────────────────
// Logout / Clear
// ─────────────────────────────────────────────────────────────────────────────

export function clearGlobalClient(): void {
    stopKeepAlive();
    if (_client) {
        try { _client.disconnect(); } catch (_) { /* best-effort */ }
    }
    _client = null;
    _isReady = false;
    _initPromise = null;
    localStorage.removeItem(SESSION_KEY);
    console.log('[TelegramClient] Global client cleared + session wiped');
}

// ─────────────────────────────────────────────────────────────────────────────
// Lazy GramJS loader (avoids 'fs' import error in Next.js SSR)
// ─────────────────────────────────────────────────────────────────────────────

async function loadGramJS() {
    const [{ TelegramClient }, { StringSession }] = await Promise.all([
        import('telegram'),
        import('telegram/sessions/StringSession'),
    ]);
    return { TelegramClient, StringSession };
}
