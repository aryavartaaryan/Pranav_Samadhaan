'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './DailyInsightsCarousel.module.css';



// ── Vedic Panchang computation ─────────────────────────────────────────────────
const TITHI = ['Pratipada', 'Dvitīyā', 'Tṛtīyā', 'Caturthī', 'Pañcamī', 'Ṣaṣṭhī', 'Saptamī', 'Aṣṭamī', 'Navamī', 'Daśamī', 'Ekādaśī', 'Dvādaśī', 'Trayodaśī', 'Caturdaśī', 'Paurṇimā / Amāvāsyā'];
const TITHI_HI = ['प्रतिपदा', 'द्वितीया', 'तृतीया', 'चतुर्थी', 'पञ्चमी', 'षष्ठी', 'सप्तमी', 'अष्टमी', 'नवमी', 'दशमी', 'एकादशी', 'द्वादशी', 'त्रयोदशी', 'चतुर्दशी', 'पूर्णिमा / अमावस्या'];
const PAKSHA = ['Śukla Pakṣa', 'Kṛṣṇa Pakṣa'];
const PAKSHA_HI = ['शुक्ल पक्ष', 'कृष्ण पक्ष'];
const MASA = ['Caitra', 'Vaiśākha', 'Jyeṣṭha', 'Āṣāḍha', 'Śrāvaṇa', 'Bhādrapada', 'Āśvina', 'Kārtika', 'Mārgaśīrṣa', 'Pauṣa', 'Māgha', 'Phālguna'];
const MASA_HI = ['चैत्र', 'वैशाख', 'ज्येष्ठ', 'आषाढ', 'श्रावण', 'भाद्रपद', 'आश्विन', 'कार्तिक', 'मार्गशीर्ष', 'पौष', 'माघ', 'फाल्गुन'];
const VARA = ['Ravivāra', 'Somavāra', 'Maṅgalavāra', 'Budhavāra', 'Guruvāra', 'Śukravāra', 'Śanivāra'];
const VARA_HI = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];

function getPanchang(date: Date) {
    const newMoon = new Date('2000-01-06T18:14:00Z').getTime();
    const lunation = 29.53058867 * 86400000;
    const age = ((date.getTime() - newMoon) % lunation + lunation) % lunation;
    // Tithi index from 0 to 29 (day of lunar month)
    const ageIdx = Math.floor((age / lunation) * 30);
    // paksha: 0 is Sukla (bright), 1 is Krishna (dark)
    const paksha = ageIdx < 15 ? 0 : 1;
    let tithiIdx = ageIdx % 15;

    // On the 14th index, split behavior based on Paksha
    let tithi = TITHI[tithiIdx];
    let tithiHi = TITHI_HI[tithiIdx];
    if (tithiIdx === 14) {
        tithi = paksha === 0 ? 'Paurṇimā' : 'Amāvāsyā';
        tithiHi = paksha === 0 ? 'पूर्णिमा' : 'अमावस्या';
    }

    const masaIdx = Math.floor((age / lunation * 12)) % 12;
    const vara = date.getDay();
    return { tithi, tithiHi, paksha: PAKSHA[paksha], pakshaHi: PAKSHA_HI[paksha], masa: MASA[masaIdx], masaHi: MASA_HI[masaIdx], vara: VARA[vara], varaHi: VARA_HI[vara] };
}

// ── Festival detection (Gregorian approximation for major festivals) ──────────
interface Festival { name: string; nameHi: string; emoji: string; description: string; color: string; }

