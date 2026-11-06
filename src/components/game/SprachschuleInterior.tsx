'use client';

import React, { useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { School, BookOpen, Sparkles, X, CheckCircle, RotateCcw, Award, LogOut } from 'lucide-react';
import PixelButton from '@/components/ui/PixelButton';
import { soundFx } from '@/utils/audio';

export default function SprachschuleInterior() {
  const { activeOverlay, setOverlay, addXP, addCoins } = useGameStore();

  // Sentence Builder Practice
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [rewardClaimed, setRewardClaimed] = useState(false);

  if (activeOverlay !== 'sprachschule_interior') return null;

  const targetSentence = ['Ich', 'lerne', 'jeden', 'Tag', 'Deutsch'];
  const scrambledWords = ['Deutsch', 'lerne', 'Ich', 'Tag', 'jeden'];

  const handleWordClick = (word: string) => {
    soundFx.playClick();
    if (!selectedWords.includes(word)) {
      const next = [...selectedWords, word];
      setSelectedWords(next);

      if (next.length === targetSentence.length) {
        const correct = next.every((w, i) => w === targetSentence[i]);
        setIsCorrect(correct);
        if (correct) {
          soundFx.playCorrect();
          if (!rewardClaimed) {
            soundFx.playCoin();
            addXP(35);
            addCoins(15);
            setRewardClaimed(true);
          }
        } else {
          soundFx.playWrong();
        }
      }
    }
  };

  const handleReset = () => {
    soundFx.playClick();
    setSelectedWords([]);
    setIsCorrect(null);
  };

  const handleExit = () => {
    soundFx.playClick();
    setOverlay('none');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 font-pixel select-none backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl border-4 border-black bg-slate-900 p-6 shadow-pixel-lg text-white">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b-4 border-black bg-amber-400 text-black px-4 py-2.5 -mx-6 -mt-6 mb-6">
          <div className="flex items-center gap-2">
            <School className="w-5 h-5 text-black" />
            <span className="text-sm font-bold tracking-wide">Sprachschule Deutschstadt &bull; Klassenzimmer</span>
          </div>
          <button
            onClick={handleExit}
            className="border-2 border-black bg-rose-500 text-white p-1 hover:bg-rose-600 active:translate-y-0.5"
            title="Verlassen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Classroom Blackboard (Schultafel) */}
        <div className="border-4 border-amber-900 bg-emerald-950 p-5 shadow-pixel mb-6 relative">
          <div className="absolute top-2 right-3 text-[10px] text-amber-200/80 font-bold">
            Tafel &bull; Lektion 1
          </div>
          <h3 className="text-amber-300 text-sm font-bold mb-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Grammatik-Regel: Die Wortstellung (Word Order)
          </h3>
          <p className="text-xs text-emerald-100 leading-relaxed">
            Im deutschen Hauptsatz steht das <span className="text-amber-300 font-bold underline">konjugierte Verb</span> immer an <span className="text-sky-300 font-bold">Position 2</span>!
          </p>
          <div className="mt-2 text-[11px] text-emerald-300/90 italic">
            Beispiel: "Ich <span className="underline font-bold text-amber-300">lerne</span> Deutsch." / "Heute <span className="underline font-bold text-amber-300">lerne</span> ich Deutsch."
          </div>
        </div>

        {/* Smartboard Touch Interactive Exercise */}
        <div className="border-3 border-black bg-slate-800 p-5 shadow-pixel mb-6">
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="text-amber-400 font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Smartboard-Übung: Satz-Bau
            </span>
            <span className="text-slate-400 text-[10px]">
              Bilde den Satz: "I learn German every day"
            </span>
          </div>

          {/* Constructed Sentence Display Area */}
          <div className="min-h-[52px] border-2 border-black bg-slate-950 p-3 mb-4 flex items-center justify-center flex-wrap gap-2">
            {selectedWords.length > 0 ? (
              selectedWords.map((word, idx) => (
                <span
                  key={idx}
                  className="bg-sky-500 text-white border-2 border-black px-2.5 py-1 text-xs font-bold shadow-pixel-sm animate-in zoom-in-95"
                >
                  {word}
                </span>
              ))
            ) : (
              <span className="text-slate-500 text-xs italic">
                Tippe die Wörter unten in der richtigen Reihenfolge an...
              </span>
            )}
          </div>

          {/* Word Choices (Scrambled) */}
          <div className="flex items-center justify-center flex-wrap gap-2 mb-4">
            {scrambledWords.map((word) => {
              const isUsed = selectedWords.includes(word);
              return (
                <button
                  key={word}
                  disabled={isUsed || isCorrect === true}
                  onClick={() => handleWordClick(word)}
                  className={`border-3 border-black px-3.5 py-2 text-xs font-bold shadow-pixel transition-all active:translate-y-0.5 ${
                    isUsed
                      ? 'opacity-30 bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-amber-400 text-black hover:bg-amber-300'
                  }`}
                >
                  {word}
                </button>
              );
            })}
          </div>

          {/* Feedback & Actions */}
          <div className="flex items-center justify-between border-t border-slate-700 pt-3">
            <div>
              {isCorrect === true && (
                <span className="text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  Ausgezeichnet! +35 XP &amp; +15 Gold erhalten!
                </span>
              )}
              {isCorrect === false && (
                <span className="text-rose-400 text-xs font-bold">
                  Nicht ganz richtig! Achte auf Verb-Position 2.
                </span>
              )}
            </div>

            <PixelButton variant="dark" size="sm" onClick={handleReset} className="flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Neu starten</span>
            </PixelButton>
          </div>
        </div>

        {/* Footer Exit Button */}
        <div className="flex justify-end">
          <PixelButton variant="ruby" size="md" onClick={handleExit} className="flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            <span>Zurück nach Deutschstadt</span>
          </PixelButton>
        </div>
      </div>
    </div>
  );
}

