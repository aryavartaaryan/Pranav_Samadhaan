'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReelPlayer from '@/components/Dashboard/ReelPlayer';
import { useLanguage } from '@/context/LanguageContext';
import PremiumHeader from '@/components/PremiumHeader/PremiumHeader';
import styles from './page.module.css';


// ════════════════════════════════════════════════════════
//  PANCHANG HELPERS  (moved from home)
// ════════════════════════════════════════════════════════
const VARA_EN = ['Ravivāra', 'Somavāra', 'Maṅgalavāra', 'Budhavāra', 'Guruvāra', 'Śukravāra', 'Śanivāra'];
const PAKSHA_EN = ['Śukla Pakṣa', 'Kṛṣṇa Pakṣa'];
const TITHI_EN = [
    'Pratipada', 'Dvitīyā', 'Tṛtīyā', 'Caturthī', 'Pañcamī', 'Ṣaṣṭhī', 'Saptamī',
    'Aṣṭamī', 'Navamī', 'Daśamī', 'Ekādaśī', 'Dvādaśī', 'Trayodaśī', 'Caturdaśī', 'Pūrṇimā',
];
function getLunarInfo(date: Date) {
    const newMoon = new Date('2000-01-06T18:14:00Z').getTime();
    const lunation = 29.53058867 * 86400000;
    const age = ((date.getTime() - newMoon) % lunation + lunation) % lunation;
    const idx = Math.floor((age / lunation) * 30);
    return { paksha: idx >= 15 ? 1 : 0, tithi: idx % 15 };
}
function fmt12h(h: number, m: number) {
    const p = h >= 12 ? 'PM' : 'AM';
    return { time: `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')}`, period: p };
}
function usePanchang() {
    const [now, setNow] = useState(new Date());
    useEffect(() => { const id = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(id); }, []);
    const { time, period } = fmt12h(now.getHours(), now.getMinutes());
    const vara = VARA_EN[now.getDay()];
    const { paksha, tithi } = getLunarInfo(now);
    const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    return { time, period, vara, paksha: PAKSHA_EN[paksha], tithi: TITHI_EN[tithi], dateStr };
}

// ════════════════════════════════════════════════════════
//  GREETING HELPER — mirrors home page exactly
// ════════════════════════════════════════════════════════
function buildGreeting(lang: 'en' | 'hi', h: number) {
    const isNight = h < 3 || h >= 21;
    const en = isNight
        ? { emoji: '🌙', text: 'Shubh Ratri', period: 'Night Blessings' }
        : h < 12 ? { emoji: '🙏', text: 'Shubhodaya', period: 'Morning Blessings' }
            : h < 17 ? { emoji: '☀️', text: 'Shubh Madhyahna', period: 'Midday Blessings' }
                : { emoji: '🪔', text: 'Shubh Sandhya', period: 'Evening Blessings' };
    const hi = isNight
        ? { emoji: '🌙', text: 'शुभ रात्रि', period: 'रात्रि विश्राम' }
        : h < 12 ? { emoji: '🙏', text: 'शुभोदय', period: 'शुभ प्रभात' }
            : h < 17 ? { emoji: '☀️', text: 'शुभ मध्याह्न', period: 'मध्याह्न वंदना' }
                : { emoji: '🪔', text: 'शुभ सन्ध्या', period: 'सन्ध्या वंदना' };
    return lang === 'hi' ? hi : en;
}


// ════════════════════════════════════════════════════════
//  TYPES
// ════════════════════════════════════════════════════════
type Dosha = 'vata' | 'pitta' | 'kapha';

