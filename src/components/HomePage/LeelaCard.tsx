'use client';

import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import dynamic from 'next/dynamic';

const LeelaGraphicsEmbed = dynamic(
    () => import('@/components/Leela/LeelaGraphicsEmbed'),
    { ssr: false, loading: () => <div style={{ width: '100%', height: '100%', background: '#010006' }} /> }
);

// ── Time-of-day metadata ──────────────────────────────────────────────────
// Two-part science benefit cards shown boldly during playback
interface ScienceCard { headline: string; subline: string; }

const TOD_META: Record<string, {
    playerName: string; raagName: string; callToAction: string; scienceLine: string;
    tagEmoji: string; tag: string;
    accent: string; p0: string; phaseIdx: number; bloom: number; speed: number;
    headlineBenefit: string; subBenefit: string;
    stats: { label: string; value: string }[];
    scienceCards: ScienceCard[];
}> = {
    morning: {
        playerName: 'Morning Rāag Player', raagName: 'Rāga Bhairav · Golden Hour',
        callToAction: 'It is time for your Morning Rāag',
        scienceLine: 'Calm your mind · Refresh your mood · Ancient, engineered frequencies that trigger dopamine, serotonin and deep brainwave states — the same sounds India’s greatest minds have used for 5,000 years.',
        tagEmoji: '🌅', tag: 'Dawn · Focus', accent: 'rgba(255,185,60,0.95)', p0: '255,185,60',
        phaseIdx: 0, bloom: 1.6, speed: 0.55,
        headlineBenefit: 'Unlock Peak Performance',
        subBenefit: 'Brain entrainment via ancient frequencies — used by India\'s scholars for 5,000 years.',
        stats: [{ label: 'Focus Boost', value: '3.2×' }, { label: 'Cortisol Drop', value: '−38%' }, { label: 'Output', value: '+61%' }],
        scienceCards: [
            { headline: 'Ancient Frequencies. Modern Performance.', subline: 'Rāga Bhairav activates alpha brainwaves — the same state elite athletes call Flow.' },
            { headline: 'Your Brain on 432 Hz.', subline: 'Centuries before neuroscience, Vedic masters engineered sound to dissolve cortisol and ignite focus.' },
            { headline: '90 Seconds to Deep Work.', subline: 'Brain entrainment begins the moment you press play. No app, no hack, no supplement does this.' },
            { headline: 'Muladhara · Root · Ground.', subline: 'This sacred frequency anchors your nervous system so your mind can soar without chaos.' },
        ],
    },
    noon: {
        playerName: 'After Noon Rāag Player', raagName: 'Rāga Bhimpalasi · Midday Power',
        callToAction: 'It is time for your Noon Rāag',
        scienceLine: 'Calm your mind · Refresh your mood · Ancient, engineered frequencies that trigger dopamine, serotonin and deep brainwave states — the same sounds India’s greatest minds have used for 5,000 years.',
        tagEmoji: '☀️', tag: 'Noon · Clarity', accent: 'rgba(255,210,60,0.95)', p0: '255,210,60',
        phaseIdx: 0, bloom: 1.8, speed: 0.65,
        headlineBenefit: 'Reclaim Your Flow State',
        subBenefit: 'Not just music — sonic neuroscience. Ancient Ragas restore alpha-theta brainwave coherence.',
        stats: [{ label: 'Flow', value: '4× faster' }, { label: 'Alpha Waves', value: '+52%' }, { label: 'Clarity', value: '+74%' }],
        scienceCards: [
            { headline: 'This Is Not Music. This Is Engineering.', subline: 'Rāga Bhimpalasi was designed 3,000 years ago to restore peak mental clarity at midday.' },
            { headline: '+52% Alpha Waves in Minutes.', subline: 'Ancient sound frequencies retune your brain from reactive beta stress to calm, productive alpha.' },
            { headline: 'The Afternoon Dip Is a Choice.', subline: 'Sound-induced neuroplasticity restores theta coherence faster than caffeine — with zero crash.' },
            { headline: 'Anahata · Heart · Center.', subline: 'When the heart-mind is aligned, decisions are sharper, output is higher, and flow arrives effortlessly.' },
        ],
    },
    evening: {
        playerName: 'Evening Rāag Player', raagName: 'Rāga Yaman · Twilight Flow',
        callToAction: 'It is time for your Evening Rāag',
        scienceLine: 'Calm your mind · Refresh your mood · Ancient, engineered frequencies that trigger dopamine, serotonin and deep brainwave states — the same sounds India’s greatest minds have used for 5,000 years.',
        tagEmoji: '🌆', tag: 'Dusk · Create', accent: 'rgba(180,130,255,0.95)', p0: '180,100,255',
        phaseIdx: 2, bloom: 2.2, speed: 0.55,
        headlineBenefit: 'Enter Creative Flow',
        subBenefit: 'Rāga Yaman has inspired India\'s greatest artists for millennia. Theta waves: unlocked.',
        stats: [{ label: 'Creativity', value: '+89%' }, { label: 'Theta', value: '+44%' }, { label: 'Ideas', value: '6×' }],
        scienceCards: [
            { headline: 'Every Great Idea Lives in Theta.', subline: 'Rāga Yaman drops your brainwaves into the 4–8 Hz theta band — where insight, art and genius emerge.' },
            { headline: 'Millennia of Creative Mastery.', subline: 'India\'s greatest poets, architects and musicians used evening Ragas to enter the creative trance state.' },
            { headline: 'Unlock Divergent Thinking.', subline: 'Sahasrara frequencies dissolve the inner critic, opening neural pathways that analytical thought blocks.' },
            { headline: 'Sound as Creative Intelligence.', subline: 'Six times more ideas. No stimulants. No distractions. Just you, the frequency, and pure creative power.' },
        ],
    },
    night: {
        playerName: 'Night Rāag Player', raagName: 'Rāga Yaman Kalyan · Deep Rest',
        callToAction: 'It is time for your Night Rāag',
        scienceLine: 'Calm your mind · Refresh your mood · Ancient, engineered frequencies that trigger dopamine, serotonin and deep brainwave states — the same sounds India’s greatest minds have used for 5,000 years.',
        tagEmoji: '🌙', tag: 'Night · Restore', accent: 'rgba(80,160,255,0.95)', p0: '80,140,255',
        phaseIdx: 1, bloom: 1.6, speed: 0.45,
        headlineBenefit: 'Optimize Recovery',
        subBenefit: 'Great performance tomorrow begins now. Deep delta waves repair neural pathways.',
        stats: [{ label: 'Sleep', value: '+67%' }, { label: 'Delta', value: '+41%' }, { label: 'Tomorrow', value: '+55%' }],
        scienceCards: [
            { headline: 'Recovery Is Productivity.', subline: 'Rāga Yaman Kalyan guides delta brainwaves — the deepest repair state — making tomorrow\'s peak inevitable.' },
            { headline: '+67% Sleep Quality. Scientifically.', subline: 'Ancient sound frequencies lower cortisol by 41%, reduce neural inflammation, and rebuild focus overnight.' },
            { headline: 'The Night Is Not Wasted Time.', subline: 'Every great civilization knew: the quality of your rest determines the quality of your contribution.' },
            { headline: 'Anahata · Heart · Restore.', subline: 'Heart coherence during rest accelerates cell repair and memory consolidation. Let the frequency do its work.' },
        ],
    },
};

