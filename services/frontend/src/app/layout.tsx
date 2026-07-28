import React from 'react';
import type { Metadata } from 'next';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/ui/Header';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { Logo } from '@/components/ui/Logo';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PIANO LAB | Audio-to-Score Studio Platform',
  description: 'Editorial audio-to-score assessment platform with 60fps canvas waterfall and AI pedagogue.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-[#F6F4F0] text-[#111113] min-h-screen flex flex-col antialiased selection:bg-[#C84B31] selection:text-white">
        <ToastProvider>
          <Header />
          <main className="flex-1 container mx-auto px-6 py-8 max-w-7xl">{children}</main>
          <footer className="w-full py-6 text-center text-xs font-mono text-[#8C887B] border-t border-[#E2DFD7] tracking-wider uppercase flex items-center justify-center gap-2.5">
            <Logo size={18} />
            <span>PIANO LAB STUDIO © 2026 • GO GATEWAY & PYTHON AI SCORING ENGINE</span>
          </footer>
        </ToastProvider>
      </body>
    </html>
  );
}

