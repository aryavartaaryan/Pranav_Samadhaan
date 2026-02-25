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
import QuickRituals from '@/components/Dashboard/QuickRituals';
import VedicClock from '@/components/Dashboard/VedicClock';
import WisdomTicker from '@/components/Dashboard/WisdomTicker';
import PranaFeed from '@/components/Dashboard/PranaFeed';
import AboutModal from '@/components/Dashboard/AboutModal';

import DailyInsights from '@/components/Dashboard/DailyInsights';
import UserProfile from '@/components/Dashboard/UserProfile';
import PranaVerseMini from '@/components/PranaVerseMini/PranaVerseMini';
import SacredCanvas from '@/components/SacredCanvas/SacredCanvas';
import { useLanguage } from '@/context/LanguageContext';
import homeStyles from './vedic-home.module.css';
import dashStyles from './dashboard.module.css';
import styles from './page.module.css';

// ─── Pure helper — no hooks ───────────────────────────────────────────────────
function buildGreeting(lang: 'en' | 'hi', h: number) {
  const en = h < 12
    ? { emoji: '🌅', text: 'Good Morning', period: 'Morning blessings to you.' }
    : h < 16
      ? { emoji: '☀️', text: 'Good Afternoon', period: 'A peaceful afternoon awaits.' }
      : h < 20
        ? { emoji: '🪔', text: 'Good Evening', period: 'Let the dusk restore you.' }
        : { emoji: '🌙', text: 'Good Night', period: 'Rest deep, sleep peacefully.' };
  const hi = h < 12
    ? { emoji: '🌅', text: 'शुभ प्रभात', period: 'प्रभात की मंगलकामना।' }
    : h < 16
      ? { emoji: '☀️', text: 'शुभ दोपहर', period: 'शांत दोपहर की शुभकामना।' }
      : h < 20
        ? { emoji: '🪔', text: 'शुभ संध्या', period: 'सन्ध्याकाल मंगलमय हो।' }
        : { emoji: '🌙', text: 'शुभ रात्रि', period: 'गहरी नींद, शांत विश्राम।' };
  return lang === 'hi' ? hi : en;
}

const easeIO = 'easeInOut' as const;
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.7, ease: easeIO },
});

export default function Home() {
  // ── ALL hooks unconditionally at top ─────────────────────────────────────────
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [greeting, setGreeting] = useState<{ emoji: string; text: string; period: string } | null>(null);
  const { lang, toggleLanguage } = useLanguage();

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

  // ── Derived (no hooks below) ──────────────────────────────────────────────────
  const handleBeginJourney = () => { localStorage.setItem('pranav_has_started', 'true'); setHasStarted(true); };
  const handleAuthSuccess = (name: string) => { setUserName(name); handleBeginJourney(); };
  const displayName = userName || 'Traveller';

  // ── Guards ───────────────────────────────────────────────────────────────────
  if (isLoading) return null;

  if (!hasStarted) return (
    <main className={`${homeStyles.sacredPage} ${styles.main}`}>
      <HeroSection onOpenAuth={() => setIsAuthOpen(true)} onBegin={handleBeginJourney} />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onSuccess={handleAuthSuccess} />
    </main>
  );

  // ── Dashboard — Fragment wraps <main> + modals so modals escape main's stacking context ──
  return (
    <>

      <main className={dashStyles.dashboardPage}>
        <SacredCanvas />
        {/* ══ LEELA GLASS HEADER ══ */}
        <motion.header className={dashStyles.greetingHeader}
          initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: easeIO }}
        >
          {/* Left: avatar orb + greeting text */}
          <div className={dashStyles.greetingLeft}>
            <div
              className={dashStyles.avatarBadge}
              onClick={() => window.dispatchEvent(new Event('openProfileModal'))}
              title="View your Vedic profile"
            >
              🧘
            </div>
            <div className={dashStyles.greetingTextBlock}>
              <h1 className={dashStyles.greetingTitle}>
                {greeting?.text}{' '}
                <span className={dashStyles.greetingName}>{displayName}</span>
              </h1>
              <p className={dashStyles.greetingSubtitle}>{greeting?.period ?? ''}</p>
              <VedicClock compact />
            </div>
          </div>

          {/* Center: language toggle */}
          <div className={dashStyles.langPill}>
            <button className={`${dashStyles.langOption} ${lang === 'en' ? dashStyles.langOptionActive : ''}`}
              onClick={() => lang !== 'en' && toggleLanguage()}>EN</button>
            <button className={`${dashStyles.langOption} ${lang === 'hi' ? dashStyles.langOptionActive : ''}`}
              onClick={() => lang !== 'hi' && toggleLanguage()}>हिं</button>
          </div>

          {/* Right: breathing OM */}
          <div className={dashStyles.omArea}>
            <motion.span className={dashStyles.omGlyph}
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 1, ease: easeIO }}>
              ॐ
            </motion.span>
          </div>
        </motion.header>

        {/* ══ DAILY INSIGHTS ══ */}
        <motion.div {...fadeUp(0.12)}>
          <DailyInsights />
        </motion.div>

        {/* ══ 3-COLUMN GRID ══ */}
        <div className={dashStyles.dashboardGrid}>

          {/* ── LEFT SIDEBAR: Ticker · Focus Timer ── */}
          <aside className={dashStyles.sidebarLeft}>
            <motion.div {...fadeUp(0.2)}><WisdomTicker /></motion.div>
          </aside>

          {/* ── CENTER: Prana Feed → Sankalpa → rest ── */}
          <div className={dashStyles.feedCenter}>
            <motion.div {...fadeUp(0.14)}><PranaFeed /></motion.div>

            <div className={dashStyles.sectionDivider} />

            <motion.div {...fadeUp(0.16)}><PranaVerseMini /></motion.div>

            <div className={dashStyles.sectionDivider} />



            {[QuickRituals, OjasTracker, PillarGrid, SadhanaTimeline, GayatriMantraSection].map((Comp, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.7, ease: easeIO }}>
                <Comp />
                {i < 4 && <div className={dashStyles.sectionDivider} />}
              </motion.div>
            ))}
          </div>

          {/* ── RIGHT SIDEBAR: empty on mobile, hidden slot on desktop ── */}
          <aside className={dashStyles.sidebarRight} />
        </div>
      </main>

      {/* ══ MODALS — outside <main> to escape its stacking context ══ */}
      <VoiceCallModal isOpen={isCallModalOpen} onClose={() => setIsCallModalOpen(false)} />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <UserProfile isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} userName={userName} />
    </>
  );
}
