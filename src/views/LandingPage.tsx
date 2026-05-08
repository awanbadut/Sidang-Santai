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
  { num: '2.4rb+', label: 'Mahasiswa Santuy' },
  { num: '98%', label: 'Lulus Tanpa Panik' },
  { num: '15rb+', label: 'Sesi Latihan' },
];

const STEPS = [
  {
    num: '01',
    title: 'Pilih Vibe Kamu',
    desc: 'Mau latihan Sidang TA atau Interview Kerja? Pilih medan tempurmu hari ini.',
  },
  {
    num: '02',
    title: 'Bawa Senjatamu (Upload File)',
    desc: 'Taruh draf skripsi (PDF) atau CV kamu di sini biar VibeBot bisa pelajari.',
  },
  {
    num: '03',
    title: 'Mulai Ngobrol & Debat!',
    desc: 'Jawab pertanyaan via suara atau teks. Hadapi dosen galak versi AI tanpa keringat dingin.',
  },
];

const BENEFITS = [
  {
    icon: Bot,
    title: 'VibeBot Super Pintar',
    desc: 'Bukan AI biasa. VibeBot baca PDF TA-mu dan bakal nanya dari celah dokumenmu yang paling lemah.',
  },
  {
    icon: CheckCircle2,
    title: 'Ruang Aman Anti-Insecure',
    desc: 'Latihan sampai berbusa. Gak ada yang bakal nge-judge kamu di sini. Privasi 100% aman.',
  },
  {
    icon: Zap,
    title: 'Teman Begadang 24/7',
    desc: 'Besok pagi sidang? Tenang, VibeBot siap nemenin kamu simulasi jam 3 pagi sekalipun.',
  },
  {
    icon: BarChart2,
    title: 'Rapor Jujur tapi Gemas',
    desc: 'Dapat skor dari 1-100 plus feedback spesifik buat naikin kualitas jawabanmu.',
  },
  {
    icon: Users,
    title: '"Avengers" Kampus',
    desc: 'Berhadapan langsung sama 3 karakter penguji: Si Galak, Si Teliti, dan Si Praktisi.',
  },
  {
    icon: Coffee,
    title: 'Gratis Buat Anak Kampus',
    desc: 'Tinggal login, gak perlu kartu kredit. Kita tau dompet mahasiswa kayak gimana.',
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
      <div className={cn('relative p-8 rounded-t-[2.2rem] border-b-[4px]', accent.bg, accent.border)}>
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
      <div className="px-8 py-6 flex-1">
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
      <div className="px-8 pb-8 pt-2 flex items-center gap-4">
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
    <div className="min-h-screen bg-[#fafaf9] font-sans overflow-x-hidden text-slate-700">
      
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
            <span className="inline-flex items-center gap-2 text-sm font-bold text-sky-600 bg-sky-100 border-2 border-sky-200 px-4 py-2 rounded-full shadow-sm">
              <Bot size={16} className="text-sky-500" /> VibeBot Siap Membantu!
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-2xl sm:text-4xl md:text-5xl lg:text-7xl font-black tracking-tight text-slate-800 leading-[1.1] mb-4 md:mb-6"
          >
            Tegang di Simulasi, <br />
            <span className="text-emerald-500 inline-block transform -rotate-1">Santai</span>{' '}
            <span className="text-slate-400">di</span>{' '}
            <span className="text-rose-400 inline-block transform rotate-1">Eksekusi.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-base md:text-xl text-slate-500 font-medium max-w-2xl mx-auto mb-8 md:mb-10 leading-relaxed px-4 md:px-0"
          >
            Upload PDF TA atau CV kamu. Biar AI kami yang jadi 'dosen galak' atau 'HRD kritis' buat melatih mentalmu sampai berani tampil.
          </motion.p>

          {/* Stats row */}
          <motion.div
            variants={fadeUp}
            className="flex flex-wrap items-center justify-center gap-6 md:gap-12 bg-white border-[3px] border-slate-100 p-6 rounded-[2rem] shadow-sm"
          >
            {STATS.map((s, i) => (
              <React.Fragment key={s.num}>
                {i > 0 && <span className="hidden md:block w-1.5 h-1.5 rounded-full bg-slate-200" />}
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
            description="Latih argumen bab per bab. Hadapi 3 dosen penguji AI via chat!"
            features={[
              { icon: MessageSquare, label: 'Text-Based Interaction' },
              { icon: Upload, label: 'Upload Draf TA (PDF)' },
              { icon: Users, label: 'Panel 3 Penguji Multikarakter' },
              { icon: Sparkles, label: 'Dynamic Interrogation' },
            ]}
            ctaText="Mulai Chat!"
            difficulty={{ icon: Flame, label: 'Deg-degan Maksimal' }}
            accent={{
              bg: 'bg-emerald-50',
              border: 'border-emerald-200',
              shadow: 'shadow-[0_12px_0_0_rgba(167,243,208,1)] -translate-y-2',
              iconBg: 'bg-emerald-400',
              tagBg: 'bg-emerald-200/50',
              tagText: 'text-emerald-700',
              tagIcon: GraduationCap,
              cta: 'bg-emerald-400 hover:bg-emerald-500',
              ctaShadow: 'shadow-[0_6px_0_0_rgba(52,211,153,1)]',
            }}
            MainIcon={GraduationCap}
            onClick={() => onStart(SimulationType.SIDANG)}
          />

          <ModeCard
            type="interview"
            title="Interview Santuy"
            tagline="Mode Chat Job Seeker"
            description="Upload CV & Job Desc. Latihan chat sama AI HRD biar gampang dapet offering."
            features={[
              { icon: MessageSquare, label: 'Text-Based Interaction' },
              { icon: FileText, label: 'Upload CV & Job Desc' },
              { icon: UserCheck, label: 'Simulasi Perilaku' },
              { icon: Smile, label: 'Umpan Balik Kesiapan' },
            ]}
            ctaText="Mulai Chat!"
            difficulty={{ icon: Target, label: 'Asah Skill Ngomong' }}
            accent={{
              bg: 'bg-rose-50',
              border: 'border-rose-200',
              shadow: 'shadow-[0_12px_0_0_rgba(254,205,211,1)] -translate-y-2',
              iconBg: 'bg-rose-400',
              tagBg: 'bg-rose-200/50',
              tagText: 'text-rose-700',
              tagIcon: Briefcase,
              cta: 'bg-rose-400 hover:bg-rose-500',
              ctaShadow: 'shadow-[0_6px_0_0_rgba(251,113,133,1)]',
            }}
            MainIcon={Briefcase}
            onClick={() => onStart(SimulationType.INTERVIEW)}
          />

          <ModeCard
            type="sidang"
            title="Live Call Sidang"
            tagline="BARU! Mode Voice Call"
            description="Latihan sidang tatap muka via voice call. AI bakal memotong & menyanggah kamu!"
            features={[
              { icon: Mic, label: 'Voice-First Interaction' },
              { icon: Zap, label: 'Interupsi & Sanggahan Nyata' },
              { icon: Users, label: '3 Penguji Saling Timpali' },
              { icon: Bot, label: 'Vibe Bot Live Performance' },
            ]}
            ctaText="Mulai Call!"
            difficulty={{ icon: Zap, label: 'Sangat Menantang' }}
            accent={{
              bg: 'bg-sky-50',
              border: 'border-sky-300',
              shadow: 'shadow-[0_12px_0_0_rgba(186,230,253,1)] -translate-y-2',
              iconBg: 'bg-sky-400',
              tagBg: 'bg-sky-200/50',
              tagText: 'text-sky-700',
              tagIcon: Mic,
              cta: 'bg-sky-400 hover:bg-sky-500',
              ctaShadow: 'shadow-[0_6px_0_0_rgba(125,211,252,1)]',
            }}
            MainIcon={Mic}
            onClick={() => onStart(SimulationType.MEETING_SIDANG)}
          />

          <ModeCard
            type="interview"
            title="Live Call Interview"
            tagline="BARU! Mode Voice Call"
            description="Latihan interview kerja live. Hadapi cecaran HRD dalam percakapan cepat."
            features={[
              { icon: Mic, label: 'Voice-First Interaction' },
              { icon: Target, label: 'Fast-Paced Conversation' },
              { icon: Briefcase, label: 'Stress Management' },
              { icon: Star, label: 'STAR Method Live Feedback' },
            ]}
            ctaText="Mulai Call!"
            difficulty={{ icon: Zap, label: 'Sangat Menantang' }}
            accent={{
              bg: 'bg-indigo-50',
              border: 'border-indigo-300',
              shadow: 'shadow-[0_12px_0_0_rgba(199,210,254,1)] -translate-y-2',
              iconBg: 'bg-indigo-400',
              tagBg: 'bg-indigo-200/50',
              tagText: 'text-indigo-700',
              tagIcon: Mic,
              cta: 'bg-indigo-400 hover:bg-indigo-500',
              ctaShadow: 'shadow-[0_6px_0_0_rgba(129,140,248,1)]',
            }}
            MainIcon={Mic}
            onClick={() => onStart(SimulationType.MEETING_INTERVIEW)}
          />

        </motion.div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────── */}
      <section className="bg-white border-y-[4px] border-slate-100 py-16 md:py-24 px-4 md:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">
          <div>
            <span className="inline-flex items-center gap-2 text-sm font-bold text-sky-500 uppercase tracking-widest mb-4">
              <ChevronRight size={16} strokeWidth={3} /> Flow Paling Gampang
            </span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-800 mb-6 leading-tight">
              Tiga Langkah Menuju <br /> Mental Baja
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
            className="order-first md:order-last bg-sky-100 rounded-[2.5rem] border-[4px] border-sky-200 p-8 flex items-center justify-center min-h-[350px]"
          >
            {/* Ilustrasi UI Mockup yg Gemas */}
            <div className="bg-white w-full max-w-sm rounded-3xl border-[4px] border-slate-100 shadow-xl overflow-hidden flex flex-col">
              <div className="bg-slate-50 border-b-[3px] border-slate-100 p-4 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="p-6 flex flex-col gap-4 items-center">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-500 mb-2">
                  <Bot size={40} strokeWidth={2} />
                </div>
                <div className="w-3/4 h-4 bg-slate-200 rounded-full" />
                <div className="w-1/2 h-4 bg-slate-100 rounded-full" />
                <div className="w-full mt-4 flex gap-2">
                  <div className="flex-1 h-12 bg-sky-100 rounded-2xl" />
                  <div className="w-12 h-12 bg-rose-400 rounded-2xl flex items-center justify-center text-white">
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
            <span className="inline-flex items-center gap-2 text-sm font-bold text-amber-500 uppercase tracking-widest mb-4">
              <Sparkles size={16} /> Kenapa Pake Ini?
            </span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-800">
              Biar Nggak Keringet Dingin Lagi
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

      {/* ── CTA Banner ────────────────────────────────────────────────── */}
      <section className="px-4 md:px-8 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-7xl mx-auto bg-gradient-to-br from-sky-300 via-indigo-300 to-rose-300 rounded-[2rem] md:rounded-[3rem] border-[4px] md:border-[6px] border-white shadow-xl overflow-hidden p-8 md:p-20 text-center relative"
        >
          <div className="relative z-10">
            <h2 className="text-2xl md:text-5xl font-black tracking-tight text-indigo-950 mb-6 leading-tight">
              Waktunya Bersinar <br /> di Hari H!
            </h2>
            <p className="text-lg text-indigo-900/80 font-bold max-w-lg mx-auto mb-10">
              Gabung sama VibeBot dan ribuan mahasiswa lainnya yang udah ngebuktiin gampangnya naklukin penguji.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => onStart(SimulationType.SIDANG)}
                className="bg-white text-indigo-600 font-black text-lg px-8 py-4 rounded-2xl shadow-[0_6px_0_0_rgba(203,213,225,1)] hover:translate-y-1 hover:shadow-[0_2px_0_0_rgba(203,213,225,1)] transition-all flex items-center gap-3"
              >
                <GraduationCap size={20} strokeWidth={3} /> Gas Sidang!
              </button>
            </div>
          </div>
        </motion.div>
      </section>

    </div>
  );
}