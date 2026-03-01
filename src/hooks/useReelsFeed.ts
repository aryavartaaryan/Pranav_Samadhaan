'use client';

/**
 * useReelsFeed — Unified data pipeline for the PranaVerse Vibes feed.
 *
 * Feed order:
 *  [0] Sankalpa interactive checklist reel
 *  [1..N] Interleaved: (video, mantra, video, mantra, …)
 *         Once videos run out → remaining mantras
 *         Once all done → repeat from mantra pool only
 */

export type ReelItem =
    | { id: string; type: 'sankalpa' }
    | {
        id: string;
        type: 'mantra';
        src: string;
        dualSrc?: string;
        title: string;
        likes: number;
        persistAudio?: boolean;
    }
    | {
        id: string;
        type: 'video';
        src: string;
        title: string;
        likes: number;
    };

// ─── Mantra Tracks ─────────────────────────────────────────────────────────────
const MANTRA_TRACKS: (Omit<ReelItem & { type: 'mantra' }, 'type'>)[] = [
    {
        id: 'fusion', title: 'SuperFusion', likes: 1008,
        src: 'https://ik.imagekit.io/rcsesr4xf/flute.mp3?updatedAt=1771983487495',
        dualSrc: 'https://ik.imagekit.io/rcsesr4xf/sitar.mp3?updatedAt=1771983562343',
        persistAudio: false,
    },
    {
        id: 'gayatri', title: 'Gayatri Ghanpaath', likes: 248,
        src: 'https://ik.imagekit.io/rcsesr4xf/gayatri-mantra-ghanpaath.mp3',
        persistAudio: false,
    },
    {
        id: 'lalitha', title: 'Lalitha Sahasranamam', likes: 312,
        src: 'https://ik.imagekit.io/rcsesr4xf/Lalitha-Sahasranamam.mp3',
        persistAudio: false,
    },
    {
        id: 'shiva', title: 'Shiva Tandava Stotram', likes: 521,
        src: 'https://ik.imagekit.io/rcsesr4xf/Shiva-Tandav.mp3',
        persistAudio: true,
    },
    {
        id: 'brahma-yagya', title: 'Brahma Yagya', likes: 189,
        src: 'https://ik.imagekit.io/aup4wh6lq/BrahmaYagya.mp3',
        persistAudio: false,
    },
    {
        id: 'brahma-yagya-kanya', title: 'Brahma Yagya Kanya', likes: 214,
        src: 'https://ik.imagekit.io/aup4wh6lq/BrahmaYagyaKanya.mp3',
        persistAudio: false,
    },
    {
        id: 'shanti', title: 'Shanti Path', likes: 403,
        src: 'https://ik.imagekit.io/rcsesr4xf/shanti-path.mp3',
        persistAudio: true,
    },
    {
        id: 'dainik', title: 'Dainik Agnihotra', likes: 167,
        src: 'https://ik.imagekit.io/aup4wh6lq/DainikAgnihotra.mp3?updatedAt=1771246817070',
        persistAudio: false,
    },
];

// ─── Video Tracks (from dhyan-kshetra assets) ─────────────────────────────────
const VIDEO_TRACKS: (Omit<ReelItem & { type: 'video' }, 'type'>)[] = [
    {
        id: 'v-vishesh', title: 'Vishnu Sahasranamam (Vishesh)', likes: 445,
        src: 'https://ik.imagekit.io/aup4wh6lq/VISHNU%20SAHASRANAMAM%20_%20Madhubanti%20Bagchi%20%26%20Siddharth%20Bhavsar%20_%20Stotra%20For%20Peace%20%26%20Divine%20Blessings.mp4',
    },
    {
        id: 'v-maheshvara', title: 'Maheshvara Sutram — The Primal Sound', likes: 388,
        src: 'https://ik.imagekit.io/aup4wh6lq/Most%20powerful%20Maheshvara%20Su%CC%84tram%20_%20the%20primal%20sound%20of%20creation.%E0%A4%AE%E0%A4%BE%E0%A4%B9%E0%A5%87%E0%A4%B6%E0%A5%8D%E0%A4%B5%E0%A4%B0%20%E0%A4%B8%E0%A5%82%E0%A4%A4%E0%A5%8D%E0%A4%B0%E0%A4%AE%E0%A5%8D%20_%20%E0%A4%9C%E0%A4%BF%E0%A4%B8%E0%A4%B8%E0%A5%87%20%E0%A4%B8%E0%A4%AE%E0%A5%8D%E0%A4%AA%E0%A5%82%E0%A4%B0%E0%A5%8D%E0%A4%A3.mp4',
    },
    {
        id: 'v-shiv-shakti', title: 'Shiv Shakti Energy', likes: 612,
        src: 'https://ik.imagekit.io/aup4wh6lq/Just%20feel%20the%20energy%20____Follow%20@fmccreators%20for%20more_%E0%A4%B9%E0%A4%B0%20%E0%A4%B9%E0%A4%B0%20%E0%A4%AE%E0%A4%B9%E0%A4%BE%E0%A4%A6%E0%A5%87%E0%A4%B5%20__%E0%A4%9C%E0%A4%AF%20%E0%A4%B6%E0%A4%82%E0%A4%95%E0%A4%B0%20___Do%20like.mp4',
    },
    {
        id: 'v-ardhanarishwara', title: 'Ardhanarishwara — The Half-Woman Lord', likes: 501,
        src: 'https://ik.imagekit.io/aup4wh6lq/The%20_Lord%20who%20is%20half%20woman_%20signifies%20the%20perfect%20synthesis%20of%20masculine%20and%20feminine%20energies,.mp4',
    },
    {
        id: 'v-kaal-bhairav', title: 'Kaal Bhairav Ashtakam', likes: 334,
        src: 'https://ik.imagekit.io/aup4wh6lq/Kaal%20Bhairav%20Ashtakam%20_%20Tanuku%20Sisters%20_%20@DivineDharohar.mp4',
    },
];

// ─── Feed Builder ──────────────────────────────────────────────────────────────
/**
 * Builds the interleaved feed:
 *   [sankalpa] [video₀, mantra₀, video₁, mantra₁ … ] [remaining mantras]
 *
 * After videos run out, all remaining mantras are appended in order.
 */
export function buildReelsFeed(): ReelItem[] {
    const sankalpa: ReelItem = { id: 'sankalpa-0', type: 'sankalpa' };

    const videos: ReelItem[] = VIDEO_TRACKS.map(t => ({ ...t, type: 'video' as const }));
    const mantras: ReelItem[] = MANTRA_TRACKS.map(t => ({ ...t, type: 'mantra' as const }));

    const interleaved: ReelItem[] = [];
    const pairs = Math.min(videos.length, mantras.length);

    for (let i = 0; i < pairs; i++) {
        interleaved.push(videos[i]);
        interleaved.push(mantras[i]);
    }

    // Append any leftover videos (unlikely but safe)
    const remainingVideos = videos.slice(pairs);
    // Append all remaining mantras after videos run out
    const remainingMantras = mantras.slice(pairs);

    return [sankalpa, ...interleaved, ...remainingVideos, ...remainingMantras];
}

/** Convenience hook — static, no API calls */
export function useReelsFeed(): ReelItem[] {
    return buildReelsFeed();
}