function getTodayFestival(date: Date): Festival | null {
    const m = date.getMonth() + 1; // 1-12
    const d = date.getDate();

    // Key fixed-date Hindu festivals (Gregorian approximations — some are lunar so ±1 day)
    const FESTIVALS: { m: number; d: number; fest: Festival }[] = [
        { m: 1, d: 14, fest: { name: 'Makar Saṅkrānti', nameHi: 'मकर संक्रांति', emoji: '🌤️', description: 'The sun enters Capricorn — a day of light, harvest and new beginnings.', color: '255,165,30' } },
        { m: 1, d: 15, fest: { name: 'Pongal', nameHi: 'पोंगल', emoji: '🍚', description: 'The great harvest festival of the South — gratitude to Sun, rain and cattle.', color: '255,165,30' } },
        { m: 2, d: 14, fest: { name: 'Vasanta Pañcamī', nameHi: 'वसंत पंचमी', emoji: '🌸', description: 'The goddess Sarasvatī is worshipped — invoke wisdom and the arts today.', color: '255,220,80' } },
        { m: 2, d: 26, fest: { name: 'Mahāśivarātri 2026', nameHi: 'महाशिवरात्रि', emoji: '🕉️', description: 'The great night of Śiva — meditation, devotion and inner transformation.', color: '140,100,255' } },
        { m: 3, d: 14, fest: { name: 'Holī', nameHi: 'होली', emoji: '🎨', description: 'The festival of colours — celebrating the victory of devotion over ego.', color: '255,80,180' } },
        { m: 3, d: 25, fest: { name: 'Gudi Pādvā / Ugādi', nameHi: 'गुड़ी पड़वा', emoji: '🌅', description: 'Vedic New Year — the sky, the earth and your spirit begin fresh today.', color: '90,210,150' } },
        { m: 4, d: 6, fest: { name: 'Rāma Navamī', nameHi: 'राम नवमी', emoji: '🏹', description: 'Birthday of Śrī Rāma — the ideal of dharma, courage and compassion.', color: '255,140,30' } },
        { m: 4, d: 14, fest: { name: 'Baisakhi / Viṣhu', nameHi: 'बैसाखी / विषु', emoji: '🌾', description: 'The solar New Year — celebrated as a festival of harvest and renewal.', color: '90,200,80' } },
        { m: 5, d: 12, fest: { name: 'Akṣaya Tṛtīyā', nameHi: 'अक्षय तृतीया', emoji: '✨', description: 'The inexhaustible third — all auspicious actions begun today endure.', color: '255,200,60' } },
        { m: 7, d: 10, fest: { name: 'Guru Pūrṇimā', nameHi: 'गुरु पूर्णिमा', emoji: '🙏', description: 'Full moon of the Guru — honour all teachers who lit the path for you.', color: '255,200,100' } },
        { m: 8, d: 16, fest: { name: 'Rakṣā Bandhana', nameHi: 'रक्षा बंधन', emoji: '🪢', description: 'The sacred thread of protection — the bond of love between siblings.', color: '255,140,180' } },
        { m: 8, d: 20, fest: { name: 'Janmāṣṭamī', nameHi: 'जन्माष्टमी', emoji: '🦚', description: 'The birth of Śrī Kṛṣṇa — the divine playfulness and infinite love.', color: '80,160,255' } },
        { m: 9, d: 7, fest: { name: 'Gaṇeśa Caturthī', nameHi: 'गणेश चतुर्थी', emoji: '🐘', description: 'The arrival of Gaṇeśa — remover of all obstacles, lord of beginnings.', color: '255,165,30' } },
        { m: 10, d: 2, fest: { name: 'Navarātri begins', nameHi: 'नवरात्रि', emoji: '🔱', description: 'Nine nights of the divine feminine — Durgā, Lakṣmī and Sarasvatī.', color: '220,80,80' } },
        { m: 10, d: 12, fest: { name: 'Vijayādaśamī / Daśahrā', nameHi: 'विजयादशमी', emoji: '🏹', description: 'Victory of dharma — the day Rāma defeated Rāvaṇa, light over darkness.', color: '255,130,30' } },
        { m: 10, d: 20, fest: { name: 'Dīpāvalī', nameHi: 'दीपावली', emoji: '🪔', description: 'The festival of lights — every lamp lit is a victory over inner darkness.', color: '255,200,60' } },
        { m: 11, d: 5, fest: { name: 'Bhāī Dūj', nameHi: 'भाई दूज', emoji: '💫', description: 'The bond between siblings — Yamunā welcomes Yama with love and flowers.', color: '255,165,100' } },
        { m: 11, d: 24, fest: { name: 'Kārtika Pūrṇimā', nameHi: 'कार्तिक पूर्णिमा', emoji: '🌕', description: 'The holiest full moon — Viṣṇu, Śiva and Guru are all honoured today.', color: '255,230,140' } },
        { m: 12, d: 25, fest: { name: 'Dhanu Saṅkrānti', nameHi: 'धनु संक्रांति', emoji: '🏹', description: 'The sun enters Sagittarius — a sacred transition in the divine calendar.', color: '255,130,60' } },
    ];

    const found = FESTIVALS.find(f => f.m === m && f.d === d);
    return found?.fest ?? null;
}

