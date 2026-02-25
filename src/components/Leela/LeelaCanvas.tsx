'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Component, ReactNode, useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { KernelSize } from 'postprocessing';
import * as THREE from 'three';

// ═══════════════════════════════════════════════════════
//  R3F ERROR BOUNDARY  — lives INSIDE the Canvas tree
//  This is the only layer that can catch errors thrown
//  inside R3F's own fiber reconciler (the null-alpha crash).
// ═══════════════════════════════════════════════════════
class R3FBoundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
    constructor(p: any) { super(p); this.state = { crashed: false }; }
    static getDerivedStateFromError() { return { crashed: true }; }
    componentDidCatch(e: Error) {
        console.warn('[Leela] Postprocessing recovered:', e.message);
        // Auto-reset — re-mounts SafePostProcessing after 1s
        setTimeout(() => this.setState({ crashed: false }), 1000);
    }
    render() { return this.state.crashed ? null : this.props.children; }
}

// ═══════════════════════════════════════════════════════
//  SESSION PROFILES  —  three intensity levels
// ═══════════════════════════════════════════════════════
interface SessionProfile { label: string; sub: string; mins: number; speed: number; bloom: number; brightness: number; }
const SESSIONS: SessionProfile[] = [
    { label: 'Sparsha', sub: '15 min · First Contact · Gentle', mins: 15, speed: 0.55, bloom: 1.6, brightness: 0.72 },
    { label: 'Pravāha', sub: '25 min · Sacred Flow · Immersive', mins: 25, speed: 1.0, bloom: 2.8, brightness: 1.0 },
    { label: 'Vilaya', sub: '40 min · Dissolution · Full Depth', mins: 40, speed: 1.45, bloom: 4.2, brightness: 1.0 },
];

// ═══════════════════════════════════════════════════════
//  SAFE POST-PROCESSING — triple guarded
// ═══════════════════════════════════════════════════════
function SafePostProcessing({ bloomIntensity }: { bloomIntensity: number }) {
    // Use all three R3F state values (matches user's suggested approach)
    const { gl, scene, camera } = useThree();
    const [ctxReady, setCtxReady] = useState(false);

    useEffect(() => {
        setCtxReady(false);
        let raf: number;
        const check = () => {
            try {
                if (gl && scene && camera) {
                    const ctx = gl.getContext() as WebGLRenderingContext | null;
                    if (ctx && ctx.getContextAttributes()) { setCtxReady(true); return; }
                }
            } catch { /* not ready */ }
            raf = requestAnimationFrame(check);
        };
        raf = requestAnimationFrame(check);
        return () => { cancelAnimationFrame(raf); };
    }, [gl, scene, camera]);

    // Synchronous guard — re-checks every render
    // Also guard domElement + actual WebGL context attributes to prevent
    // postprocessing's setRenderer() crash ('Cannot read alpha of null')
    if (!ctxReady || !gl || !scene || !camera) return null;
    try {
        if (!gl.domElement) return null;
        const ctx = gl.getContext() as WebGLRenderingContext | null;
        if (!ctx) return null;
        // This is the exact read that crashes postprocessing — pre-check it:
        if (ctx.getContextAttributes?.() == null) return null;
    } catch { return null; }

    return (
        <EffectComposer multisampling={0} enableNormalPass={false}>
            <Bloom intensity={bloomIntensity} luminanceThreshold={0.26} luminanceSmoothing={0.5}
                kernelSize={KernelSize.LARGE} mipmapBlur />
            <Vignette eskil={false} offset={0.24} darkness={0.88} />
        </EffectComposer>
    );
}

// ═══════════════════════════════════════════════════════
//  SHARED GLSL
// ═══════════════════════════════════════════════════════
const FBM = `
float hsh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float nz(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(hsh(i),hsh(i+vec2(1,0)),f.x),mix(hsh(i+vec2(0,1)),hsh(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*nz(p);p*=2.1;a*=.5;}return v;}
`;

