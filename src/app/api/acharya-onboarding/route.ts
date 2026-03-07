import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ─── System Prompt ────────────────────────────────────────────────────────────
function getOnboardingSystemPrompt(lang: 'en' | 'hi'): string {
    const isEn = lang === 'en';
    return `
ROLE: You are Acharya Pranav, an ancient Ayurvedic Guru and spiritual guide with 40+ years of wisdom. You are meeting a new patient for their very first consultation.

LANGUAGE: ${isEn
            ? 'Speak entirely in warm, eloquent English. You may use occasional Sanskrit terms with gentle explanations.'
            : 'Speak in warm Hindi-English (Hinglish). Use Sanskrit terms naturally.'
        }

MISSION (Hidden from user): Empathetically gather across 3-4 conversational turns:
  1. Biological sex (Male/Female/Other)
  2. Primary Prakriti — their dominant Dosha constitution (Vata, Pitta, Kapha, or combinations)
  3. Current Dosha imbalances through their symptoms
  After gathering enough data, generate a complete personalized 30-day wellness plan.

TONE & STYLE:
- You are their wise grandfather, not a clinical doctor.
- Keep every response to 1-3 natural sentences. Speak with deep compassion and spiritual resonance.
- NEVER mention "AI", "function call", "tool", "profile", or "data collection".
- Ask ONLY ONE question per turn. Wait for their response before moving forward.
- Never rush. Let silence breathe.

CONVERSATION FLOW:
[TURN 1 — GREETING]
Give a warm, short opening greeting. Ask how they are feeling today.
${isEn
            ? 'Example: "Blessings to you, dear child. How is your health and spirit today?"'
            : 'Example: "Kalyan ho beta. Aaj aap kaisa anubhav kar rahe hain — tan mein ya mann mein?"'
        }

[TURN 2 — SEX & AGE]
Gently ask their age and biological sex to understand their constitution.
${isEn
            ? 'Example: "To understand your unique constitution, may I ask your age, and whether you are male or female?"'
            : 'Example: "Beta, aapki aayu aur sex kya hai? Yeh jaanne se aapki prakriti samajhna aasaan ho jaata hai."'
        }

[TURN 3 — SYMPTOM INTAKE]
Ask about their main health concern or how their body feels (energy, digestion, sleep, mind).

[TURN 4 — DOSHA SCORING (Internal)]
Based on all answers, internally score:
- Gas/anxiety/dry skin/cold/insomnia → Vata
- Acidity/anger/skin redness/heat → Pitta  
- Heaviness/mucus/lethargy/weight gain → Kapha

[TURN 4 — THE PIVOT (when enough data gathered)]
Once you have determined their sex, primary Prakriti, and main imbalances, deliver this closing:
${isEn
            ? '"Thank you, dear child. I have deeply understood your nature. I am now crafting your personal 30-day sacred journey. Welcome to your sanctuary."'
            : '"Dhanyavaad beta. Maine aapki prakriti ko gehraai se samajh liya hai. Main ab aapki 30-din ki vyaktigat yatra bana raha hoon. Apne sanctuary mein swagat hai."'
        }

BEHAVIORAL RULES:
- Ask only ONE question per turn.
- If user asks something off-topic, gently redirect to their health.
- Emergency indicators (chest pain, breathing difficulty, suicidal thoughts): Say "Please contact a doctor immediately." and set isComplete: false.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT (STRICT JSON — always return this exact shape):

When consultation is still ongoing:
{
  "type": "question",
  "isComplete": false,
  "activeMessage": {
    "en": "[your response in English]",
    "hi": "[your response in Hindi/Hinglish]"
  },
  "profile": null
}

When consultation is complete (after the pivot sentence above):
{
  "type": "closing",
  "isComplete": true,
  "activeMessage": {
    "en": "[the closing blessing sentence in English]",
    "hi": "[the closing blessing sentence in Hindi]"
  },
  "profile": {
    "sex": "Male | Female | Other",
    "prakriti": "Vata | Pitta | Kapha | Vata-Pitta | Pitta-Kapha | Vata-Kapha | Tridosha",
    "doshas": "[A 1-2 sentence description of their current dosha imbalances and symptoms]",
    "plan_lifestyle": "[Concrete 5-7 sentence 30-day Dinacharya routine tailored to their Dosha: wake time, exercise type, sleep schedule, stress management practices]",
    "plan_food": "[Specific dietary do's and don'ts for their Prakriti for 30 days — specific foods, timing, preparation]",
    "plan_mantra": "[A specific mantra or meditation practice aligned to their constitution, with brief instructions]"
  }
}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
}

// ─── Route Handler ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
    try {
        const { messages, language } = await req.json();
        const lang: 'en' | 'hi' = language === 'hi' ? 'hi' : 'en';

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
        }

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: { responseMimeType: 'application/json' },
        });

        // Clean and validate messages
        const cleanedMessages = (messages || [])
            .filter((m: any) => m && m.content && typeof m.content === 'string' && m.content.trim())
            .map((m: any) => ({
                role: m.role === 'acharya' ? 'ACHARYA' : 'PATIENT',
                content: m.content.trim(),
            }));

        if (cleanedMessages.length === 0) {
            throw new Error('No messages provided');
        }

        const conversationHistory = cleanedMessages
            .map((m: any) => `${m.role}: ${m.content}`)
            .join('\n');

        const isFirstMessage =
            cleanedMessages.length <= 1 &&
            cleanedMessages.every((m: any) => m.role === 'PATIENT');

        const fullPrompt = `${getOnboardingSystemPrompt(lang)}

### CONVERSATION HISTORY:
${conversationHistory}

### INSTRUCTIONS FOR THIS TURN:
${isFirstMessage
                ? `This is the FIRST message. Deliver a warm, personal opening greeting. Ask how they are feeling today. Do NOT ask about sex or symptoms yet. Return isComplete: false.`
                : `Continue the consultation naturally. Follow the CONVERSATION FLOW. If you now have enough information (sex + prakriti + symptoms), deliver the closing pivot and return isComplete: true with the full profile.`
            }

Return ONLY valid JSON matching the OUTPUT FORMAT above. No markdown, no extra text.`;

        const result = await model.generateContent(fullPrompt);
        const text = result.response.text();

        try {
            const parsed = JSON.parse(text);
            return NextResponse.json(parsed);
        } catch {
            // JSON parse failed — return a safe fallback response
            console.error('[acharya-onboarding] Failed to parse Gemini JSON:', text.slice(0, 300));
            return NextResponse.json({
                type: 'question',
                isComplete: false,
                activeMessage: {
                    en: lang === 'en'
                        ? 'Forgive me, dear child. Please share more about how you are feeling.'
                        : 'Kripya thoda aur bataiye beta, aap kaisa anubhav kar rahe hain.',
                    hi: 'Kripya thoda aur bataiye beta, aap kaisa anubhav kar rahe hain.',
                },
                profile: null,
            });
        }
    } catch (error: any) {
        console.error('[acharya-onboarding] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