// ── Wisdom cards ───────────────────────────────────────────────────────────────
const WISDOM = [
    { sanskrit: 'सर्वे भवन्तु सुखिनः', transliteration: 'Sarve Bhavantu Sukhinah', meaning: 'May all beings be happy. May all beings be free from illness.', emoji: '🪷', bg: 'rgba(214, 141, 58, 0.18)' },
    { sanskrit: 'तत् त्वम् असि', transliteration: 'Tat Tvam Asi', meaning: 'Thou art That. Your true self is one with the universal consciousness.', emoji: '🌅', bg: 'rgba(100, 216, 203, 0.15)' },
    { sanskrit: 'अहं ब्रह्मास्मि', transliteration: 'Aham Brahmasmi', meaning: 'I am Brahman — the infinite, the light, the divine itself.', emoji: '✨', bg: 'rgba(155, 140, 255, 0.15)' },
    { sanskrit: 'योगः कर्मसु कौशलम्', transliteration: 'Yogaḥ Karmasu Kauśalam', meaning: 'Excellence in action is yoga. Do every task with your whole being.', emoji: '🌿', bg: 'rgba(90, 200, 130, 0.15)' },
    { sanskrit: 'ॐ शान्तिः शान्तिः शान्तिः', transliteration: 'Om Shanti Shanti Shantih', meaning: 'Peace in body, peace in mind, peace in spirit.', emoji: '🕊️', bg: 'rgba(255, 255, 255, 0.12)' },
    { sanskrit: 'प्राणायामो हि परमो धर्मः', transliteration: 'Prāṇāyāmo hi Paramo Dharmaḥ', meaning: 'Breath regulation is the highest virtue. Your breath is your anchor.', emoji: '🌬️', bg: 'rgba(214, 141, 58, 0.16)' },
];

function getTodaySeed() {
    const now = new Date();
    return now.getFullYear() * 1000 + Math.floor(
        (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(now.getFullYear(), 0, 0)) / 86400000
    );
}

// ── Components ─────────────────────────────────────────────────────────────────

/** Individual card with solid/translucent background */
function InsightCard({ bg, children, delay = 0 }: { bg: string; children: React.ReactNode; delay?: number }) {
    return (
        <motion.article
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay, duration: 0.55, ease: 'easeOut' }}
            style={{
                position: 'relative', flexShrink: 0,
                width: 'clamp(310px, 85vw, 400px)',
                minHeight: '190px',
                borderRadius: '1.4rem', overflow: 'hidden',
                background: bg,
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.30)',
                cursor: 'default',
            }}
        >
            {/* Content */}
            <div style={{ position: 'relative', zIndex: 2, padding: 'clamp(1.4rem,4vw,1.8rem)', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100%' }}>
                {children}
            </div>
        </motion.article>
    );
}

