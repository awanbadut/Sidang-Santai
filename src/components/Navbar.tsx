/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { User } from 'firebase/auth';
import { auth, signInWithGoogle } from '../lib/firebase';
import { LogOut, History, User as UserIcon, LogIn } from 'lucide-react';
import { cn } from '../lib/utils';

interface NavbarProps {
  user: User | null;
  onViewHistory: () => void;
  onLogoClick: () => void;
}

export default function Navbar({ user, onViewHistory, onLogoClick }: NavbarProps) {
  return (
    <nav className="bg-white border-b-[4px] border-slate-100 py-4 px-4 md:px-8 sticky top-0 z-50 transition-all">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        
        {/* ── Logo Area ── */}
        <div 
          className="flex items-center gap-2 md:gap-4 cursor-pointer group" 
          onClick={onLogoClick}
          id="navbar-logo"
        >
          <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center transition-all group-hover:scale-105">
            <img 
              src="/src/assets/my-logo.png" 
              alt="Siap Tampil Logo" 
              className="w-full h-full object-contain" 
            />
          </div>
          <span className="font-black text-xl md:text-3xl tracking-tighter text-slate-800 hidden sm:block">
            Sidang Santai
          </span>
        </div>

        {/* ── Actions Area ── */}
        <div className="flex items-center gap-3 md:gap-5">
          {user ? (
            <>
              {/* Tombol Riwayat */}
              <button 
                onClick={onViewHistory}
                className="bg-sky-100 text-sky-600 border-[3px] border-sky-200 px-4 py-2 md:px-5 md:py-2.5 rounded-2xl flex items-center gap-2 font-black text-xs md:text-sm uppercase tracking-widest shadow-[0_4px_0_0_rgba(186,230,253,1)] hover:translate-y-1 hover:shadow-none transition-all"
                id="btn-history"
              >
                <History size={18} strokeWidth={3} />
                <span className="hidden sm:inline">Riwayat</span>
              </button>
              
              <div className="flex items-center gap-3 pl-1 md:pl-3 border-l-2 border-slate-100">
                {/* Foto Profil */}
                <div className="bg-slate-50 p-1 rounded-[1rem] border-[3px] border-slate-200">
                   {user.photoURL ? (
                     <img src={user.photoURL} alt="profile" className="w-9 h-9 md:w-10 md:h-10 rounded-xl" />
                   ) : (
                     <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-slate-200 flex items-center justify-center">
                       <UserIcon size={20} strokeWidth={3} className="text-slate-400" />
                     </div>
                   )}
                </div>
                
                {/* Tombol Logout */}
                <button 
                  onClick={() => auth.signOut()}
                  className="w-11 h-11 md:w-12 md:h-12 bg-rose-100 text-rose-500 rounded-[1rem] border-[3px] border-rose-200 flex items-center justify-center shadow-[0_4px_0_0_rgba(254,205,211,1)] hover:translate-y-1 hover:shadow-none transition-all"
                  title="Logout"
                  id="btn-logout"
                >
                  <LogOut size={20} strokeWidth={3} className="ml-1" />
                </button>
              </div>
            </>
          ) : (
            /* Tombol Login */
            <button 
              onClick={signInWithGoogle}
              className="bg-emerald-400 text-white border-[3px] border-emerald-500 px-6 py-2.5 md:px-8 md:py-3 rounded-[1rem] text-xs md:text-sm font-black uppercase tracking-widest shadow-[0_4px_0_0_rgba(16,185,129,1)] hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-2"
              id="btn-login"
            >
              <LogIn size={18} strokeWidth={3} className="hidden sm:block" /> Masuk
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}