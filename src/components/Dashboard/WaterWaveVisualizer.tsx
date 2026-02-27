'use client';

import React, { useEffect, useRef } from 'react';

interface Props {
    audioRef: React.RefObject<HTMLAudioElement | null>;
    playing: boolean;
    height?: number;
    accentColor?: string;
}

// ── Star pool (static across renders) ────────────────────────────────────────
interface Star { x: number; y: number; r: number; phase: number; speed: number }
let STARS: Star[] = [];

// ── Water Drop (ripple source) ─────────────────────────────────────────────
interface Drop {
    cx: number;
    amplitude: number;
    k: number;
    omega: number;
    age: number;
    decay: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function avgB(d: Uint8Array<ArrayBuffer>, a: number, b: number) {
    if (b <= a) return 0;
    let s = 0; for (let i = a; i < b; i++) s += d[i]; return s / (b - a);
}
function clamp(v: number) { return Math.max(0, Math.min(1, v)); }

// ── Celestial: crescent moon ──────────────────────────────────────────────────
function drawMoon(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    r: number, energy: number
) {
    ctx.save();
    // halo glow
    const halo = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 2.2);
    halo.addColorStop(0, `rgba(240, 220, 140, ${0.22 + energy * 0.14})`);
    halo.addColorStop(1, 'rgba(240, 220, 140, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2); ctx.fill();

    // moon disc
    ctx.shadowBlur = 24 + energy * 20;
    ctx.shadowColor = `rgba(255, 235, 150, ${0.55 + energy * 0.30})`;
    ctx.fillStyle = '#f0dc8a';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

    // crescent cut
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath(); ctx.arc(cx - r * 0.42, cy - r * 0.08, r * 0.88, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
}

// ── Celestial: glowing sun ────────────────────────────────────────────────────
function drawSun(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    r: number, energy: number, t: number
) {
    ctx.save();
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + t * 0.3;
        const rayLen = r * (1.35 + 0.25 * Math.sin(t * 1.8 + i) + energy * 0.35);
        ctx.strokeStyle = `rgba(255, 210, 80, ${0.18 + energy * 0.18})`;
        ctx.lineWidth = 1.5 + energy * 1.5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * r * 0.9, cy + Math.sin(angle) * r * 0.9);
        ctx.lineTo(cx + Math.cos(angle) * rayLen, cy + Math.sin(angle) * rayLen);
        ctx.stroke();
    }
    const halo = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 2.6);
    halo.addColorStop(0, `rgba(255, 200, 60, ${0.26 + energy * 0.18})`);
    halo.addColorStop(1, 'rgba(255, 200, 60, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(cx, cy, r * 2.6, 0, Math.PI * 2); ctx.fill();

    ctx.shadowBlur = 28 + energy * 22;
    ctx.shadowColor = `rgba(255, 200, 60, ${0.7 + energy * 0.28})`;
    const disc = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, 0, cx, cy, r);
    disc.addColorStop(0, '#fff5c0'); disc.addColorStop(0.6, '#f5c842'); disc.addColorStop(1, '#e09018');
    ctx.fillStyle = disc;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

