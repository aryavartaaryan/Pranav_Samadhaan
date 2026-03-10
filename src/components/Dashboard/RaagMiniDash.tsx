'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import styles from './RaagMiniDash.module.css';
import WaterWaveVisualizer from './WaterWaveVisualizer';
import OmInfinityLogo from '../OmInfinityLogo';

// ── Real-time raag label based on hour ───────────────────────────────────────
function getTimeRaag(): { label: string; sub: string } {
    const h = new Date().getHours();
    if (h >= 4 && h < 6) return { label: 'Brahma Muhurta Raag', sub: 'Vedic Dawn · Stillness · Ancient Rising' };
    if (h >= 6 && h < 12) return { label: 'Morning Raag for Awakening', sub: 'Prabhata · Energy · Sacred Morning' };
    if (h >= 12 && h < 15) return { label: 'Noon Raag for Activity', sub: 'Madhyana · Focus · Midday Clarity' };
    if (h >= 15 && h < 18) return { label: 'Afternoon Raag for Flow', sub: 'Apraahna · Creativity · Sacred Flow' };
    if (h >= 18 && h < 20) return { label: 'Evening Raag for Calm', sub: 'Sandhya · Peace · Settling Dusk' };
    if (h >= 20 && h < 23) return { label: 'Night Raag for Contemplation', sub: 'Ratri · Stillness · Sacred Night' };
    return { label: 'Midnight Raag', sub: 'Nisha · Deep Rest · Sacred Dark' };
}

// ── Track list ────────────────────────────────────────────────────────────────
const TRACKS = [
    { id: 'gayatri', title: 'Gayatri Ghanpaath', likes: 248, src: 'https://ik.imagekit.io/rcsesr4xf/gayatri-mantra-ghanpaath.mp3' },
    { id: 'lalitha', title: 'Lalitha Sahasranamam', likes: 312, src: 'https://ik.imagekit.io/rcsesr4xf/Lalitha-Sahasranamam.mp3' },
    { id: 'shiva', title: 'Shiva Tandava Stotram', likes: 521, src: 'https://ik.imagekit.io/rcsesr4xf/Shiva-Tandav.mp3' },
    { id: 'brahma', title: 'Brahma Yagya', likes: 189, src: 'https://ik.imagekit.io/rcsesr4xf/BrahmaYagya.mp3' },
    { id: 'shanti', title: 'Shanti Path', likes: 403, src: 'https://ik.imagekit.io/rcsesr4xf/shanti-path.mp3' },
    { id: 'dainik', title: 'Dainik Agnihotra', likes: 167, src: 'https://ik.imagekit.io/aup4wh6lq/DainikAgnihotra.mp3?updatedAt=1771246817070' },
];

export default function RaagMiniDash() {
    const [idx, setIdx] = useState(0);
    const [playing, setPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const track = TRACKS[idx];
    const timeRaag = getTimeRaag();   // computed once per render (changes at most each minute)

    useEffect(() => {
        const a = new Audio();
        a.crossOrigin = 'anonymous';
        a.preload = 'metadata';
        a.onended = () => setIdx(i => (i + 1) % TRACKS.length);
        audioRef.current = a;
        return () => { a.pause(); a.src = ''; };
    }, []);

    useEffect(() => {
        const a = audioRef.current; if (!a) return;
        const was = !a.paused;
        a.crossOrigin = 'anonymous';
        a.src = TRACKS[idx].src;
        a.load();
        if (was) a.play().catch(() => setPlaying(false));
    }, [idx]);

    useEffect(() => {
        const a = audioRef.current; if (!a) return;
        playing ? a.play().catch(() => setPlaying(false)) : a.pause();
    }, [playing]);

    const prev = useCallback(() => setIdx(i => (i - 1 + TRACKS.length) % TRACKS.length), []);
    const next = useCallback(() => setIdx(i => (i + 1) % TRACKS.length), []);
    const toggle = useCallback(() => setPlaying(p => !p), []);

    return (
        <motion.div
            className={styles.card}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
            {/* ── Visualizer canvas (full-bleed) ───────────────────── */}
            <div className={styles.vizWrap}>
                <button className={styles.navL} onClick={prev} aria-label="Previous">‹</button>
                <button className={styles.navR} onClick={next} aria-label="Next">›</button>
                <WaterWaveVisualizer audioRef={audioRef} playing={playing} height={210} />
            </div>

            {/* ── Glass info panel ─────────────────────────────────── */}
            <div className={styles.glass}>

                {/* Badge row */}
                <div className={styles.badgeRow}>
                    <span className={styles.badge}>AUDIO NECTAR · PROJECT LEELA</span>
                    <span className={styles.likes}>🔥 {track.likes}</span>
                </div>

                {/* Real-time dynamic title */}
                <h3 className={styles.title}>{timeRaag.label}</h3>
                <p className={styles.sub}>{track.title} · {timeRaag.sub}</p>

                {/* Track dots */}
                <div className={styles.dots}>
                    {TRACKS.map((t, i) => (
                        <button
                            key={t.id}
                            className={`${styles.dot} ${i === idx ? styles.dotOn : ''}`}
                            onClick={() => { setIdx(i); setPlaying(true); }}
                            aria-label={t.title}
                        />
                    ))}
                </div>

                {/* CTA row */}
                <div className={styles.ctaRow}>
                    <button
                        className={`${styles.listenBtn} ${playing ? styles.listenActive : ''}`}
                        onClick={toggle}
                    >
                        <span className={styles.btnIcon}>{playing ? '⏸' : '▶'}</span>
                        {playing ? 'Pause' : 'Listen'}
                    </button>

                    <Link href="/dhyan-kshetra" className={styles.leelaBtn}>
                        <OmInfinityLogo size={28} className={styles.leelaLogo} />
                        Open Leela
                    </Link>
                </div>
            </div>
        </motion.div>
    );
}
