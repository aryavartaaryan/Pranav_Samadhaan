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
                {/* 1. Progress Bar (Top Edge) */}
                <div className={styles.progressContainer} onClick={handleProgressClick}>
                    <div
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* 0. Up Next Pill (Very subtle) */}
                {(nextTrackTitle || nextTrackTitleHi) && (
                    <div style={{
                        position: 'absolute',
                        top: '-24px',
                        background: 'rgba(10, 5, 2, 0.6)',
                        backdropFilter: 'blur(4px)',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        border: '1px solid rgba(212, 175, 55, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        pointerEvents: 'none'
                    }}>
                        <span style={{ fontSize: '0.65rem', color: 'rgba(212, 175, 55, 0.8)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {lang === 'hi' ? 'अगला' : 'Next'}:
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#F5E6D3', fontFamily: "'Noto Serif Devanagari', serif" }}>
                            {lang === 'hi' ? nextTrackTitleHi : nextTrackTitle}
                        </span>
                    </div>
                )}

                {/* 2. Track Info (Centered Top) */}
                <div className={styles.trackInfoCentered}>
                    <span className={styles.trackSubtitle}>
                        {type === 'video' ? (lang === 'hi' ? 'दर्शन' : 'Darshan') : (lang === 'hi' ? 'मंत्र' : 'Mantra')}
                    </span>
                    <h3 className={styles.trackTitle} title={lang === 'hi' ? titleHi : title}>
                        {lang === 'hi' ? titleHi : title}
                    </h3>
                </div>

                {/* 3. Symmetrical Controls (Bottom Row) */}
                {/* [Mute] [Prev] [ PLAY ] [Next] [Time] */}
                <div className={styles.controlsRow}>
                    {/* Left Wing */}
                    <div className={styles.controlWing}>
                        {/* Playlist Button */}
                        {onOpenPlaylist && (
                            <button
                                className={`${styles.featureBtn} ${styles.pulseSlow}`}
                                onClick={onOpenPlaylist}
                                title={lang === 'hi' ? 'मंत्र संग्रह' : 'Mantra Collection'}
                            >
                                <span style={{ fontSize: '1.2rem', filter: 'drop-shadow(0 0 2px gold)' }}>🪷</span>
                            </button>
                        )}

                        {/* Volume Control Group */}
                        <div className={styles.volumeContainer}>
                            <button
                                className={styles.secondaryBtn}
                                onClick={onToggleMute}
                                title={isMuted ? (lang === 'hi' ? 'ध्वनि चालू' : 'Unmute') : (lang === 'hi' ? 'म्यूट' : 'Mute')}
                            >
                                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                            </button>

                            {/* Compact Volume Slider */}
                            {onVolumeChange && (
                                <div className={styles.volumeSliderWrapper}>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={isMuted ? 0 : (volume ?? 1)}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            onVolumeChange(val);
                                            // Auto-unmute if sliding up
                                            if (val > 0 && isMuted) onToggleMute();
                                        }}
                                        className={styles.volumeSlider}
                                        title={lang === 'hi' ? 'ध्वनि' : 'Volume'}
                                    />
                                </div>
                            )}
                        </div>

                        <button
                            className={styles.secondaryBtn}
                            onClick={onPrevious}
                            title={lang === 'hi' ? 'पिछला' : 'Previous'}
                        >
                            <SkipBack size={20} fill="currentColor" />
                        </button>
                    </div>

                    {/* Centerpiece */}
                    <div className={styles.centerPiece}>
                        <button
                            className={styles.primaryPlayBtn}
                            onClick={onTogglePlay}
                            title={isPlaying ? (lang === 'hi' ? 'रोकें' : 'Pause') : (lang === 'hi' ? 'चलाएं' : 'Play')}
                        >
                            {isPlaying ? (
                                <Pause size={32} fill="currentColor" />
                            ) : (
                                <Play size={32} fill="currentColor" className={styles.playIconOffset} />
                            )}
                        </button>
                    </div>

                    {/* Right Wing */}
                    <div className={styles.controlWing}>
                        <button
                            className={styles.secondaryBtn}
                            onClick={onNext}
                            title={lang === 'hi' ? 'अगला' : 'Next'}
                        >
                            <SkipForward size={20} fill="currentColor" />
                        </button>

                        {/* Acharya Button */}
                        {onOpenAcharya && (
                            <button
                                className={`${styles.featureBtn} ${styles.pulseSlow}`}
                                onClick={onOpenAcharya}
                                title={lang === 'hi' ? 'आचार्य संवाद' : 'Acharya Chat'}
                            >
                                <span style={{ fontSize: '1.2rem', filter: 'drop-shadow(0 0 2px orange)' }}>🪔</span>
                            </button>
                        )}

                        <div className={styles.timeDisplay} title="Time Elapsed / Total">
                            {formatTimeDisplay(currentTime, duration)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
