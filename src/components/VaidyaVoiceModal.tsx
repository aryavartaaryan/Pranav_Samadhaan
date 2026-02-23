'use client';

import { useEffect, useRef } from 'react';
import { X, Mic, MicOff, PhoneOff } from 'lucide-react';
import { useVaidyaVoiceCall } from '@/hooks/useVaidyaVoiceCall';
import VoiceVisualizer from './VoiceVisualizer';
import styles from './VaidyaVoiceModal.module.css';

interface VaidyaVoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    lang: 'en' | 'hi';
}

export default function VaidyaVoiceModal({ isOpen, onClose, lang }: VaidyaVoiceModalProps) {
    const {
        callState,
        startCall,
        endCall,
        resetToIdle,
        error,
        isMuted,
        toggleMute,
        volumeLevel,
        transcript,
        isSpeaking,
    } = useVaidyaVoiceCall({ lang });

    const transcriptEndRef = useRef<HTMLDivElement>(null);

    // Auto-start call when modal opens
    useEffect(() => {
        let mounted = true;
        if (isOpen && callState === 'idle') {
            // Small delay to ensure we don't race with a close event
            const timer = setTimeout(() => {
                if (mounted) startCall();
            }, 100);
            return () => clearTimeout(timer);
        }
        return () => { mounted = false; };
    }, [isOpen, callState, startCall]);

    // Reset to idle when modal actually closes (wait for animation if needed, but here simple is fine)
    useEffect(() => {
        if (!isOpen && callState !== 'idle') {
            resetToIdle();
        }
    }, [isOpen, callState, resetToIdle]);

    // Auto-scroll transcript (Disabled as transcript is hidden)
    /* useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript]); */

    const handleClose = (e?: React.MouseEvent | React.TouchEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        // Force close immediately (unmounts component)
        onClose();
        // Cleanup happens in useEffect when isOpen becomes false or via unmount
        // But we call endCall() directly too just to be safe
        endCall();
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            {/* Background Effects: Sri Yantra Pulse */}
            <div className={styles.sriYantraLayer}>
                <svg viewBox="0 0 100 100" fill="none" stroke="#C49102" strokeWidth="0.5" style={{ width: '100%', height: '100%', opacity: 0.15 }}>
                    <circle cx="50" cy="50" r="48" opacity="0.3" />
                    <circle cx="50" cy="50" r="40" opacity="0.4" />
                    <path d="M50 2 L90 50 L50 98 L10 50 Z" opacity="0.3" />
                    <path d="M50 10 L85 50 L50 90 L15 50 Z" opacity="0.3" />
                    <circle cx="50" cy="50" r="5" fill="#C49102" opacity="0.2" />
                </svg>
            </div>
            <div className={styles.ambientGlow} />
            <div className={styles.particles} />

            <div className={styles.closeButtonContainer}>
                {/* Close button */}
                <button onClick={handleClose} className={styles.closeButton} aria-label="Close">
                    <X size={24} />
                </button>
            </div>

            {/* Sacred background */}
            <div className={styles.background} />

            {/* Content */}
            <div className={styles.content}>
                {/* Header */}
                <div className={styles.header}>
                    <h2 className={styles.headerTitle}>
                        {lang === 'hi' ? 'आचार्य संवाद — वाणी परामर्श' : 'Acharya Samvad — Voice Consultation'}
                    </h2>
                    <p className={styles.headerSubtitle}>
                        {lang === 'hi' ? 'आचार्य प्रणव से सीधे बात करें — परिस्थिति कैसी भी हो, स्थायी नहीं होती। इसलिए चिंता न करें।' : 'Speak directly with Acharya Pranav — every situation is temporary, so do not worry.'}
                    </p>
                </div>

                {/* Status indicator & Termination UI */}
                <div className={styles.statusContainer}>
                    {callState === 'connecting' && (
                        <div className={styles.status}>
                            <div className={styles.spinner} />
                            <p>{lang === 'hi' ? 'आचार्य प्रणव से जुड़ रहे हैं...' : 'Connecting to Acharya Pranav...'}</p>
                        </div>
                    )}

                    {callState === 'active' && (
                        <div className={styles.status}>
                            <div className={styles.activeIndicator} />
                            <p>
                                {isSpeaking
                                    ? (lang === 'hi' ? 'आचार्य प्रणव बोल रहे हैं...' : 'Acharya Pranav is speaking...')
                                    : (lang === 'hi' ? 'सुन रहे हैं — बोलिए' : 'Listening — speak now')}
                            </p>
                        </div>
                    )}

                    {(callState === 'disconnected' || callState === 'error') && (
                        <div className={styles.terminationView}>
                            <div className={styles.terminationIcon}>
                                {callState === 'error' ? '⚠️' : '✨'}
                            </div>
                            <h3 className={styles.terminationTitle}>
                                {callState === 'error'
                                    ? (lang === 'hi' ? 'संपर्क में त्रुटि आई' : 'Connection Error')
                                    : (lang === 'hi' ? 'संवाद सफलतापूर्वक संपन्न' : 'Consultation Completed')}
                            </h3>
                            <p className={styles.terminationText}>
                                {callState === 'error'
                                    ? (error || (lang === 'hi' ? 'कृपया पुनः प्रयास करें' : 'Please try again later'))
                                    : (lang === 'hi' ? 'आचार्य के सुझावों का पालन करें। स्वस्थ रहें।' : 'Follow Acharya\'s guidance. Stay healthy.')}
                            </p>

                            <div className={styles.terminationActions}>
                                {callState === 'error' && (
                                    <button onClick={startCall} className={styles.retryButton}>
                                        {lang === 'hi' ? 'पुनः प्रयास करें' : 'Try Again'}
                                    </button>
                                )}
                                <button onClick={handleClose} className={styles.returnButton}>
                                    {lang === 'hi' ? 'मुख्य स्क्रीन पर वापस जाएं' : 'Return to Main Screen'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Voice visualizer with Om */}
                <div className={styles.visualizerContainer}>
                    <div className={styles.omCircle}>
                        <span className={styles.omSymbol}>🕉</span>
                    </div>
                    <VoiceVisualizer
                        volumeLevel={volumeLevel}
                        isActive={callState === 'active'}
                    />
                </div>

                {/* Live transcript - Hidden as per user request */}
                {/* <div className={styles.transcriptArea}>
                    {transcript.length === 0 ? (
                        <p className={styles.noTranscript}>
                            {callState === 'active'
                                ? (lang === 'hi' ? 'बोलिए, आचार्य सुन रहे हैं...' : 'Speak, Acharya is listening...')
                                : (lang === 'hi' ? 'संवाद यहाँ दिखेगा' : 'Conversation will appear here')}
                        </p>
                    ) : (
                        transcript.map((line, idx) => (
                            <div key={idx} className={styles.transcriptLine}>
                                {line}
                            </div>
                        ))
                    )}
                    <div ref={transcriptEndRef} />
                </div> */}

                {/* Controls - Just Mute here for focus */}
                {callState === 'active' && (
                    <div className={styles.controls}>
                        <button
                            onClick={toggleMute}
                            className={`${styles.controlButton} ${isMuted ? styles.muted : ''}`}
                            aria-label={isMuted ? 'Unmute' : 'Mute'}
                        >
                            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                        </button>
                    </div>
                )}

                {/* Bottom Section: End Call & Mantra */}
                {callState === 'active' && (
                    <button onClick={handleClose} className={styles.endCallButton} aria-label="End call">
                        <PhoneOff size={22} />
                        <span>{lang === 'hi' ? 'संवाद समाप्त करें' : 'End Call'}</span>
                    </button>
                )}

                <div className={styles.mantra}>
                    <p>ॐ धन्वन्तरये नमः</p>
                </div>
            </div>
        </div>
    );
}