// ════════════════════════════════════════════════════════
//  AURA CANVAS
// ════════════════════════════════════════════════════════
function drawAura(canvas: HTMLCanvasElement, dosha: Dosha, time: number) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    ctx.clearRect(0, 0, W, H);
    const baseColor = dosha === 'vata' ? '#9d4edd' : dosha === 'pitta' ? '#ff6b35' : '#40916c';
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.48);
    g.addColorStop(0, baseColor + '33'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (dosha === 'vata') {
        for (let a = 0; a < 4; a++) {
            ctx.beginPath();
            for (let i = 0; i < 80; i++) {
                const t = i / 80; const spiral = t * 4 + time * 0.7 + (a / 4) * Math.PI * 2;
                const r = t * W * 0.42 + Math.sin(time * 2 + a) * 4;
                ctx.lineTo(cx + Math.cos(spiral) * r, cy + Math.sin(spiral) * r);
            }
            ctx.strokeStyle = ['#9d4edd', '#c77dff', '#64b5f6', '#00d4ff'][a] + '66'; ctx.lineWidth = 1; ctx.stroke();
        }
    }
    ctx.globalCompositeOperation = 'destination-in';
    const clip = ctx.createRadialGradient(cx, cy, W * 0.28, cx, cy, W * 0.5);
    clip.addColorStop(0, 'rgba(0,0,0,1)'); clip.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = clip; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
}
function AuraCanvas({ dosha }: { dosha: Dosha }) {
    const ref = useRef<HTMLCanvasElement>(null);
    const raf = useRef<number>(0); const t = useRef(0);
    useEffect(() => {
        const c = ref.current; if (!c) return;
        c.width = 180; c.height = 180;
        const loop = () => { t.current += 0.016; drawAura(c, dosha, t.current); raf.current = requestAnimationFrame(loop); };
        raf.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf.current);
    }, [dosha]);
    return <canvas ref={ref} className={styles.auraCanvas} />;
}

// ════════════════════════════════════════════════════════
//  WAVE for Visual Raag posts
// ════════════════════════════════════════════════════════
const BAR_HEIGHTS = [0.35, 0.7, 0.55, 1.0, 0.8, 0.45, 0.65, 0.9, 0.5, 0.75, 1.0, 0.6, 0.85, 0.4, 0.7, 0.55, 0.9, 0.65, 0.45, 0.8, 0.35, 0.7, 0.6, 1.0];
function VisualRaagWave() {
    return (
        <div className={styles.waveBarRow}>
            {BAR_HEIGHTS.map((h, i) => (
                <div key={i} className={styles.waveBar}
                    style={{ height: `${h * 100}%`, '--h': h * 2.2, animationDelay: `${i * 0.05}s`, animationDuration: `${0.9 + h * 0.6}s` } as React.CSSProperties}
                />
            ))}
        </div>
    );
}

