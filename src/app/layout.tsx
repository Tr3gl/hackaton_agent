import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Fraunces, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { normalizeLanguage } from "@/lib/i18n";

const displayFont = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const bodyFont = Space_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Shopping Agent",
  description: "Contextual fashion search powered by Gemini.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get("lang")?.value;
  const language = normalizeLanguage(cookieLang);
  return (
    <html
      lang={language}
      className={`${displayFont.variable} ${bodyFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-ink-900">
        {children}
      </body>
    </html>
  );
}
