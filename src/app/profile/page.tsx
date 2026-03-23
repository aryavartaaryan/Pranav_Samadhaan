'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, ChevronLeft, Star, Zap, Heart, BarChart3, Edit2, Save, X, Loader2, ShieldCheck, Search, Link2, LockKeyhole, ExternalLink, Info, CheckCircle2, ChevronDown, LifeBuoy, FileText, ShieldAlert, CreditCard, Trash2, Smartphone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCircadianBackground } from '@/hooks/useCircadianBackground';
import { useOneSutraAuth } from '@/hooks/useOneSutraAuth';
import { getFirebaseFirestore } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getMockSellerApps } from "@/lib/mockStore";
import styles from './page.module.css';

// ════════════════════════════════════════════════════════
//  TYPES & DEFAULTS
// ════════════════════════════════════════════════════════
type Dosha = 'vata' | 'pitta' | 'kapha';
type IntegrationTab = 'oauth' | 'vault';
type VaultToolKey = 'amazon' | 'flipkart' | 'blinkit' | 'irctc' | 'yatra';
type OAuthToolKey = 'google_workspace' | 'linkedin' | 'github' | 'slack' | 'twitter_x' | 'instagram' | 'telegram' | 'whatsapp_webhook';

interface IntegrationTool {
    key: OAuthToolKey | VaultToolKey;
    label: string;
    subtitle: string;
    category: IntegrationTab;
    oauthUrl?: string;
}

interface IntegrationFlag {
    connected: boolean;
    connectedAt?: string;
}

interface UserIntegrations {
    oauth: Record<OAuthToolKey, IntegrationFlag>;
    vault: Record<VaultToolKey, IntegrationFlag>;
}

interface UserProfileData {
    name: string;
    title: string;
    joined: string;
    prakriti: string; // e.g. "Vata-Pitta"
    dosha: Dosha;     // dominant dosha for visuals
    vibeConnections: number;
    // We'll keep these structure for now, populate from real data if available or defaults
    stats: Array<{ label: string; value: string | number; unit: string; icon: any }>;
    badges: Array<{ id: string; label: string; emoji: string; earned: boolean }>;
}

const DEFAULT_PROFILE: UserProfileData = {
    name: 'Traveller',
    title: 'Sattvik Seeker',
    joined: 'Just now',
    prakriti: 'Vata-Pitta',
    dosha: 'vata',
    vibeConnections: 0,
    stats: [
        { label: 'Days Active', value: '1', unit: 'day', icon: Star },
        { label: 'Meditations', value: '0', unit: 'sessions', icon: Heart },
        { label: 'Habits Done', value: '0', unit: '%', icon: Zap },
        { label: 'Focus Hours', value: '0', unit: 'hrs', icon: BarChart3 },
    ],
    badges: [
        { id: 'riser', label: 'Early Riser', emoji: '🌅', earned: false },
        { id: 'sattvik', label: 'Sattvik', emoji: '🌿', earned: false },
        { id: 'calm', label: 'Calm Mind', emoji: '🪷', earned: false },
    ],
};

const OAUTH_TOOLS: IntegrationTool[] = [
    { key: 'google_workspace', label: 'Google Workspace', subtitle: 'Gmail, Calendar, Drive workflows', category: 'oauth', oauthUrl: '/api/agents/oauth/start?provider=google_workspace' },
    { key: 'linkedin', label: 'LinkedIn', subtitle: 'Profile and posting actions', category: 'oauth', oauthUrl: '/api/agents/oauth/start?provider=linkedin' },
    { key: 'github', label: 'GitHub', subtitle: 'PR insights and review intelligence', category: 'oauth', oauthUrl: '/api/agents/oauth/start?provider=github' },
    { key: 'slack', label: 'Slack', subtitle: 'Team messaging and reminders', category: 'oauth', oauthUrl: '/api/agents/oauth/start?provider=slack' },
    { key: 'twitter_x', label: 'Twitter (X)', subtitle: 'Posting and thread drafting', category: 'oauth', oauthUrl: '/api/agents/oauth/start?provider=twitter_x' },
    { key: 'instagram', label: 'Instagram', subtitle: 'Social publishing workflows', category: 'oauth', oauthUrl: '/api/agents/oauth/start?provider=instagram' },
    { key: 'telegram', label: 'Telegram', subtitle: 'Bot and message workflows', category: 'oauth', oauthUrl: process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL || 'https://t.me/SakhaBodhibot' },
    { key: 'whatsapp_webhook', label: 'WhatsApp Webhook', subtitle: 'Notification and event dispatch', category: 'oauth', oauthUrl: '/api/agents/oauth/start?provider=whatsapp_webhook' },
];

const VAULT_TOOLS: IntegrationTool[] = [
    { key: 'amazon', label: 'Amazon', subtitle: 'AI cart and product actions', category: 'vault' },
    { key: 'flipkart', label: 'Flipkart', subtitle: 'Shopping automation flow', category: 'vault' },
    { key: 'blinkit', label: 'Blinkit', subtitle: 'Instant grocery execution', category: 'vault' },
    { key: 'irctc', label: 'IRCTC', subtitle: 'Train booking browser workflow', category: 'vault' },
    { key: 'yatra', label: 'Yatra.com', subtitle: 'Travel booking browser workflow', category: 'vault' },
];

const OAUTH_KEYS = OAUTH_TOOLS.map(t => t.key) as OAuthToolKey[];
const VAULT_KEYS = VAULT_TOOLS.map(t => t.key) as VaultToolKey[];

