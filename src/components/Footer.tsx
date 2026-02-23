import { useLanguage } from '@/context/LanguageContext';
import styles from './Footer.module.css';

export default function Footer() {
    const { lang } = useLanguage();
    const t = {
        hi: {
            brand: "आर्टिफिशियल इंटेलिजेंस और ऋषियों के महान ज्ञान का एक संगम",
            mantra: "“सर्वे भवन्तु सुखिनः”",
            translation: "सभी सुखी रहें, सभी रोग मुक्त रहें।",
            copyright1: "A Product Crafted by the Research & Development of",
        },
        en: {
            brand: "A Fusion of Artificial Intelligence and Great Knowledge of Rishis",
            mantra: "“Sarve Bhavantu Sukhinah”",
            translation: "May all beings be happy, may all beings be free from disease.",
            copyright1: "A Product Crafted by the Research & Development of",
        }
    }[lang] || {
        brand: "A Fusion of Artificial Intelligence and Great Knowledge of Rishis",
        mantra: "“Sarve Bhavantu Sukhinah”",
        translation: "May all beings be happy, may all beings be free from disease.",
        copyright1: "A Product Crafted by the Research & Development of",
    };

    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                {/* Brand */}
                <h2 className={styles.brand}>
                    {t.brand}
                </h2>

                {/* Mantra */}
                <p className={styles.mantra}>
                    {t.mantra}
                </p>
                <p className={styles.mantraSanskrit}>
                    &ldquo;ॐ सह नाववतु। सह नौ भुनक्तु। सह वीर्यं करवावहै। तेजस्वि नावधीतमस्तु मा विद्विषावहै॥ ॐ शान्तिः शान्तिः शान्तिः॥&rdquo;
                </p>

                {/* Translation */}
                <p className={styles.translation}>
                    {t.translation}
                </p>

                {/* Copyright */}
                <div className={styles.copyright}>
                    {t.copyright1} <span className={styles.highlight}>Pranav.AI</span>
                </div>
            </div>
        </footer>
    );
}
