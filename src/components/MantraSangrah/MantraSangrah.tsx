'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Flower2, Play, Pause, X, Sparkles, Heart, Volume2, VolumeX } from 'lucide-react';
import styles from './MantraSangrah.module.css';
import { useLanguage } from '@/context/LanguageContext';
import LightweightPlayer from '../LightweightPlayer/LightweightPlayer';

interface Track {
    id: string;
    title: string;
    titleHi: string;
    src: string;
    startTime: number;
    isDefault?: boolean;
    isSpecial?: boolean;
    type?: string;
}

// Initial static playlist as fallback/loading state
const INITIAL_PLAYLIST: Track[] = [
    {
        id: 'sahana',
        title: 'Guru Shishya Mantra (Peace Prayer)',
        titleHi: 'गुरु शिष्य मंत्र',
        src: '/audio/Om_Sahana_Vavatu_Shanti_Mantra.mp3',
        startTime: 0,
        isDefault: true,
        type: 'mantra'
    },
    {
        id: 'mahamrityunjaya',
        title: 'Maha Mrityunjaya Mantra (108 Times)',
        titleHi: 'महामृत्युंजय मंत्र (108 बार)',
        src: 'https://ik.imagekit.io/aup4wh6lq/MahamrunjayMantra.mp3',
        startTime: 0,
        type: 'mantra'
    },
    {
        id: 'shiva-tandava',
        title: 'Shiva Tandava Stotram (The Hymn of Shiva)',
        titleHi: 'शिव तांडव स्तोत्रम्',
        src: 'https://ik.imagekit.io/rcsesr4xf/Shiva-Tandav.mp3',
        startTime: 0,
        type: 'mantra'
    },
    {
        id: 'lalitha',
        title: 'Lalitha Sahasranamam (Thousand Names of Divine Mother)',
        titleHi: 'ललिता सहस्रनाम',
        src: 'https://ik.imagekit.io/rcsesr4xf/Lalitha-Sahasranamam.mp3',
        startTime: 0,
        type: 'mantra'
    },
    {
        id: 'hanuman',
        title: 'Hanuman Chalisa (Prayer to Lord Hanuman)',
        titleHi: 'हनुमान चालीसा',
        src: '/audio/Powerful Hanuman Chalisa  HanuMan  Teja Sajja  Saicharan  Hanuman Jayanti Song  Jai Hanuman.mp3',
        startTime: 0,
        type: 'mantra'
    },
    {
        id: 'rudrashtakam',
        title: 'Rudrashtakam (Hymn to Lord Rudra)',
        titleHi: 'रुद्राष्टकम',
        src: '/audio/Agam - Rudrashtakam  रदरषटकम  Most POWERFUL Shiva Mantras Ever  Lyrical Video  Shiv.mp3',
        startTime: 0,
        type: 'mantra'
    },
    {
        id: 'agnihotra',
        title: 'Agnihotra Shantipath (Vedic Chants for Peace)',
        titleHi: 'अग्निहोत्र शांति पाठ',
        src: '/audio/Agnihotra_Shantipath_-_Vedic_Chants_for_Universal_Peace_and_Well-Being_part_2_(mp3.pm).mp3',
        startTime: 0,
        type: 'mantra'
    },
    {
        id: 'narayana',
        title: 'Narayana Suktam (Universal Cosmic Prayer)',
        titleHi: 'नारायण सूक्तम्',
        src: '/audio/Anant_-_a_collection_of_vedic_chants_-_05._Narayana_Suktam_(mp3.pm).mp3',
        startTime: 0,
        type: 'mantra'
    },
    {
        id: 'shri-suktam',
        title: 'Shri Suktam (Hymn for Abundance)',
        titleHi: 'श्री सूक्तम्',
        src: '/audio/Challakere_Brothers_vedic_chanting_-_Shri_suktam_(mp3.pm).mp3',
        startTime: 0,
        type: 'mantra'
    },
    {
        id: 'chamakam',
        title: 'Chamakam (The Hymn of Fulfillment)',
        titleHi: 'चमकम्',
        src: '/audio/A_Collection_Of_Vedic_Chants_-_Chamakam_-_11_11_(mp3.pm).mp3',
        startTime: 0,
        type: 'mantra'
    },
    {
        id: 'kshama',
        title: 'Kshama Prarthana (Prayer for Forgiveness)',
        titleHi: 'क्षमा प्रार्थना',
        src: '/audio/A_Collection_Of_Vedic_Chants_-_Kshama_Prarthana_(mp3.pm).mp3',
        startTime: 0,
        type: 'mantra'
    },
    {
        id: 'virija',
        title: 'Virija Homa Mantra (Sacred Fire Ritual)',
        titleHi: 'विरिजा होम मंत्र',
        src: '/audio/Virija Homa Mantra  Uma Mohan  Promod Shanker  Times Music Spiritual.mp3',
        startTime: 0,
        type: 'mantra'
    },
    {
        id: 'dainik-agnihotra',
        title: 'Dainik Agnihotra (Daily Ritual Chants)',
        titleHi: 'दैनिक अग्निहोत्र',
        src: 'https://ik.imagekit.io/aup4wh6lq/DainikAgnihotra.mp3?updatedAt=1771246817070',
        startTime: 0,
        type: 'mantra'
    },
    {
        id: 'guidance',
        title: 'Guidance (Introduction)',
        titleHi: 'मार्गदर्शन',
        src: '/audio/Guidance.wav',
        startTime: 0,
        type: 'mantra'
    },
    {
        id: 'gayatri_ghanpaath',
        title: 'Gayatri Mantra (Deep Vedic Resonance)',
        titleHi: 'गायत्री मंत्र (घनपाठ)',
        src: 'https://ik.imagekit.io/rcsesr4xf/gayatri-mantra-ghanpaath.mp3',
        startTime: 0,
        type: 'mantra'
    },
    {
        id: 'brahma-yagya',
        title: 'Brahma Yagya Kanya (Sacred Offering Chants)',
        titleHi: 'ब्रह्मयज्ञ कन्या',
        src: 'https://ik.imagekit.io/aup4wh6lq/BrahmaYagyaKanya.mp3',
        startTime: 0,
        type: 'mantra'
    },
    // --- Videos ---
    {
        id: 'v_rudri',
        title: 'Rudri Path',
        titleHi: 'रुद्री पाठ',
        src: 'https://ik.imagekit.io/aup4wh6lq/Complete%20Rudri%20Path%20with%20Lyrics%20_%20Vedic%20Chanting%20by%2021%20Brahmins.mp4',
        startTime: 0,
        type: 'video'
    },

    {
        id: 'shanti_path_audio', // Changed ID to reflect audio
        title: 'Shanti Path (21 Brahmins)',
        titleHi: 'शांति पाठ (21 ब्राह्मण)',
        src: 'https://ik.imagekit.io/rcsesr4xf/shanti-path.mp3',
        startTime: 0,
        type: 'mantra'
    },
    {
        id: 'brahma_yagya_new',
        title: 'Brahma Yagya',
        titleHi: 'ब्रह्मयज्ञ',
        src: 'https://ik.imagekit.io/rcsesr4xf/BrahmaYagya.mp3',
        startTime: 0,
        type: 'mantra'
    },
    {
        id: 'v_vishesh',
        title: 'Vishesh (Vishnu Sahasranamam)',
        titleHi: 'विष्णु सहस्रनाम (विशेष)',
        src: 'https://ik.imagekit.io/aup4wh6lq/VISHNU%20SAHASRANAMAM%20_%20Madhubanti%20Bagchi%20&%20Siddharth%20Bhavsar%20_%20Stotra%20For%20Peace%20&%20Divine%20Blessings.mp4',
        startTime: 7,
        type: 'video'
    },
    {
        id: 'v1',
        title: 'Maheshvara Sutram',
        titleHi: 'महेश्वर सूत्रम्',
        src: 'https://ik.imagekit.io/aup4wh6lq/Most%20powerful%20Maheshvara%20Su%CC%84tram%20_%20the%20primal%20sound%20of%20creation.%E0%A4%AE%E0%A4%BE%E0%A4%B9%E0%A5%87%E0%A4%B6%E0%A5%8D%E0%A4%B5%E0%A4%B0%20%E0%A4%B8%E0%A5%82%E0%A4%A4%E0%A5%8D%E0%A4%B0%E0%A4%AE%E0%A5%8D%20_%20%E0%A4%9C%E0%A4%BF%E0%A4%B8%E0%A4%B8%E0%A5%87%20%E0%A4%B8%E0%A4%AE%E0%A5%8D%E0%A4%AA%E0%A5%82%E0%A4%B0%E0%A5%8D%E0%A4%A6.mp4',
        startTime: 0,
        type: 'video'
    },
    {
        id: 'v2',
        title: 'Shiv Shakti Energy',
        titleHi: 'शिव शक्ति ऊर्जा',
        src: 'https://ik.imagekit.io/aup4wh6lq/Just%20feel%20the%20energy%20____Follow%20@fmccreators%20for%20more_%E0%A4%B9%E0%A4%B0%20%E0%A4%B9%E0%A4%B0%20%E0%A4%AE%E0%A4%B9%E0%A4%BE%E0%A4%A6%E0%A5%87%E0%A4%B5%20__%E0%A4%9C%E0%A4%AF%20%E0%A4%B6%E0%A4%82%E0%A4%95%E0%A4%B0%20___Do%20like.mp4',
        startTime: 0,
        type: 'video'
    },
    {
        id: 'v3',
        title: 'Mahadev Nav Varsh',
        titleHi: 'महादेव नव वर्ष',
        src: 'https://ik.imagekit.io/aup4wh6lq/%E0%A4%86%E0%A4%AA%20%E0%A4%B8%E0%A4%AD%E0%A5%80%20%E0%A4%95%E0%A5%8B%20%E0%A4%A8%E0%A4%B5%20%E0%A4%B5%E0%A4%B0%E0%A5%8D%E0%A4%B7%20%E0%A4%95%E0%A5%80%20%E0%A4%B9%E0%A4%BE%E0%A4%B0%E0%A5%8D%E0%A4%A6%E0%A4%BF%E0%A4%95%20%E0%A4%AC%E0%A4%A7%E0%A4%BE%E0%A4%88%20%E0%A4%8F%E0%A4%B5%E0%A4%82%20%E0%A4%B6%E0%A5%81%E0%A4%AD%E0%A4%95%E0%A4%BE%E0%A4%AE%E0%A4%A8%E0%A4%A6%E0%A4%88%E0%A4%AE%E0%A4%A8%E0%A4%BE%E0%A4%8F%E0%A4%81_%E0%A4%B9%E0%A4%B0%20%E0%A4%B9%E0%A4%B0%20%E0%A4%AE%E0%A4%B9%E0%A4%BE%E0%A4%A6%E0%A5%87%E0%A4%B5____.mp4',
        startTime: 0,
        type: 'video'
    },
    {
        id: 'v4',
        title: 'Ardhanarishwara',
        titleHi: 'अर्धनारीश्वर स्वरूप',
        src: 'https://ik.imagekit.io/aup4wh6lq/The%20_Lord%20who%20is%20half%20woman_%20signifies%20the%20perfect%20synthesis%20of%20masculine%20and%20feminine%20energies,.mp4',
        startTime: 0,
        type: 'video'
    },
    {
        id: 'v5',
        title: 'Shiv Swarnamala',
        titleHi: 'शिव स्वर्णमाला स्तुति',
        src: 'https://ik.imagekit.io/aup4wh6lq/Shiv%20Swarnamala%20Stuti%20_%E2%9D%A4%EF%B8%8F%20I%20Verse%20-%207%20_.Follow%20@aumm_namah_shivay%20for%20more%20%E2%9D%A4%EF%B8%8F%20.._mahadev%20_shiv.mp4',
        startTime: 0,
        type: 'video'
    },
    {
        id: 'v6',
        title: 'Sound Healing',
        titleHi: 'नाद चिकित्सा',
        src: 'https://ik.imagekit.io/aup4wh6lq/Most%20people%20don_t%20realize%20it,%20but%20sound%20has%20the%20power%20to%20heal%20-%20or%20harm.%20There_s%20a%20reason%20why%20an.mp4',
        startTime: 0,
        type: 'video'
    },
    {
        id: 'v7',
        title: 'Mahashivratri Special',
        titleHi: 'महाशिवरात्रि दर्शन',
        src: '/videos/mahashivratri_darshan.mp4',
        startTime: 0,
        type: 'video'
    },
    {
        id: 'v8',
        title: 'Kaal Bhairav Ashtakam',
        titleHi: 'काल भैरव अष्टकम्',
        src: 'https://ik.imagekit.io/aup4wh6lq/Kaal%20Bhairav%20Ashtakam%20_%20Tanuku%20Sisters%20_%20@DivineDharohar.mp4',
        startTime: 0,
        type: 'video'
    }
];

