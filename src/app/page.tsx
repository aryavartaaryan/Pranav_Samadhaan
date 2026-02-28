'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import HeroSection from '@/components/HomePage/HeroSection';
import AuthModal from '@/components/HomePage/AuthModal';
import OjasTracker from '@/components/HomePage/OjasTracker';
import PillarGrid from '@/components/HomePage/PillarGrid';
import SadhanaTimeline from '@/components/HomePage/SadhanaTimeline';
import GayatriMantraSection from '@/components/GayatriMantraSection/GayatriMantraSection';
import VoiceCallModal from '@/components/VoiceCallModal';
import WisdomTicker from '@/components/Dashboard/WisdomTicker';
import AbountModal from '@/components/Dashboard/AboutModal';
import UserProfile from '@/components/Dashboard/UserProfile';
import JustVibePortals from '@/components/Dashboard/JustVibePortals';
import SacredCanvas from '@/components/SacredCanvas/SacredCanvas';

import VedicDashboard from '@/components/Dashboard/VedicDashboard';
import TodaysMission from '@/components/Dashboard/TodaysMission';


import { useLanguage } from '@/context/LanguageContext';
import homeStyles from './vedic-home.module.css';
import dashStyles from './dashboard.module.css';
import styles from './page.module.css';

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
  const [greeting, setGreeting] = useState<{ emoji: string; text: string; period: string } | null>(null);
  const { lang, toggleLanguage } = useLanguage();

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
      <main className={dashStyles.dashboardPage}>

        {/* ══ VEDIC DASHBOARD — panchang strip below header ══ */}
        <VedicDashboard greeting={greeting} displayName={displayName} />

        {/* ══ TODAY’S MISSION — full circadian background + frosted glass tasks ══ */}
        <TodaysMission
          items={sankalpaItems}
          onToggle={handleSankalpaToggle}
          onRemove={handleSankalpaRemove}
          onAdd={handleSankalpaAdd}
          variant="vedic"
          isFullScreen={false}
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
            {[OjasTracker, PillarGrid, SadhanaTimeline, GayatriMantraSection].map((Comp, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.7, ease: easeIO }}>
                <Comp />
                {i < 3 && <div className={dashStyles.sectionDivider} />}
              </motion.div>
            ))}
          </div>

          {/* RIGHT SIDEBAR */}
          <aside className={dashStyles.sidebarRight} />
        </div>

      </main>

      {/* MODALS */}
      <VoiceCallModal isOpen={isCallModalOpen} onClose={() => setIsCallModalOpen(false)} />
      <AbountModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <UserProfile isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} userName={userName} />
    </>
  );
}
