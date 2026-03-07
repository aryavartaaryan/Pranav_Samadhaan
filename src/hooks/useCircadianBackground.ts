'use client';

import { useState, useEffect } from 'react';

// ─── Vibe Phases ──────────────────────────────────────────────────────────────
export type VibeName = 'dawn' | 'day' | 'dusk' | 'night';

export interface VibePhase {
    name: VibeName;
    label: string;
    tagline: string;
    query: string;
    tint: string;          // overlay rgba value
    accentHex: string;     // for text/glow accents
    fallbackUrl: string;   // offline fallback
}

const PHASES: Record<VibeName, VibePhase> = {
    dawn: {
        name: 'dawn',
        label: 'Dawn',
        tagline: 'Brahma Muhurta · A new beginning rises',
        query: 'sunrise morning mist calm lake dawn landscape no people',
        tint: 'rgba(10, 5, 25, 0.45)',
        accentHex: '#FFB86C',
        fallbackUrl:
            'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1080&q=85&auto=format&fit=crop',
    },
    day: {
        name: 'day',
        label: 'Day',
        tagline: 'Madhyana · Active, Vibrant, Focused',
        query: 'majestic mountains green forest clear sky zen nature landscape no people',
        tint: 'rgba(5, 15, 35, 0.38)',
        accentHex: '#64D8CB',
        fallbackUrl:
            'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1080&q=85&auto=format&fit=crop',
    },
    dusk: {
        name: 'dusk',
        label: 'Dusk',
        tagline: 'Sandhya · Gratitude & reflection',
        query: 'sunset golden hour warm landscape twilight no people no person',
        tint: 'rgba(15, 5, 30, 0.50)',
        accentHex: '#FFD580',
        fallbackUrl:
            'https://images.unsplash.com/photo-1495344517868-8ebaf0a2044a?w=1080&q=85&auto=format&fit=crop',
    },
    night: {
        name: 'night',
        label: 'Night',
        tagline: 'Ratri · Infinite peace · Cosmic connection',
        query: 'night sky milky way dark forest moonlight stars landscape no people',
        tint: 'rgba(0, 2, 12, 0.62)',
        accentHex: '#9B8CFF',
        fallbackUrl:
            'https://images.unsplash.com/photo-1532978379173-523e16f371f6?w=1080&q=85&auto=format&fit=crop',
    },
};

// ── Beautiful hardcoded photo pools (no API key needed) ───────────────────────
// Each slot is a direct Unsplash download URL with fixed IDs — always available
const STATIC_POOLS: Record<'vedic' | 'nature', Record<VibeName, string[]>> = {
    vedic: {
        dawn: [
            'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=1080&q=85&auto=format&fit=crop',  // golden sunrise river
            'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=1080&q=85&auto=format&fit=crop',  // temple sunrise India
            'https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?w=1080&q=85&auto=format&fit=crop',  // himalaya dawn mist
            'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1080&q=85&auto=format&fit=crop',  // golden mountain dawn
            'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1080&q=85&auto=format&fit=crop',  // mountain peak dawn landscape
        ],
        day: [
            'https://images.unsplash.com/photo-1574482620811-1aa16ffe3c82?w=1080&q=85&auto=format&fit=crop',  // lush green mountain valley
            'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1080&q=85&auto=format&fit=crop',  // ancient India temple
            'https://images.unsplash.com/photo-1591017403286-fd8493524e1e?w=1080&q=85&auto=format&fit=crop',  // Jaipur palace sunny
            'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1080&q=85&auto=format&fit=crop',  // majestic mountain zenith
            'https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=1080&q=85&auto=format&fit=crop',  // vibrant forest stream
        ],
        dusk: [
            'https://images.unsplash.com/photo-1537944434965-cf4679d1a598?w=1080&q=85&auto=format&fit=crop',  // Ganga ghat dusk
            'https://images.unsplash.com/photo-1495344517868-8ebaf0a2044a?w=1080&q=85&auto=format&fit=crop',  // warm sunset landscape
            'https://images.unsplash.com/photo-1566438480900-0609be27a4be?w=1080&q=85&auto=format&fit=crop',  // golden hour silhouette
            'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=1080&q=85&auto=format&fit=crop',  // purple twilight horizon
            'https://images.unsplash.com/photo-1518887668165-f9db7c4c4b94?w=1080&q=85&auto=format&fit=crop',  // temple at dusk orange
        ],
        night: [
            'https://images.unsplash.com/photo-1502209524164-acea936639a2?w=1080&q=85&auto=format&fit=crop',  // india lamp night
            'https://images.unsplash.com/photo-1532978379173-523e16f371f6?w=1080&q=85&auto=format&fit=crop',  // milky way forest night
            'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1080&q=85&auto=format&fit=crop',  // dark star field cosmic
            'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?w=1080&q=85&auto=format&fit=crop',  // moonlit lake reflection
            'https://images.unsplash.com/photo-1461696114087-397271a7aedc?w=1080&q=85&auto=format&fit=crop',  // night temple candles
        ],
    },
    nature: {
        dawn: [
            'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=1080&q=85&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1080&q=85&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?w=1080&q=85&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1080&q=85&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1080&q=85&auto=format&fit=crop',  // mountain peak — replaces person photo
        ],
        day: [
            'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1080&q=85&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=1080&q=85&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1080&q=85&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1409557160476-5a3a3a3c5b7e?w=1080&q=85&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1476673160081-cf065607f449?w=1080&q=85&auto=format&fit=crop',
        ],
        dusk: [
            'https://images.unsplash.com/photo-1495344517868-8ebaf0a2044a?w=1080&q=85&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1566438480900-0609be27a4be?w=1080&q=85&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=1080&q=85&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=1080&q=85&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1490750967868-88df5691cc93?w=1080&q=85&auto=format&fit=crop',
        ],
        night: [
            'https://images.unsplash.com/photo-1532978379173-523e16f371f6?w=1080&q=85&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1080&q=85&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?w=1080&q=85&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?w=1080&q=85&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1502209524164-acea936639a2?w=1080&q=85&auto=format&fit=crop',
        ],
    },
};