// Helper to format filename into readable title
const formatTitle = (filename: string): string => {
    // Remove extension
    let name = filename.replace(/\.(mp3|wav|m4a|ogg)$/i, '');

    // Remove common prefixes/suffixes using regex
    name = name.replace(/_/g, ' ')  // Replace underscores with spaces
        .replace(/-/g, ' ')  // Replace hyphens with spaces
        .replace(/\(mp3\.pm\)/gi, '') // Remove specific site suffix
        .replace(/\.mp3/gi, '') // Remove double extensions
        .replace(/vedic chants/gi, '') // Clean common terms
        .replace(/collection of/gi, '')
        .replace(/\d+/g, '') // Remove numbers (optional, maybe keep if meaningful?)
        .trim();

    // Capitalize words
    return name.replace(/\b\w/g, c => c.toUpperCase());
};

interface MantraSangrahProps {
    lang: 'en' | 'hi';
    activeTrack?: Track | null; // NEW: Single source of truth
    onTrackEnded?: (trackId: string) => void;
    onPlayingChange?: (isPlaying: boolean) => void;
    externalPlaylist?: any[];
    currentIndex?: number;
    onSelectIndex?: (index: number) => void;
    onMutedChange?: (isMuted: boolean) => void;
    isMuted?: boolean; // NEW: Prop to control mute state
    onTimeUpdate?: (current: number, duration: number) => void;
    videoProgress?: number;
    videoTime?: number;
    videoDuration?: number;
    onVideoSeek?: (time: number) => void;
    onVideoToggle?: () => void;
    sessionActive?: boolean;
    onActiveTrackChange?: (track: Track | null) => void;
    onTrackSelect?: (track: Track) => void; // Delegate control
    volume?: number;
    onVolumeChange?: (vol: number) => void;
    isOpen?: boolean;
    setIsOpen?: (open: boolean) => void;
}

