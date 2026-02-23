'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import styles from './PranicPathSection.module.css';

// --- 3. SACRED GEOMETRY (SRI YANTRA) ---
const SriYantraSVG = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={className} style={{ width: '100%', height: '100%' }}>
        <g fill="none" stroke="var(--accent-amber)" strokeWidth="0.3" opacity="0.6">
            <circle cx="50" cy="50" r="48" strokeDasharray="0.5 0.5" />
            <path d="M50 2 L85 85 L15 85 Z" />
            <path d="M50 98 L85 15 L15 15 Z" />
            <path d="M50 85 L80 30 L20 30 Z" opacity="0.6" />
            <path d="M50 15 L80 70 L20 70 Z" opacity="0.6" />
        </g>
    </svg>
);

// --- 1. PRANA PARTICLE CANVAS ---
const PranaCanvas = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let particles: { x: number; y: number; angle: number; radius: number; speed: number; alpha: number }[] = [];
        let animationFrameId: number;
        let mouseX = -1000;
        let mouseY = -1000;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initParticles();
        };

        const initParticles = () => {
            particles = [];
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            for (let i = 0; i < 200; i++) {
                const angle = i * 0.4;
                const dist = i * 3.5;
                particles.push({
                    x: centerX + Math.cos(angle) * dist,
                    y: centerY + Math.sin(angle) * dist,
                    angle: angle,
                    radius: Math.random() * 1.5 + 0.5,
                    speed: Math.random() * 0.003 + 0.001,
                    alpha: Math.random() * 0.7 + 0.3
                });
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            particles.forEach(p => {
                p.angle += p.speed;

                const dx = p.x - mouseX;
                const dy = p.y - mouseY;
                const mouseDist = Math.sqrt(dx * dx + dy * dy);
                let pushX = 0;
                let pushY = 0;

                if (mouseDist < 150) {
                    const force = (150 - mouseDist) / 150;
                    pushX = (dx / mouseDist) * force * 30;
                    pushY = (dy / mouseDist) * force * 30;
                }

                const originalX = p.x - pushX * 0.1;
                const originalY = p.y - pushY * 0.1;

                const cos = Math.cos(p.speed);
                const sin = Math.sin(p.speed);
                const nx = (originalX - centerX) * cos - (originalY - centerY) * sin + centerX;
                const ny = (originalX - centerX) * sin + (originalY - centerY) * cos + centerY;

                p.x = nx + pushX * 0.05;
                p.y = ny + pushY * 0.05;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 191, 0, ${p.alpha})`; // Accent Amber
                ctx.fill();
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;
        };

        window.addEventListener('resize', resize);
        canvas.addEventListener('mousemove', handleMouseMove);
        resize();
        animate();

        return () => {
            window.removeEventListener('resize', resize);
            canvas.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return <canvas ref={canvasRef} className={styles.particleCanvas} />;
};

// --- WRAPPERS ---
const LuminescentText = ({ children, delay = 0, loop = false }: { children: React.ReactNode, delay?: number, loop?: boolean }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });
    const [key, setKey] = useState(0);

    useEffect(() => {
        if (!loop || !isInView) return;
        const interval = setInterval(() => {
            setKey(prev => prev + 1);
        }, 6000);
        return () => clearInterval(interval);
    }, [loop, isInView]);

    return (
        <motion.div
            ref={ref}
            className={styles.bodyText}
            key={key}
            initial={{ opacity: 0, textShadow: "0 0 0 rgba(0,0,0,0)" }}
            animate={isInView ? {
                opacity: [0, 1, 1, 0],
                transition: {
                    duration: 6,
                    times: [0, 0.2, 0.8, 1],
                    delay: key === 0 ? delay : 0,
                    repeat: loop ? 0 : 0
                }
            } : {}}
        >
            <motion.span
                initial={{ color: "var(--text-main)", textShadow: "0 0 0 rgba(255,191,0,0)" }}
                animate={isInView ? {
                    color: ["var(--text-main)", "var(--accent-amber)", "var(--text-main)"],
                    textShadow: ["0 0 0px rgba(0,0,0,0)", "0 0 20px rgba(255,191,0,0.8)", "0 0 0px rgba(0,0,0,0)"]
                } : {}}
                transition={{ duration: 1.5, delay: delay + 0.2 }}
            >
                {children}
            </motion.span>
        </motion.div>
    );
};

// --- MAIN COMPONENT ---
export default function PranicPathSection() {
    return (
        <section className={styles.container}>
            <PranaCanvas />

            <div className={`glass-panel-heavy ${styles.contentWrapper}`}>
                <motion.div
                    className={styles.sacredGeometryBackground}
                    animate={{
                        scale: [0.95, 1.1, 1.1, 0.95],
                        opacity: [0.2, 0.3, 0.3, 0.2]
                    }}
                    transition={{
                        duration: 15,
                        times: [0, 0.33, 0.66, 1],
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                >
                    <SriYantraSVG />
                </motion.div>

                <div className={styles.headerGroup}>
                    <div className={styles.auroraContainer}>
                        <div className={styles.rotatingBackgroundYantra}>
                            <img
                                src="/images/pranav_logo.png"
                                className={styles.homeVedicOm}
                                alt="Pranav.AI Logo"
                            />
                        </div>
                        <div className={styles.iconSurround}>
                            <img
                                src="/images/pranav_logo.png"
                                className={styles.homeVedicOm}
                                alt="Pranav.AI Logo"
                            />
                        </div>
                    </div>
                    <h1 className={styles.title}>
                        Pranav Samadhaan
                    </h1>
                </div>

                <LuminescentText delay={0.2} loop>
                    Experience the <span style={{ color: 'var(--accent-amber)', fontFamily: 'var(--font-serif)', fontStyle: 'italic', textShadow: '0 0 10px rgba(255, 191, 0, 0.5)' }}>Fusion of Artificial Intelligence & Knowledge of Rishis</span>. We provide personalized guidance for <span className={styles.keyword}>Healing</span> your body, <span className={styles.keyword}>Rejuvenating</span> your mind, and <span className={styles.keyword}>Awakening</span> your spirit through the timeless wisdom of Ayurveda and Meditation.
                </LuminescentText>

                <div className={styles.buttonContainer}>
                    <Link href="/dhyan-kshetra">
                        <button className="btn-primary" style={{ padding: '1rem 3rem', fontSize: '1.2rem' }}>
                            Begin Your Samadhaan Journey...
                        </button>
                    </Link>
                </div>

                <div className={styles.brandingFooter}>
                    <div className={styles.brandMain}>
                        A Product Crafted by the Research & Development of Pranav.AI
                    </div>
                </div>
            </div>
        </section>
    );
}
