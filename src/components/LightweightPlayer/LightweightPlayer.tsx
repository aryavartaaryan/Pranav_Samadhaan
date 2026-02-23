'use client';

import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import styles from './LightweightPlayer.module.css';

interface LightweightPlayerProps {
    lang: 'en' | 'hi';
    title: string;
    titleHi: string;
    type: 'video' | 'mantra';
    isPlaying: boolean;
    progress: number;
    currentTime: number;
    duration: number;
    onTogglePlay: () => void;
    onNext: () => void;
    onPrevious: () => void;
    onSeek: (time: number) => void;
}

export default function LightweightPlayer({
    lang,
    title,
    titleHi,
    type,
    isPlaying,
    progress,
    currentTime,
    duration,
    onTogglePlay,
    onNext,
    onPrevious,
    onSeek,
}: LightweightPlayerProps) {

    const formatTime = (seconds: number) => {
        if (!seconds || isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatTimeDisplay = (current: number, total: number) => {
        if (!total || isNaN(total)) return "0:00 / 0:00";
        const remaining = Math.max(0, total - current);
        return `${formatTime(remaining)} / ${formatTime(total)}`;
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        onSeek(percentage * duration);
    };

    return (
        <div className={styles.playerWrapper}>
            <div className={styles.playerPill} role="region" aria-label="Media Player">
                {/* 1. Progress Bar (Top Edge) */}
                <div className={styles.progressContainer} onClick={handleProgressClick}>
                    <div
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* 3. Symmetrical Controls (Simplified Row) */}
                <div className={styles.controlsRow}>
                    <button
                        className={styles.secondaryBtn}
                        onClick={onPrevious}
                        title={lang === 'hi' ? 'पिछला' : 'Previous'}
                    >
                        <SkipBack size={20} fill="currentColor" />
                    </button>

                    <div className={styles.centerPiece}>
                        <button
                            className={`${styles.spiritualButton} ${isPlaying ? styles.playing : ''}`}
                            onClick={onTogglePlay}
                            title={isPlaying ? (lang === 'hi' ? 'शांति' : 'Serenity') : (lang === 'hi' ? 'चेतना' : 'Awaken')}
                        >
                            <div className={styles.mandalaContainer}>
                                <div className={styles.outerMandala} />
                                <div className={styles.petalAccent} />
                                <div className={styles.innerCore} />
                            </div>
                        </button>
                    </div>

                    <button
                        className={styles.secondaryBtn}
                        onClick={onNext}
                        title={lang === 'hi' ? 'अगला' : 'Next'}
                    >
                        <SkipForward size={20} fill="currentColor" />
                    </button>
                </div>

                {/* 4. Timing Row (Below Controls) */}
                <div className={styles.timeRow}>
                    <div className={styles.timeDisplay} title="Remaining Time / Total Duration">
                        {formatTimeDisplay(currentTime, duration)}
                    </div>
                </div>
            </div>
        </div >
    );
}
