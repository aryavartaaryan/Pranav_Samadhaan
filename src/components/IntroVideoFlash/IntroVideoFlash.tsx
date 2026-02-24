import { useEffect, useRef, useState } from 'react';
import styles from './IntroVideoFlash.module.css';

interface VideoConfig {
    src: string;
    text?: string | string[]; // Support array of strings
    objectFit?: 'cover' | 'contain' | 'fill';
}

interface IntroVideoFlashProps {
    videos: VideoConfig[];
    onComplete: () => void;
    onFadeOutStart?: () => void;
    bgAudioSrc?: string;
}

export default function IntroVideoFlash({ videos, onComplete, onFadeOutStart, bgAudioSrc }: IntroVideoFlashProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFadingOut, setIsFadingOut] = useState(false);

    const isMounted = useRef(true);
    const videoRefA = useRef<HTMLVideoElement>(null);
    const videoRefB = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Track which buffer is CURRENTLY active and what its source is
    const [bufferA, setBufferA] = useState<{ src: string | null; active: boolean }>({ src: videos[0]?.src || null, active: true });
    const [bufferB, setBufferB] = useState<{ src: string | null; active: boolean }>({ src: videos[1]?.src || null, active: false });

    const [showText, setShowText] = useState(false);
    const [displayedText, setDisplayedText] = useState('');
    const [isMuted, setIsMuted] = useState(false);
    const textDone = useRef(false);

    // Initial background audio setup
    useEffect(() => {
        isMounted.current = true;

        if (bgAudioSrc) {
            // Mobile Optimization: Create audio element immediately
            const audio = new Audio();
            audio.src = bgAudioSrc;
            audio.loop = true;
            audio.volume = 1.0;
            audioRef.current = audio;

            // Attempt play
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(err => {
                    console.warn("[Intro] BG Audio initial play blocked (likely mobile policy):", err);
                    // Usually succeeds if this component was mounted right after a click
                });
            }
        }

        return () => {
            isMounted.current = false;
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, [bgAudioSrc]);

    const attemptPlay = async (videoEl: HTMLVideoElement | null, index: number) => {
        if (!videoEl || !isMounted.current) return;

        try {
            // If background audio exists, we ALWAYS mute the video
            if (bgAudioSrc) {
                videoEl.muted = true;
                setIsMuted(false); // we don't show the "Click to Unmute" because BG audio is playing
            } else {
                videoEl.muted = false;
                setIsMuted(false);
                videoEl.volume = 1.0;
            }

            videoEl.currentTime = 0;
            await videoEl.play();
            console.log(`[Intro] Success: Playing video ${index + 1}`);
        } catch (err: any) {
            console.warn(`[Intro] Autoplay failed for video ${index + 1}, retrying muted...`, err);
            try {
                if (videoEl && isMounted.current) {
                    videoEl.muted = true;
                    if (!bgAudioSrc) setIsMuted(true);
                    await videoEl.play();
                }
            } catch (muteErr) {
                console.error("[Intro] Muted playback failed:", muteErr);
            }
        }
    };

    // Play active buffer when index changes
    useEffect(() => {
        const activeVideoEl = bufferA.active ? videoRefA.current : videoRefB.current;
        if (activeVideoEl) {
            attemptPlay(activeVideoEl, currentIndex);
        }
    }, [currentIndex, bufferA.active, bufferB.active]);

    // Text Animation Effect
    useEffect(() => {
        const currentVideo = videos[currentIndex];
        if (!currentVideo) return;

        const runTextAnimation = async () => {
            if (!currentVideo.text || !isMounted.current) {
                textDone.current = true;
                return;
            }

            textDone.current = false;
            const textSegments = Array.isArray(currentVideo.text) ? currentVideo.text : [currentVideo.text];

            await new Promise(r => setTimeout(r, 1500));

            let segmentIdx = 0;
            for (const segment of textSegments) {
                if (!isMounted.current) break;
                if (!segment || segment.trim() === '') continue;

                setDisplayedText('');
                setShowText(true);
                setDisplayedText(segment);

                const waitTime = (currentIndex === 0 && (segmentIdx === 0 || segmentIdx === 1)) ? 10000 : 5000;
                await new Promise(r => setTimeout(r, waitTime));

                if (!isMounted.current) break;
                setShowText(false);
                await new Promise(r => setTimeout(r, 800));

                if (segmentIdx < textSegments.length - 1) {
                    await new Promise(r => setTimeout(r, 1500));
                }

                segmentIdx++;
            }

            textDone.current = true;
            const currentVideoEl = bufferA.active ? videoRefA.current : videoRefB.current;
            if (isMounted.current && currentVideoEl && currentVideoEl.ended) {
                handleEnded();
            }
        };

        if (currentIndex === 0) {
            onFadeOutStart?.();
        }

        runTextAnimation();
    }, [currentIndex]);

    const stopAudio = () => {
        if (audioRef.current) {
            // Simple fade out
            const fadeInterval = setInterval(() => {
                if (audioRef.current && audioRef.current.volume > 0.1) {
                    audioRef.current.volume -= 0.1;
                } else {
                    clearInterval(fadeInterval);
                    audioRef.current?.pause();
                }
            }, 100);
        }
    };

    const handleEnded = () => {
        if (!textDone.current) return;

        const nextIndex = currentIndex + 1;
        if (nextIndex < videos.length) {
            // Swap buffers and indices
            if (bufferA.active) {
                setBufferA(prev => ({ ...prev, active: false }));
                setBufferB(prev => ({ ...prev, active: true }));
                setTimeout(() => {
                    const preloadIndex = nextIndex + 1;
                    if (isMounted.current && preloadIndex < videos.length) {
                        setBufferA({ src: videos[preloadIndex].src, active: false });
                    }
                }, 100);
            } else {
                setBufferB(prev => ({ ...prev, active: false }));
                setBufferA(prev => ({ ...prev, active: true }));
                setTimeout(() => {
                    const preloadIndex = nextIndex + 1;
                    if (isMounted.current && preloadIndex < videos.length) {
                        setBufferB({ src: videos[preloadIndex].src, active: false });
                    }
                }, 100);
            }
            setCurrentIndex(nextIndex);
        } else {
            console.log("[Intro] Sequence finished");
            stopAudio();
            onFadeOutStart?.();
            setIsFadingOut(true);
            setTimeout(() => {
                onComplete();
            }, 1000);
        }
    };

    const handleSkip = () => {
        console.log('User skipped intro');
        stopAudio();
        onFadeOutStart?.();
        setIsFadingOut(true);
        setTimeout(() => {
            onComplete();
        }, 800);
    };


    return (
        <div
            className={`${styles.overlay} ${isFadingOut ? styles.fadeOut : ''}`}
            onClick={handleSkip}
        >
            <div className={styles.videoContainer}>
                {/* Buffer A */}
                <video
                    ref={videoRefA}
                    className={`${styles.singleVideo} ${bufferA.active ? styles.visible : styles.hidden}`}
                    playsInline
                    muted={bgAudioSrc ? true : false}
                    preload="auto"
                    src={bufferA.src || undefined}
                    onEnded={handleEnded}
                    style={{ objectFit: 'cover' }}
                />

                {/* Buffer B */}
                <video
                    ref={videoRefB}
                    className={`${styles.singleVideo} ${bufferB.active ? styles.visible : styles.hidden}`}
                    playsInline
                    muted={bgAudioSrc ? true : false}
                    preload="auto"
                    src={bufferB.src || undefined}
                    onEnded={handleEnded}
                    style={{ objectFit: 'cover' }}
                />
            </div>

            {/* Text Overlay */}
            {showText && (
                <div className={styles.textOverlay}>
                    {displayedText.includes('🕉') ? (
                        <div className={styles.omIconContainer}>
                            <div className={styles.vedicOmText}>ॐ</div>
                            <p className={styles.animatedText}>
                                {displayedText.replace('🕉', '').trim()}
                            </p>
                        </div>
                    ) : (
                        <p className={styles.animatedText}>{displayedText}</p>
                    )}
                </div>
            )}

            {/* Skip/Unmute hints */}
            <div className={styles.skipHint}>
                {isMuted && !bgAudioSrc ? (
                    <button
                        className={styles.unmuteBtn}
                        onClick={(e) => {
                            e.stopPropagation();
                            const activeEl = bufferA.active ? videoRefA.current : videoRefB.current;
                            if (activeEl) {
                                activeEl.muted = false;
                                setIsMuted(false);
                                activeEl.play().catch(() => { });
                            }
                        }}
                    >
                        🔊 Click to Unmute
                    </button>
                ) : (
                    <span>🕉️ Click anywhere to skip</span>
                )}
            </div>
        </div>
    );
}
