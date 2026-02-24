'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import styles from './AuthModal.module.css';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (displayName: string) => void;
}

const GoogleLogo = () => (
    <svg className={styles.googleIcon} viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
    const { lang } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const t = {
        hi: {
            title: 'स्वागतम्',
            subtitle: 'अपने व्यक्तिगत वैदिक अनुभव को अनलॉक करने के लिए साइन इन करें',
            google: 'Google से साइन इन करें',
            or: 'अथवा',
            guest: 'अतिथि के रूप में जारी रखें',
            footer: 'अतिथि देवो भव',
        },
        en: {
            title: 'Swagatam',
            subtitle: 'Sign in to unlock your personalized Vedic experience',
            google: 'Continue with Google',
            or: 'or',
            guest: 'Continue as Guest',
            footer: 'Atithi Devo Bhava',
        },
    }[lang] || {
        title: 'Swagatam',
        subtitle: 'Sign in to unlock your personalized Vedic experience',
        google: 'Continue with Google',
        or: 'or',
        guest: 'Continue as Guest',
        footer: 'Atithi Devo Bhava',
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError(null);
        try {
            // Lazy-load Firebase to keep it out of the SSR bundle
            const { getFirebaseAuth, getGoogleProvider } = await import('@/lib/firebase');
            const { signInWithPopup } = await import('firebase/auth');

            const auth = await getFirebaseAuth();
            const provider = await getGoogleProvider();
            const result = await signInWithPopup(auth, provider);

            const displayName = result.user.displayName || result.user.email || 'Sadhaka';
            // Persist a lightweight user info for the dashboard greeting
            localStorage.setItem('vedic_user_name', displayName);
            localStorage.setItem('vedic_user_email', result.user.email || '');
            localStorage.setItem('vedic_user_photo', result.user.photoURL || '');

            onSuccess?.(displayName);
            onClose();
        } catch (err: any) {
            // user closed the popup — not a real error
            if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
                setError(null);
            } else {
                console.error('Google Sign-In error:', err);
                setError('Sign-in failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGuest = () => {
        localStorage.removeItem('vedic_user_name');
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className={styles.overlay}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    onClick={onClose}
                >
                    <motion.div
                        className={styles.modal}
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button className={styles.closeBtn} onClick={onClose}>
                            <X size={18} />
                        </button>

                        <span className={styles.omSymbol}>🙏</span>
                        <h2 className={styles.title}>{t.title}</h2>
                        <p className={styles.subtitle}>{t.subtitle}</p>

                        <button
                            className={styles.googleBtn}
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 size={18} className={styles.spinner} />
                            ) : (
                                <GoogleLogo />
                            )}
                            {loading ? 'Signing in…' : t.google}
                        </button>

                        {error && (
                            <p style={{ color: '#f87171', fontSize: '0.75rem', marginTop: 8, textAlign: 'center' }}>
                                {error}
                            </p>
                        )}

                        <div className={styles.divider}>{t.or}</div>

                        <button className={styles.guestBtn} onClick={handleGuest}>
                            {t.guest}
                        </button>

                        <p className={styles.footer}>{t.footer}</p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
