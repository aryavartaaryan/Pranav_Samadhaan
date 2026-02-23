import React from 'react';
import Image from 'next/image';
import styles from './SriYantra.module.css';

export const SriYantraSVG = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 200 200" className={className}>
        <defs>
            <filter id="silverGlow">
                <feGaussianBlur stdDeviation="1.0" result="blur" />
                <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>
        {/* Deeper dark blue for the main skeleton */}
        <g fill="none" stroke="rgba(0, 50, 150, 0.9)" strokeWidth="1.2">
            {/* Bhupura (Bhupur) */}
            <path d="M10 10 L190 10 L190 190 L10 190 Z" />
            <path d="M25 25 L175 25 L175 175 L25 175 Z" />
            <path d="M32 32 L168 32 L168 168 L32 168 Z" />

            {/* Traditional T-shaped Gates */}
            {[0, 90, 180, 270].map(angle => (
                <g key={`gate-${angle}`} transform={`rotate(${angle} 100 100)`}>
                    <path d="M85 5 L85 25 L115 25 L115 5" />
                </g>
            ))}

            {/* Outer Circles */}
            <circle cx="100" cy="100" r="65" />
            <circle cx="100" cy="100" r="58" />

            {/* 16 Lotus Petals (Vishuddha-like arrangement) */}
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
                return <path key={`p16-${i}`} d={`M${x1} ${y1} Q${cp_x} ${cp_y} ${x2} ${y2}`} strokeWidth="1.0" />;
            })}

            {/* 8 Lotus Petals (Anahata-like arrangement) */}
            {[...Array(8)].map((_, i) => {
                const angle = (i * 360 / 8 + 22.5) * Math.PI / 180;
                const nextAngle = ((i + 1) * 360 / 8 + 22.5) * Math.PI / 180;
                const r_in = 48;
                const r_out = 58;
                const x1 = 100 + Math.cos((i * 360 / 8 + 22.5) * Math.PI / 180) * r_in;
                const y1 = 100 + Math.sin((i * 360 / 8 + 22.5) * Math.PI / 180) * r_in;
                const x2 = 100 + Math.cos(((i + 1) * 360 / 8 + 22.5) * Math.PI / 180) * r_in;
                const y2 = 100 + Math.sin(((i + 1) * 360 / 8 + 22.5) * Math.PI / 180) * r_in;
                const cp_x = 100 + Math.cos((angle + nextAngle) / 2) * r_out * 1.2;
                const cp_y = 100 + Math.sin((angle + nextAngle) / 2) * r_out * 1.2;
                return <path key={`p8-${i}`} d={`M${x1} ${y1} Q${cp_x} ${cp_y} ${x2} ${y2}`} strokeWidth="1.6" />;
            })}

            {/* High Precision 9 Interlocking Triangles Structure */}
            {/* Downward Triangles (5) */}
            <path d="M100 155 L145 70 L55 70 Z" strokeWidth="1.8" /> {/* T1 */}
            <path d="M100 142 L135 85 L65 85 Z" strokeWidth="1.6" /> {/* T2 */}
            <path d="M100 130 L125 95 L75 95 Z" strokeWidth="1.4" /> {/* T3 */}
            <path d="M100 120 L115 102 L85 102 Z" strokeWidth="1.2" /> {/* T4 */}
            <path d="M100 108 L108 108 L100 115 L92 108 Z" strokeWidth="1.0" /> {/* T5 */}

            {/* Upward Triangles (4) */}
            <path d="M100 45 L145 130 L55 130 Z" strokeWidth="1.8" /> {/* T6 */}
            <path d="M100 58 L135 115 L65 115 Z" strokeWidth="1.6" /> {/* T7 */}
            <path d="M100 70 L125 105 L75 105 Z" strokeWidth="1.4" /> {/* T8 */}
            <path d="M100 82 L115 97 L85 97 Z" strokeWidth="1.2" /> {/* T9 */}

            {/* Bindu */}
            <circle cx="100" cy="100" r="1.5" fill="#FFD700" />
        </g>
    </svg>
);

export default function SriYantra() {
    return (
        <div className={styles.tripleContainer}>
            {/* Left Side Yantra - Hidden on mobile, skeleton logic applied to side pngs too if visible */}
            <div className={styles.sideYantra}>
                <div className={styles.yantraClockwise}>
                    <Image
                        src="/sri-yantra-side.png?v=20260208"
                        alt="Sri Yantra Left"
                        width={500}
                        height={500}
                        unoptimized
                        className={styles.sideImageEffect}
                    />
                </div>
            </div>

            {/* Center Yantra - Layered Approach */}
            <div className={styles.container}>
                {/* Background Layer: Detailed SVG Skeleton */}
                <div className={styles.skeletonLayer}>
                    <div className={styles.glowLayer}></div>
                    <SriYantraSVG className={styles.mainSkeletonSvg} />
                </div>

                {/* Foreground Layer: Smaller Authentic Core */}
                <div className={styles.authenticCore}>
                    <Image
                        src="/sri-yantra-authentic.png?v=20260208"
                        alt="Sri Yantra Core"
                        width={400}
                        height={400}
                        priority
                        unoptimized
                        className={styles.coreImage}
                    />
                </div>
            </div>

            {/* Right Side Yantra */}
            <div className={styles.sideYantra}>
                <div className={styles.yantraClockwise}>
                    <Image
                        src="/sri-yantra-side.png?v=20260208"
                        alt="Sri Yantra Right"
                        width={500}
                        height={500}
                        unoptimized
                        className={styles.sideImageEffect}
                    />
                </div>
            </div>
        </div>
    );
}
