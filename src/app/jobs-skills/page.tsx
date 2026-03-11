'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Briefcase, GraduationCap, Code, TrendingUp,
    Search, MapPin, Clock, Star, ChevronRight, Sparkles,
    BookOpen, Users, Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useCircadianBackground } from '@/hooks/useCircadianBackground';
import { useLanguage } from '@/context/LanguageContext';

// ─── Job Categories ────────────────────────────────────────────────────────────
const CATEGORIES = [
    { id: 'tech', icon: Code, label: 'Technology', labelHi: 'तकनीक', color: '#60A5FA', count: 142 },
    { id: 'business', icon: TrendingUp, label: 'Business', labelHi: 'व्यापार', color: '#34D399', count: 89 },
    { id: 'creative', icon: Sparkles, label: 'Creative', labelHi: 'सृजनात्मक', color: '#F472B6', count: 67 },
    { id: 'education', icon: GraduationCap, label: 'Education', labelHi: 'शिक्षा', color: '#FBBF24', count: 54 },
];

// ─── Featured Jobs ─────────────────────────────────────────────────────────────
const FEATURED_JOBS = [
    {
        id: 1, title: 'Full Stack Developer', company: 'Pranav Tech', location: 'Remote',
        type: 'Full-time', salary: '₹8L - ₹15L', posted: '2h ago',
        tags: ['React', 'Node.js', 'Firebase'], color: '#60A5FA',
    },
    {
        id: 2, title: 'AI/ML Engineer', company: 'Conscious AI Labs', location: 'Bangalore',
        type: 'Full-time', salary: '₹12L - ₹25L', posted: '5h ago',
        tags: ['Python', 'TensorFlow', 'LLMs'], color: '#34D399',
    },
    {
        id: 3, title: 'UI/UX Designer', company: 'Vedic Design Co.', location: 'Mumbai',
        type: 'Contract', salary: '₹6L - ₹12L', posted: '1d ago',
        tags: ['Figma', 'Prototyping', 'Design Systems'], color: '#F472B6',
    },
    {
        id: 4, title: 'Yoga & Wellness Coach', company: 'PranaVerse Wellness', location: 'Delhi',
        type: 'Part-time', salary: '₹3L - ₹6L', posted: '3d ago',
        tags: ['Yoga', 'Ayurveda', 'Meditation'], color: '#FBBF24',
    },
    {
        id: 5, title: 'Content Strategist', company: 'Sutra Media', location: 'Remote',
        type: 'Full-time', salary: '₹5L - ₹10L', posted: '6h ago',
        tags: ['Content', 'SEO', 'Social Media'], color: '#A78BFA',
    },
];

// ─── Skill Courses ─────────────────────────────────────────────────────────────
const SKILL_COURSES = [
    { id: 1, title: 'Mastering React & Next.js', instructor: 'Arya Dev', level: 'Intermediate', duration: '12 weeks', enrolled: 2340, rating: 4.8, color: '#60A5FA', icon: Code },
    { id: 2, title: 'AI & Machine Learning Fundamentals', instructor: 'Dr. Priya Sharma', level: 'Beginner', duration: '8 weeks', enrolled: 5120, rating: 4.9, color: '#34D399', icon: Zap },
    { id: 3, title: 'Digital Marketing Mastery', instructor: 'Rohan Gupta', level: 'All Levels', duration: '6 weeks', enrolled: 3890, rating: 4.7, color: '#F472B6', icon: TrendingUp },
    { id: 4, title: 'Leadership & Management', instructor: 'Ananya Iyer', level: 'Advanced', duration: '10 weeks', enrolled: 1780, rating: 4.6, color: '#FBBF24', icon: Users },
];

