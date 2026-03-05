/**
 * AutoPilotService — AI agent logic for oneSUTRA's AutoPilot feature.
 * Sends the last N messages as context to Gemini 2.5 Flash and returns
 * a crafted reply in the user's voice — warm, concise, conscious.
 */

export interface ChatMessage {
    text: string;
    senderName: string;
    isMe: boolean;
    createdAt: number;
}

interface AutoPilotOptions {
    userName: string;
    contactName: string;
    messages: ChatMessage[];
    isOpening?: boolean; // true = generate a warm greeting (no messages yet)
}

export async function generateAutoPilotReply(opts: AutoPilotOptions): Promise<string> {
    const { userName, contactName, messages, isOpening } = opts;

    const context = messages.slice(-10).map(m =>
        `${m.isMe ? userName : contactName}: ${m.text}`
    ).join('\n');

    const prompt = isOpening
        ? `You are ${userName}'s conscious AI assistant. Craft a warm, brief, authentic opening message to ${contactName}. Avoid generic greetings. Make it feel personal and present. Use a light, mindful tone — like a friend who is genuinely happy to connect. Max 2 sentences. No emojis unless very natural.`
        : `You are ${userName}'s AI assistant replying on their behalf to ${contactName}. Be warm, brief, and authentic — matching ${userName}'s likely voice based on this conversation:\n\n${context}\n\nWrite only ${userName}'s next reply. Max 2 sentences. Sound human, not robotic.`;

    try {
        const res = await fetch('/api/autopilot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
        });
        if (!res.ok) throw new Error('AutoPilot API error');
        const data = await res.json();
        return data.text ?? '🙏 Present & ready to connect.';
    } catch {
        // Graceful fallback
        return isOpening
            ? `Namaste ${contactName} 🙏 — stepping in for ${userName}. How are you today?`
            : '🙏 Thank you for your message — will respond mindfully soon.';
    }
}
