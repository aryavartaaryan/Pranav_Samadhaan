import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
ai.live.connect({
  model: 'gemini-2.5-flash-native-audio-preview-12-2025',
  config: { systemInstruction: "Say hello", tools: [{ functionDeclarations: [{ name: "test", description: "test" }] }] },
}).then(s => console.log("Connected")).catch(e => console.error(e));
