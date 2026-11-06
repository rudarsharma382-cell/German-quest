'use client';

import React from 'react';
import { ArrowRight, X } from 'lucide-react';
import PixelButton from '@/components/ui/PixelButton';

interface MinigameFrameProps {
  title: string;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}

export function MinigameFrame({ title, icon, onClose, children }: MinigameFrameProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 font-pixel select-none backdrop-blur-sm">
      <div className="relative max-h-[94vh] w-full max-w-2xl overflow-y-auto border-4 border-black bg-slate-900 text-white shadow-pixel-lg">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-4 border-black bg-amber-400 px-4 py-2.5 text-black">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-xs font-bold tracking-wide md:text-sm">{title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border-2 border-black bg-rose-500 p-1 text-white hover:bg-rose-600 active:translate-y-0.5"
            title="Schließen [ESC]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 md:p-5">{children}</div>
      </div>
    </div>
  );
}

interface MinigameIntroProps {
  portrait: string;
  speaker: string;
  role: string;
  text: string;
  english: string;
  meta: string;
  startLabel: string;
  onStart: () => void;
}

export function MinigameIntro({
  portrait,
  speaker,
  role,
  text,
  english,
  meta,
  startLabel,
  onStart,
}: MinigameIntroProps) {
  return (
    <div className="border-4 border-black bg-slate-800 p-4 shadow-pixel">
      <div className="flex items-start gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden border-4 border-black bg-slate-950">
          <img src={portrait} alt={speaker} className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 text-[9px] font-bold text-amber-400">
            {speaker} · {role}
          </div>
          <p className="text-[10px] leading-relaxed text-slate-200">{text}</p>
          <p className="mt-2 text-[8px] italic text-slate-400">{english}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center gap-3">
        <PixelButton variant="amber" size="lg" onClick={onStart}>
          <span className="flex items-center gap-2">
            {startLabel}
            <ArrowRight className="h-4 w-4" />
          </span>
        </PixelButton>
        <div className="text-center text-[8px] text-slate-400">{meta}</div>
      </div>
    </div>
  );
}
