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
  const [vibe, setVibe] = useState<'standard' | 'killer' | 'santai' | 'gokil'>('standard');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const scoreCardRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [answers, isProcessingFeedback, currentTurn]);

  // Auto-resize textarea on mobile
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [currentInput]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setErrorMsg(null); // Reset error on new file upload
    }
  };

  const startSimulation = async () => {
    if (!file) return;
    const isInterview = mode === SimulationType.INTERVIEW || mode === SimulationType.MEETING_INTERVIEW;
    if (isInterview && !jd.trim()) return;

    setErrorMsg(null);
    setExtracting(true);
    try {
      const text = await extractTextFromPDF(file);
      
      // Deteksi PDF kosong atau hasil scan gambar (kurang dari 150 karakter)
      if (!text || text.trim().length < 150) {
        setErrorMsg("PDF yang diunggah tampaknya kosong atau hasil scan gambar 📄. Mohon unggah draf skripsi ketikan asli (bukan foto/scan) agar penguji bisa membaca teksnya dengan baik!");
        setExtracting(false);
        return;
      }

      setDocText(text);
      
      const initialPanelist = isInterview ? 'shinta' : 'metod';
      const firstTurn = await getNextTurn(mode, text, [], initialPanelist, jd, vibe, 1);
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
          vibe,
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
      setErrorMsg("Gagal membaca dokumen PDF 📄. Pastikan file tidak rusak dan coba lagi.");
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
      suggestedAnswer: currentTurn.suggestedAnswer,
      isFollowUp: !!currentTurn.isFollowUp
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
      
      const coreQuestionsCount = newAnswers.filter(a => !a.isFollowUp).length;
      if (coreQuestionsCount >= 10) {
        await finishSimulation(newAnswers);
        return;
      }

      const nextCoreCount = coreQuestionsCount + 1;
      const nextTurnData = await getNextTurn(mode, docText, history, currentTurn.panelistId, jd, vibe, nextCoreCount);
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
          await updateDoc(simDocRef, { 
            ...summary, 
            status: SimulationStatus.COMPLETED,
            questions: allAnswers 
          });
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
    // ─── Outer container: full screen on mobile, capped on desktop ───────────
    <div className="
      bg-white
      rounded-none md:rounded-[3rem]
      shadow-none md:shadow-2xl
      overflow-hidden
      border-0 md:border-[4px] md:border-purple-100/70
      flex flex-col
      h-[100dvh] md:h-[800px]
      relative
      max-w-7xl mx-auto
      w-full
    ">
      
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-pink-50/70 via-purple-50/50 to-sky-50/70 border-b-[3px] md:border-b-[4px] border-purple-100/70 px-3 py-3 md:p-6 flex justify-between items-center shrink-0 z-10 safe-top">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <button 
            onClick={onCancel} 
            className="w-10 h-10 md:w-12 md:h-12 shrink-0 bg-white rounded-xl md:rounded-2xl flex items-center justify-center text-purple-500 border-[2px] md:border-[3px] border-purple-100 hover:translate-y-1 hover:shadow-none shadow-[0_3px_0_0_#e8daff] md:shadow-[0_4px_0_0_#e8daff] transition-all"
          >
            <ArrowLeft strokeWidth={3} className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          <div className="min-w-0">
            <h2 className="font-black text-base md:text-2xl text-slate-800 tracking-tight leading-none mb-0.5 truncate">
              {(mode === SimulationType.SIDANG || mode === SimulationType.MEETING_SIDANG) ? 'Ruang Sidang' : 'Ruang Interview'} 🎓
            </h2>
            <p className="text-slate-500 text-[10px] md:text-sm font-bold bg-white/50 inline-block px-2 py-0.5 rounded-md truncate max-w-[180px] md:max-w-none">
              Tarik napas, {user.displayName?.split(' ')[0]}! Kamu pasti bisa. 🧸
            </p>
          </div>
        </div>

        {step === 'simulating' && (
          <div className="bg-white px-2 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl border-[2px] md:border-[3px] border-purple-100 flex items-center gap-2 md:gap-4 shadow-sm shrink-0">
            {/* Progres Pertanyaan */}
            <div className="flex flex-col">
              <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Progress</span>
              <span className="text-xs md:text-sm font-black text-purple-500">
                {Math.min(10, answers.filter(a => !a.isFollowUp).length + (currentTurn && !currentTurn.isFollowUp ? 1 : 0))}/10
              </span>
            </div>
            <div className="w-px h-6 md:h-8 bg-purple-100/50" />
            {/* Topik Lulus: always visible */}
            <div className="flex flex-col">
              <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Lulus</span>
              <span className="text-xs md:text-sm font-black text-emerald-500">{resolvedTopicsCount} Topik</span>
            </div>
            <div className="w-px h-6 md:h-8 bg-purple-100/50" />
            {/* Status: always visible */}
            <div className="flex flex-col">
              <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Status</span>
              <span className={cn(
                "text-xs md:text-sm font-black uppercase tracking-tight",
                currentTurn?.isFollowUp ? "text-rose-500" : "text-emerald-500"
              )}>
                {currentTurn?.isFollowUp ? "Dicecar 🔥" : "Aman 👍"}
              </span>
            </div>
          </div>
        )}</div>

      <div className="flex-1 overflow-hidden flex flex-col bg-[#fafaf9] relative">
        <AnimatePresence mode="wait">
          
          {/* ── STEP 1: UPLOAD ─────────────────────────────────────────────── */}
          {step === 'upload' && (
            <motion.div 
              key="upload" 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }}
              className="px-4 py-5 md:p-10 space-y-4 md:space-y-8 flex-1 overflow-y-auto"
            >
              <div className="text-center space-y-1 md:space-y-2">
                <h3 className="text-xl md:text-3xl font-black text-slate-800">Bawa Senjatamu!</h3>
                <p className="text-sm md:text-base text-slate-500 font-bold leading-relaxed">
                  Kasih amunisi dokumen biar AI kita bisa nguji kamu dengan bener.
                </p>
              </div>

              <div className="max-w-xl mx-auto space-y-4 md:space-y-6">

                {errorMsg && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-rose-50 border-[3px] border-rose-200 p-4 rounded-2xl flex items-start gap-3 shadow-sm relative"
                  >
                    <div className="bg-rose-100 p-1.5 rounded-lg text-rose-500 shrink-0">
                      <AlertCircle size={18} strokeWidth={3} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-rose-800 leading-relaxed">{errorMsg}</p>
                    </div>
                    <button 
                      onClick={() => setErrorMsg(null)}
                      className="text-xs font-black text-rose-400 hover:text-rose-600 self-center shrink-0 ml-2"
                    >
                      Tutup
                    </button>
                  </motion.div>
                )}

                {mode === SimulationType.MEETING_INTERVIEW && (
                  <div className="bg-amber-100 p-3 md:p-4 rounded-2xl border-2 border-amber-200">
                    <p className="text-xs font-bold text-amber-800 leading-relaxed">
                      💡 Mode Live Interview akan menguji kamu dengan HRD, User, dan Tech Lead secara real-time. Siapkan mic kamu!
                    </p>
                  </div>
                )}

                {/* Upload area */}
                <div className="space-y-2 md:space-y-3">
                  <label className="text-[10px] md:text-sm font-black text-purple-500 uppercase tracking-widest px-1 flex items-center gap-2">
                    <FileText size={16} /> Dokumen Utama (PDF) 📄
                  </label>
                  <label className={cn(
                    "border-[3px] md:border-[4px] border-dashed rounded-2xl md:rounded-[2.5rem] p-6 md:p-14 flex flex-col items-center justify-center gap-3 md:gap-4 cursor-pointer transition-all bg-white active:scale-[0.99]",
                    file
                      ? "border-emerald-300 bg-emerald-50 shadow-[0_5px_0_0_rgba(110,231,183,0.5)]"
                      : "border-purple-100 hover:border-purple-300 hover:bg-purple-50"
                  )}>
                    <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
                    {file ? (
                      <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-2 md:gap-4">
                        <div className="w-14 h-14 md:w-20 md:h-20 bg-emerald-400 rounded-xl md:rounded-[1.5rem] flex items-center justify-center text-white border-[3px] md:border-[4px] border-emerald-200 shadow-sm">
                          <CheckCircle2 strokeWidth={3} className="w-7 h-7 md:w-10 md:h-10" />
                        </div>
                        <div className="text-center">
                          <p className="font-black text-sm md:text-lg text-emerald-800 truncate max-w-[220px] md:max-w-[280px]">{file.name}</p>
                          <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-1">Siap Dieksekusi!</p>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 md:gap-4">
                        <div className="w-14 h-14 md:w-20 md:h-20 bg-purple-50 rounded-xl md:rounded-[1.5rem] flex items-center justify-center text-purple-300 border-[3px] md:border-[4px] border-purple-100">
                          <Upload strokeWidth={2.5} className="w-6 h-6 md:w-9 md:h-9" />
                        </div>
                        <div className="text-center">
                          <p className="font-black text-sm md:text-lg text-slate-700 leading-tight">Taruh Draf / CV Kamu di Sini</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-1">Maksimal 50MB · Cuma PDF ya!</p>
                        </div>
                      </div>
                    )}
                  </label>
                </div>

                {/* Job description */}
                {(mode === SimulationType.INTERVIEW || mode === SimulationType.MEETING_INTERVIEW) && (
                  <div className="space-y-2 md:space-y-3">
                    <label className="text-[10px] md:text-sm font-black text-purple-500 uppercase tracking-widest px-1 flex items-center gap-2">
                      <MessageSquare size={16} /> Detail Lowongan (Job Desc) 👔
                    </label>
                    <textarea 
                      className="w-full bg-white border-[3px] md:border-[4px] border-purple-100 rounded-2xl md:rounded-[2rem] px-4 py-3 md:p-6 text-sm outline-none h-24 md:h-32 resize-none transition-all focus:border-purple-300 focus:bg-purple-50/50 font-medium text-slate-700"
                      placeholder="Copy-paste deskripsi pekerjaan ke sini..."
                      value={jd}
                      onChange={(e) => setJd(e.target.value)}
                    />
                  </div>
                )}

                {/* Vibe Selector */}
                <div className="space-y-2 md:space-y-3">
                  <label className="text-[10px] md:text-sm font-black text-purple-500 uppercase tracking-widest px-1 flex items-center gap-2">
                    <Sparkles size={16} /> Vibe Karakter Penguji 🧸
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {[
                      { id: 'santai', label: 'Santuy 😊', desc: 'Baik & pembimbing', border: 'border-emerald-300', text: 'text-emerald-700', bg: 'bg-emerald-50' },
                      { id: 'standard', label: 'Standar 😐', desc: 'Profesional biasa', border: 'border-slate-300', text: 'text-slate-700', bg: 'bg-slate-50' },
                      { id: 'killer', label: 'Killer 💀', desc: 'Galak & mencecar', border: 'border-rose-300', text: 'text-rose-700', bg: 'bg-rose-50' },
                      { id: 'gokil', label: 'Gokil 🤪', desc: 'Bahasa slang/gaul', border: 'border-amber-300', text: 'text-amber-700', bg: 'bg-amber-50' }
                    ].map((v) => {
                      const selected = vibe === v.id;
                      return (
                        <div 
                          key={v.id}
                          onClick={() => setVibe(v.id as any)}
                          className={cn(
                            "cursor-pointer p-3 rounded-2xl border-[3px] transition-all flex flex-col text-left",
                            selected 
                              ? `${v.border} ${v.bg} shadow-md scale-[1.02]` 
                              : "border-slate-100 bg-white hover:border-slate-200"
                          )}
                        >
                          <span className={cn("text-sm font-black", selected ? v.text : "text-slate-700")}>{v.label}</span>
                          <span className="text-[10px] font-medium text-slate-400 mt-0.5 leading-none">{v.desc}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button 
                  disabled={!file || ((mode === SimulationType.INTERVIEW || mode === SimulationType.MEETING_INTERVIEW) && !jd.trim()) || extracting}
                  onClick={startSimulation}
                  className="w-full bg-emerald-400 text-white py-4 md:py-5 rounded-2xl md:rounded-[2rem] font-black text-lg md:text-2xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed border-[3px] md:border-[4px] border-emerald-500 shadow-[0_5px_0_0_rgba(16,185,129,1)] md:shadow-[0_8px_0_0_rgba(16,185,129,1)] active:translate-y-1 active:shadow-none hover:translate-y-1 hover:shadow-none transition-all"
                >
                  {extracting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-6 h-6 md:w-8 md:h-8 animate-spin" />
                      <span className="text-base md:text-xl">Mempersiapkan AI…</span>
                    </span>
                  ) : 'GAS LATIHAN! 🚀'}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: SIMULATING ─────────────────────────────────────────── */}
          {step === 'simulating' && (
            mode.startsWith('meeting') ? (
              <LiveMeetingFlow 
                mode={mode} 
                docText={docText} 
                jd={jd} 
                user={user} 
                vibe={vibe} 
                onFinish={(finishedAnswers) => {
                  setAnswers(finishedAnswers);
                  finishSimulation(finishedAnswers);
                }}
                onCancel={onCancel}
              />
            ) : (
              <motion.div key="simulating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full overflow-hidden relative">
              
                {/* Panelist Indicators ── responsive pill */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-3 md:px-6 py-2 md:py-3 rounded-full border-[2px] md:border-[3px] border-purple-100/70 shadow-sm z-20 flex justify-center gap-3 md:gap-8">
                  {((mode === SimulationType.INTERVIEW || mode === SimulationType.MEETING_INTERVIEW) 
                    ? ['shinta', 'maya', 'budi'] 
                    : ['metod', 'ima', 'aris']
                  ).map((pid) => {
                    const panelistId = pid as PanelistId;
                    const isActive = currentTurn?.panelistId === panelistId;
                    return (
                      <div key={pid} className={cn(
                        "flex items-center gap-1.5 md:gap-3 transition-all duration-300",
                        isActive ? "opacity-100 scale-110" : "opacity-40 grayscale-[0.5] scale-90"
                      )}>
                        <PanelistAvatar id={panelistId} size="sm" isThinking={isActive && isAnswering} />
                        {isActive && (
                          <span className="text-[10px] md:text-xs font-black text-slate-700 uppercase tracking-tight hidden sm:block">
                            {PANELISTS[panelistId].name}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Chat Log */}
                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto px-3 py-4 md:px-8 md:py-8 space-y-4 md:space-y-6 scroll-smooth pt-16 md:pt-24 pb-4 md:pb-8 overscroll-contain"
                >
                  {answers.map((ans, idx) => (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={idx} className="space-y-3 md:space-y-6">
                      
                      {/* Bot Question */}
                      <div className="flex gap-2 md:gap-4 items-start max-w-[92%] md:max-w-[80%]">
                        <div className="shrink-0 pt-1">
                          <PanelistAvatar id={ans.panelistId} size="sm" />
                        </div>
                        <div className="flex flex-col gap-1.5 md:gap-2 min-w-0">
                          <div className="p-3 md:p-6 bg-white rounded-2xl md:rounded-[2rem] rounded-tl-none border-[2px] md:border-[3px] border-purple-100/70 shadow-sm">
                            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-1.5 md:mb-2 text-slate-400">
                              {PANELISTS[ans.panelistId].name}
                            </p>
                            <p className="text-sm md:text-base font-bold text-slate-700 leading-relaxed">{ans.question}</p>
                          </div>
                          {ans.feedback && (
                            <div className="bg-amber-50 p-3 md:p-4 rounded-xl md:rounded-2xl border-[2px] md:border-[3px] border-amber-200 text-xs font-bold text-amber-700 ml-2 md:ml-4 relative">
                              <div className="absolute -left-2 top-3 w-3 h-3 md:w-4 md:h-4 bg-amber-50 border-l-[2px] border-b-[2px] md:border-l-[3px] md:border-b-[3px] border-amber-200 transform rotate-45" />
                              💡 {ans.feedback}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* User Answer */}
                      <div className="flex justify-end gap-2 md:gap-4 items-start ml-auto max-w-[92%] md:max-w-[80%]">
                        <div className="bg-gradient-to-r from-pink-50/50 to-sky-50/50 p-3 md:p-6 rounded-2xl md:rounded-[2rem] rounded-tr-none border-[2px] md:border-[3px] border-purple-100/70 shadow-sm text-slate-800">
                          <p className="text-sm md:text-base font-bold leading-relaxed">{ans.answer}</p>
                        </div>
                        <div className="shrink-0 pt-1">
                          <div className="w-9 h-9 md:w-12 md:h-12 bg-gradient-to-br from-pink-400 to-sky-400 rounded-full flex items-center justify-center border-[2px] md:border-[3px] border-white shadow-sm text-white font-black text-sm md:text-base">
                            {user.displayName?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {/* AI Typing Indicator */}
                  {isProcessingFeedback && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 md:gap-4 items-start max-w-[80%]">
                      <div className="shrink-0 pt-1">
                        <PanelistAvatar id={currentTurn?.panelistId || 'metod'} size="sm" isThinking />
                      </div>
                      <div className="p-3 md:p-5 bg-white rounded-2xl md:rounded-[2rem] rounded-tl-none border-[2px] md:border-[3px] border-purple-100/70 shadow-sm flex items-center gap-2 md:gap-3">
                        <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-2 h-2 md:w-2.5 md:h-2.5 bg-slate-400 rounded-full" />
                        <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 md:w-2.5 md:h-2.5 bg-slate-400 rounded-full" />
                        <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 md:w-2.5 md:h-2.5 bg-slate-400 rounded-full" />
                      </div>
                    </motion.div>
                  )}

                  {/* Current Active Question */}
                  {!isProcessingFeedback && currentTurn && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 md:gap-4 items-start max-w-[92%] md:max-w-[80%]">
                      <div className="shrink-0 pt-1">
                        <PanelistAvatar id={currentTurn.panelistId} size="sm" />
                      </div>
                      <div className="p-3 md:p-6 bg-white rounded-2xl md:rounded-[2rem] rounded-tl-none border-[2px] md:border-[3px] border-purple-100/70 shadow-sm min-w-0">
                        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-1.5 md:mb-2 text-slate-400">
                          {PANELISTS[currentTurn.panelistId].name}
                        </p>
                        {currentTurn.commentToUser && (
                          <p className="text-xs font-bold text-rose-500 bg-rose-50 p-2.5 md:p-3 rounded-xl border-2 border-rose-100 mb-2 md:mb-3 leading-relaxed">
                            "{currentTurn.commentToUser}"
                          </p>
                        )}
                        <p className="text-sm md:text-base font-bold text-slate-800 leading-relaxed">{currentTurn.question}</p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Chat Input Area */}
                <div className="px-3 py-3 md:p-6 bg-white border-t-[3px] md:border-t-[4px] border-purple-50 shrink-0 relative z-40 safe-bottom">
                  {/* Selesai Latihan: inline on mobile, absolute on desktop */}
                  <div className="flex justify-between items-center mb-2 md:hidden">
                    <button 
                      onClick={() => finishSimulation(answers)}
                      className="bg-white text-rose-500 border-[2px] border-rose-200 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest active:bg-rose-50 transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <CircleStop size={12} strokeWidth={3} /> Selesai Latihan 🧸
                    </button>
                    <span className="text-[10px] text-slate-400 font-bold">Enter untuk kirim</span>
                  </div>

                  <div className="relative flex gap-2 md:gap-3 max-w-4xl mx-auto">
                    {/* Desktop Selesai Latihan */}
                    <div className="absolute -top-12 left-0 hidden md:block">
                      <button 
                        onClick={() => finishSimulation(answers)}
                        className="bg-white text-rose-500 border-[3px] border-rose-200 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-50 transition-all shadow-sm flex items-center gap-2"
                      >
                        <CircleStop size={14} strokeWidth={3} /> Selesai Latihan 🧸
                      </button>
                    </div>

                    <textarea 
                      ref={textareaRef}
                      rows={1}
                      value={currentInput}
                      onChange={(e) => setCurrentInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          submitAnswer();
                        }
                      }}
                      onFocus={() => {
                        setTimeout(() => {
                          if (scrollRef.current) {
                            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                          }
                        }, 200);
                      }}
                      placeholder="Tulis jawabanmu dengan percaya diri di sini… 🌸"
                      className="flex-1 bg-purple-50/20 border-[2px] md:border-[3px] border-purple-100 rounded-2xl md:rounded-[2rem] px-4 md:px-6 py-3 md:py-4 text-sm md:text-base focus:border-purple-300 focus:bg-purple-50/30 outline-none resize-none max-h-28 md:max-h-32 text-slate-700 font-bold placeholder:text-slate-400 transition-colors leading-relaxed"
                      style={{ fontSize: '16px' /* Prevents iOS zoom on focus */ }}
                    />
                    <button 
                      onClick={submitAnswer}
                      disabled={!currentInput.trim() || isProcessingFeedback}
                      className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-pink-400 to-sky-400 text-white rounded-xl md:rounded-[1.5rem] border-[2px] md:border-[3px] border-purple-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-1 active:shadow-none hover:translate-y-1 hover:shadow-none transition-all shadow-[0_3px_0_0_#c084fc] md:shadow-[0_4px_0_0_#c084fc] shrink-0 self-end"
                    >
                      <Send size={20} strokeWidth={2.5} className="ml-0.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          )}

          {/* ── STEP 3: RESULTS ────────────────────────────────────────────── */}
          {step === 'results' && finalResult && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-4 py-5 md:p-10 flex-1 overflow-y-auto scroll-smooth flex flex-col space-y-5 md:space-y-10 overscroll-contain"
            >
              
              <div className="text-center space-y-1 md:space-y-2">
                <h2 className="text-2xl md:text-5xl font-black text-slate-800 tracking-tighter">Rapor Santuy Kamu 🎉</h2>
                <p className="text-slate-500 font-bold text-sm md:text-base">
                  Kerja bagus, {user.displayName?.split(' ')[0]}! Yuk cek hasil evaluasinya.
                </p>
              </div>

              {/* Score + Unresolved — stack on mobile, row on large */}
              <div className="flex flex-col lg:flex-row gap-4 md:gap-8 items-stretch lg:items-center justify-center">
                
                {/* Score Dial */}
                <div className="flex flex-col items-center bg-white p-6 md:p-10 rounded-2xl md:rounded-[3rem] border-[3px] md:border-[4px] border-slate-100 shadow-md relative">
                  <div className="relative w-32 h-32 md:w-48 md:h-48 flex flex-col items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                      <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                      <circle 
                        cx="50" cy="50" r="40" 
                        stroke="currentColor" strokeWidth="8" fill="transparent" 
                        strokeDasharray="251.2" 
                        strokeDashoffset={251.2 - (251.2 * finalResult.finalScore) / 100} 
                        className={finalResult.finalScore >= 80 ? "text-emerald-400" : "text-amber-400"} 
                        style={{ transition: "stroke-dashoffset 1.5s ease-out" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-3xl md:text-5xl font-black text-slate-800">{finalResult.finalScore}</p>
                      <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">/ 100</p>
                    </div>
                  </div>
                  <div className="text-center mt-4 md:mt-6 space-y-0.5 md:space-y-1">
                    <p className="text-base md:text-lg font-black text-slate-800">
                      {finalResult.finalScore >= 80 ? "Gacor Banget!" : "Lumayan, Gas Lagi!"}
                    </p>
                    <p className="text-xs md:text-sm font-bold text-slate-500">
                      {finalResult.finalScore >= 80 ? "Tinggal rapiin dikit udah aman." : "Masih ada celah, latihan sekali lagi ya!"}
                    </p>
                  </div>

                  {/* Hiring likelihood badge (interview mode) */}
                  {finalResult.hiringLikelihood !== undefined && (
                    <div className="mt-4 bg-indigo-50 border-2 border-indigo-100 rounded-2xl px-4 py-2 text-center">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Peluang Diterima</p>
                      <p className="text-2xl font-black text-indigo-600">{finalResult.hiringLikelihood}%</p>
                    </div>
                  )}
                </div>

                {/* Unresolved Points */}
                {finalResult.unresolvedPoints && finalResult.unresolvedPoints.length > 0 && (
                  <div className="flex-1 bg-white rounded-2xl md:rounded-[2.5rem] border-[3px] md:border-[4px] border-rose-100 p-4 md:p-8">
                    <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-5">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-500 shrink-0">
                        <AlertCircle size={18} strokeWidth={2.5} />
                      </div>
                      <h3 className="text-base md:text-lg font-black text-slate-800">Poin Kritis (PR Kamu)</h3>
                    </div>
                    <div className="flex flex-col gap-2 md:gap-3">
                      {finalResult.unresolvedPoints.slice(0, 3).map((point: string, i: number) => (
                        <div key={i} className="flex gap-2 md:gap-3 bg-rose-50 p-3 md:p-4 rounded-xl md:rounded-2xl">
                          <span className="font-black text-rose-400 shrink-0">#{i + 1}</span>
                          <p className="text-xs md:text-sm font-bold text-slate-700 leading-relaxed">{point}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Tips Improvement */}
              <div className="max-w-4xl mx-auto w-full bg-white rounded-2xl md:rounded-[2.5rem] border-[3px] md:border-[4px] border-emerald-100 p-4 md:p-8">
                <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-5">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-500 shrink-0">
                    <Sparkles size={18} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-base md:text-lg font-black text-slate-800">Tips dari VibeBot</h3>
                </div>
                <div className="prose prose-sm md:prose-base font-bold text-slate-600 max-w-none leading-relaxed">
                  <Markdown>{finalResult.improvementTips}</Markdown>
                </div>
              </div>

              {/* Bank Soal & Jawaban */}
              <div className="max-w-4xl mx-auto w-full bg-white rounded-2xl md:rounded-[2.5rem] border-[3px] md:border-[4px] border-sky-100 p-4 md:p-8">
                <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-sky-100 rounded-xl flex items-center justify-center text-sky-500 shrink-0">
                    <BookOpen size={18} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-base md:text-xl font-black text-slate-800 tracking-tight">Bank Soal & Jawaban Pintar 📚</h3>
                </div>
                
                <div className="space-y-5 md:space-y-6">
                  {answers.map((ans, i) => (
                    <div key={i} className="group">
                      <div className="flex gap-3 md:gap-4 items-start mb-2 md:mb-3">
                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] md:text-xs font-black text-slate-400 shrink-0">
                          {i + 1}
                        </div>
                        <p className="text-sm md:text-base font-black text-slate-700 leading-snug">
                          {ans.question}
                        </p>
                      </div>
                      
                      {/* Indented answers — smaller offset on mobile */}
                      <div className="ml-6 sm:ml-10 md:ml-12 space-y-2 md:space-y-3">
                        <div className="p-3 md:p-5 bg-slate-50 rounded-xl md:rounded-2xl border-2 border-slate-100 relative mt-4">
                          <span className="absolute -top-2.5 left-3 bg-white px-2 text-[9px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest border border-slate-100 rounded-md">
                            Jawaban Kamu
                          </span>
                          <p className="text-xs md:text-sm font-bold text-slate-500 italic leading-relaxed">
                            "{ans.answer || 'Tidak ada jawaban'}"
                          </p>
                        </div>

                        <div className="p-3 md:p-5 bg-emerald-50 rounded-xl md:rounded-2xl border-2 border-emerald-100 relative mt-4">
                          <span className="absolute -top-2.5 left-3 bg-white px-2 text-[9px] md:text-[10px] font-black text-emerald-400 uppercase tracking-widest border border-emerald-100 rounded-md flex items-center gap-1">
                            <Sparkles size={8} /> Jawaban Ideal
                          </span>
                          <p className="text-xs md:text-sm font-bold text-emerald-700 leading-relaxed">
                            {ans.suggestedAnswer || 'AI tidak memberikan saran spesifik untuk poin ini.'}
                          </p>
                        </div>
                      </div>
                      
                      {i < answers.length - 1 && (
                        <div className="h-px w-full bg-slate-100 mt-5 md:mt-8" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-stretch sm:items-center pt-2 md:pt-6 pb-4 md:pb-0">
                <button 
                  onClick={downloadScoreCard}
                  className="bg-amber-400 text-amber-900 border-[3px] md:border-[4px] border-amber-500 px-6 md:px-8 py-4 rounded-2xl font-black text-base md:text-lg active:translate-y-1 active:shadow-none hover:translate-y-1 hover:shadow-none transition-all flex items-center justify-center gap-2 shadow-[0_5px_0_0_#d97706] md:shadow-[0_6px_0_0_#d97706]"
                >
                  <Download size={18} strokeWidth={3} /> Simpan Rapor
                </button>
                <button 
                  onClick={onCancel}
                  className="bg-white text-slate-700 border-[3px] md:border-[4px] border-slate-200 px-6 md:px-8 py-4 rounded-2xl font-black text-base md:text-lg active:translate-y-1 active:shadow-none hover:translate-y-1 hover:shadow-none transition-all flex items-center justify-center gap-2 shadow-[0_5px_0_0_#e2e8f0] md:shadow-[0_6px_0_0_#e2e8f0]"
                >
                  <Zap size={18} strokeWidth={3} className="text-sky-500" /> Latihan Lagi
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