// ═══════════════════════════════════════════════════════
//  PHASE 1  MULADHARA  — fused calm-earth + spiral vortex
// ═══════════════════════════════════════════════════════
function MuladharaFused({ opacity, speed }: { opacity: number; speed: number }) {
    const spd = speed;
    const bgMat = useMemo(() => new THREE.ShaderMaterial({
        transparent: true, depthWrite: false,
        uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uSpeed: { value: spd } },
        vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `
            ${FBM}
            uniform float uTime,uOpacity,uSpeed; varying vec2 vUv;
            void main(){
                vec2 uv=vUv-.5;
                float r=length(uv), ang=atan(uv.y,uv.x);
                float spiral=sin(ang*4.-r*12.+uTime*uSpeed*.5)*.4+.6;
                float ripple=sin(r*14.-uTime*uSpeed*.28)*.5+.5;
                ripple*=smoothstep(.55,.0,r);
                float n=fbm(uv*2.8+uTime*uSpeed*.05)*.5+.5;
                float petals=abs(cos(ang*2.+uTime*uSpeed*.06))*smoothstep(.5,.0,r)*.45;
                float val=spiral*.3+ripple*.35+n*.2+petals*.15;
                vec3 deep=vec3(.18,.07,.01),terra=vec3(.52,.20,.04),amber=vec3(.76,.40,.07),cream=vec3(.94,.80,.52);
                vec3 col=mix(deep,terra,val*.9);
                col=mix(col,amber,smoothstep(.48,.80,val));
                col=mix(col,cream,smoothstep(.84,1.,val)*ripple);
                float mask=smoothstep(.58,.0,r);
                gl_FragColor=vec4(col*mask,mask*uOpacity*.85);
            }
        `,
    }), []);

    const triMat = useMemo(() => new THREE.MeshBasicMaterial({
        color: '#CC6620', transparent: true, opacity: 0.0,
        wireframe: true, blending: THREE.AdditiveBlending, depthWrite: false,
    }), []);

    const triangles = useMemo(() => {
        const gs: THREE.BufferGeometry[] = [];
        [5, 4, 5, 4].forEach((cnt, l) => {
            const radius = 0.3 + l * 0.32;
            for (let i = 0; i < cnt; i++) {
                const base = (i / cnt) * Math.PI * 2, dir = l % 2 === 0 ? 1 : -1, sz = 0.26 - l * .025;
                const g = new THREE.BufferGeometry();
                g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
                    Math.cos(base) * radius, Math.sin(base) * radius, 0,
                    Math.cos(base + sz) * radius, Math.sin(base + sz) * radius, 0,
                    Math.cos(base + sz * .5) * radius, Math.sin(base + sz * .5) * radius + dir * sz * .5, 0,
                ]), 3));
                gs.push(g);
            }
        });
        return gs;
    }, []);

    const groupRef = useRef<THREE.Group>(null!);

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();
        bgMat.uniforms.uTime.value = t;
        bgMat.uniforms.uSpeed.value = spd;
        bgMat.uniforms.uOpacity.value = THREE.MathUtils.lerp(bgMat.uniforms.uOpacity.value, opacity, 0.04);
        triMat.opacity = opacity * 0.22 * Math.min(spd, 1.0);
        if (groupRef.current) groupRef.current.rotation.z = t * 0.018 * spd;
    });

    return (
        <group>
            <mesh position={[0, 0, -2.5]}><planeGeometry args={[9, 9]} /><primitive object={bgMat} attach="material" /></mesh>
            <group ref={groupRef} position={[0, 0, -1.6]}>
                {triangles.map((g, i) => (<mesh key={i} geometry={g}><primitive object={triMat} attach="material" /></mesh>))}
                {[.28, .52, .78, 1.06, 1.34].map((r, i) => (
                    <mesh key={`r${i}`}><ringGeometry args={[r - .007, r + .007, 80]} />
                        <meshBasicMaterial color={i % 2 === 0 ? '#CC6820' : '#996512'}
                            transparent opacity={opacity * (.25 - i * .038)}
                            blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
                    </mesh>
                ))}
            </group>
        </group>
    );
}

// ═══════════════════════════════════════════════════════
//  PHASE 2  ANAHATA LOTUS
// ═══════════════════════════════════════════════════════
const LOTUS_N = 10000;
function AnahataLotus({ opacity, breathScale, speed }: { opacity: number; breathScale: number; speed: number }) {
    const ref = useRef<THREE.Points>(null!);
    const { pos, col } = useMemo(() => {
        const pos = new Float32Array(LOTUS_N * 3), col = new Float32Array(LOTUS_N * 3);
        for (let i = 0; i < LOTUS_N; i++) {
            const petal = i % 12, t = i / LOTUS_N, layer = Math.floor(t * 5), lt = (t * 5) % 1;
            const ang = (petal / 12) * Math.PI * 2 + (Math.random() - .5) * .45;
            const r = 0.08 + lt * (0.25 + layer * 0.18) + Math.random() * .05;
            pos[i * 3] = r * Math.cos(ang); pos[i * 3 + 1] = Math.sin(lt * Math.PI) * .5 + lt * -.15 + Math.random() * .04; pos[i * 3 + 2] = r * Math.sin(ang);
            const c = new THREE.Color().setHSL(0.42 + lt * .15 + Math.random() * .06, 0.95, 0.55 + lt * .25);
            col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
        }
        return { pos, col };
    }, []);
    useFrame(({ clock }) => {
        if (!ref.current) return;
        const t = clock.getElapsedTime();
        ref.current.rotation.y = t * 0.07 * speed;
        ref.current.rotation.x = Math.sin(t * 0.08 * speed) * .06;
        ref.current.scale.setScalar(breathScale * .9 + .1);
        (ref.current.material as THREE.PointsMaterial).opacity =
            THREE.MathUtils.lerp((ref.current.material as THREE.PointsMaterial).opacity, opacity, .05);
    });
    return (
        <>
            <mesh position={[0, 0, -4]}><planeGeometry args={[12, 12]} /><meshBasicMaterial color="#000511" transparent opacity={opacity} depthWrite={false} /></mesh>
            <points ref={ref}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" count={LOTUS_N} itemSize={3} array={pos} />
                    <bufferAttribute attach="attributes-color" count={LOTUS_N} itemSize={3} array={col} />
                </bufferGeometry>
                <pointsMaterial size={0.022} vertexColors transparent opacity={0}
                    blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation toneMapped={false} />
            </points>
            <mesh position={[0, 0, -.3]}><sphereGeometry args={[.08, 16, 16]} /><meshBasicMaterial color="#00FFAA" transparent opacity={opacity * .8} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
        </>
    );
}

