'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Edit2, Check, Plus, Trash2, BookOpen } from 'lucide-react';
import { useOneSutraAuth } from '@/hooks/useOneSutraAuth';
import styles from './GranthLibraryModal.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Book {
    id: string;
    title: string;
    link?: string;
}

interface Category {
    id: string;
    title: string;
    color: string;
    books: Book[];
}

const ADMIN_EMAILS = ['studywithpwno.1@gmail.com', 'aryavartaayan9@gmail.com'];

// ── Initial Data ──────────────────────────────────────────────────────────────

const INITIAL_CATEGORIES: Category[] = [
    {
        id: 'vedas',
        title: 'वेद (आर्ष ग्रंथ)',
        color: '#FCD34D',
        books: [
            { id: 'rigveda', title: 'ऋग्वेद - प्राचीनतम वेद' },
            { id: 'yajurveda', title: 'यजुर्वेद - यज्ञ मंत्र' },
            { id: 'samaveda', title: 'सामवेद - संगीत और मंत्र' },
            { id: 'atharvaveda', title: 'अथर्ववेद - दैनिक जीवन के मंत्र' },
        ]
    },
    {
        id: 'upanishads',
        title: 'उत्तर वेद (Vedanta)',
        color: '#FDBA74',
        books: [
            { id: 'brihadaranyaka', title: 'बृहदारण्यक उपनिषद' },
            { id: 'chandogya', title: 'छान्दोग्य उपनिषद' },
            { id: 'taittiriya', title: 'तैत्तिरीय उपनिषद' },
            { id: 'aitareya', title: 'ऐतरेय उपनिषद' },
            { id: 'katha', title: 'कठ उपनिषद' },
            { id: 'isha', title: 'ईश उपनिषद' },
            { id: 'kena', title: 'केन उपनिषद' },
            { id: 'prashna', title: 'प्रश्नोपनिषद' },
            { id: 'mundaka', title: 'मुण्डक उपनिषद' },
            { id: 'mandukya', title: 'माण्डूक्य उपनिषद' },
        ]
    },
    {
        id: 'smriti-purana',
        title: '🟡 स्मृतियाँ और पुराण (महाकाव्य)',
        color: '#FDE047',
        books: [
            { id: 'mahabharata', title: 'महाभारत - सबसे बड़ा ग्रंथ' },
            { id: 'gita', title: 'श्रीमद्भगवद्गीता - गीता' },
            { id: 'brahmavaivarta', title: 'ब्रह्मवैवर्त पुराण' },
            { id: 'bhagavata', title: 'भागवत पुराण' },
            { id: 'vishnu', title: 'विष्णु पुराण' },
            { id: 'shiva', title: 'शिव पुराण' },
            { id: 'markandeya', title: 'मार्कण्डेय पुराण' },
            { id: 'brahma', title: 'ब्रह्म पुराण' },
            { id: 'bhavishya', title: 'भविष्य पुराण' },
            { id: 'vamana', title: 'वामन पुराण' },
            { id: 'varaha', title: 'वराह पुराण' },
            { id: 'vayu', title: 'वायु पुराण' },
            { id: 'matsya', title: 'मत्स्य पुराण' },
            { id: 'garuda', title: 'गरुड़ पुराण' },
        ]
    },
    {
        id: 'darshan',
        title: '🟢 शास्त्रीय दर्शन ग्रंथ',
        color: '#86EFAC',
        books: [
            { id: 'yogasutra', title: 'योग सूत्र - पतंजलि (196 सूत्र)' },
            { id: 'nyayasutra', title: 'न्याय सूत्र - गौतम (अक्षपाद)' },
            { id: 'vaisheshika', title: 'वैशेषिक सूत्र - कणाद' },
            { id: 'samkhya', title: 'सांख्य सूत्र - कपिलाचार्य' },
            { id: 'mimamsa', title: 'मीमांसा सूत्र - जैमिनी' },
            { id: 'brahmasutra', title: 'ब्रह्म सूत्र - व्यास (बादरायण)' },
            { id: 'yogavasistha', title: 'योगवासिष्ठ - वसिष्ठ' },
            { id: 'yogayajnavalkya', title: 'योगयाज्ञवल्क्य - याज्ञवल्क्य' },
            { id: 'vedantasutra', title: 'वेदांत सूत्र - बादरायण' },
            { id: 'siddhitraya', title: 'सिद्धित्रय - यमुनाचार्य' },
            { id: 'vedarthasangraha', title: 'वेदारथ संग्रह - रामानुज' },
        ]
    },
    {
        id: 'bhakti',
        title: '🔵 भक्ति और भक्ति ग्रंथ',
        color: '#93C5FD',
        books: [
            { id: 'ramayana', title: 'रामायण - वाल्मीकि' },
            { id: 'ramcharitmanas', title: 'रामचरितमानस - तुलसीदास' },
            { id: 'kambaramayana', title: 'कम्ब रामायण - कम्बन' },
            { id: 'naradbhakti', title: 'नारदीय भक्ति सूत्र - नारद' },
            { id: 'shrimadbhagavat', title: 'श्रीमद्भागवत - व्यास' },
            { id: 'sundarkand', title: 'सुंदर कांड - वाल्मीकि' },
            { id: 'hanumanchalisa', title: 'हनुमान चालीसा - तुलसीदास' },
            { id: 'namghosha', title: 'नाम घोष - माधवदेव (असमिया)' },
            { id: 'gurugranthsahib', title: 'गुरु ग्रंथ साहिब - सिख गुरु' },
            { id: 'nalayira', title: 'नाalayिरा दिव्य प्रबन्धम - 12 आलवार (तमिल)' },
            { id: 'thiruvachakam', title: 'थिरुवाप्पम - मणिक्कवाचकर' },
            { id: 'thiruppugazh', title: 'थिरुप्पुगल - अरुणागिरिनाथर' },
        ]
    },
    {
        id: 'yoga-health',
        title: '🟢 योग और स्वास्थ्य ग्रंथ',
        color: '#6EE7B7',
        books: [
            { id: 'hathayoga', title: 'हठयोग प्रदीपिका - स्वात्मराम' },
            { id: 'gheranda', title: 'घेरंड संहिता - घेरंड' },
            { id: 'shivyoga', title: 'श्रीमद्योग वशिष्ठ - वशिष्ठ' },
            { id: 'shivsamhita', title: 'शिव संहिता - शिव' },
            { id: 'upasana', title: 'उपासना - स्वामी सत्यप्रिया नंदा' },
        ]
    },
    {
        id: 'stem',
        title: '🔵 वैज्ञानिक और गणित ग्रंथ',
        color: '#60A5FA',
        books: [
            { id: 'aryabhatiya', title: 'आर्यभटीय - आर्यभट्ट' },
            { id: 'brahmasphuta', title: 'ब्रह्मस्फुटसिद्धान्त - ब्रह्मगुप्त' },
            { id: 'siddhantashiromani', title: 'सिद्धांत शिरोमणि - भास्कर II' },
            { id: 'bijaganita', title: 'बीजगणित - भास्कर II' },
            { id: 'khandakhadyaka', title: 'खण्डखाद्यक - ब्रह्मगुप्त' },
            { id: 'yuktibhasa', title: 'युक्तिभाषा - ज्येष्ठदेव' },
            { id: 'brihatsamhita', title: 'बृहत्संहिता - वराहमिहिर' },
            { id: 'suryasiddhanta', title: 'सूर्य सिद्धांत - प्राचीन' },
            { id: 'vastushastra', title: 'वास्तु शास्त्र - पारंपरिक' },
        ]
    }
];

