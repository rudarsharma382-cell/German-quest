'use client';

import React from 'react';
import { useGameStore } from '@/store/useGameStore';
import { Coins, Sparkles, MapPin, Compass } from 'lucide-react';

export default function HUD() {
  const { xp, coins, level, interactionPrompt } = useGameStore();

  const xpCurrent = xp % 100;
  const xpPercent = Math.min(100, Math.max(0, xpCurrent));

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex flex-col justify-between p-4 font-pixel select-none">
      {/* Top Bar: Player Stats & Quest Location */}
      <div className="flex items-start justify-between w-full">
        {/* Left: Stats Card */}
        <div className="pointer-events-auto flex flex-col gap-2 bg-slate-900 border-4 border-black p-3 shadow-pixel max-w-sm">
          {/* Level & Title */}
          <div className="flex items-center justify-between gap-3 border-b-2 border-slate-700 pb-2">
            <div className="flex items-center gap-2">
              <span className="bg-amber-500 text-black px-2 py-0.5 text-xs font-bold border-2 border-black">
                LVL {level}
              </span>
              <span className="text-xs text-amber-300">Anfänger</span>
            </div>
            {/* Coins */}
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
              <Coins className="w-4 h-4 text-yellow-400 inline" />
              <span>{coins}</span>
              <span className="text-[10px] text-yellow-600">G</span>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-300">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-sky-400" /> XP
              </span>
              <span>{xpCurrent} / 100</span>
            </div>
            <div className="w-full h-3 bg-slate-950 border-2 border-black p-0.5">
              <div
                className="h-full bg-emerald-500 border-r-2 border-emerald-300 transition-all duration-300"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: Deutschstadt Zone Marker */}
        <div className="pointer-events-auto bg-slate-900 border-4 border-black p-2.5 shadow-pixel flex items-center gap-2 text-xs">
          <MapPin className="w-4 h-4 text-red-500 animate-bounce" />
          <div>
            <div className="text-[11px] text-white">Deutschstadt</div>
            <div className="text-[9px] text-slate-400">Marktplatz</div>
          </div>
        </div>
      </div>

      {/* Center Floating Prompt (When in Proximity of Lukas) */}
      {interactionPrompt && (
        <div className="self-center mb-6 animate-pulse">
          <div className="pointer-events-auto bg-amber-400 text-black border-4 border-black px-4 py-2 text-xs font-bold shadow-pixel tracking-wide flex items-center gap-2">
            <Compass className="w-4 h-4 animate-spin text-black" />
            <span>{interactionPrompt}</span>
          </div>
        </div>
      )}

      {/* Bottom Corner Control Hint */}
      <div className="flex justify-between items-end">
        <div className="bg-slate-900/90 border-4 border-black text-[10px] text-slate-300 px-3 py-1.5 shadow-pixel">
          <span className="text-amber-400 font-bold">[WASD / ⬆️⬇️⬅️➡️]</span> Bewegen &bull;{' '}
          <span className="text-amber-400 font-bold">[SPACE]</span> Interagieren
        </div>
      </div>
    </div>
  );
}