// ═══════════════════════════════════════════════════════
//  PHASE 3  SAHASRARA CROWN
// ═══════════════════════════════════════════════════════
const CROWN_N = 10000;
function SahasraraCrown({ opacity, speed }: { opacity: number; speed: number }) {
    const starRef = useRef<THREE.Points>(null!);
    const ringRef = useRef<THREE.Group>(null!);

    const starPos = useMemo(() => {
        const arr = new Float32Array(CROWN_N * 3);
        for (let i = 0; i < CROWN_N; i++) {
            const r = .8 + Math.random() * 5.5, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
            arr[i * 3] = r * Math.sin(ph) * Math.cos(th); arr[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th); arr[i * 3 + 2] = r * Math.cos(ph);
        }
        return arr;
    }, []);

    const crownStarMat = useMemo(() => new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
        vertexShader: `
            uniform float uTime,uOpacity; varying float vFade;
            void main(){
                vec3 p=position;
                p.x+=sin(uTime*.11+position.z)*.05;p.y+=cos(uTime*.13+position.x)*.05;
                vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
                float d=clamp(-mv.z/7.,0.,1.);gl_PointSize=mix(3.2,.7,d);
                float pulse=sin(uTime*1.8+position.x*3.)*.15+.85;
                vFade=(1.-d*.65)*uOpacity*pulse;
            }
        `,
        fragmentShader: `
            varying float vFade;
            void main(){
                vec2 uv=gl_PointCoord-.5;float d=length(uv);if(d>.5)discard;
                float s=1.-smoothstep(.1,.5,d);
                gl_FragColor=vec4(mix(vec3(.65,.15,1.),vec3(1.,.85,.55),s),vFade*s);
            }
        `,
    }), []);

    const crownBg = useMemo(() => new THREE.ShaderMaterial({
        transparent: true, depthWrite: false,
        uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
        vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `
            ${FBM}
            uniform float uTime,uOpacity;varying vec2 vUv;
            void main(){
                vec2 uv=vUv-.5;float r=length(uv),ang=atan(uv.y,uv.x);
                float p1=pow(abs(cos(ang*36.+uTime*.1)),3.)*smoothstep(.5,.0,r)*.7;
                float p2=pow(abs(cos(ang*72.-uTime*.07)),4.)*smoothstep(.5,.0,r)*.5;
                float rings=abs(sin(r*32.-uTime*.9))*smoothstep(.5,.0,r)*.6;
                float inner=smoothstep(.22,.0,r)*1.5;
                float n=fbm(uv*3.+uTime*.08)*.2;
                float val=p1*.3+p2*.25+rings*.3+n*.15+inner*.3;
                vec3 col=mix(vec3(.42,.04,.88),vec3(1.,.82,.20),smoothstep(.3,.75,val));
                col=mix(col,vec3(1.,.98,.96),smoothstep(.75,1.,val));
                float mask=smoothstep(.58,.0,r)*val+inner*.4;
                gl_FragColor=vec4(col,clamp(mask,0.,1.)*uOpacity);
            }
        `,
    }), []);

    const pillarMat = useMemo(() => new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
        vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `
            uniform float uTime,uOpacity;varying vec2 vUv;
            void main(){
                float cx=vUv.x-.5;float beam=exp(-abs(cx)*22.);
                float travel=sin(vUv.y*8.-uTime*2.5)*.5+.5;
                float fade=smoothstep(1.,0.,vUv.y)*smoothstep(0.,.15,vUv.y);
                vec3 col=mix(vec3(.8,.2,1.),vec3(1.,.9,.6),travel);
                gl_FragColor=vec4(col,beam*fade*travel*uOpacity*.75);
            }
        `,
    }), []);

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();
        crownStarMat.uniforms.uTime.value = t;
        crownStarMat.uniforms.uOpacity.value = THREE.MathUtils.lerp(crownStarMat.uniforms.uOpacity.value, opacity, .04);
        crownBg.uniforms.uTime.value = t;
        crownBg.uniforms.uOpacity.value = THREE.MathUtils.lerp(crownBg.uniforms.uOpacity.value, opacity * .95, .04);
        pillarMat.uniforms.uTime.value = t;
        pillarMat.uniforms.uOpacity.value = THREE.MathUtils.lerp(pillarMat.uniforms.uOpacity.value, opacity, .04);
        if (ringRef.current) ringRef.current.rotation.z = t * .04 * speed;
    });

    return (
        <group>
            <mesh position={[0, 0, -3]}><planeGeometry args={[9, 9]} /><primitive object={crownBg} attach="material" /></mesh>
            <mesh position={[0, 2.5, -1.5]}><planeGeometry args={[.55, 7]} /><primitive object={pillarMat} attach="material" /></mesh>
            <points ref={starRef}>
                <bufferGeometry><bufferAttribute attach="attributes-position" count={CROWN_N} itemSize={3} array={starPos} /></bufferGeometry>
                <primitive object={crownStarMat} attach="material" />
            </points>
            <group ref={ringRef}>
                {[.12, .28, .48, .72, .98, 1.28, 1.62].map((r, i) => (
                    <mesh key={i} position={[0, 0, -1.5]}><ringGeometry args={[r - .007, r + .007, 128]} />
                        <meshBasicMaterial color={i % 2 === 0 ? '#CC44FF' : '#FFD700'}
                            transparent opacity={opacity * (.55 - i * .06)}
                            blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
                    </mesh>
                ))}
            </group>
            <mesh position={[0, 0, .2]}><sphereGeometry args={[.09, 20, 20]} /><meshBasicMaterial color="#FFFFFF" transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
        </group>
    );
}