// ════════════════════════════════════════════════════════
//  FEED DATA
// ════════════════════════════════════════════════════════
interface User { id: number; handle: string; displayName: string; avatar: string; dosha: Dosha; roles: { label: string; chip: string }[]; bio: string; badge: string; ringClass: string; avatarClass: string; resonances: number; seeds: number; days: number; }
const USERS: User[] = [
    { id: 1, handle: '@Aryan.Creates', displayName: 'Aryan Sharma', avatar: '🧘', dosha: 'vata', roles: [{ label: 'Founder', chip: styles.chipFounder }, { label: 'Vibe Coder', chip: styles.chipCoder }], bio: 'Building conscious tech at the intersection of Vedanta & software. Morning sadhana → late-night code → repeat.', badge: '🌱 Level 7 Seed', ringClass: styles.ringGold, avatarClass: styles.avatarGold, resonances: 4218, seeds: 892, days: 41 },
    { id: 2, handle: '@Lakshmi.Flow', displayName: 'Lakshmi Patel', avatar: '🌿', dosha: 'kapha', roles: [{ label: 'Designer', chip: styles.chipDesigner }, { label: 'Builder', chip: styles.chipBuilder }], bio: 'UX Designer & Sacred Artist. I design products that feel like a deep breath. Nature is my mood board.', badge: '🪷 Level 6 Lotus', ringClass: styles.ringGreen, avatarClass: styles.avatarForest, resonances: 3105, seeds: 641, days: 33 },
    { id: 3, handle: '@Rishi.Dharma', displayName: 'Rishi Iyer', avatar: '🔮', dosha: 'pitta', roles: [{ label: 'Professional', chip: styles.chipFounder }, { label: 'Vedic Learner', chip: styles.chipDesigner }], bio: 'Neuroscientist by day, Vedic astrology student by moonlight. Consciousness is the final frontier.', badge: '✦ Level 5 Star', ringClass: styles.ringPurple, avatarClass: styles.avatarCosmic, resonances: 2788, seeds: 503, days: 28 },
    { id: 4, handle: '@Nisha.Waves', displayName: 'Nisha Varma', avatar: '🌊', dosha: 'kapha', roles: [{ label: 'Builder', chip: styles.chipBuilder }, { label: 'Founder', chip: styles.chipFounder }], bio: 'Sustainable tech founder. We make every byte count for the planet. 40% of our profits plant forests.', badge: '💎 Level 8 Crystal', ringClass: styles.ringBlue, avatarClass: styles.avatarOcean, resonances: 6540, seeds: 1240, days: 67 },
];
interface PostAction { lotus: boolean; cloud: boolean; prism: boolean; seed: boolean; }
interface Post { id: number; type: 'dristi' | 'visualraag' | 'reflect' | 'moment'; bgClass: string; tagClass: string; tagLabel: string; userId: number; caption: string; hashtags: string[]; emoji?: string; lapseCaption?: string; voiceLines?: string[]; quote?: string; quoteSource?: string; likes: number; }
const POSTS: Post[] = [
    { id: 1, type: 'dristi', bgClass: styles.bgGolden, tagClass: styles.tagLapse, tagLabel: '📸 Dristi', userId: 1, caption: 'Watched the sun paint the whole sky. 90-minute golden hour. This is why we wake up early. ✨', hashtags: ['#GoldenHour', '#Sadhana'], emoji: '🌅', lapseCaption: 'golden hour · 5:48 AM', likes: 1284 },
    { id: 2, type: 'visualraag', bgClass: styles.bgForest, tagClass: styles.tagVoice, tagLabel: '🎵 Visual Raag', userId: 2, caption: 'Sharing my morning realization — a voice note on stillness, set to Raag Bhairav.', hashtags: ['#FlowState', '#Mindful'], voiceLines: ['When I stopped trying to be productive this morning, I realised that the creative downloads come', 'not when you chase them — but when you become very, very still.'], likes: 892 },
    { id: 3, type: 'reflect', bgClass: styles.bgCosmic, tagClass: styles.tagReflect, tagLabel: '✦ Reflection', userId: 3, caption: 'This line from Rumi has been living in my chest for three days now.', hashtags: ['#Vedanta', '#Rumi'], emoji: '🪐', quote: '"Yesterday I was clever, I wanted to change the world. Today I am wise, I am changing myself."', quoteSource: '— Rumi', likes: 3401 },
    { id: 4, type: 'moment', bgClass: styles.bgOcean, tagClass: styles.tagOcean, tagLabel: '🌊 Moment', userId: 4, caption: '6 AM beach meditation. The ocean keeps the most honest rhythm.', hashtags: ['#Ocean', '#JustVibe'], emoji: '🌊', likes: 2105 },
];

// ════════════════════════════════════════════════════════
//  RIPPLE
// ════════════════════════════════════════════════════════
function VibedRipple() {
    return (
        <motion.div
            style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,160,23,0.6) 0%, transparent 70%)' }}
            initial={{ scale: 0.3, opacity: 0.9 }} animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
        />
    );
}

