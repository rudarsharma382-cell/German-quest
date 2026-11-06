'use client';

import React, { useEffect, useState } from 'react';
import { useGameStore, InventoryItem } from '@/store/useGameStore';
import bahnhofData from '@/data/bahnhof.json';
import PixelButton from '@/components/ui/PixelButton';
import { soundFx } from '@/utils/audio';
import {
  Train,
  Ticket,
  ArrowRight,
  RotateCcw,
  X,
  CheckCircle2,
  XCircle,
  Award,
  MapPin,
} from 'lucide-react';

interface Departure {
  train: string;
  destination: string;
  platform: number;
  time: string;
}

interface RoundOption {
  id: string;
  de: string;
  en: string;
  correct: boolean;
}

interface Round {
  id: number;
  clerk: string;
  clerkEn: string;
  boardRef?: string;
  options: RoundOption[];
  explanation: string;
}

const DEPARTURES = (bahnhofData as { departures: Departure[] }).departures;
const ROUNDS = (bahnhofData as unknown as { rounds: Round[] }).rounds;

const FAHRKARTE: InventoryItem = {
  id: 'fahrkarte',
  name: 'Fahrkarte',
  article: 'die',
  plural: 'die Fahrkarten',
  translation: 'ticket',
  description: 'Eine Fahrkarte von Deutschstadt nach Berlin. Dein Ticket in die deutsche Sprache!',
  cost: 0,
  icon: 'Ticket',
  quantity: 1,
};