// ═══════════════════════════════════════════════════════
//  FLOATING OM  +  LOTUS  ICONS
// ═══════════════════════════════════════════════════════
const OM_N = 20;
function genOmTex() {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,215,0,1)'); g.addColorStop(.55, 'rgba(255,140,0,.7)'); g.addColorStop(1, 'rgba(255,80,0,0)');
    ctx.fillStyle = g; ctx.font = 'bold 158px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('ॐ', 128, 138);
    return new THREE.CanvasTexture(c);
}
function genLotusTex() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const ctx = c.getContext('2d')!;
    for (let i = 0; i < 8; i++) {
        ctx.save(); ctx.translate(64, 64); ctx.rotate((i / 8) * Math.PI * 2);
        const g = ctx.createRadialGradient(0, -22, 0, 0, -22, 22);
        g.addColorStop(0, 'rgba(0,220,180,0.95)'); g.addColorStop(1, 'rgba(0,100,80,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -22, 10, 22, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    ctx.fillStyle = 'rgba(255,215,0,0.9)'; ctx.beginPath(); ctx.arc(64, 64, 8, 0, Math.PI * 2); ctx.fill();
    return new THREE.CanvasTexture(c);
}

function FloatingIcons({ opacity }: { opacity: number }) {
    const omRef = useRef<THREE.InstancedMesh>(null!);
    const lotRef = useRef<THREE.InstancedMesh>(null!);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const omTex = useMemo(() => genOmTex(), []);
    const lotTex = useMemo(() => genLotusTex(), []);
    const data = useMemo(() => Array.from({ length: OM_N }, (_, i) => ({
        off: (i / OM_N) * Math.PI * 2 * 6 + Math.random() * 3,
        as: 0.1 + Math.random() * .09, ph: (i / OM_N) * Math.PI * 2,
        dz: -1.2 - Math.random() * 2.5, lotus: i % 3 === 0,
    })), []);
    const omCount = data.filter(d => !d.lotus).length;
    const lotCount = data.filter(d => d.lotus).length;

    useFrame(({ clock }) => {
        if (!omRef.current || !lotRef.current) return;
        const t = clock.getElapsedTime();
        let oi = 0, li = 0;
        data.forEach(p => {
            const life = ((t * .22 + p.off) % (Math.PI * 2)) / (Math.PI * 2);
            const r = life * 2., ang = t * p.as + p.ph;
            dummy.position.set(Math.cos(ang) * r, Math.sin(ang) * r * .45, p.dz);
            dummy.rotation.z = ang * .25;
            dummy.scale.setScalar((.1 + life * .2) * opacity);
            dummy.updateMatrix();
            const a = Math.sin(life * Math.PI) * opacity;
            if (p.lotus) {
                lotRef.current.setMatrixAt(li, dummy.matrix);
                lotRef.current.setColorAt(li, new THREE.Color().setRGB(0, a * .9, a * .6));
                li++;
            } else {
                omRef.current.setMatrixAt(oi, dummy.matrix);
                omRef.current.setColorAt(oi, new THREE.Color().setRGB(a, a * .84, 0));
                oi++;
            }
        });
        omRef.current.instanceMatrix.needsUpdate = true;
        lotRef.current.instanceMatrix.needsUpdate = true;
        if (omRef.current.instanceColor) omRef.current.instanceColor.needsUpdate = true;
        if (lotRef.current.instanceColor) lotRef.current.instanceColor.needsUpdate = true;
    });
    return (
        <>
            <instancedMesh ref={omRef} args={[undefined, undefined, omCount]}>
                <planeGeometry args={[.5, .5]} />
                <meshBasicMaterial map={omTex} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
            </instancedMesh>
            <instancedMesh ref={lotRef} args={[undefined, undefined, lotCount]}>
                <planeGeometry args={[.4, .4]} />
                <meshBasicMaterial map={lotTex} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
            </instancedMesh>
        </>
    );
}

// ═══════════════════════════════════════════════════════
//  GPU DUST
// ═══════════════════════════════════════════════════════
const DUST_N = 7000;
function SpiralDust({ phaseIdx, opacity, speed }: { phaseIdx: number; opacity: number; speed: number }) {
    const COLS = ['#D4760A', '#00AACC', '#AA44FF'] as const;
    const mat = useMemo(() => new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uColor: { value: new THREE.Color(COLS[0]) }, uSpeed: { value: speed } },
        vertexShader: `
            uniform float uTime,uSpeed;attribute float aIdx,aSpd,aRad,aOff;varying float vA;
            void main(){
                float t=uTime*aSpd*uSpeed+aOff,ang=t*1.8;
                float z=mod(aOff-uTime*uSpeed*.4,22.)-3.;
                vec3 pos=vec3(cos(ang)*aRad,sin(ang)*aRad*.55,-z);
                vec4 mv=modelViewMatrix*vec4(pos,1.);
                gl_Position=projectionMatrix*mv;
                float d=clamp(-mv.z/20.,0.,1.);gl_PointSize=mix(2.6,.7,d)*aSpd*1.3;vA=.5*(1.-d*.6);
            }
        `,
        fragmentShader: `
            uniform vec3 uColor;uniform float uOpacity;varying float vA;
            void main(){vec2 uv=gl_PointCoord-.5;float d=length(uv);if(d>.5)discard;float s=1.-smoothstep(.18,.5,d);gl_FragColor=vec4(uColor,vA*s*uOpacity);}
        `,
    }), []);
    const geo = useMemo(() => {
        const g = new THREE.BufferGeometry();
        const idx = new Float32Array(DUST_N), spd = new Float32Array(DUST_N), rad = new Float32Array(DUST_N), off = new Float32Array(DUST_N), pos = new Float32Array(DUST_N * 3);
        for (let i = 0; i < DUST_N; i++) { idx[i] = i; spd[i] = .2 + Math.random() * .6; rad[i] = .4 + Math.random() * 2.5; off[i] = Math.random() * 400; }
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setAttribute('aIdx', new THREE.BufferAttribute(idx, 1));
        g.setAttribute('aSpd', new THREE.BufferAttribute(spd, 1));
        g.setAttribute('aRad', new THREE.BufferAttribute(rad, 1));
        g.setAttribute('aOff', new THREE.BufferAttribute(off, 1));
        return g;
    }, []);
    useFrame(({ clock }) => {
        mat.uniforms.uTime.value = clock.getElapsedTime();
        mat.uniforms.uSpeed.value = speed;
        mat.uniforms.uOpacity.value = THREE.MathUtils.lerp(mat.uniforms.uOpacity.value, opacity * .5, .04);
        mat.uniforms.uColor.value.lerp(new THREE.Color(COLS[phaseIdx]), .02);
    });
    return <points geometry={geo} material={mat} />;
}