function defaultIntegrations(): UserIntegrations {
    const oauth = {} as Record<OAuthToolKey, IntegrationFlag>;
    OAUTH_KEYS.forEach((k) => {
        oauth[k] = { connected: false };
    });

    const vault = {} as Record<VaultToolKey, IntegrationFlag>;
    VAULT_KEYS.forEach((k) => {
        vault[k] = { connected: false };
    });

    return { oauth, vault };
}

function normalizeDosha(prakriti: string): Dosha {
    const lower = (prakriti || '').toLowerCase();
    if (lower.includes('vata')) return 'vata';
    if (lower.includes('pitta')) return 'pitta';
    if (lower.includes('kapha')) return 'kapha';
    return 'vata'; // detailed logic can be added later
}

// ════════════════════════════════════════════════════════
//  VIBE ENERGY BODY — generative animated avatar canvas
// ════════════════════════════════════════════════════════
function drawEnergyBody(canvas: HTMLCanvasElement, dosha: Dosha, time: number) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    ctx.clearRect(0, 0, W, H);

    const palette = {
        vata: ['#9d4edd', '#c77dff', '#64b5f6', '#7b2ff7'],
        pitta: ['#ff6b35', '#ffd60a', '#ff4500', '#ff9b00'],
        kapha: ['#40916c', '#52b788', '#2166ac', '#74c69d'],
    }[dosha] || ['#9d4edd', '#c77dff', '#64b5f6', '#7b2ff7'];

    const aura = ctx.createRadialGradient(cx, cy, 10, cx, cy, W * 0.48);
    aura.addColorStop(0, palette[0] + '22');
    aura.addColorStop(0.6, palette[1] + '11');
    aura.addColorStop(1, 'transparent');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, W, H);

    for (let ring = 0; ring < 4; ring++) {
        const phase = time * (0.4 + ring * 0.2) + ring * 0.8;
        const r = (W * 0.12 * (ring + 1)) + Math.sin(phase) * 6;
        const g = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r);
        g.addColorStop(0, 'transparent');
        g.addColorStop(0.5, palette[ring % palette.length] + '18');
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(1, r), 0, Math.PI * 2);
        ctx.fill();
    }

    if (dosha === 'vata') {
        for (let a = 0; a < 5; a++) {
            ctx.beginPath();
            for (let i = 0; i < 60; i++) {
                const t = i / 60;
                const angle = t * 4 + time * 0.6 + (a / 5) * Math.PI * 2;
                const rad = t * W * 0.42 + Math.sin(time * 1.5 + a) * 5;
                const x = cx + Math.cos(angle) * rad;
                const y = cy + Math.sin(angle) * rad;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = palette[a % palette.length] + '44';
            ctx.lineWidth = 1.2;
            ctx.stroke();
        }
    }
    if (dosha === 'pitta') {
        for (let r = 1; r < 6; r++) {
            const phase = (time * 2 + r * 0.9) % (Math.PI * 2);
            const rad = Math.max(1, (r / 6) * W * 0.42 + Math.sin(phase) * 7);
            ctx.beginPath();
            ctx.arc(cx, cy, rad, 0, Math.PI * 2);
            ctx.strokeStyle = palette[r % palette.length] + '40';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    }
    if (dosha === 'kapha') {
        for (let b = 0; b < 5; b++) {
            const t = time * 0.2 + b * 1.3;
            const bx = cx + Math.cos(t) * W * 0.18;
            const by = cy + Math.sin(t * 0.75) * H * 0.18;
            const br = Math.max(2, W * (0.18 + 0.04 * Math.sin(t * 0.5)));
            const gb = ctx.createRadialGradient(bx, by, 0, bx, by, br);
            gb.addColorStop(0, palette[b % palette.length] + '88');
            gb.addColorStop(1, 'transparent');
            ctx.fillStyle = gb;
            ctx.beginPath();
            ctx.ellipse(bx, by, br, Math.max(2, br * 1.1), t * 0.15, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.globalCompositeOperation = 'source-over';
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.12);
    coreGrad.addColorStop(0, palette[0] + 'cc');
    coreGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, W * 0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'destination-in';
    const clip = ctx.createRadialGradient(cx, cy, W * 0.25, cx, cy, W * 0.5);
    clip.addColorStop(0, 'rgba(0,0,0,1)');
    clip.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = clip;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
}

function VibeAvatarBody({ dosha, size = 110 }: { dosha: Dosha; size?: number }) {
    const ref = useRef<HTMLCanvasElement>(null);
    const raf = useRef<number>(0);
    const t = useRef(0);
    useEffect(() => {
        const c = ref.current;
        if (!c) return;
        c.width = size; c.height = size;
        const loop = () => {
            t.current += 0.014;
            drawEnergyBody(c, dosha, t.current);
            raf.current = requestAnimationFrame(loop);
        };
        raf.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf.current);
    }, [dosha, size]);
    return <canvas ref={ref} style={{ borderRadius: '50%', width: size, height: size }} />;
}

// ════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════
export default function ProfilePage() {
    const { user, signOut } = useOneSutraAuth();
    const router = useRouter();
    const { imageUrl, loaded } = useCircadianBackground('vedic');

    // State
    const [profile, setProfile] = useState<UserProfileData>(DEFAULT_PROFILE);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);

    // Admin & Seller Authorization Check
    const isAdmin = user && ["studywithpwno.1@gmail.com", "studywithpwno.1@gmaiil.com", "aryavartaayan9@gmail.com"].includes((user as any)?.email);
    const canSeeSeller = isAdmin;
    const [isHubOpen, setIsHubOpen] = useState(false);
    const [integrationTab, setIntegrationTab] = useState<IntegrationTab>('oauth');
    const [integrationSearch, setIntegrationSearch] = useState('');
    const [integrations, setIntegrations] = useState<UserIntegrations>(defaultIntegrations());
    const [showSecurityInfo, setShowSecurityInfo] = useState(false);
    const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
    const [activeVaultTool, setActiveVaultTool] = useState<VaultToolKey | null>(null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [vaultForm, setVaultForm] = useState({
        username: '',
        password: '',
        otpRealtime: true,
        notes: '',
    });
    const [vaultSaving, setVaultSaving] = useState(false);
    // UI State for Settings Accordion
    const [expandedSection, setExpandedSection] = useState<string | null>(null);
    const toggleSection = (id: string) => setExpandedSection(p => p === id ? null : id);
    // Form State
    const [editForm, setEditForm] = useState({
        name: '',
        title: '',
        prakriti: '',
    });

    const filteredTools = useMemo(() => {
        const source = integrationTab === 'oauth' ? OAUTH_TOOLS : VAULT_TOOLS;
        const q = integrationSearch.trim().toLowerCase();
        if (!q) return source;
        return source.filter((tool) => `${tool.label} ${tool.subtitle}`.toLowerCase().includes(q));
    }, [integrationTab, integrationSearch]);

    const integrationCount = useMemo(() => {
        const oauthConnected = OAUTH_KEYS.filter((k) => integrations.oauth[k]?.connected).length;
        const vaultConnected = VAULT_KEYS.filter((k) => integrations.vault[k]?.connected).length;
        return {
            oauthConnected,
            vaultConnected,
            total: oauthConnected + vaultConnected,
            all: OAUTH_KEYS.length + VAULT_KEYS.length,
        };
    }, [integrations]);

    const openVaultModal = (toolKey: VaultToolKey) => {
        setActiveVaultTool(toolKey);
        setVaultForm({ username: '', password: '', otpRealtime: true, notes: '' });
        setIsVaultModalOpen(true);
    };

    const closeVaultModal = () => {
        setIsVaultModalOpen(false);
        setActiveVaultTool(null);
    };

    const toBase64 = (input: Uint8Array) => {
        let binary = '';
        for (let i = 0; i < input.byteLength; i++) {
            binary += String.fromCharCode(input[i]);
        }
        return btoa(binary);
    };

    const encryptVaultPayload = async (uid: string, plain: string) => {
        if (typeof window === 'undefined' || !window.crypto?.subtle) {
            throw new Error('Secure encryption APIs are unavailable in this browser');
        }

        const passphrase = process.env.NEXT_PUBLIC_INTEGRATION_VAULT_KEY;
        if (!passphrase) {
            throw new Error('Vault encryption key is missing (NEXT_PUBLIC_INTEGRATION_VAULT_KEY)');
        }

        const enc = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            'raw',
            enc.encode(passphrase),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        const salt = enc.encode(`onesutra-vault-${uid}`);
        const key = await window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt,
                iterations: 120000,
                hash: 'SHA-256',
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
        );

        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const cipherBuffer = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            enc.encode(plain)
        );

        return {
            algorithm: 'AES-GCM',
            kdf: 'PBKDF2-SHA256',
            iterations: 120000,
            iv: toBase64(iv),
            ciphertext: toBase64(new Uint8Array(cipherBuffer)),
            encodedAt: new Date().toISOString(),
        };
    };

    // Fetch data using onSnapshot for real-time updates
    useEffect(() => {
        if (!user) {
            // Not logged in -> maybe redirect? For now show default "Traveller"
            setIsLoading(false);
            return;
        }

        let unsubscribe = () => { };

        const fetchProfile = async () => {
            try {
                const db = await getFirebaseFirestore();
                const userDocRef = doc(db, 'onesutra_users', user.uid);

                unsubscribe = onSnapshot(userDocRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();

                        // Merge with defaults
                        setProfile(prev => ({
                            ...prev,
                            name: data.name || user.name || 'Traveller',
                            title: data.title || 'Sattvik Seeker',
                            joined: data.joined || 'Feb 2025', // Should format this if it's a timestamp
                            prakriti: data.prakriti || 'Vata-Pitta',
                            dosha: normalizeDosha(data.prakriti || 'Vata'),
                            vibeConnections: data.vibeConnections || 0,
                            // If stats exist in doc, use them, else defaults
                            stats: data.stats ? data.stats.map((s: any) => ({
                                ...s,
                                icon: ({ 'Star': Star, 'Heart': Heart, 'Zap': Zap, 'BarChart3': BarChart3 } as any)[s.iconName] || Star // Map string icon names if stored
                            })) : DEFAULT_PROFILE.stats
                        }));

                        // Sync edit form with fetched data initially
                        if (!isEditing) {
                            setEditForm({
                                name: data.name || user.name || '',
                                title: data.title || 'Sattvik Seeker',
                                prakriti: data.prakriti || 'Vata-Pitta',
                            });
                        }

                    } else {
                        // User exists in Auth but no doc -> Create placeholder or just show Auth name
                        const initialData = {
                            name: user.name || 'Traveller',
                            title: 'Sattvik Seeker',
                            prakriti: 'Vata-Pitta'
                        };
                        setProfile(prev => ({
                            ...prev,
                            ...initialData
                        }));
                        setEditForm(initialData);
                    }
                    setIsLoading(false);
                });
            } catch (error) {
                console.error("Error fetching profile:", error);
                setIsLoading(false);
            }
        };

        fetchProfile();

        return () => unsubscribe();
    }, [user, isEditing]); // Refetch if user changes. isEditing dependency ensures form sync logic works correctly if data updates while not editing.

    useEffect(() => {
        if (!user) {
            setIntegrations(defaultIntegrations());
            return;
        }

        let unsub = () => { };

        (async () => {
            const db = await getFirebaseFirestore();
            const integrationRef = doc(db, 'users', user.uid, 'integrations', 'main');
            unsub = onSnapshot(integrationRef, (snap) => {
                if (!snap.exists()) {
                    setIntegrations(defaultIntegrations());
                    return;
                }

                const data = snap.data() as Partial<UserIntegrations>;
                const defaults = defaultIntegrations();

                const oauth = { ...defaults.oauth };
                OAUTH_KEYS.forEach((k) => {
                    oauth[k] = {
                        connected: Boolean(data.oauth?.[k]?.connected),
                        connectedAt: data.oauth?.[k]?.connectedAt,
                    };
                });

                const vault = { ...defaults.vault };
                VAULT_KEYS.forEach((k) => {
                    vault[k] = {
                        connected: Boolean(data.vault?.[k]?.connected),
                        connectedAt: data.vault?.[k]?.connectedAt,
                    };
                });

                setIntegrations({ oauth, vault });
            });
        })().catch((err) => {
            console.error('Failed to subscribe integrations', err);
        });

        return () => {
            unsub();
        };
    }, [user]);


    const handleSave = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const db = await getFirebaseFirestore();
            const userRef = doc(db, 'onesutra_users', user.uid);

            // Check if doc exists first, if not setDoc (merge), else updateDoc
            const snap = await getDoc(userRef);

            const updates = {
                name: editForm.name,
                title: editForm.title,
                prakriti: editForm.prakriti,
                updatedAt: new Date().toISOString()
            };

            if (snap.exists()) {
                await updateDoc(userRef, updates);
            } else {
                await setDoc(userRef, {
                    ...updates,
                    joined: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                    email: user.email // Store email for reference
                });
            }

            setIsEditing(false);
        } catch (err) {
            console.error("Failed to save profile", err);
            alert("Failed to save changes. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        try {
            await signOut();
            if (typeof window !== 'undefined') {
                localStorage.removeItem('pranav_has_started');
                localStorage.removeItem('vedic_user_name');
                localStorage.removeItem('onesutra_user_profile');
            }
        } catch (error) {
            console.error('Logout failed', error);
        } finally {
            router.replace('/');
            router.refresh();
            setIsLoggingOut(false);
        }
    };

    const setOAuthConnection = async (toolKey: OAuthToolKey, connected: boolean) => {
        if (!user) return;
        const db = await getFirebaseFirestore();
        const integrationRef = doc(db, 'users', user.uid, 'integrations', 'main');
        await setDoc(
            integrationRef,
            {
                oauth: {
                    [toolKey]: {
                        connected,
                        connectedAt: connected ? new Date().toISOString() : null,
                    },
                },
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );
    };

    const setVaultConnection = async (toolKey: VaultToolKey, connected: boolean) => {
        if (!user) return;
        const db = await getFirebaseFirestore();
        const integrationRef = doc(db, 'users', user.uid, 'integrations', 'main');
        await setDoc(
            integrationRef,
            {
                vault: {
                    [toolKey]: {
                        connected,
                        connectedAt: connected ? new Date().toISOString() : null,
                    },
                },
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );
    };

    const handleOAuthAction = async (tool: IntegrationTool) => {
        if (!user || tool.category !== 'oauth') return;
        const key = tool.key as OAuthToolKey;
        const currentlyConnected = integrations.oauth[key]?.connected;

        if (currentlyConnected) {
            await setOAuthConnection(key, false);
            return;
        }

        if (key === 'telegram') {
            await setOAuthConnection(key, true);
            const redirectUrl = tool.oauthUrl || 'https://t.me/SakhaBodhibot';
            try {
                const urlObj = new URL(redirectUrl);
                urlObj.searchParams.set('start', user.uid);
                window.open(urlObj.toString(), '_blank', 'noopener,noreferrer');
            } catch (e) {
                // Fallback if URL parsing fails
                window.open(`${redirectUrl}?start=${user.uid}`, '_blank', 'noopener,noreferrer');
            }
            return;
        }

        await setOAuthConnection(key, true);
        if (tool.oauthUrl && typeof window !== 'undefined') {
            window.open(tool.oauthUrl, '_blank', 'noopener,noreferrer');
        }
    };

    const handleVaultSubmit = async () => {
        if (!user || !activeVaultTool) return;
        if (!vaultForm.username.trim() || !vaultForm.password.trim()) {
            alert('Username and password are required for Vault setup.');
            return;
        }

        setVaultSaving(true);
        try {
            const db = await getFirebaseFirestore();
            const payload = {
                username: vaultForm.username.trim(),
                password: vaultForm.password,
                otpRealtime: vaultForm.otpRealtime,
                notes: vaultForm.notes.trim(),
            };

            const encrypted = await encryptVaultPayload(user.uid, JSON.stringify(payload));
            const credRef = doc(db, 'users', user.uid, 'integrations', 'main', 'vault_credentials', activeVaultTool);

            await setDoc(
                credRef,
                {
                    service: activeVaultTool,
                    encrypted,
                    otpInstruction: vaultForm.otpRealtime
                        ? 'Bodhi will ask for OTP in real-time during execution.'
                        : 'OTP prompt disabled by user settings.',
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );

            await setVaultConnection(activeVaultTool, true);
            closeVaultModal();
        } catch (err: any) {
            console.error('Vault save failed', err);
            alert(err?.message || 'Failed to save encrypted credentials.');
        } finally {
            setVaultSaving(false);
        }
    };

    // Calculate display dosha from current form state if editing, else profile
    const displayDosha = isEditing ? normalizeDosha(editForm.prakriti) : profile.dosha;

    return (
        <>
            {/* ── Circadian nature background ── */}
            <div style={{
                position: 'fixed', inset: 0, zIndex: 0,
                backgroundImage: `url(${imageUrl})`,
                backgroundSize: 'cover', backgroundPosition: 'center',
                transition: 'opacity 1.5s ease',
                opacity: loaded ? 1 : 0,
            }} aria-hidden />
            {/* Gradient scrim */}
            <div style={{
                position: 'fixed', inset: 0, zIndex: 1,
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.78) 100%)',
                pointerEvents: 'none',
            }} aria-hidden />

            <main className={styles.page}>

                {/* ── Sticky Top Bar ── */}
                <motion.header
                    className={styles.topBar}
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                    <button className={styles.backBtn} onClick={() => router.back()} aria-label="Go back">
                        <ChevronLeft size={20} strokeWidth={1.8} />
                    </button>
                    <div className={styles.topBarCenter}>
                        <span className={styles.topBarTitle}>Sanctuary</span>
                        <span className={styles.topBarSub}>Your Conscious Space</span>
                    </div>
                    <div className={styles.topActions} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {canSeeSeller && (
                            <button
                                onClick={() => router.push('/swadesi-product/seller-products')}
                                style={{ background: 'rgba(167, 243, 208, 0.15)', border: '1px solid rgba(167, 243, 208, 0.3)', borderRadius: '8px', padding: '0 12px', height: '36px', display: 'flex', alignItems: 'center', color: '#A7F3D0', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                title="Seller Dashboard"
                            >
                                🏪 Seller
                            </button>
                        )}
                        {isAdmin && (
                            <button
                                onClick={() => router.push('/swadesi-product/admin-products')}
                                style={{ background: 'rgba(252, 165, 165, 0.15)', border: '1px solid rgba(252, 165, 165, 0.3)', borderRadius: '8px', padding: '0 12px', height: '36px', display: 'flex', alignItems: 'center', color: '#FCA5A5', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                title="Admin Dashboard"
                            >
                                🛠 Admin
                            </button>
                        )}

                        {/* Edit Toggle */}
                        {user && !isEditing ? (
                            <button
                                className={styles.iconBtn}
                                onClick={() => setIsEditing(true)}
                                title="Edit Profile"
                                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer' }}
                            >
                                <Edit2 size={16} strokeWidth={1.8} />
                            </button>
                        ) : user && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    style={{ background: 'rgba(255,50,50,0.2)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffcccc', cursor: 'pointer' }}
                                >
                                    <X size={18} />
                                </button>
                                <button
                                    onClick={handleSave}
                                    style={{ background: 'rgba(50,255,100,0.2)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccffcc', cursor: 'pointer' }}
                                >
                                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={18} />}
                                </button>
                            </div>
                        )}

                        <button className={styles.logoutBtn} onClick={handleLogout} title="Log Out" disabled={isLoggingOut}>
                            {isLoggingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} strokeWidth={1.8} />}
                        </button>
                    </div>
                </motion.header>

                <div className={styles.content}>

                    {/* ── Hero: Energy Avatar + Name ── */}
                    <motion.div
                        className={styles.hero}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                    >
                        <div className={styles.energyBodyWrap}>
                            <motion.div
                                className={styles.energyBodyBreath}
                                animate={{ scale: [1, 1.04, 1], opacity: [0.85, 1, 0.85] }}
                                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                            >
                                <VibeAvatarBody dosha={displayDosha} size={110} />
                            </motion.div>
                            <span className={styles.avatarOmOverlay}>ॐ</span>
                        </div>

                        <div className={styles.heroInfo}>
                            {isEditing ? (
                                <div className={styles.editForm} style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name</label>
                                        <input
                                            type="text"
                                            value={editForm.name}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="Your Name"
                                            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '8px 12px', borderRadius: '8px', fontSize: '16px', outline: 'none' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Title</label>
                                        <input
                                            type="text"
                                            value={editForm.title}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                            placeholder="Example: Searcher, Yogi"
                                            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '8px 12px', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Prakriti</label>
                                        <select
                                            value={editForm.prakriti}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, prakriti: e.target.value }))}
                                            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '8px 12px', borderRadius: '8px', fontSize: '14px', outline: 'none', appearance: 'none' }}
                                        >
                                            <option value="Vata" style={{ color: 'black' }}>Vata</option>
                                            <option value="Pitta" style={{ color: 'black' }}>Pitta</option>
                                            <option value="Kapha" style={{ color: 'black' }}>Kapha</option>
                                            <option value="Vata-Pitta" style={{ color: 'black' }}>Vata-Pitta</option>
                                            <option value="Pitta-Kapha" style={{ color: 'black' }}>Pitta-Kapha</option>
                                            <option value="Kapha-Vata" style={{ color: 'black' }}>Kapha-Vata</option>
                                            <option value="Tridoshic" style={{ color: 'black' }}>Tridoshic</option>
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h1 className={styles.heroName}>{isLoading ? '...' : profile.name}</h1>
                                    <span className={styles.heroTitle} style={{ opacity: 0.8 }}>{profile.title}</span>
                                    <span className={styles.heroPrakriti} style={{ marginTop: '4px', display: 'inline-block', padding: '4px 10px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px', letterSpacing: '0.5px' }}>
                                        Prakriti · <span style={{ fontWeight: 600 }}>{profile.prakriti}</span>
                                    </span>
                                </>
                            )}

                            <span className={styles.heroJoined} style={{ marginTop: '12px', fontSize: '11px', opacity: 0.4 }}>Member since {profile.joined}</span>

                            {!isEditing && (
                                <div className={styles.vibeConnections} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                    <span className={styles.vibeCount} style={{ fontWeight: '700', fontSize: '20px', color: '#a5d8ff' }}>{profile.vibeConnections}</span>
                                    <span className={styles.vibeLabel} style={{ fontSize: '10px', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px' }}>Vibe Connections</span>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* ── Stats bento row ── */}
                    <motion.div
                        className={styles.statsRow}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.12, ease: 'easeOut' }}
                    >
                        {profile.stats.map((s, i) => {
                            const Icon = s.icon;
                            return (
                                <div key={s.label} className={styles.statCard}>
                                    {Icon && <Icon size={16} strokeWidth={1.6} className={styles.statIcon} />}
                                    <span className={styles.statValue}>{s.value}</span>
                                    <span className={styles.statUnit}>{s.unit}</span>
                                    <span className={styles.statLabel}>{s.label}</span>
                                </div>
                            );
                        })}
                    </motion.div>

                    {/* Tabs Placeholder - could be expanded later */}
                    <motion.div
                        className={styles.tabs}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        {/* Content for tabs like Badges, History etc can go here */}
                    </motion.div>

                    <motion.section
                        className={styles.integrationHubCard}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55, delay: 0.15, ease: 'easeOut' }}
                    >
                        <div className={styles.integrationHubHeader}>
                            <div>
                                <h3 className={styles.integrationHubTitle}>Integration Hub</h3>
                                <p className={styles.integrationHubSub}>Connect tools for OneSUTRA Super App workflows</p>
                            </div>
                            <button className={styles.integrationOpenBtn} onClick={() => setIsHubOpen(true)}>
                                Open Hub
                            </button>
                        </div>

                        <div className={styles.integrationQuickStats}>
                            <span>{integrationCount.total}/{integrationCount.all} connected</span>
                            <span>OAuth: {integrationCount.oauthConnected}/{OAUTH_KEYS.length}</span>
                            <span>Vault: {integrationCount.vaultConnected}/{VAULT_KEYS.length}</span>
                        </div>
                    </motion.section>

                    {/* ── Settings & Information ── */}
                    <motion.section
                        className={styles.settingsCard}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55, delay: 0.2, ease: 'easeOut' }}
                    >
                        <div className={styles.settingsCardHeader}>
                            <h3 className={styles.settingsCardTitle}>Settings & Information</h3>
                        </div>

                        {/* Settings sections array */}
                        {[
                            {
                                id: 'about',
                                icon: <Info size={16} strokeWidth={1.8} className={styles.accordionIcon} />,
                                label: 'About Us',
                                content: (
                                    <>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: '#d4af37', margin: 0 }}>भारतीय संस्कृति और वैदिक परंपरा का नवजागरण</h4>
                                            
                                            <div>
                                                <strong style={{ color: '#8b6914', display: 'block', marginBottom: '4px' }}>प्रस्तावना:</strong>
                                                <p style={{ margin: 0, lineHeight: 1.6 }}>नमस्कार! OneSHUTRA केवल एक डिजिटल मंच नहीं, बल्कि एक संकल्प है। इस पहल की शुरुआत हम दो साथियों—आर्यावर्त आर्यन और आर्य सुमन्त —ने एक पवित्र उद्देश्य के साथ की है: अपनी महान भारतीय संस्कृति और वैदिक परंपराओं को आज के आधुनिक युग में पुनर्स्थापित करना।</p>
                                            </div>
                                            
                                            <div>
                                                <strong style={{ color: '#8b6914', display: 'block', marginBottom: '4px' }}>हमारा दृष्टिकोण:</strong>
                                                <p style={{ margin: 0, lineHeight: 1.6 }}>आज के इस तीव्र तकनीकी युग में, हमारा दृढ़ विश्वास है कि समाज की वास्तविक शक्ति हमारी जड़ों में ही निहित है। उन्नत तकनीक के माध्यम से हम वेदों के ज्ञान, संस्कारों और हमारी सनातन धरोहर को एक नए, सुलभ और प्रभावशाली रूप में प्रस्तुत कर रहे हैं। हमारा उद्देश्य इस ऑनलाइन माध्यम से प्राचीन वैदिक ज्ञान को आज की पीढ़ी तक पहुँचाना है, ताकि वे अपनी संस्कृति पर गर्व कर सकें और उसे अपने जीवन में अपना सकें।</p>
                                            </div>
                                            
                                            <div>
                                                <strong style={{ color: '#8b6914', display: 'block', marginBottom: '4px' }}>आपसे हमारा निवेदन:</strong>
                                                <p style={{ margin: 0, lineHeight: 1.6 }}>हमारा यह तकनीकी और सांस्कृतिक प्रयास समाज के बड़ों, दानदाताओं और संस्कृति-प्रेमियों के सहयोग व आशीर्वाद के बिना अधूरा है। हम आपसे विनम्र आग्रह करते हैं कि आप इस सांस्कृतिक महायज्ञ में हमारा साथ दें, हमारा मार्गदर्शन करें और हमारा संबल बनें। आपके बहुमूल्य समर्थन से ही हम अपने इस डिजिटल संकल्प को एक जन-आंदोलन में बदल सकते हैं।</p>
                                            </div>
                                            
                                            <div style={{ fontStyle: 'italic', color: '#e07a5f', fontWeight: 500, marginTop: '4px' }}>
                                                आइए, मिलकर अपनी सांस्कृतिक धरोहर को सहेजें और 'कृण्वन्तो विश्वमार्यम्' (हम विश्व को श्रेष्ठ बनाएँ) के वैदिक संदेश को सार्थक करें।
                                            </div>
                                        </div>
                                    </>
                                )
                            },
                            {
                                id: 'help',
                                icon: <LifeBuoy size={16} strokeWidth={1.8} className={styles.accordionIcon} />,
                                label: 'Help and Support',
                                content: (
                                    <>
                                        Agar aapko koi bhi problem ho, please humein contact karein:
                                        <br /><br />
                                        <strong>Email:</strong> aryanaaryavart9@gmail.com<br />
                                        <strong>Alt Email:</strong> studywithpwno.1@gmail.com
                                    </>
                                )
                            },
                            {
                                id: 'rate',
                                icon: <Star size={16} strokeWidth={1.8} className={styles.accordionIcon} />,
                                label: 'Rate the App',
                                content: (
                                    <>
                                        Aapka feedback humare liye bahut keemti hai. App ko rate karne ke liye PlayStore ya AppStore par jaayein. (Coming Soon)
                                    </>
                                )
                            },
                            {
                                id: 'terms',
                                icon: <FileText size={16} strokeWidth={1.8} className={styles.accordionIcon} />,
                                label: 'Terms and Conditions',
                                content: (
                                    <>
                                        By using our application, you agree to our terms of service, which ensure a respectful and secure environment for all seekers. Detailed terms are available on our main website.
                                    </>
                                )
                            },
                            {
                                id: 'privacy',
                                icon: <ShieldAlert size={16} strokeWidth={1.8} className={styles.accordionIcon} />,
                                label: 'Privacy Policy',
                                content: (
                                    <>
                                        Your data is encrypted and secure. We do not sell your personal data. Integrations use secure OAuth flow, and Vault credentials are AES-GCM encrypted locally.
                                    </>
                                )
                            },
                            {
                                id: 'refund',
                                icon: <CreditCard size={16} strokeWidth={1.8} className={styles.accordionIcon} />,
                                label: 'Refund and Cancellation',
                                content: (
                                    <>
                                        We offer a 7-day no-questions-asked refund policy for OneSHUTRA Pro subscriptions. Contact our support email for prompt processing.
                                    </>
                                )
                            },
                            {
                                id: 'delete',
                                icon: <Trash2 size={16} strokeWidth={1.8} color="#fca5a5" className={styles.accordionIcon} />,
                                label: 'Delete Account',
                                content: (
                                    <>
                                        <p style={{ margin: '0 0 10px 0', color: '#fca5a5' }}>
                                            Warning: Deleting your account will permanently remove all your data, integrations, and progress. This action cannot be undone.
                                        </p>
                                        <button className={styles.dangerButton} onClick={() => alert("Account deletion request initiated. Please contact support to confirm.")}>
                                            <Trash2 size={14} /> Permanently Delete Account
                                        </button>
                                    </>
                                )
                            }
                        ].map((section) => {
                            const isOpen = expandedSection === section.id;
                            return (
                                <div key={section.id} className={styles.accordionItem}>
                                    <button className={styles.accordionHeader} onClick={() => toggleSection(section.id)}>
                                        <div className={styles.accordionHeaderIcon}>
                                            {section.icon}
                                            <span>{section.label}</span>
                                        </div>
                                        <ChevronDown size={16} strokeWidth={2} className={`${styles.accordionChevron} ${isOpen ? styles.accordionChevronOpen : ''}`} />
                                    </button>
                                    <AnimatePresence initial={false}>
                                        {isOpen && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.25, ease: 'easeOut' }}
                                                className={styles.accordionContent}
                                            >
                                                <div className={styles.accordionInner}>
                                                    {section.content}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </motion.section>

                    <div className={styles.appVersion}>
                        <Smartphone size={10} style={{ display: 'inline', marginRight: '4px', opacity: 0.6 }} />
                        App Version 1.0.3 (Sattvik Build)
                    </div>

                </div>
            </main>

            <AnimatePresence>
                {isHubOpen && (
                    <motion.div
                        className={styles.integrationOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className={styles.integrationModal}
                            initial={{ opacity: 0, y: 24, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 24, scale: 0.98 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                        >
                            <div className={styles.integrationModalHeader}>
                                <div>
                                    <h2 className={styles.integrationModalTitle}>OneSUTRA Integration Hub</h2>
                                    <p className={styles.integrationModalSub}>Vedic-Modern control center for connected tools</p>
                                </div>
                                <button className={styles.integrationCloseBtn} onClick={() => setIsHubOpen(false)}>
                                    <X size={18} />
                                </button>
                            </div>

                            <div className={styles.securityBadgeRow}>
                                <span className={styles.securityBadge}>
                                    <ShieldCheck size={14} />
                                    End-to-end encrypted vault storage
                                    <button
                                        className={styles.securityInfoBtn}
                                        onMouseEnter={() => setShowSecurityInfo(true)}
                                        onMouseLeave={() => setShowSecurityInfo(false)}
                                        onClick={() => setShowSecurityInfo((v) => !v)}
                                        type="button"
                                    >
                                        <Info size={14} />
                                    </button>
                                </span>
                                {showSecurityInfo && (
                                    <div className={styles.securityTooltip}>
                                        Vault data is encrypted before write and credentials are never shown again on the frontend.
                                    </div>
                                )}
                            </div>

                            <div className={styles.integrationSearchWrap}>
                                <Search size={15} />
                                <input
                                    value={integrationSearch}
                                    onChange={(e) => setIntegrationSearch(e.target.value)}
                                    placeholder="Search integrations..."
                                    className={styles.integrationSearchInput}
                                />
                            </div>

                            <div className={styles.integrationTabRow}>
                                <button
                                    className={`${styles.integrationTabBtn} ${integrationTab === 'oauth' ? styles.integrationTabBtnActive : ''}`}
                                    onClick={() => setIntegrationTab('oauth')}
                                >
                                    Official API Connections
                                </button>
                                <button
                                    className={`${styles.integrationTabBtn} ${integrationTab === 'vault' ? styles.integrationTabBtnActive : ''}`}
                                    onClick={() => setIntegrationTab('vault')}
                                >
                                    AI Browser Automation Vault
                                </button>
                            </div>

                            <p className={styles.integrationSectionDescription}>
                                {integrationTab === 'oauth'
                                    ? 'Connect your accounts securely via official authorization.'
                                    : "Enable Sakha Bodhi's Playwright/Browser agents. Credentials are encrypted and stored securely."}
                            </p>

                            <div className={styles.integrationGrid}>
                                {filteredTools.map((tool) => {
                                    const connected =
                                        tool.category === 'oauth'
                                            ? integrations.oauth[tool.key as OAuthToolKey]?.connected
                                            : integrations.vault[tool.key as VaultToolKey]?.connected;

                                    return (
                                        <div key={tool.key} className={styles.integrationItem}>
                                            <div className={styles.integrationItemHead}>
                                                <div>
                                                    <h4>{tool.label}</h4>
                                                    <p>{tool.subtitle}</p>
                                                </div>
                                                {connected ? (
                                                    <span className={styles.integrationConnected}><CheckCircle2 size={14} /> Connected</span>
                                                ) : (
                                                    <span className={styles.integrationDisconnected}>Not Connected</span>
                                                )}
                                            </div>

                                            <div className={styles.integrationActions}>
                                                {tool.category === 'oauth' ? (
                                                    <>
                                                        <button
                                                            className={styles.integrationActionPrimary}
                                                            onClick={() => handleOAuthAction(tool)}
                                                        >
                                                            <Link2 size={14} />
                                                            {connected ? 'Disconnect' : 'Connect'}
                                                        </button>
                                                        {!connected && (
                                                            <span className={styles.integrationHint}>
                                                                Redirects to OAuth flow <ExternalLink size={12} />
                                                            </span>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            className={styles.integrationActionPrimary}
                                                            onClick={() => openVaultModal(tool.key as VaultToolKey)}
                                                        >
                                                            <LockKeyhole size={14} />
                                                            {connected ? 'Update Vault' : 'Connect Vault'}
                                                        </button>
                                                        {connected && (
                                                            <button
                                                                className={styles.integrationActionGhost}
                                                                onClick={() => setVaultConnection(tool.key as VaultToolKey, false)}
                                                            >
                                                                Disconnect
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isVaultModalOpen && activeVaultTool && (
                    <motion.div
                        className={styles.vaultOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className={styles.vaultModal}
                            initial={{ opacity: 0, y: 20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.98 }}
                        >
                            <div className={styles.vaultModalHeader}>
                                <h3>Secure Vault Setup · {activeVaultTool.toUpperCase()}</h3>
                                <button className={styles.integrationCloseBtn} onClick={closeVaultModal}>
                                    <X size={16} />
                                </button>
                            </div>

                            <label className={styles.vaultFieldLabel}>Username / Email</label>
                            <input
                                className={styles.vaultInput}
                                value={vaultForm.username}
                                onChange={(e) => setVaultForm((p) => ({ ...p, username: e.target.value }))}
                                placeholder="Enter account username"
                            />

                            <label className={styles.vaultFieldLabel}>Password</label>
                            <input
                                className={styles.vaultInput}
                                type="password"
                                value={vaultForm.password}
                                onChange={(e) => setVaultForm((p) => ({ ...p, password: e.target.value }))}
                                placeholder="Enter password"
                            />

                            <label className={styles.vaultCheckboxRow}>
                                <input
                                    type="checkbox"
                                    checked={vaultForm.otpRealtime}
                                    onChange={(e) => setVaultForm((p) => ({ ...p, otpRealtime: e.target.checked }))}
                                />
                                Bodhi will ask for OTP in real-time when executing a task
                            </label>

                            <label className={styles.vaultFieldLabel}>Execution Notes (Optional)</label>
                            <textarea
                                className={styles.vaultTextarea}
                                value={vaultForm.notes}
                                onChange={(e) => setVaultForm((p) => ({ ...p, notes: e.target.value }))}
                                placeholder="Any login nuances, preferred flow, or 2FA notes"
                            />

                            <div className={styles.vaultActions}>
                                <button className={styles.integrationActionGhost} onClick={closeVaultModal} disabled={vaultSaving}>
                                    Cancel
                                </button>
                                <button className={styles.integrationActionPrimary} onClick={handleVaultSubmit} disabled={vaultSaving}>
                                    {vaultSaving ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                                    {vaultSaving ? 'Encrypting...' : 'Save Encrypted Vault'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
