import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import styles from './SriYantra.module.css';

export const SriYantraSVG = ({ className }: { className?: string }) => {
    // Shared stroke color
    const strokeColor = "rgba(0, 120, 255, 0.45)"; // Celestial Blue

    return (
        <svg viewBox="0 0 200 200" className={className}>
            <defs>
                <filter id="divineGlow">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* 1. Outer Frame (Bhupura) - Static Base */}
            <g fill="none" stroke={strokeColor} strokeWidth="1">
                <path d="M10 10 L190 10 L190 190 L10 190 Z" />
                <path d="M25 25 L175 25 L175 175 L25 175 Z" />
                <path d="M32 32 L168 32 L168 168 L32 168 Z" />
                {[0, 90, 180, 270].map(angle => (
                    <g key={`gate-${angle}`} transform={`rotate(${angle} 100 100)`}>
                        <path d="M85 5 L85 25 L115 25 L115 5" />
                    </g>
                ))}
            </g>

            {/* 2. 16 Lotus Petals - Slow Clockwise Rotation */}
            <motion.g
                animate={{ rotate: 360 }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                style={{ originX: "100px", originY: "100px" }}
                fill="none" stroke={strokeColor} strokeWidth="0.8"
            >
                {[...Array(16)].map((_, i) => {
                    const angle = (i * 360 / 16) * Math.PI / 180;
                    const nextAngle = ((i + 1) * 360 / 16) * Math.PI / 180;
                    const r_in = 58;
                    const r_out = 65;
                    const x1 = 100 + Math.cos(angle) * r_in;
                    const y1 = 100 + Math.sin(angle) * r_in;
                    const x2 = 100 + Math.cos(nextAngle) * r_in;
                    const y2 = 100 + Math.sin(nextAngle) * r_in;
                    const cp_x = 100 + Math.cos((angle + nextAngle) / 2) * r_out * 1.1;
                    const cp_y = 100 + Math.sin((angle + nextAngle) / 2) * r_out * 1.1;
                    return <path key={`p16-${i}`} d={`M${x1} ${y1} Q${cp_x} ${cp_y} ${x2} ${y2}`} />;
                })}
            </motion.g>

            {/* 3. 8 Lotus Petals - Slow Counter-Clockwise Rotation */}
            <motion.g
                animate={{ rotate: -360 }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                style={{ originX: "100px", originY: "100px" }}
                fill="none" stroke={strokeColor} strokeWidth="1.2"
            >
                {[...Array(8)].map((_, i) => {
                    const angle = (i * 360 / 8 + 22.5) * Math.PI / 180;
                    const nextAngle = ((i + 1) * 360 / 8 + 22.5) * Math.PI / 180;
                    const r_in = 48;
                    const r_out = 58;
                    const x1 = 100 + Math.cos(angle) * r_in;
                    const y1 = 100 + Math.sin(angle) * r_in;
                    const x2 = 100 + Math.cos(nextAngle) * r_in;
                    const y2 = 100 + Math.sin(nextAngle) * r_in;
                    const cp_x = 100 + Math.cos((angle + nextAngle) / 2) * r_out * 1.2;
                    const cp_y = 100 + Math.sin((angle + nextAngle) / 2) * r_out * 1.2;
                    return <path key={`p8-${i}`} d={`M${x1} ${y1} Q${cp_x} ${cp_y} ${x2} ${y2}`} />;
                })}
            </motion.g>

            {/* 4. Core Triangles - Breathing Animation */}
            <motion.g
                animate={{ scale: [1, 1.05, 1], opacity: [0.6, 0.9, 0.6] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                style={{ originX: "100px", originY: "100px" }}
                fill="none" stroke="rgba(255, 215, 0, 0.5)" // Golden Glow
                strokeWidth="1.5"
            >
                {/* 5 Downward Triangles */}
                <path d="M100 155 L145 70 L55 70 Z" />
                <path d="M100 142 L135 85 L65 85 Z" />
                <path d="M100 130 L125 95 L75 95 Z" />
                <path d="M100 120 L115 102 L85 102 Z" />
                <path d="M100 108 L108 108 L100 115 L92 108 Z" />

                {/* 4 Upward Triangles */}
                <path d="M100 45 L145 130 L55 130 Z" />
                <path d="M100 58 L135 115 L65 115 Z" />
                <path d="M100 70 L125 105 L75 105 Z" />
                <path d="M100 82 L115 97 L85 97 Z" />
            </motion.g>

            {/* 5. Central Bindu - Pulsing Light */}
            <motion.circle
                cx="100" cy="100" r="2.5"
                fill="#FFD700"
                animate={{ scale: [1, 1.8, 1], filter: ["blur(0px)", "blur(2px)", "blur(0px)"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
        </svg>
    );
};

export default function SriYantra() {
    return (
        <div className={styles.container}>
            {/* Background Layer Grid / Glow */}
            <div className={styles.energyField}>
                <div className={styles.nebula} />
            </div>

            {/* The Layered Geometry */}
            <div className={styles.geometryWrapper}>
                {/* Base SVG Skeleton with Motion */}
                <SriYantraSVG className={styles.mainSvg} />

                {/* Optional: Authentic Core Overlay for added realism */}
                <motion.div
                    className={styles.authenticOverlay}
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                >
                    <Image
                        src="/sri-yantra-authentic.png?v=20260208"
                        alt="Sacred Core"
                        width={300}
                        height={300}
                        priority
                        unoptimized
                        className={styles.coreImage}
                    />
                </motion.div>
            </div>
        </div>
    );
}