// ═══════════════════════════════════════════════════════
//  CAMERA
// ═══════════════════════════════════════════════════════
function CameraRig({ mouse }: { mouse: { x: number; y: number } }) {
    const { camera } = useThree();
    useFrame(() => {
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, mouse.x * .38, .04);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, -mouse.y * .22, .04);
        camera.lookAt(0, 0, 0);
    });
    return null;
}

// ═══════════════════════════════════════════════════════
//  SCENE — profile has hard fallback, never undefined
// ═══════════════════════════════════════════════════════
function Scene({ phaseIdx, opacity, breathScale, mouse, profile }: {
    phaseIdx: number; opacity: number; breathScale: number; mouse: { x: number; y: number }; profile: SessionProfile | null;
}) {
    // Hard fallback prevents "Cannot read undefined.speed" on HMR
    const prof = profile ?? SESSIONS[1];
    const s = prof.speed;
    const f1 = phaseIdx === 0 ? opacity : 0, f2 = phaseIdx === 1 ? opacity : 0, f3 = phaseIdx === 2 ? opacity : 0;
    return (
        <>
            <color attach="background" args={['#010006']} />
            <ambientLight intensity={0.04} />
            <pointLight position={[0, .3, -3]} intensity={3} color={['#C87820', '#00AACC', '#8800FF'][phaseIdx]} />
            <MuladharaFused opacity={f1} speed={s} />
            <AnahataLotus opacity={f2} breathScale={breathScale} speed={s} />
            <SahasraraCrown opacity={f3} speed={s} />
            <FloatingIcons opacity={opacity * .85} />
            <SpiralDust phaseIdx={phaseIdx} opacity={opacity} speed={s} />
            <CameraRig mouse={mouse} />
            <R3FBoundary><SafePostProcessing bloomIntensity={prof.bloom * opacity} /></R3FBoundary>
        </>
    );
}

