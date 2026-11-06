'use client';

import React, { useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import museumExhibits from '@/data/museum.json';
import PixelButton from '@/components/ui/PixelButton';
import { soundFx } from '@/utils/audio';
import { Landmark, BookOpen, Award, CheckCircle2, HelpCircle, X, LogOut, ChevronRight, Sparkles } from 'lucide-react';

interface ExhibitItem {
  id: string;
  exhibit: string;
  translated: string;
  fact: string;
  factEnglish: string;
  trivia: {
    question: string;
    choices: string[];
    answerIndex: number;
  };
}

export default function MuseumInteriorModal() {
  const { activeOverlay, setOverlay, addXP, addCoins, historyJournal, unlockHistoryJournal } = useGameStore();

  const [selectedExhibit, setSelectedExhibit] = useState<ExhibitItem | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showEnglishFact, setShowEnglishFact] = useState(false);

  if (activeOverlay !== 'museum_interior') return null;

  const handleSelectExhibit = (item: ExhibitItem) => {
    soundFx.playClick();
    setSelectedExhibit(item);
    setSelectedAnswer(null);
    setQuizFeedback(null);
    setShowEnglishFact(false);
  };

  const handleAnswer = (index: number) => {
    if (!selectedExhibit || quizFeedback !== null) return;

    setSelectedAnswer(index);
    const isCorrect = index === selectedExhibit.trivia.answerIndex;

    if (isCorrect) {
      soundFx.playCorrect();
      setQuizFeedback('correct');

      if (!historyJournal.includes(selectedExhibit.id)) {
        soundFx.playCoin();
        addXP(30);
        addCoins(10);
        unlockHistoryJournal(selectedExhibit.id);
      }
    } else {
      soundFx.playWrong();
      setQuizFeedback('wrong');
    }
  };

  const handleClose = () => {
    soundFx.playClick();
    setSelectedExhibit(null);
    setOverlay('none');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 font-pixel select-none backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl border-4 border-black bg-slate-950 p-6 shadow-pixel-lg text-white">
        {/* Top Museum Header */}
        <div className="flex items-center justify-between border-b-4 border-black bg-amber-400 text-black px-4 py-2.5 -mx-6 -mt-6 mb-6">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-black" />
            <span className="text-sm font-bold tracking-wide">Deutsches Geschichtsmuseum</span>
          </div>
          <button
            onClick={handleClose}
            className="border-2 border-black bg-rose-500 text-white p-1 hover:bg-rose-600 active:translate-y-0.5"
            title="Schließen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Museum Guide Intro (Frau Weber) */}
        <div className="border-3 border-black bg-slate-900 p-4 mb-6 shadow-pixel flex items-center gap-4">
          <div className="shrink-0 w-12 h-12 border-2 border-black bg-amber-200 flex items-center justify-center text-xl">
            🏛️
          </div>
          <div>
            <div className="text-xs font-bold text-amber-300">Frau Weber (Museumsleiterin):</div>
            <div className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
              "Willkommen in der Galerie der deutschen Geschichte! Berühre die Exponate, lies die historischen Fakten und meistere das Geschichts-Quiz."
            </div>
          </div>
        </div>

        {!selectedExhibit ? (
          /* Gallery Hall: Exhibit Pedestals */
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3 border-b border-slate-800 pb-1">
              <span>Ausstellungshallen &bull; Wähle ein Exponat:</span>
              <span className="text-amber-400">
                Journal: {historyJournal.length} / {museumExhibits.length} gelöst
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {(museumExhibits as ExhibitItem[]).map((item) => {
                const isCompleted = historyJournal.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectExhibit(item)}
                    className="group border-3 border-black bg-slate-900 hover:bg-slate-800 p-4 text-left shadow-pixel transition-all active:translate-x-0.5 active:translate-y-0.5 relative"
                  >
                    {isCompleted && (
                      <div className="absolute top-2 right-2 text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                    <div className="text-2xl mb-2">📜</div>
                    <div className="text-xs font-bold text-white group-hover:text-amber-300 line-clamp-1">
                      {item.exhibit}
                    </div>
                    <div className="text-[10px] text-slate-400 italic mt-1 line-clamp-1">
                      {item.translated}
                    </div>
                    <div className="mt-3 text-[9px] text-amber-500 font-bold flex items-center gap-1">
                      <span>Exponat ansehen</span>
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Single Exhibit Display & Trivia Modal */
          <div className="border-3 border-black bg-slate-900 p-5 shadow-pixel mb-6 animate-in zoom-in-95">
            {/* Exhibit Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-700 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-amber-300">{selectedExhibit.exhibit}</h3>
                <div className="text-[10px] text-slate-400 italic">{selectedExhibit.translated}</div>
              </div>
              <PixelButton
                variant="dark"
                size="sm"
                onClick={() => setSelectedExhibit(null)}
              >
                &larr; Alle Exponate
              </PixelButton>
            </div>

            {/* Historical Fact Plaque */}
            <div className="bg-slate-950 border-2 border-black p-4 mb-5">
              <div className="text-xs text-slate-100 leading-relaxed font-medium">
                {selectedExhibit.fact}
              </div>

              {/* English Hover / Toggle Help */}
              {showEnglishFact && (
                <div className="mt-2.5 pt-2 border-t border-dashed border-slate-700 text-[10px] text-amber-200 italic">
                  {selectedExhibit.factEnglish}
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowEnglishFact(!showEnglishFact)}
                className="mt-2 text-[9px] text-sky-400 hover:text-sky-300 flex items-center gap-1"
              >
                <HelpCircle className="w-3 h-3" />
                <span>{showEnglishFact ? 'Englische Übersetzung ausblenden' : 'Englische Übersetzung anzeigen'}</span>
              </button>
            </div>

            {/* Historical Trivia Question */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-amber-400">
                Quiz-Frage: {selectedExhibit.trivia.question}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedExhibit.trivia.choices.map((choice, idx) => {
                  let btnColor = 'bg-slate-800 text-white hover:bg-slate-700';
                  if (selectedAnswer === idx) {
                    btnColor =
                      quizFeedback === 'correct'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-rose-600 text-white';
                  }

                  return (
                    <button
                      key={idx}
                      disabled={quizFeedback !== null}
                      onClick={() => handleAnswer(idx)}
                      className={`border-2 border-black p-2.5 text-xs font-bold text-left shadow-pixel-sm transition-all active:translate-y-0.5 ${btnColor}`}
                    >
                      <span className="text-amber-400 mr-2">{idx + 1}.</span>
                      <span>{choice}</span>
                    </button>
                  );
                })}
              </div>

              {/* Feedback Alert */}
              {quizFeedback === 'correct' && (
                <div className="mt-3 p-2 border-2 border-emerald-500 bg-emerald-950/80 text-emerald-300 text-xs font-bold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Richtig! +30 XP &amp; +10 Gold erhalten. Ins Geschichts-Journal eingetragen!
                  </span>
                  <PixelButton
                    variant="emerald"
                    size="sm"
                    onClick={() => setSelectedExhibit(null)}
                  >
                    Weiter
                  </PixelButton>
                </div>
              )}

              {quizFeedback === 'wrong' && (
                <div className="mt-3 p-2 border-2 border-rose-500 bg-rose-950/80 text-rose-300 text-xs font-bold flex items-center justify-between">
                  <span>Leider falsch! Lies den historischen Text oben noch einmal.</span>
                  <PixelButton
                    variant="ruby"
                    size="sm"
                    onClick={() => {
                      setSelectedAnswer(null);
                      setQuizFeedback(null);
                    }}
                  >
                    Erneut versuchen
                  </PixelButton>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Exit */}
        <div className="flex justify-between items-center border-t-2 border-slate-800 pt-3">
          <div className="text-[10px] text-slate-400">
            Geschichts-Journal: <span className="text-amber-400 font-bold">{historyJournal.length}</span> / {museumExhibits.length} Exponate gesammelt
          </div>
          <PixelButton variant="dark" size="sm" onClick={handleClose} className="flex items-center gap-1.5">
            <LogOut className="w-3.5 h-3.5" />
            <span>Museum verlassen</span>
          </PixelButton>
        </div>
      </div>
    </div>
  );
}