// ── Draw a serene twilight/dusk scene ────────────────────────────────────────
function drawDusk(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    r: number, energy: number, t: number
) {
    ctx.save();
    // large warm glow at horizon
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 3.5);
    halo.addColorStop(0, `rgba(255, 140, 60, ${0.38 + energy * 0.20})`);
    halo.addColorStop(0.4, `rgba(255, 90, 40, ${0.18 + energy * 0.10})`);
    halo.addColorStop(1, 'rgba(255, 90, 40, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(cx, cy, r * 3.5, 0, Math.PI * 2); ctx.fill();

    ctx.shadowBlur = 32 + energy * 24;
    ctx.shadowColor = `rgba(255, 130, 40, 0.8)`;
    const disc = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    disc.addColorStop(0, '#ffe0a0'); disc.addColorStop(0.7, '#ff8c32'); disc.addColorStop(1, '#cc4400');
    ctx.fillStyle = disc;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

// ── Drop ripple ───────────────────────────────────────────────────────────────
function dropWaveY(drop: Drop, nx: number): number {
    const dx = Math.abs(nx - drop.cx);
    const r = dx * drop.k - drop.omega * drop.age * 0.055;
    const env = Math.exp(-drop.decay * drop.age);
    return (drop.amplitude * Math.sin(r) + drop.amplitude * 0.42 * Math.sin(2.0 * r - 0.9) * Math.exp(-drop.decay * drop.age * 1.5)) * env;
}

// ── Hex to RGB helper ────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    const int = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

export default function WaterWaveVisualizer({ audioRef, playing, height = 200, accentColor = '#FFD580' }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number>(0);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataRef = useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(512) as Uint8Array<ArrayBuffer>);
    const timeRef = useRef(0);
    const connectedRef = useRef(false);
    const synthRef = useRef({ bass: 0, mid: 0, treble: 0 });
    const prevBassRef = useRef(0);
    const dropsRef = useRef<Drop[]>([]);

    useEffect(() => {
        if (STARS.length === 0) {
            STARS = Array.from({ length: 72 }, () => ({
                x: Math.random(), y: Math.random() * 0.44,
                r: 0.3 + Math.random() * 1.3,
                phase: Math.random() * Math.PI * 2,
                speed: 0.3 + Math.random() * 1.2,
            }));
        }
    }, []);

    // ── Connect Web Audio ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!playing || connectedRef.current) return;
        const audio = audioRef.current;
        if (!audio) return;
        try {
            audio.crossOrigin = 'anonymous';
            const saved = audio.src; audio.src = saved; audio.load();
            const actx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const source = actx.createMediaElementSource(audio);
            const an = actx.createAnalyser();
            an.fftSize = 1024; an.smoothingTimeConstant = 0.78;
            source.connect(an); an.connect(actx.destination);
            analyserRef.current = an;
            dataRef.current = new Uint8Array(an.frequencyBinCount) as Uint8Array<ArrayBuffer>;
            connectedRef.current = true;
        } catch { /* CORS or already connected */ }
    }, [playing, audioRef]);

    // ── Render loop ───────────────────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;

        const hour = new Date().getHours();
        const isNight = hour < 6 || hour >= 19;
        const isDusk = !isNight && (hour >= 17 && hour < 19);
        const isMorning = !isNight && !isDusk && hour < 12;

        const tick = () => {
            const W = canvas.width;
            const H = canvas.height;
            const t = (timeRef.current += playing ? 0.028 : 0.004);
            const an = analyserRef.current;
            const d = dataRef.current;

            // ── Energy bands ─────────────────────────────────────────────────
            let bass = 0, mid = 0, treble = 0;
            if (an && playing) {
                an.getByteFrequencyData(d);
                const L = d.length;
                bass = avgB(d, 0, Math.floor(L * 0.04)) / 255;
                mid = avgB(d, Math.floor(L * 0.04), Math.floor(L * 0.30)) / 255;
                treble = avgB(d, Math.floor(L * 0.30), Math.floor(L * 0.75)) / 255;
            } else if (playing) {
                const s = synthRef.current;
                s.bass = clamp(s.bass + (Math.sin(t * 1.5) * 0.5 + 0.5) * 0.09 - 0.034);
                s.mid = clamp(s.mid + (Math.sin(t * 2.3 + 1) * 0.5 + 0.5) * 0.07 - 0.028);
                s.treble = clamp(s.treble + (Math.sin(t * 3.6 + 2) * 0.5 + 0.5) * 0.06 - 0.024);
                bass = s.bass; mid = s.mid; treble = s.treble;
            }
            const energy = bass * 0.55 + mid * 0.32 + treble * 0.13;

            // ── Drop spawn on bass transient ─────────────────────────────────
            const bassRise = bass - prevBassRef.current;
            if (playing && bass > 0.26 && bassRise > 0.065) {
                const n = bassRise > 0.14 ? 2 : 1;
                for (let i = 0; i < n; i++) {
                    dropsRef.current.push({
                        cx: 0.15 + Math.random() * 0.70,
                        amplitude: 0.14 + bass * 0.30 + Math.random() * 0.08,
                        k: 14 + Math.random() * 10, omega: 6 + Math.random() * 4,
                        age: 0, decay: 0.018 + Math.random() * 0.012,
                    });
                }
                if (dropsRef.current.length > 14) dropsRef.current.splice(0, dropsRef.current.length - 14);
            }
            prevBassRef.current = bass;
            dropsRef.current = dropsRef.current.filter(drop => {
                drop.age += 1;
                return Math.exp(-drop.decay * drop.age) > 0.015;
            });

            ctx.clearRect(0, 0, W, H);

            // ═══════════════════════════════════════════════════════
            // PAUSED STATE — beautiful static celestial scene
            // ═══════════════════════════════════════════════════════
            if (!playing) {
                // Sky gradient — matches time of day
                const sky = ctx.createLinearGradient(0, 0, 0, H);
                if (isNight) {
                    sky.addColorStop(0, 'hsl(235, 70%, 5%)');
                    sky.addColorStop(0.45, 'hsl(228, 62%, 10%)');
                    sky.addColorStop(0.75, 'hsl(218, 55%, 14%)');
                    sky.addColorStop(1, 'hsl(208, 48%, 18%)');
                } else if (isDusk) {
                    sky.addColorStop(0, 'hsl(260, 45%, 12%)');
                    sky.addColorStop(0.35, 'hsl(25, 65%, 22%)');
                    sky.addColorStop(0.7, 'hsl(20, 70%, 30%)');
                    sky.addColorStop(1, 'hsl(210, 52%, 18%)');
                } else if (isMorning) {
                    sky.addColorStop(0, 'hsl(215, 60%, 10%)');
                    sky.addColorStop(0.4, 'hsl(200, 55%, 18%)');
                    sky.addColorStop(0.75, 'hsl(35, 60%, 28%)');
                    sky.addColorStop(1, 'hsl(210, 50%, 20%)');
                } else {
                    // Afternoon
                    sky.addColorStop(0, 'hsl(212, 62%, 12%)');
                    sky.addColorStop(0.5, 'hsl(205, 56%, 16%)');
                    sky.addColorStop(1, 'hsl(198, 52%, 22%)');
                }
                ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

                // Stars (night/dusk)
                if (isNight || isDusk) {
                    STARS.forEach(s => {
                        const tw = 0.5 + 0.5 * Math.sin(t * s.speed * 0.5 + s.phase);
                        ctx.beginPath();
                        ctx.arc(s.x * W, s.y * H * 0.86, s.r * (0.7 + tw * 0.3), 0, Math.PI * 2);
                        ctx.fillStyle = `rgba(255,255,255,${0.20 + tw * 0.55})`;
                        ctx.fill();
                    });
                }

                // Celestial body
                const celR = W * 0.065;
                const celCX = W * 0.72;
                const celCY = H * 0.22 + Math.sin(t * 0.12) * H * 0.008; // very gentle float

                if (isNight) {
                    drawMoon(ctx, celCX, celCY, celR, 0.15 + Math.sin(t * 0.4) * 0.05);
                } else if (isDusk) {
                    drawDusk(ctx, celCX, H * 0.72, celR * 0.9, 0.2, t);
                } else {
                    drawSun(ctx, W * 0.65, H * 0.22, celR * 0.75, 0.12 + Math.sin(t * 0.5) * 0.05, t);
                }

                // Raag label
                ctx.save();
                ctx.font = `bold ${W * 0.028}px 'Outfit', sans-serif`;
                ctx.fillStyle = `rgba(255,245,210,0.48)`;
                ctx.textAlign = 'left'; ctx.textBaseline = 'top';
                ctx.fillText(isNight ? 'रात्रि राग' : isDusk ? 'संध्या राग' : 'प्रातः राग', W * 0.048, H * 0.072);
                ctx.restore();

                // Still ocean — very faint with gentle swell
                const stillSky = H * 0.60;
                const ocean = ctx.createLinearGradient(0, stillSky, 0, H);
                ocean.addColorStop(0, isNight ? 'hsl(203, 65%, 10%)' : 'hsl(200, 58%, 14%)');
                ocean.addColorStop(1, isNight ? 'hsl(215, 55%, 5%)' : 'hsl(212, 50%, 8%)');
                ctx.fillStyle = ocean; ctx.fillRect(0, stillSky, W, H);

                // Reflection of celestial on still water
                const refG = ctx.createLinearGradient(0, stillSky, 0, H);
                refG.addColorStop(0, isNight ? 'rgba(240,215,100,0.13)' : 'rgba(255,200,60,0.10)');
                refG.addColorStop(1, 'transparent');
                ctx.fillStyle = refG; ctx.fillRect(W * 0.55, stillSky, W * 0.4, H);

                // Horizon separator — very soft glowing line
                ctx.beginPath();
                for (let px = 0; px <= W; px += 2) {
                    const gentle = Math.sin(px / W * Math.PI * 6 - t * 0.5) * H * 0.005;
                    px === 0 ? ctx.moveTo(0, stillSky + gentle) : ctx.lineTo(px, stillSky + gentle);
                }
                const hg = ctx.createLinearGradient(0, 0, W, 0);
                hg.addColorStop(0, 'transparent');
                hg.addColorStop(0.3, isNight ? 'rgba(200,165,60,0.38)' : 'rgba(255,210,80,0.30)');
                hg.addColorStop(0.5, isNight ? 'rgba(255,240,180,0.55)' : 'rgba(255,240,160,0.45)');
                hg.addColorStop(0.7, isNight ? 'rgba(200,165,60,0.38)' : 'rgba(255,210,80,0.30)');
                hg.addColorStop(1, 'transparent');
                ctx.strokeStyle = hg; ctx.lineWidth = 1.2;
                ctx.shadowBlur = 8; ctx.shadowColor = isNight ? 'rgba(255,230,100,0.4)' : 'rgba(255,220,80,0.3)';
                ctx.stroke(); ctx.shadowBlur = 0;

                rafRef.current = requestAnimationFrame(tick);
                return;
            }

            // ═══════════════════════════════════════════════════════
            // PLAYING STATE — full animated water wave scene
            // ═══════════════════════════════════════════════════════
            const skyH = H * 0.54;
            const sky2 = ctx.createLinearGradient(0, 0, 0, skyH);
            if (isNight) {
                sky2.addColorStop(0, `hsl(235, 65%, ${4 + bass * 4}%)`);
                sky2.addColorStop(0.55, `hsl(225, 58%, ${8 + mid * 5}%)`);
                sky2.addColorStop(1, `hsl(215, 52%, ${12 + treble * 4}%)`);
            } else {
                sky2.addColorStop(0, `hsl(200, 55%, ${14 + bass * 6}%)`);
                sky2.addColorStop(0.55, `hsl(215, 50%, ${10 + mid * 4}%)`);
                sky2.addColorStop(1, `hsl(230, 45%, ${14 + treble * 3}%)`);
            }
            ctx.fillStyle = sky2; ctx.fillRect(0, 0, W, skyH);

            // Stars (night)
            if (isNight) {
                STARS.forEach(s => {
                    const tw = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
                    const al = (0.28 + tw * 0.62) * (1 + energy * 0.45);
                    ctx.beginPath();
                    ctx.arc(s.x * W, s.y * H, s.r * (0.8 + tw * 0.4 + bass * 0.55), 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255,255,255,${Math.min(1, al)})`; ctx.fill();
                });
            }

            // Celestial body
            const celR = W * 0.061 + energy * W * 0.012;
            const celCX = W * 0.72;
            const celCY = H * 0.18 + Math.sin(t * 0.18) * H * 0.015;
            if (isNight) {
                drawMoon(ctx, celCX, celCY, celR, energy);
            } else if (isDusk) {
                drawDusk(ctx, celCX, celCY + H * 0.2, celR * 0.85, energy, t);
            } else {
                drawSun(ctx, celCX, celCY, celR * 0.8, energy, t);
            }

            // Raag label
            ctx.save();
            ctx.font = `bold ${W * 0.027}px 'Outfit', sans-serif`;
            ctx.fillStyle = `rgba(255,245,210,${0.45 + energy * 0.18})`;
            ctx.textAlign = 'left'; ctx.textBaseline = 'top';
            ctx.fillText(isNight ? 'रात्रि राग' : isDusk ? 'संध्या राग' : 'प्रातः राग', W * 0.048, H * 0.052);
            ctx.restore();

            // Ocean body
            const ocean2 = ctx.createLinearGradient(0, H * 0.46, 0, H);
            ocean2.addColorStop(0, `hsl(203, 72%, ${14 + bass * 14}%)`);
            ocean2.addColorStop(0.4, `hsl(208, 65%, ${9 + mid * 9}%)`);
            ocean2.addColorStop(1, `hsl(213, 58%, ${4 + treble * 5}%)`);
            ctx.fillStyle = ocean2; ctx.fillRect(0, H * 0.46, W, H);

            // Wave Y computation
            const ambientWave = (nx: number, layer: number): number => {
                const ph = layer * 1.38;
                const w1 = Math.sin(nx * Math.PI * (4 + bass * 7) - t * 2.1 + ph) * (0.14 + bass * 0.32);
                const w2 = Math.sin(nx * Math.PI * (9 + mid * 11) - t * 3.6 + ph + 1.2) * (0.06 + mid * 0.17);
                const w3 = Math.sin(nx * Math.PI * (18 + treble * 15) - t * 6.2 + ph + 2.5) * (0.02 + treble * 0.09);
                const w4 = Math.sin(nx * Math.PI * (30 + treble * 20) - t * 9.0 + ph + 3.8) * (0.01 + treble * 0.05);
                const w5 = Math.sin(nx * Math.PI * 2.0 - t * 0.8 + ph) * (0.035 + bass * 0.04);
                const fi = Math.floor(nx * (dataRef.current.length - 1));
                const fft = playing ? (dataRef.current[fi] / 255) * 0.24 : 0;
                return w1 + w2 + w3 + w4 + w5 + fft;
            };
            const totalWaveY = (nx: number, layer: number): number => {
                let y = ambientWave(nx, layer);
                for (const drop of dropsRef.current) y += dropWaveY(drop, nx) * 0.32;
                return y;
            };

            // Wave layers — fused with accent color
            const [ar, ag, ab] = hexToRgb(accentColor);
            [
                { y: 0.62, a: 0.52 },
                { y: 0.56, a: 0.42 },
                { y: 0.51, a: 0.33 },
                { y: 0.47, a: 0.22 },
                { y: 0.44, a: 0.13 },
            ].forEach(({ y, a }, li) => {
                const baseY = H * y;
                // Blend ocean blue with accent color
                const mixR = Math.round(5 + ar * 0.32 + li * 8);
                const mixG = Math.round(62 + ag * 0.28 + li * 12);
                const mixB = Math.round(148 + ab * 0.12 + li * 14);
                ctx.beginPath(); ctx.moveTo(0, H);
                for (let px = 0; px <= W; px += 1) {
                    ctx.lineTo(px, baseY + totalWaveY(px / W, li * 1.5) * H * 0.25);
                }
                ctx.lineTo(W, H); ctx.closePath();
                ctx.fillStyle = `rgba(${mixR},${mixG},${mixB},${a})`; ctx.fill();
            });

            // Leela-style glowing particle streams from wave peaks
            if (playing) {
                for (let p = 0; p < 24; p++) {
                    const nx = (p * 0.618) % 1;
                    const waveTopY = H * 0.44 + totalWaveY(nx, 0) * H * 0.25;
                    const particleY = waveTopY - (Math.sin(t * 0.8 + p * 1.3) * 0.5 + 0.5) * H * 0.12 * (0.4 + energy);
                    const pr = 1.2 + energy * 3.5 + Math.sin(t * 2 + p) * 0.8;
                    const pa = (0.35 + energy * 0.45) * Math.max(0, Math.sin(t * 0.5 + p * 0.7));
                    const pg = ctx.createRadialGradient(nx * W, particleY, 0, nx * W, particleY, pr * 2.5);
                    pg.addColorStop(0, `rgba(${ar},${ag},${ab},${pa})`);
                    pg.addColorStop(0.5, `rgba(${Math.min(255, ar + 40)},${Math.min(255, ag + 40)},${Math.min(255, ab + 60)},${pa * 0.4})`);
                    pg.addColorStop(1, 'transparent');
                    ctx.fillStyle = pg;
                    ctx.beginPath(); ctx.arc(nx * W, particleY, pr * 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Horizon crest
            ctx.beginPath();
            const crY = H * 0.44;
            for (let px = 0; px <= W; px += 1) {
                const yw = crY + totalWaveY(px / W, 0) * H * 0.25;
                px === 0 ? ctx.moveTo(px, yw) : ctx.lineTo(px, yw);
            }
            const cg = ctx.createLinearGradient(0, 0, W, 0);
            cg.addColorStop(0, `rgba(210,168,52,${0.22 + mid * 0.32})`);
            cg.addColorStop(0.20, `rgba(255,245,178,${0.82 + bass * 0.18})`);
            cg.addColorStop(0.42, `rgba(255,255,255,${0.96 + energy * 0.04})`);
            cg.addColorStop(0.58, `rgba(255,255,255,${0.96 + energy * 0.04})`);
            cg.addColorStop(0.80, `rgba(255,245,178,${0.82 + mid * 0.15})`);
            cg.addColorStop(1, `rgba(210,168,52,${0.22 + treble * 0.26})`);
            ctx.strokeStyle = cg; ctx.lineWidth = 1.6 + bass * 2.8;
            ctx.shadowBlur = 13 + bass * 26; ctx.shadowColor = `rgba(255,228,95,${0.55 + energy * 0.40})`;
            ctx.stroke(); ctx.shadowBlur = 0;

            // Drop ripple rings
            for (const drop of dropsRef.current) {
                const env = Math.exp(-drop.decay * drop.age);
                if (env < 0.04) continue;
                const bx = drop.cx * W;
                const by = H * 0.455 + totalWaveY(drop.cx, 0) * H * 0.25;
                const primR = drop.age * 2.6 + drop.k * 0.5;
                ctx.beginPath();
                ctx.ellipse(bx, by, primR, primR * 0.32, 0, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(160,225,255,${env * 0.72})`;
                ctx.lineWidth = 1.2 + drop.amplitude * 2.0;
                ctx.shadowBlur = 6 + drop.amplitude * 12;
                ctx.shadowColor = `rgba(140,210,255,${env * 0.55})`;
                ctx.stroke();
                const secR = primR * 0.52;
                if (secR > 3) {
                    ctx.beginPath();
                    ctx.ellipse(bx, by, secR, secR * 0.32, 0, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(200,240,255,${env * 0.42})`;
                    ctx.lineWidth = 0.8 + drop.amplitude * 1.2;
                    ctx.shadowBlur = 4 + drop.amplitude * 6;
                    ctx.stroke();
                }
                ctx.shadowBlur = 0;
            }

            // Caustic shimmer
            for (let i = 0; i < 16; i++) {
                const cx2 = W * ((i + 0.5 + Math.sin(t * 0.4 + i * 0.9) * 0.12) / 16);
                const cy2 = H * (0.70 + Math.cos(t * 0.35 + i * 1.4) * 0.12);
                const cr = 4 + bass * 11 + Math.sin(t * 1.4 + i) * 2;
                const og = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, cr);
                og.addColorStop(0, `rgba(140,212,255,${0.06 + mid * 0.06})`);
                og.addColorStop(1, 'transparent');
                ctx.fillStyle = og;
                ctx.beginPath();
                ctx.ellipse(cx2, cy2, cr * 1.8, cr * 0.62, Math.sin(t * 0.3 + i) * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }

            // Depth fog
            const fog = ctx.createLinearGradient(0, H * 0.62, 0, H);
            fog.addColorStop(0, 'rgba(2,10,30,0)'); fog.addColorStop(1, 'rgba(1,7,22,0.50)');
            ctx.fillStyle = fog; ctx.fillRect(0, H * 0.62, W, H);

            // Micro bubbles
            for (let p = 0; p < 22; p++) {
                const bx = W * ((p * 0.618 + Math.sin(t * 0.25 + p)) % 1);
                const by2 = H * (0.47 + Math.sin(t * (0.22 + p * 0.025) + p * 1.9) * 0.22);
                const br = 0.5 + Math.sin(t + p) * 0.36 + mid * 0.9;
                ctx.beginPath(); ctx.arc(bx, by2, Math.max(0.1, br), 0, Math.PI * 2);
                ctx.fillStyle = `rgba(210,240,255,${0.16 + treble * 0.28})`; ctx.fill();
            }

            rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [playing]);

    return (
        <canvas
            ref={canvasRef}
            width={720}
            height={height * 2}
            style={{ width: '100%', height: `${height}px`, display: 'block' }}
        />
    );
}
