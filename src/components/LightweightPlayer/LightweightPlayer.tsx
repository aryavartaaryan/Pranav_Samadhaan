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
    isMuted: boolean;
    progress: number;
    currentTime: number;
    duration: number;
    onTogglePlay: () => void;
    onToggleMute: () => void;
    onNext: () => void;
    onPrevious: () => void;
    onSeek: (time: number) => void;
    nextTrackTitle?: string;
    nextTrackTitleHi?: string;
    onOpenPlaylist?: () => void;
    onOpenAcharya?: () => void;
}

export default function LightweightPlayer({
    lang,
    title,
    titleHi,
    type,
    isPlaying,
    isMuted,
    progress,
    currentTime,
    duration,
    onTogglePlay,
    onToggleMute,
    onNext,
    onPrevious,
    onSeek,
    nextTrackTitle,
    nextTrackTitleHi,
    onOpenPlaylist,
    onOpenAcharya,
    volume,
    onVolumeChange
}: LightweightPlayerProps & { volume?: number; onVolumeChange?: (vol: number) => void }) {

    const formatTime = (seconds: number) => {
        if (!seconds || isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatTimeDisplay = (current: number, total: number) => {
        if (!total || isNaN(total)) return "0:00 / 0:00";
        return `${formatTime(current)} / ${formatTime(total)}`;
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
                {/* 1. Track Info (Left) */}
                <div className={styles.trackInfoCentered}>
                    <span className={styles.trackSubtitle}>
                        {type === 'video' ? (lang === 'hi' ? 'दर्शन' : 'Darshan') : (lang === 'hi' ? 'मंत्र' : 'Mantra')}
                    </span>
                    <h3 className={styles.trackTitle} title={lang === 'hi' ? titleHi : title}>
                        {lang === 'hi' ? titleHi : title}
                    </h3>
                </div>

                {/* 2. Controls (Right) */}
                <div className={styles.controlsRow}>
                    {/* Previous */}
                    <button
                        className={styles.featureBtn}
                        onClick={onPrevious}
                        title={lang === 'hi' ? 'पिछला' : 'Previous'}
                    >
                        <SkipBack size={18} fill="currentColor" />
                    </button>

                    {/* Play/Pause (Center) */}
                    <button
                        className={styles.primaryPlayBtn}
                        onClick={onTogglePlay}
                        title={isPlaying ? (lang === 'hi' ? 'रोकें' : 'Pause') : (lang === 'hi' ? 'चलाएं' : 'Play')}
                    >
                        {isPlaying ? (
                            <Pause size={20} fill="currentColor" />
                        ) : (
                            <Play size={20} fill="currentColor" style={{ marginLeft: '2px' }} />
                        )}
                    </button>

                    {/* Next */}
                    <button
                        className={styles.featureBtn}
                        onClick={onNext}
                        title={lang === 'hi' ? 'अगला' : 'Next'}
                    >
                        <SkipForward size={18} fill="currentColor" />
                    </button>

                    {/* Mute Toggle */}
                    <button
                        className={styles.featureBtn}
                        onClick={onToggleMute}
                        title={isMuted ? (lang === 'hi' ? 'ध्वनि चालू' : 'Unmute') : (lang === 'hi' ? 'म्यूट' : 'Mute')}
                    >
                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>

                    {/* Playlist Toggle */}
                    {onOpenPlaylist && (
                        <button
                            className={styles.featureBtn}
                            onClick={onOpenPlaylist}
                            title={lang === 'hi' ? 'मंत्र संग्रह' : 'Mantra Collection'}
                        >
                            <span style={{ fontSize: '1rem', marginTop: '-2px' }}>🪷</span>
                        </button>
                    )}
                </div>

                {/* 3. Progress Bar (Bottom Edge) */}
                <div className={styles.progressContainer} onClick={handleProgressClick}>
                    <div
                        className={styles.progressFill}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
