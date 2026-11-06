'use client';

import React, { useEffect, useState } from 'react';
import { useGameStore, DialoguePayload, UIOverlayType } from '@/store/useGameStore';
import { MessageSquare, ArrowRight, CornerDownLeft } from 'lucide-react';
import { soundFx } from '@/utils/audio';
import dialogueTree from '@/data/dialogue.json';

export default function DialogueBox() {
  const { activeOverlay, currentDialogue, openDialogue, closeDialogue, setOverlay, soundEnabled } = useGameStore();

  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  const fullText = currentDialogue?.text || '';
  const options = currentDialogue?.options || [];

  // Sync sound settings
  useEffect(() => {
    soundFx.setMuted(!soundEnabled);
  }, [soundEnabled]);

  // Typewriter effect with 8-bit blip
  useEffect(() => {
    if (activeOverlay !== 'dialogue' || !fullText) {
      setDisplayedText('');
      setIsTyping(false);
      setShowTranslation(false);
      return;
    }

    let currentIndex = 0;
    setDisplayedText('');
    setIsTyping(true);
    setShowTranslation(false);

    const interval = setInterval(() => {
      currentIndex++;
      if (currentIndex <= fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex));
        // Play blip on non-whitespace characters
        if (fullText[currentIndex - 1] !== ' ') {
          soundFx.playDialogueBlip(540);
        }
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 24);

    return () => clearInterval(interval);
  }, [activeOverlay, fullText]);

  // Advance or skip typewriter
  const handleAdvance = () => {
    if (isTyping) {
      setDisplayedText(fullText);
      setIsTyping(false);
    } else if (options.length === 0) {
      soundFx.playClick();
      closeDialogue();
    }
  };

  const handleSelectOption = (
    nextId?: string,
    action?: () => void,
    nextOverlay?: UIOverlayType
  ) => {
    soundFx.playClick();
    if (action) {
      action();
    }
    // An option can hand control to a React overlay (e.g. the Bahnhof minigame).
    if (nextOverlay && nextOverlay !== 'none') {
      setOverlay(nextOverlay);
      return;
    }
    if (nextId && (dialogueTree as Record<string, DialoguePayload>)[nextId]) {
      const nextNode = (dialogueTree as Record<string, DialoguePayload>)[nextId];
      openDialogue(nextNode);
    } else {
      closeDialogue();
    }
  };

  useEffect(() => {
    if (activeOverlay !== 'dialogue') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        if (isTyping || options.length === 0) {
          e.preventDefault();
          handleAdvance();
        }
      } else if (!isTyping && options.length > 0) {
        // Number key shortcuts 1, 2, 3...
        const num = parseInt(e.key, 10);
        if (!isNaN(num) && num >= 1 && num <= options.length) {
          e.preventDefault();
          const opt = options[num - 1];
          handleSelectOption(opt.nextDialogueId, opt.action, opt.nextOverlay);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeOverlay, isTyping, fullText, options]);

  if (activeOverlay !== 'dialogue' || !currentDialogue) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 font-pixel select-none animate-in fade-in duration-200">
      <div
        onClick={handleAdvance}
        className="relative w-full max-w-3xl cursor-pointer bg-white text-slate-900 border-4 border-black p-4 md:p-5 shadow-pixel-lg"
      >
        {/* Speaker Name Tag (Top Left) */}
        <div className="absolute -top-6 left-3 bg-amber-400 text-black border-4 border-black px-3 py-1 text-xs font-bold shadow-pixel">
          <span className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 inline" />
            {currentDialogue.speaker}
          </span>
        </div>

        {/* Translation Toggle Button (Top Right) */}
        {currentDialogue.translation && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              soundFx.playClick();
              setShowTranslation(!showTranslation);
            }}
            className="absolute -top-6 right-3 bg-slate-900 text-amber-300 border-4 border-black px-3 py-1 text-[10px] font-bold shadow-pixel hover:bg-slate-800 active:translate-y-0.5"
          >
            {showTranslation ? 'Hide EN' : 'Translate EN'}
          </button>
        )}

        {/* Content Layout: Character Avatar + Dialogue Text */}
        <div className="flex gap-4 items-start">
          {/* Lukas Portrait Avatar Frame */}
          {currentDialogue.avatar && (
            <div className="shrink-0 w-20 h-20 md:w-24 md:h-24 border-4 border-black bg-amber-100 shadow-pixel overflow-hidden">
              <img
                src={currentDialogue.avatar}
                alt={currentDialogue.speaker}
                className="w-full h-full object-cover object-top hover:scale-105 transition-transform"
              />
            </div>
          )}

          {/* Text and Choices */}
          <div className="flex-1 min-w-0">
            {/* Dialogue Text */}
            <div className="min-h-[56px] text-xs leading-relaxed tracking-wide text-slate-900 font-medium">
              <p>{displayedText}</p>

              {/* English Translation Subtext */}
              {showTranslation && currentDialogue.translation && (
                <div className="mt-2.5 pt-2 border-t-2 border-dashed border-slate-300 text-slate-500 text-[11px] italic">
                  {currentDialogue.translation}
                </div>
              )}
            </div>

            {/* Branching Response Choices */}
            {!isTyping && options.length > 0 && (
              <div className="mt-4 space-y-2 border-t-2 border-slate-200 pt-3">
                <div className="text-[10px] text-amber-700 font-bold mb-1">Deine Antwort (Choose reply):</div>
                {options.map((opt, idx) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectOption(opt.nextDialogueId, opt.action, opt.nextOverlay);
                    }}
                    className="w-full text-left bg-slate-100 hover:bg-amber-100 border-2 border-black p-2 text-xs font-bold text-slate-900 flex items-center justify-between group shadow-pixel-sm transition-all active:translate-x-0.5 active:translate-y-0.5"
                  >
                    <span className="flex items-center gap-2">
                      <span className="bg-slate-900 text-amber-300 px-1.5 py-0.5 text-[9px] border border-black">
                        {idx + 1}
                      </span>
                      <span>{opt.label}</span>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-black group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Status / Continue Indicator */}
        <div className="mt-3 flex items-center justify-between border-t-2 border-slate-200 pt-2 text-[10px] text-slate-500">
          <span className="text-slate-400">
            {isTyping
              ? `${currentDialogue.speaker.split(' (')[0]} spricht...`
              : options.length > 0
              ? 'Wähle eine Option mit [1-3] oder Klick'
              : '[SPACE / KLICK] Weiter'}
          </span>
          {!isTyping && options.length === 0 && (
            <span className="animate-bounce font-bold text-amber-600 text-xs flex items-center gap-1">
              <span>Weiter</span>
              <span>▼</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