/** Pick a random URL from a pool (different on each call) */
function pickFromPool(variant: 'vedic' | 'nature', phase: VibeName): string {
    const pool = STATIC_POOLS[variant][phase];
    return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Phase map (IST-correct, morning starts at 3 AM per Brahma Muhurta):
//   3–7   dawn   (Brahma Muhurta → sunrise)
//   7–16  day    (active daytime)
//   16–21 dusk   (golden hour → evening — CLOSES the old 16:00-16:59 night gap)
//   21–3  night  (ratri)
function getVibePhase(hourF: number): VibePhase {
    if (hourF >= 3 && hourF < 7) return PHASES.dawn;
    if (hourF >= 7 && hourF < 16) return PHASES.day;
    if (hourF >= 16 && hourF < 21) return PHASES.dusk;
    return PHASES.night;  // 21:00–02:59
}

const CACHE_KEY_PREFIX = 'circadian_bg_v4_';  // bumped to v4 — busts person-photo cache
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes — refreshes visuals every half hour

function getCached(key: string): string | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const { url, ts }: { url: string; ts: number } = JSON.parse(raw);
        if (Date.now() - ts < CACHE_TTL_MS) return url;
        localStorage.removeItem(key);
    } catch { /* ignore */ }
    return null;
}

function setCache(key: string, url: string) {
    try {
        localStorage.setItem(key, JSON.stringify({ url, ts: Date.now() }));
    } catch { /* ignore */ }
}

// ─── Main Hook ────────────────────────────────────────────────────────────────
export interface CircadianBackground {
    phase: VibePhase;
    imageUrl: string;
    loaded: boolean;
}

// Public Unsplash access key (read-only — safe to embed in client bundles)
const UNSPLASH_ACCESS_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY ?? '';

/**
 * variant = 'nature' (default) — lush nature/ocean for JustVibe
 * variant = 'vedic'  — sacred temples/Himalaya/Ganga for home page Mission card
 */
export function useCircadianBackground(variant: 'nature' | 'vedic' = 'nature'): CircadianBackground {
    // NOTE: phase is derived from wall-clock time — this runs on server too,
    // but it is deterministic (same hour = same phase) so no mismatch here.
    const hour = new Date().getHours() + new Date().getMinutes() / 60;
    const phase = getVibePhase(hour);

    const queryStr = variant === 'nature' ? phase.query : (
        phase.name === 'dawn' ? 'himalaya sunrise sacred temple morning golden spiritual' :
            phase.name === 'day' ? 'ancient temple india sun forest sacred vibrant' :
                phase.name === 'dusk' ? 'ganga river ghats dusk golden india spiritual sunset' :
                    'india himalaya night stars milky way traditional lamp'
    );

    const cacheKey = `${CACHE_KEY_PREFIX}${variant}_${phase.name}`;

    // ⚠️  Do NOT call Math.random() in useState initializer — it runs on the
    // server during SSR and returns a different value on the client, causing
    // a React hydration mismatch.  Start with an empty string (safe for SSR)
    // and populate via useEffect (client-only).
    const [imageUrl, setImageUrl] = useState<string>('');
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function fetchImage() {
            // 1. Try localStorage cache first (instant, client-only)
            const cached = getCached(cacheKey);
            if (cached) {
                if (!cancelled) { setImageUrl(cached); setLoaded(true); }
                return;
            }

            // 2. Try Unsplash API
            if (UNSPLASH_ACCESS_KEY) {
                try {
                    const url = new URL('https://api.unsplash.com/photos/random');
                    url.searchParams.set('query', queryStr);
                    url.searchParams.set('orientation', 'landscape');
                    url.searchParams.set('content_filter', 'high');
                    url.searchParams.set('client_id', UNSPLASH_ACCESS_KEY);

                    const res = await fetch(url.toString());
                    if (res.ok) {
                        const data = await res.json();
                        const photoUrl: string =
                            data?.urls?.regular ?? data?.urls?.full ?? '';
                        if (photoUrl && !cancelled) {
                            setCache(cacheKey, photoUrl);
                            setImageUrl(photoUrl);
                            setLoaded(true);
                            return;
                        }
                    }
                } catch { /* fall through to hardcoded pool */ }
            }

            // 3. Hardcoded pool fallback — Math.random() is fine here (client-only)
            if (!cancelled) {
                setImageUrl(pickFromPool(variant, phase.name));
                setLoaded(true);
            }
        }

        setLoaded(false);
        fetchImage();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase.name, variant]);

    return { phase, imageUrl, loaded };
}