// ════════════════════════════════════════════════════════
//  POST CARD
// ════════════════════════════════════════════════════════
function PostCard({ post, onUserClick }: { post: Post; onUserClick: (id: number) => void }) {
    const user = USERS.find(u => u.id === post.userId)!;
    const [actions, setActions] = useState<PostAction>({ lotus: false, cloud: false, prism: false, seed: false });
    const [likeCount, setLikeCount] = useState(post.likes);
    const [ripple, setRipple] = useState(false);
    const tap = useCallback((k: keyof PostAction) => {
        setActions(prev => {
            const next = { ...prev, [k]: !prev[k] };
            if (k === 'lotus') { setLikeCount(c => prev.lotus ? c - 1 : c + 1); if (!prev.lotus) { setRipple(true); setTimeout(() => setRipple(false), 700); } }
            return next;
        });
    }, []);
    return (
        <article className={styles.post}>
            <div className={post.bgClass} />{post.type === 'dristi' && <div className={styles.mist} />}<div className={styles.vignette} />
            <div className={styles.topBar}><span className={styles.wordmark}>JustVibe</span><span className={`${styles.postTypeTag} ${post.tagClass}`}>{post.tagLabel}</span></div>
            {post.type === 'dristi' && (<div className={styles.lapseFrame}><div className={styles.polaroidStack}><div className={styles.polaroidCard} style={{ transform: 'rotate(-4deg)', position: 'absolute', top: -10, left: -12, right: 12, zIndex: 0, opacity: 0.55 }}><div className={styles.polaroidImg} style={{ background: 'linear-gradient(135deg,#a06020,#7a4010)' }}><span style={{ fontSize: '2.5rem' }}>🌄</span></div><p className={styles.polaroidCaption}>5:32 AM</p></div><div className={styles.polaroidCard} style={{ position: 'relative', zIndex: 1 }}><div className={styles.polaroidImg}><span style={{ fontSize: '3rem' }}>{post.emoji}</span></div><p className={styles.polaroidCaption}>{post.lapseCaption}</p></div></div></div>)}
            {post.type === 'visualraag' && (<div className={styles.voiceCard}><div className={styles.voiceHeader}><div className={styles.voiceIcon}>🎵</div><div><div className={styles.voiceTitle}>Visual Raag · Raag Bhairav</div><div className={styles.voiceDuration}>2:14 · 🌿 Dawn Mode</div></div></div><VisualRaagWave /><div className={styles.transcriptCard}><p className={styles.transcriptLine}>{post.voiceLines![0]} <strong>{post.voiceLines![1]}</strong></p></div></div>)}
            {post.type === 'reflect' && (<div className={styles.reflectCard}><div className={styles.reflectSymbol}>{post.emoji}</div><p className={styles.reflectQuote}>{post.quote}</p><span className={styles.reflectSource}>{post.quoteSource}</span></div>)}
            {post.type === 'moment' && (<div className={styles.oceanFrame}><div className={styles.oceanEmoji}>{post.emoji}</div><p className={styles.oceanCaption}>"The ocean doesn't apologise for its depth.<br />Neither should you for yours."</p></div>)}
            <div className={styles.growthStack}>
                {[{ k: 'lotus' as const, on: actions.lotus, onClass: styles.actionIconLotusOn, icon: actions.lotus ? '✨' : '🌊', label: likeCount.toLocaleString() + (actions.lotus ? ' Vibed' : ' Vibe') }, { k: 'cloud' as const, on: actions.cloud, onClass: '', icon: '☁️', label: '218' }, { k: 'prism' as const, on: actions.prism, onClass: styles.actionIconPrismOn, icon: actions.prism ? '💎' : '✦', label: 'Radiate' }, { k: 'seed' as const, on: actions.seed, onClass: styles.actionIconSeedOn, icon: actions.seed ? '🌱' : '🌿', label: actions.seed ? 'Planted' : 'Plant' }].map(item => (
                    <div key={item.k} className={styles.actionItem} onClick={() => tap(item.k)}>
                        <div className={`${styles.actionIcon} ${item.on ? item.onClass : ''}`} style={{ position: 'relative', overflow: 'visible' }}>
                            {item.k === 'lotus' && ripple && <VibedRipple />}<span>{item.icon}</span>
                        </div>
                        <span className={styles.actionCount}>{item.label}</span>
                    </div>
                ))}
            </div>
            <div className={styles.profileZone}>
                <div className={styles.profileRow} onClick={() => onUserClick(user.id)}>
                    <div className={styles.vibeRingWrap}><svg className={styles.vibeRingSvg} viewBox="0 0 66 66"><circle className={`${styles.vibeRingCircle} ${user.ringClass}`} cx="33" cy="33" r="27" strokeDasharray="7 4" /></svg><div className={`${styles.avatarCircle} ${user.avatarClass}`}>{user.avatar}</div></div>
                    <div className={styles.profileInfo}><span className={styles.handle}>{user.handle}</span><div className={styles.badge}>{user.badge}</div></div>
                </div>
                <p className={styles.captionText}>{post.caption}</p>
                <div className={styles.tagPills}>{post.hashtags.map(h => <span key={h} className={styles.pill}>{h}</span>)}</div>
                <button className={styles.connectVibeBtn}><span>〰️</span> Connect with the Vibe</button>
            </div>
            <div className={styles.breathBar}><div className={styles.breathFill} /></div>
        </article>
    );
}

