/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef } from 'react';
import { SimulationType, QuestionEntry } from '../types';
import { User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, MicOff, PhoneOff, Settings, Users, MessageSquare, 
  Hand, Smile, Video, VideoOff, Layout, Info, MoreVertical,
  Volume2, VolumeX, Sparkles, Zap, AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import PanelistAvatar, { PanelistId, PANELISTS } from '../components/PanelistAvatar';
import { getNextTurnMeeting } from '../lib/gemini';

interface LiveMeetingFlowProps {
  mode: SimulationType;
  docText: string;
  jd?: string;
  user: User;
  onFinish: (answers: QuestionEntry[]) => void;
  onCancel: () => void;
}

export default function LiveMeetingFlow({ 
  mode, docText, jd, user, onFinish, onCancel 
}: LiveMeetingFlowProps) {
  const [isMicOn, setIsMicOn] = useState(false);
  const isMicOnRef = useRef(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [conversation, setConversation] = useState<QuestionEntry[]>([]);
  const [activeSpeakers, setActiveSpeakers] = useState<PanelistId[]>([]);
  const [isAThinking, setIsAThinking] = useState(false);
  const [meetingStartTime] = useState(new Date());
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const [aiCaptions, setAiCaptions] = useState('');
  const isAiSpeakingRef = useRef<boolean>(false);
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(window.speechSynthesis);
  const conversationRef = useRef<QuestionEntry[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prodTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedSpeechRef = useRef<string>('');

  const startProdTimer = () => {
    if (prodTimerRef.current) clearTimeout(prodTimerRef.current);
    prodTimerRef.current = setTimeout(() => {
      if (!isAiSpeakingRef.current && !isAThinking && isMicOn) {
        handleUserSpeech("(User terdiam/masih bingung)");
      }
    }, 12000); // 12 seconds of silence -> AI prods
  };

  // ── Timer Effect ──
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - meetingStartTime.getTime()) / 1000);
      const m = Math.floor(diff / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
      setElapsedTime(`${m}:${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [meetingStartTime]);

  // ── Speech Recognition Setup ──
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'id-ID';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let currentFinalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            currentFinalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const fullText = interimTranscript || currentFinalTranscript;
        if (!fullText.trim()) return;

        // If user is speaking, STOP AI speech (interruption)
        // We do this BEFORE the feedback guard to allow real humans to cut off the AI
        if (synthRef.current?.speaking) {
          // Only cancel if the speech is long enough to be a real interruption,
          // avoiding false positives from background noise.
          if (fullText.length > 5) {
            synthRef.current.cancel();
            setActiveSpeakers([]);
            setAiCaptions('');
            isAiSpeakingRef.current = false;
            if (prodTimerRef.current) clearTimeout(prodTimerRef.current);
          }
        }

        // If AI is speaking and we didn't interrupt it, ignore mic input (feedback guard)
        if (isAiSpeakingRef.current) return;

        setTranscript(fullText);
        
        // Reset silence timer on every result
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        
        // If we have some significant text, start a timer to auto-submit after pause
        if (fullText.length > 1) {
          if (prodTimerRef.current) clearTimeout(prodTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            handleUserSpeech(fullText);
          }, 1800); // slightly faster turn response
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        // Auto restart if mic is supposed to be on
        if (isMicOnRef.current) {
          try {
            recognitionRef.current?.start();
          } catch (e) {
            console.warn("Recognition restart failed", e);
          }
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (synthRef.current) synthRef.current.cancel();
    };
  }, []);

  // ── Initial Start ──
  useEffect(() => {
    // Start by one panelist speaking
    const startMeeting = async () => {
      setIsAThinking(true);
      try {
        const initialPanelist = mode.includes('interview') ? 'shinta' : 'metod';
        const firstTurn = await getNextTurnMeeting(mode, docText, [], initialPanelist, jd);
        playAIScript(firstTurn.script, firstTurn);
      } catch (err) {
        console.error("Failed to start meeting", err);
      } finally {
        setIsAThinking(false);
      }
    };
    startMeeting();
  }, []);

  const toggleMic = () => {
    const newState = !isMicOn;
    setIsMicOn(newState);
    isMicOnRef.current = newState;

    if (!newState) {
      recognitionRef.current?.stop();
      setIsListening(false);
      if (prodTimerRef.current) clearTimeout(prodTimerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
      startProdTimer();
    }
  };

  const handleUserSpeech = async (text: string) => {
    if (!text.trim() || isAThinking) return;
    
    // Avoid processing the same text twice
    if (text.trim() === lastProcessedSpeechRef.current) return;
    lastProcessedSpeechRef.current = text.trim();

    // Clear any pending silence timer
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    // Create history entry
    const lastAI = conversationRef.current[conversationRef.current.length - 1];
    const userTranscript = text;
    
    setIsAThinking(true);
    setTranscript(''); // Clear UI transcript

    try {
      const history = conversationRef.current.map(c => ({ q: c.question, a: c.answer }));
      const nextTurn = await getNextTurnMeeting(mode, docText, history, lastAI?.panelistId || 'metod', jd, userTranscript);
      
      // Update local history
      const newEntry: QuestionEntry = {
        question: lastAI?.question || '',
        answer: userTranscript,
        panelistId: lastAI?.panelistId || 'metod',
        feedback: nextTurn.feedback || '',
        score: nextTurn.score || 0,
        suggestedAnswer: nextTurn.suggestedAnswer || ''
      };
      
      const newConversation = [...conversation, newEntry];
      setConversation(newConversation);
      conversationRef.current = newConversation;

      // Play the AI response
      playAIScript(nextTurn.script, nextTurn);

    } catch (err) {
      console.error("Meeting response failed", err);
    } finally {
      setIsAThinking(false);
    }
  };

  const playAIScript = async (script: string, metadata: any) => {
    setAiCaptions(script);
    // Script format: "[Nama]: Text [Nama]: Text"
    const parts = script.split(/(\[.*?\]:)/).filter(p => p.trim() !== '');
    
    let currentSpeaker: PanelistId = 'metod';
    
    const playSequentially = async (index: number) => {
      if (index >= parts.length) return;

      const part = parts[index].trim();
      
      if (part.startsWith('[') && part.includes(']:')) {
        // Find which panelist is speaking
        const namePart = part.replace('[', '').replace(']:', '').toLowerCase();
        
        if (namePart.includes('metod') || namePart.includes('shinta')) {
          currentSpeaker = mode.includes('interview') ? 'shinta' : 'metod';
        } else if (namePart.includes('ima') || namePart.includes('maya')) {
          currentSpeaker = mode.includes('interview') ? 'maya' : 'ima';
        } else if (namePart.includes('aris') || namePart.includes('budi')) {
          currentSpeaker = mode.includes('interview') ? 'budi' : 'aris';
        }
        
        setActiveSpeakers([currentSpeaker]);
        await playSequentially(index + 1);
      } else {
        // This is the actual text
        const utterance = new SpeechSynthesisUtterance(part);
        utterance.lang = 'id-ID';
        
        // Find best voices
        const voices = window.speechSynthesis.getVoices();
        const idVoices = voices.filter(v => v.lang.startsWith('id'));
        
        // Pitch/Rate variety based on speaker
        // User asked to speed up (percepat sedikit) -> increased rate constants
        if (currentSpeaker === 'metod' || currentSpeaker === 'shinta') { 
          utterance.pitch = currentSpeaker === 'shinta' ? 1.1 : 0.8; 
          utterance.rate = 1.05; // Normal speed
          if (idVoices.length > 1) utterance.voice = idVoices[1 % idVoices.length];
        }
        if (currentSpeaker === 'ima' || currentSpeaker === 'maya') { 
          utterance.pitch = currentSpeaker === 'maya' ? 1.0 : 1.2; 
          utterance.rate = 1.1; // Normal speed
          if (idVoices.length > 2) utterance.voice = idVoices[2 % idVoices.length];
        }
        if (currentSpeaker === 'aris' || currentSpeaker === 'budi') { 
          utterance.pitch = currentSpeaker === 'budi' ? 0.9 : 1.0; 
          utterance.rate = 1.0; // Normal speed
          if (idVoices.length > 0) utterance.voice = idVoices[0 % idVoices.length];
        }

        utterance.onstart = () => {
          isAiSpeakingRef.current = true;
        };

        utterance.onend = () => {
          setActiveSpeakers([]);
          if (index + 1 >= parts.length) {
            isAiSpeakingRef.current = false;
            setAiCaptions('');
            startProdTimer(); // Start prodding timer when AI finishes speaking
          }
          playSequentially(index + 1);
        };
        
        utterance.onerror = () => {
          isAiSpeakingRef.current = false;
          setActiveSpeakers([]);
          setAiCaptions('');
        };
        
        synthRef.current?.speak(utterance);
      }
    };

    playSequentially(0);
  };

  return (
    <div className="fixed inset-0 bg-[#202124] z-[100] flex flex-col font-sans text-white overflow-hidden">
      
      {/* ── Top Bar ── */}
      <div className="h-16 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 p-2 rounded-lg">
            <Video size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm md:text-base">
              {mode.includes('sidang') ? 'Sidang TA Live' : 'Interview Kerja Live'}
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              VibeBot Meeting Space • {elapsedTime}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-4 mr-4 text-slate-400">
             <div className="flex items-center gap-1.2">
                <Users size={16} />
                <span className="text-xs font-bold">4</span>
             </div>
             <MessageSquare size={16} />
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-white p-2">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* ── Main View Area (Grid) ── */}
      <div className="flex-1 p-3 md:p-6 overflow-hidden">
        <div className="h-full w-full max-w-6xl mx-auto grid grid-cols-2 gap-2 md:gap-4 auto-rows-fr">
          
          {/* Panelist 1: Metod */}
          <MeetingTile 
            id={mode.includes('interview') ? 'shinta' : 'metod'} 
            isActive={activeSpeakers.includes('metod') || activeSpeakers.includes('shinta')} 
            label={mode.includes('interview') ? PANELISTS.shinta.name : PANELISTS.metod.name} 
            isThinking={isAThinking && (activeSpeakers.includes('metod') || activeSpeakers.includes('shinta'))}
          />
          
          {/* Panelist 2: Ima / Maya */}
          <MeetingTile 
            id={mode.includes('interview') ? 'maya' : 'ima'} 
            isActive={activeSpeakers.includes('ima') || activeSpeakers.includes('maya')} 
            label={mode.includes('interview') ? PANELISTS.maya.name : PANELISTS.ima.name} 
            isThinking={isAThinking && (activeSpeakers.includes('ima') || activeSpeakers.includes('maya'))}
          />
          
          {/* Panelist 3: Aris / Budi */}
          <MeetingTile 
            id={mode.includes('interview') ? 'budi' : 'aris'} 
            isActive={activeSpeakers.includes('aris') || activeSpeakers.includes('budi')} 
            label={mode.includes('interview') ? PANELISTS.budi.name : PANELISTS.aris.name} 
            isThinking={isAThinking && (activeSpeakers.includes('aris') || activeSpeakers.includes('budi'))}
          />
          
          {/* User Tile */}
          <div className={cn(
            "relative bg-[#3c4043] rounded-xl md:rounded-2xl border-[2px] md:border-[3px] transition-all overflow-hidden group",
            isListening ? "border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.2)]" : "border-transparent"
          )}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 md:w-32 md:h-32 bg-sky-500 rounded-full flex items-center justify-center text-white text-2xl md:text-4xl font-black border-[3px] md:border-[4px] border-white/20 shadow-xl">
                 {user.displayName?.charAt(0) || 'U'}
              </div>
            </div>
            
            {/* User Label */}
            <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4 flex items-center gap-1.5 md:gap-2 bg-black/40 backdrop-blur-md px-2 py-1 md:px-3 md:py-1.5 rounded-lg border border-white/10">
               <span className="text-[10px] md:text-xs font-bold">{user.displayName ? user.displayName.split(' ')[0] : 'Anda'} (You)</span>
               {!isMicOn && <MicOff size={12} md:size={14} className="text-rose-400" />}
            </div>

            {/* Transcript Overlay - Moved to bottom right like a notification */}
            <AnimatePresence>
              {transcript && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute right-4 bottom-4 bg-sky-500/90 backdrop-blur-md p-3 rounded-xl border border-white/20 shadow-xl z-20 max-w-[200px]"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Mic size={10} className="text-white animate-pulse" />
                    <span className="text-[8px] font-black uppercase text-white/70">Mendengarkan...</span>
                  </div>
                  <p className="text-xs font-bold text-white leading-tight">
                    "{transcript}"
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* AI Captions Overlay (CC) - Moved to top right like a notification */}
        <AnimatePresence>
          {aiCaptions && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-32 right-8 w-full max-w-sm px-4 z-40"
            >
              <div className="bg-sky-600/90 backdrop-blur-md rounded-2xl border border-white/20 p-4 shadow-2xl">
                 <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={14} className="text-sky-200" />
                    <span className="text-[10px] font-black uppercase text-sky-100 tracking-widest">Panelis Berbicara</span>
                 </div>
                 <p className="text-sm font-bold text-white tracking-tight leading-relaxed">
                   {aiCaptions}
                 </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom Controls ── */}
      <div className="h-20 md:h-24 bg-[#202124] flex items-center justify-center gap-2 md:gap-3 shrink-0 px-2 md:px-4">
        
        <div className="flex items-center gap-2 md:gap-3">
          <ControlButton 
            active={isMicOn} 
            onClick={toggleMic} 
            icon={isMicOn ? Mic : MicOff} 
            color={isMicOn ? "bg-[#3c4043]" : "bg-rose-500"} 
          />
          <div className="hidden sm:block">
            <ControlButton active icon={Video} color="bg-[#3c4043]" />
          </div>
          <div className="hidden sm:block">
            <ControlButton active icon={Layout} color="bg-[#3c4043]" />
          </div>
          <ControlButton 
            active 
            onClick={() => onFinish(conversation)} 
            icon={PhoneOff} 
            color="bg-rose-600" 
            large 
          />
          <div className="hidden sm:block">
            <ControlButton active icon={Hand} color="bg-[#3c4043]" />
          </div>
          <div className="hidden sm:block">
            <ControlButton active icon={Smile} color="bg-[#3c4043]" />
          </div>
          <ControlButton active icon={Settings} color="bg-[#3c4043]" />
        </div>

        {/* Meeting Info Floating Right (Desktop) */}
        <div className="absolute right-8 hidden lg:flex items-center gap-4">
           <div className="text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Status Koneksi</p>
              <div className="flex items-center gap-1.5 justify-end">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[10px] font-black text-emerald-500">OPTIMAL</span>
              </div>
           </div>
           <button className="w-10 h-10 rounded-full bg-[#3c4043] flex items-center justify-center">
              <Info size={18} />
           </button>
        </div>
      </div>

      {/* AI Process Overlay */}
      {isAThinking && (
        <div className="absolute top-20 right-8 z-50">
           <motion.div 
             initial={{ x: 20, opacity: 0 }}
             animate={{ x: 0, opacity: 1 }}
             className="bg-sky-500/20 backdrop-blur-md border border-sky-500/30 px-4 py-2 rounded-xl flex items-center gap-3"
           >
             <div className="flex gap-1">
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-sky-400 rounded-full" />
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-sky-400 rounded-full" />
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-sky-400 rounded-full" />
             </div>
             <span className="text-[10px] font-black text-sky-400 tracking-widest uppercase">VibeBot Menanggapi...</span>
           </motion.div>
        </div>
      )}

    </div>
  );
}

function MeetingTile({ 
  id, isActive, label, isThinking 
}: { 
  id: PanelistId, isActive: boolean, label: string, isThinking: boolean 
}) {
  return (
    <div className={cn(
      "relative bg-[#3c4043] rounded-xl md:rounded-2xl border-[2px] md:border-[3px] transition-all overflow-hidden flex flex-col items-center justify-center",
      isActive ? "border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.1)]" : "border-transparent"
    )}>
      <PanelistAvatar id={id} size="md" isThinking={isActive || isThinking} />
      
      {/* Speaking Indicator Ring */}
      {isActive && (
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1.1, opacity: [0, 0.2, 0] }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="absolute w-24 h-24 md:w-40 h-40 border-[2px] md:border-[4px] border-emerald-400 rounded-full pointer-events-none"
        />
      )}

      {/* Label */}
      <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4 flex items-center gap-1.5 md:gap-2 bg-black/40 backdrop-blur-md px-2 py-1 md:px-3 md:py-1.5 rounded-lg border border-white/10">
         {isActive ? (
           <div className="p-0.5 md:p-1 bg-emerald-500 rounded-md">
             <Volume2 size={10} md:size={12} className="text-white" />
           </div>
         ) : (
           <div className="p-0.5 md:p-1 bg-slate-600 rounded-md">
             <VolumeX size={10} md:size={12} className="text-slate-400" />
           </div>
         )}
         <span className="text-[10px] md:text-xs font-bold">{label}</span>
      </div>

      {/* Interruption Badge */}
      <AnimatePresence>
        {isThinking && (
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="absolute top-4 right-4 bg-amber-500 px-3 py-1 rounded-full text-[10px] font-black text-white shadow-lg flex items-center gap-1.5"
          >
            <Zap size={10} fill="white" /> INTERUPSI
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ControlButton({ 
  icon: Icon, active, onClick, color, large 
}: { 
  icon: any, active?: boolean, onClick?: () => void, color?: string, large?: boolean 
}) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "rounded-full flex items-center justify-center transition-all hover:brightness-110 active:scale-90",
        large ? "w-12 h-12 md:w-14 md:h-14" : "w-10 h-10 md:w-11 md:h-11",
        color || "bg-[#3c4043]",
        !active && "opacity-40"
      )}
    >
      <Icon size={large ? 20 : 18} md:size={large ? 24 : 20} strokeWidth={2.5} />
    </button>
  );
}
