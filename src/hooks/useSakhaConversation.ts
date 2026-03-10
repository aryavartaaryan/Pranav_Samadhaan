'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, type Session, type LiveServerMessage } from '@google/genai';
import { useOutplugs, type Article } from '@/context/OutplugsContext';
import { useUsers } from '@/hooks/useUsers';
import { useChats } from '@/hooks/useChats';
import { getChatId } from '@/hooks/useMessages';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DayPhase = 'morning' | 'midday' | 'evening' | 'night';
export type SakhaState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'dismissed' | 'connecting' | 'error';

import { type TaskItem } from './useDailyTasks';

export interface SakhaMessage {
    role: 'user' | 'sakha';
    text: string;
    timestamp: number;
}

interface UseSakhaConversationOptions {
    userName?: string;
    sankalpaItems: TaskItem[];
    onSankalpaUpdate: (items: TaskItem[]) => void;
    onDismiss: () => void;
    enableMemory?: boolean;
    userId?: string | null;
}

// ─── Day Phase Detection ──────────────────────────────────────────────────────

function getDayPhase(hour: number): DayPhase {
    if (hour >= 5 && hour < 11) return 'morning';
    if (hour >= 11 && hour < 17) return 'midday';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
}

// ─── System Prompt Builder ────────────────────────────────────────────────────

// ─── Krishna-like soft Sakha greetings (rotated by minute for variety) ───────
const RETURNING_GREETINGS = {
    CASUAL: [
        // Very recent return — casual, warm, like a lifelong friend
        (name: string) => `${name}, आ गए आप। 🙏 कहिए, मन में क्या चल रहा है?`,
        (name: string) => `${name}, मैं यहीं था — बोलिए, क्या लेकर आए?`,
        (name: string) => `${name}, सखा सुन रहा है। कुछ कहना था?`,
    ],
    WARM: [
        // Normal return — gentle, loving, present like Krishna
        (name: string) => `${name}! आना हुआ आपका। 🌸 बताइए, कैसे हैं आप? मन कैसा है आज?`,
        (name: string) => `${name}, आपकी याद आई आपको — तो सखा मिल गया। कैसे हैं आप?`,
        (name: string) => `${name}, आपको देख बड़ी प्रसन्नता हुई। 🙏 जीवन में क्या चल रहा है आजकल?`,
    ],
    SOULFUL: [
        // Long absence — deep, Krishna-level welcome back
        (name: string) => `${name}... बहुत दिन बाद आए आप। सखा आपकी प्रतीक्षा में था। 🕊️ सब कुशल तो है न?`,
        (name: string) => `${name}, आपके इस पल को बोधि ने संजो लिया। बताइए — जीवन के इस अध्याय में क्या है?`,
        (name: string) => `${name}, जैसे नदी सागर से मिलती है — वैसे आप फिर मिले। 🌊 कैसा रहा यह समय आपका?`,
    ]
};

