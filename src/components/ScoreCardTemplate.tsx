/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SimulationType } from '../types';
import { Sparkles, Zap, GraduationCap, Briefcase } from 'lucide-react';
import { cn } from '../lib/utils';
import myLogo from '../assets/my-logo.png';

interface ScoreCardTemplateProps {
  userName: string;
  score: number;
  mode: SimulationType;
  hiringLikelihood?: number;
}

export const ScoreCardTemplate = React.forwardRef<HTMLDivElement, ScoreCardTemplateProps>(
  ({ userName, score, mode, hiringLikelihood }, ref) => {
    const isSidang = mode === SimulationType.SIDANG;
    
    // Konfigurasi Tema (Pastel Pop)
    const theme = isSidang ? {
      bg: 'bg-emerald-50',
      border: 'border-emerald-300',
      cardBg: 'bg-emerald-400',
      text: 'text-emerald-800',
      accentText: 'text-emerald-600',
      icon: GraduationCap,
      label: 'Rapor Sidang Santai'
    } : {
      bg: 'bg-rose-50',
      border: 'border-rose-300',
      cardBg: 'bg-rose-400',
      text: 'text-rose-800',
      accentText: 'text-rose-600',
      icon: Briefcase,
      label: 'Rapor Interview Santuy'
    };

    const readinessText = score >= 85 ? 'Siap Bantai!' : score >= 70 ? 'Aman Terkendali' : 'Latihan Lagi Yuk';

    return (
      <div 
        ref={ref}
        // Ukuran standar untuk postingan media sosial (misal: LinkedIn / X)
        className={cn(
          "w-[600px] h-[340px] p-8 relative flex flex-col justify-between overflow-hidden font-sans border-[6px] rounded-[3rem]",
          theme.bg, theme.border
        )}
        id="score-card-capture"
        style={{
          boxShadow: 'inset 0 0 0 10px white' // Garis putih di dalam frame
        }}
      >
        {/* Dekorasi Latar (Dot Pattern sederhana via SVG) */}
        <div 
          className="absolute inset-0 opacity-[0.03] z-0 pointer-events-none" 
          style={{ backgroundImage: `radial-gradient(circle at 2px 2px, black 1px, transparent 0)` , backgroundSize: '16px 16px' }}
        />

        {/* ── Header ── */}
        <div className="flex justify-between items-start relative z-10">
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-[1.5rem] border-[3px] border-slate-200 shadow-sm">
            <div className="w-10 h-10 flex items-center justify-center transition-all">
              <img 
                src={myLogo} 
                alt="Logo" 
                className="w-full h-full object-contain" 
              />
            </div>
            <div className="leading-tight">
              <h1 className="font-black text-lg tracking-tight text-slate-800">Sidang Santai</h1>
              <p className="text-[9px] text-slate-400 tracking-widest uppercase font-bold">VibeBot Evaluator</p>
            </div>
          </div>
          <div className="bg-white px-4 py-2 rounded-full border-[3px] border-slate-200 shadow-sm flex items-center gap-2">
            <theme.icon size={14} className={theme.accentText} strokeWidth={3} />
            <span className={cn("text-[10px] font-black uppercase tracking-widest", theme.accentText)}>
              {theme.label}
            </span>
          </div>
        </div>

        {/* ── Konten Utama ── */}
        <div className="relative z-10 flex items-center justify-between mt-4">
          <div className="space-y-1 max-w-[320px]">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Sertifikat Simulasi</p>
            <h2 className="text-3xl font-black tracking-tight text-slate-800 truncate">{userName}</h2>
            <div className="flex items-center gap-2 mt-2 bg-white w-max px-3 py-1.5 rounded-xl border-[2px] border-slate-200 shadow-sm">
              <Zap className="w-4 h-4 text-amber-500 fill-current" />
              <span className="text-xs font-bold text-slate-600">Berhasil ditantang oleh VibeBot</span>
            </div>
          </div>

          {/* Kotak Skor */}
          <div className="text-center bg-white p-5 rounded-[2rem] border-[4px] border-slate-200 shadow-[0_6px_0_0_rgba(226,232,240,1)] min-w-[140px] transform rotate-3">
             <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Skor Akhir</p>
             <p className={cn("text-6xl font-black tracking-tighter leading-none", theme.accentText)}>
               {score}
             </p>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex justify-between items-end relative z-10 pt-4">
          <div className="flex gap-4">
            {hiringLikelihood !== undefined && (
              <div className="flex flex-col bg-white px-4 py-2 rounded-[1rem] border-[3px] border-slate-200 shadow-sm">
                <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Peluang Lolos</span>
                <span className="text-sm font-black text-sky-500">{hiringLikelihood}%</span>
              </div>
            )}
            <div className="flex flex-col bg-white px-4 py-2 rounded-[1rem] border-[3px] border-slate-200 shadow-sm">
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Kesiapan Mental</span>
              <span className={cn("text-sm font-black flex items-center gap-1", theme.accentText)}>
                <Sparkles size={14} /> {readinessText}
              </span>
            </div>
          </div>
          <div className="text-right">
             <p className={cn("text-[10px] font-black uppercase tracking-widest bg-white px-3 py-1.5 rounded-lg border-[2px] border-slate-200", theme.text)}>
               #SiapDibantai #JuaraVibeCoding
             </p>
          </div>
        </div>
      </div>
    );
  }
);