function DepartureBoard({ highlight }: { highlight?: string }) {
  return (
    <div className="border-4 border-black bg-slate-950 p-2.5 shadow-pixel-inset">
      <div className="mb-1.5 flex items-center justify-between text-[9px] tracking-wider text-amber-500">
        <span className="flex items-center gap-1.5 font-bold">
          <Train className="h-3.5 w-3.5" /> ABFAHRTSTAFEL
        </span>
        <span className="text-[8px] text-slate-500">DEUTSCHSTADT HBF</span>
      </div>

      <div className="grid grid-cols-[1.1fr_1.25fr_0.6fr_0.75fr] gap-x-2 gap-y-1 text-[9px] md:text-[10px]">
        <div className="text-[7px] uppercase tracking-wider text-slate-500">Zug</div>
        <div className="text-[7px] uppercase tracking-wider text-slate-500">Ziel</div>
        <div className="text-[7px] uppercase tracking-wider text-slate-500">Gleis</div>
        <div className="text-[7px] uppercase tracking-wider text-slate-500">Abfahrt</div>

        {DEPARTURES.map((dep) => {
          const active = highlight === dep.train;
          const cell = active
            ? 'bg-amber-400 text-black px-1 py-0.5'
            : 'text-amber-300 px-1 py-0.5';
          return (
            <React.Fragment key={dep.train}>
              <div className={cell}>{dep.train}</div>
              <div className={cell}>{dep.destination}</div>
              <div className={cell}>{dep.platform}</div>
              <div className={cell}>{dep.time}</div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default function FahrkartenSchalter() {
  const { activeOverlay, setOverlay, addXP, addCoins, addItem, updateQuestProgress } =
    useGameStore();

  const [started, setStarted] = useState(false);
  const [roundIndex, setRoundIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [earnings, setEarnings] = useState({ xp: 0, coins: 0, ticket: false });

  // Fresh session every time the player opens the counter
  useEffect(() => {
    if (activeOverlay === 'bahnhof') {
      setStarted(false);
      setRoundIndex(0);
      setSelectedOption(null);
      setCorrectCount(0);
      setFinished(false);
      setEarnings({ xp: 0, coins: 0, ticket: false });
    }
  }, [activeOverlay]);

  const round = ROUNDS[roundIndex];

  const handleStart = () => {
    soundFx.playClick();
    setStarted(true);
  };

  const handleAnswer = (index: number) => {
    if (selectedOption !== null || !round) return;

    const option = round.options[index];
    setSelectedOption(index);

    if (option.correct) {
      setCorrectCount((prev) => prev + 1);
      soundFx.playCorrect();
    } else {
      soundFx.playWrong();
    }
  };

  const finishGame = () => {
    const xpEarned = 20 + correctCount * 15;
    const coinsEarned = 10 + correctCount * 5;
    const ticketEarned = correctCount >= 4;

    addXP(xpEarned);
    addCoins(coinsEarned);

    if (ticketEarned) {
      addItem({ ...FAHRKARTE, quantity: 1 });
      updateQuestProgress('bahnhof_quest', 1);
    }

    soundFx.playCoin();
    setEarnings({ xp: xpEarned, coins: coinsEarned, ticket: ticketEarned });
    setFinished(true);
  };

  const handleNext = () => {
    if (selectedOption === null) return;
    soundFx.playClick();

    if (roundIndex + 1 < ROUNDS.length) {
      setRoundIndex((prev) => prev + 1);
      setSelectedOption(null);
    } else {
      finishGame();
    }
  };

  const handleRetry = () => {
    soundFx.playClick();
    setRoundIndex(0);
    setSelectedOption(null);
    setCorrectCount(0);
    setFinished(false);
    setEarnings({ xp: 0, coins: 0, ticket: false });
  };

  const handleClose = () => {
    soundFx.playClick();
    setOverlay('none');
  };

  // Keyboard controls: 1-3 selects a reply, Enter/Space continues, ESC closes
  useEffect(() => {
    if (activeOverlay !== 'bahnhof') return;

    const handleKeyDown = (e: KeyboardEvent) => {
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

      if (selectedOption === null) {
        const num = parseInt(e.key, 10);
        if (!isNaN(num) && num >= 1 && num <= (round?.options.length || 0)) {
          e.preventDefault();
          handleAnswer(num - 1);
        }
      } else if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOverlay, started, finished, selectedOption, roundIndex, correctCount]);

  if (activeOverlay !== 'bahnhof') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 font-pixel select-none backdrop-blur-sm">
      <div className="relative max-h-[94vh] w-full max-w-2xl overflow-y-auto border-4 border-black bg-slate-900 text-white shadow-pixel-lg">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-4 border-black bg-amber-400 px-4 py-2.5 text-black">
          <div className="flex items-center gap-2">
            <Train className="h-5 w-5" />
            <span className="text-xs font-bold tracking-wide md:text-sm">
              Bahnhof · Fahrkarten-Schalter
            </span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="border-2 border-black bg-rose-500 p-1 text-white hover:bg-rose-600 active:translate-y-0.5"
            title="Schließen [ESC]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 md:p-5">
          <DepartureBoard highlight={round?.boardRef} />

          {/* Intro */}
          {!started && !finished && (
            <div className="mt-4 border-4 border-black bg-slate-800 p-4 shadow-pixel">
              <div className="flex items-start gap-3">
                <div className="h-20 w-20 shrink-0 overflow-hidden border-4 border-black bg-slate-950">
                  <img
                    src="/characters/Braun.svg"
                    alt="Herr Braun"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 text-[9px] font-bold text-amber-400">
                    HERR BRAUN (BAHNHOFSVORSTEHER)
                  </div>
                  <p className="text-[10px] leading-relaxed text-slate-200">
                    Guten Tag! Willkommen am Fahrkarten-Schalter von Deutschstadt. Ich
                    stelle dir sechs Fragen zu deiner Reise. Wähle immer die passende
                    deutsche Antwort.
                  </p>
                  <p className="mt-2 text-[8px] italic text-slate-400">
                    Good day! Welcome to the ticket counter. Answer six travel questions
                    to earn your ticket.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-col items-center gap-3">
                <PixelButton variant="amber" size="lg" onClick={handleStart}>
                  <span className="flex items-center gap-2">
                    <Ticket className="h-4 w-4" />
                    Am Schalter klingeln
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </PixelButton>
                <div className="text-center text-[8px] text-slate-400">
                  6 Fragen · 4 richtige Antworten = Fahrkarte
                </div>
              </div>
            </div>
          )}

          {/* Quiz rounds */}
          {started && !finished && round && (
            <div className="mt-4">
              {/* Status bar */}
              <div className="mb-3 flex items-center justify-between border-2 border-slate-700 bg-slate-950 p-2.5 text-[9px]">
                <span className="text-slate-400">
                  Frage {roundIndex + 1} / {ROUNDS.length}
                </span>
                <span className="text-emerald-400">{correctCount} richtig</span>
                <span className="font-bold text-amber-400">{correctCount * 20} Pkt</span>
              </div>

              {/* Clerk speech */}
              <div className="flex items-start gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden border-4 border-black bg-slate-950 md:h-20 md:w-20">
                  <img
                    src="/characters/Braun.svg"
                    alt="Herr Braun"
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1 border-4 border-black bg-white p-3 text-slate-900 shadow-pixel">
                  <div className="mb-1 flex items-center gap-1 text-[9px] font-bold text-amber-700">
                    <Train className="h-3 w-3" /> HERR BRAUN
                  </div>
                  <p className="text-[11px] leading-relaxed">{round.clerk}</p>
                  <p className="mt-2 border-t-2 border-dashed border-slate-300 pt-1.5 text-[8px] italic text-slate-500">
                    {round.clerkEn}
                  </p>
                  {round.boardRef && (
                    <div className="mt-2 inline-flex items-center gap-1 border-2 border-black bg-amber-300 px-1.5 py-0.5 text-[8px] font-bold text-black">
                      <MapPin className="h-3 w-3" /> Tipp: Schau auf die Abfahrtstafel
                    </div>
                  )}
                </div>
              </div>

              {/* Reply options */}
              <div className="mt-4 space-y-2">
                {round.options.map((option, index) => {
                  const revealed = selectedOption !== null;
                  const isSelected = selectedOption === index;
                  const isCorrect = option.correct;

                  let tone = 'bg-slate-800 border-black hover:bg-slate-700';
                  if (revealed && isCorrect) {
                    tone = 'bg-emerald-700 border-emerald-300';
                  } else if (revealed && isSelected && !isCorrect) {
                    tone = 'bg-rose-800 border-rose-300';
                  } else if (revealed) {
                    tone = 'bg-slate-800 border-black opacity-50';
                  }

                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={revealed}
                      onClick={() => handleAnswer(index)}
                      className={`w-full border-4 p-2.5 text-left transition-colors ${tone} ${
                        !revealed ? 'hover:border-amber-400' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center border-2 border-black bg-slate-950 text-[9px] font-bold text-amber-300">
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[10px] font-bold leading-relaxed md:text-[11px]">
                            {option.de}
                          </span>
                          <span className="mt-0.5 block text-[8px] italic text-slate-300">
                            {option.en}
                          </span>
                        </span>
                        {revealed && isCorrect && (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />
                        )}
                        {revealed && isSelected && !isCorrect && (
                          <XCircle className="h-5 w-5 shrink-0 text-rose-300" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Explanation + continue */}
              {selectedOption !== null && (
                <div className="mt-4 border-4 border-black bg-slate-950 p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-[9px] font-bold text-amber-400">
                    <Ticket className="h-3 w-3" /> GRAMMATIK-TIPP
                  </div>
                  <p className="text-[9px] leading-relaxed text-slate-300">
                    {round.explanation}
                  </p>
                  <div className="mt-3 flex justify-end">
                    <PixelButton variant="amber" size="md" onClick={handleNext}>
                      <span className="flex items-center gap-2">
                        {roundIndex + 1 === ROUNDS.length
                          ? 'Fahrkarte abschließen'
                          : 'Weiter'}
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </PixelButton>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {finished && (
            <div className="mt-4 space-y-4 text-center">
              <div className="inline-flex border-4 border-black bg-amber-400 p-3 text-black shadow-pixel">
                <Award className="h-10 w-10" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-amber-300">
                  {earnings.ticket ? 'Fahrkarte gekauft!' : 'Fast geschafft!'}
                </h3>
                <p className="mt-1 text-[10px] text-slate-300">
                  {correctCount} von {ROUNDS.length} Antworten richtig.
                </p>
              </div>

              {earnings.ticket && (
                <div className="mx-auto max-w-sm rotate-[-1deg] border-4 border-black bg-amber-300 p-3 text-left text-slate-900 shadow-pixel">
                  <div className="flex items-center justify-between border-b-2 border-dashed border-slate-700 pb-1.5 text-[10px] font-bold">
                    <span className="flex items-center gap-1.5">
                      <Ticket className="h-4 w-4" /> FAHRKARTE
                    </span>
                    <span>2. KLASSE</span>
                  </div>
                  <div className="flex items-center justify-between py-2 text-[11px] font-bold">
                    <span>DEUTSCHSTADT</span>
                    <ArrowRight className="h-4 w-4" />
                    <span>BERLIN</span>
                  </div>
                  <div className="flex items-center justify-between border-t-2 border-dashed border-slate-700 pt-1.5 text-[8px] font-bold">
                    <span>GLEIS 3</span>
                    <span>14:30 UHR</span>
                    <span>GÜLTIG HEUTE</span>
                  </div>
                </div>
              )}

              <div className="mx-auto max-w-xs space-y-2 border-2 border-slate-700 bg-slate-950 p-4 text-[10px]">
                <div className="flex justify-between text-amber-400">
                  <span>+ XP:</span>
                  <span className="font-bold">+{earnings.xp} XP</span>
                </div>
                <div className="flex justify-between text-yellow-400">
                  <span>+ Münzen:</span>
                  <span className="font-bold">+{earnings.coins} G</span>
                </div>
                {earnings.ticket && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Beute:</span>
                    <span className="font-bold">Die Fahrkarte</span>
                  </div>
                )}
                {earnings.ticket && (
                  <div className="border-t border-slate-700 pt-1.5 text-[8px] text-slate-400">
                    Quest „Die Reise beginnt“ aktualisiert – prüfe deinen Rucksack [I]!
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
                    Zurück zum Bahnhof <ArrowRight className="h-4 w-4" />
                  </span>
                </PixelButton>
              </div>
            </div>
          )}

          {/* Control hint */}
          <div className="mt-4 border-t-2 border-slate-700 pt-2 text-center text-[8px] text-slate-500">
            [1–3] Antwort wählen · [ENTER/SPACE] Weiter · [ESC] Schließen
          </div>
        </div>
      </div>
    </div>
  );
}
