'use client';

import React, { useEffect, useRef } from 'react';

interface Props {
    audioRef: React.RefObject<HTMLAudioElement | null>;
    playing: boolean;
    height?: number;
    accentColor?: string;
}

interface Star { x: number; y: number; r: number; phase: number; speed: number; }
interface Drop { cx: number; amp: number; k: number; omega: number; age: number; decay: number; }

let STARS: Star[] = [];
let SHARED_ACTX: AudioContext | null = null;
const CONNECTED = new WeakSet<HTMLAudioElement>();
const ANALYSER_MAP = new WeakMap<HTMLAudioElement, AnalyserNode>();

function avg(d: Uint8Array<ArrayBuffer>, a: number, b: number) {
    if (b <= a) return 0;
    let s = 0; for (let i = a; i < b; i++) s += d[i]; return s / (b - a);
}
function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function getLunarAge(): number {
    const newMoon = new Date('2000-01-06T18:14:00Z').getTime();
    const lunation = 29.53058867 * 86400000;
    const age = ((Date.now() - newMoon) % lunation + lunation) % lunation;
    return (age / lunation) * 29.53;
}

/* ─── Photorealistic 3D Sun ──────────────────────────────────────────────── */
function drawSun3D(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, energy: number, t: number, hf: number) {
    ctx.save();

    /* Colors vary by time of day */
    let innerC: [number, number, number] = [255, 252, 228];
    let midC: [number, number, number] = [255, 210, 60];
    let outerC: [number, number, number] = [255, 150, 20];
    let coronaA = 0.30;

    if (hf < 7) { // sunrise — orange-red
        innerC = [255, 220, 130]; midC = [255, 110, 30]; outerC = [200, 45, 0]; coronaA = 0.45;
    } else if (hf < 9) { // early morning — warm gold
        innerC = [255, 240, 170]; midC = [255, 170, 40]; outerC = [220, 100, 5]; coronaA = 0.38;
    } else if (hf >= 11 && hf < 15) { // noon — white-gold
        innerC = [255, 254, 242]; midC = [255, 230, 80]; outerC = [240, 180, 10]; coronaA = 0.22;
    } else if (hf >= 16) { // late afternoon / sunset
        innerC = [255, 230, 140]; midC = [255, 120, 30]; outerC = [200, 48, 0]; coronaA = 0.46;
    }

    /* 1. Wide diffuse atmospheric halo */
    const halo = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 4.0);
    halo.addColorStop(0, `rgba(${outerC[0]},${outerC[1]},${outerC[2]},${coronaA + energy * 0.15})`);
    halo.addColorStop(0.35, `rgba(${outerC[0]},${outerC[1]},${outerC[2]},${coronaA * 0.35})`);
    halo.addColorStop(1, `rgba(${outerC[0]},${outerC[1]},${outerC[2]},0)`);
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(cx, cy, r * 4.0, 0, Math.PI * 2); ctx.fill();

    /* 2. Solar rays */
    const rayCount = 14;
    for (let i = 0; i < rayCount; i++) {
        const angle = (i / rayCount) * Math.PI * 2 + t * 0.18;
        const rayLen = r * (1.5 + 0.3 * Math.sin(t * 1.4 + i * 1.3) + energy * 0.6);
        const alpha = (0.12 + energy * 0.20) * (0.55 + 0.45 * Math.sin(t * 0.6 + i));
        ctx.strokeStyle = `rgba(${midC[0]},${midC[1]},${midC[2]},${alpha})`;
        ctx.lineWidth = 1.0 + energy * 1.8;
        ctx.shadowBlur = 10 + energy * 14; ctx.shadowColor = `rgba(${outerC[0]},${outerC[1]},${outerC[2]},0.5)`;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * r * 0.94, cy + Math.sin(angle) * r * 0.94);
        ctx.lineTo(cx + Math.cos(angle) * rayLen, cy + Math.sin(angle) * rayLen);
        ctx.stroke();
    }
    ctx.shadowBlur = 0;

    /* 3. Corona ring (chromosphere) */
    const corona = ctx.createRadialGradient(cx, cy, r * 0.90, cx, cy, r * 1.45);
    corona.addColorStop(0, `rgba(${outerC[0]},${outerC[1]},${outerC[2]},${0.55 + energy * 0.25})`);
    corona.addColorStop(0.5, `rgba(${outerC[0]},${outerC[1]},${outerC[2]},${0.20 + energy * 0.12})`);
    corona.addColorStop(1, `rgba(${outerC[0]},${outerC[1]},${outerC[2]},0)`);
    ctx.fillStyle = corona;
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.45, 0, Math.PI * 2); ctx.fill();

    /* 4. Sun disc with sphere shading (limb darkening) */
    ctx.shadowBlur = 36 + energy * 30;
    ctx.shadowColor = `rgba(${outerC[0]},${outerC[1]},${outerC[2]},0.80)`;
    const disc = ctx.createRadialGradient(cx - r * 0.28, cy - r * 0.28, 0, cx, cy, r);
    disc.addColorStop(0.0, `rgb(${innerC[0]},${innerC[1]},${innerC[2]})`);
    disc.addColorStop(0.40, `rgb(${midC[0]},${midC[1]},${midC[2]})`);
    disc.addColorStop(0.80, `rgb(${outerC[0]},${outerC[1]},${outerC[2]})`);
    disc.addColorStop(1.0, `rgb(${Math.max(0, outerC[0] - 50)},${Math.max(0, outerC[1] - 50)},${Math.max(0, outerC[2] - 20)})`);
    ctx.fillStyle = disc;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    /* 5. Subtle specular glint on disc surface */
    const glint = ctx.createRadialGradient(cx - r * 0.38, cy - r * 0.34, 0, cx - r * 0.38, cy - r * 0.34, r * 0.42);
    glint.addColorStop(0, `rgba(255,255,255,${0.22 + energy * 0.08})`);
    glint.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glint;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
}

