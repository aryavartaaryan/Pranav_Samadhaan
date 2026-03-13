# Telegram Integration Guide - OneSUTRA Messaging

## Overview

This guide documents the complete Telegram integration for the OneSUTRA messaging platform. The integration allows users to:

1. **Authenticate** with their Telegram account via MTProto (GramJS)
2. **Sync contacts** from Telegram and merge them with OneSUTRA users
3. **Send messages** to Telegram contacts directly from the OneSUTRA UI
4. **Receive messages** in real-time from Telegram contacts
5. **Deduplicate contacts** using the `in_dec` field to prevent duplicate UI entries

---

## Architecture

### Technology Stack

- **Frontend:** React.js (Next.js)
- **Backend/Database:** Firebase (Firestore)
- **Telegram Client:** GramJS (`telegram` npm package v2.26.22)
- **State Management:** Zustand
- **Real-time Messaging:** GramJS Event Handlers + Firebase onSnapshot

### Key Components

```
src/
├── hooks/
│   ├── useTelegramWeb.ts          # Telegram authentication & contact sync
│   ├── useUnifiedMessages.ts      # Merge Firebase + Telegram messages
│   └── useSmartSend.ts            # Route messages to Firebase or Telegram
├── lib/
│   ├── telegramMessaging.ts       # GramJS messaging service (NEW)
│   └── sutraConnect.types.ts      # TypeScript interfaces
├── stores/
│   └── sutraConnectStore.ts       # Global state for Telegram sync
└── components/
    └── SutraConnect/
        └── SutraConnect.tsx       # "Sync to Telegram" UI component
```

---

## Setup Instructions

### 1. Install Dependencies

The required packages are already in `package.json`:

```json
{
  "telegram": "^2.26.22",
  "firebase": "^12.9.0",
  "zustand": "^5.0.11"
}
```

If not installed, run:

```bash
npm install telegram firebase zustand
```

### 2. Configure Environment Variables

Create or update `.env.local` with your Telegram API credentials:

```env
NEXT_PUBLIC_TDLIB_API_ID=YOUR_API_ID
NEXT_PUBLIC_TDLIB_API_HASH=YOUR_API_HASH
```

**How to get Telegram API credentials:**

1. Visit https://my.telegram.org/auth
2. Log in with your phone number
3. Go to "API development tools"
4. Create a new application
5. Copy the `api_id` and `api_hash`

### 3. Firebase Database Schema

Ensure your Firestore `onesutra_users` collection has the following fields:

```typescript
interface OneSutraUserDoc {
  uid: string;                    // Firebase Auth UID
  name: string;
  email: string | null;
  photoURL: string | null;
  
  // Telegram integration fields
  telegram_synced?: boolean;      // Set to true after successful auth
  telegram_phone?: string;        // E.164 format: "+919876543210"
  telegram_user_id?: string;      // Telegram numeric user ID
  
  // CRITICAL: Deduplication field
  in_dec?: boolean;               // TRUE = user exists in BOTH platforms
}
```

**Setting up the `in_dec` field:**

The `in_dec` field is critical for preventing duplicate contacts in the UI. You need to set this field in Firebase when:

1. A user signs up for OneSUTRA AND they're already in someone's Telegram contacts
2. A user links their Telegram account to their existing OneSUTRA account

**Example Cloud Function to set `in_dec`:**

```javascript
// This should run when a user links Telegram
exports.updateInDecField = functions.firestore
  .document('onesutra_users/{userId}')
  .onUpdate(async (change, context) => {
    const after = change.after.data();
    const before = change.before.data();
    
    // If telegram_synced changed from false to true
    if (after.telegram_synced && !before.telegram_synced) {
      // Set in_dec to true for this user
      await change.after.ref.update({ in_dec: true });
      
      // Also check if other users have this person in their Telegram contacts
      // and update their in_dec field accordingly
      const phone = after.telegram_phone;
      if (phone) {
        // Query other users who might have this phone in their contacts
        // This requires additional logic based on your contact sync implementation
      }
    }
  });
```

---

## How It Works

### 1. Authentication Flow

**User Journey:**

1. User clicks "Connect Telegram" button on the OneSUTRA page
2. Modal opens requesting phone number
3. User enters phone number → Telegram sends OTP via SMS/app
4. User enters 5-digit OTP code
5. GramJS authenticates and saves session to `localStorage`
6. Messaging service initializes for bidirectional communication

**Code Flow:**

```typescript
// In useTelegramWeb.ts
const { submitPhone, submitCode, step } = useTelegramWeb();

// Step 1: Submit phone
await submitPhone('+919876543210');

// Step 2: Submit OTP
await submitCode('12345');

// Step 3: On success, session is saved and messaging service initializes
await initializeTelegramMessaging(client);
```

### 2. Contact Synchronization & Deduplication

**Process:**

1. After authentication, fetch Telegram contacts via `client.invoke(Api.contacts.GetContacts)`
2. Extract phone numbers from Telegram contacts
3. Query Firestore `onesutra_users` collection for matching `telegram_phone` values
4. Check the `in_dec` field for each match:
   - **`in_dec = true`**: User exists in BOTH platforms → Merge into single UI entry
   - **`in_dec = false`**: Telegram-only contact → Show with Telegram icon
