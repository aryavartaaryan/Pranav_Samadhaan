'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import HeroSection from '@/components/HomePage/HeroSection';
import ConsciousGateway from '@/components/HomePage/ConsciousGateway';
import AuthModal from '@/components/HomePage/AuthModal';
import GayatriMantraSection from '@/components/GayatriMantraSection/GayatriMantraSection';
import VoiceCallModal from '@/components/VoiceCallModal';
import WisdomTicker from '@/components/Dashboard/WisdomTicker';
import AbountModal from '@/components/Dashboard/AboutModal';
import UserProfile from '@/components/Dashboard/UserProfile';
import SacredPortalGrid from '@/components/HomePage/SacredPortalGrid';
import ConsciousManifesto from '@/components/HomePage/ConsciousManifesto';
import SacredCanvas from '@/components/SacredCanvas/SacredCanvas';
import SakhaBodhiOrb from '@/components/Dashboard/SakhaBodhiOrb';

import EphemeralGreeting from '@/components/HomePage/EphemeralGreeting';
import StickyTopNav from '@/components/HomePage/StickyTopNav';
import MagicSyncModule from '@/components/Dashboard/MagicSyncModule';
import DailyInsightsCarousel from '@/components/Dashboard/DailyInsightsCarousel';
import { useTimeOfDay } from '@/hooks/useTimeOfDay';
import { useOneSutraAuth } from '@/hooks/useOneSutraAuth';

import { useLanguage } from '@/context/LanguageContext';
import homeStyles from './vedic-home.module.css';
import dashStyles from './dashboard.module.css';
import styles from './page.module.css';
import sakhaStyles from '@/components/Dashboard/SakhaBodhiOrb.module.css';

// ─── Greeting helpers ─────────────────────────────────────────────────────────
function buildGreeting(lang: 'en' | 'hi', h: number) {
  const isNight = h < 3 || h >= 21;
  const en = isNight
    ? { emoji: '🌙', text: 'Shubh Ratri', period: 'Night Blessings' }
    : h < 12
      ? { emoji: '🙏', text: 'Shubhodaya', period: 'Morning Blessings' }
      : h < 16
        ? { emoji: '☀️', text: 'Shubh Madhyahna', period: 'Midday Blessings' }
        : { emoji: '🪔', text: 'Shubh Sandhya', period: 'Evening Blessings' };

  const hi = isNight
    ? { emoji: '🌙', text: 'शुभ रात्रि', period: 'रात्रि विश्राम' }
    : h < 12
      ? { emoji: '🙏', text: 'शुभोदय', period: 'शुभ प्रभात' }
      : h < 16
        ? { emoji: '☀️', text: 'शुभ मध्याह्न', period: 'मध्याह्न वंदना' }
        : { emoji: '🪔', text: 'शुभ सन्ध्या', period: 'सन्ध्या वंदना' };

  return lang === 'hi' ? hi : en;
}

const easeIO = 'easeInOut' as const;
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.7, ease: easeIO },
});

// ─── Panchang helpers ─────────────────────────────────────────────────────────
const VARA_EN = ['Ravivāra', 'Somavāra', 'Maṅgalavāra', 'Budhavāra', 'Guruvāra', 'Śukravāra', 'Śanivāra'];
const PAKSHA_EN = ['Śukla Pakṣa', 'Kṛṣṇa Pakṣa'];
const TITHI_EN = [
  'Pratipada', 'Dvitīyā', 'Tṛtīyā', 'Caturthī', 'Pañcamī', 'Ṣaṣṭhī', 'Saptamī',
  'Aṣṭamī', 'Navamī', 'Daśamī', 'Ekādaśī', 'Dvādaśī', 'Trayodaśī', 'Caturdaśī', 'Pūrṇimā',
];
const VARA_HI = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
const PAKSHA_HI = ['शुक्ल पक्ष', 'कृष्ण पक्ष'];
const TITHI_HI = [
  'प्रतिपदा', 'द्वितीया', 'तृतीया', 'चतुर्थी', 'पञ्चमी', 'षष्ठी', 'सप्तमी',
  'अष्टमी', 'नवमी', 'दशमी', 'एकादशी', 'द्वादशी', 'त्रयोदशी', 'चतुर्दशी', 'पूर्णिमा',
];