// Helper to get Hindi title
const getHindiTitle = (filename: string): string => {
    // Specific Long Names or Priority Mappings First
    if (filename.includes('Om_Sahana_Vavatu')) return 'गुरु शिष्य मंत्र';
    if (filename.includes('Lalitha Sahasranamam')) return 'ललिता सहस्रनाम';
    if (filename.includes('vishnu_sahasranama')) return 'विष्णु सहस्रनाम';
    if (filename.includes('MahaMrtyunjaya')) return 'महामृत्युंजय मंत्र (108 बार)';
    if (filename.includes('Narayana_Suktam')) return 'नारायण सूक्तम्';
    if (filename.includes('Shri_suktam')) return 'श्री सूक्तम्';
    if (filename.includes('Agnihotra_Shantipath')) return 'अग्निहोत्र शांतिपाठ';
    if (filename.includes('Chamakam')) return 'चमकम्';
    if (filename.includes('Kshama_Prarthana')) return 'क्षमा प्रार्थना';
    if (filename.includes('Virija Homa Mantra')) return 'विरजा होम मंत्र';
    if (filename.includes('Ranjani - Gayatri')) return 'ललिता सहस्रनाम (रंजनी - गायत्री)';
    if (filename.includes('Rudrashtakam')) return 'रुद्राष्टकम';
    if (filename.includes('Shiva Tandava')) return 'शिव ताण्डव स्तोत्रम्';
    if (filename.includes('Chinnamasta')) return 'छिन्नमस्ता स्तोत्रम्';
    if (filename.includes('Dainik Agnihotra')) return 'दैनिक अग्निहोत्र मंत्र';

    // Generic Keyword Checks Last
    if (filename.includes('Guidance')) return 'मार्गदर्शन';
    if (filename.includes('Gayatri')) return 'गायत्री मंत्र';
    if (filename.includes('Hanuman')) return 'हनुमान चालीसा';
    if (filename.includes('Ganesha')) return 'गणेश मंत्र';
    if (filename.includes('Shiva')) return 'शिव मंत्र';
    if (filename.includes('Durga')) return 'दुर्गा मंत्र';
    if (filename.includes('Krishna')) return 'कृष्ण मंत्र';
    if (filename.includes('Ram')) return 'राम मंत्र';
    if (filename.includes('Saraswati')) return 'सरस्वती मंत्र';
    if (filename.includes('Lakshmi')) return 'लक्ष्मी मंत्र';
    if (filename.includes('Kali')) return 'काली मंत्र';
    if (filename.includes('Vedic_Chant')) return 'वैदिक मंत्र';

    // If it contains Devanagari characters already, return it as is but trim extension
    if (/[\u0900-\u097F]/.test(filename)) {
        return filename.replace(/\.(mp3|wav|m4a|ogg|mp3\.mp3)$/i, '').replace(/_/g, ' ').trim();
    }

    return formatTitle(filename);
};

