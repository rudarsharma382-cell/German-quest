'use client';

import React, { useRef } from 'react';
import { useGameStore, InventoryItem } from '@/store/useGameStore';
import { X, Sparkles, Package, Utensils, BookOpen, Coffee, Map, Croissant, Apple, Ticket } from 'lucide-react';
import PixelButton from '@/components/ui/PixelButton';
import { useDpadNavigation } from '@/hooks/useDpadNavigation';
import { soundFx } from '@/utils/audio';

export default function Inventory() {
  const { activeOverlay, setOverlay, inventory, useItem, xp, level } = useGameStore();

  const inventoryRef = useRef<HTMLDivElement>(null);
  useDpadNavigation(activeOverlay === 'inventory', inventoryRef);

  if (activeOverlay !== 'inventory') return null;

  const handleClose = () => {
    soundFx.playClick();
    setOverlay('none');
  };

  const handleUseItem = (item: InventoryItem) => {
    soundFx.playCoin();
    useItem(item.id);
  };

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'Croissant':
        return <Croissant className="w-8 h-8 text-amber-500" />;
      case 'Coffee':
        return <Coffee className="w-8 h-8 text-amber-800" />;
      case 'BookOpen':
        return <BookOpen className="w-8 h-8 text-sky-500" />;
      case 'Map':
        return <Map className="w-8 h-8 text-emerald-600" />;
      case 'Apple':
        return <Apple className="w-8 h-8 text-rose-500" />;
      case 'Ticket':
        return <Ticket className="w-8 h-8 text-amber-400" />;
      default:
        return <Package className="w-8 h-8 text-slate-400" />;
    }
  };

  const getArticleColor = (article: string) => {
    switch (article.toLowerCase()) {
      case 'der':
        return 'bg-sky-500 text-white';
      case 'die':
        return 'bg-rose-500 text-white';
      case 'das':
        return 'bg-emerald-500 text-white';
      default:
        return 'bg-slate-700 text-white';
    }
  };

  return (
    <div
      ref={inventoryRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-pixel select-none backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-2xl border-4 border-black bg-slate-900 p-6 shadow-pixel-lg text-white">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b-4 border-black bg-amber-400 text-black px-4 py-2.5 -mx-6 -mt-6 mb-6">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            <span className="text-sm font-bold tracking-wide">Inventar (Rucksack)</span>
          </div>
          <button
            onClick={handleClose}
            className="border-2 border-black bg-rose-500 text-white p-1 hover:bg-rose-600 active:translate-y-0.5"
            title="Schließen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Inventory Subheader Info */}
        <div className="flex items-center justify-between mb-4 text-[11px] text-slate-300 border-2 border-slate-700 bg-slate-950 p-2.5">
          <span>Gesammelte deutsche Gegenstände &amp; Vokabeln</span>
          <span className="text-amber-400">Tipp: Beachte die Artikel! (der / die / das)</span>
        </div>

        {/* Item Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
          {inventory.map((item) => (
            <div
              key={item.id}
              className="border-3 border-black bg-slate-800 p-3 flex gap-3 items-center shadow-pixel hover:border-amber-400 transition-colors"
            >
              {/* Item Icon Box */}
              <div className="shrink-0 w-14 h-14 border-2 border-black bg-slate-950 flex items-center justify-center">
                {renderIcon(item.icon)}
              </div>

              {/* Item Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-1.5 py-0.5 text-[9px] font-bold border border-black ${getArticleColor(item.article)}`}>
                    {item.article.toUpperCase()}
                  </span>
                  <span className="text-xs font-bold text-white truncate">{item.name}</span>
                  <span className="text-[10px] text-slate-400">x{item.quantity}</span>
                </div>

                <div className="text-[10px] text-amber-200">Plural: {item.plural}</div>
                <div className="text-[9px] text-slate-400 italic mb-2">"{item.translation}"</div>

                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-slate-300">{item.description}</span>
                  {(item.id === 'brezel' || item.id === 'apfel') && (
                    <PixelButton
                      variant="amber"
                      size="sm"
                      onClick={() => handleUseItem(item)}
                      className="ml-2 whitespace-nowrap"
                    >
                      Essen
                    </PixelButton>
                  )}
                </div>
              </div>
            </div>
          ))}

          {inventory.length === 0 && (
            <div className="col-span-2 py-8 text-center text-slate-400 text-xs">
              Dein Rucksack ist leer! Besuche die Geschäfte in Deutschstadt.
            </div>
          )}
        </div>

        {/* Bottom Legend */}
        <div className="mt-6 pt-3 border-t-2 border-slate-700 flex flex-wrap items-center justify-between text-[10px] text-slate-400 gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-sky-500 inline-block border border-black"></span> DER (Maskulin)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-rose-500 inline-block border border-black"></span> DIE (Feminin)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-emerald-500 inline-block border border-black"></span> DAS (Neutral)
            </span>
          </div>

          <PixelButton variant="dark" size="sm" onClick={handleClose}>
            [ESC / I] Schließen
          </PixelButton>
        </div>
      </div>
    </div>
  );
}
