/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth, signInWithGoogle } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { SimulationType, SimulationStatus } from './types';
import LandingPage from './views/LandingPage';
import SimulationFlow from './views/SimulationFlow';
import Navbar from './components/Navbar';
import HistoryPage from './views/HistoryPage';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'landing' | 'simulation' | 'history'>('landing');
  const [selectedMode, setSelectedMode] = useState<SimulationType | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleStartSimulation = (mode: SimulationType) => {
    if (!user) {
      signInWithGoogle().then(() => {
        setSelectedMode(mode);
        setView('simulation');
      }).catch(err => {
        console.error("Login failed", err);
      });
    } else {
      setSelectedMode(mode);
      setView('simulation');
    }
  };

  const handleGoBack = () => {
    setView('landing');
    setSelectedMode(null);
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col font-sans transition-all duration-300",
      view === 'simulation' ? "h-screen overflow-hidden" : "min-h-screen"
    )}>
      <Navbar 
        user={user} 
        onViewHistory={() => setView('history')} 
        onLogoClick={() => setView('landing')}
      />
      
      <main className={cn(
        "flex-1 container mx-auto transition-all duration-300",
        view === 'simulation' 
          ? "max-w-7xl h-full overflow-hidden px-0 py-0 md:px-4 md:py-4" 
          : "max-w-7xl px-4 py-4 md:py-8"
      )}>
        <AnimatePresence mode="wait">
          {view === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <LandingPage onStart={handleStartSimulation} />
            </motion.div>
          )}

          {view === 'simulation' && selectedMode && (
            <motion.div
              key="simulation"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-full flex flex-col overflow-hidden"
            >
              <SimulationFlow 
                mode={selectedMode} 
                onCancel={handleGoBack}
                user={user!}
              />
            </motion.div>
          )}

          {view === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <HistoryPage onBack={handleGoBack} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {view !== 'simulation' && (
        <footer className="py-6 text-center text-slate-400 text-sm border-t border-slate-100">
          &copy; {new Date().getFullYear()} Sidang Santai. Semua hak dilindungi.
        </footer>
      )}
    </div>
  );
}