5. Store results in Zustand `contactMap`

**Deduplication Logic:**

```typescript
// From useTelegramWeb.ts - crossReferenceWithFirestore()

for (const doc of firestoreSnapshot.docs) {
  const data = doc.data();
  const phone = data.telegram_phone;
  const inDec = data.in_dec ?? false; // Critical flag
  
  if (phone && contactByPhone[phone]) {
    newMap[phone] = {
      telegram_user_id: String(contactByPhone[phone].id),
      is_onesutra_user: inDec,        // Use in_dec flag
      onesutra_uid: inDec ? doc.id : null
    };
  }
}
```

**UI Rendering:**

```typescript
// In your contact list component
const isDualUser = contactMap[phone]?.is_onesutra_user;

if (isDualUser) {
  // Show merged contact with dual-platform indicator
  // User can message via Firebase OR Telegram
} else {
  // Show Telegram-only contact with Telegram icon
  // Messages route via Telegram only
}
```

### 3. Bidirectional Messaging

#### Sending Messages

**Smart Send Routing:**

```typescript
// From useSmartSend.ts

const { sendMessage } = useSmartSend({
  contactPhone: '+919876543210',
  currentUserId: user.uid,
  currentUserName: user.name,
  nativeChatId: 'firebase_chat_id',  // null if Telegram-only
  tgChatId: 'telegram_user_id'       // null if not synced
});

// User types message and hits send
await sendMessage('Hello from OneSUTRA!');

// Smart routing logic:
// 1. If override = 'TELEGRAM' → Always use Telegram
// 2. If override = 'NATIVE' → Always use Firebase
// 3. If override = 'AUTO':
//    - Dual user (in_dec=true) → Prefer NATIVE (Firebase)
//    - Telegram-only → Use TELEGRAM
```

**Implementation:**

```typescript
// Firebase send
async function sendNative(chatId, text, userId, userName) {
  await addDoc(collection(db, 'onesutra_chats', chatId, 'messages'), {
    text,
    senderId: userId,
    senderName: userName,
    createdAt: serverTimestamp()
  });
}

// Telegram send
async function sendTelegram(chatId, text) {
  const telegramService = getTelegramMessagingService();
  await telegramService.sendMessage(chatId, text);
}
```

#### Receiving Messages

**Real-time Listeners:**

```typescript
// From useUnifiedMessages.ts

// 1. Firebase listener (existing)
const unsubscribe = onSnapshot(
  query(collection(db, 'onesutra_chats', chatId, 'messages')),
  (snapshot) => {
    const messages = snapshot.docs.map(normalizeNativeMessage);
    upsertMessages(contactPhone, messages);
  }
);

// 2. Telegram listener (NEW)
const telegramService = getTelegramMessagingService();
const unsubTelegram = telegramService.addMessageListener((msg) => {
  upsertMessages(contactPhone, [msg]);
});

// Cleanup
return () => {
  unsubscribe();
  unsubTelegram();
};
```

**Message Normalization:**

Both Firebase and Telegram messages are normalized to the `UnifiedMessage` interface:

```typescript
interface UnifiedMessage {
  internal_id: string;           // "NATIVE_xyz" or "TELEGRAM_123"
  source_network: 'NATIVE' | 'TELEGRAM';
  timestamp: number;             // Unix milliseconds
  text: string;
  sender_id: string;
  sender_name: string;
  delivery_status: 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  is_mine: boolean;
  _raw_native?: any;             // Original Firebase data
  _raw_telegram?: any;           // Original GramJS message
}
```

### 4. Error Handling

**Common Errors:**

```typescript
// Rate limiting
if (err.message?.includes('FLOOD_WAIT')) {
  throw new Error('Rate limited by Telegram. Please wait a few minutes.');
}

// Invalid OTP
if (err.message?.includes('PHONE_CODE_INVALID')) {
  setError('Incorrect code. Please check the OTP and try again.');
}

// 2FA enabled
if (err.message?.includes('SESSION_PASSWORD_NEEDED')) {
  setError('2FA password required. Please temporarily disable it in Telegram.');
}

// Network errors
if (err.message?.includes('NETWORK')) {
  setError('Network error. Check your connection and try again.');
}
```

---

## Testing Checklist

### Phase 1: Authentication

- [ ] Click "Connect Telegram" button
- [ ] Enter phone number with country code (e.g., +91...)
- [ ] Receive OTP via Telegram app or SMS
- [ ] Enter 5-digit OTP code
- [ ] Verify session saved to localStorage
- [ ] Verify "Telegram Synced" success message appears
- [ ] Refresh page → Should remain authenticated

### Phase 2: Contact Sync

- [ ] After auth, verify Telegram contacts are fetched
- [ ] Check browser console for deduplication logs
- [ ] Verify `in_dec=true` users appear ONCE in contact list
- [ ] Verify `in_dec=false` Telegram contacts show Telegram icon
- [ ] Verify OneSUTRA-only users (no Telegram) appear normally

### Phase 3: Sending Messages

