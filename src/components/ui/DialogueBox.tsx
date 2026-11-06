'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { Volume2, VolumeX, Sparkles, MessageSquare } from 'lucide-react';

export default function DialogueBox() {
  const { activeOverlay, currentDialogue, closeDialogue } = useGameStore();

  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  const fullText = currentDialogue?.text || '';

  // Typewriter effect
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
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 28); // 28ms retro typewriter pacing

    return () => clearInterval(interval);
  }, [activeOverlay, fullText]);

  // Handle Space, Enter, or Click to advance / skip typewriter
  const handleAdvance = () => {
    if (isTyping) {
      // Instantly finish typing
      setDisplayedText(fullText);
      setIsTyping(false);
    } else {
      // Close dialogue
      closeDialogue();
    }
  };

  useEffect(() => {
    if (activeOverlay !== 'dialogue') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleAdvance();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeOverlay, isTyping, fullText]);

  if (activeOverlay !== 'dialogue' || !currentDialogue) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 font-pixel select-none">
      <div
        onClick={handleAdvance}
        className="relative w-full max-w-3xl cursor-pointer bg-white text-slate-900 border-4 border-black p-5 shadow-pixel-lg"
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
              setShowTranslation(!showTranslation);
            }}
            className="absolute -top-6 right-3 bg-slate-900 text-amber-300 border-4 border-black px-3 py-1 text-[10px] font-bold shadow-pixel hover:bg-slate-800 active:translate-y-0.5"
          >
            {showTranslation ? 'Hide EN' : 'Translate EN'}
          </button>
        )}

        {/* Dialogue Content */}
        <div className="mt-2 min-h-[72px] text-xs leading-relaxed tracking-wide text-slate-900 font-medium">
          <p>{displayedText}</p>

          {/* English Translation Subtext */}
          {showTranslation && currentDialogue.translation && (
            <div className="mt-3 pt-2 border-t-2 border-dashed border-slate-300 text-slate-500 text-[11px] italic">
              {currentDialogue.translation}
            </div>
          )}
        </div>

        {/* Bottom Status / Continue Indicator */}
        <div className="mt-3 flex items-center justify-between border-t-2 border-slate-200 pt-2 text-[10px] text-slate-500">
          <span className="text-slate-400">
            {isTyping ? 'Spreche...' : '[SPACE / KLICK] Weiter'}
          </span>
          {!isTyping && (
            <span className="animate-bounce font-bold text-amber-600 text-xs">
              ▼
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

