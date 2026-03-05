'use client';
/**
 * WebRTCCallScreen — Firebase Firestore signaling + WebRTC P2P voice/video.
 * Maintains the nature background with blur behind the remote video feed.
 * Uses Google STUN servers for NAT traversal.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';

const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
];

export type CallMode = 'voice' | 'video';

interface Props {
    callId: string;
    isInitiator: boolean;
    mode: CallMode;
    localUserId: string;
    remoteContact: { name: string; emoji?: string; photoURL?: string | null; aura: string };
    accent: string;
    onEnd: () => void;
}

export default function WebRTCCallScreen({ callId, isInitiator, mode, localUserId, remoteContact, accent, onEnd }: Props) {
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);

    const [connected, setConnected] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(mode === 'voice');
    const [callDuration, setCallDuration] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Play singing bowl chime on mount
    useEffect(() => {
        const ring = async () => {
            try {
                const ctx = new AudioContext();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(432, ctx.currentTime); // 432Hz — sacred frequency
                gain.gain.setValueAtTime(0, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.2);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 4.5);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 4.5);
            } catch { /* audio context denied */ }
        };
        ring();
    }, []);

    const setupPeerConnection = useCallback(async () => {
        const { getFirebaseFirestore } = await import('@/lib/firebase');
        const { doc, collection, addDoc, onSnapshot, getDoc, updateDoc, setDoc } = await import('firebase/firestore');
        const db = await getFirebaseFirestore();

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        pcRef.current = pc;

        // Get local media
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: mode === 'video',
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
        }
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        // Remote stream
        const remoteStream = new MediaStream();
        pc.ontrack = (e) => {
            e.streams[0].getTracks().forEach(track => remoteStream.addTrack(track));
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
            }
            setConnected(true);
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'connected') {
                setConnected(true);
                timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
            }
        };

        const callDoc = doc(db, 'sutratalkCalls', callId);
        const localCandidatesCol = collection(callDoc, isInitiator ? 'callerCandidates' : 'calleeCandidates');
        const remoteCandidatesCol = collection(callDoc, isInitiator ? 'calleeCandidates' : 'callerCandidates');

        pc.onicecandidate = async (e) => {
            if (e.candidate) {
                await addDoc(localCandidatesCol, e.candidate.toJSON());
            }
        };

        if (isInitiator) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await setDoc(callDoc, { offer: { type: offer.type, sdp: offer.sdp }, mode }, { merge: true });

            onSnapshot(callDoc, async (snap) => {
                const data = snap.data();
                if (!pc.currentRemoteDescription && data?.answer) {
                    await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                }
            });
        } else {
            const callData = (await getDoc(callDoc)).data();
            if (callData?.offer) {
                await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await updateDoc(callDoc, { answer: { type: answer.type, sdp: answer.sdp } });
            }
        }

        onSnapshot(remoteCandidatesCol, (snap) => {
            snap.docChanges().forEach(change => {
                if (change.type === 'added') {
                    pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
                }
            });
        });
    }, [callId, isInitiator, mode]);

    useEffect(() => {
        setupPeerConnection().catch(console.error);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            localStreamRef.current?.getTracks().forEach(t => t.stop());
            pcRef.current?.close();
        };
    }, [setupPeerConnection]);

    const handleEnd = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        pcRef.current?.close();
        onEnd();
    };

    const toggleMute = () => {
        const audioTrack = localStreamRef.current?.getAudioTracks()[0];
        if (audioTrack) { audioTrack.enabled = !audioTrack.enabled; setIsMuted(m => !m); }
    };

    const toggleVideo = () => {
        const videoTrack = localStreamRef.current?.getVideoTracks()[0];
        if (videoTrack) { videoTrack.enabled = !videoTrack.enabled; setIsVideoOff(v => !v); }
    };

    const fmtDur = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
            }}
        >
            {/* Remote video / avatar bg */}
            <video
                ref={remoteVideoRef}
                autoPlay playsInline
                style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%',
                    objectFit: 'cover',
                    filter: 'blur(24px) brightness(0.55)',
                    transform: 'scale(1.08)',
                }}
            />
            {/* Dark scrim */}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(2,4,14,0.72)', backdropFilter: 'blur(12px)' }} />

            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', width: '100%', padding: '2rem' }}>

                {/* Status */}
                <p style={{ fontSize: '0.6rem', color: `${accent}bb`, letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: 'monospace', margin: 0 }}>
                    {connected ? fmtDur(callDuration) : 'Connecting…'}
                </p>

                {/* Remote avatar */}
                <motion.div
                    animate={{ boxShadow: connected ? [`0 0 30px ${accent}55`, `0 0 60px ${accent}99`, `0 0 30px ${accent}55`] : `0 0 20px ${accent}33` }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ width: 120, height: 120, borderRadius: '50%', border: `3px solid ${accent}66`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5rem', background: `radial-gradient(circle, ${remoteContact.aura}22, rgba(0,0,0,0.6))` }}
                >
                    {remoteContact.photoURL ? <img src={remoteContact.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : remoteContact.emoji ?? '🧘'}
                </motion.div>

                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, fontFamily: "'Playfair Display', serif", color: 'white' }}>{remoteContact.name}</h2>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                        {connected ? `${mode === 'video' ? 'Video' : 'Voice'} · Conscious connection` : 'Initiating resonance…'}
                    </p>
                </div>

                {/* Local video PIP */}
                {mode === 'video' && !isVideoOff && (
                    <video ref={localVideoRef} autoPlay muted playsInline
                        style={{ position: 'fixed', bottom: '7rem', right: '1.5rem', width: 110, height: 150, borderRadius: 16, objectFit: 'cover', border: `1.5px solid ${accent}55`, boxShadow: `0 0 20px rgba(0,0,0,0.6)` }}
                    />
                )}

                {/* Controls */}
                <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center', marginTop: '1rem' }}>
                    <button onClick={toggleMute} style={{ width: 56, height: 56, borderRadius: '50%', background: isMuted ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.10)', border: `1.5px solid ${isMuted ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.18)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: isMuted ? '#f87171' : 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)' }}>
                        {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                    </button>

                    {/* End call */}
                    <motion.button onClick={handleEnd} whileTap={{ scale: 0.9 }}
                        style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #ef4444, #dc2626)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', boxShadow: '0 0 28px rgba(239,68,68,0.5)' }}>
                        <PhoneOff size={28} />
                    </motion.button>

                    {mode === 'video' && (
                        <button onClick={toggleVideo} style={{ width: 56, height: 56, borderRadius: '50%', background: isVideoOff ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.10)', border: `1.5px solid ${isVideoOff ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.18)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: isVideoOff ? '#f87171' : 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)' }}>
                            {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
