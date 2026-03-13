/**
 * sutraConnect.types.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for ALL TypeScript interfaces used by Sutra Connect.
 *
 * Architecture Overview:
 *  ┌─────────────────────────────────────────────────────────────────┐
 *  │  NATIVE messages  →  Firebase Firestore (onesutra_chats/)       │
 *  │  TELEGRAM messages → TDLib / MTProto (local device storage)     │
 *  │  UNIFIED view     →  In-memory merge in useUnifiedMessages hook │
 *  └─────────────────────────────────────────────────────────────────┘
 *
 * Firestore Collection: `onesutra_users`
 * Each document: { uid, email, telegram_synced, telegram_phone, telegram_user_id, ... }
 */

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1 — USER SCHEMA (Firestore `onesutra_users` collection)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full user document stored in Firestore `onesutra_users/{uid}`.
 * Fields with `?` are optional and added progressively.
 */
export interface OneSutraUserDoc {
    uid: string;                        // Firebase Auth UID (document key)
    name: string;                       // Display name
    email: string | null;               // Firebase email (primary auth)
    photoURL: string | null;            // Profile picture URL
    lastSeen?: number;                  // Unix ms timestamp

    // ── Telegram integration fields (Phase 1) ────────────────────────────────
    telegram_synced?: boolean;          // True once TDLib auth is confirmed
    telegram_phone?: string;            // E.164 format e.g. "+919876543210"
    telegram_user_id?: string;          // Telegram numeric user ID (as string)

    // ── FCM tokens for push notifications ────────────────────────────────────
    fcmTokens?: string[];               // Array of device FCM tokens
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2 — IDENTITY RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A contact fetched from the user's Telegram contact list.
 * Enriched with `is_onesutra_user` after the Firestore batch check.
 */
export interface TelegramContact {
    telegram_user_id: string;           // Telegram numeric user ID
    phone_number: string;               // E.164 phone number from Telegram
    first_name: string;
    last_name?: string;
    username?: string;                  // Telegram @handle

    // ── Set by useContactIdentityResolver ─────────────────────────────────────
    is_onesutra_user: boolean;          // True if they have a OneSUTRA account
    onesutra_uid?: string;              // Their Firebase UID (if is_onesutra_user)
}

/**
 * A single entry in the contact map — the normalised result of
 * cross-referencing a Telegram contact with Firestore.
 */
export interface ContactEntry {
    telegram_user_id: string;
    is_onesutra_user: boolean;
    onesutra_uid: string | null;
    first_name?: string;
    last_name?: string;
    phone_number?: string;
    username?: string;
}

/**
 * Local contact map: phone_number → ContactEntry.
 * Stored in Zustand to avoid repeated Firestore queries.
 */
export type ContactMap = Record<string, ContactEntry>;

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3 — UNIFIED / NORMALISED MESSAGE SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Network source enum — clearly distinguishes message provenance.
 */
export type SourceNetwork = 'NATIVE' | 'TELEGRAM';

/**
 * Delivery status valid across both networks.
 */
export type DeliveryStatus =
    | 'SENDING'       // Optimistic local insert
    | 'SENT'          // Confirmed by Firestore / TDLib
    | 'DELIVERED'     // Remote device received (TDLib: messageSendingStateSucceeded)
    | 'READ'          // Recipient opened (Firestore: readAt field / TDLib view)
    | 'FAILED';       // Network error

/**
 * A normalised message that can represent either a Native (Firestore) or
 * Telegram (TDLib) message in the unified UI thread.
 */
export interface UnifiedMessage {
    /**
     * Globally unique ID within the app's in-memory state.
     * Format: "NATIVE_{firestoreDocId}" | "TELEGRAM_{tdlibMsgId}"
     */
    internal_id: string;

    /** Which network this message came from */
    source_network: SourceNetwork;

    /**
     * Unix millisecond timestamp — used as the single sort key for chronological
     * ordering in the merged array.
     */
    timestamp: number;

    /** Message text content */
    text: string;

    /**
     * Sender's unique ID within its own network.
     * NATIVE → Firebase UID
     * TELEGRAM → Telegram numeric user ID (as string)
     */
    sender_id: string;

    /** Human-readable sender name */
    sender_name: string;

    /** Current delivery status */
    delivery_status: DeliveryStatus;

    /** True when the current logged-in user is the sender */
    is_mine: boolean;

    // ── Optional rich media ───────────────────────────────────────────────────
    voice_note_url?: string;            // Audio URL (Firebase Storage for NATIVE)
    image_url?: string;                 // Photo URL for image messages

    // ── Raw original payload (for debugging / advanced features) ─────────────
    _raw_native?: Record<string, unknown>;   // Original Firestore document data
    _raw_telegram?: TDLibMessage;            // Original TDLib message object
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 4 — SEND ROUTING & STORE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Which network to force-use when sending the next message.
 * 'AUTO' = use SmartSend logic (NATIVE preferred over TELEGRAM).
 */
export type SendNetworkOverride = 'AUTO' | 'NATIVE' | 'TELEGRAM';

/**
 * The complete Zustand store shape for Sutra Connect.
 */
export interface SutraConnectStore {
    // ── Telegram auth state ───────────────────────────────────────────────────
    isTelegramSynced: boolean;
    telegramUserId: string | null;
    telegramPhone: string | null;

    // ── Contact identity map ──────────────────────────────────────────────────
    contactMap: ContactMap;

    // ── Per-chat unified message threads ─────────────────────────────────────
    /** Key: contact phone number (canonical), Value: sorted merged messages */
    messageThreads: Record<string, UnifiedMessage[]>;

    // ── UI overrides ──────────────────────────────────────────────────────────
    sendOverride: SendNetworkOverride;

    // ── Actions ───────────────────────────────────────────────────────────────
    setTelegramSynced: (userId: string, phone: string) => void;
    setContactMap: (map: Record<string, ContactEntry>) => void;
    upsertMessages: (contactPhone: string, msgs: UnifiedMessage[]) => void;
    setSendOverride: (override: SendNetworkOverride) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// TDLIB TYPES (minimal subset for what we use in Sutra Connect)
// ─────────────────────────────────────────────────────────────────────────────

/** Minimal TDLib message shape extracted from updateNewMessage events */
export interface TDLibMessage {
    id: number;                          // TDLib message ID
    chat_id: number;                     // TDLib chat ID
    sender_id?: { user_id?: number };   // Sender info
    content?: {
        '@type': string;
        text?: { text: string };           // For messageText content type
        caption?: { text: string };        // For photo/video captions
        photo?: unknown;
    };
    date: number;                        // Unix seconds timestamp
    is_outgoing: boolean;
    sending_state?: { '@type': string };
}

/** TDLib auth state — mirrors the TDLib authorizationState update types */
export type TDLibAuthState =
    | 'authorizationStateWaitPhoneNumber'
    | 'authorizationStateWaitCode'
    | 'authorizationStateWaitPassword'
    | 'authorizationStateReady'
    | 'authorizationStateClosed'
    | 'authorizationStateLoggingOut';

/** TDLib contact from getContacts() */
export interface TDLibContact {
    '@type': 'user';
    id: number;
    first_name: string;
    last_name: string;
    username: string;
    phone_number: string;
}