// ═══════════════════════════════════════════════════════
//  AUDIO  — plays original files as-is via HTML5 Audio
//  No Tone.js, no reverb, no filters, no pitch changes.
// ═══════════════════════════════════════════════════════
function bootAudio(_profile: SessionProfile) {
    const mk = (url: string, vol: number) => {
        const el = new Audio(url);
        el.loop = true;
        el.volume = Math.min(1, Math.max(0, vol));
        el.play().catch(() => {/* browser may require interaction first */ });
        return el;
    };

    // Phase 0 → sitar leads, Phase 1 → flute leads, Phase 2 → om leads
    // These are the initial volumes (0–1 linear) per stem
    const PHASE_VOLS: [number, number, number][] = [
        [0.85, 0.25, 0.15],   // Mūlādhāra  — sitar dominant
        [0.25, 0.85, 0.22],   // Anāhata    — flute dominant
        [0.18, 0.20, 0.88],   // Sahasrāra  — om dominant
    ];

    const sitarEl = mk('https://ik.imagekit.io/rcsesr4xf/sitar.mp3', PHASE_VOLS[0][0]);
    const fluteEl = mk('https://ik.imagekit.io/rcsesr4xf/flute.mp3', PHASE_VOLS[0][1]);
    const omEl = mk('https://ik.imagekit.io/rcsesr4xf/0m_chant.mp3', PHASE_VOLS[0][2]);
    const stems = [sitarEl, fluteEl, omEl];

    // Smooth volume ramp using requestAnimationFrame (no external lib)
    const rampVol = (el: HTMLAudioElement, target: number, durationMs: number) => {
        const start = el.volume, startTime = performance.now();
        const step = () => {
            const elapsed = performance.now() - startTime;
            const t = Math.min(elapsed / durationMs, 1);
            el.volume = start + (target - start) * t;
            if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    };

    const switchPhase = (idx: number) => {
        const vols = PHASE_VOLS[Math.min(idx, 2)];
        stems.forEach((el, i) => rampVol(el, vols[i], 5000));
    };

    const fadeOut = (secs: number) => {
        stems.forEach(el => rampVol(el, 0, secs * 1000));
    };

    const cleanup = () => {
        stems.forEach(el => {
            try { el.pause(); el.src = ''; } catch { }
        });
    };

    return Promise.resolve({ switchPhase, fadeOut, cleanup });
}

// ═══════════════════════════════════════════════════════
//  SANKALPA SCREEN
// ═══════════════════════════════════════════════════════
function SankalpaScreen({ onBegin }: { onBegin: (s: SessionProfile) => void }) {
    const [chosen, setChosen] = useState<number | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const n = localStorage.getItem('vedic_user_name') || localStorage.getItem('pranav_user_name');
        setUserName(n || null);
        const check = () => setIsMobile(window.innerWidth <= 600 || window.innerHeight <= 700);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const salutation = userName ? `Dear ${userName}` : 'Dear Traveller';

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'radial-gradient(ellipse at 50% 55%,#0d0410 0%,#050010 50%,#010006 100%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: isMobile ? 'clamp(0.45rem,1.6vh,1rem)' : '1.6rem',
            fontFamily: "'Cinzel',serif",
            animation: 'sfi 1.4s ease',
            overflow: 'hidden',
            padding: isMobile ? '0.5rem' : '1rem',
        }}>
            {/* Dot grid */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: 'radial-gradient(circle,rgba(255,200,100,0.05) 1px,transparent 1px)', backgroundSize: '44px 44px' }} />

            {/* OM */}
            <div style={{
                fontSize: isMobile ? 'clamp(3rem,14vw,4.5rem)' : 'clamp(4rem,12vw,6.5rem)',
                color: '#FFD700', fontFamily: 'serif',
                textShadow: '0 0 50px #FFD700,0 0 100px #FF880055',
                animation: 'omGl 4s ease-in-out infinite', zIndex: 1, lineHeight: 1,
            }}>ॐ</div>

            {/* ── Personalised welcome — below OM ── */}
            {isMobile ? (
                /* MOBILE: single compact italic line, no box — floats seamlessly */
                <p style={{
                    zIndex: 1, margin: 0, textAlign: 'center',
                    fontFamily: "'Playfair Display',serif",
                    fontSize: 'clamp(0.6rem,3vw,0.72rem)',
                    color: 'rgba(220,185,140,0.5)',
                    letterSpacing: '0.04em',
                    fontStyle: 'italic',
                    maxWidth: '90vw',
                }}>
                    {salutation} · Sacred music & geometry, yours any hour — night, dawn or afternoon.
                </p>
            ) : (
                /* DESKTOP: full whisper card */
                <div style={{
                    zIndex: 1, textAlign: 'center',
                    maxWidth: '420px', width: '90%',
                    padding: '0.75rem 1.25rem',
                    background: 'rgba(255,200,80,0.04)',
                    border: '1px solid rgba(255,200,80,0.10)',
                    borderRadius: '14px',
                    backdropFilter: 'blur(8px)',
                    display: 'flex', flexDirection: 'column', gap: '0.28rem',
                }}>
                    <span style={{
                        fontFamily: "'Cinzel',serif",
                        fontSize: '0.8rem',
                        letterSpacing: '0.12em',
                        color: 'rgba(255,215,0,0.72)',
                        fontWeight: 600,
                    }}>{salutation},</span>
                    <p style={{
                        fontFamily: "'Playfair Display',serif",
                        fontSize: '0.76rem',
                        color: 'rgba(220,185,140,0.58)',
                        margin: 0, lineHeight: 1.7,
                        letterSpacing: '0.03em',
                        fontStyle: 'italic',
                    }}>
                        Sacred music & living geometry — yours, any hour.<br />
                        <span style={{ opacity: 0.82 }}>At night to dissolve · At dawn to awaken gently</span><br />
                        <span style={{ opacity: 0.65 }}>Or in the quiet of an afternoon, simply to be still.</span>
                    </p>
                </div>
            )}

            {/* Sankalpa label + heading */}
            <div style={{ zIndex: 1, textAlign: 'center' }}>
                <div style={{ color: 'rgba(255,215,0,.48)', fontSize: isMobile ? '.52rem' : '.6rem', letterSpacing: '6px', textTransform: 'uppercase', marginBottom: '.4rem' }}>सङ्कल्प · Sankalpa</div>
                <h2 style={{ color: 'rgba(255,215,0,.9)', fontSize: isMobile ? 'clamp(.72rem,3.5vw,.9rem)' : 'clamp(.85rem,2.2vw,1.15rem)', letterSpacing: '3px', textTransform: 'uppercase', margin: 0, textShadow: '0 0 20px rgba(255,200,50,.3)' }}>Choose the depth of your journey</h2>
            </div>

            {/* Session buttons */}
            <div style={{ display: 'flex', gap: isMobile ? '0.6rem' : '1.1rem', flexWrap: 'wrap', justifyContent: 'center', zIndex: 1, width: '100%', padding: '0 0.5rem' }}>
                {SESSIONS.map((s, i) => (
                    <button key={s.label} onClick={() => { setChosen(i); onBegin(s); }} style={{
                        background: chosen === i ? 'rgba(255,200,80,.16)' : 'rgba(255,255,255,.03)',
                        backdropFilter: 'blur(14px)',
                        border: `1px solid rgba(255,200,80,${chosen === i ? .65 : .18})`,
                        borderRadius: '14px',
                        padding: isMobile ? '0.75rem 1rem' : '1.1rem 1.7rem',
                        cursor: 'pointer',
                        color: chosen === i ? '#FFD060' : 'rgba(255,200,80,.44)',
                        textAlign: 'center',
                        transition: 'all .25s ease',
                        fontFamily: "'Cinzel',serif",
                        minWidth: isMobile ? '110px' : '145px',
                        flex: isMobile ? '1 1 100px' : 'unset',
                        boxShadow: chosen === i ? '0 0 22px rgba(255,200,50,.2)' : 'none',
                    }}>
                        <div style={{ fontSize: isMobile ? '0.9rem' : '1.15rem', fontWeight: 700, letterSpacing: '2px' }}>{s.label}</div>
                        <div style={{ fontSize: isMobile ? '.52rem' : '.58rem', opacity: .52, marginTop: '.3rem', letterSpacing: '1px', lineHeight: 1.4 }}>{s.sub}</div>
                    </button>
                ))}
            </div>

            <p style={{ color: 'rgba(200,170,255,.18)', fontSize: isMobile ? '.48rem' : '.56rem', letterSpacing: '3px', zIndex: 1, margin: 0 }}>Be still · Let the Prana guide you inward</p>
            <style>{`@keyframes sfi{from{opacity:0;transform:scale(.98)}to{opacity:1;transform:scale(1)}}@keyframes omGl{0%,100%{transform:scale(1);opacity:.8}50%{transform:scale(1.1);opacity:1}}`}</style>
        </div>
    );
}


