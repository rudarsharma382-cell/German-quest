'use client';

import dynamic from 'next/dynamic';
import HUD from '@/components/ui/HUD';
import DialogueBox from '@/components/ui/DialogueBox';
import WortBlitz from '@/components/minigames/WortBlitz';

// Dynamically load Game component with SSR disabled to guarantee Phaser only mounts on client
const Game = dynamic(() => import('@/components/game/Game'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-950 font-pixel text-amber-400">
      <div className="border-4 border-black bg-slate-900 p-6 shadow-pixel text-center space-y-3">
        <p className="animate-pulse text-sm">Lade Deutschstadt...</p>
        <p className="text-[10px] text-slate-400">Initializing Phaser World</p>
      </div>
    </div>
  ),
});

export default function Home() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-slate-950">
      {/* 1. Phaser 3 Canvas Layer */}
      <Game />

      {/* 2. React HUD Layer */}
      <HUD />

      {/* 3. React Dialogue Box Layer */}
      <DialogueBox />

      {/* 4. React Minigame Overlay Layer */}
      <WortBlitz />
    </main>
  );
}
