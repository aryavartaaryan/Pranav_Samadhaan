'use client';

import React from 'react';
import type { CSSProperties } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Lightbulb, Heart, Award } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import styles from './rishi.module.css';

// ── Rishi Data ────────────────────────────────────────────────────────────────

interface RishiPage {
    id: string;
    name: string;
    nameEn: string;
    title: string;
    titleEn: string;
    symbol: string;
    color: string;
    bgGradient: string;
    imageSrc: string;
    descriptionHi: string;
    descriptionEn: string;
    legacy: {
        titleHi: string;
        titleEn: string;
        contentHi: string;
        contentEn: string;
    };
    wisdom: {
        titleHi: string;
        titleEn: string;
        points: Array<{
            titleHi: string;
            titleEn: string;
            descHi: string;
            descEn: string;
        }>;
    };
    contributions: Array<{
        titleHi: string;
        titleEn: string;
        descHi: string;
        descEn: string;
    }>;
}

const RISHI_DATA: Record<string, RishiPage> = {
    'veda-vyasa': {
        id: 'veda-vyasa',
        name: 'वेद व्यास',
        nameEn: 'Veda Vyasa',
        title: 'महाभारत रचयिता',
        titleEn: 'Composer of Mahabharata',
        symbol: '📖',
        color: '#FFD700',
        bgGradient: 'radial-gradient(circle, rgba(255,215,0,0.18) 0%, transparent 70%)',
        imageSrc: '/images/vedvyas.png',
        descriptionHi: 'वेद व्यास संपूर्ण वेदों के संपादक और विश्व के सबसे बड़े महाकाव्य महाभारत के लेखक हैं। उन्होंने मानवता को परिस्थिति-निर्भर नैतिकता और धर्म की गहन समझ प्रदान की।',
        descriptionEn: 'Veda Vyasa, the compiler of all Vedas, is the author of the Mahabharata, the world\'s largest epic. He provided humanity with profound understanding of situational ethics and dharma.',
        legacy: {
            titleHi: 'विरासत',
            titleEn: 'Legacy',
            contentHi: 'महाभारत में 100,000 श्लोक हैं जो मानव जीवन के हर पहलू को कवर करते हैं। भगवद्गीता, जो महाभारत का सबसे महत्वपूर्ण भाग है, आध्यात्मिक ज्ञान का अमूल्य खजाना है।',
            contentEn: 'The Mahabharata contains 100,000 verses covering every aspect of human life. The Bhagavad Gita, the most important part, is an invaluable treasure of spiritual knowledge.',
        },
        wisdom: {
            titleHi: 'प्रमुख शिक्षाएं',
            titleEn: 'Key Teachings',
            points: [
                {
                    titleHi: 'धर्म',
                    titleEn: 'Dharma',
                    descHi: 'कर्तव्य के मार्ग पर चलना ही जीवन का सच्चा अर्थ है।',
                    descEn: 'Following the path of duty is the true meaning of life.',
                },
                {
                    titleHi: 'न्याय',
                    titleEn: 'Justice',
                    descHi: 'सत्य और न्याय को बनाए रखना प्रत्येक व्यक्ति का दायित्व है।',
                    descEn: 'Maintaining truth and justice is the responsibility of every individual.',
                },
                {
                    titleHi: 'संघर्ष',
                    titleEn: 'Struggle',
                    descHi: 'जीवन में संघर्ष अपरिहार्य है, परंतु सत्य के साथ रहना चाहिए।',
                    descEn: 'Struggle in life is inevitable, but one must remain with truth.',
                },
            ],
        },
        contributions: [
            {
                titleHi: 'वेदों का संपादन',
                titleEn: 'Vedic Compilation',
                descHi: 'चारों वेदों को संपादित और संरक्षित किया।',
                descEn: 'Compiled and preserved all four Vedas.',
            },
            {
                titleHi: 'महाभारत',
                titleEn: 'Mahabharata',
                descHi: 'विश्व का सबसे बड़ा महाकाव्य रचा जो सभी युगों के लिए प्रासंगिक है।',
                descEn: 'Composed the world\'s largest epic relevant for all ages.',
            },
            {
                titleHi: 'भगवद्गीता',
                titleEn: 'Bhagavad Gita',
                descHi: 'आध्यात्मिक ज्ञान और जीवन दर्शन का सबसे महत्वपूर्ण ग्रंथ।',
                descEn: 'The most important text of spiritual knowledge and life philosophy.',
            },
        ],
    },
    'valmiki': {
        id: 'valmiki',
        name: 'महर्षि वाल्मीकि',
        nameEn: 'Maharshi Valmiki',
        title: 'आदिकवि',
        titleEn: 'First Poet — Ramayana',
        symbol: '🏹',
        color: '#FF8C42',
        bgGradient: 'radial-gradient(circle, rgba(255,140,66,0.18) 0%, transparent 70%)',
        imageSrc: '/images/valmiki.png',
        descriptionHi: 'महर्षि वाल्मीकि को आदिकवि (प्रथम कवि) माना जाता है। उन्होंने रामायण की रचना की जो मर्यादा पुरुषोत्तम राम की कहानी कहती है और मानवीय मूल्यों को प्रदर्शित करती है।',
        descriptionEn: 'Maharshi Valmiki is revered as the Adi Kavi (First Poet). He composed the Ramayana, which narrates the story of Rama and exemplifies human values.',
        legacy: {
            titleHi: 'विरासत',
            titleEn: 'Legacy',
            contentHi: 'रामायण 24,000 श्लोकों का एक महाकाव्य है जो राम के आदर्श जीवन को दर्शाता है। इसमें सत्य, पवित्रता और कर्तव्य के मूल्य बताए गए हैं।',
            contentEn: 'The Ramayana is an epic of 24,000 verses depicting Rama\'s ideal life. It teaches values of truth, purity, and duty.',
        },
        wisdom: {
            titleHi: 'प्रमुख शिक्षाएं',
            titleEn: 'Key Teachings',
            points: [
                {
                    titleHi: 'आदर्श',
                    titleEn: 'Ideals',
                    descHi: 'राम का जीवन मर्यादा का प्रतीक है - कर्तव्य, सत्य और न्याय का पालन।',
                    descEn: 'Rama\'s life symbolizes ideal conduct - adherence to duty, truth, and justice.',
                },
                {
                    titleHi: 'परिवार',
                    titleEn: 'Family',
                    descHi: 'परिवार के रिश्ते समाज की नींव हैं।',
                    descEn: 'Family relationships are the foundation of society.',
                },
                {
                    titleHi: 'विजय',
                    titleEn: 'Victory',
                    descHi: 'सत्य की विजय अंत में अवश्य होती है।',
                    descEn: 'Truth always triumphs in the end.',
                },
            ],
        },
        contributions: [
            {
                titleHi: 'आदिकाव्य',
                titleEn: 'Adi Kavya',
                descHi: 'रामायण को संस्कृत साहित्य का पहला महाकाव्य माना जाता है।',
                descEn: 'The Ramayana is considered the first epic of Sanskrit literature.',
            },
            {
                titleHi: 'काव्य शैली',
                titleEn: 'Poetic Style',
                descHi: 'वाल्मीकि ने संस्कृत काव्य की नींव रखी।',
                descEn: 'Valmiki laid the foundation of Sanskrit poetry.',
            },
            {
                titleHi: 'आध्यात्मिक संदेश',
                titleEn: 'Spiritual Message',
                descHi: 'राम की कहानी के माध्यम से आध्यात्मिक मार्ग दिखाया।',
                descEn: 'Showed the spiritual path through the story of Rama.',
            },
        ],
    },
    'patanjali': {
        id: 'patanjali',
        name: 'महर्षि पतंजलि',
        nameEn: 'Maharshi Patanjali',
        title: 'योगसूत्र रचयिता',
        titleEn: 'Yoga Sutras — Ashtanga',
        symbol: '🧘',
        color: '#A78BFA',
        bgGradient: 'radial-gradient(circle, rgba(167,139,250,0.18) 0%, transparent 70%)',
        imageSrc: '/images/patanjali.png',
        descriptionHi: 'महर्षि पतंजलि योग के महान दार्शनिक और योगसूत्र के लेखक हैं। उन्होंने योग को एक वैज्ञानिक और दार्शनिक विषय के रूप में संरचित किया।',
        descriptionEn: 'Maharshi Patanjali is the great philosopher of yoga and author of the Yoga Sutras. He structured yoga as a scientific and philosophical discipline.',
        legacy: {
            titleHi: 'विरासत',
            titleEn: 'Legacy',
            contentHi: 'योगसूत्र 196 सूत्रों का एक ग्रंथ है जो मन को नियंत्रित करने और आत्मज्ञान प्राप्त करने का मार्ग दिखाता है। अष्टांग योग पतंजलि की सबसे महत्वपूर्ण देन है।',
            contentEn: 'The Yoga Sutras comprise 196 aphorisms showing the path to control the mind and achieve self-knowledge. Ashtanga Yoga is Patanjali\'s greatest contribution.',
        },
        wisdom: {
            titleHi: 'प्रमुख शिक्षाएं',
            titleEn: 'Key Teachings',
            points: [
                {
                    titleHi: 'समाधि',
                    titleEn: 'Samadhi',
                    descHi: 'योग का लक्ष्य मन को शांत करके परमात्मा से एकता प्राप्त करना है।',
                    descEn: 'The goal of yoga is to quiet the mind and achieve unity with the supreme.',
                },
                {
                    titleHi: 'अष्टांग',
                    titleEn: 'Ashtanga',
                    descHi: 'आठ चरणों वाला योग मार्ग जो शारीरिक और मानसिक विकास को सुनिश्चित करता है।',
                    descEn: 'Eight-fold yoga path ensuring physical and mental development.',
                },
                {
                    titleHi: 'ध्यान',
                    titleEn: 'Meditation',
                    descHi: 'ध्यान के माध्यम से आंतरिक शांति और आत्मज्ञान का मार्ग।',
                    descEn: 'Path to inner peace and self-knowledge through meditation.',
                },
            ],
        },
        contributions: [
            {
                titleHi: 'योगसूत्र',
                titleEn: 'Yoga Sutras',
                descHi: 'योग को व्यवस्थित और दार्शनिक रूप देना।',
                descEn: 'Systematized and philosophized yoga discipline.',
            },
            {
                titleHi: 'अष्टांग योग',
                titleEn: 'Ashtanga Yoga',
                descHi: 'आठ चरणों का योग मार्ग जो विश्वव्यापी मान्यता प्राप्त है।',
                descEn: 'Eight-fold yoga path recognized worldwide.',
            },
            {
                titleHi: 'मानसिक विज्ञान',
                titleEn: 'Mental Science',
                descHi: 'मन और चेतना के विज्ञान को समझाया।',
                descEn: 'Explained the science of mind and consciousness.',
            },
        ],
    },
    'sushruta': {
        id: 'sushruta',
        name: 'महर्षि सुश्रुत',
        nameEn: 'Maharshi Sushruta',
        title: 'शल्य चिकित्सा जनक',
        titleEn: 'Father of Surgery',
        symbol: '⚕️',
        color: '#34D399',
        bgGradient: 'radial-gradient(circle, rgba(52,211,153,0.18) 0%, transparent 70%)',
        imageSrc: '/images/shustra.png',
        descriptionHi: 'महर्षि सुश्रुत को शल्य चिकित्सा का जनक माना जाता है। उन्होंने सुश्रुत संहिता की रचना की जिसमें शल्य चिकित्सा के विस्तृत विवरण हैं।',
        descriptionEn: 'Maharshi Sushruta is considered the father of surgery. He composed the Sushruta Samhita, which contains detailed descriptions of surgical procedures.',
        legacy: {
            titleHi: 'विरासत',
            titleEn: 'Legacy',
            contentHi: 'सुश्रुत संहिता में 1000 से अधिक रोगों का विवरण है और 300 शल्य चिकित्सा उपकरणों का वर्णन है। यह प्राचीन चिकित्सा विज्ञान का सबसे महत्वपूर्ण ग्रंथ है।',
            contentEn: 'The Sushruta Samhita describes over 1000 diseases and 300 surgical instruments. It is the most important text of ancient medical science.',
        },
        wisdom: {
            titleHi: 'प्रमुख शिक्षाएं',
            titleEn: 'Key Teachings',
            points: [
                {
                    titleHi: 'शल्य चिकित्सा',
                    titleEn: 'Surgery',
                    descHi: 'रोगों के इलाज के लिए विभिन्न शल्य चिकित्सा तकनीकें।',
                    descEn: 'Various surgical techniques for treating diseases.',
                },
                {
                    titleHi: 'चिकित्सा नैतिकता',
                    titleEn: 'Medical Ethics',
                    descHi: 'चिकित्सक को रोगी की सेवा में समर्पित होना चाहिए।',
                    descEn: 'Physicians should be dedicated to serving patients.',
                },
                {
                    titleHi: 'अनुभव',
                    titleEn: 'Experience',
                    descHi: 'व्यावहारिक अनुभव और अवलोकन चिकित्सा का आधार हैं।',
                    descEn: 'Practical experience and observation are the foundation of medicine.',
                },
            ],
        },
        contributions: [
            {
                titleHi: 'शल्य विज्ञान',
                titleEn: 'Surgery',
                descHi: 'प्लास्टिक सर्जरी और अन्य शल्य तकनीकें विकसित कीं।',
                descEn: 'Developed plastic surgery and other surgical techniques.',
            },
            {
                titleHi: 'औषधि विज्ञान',
                titleEn: 'Pharmacology',
                descHi: '300+ औषधियों का विस्तारपूर्वक वर्णन किया।',
                descEn: 'Described over 300 medicinal substances in detail.',
            },
            {
                titleHi: 'चिकित्सा संहिता',
                titleEn: 'Medical Treatise',
                descHi: 'सुश्रुत संहिता आयुर्वेद का सबसे महत्वपूर्ण ग्रंथ है।',
                descEn: 'The Sushruta Samhita is the most important Ayurvedic text.',
            },
        ],
    },
    'charaka': {
        id: 'charaka',
        name: 'महर्षि चरक',
        nameEn: 'Maharshi Charaka',
        title: 'आयुर्वेद महाचार्य',
        titleEn: 'Pillar of Ayurveda',
        symbol: '🌿',
        color: '#F87171',
        bgGradient: 'radial-gradient(circle, rgba(248,113,113,0.18) 0%, transparent 70%)',
        imageSrc: '/images/charak.png',
        descriptionHi: 'महर्षि चरक आयुर्वेद के महाचार्य हैं। उन्होंने चरक संहिता की रचना की जो आयुर्वेदिक चिकित्सा का सबसे व्यापक ग्रंथ है।',
        descriptionEn: 'Maharshi Charaka is the great master of Ayurveda. He composed the Charaka Samhita, the most comprehensive text of Ayurvedic medicine.',
        legacy: {
            titleHi: 'विरासत',
            titleEn: 'Legacy',
            contentHi: 'चरक संहिता में 8000 श्लोक हैं और रोगों के निदान और उपचार के बारे में विस्तृत जानकारी है। यह आयुर्वेद का सबसे अधिक प्रामाणिक ग्रंथ है।',
            contentEn: 'The Charaka Samhita contains 8000 verses with detailed information on diagnosis and treatment. It is the most authentic text of Ayurveda.',
        },
        wisdom: {
            titleHi: 'प्रमुख शिक्षाएं',
            titleEn: 'Key Teachings',
            points: [
                {
                    titleHi: 'त्रिदोष',
                    titleEn: 'Tridosha',
                    descHi: 'वात, पित्त और कफ - तीन दोषों का संतुलन स्वास्थ्य का मूल है।',
                    descEn: 'Balance of Vata, Pitta, and Kapha is the foundation of health.',
                },
                {
                    titleHi: 'निदान',
                    titleEn: 'Diagnosis',
                    descHi: 'रोग के कारणों को समझना और उसके अनुसार उपचार करना।',
                    descEn: 'Understanding disease causes and treating accordingly.',
                },
                {
                    titleHi: 'जीवनशैली',
                    titleEn: 'Lifestyle',
                    descHi: 'स्वास्थ्य के लिए सही आहार और दिनचर्या अत्यंत महत्वपूर्ण है।',
                    descEn: 'Proper diet and daily routine are essential for health.',
                },
            ],
        },
        contributions: [
            {
                titleHi: 'चरक संहिता',
                titleEn: 'Charaka Samhita',
                descHi: 'आयुर्वेद का सबसे महत्वपूर्ण और व्यापक ग्रंथ।',
                descEn: 'The most important and comprehensive text of Ayurveda.',
            },
            {
                titleHi: 'आयुर्वेदिक सिद्धांत',
                titleEn: 'Ayurvedic Principles',
                descHi: 'स्वास्थ्य और रोग के मौलिक सिद्धांतों को समझाया।',
                descEn: 'Explained fundamental principles of health and disease.',
            },
            {
                titleHi: 'चिकित्सा विधि',
                titleEn: 'Medical Methodology',
                descHi: 'आयुर्वेदिक उपचार की सम्पूर्ण व्यवस्था दी।',
                descEn: 'Provided complete system of Ayurvedic treatment.',
            },
        ],
    },
    'vivekananda': {
        id: 'vivekananda',
        name: 'स्वामी विवेकानंद',
        nameEn: 'Swami Vivekananda',
        title: 'राजयोग और कर्मयोग',
        titleEn: 'Raja Yoga & Karma Yoga',
        symbol: '🔥',
        color: '#F97316',
        bgGradient: 'radial-gradient(circle, rgba(249,115,22,0.18) 0%, transparent 70%)',
        imageSrc: '/images/vivekananda.png',
        descriptionHi: 'स्वामी विवेकानंद आधुनिक भारत के एक महान दार्शनिक और आध्यात्मिक गुरु थे। उन्होंने वेदांत और योग के दर्शन को पश्चिमी दुनिया में पेश किया और भारतीय युवाओं को जाग्रत किया।',
        descriptionEn: 'Swami Vivekananda was a great philosopher and spiritual teacher of modern India. He introduced the philosophy of Vedanta and Yoga to the western world and awakened the youth of India.',
        legacy: {
            titleHi: 'विरासत',
            titleEn: 'Legacy',
            contentHi: 'रामकृष्ण मिशन की स्थापना और शिकागो में 1893 का ऐतिहासिक भाषण उनकी महान विरासत हैं। उन्होंने "उठो, जागो और तब तक मत रुको जब तक लक्ष्य प्राप्त न हो जाए" का नारा दिया।',
            contentEn: 'The founding of Ramakrishna Mission and the historic speech at Chicago in 1893 are his great legacy. He gave the slogan "Arise, awake, and stop not till the goal is reached."',
        },
        wisdom: {
            titleHi: 'प्रमुख शिक्षाएं',
            titleEn: 'Key Teachings',
            points: [
                {
                    titleHi: 'शक्ति',
                    titleEn: 'Strength',
                    descHi: 'शक्ति ही जीवन है, कमजोरी मृत्यु है। निडर बनो।',
                    descEn: 'Strength is life, weakness is death. Be fearless.',
                },
                {
                    titleHi: 'सेवा',
                    titleEn: 'Service',
                    descHi: 'मानव सेवा ही ईश्वर सेवा है (दरिद्र नारायण सेवा)।',
                    descEn: 'Service to man is service to God.',
                },
                {
                    titleHi: 'एकाग्रता',
                    titleEn: 'Concentration',
                    descHi: 'एकाग्रता ही समस्त ज्ञान की कुंजी है।',
                    descEn: 'Concentration is the essence of all knowledge.',
                },
            ],
        },
        contributions: [
            {
                titleHi: 'नव-वेदांत',
                titleEn: 'Neo-Vedanta',
                descHi: 'वेदांत को आधुनिक युग के लिए प्रासंगिक और व्यावहारिक बनाया।',
                descEn: 'Made Vedanta relevant and practical for the modern age.',
            },
            {
                titleHi: 'युवा जागरण',
                titleEn: 'Youth Awakening',
                descHi: 'भारतीय युवाओं में आत्म-सम्मान और राष्ट्रवाद की भावना जगाई।',
                descEn: 'Instilled self-respect and nationalism in Indian youth.',
            },
            {
                titleHi: 'विश्व बंधुत्व',
                titleEn: 'Universal Brotherhood',
                descHi: 'सभी धर्मों की एकता का संदेश विश्व पटल पर रखा।',
                descEn: 'Placed the message of unity of all religions on the global stage.',
            },
        ],
    },
    'dayanand-saraswati': {
        id: 'dayanand-saraswati',
        name: 'स्वामी दयानन्द सरस्वती',
        nameEn: 'Swami Dayanand Saraswati',
        title: 'आर्य समाज संस्थापक',
        titleEn: 'Founder of Arya Samaj',
        symbol: '🕉️',
        color: '#FFA500',
        bgGradient: 'radial-gradient(circle, rgba(255,165,0,0.18) 0%, transparent 70%)',
        imageSrc: '/images/dayanand.png',
        descriptionHi: 'स्वामी दयानन्द सरस्वती एक महान समाज सुधारक और वेदों के प्रकांड विद्वान थे। उन्होंने "वेदों की ओर लौटो" का नारा दिया और अंधविश्वासों व सामाजिक कुरीतियों के विरुद्ध शंखनाद किया।',
        descriptionEn: 'Swami Dayanand Saraswati was a great social reformer and profound scholar of the Vedas. He gave the slogan "Back to the Vedas" and crusaded against superstitions and social evils.',
        legacy: {
            titleHi: 'विरासत',
            titleEn: 'Legacy',
            contentHi: 'आर्य समाज की स्थापना, शुद्धि आंदोलन और सत्यार्थ प्रकाश उनकी अमर कृतियां हैं। उन्होंने शिक्षा के क्षेत्र में भी डी.ए.वी. (DAV) संस्थाओं की नींव रखने की प्रेरणा दी।',
            contentEn: 'The founding of Arya Samaj, the Shuddhi movement, and Satyarth Prakash are his immortal works. He also inspired the foundation of DAV institutions in education.',
        },
        wisdom: {
            titleHi: 'प्रमुख शिक्षाएं',
            titleEn: 'Key Teachings',
            points: [
                {
                    titleHi: 'सत्य',
                    titleEn: 'Truth',
                    descHi: 'सत्य को ग्रहण करने और असत्य को छोड़ने में सर्वदा उद्यत रहना चाहिए।',
                    descEn: 'One should always be ready to accept truth and renounce untruth.',
                },
                {
                    titleHi: 'वेद प्रमाण',
                    titleEn: 'Vedic Authority',
                    descHi: 'वेद ईश्वरीय ज्ञान हैं और सब सत्य विद्याओं की पुस्तक हैं।',
                    descEn: 'The Vedas are divine knowledge and the book of all true sciences.',
                },
                {
                    titleHi: 'कर्म',
                    titleEn: 'Karma',
                    descHi: 'मनुष्य अपने कर्मों के लिए स्वतंत्र है, परंतु फल भोगने में परतंत्र।',
                    descEn: 'Man is free in his actions, but dependent on God for the results.',
                },
            ],
        },
        contributions: [
            {
                titleHi: 'समाज सुधार',
                titleEn: 'Social Reform',
                descHi: 'बाल विवाह, सती प्रथा और मूर्ति पूजा का तार्किक खंडन किया।',
                descEn: 'Logically refuted child marriage, sati, and idol worship.',
            },
            {
                titleHi: 'स्त्री शिक्षा',
                titleEn: 'Women Education',
                descHi: 'स्त्री शिक्षा और समानता के प्रबल समर्थक थे।',
                descEn: 'Was a strong supporter of women\'s education and equality.',
            },
            {
                titleHi: 'स्वराज्य',
                titleEn: 'Swaraj',
                descHi: 'सर्वप्रथम "स्वराज्य" शब्द का प्रयोग किया जिसे बाद में तिलक ने अपनाया।',
                descEn: 'First to use the word "Swaraj" which was later adopted by Tilak.',
            },
        ],
    },
    'buddha': {
        id: 'buddha',
        name: 'महात्मा बुद्ध',
        nameEn: 'Mahatma Buddha',
        title: 'अष्टांगिक मार्ग',
        titleEn: 'Noble Eightfold Path',
        symbol: '☸️',
        color: '#FCD34D',
        bgGradient: 'radial-gradient(circle, rgba(252,211,77,0.18) 0%, transparent 70%)',
        imageSrc: '/images/buddha.png',
        descriptionHi: 'महात्मा बुद्ध, जिन्हें "साक्यमुनि" भी कहा जाता है, बौद्ध धर्म के संस्थापक थे। उन्होंने दुख के निवारण के लिए चार आर्य सत्य और अष्टांगिक मार्ग का प्रतिपादन किया।',
        descriptionEn: 'Mahatma Buddha, also known as "Sakyamuni", was the founder of Buddhism. He propounded the Four Noble Truths and the Eightfold Path for the cessation of suffering.',
        legacy: {
            titleHi: 'विरासत',
            titleEn: 'Legacy',
            contentHi: 'बौद्ध धर्म, त्रिपिटक साहित्य और अहिंसा का संदेश उनकी महान विरासत है। उनका दर्शन आज भी विश्व शांति का आधार है।',
            contentEn: 'Buddhism, Tripitaka literature, and the message of non-violence are his great legacy. His philosophy remains the foundation of world peace today.',
        },
        wisdom: {
            titleHi: 'प्रमुख शिक्षाएं',
            titleEn: 'Key Teachings',
            points: [
                {
                    titleHi: 'अहिंसा',
                    titleEn: 'Non-violence',
                    descHi: 'अहिंसा परमो धर्मः - अहिंसा ही परम धर्म है।',
                    descEn: 'Non-violence is the supreme duty.',
                },
                {
                    titleHi: 'मध्यम मार्ग',
                    titleEn: 'Middle Path',
                    descHi: 'कठोर तप और अत्यधिक भोग दोनों से बचना चाहिए।',
                    descEn: 'Avoid both extreme asceticism and excessive indulgence.',
                },
                {
                    titleHi: 'करुणा',
                    titleEn: 'Compassion',
                    descHi: 'सभी प्राणियों के प्रति मैत्री और करुणा का भाव रखें।',
                    descEn: 'Have feelings of friendship and compassion for all beings.',
                },
            ],
        },
        contributions: [
            {
                titleHi: 'बौद्ध दर्शन',
                titleEn: 'Buddhist Philosophy',
                descHi: 'प्रतीत्यसमुत्पाद और शून्यवाद जैसे गहन दार्शनिक सिद्धांत दिए।',
                descEn: 'Gave profound philosophical principles like Dependent Origination and Voidness.',
            },
            {
                titleHi: 'सामाजिक समानता',
                titleEn: 'Social Equality',
                descHi: 'जाति प्रथा का विरोध किया और सबको संघ में प्रवेश दिया।',
                descEn: 'Opposed the caste system and admitted everyone into the Sangha.',
            },
            {
                titleHi: 'ध्यान विधि',
                titleEn: 'Meditation Technique',
                descHi: 'विपश्यना और आनापानसति जैसी ध्यान विधियां दीं।',
                descEn: 'Gave meditation techniques like Vipassana and Anapana-sati.',
            },
        ],
    },
    'shankaracharya': {
        id: 'shankaracharya',
        name: 'आदि शंकराचार्य',
        nameEn: 'Adi Shankaracharya',
        title: 'अद्वैत वेदान्त',
        titleEn: 'Advaita Vedanta',
        symbol: '🔱',
        color: '#A78BFA',
        bgGradient: 'radial-gradient(circle, rgba(167,139,250,0.18) 0%, transparent 70%)',
        imageSrc: '/images/shankaracharya.png',
        descriptionHi: 'आदि शंकराचार्य भारत के महान दार्शनिक और धर्मसुधारक थे जिन्होंने अद्वैत वेदांत के सिद्धांत को स्थापित किया। उन्होंने कहा "ब्रह्म सत्यं जगन्मिथ्या" - ब्रह्म ही सत्य है, जगत मिथ्या है।',
        descriptionEn: 'Adi Shankaracharya was a great philosopher and reformer of India who established the doctrine of Advaita Vedanta. He declared "Brahma Satyam Jagan Mithya" - Brahman is real, the world is illusion.',
        legacy: {
            titleHi: 'विरासत',
            titleEn: 'Legacy',
            contentHi: 'उन्होंने भारत की चारों दिशाओं में चार मठों की स्थापना की। प्रमुख उपनिषदों, ब्रह्मसूत्र और भगवद्गीता पर उनके भाष्य अद्वितीय हैं।',
            contentEn: 'He established four Mathas in the four corners of India. His commentaries on principal Upanishads, Brahma Sutra, and Bhagavad Gita are unparalleled.',
        },
        wisdom: {
            titleHi: 'प्रमुख शिक्षाएं',
            titleEn: 'Key Teachings',
            points: [
                {
                    titleHi: 'अद्वैत',
                    titleEn: 'Non-Duality',
                    descHi: 'आत्मा और ब्रह्म एक ही हैं, कोई भेद नहीं है।',
                    descEn: 'Atman and Brahman are one, there is no difference.',
                },
                {
                    titleHi: 'ज्ञान मार्ग',
                    titleEn: 'Path of Knowledge',
                    descHi: 'मोक्ष(मुक्ति) केवल ज्ञान से ही संभव है।',
                    descEn: 'Liberation is possible only through knowledge (Jnana).',
                },
                {
                    titleHi: 'विवेक',
                    titleEn: 'Discrimination',
                    descHi: 'नित्य और अनित्य वस्तुओं में भेद (विवेक) करना आवश्यक है।',
                    descEn: 'Discrimination between the eternal and the transient is essential.',
                },
            ],
        },
        contributions: [
            {
                titleHi: 'सनातन पुनरुद्धार',
                titleEn: 'Sanatan Revival',
                descHi: 'वैदिक धर्म को पुन: स्थापित और संगठित किया।',
                descEn: 'Re-established and organized Vedic Dharma.',
            },
            {
                titleHi: 'मठ प्रणाली',
                titleEn: 'Matha System',
                descHi: 'संन्यासियों के लिए सुव्यवस्थित मठ परंपरा शुरू की।',
                descEn: 'Started a well-organized monastic tradition for Sannyasis.',
            },
            {
                titleHi: 'स्तोत्र साहित्य',
                titleEn: 'Stotra Literature',
                descHi: 'भज गोविंदम् जैसे अनेक भक्तिपूर्ण स्तोत्रों की रचना की।',
                descEn: 'Composed many devotional hymns like Bhaja Govindam.',
            },
        ],
    },
    'rajiv-dixit': {
        id: 'rajiv-dixit',
        name: 'राजीव दीक्षित',
        nameEn: 'Rajiv Dixit',
        title: 'स्वदेशी आंदोलन',
        titleEn: 'Swadeshi Movement',
        symbol: '🇮🇳',
        color: '#F87171',
        bgGradient: 'radial-gradient(circle, rgba(248,113,113,0.18) 0%, transparent 70%)',
        imageSrc: '/images/rajiv-dixit.png',
        descriptionHi: 'राजीव दीक्षित एक भारतीय वक्ता और सामाजिक कार्यकर्ता थे जिन्होंने स्वदेशी आंदोलन को नई ऊर्जा दी। उन्होंने भारत की प्राचीन विज्ञान, चिकित्सा और शिक्षा व्यवस्था के महत्व को उजागर किया।',
        descriptionEn: 'Rajiv Dixit was an Indian orator and social activist who revitalized the Swadeshi movement. He highlighted the importance of India\'s ancient science, medicine, and education systems.',
        legacy: {
            titleHi: 'विरासत',
            titleEn: 'Legacy',
            contentHi: 'उनके व्याख्यान आज भी लाखों लोगों को भारतीय संस्कृति और स्वदेशी के प्रति जागरूक कर रहे हैं। उन्होंने भारत स्वाभिमान और आजादी बचाओ आंदोलन के माध्यम से जन जागरूकता फैलाई।',
            contentEn: 'His lectures continue to awaken millions about Indian culture and Swadeshi. He spread public awareness through Bharat Swabhiman and Azadi Bachao movements.',
        },
        wisdom: {
            titleHi: 'प्रमुख शिक्षाएं',
            titleEn: 'Key Teachings',
            points: [
                {
                    titleHi: 'स्वदेशी',
                    titleEn: 'Swadeshi',
                    descHi: 'स्वदेशी अपनाओ, देश बचाओ। स्वदेशी वस्तुओं का प्रयोग करें।',
                    descEn: 'Adopt Swadeshi, save the country. Use indigenous products.',
                },
                {
                    titleHi: 'आत्मनिर्भरता',
                    titleEn: 'Self-Reliance',
                    descHi: 'भारत को आर्थिक और सांस्कृतिक रूप से आत्मनिर्भर बनाना।',
                    descEn: 'Making India economically and culturally self-reliant.',
                },
                {
                    titleHi: 'आयुर्वेद',
                    titleEn: 'Ayurveda',
                    descHi: 'गृह चिकित्सा और आयुर्वेद के माध्यम से स्वस्थ जीवन।',
                    descEn: 'Healthy living through home remedies and Ayurveda.',
                },
            ],
        },
        contributions: [
            {
                titleHi: 'जन जागरूकता',
                titleEn: 'Public Awareness',
                descHi: 'बहुराष्ट्रीय कंपनियों और वैश्वीकरण के खतरों के प्रति सचेत किया।',
                descEn: 'Alerted against the dangers of MNCs and globalization.',
            },
            {
                titleHi: 'भारतीय इतिहास',
                titleEn: 'Indian History',
                descHi: 'भारत के वास्तविक इतिहास और विज्ञान को तथ्यों के साथ प्रस्तुत किया।',
                descEn: 'Presented India\'s true history and science with facts.',
            },
            {
                titleHi: 'स्वास्थ्य क्रांति',
                titleEn: 'Health Revolution',
                descHi: 'आम आदमी को जटिल रोगों के सरल घरेलू उपचार बताए।',
                descEn: 'Taught simple home remedies for complex diseases to the common man.',
            },
        ],
    },
    'aryabhata': {
        id: 'aryabhata',
        name: 'आर्यभट्ट',
        nameEn: 'Aryabhata',
        title: 'खगोल विज्ञान',
        titleEn: 'Astronomy',
        symbol: '🌍',
        color: '#60A5FA',
        bgGradient: 'radial-gradient(circle, rgba(96,165,250,0.18) 0%, transparent 70%)',
        imageSrc: '/images/aryabhata.png',
        descriptionHi: 'आर्यभट्ट प्राचीन भारत के महान गणितज्ञ और खगोलशास्त्री थे। उन्होंने शून्य का प्रयोग, पृथ्वी की घूर्णन गति और पाई (π) के मान की सटीक गणना की।',
        descriptionEn: 'Aryabhata was a great mathematician and astronomer of ancient India. He accurately calculated the rotation of the Earth, the value of Pi (π), and pioneered the use of zero.',
        legacy: {
            titleHi: 'विरासत',
            titleEn: 'Legacy',
            contentHi: 'उनका ग्रंथ "आर्यभटीय" गणित और खगोल विज्ञान का आधार स्तंभ है। भारत के पहले उपग्रह का नाम उनके सम्मान में "आर्यभट्ट" रखा गया।',
            contentEn: 'His treatise "Aryabhatiya" is a foundation of mathematics and astronomy. India\'s first satellite was named "Aryabhata" in his honor.',
        },
        wisdom: {
            titleHi: 'प्रमुख शिक्षाएं',
            titleEn: 'Key Teachings',
            points: [
                {
                    titleHi: 'ब्रह्मांड',
                    titleEn: 'Universe',
                    descHi: 'पृथ्वी अपनी धुरी पर घूमती है, जिससे दिन और रात होते हैं।',
                    descEn: 'The Earth rotates on its axis, causing day and night.',
                },
                {
                    titleHi: 'ग्रहण',
                    titleEn: 'Eclipse',
                    descHi: 'सूर्य और चंद्र ग्रहण राहु-केतु से नहीं, छाया से होते हैं।',
                    descEn: 'Solar and lunar eclipses are caused by shadows, not Rahu-Ketu.',
                },
                {
                    titleHi: 'संख्या',
                    titleEn: 'Numbers',
                    descHi: 'बड़े से बड़े संख्याओं को वर्णित करने की प्रणाली दी।',
                    descEn: 'Gave a system to describe very large numbers.',
                },
            ],
        },
        contributions: [
            {
                titleHi: 'शून्य और दशमलव',
                titleEn: 'Zero & Decimal',
                descHi: 'शून्य और दशमलव प्रणाली के विकास में योगदान।',
                descEn: 'Contributed to the development of zero and decimal system.',
            },
            {
                titleHi: 'पृथ्वी की परिधि',
                titleEn: 'Earth\'s Circumference',
                descHi: 'पृथ्वी की परिधि की लगभग सटीक गणना की।',
                descEn: 'Calculated the circumference of the Earth almost precisely.',
            },
            {
                titleHi: 'बीजगणित',
                titleEn: 'Algebra',
                descHi: 'बीजगणित के मूलभूत सिद्धांतों का प्रतिपादन किया।',
                descEn: 'Formulated fundamental principles of algebra.',
            },
        ],
    },
    'brahmagupta': {
        id: 'brahmagupta',
        name: 'ब्रह्मगुप्त',
        nameEn: 'Brahmagupta',
        title: 'शून्य के नियम',
        titleEn: 'Rules of Zero',
        symbol: '0️⃣',
        color: '#34D399',
        bgGradient: 'radial-gradient(circle, rgba(52,211,153,0.18) 0%, transparent 70%)',
        imageSrc: '/images/brahmagupta.png',
        descriptionHi: 'ब्रह्मगुप्त एक प्रभावशाली गणितज्ञ थे जिन्होंने "ब्रह्मस्फुटसिद्धान्त" की रचना की। उन्होंने सबसे पहले शून्य के साथ गणितीय संक्रियाओं (जोड़, घटाव, गुणा, भाग) के नियम दिए।',
        descriptionEn: 'Brahmagupta was an influential mathematician who composed "Brahmasphutasiddhanta". He was the first to give rules for mathematical operations (add, subtract, multiply, divide) with zero.',
        legacy: {
            titleHi: 'विरासत',
            titleEn: 'Legacy',
            contentHi: 'उनके गणितीय सिद्धांत अरब दुनिया के माध्यम से यूरोप पहुंचे और आधुनिक गणित की नींव बने। उन्होंने ऋणात्मक संख्याओं (Negative Numbers) की अवधारणा भी दी।',
            contentEn: 'His mathematical theories reached Europe via the Arab world and became the foundation of modern mathematics. He also introduced the concept of Negative Numbers.',
        },
        wisdom: {
            titleHi: 'प्रमुख शिक्षाएं',
            titleEn: 'Key Teachings',
            points: [
                {
                    titleHi: 'शून्य',
                    titleEn: 'Zero',
                    descHi: 'शून्य से गुणा करने पर परिणाम शून्य होता है।',
                    descEn: 'Multiplying by zero results in zero.',
                },
                {
                    titleHi: 'ऋण संख्या',
                    titleEn: 'Negative Numbers',
                    descHi: 'उधारी या ऋण को ऋणात्मक संख्या के रूप में समझाया।',
                    descEn: 'Explained debt or loss as negative numbers.',
                },
                {
                    titleHi: 'समीकरण',
                    titleEn: 'Equations',
                    descHi: 'द्विघात समीकरणों (Quadratic Equations) के हल दिए।',
                    descEn: 'Provided solutions for quadratic equations.',
                },
            ],
        },
        contributions: [
            {
                titleHi: 'शून्य संक्रियाएं',
                titleEn: 'Zero Operations',
                descHi: 'शून्य के साथ गणित करने के स्पष्ट नियम परिभाषित किए।',
                descEn: 'Defined clear rules for doing math with zero.',
            },
            {
                titleHi: 'बीजगणित',
                titleEn: 'Algebra',
                descHi: 'बीजगणित को खगोल विज्ञान से अलग एक विषय बनाया।',
                descEn: 'Established algebra as a subject distinct from astronomy.',
            },
            {
                titleHi: 'चक्रीय चतुर्भुज',
                titleEn: 'Cyclic Quadrilateral',
                descHi: 'चक्रीय चतुर्भुज के क्षेत्रफल का सूत्र दिया।',
                descEn: 'Gave the formula for the area of a cyclic quadrilateral.',
            },
        ],
    },
    'chanakya': {
        id: 'chanakya',
        name: 'चाणक्य',
        nameEn: 'Chanakya',
        title: 'अर्थशास्त्र',
        titleEn: 'Economics',
        symbol: '🏰',
        color: '#F87171',
        bgGradient: 'radial-gradient(circle, rgba(248,113,113,0.18) 0%, transparent 70%)',
        imageSrc: '/images/chanakya.png',
        descriptionHi: 'चाणक्य (कौटिल्य/विष्णुगुप्त) प्राचीन भारत के महान शिक्षक, अर्थशास्त्री, और राजनेता थे। उन्होंने "अर्थशास्त्र" और "चाणक्य नीति" जैसे कालजयी ग्रंथ लिखे।',
        descriptionEn: 'Chanakya (Kautilya/Vishnugupta) was a great teacher, economist, and statesman of ancient India. He wrote timeless texts like "Arthashastra" and "Chanakya Niti".',
        legacy: {
            titleHi: 'विरासत',
            titleEn: 'Legacy',
            contentHi: 'उन्होंने चंद्रगुप्त मौर्य को सम्राट बनाकर अखंड भारत का निर्माण किया। उनकी नीतियां आज भी राजनीति, कूटनीति और प्रबंधन में प्रासंगिक हैं।',
            contentEn: 'He built Akhand Bharat by making Chandragupta Maurya the emperor. His policies remain relevant in politics, diplomacy, and management today.',
        },
        wisdom: {
            titleHi: 'प्रमुख शिक्षाएं',
            titleEn: 'Key Teachings',
            points: [
                {
                    titleHi: 'सुशासन',
                    titleEn: 'Good Governance',
                    descHi: 'प्रजा के सुख में ही राजा का सुख है।',
                    descEn: 'In the happiness of the subjects lies the happiness of the king.',
                },
                {
                    titleHi: 'कूटनीति',
                    titleEn: 'Diplomacy',
                    descHi: 'साम, दाम, दंड, भेद - कूटनीति के चार स्तंभ।',
                    descEn: 'Saam, Daam, Dand, Bhed - the four pillars of diplomacy.',
                },
                {
                    titleHi: 'शिक्षा',
                    titleEn: 'Education',
                    descHi: 'शिक्षक कभी साधारण नहीं होता, प्रलय और निर्माण उसकी गोद में पलते हैं।',
                    descEn: 'A teacher is never ordinary; destruction and construction thrive in his lap.',
                },
            ],
        },
        contributions: [
            {
                titleHi: 'अर्थशास्त्र',
                titleEn: 'Arthashastra',
                descHi: 'राज्य संचालन, अर्थव्यवस्था और सैन्य रणनीति पर महान ग्रंथ।',
                descEn: 'Great treatise on statecraft, economy, and military strategy.',
            },
            {
                titleHi: 'अखंड भारत',
                titleEn: 'United India',
                descHi: 'भारत को विदेशी आक्रमणों से बचाने के लिए एक सूत्र में पिरोया।',
                descEn: 'United India to protect it from foreign invasions.',
            },
            {
                titleHi: 'नीति शास्त्र',
                titleEn: 'Ethics',
                descHi: 'व्यावहारिक जीवन और सफलता के सूत्र दिए।',
                descEn: 'Gave formulas for practical life and success.',
            },
        ],
    },
    'kanada': {
        id: 'kanada',
        name: 'महर्षि कणाद',
        nameEn: 'Maharshi Kanada',
        title: 'वैशेषिक सूत्र',
        titleEn: 'Vaisheshika Sutra',
        symbol: '⚛️',
        color: '#FCD34D',
        bgGradient: 'radial-gradient(circle, rgba(252,211,77,0.18) 0%, transparent 70%)',
        imageSrc: '/images/kanada.png',
        descriptionHi: 'महर्षि कणाद वैशेषिक दर्शन के संस्थापक थे। उन्होंने जॉन डाल्टन से हजारों साल पहले परमाणु सिद्धांत (Atomic Theory) का प्रतिपादन किया था।',
        descriptionEn: 'Maharshi Kanada was the founder of Vaisheshika philosophy. He propounded the Atomic Theory thousands of years before John Dalton.',
        legacy: {
            titleHi: 'विरासत',
            titleEn: 'Legacy',
            contentHi: 'उन्होंने ब्रह्मांड के निर्माण में "अणु" (Atom) की भूमिका को समझाया। उनका दर्शन भौतिक विज्ञान और तत्वमीमांसा (Metaphysics) का अनूठा संगम है।',
            contentEn: 'He explained the role of "Anu" (Atom) in the creation of the universe. His philosophy is a unique blend of physics and metaphysics.',
        },
        wisdom: {
            titleHi: 'प्रमुख शिक्षाएं',
            titleEn: 'Key Teachings',
            points: [
                {
                    titleHi: 'पदार्थ',
                    titleEn: 'Matter',
                    descHi: 'विश्व में सब कुछ पदार्थों और परमाणुओं से बना है।',
                    descEn: 'Everything in the universe is made of substances and atoms.',
                },
                {
                    titleHi: 'कार्य-कारण',
                    titleEn: 'Cause & Effect',
                    descHi: 'हर कार्य का एक कारण होता है।',
                    descEn: 'Every effect has a cause.',
                },
                {
                    titleHi: 'धर्म',
                    titleEn: 'Dharma',
                    descHi: 'जिससे अभ्युदय और निःश्रेयस (मोक्ष) की सिद्धि हो, वही धर्म है।',
                    descEn: 'That from which prosperity and liberation are attained is Dharma.',
                },
            ],
        },
        contributions: [
            {
                titleHi: 'परमाणुवाद',
                titleEn: 'Atomism',
                descHi: 'परमाणु को अविभाज्य इकाई के रूप में परिभाषित किया।',
                descEn: 'Defined the atom as an indivisible unit.',
            },
            {
                titleHi: 'पदार्थ विज्ञान',
                titleEn: 'Physics',
                descHi: 'गति, बल और गुरुत्वाकर्षण के सिद्धांतों पर चर्चा की।',
                descEn: 'Discussed principles of motion, force, and gravity.',
            },
            {
                titleHi: 'तर्कशास्त्र',
                titleEn: 'Logic',
                descHi: 'वैज्ञानिक दृष्टिकोण और तर्क को बढ़ावा दिया।',
                descEn: 'Promoted scientific temper and logic.',
            },
        ],
    },
    'gautama': {
        id: 'gautama',
        name: 'महर्षि गौतम',
        nameEn: 'Maharshi Gautama',
        title: 'न्याय सूत्र',
        titleEn: 'Nyaya Sutra',
        symbol: '⚖️',
        color: '#93C5FD',
        bgGradient: 'radial-gradient(circle, rgba(147,197,253,0.18) 0%, transparent 70%)',
        imageSrc: '/images/gautama.png',
        descriptionHi: 'महर्षि गौतम, जिन्हें "अक्षपाद" भी कहा जाता है, न्याय दर्शन के प्रवर्तक हैं। न्याय दर्शन भारतीय तर्कशास्त्र (Logic) और ज्ञानमीमांसा (Epistemology) का आधार है।',
        descriptionEn: 'Maharshi Gautama, also known as "Akshapada", is the founder of Nyaya philosophy. Nyaya is the foundation of Indian logic and epistemology.',
        legacy: {
            titleHi: 'विरासत',
            titleEn: 'Legacy',
            contentHi: 'न्याय सूत्र तार्किक सोच, वाद-विवाद और सही ज्ञान प्राप्त करने की विधियों का विशद वर्णन करता है। यह भारतीय कानून और न्याय प्रणाली की दार्शनिक नींव है।',
            contentEn: 'Nyaya Sutra details logical thinking, debate, and methods of acquiring valid knowledge. It is the philosophical basis of Indian law and justice.',
        },
        wisdom: {
            titleHi: 'प्रमुख शिक्षाएं',
            titleEn: 'Key Teachings',
            points: [
                {
                    titleHi: 'प्रमाण',
                    titleEn: 'Evidence',
                    descHi: 'सत्य को जानने के चार प्रमाण: प्रत्यक्ष, अनुमान, उपमान, शब्द।',
                    descEn: 'Four means of valid knowledge: Perception, Inference, Comparison, Testimony.',
                },
                {
                    titleHi: 'तर्क',
                    titleEn: 'Reasoning',
                    descHi: 'अंधविश्वास के बजाय तर्क और प्रमाण पर भरोसा करें।',
                    descEn: 'Depence on reason and evidence rather than blind faith.',
                },
                {
                    titleHi: 'मुक्ति',
                    titleEn: 'Liberation',
                    descHi: 'मिथ्या ज्ञान का नाश ही दुखों से मुक्ति दिलाता है।',
                    descEn: 'Destruction of false knowledge leads to liberation from suffering.',
                },
            ],
        },
        contributions: [
            {
                titleHi: 'तर्कशास्त्र',
                titleEn: 'Logic',
                descHi: 'औपचारिक तर्क प्रणाली (Syllogism) का विकास किया।',
                descEn: 'Developed formal system of logic (Syllogism).',
            },
            {
                titleHi: 'वाद विधि',
                titleEn: 'Debate Method',
                descHi: 'शास्त्रार्थ और वाद-विवाद के नियम बनाए।',
                descEn: 'Formulated rules for debate and philosophical discussion.',
            },
            {
                titleHi: 'ज्ञान मीमांसा',
                titleEn: 'Epistemology',
                descHi: 'ज्ञान क्या है और कैसे प्राप्त होता है, इसे समझाया।',
                descEn: 'Explained what knowledge is and how it is acquired.',
            },
        ],
    },
    'kapila': {
        id: 'kapila',
        name: 'महर्षि कपिल',
        nameEn: 'Maharshi Kapila',
        title: 'सांख्य सूत्र',
        titleEn: 'Samkhya Sutra',
        symbol: '🔢',
        color: '#FCA5A5',
        bgGradient: 'radial-gradient(circle, rgba(252,165,165,0.18) 0%, transparent 70%)',
        imageSrc: '/images/kapila.png',
        descriptionHi: 'महर्षि कपिल सांख्य दर्शन के संस्थापक थे, जो विश्व का प्राचीनतम दर्शन माना जाता है। उन्होंने प्रकृति और पुरुष (Cheshna) के द्वैतवाद को समझाया।',
        descriptionEn: 'Maharshi Kapila was the founding sage of Samkhya philosophy, considered the oldest philosophy in the world. He explained the dualism of Prakriti (Nature) and Purusha (Consciousness).',
        legacy: {
            titleHi: 'विरासत',
            titleEn: 'Legacy',
            contentHi: 'सांख्य दर्शन ने ही योग, आयुर्वेद और वेदांत को प्रभावित किया है। भगवद्गीता में भगवान कृष्ण ने स्वयं को मुनियों में "कपिल" कहा है।',
            contentEn: 'Samkhya philosophy has influenced Yoga, Ayurveda, and Vedanta. In the Bhagavad Gita, Lord Krishna describes Himself as "Kapila" among the sages.',
        },
        wisdom: {
            titleHi: 'प्रमुख शिक्षाएं',
            titleEn: 'Key Teachings',
            points: [
                {
                    titleHi: 'प्रकृति-पुरुष',
                    titleEn: 'Prakriti-Purusha',
                    descHi: 'सृष्टि जड़ प्रकृति और चेतन पुरुष के संयोग से बनी है।',
                    descEn: 'Creation arises from the union of inert Nature and conscious Self.',
                },
                {
                    titleHi: 'त्रिगुण',
                    titleEn: 'Three Gunas',
                    descHi: 'सत्व, रजस और तमस - ये तीन गुण प्रकृति का आधार हैं।',
                    descEn: 'Sattva, Rajas, and Tamas - these three qualities are the basis of Nature.',
                },
                {
                    titleHi: 'विवेक ख्याति',
                    titleEn: 'Discriminative Knowledge',
                    descHi: 'पुरुष और प्रकृति के भेद को जानना ही मोक्ष है।',
                    descEn: 'Knowing the distinction between Self and Nature is liberation.',
                },
            ],
        },
        contributions: [
            {
                titleHi: 'विकासवाद',
                titleEn: 'Evolution',
                descHi: 'सृष्टि की उत्पत्ति और विकास का विस्तृत क्रम समझाया।',
                descEn: 'Explained detailed sequence of cosmic evolution.',
            },
            {
                titleHi: 'मनोविज्ञान',
                titleEn: 'Psychology',
                descHi: 'मन, बुद्धि और अहंकार के सूक्ष्म विश्लेषण।',
                descEn: 'Subtle analysis of Mind, Intellect, and Ego.',
            },
            {
                titleHi: 'सांख्य योग',
                titleEn: 'Samkhya Yoga',
                descHi: 'ज्ञान मार्ग के लिए मजबूत दार्शनिक आधार दिया।',
                descEn: 'Provided strong philosophical foundation for the Path of Knowledge.',
            },
        ],
    },
    'jaimini': {
        id: 'jaimini',
        name: 'महर्षि जैमिनी',
        nameEn: 'Maharshi Jaimini',
        title: 'मीमांसा सूत्र',
        titleEn: 'Mimamsa Sutra',
        symbol: '🔥',
        color: '#FDBA74',
        bgGradient: 'radial-gradient(circle, rgba(253,186,116,0.18) 0%, transparent 70%)',
        imageSrc: '/images/jaimini.png',
        descriptionHi: 'महर्षि जैमिनी पूर्व मीमांसा दर्शन के संस्थापक और महर्षि वेदव्यास के शिष्य थे। उनका दर्शन वेदों के कर्मकांड (Rituals) और धर्म के सही अर्थ पर केंद्रित है।',
        descriptionEn: 'Maharshi Jaimini was the founder of Purva Mimamsa philosophy and a disciple of Maharshi Vedavyasa. His philosophy focuses on Vedic rituals and the correct interpretation of Dharma.',
        legacy: {
            titleHi: 'विरासत',
            titleEn: 'Legacy',
            contentHi: 'मीमांसा सूत्र ने हिंदू धर्म के कर्मकांडों और कर्तव्यों को परिभाषित किया। सामवेद का संरक्षण और प्रसार भी जैमिनी द्वारा किया गया।',
            contentEn: 'Mimamsa Sutras defined the rituals and duties of Hinduism. Preservation and propagation of Samaveda was also done by Jaimini.',
        },
        wisdom: {
            titleHi: 'प्रमुख शिक्षाएं',
            titleEn: 'Key Teachings',
            points: [
                {
                    titleHi: 'धर्म पालन',
                    titleEn: 'Duty',
                    descHi: 'वेदों द्वारा निर्देशित कर्म (यज्ञ, दान) करना ही धर्म है।',
                    descEn: 'Performing actions (Yajna, Charity) prescribed by Vedas is Dharma.',
                },
                {
                    titleHi: 'शब्द नित्यत्व',
                    titleEn: 'Eternity of Sound',
                    descHi: 'वेद अपौरुषेय हैं और उनका शब्द (ध्वनि) नित्य है।',
                    descEn: 'Vedas are authorless and their sound is eternal.',
                },
                {
                    titleHi: 'कर्म फल',
                    titleEn: 'Fruits of Action',
                    descHi: 'कर्म अपना फल अवश्य देता है, यही अदृष्ट शक्ति है।',
                    descEn: 'Action essentially yields result, this is the invisible power.',
                },
            ],
        },
        contributions: [
            {
                titleHi: 'वेद व्याख्या',
                titleEn: 'Vedic Hermeneutics',
                descHi: 'वेदों के अर्थ समझने के लिए व्याख्या के नियम बनाए।',
                descEn: 'Formulated rules of interpretation to understand Vedas.',
            },
            {
                titleHi: 'कर्मकांड',
                titleEn: 'Rituals',
                descHi: 'यज्ञ और संस्कारों की विधि और महत्व को स्थापित किया।',
                descEn: 'Established the procedure and importance of Yajna and Sacraments.',
            },
            {
                titleHi: 'सामवेद',
                titleEn: 'Samaveda',
                descHi: 'संग संगीतमय सामवेद की परंपरा को आगे बढ़ाया।',
                descEn: 'Propagated the musical tradition of Samaveda.',
            },
        ],
    },
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function RishiIntroductionPage() {
    const router = useRouter();
    const { lang } = useLanguage();
    const params = useParams();
    const rishiId = params?.id as string;

    const rishi = RISHI_DATA[rishiId];

    if (!rishi) {
        return (
            <div className={styles.errorContainer}>
                <div className={styles.errorContent}>
                    <h1>{lang === 'hi' ? 'ऋषि नहीं मिला' : 'Rishi Not Found'}</h1>
                    <button onClick={() => router.back()} className={styles.backBtn}>
                        <ArrowLeft size={18} />
                        {lang === 'hi' ? 'वापस जाएं' : 'Go Back'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            className={styles.container}
            style={{ background: rishi.bgGradient }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            {/* Header */}
            <motion.div
                className={styles.header}
                style={{ '--rishi-color': rishi.color } as CSSProperties}
                initial={{ y: -40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.5 }}
            >
                <button className={styles.backBtn} onClick={() => router.back()}>
                    <ArrowLeft size={18} />
                </button>
                <div className={styles.headerContent}>
                    <div
                        className={styles.headerSymbol}
                        style={{ backgroundImage: `url(${rishi.imageSrc})` }}
                        aria-label={rishi.symbol}
                    />
                    <div className={styles.headerTextBlock}>
                        <h1 className={styles.name}>
                            {lang === 'hi' ? rishi.name : rishi.nameEn}
                        </h1>
                        <p className={styles.title}>
                            {lang === 'hi' ? rishi.title : rishi.titleEn}
                        </p>
                        <div className={styles.headerTags}>
                            <span className={`${styles.tag} ${styles.tagDarshanik}`}>
                                {lang === 'hi' ? 'दार्शनिक दृष्टि' : 'Philosophical Lens'}
                            </span>
                            <span className={`${styles.tag} ${styles.tagGranth}`}>
                                {lang === 'hi' ? 'ग्रंथ · पुस्तके' : 'Texts & Scriptures'}
                            </span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Main Content */}
            <motion.div
                className={styles.content}
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
            >
                <div className={styles.contentGrid}>
                    <section className={`${styles.section} ${styles.sectionMain}`}>
                        <p className={styles.description}>
                            {lang === 'hi' ? rishi.descriptionHi : rishi.descriptionEn}
                        </p>

                        <div className={styles.sectionDivider} />

                        <h2 className={styles.sectionTitle}>
                            <Lightbulb size={20} />
                            {lang === 'hi' ? rishi.wisdom.titleHi : rishi.wisdom.titleEn}
                        </h2>
                        <div className={styles.wisdomGrid}>
                            {rishi.wisdom.points.map((point, idx) => (
                                <motion.div
                                    key={idx}
                                    className={styles.wisdomCard}
                                    initial={{ x: -18, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.25 + idx * 0.08 }}
                                >
                                    <h3 className={styles.wisdomTitle}>
                                        {lang === 'hi' ? point.titleHi : point.titleEn}
                                    </h3>
                                    <p className={styles.wisdomDesc}>
                                        {lang === 'hi' ? point.descHi : point.descEn}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </section>

                    <section className={`${styles.section} ${styles.sectionSide}`}>
                        <h2 className={styles.sectionTitle}>
                            <Heart size={20} />
                            {lang === 'hi' ? rishi.legacy.titleHi : rishi.legacy.titleEn}
                        </h2>
                        <p className={styles.sectionContent}>
                            {lang === 'hi' ? rishi.legacy.contentHi : rishi.legacy.contentEn}
                        </p>

                        <div className={styles.sectionDivider} />

                        <h2 className={styles.sectionTitle}>
                            <Award size={20} />
                            {lang === 'hi' ? 'योगदान' : 'Contributions'}
                        </h2>
                        <div className={styles.contributionsGrid}>
                            {rishi.contributions.map((contrib, idx) => (
                                <motion.div
                                    key={idx}
                                    className={styles.contributionCard}
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 + idx * 0.08 }}
                                >
                                    <h3 className={styles.contributionTitle}>
                                        {lang === 'hi' ? contrib.titleHi : contrib.titleEn}
                                    </h3>
                                    <p className={styles.contributionDesc}>
                                        {lang === 'hi' ? contrib.descHi : contrib.descEn}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </section>
                </div>

                <motion.div
                    className={styles.ctaSection}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.45, duration: 0.5 }}
                >
                    <button
                        className={styles.rishiChatBtn}
                        onClick={() => router.back()}
                    >
                        <BookOpen size={18} />
                        {lang === 'hi' ? 'संवाद पर लौटें' : 'Return to Conversation'}
                    </button>
                </motion.div>
            </motion.div>
        </motion.div>
    );
}
