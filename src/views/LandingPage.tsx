/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { SimulationType } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  GraduationCap,
  Briefcase,
  ArrowRight,
  Upload,
  Users,
  MessageSquare,
  BarChart2,
  FileText,
  UserCheck,
  Mic,
  Star,
  Bot,
  Sparkles,
  Zap,
  CheckCircle2,
  ChevronRight,
  Flame,
  Target,
  Smile,
  Coffee,
  BookOpen
} from 'lucide-react';
import { cn } from '../lib/utils';

interface LandingPageProps {
  onStart: (mode: SimulationType) => void;
}

// ─── Spring / transition configs (Dibuat lebih "bouncy" ala game) ───────────
const SPRING_BOUNCY = { type: 'spring', damping: 15, stiffness: 250 } as const;
const SPRING_SMOOTH = { type: 'spring', damping: 25, stiffness: 200 } as const;

// ─── Shared animation variants ──────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { ...SPRING_SMOOTH } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

// ─── Data (Dirombak dengan Copywriting Santai & Gemas) ──────────────────────
const STATS = [
  { num: '2.4rb+', label: 'Mahasiswa Santuy 🧸' },
  { num: '98%', label: 'Lulus dengan Ceria 🌸' },
  { num: '15rb+', label: 'Sesi Latihan Cute 🍭' },
];

const STEPS = [
  {
    num: '01',
    title: 'Pilih Mode Latihanmu 🎀',
    desc: 'Mau main peran Sidang TA/Skripsi yang seru atau Interview Kerja? Pilih petualanganmu hari ini!',
  },
  {
    num: '02',
    title: 'Kirim Draf / CV Kamu 📄',
    desc: 'Taruh draf skripsi (PDF) atau CV kamu di sini agar penguji imut bisa mempelajari topikmu.',
  },
  {
    num: '03',
    title: 'Ayo Mulai Mengobrol! 💬',
    desc: 'Jawab pertanyaan melalui suara atau ketikan santai. Hadapi dosen galak dengan tenang dan ceria!',
  },
];

const BENEFITS = [
  {
    icon: Smile,
    title: 'Penguji Sangat Pintar 🧸',
    desc: 'Bukan sekadar sistem biasa. Penguji kami membaca PDF TA/Skripsi-mu dan menanyakan poin penting secara cerdas.',
  },
  {
    icon: CheckCircle2,
    title: 'Ruang Nyaman & Tenang 🌸',
    desc: 'Bebas latihan berulang-ulang tanpa rasa takut atau insecure. Semua latihanmu bersifat privat.',
  },
  {
    icon: Coffee,
    title: 'Teman Belajar 24/7 🍰',
    desc: 'Besok pagi jadwal presentasi? Tenang, penguji imut siap menemanimu simulasi kapan saja kamu butuh.',
  },
  {
    icon: BarChart2,
    title: 'Rapor Evaluasi yang Informatif 📊',
    desc: 'Dapatkan skor penilaian beserta masukan spesifik untuk meningkatkan kualitas jawabanmu.',
  },
  {
    icon: Users,
    title: 'Karakter Penguji Unik 🐱',
    desc: 'Berinteraksi langsung dengan 3 karakter penguji: Dr. Metod, Pak Aris, dan Bu Ima.',
  },
  {
    icon: Star,
    title: 'Gratis Selamanya 🍭',
    desc: 'Tinggal masuk menggunakan akun Google Anda dan mulai berlatih tanpa ribet.',
  },
];

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatItem({ num, label }: { num: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl md:text-4xl font-black tracking-tight text-slate-700 leading-none">
        {num}
      </p>
      <p className="text-sm text-slate-500 font-bold mt-2 bg-slate-100 inline-block px-3 py-1 rounded-full">{label}</p>
    </div>
  );
}

function StepItem({
  step,
  index,
  active,
  onClick,
}: {
  step: (typeof STEPS)[0];
  index: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.li
      variants={fadeUp}
      onClick={onClick}
      className={cn(
        'flex items-start gap-4 p-5 rounded-3xl border-[3px] cursor-pointer transition-all duration-300',
        active
          ? 'bg-sky-50 border-sky-300 shadow-[0_8px_0_0_rgba(125,211,252,0.5)] transform -translate-y-1'
          : 'border-slate-100 bg-white hover:border-sky-200 hover:bg-sky-50/50'
      )}
    >
      <span
        className={cn(
          'w-10 h-10 flex-shrink-0 rounded-2xl flex items-center justify-center text-sm font-black transition-colors',
          active
            ? 'bg-sky-400 text-white'
            : 'bg-slate-100 text-slate-400'
        )}
      >
        {step.num}
      </span>
      <div>
        <p className="text-base font-bold text-slate-700">{step.title}</p>
        <p className="text-sm text-slate-500 mt-1 leading-relaxed font-medium">{step.desc}</p>
      </div>
    </motion.li>
  );
}

function BenefitCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -8, transition: SPRING_BOUNCY }}
      className="bg-white border-[3px] border-slate-100 rounded-[2rem] p-6 flex flex-col gap-4 hover:border-amber-200 hover:shadow-[0_8px_0_0_rgba(253,230,138,0.5)] transition-all duration-300"
    >
      <span className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-500 flex-shrink-0">
        <Icon size={24} strokeWidth={2.5} />
      </span>
      <h4 className="text-base font-bold text-slate-700">{title}</h4>
      <p className="text-sm text-slate-500 leading-relaxed font-medium">{desc}</p>
    </motion.div>
  );
}

// ─── ModeCard (Duolingo / Notion Vibe) ───────────────────────────────────────

interface CompactModeCardProps {
  title: string;
  badge: string;
  description: string;
  Icon: React.ElementType;
  colorTheme: 'pink' | 'purple' | 'emerald' | 'amber' | 'sky' | 'violet';
  onClick: () => void;
}

function CompactModeCard({ title, badge, description, Icon, colorTheme, onClick }: CompactModeCardProps) {
  const themes = {
    pink: {
      border: 'border-pink-200 hover:border-pink-300',
      bg: 'bg-pink-50/30 hover:bg-pink-50/70',
      iconBg: 'bg-pink-400 text-white',
      badgeBg: 'bg-pink-100 text-pink-700',
      shadow: 'hover:shadow-[0_6px_0_0_#ffccd5] active:translate-y-0.5',
      btn: 'bg-pink-400 hover:bg-pink-500 shadow-[0_3px_0_0_#ff4d6d]'
    },
    purple: {
      border: 'border-purple-200 hover:border-purple-300',
      bg: 'bg-purple-50/30 hover:bg-purple-50/70',
      iconBg: 'bg-purple-400 text-white',
      badgeBg: 'bg-purple-100 text-purple-700',
      shadow: 'hover:shadow-[0_6px_0_0_#e8daff] active:translate-y-0.5',
      btn: 'bg-purple-400 hover:bg-purple-500 shadow-[0_3px_0_0_#a855f7]'
    },
    emerald: {
      border: 'border-emerald-200 hover:border-emerald-300',
      bg: 'bg-emerald-50/30 hover:bg-emerald-50/70',
      iconBg: 'bg-emerald-400 text-white',
      badgeBg: 'bg-emerald-100 text-emerald-700',
      shadow: 'hover:shadow-[0_6px_0_0_#a7f3d0] active:translate-y-0.5',
      btn: 'bg-emerald-400 hover:bg-emerald-500 shadow-[0_3px_0_0_#059669]'
    },
    amber: {
      border: 'border-amber-200 hover:border-amber-300',
      bg: 'bg-amber-50/30 hover:bg-amber-50/70',
      iconBg: 'bg-amber-400 text-white',
      badgeBg: 'bg-amber-100 text-amber-800',
      shadow: 'hover:shadow-[0_6px_0_0_#fde047] active:translate-y-0.5',
      btn: 'bg-amber-400 hover:bg-amber-500 shadow-[0_3px_0_0_#d97706]'
    },
    sky: {
      border: 'border-sky-200 hover:border-sky-300',
      bg: 'bg-sky-50/30 hover:bg-sky-50/70',
      iconBg: 'bg-sky-400 text-white',
      badgeBg: 'bg-sky-100 text-sky-700',
      shadow: 'hover:shadow-[0_6px_0_0_#a2d2ff] active:translate-y-0.5',
      btn: 'bg-sky-400 hover:bg-sky-500 shadow-[0_3px_0_0_#0ea5e9]'
    },
    violet: {
      border: 'border-violet-200 hover:border-violet-300',
      bg: 'bg-violet-50/30 hover:bg-violet-50/70',
      iconBg: 'bg-violet-400 text-white',
      badgeBg: 'bg-violet-100 text-violet-700',
      shadow: 'hover:shadow-[0_6px_0_0_#ddd6fe] active:translate-y-0.5',
      btn: 'bg-violet-400 hover:bg-violet-500 shadow-[0_3px_0_0_#7c3aed]'
    }
  }[colorTheme];

  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4, transition: SPRING_BOUNCY }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "bg-white rounded-[2rem] border-[3px] p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer transition-all duration-200",
        themes.border,
        themes.bg,
        themes.shadow
      )}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center border-2 border-white shadow-sm shrink-0",
          themes.iconBg
        )}>
          <Icon size={22} strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-black text-slate-800 leading-snug">
              {title}
            </h3>
            <span className={cn(
              "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0",
              themes.badgeBg
            )}>
              {badge}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-bold mt-1.5 leading-normal">
            {description}
          </p>
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 active:translate-y-0.5 transition-all duration-150 transform active:shadow-none active:translate-y-1",
          themes.btn
        )}
      >
        <ArrowRight size={18} strokeWidth={3} />
      </button>
    </motion.div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

