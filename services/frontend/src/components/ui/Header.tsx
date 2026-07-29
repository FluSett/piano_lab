'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/components/ui/ToastProvider';

import { Logo } from '@/components/ui/Logo';
import { MvpBadge } from '@/components/ui/MvpBadge';

export const Header: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();

  const handleWorkspaceNavigation = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      const isSubmitted = sessionStorage.getItem('piano_lab_analysis_submitted') === 'true';
      const hasAudioName = Boolean(sessionStorage.getItem('piano_lab_audio_name'));

      if (!isSubmitted) {
        if (hasAudioName) {
          showToast({
            title: 'START ANALYSIS REQUIRED',
            message: 'You have selected a file. Please click "START STUDIO ANALYSIS" to run audio analysis before entering the Studio Workspace.',
            type: 'warning',
          });
        } else {
          showToast({
            title: 'AUDIO FILE REQUIRED',
            message: 'Please upload an audio performance clip or activate Live Mic and click "START STUDIO ANALYSIS" before entering the Studio Workspace.',
            type: 'warning',
          });
        }
        return;
      }
    }
    router.push('/workspace');
  };

  return (
    <header className="w-full bg-[#F6F4F0]/90 backdrop-blur-md sticky top-0 z-50 px-4 sm:px-8 py-4 sm:py-5 flex flex-wrap items-center justify-between gap-4 border-b border-[#E2DFD7]">
      <Link href="/" className="flex items-center gap-3 group shrink-0">
        <Logo size={34} />
        <div className="flex items-center gap-2">
          <span className="text-lg font-extrabold tracking-wider uppercase text-[#111113]">
            PIANO LAB
          </span>
          <span className="text-[10px] font-mono tracking-widest text-[#C84B31] font-bold uppercase">
            STUDIO
          </span>
          <MvpBadge size="sm" className="ml-1" />
        </div>
      </Link>

      <nav className="flex items-center gap-4 sm:gap-8 text-xs font-mono font-bold tracking-widest uppercase flex-wrap">
        <Link
          href="/"
          className={`py-1 transition-colors ${
            pathname === '/'
              ? 'text-[#111113] border-b-2 border-[#C84B31] font-extrabold'
              : 'text-[#6B6B70] hover:text-[#111113] border-b-2 border-transparent hover:border-[#111113]'
          }`}
        >
          PRESETS
        </Link>
        <Link
          href="/live"
          className={`py-1 transition-colors ${
            pathname === '/live'
              ? 'text-[#111113] border-b-2 border-[#C84B31] font-extrabold'
              : 'text-[#6B6B70] hover:text-[#111113] border-b-2 border-transparent hover:border-[#111113]'
          }`}
        >
          LIVE
        </Link>
        <Link
          href="/workspace"
          onClick={handleWorkspaceNavigation}
          className={`py-1 transition-colors ${
            pathname === '/workspace'
              ? 'text-[#111113] border-b-2 border-[#C84B31] font-extrabold'
              : 'text-[#6B6B70] hover:text-[#111113] border-b-2 border-transparent hover:border-[#111113]'
          }`}
        >
          WORKSPACE
        </Link>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFECE6] border border-[#E2DFD7] text-[#111113] text-[11px]">
          <span className="w-2 h-2 rounded-full bg-[#C84B31] animate-crimson-pulse" />
          <span className="font-semibold tracking-wider">GATEWAY ACTIVE</span>
        </div>
      </nav>
    </header>
  );
};

