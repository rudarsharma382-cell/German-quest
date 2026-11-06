'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import cafeData from '@/data/cafe.json';
import PixelButton from '@/components/ui/PixelButton';
import { MinigameFrame, MinigameIntro } from '@/components/minigames/MinigameFrame';
import { soundFx } from '@/utils/audio';
import { Coffee, RotateCcw, ArrowRight, Award, Star } from 'lucide-react';

interface Pair {
  id: string;
  article: string;
  german: string;
  english: string;
  emoji: string;
}

interface Card {
  uid: string;
  pairId: string;
  kind: 'de' | 'en';
  pair: Pair;
}

const PAIRS = (cafeData as unknown as { pairs: Pair[] }).pairs;

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildDeck(): Card[] {
  const cards: Card[] = [];
  PAIRS.forEach((pair) => {
    cards.push({ uid: `${pair.id}-de`, pairId: pair.id, kind: 'de', pair });
    cards.push({ uid: `${pair.id}-en`, pairId: pair.id, kind: 'en', pair });
  });
  return shuffle(cards);
}

function articleColor(article: string) {
  if (article === 'der') return 'bg-sky-500';
  if (article === 'die') return 'bg-rose-500';
  return 'bg-emerald-500';
}

export default function KaffeeMatch() {
  const { activeOverlay, setOverlay, addXP, addCoins, updateQuestProgress } = useGameStore();

  const [started, setStarted] = useState(false);
  const [deck, setDeck] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [finished, setFinished] = useState(false);
  const [earnings, setEarnings] = useState({ xp: 0, coins: 0 });

  const lockRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  const resetGame = () => {
    clearTimers();
    lockRef.current = false;
    setDeck(buildDeck());
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setFinished(false);
    setEarnings({ xp: 0, coins: 0 });
  };

  useEffect(() => {
    if (activeOverlay === 'kaffee') {
      setStarted(false);
      resetGame();
    } else {
      clearTimers();
      lockRef.current = false;
    }
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOverlay]);

  const finishGame = (movesUsed: number) => {
    const xpEarned = 60 + Math.max(0, 18 - movesUsed) * 4;
    const coinsEarned = 20 + Math.max(0, 12 - movesUsed) * 3;

    addXP(xpEarned);
    addCoins(coinsEarned);
    updateQuestProgress('cafe_quest', 1);

    soundFx.playCoin();
    setEarnings({ xp: xpEarned, coins: coinsEarned });
    setFinished(true);
  };

  const handleCard = (card: Card) => {
    if (lockRef.current) return;
    if (flipped.includes(card.uid) || matched.includes(card.pairId)) return;

    soundFx.playClick();
    const next = [...flipped, card.uid];
    setFlipped(next);

    if (next.length === 2) {
      lockRef.current = true;
      const first = deck.find((c) => c.uid === next[0]);
      const second = deck.find((c) => c.uid === next[1]);
      if (!first || !second) {
        setFlipped([]);
        lockRef.current = false;
        return;
      }

      const isMatch = first.pairId === second.pairId && first.kind !== second.kind;
      const newMoves = moves + 1;
      setMoves(newMoves);

      const timer = window.setTimeout(
        () => {
          if (isMatch) {
            soundFx.playCorrect();
            const newMatched = [...matched, first.pairId];
            setMatched(newMatched);
            setFlipped([]);

            if (newMatched.length === PAIRS.length) {
              const finishTimer = window.setTimeout(() => finishGame(newMoves), 450);
              timersRef.current.push(finishTimer);
            }
          } else {
            soundFx.playWrong();
            setFlipped([]);
          }
          lockRef.current = false;
        },
        isMatch ? 420 : 900
      );
      timersRef.current.push(timer);
    }
  };

  const handleStart = () => {
    soundFx.playClick();
    setStarted(true);
  };

  const handleRetry = () => {
    soundFx.playClick();
    resetGame();
  };

  const handleClose = () => {
    soundFx.playClick();
    setOverlay('none');
  };

  // Keyboard: ESC closes, Enter starts
  useEffect(() => {
    if (activeOverlay !== 'kaffee') return;

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        setOverlay('none');
      } else if (!started && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        setStarted(true);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeOverlay, started, setOverlay]);

  if (activeOverlay !== 'kaffee') return null;

  const stars = moves <= 8 ? 3 : moves <= 12 ? 2 : 1;

  return (
    <MinigameFrame
      title="Café · Speisekarten-Match"
      icon={<Coffee className="h-5 w-5" />}
      onClose={handleClose}
    >
      {!started && !finished && (
        <MinigameIntro
          portrait="/characters/Mueller.svg"
          speaker="Herr Müller"
          role="Barista im Café Gemütlichkeit"
          text="Willkommen im Café! Auf der Speisekarte steht alles auf Deutsch. Finde alle sechs Paare – deutsches Wort und englische Bedeutung. Merke dir, wo welche Karte liegt!"
          english="Welcome to the café! The menu is all in German. Find all six pairs – German word and English meaning. Remember where each card is!"
          meta={`${PAIRS.length} Paare · 12 Karten · Weniger Züge = mehr Belohnung`}
          startLabel="Speisekarte aufdecken"
          onStart={handleStart}
        />
      )}

      {started && !finished && (
        <div>
          {/* Status */}
          <div className="mb-3 flex items-center justify-between border-2 border-slate-700 bg-slate-950 p-2.5 text-[9px]">
            <span className="text-slate-400">
              Paare gefunden: <span className="text-emerald-400">{matched.length}</span> /{' '}
              {PAIRS.length}
            </span>
            <span className="text-amber-400">Züge: {moves}</span>
            <span className="text-slate-400">
              {matched.length >= PAIRS.length ? 'Fertig!' : 'Weiter aufdecken…'}
            </span>
          </div>

          {/* Card board */}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {deck.map((card) => {
              const isMatched = matched.includes(card.pairId);
              const isFaceUp = flipped.includes(card.uid) || isMatched;

              return (
                <button
                  key={card.uid}
                  type="button"
                  onClick={() => handleCard(card)}
                  disabled={isMatched}
                  aria-label={
                    isFaceUp
                      ? `${card.pair.german} / ${card.pair.english}`
                      : 'Verdeckte Karte'
                  }
                  className="relative aspect-square w-full select-none"
                  style={{ perspective: '800px' }}
                >
                  <div className={`pixel-flip-inner ${isFaceUp ? 'is-flipped' : ''}`}>
                    {/* Back of card */}
                    <div
                      className={`pixel-flip-face border-4 ${
                        isMatched ? 'border-emerald-400' : 'border-black'
                      } bg-slate-800 shadow-pixel-sm`}
                    >
                      <span className="text-lg font-bold text-slate-500">?</span>
                    </div>

                    {/* Front of card */}
                    <div
                      className={`pixel-flip-face pixel-flip-back border-4 ${
                        isMatched ? 'border-emerald-400' : 'border-amber-300'
                      } bg-amber-100 p-1 text-slate-900 shadow-pixel-sm`}
                    >
                      <span className="text-xl leading-none">{card.pair.emoji}</span>

                      {card.kind === 'de' ? (
                        <>
                          <span
                            className={`mt-1 border border-black px-1 py-0.5 text-[7px] font-bold text-white ${articleColor(
                              card.pair.article
                            )}`}
                          >
                            {card.pair.article}
                          </span>
                          <span className="mt-0.5 text-center text-[8px] font-bold leading-tight">
                            {card.pair.german}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="mt-1 text-[7px] font-bold uppercase tracking-wider text-slate-500">
                            English
                          </span>
                          <span className="mt-0.5 text-center text-[8px] font-bold leading-tight">
                            {card.pair.english}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-center gap-1 border-2 border-slate-700 bg-slate-950 px-2 py-1.5 text-[8px] text-slate-400">
            <span className="text-sky-400">■ der</span>
            <span className="ml-2 text-rose-400">■ die</span>
            <span className="ml-2 text-emerald-400">■ das</span>
            <span className="ml-2">— Kartenfarbe zeigt den Artikel</span>
          </div>
        </div>
      )}

      {finished && (
        <div className="space-y-4 text-center">
          <div className="inline-flex border-4 border-black bg-amber-400 p-3 text-black shadow-pixel">
            <Award className="h-10 w-10" />
          </div>

          <div>
            <h3 className="text-sm font-bold text-amber-300">Speisekarte gemeistert!</h3>
            <p className="mt-1 text-[10px] text-slate-300">
              Alle {PAIRS.length} Paare in {moves} Zügen gefunden.
            </p>
            <div className="mt-2 flex items-center justify-center gap-1">
              {[1, 2, 3].map((star) => (
                <Star
                  key={star}
                  className={`h-6 w-6 ${
                    star <= stars ? 'fill-amber-400 text-amber-400' : 'text-slate-700'
                  }`}
                />
              ))}
            </div>
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
            <div className="border-t border-slate-700 pt-1.5 text-left text-[8px] leading-relaxed text-slate-400">
              Quest „Der perfekte Kaffee“ aktualisiert. Herr Müller hebt seinen Kaffee!
            </div>
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
        [↑↓←→] Karte wählen · [ENTER] Aufdecken · [ESC] Schließen
      </div>
    </MinigameFrame>
  );
}
