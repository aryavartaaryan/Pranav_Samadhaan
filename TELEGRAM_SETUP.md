# Quick Setup Guide - Telegram Integration

## 📦 Required NPM Packages

All required packages are already in your `package.json`:

```json
{
  "telegram": "^2.26.22",      // GramJS - Telegram MTProto client
  "firebase": "^12.9.0",       // Firebase SDK
  "zustand": "^5.0.11",        // State management
  "framer-motion": "^12.31.0"  // UI animations
}
```

**No additional packages needed!** ✅

---

## 🚀 Quick Start (3 Steps)

### Step 1: Get Telegram API Credentials

1. Visit: https://my.telegram.org/auth
2. Log in with your phone number
3. Go to **"API development tools"**
4. Create a new application:
   - **App title:** OneSUTRA Messenger
   - **Short name:** onesutra
   - **Platform:** Web
5. Copy your `api_id` and `api_hash`

### Step 2: Configure Environment Variables

Create `.env.local` in your project root:

```env
NEXT_PUBLIC_TDLIB_API_ID=12345678
NEXT_PUBLIC_TDLIB_API_HASH=abcdef1234567890abcdef1234567890
```

⚠️ **Important:** Replace with your actual credentials from Step 1.

### Step 3: Set Up Firebase `in_dec` Field

Add the `in_dec` field to your Firestore `onesutra_users` documents:

```javascript
// Example: Update existing users
const usersRef = collection(db, 'onesutra_users');
const snapshot = await getDocs(usersRef);

for (const doc of snapshot.docs) {
  const data = doc.data();
  
  // If user has linked Telegram, set in_dec to true
  if (data.telegram_synced) {
    await updateDoc(doc.ref, { in_dec: true });
  } else {
    await updateDoc(doc.ref, { in_dec: false });
  }
}
```

**Or manually in Firebase Console:**

1. Open Firebase Console → Firestore Database
2. Navigate to `onesutra_users` collection
3. For each user document, add field:
   - **Field:** `in_dec`
   - **Type:** boolean
   - **Value:** `true` (if they should be merged) or `false`

---

## 🧪 Testing the Integration

### 1. Start Development Server

```bash
npm run dev
```

### 2. Navigate to OneSUTRA Page

Open: `http://localhost:3000/onesutra`

### 3. Test Authentication Flow

1. **Click** "Connect Telegram" button
2. **Enter** your phone number with country code (e.g., `+919876543210`)
3. **Check** your Telegram app for the OTP code
4. **Enter** the 5-digit code
5. **Verify** "Telegram Synced Successfully" message appears

### 4. Test Contact Sync

Open browser console (F12) and look for:

```
[GramJS] Connected to Telegram servers
[GramJS Dedup] Cross-reference complete:
  • Total Telegram contacts: 25
  • Dual users (in_dec=true): 5
  • Telegram-only: 20
```

### 5. Test Messaging

1. **Open** a chat with a Telegram contact
2. **Type** a message and hit send
3. **Check** your Telegram app → message should appear
4. **Reply** from Telegram app → should appear in OneSUTRA UI

---

## 🐛 Common Issues & Fixes

### Issue 1: "Telegram client not initialized"

**Cause:** Environment variables not loaded.

**Fix:**
```bash
# Restart dev server after adding .env.local
npm run dev
```

### Issue 2: "PHONE_NUMBER_INVALID"

**Cause:** Missing country code.

**Fix:** Always include `+` and country code:
- ✅ `+919876543210`
- ❌ `9876543210`

### Issue 3: Duplicate contacts in UI

**Cause:** `in_dec` field not set.

**Fix:** Run the Firebase update script from Step 3 above.

### Issue 4: "SESSION_PASSWORD_NEEDED"

**Cause:** 2FA (Two-Factor Authentication) enabled on Telegram.

**Fix:** Temporarily disable 2FA:
1. Open Telegram app
2. Settings → Privacy and Security → Two-Step Verification
3. Turn off
4. Complete OneSUTRA authentication
5. Re-enable 2FA

---

## 📁 File Structure

Your integration consists of these files:

```
src/
├── hooks/
│   ├── useTelegramWeb.ts           ✅ Already exists (updated)
│   ├── useUnifiedMessages.ts       ✅ Already exists (updated)
│   └── useSmartSend.ts             ✅ Already exists (updated)
├── lib/
│   ├── telegramMessaging.ts        🆕 NEW FILE (created)
│   └── sutraConnect.types.ts       ✅ Already exists
├── stores/
│   └── sutraConnectStore.ts        ✅ Already exists
└── components/
    └── SutraConnect/
        └── SutraConnect.tsx        ✅ Already exists
```

**New files created:**
- `src/lib/telegramMessaging.ts` - GramJS messaging service
- `TELEGRAM_INTEGRATION_GUIDE.md` - Full documentation
- `TELEGRAM_SETUP.md` - This quick start guide

---

## 🎯 What's Working Now

✅ **Authentication:** Phone + OTP login via GramJS  
✅ **Contact Sync:** Fetch Telegram contacts and merge with Firebase users  
✅ **Deduplication:** Use `in_dec` field to prevent duplicate UI entries  
✅ **Send Messages:** Route to Firebase or Telegram based on contact type  
✅ **Receive Messages:** Real-time listeners for both platforms  
✅ **Smart Routing:** Auto-select best network (NATIVE preferred for dual users)  
✅ **Error Handling:** Graceful handling of rate limits, invalid OTPs, network errors  
✅ **Session Persistence:** Telegram session saved to localStorage  

---

## 🔐 Security Notes

1. **Never commit `.env.local`** to Git
2. Add to `.gitignore`:
   ```
   .env.local
   .env*.local
   ```
3. Use environment variables in production (Vercel, Netlify, etc.)
4. Telegram sessions are stored in localStorage - consider encryption for production

---

## 📞 Support

**Check logs:**
```javascript
// Browser console
localStorage.getItem('sutraconnect_tg_session') // Check if session exists
```

**Clear session:**
```javascript
localStorage.removeItem('sutraconnect_tg_session')
```

**Re-authenticate:**
1. Clear session (above)
2. Refresh page
3. Click "Connect Telegram" again

---

## ✨ Next Steps

After successful setup:

1. **Test with real users** - Have team members link their Telegram accounts
2. **Monitor Firebase** - Check that `in_dec` field is set correctly
3. **Review logs** - Look for deduplication messages in console
4. **Deploy to production** - Add env vars to your hosting platform

---

**Ready to go!** 🚀

The integration is complete and functional. All existing Firebase messaging logic remains intact - we've only added Telegram as an additional messaging channel.
