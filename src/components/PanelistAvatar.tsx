/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Glasses, SearchCheck, Laptop } from 'lucide-react';
import { cn } from '../lib/utils';

export type PanelistId = 'metod' | 'ima' | 'aris' | 'shinta' | 'maya' | 'budi';

interface PanelistAvatarProps {
  id: PanelistId;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  isThinking?: boolean;
}

export const PANELISTS = {
  metod: {
    name: 'Pak Dr. Metod',
    role: 'Akademisi Kritis',
    color: 'bg-emerald-400',
    borderColor: 'border-emerald-500',
    bubbleColor: 'bg-emerald-50',
    icon: Glasses,
    avatarBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  ima: {
    name: 'Bu Ima',
    role: 'Perfeksionis Teliti',
    color: 'bg-rose-400',
    borderColor: 'border-rose-500',
    bubbleColor: 'bg-rose-50',
    icon: SearchCheck,
    avatarBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
  },
  aris: {
    name: 'Pak Aris',
    role: 'Praktisi Lapangan',
    color: 'bg-sky-400',
    borderColor: 'border-sky-500',
    bubbleColor: 'bg-sky-50',
    icon: Laptop,
    avatarBg: 'bg-sky-100',
    iconColor: 'text-sky-600',
  },
  shinta: {
    name: 'Bu Shinta',
    role: 'HR Manager',
    color: 'bg-indigo-400',
    borderColor: 'border-indigo-500',
    bubbleColor: 'bg-indigo-50',
    icon: SearchCheck,
    avatarBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
  },
  maya: {
    name: 'Mbak Maya',
    role: 'User / PM',
    color: 'bg-amber-400',
    borderColor: 'border-amber-500',
    bubbleColor: 'bg-amber-50',
    icon: Laptop,
    avatarBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
  budi: {
    name: 'Mas Budi',
    role: 'Technical Lead',
    color: 'bg-slate-400',
    borderColor: 'border-slate-500',
    bubbleColor: 'bg-slate-50',
    icon: Glasses,
    avatarBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
  }
};

export default function PanelistAvatar({ id, size = 'md', className, isThinking }: PanelistAvatarProps) {
  const panelist = PANELISTS[id];
  const Icon = panelist.icon;
  
  // Konfigurasi ukuran untuk Container, Icon, dan Badge Nama
  const sizeConfig = {
    sm: { 
      container: 'w-12 h-12 rounded-[1rem] border-[3px]', 
      iconSize: 24, 
      badge: 'text-[8px] px-2 py-0.5 -mt-2' 
    },
    md: { 
      container: 'w-20 h-20 rounded-[1.5rem] border-[4px]', 
      iconSize: 40, 
      badge: 'text-[10px] px-3 py-1 -mt-3' 
    },
    lg: { 
      container: 'w-32 h-32 rounded-[2rem] border-[4px]', 
      iconSize: 64, 
      badge: 'text-xs px-4 py-1.5 -mt-4 rounded-xl' 
    },
  };

  const config = sizeConfig[size];

  return (
    <motion.div 
      className={cn(
        "relative flex flex-col items-center gap-1",
        className
      )}
      animate={isThinking ? { 
        y: [0, -6, 0],
        scale: [1, 1.05, 1]
      } : {}}
      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
    >
      {/* ── Avatar Container ── */}
      <div 
        className={cn(
          "border-white flex items-center justify-center shadow-sm relative overflow-hidden transition-all",
          panelist.avatarBg,
          config.container
        )}
      >
        {/* Latar berdenyut saat AI sedang berpikir */}
        {isThinking && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.5, opacity: [0, 0.4, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className={cn("absolute inset-0 rounded-full", panelist.color)}
          />
        )}
        
        {/* Ikon Lucide */}
        <Icon 
          size={config.iconSize} 
          strokeWidth={2.5} 
          className={cn("relative z-10", panelist.iconColor)} 
        />
      </div>

      {/* ── Label Nama (Disembunyikan jika ukuran 'sm') ── */}
      {size !== 'sm' && (
        <div className={cn(
          "text-white font-black uppercase tracking-widest shadow-sm z-20 border-[3px] border-white rounded-full",
          panelist.color,
          config.badge
        )}>
          {panelist.name}
        </div>
      )}
    </motion.div>
  );
}