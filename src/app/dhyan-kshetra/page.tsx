"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Globe, Sparkles, Languages } from 'lucide-react';
import styles from "../vedic-rasoi/rasoi.module.css";
import translations from '@/lib/vaidya-translations.json';
import pageStyles from "./page.module.css";
import Navbar from '@/components/Navbar';
import SriYantra from '@/components/SriYantra/SriYantra';
import MantraSangrah from '@/components/MantraSangrah/MantraSangrah';
import IntroVideoFlash from '@/components/IntroVideoFlash/IntroVideoFlash';
import LightweightPlayer from '@/components/LightweightPlayer/LightweightPlayer';
import { useLanguage } from "@/context/LanguageContext";

// Move static videoList outside to prevent re-renders from recreating it
const VIDEO_LIST: string[] = [
    "https://ik.imagekit.io/aup4wh6lq/Most%20powerful%20Maheshvara%20Su%CC%84tram%20_%20the%20primal%20sound%20of%20creation.%E0%A4%AE%E0%A4%BE%E0%A4%B9%E0%A5%87%E0%A4%B6%E0%A5%8D%E0%A4%B5%E0%A4%B0%20%E0%A4%B8%E0%A5%82%E0%A4%A4%E0%A5%8D%E0%A4%B0%E0%A4%AE%E0%A5%8D%20_%20%E0%A4%9C%E0%A4%BF%E0%A4%B8%E0%A4%B8%E0%A5%87%20%E0%A4%B8%E0%A4%AE%E0%A5%8D%E0%A4%AA%E0%A5%82%E0%A4%B0%E0%A5%8D%E0%A4%A3.mp4",
    "https://ik.imagekit.io/aup4wh6lq/Just%20feel%20the%20energy%20____Follow%20@fmccreators%20for%20more_%E0%A4%B9%E0%A4%B0%20%E0%A4%B9%E0%A4%B0%20%E0%A4%AE%E0%A4%B9%E0%A4%BE%E0%A4%A6%E0%A5%87%E0%A4%B5%20__%E0%A4%9C%E0%A4%AF%20%E0%A4%B6%E0%A4%82%E0%A4%95%E0%A4%B0%20___Do%20like.mp4",
    "https://ik.imagekit.io/aup4wh6lq/%E0%A4%86%E0%A4%AA%20%E0%A4%B8%E0%A4%AD%E0%A5%80%20%E0%A4%95%E0%A5%8B%20%E0%A4%A8%E0%A4%B5%20%E0%A4%B5%E0%A4%B0%E0%A5%8D%E0%A4%B7%20%E0%A4%95%E0%A5%80%20%E0%A4%B9%E0%A4%BE%E0%A4%B0%E0%A5%8D%E0%A4%A6%E0%A4%BF%E0%A4%95%20%E0%A4%AC%E0%A4%A7%E0%A4%BE%E0%A4%88%20%E0%A4%8F%E0%A4%B5%E0%A4%82%20%E0%A4%B6%E0%A5%81%E0%A4%AD%E0%A4%95%E0%A4%BE%E0%A4%AE%E0%A4%A8%E0%A4%BE%E0%A4%8F%E0%A4%81_%E0%A4%B9%E0%A4%B0%20%E0%A4%B9%E0%A4%B0%20%E0%A4%AE%E0%A4%B9%E0%A4%BE%E0%A4%A6%E0%A5%87%E0%A4%B5____.mp4",
    "https://ik.imagekit.io/aup4wh6lq/The%20_Lord%20who%20is%20half%20woman_%20signifies%20the%20perfect%20synthesis%20of%20masculine%20and%20feminine%20energies,.mp4",
    "https://ik.imagekit.io/aup4wh6lq/Shiv%20Swarnamala%20Stuti%20_%E2%9D%A4%EF%B8%8F%20I%20Verse%20-%207%20_.Follow%20@aumm_namah_shivay%20for%20more%20%E2%9D%A4%EF%B8%8F%20.._mahadev%20_shiv.mp4",
    "https://ik.imagekit.io/aup4wh6lq/Most%20people%20don_t%20realize%20it,%20but%20sound%20has%20the%20power%20to%20heal%20-%20or%20harm.%20There_s%20a%20reason%20why%20an.mp4",
    "/videos/mahashivratri_darshan.mp4",
    "https://ik.imagekit.io/aup4wh6lq/Kaal%20Bhairav%20Ashtakam%20_%20Tanuku%20Sisters%20_%20@DivineDharohar.mp4"
];

