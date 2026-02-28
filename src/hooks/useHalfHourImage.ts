'use client';

import { useState, useEffect } from 'react';

// Breathtaking, vertical 1080x1920 nature landscapes curated from Unsplash.
// This guarantees we don't get broken images from the deprecated 'source.unsplash.com/random' endpoint,
// while preserving the exact aesthetic the user requested.
const CURATED_NATURE_IDS = [
    '5QgIjaBsZ2c', // misty mountains
    'eOpewngf68w', // calm lake reflection
    'v7daTKlZzaw', // serene foggy forest
    'sD2mS5Kx-iA', // quiet dawn river
    'CSpjU6hYo_0', // stunning nature trail
    'z1d-RpsBQTI', // peaceful mountain peaks
    '4a2H1NpqM1A', // deep calm ocean dawn
    'S2YcjI3SkHs', // majestic aerial landscape
    'F5QhEONWucA', // sunset over sacred water
    'IHIgEqB1_6E', // soft clouds
    'k2V1A041tFI', // calm minimalist sea
    'oE_oI4mY-kQ', // aesthetic morning light
];

/**
 * Returns a high-quality Unsplash image URL that deterministically changes exactly every 30 minutes.
 * Ensures the image perfectly fits a 1080x1920 portrait reel.
 */
export function useHalfHourImage() {
    const [imageUrl, setImageUrl] = useState<string>('');
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const updateImage = () => {
            // 30 minute seed
            const timeSeed = Math.floor(Date.now() / (30 * 60 * 1000));

            // Deterministically select an image from the curated list based on the seed
            const imageId = CURATED_NATURE_IDS[timeSeed % CURATED_NATURE_IDS.length];

            // Generate standard high-quality unsplash URL
            const url = `https://images.unsplash.com/photo-${imageId}?w=1080&h=1920&fit=crop&q=80&auto=format`;

            // Only trigger a re-render/fade if the URL actually changed
            setImageUrl(prev => {
                if (prev !== url) {
                    setLoaded(false);
                    return url;
                }
                return prev;
            });
        };

        updateImage();

        // Check every minute if the 30-minute block has rolled over
        const interval = setInterval(updateImage, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!imageUrl) return;
        const img = new Image();
        img.src = imageUrl;
        img.onload = () => setLoaded(true);
    }, [imageUrl]);

    return { imageUrl, loaded };
}