/* ─── Photorealistic 3D Moon (from previous — keeping it) ────────────────── */
function drawMoon3D(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, energy: number, lunarAge: number) {
    ctx.save();
    const halo = ctx.createRadialGradient(cx, cy, r * 0.65, cx, cy, r * 3.2);
    halo.addColorStop(0, `rgba(220,205,150,${0.14 + energy * 0.10})`);
    halo.addColorStop(0.4, `rgba(200,186,130,${0.07 + energy * 0.05})`);
    halo.addColorStop(1, 'rgba(180,165,110,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(cx, cy, r * 3.2, 0, Math.PI * 2); ctx.fill();

    ctx.beginPath(); ctx.arc(cx, cy, r + 0.5, 0, Math.PI * 2); ctx.clip();

    // Dark side — visible, dark grey-blue
    ctx.fillStyle = 'rgb(14,16,24)';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

    const phase = lunarAge / 29.53;
    ctx.save();
    if (phase < 0.5) {
        const waxX = r * Math.cos(Math.PI * (1 - 2 * phase));
        ctx.beginPath();
        ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2);
        const ex = Math.abs(waxX);
        ctx.ellipse(cx, cy, ex < 1 ? 1 : ex, r, 0, Math.PI / 2, -Math.PI / 2, true);
        ctx.closePath(); ctx.clip();
    } else {
        const wanX = r * Math.cos(Math.PI * (2 * phase - 1));
        ctx.beginPath();
        ctx.arc(cx, cy, r, Math.PI / 2, -Math.PI / 2);
        const ex = Math.abs(wanX);
        ctx.ellipse(cx, cy, ex < 1 ? 1 : ex, r, 0, -Math.PI / 2, Math.PI / 2, true);
        ctx.closePath(); ctx.clip();
    }

    const litGrad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.30, 0, cx, cy, r);
    litGrad.addColorStop(0.0, '#f9f0c8'); litGrad.addColorStop(0.30, '#e8dba0');
    litGrad.addColorStop(0.65, '#c8be80'); litGrad.addColorStop(0.88, '#9e9060');
    litGrad.addColorStop(1.0, '#605830');
    ctx.fillStyle = litGrad;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

    const maria = [
        { rx: -0.18, ry: -0.12, rw: 0.28, rh: 0.22 }, { rx: 0.08, ry: -0.05, rw: 0.18, rh: 0.15 },
        { rx: -0.05, ry: 0.18, rw: 0.22, rh: 0.16 }, { rx: 0.20, ry: 0.10, rw: 0.14, rh: 0.12 },
    ];
    ctx.globalAlpha = 0.20;
    for (const m of maria) {
        const mg = ctx.createRadialGradient(cx + m.rx * r, cy + m.ry * r, 0, cx + m.rx * r, cy + m.ry * r, m.rw * r);
        mg.addColorStop(0, 'rgba(60,52,28,0.85)'); mg.addColorStop(1, 'rgba(60,52,28,0)');
        ctx.fillStyle = mg;
        ctx.beginPath(); ctx.ellipse(cx + m.rx * r, cy + m.ry * r, m.rw * r, m.rh * r, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    const spec = ctx.createRadialGradient(cx - r * 0.55, cy - r * 0.45, 0, cx - r * 0.55, cy - r * 0.45, r * 0.45);
    spec.addColorStop(0, `rgba(255,252,230,${0.18 + energy * 0.10})`); spec.addColorStop(1, 'rgba(255,252,230,0)');
    ctx.fillStyle = spec; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    const rimGrad = ctx.createRadialGradient(cx, cy, r * 0.82, cx, cy, r);
    rimGrad.addColorStop(0, 'rgba(100,95,70,0)');
    rimGrad.addColorStop(0.7, `rgba(80,76,55,${0.08 + energy * 0.04})`);
    rimGrad.addColorStop(1, `rgba(60,58,42,${0.14 + energy * 0.05})`);
    ctx.fillStyle = rimGrad; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function dropY(drop: Drop, nx: number): number {
    const dx = Math.abs(nx - drop.cx);
    const r = dx * drop.k - drop.omega * drop.age * 0.05;
    const env = Math.exp(-drop.decay * drop.age);
    return (drop.amp * Math.sin(r) + drop.amp * 0.45 * Math.sin(2.2 * r - 1.1) * Math.exp(-drop.decay * drop.age * 1.6)) * env;
}

/* ─────────────────────────────────────────────────────────────────────────── */
export default function WaterWaveVisualizer({ audioRef, playing, height = 600, accentColor = '#FFD580' }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number>(0);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataRef = useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(1024) as Uint8Array<ArrayBuffer>);
    const timeRef = useRef(0);
    const dropsRef = useRef<Drop[]>([]);
    const prevBassRef = useRef(0);
    const synthRef = useRef({ bass: 0, mid: 0, treble: 0 });

    /* ── Stars ───────────────────────────────────────────────────────────── */
    useEffect(() => {
        if (STARS.length === 0) {
            STARS = Array.from({ length: 100 }, () => ({
                x: Math.random(), y: Math.random() * 0.52,
                r: 0.5 + Math.random() * 1.6,
                phase: Math.random() * Math.PI * 2,
                speed: 0.15 + Math.random() * 0.7,
            }));
        }
    }, []);

    /* ── Audio ───────────────────────────────────────────────────────────── */
    useEffect(() => {
        if (!audioRef.current) return;
        const audio = audioRef.current;
        if (CONNECTED.has(audio)) {
            const cached = ANALYSER_MAP.get(audio);
            if (cached) analyserRef.current = cached;
            dataRef.current = new Uint8Array(analyserRef.current!.frequencyBinCount) as Uint8Array<ArrayBuffer>;
            return;
        }
        try {
            if (!audio.crossOrigin) audio.crossOrigin = 'anonymous';
            if (!SHARED_ACTX) {
                SHARED_ACTX = new (window.AudioContext || (window as any).webkitAudioContext)();
                (window as any).__sharedActx = SHARED_ACTX;
            }
            const source = SHARED_ACTX.createMediaElementSource(audio);
            const an = SHARED_ACTX.createAnalyser();
            an.fftSize = 2048; an.smoothingTimeConstant = 0.92;
            source.connect(an); an.connect(SHARED_ACTX.destination);
            analyserRef.current = an;
            dataRef.current = new Uint8Array(an.frequencyBinCount) as Uint8Array<ArrayBuffer>;
            CONNECTED.add(audio); ANALYSER_MAP.set(audio, an);
        } catch (e) { console.warn('[WaterWave]', e); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (playing && SHARED_ACTX?.state === 'suspended') SHARED_ACTX.resume().catch(() => { });
    }, [playing]);

    /* ── Render loop ─────────────────────────────────────────────────────── */
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;

        const hour = new Date().getHours();
        const min = new Date().getMinutes();
        const hourF = hour + min / 60;
        const isNight = hourF < 5.5 || hourF >= 19.5;
        const isDawn = hourF >= 5.5 && hourF < 7.5;
        const isMorning = hourF >= 7.5 && hourF < 12;
        const isNoon = hourF >= 12 && hourF < 15;
        const isAfternoon = hourF >= 15 && hourF < 17.5;
        const isDusk = hourF >= 17.5 && hourF < 19.5;

        const sunNormX = isNight ? -1 : clamp01((hourF - 5.5) / 14);
        const sunArcY = isNight ? -1 : 0.72 - 0.50 * Math.sin(sunNormX * Math.PI);
        const lunarAge = getLunarAge();

        const tick = () => {
            const W = canvas.width;
            const H = canvas.height;
            const t = (timeRef.current += playing ? 0.018 : 0.003);
            const an = analyserRef.current;
            const d = dataRef.current;

            /* Audio */
            let bass = 0, mid = 0, treble = 0;
            if (an && playing) {
                an.getByteFrequencyData(d);
                const L = d.length;
                bass = avg(d, 0, Math.floor(L * 0.04)) / 255;
                mid = avg(d, Math.floor(L * 0.04), Math.floor(L * 0.22)) / 255;
                treble = avg(d, Math.floor(L * 0.22), Math.floor(L * 0.55)) / 255;
            } else if (playing) {
                const s = synthRef.current;
                s.bass = clamp01(s.bass + (Math.sin(t * 1.4) * 0.5 + 0.5) * 0.07 - 0.025);
                s.mid = clamp01(s.mid + (Math.sin(t * 2.1 + 1.2) * 0.5 + 0.5) * 0.06 - 0.022);
                s.treble = clamp01(s.treble + (Math.sin(t * 3.5 + 2.4) * 0.5 + 0.5) * 0.05 - 0.018);
                bass = s.bass; mid = s.mid; treble = s.treble;
            }
            const energy = bass * 0.55 + mid * 0.30 + treble * 0.15;

            /* Drops on bass transient */
            const bassRise = bass - prevBassRef.current;
            if (playing && bass > 0.22 && bassRise > 0.055) {
                for (let i = 0; i < (bassRise > 0.12 ? 2 : 1); i++) {
                    dropsRef.current.push({
                        cx: 0.1 + Math.random() * 0.80,
                        amp: 0.08 + bass * 0.28 + Math.random() * 0.08,
                        k: 14 + Math.random() * 12, omega: 5 + Math.random() * 5,
                        age: 0, decay: 0.012 + Math.random() * 0.012,
                    });
                    if (dropsRef.current.length > 14) dropsRef.current.shift();
                }
            }
            prevBassRef.current = bass;
            dropsRef.current = dropsRef.current.filter(dp => { dp.age++; return Math.exp(-dp.decay * dp.age) > 0.01; });

            ctx.clearRect(0, 0, W, H);

            /* ═══ SKY ═════════════════════════════════════════════════════ */
            // Horizon line: where the glow crest sits
            const horizonY = H * 0.50;
            const skyH = horizonY;
            const skyGrad = ctx.createLinearGradient(0, 0, 0, skyH);

            if (isNight) {
                skyGrad.addColorStop(0, `hsl(234,72%,${4 + bass * 2}%)`);
                skyGrad.addColorStop(0.5, `hsl(228,62%,${9 + mid * 3}%)`);
                skyGrad.addColorStop(1, `hsl(218,55%,${15 + bass * 3}%)`);
            } else if (isDawn) {
                skyGrad.addColorStop(0, `hsl(250,56%,${12 + bass * 5}%)`);
                skyGrad.addColorStop(0.35, `hsl(280,50%,${18 + mid * 5}%)`);
                skyGrad.addColorStop(0.65, `hsl(20,65%,${30 + treble * 6}%)`);
                skyGrad.addColorStop(1, `hsl(38,68%,${44 + mid * 4}%)`);
            } else if (isMorning) {
                skyGrad.addColorStop(0, `hsl(212,64%,${18 + bass * 6}%)`);
                skyGrad.addColorStop(0.55, `hsl(205,54%,${26 + mid * 5}%)`);
                skyGrad.addColorStop(1, `hsl(200,48%,${33 + treble * 4}%)`);
            } else if (isNoon) {
                skyGrad.addColorStop(0, `hsl(206,66%,${22 + bass * 7}%)`);
                skyGrad.addColorStop(0.55, `hsl(200,60%,${30 + mid * 5}%)`);
                skyGrad.addColorStop(1, `hsl(195,54%,${36 + treble * 3}%)`);
            } else if (isAfternoon) {
                skyGrad.addColorStop(0, `hsl(212,58%,${20 + bass * 6}%)`);
                skyGrad.addColorStop(0.45, `hsl(28,50%,${28 + mid * 5}%)`);
                skyGrad.addColorStop(1, `hsl(42,54%,${40 + bass * 4}%)`);
            } else if (isDusk) {
                skyGrad.addColorStop(0, `hsl(262,46%,${10 + bass * 4}%)`);
                skyGrad.addColorStop(0.35, `hsl(300,42%,${16 + mid * 5}%)`);
                skyGrad.addColorStop(0.62, `hsl(20,70%,${28 + treble * 7}%)`);
                skyGrad.addColorStop(1, `hsl(44,66%,${42 + mid * 5}%)`);
            } else {
                skyGrad.addColorStop(0, `hsl(236,64%,${5 + bass * 3}%)`);
                skyGrad.addColorStop(1, `hsl(222,54%,${12 + mid * 3}%)`);
            }
            ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, W, skyH);

            /* ── Stars: simple warm golden dots (night + dawn/dusk) ───── */
            const starVis = isNight ? 1 : isDawn ? 0.42 : isDusk ? 0.32 : 0;
            if (starVis > 0) {
                STARS.forEach(s => {
                    const tw = 0.45 + 0.55 * Math.sin(t * s.speed * 0.6 + s.phase);
                    const a = starVis * (0.28 + tw * 0.68);
                    ctx.shadowBlur = s.r > 1.2 ? 3 : 0;
                    ctx.shadowColor = `rgba(255, 220, 140, ${a * 0.6})`;
                    ctx.beginPath();
                    ctx.arc(s.x * W, s.y * skyH * 0.94, s.r * (0.72 + tw * 0.38), 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 222, 148, ${Math.min(1, a)})`;
                    ctx.fill();
                });
                ctx.shadowBlur = 0;
            }

            /* ── 3D Sun (daytime) ───────────────────────────────────────── */
            if (!isNight && sunArcY >= 0) {
                const srSize = W * (isDawn || isDusk ? 0.082 : isNoon ? 0.054 : 0.066);
                const srX = W * lerp(0.06, 0.94, sunNormX);
                const srY = skyH * sunArcY;
                // Atmospheric horizon glow at sunrise/set
                if (isDawn || isDusk || hourF < 8 || hourF > 16.5) {
                    const hGlow = ctx.createRadialGradient(srX, skyH, 0, srX, skyH, W * 0.55);
                    const hA = isDawn || isDusk ? 0.35 : 0.18;
                    hGlow.addColorStop(0, `rgba(255,110,35,${hA + energy * 0.15})`);
                    hGlow.addColorStop(0.45, `rgba(255,75,18,${hA * 0.38})`);
                    hGlow.addColorStop(1, 'rgba(200,38,0,0)');
                    ctx.fillStyle = hGlow;
                    ctx.beginPath(); ctx.arc(srX, skyH, W * 0.55, 0, Math.PI * 2); ctx.fill();
                }
                drawSun3D(ctx, srX, srY, srSize * (1 + energy * 0.10), energy, t, hourF);
            }

            /* ── 3D Moon ────────────────────────────────────────────────── */
            if (isNight || isDusk || isDawn) {
                const vis = isNight ? 1 : 0.58;
                const phase = lunarAge / 29.53;
                if (phase > 0.03 && phase < 0.97) {
                    const mR = W * 0.058 * (1 + energy * 0.06) * vis;
                    const mX = W * (isNight ? 0.5 + 0.28 * Math.sin(hourF * 0.4 - 1.0) : 0.74);
                    const mY = skyH * (isNight ? 0.20 + 0.10 * Math.cos(hourF * 0.5) : 0.28);
                    ctx.globalAlpha = vis;
                    drawMoon3D(ctx, mX, mY, mR, energy, lunarAge);
                    ctx.globalAlpha = 1;
                }
            }

            /* ═══ WATER ════════════════════════════════════════════════════
               Reference image style:
               - Deep calm ocean fill
               - ONE luminous glowing horizon crest (audio-reactive vibration)
               - Subtle elliptical caustic patches below (soft light on water)
            ═══════════════════════════════════════════════════════════════ */
            const waterTop = skyH;

            /* Water base fill — deep calm ocean */
            const oceanGrad = ctx.createLinearGradient(0, waterTop, 0, H);
            if (isNight || isDusk || isDawn) {
                // Deep midnight navy — exactly like the reference
                oceanGrad.addColorStop(0, `hsl(218,68%,${13 + bass * 10}%)`);
                oceanGrad.addColorStop(0.30, `hsl(222,62%,${9 + mid * 6}%)`);
                oceanGrad.addColorStop(0.65, `hsl(226,58%,${6 + treble * 4}%)`);
                oceanGrad.addColorStop(1, `hsl(232,55%,${3 + energy * 2}%)`);
            } else if (isMorning || isNoon) {
                oceanGrad.addColorStop(0, `hsl(200,72%,${20 + bass * 14}%)`);
                oceanGrad.addColorStop(0.40, `hsl(210,65%,${12 + mid * 8}%)`);
                oceanGrad.addColorStop(1, `hsl(220,58%,${4 + energy * 4}%)`);
            } else {
                oceanGrad.addColorStop(0, `hsl(210,65%,${16 + bass * 12}%)`);
                oceanGrad.addColorStop(0.40, `hsl(218,60%,${10 + mid * 7}%)`);
                oceanGrad.addColorStop(1, `hsl(225,55%,${4 + energy * 3}%)`);
            }
            ctx.fillStyle = oceanGrad; ctx.fillRect(0, waterTop, W, H - waterTop);

            /* ── The ONE luminous horizon crest — audio-reactive ────────── */
            // This is the KEY element — single glowing wave crest that vibrates with mantra mathematically
            const crestBaseY = waterTop;

            // Build the crest path — Mathematically synced harmonic wave (Fourier Series)
            const crestPath: number[] = [];
            for (let px = 0; px <= W; px += 2) {
                const nx = px / W;
                let y = crestBaseY;

                // Edge dampening window function (1.0 at center, 0.0 at edges)
                // This ensures the wave looks bounded, like a physical string or contained fluid
                const edgeDamp = 1.0 - Math.pow(Math.abs(nx - 0.5) * 2, 2.5);

                let harmonicSum = 0;
                // 1. Fundamental Swell (Slow, driven by low bass)
                harmonicSum += Math.sin(nx * Math.PI * 2.0 - t * 1.5) * (0.040 + bass * 0.15);

                // 2. First Harmonic (Punchy bass)
                harmonicSum += Math.sin(nx * Math.PI * 3.5 - t * 2.1 + 0.8) * (0.025 + bass * 0.14);

                // 3. Second Harmonic (Lower mids - vocals/instruments)
                harmonicSum += Math.sin(nx * Math.PI * 5.2 - t * 2.8 + 1.2) * (0.018 + mid * 0.12);

                // 4. Third Harmonic (Higher mids)
                harmonicSum += Math.sin(nx * Math.PI * 8.4 - t * 3.5 + 2.4) * (mid * 0.10);

                // 5. Fourth Harmonic (Treble/Sibilance - fast micro ripples)
                harmonicSum += Math.sin(nx * Math.PI * 14.0 - t * 4.5 + 3.1) * (treble * 0.08);

                // 6. Direct FFT micro-surface tension mapped mathematically
                const fftIdx = Math.floor(nx * (d.length * 0.40));
                const fftVal = (an && playing) ? (d[fftIdx] / 255.0) : 0;
                const highFreqPhase = nx * Math.PI * 32.0 - t * 6.0;
                // Multiply the raw FFT data by a fast sine wave so it produces actual ripples, not blocky bars
                const microRipple = Math.sin(highFreqPhase) * (fftVal * 0.06);

                // Add combined harmonic fourier series to Y, scaled by canvas height and edge dampening
                y += (harmonicSum + microRipple) * H * edgeDamp * 1.35;

                // Add transient physical drops
                for (const dp of dropsRef.current) y += dropY(dp, nx) * H * 0.045;

                crestPath.push(y);
            }

            // Fill water above the crest path (sky-colored — creates wave separation)
            // Soft underbelly shadow of the crest
            ctx.beginPath();
            ctx.moveTo(0, H);
            for (let i = 0; i < crestPath.length; i++) {
                const px = i * 2;
                i === 0 ? ctx.moveTo(0, crestPath[i] + 14) : ctx.lineTo(px, crestPath[i] + 14);
            }
            ctx.lineTo(W, H); ctx.closePath();
            const shadowGrad = ctx.createLinearGradient(0, waterTop, 0, waterTop + 30);
            shadowGrad.addColorStop(0, `rgba(5,18,45,0.88)`);
            shadowGrad.addColorStop(1, `rgba(5,18,45,0)`);
            ctx.fillStyle = shadowGrad; ctx.fill();

            // Glowing crest line — the signature bright horizon
            ctx.beginPath();
            for (let i = 0; i < crestPath.length; i++) {
                const px = i * 2;
                i === 0 ? ctx.moveTo(0, crestPath[i]) : ctx.lineTo(px, crestPath[i]);
            }
            // Outer glow (wide, soft)
            ctx.shadowBlur = 22 + bass * 40;
            ctx.shadowColor = `rgba(255, 240, 180, ${0.65 + energy * 0.30})`;
            ctx.strokeStyle = `rgba(255, 248, 220, ${0.82 + energy * 0.15})`;
            ctx.lineWidth = 2.5 + bass * 5.0;
            ctx.stroke();

            // Inner bright core
            ctx.beginPath();
            for (let i = 0; i < crestPath.length; i++) {
                const px = i * 2;
                i === 0 ? ctx.moveTo(0, crestPath[i]) : ctx.lineTo(px, crestPath[i]);
            }
            ctx.shadowBlur = 10 + bass * 20;
            ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.98)';
            ctx.lineWidth = 1.2 + bass * 2.5;
            ctx.stroke();
            ctx.shadowBlur = 0;

            /* Celestial reflection column in water */
            {
                const refX = isNight
                    ? W * (0.5 + 0.28 * Math.sin(hourF * 0.4 - 1.0))
                    : W * lerp(0.06, 0.94, sunNormX);
                const refW = W * (0.04 + energy * 0.04);
                const refGrad = ctx.createLinearGradient(refX, waterTop, refX, H);
                const refA = (isNight ? 0.20 : 0.16) + energy * 0.12;
                refGrad.addColorStop(0, isNight ? `rgba(230,208,92,${refA})` : `rgba(255,200,70,${refA})`);
                refGrad.addColorStop(0.5, isNight ? `rgba(190,165,65,${refA * 0.22})` : `rgba(255,180,55,${refA * 0.22})`);
                refGrad.addColorStop(1, 'transparent');
                ctx.save();
                ctx.beginPath();
                ctx.rect(refX - refW * 3.5, waterTop, refW * 7, H - waterTop);
                ctx.clip();
                const nSteps = 36;
                ctx.beginPath(); ctx.moveTo(refX - refW, waterTop);
                for (let i = 0; i <= nSteps; i++) {
                    const fy = waterTop + (i / nSteps) * (H - waterTop);
                    const widen = (i / nSteps) * refW * 2.2;
                    const rpl = Math.sin(t * 2.0 + i * 0.6) * widen * 0.28;
                    ctx.lineTo(refX + rpl + widen * 0.5, fy);
                }
                for (let i = nSteps; i >= 0; i--) {
                    const fy = waterTop + (i / nSteps) * (H - waterTop);
                    const widen = (i / nSteps) * refW * 2.2;
                    const rpl = Math.sin(t * 2.0 + i * 0.6 + Math.PI) * widen * 0.28;
                    ctx.lineTo(refX + rpl - widen * 0.5, fy);
                }
                ctx.closePath(); ctx.fillStyle = refGrad; ctx.fill();
                ctx.restore();
            }

            /* ── Elliptical caustic patches — like reference image ────── */
            // These are the soft oval light shapes visible on calm water
            const patchCount = 18;
            for (let i = 0; i < patchCount; i++) {
                // Golden ratio spread for even distribution
                const nx = (i * 0.6180339887 + 0.08) % 0.96;
                // Y position scales inversely with distance (perspective)
                // Front (bottom) = larger + brighter; back (near horizon) = smaller + dimmer
                const depthT = (i * 0.618 * 0.37 + 0.1) % 1.0;
                const py = waterTop + depthT * (H - waterTop) * 0.90 + 18;
                const pWidth = W * (0.038 + (1 - depthT) * 0.045 + Math.sin(t * 0.22 + i) * 0.008);
                const pHeight = pWidth * (0.22 + (1 - depthT) * 0.10);
                const drift = Math.sin(t * 0.18 + i * 1.4) * W * 0.025;
                const a = (0.055 + (1 - depthT) * 0.055) * (0.6 + 0.4 * Math.sin(t * 0.28 + i * 1.3));
                const pg = ctx.createRadialGradient(nx * W + drift, py, 0, nx * W + drift, py, pWidth);
                pg.addColorStop(0, `rgba(120,190,255,${a})`);
                pg.addColorStop(0.5, `rgba(90,155,220,${a * 0.5})`);
                pg.addColorStop(1, 'transparent');
                ctx.fillStyle = pg;
                ctx.beginPath();
                ctx.ellipse(nx * W + drift, py, pWidth, pHeight, Math.sin(t * 0.12 + i) * 0.3, 0, Math.PI * 2);
                ctx.fill();
            }

            /* ── Depth vignette ─────────────────────────────────────────── */
            const fog = ctx.createLinearGradient(0, H * 0.75, 0, H);
            fog.addColorStop(0, 'rgba(1,5,18,0)');
            fog.addColorStop(1, `rgba(0,3,12,${0.42 + bass * 0.06})`);
            ctx.fillStyle = fog; ctx.fillRect(0, H * 0.75, W, H - H * 0.75);

            rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [playing, accentColor]);

    return (
        <canvas
            ref={canvasRef}
            width={800}
            height={1600}
            style={{ width: '100%', height: `${height}px`, display: 'block' }}
        />
    );
}