// ═══════════════════════════════════════════════════════
//  HUD
// ═══════════════════════════════════════════════════════
const PNAMES = [
    { name: 'Mūlādhāra', sub: 'Root · Earth · Grounding', col: '#CC7722' },
    { name: 'Anāhata', sub: 'Heart · Air · Compassion', col: '#00CCAA' },
    { name: 'Sahasrāra', sub: 'Crown · Cosmos · Liberation', col: '#CC88FF' },
];
function HUD({ rem, total, ph, profile, onExit }: { rem: number; total: number; ph: number; profile: SessionProfile | null; onExit: () => void }) {
    const info = PNAMES[ph], prof = profile ?? SESSIONS[1];
    const m = Math.floor(rem / 60), s = rem % 60;
    return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10, fontFamily: "'Cinzel',serif" }}>
            <div style={{ position: 'absolute', top: '8%', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', color: info.col, fontSize: 'clamp(.7rem,2vw,.9rem)', letterSpacing: '4px', textShadow: `0 0 18px ${info.col}`, background: 'rgba(0,0,0,.28)', backdropFilter: 'blur(10px)', padding: '.35rem 1.4rem', borderRadius: '100px', border: `1px solid ${info.col}33`, transition: 'all 1.5s ease', whiteSpace: 'nowrap' }}>
                {info.name}<div style={{ fontSize: '.56rem', marginTop: '.18rem', opacity: .5, letterSpacing: '2px' }}>{info.sub}</div>
            </div>
            <div style={{ position: 'absolute', top: '.8rem', left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,200,80,.3)', fontSize: '.5rem', letterSpacing: '4px', textTransform: 'uppercase' }}>{prof.label}</div>
            {/* OM — centred on screen, the meditative focal point */}
            <div style={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.4rem',
                pointerEvents: 'none',
            }}>
                <div style={{
                    fontSize: 'clamp(2.8rem, 8vw, 4.5rem)',
                    color: info.col, fontFamily: 'serif',
                    textShadow: `0 0 30px ${info.col}, 0 0 70px ${info.col}66`,
                    animation: 'omP 4s ease-in-out infinite',
                    transition: 'color 1.5s ease, text-shadow 1.5s ease',
                    lineHeight: 1,
                }}>ॐ</div>
                <div style={{
                    width: 40, height: 1,
                    background: `radial-gradient(circle, ${info.col} 0%, transparent 100%)`,
                    opacity: .35, animation: 'omL 4s ease-in-out infinite',
                }} />
            </div>
            <div style={{ position: 'absolute', top: '1rem', right: '1.5rem', color: info.col, fontSize: '.7rem', letterSpacing: '2px', textShadow: `0 0 12px ${info.col}` }}>{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}</div>
            <div style={{ position: 'absolute', top: '50%', right: '1.1rem', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {PNAMES.map((p, i) => (<div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: i === ph ? p.col : 'rgba(255,255,255,.14)', boxShadow: i === ph ? `0 0 10px ${p.col}` : 'none', transition: 'all .6s ease' }} />))}
            </div>
            <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', width: '130px' }}>
                <div style={{ height: '2px', background: 'rgba(255,255,255,.07)', borderRadius: '1px' }}>
                    <div style={{ width: `${(rem / total) * 100}%`, height: '100%', borderRadius: '1px', background: info.col, boxShadow: `0 0 6px ${info.col}`, transition: 'width 1s linear' }} />
                </div>
            </div>

            {/* EXIT BUTTON — bottom-right, elegant glassmorphism pill */}
            <button
                onClick={onExit}
                title="Return to Sankalpa"
                style={{
                    position: 'absolute',
                    /* Sits above VahanaBar on both mobile and desktop */
                    bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    pointerEvents: 'auto',
                    display: 'flex', alignItems: 'center', gap: '.5rem',
                    background: 'rgba(0,0,0,.40)', backdropFilter: 'blur(16px)',
                    border: `1px solid ${info.col}35`,
                    borderRadius: '100px',
                    padding: '.55rem 1.4rem .55rem 1rem',
                    minHeight: '44px',   /* touch-friendly */
                    color: `${info.col}99`, cursor: 'pointer',
                    fontFamily: "'Cinzel',serif",
                    fontSize: 'clamp(.6rem,2vw,.7rem)',
                    letterSpacing: '2px',
                    transition: 'all .35s ease',
                    boxShadow: `0 2px 20px rgba(0,0,0,.5), 0 0 0 1px rgba(0,0,0,.2)`,
                    whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                    const b = e.currentTarget;
                    b.style.color = info.col;
                    b.style.borderColor = `${info.col}66`;
                    b.style.background = 'rgba(0,0,0,.5)';
                    b.style.boxShadow = `0 0 20px ${info.col}22`;
                }}
                onMouseLeave={e => {
                    const b = e.currentTarget;
                    b.style.color = `${info.col}88`;
                    b.style.borderColor = `${info.col}28`;
                    b.style.background = 'rgba(0,0,0,.32)';
                    b.style.boxShadow = '0 0 12px rgba(0,0,0,.4)';
                }}
            >
                {/* Sacred lotus-close glyph */}
                <span style={{ fontSize: '.9rem', lineHeight: 1, opacity: .75 }}>🪷</span>
                <span>Pause Journey</span>
            </button>

            <style>{`@keyframes omP{0%,100%{transform:scale(1) rotate(-2deg);opacity:.7}50%{transform:scale(1.2) rotate(2deg);opacity:1}}@keyframes omL{0%,100%{transform:scaleX(.5);opacity:.2}50%{transform:scaleX(1);opacity:.55}}`}</style>
        </div>
    );
}