function getLunarInfo(date: Date) {
  const newMoon = new Date('2000-01-06T18:14:00Z').getTime();
  const lunation = 29.53058867 * 86400000;
  const age = ((date.getTime() - newMoon) % lunation + lunation) % lunation;
  const idx = Math.floor((age / lunation) * 30);
  return { paksha: idx >= 15 ? 1 : 0, tithi: idx % 15 };
}

function fmt12h(h: number, m: number) {
  const p = h >= 12 ? 'PM' : 'AM';
  return { time: `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')}`, period: p };
}



export default function Home() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const { user } = useOneSutraAuth();
  const userName = user?.name || null;
  const [userId, setUserId] = useState<string | null>(null); // Firebase UID for greeting dedup
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSakhaActive, setIsSakhaActive] = useState(false);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);



  // ── Audio Unlock (satisfies browser autoplay gate on first gesture) ────────
  const unlockAudio = () => {
    if (isAudioUnlocked || typeof window === 'undefined') return;
    try {
      const utterance = new SpeechSynthesisUtterance('');
      utterance.volume = 0;
      window.speechSynthesis.speak(utterance);
    } catch (_) { /* noop — unlocking best-effort */ }
    setIsAudioUnlocked(true);
  };
  const [greeting, setGreeting] = useState<{ emoji: string; text: string; period: string } | null>(null);
  const { lang, toggleLanguage } = useLanguage();

  // ── useTimeOfDay (unconditional — Rules of Hooks) ────────────────────────────
  const tod = useTimeOfDay();
  // TRUE during morning (5-11) and evening (17-21) — meditation / focus hours
  const isMeditationHour = tod.period === 'morning' || tod.period === 'evening';

  // ── Curated landscape-only image pools (no portraits, no single subjects) ────
  const BG_POOLS: Record<string, string[]> = {
    morning: [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400&q=80', // misty mountain range
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1400&q=80', // mountain lake at dawn
      'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1400&q=80', // sunrise forest
    ],
    noon: [
      'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1400&q=80', // aerial valley & meadow
      'https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=1400&q=80', // sunlit mountain stream
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1400&q=80', // enchanted woodland
    ],
    evening: [
      'https://images.unsplash.com/photo-1518623489648-a173ef7824f3?w=1400&q=80', // dramatic sunset coast
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1400&q=80', // golden hour canyon
      'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1400&q=80', // sunset mountain silhouette
    ],
    night: [
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1400&q=80', // milky way mountains
      'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?w=1400&q=80', // starry night sky
      'https://images.unsplash.com/photo-1475274047050-1d0c0975f9f1?w=1400&q=80', // night lake reflection
    ],
  };
  const slot = Math.floor(Date.now() / (30 * 60_000));
  const pool = BG_POOLS[tod.period] ?? BG_POOLS.morning;
  const globalBg = pool[slot % pool.length];


  // ── Sankalpa/Mission state — kept here so it shows on home too ───────────────
  interface Sankalp { id: string; text: string; done: boolean; }
  const DEFAULT_SANKALPA: Sankalp[] = [
    { id: '1', text: 'Morning meditation — 20 mins', done: false },
    { id: '2', text: 'Enter Deep Work 9 pm', done: false },
    { id: '3', text: 'Drink copper-vessel water', done: false },
    { id: '4', text: 'Gratitude entry in journal', done: false },
  ];
  const [sankalpaItems, setSankalpaItems] = useState<Sankalp[]>(() => {
    if (typeof window !== 'undefined') {
      try { const s = localStorage.getItem('vedic_sankalpa'); if (s) return JSON.parse(s); } catch { /* ignore */ }
    }
    return DEFAULT_SANKALPA;
  });
  useEffect(() => { localStorage.setItem('vedic_sankalpa', JSON.stringify(sankalpaItems)); }, [sankalpaItems]);
  const handleSankalpaToggle = (id: string) => setSankalpaItems(p => p.map(s => s.id === id ? { ...s, done: !s.done } : s));
  const handleSankalpaRemove = (id: string) => setSankalpaItems(p => p.filter(s => s.id !== id));
  const handleSankalpaAdd = (text: string) => setSankalpaItems(p => [...p, { id: Date.now().toString(), text, done: false }]);



  useEffect(() => {
    const started = localStorage.getItem('pranav_has_started');
    const stored = localStorage.getItem('vedic_user_name');
    if (started === 'true' || stored) setHasStarted(true);
    setIsLoading(false);

    // ── Fetch Firebase UID for greeting deduplication ────────────────────────
    Promise.all([
      import('@/lib/firebase'),
      import('firebase/auth'),
    ]).then(([{ getFirebaseAuth }, { onAuthStateChanged }]) => {
      getFirebaseAuth().then(auth => {
        onAuthStateChanged(auth, (firebaseUser) => {
          if (firebaseUser) setUserId(firebaseUser.uid);
        });
      });
    }).catch(() => { /* Firebase not available in ssr */ });
  }, []);

  // Auto-dismiss splash after 12 seconds (handled inside the component itself)
  // eslint-disable-next-line @typescript-eslint/no-empty-function

  useEffect(() => {
    const handler = () => setIsAboutOpen(true);
    window.addEventListener('openAboutModal', handler);
    return () => window.removeEventListener('openAboutModal', handler);
  }, []);

  useEffect(() => {
    const handler = () => setIsProfileOpen(true);
    window.addEventListener('openProfileModal', handler);
    return () => window.removeEventListener('openProfileModal', handler);
  }, []);

  useEffect(() => {
    setGreeting(buildGreeting(lang, new Date().getHours()));
  }, [lang]);

  useEffect(() => {
    if (hasStarted) {
      document.documentElement.classList.add('app-zoomed');
    } else {
      document.documentElement.classList.remove('app-zoomed');
    }
  }, [hasStarted]);

  const handleBeginJourney = () => { localStorage.setItem('pranav_has_started', 'true'); setHasStarted(true); };
  const handleAuthSuccess = (name: string) => { handleBeginJourney(); };
  const displayName = userName || 'Traveller';

  if (isLoading) return null;

  // ── Conscious OS Gateway ─────────────────────────────────────────────────────
  if (!hasStarted) return (
    <ConsciousGateway
      onSuccess={(name: string) => handleAuthSuccess(name)}
      onGuest={handleBeginJourney}
    />
  );

  // ── Grounding Pad Dashboard ──────────────────────────────────────────────
  return (
    <>
      {/* 3-second cinematic entrance overlay — shown only once per user per day */}
      <EphemeralGreeting displayName={displayName} userId={userId} />

      {/* Fixed full-page circadian nature background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: -10,
        backgroundImage: `url(${globalBg})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        transition: 'background-image 2s ease',
      }} aria-hidden />
      {/* Dark overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: -9,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.40) 0%, rgba(0,0,0,0.60) 100%)',
        pointerEvents: 'none',
      }} aria-hidden />

      <main className={dashStyles.dashboardPage} style={{ position: 'relative', zIndex: 2, background: 'transparent' }}>

        {/* ══ FIXED TOP NAV ══ */}
        <StickyTopNav />

        {/* ══ DAILY INSIGHTS CAROUSEL ══ */}
        <div style={{ marginTop: '1.25rem' }}>
          <DailyInsightsCarousel />
        </div>

        {/* ══ TIME-BASED LAYOUT ENGINE ══
            Morning & Evening (meditation hours): LeelaCard elevated above Sync Engine
            Noon & Night (work/rest hours):       Sync Engine above LeelaCard
        */}
        <motion.div
          key="sync"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ marginTop: '1.25rem' }}
        >
          <MagicSyncModule
            items={sankalpaItems}
            onToggle={handleSankalpaToggle}
            onRemove={handleSankalpaRemove}
            onAdd={handleSankalpaAdd}
          />
        </motion.div>


        <div className={dashStyles.dashboardGrid}>

          {/* LEFT SIDEBAR */}
          <aside className={dashStyles.sidebarLeft}>
            <motion.div {...fadeUp(0.22)}><WisdomTicker /></motion.div>
          </aside>

          {/* CENTER FEED */}
          <div className={dashStyles.feedCenter}>

            {/* Sacred Portal Grid */}
            <SacredPortalGrid />

            {/* Conscious OS Manifesto — philosophical bridge */}
            <ConsciousManifesto />

            {/* Gayatri Mantra section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.7, ease: easeIO }}
            >
              <GayatriMantraSection />
            </motion.div>
          </div>

          {/* RIGHT SIDEBAR */}
          <aside className={dashStyles.sidebarRight} />
        </div>

      </main>

      {/* ══ SAKHA BODHI — "Pranic Spark" Floating Trigger ══ */}
      <AnimatePresence>
        {!isSakhaActive && (
          <motion.div
            key="sakha-trigger"
            style={{ position: 'fixed', bottom: 90, right: 22, zIndex: 1000 }}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.3 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          >
            {/* Label */}
            <span style={{
              position: 'absolute', bottom: '100%', left: '50%',
              transform: 'translateX(-50%)', marginBottom: 8,
              fontSize: 9, fontWeight: 700, letterSpacing: '0.16em',
              textTransform: 'uppercase', color: 'rgba(45,212,191,0.72)',
              fontFamily: 'system-ui, sans-serif', whiteSpace: 'nowrap',
              textShadow: '0 1px 6px rgba(0,0,0,0.7)', pointerEvents: 'none',
            }}>Sakha Bodhi</span>

            {/* Outer blur plasma ring */}
            <motion.div
              animate={{ scale: [1, 1.12, 1], opacity: [0.45, 0.25, 0.45] }}
              transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute', inset: -14,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(20,184,166,0.35) 0%, rgba(253,224,71,0.18) 55%, transparent 75%)',
                filter: 'blur(10px)',
                pointerEvents: 'none',
              }}
            />

            {/* Mid glow ring */}
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0.3, 0.6] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              style={{
                position: 'absolute', inset: -6,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(253,224,71,0.28) 0%, rgba(20,184,166,0.22) 60%, transparent 80%)',
                filter: 'blur(6px)',
                pointerEvents: 'none',
              }}
            />

            {/* Core button — the Pranic Spark itself */}
            <motion.button
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              onClick={() => { unlockAudio(); setIsSakhaActive(true); }}
              aria-label="Open Sakha Bodhi AI companion"
              title="Awaken Sakha Bodhi"
              style={{
                width: 56, height: 56,
                borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.20)',
                background: 'radial-gradient(circle at 38% 32%, rgba(253,224,71,0.55) 0%, rgba(20,184,166,0.80) 45%, rgba(15,118,110,0.92) 100%)',
                boxShadow: '0 4px 24px rgba(20,184,166,0.45), 0 0 0 1px rgba(255,255,255,0.08)',
                cursor: 'pointer',
                position: 'relative',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ SAKHA BODHI — Orb Overlay ══ */}
      <AnimatePresence>
        {isSakhaActive && (
          <SakhaBodhiOrb
            key="sakha-orb"
            userName={displayName || 'Mitra'}
            userId={userId}
            sankalpaItems={sankalpaItems}
            onSankalpaUpdate={(updated) => {
              setSankalpaItems(updated);
            }}
            onDismiss={() => setIsSakhaActive(false)}
          />
        )}
      </AnimatePresence>

      {/* MODALS */}
      <VoiceCallModal isOpen={isCallModalOpen} onClose={() => setIsCallModalOpen(false)} />
      <AbountModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <UserProfile isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} userName={userName} />
    </>
  );
}
