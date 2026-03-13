'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Mic, MicOff, Send, Volume2, VolumeX } from 'lucide-react';
import styles from './SevakChatbot.module.css';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export default function SevakChatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [isFirstMessage, setIsFirstMessage] = useState(true);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);
    const synthRef = useRef<SpeechSynthesis | null>(null);

    // Initialize speech recognition and synthesis
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Speech Recognition
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = false;
                recognitionRef.current.interimResults = false;
                recognitionRef.current.lang = 'hi-IN'; // Default to Hindi, will auto-detect

                recognitionRef.current.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript;
                    setInput(transcript);
                    setIsListening(false);
                };

                recognitionRef.current.onerror = () => {
                    setIsListening(false);
                };

                recognitionRef.current.onend = () => {
                    setIsListening(false);
                };
            }

            // Speech Synthesis
            synthRef.current = window.speechSynthesis;

            // Listen for custom event to open chatbot
            const handleOpenChat = () => {
                setIsOpen(true);
                // Speak greeting after a short delay
                setTimeout(() => {
                    if (voiceEnabled && messages.length === 0) {
                        speak('Namaste, Seeker. I am Sevak, your humble guide through the sacred sciences of Ayurveda, Bhojan, and Sadhana. How may I serve you today?');
                    }
                }, 500);
            };

            window.addEventListener('openSevakChat', handleOpenChat);

            return () => {
                window.removeEventListener('openSevakChat', handleOpenChat);
            };
        }
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Get page context for DOM awareness
    const getPageContext = (): string => {
        try {
            const title = document.title;
            const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
                .map(h => h.textContent)
                .filter(Boolean)
                .slice(0, 5)
                .join(', ');

            const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';

            return `Page Title: ${title}\nMain Headings: ${headings}\nDescription: ${metaDescription}`;
        } catch {
            return '';
        }
    };

    // Text-to-Speech
    const speak = (text: string) => {
        if (!voiceEnabled || !synthRef.current) return;

        synthRef.current.cancel(); // Stop any ongoing speech

        const utterance = new SpeechSynthesisUtterance(text);

        // Configure voice for warm, human-like quality
        const voices = synthRef.current.getVoices();
        const preferredVoice = voices.find(v =>
            v.lang.startsWith('hi') && v.name.toLowerCase().includes('male')
        ) || voices.find(v => v.lang.startsWith('hi')) || voices[0];

        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.rate = 0.9; // Slightly slower for calmness
        utterance.pitch = 0.8; // Lower pitch for warmth
        utterance.volume = 1.0;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        synthRef.current.speak(utterance);
    };

    // Stop speaking
    const stopSpeaking = () => {
        if (synthRef.current) {
            synthRef.current.cancel();
            setIsSpeaking(false);
        }
    };

    // Toggle voice input
    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert('Voice input is not supported in your browser.');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    // Send message
    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const pageContext = getPageContext();

            const response = await fetch('/api/sevak', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage.content,
                    pageContext,
                    conversationHistory: messages.map(m => ({
                        role: m.role,
                        content: m.content,
                    })),
                    isFirstMessage,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to get response');
            }

            // Handle streaming response
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let assistantMessage = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') break;

                            try {
                                const parsed = JSON.parse(data);
                                assistantMessage += parsed.text;

                                // Update message in real-time
                                setMessages(prev => {
                                    const newMessages = [...prev];
                                    const lastMessage = newMessages[newMessages.length - 1];

                                    if (lastMessage?.role === 'assistant') {
                                        lastMessage.content = assistantMessage;
                                    } else {
                                        newMessages.push({
                                            role: 'assistant',
                                            content: assistantMessage,
                                            timestamp: new Date(),
                                        });
                                    }

                                    return newMessages;
                                });
                            } catch (e) {
                                // Ignore parse errors
                            }
                        }
                    }
                }
            }

            // Speak the response
            if (voiceEnabled && assistantMessage) {
                speak(assistantMessage);
            }

            setIsFirstMessage(false);
        } catch (error) {
            console.error('Sevak error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Forgive me, Seeker. I am experiencing difficulties. Please try again.',
                timestamp: new Date(),
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Enter key: desktop can use Enter-to-send; mobile must tap Send button only.
    // Guard against IME composition events so suggestions/autocorrect don't auto-send.
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.keyCode === 229 || (e.nativeEvent as any).isComposing) return;

        if (e.key === 'Enter' && !e.shiftKey) {
            const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            if (isMobile) {
                // On mobile, never send on Enter; force user to tap Send.
                e.preventDefault();
                return;
            }
            e.preventDefault();
            if (input.trim()) {
                sendMessage();
            }
        }
    };

    return (
        <>
            {/* Floating toggle button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className={styles.toggleButton}
                    aria-label="Open Sevak Chatbot"
                >
                    <MessageCircle size={24} />
                    <span className={styles.toggleLabel}>Sevak</span>
                </button>
            )}

            {/* Chatbot window */}
            {isOpen && (
                <div className={styles.chatWindow}>
                    {/* Header */}
                    <div className={styles.header}>
                        <div className={styles.headerContent}>
                            <div className={styles.avatar}>🕉</div>
                            <div>
                                <h3 className={styles.title}>Sevak</h3>
                                <p className={styles.subtitle}>Your Humble Guide</p>
                            </div>
                        </div>
                        <div className={styles.headerActions}>
                            <button
                                onClick={() => setVoiceEnabled(!voiceEnabled)}
                                className={styles.iconButton}
                                title={voiceEnabled ? 'Disable voice' : 'Enable voice'}
                            >
                                {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className={styles.iconButton}
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className={styles.messages}>
                        {messages.length === 0 && (
                            <div className={styles.welcomeMessage}>
                                <p className={styles.namaste}>🙏 Namaste, Seeker</p>
                                <p className={styles.welcomeText}>
                                    I am Sevak, your humble guide through the sacred sciences of Ayurveda, Bhojan, and Sadhana.
                                    How may I serve you today?
                                </p>
                            </div>
                        )}

                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`${styles.message} ${msg.role === 'user' ? styles.userMessage : styles.assistantMessage}`}
                            >
                                <div className={styles.messageContent}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className={`${styles.message} ${styles.assistantMessage}`}>
                                <div className={styles.messageContent}>
                                    <div className={styles.typing}>
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input area */}
                    <div className={styles.inputArea}>
                        <button
                            onClick={toggleListening}
                            className={`${styles.micButton} ${isListening ? styles.listening : ''}`}
                            disabled={isLoading}
                            title="Voice input"
                        >
                            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                        </button>

                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask Sevak..."
                            className={styles.input}
                            disabled={isLoading}
                        />

                        <button
                            onClick={sendMessage}
                            className={styles.sendButton}
                            disabled={isLoading || !input.trim()}
                            title="Send message"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