function getTimePeriod() {
    const h = new Date().getHours();
    if (h >= 5 && h < 11) return 'morning';
    if (h >= 11 && h < 16) return 'noon';      // noon: 11am–4pm
    if (h >= 16 && h < 21) return 'evening';   // evening: 4pm–9pm
    return 'night';
}

const TRACKS = [
    { id: 'leela-sparsha', title: 'Leela · Sparsha', artist: 'Rāga Bhairav · 15 Min', src: 'https://ik.imagekit.io/rcsesr4xf/sitar.mp3', stems: [{ url: 'https://ik.imagekit.io/rcsesr4xf/sitar.mp3', vol: 0.85 }, { url: 'https://ik.imagekit.io/rcsesr4xf/flute.mp3', vol: 0.55 }, { url: 'https://ik.imagekit.io/rcsesr4xf/0m_chant.mp3', vol: 0.30 }], isLeela: true },
    { id: 'gayatri', title: 'Gāyatrī Ghanpāth', artist: 'Vedic Chant', src: 'https://ik.imagekit.io/rcsesr4xf/gayatri-mantra-ghanpaath.mp3' },
    { id: 'lalitha', title: 'Lalithā Sahasranāmam', artist: 'Bhakti Yoga', src: 'https://ik.imagekit.io/rcsesr4xf/Lalitha-Sahasranamam.mp3' },
    { id: 'shiva', title: 'Shiva Tāndava Stotram', artist: 'Śakti Path', src: 'https://ik.imagekit.io/rcsesr4xf/Shiva-Tandav.mp3' },
    { id: 'brahma', title: 'Brahma Yagya', artist: 'Sacred Fire', src: 'https://ik.imagekit.io/rcsesr4xf/BrahmaYagya.mp3' },
    { id: 'agnihotra', title: 'Dainik Agnihotra', artist: 'Prāṇa · Morning', src: 'https://ik.imagekit.io/aup4wh6lq/DainikAgnihotra.mp3?updatedAt=1771246817070' },
];