/** Panchang card — Tithi, Vaar, Paksha, Maas */
function PanchangCard({ bg, festival, delay = 0 }: { bg: string; festival: Festival | null; delay?: number }) {
    const today = new Date();
    const p = getPanchang(today);
    const dateStr = today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <InsightCard bg={bg} delay={delay}>
            {/* Festival banner if applicable */}
            {festival && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: delay + 0.35, duration: 0.5 }}
                    style={{ marginBottom: '0.8rem', background: `rgba(${festival.color},0.18)`, border: `1px solid rgba(${festival.color},0.40)`, borderRadius: 12, padding: '0.42rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                    <span style={{ fontSize: '1.0rem' }}>{festival.emoji}</span>
                    <div>
                        <p style={{ margin: 0, fontSize: '0.52rem', letterSpacing: '0.16em', fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase', color: `rgba(${festival.color},0.90)` }}>Today · Festival</p>
                        <p style={{ margin: 0, fontFamily: "'Playfair Display', Georgia, serif", fontSize: '0.80rem', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{festival.name}</p>
                    </div>
                </motion.div>
            )}

            {/* Eyebrow */}
            <p style={{ margin: '0 0 0.10rem', fontSize: '0.48rem', letterSpacing: '0.24em', fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(251,191,36,0.70)' }}>
                ✦ Pañcāṅga · {dateStr}
            </p>

            {/* Sanskrit date display */}
            <p style={{ margin: '0 0 0.50rem', fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.05rem,3.2vw,1.25rem)', fontWeight: 700, color: '#fff', lineHeight: 1.2, textShadow: '0 2px 12px rgba(251,191,36,0.40)' }}>
                {p.pakshaHi} · {p.tithiHi}
            </p>

            {/* Panchang row */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.22rem' }}>
                {[
                    { label: 'Vāra', value: p.vara, hi: p.varaHi },
                    { label: 'Tithi', value: p.tithi, hi: p.tithiHi },
                    { label: 'Pakṣa', value: p.paksha, hi: p.pakshaHi },
                    { label: 'Māsa', value: p.masa, hi: p.masaHi },
                ].map(row => (
                    <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ width: 38, flexShrink: 0, fontSize: '0.44rem', letterSpacing: '0.14em', fontFamily: 'monospace', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>{row.label}</span>
                        <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.78)', fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic' }}>{row.value}</span>
                        <span style={{ fontSize: '0.56rem', color: 'rgba(251,191,36,0.55)', fontFamily: 'monospace', marginLeft: 'auto' }}>{row.hi}</span>
                    </div>
                ))}
            </div>

            {/* Festival description */}
            {festival && (
                <p style={{ margin: '0.65rem 0 0', fontSize: '0.62rem', color: 'rgba(255,255,255,0.52)', fontStyle: 'italic', lineHeight: 1.55 }}>{festival.description}</p>
            )}
        </InsightCard>
    );
}

/** Wisdom / Sanskrit mantra card */
function WisdomCard({ card, bg, delay = 0 }: { card: typeof WISDOM[0]; bg: string; delay?: number }) {
    return (
        <InsightCard bg={bg} delay={delay}>
            <span style={{ fontSize: '1.6rem', display: 'block', marginBottom: '0.55rem', filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.35))' }}>{card.emoji}</span>
            <p style={{ margin: '0 0 0.14rem', fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(0.88rem,2.8vw,1.05rem)', fontWeight: 700, color: '#fff', lineHeight: 1.2, textShadow: '0 1px 10px rgba(0,0,0,0.80)' }}>{card.sanskrit}</p>
            <p style={{ margin: '0 0 0.50rem', fontSize: '0.52rem', letterSpacing: '0.12em', fontFamily: 'monospace', color: 'rgba(251,191,36,0.70)', textTransform: 'uppercase' }}>{card.transliteration}</p>
            <p style={{ margin: 0, fontSize: 'clamp(0.60rem,1.8vw,0.72rem)', color: 'rgba(255,255,255,0.60)', lineHeight: 1.58, fontStyle: 'italic' }}>{card.meaning}</p>
        </InsightCard>
    );
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function DailyInsightsCarousel() {
    const seed = getTodaySeed();
    const today = new Date();
    const festival = getTodayFestival(today);

    // Ordered wisdom cards (stable daily rotation)
    const orderedWisdom = [
        ...WISDOM.slice(seed % WISDOM.length),
        ...WISDOM.slice(0, seed % WISDOM.length),
    ];

    // Panchang goes in the second block (index 1 visually)
    const firstWisdom = orderedWisdom[0];
    const restWisdom = orderedWisdom.slice(1);

    return (
        <section aria-label="Daily Insights" style={{ padding: '0 0 0.5rem' }}>
            {/* Section label */}
            <div style={{ paddingLeft: '1rem', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.48rem', letterSpacing: '0.28em', fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(251,191,36,0.55)' }}>✦ Daily Insights</span>
                {festival && (
                    <motion.span initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
                        style={{ fontSize: '0.48rem', letterSpacing: '0.16em', fontFamily: 'monospace', color: `rgba(${festival.color},0.80)`, background: `rgba(${festival.color},0.10)`, border: `1px solid rgba(${festival.color},0.25)`, borderRadius: 999, padding: '0.15rem 0.50rem', textTransform: 'uppercase' }}>
                        {festival.emoji} {festival.name}
                    </motion.span>
                )}
            </div>

            {/* Scrollable track */}
            <div style={{ display: 'flex', gap: '0.85rem', overflowX: 'auto', paddingLeft: '1rem', paddingRight: '1rem', paddingBottom: '0.5rem', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
                className="hide-scrollbar">

                {/* 1. First Wisdom card */}
                {firstWisdom && (
                    <WisdomCard card={firstWisdom} bg={firstWisdom.bg} delay={0} />
                )}

                {/* 2. Panchang card — placed SECOND */}
                <PanchangCard bg="rgba(251,191,36,0.12)" festival={festival} delay={0.07} />

                {/* 3. The rest of the Wisdom cards */}
                {restWisdom.map((card, i) => (
                    <WisdomCard key={card.transliteration} card={card} bg={card.bg} delay={(i + 2) * 0.07} />
                ))}
            </div>
        </section>
    );
}
