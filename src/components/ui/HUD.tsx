'use client';

import React, { useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import {
  Coins,
  Sparkles,
  MapPin,
  Compass,
  Package,
  Volume2,
  VolumeX,
  Scroll,
  Gamepad2,
} from 'lucide-react';
import { soundFx } from '@/utils/audio';

// Artwork shown beside the zone marker so the HUD reflects the building you are standing at.
const ZONE_ART: Record<string, string> = {
  Sprachschule: '/assets/buildings/sprachschule_topdown.png',
  Geschichtsmuseum: '/assets/buildings/museum.png',
  Bahnhof: '/assets/buildings/bahnhof.png',
  'Café Gemütlichkeit': '/assets/buildings/cafe.png',
  Bäckerei: '/assets/buildings/baeckerei.png',
  Bibliothek: '/assets/buildings/bibliothek.png',
  Rathaus: '/assets/buildings/rathaus.png',
};

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
    currentZone,
    virtualControlsEnabled,
    setVirtualControlsEnabled,
  } = useGameStore();

  const xpCurrent = xp % 100;
  const xpPercent = Math.min(100, Math.max(0, xpCurrent));
  const zoneArt = ZONE_ART[currentZone];

  // Find first uncompleted quest
  const activeQuest = quests.find((q) => !q.completed) || quests[quests.length - 1];

  // Hotkeys: [I] inventory, [G] toggle the on-screen gamepad
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
      } else if (e.code === 'KeyG') {
        soundFx.playClick();
        setVirtualControlsEnabled(!virtualControlsEnabled);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeOverlay, setOverlay, virtualControlsEnabled, setVirtualControlsEnabled]);

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

            {/* Virtual Gamepad Toggle */}
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setVirtualControlsEnabled(!virtualControlsEnabled);
              }}
              className="pointer-events-auto bg-slate-900 hover:bg-slate-800 border-4 border-black p-2 shadow-pixel text-slate-300 active:translate-y-0.5"
              title={
                virtualControlsEnabled
                  ? 'Touch-Steuerung ausblenden [G]'
                  : 'Touch-Steuerung einblenden [G]'
              }
              aria-pressed={virtualControlsEnabled}
            >
              <Gamepad2
                className={`w-4 h-4 ${virtualControlsEnabled ? 'text-emerald-400' : 'text-slate-400'}`}
              />
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
              {zoneArt ? (
                <img
                  src={zoneArt}
                  alt=""
                  className="h-9 w-9 shrink-0 border-2 border-black bg-slate-950 object-contain [image-rendering:pixelated]"
                />
              ) : (
                <MapPin className="w-4 h-4 text-red-500 animate-bounce" />
              )}
              <div>
                <div className="text-[11px] text-white">Deutschstadt</div>
                <div className="text-[9px] text-slate-400">{currentZone}</div>
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

      {/* Bottom Center Control Hint (comfortably centered between joystick and action buttons) */}
      <div className="flex justify-center items-end w-full pb-1 pointer-events-none">
        <div className="pointer-events-auto bg-slate-900/90 border-4 border-black text-[9px] sm:text-[10px] text-slate-300 px-3 py-1.5 shadow-pixel flex items-center gap-2 max-w-[85vw] text-center">
          <div>
            <span className="text-amber-400 font-bold">[WASD / 🕹️]</span> Bewegen &bull;{' '}
            <span className="text-amber-400 font-bold">[SPACE / A]</span> Aktion &bull;{' '}
            <span className="text-amber-400 font-bold">[I]</span> Rucksack &bull;{' '}
            <span className="text-amber-400 font-bold">[G]</span> Touchpad
          </div>
        </div>
      </div>
    </div>
  );
}