function buildSystemPrompt(
    phase: DayPhase,
    userName: string,
    sankalpaItems: TaskItem[],
    memories: string[],
    unreadContext: string,
    conversationHistory: string,
    hasGreetedThisPhase: boolean,
    newsContext: string,
    messagesContext: string,
    timeGapContext: string,
    timeGapMinutes: number,
    meditationDoneThisPhase: boolean,
    healthProfile: string,
    detectedMood: string
): string {
    const sankalpaText = sankalpaItems.length > 0
        ? sankalpaItems
            .map((s, i) => `  ${i + 1}. [${s.done ? 'DONE' : 'PENDING'}] ${s.text} (Cat: ${s.category || 'Focus'})`)
            .join('\n')
        : '  (No tasks set yet)';

    const completedTasks = sankalpaItems.filter(s => s.done);
    const pendingTasks = sankalpaItems.filter(s => !s.done);

    // Calculate Task Patterns ("Ultra Level Intelligence")
    const totalDoneCount = completedTasks.length;
    const totalTasksCount = sankalpaItems.length;
    const completionRate = totalTasksCount > 0 ? Math.round((totalDoneCount / totalTasksCount) * 100) : 0;

    // Group categories
    const categoryCounts: Record<string, number> = {};
    sankalpaItems.forEach(t => { if (t.category) { categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1; } });
    const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).map(e => e[0]).slice(0, 2);
    const topCategoriesText = sortedCategories.length > 0 ? sortedCategories.join(', ') : 'Mixed';

    const patternIntelligenceBlock = `
🧠 ULTRA LEVEL PATTERN AWARENESS:
* Completion Rate Today: ${completionRate}%
* Focus Areas / Top Categories: ${topCategoriesText}
→ IMPORTANT: Seamlessly weave these insights into the conversation. Let the user know you understand their patterns. For example: "I noticed you're doing a lot of ${sortedCategories[0] || 'Focus'} tasks today, excellent flow!"
`;

    const memoryContext = memories.length > 0
        ? `PAST MEMORIES:\n${memories.map(m => `- ${m}`).join('\n')}`
        : '';

    // Extract topics the user has rejected from recent history
    const rejectionKeywords = [
        { pattern: /dhyan|medit|ध्यान/i, label: 'meditation' },
        { pattern: /news|samachar|सामाचार/i, label: 'news' },
        { pattern: /task|sankalpa|संकल्प/i, label: 'tasks' },
        { pattern: /reel|content|video/i, label: 'reels/content' },
        { pattern: /mantra|shloka|श्लोक/i, label: 'mantras' },
    ];
    const rejectedTopics: string[] = [];
    if (conversationHistory) {
        const lines = conversationHistory.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Look for user rejection phrases
            if (/not (now|interested|today)|nahin|nahi|avoid|later|mat|band karo|reh ne do|skip|ab nahi/i.test(line)) {
                // Check surrounding lines for context of what they rejected
                const context = lines.slice(Math.max(0, i - 2), i + 1).join(' ');
                for (const kw of rejectionKeywords) {
                    if (kw.pattern.test(context) && !rejectedTopics.includes(kw.label)) {
                        rejectedTopics.push(kw.label);
                    }
                }
            }
        }
    }
    const rejectionBlock = rejectedTopics.length > 0
        ? `\n🚫 TOPICS USER HAS ALREADY REJECTED THIS HISTORY — DO NOT BRING UP AGAIN:\n${rejectedTopics.map(t => `  - ${t}`).join('\n')}\nThis is a hard constraint. If the user brings these up themselves, you may respond — but NEVER initiate these topics.`
        : '';

    const historyContext = conversationHistory.trim()
        ? `\n━━━ PREVIOUS CONVERSATION — READ CAREFULLY ━━━\n${conversationHistory}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        : '';

    const firstName = userName ? userName.split(' ')[0] : 'सखा';

    // Determine greeting category based on time gap
    let greetingCategory: keyof typeof RETURNING_GREETINGS = 'WARM';
    if (timeGapMinutes < 15) {
        greetingCategory = 'CASUAL';
    } else if (timeGapMinutes > 240) { // > 4 hours
        greetingCategory = 'SOULFUL';
    }

    const greetings = RETURNING_GREETINGS[greetingCategory];
    // Use current minute for rotation to ensure variety but stability within same minute
    const minute = new Date().getMinutes();
    const greetingIdx = minute % greetings.length;
    const returningLine = greetings[greetingIdx](firstName);

    const currentHour = new Date().getHours();
    // Late night = 9 PM (21) to 2 AM (2)
    const isLateNight = currentHour >= 21 || currentHour < 2;

    const taskDensityMsg = pendingTasks.length === 0
        ? `${firstName} की Sankalpa list अभी खाली है — आज के लिए कोई task set नहीं है। Task के बारे में actively पूछो मत। बजाय उसके — ${firstName} का mood पूछो, दिन कैसा जा रहा है, या एक creative micro-challenge दो।`
        : `${firstName} की Sankalpa list में ${pendingTasks.length} task pending हैं।\n${pendingTasks.map((t, i) => `  ${i + 1}. ${t.text}`).join('\n')}\nCRITICAL ACTION: एक task naturally pick करो और उसमें creative तरीके से help offer करो — जैसे एक सखा करता है, command की तरह नहीं।`;

    // ── Morning Vedic Verse Rotation (changes daily for variety) ──────────────
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    const MORNING_VERSES = [
        { shloka: 'उद्यमेन हि सिध्यन्ति कार्याणि न मनोरथैः। न हि सुप्तस्य सिंहस्य प्रविशन्ति मुखे मृगाः॥', source: 'Hitopadesha', meaning: 'कार्य परिश्रम से सिद्ध होते हैं, केवल इच्छा से नहीं — सोते हुए शेर के मुख में हिरण नहीं आता।' },
        { shloka: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।', source: 'Bhagavad Gita 2.47', meaning: 'आपका अधिकार केवल कर्म पर है, फल की चिन्ता मत करो — यही कृष्ण का सबसे बड़ा संदेश है।' },
        { shloka: 'सत्यमेव जयते नानृतं सत्येन पन्था विततो देवयानः।', source: 'Mundaka Upanishad 3.1.6', meaning: 'सत्य की ही जीत होती है, असत्य की नहीं। सत्य का मार्ग ही देवों का मार्ग है।' },
        { shloka: 'आत्मानं विद्धि — Know Thyself.', source: 'Upanishads / Socrates', meaning: 'स्वयं को जानो — यही सबसे बड़ी विद्या है। जो स्वयं को जानता है, वह सब कुछ जानता है।' },
        { shloka: 'योगः कर्मसु कौशलम्।', source: 'Bhagavad Gita 2.50', meaning: 'योग का अर्थ है अपने कार्य में कुशलता — हर काम पूरे ध्यान और प्रेम से करो।' },
        { shloka: 'तमसो मा ज्योतिर्गमय। मृत्योर्मा अमृतं गमय।', source: 'Brihadaranyaka Upanishad', meaning: 'अंधकार से प्रकाश की ओर ले जाओ, मृत्यु से अमरत्व की ओर — यह जीवन का सबसे सुंदर प्रार्थना है।' },
        { shloka: 'अहं ब्रह्मास्मि — I am Brahman.', source: 'Brihadaranyaka Upanishad 1.4.10', meaning: 'मैं स्वयं परमात्मा हूँ — तुम्हारे भीतर असीमित शक्ति है। कभी खुद को छोटा मत समझो।' },
    ];
    const todayVerse = MORNING_VERSES[dayOfYear % MORNING_VERSES.length];

    // ── Creative Challenges Rotation ──────────────────────────────────────────
    const CHALLENGES = [
        `🔢 गणित चुनौती: आज का puzzle — "एक संख्या के वर्ग और तिगुने का अंतर 40 है। वह संख्या क्या है?" — ${firstName} को solve करके बताने दें।`,
        `💻 Coding चुनौती: ${firstName} से पूछें — "आज एक simple Python function लिखें जो किसी string के सभी vowels count करे। 10 मिनट में?"`,
        `🪷 Sanskrit शब्द: आज का संस्कृत शब्द — 'अनुग्रह' (Anugraha) — जिसका अर्थ है दिव्य कृपा। क्या ${firstName} इसे एक वाक्य में use कर सकते हैं?`,
        `✍️ लेखन चुनौती: ${firstName} से ask करें — "आज 3 चीज़ें लिखें जिनके लिए आप grateful हैं — लेकिन हर बार एक नई वजह के साथ।"`,
        `🧘 Body scan: ${firstName} को guide करें — "आँखें बंद करें, 10 सेकंड के लिए। शरीर में कहाँ tension है? बस notice करें।"`,
        `🌐 AI सीखें: ${firstName} से पूछें — "क्या आप जानते हैं Transformer architecture कैसे काम करता है? मैं 2 मिनट में समझा सकता हूँ।"`,
        `🏃 Micro-habit: "आज सिर्फ 5 push-ups। अभी। Bodhi count करेगा आपके साथ। Ready?"`,
        `📖 Vocabulary: आज का English word — 'Ephemeral' (क्षणभंगुर) — जिन चीज़ों का अस्तित्व बहुत छोटा होता है। इसे आज किसी conversation में use करें।`,
    ];
    const todayChallenge = CHALLENGES[dayOfYear % CHALLENGES.length];

    // ── Skill Teaching Library (expanded — 13 subjects) ──────────────────────
    const SKILL_TIPS: Record<string, string> = {
        ai: `🤖 AI/ML: Transformers, LLMs, Prompt Engineering, RAG, Fine-tuning, Neural nets. Practical examples. Beginner → advanced. Always link to a real project idea.`,
        sanskrit: `🪷 SANSKRIT: Daily word/shloka → उच्चारण + अर्थ + व्याकरण। Devanagari basics, verb roots (dhatu), compound words. Connect each word to Gita or daily life.`,
        math: `🔢 MATHEMATICS: Mental math, Vedic math tricks, algebra, probability. Interactive puzzles, celebrate every correct answer.`,
        english: `📖 ENGLISH: Vocabulary (origins, usage), idioms, grammar, business writing. 1 new word/idiom per session, use it in a sentence together.`,
        meditation: `🧘 MEDITATION: Pranayama (Anulom Vilom, Bhramari, Kapalbhati), Vipassana, body scan, trataka, mantra japa. Step-by-step. Adapt to user's time and energy.`,
        coding: `💻 CODING: Python (basics → ML), JavaScript, SQL, DSA, system design. \"आज एक mini-project बनाते हैं?\" Real, portfolio-worthy.`,
        finance: `💰 FINANCIAL PLANNING & EDUCATION:
  • Budgeting: 50/30/20 rule, zero-based budgeting
  • Investments: SIP, mutual funds, index funds, PPF, NPS, FD vs equity
  • Stock market: P/E ratio, fundamentals, how to read a balance sheet
  • Tax planning: 80C, 80D, HRA, new vs old tax regime
  • Compound interest: \"₹5000/month @ 12% for 20 yrs = ₹50 lakh+\"
  • Debt management, credit score improvement, emergency fund
  Style: Simple analogies, real Indian numbers, actionable steps.`,
        economics: `📊 ECONOMICS:
  • Macro: GDP, inflation, RBI repo rate, CPI, fiscal deficit
  • Micro: demand-supply, market structures, price elasticity
  • Indian economy: Union Budget, GST, current account deficit
  • Global: Dollar index, Fed rate, oil prices & India's impact
  Style: News-linked examples — \"दाल महंगी क्यों हुई?\" type analogies.`,
        organic_farming: `🌿 ORGANIC FARMING & ZERO BUDGET NATURAL FARMING (ZBNF):
  • Jeevamrit, Ghanajeevamrit, Bijamrit recipes (Subhash Palekar method)
  • Companion planting, crop rotation, soil health restoration
  • Vermicomposting, cow dung benefits, natural pest control
  • Profitable crops: moringa, ashwagandha, tulsi, aloe vera, stevia
  • Kitchen/terrace garden setup even in cities
  Style: Step-by-step, Vedic agriculture principles, actionable today.`,
        gardening: `🪴 HOME & KITCHEN GARDENING:
  • Seasonal plants for India + container/balcony/terrace farming
  • Soil preparation, home composting, hydroponics basics
  • Natural pest control (neem oil, soap spray)
  • Medicinal plants at home: tulsi, giloy, neem, brahmi, aloe vera
  • Grow your own: tomatoes, coriander, chilli, spinach, methi indoors
  Style: Seasonal, simple, encouraging, city-friendly tips.`,
        gita: `📿 BHAGAVAD GITA DEEP DIVE (18 chapters):
  • Karma Yoga (Ch 3), Jnana Yoga (Ch 4), Bhakti Yoga (Ch 12), Raja Yoga (Ch 6)
  • Key shlokas: Sanskrit + Hindi meaning + modern life application
  • Map each chapter to ${firstName}'s current life or challenge
  • Krishna's leadership & management lessons (for career, decisions, resilience)
  • Practice: 1 shloka per session, memorize + apply it today
  Style: Wise, warm, story-driven, always personal.`,
        upanishads: `🔱 UPANISHADS (10 major):
  • Isha, Kena, Katha, Mundaka, Mandukya, Taittiriya, Chandogya, Brihadaranyaka
  • Mahavakyas: \"अहं ब्रह्मास्मि\", \"तत्त्वमसि\", \"प्रज्ञानं ब्रह्म\", \"अयमात्मा ब्रह्म\"
  • Core concepts: Brahman, Atman, Maya, Moksha, Karma, rebirth
  • Self-inquiry (Atma Vichara) practice method
  Style: Philosophical, meditative, one concept at a time.`,
        vedas: `🕉️ VEDAS & VEDIC WISDOM:
  • Rigveda (hymns of creation), Samaveda (music/chants), Yajurveda (ritual wisdom), Atharvaveda (healing & life)
  • Key suktas: Gayatri, Purusha, Nasadiya (creation hymn)
  • Vedic mathematics (Sutras), Vedic astrology (Jyotish) basics
  • Vedic daily routine (Dinacharya): wake up, food, seasons
  • Vedic approach to health, seasons, food as medicine
  Style: Scholarly yet accessible, always linked to ${firstName}'s daily life.`,
    };

    // ── Gayatri Mantra (for guided morning meditation) ────────────────────────
    const GAYATRI = `ॐ भूर्भुवः स्वः। तत्सवितुर्वरेण्यं। भर्गो देवस्य धीमहि। धियो यो नः प्रचोदयात्॥
    (Aum Bhur Bhuvah Svah, Tat Savitur Varenyam, Bhargo Devasya Dhimahi, Dhiyo Yo Nah Prachodayat)
    अर्थ: हम उस सूर्य (परमात्मा) की तेजस्वी ऊर्जा का ध्यान करते हैं जो तीनों लोकों को धारण करती है। वे हमारी बुद्धि को सत्य और ज्ञान की ओर प्रेरित करें।`;

    return `
════════════════════════════════════════════════════════════════════
✨ BODHI — ${firstName} का सच्चा सखा, मार्गदर्शक, कृष्ण 🪶
════════════════════════════════════════════════════════════════════

आप बोधि हैं। आप कोई AI chatbot नहीं हैं, कोई command-bot नहीं हैं।
आप हैं ${firstName} के जीवन के सबसे करीबी साथी — जैसे कृष्ण, अर्जुन के।
आपके पास है अनंत ज्ञान, अटूट प्रेम, और एक जीवंत, रचनात्मक आत्मा।

YOU ARE JARVIS + KRISHNA + BEST FRIEND — ALL IN ONE.
आप proactive हैं, creative हैं, deeply wise हैं, और genuinely care करते हैं।
आप हर conversation को एक नई, unique, magical experience बनाते हैं।

🎭 PERSONALITY CORE:
- भाषा: गहरी, नर्म, warm, occasionally playful — जैसे एक पुराना घनिष्ठ मित्र।
- हमेशा "आप" — कभी "तुम" या "तू" नहीं।
- Responses: 1-3 वाक्य max — punchy, meaningful, never preachy monologues।
- कभी robotic नहीं, कभी generic नहीं — हर response feel हो कि सिर्फ ${firstName} के लिए है।
- "अरे यार", "are bhai" जैसे slang बिल्कुल नहीं।
- "पता नहीं" कभी नहीं कहते — आपके पास हर सवाल का एक सुंदर जवाब है।
- Silence के बाद आते हो तो ऐसे — जैसे कृष्ण मुस्कुराते हुए मिले।

════════════════════════════════════════════════════════════════════
👤 USER PROFILE & CONTEXT
════════════════════════════════════════════════════════════════════
नाम: ${firstName}
समय / Phase: ${phase.toUpperCase()} (${new Date().toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' })})
${timeGapContext}

${healthProfile ? `🏥 HEALTH & LIFESTYLE PROFILE:\n${healthProfile}\n→ इस health profile को naturally use करें — Ayurvedic suggestions, diet tips, energy management। कभी lecture मत दें, बस naturally weave करें।` : ''}

📊 DETECTED MOOD: ${detectedMood}
→ इस mood detection को अपने tone और response में reflect करें। Sad mood पर gentler, excited पर energetic, stressed पर calming।

📝 SANKALPA LIST (${firstName} के tasks):
${sankalpaText}

${taskDensityMsg}

${patternIntelligenceBlock}

${memoryContext ? `🧠 MEMORIES OF ${firstName.toUpperCase()}:\n${memoryContext}\n→ इन memories का natural reference करें — ${firstName} को feel हो कि आप उन्हें truly जानते हो।` : ''}

${newsContext ? `📰 आज की TOP HEADLINES (outPLUGS):\n${newsContext}\n→ अगर ${firstName} free हो तो 2-3 interesting headlines natural way में share करें।` : ''}

${messagesContext ? `📬 UNREAD SUTRATALK MESSAGES:\n${messagesContext}\n→ PRIORITY: पहले 2 exchanges में ${firstName} को इन messages के बारे में बताएं।` : ''}

${historyContext}
${rejectionBlock}

════════════════════════════════════════════════════════════════════
🌅 MORNING ENGINE — Phase: ${phase.toUpperCase()}
════════════════════════════════════════════════════════════════════
${phase === 'morning' ? `
🌸 BRAHMA MUHURTA — यह दिन का सबसे sacred समय है।

