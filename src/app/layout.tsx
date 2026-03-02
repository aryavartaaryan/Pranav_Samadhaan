import type { Metadata } from "next";
// import SevakChatbot from "@/components/SevakChatbot";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReZo | Ancient Wisdom for Modern Living",
  description: "ReZo — your conscious digital sanctuary. Personalized Vedic wellness, mindful social connection (JustVibe), and AI-powered guidance for holistic well-being.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ReZo",
  },
};

import { LanguageProvider } from "@/context/LanguageContext";
import ConditionalVahanaBar from "@/components/ConditionalVahanaBar";
import ZoomManager from "@/components/ZoomManager";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <ZoomManager />
        <LanguageProvider>
          <ConditionalVahanaBar />
          <main>
            {children}
          </main>
        </LanguageProvider>
      </body>
    </html>
  );
}

