'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HeroSection from '@/components/HomePage/HeroSection';
import AuthModal from '@/components/HomePage/AuthModal';
import PillarGrid from '@/components/HomePage/PillarGrid';
import GayatriMantraSection from '@/components/GayatriMantraSection/GayatriMantraSection';
import VoiceCallModal from '@/components/VoiceCallModal';
import WisdomTicker from '@/components/Dashboard/WisdomTicker';
import AbountModal from '@/components/Dashboard/AboutModal';
import UserProfile from '@/components/Dashboard/UserProfile';
import JustVibePortals from '@/components/Dashboard/JustVibePortals';
import SacredCanvas from '@/components/SacredCanvas/SacredCanvas';
import SakhaBodhiOrb from '@/components/Dashboard/SakhaBodhiOrb';

import VedicDashboard from '@/components/Dashboard/VedicDashboard';
import MagicSyncModule from '@/components/Dashboard/MagicSyncModule';
import DailyInsightsCarousel from '@/components/Dashboard/DailyInsightsCarousel';
import { useCircadianBackground } from '@/hooks/useCircadianBackground';

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
      : h < 17
        ? { emoji: '☀️', text: 'Shubh Madhyahna', period: 'Midday Blessings' }
        : { emoji: '🪔', text: 'Shubh Sandhya', period: 'Evening Blessings' };

  const hi = isNight
    ? { emoji: '🌙', text: 'शुभ रात्रि', period: 'रात्रि विश्राम' }
    : h < 12
      ? { emoji: '🙏', text: 'शुभोदय', period: 'शुभ प्रभात' }
      : h < 17
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
  const [userName, setUserName] = useState<string | null>(null);
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
  const { imageUrl, loaded } = useCircadianBackground('vedic');

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
    if (stored) setUserName(stored);
    setIsLoading(false);
  }, []);

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
  const handleAuthSuccess = (name: string) => { setUserName(name); handleBeginJourney(); };
  const displayName = userName || 'Traveller';

  if (isLoading) return null;

  // ── Splash / Onboarding ──────────────────────────────────────────────────────
  if (!hasStarted) return (
    <main className={`${homeStyles.sacredPage} ${styles.main}`}>
      <HeroSection onOpenAuth={() => setIsAuthOpen(true)} onBegin={handleBeginJourney} />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onSuccess={handleAuthSuccess} />
    </main>
  );

  // ── Grounding Pad Dashboard ──────────────────────────────────────────────────
  return (
    <>
      {/* Fixed circadian nature background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', transition: 'opacity 1.5s ease', opacity: loaded ? 1 : 0 }} aria-hidden />
      {/* Gradient scrim overlay */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, background: 'linear-gradient(to bottom, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.72) 100%)', pointerEvents: 'none' }} aria-hidden />

      <main className={dashStyles.dashboardPage} style={{ position: 'relative', zIndex: 2, background: 'transparent' }}>

        {/* ══ VEDIC DASHBOARD — panchang strip below header ══ */}
        <VedicDashboard greeting={greeting} displayName={displayName} />

        {/* ══ TODAY’S MISSION — full circadian background + frosted glass tasks ══ */}        {/* ══ DAILY INSIGHTS CAROUSEL ══ */}
        <DailyInsightsCarousel />


        <MagicSyncModule
          items={sankalpaItems}
          onToggle={handleSankalpaToggle}
          onRemove={handleSankalpaRemove}
          onAdd={handleSankalpaAdd}
        />





        {/* ══ 3-COLUMN GRID — below the reel ══ */}
        <div className={dashStyles.dashboardGrid}>

          {/* LEFT SIDEBAR */}
          <aside className={dashStyles.sidebarLeft}>
            <motion.div {...fadeUp(0.22)}><WisdomTicker /></motion.div>
          </aside>

          {/* CENTER FEED */}
          <div className={dashStyles.feedCenter}>

            {/* JustVibe portal cards */}
            <motion.div {...fadeUp(0.2)}><JustVibePortals /></motion.div>

            <div className={dashStyles.sectionDivider} />

            {/* Remaining wellness sections — below fold */}
            {[PillarGrid, GayatriMantraSection].map((Comp, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.7, ease: easeIO }}>
                <Comp />
                {i < 1 && <div className={dashStyles.sectionDivider} />}
              </motion.div>
            ))}
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