export default function DhyanKakshaPage() {
    const { lang, toggleLanguage } = useLanguage();
    const [showIntro, setShowIntro] = useState(true);
    const [hasStarted, setHasStarted] = useState(false); // NEW: Track user activation
    const [startBackgroundLoop, setStartBackgroundLoop] = useState(false);
    const [playMantra, setPlayMantra] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
    const [isMantraPlaying, setIsMantraPlaying] = useState(false);
    const [forceMantraId, setForceMantraId] = useState<string | null>(null);
    const [isSessionPaused, setIsSessionPaused] = useState(false);
    const [introVideos, setIntroVideos] = useState<{ src: string, text?: string | string[] }[]>([]);
    const [slideVideos, setSlideVideos] = useState<string[]>([]);
    const [videoProgress, setVideoProgress] = useState(0);
    const [videoTime, setVideoTime] = useState(0);
    const [videoDuration, setVideoDuration] = useState(0);
    const [audioTime, setAudioTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(0);
    const [isIntro, setIsIntro] = useState(true); // Track if we are in the initial logo slide
    const [isVideoLoading, setIsVideoLoading] = useState(false);
    const [activeMantra, setActiveMantra] = useState<any>(null);
    const [manualTrack, setManualTrack] = useState<any>(null); // NEW: For library/manual selections
    const [userName, setUserName] = useState(""); // NEW: User Name State
    const [volume, setVolume] = useState(1); // Global Volume State (0 to 1)
    const [isMantraMenuOpen, setIsMantraMenuOpen] = useState(false); // Lifted State

    const sequentialVideoRef = React.useRef<HTMLVideoElement>(null);

    // Sync Volume for Sequential Video
    useEffect(() => {
        if (sequentialVideoRef.current) {
            sequentialVideoRef.current.volume = volume;
        }
    }, [volume]);

    const playlist = useMemo(() => {
        // 1. Define the Fixed Start Sequence (Exact Order Requested)
        // Guidance -> Sahana -> Lalitha -> Shiva Tandava -> Vishesh (Video) -> Maha Mrityunjaya
        const fixedStartItems = [
            { type: "mantra", id: "guidance", src: "/audio/Guidance.wav", title: "Guidance (Introduction)", titleHi: "आज्ञा और मार्गदर्शन" },
            { type: "mantra", id: "sahana", src: "/audio/Om_Sahana_Vavatu_Shanti_Mantra.mp3", title: "Guru Shishya Mantra (Peace Prayer)", titleHi: "गुरु शिष्य मंत्र" },
            { type: "mantra", id: "lalitha", src: "https://ik.imagekit.io/rcsesr4xf/Lalitha-Sahasranamam.mp3", title: "Lalitha Sahasranamam (Thousand Names of Divine Mother)", titleHi: "ललिता सहस्रनाम" },
            { type: "mantra", id: "shiva-tandava", src: "https://ik.imagekit.io/rcsesr4xf/Shiva-Tandav.mp3", title: "Shiva Tandava Stotram (The Hymn of Shiva)", titleHi: "शिव तांडव स्तोत्रम्" },
            {
                type: "video",
                id: 'v_vishesh',
                title: 'Vishesh (Vishnu Sahasranamam)',
                titleHi: 'विष्णु सहस्रनाम (विशेष)',
                src: 'https://ik.imagekit.io/aup4wh6lq/VISHNU%20SAHASRANAMAM%20_%20Madhubanti%20Bagchi%20&%20Siddharth%20Bhavsar%20_%20Stotra%20For%20Peace%20&%20Divine%20Blessings.mp4',
                startTime: 7
            },
            { type: "mantra", id: "agnihotra", src: "/audio/Agnihotra_Shantipath_-_Vedic_Chants_for_Universal_Peace_and_Well-Being_part_2_(mp3.pm).mp3", title: "Agnihotra Shantipath (Vedic Chants for Peace)", titleHi: "अग्निहोत्र शांति पाठ" }
        ];

        // 2. Define Remaining Pools (Excluding items already in fixed list)
        // Note: Vishesh and MahaMrityunjaya were in the pools before, so we must exclude them to avoid duplicates if we reused the array.
        // We will define specific arrays for the remaining content.

        // Remaining Videos (All except Vishesh)
        const remainingVideos = [
            { type: "video", id: "v_rudri", src: "https://ik.imagekit.io/aup4wh6lq/Complete%20Rudri%20Path%20with%20Lyrics%20_%20Vedic%20Chanting%20by%2021%20Brahmins.mp4", title: "Rudri Path (Sacred Chants)", titleHi: "रुद्री पाठ" },
            // Shanti Path Video Removed - Replaced with Audio in Mantras below
            { type: "video", id: "v1", src: VIDEO_LIST[0], title: "Maheshvara Sutram (The Primal Sound)", titleHi: "महेश्वर सूत्रम्", trimEnd: 4 },
            { type: "video", id: "v2", src: VIDEO_LIST[1], title: "Shiv Shakti Energy", titleHi: "शिव शक्ति ऊर्जा" },
            { type: "video", id: "v3", src: VIDEO_LIST[2], title: "Mahadev New Year Celebration", titleHi: "महादेव नव वर्ष" },
            { type: "video", id: "v4", src: VIDEO_LIST[3], title: "Ardhanarishwara (The Half-Woman Lord)", titleHi: "अर्धनारीश्वर स्वरूप" },
            { type: "video", id: "v5", src: VIDEO_LIST[4], title: "Shiv Swarnamala Stuti (Hymn to Lord Shiva)", titleHi: "शिव स्वर्णमाला स्तुति" },
            { type: "video", id: "v6", src: VIDEO_LIST[5], title: "Nad Chikitsa (Sound Healing)", titleHi: "नाद चिकित्सा" },
            { type: "video", id: "v7", src: VIDEO_LIST[6], title: "Mahashivratri Special", titleHi: "महाशिवरात्रि" },
            { type: "video", id: "v8", src: VIDEO_LIST[7], title: "Kaal Bhairav Ashtakam (Hymn to the Lord of Time)", titleHi: "काल भैरव अष्टकम्" }
        ];

        // Remaining Mantras (Excluding Sahana, Lalitha, ShivaTandava, MahaMrityunjaya, Guidance)
        const remainingMantras = [
            { type: "mantra", id: "shanti_path_audio", src: "https://ik.imagekit.io/rcsesr4xf/shanti-path.mp3", title: "Shanti Path (21 Brahmins)", titleHi: "शांति पाठ (21 ब्राह्मण)" },
            { type: "mantra", id: "brahma_yagya_new", src: "https://ik.imagekit.io/rcsesr4xf/BrahmaYagya.mp3", title: "Brahma Yagya", titleHi: "ब्रह्मयज्ञ" },
            { type: "mantra", id: "gayatri_ghanpaath", src: "https://ik.imagekit.io/rcsesr4xf/gayatri-mantra-ghanpaath.mp3", title: "Gayatri Mantra (Deep Vedic Resonance)", titleHi: "गायत्री मंत्र (घनपाठ)" },
            { type: "mantra", id: "brahma-yagya", src: "https://ik.imagekit.io/aup4wh6lq/BrahmaYagyaKanya.mp3", title: "Brahma Yagya Kanya (Sacred Offering Chants)", titleHi: "ब्रह्मयज्ञ कन्या" },
            { type: "mantra", id: "shrisuktam", src: "/audio/Challakere_Brothers_vedic_chanting_-_Shri_suktam_(mp3.pm).mp3", title: "Shri Suktam (Hymn for Abundance)", titleHi: "श्री सूक्तम्" },
            { type: "mantra", id: "narayana", src: "/audio/Anant_-_a_collection_of_vedic_chants_-_05._Narayana_Suktam_(mp3.pm).mp3", title: "Narayana Suktam (Universal Cosmic Prayer)", titleHi: "नारायण सूक्तम्" },
            { type: "mantra", id: "rudrashtakam", src: "/audio/Agam - Rudrashtakam  रदरषटकम  Most POWERFUL Shiva Mantras Ever  Lyrical Video  Shiv.mp3", title: "Rudrashtakam (Hymn to Lord Rudra)", titleHi: "रुद्राष्टकम" },
            { type: "mantra", id: "hanuman", src: "/audio/Powerful Hanuman Chalisa  HanuMan  Teja Sajja  Saicharan  Hanuman Jayanti Song  Jai Hanuman.mp3", title: "Hanuman Chalisa (Prayer to Lord Hanuman)", titleHi: "हनुमान चालीसा" },
            { type: "mantra", id: "virija", src: "/audio/Virija Homa Mantra  Uma Mohan  Promod Shanker  Times Music Spiritual.mp3", title: "Virija Homa Mantra (Sacred Fire Ritual)", titleHi: "विरजा होम मंत्र" },
            { type: "mantra", id: "dainik", src: "https://ik.imagekit.io/aup4wh6lq/DainikAgnihotra.mp3?updatedAt=1771246817070", title: "Dainik Agnihotra (Daily Ritual Chants)", titleHi: "दैनिक अग्निहोत्र" }
        ];

        // 3. Alternating Section (Video -> Mantra)
        // User wants: "then all videso and auioso in later nating order"
        const alternatingSection: any[] = [];
        const maxPairs = Math.min(remainingVideos.length, remainingMantras.length);

        for (let i = 0; i < maxPairs; i++) {
            alternatingSection.push(remainingVideos[i]);
            alternatingSection.push(remainingMantras[i]);
        }

        // 4. Leftovers
        // "And at last the reaming mantra in the list"
        const leftovers = [
            ...remainingVideos.slice(maxPairs),
            ...remainingMantras.slice(maxPairs)
        ];

        // 5. Final Assembly
        // If NOT first time, remove the Guidance mantra from the start
        const finalStartSequence = isFirstTime === false
            ? fixedStartItems.filter(item => item.id !== "guidance")
            : fixedStartItems;

        return [...finalStartSequence, ...alternatingSection, ...leftovers];
    }, [isFirstTime]);

    // UNIFIED CONTROLLER LOGIC
    // 1. Derive Active Item (Prioritize Manual Track)
    const activeItem = useMemo(() => {
        if (manualTrack) return manualTrack;
        return playlist[currentIndex] || null;
    }, [manualTrack, playlist, currentIndex]);

    // ALIAS for compatibility with existing effects
    const currentItem = activeItem;

    // 2. Format Time Helper (Preserved)
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // 3. Unified Track Selection Handler
    const handleTrackSelect = (track: any) => {
        console.log(`[DhyanKshetra] Track Selected: ${track.title}`);

        // Stop any running video first
        if (sequentialVideoRef.current) {
            sequentialVideoRef.current.pause();
            sequentialVideoRef.current.currentTime = 0;
        }

        // Check if track is in main sequence
        const seqIndex = playlist.findIndex(p => p.id === track.id || p.src === track.src);

        if (seqIndex !== -1) {
            console.log(`[Playback] Switching to Sequence Index: ${seqIndex}`);
            setManualTrack(null);
            setCurrentIndex(seqIndex);
        } else {
            console.log(`[Playback] Switching to Manual Track: ${track.title}`);
            setManualTrack(track);
        }

        // Ensure playback environment is ACTIVE
        setStartBackgroundLoop(true);
        setIsSessionPaused(false);
        setVideoProgress(0);
    };

    // 3.5 Unified Index Selection (For Sequence Items)
    const handleSelectIndex = (index: number) => {
        console.log(`[DhyanKshetra] Index Selected: ${index}`);
        setManualTrack(null); // Clear manual override
        setCurrentIndex(index);
        setStartBackgroundLoop(true);
        setIsSessionPaused(false);
    };

    // 4. Unified Next Logic
    const goNext = () => {
        if (manualTrack) {
            console.log("[Playback] Manual track ended. Returning to sequence.");
            setManualTrack(null);
            // Optional: Advance to next in sequence or stay? 
            // Let's stay on current index so sequence resumes naturally?
            // Or advance? Let's advance to keep flow moving.
            let nextIndex = (currentIndex + 1) % playlist.length;
            // Skip Guidance if looping
            if (nextIndex === 0 && playlist.length > 1) nextIndex = 1;
            setCurrentIndex(nextIndex);
        } else {
            let nextIndex = (currentIndex + 1) % playlist.length;
            if (nextIndex === 0 && playlist.length > 1) {
                nextIndex = 1;
            }
            console.log(`[Sequence] Auto-Advancing: ${currentIndex} -> ${nextIndex}`);
            setCurrentIndex(nextIndex);
        }

        // RESUME PLAYBACK ALWAYS ON NEXT
        setIsSessionPaused(false);
        setIsMantraPlaying(false); // Reset to allow effect to trigger fresh play

        // Ensure video is reset if we are moving to one
        if (sequentialVideoRef.current) {
            sequentialVideoRef.current.pause();
            sequentialVideoRef.current.currentTime = 0;
        }
    };

    const goPrevious = () => {
        let prevIndex = currentIndex - 1;
        if (prevIndex < 0) prevIndex = playlist.length - 1;

        // Skip Guidance if moving backwards too
        if (prevIndex === 0 && playlist.length > 1) {
            prevIndex = playlist.length - 1;
        }

        console.log(`[Sequence] goPrevious: ${currentIndex} -> ${prevIndex}`);
        handleSelectIndex(prevIndex);
    };

    // Scroll to top on mount and lock body scroll
    useEffect(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    // Effect to handle sequential video playback robustly
    useEffect(() => {
        const video = sequentialVideoRef.current;
        if (!video || !startBackgroundLoop) return;

        if (currentItem.type === 'video') {
            // Ensure source is synced and loaded if it changed
            if (!video.src.includes(currentItem.src)) {
                console.log(`[Video Sync] Loading source: ${currentItem.titleHi}`);
                video.src = currentItem.src;
                if ((currentItem as any).startTime) {
                    video.currentTime = (currentItem as any).startTime;
                }
                video.load();
            }

            if (isSessionPaused || isMantraPlaying) {
                video.pause();
            } else {
                console.log(`[Playback] Triggering video: ${currentItem.titleHi}`);
                video.muted = false;
                video.play().catch(err => {
                    if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') {
                        console.log("Video play request was interrupted (AbortError), ignoring.");
                    } else {
                        console.warn("Video play failed, attempting muted fallback:", err);
                        video.muted = true;
                        video.play().catch(() => { });
                    }
                });
            }
        } else if (currentItem.type === 'mantra') {
            // Ensure video turn is PAUSED when it's mantra turn
            video.pause();
        }
    }, [currentIndex, currentItem.src, currentItem.type, isSessionPaused, isMantraPlaying, startBackgroundLoop]);



    const t = translations[lang];

    // const toggleLanguage = () => {
    //     setLang(prev => prev === 'en' ? 'hi' : 'en');
    // };



    // State for A/B double buffering ambient slides (Videos + Images + Logo)
    const [ambientSlides, setAmbientSlides] = useState<{ src: string, type: 'video' | 'image' | 'logo' }[]>([]);
    const [currentSlideA, setCurrentSlideA] = useState<{ src: string, type: 'video' | 'image' | 'logo', start?: number, animationIndex?: number } | null>({ src: "/meditation-bg.png", type: 'image', animationIndex: 1 });
    const [currentSlideB, setCurrentSlideB] = useState<{ src: string, type: 'video' | 'image' | 'logo', start?: number, animationIndex?: number } | null>({ src: "/divine_om_bg.png", type: 'image', animationIndex: 2 });
    const [activeBuffer, setActiveBuffer] = useState<'A' | 'B'>('A');

    const videoRefA = React.useRef<HTMLVideoElement>(null);
    const videoRefB = React.useRef<HTMLVideoElement>(null);

    // --- SMART STRATEGY: Hybrid Loading & Playlist Queue ---

    // 1. Hardcoded Fallback List (Fail-Safe)
    // 2. Playlist Queue State
    const playlistQueue = React.useRef<{ src: string, type: 'video' | 'image' | 'logo' }[]>([]);

    // 3. Generator: Create a shuffled queue of all available content
    const generateFullPlaylistQueue = (slides: { src: string, type: 'video' | 'image' | 'logo' }[]) => {
        const content = slides.filter(s => s.type === 'video' || s.type === 'image');

        if (content.length === 0) return [];

        // Shuffle all available content
        return [...content].sort(() => Math.random() - 0.5);
    };

    // Fetch Media on Mount
    useEffect(() => {
        const fetchMedia = async () => {
            try {
                // 1. Fetch Flash Videos for Intro
                const flashRes = await fetch('/api/videos?folder=Flash Videos');
                console.log("[Intro] Flash fetch status:", flashRes.status);
                if (flashRes.ok) {
                    const data = await flashRes.json();

                    const videos = data.files
                        .filter((f: any) => {
                            const name = f.name.toLowerCase();
                            // Robust filter for Sahana Bhavatu (Shanti Mantra)
                            return !name.includes('sahana') &&
                                !name.includes('bhavatu') &&
                                !name.includes('sahna') &&
                                !name.includes('shanti_mantra');
                        })
                        .map((f: any) => {
                            let text: string | string[] = "विशेष ध्यान क्षेत्र में आपका स्वागत है...";
                            if (f.name.includes('kailash') && !f.name.includes('2')) {
                                text = [
                                    "🕉\n\nॐ असतो मा सद्गमय ।\nतमसो मा ज्योतिर्गमय ।\nमृत्योर्मा अमृतं गमय ।\nॐ शान्तिः शान्तिः शान्तिः ॥\n\nशुक्ल यजुर्वेद",
                                    "हे परमात्मा!\nहमें असत्य से सत्य की ओर ले चलो।\nअज्ञान रूपी अंधकार से ज्ञान के प्रकाश की ओर ले चलो।\nमृत्यु और भय से अमरत्व एवं आत्मिक शांति की ओर ले चलो।\n\n\nॐ शांति शांति शांति।\n\nहमारे मन में शांति हो,\nहमारे आसपास शांति हो,\nसंपूर्ण सृष्टि में शांति हो।",
                                    "शिव की पवित्र ध्यान स्थली, कैलाश में आपका स्वागत है। यहाँ अनन्त शांति की अनुभूति होती है।"
                                ];
                            }
                            else if (f.name.includes('kailash2')) {
                                text = [
                                    "अब आप चिंता मुक्त हो जाइए। हम अत्याधुनिक तकनीक और ऋषियों के प्राचीन ज्ञान के मिश्रण से आपकी समस्याओं का समाधान करेंगे।",
                                    "अब आप विशेष ध्यान क्षेत्र में प्रवेश कर रहे हैं..."
                                ];
                            }

                            return { src: f.path, text: text };
                        });
                    setIntroVideos(videos);
                }

                // 2. Fetch Slide Videos & Images for Background
                console.log("[Ambient] Fetching slide videos via API...");
                const [vRes, iRes] = await Promise.all([
                    fetch('/api/videos?folder=' + encodeURIComponent('Slide Videos') + '&t=' + Date.now()),
                    fetch('/api/images')
                ]);

                let combined: { src: string, type: 'video' | 'image' | 'logo' }[] = [];

                if (vRes.ok) {
                    const vData = await vRes.json();
                    if (vData.files && Array.isArray(vData.files)) {
                        const videos = vData.files.map((f: any) => ({ src: f.path, type: 'video' }));
                        console.log(`[Ambient] Loaded ${videos.length} videos from API.`);
                        combined = [...combined, ...videos];
                    }
                } else {
                    console.error("[Ambient] Failed to fetch slide videos:", vRes.status);
                }

                if (iRes.ok) {
                    const iData = await iRes.json();
                    const images = iData.files.map((f: any) => ({ src: f.path, type: 'image' }));
                    combined = [...combined, ...images];
                }

                // AI Safeguard: Ensure we have at least SOME content if API fails
                if (combined.length === 0) {
                    combined = [
                        { src: "/meditation-bg.png", type: 'image' },
                        { src: "/divine_om_bg.png", type: 'image' }
                    ];
                }

                // 3. Setup Initial Playback Queue from Loaded Media
                const batch = [...combined].sort(() => Math.random() - 0.5);
                playlistQueue.current = batch;

                // Initial Slide: Pick first from batch to avoid black screen immediately
                const firstSlide = playlistQueue.current.shift();
                if (firstSlide) {
                    const animationIndex = Math.floor(Math.random() * 4) + 1;
                    const startA = firstSlide.type === 'video' ? Math.floor(Math.random() * 4) * 15 : undefined;
                    setCurrentSlideA({ ...firstSlide, start: startA, animationIndex });
                    setActiveBuffer('A');
                }

                // Pre-fill next buffer immediately
                const nextSlide = playlistQueue.current.shift();
                if (nextSlide) {
                    const start = nextSlide.type === 'video' ? Math.floor(Math.random() * 4) * 15 : undefined;
                    const nextAnim = Math.floor(Math.random() * 4) + 1;
                    setCurrentSlideB({ ...nextSlide, start, animationIndex: nextAnim });
                }
            } catch (error) {
                console.error("Failed to fetch media:", error);
                // Fail-safe initialization
                const defaultSlide = { src: "/meditation-bg.png", type: 'image' as const };
                setCurrentSlideA({ ...defaultSlide, animationIndex: 1 });
                setActiveBuffer('A');
            }
        };

        fetchMedia();
    }, []);

    // 4. Smart Playlist Picker
    const pickRandomSlide = (isAgnihotraSession: boolean = false) => {
        if (ambientSlides.length === 0) return;

        // If Queue is empty, generate new balanced batch
        if (playlistQueue.current.length === 0) {
            console.log("[Ambient] Queue empty. Replenishing with all available content...");
            let pool = ambientSlides;
            if (isAgnihotraSession) {
                const imgPool = ambientSlides.filter(s => s.type === 'image');
                if (imgPool.length > 0) pool = imgPool;
            }

            const batch = generateFullPlaylistQueue(pool);
            playlistQueue.current = batch;
            console.log(`[Ambient] New Queue Size: ${batch.length}`);
        }

        // Pop next slide from queue
        // (Use shift() for FIFO, but pop() is fine if we generated randomly)
        // Let's use shift() to preserve the V,V,V,Logo order if generated that way.
        const nextSlide = playlistQueue.current.shift();

        if (!nextSlide) return; // Should not happen, but safe guard

        const start = nextSlide.type === 'video' ? Math.floor(Math.random() * 4) * 15 : undefined;
        const animationIndex = Math.floor(Math.random() * 4) + 1;

        console.log(`[Ambient] Playing: ${nextSlide.type} (${nextSlide.src}) | Queue Left: ${playlistQueue.current.length}`);

        if (activeBuffer === 'A') {
            setCurrentSlideB({ ...nextSlide, start, animationIndex });
        } else {
            setCurrentSlideA({ ...nextSlide, start, animationIndex });
        }
    };

    const isAgnihotra = useMemo(() => {
        const title = currentItem.titleHi.toLowerCase() + currentItem.title.toLowerCase();
        return title.includes('अग्निहोत्र') ||
            title.includes('agnihotra') ||
            title.includes('शान्ति') ||
            title.includes('shanti');
    }, [currentItem]);

    // Auto-rotate ambient slides: 3s for images (Agnihotra), 30s for videos
    React.useEffect(() => {
        if (!startBackgroundLoop || ambientSlides.length === 0) return;

        const currentSlide = activeBuffer === 'A' ? currentSlideA : currentSlideB;

        let effectiveDuration = 30000; // Default Video
        if (currentSlide?.type === 'image') effectiveDuration = 3000;
        if (currentSlide?.type === 'logo') {
            effectiveDuration = 11000; // 11s for the starting logo animation
        }

        console.log(`[Ambient] Timer set for ${effectiveDuration}ms (${currentSlide?.type}). Agnihotra Mode: ${isAgnihotra}`);

        const interval = setInterval(() => {
            console.log(`[Ambient] Rotating slide...`);
            if (isIntro) setIsIntro(false); // End intro mode after first rotation

            // 1. Swap Buffer to show the slide we (hopefully) prepped last time
            setActiveBuffer(prev => prev === 'A' ? 'B' : 'A');

            // 2. Prepare the NEXT slide for the buffer that just became inactive
            pickRandomSlide(isAgnihotra);
        }, effectiveDuration);

        return () => clearInterval(interval);
        // Clean dependency array to prevent loops
    }, [startBackgroundLoop, ambientSlides.length, activeBuffer, isAgnihotra, isIntro]);

    // Handle media synchronization on the buffers
    React.useEffect(() => {
        if (!startBackgroundLoop) return;

        const syncBuffer = (buffer: 'A' | 'B') => {
            const slide = buffer === 'A' ? currentSlideA : currentSlideB;
            const ref = buffer === 'A' ? videoRefA : videoRefB;

            if (ref.current && slide && slide.type === 'video') {
                const video = ref.current;
                const toPlay = encodeURI(slide.src);

                if (!video.src.includes(toPlay)) {
                    video.src = toPlay;
                    if (slide.start !== undefined) video.currentTime = slide.start;
                    video.load();
                }

                if (buffer === activeBuffer && currentItem.type === 'mantra') {
                    video.play().catch(e => {
                        if (e.name !== 'AbortError') console.warn(`[Ambient] Buffer ${buffer} play failed:`, e);
                    });
                }
            }
        };

        syncBuffer('A');
        syncBuffer('B');
    }, [currentSlideA, currentSlideB, activeBuffer, startBackgroundLoop, currentItem.type]);


    const ambientLayerStyle: React.CSSProperties = {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: 'top center',
        transition: 'opacity 1.5s ease-in-out',
    };

    return (
        <main
            className={pageStyles.container}
            style={{
                minHeight: '100vh',
                position: 'relative',
                overflowX: 'hidden',
                overflowY: 'auto'
            }}
        >
            {/* Navbar REMOVED as per user request */}
            {!showIntro && (
                <button
                    className={pageStyles.floatingLangToggle}
                    onClick={toggleLanguage}
                    title={lang === 'hi' ? 'Switch to English' : 'हिन्दी में बदलें'}
                >
                    <Languages size={20} />
                    <span>{lang === 'hi' ? 'EN' : 'HI'}</span>
                </button>
            )}
            {/* SPLASH SCREEN - Elegant Single Entry */}
            {!hasStarted && (
                <div className={pageStyles.spiritualEntry}>
                    {/* NEW: Static Sri Yantra as Center of Attraction - Above Title */}
                    <div className={pageStyles.staticYantraHero}>
                        <img
                            src="/images/Authentic Sri Yantra.jpg"
                            className={pageStyles.staticYantraImage}
                            alt="Authentic Sacred Sri Yantra"
                        />
                    </div>

                    <div className={pageStyles.entryContent}>
                        <h1 className={pageStyles.entryTitle}>
                            {/* Word-by-word & Letter-by-letter animation */}
                            <div className={pageStyles.animatedTitleWrapper}>
                                {"Connect with the Divine Intelligence".split(" ").map((word, wordIndex) => (
                                    <span key={wordIndex} style={{ display: "inline-block", whiteSpace: "nowrap", margin: "0 0.25em" }}>
                                        {word.split("").map((char, charIndex) => {
                                            // Calculate global index for staggered delay
                                            // Approximation: wordIndex * 5 + charIndex (robust enough for visual effect)
                                            const delay = (wordIndex * 5 + charIndex) * 0.05;
                                            return (
                                                <span
                                                    key={charIndex}
                                                    className={pageStyles.animatedLetter}
                                                    style={{ animationDelay: `${delay}s` }}
                                                >
                                                    {char}
                                                </span>
                                            );
                                        })}
                                    </span>
                                ))}
                            </div>
                        </h1>
                        <p className={pageStyles.entrySub}>
                            एक दिव्य परिवर्तन की यात्रा के लिए तैयार रहें...<br />
                            <span>
                                Prepare for a transformation journey...
                            </span>
                        </p>
                    </div>

                    {/* Divine Entry Gate - Simplified (No Name Input) */}
                    <div className={pageStyles.nameGateContainer}>
                        {/* Consecrated Enter Button - Always Enabled */}
                        <button
                            id="consecrated-enter-btn"
                            onClick={() => {
                                if (introVideos.length > 0) {
                                    // 1. UNLOCK AUDIO CONTEXT IMMEDIATELY
                                    const unlockAudio = new Audio();
                                    unlockAudio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAGZGF0YQAAAAA="; // Silent WAV
                                    unlockAudio.play().then(() => {
                                        console.log("[Audio] Global Context Unlocked");
                                    }).catch(e => console.warn("[Audio] Unlock failed:", e));

                                    setIsFirstTime(true);
                                    setHasStarted(true);
                                    // DO NOT setisMantraPlaying(true) here, let IntroVideoFlash finish first
                                }
                            }}
                            disabled={introVideos.length === 0}
                            className={pageStyles.consecratedButton}
                            style={{ opacity: 1, pointerEvents: 'auto' }}
                        >
                            {introVideos.length === 0
                                ? (lang === 'hi' ? '🪷 प्रतीक्षा करें...' : '🪷 Awaiting Divine Presence...')
                                : '🪷 Enter The Divinity'}
                        </button>
                    </div>
                </div>
            )}
            <style jsx>{`
                        @keyframes breathe {
                            0%, 100% { transform: scale(1); opacity: 0.25; }
                            50% { transform: scale(1.08); opacity: 0.4; }
                        }
                        @keyframes gentlePulse {
                            0%, 100% { box-shadow: 0 8px 32px rgba(255, 215, 0, 0.2); }
                            50% { box-shadow: 0 8px 40px rgba(255, 215, 0, 0.4), 0 0 60px rgba(255, 153, 51, 0.15); }
                        }
                    `}</style>


            {/* INTRO VIDEO FLASH (Now activates after user interaction) */}
            {
                showIntro && hasStarted && (
                    <IntroVideoFlash
                        videos={introVideos}
                        onFadeOutStart={() => {
                            console.log("[Intro] Fade out started, initiating background early...");
                            // REMOVED: setStartBackgroundLoop(true) - to prevent Guidance form starting too early
                        }}
                        onComplete={() => {
                            console.log("Intro complete. Starting Margdarshan...");
                            setShowIntro(false);
                            setStartBackgroundLoop(true);
                            setIsSessionPaused(false);

                            // Explicitly trigger Margdarshan (playlist[0])
                            const firstItem = playlist[0];
                            if (firstItem && firstItem.type === 'mantra') {
                                setForceMantraId(firstItem.id || null);
                                setIsMantraPlaying(true);
                            }
                        }}
                    />
                )
            }

            {/* ... language button ... */}

            {/* Mantra Sangrah - Divine Audio Player */}
            <MantraSangrah
                lang={lang}
                isOpen={isMantraMenuOpen}
                setIsOpen={setIsMantraMenuOpen}
                // UNIFIED CONTROLLER:
                // Only play if activeItem is a mantra AND the main loop has started.
                activeTrack={startBackgroundLoop && activeItem && (activeItem.type === 'mantra' || !activeItem.type) ? activeItem : null}
                sessionActive={!isSessionPaused}

                onPlayingChange={(playing) => {
                    setIsMantraPlaying(playing);
                    // Update global pause state if needed for UI sync
                    if (!playing && activeItem?.type === 'mantra') {
                        setIsSessionPaused(true);
                    } else {
                        setIsSessionPaused(false);
                    }
                }}
                onTrackEnded={() => {
                    goNext();
                }}
                onTrackSelect={handleTrackSelect}
                onSelectIndex={handleSelectIndex}
                externalPlaylist={playlist}
                currentIndex={currentIndex}
                showTriggers={startBackgroundLoop}
                onActiveTrackChange={(track) => setActiveMantra(track)}
                onTimeUpdate={(cur, dur) => {
                    setAudioTime(cur);
                    setAudioDuration(dur);
                }}
                // Video Control Props
                videoProgress={videoProgress}
                videoTime={videoTime}
                videoDuration={videoDuration}
                onVideoSeek={(time) => {
                    if (sequentialVideoRef.current) {
                        sequentialVideoRef.current.currentTime = time;
                    }
                }}
                onVideoToggle={() => {
                    if (sequentialVideoRef.current) {
                        if (isSessionPaused) {
                            sequentialVideoRef.current.play().catch(() => { });
                            setIsSessionPaused(false);
                        } else {
                            sequentialVideoRef.current.pause();
                            setIsSessionPaused(true);
                        }
                    }
                }}
                volume={volume}
                onVolumeChange={setVolume}
            />

            {/* LIGHTWEIGHT MEDIA PLAYER - Global Control Center */}
            {/* LIGHTWEIGHT MEDIA PLAYER - Global Control Center (REMOVED - Now inside Mantra Menu) */}

            {/* MAIN CONTENT LAYER - Video Player (Only render when actual video is playing) */}
            {
                startBackgroundLoop && currentItem.type === 'video' && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        zIndex: 0,  // Lowered from 1
                        pointerEvents: 'none'
                    }}>
                        {/* LAYER 1: Meditation Sequence Video (Darshans) */}
                        <video
                            ref={sequentialVideoRef}
                            playsInline
                            muted={false}
                            onEnded={goNext}
                            onWaiting={() => setIsVideoLoading(true)}
                            onPlaying={() => setIsVideoLoading(false)}
                            onCanPlay={() => setIsVideoLoading(false)}
                            onLoadedData={() => setIsVideoLoading(false)}
                            onLoadStart={() => setIsVideoLoading(true)}
                            onStalled={() => setIsVideoLoading(true)}
                            onError={(e) => {
                                setIsVideoLoading(false);
                                const error = (e.currentTarget.error);
                                console.error(`[Sequential Video Error] Code ${error?.code}: ${error?.message}`, currentItem.src);
                            }}
                            onTimeUpdate={(e) => {
                                const video = e.currentTarget;

                                // Update unified control bar state
                                if (video.duration > 0) {
                                    setVideoTime(video.currentTime);
                                    setVideoDuration(video.duration);
                                    setVideoProgress((video.currentTime / video.duration) * 100);
                                }

                                const trim = (currentItem as any).trimEnd;
                                if (trim && video.currentTime > 0 && video.duration > 0) {
                                    if (video.duration - video.currentTime <= trim) {
                                        console.log(`[Trimming] Early transition for ${currentItem.id}`);
                                        goNext();
                                    }
                                }
                            }}
                            style={{
                                display: currentItem.type === 'video' ? 'block' : 'none',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                objectPosition: 'center',
                                transition: 'opacity 1s ease-in-out',
                                zIndex: 0, // Lowered behind Sri Yantra container
                                backgroundColor: '#000'
                            }}
                        />

                        {/* VIDEO LOADING OVERLAY */}
                        {isVideoLoading && currentItem.type === 'video' && (
                            <div className={pageStyles.videoBufferingOverlay}>
                                <div className={pageStyles.spiritualSpinner}>
                                    <div className={pageStyles.spinnerLotus}>🪷</div>
                                    <span className={pageStyles.loadingText}>
                                        {lang === 'hi' ? 'संचित हो रहा है... (Loading)' : 'Accumulating... (Loading)'}
                                    </span>
                                </div>
                            </div>
                        )}






                    </div>
                )
            }

            {/* AMBIENT SLIDE LAYERS (Double Buffered) */}
            {startBackgroundLoop && currentItem.type === 'mantra' && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 1, backgroundColor: '#020810' }}>
                    {/* Fixed Fallback Background to prevent black screen */}
                    <img
                        src="/meditation-bg.png"
                        style={{ ...ambientLayerStyle, opacity: 1, zIndex: 0 }}
                        alt="Background Fallback"
                    />

                    {/* Buffer A */}
                    {currentSlideA && (
                        <div style={{ ...ambientLayerStyle, opacity: activeBuffer === 'A' ? 1 : 0, zIndex: 0 }}>
                            {currentSlideA.type === 'video' ? (
                                <video
                                    ref={videoRefA}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    muted
                                    playsInline
                                    loop
                                    onError={() => {
                                        console.warn("[Ambient] Video A failed, skipping...");
                                        pickRandomSlide();
                                    }}
                                />
                            ) : currentSlideA.type === 'logo' ? (
                                <div className={pageStyles.logoMovement}>
                                    <div className={pageStyles.iconSurround}>
                                        <img src={currentSlideA.src} className={pageStyles.entryOm} alt="Pranav.AI" />
                                    </div>
                                </div>
                            ) : (
                                <img
                                    src={currentSlideA.src}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    className={pageStyles[`ambientCinematic${currentSlideA.animationIndex || 1}`]}
                                    alt="Ambient image"
                                />
                            )}
                        </div>
                    )}

                    {/* Buffer B */}
                    {currentSlideB && (
                        <div style={{ ...ambientLayerStyle, opacity: activeBuffer === 'B' ? 1 : 0, zIndex: 0 }}>
                            {currentSlideB.type === 'video' ? (
                                <video
                                    ref={videoRefB}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    muted
                                    playsInline
                                    loop
                                    onError={() => {
                                        console.warn("[Ambient] Video B failed, skipping...");
                                        pickRandomSlide();
                                    }}
                                />
                            ) : currentSlideB.type === 'logo' ? (
                                <div className={pageStyles.logoMovement}>
                                    <div className={pageStyles.iconSurround}>
                                        <img src={currentSlideB.src} className={pageStyles.entryOm} alt="Pranav.AI" />
                                    </div>
                                </div>
                            ) : (
                                <img
                                    src={currentSlideB.src}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    className={pageStyles[`ambientCinematic${currentSlideB.animationIndex || 1}`]}
                                    alt="Ambient image"
                                />
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Dark Overlay REMOVED for brightness */}
            {/* <div style={{...}} /> */}

            {/* Radial Vignette REMOVED for brightness */}
            {/* <div style={{...}} /> */}

            {/* Main Content Container */}
            <div className={`${pageStyles.heroSection} ${showIntro ? pageStyles.mainContentHidden : ""}`} style={{ zIndex: 100 }}>



                {/* Floating Track Title - Top Edge */}
                {!showIntro && startBackgroundLoop && (
                    <div className={pageStyles.floatingTrackTitle}>
                        <div className={pageStyles.trackTitleContent}>
                            <Sparkles size={16} className={pageStyles.sparkleIcon} />
                            <h2 className={pageStyles.dynamicText}>
                                {lang === 'hi' ? currentItem.titleHi : currentItem.title}
                            </h2>
                            <Sparkles size={16} className={pageStyles.sparkleIcon} />
                        </div>
                    </div>
                )}


                {/* Sri Yantra - Central Focus - Size adjusted in component CSS */}
                <div className={pageStyles.sriYantraContainer}>
                    <SriYantra />
                </div>



            </div>

            {/* UNIFIED SESSION PLAYER (Replaces Old Dashboard) */}
            {!showIntro && startBackgroundLoop && (
                <div className={pageStyles.sessionDashboard}>
                    <LightweightPlayer
                        lang={lang}
                        title={currentItem.title || ''}
                        titleHi={currentItem.titleHi || ''}
                        type={currentItem.type as any || 'mantra'}
                        isPlaying={currentItem.type === 'video' ? (!isSessionPaused && !isMantraPlaying) : isMantraPlaying}
                        progress={currentItem.type === 'video' ? videoProgress : (audioDuration ? (audioTime / audioDuration) * 100 : 0)}
                        currentTime={currentItem.type === 'video' ? videoTime : audioTime}
                        duration={currentItem.type === 'video' ? videoDuration : audioDuration}
                        onTogglePlay={() => {
                            if (currentItem.type === 'video') {
                                if (sequentialVideoRef.current) {
                                    if (isSessionPaused) {
                                        sequentialVideoRef.current.play().catch(() => { });
                                        setIsSessionPaused(false);
                                    } else {
                                        sequentialVideoRef.current.pause();
                                        setIsSessionPaused(true);
                                    }
                                }
                            } else {
                                setIsSessionPaused(!isSessionPaused);
                            }
                        }}

                        onNext={goNext}
                        onPrevious={goPrevious}
                        onSeek={(time) => {
                            if (currentItem.type === 'video') {
                                if (sequentialVideoRef.current) sequentialVideoRef.current.currentTime = time;
                            } else {
                                setAudioTime(time);
                            }
                        }}
                    />
                </div>
            )}

        </main >
    );
}
