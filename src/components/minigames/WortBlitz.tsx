'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import vocabularyData from '@/data/vocabulary.json';
import PixelButton from '@/components/ui/PixelButton';
import { Zap, Heart, Sparkles, Award, ArrowRight, RotateCcw, X } from 'lucide-react';

interface VocabItem {
  id: number;
  word: string;
  article: string;
  english: string;
  category: string;
  hint: string;
}

export default function WortBlitz() {
  const { activeOverlay, setOverlay, addXP, addCoins } = useGameStore();

  const [words, setWords] = useState<VocabItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(3);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [rewardsClaimed, setRewardsClaimed] = useState(false);

  // Initialize randomized word queue
  useEffect(() => {
    if (activeOverlay === 'minigame') {
      const shuffled = [...vocabularyData].sort(() => 0.5 - Math.random());
      setWords(shuffled.slice(0, 8)); // 8-round challenge
      setCurrentIndex(0);
      setScore(0);
      setCombo(0);
      setLives(3);
      setFeedback(null);
      setSelectedArticle(null);
      setIsGameOver(false);
      setRewardsClaimed(false);
    }
  }, [activeOverlay]);

  if (activeOverlay !== 'minigame') return null;

  const currentWord = words[currentIndex];

  const handleAnswer = (chosenArticle: 'der' | 'die' | 'das') => {
    if (!currentWord || feedback !== null || isGameOver) return;

    setSelectedArticle(chosenArticle);
    const isCorrect = chosenArticle.toLowerCase() === currentWord.article.toLowerCase();

    if (isCorrect) {
      setFeedback('correct');
      const comboMultiplier = combo >= 2 ? 2 : 1;
      const pointsEarned = 10 * comboMultiplier;
      setScore((prev) => prev + pointsEarned);
      setCombo((prev) => prev + 1);

      setTimeout(() => {
        advanceNextRound();
      }, 750);
    } else {
      setFeedback('wrong');
      setCombo(0);
      const newLives = lives - 1;
      setLives(newLives);

      setTimeout(() => {
        if (newLives <= 0) {
          endGame(score);
        } else {
          advanceNextRound();
        }
      }, 1200);
    }
  };

  const advanceNextRound = () => {
    setFeedback(null);
    setSelectedArticle(null);
    if (currentIndex + 1 < words.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      endGame(score + 10);
    }
  };

  const endGame = (finalScore: number) => {
    setIsGameOver(true);
    if (!rewardsClaimed) {
      const xpEarned = Math.max(15, Math.floor(finalScore * 1.5));
      const coinsEarned = Math.max(5, Math.floor(finalScore / 2));
      addXP(xpEarned);
      addCoins(coinsEarned);
      setRewardsClaimed(true);
    }
  };

  const handleClose = () => {
    setOverlay('none');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-pixel select-none backdrop-blur-sm">
      <div className="relative w-full max-w-xl border-4 border-black bg-slate-900 p-6 shadow-pixel-lg text-white">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b-4 border-black bg-amber-400 text-black px-4 py-2 -mx-6 -mt-6 mb-6">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 fill-current text-black animate-pulse" />
            <span className="text-sm font-bold tracking-wide">Wort Blitz: Bäckerei</span>
          </div>
          <button
            onClick={handleClose}
            className="border-2 border-black bg-rose-500 text-white p-1 hover:bg-rose-600 active:translate-y-0.5"
            title="Schließen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!isGameOver && currentWord ? (
          <div>
            {/* Stats Row */}
            <div className="flex items-center justify-between mb-6 text-xs border-2 border-slate-700 bg-slate-950 p-2.5">
              {/* Hearts / Lives */}
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((heart) => (
                  <Heart
                    key={heart}
                    className={`w-4 h-4 ${
                      heart <= lives ? 'fill-red-500 text-red-500' : 'text-slate-600'
                    }`}
                  />
                ))}
              </div>

              {/* Progress */}
              <div className="text-slate-400 text-[10px]">
                Wort {currentIndex + 1} / {words.length}
              </div>

              {/* Score & Combo */}
              <div className="flex items-center gap-2">
                {combo >= 2 && (
                  <span className="bg-amber-500 text-black px-1.5 py-0.5 text-[9px] font-bold animate-bounce">
                    {combo}x COMBO!
                  </span>
                )}
                <span className="text-amber-400 font-bold">{score} Pkt</span>
              </div>
            </div>

            {/* Main Word Card */}
            <div
              className={`relative border-4 border-black p-8 text-center transition-all duration-200 mb-6 ${
                feedback === 'correct'
                  ? 'bg-emerald-600 text-white scale-105'
                  : feedback === 'wrong'
                  ? 'bg-rose-700 text-white shake'
                  : 'bg-white text-slate-900 shadow-pixel'
              }`}
            >
              <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 font-bold">
                {currentWord.category} &bull; {currentWord.english}
              </div>

              {/* German Noun in Bold Pixel Font */}
              <div className="text-2xl md:text-3xl font-extrabold tracking-wider my-3">
                {feedback ? `${currentWord.article.toUpperCase()} ${currentWord.word}` : currentWord.word}
              </div>

              {/* Hint on wrong answer */}
              {feedback === 'wrong' && (
                <div className="mt-2 text-[10px] text-amber-200 bg-black/40 p-2 border border-black">
                  Tipp: {currentWord.hint}
                </div>
              )}
            </div>

            {/* Answer Buttons: DER / DIE / DAS */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <PixelButton
                variant="sky"
                size="lg"
                disabled={feedback !== null}
                onClick={() => handleAnswer('der')}
                className="w-full text-base py-4"
              >
                DER
              </PixelButton>

              <PixelButton
                variant="ruby"
                size="lg"
                disabled={feedback !== null}
                onClick={() => handleAnswer('die')}
                className="w-full text-base py-4"
              >
                DIE
              </PixelButton>

              <PixelButton
                variant="emerald"
                size="lg"
                disabled={feedback !== null}
                onClick={() => handleAnswer('das')}
                className="w-full text-base py-4"
              >
                DAS
              </PixelButton>
            </div>
            <div className="text-center text-[10px] text-slate-400 mt-3">
              Wähle den richtigen Artikel für das deutsche Substantiv!
            </div>
          </div>
        ) : (
          /* Game Over / Victory Screen */
          <div className="text-center py-4 space-y-5">
            <div className="inline-flex p-4 border-4 border-black bg-amber-400 text-black shadow-pixel">
              <Award className="w-12 h-12" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-amber-300">
                {lives > 0 ? 'Hervorragend! (Victory!)' : 'Runde Vorbei! (Game Over)'}
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Du hast {score} Punkte im Wort-Blitz erreicht.
              </p>
            </div>

            <div className="border-2 border-slate-700 bg-slate-950 p-4 max-w-xs mx-auto text-xs space-y-2">
              <div className="flex justify-between text-amber-400">
                <span>+ XP Belohnung:</span>
                <span className="font-bold">+{Math.max(15, Math.floor(score * 1.5))} XP</span>
              </div>
              <div className="flex justify-between text-yellow-400">
                <span>+ Münzen (Gold):</span>
                <span className="font-bold">+{Math.max(5, Math.floor(score / 2))} G</span>
              </div>
            </div>

            <div className="pt-2 flex justify-center gap-4">
              <PixelButton
                variant="amber"
                size="md"
                onClick={handleClose}
                className="flex items-center gap-2"
              >
                <span>Zurück zur Stadt</span>
                <ArrowRight className="w-4 h-4" />
              </PixelButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

