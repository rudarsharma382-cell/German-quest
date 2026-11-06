'use client';

import React, { useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { Coins, Sparkles, MapPin, Compass, Package, Volume2, VolumeX, Scroll } from 'lucide-react';
import { soundFx } from '@/utils/audio';

export default function HUD() {
  const {
    xp,
    coins,
    level,
    interactionPrompt,
    activeOverlay,
    setOverlay,
    soundEnabled,
    toggleSound,
    quests,
    inventory,
  } = useGameStore();

  const xpCurrent = xp % 100;
  const xpPercent = Math.min(100, Math.max(0, xpCurrent));

  // Find first uncompleted quest
  const activeQuest = quests.find((q) => !q.completed) || quests[quests.length - 1];

  // Hotkey [I] for Inventory
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyI') {
        if (activeOverlay === 'none') {
          soundFx.playClick();
          setOverlay('inventory');
        } else if (activeOverlay === 'inventory') {
          soundFx.playClick();
          setOverlay('none');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeOverlay, setOverlay]);

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex flex-col justify-between p-4 font-pixel select-none">
      {/* Top Bar: Player Stats & Quest Location & Quick Tools */}
      <div className="flex items-start justify-between w-full gap-4">
        {/* Left: Stats Card */}
        <div className="pointer-events-auto flex flex-col gap-2 bg-slate-900 border-4 border-black p-3 shadow-pixel max-w-sm">
          {/* Level & Title */}
          <div className="flex items-center justify-between gap-3 border-b-2 border-slate-700 pb-2">
            <div className="flex items-center gap-2">
              <span className="bg-amber-500 text-black px-2 py-0.5 text-xs font-bold border-2 border-black">
                LVL {level}
              </span>
              <span className="text-xs text-amber-300">
                {level >= 3 ? 'Gelehrter' : level >= 2 ? 'Entdecker' : 'Anfänger'}
              </span>
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

        {/* Right Section: Zone Marker & Buttons & Active Quest */}
        <div className="flex flex-col items-end gap-2">
          {/* Top row buttons */}
          <div className="flex items-center gap-2">
            {/* Inventory Button */}
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setOverlay(activeOverlay === 'inventory' ? 'none' : 'inventory');
              }}
              className="pointer-events-auto bg-slate-900 hover:bg-slate-800 border-4 border-black px-3 py-2 text-xs font-bold shadow-pixel text-amber-400 flex items-center gap-1.5 active:translate-y-0.5"
              title="Inventar öffnen [I]"
            >
              <Package className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">[I] Rucksack</span>
              <span className="bg-amber-500 text-black text-[9px] px-1 font-bold">
                {inventory.reduce((acc, curr) => acc + curr.quantity, 0)}
              </span>
            </button>

            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => {
                toggleSound();
                soundFx.toggleMuted();
              }}
              className="pointer-events-auto bg-slate-900 hover:bg-slate-800 border-4 border-black p-2 shadow-pixel text-slate-300 active:translate-y-0.5"
              title={soundEnabled ? 'Ton ausschalten' : 'Ton einschalten'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-rose-400" />
              )}
            </button>

            {/* Zone Marker */}
            <div className="pointer-events-auto bg-slate-900 border-4 border-black p-2.5 shadow-pixel flex items-center gap-2 text-xs">
              <MapPin className="w-4 h-4 text-red-500 animate-bounce" />
              <div>
                <div className="text-[11px] text-white">Deutschstadt</div>
                <div className="text-[9px] text-slate-400">Marktplatz</div>
              </div>
            </div>
          </div>

          {/* Active Quest Card */}
          {activeQuest && (
            <div className="pointer-events-auto bg-slate-900/95 border-4 border-black p-2.5 shadow-pixel max-w-xs text-left">
              <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-bold border-b border-slate-700 pb-1 mb-1">
                <Scroll className="w-3.5 h-3.5" />
                <span>AUFGABE: {activeQuest.title}</span>
              </div>
              <div className="text-[9px] text-slate-300 leading-tight">
                {activeQuest.description}
              </div>
              {activeQuest.completed ? (
                <div className="mt-1 text-[9px] text-emerald-400 font-bold">Abgeschlossen! ✓</div>
              ) : (
                <div className="mt-1 text-[8px] text-amber-500">
                  Belohnung: +{activeQuest.xpReward} XP, +{activeQuest.coinReward} G
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Center Floating Prompt (When in Proximity of Lukas or Buildings) */}
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
        <div className="bg-slate-900/90 border-4 border-black text-[10px] text-slate-300 px-3 py-1.5 shadow-pixel flex items-center gap-3">
          <div>
            <span className="text-amber-400 font-bold">[WASD / ⬆️⬇️⬅️➡️]</span> Bewegen &bull;{' '}
            <span className="text-amber-400 font-bold">[SPACE]</span> Interagieren &bull;{' '}
            <span className="text-amber-400 font-bold">[I]</span> Rucksack
          </div>
        </div>
      </div>
    </div>
  );
}