export default function MantraSangrah({
    activeTrack, // NEW input
    isOpen: isOpenProp,
    setIsOpen: setIsOpenProp,
    onTrackEnded,
    externalPlaylist,
    currentIndex,
    onSelectIndex,
    onMutedChange,
    isMuted: isMutedProp, // Destructure prop
    onPlayingChange,
    videoProgress,
    videoTime,
    videoDuration,
    onVideoSeek,
    onVideoToggle,
    onTimeUpdate,
    sessionActive = false,
    onActiveTrackChange,
    onTrackSelect,
    volume: volumeProp,
    onVolumeChange: onVolumeChangeProp
}: MantraSangrahProps & { isOpen?: boolean; setIsOpen?: (open: boolean) => void }) {
    const { lang } = useLanguage();
    const [localIsOpen, setLocalIsOpen] = useState(false);

    // Support both lifted and local state
    const isOpen = isOpenProp !== undefined ? isOpenProp : localIsOpen;
    const setIsOpen = setIsOpenProp !== undefined ? setIsOpenProp : setLocalIsOpen;

    const [playlist, setPlaylist] = useState<Track[]>(INITIAL_PLAYLIST);

    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(isMutedProp || false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [localVolume, setLocalVolume] = useState(1); // Default volume 100%

    // Use prop volume if available, otherwise local
    const volume = volumeProp !== undefined ? volumeProp : localVolume;

    const handleVolumeChange = (vol: number) => {
        if (onVolumeChangeProp) {
            onVolumeChangeProp(vol);
        }
        setLocalVolume(vol);
    };

    // Refs for state access inside event listeners
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const onTrackEndedRef = useRef(onTrackEnded);
    const onPlayingChangeRef = useRef(onPlayingChange);

    // Keep refs updated
    useEffect(() => {
        onTrackEndedRef.current = onTrackEnded;
        onPlayingChangeRef.current = onPlayingChange;
    }, [onTrackEnded, onPlayingChange]);

    // Initialize audio ref cleanup
    useEffect(() => {
        return () => {
            console.log("Unmounting MantraSangrah, stopping audio...");
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
            }
        };
    }, []);

    // NEW: Sync Mute Prop with Audio Element and Local State
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.muted = isMutedProp || false;
        }
        setIsMuted(isMutedProp || false);
    }, [isMutedProp]);

    // NEW: Sync Playlist with External Sequence
    useEffect(() => {
        if (externalPlaylist && externalPlaylist.length > 0) {
            console.log("[MantraSangrah] Syncing with external playlist:", externalPlaylist.length);
            setPlaylist(externalPlaylist);
        }
    }, [externalPlaylist]);

    // REFACTORED: Single Source of Truth - 'activeTrack' Prop
    // We no longer maintain internal currentTrack or playOperationId for logic.
    // The parent tells us WHAT to play. We just sync the <audio> element to it.

    // Effect: Sync Audio Element with Active Track
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (activeTrack) {
            // 1. Check if source needs updating
            const encodedSrc = encodeURI(activeTrack.src).replace(/\(/g, '%28').replace(/\)/g, '%29');
            const currentSrc = audio.src;

            // Allow for browser-encoded variations in comparison
            const isSameSource = currentSrc.includes(encodedSrc) || currentSrc === encodedSrc;

            if (!isSameSource) {
                console.log(`[MantraSangrah] Loading NEW Track: ${activeTrack.title}`);
                audio.src = encodedSrc;
                audio.currentTime = activeTrack.startTime || 0;
            }

            // 2. Enforce Playback respect sessionActive prop
            if (activeTrack && sessionActive) {
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            // Playback started successfully
                            if (!isPlaying) setIsPlaying(true);
                        })
                        .catch(err => {
                            if (err.name === 'AbortError') {
                                // Benign: triggered by rapid track switching
                            } else if (err.name === 'NotAllowedError') {
                                console.warn("[MantraSangrah] Autoplay blocked. Retrying with mute...");
                                audio.muted = true;
                                setIsMuted(true);
                                audio.play().catch(e => console.error("Muted play failed", e));
                            } else {
                                console.error("[MantraSangrah] Play error:", err);
                            }
                        });
                }
            } else {
                audio.pause();
                setIsPlaying(false);
            }
        } else {
            // No active track -> Pause and Reset
            if (!audio.paused) {
                console.log("[MantraSangrah] No active track. Pausing.");
                audio.pause();
            }
            setIsPlaying(false);
            // Optionally clear src to stop buffering, or keep for resume? 
            // Better to keep for now, but strictly paused.
        }
    }, [activeTrack, sessionActive]);

    // Helper Functions
    const toggleMute = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;

        // Toggle mute directly on the audio element
        const newMutedState = !audio.muted;
        audio.muted = newMutedState;
        setIsMuted(newMutedState);
        if (onMutedChange) onMutedChange(newMutedState);
    }, [onMutedChange]);

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const isVideo = !!externalPlaylist && currentIndex !== undefined && externalPlaylist[currentIndex]?.type === 'video';

        if (isVideo && onVideoSeek && videoDuration) {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = clickX / rect.width;
            onVideoSeek(percentage * videoDuration);
            return;
        }

        if (!audioRef.current || !duration) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        audioRef.current.currentTime = percentage * duration;
    };


    // NEW: Sync Volume with Audio Element
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    // ... (existing effects)

    // Handle User Interactions (Play/Pause Toggle)
    const togglePlayPause = useCallback(() => {
        const audio = audioRef.current;
        if (!audio || !activeTrack) {
            // If no active track, maybe ask parent to start default?
            if (onTrackSelect && playlist.length > 0) {
                onTrackSelect(playlist[0]);
            }
            return;
        }

        if (audio.paused) {
            audio.play().catch(console.error);
        } else {
            audio.pause();
        }
    }, [activeTrack, playlist, onTrackSelect]);

    const selectTrack = async (track: Track) => {
        // Robust Play/Pause Toggle Logic
        // Normalize URLs for comparison to handle encoding differences
        const normalize = (url: string) => {
            try {
                return decodeURIComponent(url).replace(/\s/g, '_'); // Basic start
            } catch (e) {
                return url;
            }
        };

        const isSameId = activeTrack?.id === track.id;

        // Detailed check for source match
        let isSameSrc = false;
        if (activeTrack?.src && track.src) {
            const s1 = normalize(activeTrack.src);
            const s2 = normalize(track.src);
            isSameSrc = s1.includes(s2) || s2.includes(s1);
        }

        console.log(`[MantraSangrah] User selected: ${track.title}`, {
            matchId: isSameId,
            matchSrc: isSameSrc,
            activeId: activeTrack?.id,
            newId: track.id
        });

        // If clicking the ALREADY active track, Toggle it.
        if (activeTrack && (isSameId || isSameSrc)) {
            togglePlayPause();
            return;
        }

        // DELEGATE TO PARENT ALWAYS via onTrackSelect
        if (onTrackSelect) {
            onTrackSelect(track);
        }
    };

    // ... (existing helper functions)

    return (
        <>
            {/* Trigger Button - Bottom Left */}
            <div className={`${styles.triggerContainer} ${isOpen ? styles.triggerHidden : ''}`}>
                <button
                    className={styles.trigger}
                    onClick={() => setIsOpen(true)}
                    aria-label="Open Mantra Collection"
                >
                    <div className={styles.lotusIcon}>🪷</div>
                </button>
                <span className={styles.triggerLabel}>
                    {lang === 'hi' ? 'मंत्र संग्रह' : 'Mantra Collection'}
                </span>
            </div>

            {/* Acharya Samvad - Top Right Temple Pillar */}
            <div className={styles.acharyaContainer}>
                <Link
                    href="/acharya-samvad"
                    className={styles.acharyaTrigger}
                    aria-label="Ask Acharya"
                >
                    <div className={styles.acharyaIcon}>🔥</div>
                </Link>
                <span className={styles.acharyaLabel}>
                    {lang === 'hi' ? 'आचार्य संवाद' : 'Ask Acharya'}
                </span>
            </div>

            {/* Overlay */}
            {isOpen && (
                <div className={styles.overlay} onClick={() => setIsOpen(false)} />
            )}

            {/* Side Panel */}
            <div className={`${styles.panel} ${isOpen ? styles.panelOpen : ''}`}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerTitle}>
                        <Sparkles className={styles.headerIcon} size={24} />
                        <h2>{lang === 'hi' ? 'वैदिक मंत्र एवं स्तोत्र संग्रह' : 'Vedic Mantra & Stotra Collection'}</h2>
                    </div>
                    <button
                        className={styles.closeBtn}
                        onClick={() => setIsOpen(false)}
                        aria-label="Close"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className={styles.divider} />

                {/* Playlist */}
                <div className={styles.playlist}>
                    {/* Audio Section */}
                    <div className={styles.sectionHeader}>
                        <Volume2 size={16} />
                        <span>{lang === 'hi' ? 'मंत्र (ऑडियो)' : 'Mantras (Audio)'}</span>
                    </div>
                    <div className={styles.trackList}>
                        {playlist.filter(t => t.type === 'mantra' || !t.type).map((track) => {
                            const isActive = activeTrack?.id === track.id;
                            const isPlayingCalculated = isActive && isPlaying;

                            return (
                                <div
                                    key={track.id}
                                    className={`${styles.trackItem} ${isActive ? styles.activeTrack : ''}`}
                                    onClick={() => selectTrack(track)}
                                >
                                    <div className={styles.trackIcon}>
                                        {isActive && isPlaying ? (
                                            <div className={styles.playingOverlay}>
                                                <span className={styles.playingIndicator}>
                                                    <span className={styles.bar}></span>
                                                    <span className={styles.bar}></span>
                                                    <span className={styles.bar}></span>
                                                </span>
                                                <Pause size={20} className={styles.playPauseIcon} />
                                            </div>
                                        ) : (
                                            <Play size={20} className={styles.playPauseIcon} />
                                        )}
                                    </div>
                                    <div className={styles.trackDetails}>
                                        <span className={styles.trackTitle}>
                                            {lang === 'hi' ? (track.titleHi || track.title) : track.title}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Video Section */}
                    <div className={`${styles.sectionHeader} ${styles.videoHeader}`}>
                        <Play size={16} />
                        <span>{lang === 'hi' ? 'दर्शन (वीडियो)' : 'Darshan (Video)'}</span>
                    </div>
                    <div className={styles.trackList}>
                        {playlist.filter(t => t.type === 'video').map((track) => {
                            const isActive = activeTrack?.id === track.id;
                            const isPlayingCalculated = isActive && isPlaying;

                            return (
                                <div
                                    key={track.id}
                                    className={`${styles.trackItem} ${isActive ? styles.activeTrack : ''}`}
                                    onClick={() => selectTrack(track)}
                                >
                                    <div className={styles.trackIcon}>
                                        {isActive && isPlayingCalculated ? (
                                            <div className={styles.playingOverlay}>
                                                <span className={styles.playingIndicator}>
                                                    <span className={styles.bar}></span>
                                                    <span className={styles.bar}></span>
                                                    <span className={styles.bar}></span>
                                                </span>
                                                <Pause size={20} className={styles.playPauseIcon} />
                                            </div>
                                        ) : (
                                            <Play size={20} className={styles.playPauseIcon} />
                                        )}
                                    </div>
                                    <div className={styles.trackDetails}>
                                        <span className={styles.trackTitle}>
                                            {lang === 'hi' ? (track.titleHi || track.title) : track.title}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Unified Media Controls - REMOVED - Now in Main Dashboard */}

                <div className={styles.footer}>
                    <span>🙏 ॐ शान्ति शान्ति शान्ति 🙏</span>
                </div>
            </div>

            {/* Hidden Audio Element for State Management */}
            <audio
                ref={audioRef}
                muted={isMuted}
                onTimeUpdate={(e) => {
                    const audio = e.currentTarget;
                    if (audio.duration) {
                        setProgress((audio.currentTime / audio.duration) * 100);
                        onTimeUpdate?.(audio.currentTime, audio.duration);
                    }
                }}
                onLoadedMetadata={(e) => {
                    const dur = e.currentTarget.duration;
                    setDuration(dur);
                    onTimeUpdate?.(e.currentTarget.currentTime, dur);
                }}
                onEnded={() => {
                    setIsPlaying(false);
                    if (activeTrack) {
                        onTrackEnded?.(activeTrack.id);
                    }
                }}
                onPlay={() => {
                    setIsPlaying(true);
                    onPlayingChange?.(true);
                }}
                onPause={() => {
                    setIsPlaying(false);
                    onPlayingChange?.(false);
                }}
                preload="auto"
                style={{ display: 'none' }}
            />
        </>
    );
}
