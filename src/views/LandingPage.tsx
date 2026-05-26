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
  Coffee
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
    desc: 'Mau main peran Sidang TA yang seru atau Interview Kerja? Pilih petualanganmu hari ini!',
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
    desc: 'Bukan sekadar sistem biasa. Penguji kami membaca PDF TA-mu dan menanyakan poin penting secara cerdas.',
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

interface ModeCardProps {
  type: 'sidang' | 'interview';
  title: string;
  tagline: string;
  description: string;
  features: { icon: React.ElementType; label: string }[];
  ctaText: string;
  difficulty: { icon: React.ElementType; label: string };
  accent: {
    bg: string;
    border: string;
    shadow: string;
    iconBg: string;
    tagBg: string;
    tagText: string;
    tagIcon: React.ElementType;
    cta: string;
    ctaShadow: string;
  };
  MainIcon: React.ElementType;
  onClick: () => void;
}

function ModeCard({
  title,
  tagline,
  description,
  features,
  ctaText,
  difficulty,
  accent,
  MainIcon,
  onClick,
}: ModeCardProps) {
  const [hovered, setHovered] = useState(false);
  const DiffIcon = difficulty.icon;

  return (
    <motion.article
      variants={fadeUp}
      whileHover={{ y: -8, transition: SPRING_BOUNCY }}
      whileTap={{ scale: 0.96 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onClick}
      className={cn(
        'group relative bg-white rounded-[2.5rem] border-[4px] cursor-pointer flex flex-col',
        'transition-all duration-300',
        accent.border,
        hovered ? accent.shadow : 'shadow-none'
      )}
    >
      {/* ── Card header (Pastel Fill) ── */}
      <div className={cn('relative p-6 md:p-8 rounded-t-[2.2rem] border-b-[4px]', accent.bg, accent.border)}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-3">
            <span className={cn('inline-flex w-max items-center gap-1.5 text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full', accent.tagBg, accent.tagText)}>
              <accent.tagIcon size={12} strokeWidth={3} /> {tagline}
            </span>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-800 leading-none">
              {title}
            </h2>
            <p className="text-sm text-slate-600 font-medium leading-relaxed max-w-[24ch]">
              {description}
            </p>
          </div>
          <motion.div
            animate={hovered ? { rotate: [0, -10, 10, -10, 0], scale: 1.1 } : { rotate: 0, scale: 1 }}
            transition={{ duration: 0.5 }}
            className={cn(
              'w-16 h-16 flex-shrink-0 rounded-full flex items-center justify-center border-4 border-white shadow-sm',
              accent.iconBg
            )}
          >
            <MainIcon size={28} color="white" strokeWidth={2.5} />
          </motion.div>
        </div>
      </div>

      {/* ── Feature list ── */}
      <div className="px-6 py-4 md:px-8 md:py-6 flex-1">
        <ul className="flex flex-col gap-3.5">
          {features.map(({ icon: Icon, label }, i) => (
            <li key={i} className="flex items-center gap-3 text-sm text-slate-600 font-bold">
              <span className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', accent.tagBg, accent.tagText)}>
                <Icon size={14} strokeWidth={2.5} />
              </span>
              {label}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Card footer ── */}
      <div className="px-6 pb-6 pt-2 md:px-8 md:pb-8 flex items-center gap-4">
        <button
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-black text-white text-base',
            'transition-all duration-150 transform active:translate-y-1 active:shadow-none',
            accent.cta,
            accent.ctaShadow
          )}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          {ctaText}
          <motion.span animate={hovered ? { x: 5 } : { x: 0 }} transition={SPRING_BOUNCY}>
            <ArrowRight size={18} strokeWidth={3} />
          </motion.span>
        </button>
      </div>
    </motion.article>
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
            Upload PDF TA atau CV kamu. Biar para penguji kami bermain peran sebagai 'dosen galak' atau 'HRD kritis' buat melatih mentalmu sampai berani tampil dengan asyik!
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
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-7xl mx-auto"
        >
          <ModeCard
            type="sidang"
            title="Sidang Santai"
            tagline="Mode Chat Mahasiswa"
            description="Latih argumen bab per bab. Hadapi 3 dosen penguji imut via chat!"
            features={[
              { icon: MessageSquare, label: 'Interaksi Berbasis Teks 💬' },
              { icon: Upload, label: 'Upload Draf TA (PDF) 📄' },
              { icon: Users, label: 'Tiga Penguji Karakter Berbeda 🐱' },
              { icon: Sparkles, label: 'Tanya-Jawab Interaktif ✨' },
            ]}
            ctaText="Mulai Chat! 🌸"
            difficulty={{ icon: Flame, label: 'Deg-degan Maksimal' }}
            accent={{
              bg: 'bg-pink-50/50',
              border: 'border-pink-200',
              shadow: 'shadow-[0_12px_0_0_#ffccd5] -translate-y-2',
              iconBg: 'bg-pink-400',
              tagBg: 'bg-pink-100',
              tagText: 'text-pink-700',
              tagIcon: GraduationCap,
              cta: 'bg-pink-400 hover:bg-pink-500',
              ctaShadow: 'shadow-[0_6px_0_0_#ff4d6d]',
            }}
            MainIcon={GraduationCap}
            onClick={() => onStart(SimulationType.SIDANG)}
          />

          <ModeCard
            type="interview"
            title="Interview Santuy"
            tagline="Mode Chat Job Seeker"
            description="Upload CV & Job Desc. Latihan simulasi interview kerja agar lancar dapat offering!"
            features={[
              { icon: MessageSquare, label: 'Interaksi Berbasis Teks 💬' },
              { icon: FileText, label: 'Upload CV & Job Desc 📄' },
              { icon: UserCheck, label: 'Simulasi Perilaku Profesional 👔' },
              { icon: Smile, label: 'Umpan Balik Kesiapan 🍭' },
            ]}
            ctaText="Mulai Chat! 🍰"
            difficulty={{ icon: Target, label: 'Asah Skill Ngomong' }}
            accent={{
              bg: 'bg-amber-50/70',
              border: 'border-amber-200',
              shadow: 'shadow-[0_12px_0_0_#fde047] -translate-y-2',
              iconBg: 'bg-amber-400',
              tagBg: 'bg-amber-100',
              tagText: 'text-amber-800',
              tagIcon: Briefcase,
              cta: 'bg-amber-400 hover:bg-amber-500',
              ctaShadow: 'shadow-[0_6px_0_0_#d97706]',
            }}
            MainIcon={Briefcase}
            onClick={() => onStart(SimulationType.INTERVIEW)}
          />

          <ModeCard
            type="sidang"
            title="Live Call Sidang"
            tagline="BARU! Mode Voice Call"
            description="Latihan sidang tatap muka via panggilan suara langsung dengan interupsi nyata!"
            features={[
              { icon: Mic, label: 'Interaksi Suara Langsung 🎙️' },
              { icon: Zap, label: 'Interupsi & Sanggahan Realistis ⚡' },
              { icon: Users, label: 'Dosen Saling Menimpali 👥' },
              { icon: Sparkles, label: 'Suara Alami Bernada Manusia 🌸' },
            ]}
            ctaText="Mulai Call! 🎀"
            difficulty={{ icon: Zap, label: 'Sangat Menantang' }}
            accent={{
              bg: 'bg-purple-50/60',
              border: 'border-purple-200',
              shadow: 'shadow-[0_12px_0_0_#e8daff] -translate-y-2',
              iconBg: 'bg-purple-400',
              tagBg: 'bg-purple-100',
              tagText: 'text-purple-700',
              tagIcon: Mic,
              cta: 'bg-purple-400 hover:bg-purple-500',
              ctaShadow: 'shadow-[0_6px_0_0_#a855f7]',
            }}
            MainIcon={Mic}
            onClick={() => onStart(SimulationType.MEETING_SIDANG)}
          />

          <ModeCard
            type="interview"
            title="Live Call Interview"
            tagline="BARU! Mode Voice Call"
            description="Latihan interview kerja live. Hadapi cecaran HRD dalam percakapan cepat dan santai."
            features={[
              { icon: Mic, label: 'Interaksi Suara Langsung 🎙️' },
              { icon: Target, label: 'Pertanyaan Terarah & Cepat 🎯' },
              { icon: Briefcase, label: 'Manajemen Stres Ujian 🧸' },
              { icon: Star, label: 'Umpan Balik Metode STAR ⭐' },
            ]}
            ctaText="Mulai Call! 🍭"
            difficulty={{ icon: Zap, label: 'Sangat Menantang' }}
            accent={{
              bg: 'bg-sky-50/60',
              border: 'border-sky-200',
              shadow: 'shadow-[0_12px_0_0_#a2d2ff] -translate-y-2',
              iconBg: 'bg-sky-400',
              tagBg: 'bg-sky-100',
              tagText: 'text-sky-700',
              tagIcon: Mic,
              cta: 'bg-sky-400 hover:bg-sky-500',
              ctaShadow: 'shadow-[0_6px_0_0_#0ea5e9]',
            }}
            MainIcon={Mic}
            onClick={() => onStart(SimulationType.MEETING_INTERVIEW)}
          />

        </motion.div>
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