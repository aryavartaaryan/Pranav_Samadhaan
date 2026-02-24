import type { Metadata } from "next";
// import SevakChatbot from "@/components/SevakChatbot";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pranav Samadhaan | Ancient Wisdom for Modern Living",
  description: "Experience the convergence of Ancient Vedic Science and Advanced AI. Personalized guidance for healing, rejuvenation, and spiritual awakening.",
};

import { LanguageProvider } from "@/context/LanguageContext";
import ConditionalVahanaBar from "@/components/ConditionalVahanaBar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <ConditionalVahanaBar />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
