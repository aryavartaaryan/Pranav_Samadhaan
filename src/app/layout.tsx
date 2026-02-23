import type { Metadata } from "next";
import Footer from "@/components/Footer";
// import SevakChatbot from "@/components/SevakChatbot";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pranav Samadhaan | Ancient Wisdom for Modern Living",
  description: "Experience the convergence of Ancient Vedic Science and Advanced AI. Personalized guidance for healing, rejuvenation, and spiritual awakening.",
};

import { LanguageProvider } from "@/context/LanguageContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          {children}
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
