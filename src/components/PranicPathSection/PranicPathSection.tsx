'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import styles from './PranicPathSection.module.css';

// --- 3. SACRED GEOMETRY (SRI YANTRA) ---
const SriYantraSVG = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={className} style={{ width: '100%', height: '100%' }}>
        <g fill="none" stroke="#D4AF37" strokeWidth="0.3" opacity="0.6">
            {/* Improved visibility for background "Etched" feel */}
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
            // Fibonacci Spiral Logic
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

                // Mouse Repulsion (Water Ripple)
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

                // Spiral movement + Push
                const dist = 100 + p.angle * 10; // Keeping them somewhat spiraled
                /* To keep it simple visually: just rotate around center and apply push */
                const currentDist = Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2));

                // Simple rotation
                const originalX = p.x - pushX * 0.1; // damping push return
                const originalY = p.y - pushY * 0.1;

                // Rotate orbit
                const cos = Math.cos(p.speed);
                const sin = Math.sin(p.speed);
                const nx = (originalX - centerX) * cos - (originalY - centerY) * sin + centerX;
                const ny = (originalX - centerX) * sin + (originalY - centerY) * cos + centerY;

                p.x = nx + pushX * 0.05;
                p.y = ny + pushY * 0.05;

                // Draw Particle
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 215, 0, ${p.alpha})`; // Gold sparks
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

const SolarFlareText = ({ children }: { children: React.ReactNode }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <motion.h2
            ref={ref}
            className={styles.heading}
            initial={{ filter: "brightness(500%) blur(10px)", opacity: 0 }}
            animate={isInView ? { filter: "brightness(100%) blur(0)", opacity: 1 } : {}}
            transition={{ duration: 2.5, ease: "easeOut" }}
        >
            {children}
        </motion.h2>
    );
};

const LuminescentText = ({ children, delay = 0, loop = false }: { children: React.ReactNode, delay?: number, loop?: boolean }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });
    const [key, setKey] = useState(0);

    useEffect(() => {
        if (!loop || !isInView) return;

        const interval = setInterval(() => {
            setKey(prev => prev + 1);
        }, 6000); // 6s cycle (Appear -> Stay -> Disappear -> Reappear)

        return () => clearInterval(interval);
    }, [loop, isInView]);

    return (
        <motion.div
            ref={ref}
            className={styles.bodyText}
            key={key} // Force re-render for loop
            initial={{ opacity: 0, textShadow: "0 0 0 rgba(0,0,0,0)" }}
            animate={isInView ? {
                opacity: [0, 1, 1, 0], // Loop opacity
                transition: {
                    duration: 6,
                    times: [0, 0.2, 0.8, 1], // Fade in (20%), Stay (60%), Fade out (20%)
                    delay: key === 0 ? delay : 0, // Initial delay only
                    repeat: loop ? 0 : 0
                }
            } : {}}
        >
            <motion.span
                initial={{ color: "#F5F5DC", textShadow: "0 0 0 rgba(255,215,0,0)" }}
                animate={isInView ? {
                    color: ["#F5F5DC", "#FFD700", "#F5F5DC"], // Flash gold
                    textShadow: ["0 0 0px rgba(0,0,0,0)", "0 0 20px rgba(255,215,0,0.8)", "0 0 0px rgba(0,0,0,0)"]
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
    const [isHovered, setIsHovered] = useState(false);

    return (
        <section className={`${styles.container} ${isHovered ? styles.buttonHovered : ''}`}>
            <PranaCanvas />

            {/* Marigolds */}
            <div className={styles.petalContainer}>
                {/* Petals logic can remain or be styled in CSS */}
            </div>

            <div className={styles.contentWrapper}>
                {/* Center the Sacred Geometry strictly within the card */}
                <motion.div
                    className={styles.sacredGeometryBackground}
                    animate={{
                        scale: [0.95, 1.1, 1.1, 0.95],
                        opacity: [0.4, 0.6, 0.6, 0.4]
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

                <div className={styles.auroraContainer}>
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

                {/* Looping Subheading */}
                <LuminescentText delay={0.2} loop>
                    Experience the <span style={{ color: '#FFD700', fontFamily: 'var(--font-serif)', fontStyle: 'italic', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}>Fusion of Artificial Intelligence & Knowledge of Rishis</span>. We provide personalized guidance for <span className={styles.keyword}>Healing</span> your body, <span className={styles.keyword}>Rejuvenating</span> your mind, and <span className={styles.keyword}>Awakening</span> your spirit through the timeless wisdom of Ayurveda and Meditation.
                </LuminescentText>

                <Link href="/dhyan-kshetra">
                    <button
                        className={styles.stoneSealButton}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                    >
                        Begin Your Samadhaan Journey...
                    </button>
                </Link>

                {/* Branding Footer */}
                <div className={styles.brandingFooter}>
                    <div className={styles.brandMain}>
                        A Product Crafted by the Research & Development of Pranav.AI
                    </div>
                </div>
            </div>
        </section>
    );
}
