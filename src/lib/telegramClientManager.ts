'use client';
/**
 * telegramClientManager.ts — Global Telegram Client Manager
 * ─────────────────────────────────────────────────────────────────────────────
 * This module manages a singleton Telegram client instance that persists
 * across page refreshes and component re-renders. It ensures the messaging
 * service always has access to a valid client.
 * 
 * PROBLEM SOLVED:
 * - Page refresh loses the client instance
 * - Messaging service becomes uninitialized
 * - Messages fail to send with "service not initialized" error
 */

// Will be imported dynamically to avoid SSR issues

// Global client reference that persists across page loads
let _globalClient: any = null;
let _isInitialized = false;
let _initPromise: Promise<void> | null = null;

/**
 * Get the global Telegram client instance
 */
export function getGlobalTelegramClient(): any {
    return _globalClient;
}

/**
 * Set the global Telegram client instance
 */
export function setGlobalTelegramClient(client: any): void {
    _globalClient = client;
    _isInitialized = !!client;
    console.log('[TelegramClientManager] Global client set:', !!client);
}

/**
 * Check if the global client is initialized
 */
export function isGlobalClientInitialized(): boolean {
    return _isInitialized && !!_globalClient;
}

/**
 * Initialize the global client from saved session
 * Call this on app startup to restore Telegram session
 */
export async function initializeGlobalClient(): Promise<void> {
    // If we're already initializing or successfully initialized, return that promise
    if (_initPromise && _globalClient) {
        return _initPromise;
    }

    _initPromise = (async () => {
        try {
            console.log('[TelegramClientManager] Initializing global client...');

            // Check if we have a saved session
            const SESSION_KEY = 'sutraconnect_tg_session';
            const savedSession = localStorage.getItem(SESSION_KEY);

            if (!savedSession) {
                console.log('[TelegramClientManager] No saved session found');
                return;
            }

            const API_ID = parseInt(process.env.NEXT_PUBLIC_TDLIB_API_ID ?? '0', 10);
            const API_HASH = process.env.NEXT_PUBLIC_TDLIB_API_HASH ?? '';

            if (!API_ID || !API_HASH) {
                console.warn('[TelegramClientManager] API credentials not set');
                return;
            }

            // Dynamic import to avoid SSR issues
            const { loadGramJS } = await import('@/hooks/useTelegramWeb');
            const { TelegramClient, StringSession } = await loadGramJS();
            const stringSession = new StringSession(savedSession);

            const client = new TelegramClient(stringSession, API_ID, API_HASH, {
                connectionRetries: 5,
                deviceModel: 'Web Browser',
                systemVersion: 'Web',
                appVersion: '1.0',
                useWSS: true, // MUST be true for browser environments to prevent blocked ws://
            });

            console.log('[TelegramClientManager] Connecting client...');
            await client.connect();

            // Verify authorization
            if (await client.checkAuthorization()) {
                console.log('[TelegramClientManager] ✅ Authorization verified');
                setGlobalTelegramClient(client);

                // Initialize messaging service
                const { initializeTelegramMessaging } = await import('./telegramMessaging');
                await initializeTelegramMessaging(client);
                console.log('[TelegramClientManager] Messaging service initialized');
            } else {
                console.log('[TelegramClientManager] Authorization failed, clearing session');
                localStorage.removeItem(SESSION_KEY);
            }
        } catch (err) {
            console.error('[TelegramClientManager] Failed to initialize global client:', err);
            _isInitialized = false;
            _globalClient = null;
            _initPromise = null; // Clear promise so we can attempt retry
            throw err; // Rethrow to let caller know it failed
        }
    })();

    return _initPromise;
}

/**
 * Re-initialize the messaging service with the global client
 * Call this when messaging service becomes uninitialized
 */
export async function reinitializeMessagingService(): Promise<void> {
    if (!_globalClient) {
        throw new Error('No global client available for re-initialization');
    }

    console.log('[TelegramClientManager] Re-initializing messaging service...');
    const { initializeTelegramMessaging } = await import('./telegramMessaging');
    await initializeTelegramMessaging(_globalClient);
    console.log('[TelegramClientManager] Messaging service re-initialized');
}

/**
 * Clear the global client (for logout)
 */
export function clearGlobalClient(): void {
    _globalClient = null;
    _isInitialized = false;
    _initPromise = null;
    console.log('[TelegramClientManager] Global client cleared');
}