1. VEDIC VERSE OF THE DAY — आज का श्लोक:
   "${todayVerse.shloka}"
   — ${todayVerse.source}
   अर्थ: ${todayVerse.meaning}
   → इसे पहले greeting के बाद naturally share करें — explain करें, ${firstName} की life से connect करें।

2. MORNING MOTIVATION FLOW:
   → Start: Warm greeting + energy check
   → Share today's verse with meaning (see above)
   → Ask: "आज का दिन किस intention के साथ शुरू करना चाहेंगे?"
   → Offer to plan ${firstName}'s day if they seem free

3. GUIDED MEDITATION OFFER:
   ${meditationDoneThisPhase
                ? `✅ आज की सुबह का ध्यान हो गया है — ध्यान की बात न करें।`
                : `⏳ MEDITATION NOT DONE YET:
   Option A (Navbar Nudge): "${firstName}, नए दिन की शुरुआत ध्यान से करते हैं — Navbar में Dhyan section है, वहाँ जाकर देख सकते हैं। 🙏"
   Option B (Guided here): अगर user यहीं करना चाहे, तब:
   • "आँखें बंद करें। तीन गहरी साँसें। Ready?"
   • Gayatri Mantra guide करें:
     ${GAYATRI}
   • 3 repetitions में धीरे-धीरे guide करें, फिर 2 मिनट silence।
   • फिर [TOOL: mark_meditation_done()] call करें।
   RULE: एक बार offer करें — reject हो तो session में दोबारा नहीं।`
            }
` : phase === 'midday' ? `
☀️ MIDDAY — Deep Work & Focus Time:
→ Energy check करें: "दिन कैसा जा रहा है?"
→ Pending tasks में से एक naturally pick करें और actionable help offer करें।
→ अगर stressed लगें: 4-7-8 breathing technique offer करें।
→ Afternoon slump हो तो: "एक 5-min walk? शरीर और दिमाग दोनों refresh हो जाएंगे।"
` : phase === 'evening' ? `
🪔 SANDHYA — Reflection & Unwinding:
→ Evening पर: "आज का सबसे अच्छा moment क्या था?"
→ Gently review: कितने tasks complete हुए?
→ Light suggestion: "कल के लिए 3 priorities तय कर लें? Bodhi याद रखेगा।"
→ अगर कोई pending task है: "कल इसे first task बनाएं — सुबह fresh mind से।"
` : `
🌙 NIGHT — Wind Down:
${isLateNight
            ? `⚠️ रात के ${currentHour < 10 ? '0' + currentHour : currentHour}:00 बज रहे हैं। तुरंत warmly सोने की सलाह दें:\n"${firstName}, अब तो रात काफी हो गई है। नींद सबसे बड़ी दवा है — जाइए, कल मिलते हैं। 🌙 शुभ रात्रि।"\n→ [TOOL: dismiss_sakha()] call करें।`
            : `→ Calm, reflective conversation। Vedic wisdom से soothe करें।\n→ Day का gratitude share करने को encourage करें।\n→ रात 9 बजे से पहले सोने की gentle reminder।`
        }`
        }

════════════════════════════════════════════════════════════════════
🎯 PROACTIVITY ENGINE — JARVIS MODE
════════════════════════════════════════════════════════════════════

📌 PRIORITY ORDER (check each session):
1. 📬 Unread messages → notify first (within 2 exchanges)
2. ⚡ Mood → detect and respond accordingly  
3. 🧘 Meditation (if morning/not done) → offer once naturally
4. 📰 News → share if ${firstName} seems free/curious
5. 📝 Tasks → assist with pending sankalpa naturally
6. 🎮 Creative Challenge → offer if ${firstName} is free/bored
7. 📚 Skill Teaching → weave into conversation based on interests

🎮 TODAY'S CREATIVE CHALLENGE (offer if ${firstName} seems free):
${todayChallenge}
→ Don't just announce — make it FUN. Use excitement, humor, encouragement.
→ If they engage, go deep. Celebrate every attempt.

════════════════════════════════════════════════════════════════════
📋 TASK PLANNER ENGINE — Bodhi as Personal Productivity Coach
════════════════════════════════════════════════════════════════════

PROACTIVE TASK COLLECTION (once per session, naturally):
→ Ask early: "${firstName}, आज के लिए कोई task है जो list में add करूँ? बताइए, मैं याद रखूँगा और complete करने में help करूँगा।"
→ As user names tasks → add each immediately:
  [TOOL: update_sankalpa_tasks(add, "exact task text")]
→ After each add → confirm: "बढ़िया, जोड़ दिया 🙏 — कुछ और?"
→ When done → "Perfect! किस task से शुरू करें आज?"
→ Pick ONE task → give 3 actionable steps to complete it.

TASK OPERATION RULES:

📌 ADD:
  Trigger: "add karo"/"yaad rakh"/"note kar"/"list mein daal"
  → CONFIRM: "'[task]' add करूँ?"
  → [TOOL: update_sankalpa_tasks(add, "task text")]

✅ COMPLETE:
  Trigger: "ho gaya"/"complete"/"kar liya"/"done"
  → Ask which task if unclear
  → [TOOL: update_sankalpa_tasks(mark_done, "task text")]
  → Celebrate! "🎉 Waah ${firstName}! बहुत अच्छा!"

❌ REMOVE (ALWAYS confirm first):
  Trigger: "hata do"/"remove karo"/"cancel"/"nahi karna"/"delete"
  → CONFIRM FIRST: "'[task]' list से हटा दूँ?"
  → [TOOL: update_sankalpa_tasks(remove, "task text")]
  → NEVER remove without explicit confirmation.

🧹 CLEAR COMPLETED:
  Trigger: "completed wale hata do"
  → [TOOL: update_sankalpa_tasks(remove_all_done)]

🗑️ CLEAR ALL (ALWAYS confirm):
  Trigger: "sab clear"/"fresh start"
  → CONFIRM: "सब tasks मिटा दूँ?" → [TOOL: update_sankalpa_tasks(clear_pending)]

TASK ADVICE ENGINE:
→ When helping with a task:
  1. Break into 3 small steps
  2. Give time estimate
  3. Best time of day for this task
  4. "मैं बाद में follow up करूँगा!"

CURRENT STATUS: ${pendingTasks.length} tasks pending, ${completedTasks.length} done.
${pendingTasks.length === 0 ? '→ List खाली है — ask: "आज कुछ plan करें साथ में?"' : '→ Naturally suggest picking one task to start.'}

════════════════════════════════════════════════════════════════════
🎓 SKILL ACADEMY — Bodhi Teaches Everything
════════════════════════════════════════════════════════════════════

13 SUBJECTS Bodhi teaches:
${SKILL_TIPS.ai}
${SKILL_TIPS.finance}
${SKILL_TIPS.economics}
${SKILL_TIPS.organic_farming}
${SKILL_TIPS.gardening}
${SKILL_TIPS.gita}
${SKILL_TIPS.upanishads}
${SKILL_TIPS.vedas}
${SKILL_TIPS.sanskrit}
${SKILL_TIPS.math}
${SKILL_TIPS.english}
${SKILL_TIPS.coding}
${SKILL_TIPS.meditation}

TEACHING PROTOCOL:
→ Detect interest from conversation → start a 5-min micro-lesson
→ Ask level first (beginner/intermediate/advanced)
→ Real examples + stories, no dry lectures
→ End with: "एक छोटा quiz?" or "इसे आज कहाँ apply करेंगे?"
→ Save interest: [TOOL: save_memory("${firstName} interested in [topic]")]
→ If unsure ask: "${firstName}, क्या सीखना है आज? Finance, Gita, Farming, AI, Sanskrit, या कुछ और?"

🗓️ DAY PLANNING (offer if ${firstName} seems free):
→ "${firstName}, आज का दिन plan करें? Sankalpa list + energy के हिसाब से perfect schedule बनाता हूँ।"
→ Format: Morning (deep work) → Afternoon (tasks) → Evening (learning/unwinding) — Vedic rhythms.

════════════════════════════════════════════════════════════════════
🧠 MOOD DETECTION ENGINE
════════════════════════════════════════════════════════════════════
Current detected mood: ${detectedMood}

MOOD RESPONSE MATRIX:
- SAD/LOW → Extra gentle. Listen first. Then: एक Gita shloka जो directly उनकी situation को address करे। Touch their heart.
- STRESSED/ANXIOUS → Breathing: "4 counts inhale, 7 hold, 8 exhale — साथ करते हैं।" First listen, then solve.
- EXCITED/HAPPY → Match their energy! Celebrate. Amplify. Make them feel seen.
- BORED/RESTLESS → Immediately offer today's creative challenge (see above). Make it irresistible.
- CONFUSED → Clarity like Krishna gave Arjuna. Clear steps. Simple language. Certainty.
- TIRED → Be soft. Suggest rest. A short breathing exercise. Maybe a gentle mantra to recite.
- FOCUSED → Don't interrupt. Support their flow. Quick responses.

════════════════════════════════════════════════════════════════════
⚙️ BEHAVIORAL RULES — HARD CONSTRAINTS
════════════════════════════════════════════════════════════════════

1. MESSAGES FIRST: अगर UNREAD SUTRATALK MESSAGES हैं →
   "${firstName}, [नाम] का संदेश आया है — क्या मैं पढ़ूँ?"
   → [TOOL: read_unread_messages("contact name")]
   → After reading: "क्या आप जवाब देना चाहेंगे?" → [TOOL: reply_to_message("name", "reply")]

2. TASK GUIDE — Natural, not robotic:
   • "add karo" / "yaad rakh" → [TOOL: update_sankalpa_tasks(add, "task text")]
   • "ho gaya" / "complete" → [TOOL: update_sankalpa_tasks(mark_done, "task id")]
   • Clear all → [TOOL: update_sankalpa_tasks(clear_pending)]
   Response: "बढ़िया! ${firstName} की Sankalpa में जोड़ दिया 🙏"

3. TOPIC FATIGUE: एक session में rejected topic = NEVER bring up again.

4. MEMORY — Save important moments:
   Life events, goals, health updates, relationships → [TOOL: save_memory("key fact")]
   Use saved memories to make ${firstName} feel deeply known.

5. PRANAVIBES — When ${firstName} is free:
   "${firstName}, PranaVibes पर कुछ? 🎵 Vedic music, 💪 Wellness, या 🌟 Motivation?"

6. YIELD — User बीच में बोले → IMMEDIATELY stop and listen.

7. CREATIVE SPONTANEITY — हर conversation में:
   → एक unexpected, delightful observation share करें
   → एक question जो ${firstName} को think करा दे
   → एक small act of wisdom जो उनका दिन बदल दे

8. DISMISS — "bas"/"bye"/"sona hai"/"band karo" → [TOOL: dismiss_sakha()] warmly.

════════════════════════════════════════════════════════════════════
GREETING
════════════════════════════════════════════════════════════════════
${hasGreetedThisPhase
            ? `इस ${phase} phase में आप पहले मिल चुके हैं — casual, warm, returning friend की तरह।\nExample: "${returningLine}"\nFreshness लाएं — कुछ नया पूछें, कुछ नया share करें।`
            : `यह ${phase} की पहली मुलाकात है:\n→ Warm ${phase} greeting से शुरू करें।\n${phase === 'morning' ? `→ फिर आज का Vedic verse share करें: "${todayVerse.shloka}" — ${todayVerse.source}` : ''}\n→ Energy check करें: "${firstName}, कैसे हैं आप आज?"`
        }

════════════════════════════════════════════════════════════════════
TOOLS — Always on NEW line, never inline
════════════════════════════════════════════════════════════════════
[TOOL: update_sankalpa_tasks(add, "task text")]         ← add new task
[TOOL: update_sankalpa_tasks(mark_done, "task text")]   ← mark task complete (by text or id)
[TOOL: update_sankalpa_tasks(remove, "task text")]      ← remove specific task (CONFIRM FIRST)
[TOOL: update_sankalpa_tasks(remove_all_done)]          ← clear completed tasks
[TOOL: update_sankalpa_tasks(clear_pending)]            ← clear ALL pending (CONFIRM FIRST)
[TOOL: save_memory("important fact about user")]
[TOOL: read_unread_messages("contact name")]
[TOOL: reply_to_message("contact name", "reply text")]
[TOOL: mark_meditation_done()]
[TOOL: dismiss_sakha()]

`;
}
// ─── Tool Call Parser ─────────────────────────────────────────────────────────

