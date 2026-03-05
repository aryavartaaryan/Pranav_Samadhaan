import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

/** AutoPilot API — generates a context-aware chat reply using Gemini 2.5 Flash */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');

export async function POST(req: NextRequest) {
    try {
        const { prompt } = await req.json();
        if (!prompt || typeof prompt !== 'string') {
            return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        return NextResponse.json({ text });
    } catch (err) {
        console.error('[AutoPilot API]', err);
        return NextResponse.json({ text: '🙏 Present & ready to connect.' });
    }
}
