'use client';

import React from 'react';
import { motion } from 'framer-motion';
import styles from './TodayJourney.module.css';

export default function TodayJourney() {
    const steps = ['Breathwork', 'Meditation', 'Journaling', 'Gratitude'];
    const currentStep = 2; // 2 of 4

    return (
        <section className={styles.journeySection}>
            <h3 className={styles.sectionTitle}>TODAY'S JOURNEY</h3>

            <motion.div
                className={styles.journeyCard}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
            >
                <div className={styles.cardHeader}>
                    <h4 className={styles.flowTitle}>Morning Flow</h4>
                    <span className={styles.stepCount}>2 of 4</span>
                </div>

                <div className={styles.progressTrack}>
                    <motion.div
                        className={styles.progressBar}
                        initial={{ width: 0 }}
                        whileInView={{ width: '50%' }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: 'easeOut' as const }}
                    />
                </div>

                <div className={styles.stepsGrid}>
                    {steps.map((step, idx) => (
                        <span
                            key={step}
                            className={`${styles.stepLabel} ${idx < currentStep ? styles.completed : idx === currentStep ? styles.active : ''}`}
                        >
                            {step}
                        </span>
                    ))}
                </div>
            </motion.div>
        </section>
    );
}
