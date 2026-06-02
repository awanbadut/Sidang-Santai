import React, { useState, useEffect } from 'react';
import { Flashcard } from '../lib/gemini';
import { QuestionEntry, SimulationType } from '../types';
import { PanelistId } from '../components/PanelistAvatar';
import PanelistAvatar from '../components/PanelistAvatar';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, CheckCircle2, XCircle, ChevronRight, 
  Lightbulb, Loader2, Clock
} from 'lucide-react';
import { cn } from '../lib/utils';

interface FlashcardFlowProps {
  mode: SimulationType;
  flashcards: Flashcard[];
  onFinish: (answers: QuestionEntry[]) => void;
  onCancel: () => void;
}

const SPRING_BOUNCY = { type: 'spring', damping: 15, stiffness: 250 } as const;

export default function FlashcardFlow({ mode, flashcards, onFinish, onCancel }: FlashcardFlowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [sessionAnswers, setSessionAnswers] = useState<QuestionEntry[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(120); // 2 menit = 120 detik

  const currentCard = flashcards[currentIndex];
  const isSidang = mode === SimulationType.FLASHCARD_SIDANG;
  const panelistId: PanelistId = isSidang ? 'metod' : 'shinta';

  const handleNext = () => {
    if (currentIndex + 1 < flashcards.length) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      onFinish(sessionAnswers);
    }
  };

  const handleTimeOut = () => {
    if (isAnswered) return;
    setSelectedOption(null);
    setIsAnswered(true);

    const answerEntry: QuestionEntry = {
      question: currentCard.question,
      answer: "Tidak menjawab (Waktu Habis) ⏰",
      feedback: `Waktu Anda habis untuk menjawab pertanyaan ini! ${currentCard.feedback}`,
      score: 0,
      suggestedAnswer: `Jawaban Benar: ${currentCard.options[currentCard.correctOptionIndex]}`,
      panelistId: panelistId,
      isFollowUp: false
    };

    setSessionAnswers(prev => [...prev, answerEntry]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // 1. Timer Auto-Advance setelah menjawab
  useEffect(() => {
    if (!isAnswered) {
      setTimeLeft(null);
      return;
    }

    setTimeLeft(4); // 4 detik hitung mundur auto-advance

    const countdownInterval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    const autoNextTimeout = setTimeout(() => {
      handleNext();
    }, 4000);

    return () => {
      clearInterval(countdownInterval);
      clearTimeout(autoNextTimeout);
    };
  }, [isAnswered, currentIndex]);

  // 2. Timer 120 detik per soal
  useEffect(() => {
    if (isAnswered) return;

    setQuestionTimeLeft(120);

    const timer = setInterval(() => {
      setQuestionTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentIndex, isAnswered]);

  if (!flashcards || flashcards.length === 0) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        <p className="text-slate-500 font-bold">Mempersiapkan kartu belajar untukmu... 🧸</p>
      </div>
    );
  }

  const handleSelectOption = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
    setIsAnswered(true);

    const isCorrect = index === currentCard.correctOptionIndex;
    const score = isCorrect ? 100 : 0;

    const answerEntry: QuestionEntry = {
      question: currentCard.question,
      answer: currentCard.options[index],
      feedback: currentCard.feedback,
      score: score,
      suggestedAnswer: `Jawaban Benar: ${currentCard.options[currentCard.correctOptionIndex]}`,
      panelistId: panelistId,
      isFollowUp: false
    };

    setSessionAnswers(prev => [...prev, answerEntry]);
  };

  const scoreCount = sessionAnswers.filter(a => a.score === 100).length;

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#fafaf9] max-w-4xl mx-auto w-full p-4 md:p-8 space-y-6 scrollbar-thin">
      
      {/* ── Progress & Status ── */}
      <div className="flex items-center justify-between bg-white px-5 py-4 rounded-3xl border-[3px] border-purple-100/70 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-500">
            <Sparkles size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none block mb-0.5">Kuis Flashcard</span>
            <span className="text-sm font-black text-purple-500">Kartu {currentIndex + 1} dari {flashcards.length}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col text-right">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none block mb-0.5">Benar</span>
            <span className="text-sm font-black text-emerald-500">{scoreCount} / {currentIndex + (isAnswered ? 1 : 0)}</span>
          </div>
          <div className="w-px h-8 bg-slate-100" />
          
          {/* ⏰ Timer per Soal (120 Detik) */}
          <div className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border-2 font-black text-sm transition-all",
            isAnswered 
              ? "bg-slate-50 border-slate-200 text-slate-400" 
              : questionTimeLeft <= 15
                ? "bg-rose-50 border-rose-200 text-rose-500 animate-pulse"
                : "bg-amber-50 border-amber-200 text-amber-600"
          )}>
            <Clock size={16} />
            <span>{isAnswered ? "Selesai ✨" : formatTime(questionTimeLeft)}</span>
          </div>
          
          <div className="w-px h-8 bg-slate-100" />
          <div className="flex flex-col text-right">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none block mb-0.5">Skor</span>
            <span className="text-sm font-black text-amber-500">{sessionAnswers.reduce((acc, curr) => acc + (curr.score === 100 ? 10 : 0), 0)} pts</span>
          </div>
        </div>
      </div>

      {/* ── Progress Bar ── */}
      <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden border-[2px] border-white shadow-inner shrink-0">
        <div 
          className="bg-gradient-to-r from-pink-400 via-purple-400 to-sky-400 h-full transition-all duration-300 rounded-full"
          style={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
        />
      </div>

      {/* ── Flashcard Main Card ── */}
      <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -50, scale: 0.95 }}
            transition={SPRING_BOUNCY}
            className="bg-white border-[4px] border-purple-100 rounded-[2.5rem] p-6 md:p-8 shadow-sm flex flex-col gap-6"
          >
            {/* Question Header */}
            <div className="flex gap-4 items-start">
              <PanelistAvatar id={panelistId} size="md" />
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md">
                  {isSidang ? 'Dosen Penguji' : 'HRD Rekruter'}
                </span>
                <h3 className="text-base md:text-lg font-black text-slate-800 leading-relaxed mt-1">
                  {currentCard.question}
                </h3>
              </div>
            </div>

            {/* Options List */}
            <div className="grid grid-cols-1 gap-3.5">
              {currentCard.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrectOption = idx === currentCard.correctOptionIndex;
                
                const optionLetter = ['A', 'B', 'C'][idx];
                const cleanOption = option.replace(/^[A-C]\.\s*/i, '');
                
                let btnStyle = "border-purple-100 bg-white hover:border-purple-300 hover:bg-purple-50/50 text-slate-700 shadow-[0_4px_0_0_#f3e8ff]";
                let iconEl = null;

                if (isAnswered) {
                  if (isCorrectOption) {
                    btnStyle = "border-emerald-300 bg-emerald-50 text-emerald-800 shadow-[0_4px_0_0_#d1fae5] scale-[1.01]";
                    iconEl = <CheckCircle2 size={18} className="text-emerald-500 shrink-0" strokeWidth={3} />;
                  } else if (isSelected) {
                    btnStyle = "border-rose-300 bg-rose-50 text-rose-800 shadow-[0_4px_0_0_#ffe4e6]";
                    iconEl = <XCircle size={18} className="text-rose-500 shrink-0" strokeWidth={3} />;
                  } else {
                    btnStyle = "border-slate-100 bg-slate-50/50 text-slate-400 opacity-60 shadow-none pointer-events-none";
                  }
                }

                return (
                  <motion.button
                    key={idx}
                    disabled={isAnswered}
                    onClick={() => handleSelectOption(idx)}
                    whileHover={!isAnswered ? { y: -2, scale: 1.01 } : {}}
                    whileTap={!isAnswered ? { scale: 0.98 } : {}}
                    className={cn(
                      "w-full text-left p-4.5 rounded-2xl border-[3px] font-bold text-sm md:text-base flex items-center justify-between gap-4 transition-all duration-150 active:translate-y-1 active:shadow-none group",
                      btnStyle
                    )}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm border-2 shrink-0 transition-all",
                        isAnswered
                          ? isCorrectOption
                            ? "bg-emerald-200 border-emerald-400 text-emerald-800"
                            : isSelected
                              ? "bg-rose-200 border-rose-400 text-rose-800"
                              : "bg-slate-100 border-slate-200 text-slate-400"
                          : "bg-purple-100 border-purple-200 text-purple-600 group-hover:bg-purple-200 group-hover:border-purple-300"
                      )}>
                        {optionLetter}
                      </div>
                      <span className="leading-relaxed">{cleanOption}</span>
                    </div>
                    {iconEl}
                  </motion.button>
                );
              })}
            </div>

            {/* Explanation / Feedback Banner */}
            <AnimatePresence>
              {isAnswered && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "p-5 rounded-2xl border-[3px] flex items-start gap-3.5",
                    selectedOption === currentCard.correctOptionIndex
                      ? "bg-emerald-50/50 border-emerald-200 text-emerald-800"
                      : "bg-rose-50/50 border-rose-200 text-rose-800"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-xl shrink-0",
                    selectedOption === currentCard.correctOptionIndex ? "bg-emerald-100" : "bg-rose-100"
                  )}>
                    <Lightbulb size={20} className={cn(
                      selectedOption === currentCard.correctOptionIndex ? "text-emerald-600" : "text-rose-600"
                    )} />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider block">
                      {selectedOption === currentCard.correctOptionIndex 
                        ? "Jawaban Kamu Benar! 🎉" 
                        : selectedOption === null
                          ? "Waktu Kamu Habis! ⏰"
                          : "Kurang Tepat, Tapi Jangan Menyerah! 🧸"}
                    </span>
                    <p className="text-xs font-bold leading-relaxed">{currentCard.feedback}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Button & Auto-Advance Progress */}
            {isAnswered && (
              <div className="space-y-3 mt-2">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">
                  <span>Auto-advance</span>
                  <span>Berikutnya dalam {timeLeft}s</span>
                </div>
                
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-white shadow-inner">
                  <motion.div
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: 4, ease: 'linear' }}
                    className={cn(
                      "h-full rounded-full bg-gradient-to-r",
                      selectedOption === currentCard.correctOptionIndex
                        ? "from-emerald-400 to-teal-400"
                        : "from-purple-400 to-indigo-400"
                    )}
                  />
                </div>

                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={handleNext}
                  className={cn(
                    "w-full py-4 rounded-2xl font-black text-white text-base md:text-lg flex items-center justify-center gap-2 border-[3px] transition-all cursor-pointer active:translate-y-1 active:shadow-none",
                    selectedOption === currentCard.correctOptionIndex
                      ? "bg-emerald-400 border-emerald-500 shadow-[0_5px_0_0_#059669] hover:bg-emerald-500"
                      : "bg-purple-400 border-purple-500 shadow-[0_5px_0_0_#7c3aed] hover:bg-purple-500"
                  )}
                >
                  {currentIndex + 1 === flashcards.length ? 'Lihat Hasil Rapor! 🎓' : 'Pertanyaan Berikutnya 🐾'}
                  <ChevronRight size={18} strokeWidth={3} />
                </motion.button>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}
