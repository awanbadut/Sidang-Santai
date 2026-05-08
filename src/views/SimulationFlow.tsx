/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useRef, useEffect } from 'react';
import { SimulationType, SimulationStatus, QuestionEntry } from '../types';
import { User } from 'firebase/auth';
import { db, serverTimestamp } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { auth as firebaseAuth } from '../lib/firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: firebaseAuth.currentUser?.uid,
      email: firebaseAuth.currentUser?.email,
      emailVerified: firebaseAuth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
import { extractTextFromPDF } from '../lib/pdf';
import { getNextTurn, getSummary } from '../lib/gemini';
import { 
  Upload, Send, ArrowLeft, CheckCircle2, Loader2, Zap, 
  Download, FileText, CircleStop, AlertCircle, Bot, Sparkles, MessageSquare, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import Markdown from 'react-markdown';
import { toPng } from 'html-to-image';
import PanelistAvatar, { PANELISTS, PanelistId } from '../components/PanelistAvatar';
import { ScoreCardTemplate } from '../components/ScoreCardTemplate';
import LiveMeetingFlow from './LiveMeetingFlow';

interface SimulationFlowProps {
  mode: SimulationType;
  onCancel: () => void;
  user: User;
}

type Step = 'upload' | 'simulating' | 'results';

// Animasi bouncy yang gemas
const SPRING_BOUNCY = { type: 'spring', damping: 15, stiffness: 250 } as const;

export default function SimulationFlow({ mode, onCancel, user }: SimulationFlowProps) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [jd, setJd] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [docText, setDocText] = useState('');
  const [currentTurn, setCurrentTurn] = useState<any>(null);
  const [answers, setAnswers] = useState<QuestionEntry[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);
  const [isProcessingFeedback, setIsProcessingFeedback] = useState(false);
  const [resolvedTopicsCount, setResolvedTopicsCount] = useState(0);
  const [finalResult, setFinalResult] = useState<any>(null);
  const [simulationId, setSimulationId] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const scoreCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [answers, isProcessingFeedback, currentTurn]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const startSimulation = async () => {
    if (!file) return;
    const isInterview = mode === SimulationType.INTERVIEW || mode === SimulationType.MEETING_INTERVIEW;
    if (isInterview && !jd.trim()) return;

    setExtracting(true);
    try {
      const text = await extractTextFromPDF(file);
      setDocText(text);
      
      const firstTurn = await getNextTurn(mode, text, [], 'metod', jd);
      setCurrentTurn(firstTurn);

      try {
        const isSidangMode = mode === SimulationType.SIDANG || mode === SimulationType.MEETING_SIDANG;
        const simRef = await addDoc(collection(db, 'simulations'), {
          userId: user.uid,
          type: mode,
          title: isSidangMode ? `Sidang Santai: ${file.name}` : `Interview: ${file.name}`,
          createdAt: serverTimestamp(),
          documentText: text.substring(0, 50000),
          jobDescription: jd,
          status: SimulationStatus.ONGOING,
          questions: [],
          unresolvedPoints: []
        });
        setSimulationId(simRef.id);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'simulations');
      }
      setStep('simulating');
    } catch (err) {
      console.error("Simulation start failed", err);
    } finally {
      setExtracting(false);
    }
  };

  const submitAnswer = async () => {
    if (!currentInput.trim() || isProcessingFeedback || !currentTurn) return;

    const userAnswer = currentInput;
    const historyEntry = { q: currentTurn.question, a: userAnswer };
    const history = [...answers.map(a => ({ q: a.question, a: a.answer })), historyEntry];

    const completedTurnEntry: QuestionEntry = {
      question: currentTurn.question,
      answer: userAnswer,
      panelistId: currentTurn.panelistId,
      feedback: currentTurn.feedback,
      score: currentTurn.score,
      suggestedAnswer: currentTurn.suggestedAnswer
    };

    const newAnswers = [...answers, completedTurnEntry];
    setAnswers(newAnswers);
    setCurrentInput('');
    setIsAnswering(true);
    setIsProcessingFeedback(true);

    try {
      if (currentTurn.isTopicResolved) {
        setResolvedTopicsCount(prev => prev + 1);
      }
      
      const nextTurnData = await getNextTurn(mode, docText, history, currentTurn.panelistId, jd);
      setCurrentTurn(nextTurnData);

      if (simulationId) {
        try {
          const simDocRef = doc(db, 'simulations', simulationId);
          await updateDoc(simDocRef, { questions: newAnswers });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `simulations/${simulationId}`);
        }
      }
    } catch (err) {
      console.error("Next turn failed", err);
    } finally {
      setIsAnswering(false);
      setIsProcessingFeedback(false);
    }
  };

  const finishSimulation = async (allAnswers: QuestionEntry[]) => {
    setIsProcessingFeedback(true);
    try {
      const exchanges = allAnswers.map(a => ({ q: a.question, a: a.answer, s: a.score }));
      const summary = await getSummary(mode, exchanges);
      setFinalResult(summary);

      if (simulationId) {
        try {
          const simDocRef = doc(db, 'simulations', simulationId);
          await updateDoc(simDocRef, { ...summary, status: SimulationStatus.COMPLETED });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `simulations/${simulationId}`);
        }
      }
      setStep('results');
    } catch (err) {
      console.error("Summary failed", err);
    } finally {
      setIsProcessingFeedback(false);
    }
  };

  const downloadScoreCard = async () => {
    if (scoreCardRef.current === null) return;
    try {
      const dataUrl = await toPng(scoreCardRef.current, { cacheBust: true });
      const link = document.createElement('a');
      link.download = `Rapor-Santuy-${user.displayName?.replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download score card', err);
    }
  };

  return (
    <div className="bg-white rounded-[1.5rem] md:rounded-[3rem] shadow-2xl overflow-hidden border-[4px] border-slate-100 flex flex-col h-[85vh] md:h-[800px] relative max-w-7xl mx-auto">
      
      {/* ── Header ── */}
      <div className="bg-sky-100 border-b-[4px] border-sky-200 p-4 md:p-6 flex justify-between items-center shrink-0 z-10">
        <div className="flex items-center gap-3 md:gap-4">
          <button 
            onClick={onCancel} 
            className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-sky-600 border-[3px] border-sky-200 hover:translate-y-1 hover:shadow-none shadow-[0_4px_0_0_rgba(186,230,253,1)] transition-all"
          >
            <ArrowLeft strokeWidth={3} className="w-6 h-6" />
          </button>
          <div>
            <h2 className="font-black text-xl md:text-2xl text-slate-800 tracking-tight leading-none mb-1">
              {(mode === SimulationType.SIDANG || mode === SimulationType.MEETING_SIDANG) ? 'Ruang Sidang' : 'Ruang Interview'} 🎓
            </h2>
            <p className="text-slate-500 text-[11px] md:text-sm font-bold bg-white/50 inline-block px-2 py-0.5 rounded-md">
              Tarik napas, {user.displayName?.split(' ')[0]}! Kamu pasti bisa.
            </p>
          </div>
        </div>

        {step === 'simulating' && (
          <div className="bg-white px-4 py-2 rounded-2xl border-[3px] border-sky-200 flex items-center gap-4 shadow-sm hidden sm:flex">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Topik Lulus</span>
              <span className="text-sm font-black text-emerald-500">{resolvedTopicsCount} Topik</span>
            </div>
            <div className="w-[2px] h-8 bg-slate-100" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status AI</span>
              <span className={cn(
                "text-sm font-black uppercase tracking-tight",
                currentTurn?.isFollowUp ? "text-rose-500" : "text-emerald-500"
              )}>
                {currentTurn?.isFollowUp ? "Lagi Dicecar 🔥" : "Aman 👍"}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col bg-[#fafaf9] relative">
        <AnimatePresence mode="wait">
          
          {/* ── STEP 1: UPLOAD ── */}
          {step === 'upload' && (
            <motion.div 
              key="upload" 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }}
              className="p-4 md:p-10 space-y-6 md:space-y-8 flex-1 overflow-y-auto"
            >
              <div className="text-center space-y-2 mb-4 md:mb-8">
                <h3 className="text-2xl md:text-3xl font-black text-slate-800">Bawa Senjatamu!</h3>
                <p className="text-sm md:text-base text-slate-500 font-bold px-4 md:px-0">Kasih amunisi dokumen biar AI kita bisa nguji kamu dengan bener.</p>
              </div>

              <div className="max-w-xl mx-auto space-y-4 md:space-y-6">
                {/* Mode description */}
                {mode === SimulationType.MEETING_INTERVIEW && (
                  <div className="bg-amber-100 p-4 rounded-2xl border-2 border-amber-200 mb-4">
                    <p className="text-xs font-bold text-amber-800">
                      💡 Mode Live Interview akan menguji kamu dengan HRD, User, dan Tech Lead secara real-time. Siapkan mic kamu!
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  <label className="text-[10px] md:text-sm font-black text-sky-600 uppercase tracking-widest px-2 flex items-center gap-2">
                    <FileText size={18} /> Dokumen Utama (PDF)
                  </label>
                  <label className={cn(
                    "border-[3px] md:border-[4px] border-dashed rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-14 flex flex-col items-center justify-center gap-2 md:gap-4 cursor-pointer transition-all bg-white",
                    file ? "border-emerald-300 bg-emerald-50 shadow-[0_6px_0_0_rgba(110,231,183,0.5)] md:shadow-[0_8px_0_0_rgba(110,231,183,0.5)] transform -translate-y-1" : "border-slate-200 hover:border-sky-300 hover:bg-sky-50"
                  )}>
                    <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
                    {file ? (
                      <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-2 md:gap-4">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-400 rounded-xl md:rounded-[1.5rem] flex items-center justify-center text-white border-[3px] md:border-[4px] border-emerald-200 shadow-sm">
                          <CheckCircle2 size={32} md:size={40} strokeWidth={3} />
                        </div>
                        <div className="text-center">
                          <p className="font-black text-sm md:text-lg text-emerald-800 truncate max-w-[200px] md:max-w-[250px]">{file.name}</p>
                          <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-1">Siap Dieksekusi!</p>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 md:gap-4">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-100 rounded-xl md:rounded-[1.5rem] flex items-center justify-center text-slate-400 border-[3px] md:border-[4px] border-slate-200">
                          <Upload size={30} md:size={36} strokeWidth={2.5} />
                        </div>
                        <div className="text-center px-4">
                          <p className="font-black text-base md:text-lg text-slate-700 leading-tight">Taruh Draf / CV Kamu di Sini</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-1">Maksimal 50MB. Cuma PDF ya!</p>
                        </div>
                      </div>
                    )}
                  </label>
                </div>

                {(mode === SimulationType.INTERVIEW || mode === SimulationType.MEETING_INTERVIEW) && (
                  <div className="space-y-3">
                    <label className="text-[10px] md:text-sm font-black text-rose-500 uppercase tracking-widest px-2 flex items-center gap-2">
                      <MessageSquare size={18} /> Detail Lowongan (Job Desc)
                    </label>
                    <textarea 
                      className="w-full bg-white border-[3px] md:border-[4px] border-slate-200 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 text-sm outline-none h-24 md:h-32 resize-none transition-all focus:border-rose-300 focus:bg-rose-50 font-medium text-slate-700"
                      placeholder="Copy-paste deskripsi pekerjaan ke sini..."
                      value={jd}
                      onChange={(e) => setJd(e.target.value)}
                    />
                  </div>
                )}

                <button 
                  disabled={!file || ((mode === SimulationType.INTERVIEW || mode === SimulationType.MEETING_INTERVIEW) && !jd.trim()) || extracting}
                  onClick={startSimulation}
                  className="w-full bg-emerald-400 text-white py-4 md:py-5 rounded-[1.5rem] md:rounded-[2rem] font-black text-xl md:text-2xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed border-[3px] md:border-[4px] border-emerald-500 shadow-[0_6px_0_0_rgba(16,185,129,1)] md:shadow-[0_8px_0_0_rgba(16,185,129,1)] hover:translate-y-1 hover:shadow-none transition-all mt-2"
                >
                  {extracting ? <Loader2 className="w-8 h-8 animate-spin" /> : 'GAS LATIHAN! 🚀'}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: SIMULATING ── */}
          {step === 'simulating' && (
            mode.startsWith('meeting') ? (
              <LiveMeetingFlow 
                mode={mode} 
                docText={docText} 
                jd={jd} 
                user={user} 
                onFinish={(finishedAnswers) => {
                  setAnswers(finishedAnswers);
                  finishSimulation(finishedAnswers);
                }}
                onCancel={onCancel}
              />
            ) : (
              <motion.div key="simulating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full overflow-hidden relative">
              
              {/* Panelist Indicators */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md px-6 py-3 rounded-full border-[3px] border-slate-200 shadow-sm z-20 flex justify-center gap-8">
                {((mode === SimulationType.INTERVIEW || mode === SimulationType.MEETING_INTERVIEW) 
                  ? ['shinta', 'maya', 'budi'] 
                  : ['metod', 'ima', 'aris']
                ).map((pid) => {
                  const isActive = currentTurn?.panelistId === pid;
                  return (
                    <div key={pid} className={cn(
                      "flex items-center gap-3 transition-all duration-300",
                      isActive ? "opacity-100 scale-110" : "opacity-40 grayscale-[0.5] scale-90"
                    )}>
                      <PanelistAvatar id={pid} size="sm" isThinking={isActive && isAnswering} />
                      {isActive && (
                        <span className="text-xs font-black text-slate-700 uppercase tracking-tight hidden md:block">
                          {PANELISTS[pid].name}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Chat Log */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth pt-24 pb-8">
                {answers.map((ans, idx) => (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={idx} className="space-y-6">
                    {/* Bot Question */}
                    <div className="flex gap-3 md:gap-4 items-start max-w-[90%] md:max-w-[80%]">
                      <div className="shrink-0 pt-1">
                        <PanelistAvatar id={ans.panelistId} size="sm" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="p-5 md:p-6 bg-white rounded-[2rem] rounded-tl-none border-[3px] border-slate-200 shadow-sm">
                          <p className="text-[10px] font-black uppercase tracking-widest mb-2 text-slate-400">
                            {PANELISTS[ans.panelistId].name}
                          </p>
                          <p className="text-sm md:text-base font-bold text-slate-700 leading-relaxed">{ans.question}</p>
                        </div>
                        {ans.feedback && (
                          <div className="bg-amber-50 p-4 rounded-2xl border-[3px] border-amber-200 text-xs font-bold text-amber-700 ml-4 relative">
                            <div className="absolute -left-2 top-4 w-4 h-4 bg-amber-50 border-l-[3px] border-b-[3px] border-amber-200 transform rotate-45" />
                            💡 {ans.feedback}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* User Answer */}
                    <div className="flex justify-end gap-3 md:gap-4 items-start ml-auto max-w-[90%] md:max-w-[80%]">
                      <div className="bg-sky-100 p-5 md:p-6 rounded-[2rem] rounded-tr-none border-[3px] border-sky-200 shadow-sm text-slate-800">
                        <p className="text-sm md:text-base font-bold leading-relaxed">{ans.answer}</p>
                      </div>
                      <div className="shrink-0 pt-1">
                        <div className="w-12 h-12 bg-sky-400 rounded-full flex items-center justify-center border-[3px] border-white shadow-sm text-white font-black">
                          {user.displayName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* AI Typing Indicator */}
                {isProcessingFeedback && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4 items-start max-w-[80%]">
                    <div className="shrink-0 pt-1">
                      <PanelistAvatar id={currentTurn?.panelistId || 'metod'} size="sm" isThinking />
                    </div>
                    <div className="p-5 bg-white rounded-[2rem] rounded-tl-none border-[3px] border-slate-200 shadow-sm flex items-center gap-3">
                      <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-2.5 h-2.5 bg-slate-400 rounded-full" />
                      <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2.5 h-2.5 bg-slate-400 rounded-full" />
                      <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2.5 h-2.5 bg-slate-400 rounded-full" />
                    </div>
                  </motion.div>
                )}

                {/* Current Active Question */}
                {!isProcessingFeedback && currentTurn && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 md:gap-4 items-start max-w-[90%] md:max-w-[80%]">
                    <div className="shrink-0 pt-1">
                      <PanelistAvatar id={currentTurn.panelistId} size="sm" />
                    </div>
                    <div className="p-5 md:p-6 bg-white rounded-[2rem] rounded-tl-none border-[3px] border-slate-200 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-widest mb-2 text-slate-400">
                        {PANELISTS[currentTurn.panelistId].name}
                      </p>
                      {currentTurn.commentToUser && (
                        <p className="text-xs font-bold text-rose-500 bg-rose-50 p-3 rounded-xl border-2 border-rose-100 mb-3">
                          "{currentTurn.commentToUser}"
                        </p>
                      )}
                      <p className="text-sm md:text-base font-bold text-slate-800 leading-relaxed">{currentTurn.question}</p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Chat Input Area */}
              <div className="p-4 md:p-6 bg-white border-t-[4px] border-slate-100 shrink-0 relative z-40">
                <div className="absolute -top-12 left-4 md:left-8">
                  <button 
                    onClick={() => finishSimulation(answers)}
                    className="bg-white text-rose-500 border-[3px] border-rose-200 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-50 transition-all shadow-sm flex items-center gap-2"
                  >
                    <CircleStop size={14} strokeWidth={3} /> Selesai Latihan
                  </button>
                </div>
                
                <div className="flex gap-3 relative max-w-4xl mx-auto">
                  <textarea 
                    rows={1}
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        submitAnswer();
                      }
                    }}
                    placeholder="Kasih paham mereka di sini..."
                    className="flex-1 bg-slate-50 border-[3px] border-slate-200 rounded-[2rem] px-6 py-4 text-sm md:text-base focus:border-sky-300 focus:bg-sky-50 outline-none resize-none max-h-32 text-slate-700 font-bold placeholder:text-slate-400 transition-colors"
                  />
                  <button 
                    onClick={submitAnswer}
                    disabled={!currentInput.trim() || isProcessingFeedback}
                    className="w-14 h-14 md:w-16 md:h-16 bg-sky-400 text-white rounded-[1.5rem] border-[3px] border-sky-500 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sky-500 transition-all shadow-[0_4px_0_0_rgba(14,165,233,1)] hover:translate-y-1 hover:shadow-none shrink-0"
                  >
                    <Send size={24} strokeWidth={2.5} className="ml-1" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}

          {/* ── STEP 3: RESULTS ── */}
          {step === 'results' && finalResult && (
            <motion.div key="results" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-6 md:p-10 flex-1 overflow-y-auto scroll-smooth flex flex-col space-y-10">
              
              <div className="text-center space-y-2">
                <h2 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tighter">Rapor Santuy Kamu 🎉</h2>
                <p className="text-slate-500 font-bold text-sm md:text-base">Kerja bagus, {user.displayName?.split(' ')[0]}! Yuk cek hasil evaluasinya.</p>
              </div>

              <div className="flex flex-col lg:flex-row gap-8 items-center justify-center">
                
                {/* Score Dial */}
                <div className="flex flex-col items-center bg-white p-8 md:p-10 rounded-[3rem] border-[4px] border-slate-100 shadow-md relative min-w-[280px]">
                  <div className="relative w-40 h-40 md:w-48 md:h-48 flex flex-col items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
                      <circle 
                        cx="50%" cy="50%" r="45%" 
                        stroke="currentColor" strokeWidth="12" fill="transparent" 
                        strokeDasharray="283" 
                        strokeDashoffset={283 - (283 * finalResult.finalScore) / 100} 
                        className={finalResult.finalScore >= 80 ? "text-emerald-400" : "text-amber-400"} 
                        style={{ transition: "stroke-dashoffset 1.5s ease-out" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-4xl md:text-5xl font-black text-slate-800">{finalResult.finalScore}</p>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">/ 100</p>
                    </div>
                  </div>
                  <div className="text-center mt-6 space-y-1">
                    <p className="text-lg font-black text-slate-800">
                      {finalResult.finalScore >= 80 ? "Gacor Banget!" : "Lumayan, Gas Lagi!"}
                    </p>
                    <p className="text-sm font-bold text-slate-500">
                      {finalResult.finalScore >= 80 ? "Tinggal rapiin dikit udah aman." : "Masih ada celah, latihan sekali lagi ya!"}
                    </p>
                  </div>
                </div>

                {/* Unresolved Points (Kekurangan) */}
                {finalResult.unresolvedPoints && finalResult.unresolvedPoints.length > 0 && (
                  <div className="w-full max-w-md bg-white rounded-[2.5rem] border-[4px] border-rose-100 p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-500">
                        <AlertCircle size={24} strokeWidth={2.5} />
                      </div>
                      <h3 className="text-lg font-black text-slate-800">Poin Kritis (PR Kamu)</h3>
                    </div>
                    <div className="flex flex-col gap-3">
                      {finalResult.unresolvedPoints.slice(0,3).map((point: string, i: number) => (
                        <div key={i} className="flex gap-3 bg-rose-50 p-4 rounded-2xl">
                          <span className="font-black text-rose-400 mt-0.5">#{i+1}</span>
                          <p className="text-sm font-bold text-slate-700 leading-relaxed">{point}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Tips Improvement */}
              <div className="max-w-4xl mx-auto w-full bg-white rounded-[2.5rem] border-[4px] border-emerald-100 p-6 md:p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-500">
                    <Sparkles size={24} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-lg font-black text-slate-800">Tips dari VibeBot</h3>
                </div>
                <div className="prose prose-sm md:prose-base font-bold text-slate-600 max-w-none">
                  <Markdown>{finalResult.improvementTips}</Markdown>
                </div>
              </div>

              {/* Bank Soal & Jawaban (Bahan Belajar) */}
              <div className="max-w-4xl mx-auto w-full bg-white rounded-[2.5rem] border-[4px] border-sky-100 p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center text-sky-500">
                    <BookOpen size={24} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Bank Soal & Jawaban Pintar 📚</h3>
                </div>
                
                <div className="space-y-6">
                  {answers.map((ans, i) => (
                    <div key={i} className="group">
                      <div className="flex gap-4 items-start mb-3">
                         <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-400 shrink-0">
                           {i + 1}
                         </div>
                         <p className="text-base font-black text-slate-700 leading-tight">
                           {ans.question}
                         </p>
                      </div>
                      
                      <div className="ml-12 space-y-3">
                        <div className="p-5 bg-slate-50 rounded-2xl border-2 border-slate-100 relative">
                          <span className="absolute -top-3 left-4 bg-white px-2 text-[10px] font-black text-slate-300 uppercase tracking-widest border-2 border-slate-100 rounded-md">
                            Jawaban Kamu
                          </span>
                          <p className="text-sm font-bold text-slate-500 italic">
                            "{ans.answer || 'Tidak ada jawaban'}"
                          </p>
                        </div>

                        <div className="p-5 bg-emerald-50 rounded-2xl border-2 border-emerald-100 relative">
                          <span className="absolute -top-3 left-4 bg-white px-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest border-2 border-emerald-100 rounded-md flex items-center gap-1.5">
                            <Sparkles size={10} /> Jawaban Ideal VibeBot
                          </span>
                          <p className="text-sm font-bold text-emerald-700 leading-relaxed">
                            {ans.suggestedAnswer || 'AI tidak memberikan saran spesifik untuk poin ini.'}
                          </p>
                        </div>
                      </div>
                      
                      {i < answers.length - 1 && (
                        <div className="h-px w-full bg-slate-100 mt-8" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
                <button 
                  onClick={downloadScoreCard}
                  className="w-full sm:w-auto bg-amber-400 text-amber-900 border-[4px] border-amber-500 px-8 py-4 rounded-2xl font-black text-base md:text-lg hover:bg-amber-500 transition-all flex items-center justify-center gap-2 shadow-[0_6px_0_0_#d97706] hover:translate-y-1 hover:shadow-none"
                >
                  <Download size={20} strokeWidth={3} /> Simpan Rapor
                </button>
                <button 
                  onClick={onCancel}
                  className="w-full sm:w-auto bg-white text-slate-700 border-[4px] border-slate-200 px-8 py-4 rounded-2xl font-black text-base md:text-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-[0_6px_0_0_#e2e8f0] hover:translate-y-1 hover:shadow-none"
                >
                  <Zap size={20} strokeWidth={3} className="text-sky-500" /> Latihan Lagi
                </button>
              </div>

              {/* Hidden template for download */}
              <div className="fixed -left-[9999px] top-0 pointer-events-none">
                <ScoreCardTemplate 
                  ref={scoreCardRef} 
                  userName={user.displayName || "User"} 
                  score={finalResult.finalScore} 
                  mode={mode} 
                  hiringLikelihood={finalResult.hiringLikelihood} 
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}