// ════════════════════════════════════════════════════════
//  PROFILE SHEET
// ════════════════════════════════════════════════════════
function ProfileSheet({ user, onClose }: { user: User; onClose: () => void }) {
    return (
        <>
            <div className={styles.overlay} onClick={onClose} />
            <div className={styles.profileSheet}>
                <div className={styles.sheetHandle} />
                <div className={styles.sheetProfile}>
                    <div className={styles.auraAvatarWrap}><AuraCanvas dosha={user.dosha} /></div>
                    <div><div className={styles.sheetName}>{user.displayName}</div><div className={styles.sheetHandle}>{user.handle}</div></div>
                    <div className={styles.sheetRoles}>{user.roles.map(r => <span key={r.label} className={`${styles.roleChip} ${r.chip}`}>{r.label}</span>)}</div>
                </div>
                <p className={styles.sheetBio}>{user.bio}</p>
                <div className={styles.sheetStats}>
                    <div className={styles.statBox}><span className={styles.statVal}>{user.resonances.toLocaleString()}</span><span className={styles.statLbl}>Resonances</span></div>
                    <div className={styles.statBox}><span className={styles.statVal}>{user.seeds.toLocaleString()}</span><span className={styles.statLbl}>Seeds</span></div>
                    <div className={styles.statBox}><span className={styles.statVal}>{user.days}</span><span className={styles.statLbl}>Day Streak</span></div>
                </div>
                <button className={styles.resonateBtn}>〰️ &nbsp;Connect with the Vibe</button>
            </div>
        </>
    );
}

