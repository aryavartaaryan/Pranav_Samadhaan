'use client';
/**
 * PranaIndicator — replaces "typing..." with a meditative breath ring.
 * Shows presence without pressure. 4s expand, 4s contract.
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    isVisible: boolean;
    accent: string;
    avatarContent: React.ReactNode;
    name: string;
}

export default function PranaIndicator({ isVisible, accent, avatarContent, name }: Props) {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '0.3rem 0.5rem',
                    }}
                >
                    {/* Avatar with breathing ring */}
                    <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
                        {/* Outer breathing ring */}
                        <motion.div
                            animate={{
                                scale: [1, 1.55, 1],
                                opacity: [0.55, 0.15, 0.55],
                            }}
                            transition={{
                                duration: 8,
                                repeat: Infinity,
                                ease: [0.45, 0, 0.55, 1], // slow breathe in/out
                                times: [0, 0.5, 1],
                            }}
                            style={{
                                position: 'absolute', inset: -4,
                                borderRadius: '50%',
                                border: `1.5px solid ${accent}`,
                                pointerEvents: 'none',
                            }}
                        />
                        {/* Middle ring */}
                        <motion.div
                            animate={{
                                scale: [1, 1.3, 1],
                                opacity: [0.4, 0.1, 0.4],
                            }}
                            transition={{
                                duration: 8,
                                repeat: Infinity,
                                ease: [0.45, 0, 0.55, 1],
                                times: [0, 0.5, 1],
                                delay: 0.5,
                            }}
                            style={{
                                position: 'absolute', inset: -1,
                                borderRadius: '50%',
                                border: `1px solid ${accent}88`,
                                pointerEvents: 'none',
                            }}
                        />
                        {/* Avatar */}
                        <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            border: `1.5px solid ${accent}66`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden',
                            background: `radial-gradient(circle, ${accent}22, rgba(0,0,0,0.4))`,
                            fontSize: '1rem',
                        }}>
                            {avatarContent}
                        </div>
                    </div>

                    {/* Soft label */}
                    <motion.div
                        animate={{ opacity: [0.5, 0.85, 0.5] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                            fontSize: '0.65rem',
                            color: `${accent}bb`,
                            fontFamily: 'monospace',
                            letterSpacing: '0.1em',
                            fontStyle: 'italic',
                        }}
                    >
                        {name} is present…
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