// ═══════════════════════════════════════════════════════
//  ROOT
// ═══════════════════════════════════════════════════════
export default function LeelaCanvas() {
    const [state, setState] = useState<'menu' | 'playing' | 'done'>('menu');
    const [profile, setProfile] = useState<SessionProfile | null>(null);
    const [total, setTotal] = useState(600);
    const [rem, setRem] = useState(600);
    const [phase, setPhase] = useState(0);
    const [opacity, setOpacity] = useState(0);
    const [breathSc, setBreathSc] = useState(1.0);
    const [breathPh, setBreathPh] = useState<'in' | 'out'>('out');
    const [mouse, setMouse] = useState({ x: 0, y: 0 });
    const audioRef = useRef<any>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const mv = (e: MouseEvent) => setMouse({ x: (e.clientX / window.innerWidth - .5) * 2, y: (e.clientY / window.innerHeight - .5) * 2 });
        window.addEventListener('mousemove', mv); return () => window.removeEventListener('mousemove', mv);
    }, []);
    useEffect(() => { if (state !== 'playing') return; const id = setInterval(() => setBreathPh(p => p === 'in' ? 'out' : 'in'), 4000); return () => clearInterval(id); }, [state]);
    useEffect(() => {
        const t = breathPh === 'in' ? 1.1 : .93; let r: number;
        const tick = () => setBreathSc(s => { const n = s + (t - s) * .022; if (Math.abs(n - t) < .001) return t; r = requestAnimationFrame(tick); return n; });
        r = requestAnimationFrame(tick); return () => cancelAnimationFrame(r);
    }, [breathPh]);

    const handleBegin = useCallback((prof: SessionProfile) => {
        setProfile(prof);
        const secs = prof.mins * 60;
        setTotal(secs); setRem(secs); setState('playing');

        // Fire audio immediately — no awaiting
        bootAudio(prof).then(a => { audioRef.current = a; }).catch(console.warn);

        // Fast fade-in — full brightness in ~300ms
        let op = 0;
        const fi = setInterval(() => { op = Math.min(prof.brightness, op + .06); setOpacity(op); if (op >= prof.brightness) clearInterval(fi); }, 20);

        let left = secs;
        timerRef.current = setInterval(() => {
            left--;
            setRem(left);
            const ph = Math.min(2, Math.floor(((secs - left) / secs) * 3));
            setPhase(prev => { if (prev !== ph) { try { audioRef.current?.switchPhase(ph); } catch { } } return ph; });
            if (left <= 10 && left > 0) {
                try { audioRef.current?.fadeOut(10); } catch { }
                let fo = prof.brightness; const fout = setInterval(() => { fo = Math.max(0, fo - .01); setOpacity(fo); if (fo <= 0) clearInterval(fout); }, 100);
            }
            if (left <= 0) { clearInterval(timerRef.current!); setState('done'); try { audioRef.current?.cleanup(); } catch { }; }
        }, 1000);
    }, []);

    const handleExit = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        try { audioRef.current?.fadeOut(1.2); } catch { }
        let fo = opacity;
        const fout = setInterval(() => { fo = Math.max(0, fo - 0.06); setOpacity(fo); if (fo <= 0) { clearInterval(fout); try { audioRef.current?.cleanup(); } catch { } setState('menu'); setPhase(0); setProfile(null); } }, 25);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [opacity]);

    useEffect(() => () => {
        if (timerRef.current) clearInterval(timerRef.current);
        try { audioRef.current?.cleanup(); } catch { };
    }, []);

    return (
        <div style={{ position: 'fixed', inset: 0, background: '#010006', userSelect: 'none' }}>

            {/* Canvas PRE-MOUNTED always — shaders compile during menu,
                so when user clicks, visuals appear instantly              */}
            <Canvas
                style={{ position: 'absolute', inset: 0, pointerEvents: state === 'menu' ? 'none' : 'auto' }}
                camera={{ position: [0, 0, 3.2], fov: 78 }}
                gl={{
                    alpha: false, antialias: false, stencil: false, depth: true,
                    toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15
                }}
                dpr={[1, 1.5]}
            >
                <Scene phaseIdx={phase} opacity={opacity} breathScale={breathSc} mouse={mouse} profile={profile} />
            </Canvas>

            {state === 'menu' && <SankalpaScreen onBegin={handleBegin} />}
            {state === 'playing' && <HUD rem={rem} total={total} ph={phase} profile={profile} onExit={handleExit} />}

            {state === 'done' && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 40, background: 'rgba(1,0,6,.97)', backdropFilter: 'blur(14px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', fontFamily: "'Cinzel',serif", animation: 'dfi 2s ease' }}>
                    <div style={{ fontSize: '4rem', color: '#FFD700', textShadow: '0 0 40px #FFD700', fontFamily: 'serif' }}>ॐ</div>
                    <p style={{ color: 'rgba(255,215,0,.8)', letterSpacing: '4px', fontSize: '.9rem', textTransform: 'uppercase' }}>Your journey is complete</p>
                    <p style={{ color: 'rgba(200,180,255,.35)', fontSize: '.62rem', letterSpacing: '2px' }}>Carry the flame within</p>
                    <button onClick={() => { setState('menu'); setPhase(0); setOpacity(0); setProfile(null); }} style={{ marginTop: '1rem', padding: '.6rem 2rem', background: 'rgba(255,215,0,.08)', border: '1px solid rgba(255,215,0,.22)', borderRadius: '100px', color: 'rgba(255,215,0,.65)', cursor: 'pointer', fontFamily: "'Cinzel',serif", letterSpacing: '2px', fontSize: '.75rem' }}>Return to Sankalpa</button>
                    <style>{`@keyframes dfi{from{opacity:0}to{opacity:1}}`}</style>
                </div>
            )}
        </div>
    );
}
