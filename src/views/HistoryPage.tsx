/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { Simulation, SimulationType, SimulationStatus } from '../types';
import { 
  History, Calendar, GraduationCap, Briefcase, 
  Trash2, ArrowLeft, Loader2, Zap, Bot,
  AlertCircle, Sparkles, BookOpen, Download, CircleX, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { PANELISTS } from '../components/PanelistAvatar';
import { ScoreCardTemplate } from '../components/ScoreCardTemplate';
import { toPng } from 'html-to-image';
import Markdown from 'react-markdown';

interface HistoryPageProps {
  onBack: () => void;
}

// Konfigurasi animasi bouncy
const SPRING_BOUNCY = { type: 'spring', damping: 15, stiffness: 250 } as const;

export default function HistoryPage({ onBack }: HistoryPageProps) {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSim, setSelectedSim] = useState<Simulation | null>(null);
  const scoreCardRef = useRef<HTMLDivElement>(null);
  const user = auth.currentUser;

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'simulations'),
        where('userId', '==', user?.uid),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const sims: Simulation[] = [];
      querySnapshot.forEach((doc) => {
        sims.push({ id: doc.id, ...doc.data() } as Simulation);
      });
      setSimulations(sims);
    } catch (err) {
      console.error("Fetch history failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (deleteId: string) => {
    if (window.confirm("Yakin mau hapus riwayat latihan ini? Sayang lho! 🥺")) {
      try {
        await deleteDoc(doc(db, 'simulations', deleteId));
        fetchHistory();
      } catch (err) {
        console.error("Delete failed", err);
      }
    }
  };
  const downloadScoreCard = async () => {
    if (scoreCardRef.current === null || !selectedSim) return;
    try {
      const dataUrl = await toPng(scoreCardRef.current, { cacheBust: true });
      const link = document.createElement('a');
      link.download = `Rapor-Santuy-${user?.displayName?.replace(/\s+/g, '-') || 'User'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download score card', err);
    }
  };
  // --- Loading State ---
  if (loading) {
    return (
      <div className="py-32 flex flex-col items-center justify-center gap-5">
        <div className="w-16 h-16 bg-sky-100 rounded-2xl flex items-center justify-center border-4 border-sky-200">
          <Loader2 className="w-8 h-8 animate-spin text-sky-500" strokeWidth={3} />
        </div>
        <p className="text-slate-500 font-bold text-base">Bongkar laci memori dulu...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-8 px-4">
      
      {/* ── Header Card ── */}
      <div className="flex items-center gap-5 bg-sky-50 p-6 md:p-8 rounded-[2.5rem] border-[4px] border-sky-200 relative overflow-hidden">
        {/* Dekorasi Background */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-sky-200/50 rounded-full blur-2xl pointer-events-none" />
        
        <button 
          onClick={onBack}
          className="w-14 h-14 flex-shrink-0 flex items-center justify-center bg-white hover:bg-slate-50 text-sky-600 rounded-2xl border-[3px] border-sky-200 transition-all shadow-[0_4px_0_0_rgba(186,230,253,1)] hover:translate-y-1 hover:shadow-none"
        >
          <ArrowLeft size={24} strokeWidth={3} />
        </button>
        <div className="z-10">
          <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight leading-none mb-1">
            Riwayat Santuy
          </h2>
          <p className="text-slate-500 font-bold text-sm md:text-base">
            Pantau seberapa tebal mental bajamu di sini.
          </p>
        </div>
      </div>

      {/* ── Empty State ── */}
      {simulations.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white border-[4px] border-dashed border-slate-200 rounded-[3rem] p-16 text-center flex flex-col items-center justify-center gap-6"
        >
          <div className="w-24 h-24 bg-slate-100 rounded-[2rem] flex items-center justify-center text-slate-400 border-[3px] border-slate-200">
            <Bot size={48} strokeWidth={2.5} />
          </div>
          <div className="space-y-2">
            <h3 className="font-black text-2xl text-slate-700">Yah, riwayatnya masih kosong!</h3>
            <p className="text-base font-bold text-slate-400 max-w-md mx-auto">
              Belum ada simulasi yang tersimpan. Yuk, mulai latihan pertamamu dan kumpulin skor terbaik!
            </p>
          </div>
          <button 
            onClick={onBack}
            className="mt-4 bg-emerald-400 text-white px-8 py-4 rounded-2xl font-black text-lg border-[3px] border-emerald-500 shadow-[0_6px_0_0_rgba(16,185,129,1)] hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-2"
          >
            Mulai Simulasi <Zap size={20} className="fill-current" />
          </button>
        </motion.div>

      ) : (
        
        /* ── History List ── */
        <div className="grid gap-5">
          {simulations.map((sim, idx) => {
            const isSidang = sim.type === SimulationType.SIDANG;
            
            // Konfigurasi Warna berdasarkan Tipe
            const theme = isSidang ? {
              bg: 'bg-emerald-50',
              border: 'border-emerald-200',
              hoverBorder: 'hover:border-emerald-300',
              shadow: 'hover:shadow-[0_6px_0_0_rgba(167,243,208,1)]',
              iconBg: 'bg-emerald-400',
              text: 'text-emerald-700',
              pillBg: 'bg-emerald-200',
              Icon: GraduationCap
            } : {
              bg: 'bg-rose-50',
              border: 'border-rose-200',
              hoverBorder: 'hover:border-rose-300',
              shadow: 'hover:shadow-[0_6px_0_0_rgba(254,205,211,1)]',
              iconBg: 'bg-rose-400',
              text: 'text-rose-700',
              pillBg: 'bg-rose-200',
              Icon: Briefcase
            };

            return (
              <motion.div
                key={sim.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, ...SPRING_BOUNCY }}
                className={cn(
                  "bg-white rounded-[2rem] border-[4px] p-5 sm:p-6 transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 group cursor-pointer",
                  theme.border, theme.hoverBorder, theme.shadow
                )}
                onClick={() => setSelectedSim(sim)}
              >
                <div className="flex items-center gap-5 w-full sm:w-auto">
                  {/* Icon Card */}
                  <div className={cn(
                    "w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-[1.5rem] flex items-center justify-center text-white border-[3px] border-white shadow-sm transform -rotate-2 group-hover:rotate-0 transition-transform",
                    theme.iconBg
                  )}>
                    <theme.Icon size={32} strokeWidth={2.5} />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h4 className="font-black text-slate-800 text-lg sm:text-xl tracking-tight line-clamp-1">
                        {sim.title}
                      </h4>
                      {sim.status === SimulationStatus.COMPLETED && (
                        <span className={cn(
                          "text-[10px] sm:text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border-2 border-white",
                          theme.pillBg, theme.text
                        )}>
                          Selesai
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                        <Calendar size={14} strokeWidth={2.5} />
                        {sim.createdAt?.toDate ? format(sim.createdAt.toDate(), 'dd MMM yyyy, HH:mm', { locale: id }) : 'Waktu tidak tersedia'}
                      </span>
                      
                      {sim.finalScore && (
                        <span className={cn(
                          "flex items-center gap-1.5 text-sm font-black px-3 py-1 rounded-xl bg-amber-100 text-amber-600 border-2 border-amber-200"
                        )}>
                          <Zap size={14} className="fill-current" />
                          Skor: {sim.finalScore}/100
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t-2 border-slate-100 sm:border-t-0">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(sim.id!);
                    }}
                    className="w-12 h-12 bg-white text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl border-[3px] border-slate-100 hover:border-red-200 transition-all flex items-center justify-center hover:shadow-[0_4px_0_0_rgba(254,205,211,1)] hover:-translate-y-1"
                    title="Hapus Riwayat"
                  >
                    <Trash2 size={20} strokeWidth={2.5} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Detailed Modal ── */}
      <AnimatePresence>
        {selectedSim && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#fafaf9] rounded-[2.5rem] border-[4px] border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="bg-sky-100 border-b-[3px] border-sky-200 p-5 md:p-6 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center text-white border-[3px] border-white shadow-sm", 
                    selectedSim.type.includes('sidang') ? 'bg-emerald-400' : 'bg-rose-400'
                  )}>
                    {selectedSim.type.includes('sidang') ? <GraduationCap size={24} /> : <Briefcase size={24} />}
                  </div>
                  <div>
                    <h3 className="font-black text-base md:text-xl text-slate-800 tracking-tight leading-none mb-1">{selectedSim.title}</h3>
                    <p className="text-slate-500 text-[10px] sm:text-xs font-bold bg-white/50 inline-block px-2 py-0.5 rounded-md">
                      {selectedSim.createdAt?.toDate ? format(selectedSim.createdAt.toDate(), 'dd MMMM yyyy, HH:mm', { locale: id }) : 'Waktu tidak tersedia'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedSim(null)}
                  className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 border-2 border-slate-200 hover:scale-105 transition-all shadow-sm"
                >
                  <CircleX size={20} strokeWidth={3} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 md:p-8 space-y-6 flex-1 overflow-y-auto">
                
                {/* Vibe Badge */}
                {selectedSim.vibe && (
                  <div className="bg-indigo-50 border-2 border-indigo-100 rounded-2xl p-3 flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={14} /> Vibe Penguji Aktif
                    </span>
                    <span className="text-xs sm:text-sm font-black text-indigo-800 uppercase bg-indigo-100 px-3 py-1 rounded-full border border-indigo-200">
                      {{
                        standard: 'Standar 😐',
                        killer: 'Killer 💀',
                        santai: 'Santuy 😊',
                        gokil: 'Gokil 🤪'
                      }[selectedSim.vibe]}
                    </span>
                  </div>
                )}

                {/* Score + Unresolved */}
                <div className="flex flex-col md:flex-row gap-6 items-stretch justify-center">
                  {/* Score Dial */}
                  <div className="flex flex-col items-center bg-white p-6 rounded-3xl border-3 border-slate-100 shadow-sm relative min-w-[200px]">
                    <div className="relative w-32 h-32 flex flex-col items-center justify-center">
                      <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                        <circle 
                          cx="50" cy="50" r="40" 
                          stroke="currentColor" strokeWidth="8" fill="transparent" 
                          strokeDasharray="251.2" 
                          strokeDashoffset={251.2 - (251.2 * (selectedSim.finalScore ?? 0)) / 100} 
                          className={(selectedSim.finalScore ?? 0) >= 80 ? "text-emerald-400" : "text-amber-400"} 
                          style={{ transition: "stroke-dashoffset 1.5s ease-out" }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-3xl font-black text-slate-800">{selectedSim.finalScore ?? 0}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">/ 100</p>
                      </div>
                    </div>
                    <div className="text-center mt-3 space-y-0.5">
                      <p className="text-sm font-black text-slate-800">
                        {(selectedSim.finalScore ?? 0) >= 80 ? "Gacor Banget!" : "Lumayan, Gas Lagi!"}
                      </p>
                    </div>
                    {selectedSim.hiringLikelihood !== undefined && (
                      <div className="mt-3 bg-indigo-50 border-2 border-indigo-100 rounded-2xl px-4 py-1 text-center w-full">
                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest leading-none mt-1">Peluang Lolos</p>
                        <p className="text-xl font-black text-indigo-600">{selectedSim.hiringLikelihood}%</p>
                      </div>
                    )}
                  </div>

                  {/* Unresolved Points */}
                  {selectedSim.unresolvedPoints && selectedSim.unresolvedPoints.length > 0 ? (
                    <div className="flex-1 bg-white rounded-3xl border-3 border-rose-100 p-6 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-rose-100 rounded-xl flex items-center justify-center text-rose-500 shrink-0">
                          <AlertCircle size={16} strokeWidth={2.5} />
                        </div>
                        <h3 className="text-sm font-black text-slate-800">Poin Kritis (PR Kamu)</h3>
                      </div>
                      <div className="flex flex-col gap-2">
                        {selectedSim.unresolvedPoints.slice(0, 3).map((point: string, i: number) => (
                          <div key={i} className="flex gap-2.5 bg-rose-50/50 p-2.5 rounded-xl border border-rose-100">
                            <span className="font-black text-rose-400 shrink-0">#{i + 1}</span>
                            <p className="text-xs font-bold text-slate-700 leading-relaxed">{point}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 bg-white rounded-3xl border-3 border-emerald-100 p-6 shadow-sm flex items-center justify-center text-center">
                      <div className="space-y-1">
                        <p className="text-emerald-500 font-black text-base flex items-center justify-center gap-1.5"><Sparkles size={18} /> Bersih dari PR!</p>
                        <p className="text-xs text-slate-400 font-bold">Semua topik berhasil kamu pertahankan dengan gacor.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tips Improvement */}
                {selectedSim.improvementTips && (
                  <div className="bg-white rounded-3xl border-3 border-emerald-100 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-500 shrink-0">
                        <Sparkles size={16} />
                      </div>
                      <h3 className="text-sm font-black text-slate-800">Tips dari VibeBot</h3>
                    </div>
                    <div className="prose prose-sm font-bold text-slate-600 leading-relaxed max-w-none">
                      <Markdown>{selectedSim.improvementTips}</Markdown>
                    </div>
                  </div>
                )}

                {/* Q&A List */}
                {selectedSim.questions && selectedSim.questions.length > 0 && (
                  <div className="bg-white rounded-3xl border-3 border-sky-100 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-sky-100 rounded-xl flex items-center justify-center text-sky-500 shrink-0">
                        <BookOpen size={16} />
                      </div>
                      <h3 className="text-sm font-black text-slate-800">Bank Soal & Jawaban Pintar 📚</h3>
                    </div>
                    <div className="space-y-5">
                      {selectedSim.questions.map((ans, i) => (
                        <div key={i} className="group">
                          <div className="flex gap-2.5 items-start mb-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 shrink-0">
                              {i + 1}
                            </div>
                            <div>
                              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-0.5 block">
                                Ditanyakan oleh {PANELISTS[ans.panelistId]?.name || 'Penguji'}
                              </span>
                              <p className="text-xs font-black text-slate-700 leading-snug">{ans.question}</p>
                            </div>
                          </div>
                          
                          <div className="ml-8 space-y-2">
                            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 relative mt-2.5">
                              <span className="absolute -top-2.5 left-3 bg-white px-1.5 text-[8px] font-black text-slate-300 uppercase tracking-widest border border-slate-100 rounded">
                                Jawaban Kamu
                              </span>
                              <p className="text-[11px] font-bold text-slate-500 italic leading-relaxed">
                                "{ans.answer || 'Tidak ada jawaban'}"
                              </p>
                            </div>

                            {ans.feedback && (
                              <div className="p-2.5 bg-amber-50/50 rounded-xl border border-amber-100 text-[11px] font-bold text-amber-700">
                                💡 <strong>Evaluasi:</strong> {ans.feedback}
                              </div>
                            )}

                            <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 relative mt-2.5">
                              <span className="absolute -top-2.5 left-3 bg-white px-1.5 text-[8px] font-black text-emerald-400 uppercase tracking-widest border border-emerald-100 rounded flex items-center gap-0.5">
                                <Sparkles size={8} /> Jawaban Ideal
                              </span>
                              <p className="text-[11px] font-bold text-emerald-700 leading-relaxed">
                                {ans.suggestedAnswer || 'AI tidak memberikan saran spesifik untuk poin ini.'}
                              </p>
                            </div>
                          </div>
                          {i < selectedSim.questions.length - 1 && (
                            <div className="h-px w-full bg-slate-100 mt-4" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 md:p-6 border-t border-slate-100 bg-white rounded-b-[2.2rem] flex justify-between items-center gap-3 shrink-0">
                <button 
                  onClick={downloadScoreCard}
                  className="bg-amber-400 text-amber-900 border-[3px] border-amber-500 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_4px_0_0_#d97706] hover:translate-y-0.5 active:translate-y-1 transition-all"
                >
                  <Download size={14} strokeWidth={3} /> Simpan Rapor Card
                </button>
                <button 
                  onClick={() => setSelectedSim(null)}
                  className="bg-slate-100 text-slate-600 border-[3px] border-slate-200 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_4px_0_0_#e2e8f0] hover:translate-y-0.5 active:translate-y-1 transition-all"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden template for download */}
      {selectedSim && (
        <div className="fixed -left-[9999px] top-0 pointer-events-none">
          <ScoreCardTemplate 
            ref={scoreCardRef} 
            userName={user?.displayName || "User"} 
            score={selectedSim.finalScore ?? 0} 
            mode={selectedSim.type} 
            hiringLikelihood={selectedSim.hiringLikelihood} 
          />
        </div>
      )}
    </div>
  );
}