export default function LandingPage({ onStart }: LandingPageProps) {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="min-h-screen bg-transparent font-sans overflow-x-hidden text-slate-700">
      
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative pt-16 pb-12 px-4 md:px-8 text-center overflow-hidden">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="max-w-7xl mx-auto flex flex-col items-center"
        >
          {/* Badge Gemas */}
          <motion.div variants={fadeUp} className="mb-6">
            <span className="inline-flex items-center gap-2 text-sm font-bold text-purple-600 bg-purple-50 border-2 border-purple-200 px-4 py-2 rounded-full shadow-sm">
              <Smile size={16} className="text-purple-500 animate-pulse" /> Teman Ujian Siap Menemanimu! 🧸
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-2xl sm:text-4xl md:text-5xl lg:text-7xl font-black tracking-tight text-slate-800 leading-[1.1] mb-4 md:mb-6"
          >
            Tegang di Simulasi, <br />
            <span className="text-pink-500 inline-block transform -rotate-1">Santai</span>{' '}
            <span className="text-slate-400">di</span>{' '}
            <span className="text-sky-400 inline-block transform rotate-1">Eksekusi. 🧸</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-base md:text-xl text-slate-500 font-medium max-w-2xl mx-auto mb-8 md:mb-10 leading-relaxed px-4 md:px-0"
          >
            Upload PDF TA/Skripsi atau CV kamu. Biar para penguji kami bermain peran sebagai 'dosen galak' atau 'HRD kritis' buat melatih mentalmu sampai berani tampil dengan asyik!
          </motion.p>

          {/* Stats row */}
          <motion.div
            variants={fadeUp}
            className="flex flex-wrap items-center justify-center gap-6 md:gap-12 bg-white border-[3px] border-purple-100 p-6 rounded-[2rem] shadow-sm"
          >
            {STATS.map((s, i) => (
              <React.Fragment key={s.num}>
                {i > 0 && <span className="hidden md:block w-1.5 h-1.5 rounded-full bg-purple-100" />}
                <StatItem {...s} />
              </React.Fragment>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── Mode Cards ────────────────────────────────────────────────── */}
      <section className="px-4 md:px-8 pb-16">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          {/* 🎓 Rumpun Akademik: Sidang TA/Skripsi */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
            className="space-y-6 bg-pink-50/20 border-[3px] border-pink-100 rounded-[2.5rem] p-6 md:p-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-pink-400 text-white rounded-2xl flex items-center justify-center border-2 border-white shadow-sm shrink-0">
                <GraduationCap size={24} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-800 leading-snug">Simulasi Sidang TA/Skripsi</h2>
                <p className="text-xs text-slate-500 font-bold mt-0.5">Latih argumen riset & mental pertahankan skripsi/TA</p>
              </div>
            </div>
            
            <div className="flex flex-col gap-4">
              <CompactModeCard
                title="Sidang Santai (Chat)"
                badge="Santai"
                description="Tanya-jawab tertulis bab per bab dengan 3 dosen penguji."
                Icon={MessageSquare}
                colorTheme="pink"
                onClick={() => onStart(SimulationType.SIDANG)}
              />
              <CompactModeCard
                title="Live Call Sidang (Suara)"
                badge="Suara"
                description="Uji mental lewat panggilan suara interaktif langsung dengan dosen."
                Icon={Mic}
                colorTheme="purple"
                onClick={() => onStart(SimulationType.MEETING_SIDANG)}
              />
              <CompactModeCard
                title="Flashcard Sidang (Kuis)"
                badge="Pilihan Ganda"
                description="Kuis interaktif A, B, C untuk uji teori & konsep skripsi Anda."
                Icon={BookOpen}
                colorTheme="emerald"
                onClick={() => onStart(SimulationType.FLASHCARD_SIDANG)}
              />
            </div>
          </motion.div>

          {/* 👔 Rumpun Karir: Interview Kerja */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
            className="space-y-6 bg-sky-50/20 border-[3px] border-sky-100 rounded-[2.5rem] p-6 md:p-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-sky-400 text-white rounded-2xl flex items-center justify-center border-2 border-white shadow-sm shrink-0">
                <Briefcase size={24} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-800 leading-snug">Simulasi Interview Kerja</h2>
                <p className="text-xs text-slate-500 font-bold mt-0.5">Asah taktik interview & latih mental offering</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <CompactModeCard
                title="Interview Santuy (Chat)"
                badge="HR & User"
                description="Latihan interview berbasis chat sesuai CV & detail lowongan kerja."
                Icon={MessageSquare}
                colorTheme="amber"
                onClick={() => onStart(SimulationType.INTERVIEW)}
              />
              <CompactModeCard
                title="Live Call Interview (Suara)"
                badge="Suara"
                description="Panggilan suara interaktif dengan HRD/Tech Lead secara kritis."
                Icon={Mic}
                colorTheme="sky"
                onClick={() => onStart(SimulationType.MEETING_INTERVIEW)}
              />
              <CompactModeCard
                title="Flashcard Interview (Kuis)"
                badge="Pilihan Ganda"
                description="Kuis interaktif A, B, C untuk latih materi kerja & kompetensi CV."
                Icon={BookOpen}
                colorTheme="violet"
                onClick={() => onStart(SimulationType.FLASHCARD_INTERVIEW)}
              />
            </div>
          </motion.div>

        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────── */}
      <section className="bg-white border-y-[4px] border-purple-100/70 py-16 md:py-24 px-4 md:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">
          <div>
            <span className="inline-flex items-center gap-2 text-sm font-bold text-purple-500 uppercase tracking-widest mb-4">
              <ChevronRight size={16} strokeWidth={3} /> Flow Paling Mudah 🧸
            </span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-800 mb-6 leading-tight">
              Tiga Langkah Mudah <br /> Menuju Mental Juara 🧸
            </h2>
            <ol className="flex flex-col gap-4">
              {STEPS.map((step, i) => (
                <StepItem
                  key={i}
                  step={step}
                  index={i}
                  active={activeStep === i}
                  onClick={() => setActiveStep(i)}
                />
              ))}
            </ol>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={SPRING_BOUNCY}
            className="bg-[linear-gradient(135deg,_rgba(255,204,213,0.3)_0%,_rgba(243,229,245,0.3)_35%,_rgba(224,242,254,0.3)_70%,_rgba(230,252,245,0.3)_100%)] rounded-[2.5rem] border-[4px] border-purple-200/50 p-6 md:p-8 flex items-center justify-center min-h-[350px]"
          >
            {/* Ilustrasi UI Mockup yg Gemas */}
            <div className="bg-white w-full max-w-sm rounded-3xl border-[4px] border-purple-100/60 shadow-xl overflow-hidden flex flex-col">
              <div className="bg-gradient-to-r from-pink-50/50 to-sky-50/50 border-b-[3px] border-purple-100/60 p-4 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-400 animate-pulse" />
                <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="p-6 flex flex-col gap-4 items-center">
                <div className="w-20 h-20 bg-gradient-to-br from-pink-100 to-sky-100 rounded-full flex items-center justify-center text-purple-500 mb-2">
                  <Smile size={40} strokeWidth={2} />
                </div>
                <div className="w-3/4 h-4 bg-purple-50/70 rounded-full animate-pulse" />
                <div className="w-1/2 h-4 bg-purple-50/50 rounded-full animate-pulse" />
                <div className="w-full mt-4 flex gap-2">
                  <div className="flex-1 h-12 bg-purple-50/50 rounded-2xl" />
                  <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-sky-400 rounded-2xl flex items-center justify-center text-white border-[2px] border-purple-300">
                    <Mic size={20} />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Benefits ──────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 text-sm font-bold text-purple-500 uppercase tracking-widest mb-4">
              <Sparkles size={16} /> Kenapa Pakai Ini? 🧸
            </span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-800">
              Biar Nggak Keringat Dingin Lagi 🍰
            </h2>
          </div>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {BENEFITS.map((b) => (
              <BenefitCard key={b.title} {...b} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA Banner ── (Uses slanted gender-gradient) */}
      <section className="px-4 md:px-8 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-7xl mx-auto bg-[linear-gradient(135deg,_#fbcfe8_0%,_#e9d5ff_35%,_#bae6fd_70%,_#c6f6d5_100%)] rounded-[2rem] md:rounded-[3rem] border-[4px] md:border-[6px] border-white shadow-xl overflow-hidden p-8 md:p-20 text-center relative"
        >
          <div className="relative z-10">
            <h2 className="text-2xl md:text-5xl font-black tracking-tight text-purple-950 mb-6 leading-tight">
              Waktunya Bersinar <br /> di Hari H! 🎓
            </h2>
            <p className="text-lg text-purple-900/80 font-bold max-w-lg mx-auto mb-10">
              Gabung bersama kami dan ribuan mahasiswa lainnya yang sudah membuktikan mudahnya melatih mental presentasi!
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => onStart(SimulationType.SIDANG)}
                className="bg-white text-purple-600 font-black text-lg px-8 py-4 rounded-2xl shadow-[0_6px_0_0_#e8daff] hover:translate-y-1 hover:shadow-[0_2px_0_0_#e8daff] transition-all flex items-center gap-3"
              >
                <GraduationCap size={20} strokeWidth={3} /> Gas Latihan! 🧸
              </button>
            </div>
          </div>
        </motion.div>
      </section>

    </div>
  );
}