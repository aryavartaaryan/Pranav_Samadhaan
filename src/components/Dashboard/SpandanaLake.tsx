'use client';

/*
  ╔═══════════════════════════════════════════════════════════════════════════╗
  ║  SPANDANA ENGINE v2.0 — Fluid Cymatics                                   ║
  ║  Physics-based cymatic water plane, RMS+EMA audio extraction,            ║
  ║  Page Visibility / App Lifecycle management, photorealistic Moon.        ║
  ╚═══════════════════════════════════════════════════════════════════════════╝
*/

import React, { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════════════════════════
   SHARED WEB AUDIO SINGLETONS
   ═══════════════════════════════════════════════════════════════════════════ */
let SHARED_ACTX: AudioContext | null = null;
const CONNECTED_SPD = new WeakSet<HTMLAudioElement>();
const ANALYSER_MAP_SPD = new WeakMap<HTMLAudioElement, AnalyserNode>();

/* ═══════════════════════════════════════════════════════════════════════════
   TIME & SKY HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */
function getHourFraction() {
    const now = new Date();
    return now.getHours() + now.getMinutes() / 60;
}

function getSkyColors(hf: number) {
    if (hf >= 4 && hf < 6)
        return { top: [0.02, 0.01, 0.08], mid: [0.10, 0.04, 0.22], hor: [0.28, 0.10, 0.30], waterTop: [0.06, 0.03, 0.14] };
    if (hf >= 6 && hf < 8)
        return { top: [0.04, 0.05, 0.25], mid: [0.45, 0.18, 0.06], hor: [0.90, 0.45, 0.12], waterTop: [0.30, 0.12, 0.05] };
    if (hf >= 8 && hf < 12)
        return { top: [0.10, 0.25, 0.72], mid: [0.22, 0.48, 0.85], hor: [0.55, 0.72, 0.95], waterTop: [0.08, 0.20, 0.55] };
    if (hf >= 12 && hf < 15)
        return { top: [0.05, 0.20, 0.80], mid: [0.18, 0.45, 0.92], hor: [0.45, 0.68, 0.98], waterTop: [0.04, 0.18, 0.62] };
    if (hf >= 15 && hf < 17.5)
        return { top: [0.08, 0.18, 0.65], mid: [0.32, 0.40, 0.70], hor: [0.75, 0.52, 0.28], waterTop: [0.15, 0.12, 0.08] };
    if (hf >= 17.5 && hf < 19.5)
        return { top: [0.08, 0.02, 0.24], mid: [0.48, 0.10, 0.28], hor: [0.88, 0.38, 0.10], waterTop: [0.22, 0.06, 0.10] };
    // Night (default) — deep midnight
    return { top: [0.012, 0.028, 0.065], mid: [0.030, 0.055, 0.130], hor: [0.048, 0.078, 0.185], waterTop: [0.015, 0.040, 0.110] };
}

function getSunPosition(hf: number): { nx: number; ny: number; visible: boolean } {
    if (hf < 5.5 || hf >= 19.5) return { nx: 0.5, ny: -0.1, visible: false };
    const nx = (hf - 5.5) / 14;
    const ny = Math.sin(nx * Math.PI) * 0.92;
    return { nx, ny, visible: true };
}

function getLunarAge(): number {
    const newMoon = new Date('2000-01-06T18:14:00Z').getTime();
    const lunation = 29.53058867 * 86400000;
    const age = ((Date.now() - newMoon) % lunation + lunation) % lunation;
    return (age / lunation) * 29.53;
}

/* ═══════════════════════════════════════════════════════════════════════════
   GLSL SHADERS
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Sky ──────────────────────────────────────────────────────────────────────
const SKY_VERT = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
`;
const SKY_FRAG = `
  uniform vec3 uColorTop, uColorMid, uColorHor;
  uniform float uTime, uF;
  varying vec2 vUv;
  void main() {
    float t = vUv.y;
    vec3 c = mix(uColorHor, mix(uColorMid, uColorTop, smoothstep(0.35,1.0,t)), smoothstep(0.0,0.40,t));
    // Subtle audio-reactive aurora shimmer (night only)
    float isNight = 1.0 - smoothstep(0.04,0.15, uColorTop.b - uColorTop.r);
    float aurora = sin(vUv.x * 5.0 + uTime * 0.12) * 0.5 + 0.5;
    aurora *= smoothstep(0.55,0.75,t) * 0.028 * isNight * (1.0 + uF * 0.8);
    c += vec3(0.08, 0.22, 0.48) * aurora;
    gl_FragColor = vec4(c, 1.0);
  }
`;

// ── Photorealistic Sun ───────────────────────────────────────────────────────
const SUN_VERT = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const SUN_FRAG = `
  uniform float uTime, uEnergy;
  uniform vec3 uInnerColor, uOuterColor;
  varying vec2 vUv;
  void main() {
    vec2 c = vUv - 0.5; float d = length(c);
    float disc = 1.0 - smoothstep(0.22,0.26,d);
    float limb = 1.0 - pow(clamp(d/0.24,0.0,1.0),0.45);
    float tx = sin(c.x*80.0+uTime*0.3)*sin(c.y*60.0+uTime*0.25)*0.04;
    float corona = smoothstep(0.38,0.24,d)*smoothstep(0.22,0.28,d)*1.8;
    float halo = exp(-d*6.5)*(0.55+uEnergy*0.35);
    float rayA = atan(c.y,c.x);
    float ray = pow(max(0.0,sin(rayA*12.0+uTime*0.5)),2.0);
    ray *= max(0.0,1.0-d*4.2)*smoothstep(0.24,0.44,d)*(0.22+uEnergy*0.28);
    vec3 col = mix(uOuterColor,uInnerColor,limb)*disc+uInnerColor*tx*disc
             + uOuterColor*halo + mix(uOuterColor,vec3(1.),0.5)*ray
             + mix(uOuterColor,vec3(1.),corona*0.8)*(1.0-disc);
    float alpha = clamp(disc+halo*0.85+ray*0.6+corona*0.7,0.0,1.0);
    gl_FragColor = vec4(col, alpha);
  }
`;

// ── Photorealistic 3D Moon ───────────────────────────────────────────────────
const MOON_VERT = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const MOON_FRAG = `
  uniform float uLunarAge, uTime, uEnergy;
  varying vec2 vUv;

  // Simple hash for noise
  float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
    vec2 u = f*f*(3.0-2.0*f);
    return mix(a,b,u.x)+( c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;
  }

  void main() {
    vec2 c = vUv - 0.5;
    float d = length(c);
    if (d > 0.5) discard;

    // Disc with limb darkening (sphere illusion)
    float inside = 1.0 - smoothstep(0.44, 0.5, d);
    float limb = pow(1.0 - d*1.9, 0.6);

    // Phase mask: lunarAge/29.53 maps 0..1 through waxing/waning
    float phase = uLunarAge / 29.53;
    // Terminator x position in UV space
    float termX = cos(phase * 3.14159);
    // Simple crescent mask: compare adjusted x to terminator
    float adjusted = c.x / max(0.001, sqrt(0.25 - c.y*c.y));
    float lit = phase < 0.5
      ? step(termX, adjusted)   // waxing — lit on right
      : step(adjusted, termX);  // waning — lit on left

    // Maria (dark patches) via noise
    float maria = noise(c * 7.0 + 2.5);
    maria = smoothstep(0.55, 0.7, maria) * 0.35;

    // Surface texture
    vec3 litColor = vec3(0.88, 0.84, 0.70);
    vec3 darkColor = vec3(0.18, 0.16, 0.12);
    vec3 moonSurf = mix(litColor*limb, darkColor, maria);

    // Outer halo glow
    float halo = exp(-d*5.5) * 0.15 * (1.0 + uEnergy * 0.3);

    vec3 col = moonSurf * lit + vec3(0.15,0.13,0.10)*halo;
    float alpha = inside * lit + halo * (1.0 - inside);
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  }
`;

// ── Cymatic Fluid Water — Spandana Engine v2.0 ───────────────────────────────
//
//  Z(x,y,t) = Σ F(t) · e^(-d·r_i) · cos(k·r_i - ω·t)
//
//  F(t) = smoothed EMA drive force from RMS audio energy
//  d    = damping coefficient (ripples fade toward horizon)
//  k    = spatial frequency (wavenumber)
//  ω    = temporal frequency
//  r_i  = distance from epicenter i
//
const WATER_VERT = `
  uniform float uTime;
  uniform float uF;       // EMA-smoothed audio force F(t)
  uniform float uFHigh;   // high-freq component for micro-ripples
  uniform float uSilent;  // 0..1: 1 = fully silent, triggers glass-still decay
  varying vec2 vUv;
  varying float vDisplace;
  varying vec3 vNorm;

  // Single cymatic propagator: F(t)·e^(-d·r)·cos(k·r - ω·t)
  float cymatic(vec2 pos, vec2 epicenter, float k, float omega, float decay) {
    float r = length(pos - epicenter);
    if (r < 0.001) return 0.0;
    return uF * exp(-decay * r) * cos(k * r - omega * uTime);
  }

  // High-freq micro surface tension ripple
  float microRipple(vec2 pos, vec2 epicenter, float k, float omega, float decay) {
    float r = length(pos - epicenter);
    if (r < 0.001) return 0.0;
    return uFHigh * exp(-decay * r) * cos(k * r - omega * uTime);
  }

  void main() {
    vUv = uv;
    vec3 p = position;
    vec2 xz = p.xz;

    // ── Wave epicenters (3 concentric sources for rich cymatics) ──────────
    vec2 e0 = vec2(0.0,  0.0);   // centre
    vec2 e1 = vec2(1.8, -1.2);   // off-centre 1
    vec2 e2 = vec2(-1.5, 1.6);   // off-centre 2

    // ── Fundamental swell — F(t)·e^(-0.18·r)·cos(3.8r − 2.2t) ───────────
    float z  = cymatic(xz, e0, 3.8,  2.2,  0.18);
    // ── First harmonic — adds overtone richness (like a singing bowl) ─────
    z       += cymatic(xz, e0, 6.18, 3.52, 0.22) * 0.42;
    // ── Second harmonic — micro-scale ripple rings ────────────────────────
    z       += cymatic(xz, e0, 10.5, 5.80, 0.28) * 0.20;
    // ── Asymmetric epicenters — breaks perfect symmetry for organic feel ──
    z       += cymatic(xz, e1, 4.5,  2.8,  0.30) * 0.28;
    z       += cymatic(xz, e2, 5.2,  3.1,  0.32) * 0.22;
    // ── High-frequency micro surface tension (treble/sibilance) ──────────
    z       += microRipple(xz, e0, 18.0, 8.5, 0.40) * 0.14;

    // Horizon-edge damping: waves smoothly vanish toward the mesh boundary
    float edgeDamp = 1.0 - smoothstep(3.5, 7.5, length(xz));
    z *= edgeDamp;

    // Glass-still decay when audio is silent (1.5 second fade to zero)
    z *= (1.0 - uSilent);

    p.y += z;
    vDisplace = z;

    // ── Analytical surface normal (finite differences) ────────────────────
    float eps = 0.06;
    float zx = cymatic(xz + vec2(eps,0.), e0, 3.8, 2.2, 0.18) *edgeDamp;
    float zy = cymatic(xz + vec2(0.,eps), e0, 3.8, 2.2, 0.18) *edgeDamp;
    vNorm = normalMatrix * normalize(vec3(-(zx - z)/eps, 1.0, -(zy - z)/eps));

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const WATER_FRAG = `
  uniform float uTime;
  uniform float uF;
  uniform float uEnergy;
  uniform vec3 uDeepColor;
  uniform vec3 uSurfaceColor;
  uniform vec3 uCrestColor;    // moonlight / sunlight crest highlight
  uniform float uIsNight;
  varying vec2 vUv;
  varying float vDisplace;
  varying vec3 vNorm;

  void main() {
    // Fresnel-like glancing angle
    float nDotV = abs(dot(normalize(vNorm), vec3(0.,1.,0.)));
    float fresnel = pow(1.0 - nDotV, 2.8);

    // Deep midnight navy base — highly reflective (metalness feel)
    vec3 base = mix(uDeepColor, uSurfaceColor, fresnel * 0.55 + uF * 0.14);

    // Celestial reflection column — moon/sun shimmer on water surface
    float reflX = 0.5 + sin(uTime * 0.12) * 0.012;
    float dist = abs(vUv.x - reflX);
    float stripW = 0.045 + (1.0 - vUv.y) * 0.095;
    float strip = smoothstep(stripW, 0.0, dist);
    float shimmer = 0.48 + 0.52 * sin(vUv.y * 55.0 - uTime * 3.2 + vDisplace * 12.0);
    strip *= shimmer;
    base += uCrestColor * strip * (0.30 + uF * 0.25);

    // Crest glow — peaks glow with moonlight at crescendo
    float crest = max(0.0, vDisplace * 5.0);
    base += uCrestColor * crest * uEnergy * 0.65;

    // Horizon vignette — edges fade to deep black like an infinite lake
    float vx = smoothstep(0.0, 0.28, vUv.x) * smoothstep(1.0, 0.72, vUv.x);
    float vy = smoothstep(0.0, 0.12, vUv.y);
    float vignette = vx * vy;
    base = mix(uDeepColor * 0.08, base, vignette * 0.88 + 0.12);

    gl_FragColor = vec4(base, 0.97);
  }
`;

// ── Stars ────────────────────────────────────────────────────────────────────
const STAR_VERT = `
  attribute float aSize; attribute float aPhase;
  uniform float uTime, uVisibility;
  varying float vAlpha;
  void main() {
    float tw = 0.42 + 0.58 * sin(uTime * 0.7 + aPhase);
    vAlpha = tw * uVisibility;
    vec4 mv = modelViewMatrix * vec4(position,1.0);
    gl_PointSize = aSize * tw * (220.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const STAR_FRAG = `
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5; float d = length(c);
    if (d > 0.5) discard;
    gl_FragColor = vec4(0.98,0.97,0.94, smoothstep(0.5,0.04,d)*vAlpha);
  }
`;

const STAR_COUNT = 2200;
function buildStarGeo() {
    const pos = new Float32Array(STAR_COUNT * 3);
    const sizes = new Float32Array(STAR_COUNT);
    const phases = new Float32Array(STAR_COUNT);
    for (let i = 0; i < STAR_COUNT; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 0.6 + 0.05);
        const r = 78 + Math.random() * 18;
        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.cos(phi);
        pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
        sizes[i] = 0.5 + Math.random() * 2.2;
        phases[i] = Math.random() * Math.PI * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    return geo;
}

/* ═══════════════════════════════════════════════════════════════════════════
   R3F SCENE — NightLakeScene
   ═══════════════════════════════════════════════════════════════════════════ */
interface SceneProps {
    audioRef: React.RefObject<HTMLAudioElement | null>;
    playing: boolean;
    accentColor: string;
}

function NightLakeScene({ audioRef, playing, accentColor }: SceneProps) {
    const { camera } = useThree();

    /* ── Time-of-day snapshot ─────────────────────────────────────────── */
    const hf = useMemo(() => getHourFraction(), []);
    const skyColors = useMemo(() => getSkyColors(hf), [hf]);
    const sunPos = useMemo(() => getSunPosition(hf), [hf]);
    const lunarAge = useMemo(() => getLunarAge(), []);
    const isNight = useMemo(() => hf < 5.5 || hf >= 19.5, [hf]);
    const isDawn = useMemo(() => hf >= 5.5 && hf < 7.5, [hf]);
    const isDusk = useMemo(() => hf >= 17.5 && hf < 19.5, [hf]);
    const starVis = useMemo(() => isNight ? 1 : isDawn || isDusk ? 0.45 : 0, [isNight, isDawn, isDusk]);
    const showMoon = useMemo(() => isNight || isDusk || isDawn, [isNight, isDusk, isDawn]);

    /* ── Camera ───────────────────────────────────────────────────────── */
    useEffect(() => {
        (camera as THREE.PerspectiveCamera).fov = 55;
        (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
        camera.position.set(0, 3.2, 9);
        camera.lookAt(0, -0.5, -1);
    }, [camera]);

    /* ══ MODULE 1: RMS + EMA Audio Energy Extractor ═════════════════════
       F(t) = α·RMS + (1−α)·F(t−1),  α = 0.05
       Separate high-freq component for micro-ripples.
    ═════════════════════════════════════════════════════════════════════ */
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataRef = useRef<Float32Array>(new Float32Array(2048));  // float for RMS
    const byteDataRef = useRef<Uint8Array>(new Uint8Array(2048));      // byte for high-freq
    const F = useRef(0);        // smoothed EMA drive force
    const FHigh = useRef(0);        // high-freq EMA
    const FEnergy = useRef(0);        // overall energy
    const silentTimer = useRef(0);        // counts frames of silence
    const silentU = useRef(0);        // uSilent uniform 0..1

    /* ── Web Audio connection ─────────────────────────────────────────── */
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (CONNECTED_SPD.has(audio)) {
            const cached = ANALYSER_MAP_SPD.get(audio);
            if (cached) {
                analyserRef.current = cached;
                dataRef.current = new Float32Array(cached.fftSize) as unknown as Float32Array<ArrayBuffer>;
                byteDataRef.current = new Uint8Array(cached.frequencyBinCount) as unknown as Uint8Array<ArrayBuffer>;
            }
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
            an.fftSize = 2048;
            an.smoothingTimeConstant = 0.92; // browser-side smoothing (on top of our EMA)
            source.connect(an);
            an.connect(SHARED_ACTX.destination);
            analyserRef.current = an;
            dataRef.current = new Float32Array(an.fftSize) as unknown as Float32Array<ArrayBuffer>;
            byteDataRef.current = new Uint8Array(an.frequencyBinCount) as unknown as Uint8Array<ArrayBuffer>;
            CONNECTED_SPD.add(audio);
            ANALYSER_MAP_SPD.set(audio, an);
        } catch (e) { console.warn('[SpandanaEngine v2]', e); }
    }, []); // eslint-disable-line

    /* ── Resume on play ───────────────────────────────────────────────── */
    useEffect(() => {
        if (playing && SHARED_ACTX?.state === 'suspended') SHARED_ACTX.resume().catch(() => { });
    }, [playing]);

    /* ══ MODULE 3: Page Visibility / App Lifecycle Manager ══════════════
       On background: suspend AudioContext + note ramp-down needed.
       On foreground: resume + ramp volume smoothly over 500ms.
    ═════════════════════════════════════════════════════════════════════ */
    useEffect(() => {
        const handleVisibility = () => {
            if (!SHARED_ACTX) return;
            if (document.hidden) {
                // App went to background — suspend audio context
                SHARED_ACTX.suspend().catch(() => { });
            } else {
                // App returned — resume audio context with gradual volume ramp
                SHARED_ACTX.resume().then(() => {
                    const audio = audioRef.current;
                    if (!audio || !playing) return;
                    // Smooth ramp: mute → full volume over 500ms
                    audio.volume = 0;
                    const start = performance.now();
                    const RAMP_MS = 500;
                    function ramp() {
                        const elapsed = performance.now() - start;
                        audio!.volume = Math.min(1, elapsed / RAMP_MS);
                        if (elapsed < RAMP_MS) requestAnimationFrame(ramp);
                    }
                    requestAnimationFrame(ramp);
                }).catch(() => { });
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [audioRef, playing]);

    /* ── Materials ────────────────────────────────────────────────────── */
    const skyMat = useMemo(() => new THREE.ShaderMaterial({
        vertexShader: SKY_VERT,
        fragmentShader: SKY_FRAG,
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
            uColorTop: { value: new THREE.Color(...(skyColors.top as [number, number, number])) },
            uColorMid: { value: new THREE.Color(...(skyColors.mid as [number, number, number])) },
            uColorHor: { value: new THREE.Color(...(skyColors.hor as [number, number, number])) },
            uTime: { value: 0 },
            uF: { value: 0 },
        },
    }), [skyColors]);

    const starGeo = useMemo(() => buildStarGeo(), []);
    const starMat = useMemo(() => new THREE.ShaderMaterial({
        vertexShader: STAR_VERT,
        fragmentShader: STAR_FRAG,
        uniforms: { uTime: { value: 0 }, uVisibility: { value: starVis } },
        transparent: true,
        depthWrite: false,
    }), [starVis]);

    /* ── Sun ──────────────────────────────────────────────────────────── */
    const sunInner = useMemo(() => {
        if (hf < 8 || (hf >= 17.5 && hf < 19)) return new THREE.Color(1.0, 0.88, 0.60);
        if (hf >= 11 && hf < 15) return new THREE.Color(1.0, 0.98, 0.92);
        return new THREE.Color(1.0, 0.94, 0.72);
    }, [hf]);

    const sunOuter = useMemo(() => {
        if (hf < 8 || (hf >= 17.5 && hf < 19)) return new THREE.Color(0.95, 0.42, 0.08);
        if (hf >= 11 && hf < 15) return new THREE.Color(1.0, 0.85, 0.30);
        return new THREE.Color(1.0, 0.70, 0.18);
    }, [hf]);

    const sunMat = useMemo(() => new THREE.ShaderMaterial({
        vertexShader: SUN_VERT,
        fragmentShader: SUN_FRAG,
        uniforms: {
            uTime: { value: 0 },
            uEnergy: { value: 0 },
            uInnerColor: { value: sunInner },
            uOuterColor: { value: sunOuter },
        },
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }), [sunInner, sunOuter]);

    const sunWorldPos = useMemo(() => {
        if (!sunPos.visible) return null;
        return new THREE.Vector3((sunPos.nx - 0.5) * 24, 2 + sunPos.ny * 18, -40);
    }, [sunPos]);
    const sunSize = useMemo(() => {
        if (!sunPos.visible) return 0;
        return sunPos.ny < 0.12 ? 6.0 : sunPos.ny > 0.75 ? 3.5 : 4.5;
    }, [sunPos]);

    /* ── Moon (photorealistic, with phase) ────────────────────────────── */
    const moonMat = useMemo(() => new THREE.ShaderMaterial({
        vertexShader: MOON_VERT,
        fragmentShader: MOON_FRAG,
        uniforms: {
            uLunarAge: { value: lunarAge },
            uTime: { value: 0 },
            uEnergy: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
    }), [lunarAge]);

    // Moon position arcs across night sky
    const moonWorldPos = useMemo(() => {
        if (!showMoon) return null;
        // Arc from E to W across night sky
        const moonHf = isNight ? hf < 5 ? hf + 24 : hf : hf;
        const nx = isNight
            ? ((moonHf >= 20 ? moonHf - 20 : moonHf + 4) / 13) % 1
            : isDusk ? 0.72 : 0.28;
        const ny = Math.sin(Math.max(0, Math.min(1, nx)) * Math.PI) * 0.75;
        return new THREE.Vector3((nx - 0.5) * 20, 2 + ny * 16, -38);
    }, [showMoon, isNight, isDusk, hf]);

    /* ══ MODULE 2 & 4: Cymatic Water — Spandana Engine ══════════════════ */
    const crestColor = useMemo(() => {
        if (isNight) return new THREE.Color(0.82, 0.78, 0.62); // moon gold
        return new THREE.Color(sunOuter.r, sunOuter.g * 0.85, sunOuter.b * 0.4); // sun shimmer
    }, [isNight, sunOuter]);

    const waterMat = useMemo(() => new THREE.ShaderMaterial({
        vertexShader: WATER_VERT,
        fragmentShader: WATER_FRAG,
        uniforms: {
            uTime: { value: 0 },
            uF: { value: 0 },    // EMA drive force
            uFHigh: { value: 0 },    // high-freq component
            uEnergy: { value: 0 },
            uSilent: { value: 0 },    // 0=active, 1=glass-still
            uDeepColor: { value: new THREE.Color(...(skyColors.waterTop as [number, number, number])) },
            uSurfaceColor: { value: new THREE.Color(0.06, 0.12, 0.38) }, // deep midnight navy
            uCrestColor: { value: crestColor },
            uIsNight: { value: isNight ? 1.0 : 0.0 },
        },
        transparent: true,
    }), [skyColors, crestColor, isNight]);

    /* ── Mesh refs ────────────────────────────────────────────────────── */
    const skyRef = useRef<THREE.Mesh>(null);
    const starsRef = useRef<THREE.Points>(null);
    const sunRef = useRef<THREE.Mesh>(null);
    const moonRef = useRef<THREE.Mesh>(null);
    const waterRef = useRef<THREE.Mesh>(null);

    /* ══ RENDER LOOP ══════════════════════════════════════════════════════
       Skip if page is hidden (battery + CPU saving).
       Delta-time aware so water resumes exactly where it left off.
    ═════════════════════════════════════════════════════════════════════ */
    useFrame(({ clock }, delta) => {
        // Skip processing when tab is hidden
        if (document.hidden) return;

        const t = clock.elapsedTime;

        /* ─ Module 1: RMS + EMA extraction ──────────────────────────────
           RMS = sqrt( mean(x²) )  — captures the envelope, not spikes.
           F(t) = 0.05·RMS + 0.95·F(t−1)  ← α = 0.05 (extreme smoothness)
           FHigh uses α = 0.08 for micro-ripple responsiveness.
        ──────────────────────────────────────────────────────────────── */
        const α = 0.05;
        const αH = 0.08;

        let rmsRaw = 0;
        let highRaw = 0;

        if (analyserRef.current && playing) {
            const an = analyserRef.current;
            an.getFloatTimeDomainData(dataRef.current as unknown as Float32Array<ArrayBuffer>);
            // RMS of full waveform
            let sumSq = 0;
            for (let i = 0; i < dataRef.current.length; i++) sumSq += dataRef.current[i] ** 2;
            rmsRaw = Math.sqrt(sumSq / dataRef.current.length);

            // High-freq energy: upper half of spectrum
            an.getByteFrequencyData(byteDataRef.current as unknown as Uint8Array<ArrayBuffer>);
            const L = byteDataRef.current.length;
            let hfSum = 0;
            const hfStart = Math.floor(L * 0.30);
            for (let i = hfStart; i < L; i++) hfSum += byteDataRef.current[i];
            highRaw = (hfSum / ((L - hfStart) * 255));
        } else {
            // Idle gentle ripple — water never fully dies, just breathes
            rmsRaw = 0.018 + 0.010 * Math.sin(t * 0.38);
            highRaw = 0.012 + 0.006 * Math.sin(t * 0.62 + 1.5);
        }

        // EMA smoothing
        F.current = α * rmsRaw + (1 - α) * F.current;
        FHigh.current = αH * highRaw + (1 - αH) * FHigh.current;
        FEnergy.current = F.current * 0.65 + FHigh.current * 0.35;

        // Glass-still silence decay: if F < threshold for N frames → fade to still
        const SILENCE_THRESHOLD = 0.022;
        if (F.current < SILENCE_THRESHOLD && playing) {
            silentTimer.current = Math.min(silentTimer.current + delta, 1.5);
        } else {
            silentTimer.current = Math.max(0, silentTimer.current - delta * 3);
        }
        // Map 1.5s timer to 0..1 uSilent (1 = glass-still)
        silentU.current = Math.min(1, silentTimer.current / 1.5);

        const f = F.current;
        const fh = FHigh.current;
        const e = FEnergy.current;

        /* ─ Sky ──────────────────────────────────────────────────────── */
        if (skyRef.current) {
            const u = (skyRef.current.material as THREE.ShaderMaterial).uniforms;
            u.uTime.value = t;
            u.uF.value = f;
        }
        /* ─ Stars ────────────────────────────────────────────────────── */
        if (starsRef.current)
            (starsRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = t;

        /* ─ Sun ──────────────────────────────────────────────────────── */
        if (sunRef.current) {
            const u = (sunRef.current.material as THREE.ShaderMaterial).uniforms;
            u.uTime.value = t;
            u.uEnergy.value = e;
            sunRef.current.scale.setScalar(1 + e * 0.055 + 0.012 * Math.sin(t * 0.8));
        }
        /* ─ Moon ─────────────────────────────────────────────────────── */
        if (moonRef.current) {
            const u = (moonRef.current.material as THREE.ShaderMaterial).uniforms;
            u.uTime.value = t;
            u.uEnergy.value = e;
            moonRef.current.scale.setScalar(1 + e * 0.04);
        }
        /* ─ Water (Spandana Engine v2.0) ─────────────────────────────── */
        if (waterRef.current) {
            const u = (waterRef.current.material as THREE.ShaderMaterial).uniforms;
            u.uTime.value = t;
            u.uF.value = f;
            u.uFHigh.value = fh;
            u.uEnergy.value = e;
            u.uSilent.value = silentU.current;
        }
    });

    return (
        <>
            {/* Sky dome — inverted sphere */}
            <mesh ref={skyRef}>
                <sphereGeometry args={[95, 32, 32]} />
                <primitive object={skyMat} attach="material" />
            </mesh>

            {/* Stars (night / dusk / dawn) */}
            {starVis > 0 && (
                <points ref={starsRef} geometry={starGeo}>
                    <primitive object={starMat} attach="material" />
                </points>
            )}

            {/* Photorealistic 3D Sun (daytime) */}
            {sunPos.visible && sunWorldPos && (
                <mesh ref={sunRef} position={sunWorldPos}>
                    <planeGeometry args={[sunSize, sunSize]} />
                    <primitive object={sunMat} attach="material" />
                </mesh>
            )}

            {/* Atmospheric horizon glow at dawn/dusk */}
            {((hf >= 5.5 && hf < 8.5) || (hf >= 16.5 && hf < 20)) && sunWorldPos && (
                <mesh position={[sunWorldPos.x, -1, -30]} rotation={[-Math.PI / 2 + 0.25, 0, 0]}>
                    <planeGeometry args={[60, 20]} />
                    <meshBasicMaterial
                        color={hf < 10 ? new THREE.Color(0.85, 0.35, 0.05) : new THREE.Color(0.9, 0.28, 0.08)}
                        transparent opacity={0.22} depthWrite={false} blending={THREE.AdditiveBlending}
                    />
                </mesh>
            )}

            {/* Photorealistic 3D Moon (night / dusk / dawn) */}
            {showMoon && moonWorldPos && (lunarAge / 29.53 > 0.03 && lunarAge / 29.53 < 0.97) && (
                <mesh ref={moonRef} position={moonWorldPos}>
                    <planeGeometry args={[4.5, 4.5]} />
                    <primitive object={moonMat} attach="material" />
                </mesh>
            )}

            {/* Cymatic Fluid Lake — the Spandana plane */}
            <mesh ref={waterRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, -1]}>
                {/* High geometry subdivision (192×192) for smooth cymatic detail */}
                <planeGeometry args={[18, 18, 192, 192]} />
                <primitive object={waterMat} attach="material" />
            </mesh>

            {/* Ambient + directional lighting */}
            <ambientLight
                intensity={isNight ? 0.02 : 0.07}
                color={isNight ? '#8aa0f0' : '#fff8e0'}
            />
            {sunPos.visible && sunWorldPos && (
                <directionalLight
                    position={sunWorldPos}
                    intensity={0.10 + FEnergy.current * 0.05}
                    color={hf < 9 || hf > 17 ? '#ffb060' : '#fff8d0'}
                />
            )}
        </>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PUBLIC EXPORT
   ═══════════════════════════════════════════════════════════════════════════ */
interface SpandanaLakeProps {
    audioRef: React.RefObject<HTMLAudioElement | null>;
    playing: boolean;
    accentColor?: string;
}

export default function SpandanaLake({ audioRef, playing, accentColor = '#88AAFF' }: SpandanaLakeProps) {
    return (
        <Canvas
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            gl={{ antialias: false, alpha: false, powerPreference: 'low-power' }}
            camera={{ fov: 55, near: 0.1, far: 200 }}
            dpr={[1, 1.5]}
            frameloop="demand"   // only re-renders when useFrame calls invalidate or on-demand
        >
            <NightLakeScene audioRef={audioRef} playing={playing} accentColor={accentColor} />
        </Canvas>
    );
}
