import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BackgroundColorTransition, PageTransition, ScrollProgress, SmoothScrollProvider } from "@/components/animations";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Officer Charles | AI Visa Interview Coach",
  description:
    "Practice F-1 and B1/B2 visa interviews with an AI officer, realistic follow-up questions, scoring, and clear feedback.",
  openGraph: {
    title: "Officer Charles | AI Visa Interview Coach",
    description:
      "Practice F-1 and B1/B2 visa interviews with realistic AI interview simulations.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SmoothScrollProvider>
          <ScrollProgress />
          <BackgroundColorTransition />
          <PageTransition>{children}</PageTransition>
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
