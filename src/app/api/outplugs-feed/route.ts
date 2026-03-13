import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NEWS_FEED } from '@/data/outplugs-news';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// 1 hour cache — reduces API calls; gemini-2.0-flash-lite has 1500 req/day free
export const revalidate = 3600;

// ── Unsplash images keyed by category ───────────────────────────────────────
const CATEGORY_IMAGES: Record<string, string> = {
    Science: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=800&q=80',
    Politics: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&q=80',
    Environment: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
    Education: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80',
    Technology: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
    Spirituality: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
    Governance: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&q=80',
    Health: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&q=80',
    Economy: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80',
    Sports: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80',
    Culture: 'https://images.unsplash.com/photo-1514222709107-a180c68d72b4?w=800&q=80',
    World: 'https://images.unsplash.com/photo-1446941611757-91d2c3bd3d45?w=800&q=80',
};

function categoryImage(cat: string) {
    return CATEGORY_IMAGES[cat] ?? CATEGORY_IMAGES.World;
}

function timeAgo(ms: number) {
    const diff = Date.now() - ms;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

async function generateLiveNews(): Promise<unknown[]> {
    // gemini-2.0-flash-lite: 1500 req/day free vs 20 req/day for 2.5-flash
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

    const now = new Date();
    const timeStr = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });

    const prompt = `You are a senior news editor for India's top news aggregator app. Generate EXACTLY 8 fresh, realistic, factual-sounding news items for ${timeStr} IST covering India and the world.

Return ONLY a valid JSON array, no markdown, no explanation. Each item must follow this exact structure:
{
  "id": "live_001",
  "headline": "Concise but powerful headline under 12 words",
  "summary60Words": "Exactly 55-65 words of crisp, journalistic prose. Include specific numbers, names, and facts. Write like Inshorts.",
  "category": one of: Science, Politics, Environment, Education, Technology, Spirituality, Governance, Health, Economy, Sports, Culture, World,
  "source": "Realistic source name like The Hindu, NDTV, Reuters, etc.",
  "link": "A valid Google News search URL for the headline, e.g., https://news.google.com/search?q=your+encoded+headline",
  "sutraLayer": {
    "simpleWords": "2-3 sentences explaining to a 12-year-old. No jargon.",
    "historicalContext": "2-3 sentences of relevant historical background.",
    "impact": "2-3 sentences on how this directly affects the reader's daily life."
  },
  "action": null or {"type": "petition" or "share", "label": "Short CTA label", "link": "https://example.com/act"}
}

Make headlines feel fresh for TODAY, ${now.toLocaleDateString('en-IN')}. Cover a diverse mix of topics.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Strip markdown code fences if present
    const cleaned = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(cleaned);

    const genTime = Date.now();
    return parsed.map((item: Record<string, unknown>, i: number) => ({
        ...item,
        id: `live_${genTime}_${i}`,
        imageUrl: categoryImage(item.category as string),
        audioUrl: undefined,
        generatedAt: genTime,
        timeAgo: timeAgo(genTime - i * 120000), // stagger timestamps
    }));
}

export async function GET() {
    try {
        // Generate fresh news
        // Next.js will cache this automatically for 10 minutes (revalidate = 600)
        const articles = await generateLiveNews();

        return NextResponse.json({ articles, source: 'live' });
    } catch (err) {
        // Silently catch rate limits and use fallback to prevent terminal spam
        console.info('[outPLUGS feed info] Using offline fallback feed (API limit reached or offline)');

        // Graceful fallback to mock data
        const fallback = NEWS_FEED.map((item, i) => ({
            ...item,
            imageUrl: categoryImage(item.category),
            link: `https://example.com/news/${item.id}`,
            generatedAt: Date.now() - i * 300000,
            timeAgo: timeAgo(Date.now() - i * 300000),
        }));
        return NextResponse.json({ articles: fallback, source: 'fallback' });
    }
}