export default function JobsSkillsPage() {
    const { lang } = useLanguage();
    const { imageUrl: bgUrl } = useCircadianBackground();
    const [activeTab, setActiveTab] = useState<'jobs' | 'skills'>('jobs');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const filteredJobs = FEATURED_JOBS.filter(j => {
        const matchesSearch = !searchQuery || j.title.toLowerCase().includes(searchQuery.toLowerCase()) || j.company.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCat = !selectedCategory || j.tags.some(t => {
            if (selectedCategory === 'tech') return ['React', 'Node.js', 'Firebase', 'Python', 'TensorFlow', 'LLMs'].includes(t);
            if (selectedCategory === 'creative') return ['Figma', 'Prototyping', 'Design Systems', 'Content', 'SEO', 'Social Media'].includes(t);
            if (selectedCategory === 'education') return ['Yoga', 'Ayurveda', 'Meditation'].includes(t);
            return false;
        });
        return matchesSearch && matchesCat;
    });

    const filteredCourses = SKILL_COURSES.filter(c =>
        !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div style={{
            minHeight: '100vh',
            background: bgUrl ? `url(${bgUrl}) center / cover no-repeat` : 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0a1628 100%)',
            color: 'white',
            fontFamily: "'Inter', system-ui, sans-serif",
        }}>
            {/* ── Header ── */}
            <div style={{
                position: 'sticky', top: 0, zIndex: 100,
                background: 'rgba(6,4,18,0.82)', backdropFilter: 'blur(32px)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                padding: '0.75rem 1rem',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 720, margin: '0 auto' }}>
                    <Link href="/" style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 0 }}>
                        <ArrowLeft size={20} strokeWidth={1.8} />
                    </Link>
                    <motion.div
                        animate={{ filter: ['drop-shadow(0 0 5px rgba(96,165,250,0.4))', 'drop-shadow(0 0 14px rgba(96,165,250,0.7))', 'drop-shadow(0 0 5px rgba(96,165,250,0.4))'] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        <Briefcase size={22} style={{ color: '#60A5FA' }} />
                    </motion.div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, fontFamily: "'Playfair Display', serif", color: 'rgba(255,255,255,0.95)' }}>
                            {lang === 'hi' ? 'नौकरी और कौशल' : 'Jobs & Skills'}
                        </h1>
                        <p style={{ margin: 0, fontSize: '0.5rem', color: 'rgba(96,165,250,0.8)', letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                            {lang === 'hi' ? 'कर्म क्षेत्र' : 'Karma Kshetra'}
                        </p>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: 720, margin: '0 auto', padding: '1rem 1rem 6rem' }}>

                {/* ── Search Bar ── */}
                <div style={{ position: 'relative', marginBottom: '1.2rem' }}>
                    <Search size={15} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
                    <input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder={lang === 'hi' ? 'नौकरी या कौशल खोजें…' : 'Search jobs or skills…'}
                        style={{
                            width: '100%', padding: '0.75rem 1rem 0.75rem 2.6rem',
                            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
                            borderRadius: 16, color: 'rgba(255,255,255,0.85)', fontSize: '0.88rem',
                            outline: 'none', fontFamily: "'Inter', sans-serif", boxSizing: 'border-box',
                        }}
                    />
                </div>

                {/* ── Tabs ── */}
                <div style={{ display: 'flex', gap: 8, marginBottom: '1.2rem' }}>
                    {(['jobs', 'skills'] as const).map(tab => (
                        <motion.button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            whileTap={{ scale: 0.95 }}
                            style={{
                                flex: 1, padding: '0.7rem', borderRadius: 14,
                                border: activeTab === tab ? '1px solid rgba(96,165,250,0.5)' : '1px solid rgba(255,255,255,0.08)',
                                background: activeTab === tab ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.04)',
                                color: activeTab === tab ? '#60A5FA' : 'rgba(255,255,255,0.5)',
                                fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                transition: 'all 0.2s',
                            }}
                        >
                            {tab === 'jobs' ? <Briefcase size={16} /> : <BookOpen size={16} />}
                            {tab === 'jobs'
                                ? (lang === 'hi' ? 'नौकरियां' : 'Jobs')
                                : (lang === 'hi' ? 'कौशल' : 'Skills')}
                        </motion.button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'jobs' ? (
                        <motion.div
                            key="jobs"
                            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}
                        >
                            {/* ── Categories ── */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: '1.4rem' }}>
                                {CATEGORIES.map(cat => {
                                    const isSelected = selectedCategory === cat.id;
                                    return (
                                        <motion.button
                                            key={cat.id}
                                            onClick={() => setSelectedCategory(isSelected ? null : cat.id)}
                                            whileTap={{ scale: 0.96 }}
                                            style={{
                                                padding: '0.8rem', borderRadius: 16,
                                                background: isSelected ? `${cat.color}18` : 'rgba(255,255,255,0.04)',
                                                border: isSelected ? `1px solid ${cat.color}55` : '1px solid rgba(255,255,255,0.08)',
                                                cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: 10,
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            <div style={{
                                                width: 36, height: 36, borderRadius: 10,
                                                background: `${cat.color}18`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <cat.icon size={18} style={{ color: cat.color }} />
                                            </div>
                                            <div style={{ textAlign: 'left' }}>
                                                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: isSelected ? cat.color : 'rgba(255,255,255,0.85)' }}>
                                                    {lang === 'hi' ? cat.labelHi : cat.label}
                                                </div>
                                                <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
                                                    {cat.count} {lang === 'hi' ? 'अवसर' : 'openings'}
                                                </div>
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </div>

                            {/* ── Job Listings ── */}
                            <h3 style={{
                                fontSize: '0.75rem', fontWeight: 600,
                                color: 'rgba(255,255,255,0.45)', letterSpacing: '0.15em',
                                textTransform: 'uppercase', fontFamily: 'monospace',
                                marginBottom: '0.8rem',
                            }}>
                                {lang === 'hi' ? '✨ उपलब्ध अवसर' : '✨ Available Opportunities'}
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {filteredJobs.map((job, i) => (
                                    <motion.div
                                        key={job.id}
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.06 }}
                                        style={{
                                            padding: '1rem 1.1rem', borderRadius: 18,
                                            background: 'rgba(255,255,255,0.05)',
                                            backdropFilter: 'blur(20px)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>{job.title}</h4>
                                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: job.color, fontWeight: 500 }}>{job.company}</p>
                                            </div>
                                            <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0, marginTop: 2 }} />
                                        </div>

                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: '0.6rem', fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} />{job.location}</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Briefcase size={11} />{job.type}</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} />{job.posted}</span>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                {job.tags.map(tag => (
                                                    <span key={tag} style={{
                                                        fontSize: '0.58rem', padding: '0.2rem 0.55rem',
                                                        background: `${job.color}15`, border: `1px solid ${job.color}30`,
                                                        borderRadius: 999, color: job.color,
                                                        fontFamily: 'monospace', letterSpacing: '0.04em',
                                                    }}>{tag}</span>
                                                ))}
                                            </div>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', flexShrink: 0, marginLeft: 8 }}>{job.salary}</span>
                                        </div>
                                    </motion.div>
                                ))}

                                {filteredJobs.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'rgba(255,255,255,0.3)' }}>
                                        <Briefcase size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
                                        <p style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>
                                            {lang === 'hi' ? 'कोई अवसर नहीं मिला' : 'No opportunities found'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="skills"
                            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}
                        >
                            {/* ── Skills / Courses ── */}
                            <h3 style={{
                                fontSize: '0.75rem', fontWeight: 600,
                                color: 'rgba(255,255,255,0.45)', letterSpacing: '0.15em',
                                textTransform: 'uppercase', fontFamily: 'monospace',
                                marginBottom: '0.8rem',
                            }}>
                                {lang === 'hi' ? '📚 कौशल विकास पाठ्यक्रम' : '📚 Skill Development Courses'}
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {filteredCourses.map((course, i) => (
                                    <motion.div
                                        key={course.id}
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.06 }}
                                        style={{
                                            padding: '1rem 1.1rem', borderRadius: 18,
                                            background: 'rgba(255,255,255,0.05)',
                                            backdropFilter: 'blur(20px)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                            <div style={{
                                                width: 44, height: 44, borderRadius: 12,
                                                background: `${course.color}18`, border: `1px solid ${course.color}30`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                flexShrink: 0,
                                            }}>
                                                <course.icon size={20} style={{ color: course.color }} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>{course.title}</h4>
                                                <p style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>
                                                    {lang === 'hi' ? 'प्रशिक्षक' : 'by'} {course.instructor}
                                                </p>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: '0.7rem', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <GraduationCap size={11} />{course.level}
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Clock size={11} />{course.duration}
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Users size={11} />{course.enrolled.toLocaleString()} {lang === 'hi' ? 'छात्र' : 'enrolled'}
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#FBBF24' }}>
                                                <Star size={11} fill="#FBBF24" />{course.rating}
                                            </span>
                                        </div>

                                        <div style={{ marginTop: '0.7rem' }}>
                                            <motion.button
                                                whileTap={{ scale: 0.96 }}
                                                style={{
                                                    width: '100%', padding: '0.55rem',
                                                    borderRadius: 12, border: `1px solid ${course.color}40`,
                                                    background: `${course.color}12`, color: course.color,
                                                    fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                }}
                                            >
                                                <BookOpen size={14} />
                                                {lang === 'hi' ? 'अभी शुरू करें' : 'Start Learning'}
                                            </motion.button>
                                        </div>
                                    </motion.div>
                                ))}

                                {filteredCourses.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'rgba(255,255,255,0.3)' }}>
                                        <BookOpen size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
                                        <p style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>
                                            {lang === 'hi' ? 'कोई पाठ्यक्रम नहीं मिला' : 'No courses found'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
