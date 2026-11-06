'use client';

import React, { useEffect, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import bibliothekData from '@/data/bibliothek.json';
import PixelButton from '@/components/ui/PixelButton';
import { MinigameFrame, MinigameIntro } from '@/components/minigames/MinigameFrame';
import { soundFx } from '@/utils/audio';
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowRight,
  Award,
  Lightbulb,
  Undo2,
} from 'lucide-react';

interface Sentence {
  id: number;
  words: string[];
  english: string;
  hint: string;
}

interface Tile {
  uid: string;
  word: string;
}

const SENTENCES = (bibliothekData as unknown as { sentences: Sentence[] }).sentences;
const ROUND_COUNT = SENTENCES.length;

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildTiles(words: string[]): Tile[] {
  return shuffle(
    words.map((word, index) => ({
      uid: `${index}-${Math.random().toString(36).slice(2, 9)}`,
      word,
    }))
  );
}

export default function Satzbauer() {
  const { activeOverlay, setOverlay, addXP, addCoins, updateQuestProgress } = useGameStore();

  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [bank, setBank] = useState<Tile[]>([]);
  const [placed, setPlaced] = useState<Tile[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | 'revealed' | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [solved, setSolved] = useState(0);
  const [finished, setFinished] = useState(false);
  const [earnings, setEarnings] = useState({ xp: 0, coins: 0 });

  const sentence = SENTENCES[index];
  const points = solved * 25;

  const loadRound = (roundIndex: number) => {
    setIndex(roundIndex);
    setBank(buildTiles(SENTENCES[roundIndex].words));
    setPlaced([]);
    setFeedback(null);
    setAttempts(0);
  };

  useEffect(() => {
    if (activeOverlay === 'satzbauer') {
      setStarted(false);
      setFinished(false);
      setSolved(0);
      setEarnings({ xp: 0, coins: 0 });
      loadRound(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOverlay]);

  const placeTile = (tile: Tile) => {
    if (feedback === 'correct' || feedback === 'revealed') return;
    if (feedback === 'wrong') setFeedback(null);
    setBank((prev) => prev.filter((t) => t.uid !== tile.uid));
    setPlaced((prev) => [...prev, tile]);
    soundFx.playClick();
  };

  const removeTile = (tile: Tile) => {
    if (feedback === 'correct' || feedback === 'revealed') return;
    if (feedback === 'wrong') setFeedback(null);
    setPlaced((prev) => prev.filter((t) => t.uid !== tile.uid));
    setBank((prev) => [...prev, tile]);
    soundFx.playClick();
  };

  const resetWords = () => {
    if (feedback === 'correct' || feedback === 'revealed') return;
    setBank((prev) => shuffle([...prev, ...placed]));
    setPlaced([]);
    setFeedback(null);
    soundFx.playClick();
  };

  const handleCheck = () => {
    if (feedback === 'correct' || feedback === 'revealed') return;
    if (placed.length !== sentence.words.length) return;

    const attempt = placed.map((t) => t.word).join(' ');
    if (attempt === sentence.words.join(' ')) {
      setFeedback('correct');
      setSolved((prev) => prev + 1);
      soundFx.playCorrect();
    } else {
      soundFx.playWrong();
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      setFeedback(nextAttempts >= 2 ? 'revealed' : 'wrong');
    }
  };

  const finishGame = () => {
    const xpEarned = 30 + solved * 10;
    const coinsEarned = 10 + solved * 4;

    addXP(xpEarned);
    addCoins(coinsEarned);
    if (solved >= 4) updateQuestProgress('bibliothek_quest', 1);

    soundFx.playCoin();
    setEarnings({ xp: xpEarned, coins: coinsEarned });
    setFinished(true);
  };

  const handleContinue = () => {
    if (feedback === 'wrong') {
      setFeedback(null);
      soundFx.playClick();
      return;
    }
    if (feedback !== 'correct' && feedback !== 'revealed') return;

    soundFx.playClick();
    if (index + 1 < ROUND_COUNT) {
      loadRound(index + 1);
    } else {
      finishGame();
    }
  };

  const handleStart = () => {
    soundFx.playClick();
    setStarted(true);
  };

  const handleRetry = () => {
    soundFx.playClick();
    setSolved(0);
    setFinished(false);
    setEarnings({ xp: 0, coins: 0 });
    loadRound(0);
  };

  const handleClose = () => {
    soundFx.playClick();
    setOverlay('none');
  };

  // Keyboard: Enter checks / continues, ESC closes
  useEffect(() => {
    if (activeOverlay !== 'satzbauer') return;

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        setOverlay('none');
        return;
      }
      if (!started) {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          setStarted(true);
        }
        return;
      }
      if (finished) return;
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        if (feedback === null) handleCheck();
        else handleContinue();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOverlay, started, finished, feedback, placed, attempts, index, solved]);

  if (activeOverlay !== 'satzbauer') return null;

  const solvedSentence = sentence?.words.join(' ');

  return (
    <MinigameFrame
      title="Bibliothek · Satz-Bauer"
      icon={<BookOpen className="h-5 w-5" />}
      onClose={handleClose}
    >
      {!started && !finished && (
        <MinigameIntro
          portrait="/characters/Weber.svg"
          speaker="Frau Weber"
          role="Bibliothekarin"
          text="Willkommen in der Bibliothek! Baue aus den Wörtern einen korrekten deutschen Satz. Achte besonders auf die Stellung des Verbs – im Hauptsatz steht es an zweiter Position!"
          english="Welcome to the library! Build a correct German sentence from the words. Pay attention to the verb position – in a main clause the verb is in second position!"
          meta={`${ROUND_COUNT} Sätze · 25 Punkte pro Satz · 4 gelöste Sätze = Quest`}
          startLabel="Satz-Bauer starten"
          onStart={handleStart}
        />
      )}

      {started && !finished && sentence && (
        <div>
          {/* Status */}
          <div className="mb-3 flex items-center justify-between border-2 border-slate-700 bg-slate-950 p-2.5 text-[9px]">
            <span className="text-slate-400">
              Satz {index + 1} / {ROUND_COUNT}
            </span>
            <span className="text-emerald-400">{solved} gelöst</span>
            <span className="font-bold text-amber-400">{points} Pkt</span>
          </div>

          {/* Frau Weber instruction */}
          <div className="flex items-start gap-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden border-4 border-black bg-slate-950">
              <img src="/characters/Weber.svg" alt="Frau Weber" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1 border-4 border-black bg-white p-2.5 text-slate-900 shadow-pixel">
              <div className="mb-1 flex items-center gap-1 text-[9px] font-bold text-emerald-800">
                <BookOpen className="h-3 w-3" /> FRAU WEBER
              </div>
              <p className="text-[10px] leading-relaxed">
                Bilde den Satz auf Deutsch. Übersetzung als Hilfe:
              </p>
              <p className="mt-1 text-[9px] italic text-slate-600">“{sentence.english}”</p>
            </div>
          </div>

          {/* Sentence slots */}
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-[8px] text-slate-400">
              <span>DEIN SATZ</span>
              <span>Tippe ein Wort an, um es zu entfernen</span>
            </div>
            <div className="flex min-h-[76px] flex-wrap items-center gap-2 border-4 border-dashed border-slate-600 bg-slate-950 p-2.5">
              {placed.length === 0 && (
                <span className="px-2 text-[9px] text-slate-500">
                  Tippe die Wörter unten an, um den Satz zu bauen …
                </span>
              )}
              {placed.map((tile) => (
                <button
                  key={tile.uid}
                  type="button"
                  onClick={() => removeTile(tile)}
                  disabled={feedback === 'correct' || feedback === 'revealed'}
                  className="border-4 border-black bg-white px-2 py-1.5 text-[10px] font-bold text-slate-900 shadow-pixel-sm transition-transform hover:bg-amber-100 active:translate-y-0.5 disabled:opacity-70"
                >
                  {tile.word}
                </button>
              ))}
            </div>
          </div>

          {/* Word bank */}
          <div className="mt-3">
            <div className="mb-1 text-[8px] text-slate-400">WORTBAUKASTEN</div>
            <div className="flex min-h-[52px] flex-wrap items-center gap-2 border-2 border-slate-700 bg-slate-800 p-2.5">
              {bank.length === 0 && (
                <span className="px-1 text-[9px] text-slate-500">Alle Wörter sind platziert.</span>
              )}
              {bank.map((tile) => (
                <button
                  key={tile.uid}
                  type="button"
                  onClick={() => placeTile(tile)}
                  disabled={feedback === 'correct' || feedback === 'revealed'}
                  className="border-4 border-black bg-amber-300 px-2 py-1.5 text-[10px] font-bold text-black shadow-pixel-sm transition-transform hover:bg-amber-200 active:translate-y-0.5 disabled:opacity-50"
                >
                  {tile.word}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <PixelButton
              variant="dark"
              size="sm"
              onClick={resetWords}
              disabled={placed.length === 0 || feedback === 'correct' || feedback === 'revealed'}
            >
              <span className="flex items-center gap-1.5">
                <Undo2 className="h-3.5 w-3.5" /> Zurücksetzen
              </span>
            </PixelButton>

            {feedback === null && (
              <PixelButton
                variant="amber"
                size="md"
                onClick={handleCheck}
                disabled={placed.length !== sentence.words.length}
              >
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Prüfen
                </span>
              </PixelButton>
            )}
          </div>

          {/* Feedback */}
          {feedback === 'correct' && (
            <div className="mt-3 border-4 border-black bg-emerald-700 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[9px] font-bold text-white">
                <CheckCircle2 className="h-4 w-4" /> RICHTIG!
              </div>
              <p className="text-[9px] leading-relaxed text-emerald-50">{sentence.hint}</p>
              <div className="mt-2 flex justify-end">
                <PixelButton variant="amber" size="md" onClick={handleContinue}>
                  <span className="flex items-center gap-2">
                    {index + 1 === ROUND_COUNT ? 'Auswertung' : 'Weiter'}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </PixelButton>
              </div>
            </div>
          )}

          {feedback === 'wrong' && (
            <div className="mt-3 border-4 border-black bg-rose-900 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[9px] font-bold text-rose-100">
                <XCircle className="h-4 w-4" /> NOCH NICHT GANZ
              </div>
              <p className="text-[9px] leading-relaxed text-rose-100">
                <span className="font-bold text-amber-300">Tipp: </span>
                {sentence.hint}
              </p>
              <div className="mt-2 flex justify-end">
                <PixelButton variant="amber" size="md" onClick={handleContinue}>
                  <span className="flex items-center gap-1.5">
                    <RotateCcw className="h-4 w-4" /> Nochmal versuchen
                  </span>
                </PixelButton>
              </div>
            </div>
          )}

          {feedback === 'revealed' && (
            <div className="mt-3 border-4 border-black bg-slate-950 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[9px] font-bold text-amber-400">
                <Lightbulb className="h-4 w-4" /> DIE RICHTIGE LÖSUNG
              </div>
              <p className="border-2 border-slate-700 bg-slate-900 p-2 text-[10px] font-bold text-emerald-300">
                {solvedSentence}
              </p>
              <p className="mt-2 text-[9px] leading-relaxed text-slate-300">{sentence.hint}</p>
              <div className="mt-2 flex justify-end">
                <PixelButton variant="amber" size="md" onClick={handleContinue}>
                  <span className="flex items-center gap-2">
                    {index + 1 === ROUND_COUNT ? 'Auswertung' : 'Weiter'}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </PixelButton>
              </div>
            </div>
          )}
        </div>
      )}

      {finished && (
        <div className="space-y-4 text-center">
          <div className="inline-flex border-4 border-black bg-amber-400 p-3 text-black shadow-pixel">
            <Award className="h-10 w-10" />
          </div>

          <div>
            <h3 className="text-sm font-bold text-amber-300">
              {solved >= 4 ? 'Grammatik-Meister!' : 'Gute Übung!'}
            </h3>
            <p className="mt-1 text-[10px] text-slate-300">
              {solved} von {ROUND_COUNT} Sätzen gelöst.
            </p>
          </div>

          <div className="mx-auto max-w-xs space-y-2 border-2 border-slate-700 bg-slate-950 p-4 text-[10px]">
            <div className="flex justify-between text-amber-400">
              <span>+ XP:</span>
              <span className="font-bold">+{earnings.xp} XP</span>
            </div>
            <div className="flex justify-between text-yellow-400">
              <span>+ Münzen:</span>
              <span className="font-bold">+{earnings.coins} G</span>
            </div>
            {solved >= 4 && (
              <div className="border-t border-slate-700 pt-1.5 text-left text-[8px] leading-relaxed text-slate-400">
                Quest „Der Satz-Bauer“ aktualisiert. Frau Weber ist beeindruckt!
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-3 pb-1">
            <PixelButton variant="dark" size="md" onClick={handleRetry}>
              <span className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4" /> Nochmal
              </span>
            </PixelButton>
            <PixelButton variant="amber" size="md" onClick={handleClose}>
              <span className="flex items-center gap-2">
                Zurück zur Stadt <ArrowRight className="h-4 w-4" />
              </span>
            </PixelButton>
          </div>
        </div>
      )}

      <div className="mt-4 border-t-2 border-slate-700 pt-2 text-center text-[8px] text-slate-500">
        [ENTER] Prüfen/Weiter · [ESC] Schließen
      </div>
    </MinigameFrame>
  );
}