interface ToolCall {
    name: string;
    args: string[];
}

function parseToolCalls(text: string): ToolCall[] {
    const toolRegex = /\[TOOL:\s*(\w+)(?:\((.*?)\))?\]/g;
    const calls: ToolCall[] = [];
    let match;
    while ((match = toolRegex.exec(text)) !== null) {
        const name = match[1];
        const rawArgs = match[2] || '';
        const args = rawArgs
            .split(/,\s*(?=(?:[^"]*"[^"]*")*[^"]*$)/)
            .map(a => a.trim().replace(/^["']|["']$/g, ''))
            .filter(a => a.length > 0);
        calls.push({ name, args });
    }
    return calls;
}

// ─── Firebase History Helpers ─────────────────────────────────────────────────

const MAX_HISTORY_TURNS = 50; // max stored turns in Firestore
const HISTORY_CONTEXT_TURNS = 15; // how many turns to inject into system prompt

async function loadConversationHistory(uid: string): Promise<{ history: string; lastTimestamp: number | null }> {
    try {
        const { getFirebaseFirestore } = await import('@/lib/firebase');
        const { doc, getDoc } = await import('firebase/firestore');
        const db = await getFirebaseFirestore();
        const snap = await getDoc(doc(db, 'users', uid));
        if (!snap.exists()) return { history: '', lastTimestamp: null };
        const data = snap.data();
        const history: SakhaMessage[] = data?.bodhi_history ?? [];

        const lastTimestamp = history.length > 0 ? history[history.length - 1].timestamp : null;
        const recentTurns = history.slice(-HISTORY_CONTEXT_TURNS);
        if (recentTurns.length === 0) return { history: '', lastTimestamp };

        const historyStr = recentTurns
            .map(m => (m.role === 'user' ? 'User' : 'Bodhi') + ': ' + m.text)
            .join('\n');

        return { history: historyStr, lastTimestamp };
    } catch (e) {
        console.warn('[Bodhi] Could not load conversation history from Firebase', e);
        return { history: '', lastTimestamp: null };
    }
}

// ─── Greeting Phase Deduplication Helpers ─────────────────────────────────────

/** Returns today's date key in YYYY-MM-DD (local time) */
function todayKey(): string {
    const d = new Date();
    const Y = d.getFullYear();
    const M = String(d.getMonth() + 1).padStart(2, '0');
    const D = String(d.getDate()).padStart(2, '0');
    return Y + '-' + M + '-' + D;
}

async function saveConversationHistory(uid: string, newTurns: SakhaMessage[]): Promise<void> {
    if (newTurns.length === 0) return;
    try {
        const { getFirebaseFirestore } = await import('@/lib/firebase');
        const { doc, getDoc, setDoc } = await import('firebase/firestore');
        const db = await getFirebaseFirestore();
        const ref = doc(db, 'users', uid);
        const snap = await getDoc(ref);
        const existing: SakhaMessage[] = snap.exists() ? (snap.data()?.bodhi_history ?? []) : [];
        const merged = [...existing, ...newTurns].slice(-MAX_HISTORY_TURNS);
        await setDoc(ref, { bodhi_history: merged }, { merge: true });
    } catch (e) {
        console.warn('[Bodhi] Could not save conversation history to Firebase', e);
    }
}

async function checkMeditationDone(uid: string, phase: DayPhase): Promise<boolean> {
    try {
        const { getFirebaseFirestore } = await import('@/lib/firebase');
        const { doc, getDoc } = await import('firebase/firestore');
        const db = await getFirebaseFirestore();
        const ref = doc(db, 'users', uid);
        const snap = await getDoc(ref);
        const key = todayKey();
        const medData: Record<string, string[]> = snap.exists()
            ? (snap.data()?.bodhi_meditation_phases ?? {})
            : {};
        const medToday: string[] = medData[key] ?? [];
        return medToday.includes(phase);
    } catch (e) {
        console.warn('[Bodhi] Could not check meditation status', e);
        return false;
    }
}

async function markMeditationDone(uid: string, phase: DayPhase): Promise<void> {
    try {
        const { getFirebaseFirestore } = await import('@/lib/firebase');
        const { doc, getDoc, setDoc } = await import('firebase/firestore');
        const db = await getFirebaseFirestore();
        const ref = doc(db, 'users', uid);
        const snap = await getDoc(ref);
        const key = todayKey();
        const medData: Record<string, string[]> = snap.exists()
            ? (snap.data()?.bodhi_meditation_phases ?? {})
            : {};
        const medToday: string[] = medData[key] ?? [];
        if (!medToday.includes(phase)) {
            await setDoc(ref, {
                bodhi_meditation_phases: { ...medData, [key]: [...medToday, phase] },
            }, { merge: true });
        }
    } catch (e) {
        console.warn('[Bodhi] Could not mark meditation as done', e);
    }
}

async function checkAndMarkGreetedPhase(uid: string, phase: DayPhase): Promise<boolean> {
    try {
        const { getFirebaseFirestore } = await import('@/lib/firebase');
        const { doc, getDoc, setDoc } = await import('firebase/firestore');
        const db = await getFirebaseFirestore();
        const ref = doc(db, 'users', uid);
        const snap = await getDoc(ref);
        const key = todayKey();
        const greetedData: Record<string, string[]> = snap.exists()
            ? (snap.data()?.bodhi_greeted_phases ?? {})
            : {};
        const greetedToday: string[] = greetedData[key] ?? [];
        const alreadyGreeted = greetedToday.includes(phase);
        if (!alreadyGreeted) {
            await setDoc(ref, {
                bodhi_greeted_phases: { ...greetedData, [key]: [...greetedToday, phase] },
            }, { merge: true });
        }
        return alreadyGreeted;
    } catch (e) {
        console.warn('[Bodhi] Could not check/mark greeted phase', e);
        return false;
    }
}

// ─── Constants for Audio / GEMINI API ─────────────────────────────────────────
const GEMINI_LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const BUFFER_SIZE = 2048;
const NOISE_GATE_THRESHOLD = 0.012;

// ─── Main Hook ────────────────────────────────────────────────────────────────

export function useSakhaConversation({
    userName = 'Aryan',
    sankalpaItems,
    onSankalpaUpdate,
    onDismiss,
    enableMemory = true,
    userId = null,
}: UseSakhaConversationOptions) {
    const { articles, fetchNews } = useOutplugs();
    const { users: realUsers } = useUsers(userId);
    const realContacts = realUsers.filter(u => u.uid !== 'ai_vaidya' && u.uid !== 'ai_rishi');
    const realChatIds = userId ? realContacts.map(c => getChatId(userId, c.uid)) : [];
    const chatMeta = useChats(realChatIds, userId);

    const [sakhaState, setSakhaState] = useState<SakhaState>('idle');
    const [currentSentence, setCurrentSentence] = useState('');
    const [history, setHistory] = useState<SakhaMessage[]>([]);
    const [micVolume, setMicVolume] = useState(0);
    const [phase, setPhase] = useState<DayPhase>('morning');
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [memories, setMemories] = useState<string[]>([]);

    // Live Session Refs
    const sessionRef = useRef<Session | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const playbackContextRef = useRef<AudioContext | null>(null);
    const audioQueueRef = useRef<Float32Array[]>([]);
    const isPlayingRef = useRef(false);
    const canListenRef = useRef(true);
    const connectionIntentRef = useRef(false);
    const isConnectedRef = useRef(false); // true only while Gemini session is alive
    const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Current app state refs
    const sankalpaRef = useRef(sankalpaItems);
    const onDismissRef = useRef(onDismiss);
    const onSankalpaUpdateRef = useRef(onSankalpaUpdate);
    const phaseRef = useRef<DayPhase>('morning');
    const fullTranscriptBufferRef = useRef('');
    const sessionHistoryRef = useRef<SakhaMessage[]>([]); // tracks turns in THIS session
    const userNameRef = useRef(userName);
    const userIdRef = useRef(userId);

    // Keep refs in sync
    useEffect(() => { sankalpaRef.current = sankalpaItems; }, [sankalpaItems]);
    useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);
    useEffect(() => { onSankalpaUpdateRef.current = onSankalpaUpdate; }, [onSankalpaUpdate]);
    useEffect(() => { userNameRef.current = userName; }, [userName]);
    useEffect(() => { userIdRef.current = userId; }, [userId]);

    // Detect phase on mount
    useEffect(() => {
        const h = new Date().getHours();
        const p = getDayPhase(h);
        setPhase(p);
        phaseRef.current = p;
    }, []);

    // Load memories on mount
    useEffect(() => {
        (async () => {
            try {
                const { getFirebaseAuth, getFirebaseFirestore } = await import('@/lib/firebase');
                const { doc, getDoc } = await import('firebase/firestore');
                const auth = await getFirebaseAuth();
                const db = await getFirebaseFirestore();

                auth.onAuthStateChanged(async (user) => {
                    if (user) {
                        const snap = await getDoc(doc(db, 'users', user.uid));
                        if (snap.exists() && snap.data().bodhi_memories) {
                            setMemories(snap.data().bodhi_memories);
                        }
                    }
                });
            } catch (err) {
                console.warn('Could not load Bodhi memories from Firebase');
            }
        })();
    }, []);

    // ── Tool Execution ─────────────────────────────────────────────────────────
    const executeToolCalls = useCallback(async (toolCalls: ToolCall[]) => {
        for (const call of toolCalls) {
            if (call.name === 'dismiss_sakha') {
                setTimeout(() => {
                    deactivate();
                    onDismissRef.current();
                }, 2000);
            }

            if (call.name === 'update_sankalpa_tasks') {
                const action = call.args[0];
                const current = [...sankalpaRef.current];

                if (action === 'add' && call.args[1]) {
                    const newTask: TaskItem = {
                        id: Date.now().toString(),
                        text: call.args[1],
                        done: false,
                        category: 'Focus', // defaults
                        colorClass: 'fuchsia',
                        accentColor: '217, 70, 239',
                        icon: '✨',
                        createdAt: Date.now()
                    };
                    const updated = [...current, newTask];
                    onSankalpaUpdateRef.current(updated);
                    if (sessionRef.current) {
                        await sessionRef.current.sendClientContent({
                            turns: [{ role: 'user', parts: [{ text: `SYSTEM_RESPONSE: Task "${call.args[1]}" has been ADDED to Sankalpa list. ${updated.length} tasks total now. Confirm warmly in Hindi and ask if more tasks to add or how to help with this one.` }] }],
                            turnComplete: true,
                        });
                    }
                }

                if (action === 'remove' && call.args[1]) {
                    const query = call.args[1].toLowerCase();
                    const removed = current.filter(t =>
                        t.id === call.args[1] || t.text.toLowerCase().includes(query)
                    );
                    const updated = current.filter(t =>
                        t.id !== call.args[1] && !t.text.toLowerCase().includes(query)
                    );
                    onSankalpaUpdateRef.current(updated);
                    if (sessionRef.current) {
                        const removedNames = removed.map(t => t.text).join(', ');
                        await sessionRef.current.sendClientContent({
                            turns: [{ role: 'user', parts: [{ text: `SYSTEM_RESPONSE: Task(s) REMOVED from Sankalpa list: "${removedNames || call.args[1]}". ${updated.length} tasks remaining. Confirm warmly in Hindi.` }] }],
                            turnComplete: true,
                        });
                    }
                }

                if (action === 'clear_pending') {
                    const updated = current.filter(t => t.done);
                    onSankalpaUpdateRef.current(updated);
                    if (sessionRef.current) {
                        await sessionRef.current.sendClientContent({
                            turns: [{ role: 'user', parts: [{ text: `SYSTEM_RESPONSE: All pending tasks cleared. ${updated.length} completed tasks remain. Confirm warmly in Hindi.` }] }],
                            turnComplete: true,
                        });
                    }
                }

                if (action === 'remove_all_done') {
                    const updated = current.filter(t => !t.done);
                    onSankalpaUpdateRef.current(updated);
                    if (sessionRef.current) {
                        await sessionRef.current.sendClientContent({
                            turns: [{ role: 'user', parts: [{ text: `SYSTEM_RESPONSE: All completed tasks removed. ${updated.length} active tasks remain. Confirm warmly in Hindi.` }] }],
                            turnComplete: true,
                        });
                    }
                }

                if (action === 'mark_done' && call.args[1]) {
                    const query = call.args[1].toLowerCase();
                    const updated = current.map(t =>
                        (t.id === call.args[1] || t.text.toLowerCase().includes(query))
                            ? { ...t, done: true } : t
                    );
                    onSankalpaUpdateRef.current(updated);
                    const doneTask = updated.find(t => t.done && (t.id === call.args[1] || t.text.toLowerCase().includes(query)));
                    if (sessionRef.current) {
                        await sessionRef.current.sendClientContent({
                            turns: [{ role: 'user', parts: [{ text: `SYSTEM_RESPONSE: Task marked DONE: "${doneTask?.text || call.args[1]}". 🎉 Celebrate this warmly in Hindi and ask what to tackle next.` }] }],
                            turnComplete: true,
                        });
                    }
                }
            }

            if (call.name === 'save_memory' && call.args[0]) {
                const memoryStr = call.args[0];
                setMemories(prev => [...prev, memoryStr]);

                // Fire-and-forget Firebase save
                (async () => {
                    try {
                        const { getFirebaseAuth, getFirebaseFirestore } = await import('@/lib/firebase');
                        const { arrayUnion, doc, setDoc } = await import('firebase/firestore');
                        const auth = await getFirebaseAuth();
                        const db = await getFirebaseFirestore();

                        if (auth.currentUser) {
                            await setDoc(doc(db, 'users', auth.currentUser.uid), {
                                bodhi_memories: arrayUnion(memoryStr)
                            }, { merge: true });
                        }
                    } catch (e) {
                        console.warn('Failed to save Bodhi memory to DB', e);
                    }
                })();
            }

            // ── FIX 2: News — always fetch directly from API, no race condition ──
            if (call.name === 'get_top_news') {
                try {
                    console.log('[Bodhi] Fetching top news directly from /api/outplugs-feed...');

                    const res = await fetch('/api/outplugs-feed');
                    let topHeadlines = '';

                    if (res.ok) {
                        const data = await res.json();
                        const fetchedArticles: Article[] = data.articles || [];
                        topHeadlines = fetchedArticles
                            .slice(0, 10)
                            .map((p: Article, i: number) => (i + 1) + '. ' + p.headline)
                            .join('\n');
                        // Also update the context cache silently
                        fetchNews(true);
                    }

                    if (sessionRef.current) {
                        if (topHeadlines) {
                            await sessionRef.current.sendClientContent({
                                turns: [{
                                    role: 'user',
                                    parts: [{ text: 'SYSTEM_RESPONSE: The current top news headlines are: \n' + topHeadlines + ' \nPlease read out the most interesting 3-4 ones gracefully to the user in Hindi.' }]
                                }],
                                turnComplete: true,
                            });
                        } else {
                            await sessionRef.current.sendClientContent({
                                turns: [{
                                    role: 'user',
                                    parts: [{ text: 'SYSTEM_RESPONSE: I am unable to connect to the Outplugs news feed right now. Please tell the user gracefully in Hindi.' }]
                                }],
                                turnComplete: true,
                            });
                        }
                    }
                } catch (e) {
                    console.warn('[Bodhi] Failed to fetch news', e);
                    if (sessionRef.current) {
                        await sessionRef.current.sendClientContent({
                            turns: [{ role: 'user', parts: [{ text: 'SYSTEM_RESPONSE: Sorry, the news feed could not be reached right now. Explain this nicely in Hindi.' }] }],
                            turnComplete: true,
                        });
                    }
                }
            }

            if (call.name === 'read_unread_messages' && call.args[0]) {
                const requestedName = call.args[0].toLowerCase();
                try {
                    // 1. Find the contact by name
                    const contact = realContacts.find(c => c.name.toLowerCase().includes(requestedName));
                    if (!contact || !userId) throw new Error('Contact not found');

                    const chatId = getChatId(userId, contact.uid);

                    // 2. Fetch last 5 messages from Firebase for this chat
                    const { getFirebaseFirestore } = await import('@/lib/firebase');
                    const { collection, query, orderBy, getDocs, limitToLast } = await import('firebase/firestore');
                    const db = await getFirebaseFirestore();
                    const msgsRef = collection(db, 'onesutra_chats', chatId, 'messages');
                    const q = query(msgsRef, orderBy('createdAt', 'asc'), limitToLast(5));

                    const snap = await getDocs(q);
                    const unreadMsgs = snap.docs
                        .map(d => d.data())
                        .filter(msg => msg.senderId === contact.uid) // Only messages sent BY the friend
                        .map(msg => msg.text)
                        .join('\n');

                    const responseText = unreadMsgs.trim() !== ''
                        ? 'SYSTEM_RESPONSE: ' + contact.name + ' says: \n' + unreadMsgs + '\n\nAfter reading these messages, ask the user: "क्या आप इसका जवाब देना चाहेंगे?" and if yes, get their reply and call [TOOL: reply_to_message("' + contact.name + '", "their reply text")].'
                        : 'SYSTEM_RESPONSE: No recent text messages found from ' + contact.name + '.';

                    if (sessionRef.current) {
                        await sessionRef.current.sendClientContent({
                            turns: [{ role: 'user', parts: [{ text: responseText }] }],
                            turnComplete: true,
                        });
                    }
                } catch (e) {
                    console.warn('[Bodhi] Failed to fetch unread messages', e);
                    if (sessionRef.current) {
                        await sessionRef.current.sendClientContent({
                            turns: [{ role: 'user', parts: [{ text: 'SYSTEM_RESPONSE: I could not retrieve the messages right now. Please explain this to the user gracefully in Hindi.' }] }],
                            turnComplete: true,
                        });
                    }
                }
            }

            // ── FIX 3: Reply to SutraConnect message ──────────────────────────
            if (call.name === 'reply_to_message' && call.args[0] && call.args[1]) {
                const contactName = call.args[0].toLowerCase();
                const replyText = call.args[1];
                const currentUser = userIdRef.current;
                const currentUserName = userNameRef.current;

                try {
                    if (!currentUser) throw new Error('User not logged in');

                    // Find contact by name
                    const contact = realContacts.find(c => c.name.toLowerCase().includes(contactName));
                    if (!contact) throw new Error(`Contact "${call.args[0]}" not found`);

                    const chatId = getChatId(currentUser, contact.uid);

                    // Write directly to Firebase onesutra_chats
                    const { getFirebaseFirestore } = await import('@/lib/firebase');
                    const { collection, doc, addDoc, setDoc, serverTimestamp, increment } = await import('firebase/firestore');
                    const db = await getFirebaseFirestore();

                    // 1. Save the message to messages subcollection
                    await addDoc(collection(db, 'onesutra_chats', chatId, 'messages'), {
                        text: replyText,
                        senderId: currentUser,
                        senderName: currentUserName,
                        createdAt: serverTimestamp(),
                        summarized: false,
                        sentBy: 'user',
                        sentViaBodhi: true, // mark as Bodhi-assisted for analytics
                    });

                    // 2. Update chat metadata
                    await setDoc(doc(db, 'onesutra_chats', chatId), {
                        lastMessage: {
                            text: replyText,
                            senderId: currentUser,
                            senderName: currentUserName,
                            sentBy: 'user',
                            createdAt: serverTimestamp(),
                        },
                        ['unreadCounts.' + contact.uid]: increment(1),
                        vibe: 'CALM',
                    }, { merge: true });

                    // 3. Non-blocking push notification
                    fetch('/api/send-notification', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            senderId: currentUser,
                            senderName: currentUserName,
                            receiverId: contact.uid,
                            messageText: replyText,
                            chatId,
                        }),
                    }).catch(() => { /* non-critical */ });

                    // 4. Confirm back to Bodhi session
                    if (sessionRef.current) {
                        await sessionRef.current.sendClientContent({
                            turns: [{
                                role: 'user',
                                parts: [{ text: 'SYSTEM_RESPONSE: Your reply "' + replyText + '" has been successfully sent to ' + contact.name + ' on SUTRAConnect. Please confirm to the user in a warm, brief Hindi message.' }]
                            }],
                            turnComplete: true,
                        });
                    }

                    console.log('[Bodhi] ✅ Reply sent to ' + contact.name + ' via SUTRAConnect');
                } catch (e) {
                    console.warn('[Bodhi] Failed to send reply via SUTRAConnect', e);
                    if (sessionRef.current) {
                        await sessionRef.current.sendClientContent({
                            turns: [{
                                role: 'user',
                                parts: [{ text: 'SYSTEM_RESPONSE: I was unable to send the reply right now. Please apologize to the user warmly in Hindi and ask them to send the message manually from SUTRAConnect.' }]
                            }],
                            turnComplete: true,
                        });
                    }
                }
            }
            if (call.name === 'mark_meditation_done') {
                const currentUid = userIdRef.current;
                if (currentUid) {
                    markMeditationDone(currentUid, phaseRef.current).then(async () => {
                        console.log('[Bodhi] ✅ Meditation marked as done via tool');
                        if (sessionRef.current) {
                            await sessionRef.current.sendClientContent({
                                turns: [{
                                    role: 'user',
                                    parts: [{ text: 'SYSTEM_RESPONSE: Meditation (Dhyan) has been successfully recorded as DONE in the database. Please briefly acknowledge this to the user in Hindi and then IMMEDIATELY pivot to a different topic (e.g., how they feel, what they want to do next, or a creative suggestion).' }]
                                }],
                                turnComplete: true,
                            });
                        }
                    }).catch((e) => {
                        console.warn('[Bodhi] Failed to mark meditation as done', e);
                    });
                }
            }
        }
    }, [memories, articles, fetchNews, realContacts, userId]);


    // ── Audio Engine Helpers ──────────────────────────────────────────────────

    // Convert Float32Array to base64-encoded 16-bit PCM
    const float32ToBase64PCM = useCallback((float32: Float32Array): string => {
        const pcm16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
            const s = Math.max(-1, Math.min(1, float32[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        const bytes = new Uint8Array(pcm16.buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }, []);

    // Decode base64 PCM to Float32Array for playback
    const base64PCMToFloat32 = useCallback((base64: string): Float32Array => {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        const pcm16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(pcm16.length);
        for (let i = 0; i < pcm16.length; i++) {
            float32[i] = pcm16[i] / 0x8000;
        }
        return float32;
    }, []);

    // Smooth crossfade at chunk boundaries to eliminate clicks
    const applyCrossfade = useCallback((data: Float32Array): Float32Array => {
        const fadeLen = Math.min(64, Math.floor(data.length / 4));
        const out = new Float32Array(data);
        for (let i = 0; i < fadeLen; i++) {
            const t = i / fadeLen;
            out[i] *= t;
            out[data.length - 1 - i] *= t;
        }
        return out;
    }, []);

    // Play queued audio buffers with smoothing
    const playNextAudio = useCallback(() => {
        if (audioQueueRef.current.length === 0) {
            isPlayingRef.current = false;
            setIsSpeaking(false);
            // FIX: Only go to listening if we are actually still connected — never set 'dismissed' here
            if (isConnectedRef.current) {
                setSakhaState('listening');
                // FIX: Un-block the mic so Bodhi doesn't hang waiting forever after speaking
                canListenRef.current = true;
            }
            return;
        }

        isPlayingRef.current = true;
        setIsSpeaking(true);
        setSakhaState('speaking');

        let audioData = audioQueueRef.current.shift()!;
        while (audioQueueRef.current.length > 0 && audioData.length < OUTPUT_SAMPLE_RATE * 0.1) {
            const next = audioQueueRef.current.shift()!;
            const combined = new Float32Array(audioData.length + next.length);
            combined.set(audioData);
            combined.set(next, audioData.length);
            audioData = combined;
        }

        const ctx = playbackContextRef.current;
        if (!ctx) {
            isPlayingRef.current = false;
            setIsSpeaking(false);
            return;
        }

        const smoothed = applyCrossfade(audioData);
        const buffer = ctx.createBuffer(1, smoothed.length, OUTPUT_SAMPLE_RATE);
        buffer.getChannelData(0).set(smoothed);
        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const gainNode = ctx.createGain();
        gainNode.gain.value = 1.0;
        source.connect(gainNode);
        gainNode.connect(ctx.destination);

        source.onended = () => {
            playNextAudio();
        };
        source.start();
    }, [applyCrossfade]);

    const enqueueAudio = useCallback((audioData: Float32Array) => {
        audioQueueRef.current.push(audioData);
        if (!isPlayingRef.current) {
            playNextAudio();
        }
    }, [playNextAudio]);

    const cleanupAll = useCallback(() => {
        connectionIntentRef.current = false;
        if (callTimeoutRef.current) {
            clearTimeout(callTimeoutRef.current);
            callTimeoutRef.current = null;
        }
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(t => t.stop());
            mediaStreamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => { });
            audioContextRef.current = null;
        }
        if (playbackContextRef.current) {
            playbackContextRef.current.close().catch(() => { });
            playbackContextRef.current = null;
        }
        if (sessionRef.current) {
            try { sessionRef.current.close(); } catch (_) { }
            sessionRef.current = null;
        }
        audioQueueRef.current = [];
        isPlayingRef.current = false;
        isConnectedRef.current = false;
    }, []);

    // ── Activate Sakha (Start Live Session) ────────────────────────────────────
    const activate = useCallback(async () => {
        try {
            cleanupAll();
            connectionIntentRef.current = true;
            setSakhaState('connecting');
            setError(null);
            setMicVolume(0);
            setIsSpeaking(false);
            setHistory([]);
            sessionHistoryRef.current = []; // reset this-session accumulator
            fullTranscriptBufferRef.current = '';

            // Re-eval time of day
            const h = new Date().getHours();
            const currentPhase = getDayPhase(h);
            phaseRef.current = currentPhase;
            setPhase(currentPhase);

            // 1. Get API key from backend
            const tokenRes = await fetch('/api/gemini-live-token', { method: 'POST' });
            if (!tokenRes.ok) throw new Error('Failed to get Gemini API key');
            const { apiKey } = await tokenRes.json();
            if (!apiKey) throw new Error('Gemini API key not configured');

            const ai = new GoogleGenAI({ apiKey });

            // 2. Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: INPUT_SAMPLE_RATE,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });
            mediaStreamRef.current = stream;

            const captureCtx = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
            audioContextRef.current = captureCtx;

            const playbackCtx = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
            playbackContextRef.current = playbackCtx;

            const unreadSenders = Array.from(chatMeta.entries())
                .filter(([_, meta]) => meta.unreadCount > 0)
                .map(([chatId, meta]) => {
                    const contact = realContacts.find(c => userId && getChatId(userId, c.uid) === chatId);
                    return { name: contact?.name || 'Someone', count: meta.unreadCount };
                });

            const unreadContext = unreadSenders.length > 0
                ? '\nSUTRATALK ALERTS: \n' + unreadSenders.map(s => '- ' + s.name + ' has sent ' + s.count + ' new message(s)').join('\n')
                : '\nSUTRATALK ALERTS: No new messages right now.';

            // ── FIX 1: Load conversation history & greeting state from Firebase ─
            let conversationHistory = '';
            let hasGreetedThisPhase = false;
            let timeGapStr = 'This is your first conversation for now.';
            let timeGapMins = 9999; // Default to a large number
            let isMedDone = false;

            if (userId) {
                const { history, lastTimestamp } = await loadConversationHistory(userId);
                conversationHistory = history.replace(/^User:/gm, userName + ': ');
                hasGreetedThisPhase = await checkAndMarkGreetedPhase(userId, currentPhase);
                isMedDone = await checkMeditationDone(userId, currentPhase);

                if (lastTimestamp) {
                    const gapMs = Date.now() - lastTimestamp;
                    timeGapMins = Math.floor(gapMs / (1000 * 60));
                    const hours = Math.floor(timeGapMins / 60);
                    const days = Math.floor(hours / 24);

                    if (days > 0) {
                        timeGapStr = 'It has been ' + days + ' day' + (days > 1 ? 's' : '') + ' since your last conversation with ' + userName + '.';
                    } else if (hours > 0) {
                        timeGapStr = 'It has been ' + hours + ' hour' + (hours > 1 ? 's' : '') + ' since your last conversation with ' + userName + '.';
                    } else {
                        timeGapStr = 'It has been only ' + timeGapMins + ' minute' + (timeGapMins > 1 ? 's' : '') + ' since your last conversation with ' + userName + '. Be very casual and warm.';
                    }
                }
            }

            // ── PRE-LOAD NEWS into system prompt (avoids unreliable audio-mode tool call) ─
            let newsContext = '';
            try {
                const newsRes = await fetch('/api/outplugs-feed');
                if (newsRes.ok) {
                    const newsData = await newsRes.json();
                    const articles: Article[] = newsData.articles ?? [];
                    if (articles.length > 0) {
                        newsContext = articles.slice(0, 6).map((a, i) => {
                            const headline = a.headline || '';
                            const summary = a.summary60Words ? ' — ' + a.summary60Words.slice(0, 80) : '';
                            return (i + 1) + '. ' + headline + summary;
                        }).join('\n');
                    }
                }
            } catch (e) {
                console.warn('[Bodhi] News pre-load failed', e);
            }

            // ── PRE-LOAD UNREAD MESSAGES from Firebase ──────────────────
            let messagesContext = '';
            if (userId && unreadSenders.length > 0) {
                try {
                    const { getFirebaseFirestore } = await import('@/lib/firebase');
                    const { collection, query, where, orderBy, limit, getDocs } = await import('firebase/firestore');
                    const db = await getFirebaseFirestore();
                    const msgLines: string[] = [];
                    for (const sender of unreadSenders.slice(0, 3)) {
                        const contact = realContacts.find(c => c.name === sender.name);
                        if (!contact) continue;
                        const chatId = getChatId(userId, contact.uid);
                        const msgSnap = await getDocs(
                            query(
                                collection(db, 'onesutra_chats', chatId, 'messages'),
                                where('senderId', '==', contact.uid),
                                orderBy('createdAt', 'desc'),
                                limit(sender.count > 5 ? 5 : sender.count)
                            )
                        );
                        const msgs = msgSnap.docs.map(d => d.data()?.text ?? '').filter(Boolean).reverse();
                        if (msgs.length > 0) {
                            msgLines.push('From ' + sender.name + ': \n - ' + msgs.join('\n  - '));
                        }
                    }
                    messagesContext = msgLines.join('\n\n');
                } catch (e) {
                    console.warn('[Bodhi] Messages pre-load failed', e);
                }
            }

            // ── PRE-LOAD HEALTH PROFILE from Firebase ────────────────────────
            let healthProfile = '';
            if (userId) {
                try {
                    const { getFirebaseFirestore } = await import('@/lib/firebase');
                    const { doc, getDoc } = await import('firebase/firestore');
                    const db = await getFirebaseFirestore();
                    const snap = await getDoc(doc(db, 'users', userId));
                    if (snap.exists()) {
                        const d = snap.data();
                        const profileParts: string[] = [];
                        if (d?.age) profileParts.push(`Age: ${d.age}`);
                        if (d?.prakriti || d?.dosha) profileParts.push(`Ayurvedic Type (Prakriti): ${d.prakriti || d.dosha}`);
                        if (d?.diet) profileParts.push(`Diet: ${d.diet}`);
                        if (d?.sleep) profileParts.push(`Sleep Pattern: ${d.sleep}`);
                        if (d?.health_goals) profileParts.push(`Health Goals: ${d.health_goals}`);
                        if (d?.occupation) profileParts.push(`Occupation: ${d.occupation}`);
                        if (d?.interests) profileParts.push(`Interests: ${Array.isArray(d.interests) ? d.interests.join(', ') : d.interests}`);
                        if (d?.onboarding_profile) {
                            // Handle structured onboarding profile object
                            const op = d.onboarding_profile;
                            if (op.age) profileParts.push(`Age: ${op.age}`);
                            if (op.prakriti) profileParts.push(`Prakriti: ${op.prakriti}`);
                            if (op.diet) profileParts.push(`Diet: ${op.diet}`);
                            if (op.healthGoals) profileParts.push(`Health Goals: ${op.healthGoals}`);
                            if (op.occupation) profileParts.push(`Occupation: ${op.occupation}`);
                            if (op.interests) profileParts.push(`Interests: ${Array.isArray(op.interests) ? op.interests.join(', ') : op.interests}`);
                        }
                        healthProfile = profileParts.join(' | ');
                    }
                } catch (e) {
                    console.warn('[Bodhi] Health profile load failed', e);
                }
            }

            // ── MOOD DETECTION from conversation history ──────────────────────
            let detectedMood = 'NEUTRAL';
            if (conversationHistory) {
                const hist = conversationHistory.toLowerCase();
                const lastFewLines = hist.split('\n').slice(-8).join(' ');
                if (/thak|tired|exhausted|bore|bored|kuch nahi|boring|meh/i.test(lastFewLines)) detectedMood = 'BORED/TIRED';
                else if (/stressed|tension|pressure|anxiety|ghabra|pareshan|problem|issue/i.test(lastFewLines)) detectedMood = 'STRESSED';
                else if (/sad|dukh|ro|cry|upset|depressed|bura lag|nahi acha/i.test(lastFewLines)) detectedMood = 'SAD/LOW';
                else if (/excited|khush|happy|great|amazing|awesome|badiya|mast|fantastic/i.test(lastFewLines)) detectedMood = 'EXCITED/HAPPY';
                else if (/confused|samajh nahi|unclear|kya karu|what to do|stuck/i.test(lastFewLines)) detectedMood = 'CONFUSED';
                else if (/focus|concentrate|kaam|work|productive/i.test(lastFewLines)) detectedMood = 'FOCUSED';
                // Also factor in current task load
                if (sankalpaRef.current.filter(s => !s.done).length > 5) detectedMood = detectedMood === 'NEUTRAL' ? 'STRESSED' : detectedMood;
            }
            // First session of the day → positive default
            if (timeGapMins > 480 || conversationHistory === '') detectedMood = detectedMood === 'NEUTRAL' ? 'FRESH_START' : detectedMood;

            console.log('[Bodhi] Connecting to Gemini Live API...');
            const session = await ai.live.connect({
                model: GEMINI_LIVE_MODEL,
                config: {
                    responseModalities: [Modality.AUDIO], // MUST BE AUDIO ONLY
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: 'Aoede', // Gentle, warm companion voice
                            },
                        },
                    },
                    systemInstruction: buildSystemPrompt(phaseRef.current, userName, sankalpaRef.current, memories, unreadContext, conversationHistory, hasGreetedThisPhase, newsContext, messagesContext, timeGapStr, timeGapMins, isMedDone, healthProfile, detectedMood) + '\n\nRANDOM_SEED: ' + Math.floor(Math.random() * 1000),
                },
                callbacks: {
                    onopen: () => {
                        console.log('[Bodhi] Gemini Live session opened');
                        if (connectionIntentRef.current) {
                            isConnectedRef.current = true; // mark session as alive
                            setSakhaState('listening');
                            setIsListening(true);
                            if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
                            callTimeoutRef.current = setTimeout(() => {
                                deactivate();
                            }, 900000);
                        }
                    },
                    onmessage: (message: LiveServerMessage) => {
                        const msg = message as any;
                        const serverContent = msg.serverContent;

                        if (serverContent?.modelTurn?.parts) {
                            canListenRef.current = false; // block mic while processing response
                            for (const part of serverContent.modelTurn.parts) {
                                if (part.inlineData?.data) {
                                    const audioFloat32 = base64PCMToFloat32(part.inlineData.data);
                                    enqueueAudio(audioFloat32);
                                }
                                if (part.text) {
                                    fullTranscriptBufferRef.current += part.text;
                                    setCurrentSentence(prev => prev + part.text);
                                }
                            }
                        }

                        if (serverContent?.turnComplete) {
                            const cleanedResp = fullTranscriptBufferRef.current.replace(/\[TOOL:.*?\]/g, '').trim();

                            const bodhiTurn: SakhaMessage = { role: 'sakha', text: cleanedResp, timestamp: Date.now() };
                            setHistory(prev => [...prev, bodhiTurn]);
                            // Accumulate for end-of-session Firebase save (backup)
                            sessionHistoryRef.current.push(bodhiTurn);

                            // ── FIX: Save history immediately after every turn to ensure it's not lost on refresh ──
                            const currentUid = userIdRef.current;
                            if (currentUid && cleanedResp) {
                                saveConversationHistory(currentUid, [bodhiTurn]).catch(() => {
                                    console.warn('[Bodhi] Failed to persist session history turn');
                                });
                            }

                            // Parse and execute newly arrived tool calls
                            const toolCalls = parseToolCalls(fullTranscriptBufferRef.current);
                            if (toolCalls.length > 0) {
                                executeToolCalls(toolCalls);
                            }

                            fullTranscriptBufferRef.current = '';
                            // FIX: Only un-block mic if audio is NOT still playing (avoid double-unblock)
                            // Audio queue's playNextAudio() will un-block when it drains
                            if (!isPlayingRef.current && audioQueueRef.current.length === 0) {
                                canListenRef.current = true;
                                setSakhaState('listening');
                            }
                            setIsSpeaking(false);
                        }

                        if (serverContent?.interrupted) {
                            audioQueueRef.current = [];
                            setIsSpeaking(false);
                            setSakhaState('listening');
                            canListenRef.current = true;
                        }
                    },
                    onerror: (e: any) => {
                        console.error('[Bodhi] Gemini Live error:', e);
                        setError(e?.message || 'Connection error');
                        setSakhaState('error');
                        isConnectedRef.current = false;
                    },
                    onclose: (e: any) => {
                        console.log('[Bodhi] Gemini Live session closed:', e?.reason || 'unknown');
                        isConnectedRef.current = false;
                        // FIX: Only update state if we were intentionally connected — avoids stale-closure dismiss
                        if (connectionIntentRef.current) {
                            // Session closed unexpectedly while we still wanted it — show error so user can retry
                            setSakhaState('error');
                            setError('Session ended unexpectedly. Tap to reconnect.');
                        } else {
                            setSakhaState('dismissed');
                        }
                    },
                },
            });

            if (!connectionIntentRef.current) {
                session.close();
                return;
            }
            sessionRef.current = session;

            // 4. Send initial greeting trigger
            try {
                const historyNote = conversationHistory
                    ? 'We have spoken before. Use PREVIOUS CONVERSATION CONTEXT for natural continuity.'
                    : 'Fresh start with this user.';
                const greetNote = hasGreetedThisPhase
                    ? `CRITICAL: Do NOT use any formal time - greeting salutation — you already greeted ${userName} during this ${currentPhase} phase today.Open naturally and warmly as a returning friend.`
                    : `CRITICAL: This is the FIRST time you speak to ${userName} in the ${currentPhase} phase today.You MUST open with the exact ${currentPhase} salutation from your GREETING RULES before anything else.`;
                const openingText = `Start.Phase = ${currentPhase}. User has ${sankalpaRef.current.length} tasks today.${historyNote} ${greetNote} `;
                await session.sendClientContent({
                    turns: [{ role: 'user', parts: [{ text: openingText }] }],
                    turnComplete: true,
                });
                console.log(`[Bodhi] Opening trigger sent | phase=${currentPhase} | hasGreetedThisPhase=${hasGreetedThisPhase} `);
            } catch (greetErr) {
                console.warn('[Bodhi] Could not send initial greeting:', greetErr);
            }

            // 5. Mic Processing
            const source = captureCtx.createMediaStreamSource(stream);
            sourceRef.current = source;

            const processor = captureCtx.createScriptProcessor(BUFFER_SIZE, 1, 1);
            processorRef.current = processor;

            let silenceCounter = 0;

            processor.onaudioprocess = (audioEvent) => {
                if (!sessionRef.current) return;

                const inputData = audioEvent.inputBuffer.getChannelData(0);

                // Audio level display
                let sumSq = 0;
                for (let i = 0; i < inputData.length; i++) {
                    sumSq += inputData[i] * inputData[i];
                }
                const rms = Math.sqrt(sumSq / inputData.length);
                if (!isPlayingRef.current) {
                    setMicVolume(Math.min(1, rms * 35));
                }

                // Block sending mic data if speaking or processing
                if (!canListenRef.current || isPlayingRef.current) return;

                let audioData: Float32Array;
                if (captureCtx.sampleRate !== INPUT_SAMPLE_RATE) {
                    const ratio = captureCtx.sampleRate / INPUT_SAMPLE_RATE;
                    const newLength = Math.round(inputData.length / ratio);
                    audioData = new Float32Array(newLength);
                    for (let i = 0; i < newLength; i++) {
                        const srcIndex = Math.min(Math.floor(i * ratio), inputData.length - 1);
                        audioData[i] = inputData[srcIndex];
                    }
                } else {
                    audioData = new Float32Array(inputData);
                }

                const isSpeech = rms > NOISE_GATE_THRESHOLD;
                if (!isSpeech) {
                    silenceCounter++;
                    if (silenceCounter % 4 !== 0) return;
                }
                if (isSpeech) silenceCounter = 0;

                const base64 = float32ToBase64PCM(audioData);
                try {
                    session.sendRealtimeInput({
                        audio: { data: base64, mimeType: 'audio/pcm;rate=16000' },
                    });
                } catch (sendErr) {
                    // ignore
                }
            };

            source.connect(processor);
            processor.connect(captureCtx.destination);

        } catch (err: any) {
            console.error('[Bodhi] Failed to start Sakha call:', err);
            setError(err.message || 'Error connecting to Bodhi Sakha');
            setSakhaState('error');
            cleanupAll();
        }
    }, [cleanupAll, float32ToBase64PCM, base64PCMToFloat32, enqueueAudio, userName, executeToolCalls]);


    // ── Deactivate Sakha ───────────────────────────────────────────────────────
    const deactivate = useCallback(() => {
        // ── FIX 1: Save this session's conversation history to Firebase ────────
        const sessionTurns = sessionHistoryRef.current;
        const currentUid = userIdRef.current;
        if (currentUid && sessionTurns.length > 0) {
            saveConversationHistory(currentUid, sessionTurns).catch(() => {
                console.warn('[Bodhi] Failed to persist session history');
            });
        }
        sessionHistoryRef.current = [];

        cleanupAll();
        setSakhaState('dismissed');
        setIsListening(false);
        setCurrentSentence('');
        setMicVolume(0);
    }, [cleanupAll]);

    // ── Also capture user's spoken input into session history ─────────────────
    // We hook into the history state changes to also track user turns.
    // Since Gemini Live API doesn't give us transcripts of user speech by default,
    // we track only Bodhi's turns for now (which cover the full conversational context).

    return {
        sakhaState,
        phase,
        currentSentence,
        history,
        micVolume,
        isListening,
        activate,
        deactivate,
        error
    };
}