// ════════════════════════════════════════════════════════
//  VIBE MATCH FILTER BAR
// ════════════════════════════════════════════════════════
const FILTERS = ['Everyone', 'Creators', 'Founders', 'Healers', 'Students'];
function VibeMatchBar({ active, setActive }: { active: string; setActive: (v: string) => void }) {
    return (
        <div className={styles.vibeMatchBar}>
            <span className={styles.vibeMatchLabel}>✨ Vibe Match</span>
            <div className={styles.vibeMatchFilters}>
                {FILTERS.map(f => <button key={f} className={`${styles.vibeFilter} ${active === f ? styles.vibeFilterActive : ''}`} onClick={() => setActive(f)}>{f}</button>)}
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════
//  SANKALPA STATE (self-contained in this page)
// ════════════════════════════════════════════════════════
interface Sankalp { id: string; text: string; done: boolean; }
const DEFAULT_SANKALPA: Sankalp[] = [
    { id: '1', text: 'Morning meditation — 20 mins', done: false },
    { id: '2', text: 'Enter Deep Work 9 pm', done: false },
    { id: '3', text: 'Drink copper-vessel water', done: false },
    { id: '4', text: 'Gratitude entry in journal', done: false },
];

// ════════════════════════════════════════════════════════
//  MAIN PAGE — JustVibe with Reels + Feed tabs
// ════════════════════════════════════════════════════════
export default function JustVibePage() {
    const panchangData = usePanchang();
    const { lang } = useLanguage();                    // same context as home page
    const [tab, setTab] = useState<'reels' | 'feed'>('reels');
    const [activeFilter, setActiveFilter] = useState('Everyone');
    const [activeUser, setActiveUser] = useState<User | null>(null);
    // Greeting — identical logic + language to home page
    const [greeting, setGreeting] = useState(() => buildGreeting(lang, new Date().getHours()));
    useEffect(() => { setGreeting(buildGreeting(lang, new Date().getHours())); }, [lang]);

    // Sankalpa — same localStorage key as home → naturally synced on navigation
    const [sankalpaItems, setSankalpaItems] = useState<Sankalp[]>(() => {
        if (typeof window !== 'undefined') {
            try { const s = localStorage.getItem('vedic_sankalpa'); if (s) return JSON.parse(s); } catch { /* ignore */ }
        }
        return DEFAULT_SANKALPA;
    });
    // Real-time sync: if home page writes to localStorage in another tab, pick it up instantly
    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key === 'vedic_sankalpa' && e.newValue) {
                try { setSankalpaItems(JSON.parse(e.newValue)); } catch { /* ignore */ }
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);
    useEffect(() => { localStorage.setItem('vedic_sankalpa', JSON.stringify(sankalpaItems)); }, [sankalpaItems]);
    const handleSankalpaToggle = (id: string) => setSankalpaItems(p => p.map(s => s.id === id ? { ...s, done: !s.done } : s));
    const handleSankalpaRemove = (id: string) => setSankalpaItems(p => p.filter(s => s.id !== id));
    const handleSankalpaAdd = (text: string) => setSankalpaItems(p => [...p, { id: Date.now().toString(), text, done: false }]);

    const handleUserClick = useCallback((id: number) => { const u = USERS.find(u => u.id === id); if (u) setActiveUser(u); }, []);
    const [displayName, setDisplayName] = useState('Traveller');
    useEffect(() => { setDisplayName(localStorage.getItem('vedic_user_name') || 'Traveller'); }, []);

    return (
        <div className={styles.justVibePage}>

            {/* ══ PREMIUM STICKY HEADER ══ */}
            <PremiumHeader
                title="JustVibe"
                subtitle="The Vibe · High-Frequency Feed"
            />

            {/* ══ TAB BAR — Reels | Feed ══ */}
            <div className={styles.tabBar}>
                <button
                    className={`${styles.tabBtn} ${tab === 'reels' ? styles.tabBtnActive : ''}`}
                    onClick={() => setTab('reels')}
                >
                    <span className={styles.tabIcon}>▶</span> Reels
                </button>
                <button
                    className={`${styles.tabBtn} ${tab === 'feed' ? styles.tabBtnActive : ''}`}
                    onClick={() => setTab('feed')}
                >
                    <span className={styles.tabIcon}>⊞</span> Feed
                </button>
            </div>

            {/* ══ TAB CONTENT ══ */}
            <AnimatePresence mode="wait">
                {tab === 'reels' ? (
                    <motion.div
                        key="reels"
                        className={styles.reelPane}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                    >
                        <ReelPlayer
                            greeting={greeting}
                            displayName={displayName}
                            panchangData={panchangData}
                            sankalpaItems={sankalpaItems}
                            onSankalpaToggle={handleSankalpaToggle}
                            onSankalpaRemove={handleSankalpaRemove}
                            onSankalpaAdd={handleSankalpaAdd}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        key="feed"
                        className={styles.feedPane}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                    >
                        <VibeMatchBar active={activeFilter} setActive={setActiveFilter} />
                        <div className={styles.masonryFeed}>
                            {POSTS.map(post => <PostCard key={post.id} post={post} onUserClick={handleUserClick} />)}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Profile sheet */}
            <AnimatePresence>
                {activeUser && (
                    <motion.div key="profile-sheet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <ProfileSheet user={activeUser} onClose={() => setActiveUser(null)} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