// ── Components ────────────────────────────────────────────────────────────────

interface GranthLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function GranthLibraryModal({ isOpen, onClose }: GranthLibraryModalProps) {
    const { user } = useOneSutraAuth();
    const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);
    const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
    const [editMode, setEditMode] = useState(false);
    const [loading, setLoading] = useState(false);

    // Load persisted links on open
    useEffect(() => {
        if (!isOpen) return;
        
        const loadDocs = async () => {
            setLoading(true);
            try {
                const { getFirebaseFirestore } = await import('@/lib/firebase');
                const { doc, getDoc } = await import('firebase/firestore');
                const db = await getFirebaseFirestore();
                
                const docRef = doc(db, 'app_config', 'granth_library');
                const snap = await getDoc(docRef);
                
                if (snap.exists()) {
                    const data = snap.data() as { categories: Category[] };
                    if (data.categories) {
                        // Merge saved data (mainly links/new books) with structure
                        // Or just use saved data entirely if we want dynamic updates to persist
                        setCategories(data.categories);
                    }
                }
            } catch (err) {
                console.error('Failed to load library:', err);
            } finally {
                setLoading(false);
            }
        };
        
        loadDocs();
    }, [isOpen]);

    // Save changes
    const saveChanges = async () => {
        if (!isAdmin) return;
        setLoading(true);
        try {
            const { getFirebaseFirestore } = await import('@/lib/firebase');
            const { doc, setDoc } = await import('firebase/firestore');
            const db = await getFirebaseFirestore();
            
            await setDoc(doc(db, 'app_config', 'granth_library'), { 
                categories,
                updatedAt: new Date(),
                updatedBy: user?.email 
            });
            setEditMode(false);
            alert('Library updated successfully!');
        } catch (err) {
            console.error('Failed to save library:', err);
            alert('Failed to save changes.');
        } finally {
            setLoading(false);
        }
    };

    const updateBookLink = (catId: string, bookId: string, link: string) => {
        setCategories(prev => prev.map(cat => {
            if (cat.id !== catId) return cat;
            return {
                ...cat,
                books: cat.books.map(b => b.id === bookId ? { ...b, link } : b)
            };
        }));
    };

    const addBook = (catId: string) => {
        const title = prompt('Enter book title:');
        if (!title) return;
        const id = 'book_' + Date.now();
        setCategories(prev => prev.map(cat => {
            if (cat.id !== catId) return cat;
            return {
                ...cat,
                books: [...cat.books, { id, title, link: '' }]
            };
        }));
    };

    const removeBook = (catId: string, bookId: string) => {
        if (!confirm('Are you sure you want to remove this book?')) return;
        setCategories(prev => prev.map(cat => {
            if (cat.id !== catId) return cat;
            return {
                ...cat,
                books: cat.books.filter(b => b.id !== bookId)
            };
        }));
    };

    if (!isOpen) return null;

    return (
        <div className={styles.backdrop}>
            <motion.div 
                className={styles.modal}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
            >
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h1>📚 ग्रंथालय (Library)</h1>
                        {isAdmin && (
                            <button 
                                className={editMode ? styles.saveBtn : styles.editBtn}
                                onClick={editMode ? saveChanges : () => setEditMode(true)}
                                disabled={loading}
                            >
                                {loading ? 'Saving...' : editMode ? <><Check size={16}/> Save Changes</> : <><Edit2 size={16}/> Edit Library</>}
                            </button>
                        )}
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}><X size={24} /></button>
                </div>

                <div className={styles.content}>
                    {categories.map(cat => (
                        <div key={cat.id} className={styles.categorySection}>
                            <h2 style={{ color: cat.color }}>{cat.title}</h2>
                            <div className={styles.booksGrid}>
                                {cat.books.map(book => (
                                    <div key={book.id} className={styles.bookCard}>
                                        <div className={styles.bookInfo}>
                                            <BookOpen size={16} className={styles.bookIcon} style={{ color: cat.color }} />
                                            <span className={styles.bookTitle}>{book.title}</span>
                                        </div>
                                        
                                        {editMode ? (
                                            <div className={styles.editControls}>
                                                <input 
                                                    type="url" 
                                                    placeholder="Paste Link (PDF/URL)"
                                                    value={book.link || ''}
                                                    onChange={(e) => updateBookLink(cat.id, book.id, e.target.value)}
                                                    className={styles.linkInput}
                                                />
                                                <button onClick={() => removeBook(cat.id, book.id)} className={styles.deleteBtn}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            book.link ? (
                                                <a href={book.link} target="_blank" rel="noopener noreferrer" className={styles.readBtn} style={{ borderColor: cat.color, color: cat.color }}>
                                                    Read <ExternalLink size={12} />
                                                </a>
                                            ) : (
                                                <span className={styles.comingSoon}>Coming Soon</span>
                                            )
                                        )}
                                    </div>
                                ))}
                                {editMode && (
                                    <button className={styles.addBookBtn} onClick={() => addBook(cat.id)}>
                                        <Plus size={16} /> Add Book
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