function fmtTime(s: number) {
    if (!s || isNaN(s)) return '--:--';
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function LeelaCard() {
    const [period] = useState(() => getTimePeriod());
    const meta = TOD_META[period];
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const stemsRef = useRef<HTMLAudioElement[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [idx, setIdx] = useState(0);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [tickerIdx, setTickerIdx] = useState(0);
    const track = TRACKS[idx];
    const isLeela = !!track.isLeela;
    const { p0, accent } = meta;

    // Science card ticker
    useEffect(() => {
        const id = setInterval(() => setTickerIdx(i => (i + 1) % meta.scienceCards.length), 5000);
        return () => clearInterval(id);
    }, [meta.scienceCards.length]);

    // Audio bootstrap
    useEffect(() => {
        const a = new Audio(); a.crossOrigin = 'anonymous'; a.preload = 'metadata';
        a.onended = () => setIdx(i => (i + 1) % TRACKS.length);
        a.ontimeupdate = () => { setCurrentTime(a.currentTime); setProgress(a.duration ? a.currentTime / a.duration : 0); };
        a.onloadedmetadata = () => setDuration(a.duration);
        audioRef.current = a;
        return () => { a.pause(); a.src = ''; stemsRef.current.forEach(s => { s.pause(); s.src = ''; }); stemsRef.current = []; };
    }, []);

    useEffect(() => {
        const wasPlaying = isPlaying;
        stemsRef.current.forEach(s => { s.pause(); s.src = ''; }); stemsRef.current = [];
        setProgress(0); setCurrentTime(0); setDuration(0);
        const a = audioRef.current; if (!a) return;
        if (isLeela && track.stems) {
            a.pause(); a.src = '';
            const stems = track.stems.map(({ url, vol }) => { const el = new Audio(url); el.crossOrigin = 'anonymous'; el.loop = true; el.volume = vol; el.preload = 'metadata'; return el; });
            stemsRef.current = stems;
            stems[0].ontimeupdate = () => { setCurrentTime(stems[0].currentTime); setProgress(stems[0].duration ? stems[0].currentTime / stems[0].duration : 0); };
            stems[0].onloadedmetadata = () => setDuration(stems[0].duration);
            if (wasPlaying) stems.forEach(el => el.play().catch(() => setIsPlaying(false)));
        } else {
            a.src = TRACKS[idx].src; a.loop = false; a.load();
            a.onended = () => setIdx(i => (i + 1) % TRACKS.length);
            if (wasPlaying) a.play().catch(() => setIsPlaying(false));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idx]);

    const togglePlayback = useCallback(() => {
        setIsPlaying(prev => {
            const next = !prev;
            if (next) {
                videoRef.current?.play().catch(() => { });
                if (isLeela && stemsRef.current.length > 0) stemsRef.current.forEach(el => el.play().catch(() => setIsPlaying(false)));
                else audioRef.current?.play().catch(() => setIsPlaying(false));
            } else {
                videoRef.current?.pause();
                if (isLeela && stemsRef.current.length > 0) stemsRef.current.forEach(el => el.pause());
                else audioRef.current?.pause();
            }
            return next;
        });
    }, [isLeela]);

    useEffect(() => {
        if (!videoRef.current) return;
        if (isPlaying) videoRef.current.play().catch(() => { });
        else videoRef.current.pause();
    }, [isPlaying]);

    const prev = useCallback(() => setIdx(i => (i - 1 + TRACKS.length) % TRACKS.length), []);
    const next = useCallback(() => setIdx(i => (i + 1) % TRACKS.length), []);
    const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (isLeela) { stemsRef.current.forEach(el => { if (!el.duration) return; const rect = e.currentTarget.getBoundingClientRect(); el.currentTime = ((e.clientX - rect.left) / rect.width) * el.duration; }); }
        else { const a = audioRef.current; if (!a || !a.duration) return; const rect = e.currentTarget.getBoundingClientRect(); a.currentTime = ((e.clientX - rect.left) / rect.width) * a.duration; }
    }, [isLeela]);

    return (
        <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
            style={{
                position: 'relative', maxWidth: 860, margin: '0.5rem auto 2.5rem',
                width: 'calc(100% - 2rem)', borderRadius: '2.2rem', overflow: 'hidden',
                border: `1px solid rgba(${p0},0.18)`,
                boxShadow: `0 12px 80px rgba(0,0,0,0.80), 0 0 0 1px rgba(${p0},0.05), inset 0 1px 0 rgba(255,255,255,0.04)`,
                background: 'rgba(2,1,8,0.96)', display: 'flex', flexDirection: 'column',
            }}
        >
            {/* ══ SCREEN AREA ══ */}
            <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', minHeight: 'clamp(200px, 46vw, 390px)', overflow: 'hidden', background: '#010006' }}>
                {/* Atmospheric video */}
                <video ref={videoRef} src="/videos/mahashivratri_darshan.mp4" muted loop playsInline disablePictureInPicture
                    style={{ position: 'absolute', inset: 0, zIndex: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: isPlaying ? 0.15 : 0.08, filter: 'saturate(0.4) brightness(0.4)', transition: 'opacity 2s ease' }} />

                {/* Leela Three.js graphics */}
                <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                    <Suspense fallback={<div style={{ width: '100%', height: '100%', background: '#010006' }} />}>
                        <LeelaGraphicsEmbed phaseIdx={meta.phaseIdx} isPlaying={isPlaying} speed={meta.speed} bloom={meta.bloom} />
                    </Suspense>
                </div>

                {/* ── PAUSED overlay: full info ── */}
                <AnimatePresence>
                    {!isPlaying && (
                        <motion.div key="paused-overlay"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            transition={{ duration: 0.6, ease: 'easeInOut' }}
                            style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
                            {/* Top bar */}
                            <div style={{ background: 'linear-gradient(to bottom, rgba(1,0,6,0.65) 0%, transparent 100%)', padding: 'clamp(0.7rem,2vw,1.1rem)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: accent, boxShadow: `0 0 8px rgba(${p0},0.65)`, animation: 'raag-pulse 2s ease-in-out infinite' }} />
                                    <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(0.78rem,2.2vw,1.0rem)', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>{meta.callToAction}</span>
                                </div>
                                <span style={{ fontSize: 'clamp(0.46rem,1.0vw,0.54rem)', letterSpacing: '0.18em', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'monospace', color: accent, background: `rgba(${p0},0.10)`, border: `1px solid rgba(${p0},0.25)`, borderRadius: 999, padding: '0.22rem 0.65rem', whiteSpace: 'nowrap' }}>
                                    {meta.tagEmoji} {meta.tag}
                                </span>
                            </div>
                            {/* Bottom track info */}
                            <div style={{ background: 'linear-gradient(to top, rgba(1,0,6,0.75) 0%, transparent 100%)', padding: 'clamp(0.7rem,2vw,1.1rem)' }}>
                                <h3 style={{ margin: '0 0 0.12rem', fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.0rem,3vw,1.45rem)', fontWeight: 700, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.02em', textShadow: `0 2px 18px rgba(${p0},0.55)` }}>{track.title}</h3>
                                <p style={{ margin: '0 0 0.5rem', fontSize: 'clamp(0.54rem,1.3vw,0.64rem)', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'monospace', color: `rgba(${p0},0.70)` }}>{track.artist}</p>
                                {/* Raag name */}
                                <p style={{ margin: 0, fontSize: 'clamp(0.48rem,1.1vw,0.56rem)', letterSpacing: '0.16em', textTransform: 'uppercase', fontFamily: 'monospace', color: 'rgba(255,255,255,0.32)' }}>{meta.raagName}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── PLAYING: minimal ambient gradient only — no text, pure cinema ── */}
                {isPlaying && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'linear-gradient(to top, rgba(1,0,6,0.35) 0%, transparent 40%)', pointerEvents: 'none' }} />
                )}

                {/* ── Central Play/Pause — ALWAYS visible ── */}
                <div style={{ position: 'absolute', inset: 0, zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <motion.button
                        onClick={togglePlayback}
                        whileTap={{ scale: 0.87 }}
                        whileHover={{ scale: 1.08 }}
                        animate={isPlaying ? {
                            boxShadow: [`0 0 0 0 rgba(${p0},0.50)`, `0 0 0 24px rgba(${p0},0.00)`, `0 0 0 0 rgba(${p0},0.50)`],
                            opacity: [1, 0.85, 1],
                        } : { boxShadow: '0 8px 40px rgba(0,0,0,0.60)', opacity: 1 }}
                        transition={{ duration: 2.0, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                            width: isPlaying ? 60 : 72, height: isPlaying ? 60 : 72,
                            borderRadius: '50%',
                            background: isPlaying
                                ? `rgba(0,0,0,0.42)`
                                : 'linear-gradient(145deg, rgba(255,255,255,0.30), rgba(255,255,255,0.12))',
                            backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                            border: isPlaying ? `1.5px solid rgba(${p0},0.50)` : '2px solid rgba(255,255,255,0.55)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: isPlaying ? accent : '#FFFFFF',
                            transition: 'width 0.4s ease, height 0.4s ease, background 0.4s ease, border-color 0.4s ease',
                            pointerEvents: 'auto',
                        }}
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                        {isPlaying
                            ? <Pause size={22} fill="currentColor" />
                            : <Play size={26} fill="currentColor" style={{ marginLeft: 3 }} />}
                    </motion.button>
                </div>
            </div>

            {/* ══ CONTROLS PANEL — fades out when playing ══ */}
            <AnimatePresence>
                {!isPlaying && (
                    <motion.div
                        key="controls"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{ padding: 'clamp(0.9rem,2.2vw,1.3rem) clamp(1.2rem,3vw,2rem)', display: 'flex', flexDirection: 'column', gap: 'clamp(0.6rem,1.6vw,0.85rem)', borderTop: `1px solid rgba(${p0},0.10)`, background: 'rgba(2,1,6,0.55)' }}>

                            {/* Science + hormones — the brand story */}
                            <div style={{ borderLeft: `2px solid rgba(${p0},0.35)`, paddingLeft: '0.75rem' }}>
                                <p style={{ margin: '0 0 0.55rem', fontSize: 'clamp(0.50rem,1.15vw,0.60rem)', letterSpacing: '0.18em', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'monospace', color: `rgba(${p0},0.55)` }}>
                                    ∿ Ancient Frequency Science
                                </p>
                                <p style={{ margin: '0 0 0.60rem', fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(0.72rem,1.9vw,0.90rem)', fontStyle: 'italic', color: 'rgba(255,255,255,0.72)', lineHeight: 1.58, letterSpacing: '0.01em' }}>
                                    {meta.scienceLine}
                                </p>
                                {/* Stat pills */}
                                <div style={{ display: 'flex', gap: '0.38rem', flexWrap: 'wrap' }}>
                                    {meta.stats.map((s, i) => (
                                        <span key={i} style={{ background: `rgba(${p0},0.10)`, border: `1px solid rgba(${p0},0.22)`, borderRadius: 999, padding: '0.22rem 0.62rem', fontSize: 'clamp(0.50rem,1.1vw,0.60rem)', fontWeight: 700, fontFamily: 'monospace', color: `rgba(${p0},0.90)`, letterSpacing: '0.06em' }}>
                                            {s.value} <span style={{ fontWeight: 400, opacity: 0.55 }}>{s.label}</span>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Track selector dots */}
                            <div style={{ display: 'flex', gap: '0.38rem', alignItems: 'center' }}>
                                {TRACKS.map((tr, i) => (
                                    <button key={tr.id} onClick={() => { setIdx(i); setIsPlaying(true); }} aria-label={tr.title}
                                        style={{ width: i === idx ? 22 : 7, height: 7, borderRadius: 999, background: i === idx ? `rgba(${p0},0.90)` : 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.38s cubic-bezier(0.22,1,0.36,1)', boxShadow: i === idx ? `0 0 8px rgba(${p0},0.55)` : 'none' }} />
                                ))}
                            </div>

                            {/* Progress bar */}
                            <div>
                                <div onClick={seek} style={{ width: '100%', height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.07)', cursor: 'pointer', position: 'relative' }}>
                                    <div style={{ height: '100%', borderRadius: 999, width: `${progress * 100}%`, background: `linear-gradient(90deg, rgba(${p0},0.50), rgba(${p0},1.00))`, position: 'relative', transition: 'width 0.22s linear', boxShadow: `0 0 8px rgba(${p0},0.50)` }}>
                                        <div style={{ position: 'absolute', right: -7, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, borderRadius: '50%', background: '#FFF', boxShadow: `0 0 12px 4px rgba(${p0},0.90)` }} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.26rem', fontSize: 'clamp(0.48rem,1.0vw,0.56rem)', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.10em', fontFamily: 'monospace' }}>
                                    <span>{fmtTime(currentTime)}</span>
                                    <span style={{ color: `rgba(${p0},0.35)` }}>press play to begin session</span>
                                    <span>{fmtTime(duration)}</span>
                                </div>
                            </div>

                            {/* Prev / Next */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(1.0rem,2.8vw,1.8rem)' }}>
                                <motion.button onClick={prev} whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.88 }} aria-label="Previous"
                                    style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.65)', lineHeight: 0 }}>
                                    <SkipBack size={17} strokeWidth={2} />
                                </motion.button>
                                {/* Play placeholder to keep layout centred */}
                                <div style={{ width: 70, height: 70 }} />
                                <motion.button onClick={next} whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.88 }} aria-label="Next"
                                    style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.65)', lineHeight: 0 }}>
                                    <SkipForward size={17} strokeWidth={2} />
                                </motion.button>
                            </div>

                            {/* Footer */}
                            <motion.p animate={{ opacity: [0.30, 0.55, 0.30] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                                style={{ margin: 0, textAlign: 'center', fontSize: 'clamp(0.44rem,0.9vw,0.52rem)', letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: 'monospace', color: `rgba(${p0},0.40)` }}>
                                ✦ Increase Your Productivity · Listen to Ancient Frequencies ✦
                            </motion.p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Thin progress bar visible when playing (bottom edge) */}
            <AnimatePresence>
                {isPlaying && (
                    <motion.div key="slim-progress"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        style={{ position: 'relative', padding: '0.5rem clamp(1.2rem,3vw,2rem)', borderTop: `1px solid rgba(${p0},0.08)`, background: 'rgba(2,1,6,0.45)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontSize: '0.52rem', fontFamily: 'monospace', letterSpacing: '0.10em', color: `rgba(${p0},0.55)`, minWidth: 36 }}>{fmtTime(currentTime)}</span>
                        <div onClick={seek} style={{ flex: 1, height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.07)', cursor: 'pointer', position: 'relative' }}>
                            <div style={{ height: '100%', borderRadius: 999, width: `${progress * 100}%`, background: `linear-gradient(90deg, rgba(${p0},0.45), rgba(${p0},0.90))`, transition: 'width 0.22s linear', boxShadow: `0 0 6px rgba(${p0},0.50)` }} />
                        </div>
                        <span style={{ fontSize: '0.52rem', fontFamily: 'monospace', letterSpacing: '0.10em', color: 'rgba(255,255,255,0.25)', minWidth: 36, textAlign: 'right' }}>{fmtTime(duration)}</span>
                        {/* Prev/Next still accessible when playing */}
                        <button onClick={prev} aria-label="Previous" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 4, lineHeight: 0 }}><SkipBack size={13} /></button>
                        <button onClick={next} aria-label="Next" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 4, lineHeight: 0 }}><SkipForward size={13} /></button>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`@keyframes raag-pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.65);opacity:0.45} }`}</style>
        </motion.section>
    );
}
