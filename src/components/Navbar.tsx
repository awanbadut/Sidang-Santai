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
    <nav className="bg-white/80 backdrop-blur-md border-b-[4px] border-purple-100/70 py-4 px-4 md:px-8 sticky top-0 z-50 transition-all">
      {/* Gender gradient top stripe: slanted angle represented across top screen */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-pink-400 via-purple-400 to-sky-400" />
      
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        
        {/* ── Logo Area ── */}
        <div 
          className="flex items-center gap-2 md:gap-4 cursor-pointer group" 
          onClick={onLogoClick}
          id="navbar-logo"
        >
          <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center transition-all group-hover:scale-110">
            <img 
              src="/src/assets/my-logo.png" 
              alt="Siap Tampil Logo" 
              className="w-full h-full object-contain rounded-2xl" 
            />
          </div>
          <div className="hidden sm:flex items-center gap-1">
            <span className="font-black text-xl md:text-3xl tracking-tighter bg-gradient-to-r from-pink-500 via-purple-500 to-sky-500 bg-clip-text text-transparent">
              Sidang Santai
            </span>
            <span className="text-xl md:text-3xl">🌸</span>
          </div>
        </div>

        {/* ── Actions Area ── */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-5">
          {user ? (
            <>
              {/* Tombol Riwayat (Biru/Cowo Theme) */}
              <button 
                onClick={onViewHistory}
                className="bg-sky-50 text-sky-600 border-[3px] border-sky-100 px-4 py-2 md:px-5 md:py-2.5 rounded-2xl flex items-center gap-2 font-black text-xs md:text-sm uppercase tracking-widest shadow-[0_4px_0_0_#bae6fd] hover:translate-y-1 hover:shadow-none transition-all"
                id="btn-history"
              >
                <History size={18} strokeWidth={3} />
                <span className="hidden sm:inline">Riwayat 🧸</span>
              </button>
              
              <div className="flex items-center gap-3 pl-1 md:pl-3 border-l-2 border-purple-100">
                {/* Foto Profil */}
                <div className="bg-purple-50/50 p-1 rounded-2xl border-[3px] border-purple-100">
                   {user.photoURL ? (
                     <img src={user.photoURL} alt="profile" className="w-9 h-9 md:w-10 md:h-10 rounded-xl" />
                   ) : (
                     <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                       <UserIcon size={20} strokeWidth={3} className="text-purple-300" />
                     </div>
                   )}
                </div>
                
                {/* Tombol Logout */}
                <button 
                  onClick={() => auth.signOut()}
                  className="w-11 h-11 md:w-12 md:h-12 bg-rose-50 text-rose-500 rounded-2xl border-[3px] border-rose-100 flex items-center justify-center shadow-[0_4px_0_0_#ffe3e3] hover:translate-y-1 hover:shadow-none transition-all"
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
              className="bg-gradient-to-r from-pink-400 to-purple-400 text-white border-[3px] border-purple-300 px-6 py-2.5 md:px-8 md:py-3 rounded-2xl text-xs md:text-sm font-black uppercase tracking-widest shadow-[0_4px_0_0_#c084fc] hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-2"
              id="btn-login"
            >
              <LogIn size={18} strokeWidth={3} className="hidden sm:block" /> Masuk 🐣
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}