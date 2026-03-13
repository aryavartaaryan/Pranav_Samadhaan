'use client';
/**
 * sutraConnectStore.ts — Zustand Global State for Sutra Connect
 * ─────────────────────────────────────────────────────────────────────────────
 * This store is the Single Source of Truth for:
 *   1. Telegram auth status (is the user synced?)
 *   2. The local contact identity map (dual-user resolution results)
 *   3. Per-conversation unified message threads (merged Firestore + Telegram)
 *   4. The user's current send-network override toggle state
 *
 * DESIGN DECISION: Using Zustand with immer for clean state mutations.
 * No persistence (localStorage) for message threads — those are always
 * hydrated from live Firestore + TDLib on mount. The contactMap IS persisted
 * to avoid repeated Firestore batch queries every session.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
    SutraConnectStore,
    UnifiedMessage,
    SendNetworkOverride,
} from '@/lib/sutraConnect.types';

type ContactEntry = { 
    telegram_user_id: string; 
    is_onesutra_user: boolean; 
    onesutra_uid: string | null;
    first_name?: string;
    last_name?: string;
    username?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Store Definition
// ─────────────────────────────────────────────────────────────────────────────

export const useSutraConnectStore = create<SutraConnectStore>()(
    persist(
        immer((set) => ({
            // ── Initial State ──────────────────────────────────────────────────────
            isTelegramSynced: false,
            telegramUserId: null,
            telegramPhone: null,
            contactMap: {}, // phone -> { telegram_user_id, is_onesutra_user, onesutra_uid, first_name, last_name, username }
            messageThreads: {},
            sendOverride: 'AUTO',

            // ── Actions ────────────────────────────────────────────────────────────

            /**
             * Called after successful TDLib auth + Firestore write.
             * Marks Telegram as connected in the store.
             */
            setTelegramSynced: (userId: string, phone: string) =>
                set((state) => {
                    state.isTelegramSynced = true;
                    state.telegramUserId = userId;
                    state.telegramPhone = phone;
                }),

            /**
             * Phase 2: Populate the contact identity map after Firestore batch check.
             * Keyed by normalised phone number (E.164) for O(1) lookup during send.
             *
             * IMPORTANT: This merges into existing map — doesn't replace — so partial
             * updates from paginated contact syncs don't wipe prior results.
             */
            /**
             * Accepts a Record<phone, ContactEntry> built by useTelegramWeb
             * after cross-referencing Telegram contacts with Firestore.
             */
            setContactMap: (map: Record<string, ContactEntry>) =>
                set((state) => {
                    // Deep merge — newer sync result wins, prior entries preserved
                    Object.assign(state.contactMap, map);
                }),

            /**
             * Phase 3: Upsert (merge + sort) messages into a unified thread.
             *
             * Why upsert vs replace?
             *   Firestore and TDLib emit updates independently. We merge them into
             *   a single sorted array rather than replacing each side separately.
             *   Using internal_id as the deduplication key prevents doubles.
             *
             * @param contactPhone - E.164 phone (canonical thread key)
             * @param msgs - New/updated messages from either source
             */
            upsertMessages: (contactPhone: string, msgs: UnifiedMessage[]) =>
                set((state) => {
                    const existing = state.messageThreads[contactPhone] ?? [];

                    // Build a map of existing messages by internal_id
                    const msgMap = new Map<string, UnifiedMessage>();
                    existing.forEach((m) => msgMap.set(m.internal_id, m));

                    // Upsert new messages (overwrite same ID, add new ones)
                    msgs.forEach((m) => msgMap.set(m.internal_id, m));

                    // Re-sort chronologically by timestamp (Unix ms)
                    state.messageThreads[contactPhone] = Array.from(msgMap.values()).sort(
                        (a, b) => a.timestamp - b.timestamp
                    );
                }),

            /**
             * Phase 4: UI toggle — overrides the Smart Send routing logic.
             * 'AUTO' restores the default (NATIVE preferred).
             */
            setSendOverride: (override: SendNetworkOverride) =>
                set((state) => {
                    state.sendOverride = override;
                }),
        })),
        {
            name: 'sutra-connect-v1',
            storage: createJSONStorage(() => localStorage),
            // Only persist auth state and contact map — message threads are ephemeral
            partialize: (state) => ({
                isTelegramSynced: state.isTelegramSynced,
                telegramUserId: state.telegramUserId,
                telegramPhone: state.telegramPhone,
                contactMap: state.contactMap,
            }),
        }
    )
);

// ─────────────────────────────────────────────────────────────────────────────
// Selectors (memoised for component performance)
// ─────────────────────────────────────────────────────────────────────────────

/** Get a single contact by phone number */
export const selectContact = (phone: string) =>
    (state: SutraConnectStore) => state.contactMap[phone] ?? null;

/** Get unified thread for a contact */
export const selectThread = (contactPhone: string) =>
    (state: SutraConnectStore) => state.messageThreads[contactPhone] ?? [];

/** Check if a contact is a dual-user (on both platforms) */
export const selectIsDualUser = (contactPhone: string) =>
    (state: SutraConnectStore) => state.contactMap[contactPhone]?.is_onesutra_user ?? false;

/** Get the OnesuTRA UID for a dual-user contact (for Firestore chatId generation) */
export const selectOneSutraUid = (contactPhone: string) =>
    (state: SutraConnectStore) => state.contactMap[contactPhone]?.onesutra_uid ?? null;
