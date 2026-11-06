'use client';

import dynamic from 'next/dynamic';
import HUD from '@/components/ui/HUD';
import DialogueBox from '@/components/ui/DialogueBox';
import WortBlitz from '@/components/minigames/WortBlitz';
import FahrkartenSchalter from '@/components/minigames/FahrkartenSchalter';
import Satzbauer from '@/components/minigames/Satzbauer';
import BuergerQuiz from '@/components/minigames/BuergerQuiz';
import KaffeeMatch from '@/components/minigames/KaffeeMatch';
import Inventory from '@/components/ui/Inventory';
import TouchControls from '@/components/game/TouchControls';
import SprachschuleInterior from '@/components/game/SprachschuleInterior';
import MuseumInteriorModal from '@/components/ui/MuseumInteriorModal';

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

      {/* 2b. Optional touch joystick + action buttons (auto-on for touch devices) */}
      <TouchControls />

      {/* 3. React Dialogue Box Layer */}
      <DialogueBox />

      {/* 4. React Minigame Overlay Layer */}
      <WortBlitz />

      {/* 4b. Bahnhof Ticket-Counter Overlay */}
      <FahrkartenSchalter />

      {/* 4c. Institution Minigames */}
      <Satzbauer />
      <BuergerQuiz />
      <KaffeeMatch />

      {/* 4d. Sprachschule & Museum Interiors */}
      <SprachschuleInterior />
      <MuseumInteriorModal />

      {/* 5. React Inventory Overlay Layer */}
      <Inventory />
    </main>
  );
}