- [ ] Open chat with dual user (`in_dec=true`)
- [ ] Send message → Should route via Firebase (NATIVE)
- [ ] Verify message appears in Firestore
- [ ] Open chat with Telegram-only contact
- [ ] Send message → Should route via Telegram
- [ ] Verify message sent via GramJS (check Telegram app)

### Phase 4: Receiving Messages

- [ ] Have someone send you a message on Telegram
- [ ] Verify message appears in OneSUTRA UI without refresh
- [ ] Verify message has correct timestamp and sender info
- [ ] Have someone send you a message via OneSUTRA app
- [ ] Verify Firebase message appears in UI

### Phase 5: Error Scenarios

- [ ] Enter invalid phone number → Should show error
- [ ] Enter wrong OTP → Should show error
- [ ] Try to send message before auth → Should show error
- [ ] Disconnect internet → Should handle gracefully

---

## Troubleshooting

### "Telegram client not initialized" error

**Cause:** Messaging service not initialized after authentication.

**Fix:** Ensure `initializeTelegramMessaging(client)` is called in `useTelegramWeb.ts` after successful auth:

```typescript
// In submitCode() function
await initializeTelegramMessaging(clientRef.current);
```

### Duplicate contacts in UI

**Cause:** `in_dec` field not set correctly in Firebase.

**Fix:** 
1. Check Firestore console → `onesutra_users` collection
2. For users who should be merged, set `in_dec: true`
3. Re-sync Telegram contacts (sign out and sign in again)

### Messages not appearing in real-time

**Cause:** Event listener not registered or cleaned up incorrectly.

**Fix:** Check `useUnifiedMessages.ts` cleanup function:

```typescript
return () => {
  firestoreUnsubRef.current?.();
  telegramUnsubRef.current?.();
};
```

### Session expired / logged out

**Cause:** Telegram session invalidated (changed password, logged out from another device).

**Fix:** 
1. Clear localStorage: `localStorage.removeItem('sutraconnect_tg_session')`
2. Re-authenticate via "Connect Telegram" button

---

## API Reference

### `useTelegramWeb()`

Hook for Telegram authentication and contact sync.

```typescript
const {
  step,           // Current auth step
  error,          // Error message (if any)
  contactCount,   // Number of synced contacts
  isMockMode,     // True if no API credentials
  submitPhone,    // (phone: string) => Promise<void>
  submitCode,     // (code: string) => Promise<void>
  reset           // () => void - Reset auth flow
} = useTelegramWeb();
```

### `getTelegramMessagingService()`

Singleton service for sending/receiving Telegram messages.

```typescript
const service = getTelegramMessagingService();

// Send message
await service.sendMessage(chatId, 'Hello!');

// Get chat history
const messages = await service.getChatHistory(chatId, 50);

// Listen for incoming messages
const unsubscribe = service.addMessageListener((msg) => {
  console.log('New message:', msg);
});
```

### `useSmartSend()`

Hook for intelligent message routing.

```typescript
const {
  sendMessage,      // (text: string) => Promise<void>
  isSending,        // boolean
  lastSendNetwork,  // 'NATIVE' | 'TELEGRAM' | null
  override,         // Current override setting
  setOverride       // (override: SendNetworkOverride) => void
} = useSmartSend({
  contactPhone: '+919876543210',
  currentUserId: user.uid,
  currentUserName: user.name,
  nativeChatId: 'chat_id',
  tgChatId: 'telegram_id'
});
```

---

## Security Considerations

1. **Session Storage:** Telegram sessions are stored in `localStorage`. Consider encrypting sensitive data.

2. **API Credentials:** Never commit `.env.local` to version control. Use environment variables in production.

3. **Phone Number Privacy:** Phone numbers are stored in Firestore. Ensure proper security rules:

```javascript
// Firestore security rules
match /onesutra_users/{userId} {
  allow read: if request.auth != null;
  allow write: if request.auth.uid == userId;
}
```

4. **Rate Limiting:** Telegram has strict rate limits. The integration handles `FLOOD_WAIT` errors gracefully.

---

## Performance Optimization

1. **Lazy Loading:** The Telegram auth modal is dynamically imported to reduce initial bundle size.

2. **Contact Pagination:** Firestore queries are chunked (30 items max per query) to avoid hitting limits.

3. **Message Deduplication:** The `internal_id` field prevents duplicate messages in the UI.

4. **Cleanup:** All event listeners are properly cleaned up in `useEffect` return functions.

---

## Future Enhancements

- [ ] Support for media messages (images, videos, voice notes)
- [ ] Group chat support
- [ ] Message search across both platforms
- [ ] Typing indicators for Telegram contacts
- [ ] Read receipts synchronization
- [ ] 2FA password support (currently requires disabling)
- [ ] Desktop notifications for Telegram messages

---

## Support

For issues or questions:

1. Check the browser console for detailed error logs
2. Verify Firebase security rules allow read/write access
3. Ensure Telegram API credentials are valid
4. Check that `in_dec` field is set correctly in Firestore

---

**Last Updated:** March 2026  
**Version:** 1.0.0  
**Author:** Pranav.AI Development Team
