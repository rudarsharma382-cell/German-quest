'use client';

import React, { useEffect, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import rathausData from '@/data/rathaus.json';
import PixelButton from '@/components/ui/PixelButton';
import { MinigameFrame, MinigameIntro } from '@/components/minigames/MinigameFrame';
import { soundFx } from '@/utils/audio';
import {
  Landmark,
  Map,
  Music,
  MessageSquare,
  Timer,
  CheckCircle2,
  XCircle,
  Award,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  Lightbulb,
} from 'lucide-react';

interface Question {
  id: number;
  category: string;
  question: string;
  english: string;
  options: string[];
  correct: number;
  fact: string;
}

const QUESTIONS = (rathausData as unknown as { questions: Question[] }).questions;
const ROUND_COUNT = QUESTIONS.length;
const TIME_LIMIT = 20;

const CATEGORY_STYLES: Record<string, { badge: string; icon: React.ReactNode }> = {
  Geografie: {
    badge: 'bg-sky-500 text-white',
    icon: <Map className="h-3 w-3" />,
  },
  Geschichte: {
    badge: 'bg-amber-600 text-white',
    icon: <Landmark className="h-3 w-3" />,
  },
  Kultur: {
    badge: 'bg-rose-600 text-white',
    icon: <Music className="h-3 w-3" />,
  },
  Sprache: {
    badge: 'bg-emerald-600 text-white',
    icon: <MessageSquare className="h-3 w-3" />,
  },
};

export default function BuergerQuiz() {
  const { activeOverlay, setOverlay, addXP, addCoins, updateQuestProgress } = useGameStore();

  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [finished, setFinished] = useState(false);
  const [earnings, setEarnings] = useState({ xp: 0, coins: 0 });

  const question = QUESTIONS[index];
  const categoryStyle = CATEGORY_STYLES[question?.category] ?? CATEGORY_STYLES.Geografie;

  useEffect(() => {
    if (activeOverlay === 'buergerquiz') {
      setStarted(false);
      setIndex(0);
      setSelected(null);
      setCorrect(0);
      setScore(0);
      setStreak(0);
      setBestStreak(0);
      setTimeLeft(TIME_LIMIT);
      setFinished(false);
      setEarnings({ xp: 0, coins: 0 });
    }
  }, [activeOverlay]);

  const handleAnswer = (choice: number) => {
    if (selected !== null || finished) return;

    setSelected(choice);

    if (choice === question.correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setBestStreak((prev) => Math.max(prev, newStreak));
      setCorrect((prev) => prev + 1);
      setScore((prev) => prev + 20 + (newStreak - 1) * 5);
      soundFx.playCorrect();
    } else {
      setStreak(0);
      soundFx.playWrong();
    }
  };

  const finishGame = () => {
    const xpEarned = 30 + correct * 10;
    const coinsEarned = 15 + correct * 5;

    addXP(xpEarned);
    addCoins(coinsEarned);
    if (correct >= 6) updateQuestProgress('rathaus_quest', 1);

    soundFx.playCoin();
    setEarnings({ xp: xpEarned, coins: coinsEarned });
    setFinished(true);
  };

  const handleNext = () => {
    if (selected === null) return;
    soundFx.playClick();

    if (index + 1 < ROUND_COUNT) {
      setIndex((prev) => prev + 1);
      setSelected(null);
      setTimeLeft(TIME_LIMIT);
    } else {
      finishGame();
    }
  };

  const handleStart = () => {
    soundFx.playClick();
    setTimeLeft(TIME_LIMIT);
    setStarted(true);
  };

  const handleRetry = () => {
    soundFx.playClick();
    setIndex(0);
    setSelected(null);
    setCorrect(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setTimeLeft(TIME_LIMIT);
    setFinished(false);
    setEarnings({ xp: 0, coins: 0 });
  };

  const handleClose = () => {
    soundFx.playClick();
    setOverlay('none');
  };

  // Countdown timer
  useEffect(() => {
    if (activeOverlay !== 'buergerquiz' || !started || finished || selected !== null) return;

    if (timeLeft <= 0) {
      handleAnswer(-1);
      return;
    }

    const timer = window.setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOverlay, started, finished, selected, timeLeft, index]);

  // Keyboard: 1-3 answer, Enter/Space next, ESC close
  useEffect(() => {
    if (activeOverlay !== 'buergerquiz') return;

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

      if (selected === null) {
        const num = parseInt(e.key, 10);
        if (!isNaN(num) && num >= 1 && num <= question.options.length) {
          e.preventDefault();
          handleAnswer(num - 1);
        }
      } else if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOverlay, started, finished, selected, index, timeLeft]);

  if (activeOverlay !== 'buergerquiz') return null;

  const timerPercent = Math.max(0, (timeLeft / TIME_LIMIT) * 100);
  const timerColor =
    timeLeft > 10 ? 'bg-emerald-500' : timeLeft > 5 ? 'bg-amber-400' : 'bg-rose-500';

  return (
    <MinigameFrame
      title="Rathaus · Bürger-Quiz"
      icon={<Landmark className="h-5 w-5" />}
      onClose={handleClose}
    >
      {!started && !finished && (
        <MinigameIntro
          portrait="/characters/Schmidt.svg"
          speaker="Bürgermeister Schmidt"
          role="Rathaus Deutschstadt"
          text="Willkommen zur Bürgerprüfung! Beantworte acht Fragen über Deutschland: Geografie, Geschichte, Kultur und Sprache. Du hast 20 Sekunden pro Frage – und für jede richtige Antwort in Folge gibt es Bonuspunkte!"
          english="Welcome to the citizenship test! Answer eight questions about Germany: geography, history, culture and language. You have 20 seconds per question – consecutive correct answers earn bonus points!"
          meta={`${ROUND_COUNT} Fragen · 20 Sekunden · 6 richtige = Bürger-Urkunde`}
          startLabel="Prüfung beginnen"
          onStart={handleStart}
        />
      )}

      {started && !finished && question && (
        <div>
          {/* Status */}
          <div className="mb-3 flex items-center justify-between border-2 border-slate-700 bg-slate-950 p-2.5 text-[9px]">
            <span className="text-slate-400">
              Frage {index + 1} / {ROUND_COUNT}
            </span>
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> {correct} richtig
            </span>
            <span className="font-bold text-amber-400">{score} Pkt</span>
          </div>

          {/* Timer */}
          <div className="mb-3 flex items-center gap-2">
            <Timer className={`h-4 w-4 ${timeLeft <= 5 ? 'text-rose-400' : 'text-slate-400'}`} />
            <div className="h-3 flex-1 border-2 border-black bg-slate-950 p-0.5">
              <div
                className={`h-full transition-all duration-1000 ${timerColor}`}
                style={{ width: `${timerPercent}%` }}
              />
            </div>
            <span
              className={`w-8 text-right text-[10px] font-bold ${
                timeLeft <= 5 ? 'text-rose-400' : 'text-slate-300'
              }`}
            >
              {timeLeft}s
            </span>
          </div>

          {/* Category + question card */}
          <div className="border-4 border-black bg-white p-3.5 text-slate-900 shadow-pixel">
            <div className="mb-2 flex items-center justify-between">
              <span
                className={`inline-flex items-center gap-1 border-2 border-black px-1.5 py-0.5 text-[8px] font-bold ${categoryStyle.badge}`}
              >
                {categoryStyle.icon}
                {question.category}
              </span>
              {streak >= 2 && (
                <span className="border-2 border-black bg-amber-300 px-1.5 py-0.5 text-[8px] font-bold text-black">
                  {streak}× SERIE!
                </span>
              )}
            </div>
            <p className="text-[11px] font-bold leading-relaxed">{question.question}</p>
            <p className="mt-1.5 border-t-2 border-dashed border-slate-300 pt-1.5 text-[8px] italic text-slate-500">
              {question.english}
            </p>
          </div>

          {/* Answers */}
          <div className="mt-4 space-y-2">
            {question.options.map((option, optionIndex) => {
              const revealed = selected !== null;
              const isCorrect = optionIndex === question.correct;
              const isSelected = selected === optionIndex;

              let tone = 'bg-slate-800 border-black hover:bg-slate-700 hover:border-amber-400';
              if (revealed && isCorrect) tone = 'bg-emerald-700 border-emerald-300';
              else if (revealed && isSelected) tone = 'bg-rose-800 border-rose-300';
              else if (revealed) tone = 'bg-slate-800 border-black opacity-50';

              return (
                <button
                  key={option}
                  type="button"
                  disabled={revealed}
                  onClick={() => handleAnswer(optionIndex)}
                  className={`w-full border-4 p-2.5 text-left transition-colors ${tone}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center border-2 border-black bg-slate-950 text-[9px] font-bold text-amber-300">
                      {optionIndex + 1}
                    </span>
                    <span className="min-w-0 flex-1 text-[10px] font-bold">{option}</span>
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

          {/* Explanation */}
          {selected !== null && (
            <div className="mt-4 border-4 border-black bg-slate-950 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[9px] font-bold text-amber-400">
                <Lightbulb className="h-3.5 w-3.5" />
                {selected === question.correct ? 'RICHTIG!' : 'WUSSTEST DU?'}
              </div>
              <p className="text-[9px] leading-relaxed text-slate-300">{question.fact}</p>
              <div className="mt-3 flex justify-end">
                <PixelButton variant="amber" size="md" onClick={handleNext}>
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
              {correct >= 6 ? 'Bürgerprüfung bestanden!' : 'Prüfung beendet'}
            </h3>
            <p className="mt-1 text-[10px] text-slate-300">
              {correct} von {ROUND_COUNT} Fragen richtig · {score} Punkte
            </p>
            <p className="mt-1 text-[9px] text-slate-400">
              Beste Serie: {bestStreak} richtige Antworten in Folge
            </p>
          </div>

          {correct >= 6 && (
            <div className="mx-auto max-w-sm border-4 border-black bg-amber-200 p-4 text-left text-slate-900 shadow-pixel">
              <div className="flex items-center justify-between border-b-2 border-dashed border-slate-700 pb-2 text-[10px] font-bold">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" /> BÜRGER-URKUNDE
                </span>
                <span>DEUTSCHSTADT</span>
              </div>
              <p className="py-3 text-center text-[11px] font-bold leading-relaxed">
                Hiermit wird bestätigt, dass du dich in Deutschland auskennst und ein
                echter Bürger von Deutschstadt bist!
              </p>
              <div className="flex items-center justify-between border-t-2 border-dashed border-slate-700 pt-2 text-[8px] font-bold">
                <span>BÜRGERMEISTER SCHMIDT</span>
                <span>GEPRÜFT ✓</span>
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
            {correct >= 6 && (
              <div className="border-t border-slate-700 pt-1.5 text-left text-[8px] leading-relaxed text-slate-400">
                Quest „Die Bürgerprüfung“ aktualisiert. Das Rathaus kennt dich jetzt!
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
        [1–3] Antwort wählen · [ENTER/SPACE] Weiter · [ESC] Schließen
      </div>
    </MinigameFrame>
  );
}
