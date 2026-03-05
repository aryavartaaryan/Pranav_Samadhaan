'use client';
/**
 * OjasRecorder — glowing orb with fluid ripple rings for voice recording.
 * Hold to record; releases fluid ripple rings colored by detected energy level.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    accent: string;
    onRecordingComplete?: (durationMs: number) => void;
}

export default function OjasRecorder({ accent, onRecordingComplete }: Props) {
    const [isRecording, setIsRecording] = useState(false);
    const [energy, setEnergy] = useState(0); // 0–1, drives ripple size
    const [duration, setDuration] = useState(0);
    const startRef = useRef<number>(0);
    const rafRef = useRef<number>(0);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const ctx = new AudioContext();
            const src = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            src.connect(analyser);
            analyserRef.current = analyser;

            setIsRecording(true);
            startRef.current = Date.now();
            setDuration(0);

            timerRef.current = setInterval(() => {
                setDuration(Math.floor((Date.now() - startRef.current) / 1000));
            }, 1000);

            const tick = () => {
                if (!analyserRef.current) return;
                const data = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(data);
                const avg = data.reduce((a, b) => a + b, 0) / data.length;
                setEnergy(Math.min(1, avg / 80)); // normalize
                rafRef.current = requestAnimationFrame(tick);
            };
            rafRef.current = requestAnimationFrame(tick);
        } catch {
            // mic denied — silently fail
        }
    }, []);

    const stopRecording = useCallback(() => {
        setIsRecording(false);
        cancelAnimationFrame(rafRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
        streamRef.current?.getTracks().forEach(t => t.stop());
        const elapsed = Date.now() - startRef.current;
        onRecordingComplete?.(elapsed);
        setEnergy(0);
        setDuration(0);
    }, [onRecordingComplete]);

    useEffect(() => () => {
        cancelAnimationFrame(rafRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
        streamRef.current?.getTracks().forEach(t => t.stop());
    }, []);

    const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Ojas orb */}
            <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
                {/* Ripple rings — up to 3 */}
                {isRecording && [0, 1, 2].map(i => (
                    <motion.div
                        key={i}
                        animate={{
                            scale: [1, 1 + 0.6 * energy + i * 0.3, 1 + 0.8 * energy + i * 0.4],
                            opacity: [0.55 - i * 0.12, 0.2 - i * 0.05, 0],
                        }}
                        transition={{ duration: 1.4 + i * 0.3, repeat: Infinity, ease: 'easeOut', delay: i * 0.35 }}
                        style={{
                            position: 'absolute', inset: 0,
                            borderRadius: '50%',
                            border: `1.5px solid ${accent}`,
                            pointerEvents: 'none',
                        }}
                    />
                ))}

                {/* Core orb */}
                <motion.button
                    onPointerDown={startRecording}
                    onPointerUp={stopRecording}
                    onPointerLeave={isRecording ? stopRecording : undefined}
                    animate={{
                        scale: isRecording ? [1, 1.08 + energy * 0.12, 1] : 1,
                        boxShadow: isRecording
                            ? [`0 0 16px ${accent}88`, `0 0 ${28 + energy * 20}px ${accent}cc`, `0 0 16px ${accent}88`]
                            : `0 0 14px ${accent}44`,
                    }}
                    transition={{ duration: 0.6, repeat: isRecording ? Infinity : 0, ease: 'easeInOut' }}
                    style={{
                        position: 'relative', zIndex: 1,
                        width: 44, height: 44, borderRadius: '50%',
                        background: isRecording
                            ? `radial-gradient(circle at 35% 35%, ${accent}dd, ${accent}88)`
                            : `radial-gradient(circle at 35% 35%, ${accent}66, ${accent}33)`,
                        border: `1.5px solid ${accent}66`,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: '1.2rem',
                    }}
                >
                    {isRecording ? '●' : '🎙'}
                </motion.button>
            </div>

            {/* Duration */}
            <AnimatePresence>
                {isRecording && (
                    <motion.span
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -6 }}
                        style={{ fontSize: '0.8rem', color: accent, fontFamily: 'monospace', letterSpacing: '0.08em' }}
                    >
                        {fmt(duration)} · recording
                    </motion.span>
                )}
            </AnimatePresence>
        </div>
    );
}
