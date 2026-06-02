/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SimulationType, QuestionEntry } from '../types';
import { User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, MicOff, PhoneOff, Settings, Users, MessageSquare, 
  Hand, Smile, Video, Layout, Info, MoreVertical,
  Volume2, VolumeX, Sparkles, Zap
} from 'lucide-react';
import { cn } from '../lib/utils';
import PanelistAvatar, { PanelistId, PANELISTS } from '../components/PanelistAvatar';
import { getNextTurnMeeting } from '../lib/gemini';

interface LiveMeetingFlowProps {
  mode: SimulationType;
  docText: string;
  jd?: string;
  user: User;
  vibe?: 'standard' | 'killer' | 'santai' | 'gokil';
  onFinish: (answers: QuestionEntry[]) => void;
  onCancel: () => void;
}

export default function LiveMeetingFlow({ 
  mode, docText, jd, user, vibe = 'standard', onFinish, onCancel 
}: LiveMeetingFlowProps) {
  const [isMicOn, setIsMicOn] = useState(false);
  const isMicOnRef = useRef(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const transcriptRef = useRef<string>('');
  const [conversation, setConversation] = useState<QuestionEntry[]>([]);
  const [activeSpeakers, setActiveSpeakers] = useState<PanelistId[]>([]);
  const [meetingStartTime] = useState(new Date());
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const [aiCaptions, setAiCaptions] = useState('');

  // Webcam & Chat Fallback States
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [isCamOn, setIsCamOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');

  // Clean up webcam stream on unmount
  useEffect(() => {
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoStream]);

  const toggleCam = async () => {
    const newState = !isCamOn;
    setIsCamOn(newState);
    if (!newState) {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        setVideoStream(null);
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
        setVideoStream(stream);
      } catch (err) {
        console.error("Camera access failed:", err);
        alert("Gagal mengakses kamera. Silakan periksa izin kamera.");
        setIsCamOn(false);
      }
    }
  };

  useEffect(() => {
    if (videoStream && videoRef.current) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream, isCamOn]);

  const submitChatFallback = () => {
    if (!chatInput.trim() || isAThinkingRef.current) return;
    const text = chatInput.trim();
    setChatInput('');
    handleUserSpeech(text).catch(console.error);
  };

  // ✅ FIX 1: Semua state "thinking" pakai ref agar timer & closure bisa baca nilai terkini
  const isAThinkingRef = useRef(false);
  const [isAThinking, setIsAThinking] = useState(false);
  const isAiSpeakingRef = useRef<boolean>(false);
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(
    typeof window !== 'undefined' ? window.speechSynthesis : null
  );
  const conversationRef = useRef<QuestionEntry[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prodTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProcessedSpeechRef = useRef<string>('');
  
  const currentQuestionRef = useRef<string>('');
  const currentPanelistRef = useRef<string>('');
  const currentIsFollowUpRef = useRef<boolean>(false);
  const [currentIsFollowUp, setCurrentIsFollowUp] = useState<boolean>(false);

  // ✅ FIX 2: Helper untuk sync state + ref sekaligus — cegah stale closure
  const setThinking = useCallback((val: boolean) => {
    isAThinkingRef.current = val;
    setIsAThinking(val);
  }, []);

  // ✅ FIX 3: startProdTimer baca dari ref, bukan dari state closure yang stale
  const startProdTimer = useCallback(() => {
    if (prodTimerRef.current) clearTimeout(prodTimerRef.current);
    prodTimerRef.current = setTimeout(() => {
      if (!isAiSpeakingRef.current && !isAThinkingRef.current && isMicOnRef.current) {
        handleUserSpeech("(User terdiam/masih bingung)");
      }
    }, 12000);
  }, []);

  // ── Timer ──
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
    if (!SpeechRecognition) {
      console.warn("Web Speech API tidak tersedia di browser ini.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'id-ID';

    recognition.onstart = () => setIsListening(true);

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

      const fullText = (currentFinalTranscript || interimTranscript).trim();
      if (!fullText) return;

      setTranscript(fullText);
      transcriptRef.current = fullText;

      // Interupsi jika AI sedang bicara
      if (synthRef.current?.speaking && fullText.length > 3) {
        synthRef.current.cancel();
        setActiveSpeakers([]);
        setAiCaptions('');
        isAiSpeakingRef.current = false;
        if (prodTimerRef.current) clearTimeout(prodTimerRef.current);
      }

      if (isAiSpeakingRef.current) return;

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (prodTimerRef.current) clearTimeout(prodTimerRef.current);

      const silenceDuration = Math.min(2500, Math.max(1500, fullText.length * 20));
      silenceTimerRef.current = setTimeout(() => {
        handleUserSpeech(fullText);
      }, silenceDuration);
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        console.error('Speech recognition error:', event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);

      // Kirim transcript yang belum diproses saat recognition berhenti
      const currentTranscript = transcriptRef.current;
      if (
        currentTranscript &&
        currentTranscript.length > 2 &&
        !isAiSpeakingRef.current &&
        !isAThinkingRef.current  // ✅ baca ref, bukan state
      ) {
        handleUserSpeech(currentTranscript).catch(console.error);
      }

      // Auto-restart jika mic masih aktif
      if (isMicOnRef.current) {
        setTimeout(() => {
          if (isMicOnRef.current) {
            try {
              recognitionRef.current?.start();
            } catch (e: any) {
              if (e.name !== 'InvalidStateError') {
                console.warn("Recognition restart failed:", e);
              }
            }
          }
        }, 200);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognitionRef.current?.stop();
      synthRef.current?.cancel();
    };
  }, []);

  // ── Initial Start — panelist membuka sesi ──
  useEffect(() => {
    const startMeeting = async () => {
      setThinking(true);
      try {
        const initialPanelist = mode.includes('interview') ? 'shinta' : 'metod';
        const firstTurn = await getNextTurnMeeting(mode, docText, [], initialPanelist, jd, undefined, vibe, 1);
        currentQuestionRef.current = firstTurn.script || '';
        currentPanelistRef.current = firstTurn.panelistId || initialPanelist;
        currentIsFollowUpRef.current = !!firstTurn.isFollowUp;
        setCurrentIsFollowUp(!!firstTurn.isFollowUp);
        playAIScript(firstTurn.script, firstTurn);
      } catch (err) {
        console.error("Failed to start meeting:", err);
      } finally {
        setThinking(false);
      }
    };
    startMeeting();
  }, []);

  const toggleMic = () => {
    const newState = !isMicOn;
    setIsMicOn(newState);
    isMicOnRef.current = newState;

    if (!newState) {
      try { recognitionRef.current?.stop(); } catch (e) { console.warn(e); }
      setIsListening(false);
      if (prodTimerRef.current) clearTimeout(prodTimerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
        startProdTimer();
      } catch (e) {
        console.error("Mic start failed:", e);
      }
    }
  };

  const handleUserSpeech = async (text: string) => {
    const cleanText = text.trim();

    // ✅ FIX 4: Guard pakai ref, bukan state — cegah double-submit
    if (!cleanText || isAThinkingRef.current || cleanText === lastProcessedSpeechRef.current) return;

    lastProcessedSpeechRef.current = cleanText;
    transcriptRef.current = '';
    setTranscript('');

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    setThinking(true);

    try {
      const history = conversationRef.current.map(c => ({ q: c.question, a: c.answer }));
      const currentCompletedCores = conversationRef.current.filter(c => !c.isFollowUp).length + (!currentIsFollowUpRef.current ? 1 : 0);
      const nextCoreCount = currentCompletedCores + 1;

      const nextTurn = await getNextTurnMeeting(
        mode,
        docText,
        history,
        currentPanelistRef.current || (mode.includes('interview') ? 'shinta' : 'metod'),
        jd,
        cleanText,
        vibe,
        nextCoreCount
      );

      const newEntry: QuestionEntry = {
        question: currentQuestionRef.current || '',
        answer: cleanText,
        panelistId: (currentPanelistRef.current as any) || 'metod',
        feedback: nextTurn.feedback || '',
        score: nextTurn.score || 0,
        suggestedAnswer: nextTurn.suggestedAnswer || '',
        isFollowUp: currentIsFollowUpRef.current
      };

      const newConversation = [...conversationRef.current, newEntry];
      setConversation(newConversation);
      conversationRef.current = newConversation;

      // Check if we reached 10 core questions answered
      const completedCoreCount = newConversation.filter(c => !c.isFollowUp).length;
      if (completedCoreCount >= 10) {
        // Trigger finish immediately, bypass playing next AI script / synthesis
        onFinish(newConversation);
        return;
      }

      // If not, prepare for next question
      currentQuestionRef.current = nextTurn.script || '';
      currentPanelistRef.current = nextTurn.panelistId || 'metod';
      currentIsFollowUpRef.current = !!nextTurn.isFollowUp;
      setCurrentIsFollowUp(!!nextTurn.isFollowUp);

      playAIScript(nextTurn.script, nextTurn);
    } catch (err) {
      console.error("Meeting response failed:", err);
      // ✅ Reset lastProcessed agar user bisa coba lagi
      lastProcessedSpeechRef.current = '';
    } finally {
      setThinking(false);
    }
  };

  const playAIScript = (script: string, metadata: any) => {
    if (!script?.trim()) {
      startProdTimer();
      return;
    }

    setAiCaptions(script);

    // Regex that matches panelist prefixes (with or without brackets, spaces, colons)
    const speakerRegex = /(Dr\.\s*Metod:|Bu\s*Ima:|Pak\s*Aris:|Bu\s*Shinta:|Mbak\s*Maya:|Mas\s*Budi:|\[[^\]]+\]:)/i;
    const parts = script.split(speakerRegex).filter(p => p.trim() !== '');

    // Fallback: jika tidak ada tag panelis, langsung ucapkan semua
    if (parts.length === 0 || !parts.some(p => speakerRegex.test(p))) {
      const utterance = new SpeechSynthesisUtterance(script);
      utterance.lang = 'id-ID';
      utterance.rate = 1.05;
      utterance.onstart = () => { isAiSpeakingRef.current = true; };
      utterance.onend = () => {
        isAiSpeakingRef.current = false;
        setActiveSpeakers([]);
        setAiCaptions('');
        startProdTimer();
      };
      utterance.onerror = () => {
        isAiSpeakingRef.current = false;
        setActiveSpeakers([]);
        setAiCaptions('');
        startProdTimer();
      };
      synthRef.current?.speak(utterance);
      return;
    }

    const isInterview = mode.includes('interview');
    let currentSpeaker: PanelistId = isInterview ? 'shinta' : 'metod';

    const playSequentially = (index: number) => {
      if (index >= parts.length) {
        isAiSpeakingRef.current = false;
        setActiveSpeakers([]);
        setAiCaptions('');
        startProdTimer();
        return;
      }

      const part = parts[index].trim();

      if (speakerRegex.test(part)) {
        // Parse nama panelis dari tag
        const namePart = part.replace(/[\[\]:]/g, '').toLowerCase().trim();

        if (namePart.includes('metod') || namePart.includes('shinta')) {
          currentSpeaker = isInterview ? 'shinta' : 'metod';
        } else if (namePart.includes('ima') || namePart.includes('maya')) {
          currentSpeaker = isInterview ? 'maya' : 'ima';
        } else if (namePart.includes('aris') || namePart.includes('budi')) {
          currentSpeaker = isInterview ? 'budi' : 'aris';
        }

        setActiveSpeakers([currentSpeaker]);
        // Langsung ke bagian teks berikutnya
        playSequentially(index + 1);
      } else {
        // Ini teks yang diucapkan
        const utterance = new SpeechSynthesisUtterance(part);
        utterance.lang = 'id-ID';

        // Set suara berdasarkan gender panelis
        const voices = window.speechSynthesis.getVoices();
        const idVoices = voices.filter(v => v.lang.toLowerCase().includes('id'));
        
        const isFemale = ['shinta', 'ima', 'maya'].includes(currentSpeaker);
        let selectedVoice = null;
        
        if (idVoices.length > 0) {
          if (idVoices.length >= 2) {
            if (isFemale) {
              selectedVoice = idVoices[1] || idVoices[0];
            } else {
              selectedVoice = idVoices[0];
            }
          } else {
            selectedVoice = idVoices[0];
          }
        } else {
          // Fallback to English/system voices matching gender
          const femaleKeywords = ['female', 'zira', 'susan', 'hazel', 'samantha', 'jenny', 'karen', 'moira', 'tessa', 'sari', 'indonesia'];
          const maleKeywords = ['male', 'david', 'george', 'ravi', 'mark', 'richard', 'wira'];
          
          const candidateVoices = voices.filter(v => {
            const name = v.name.toLowerCase();
            return isFemale 
              ? femaleKeywords.some(kw => name.includes(kw)) 
              : maleKeywords.some(kw => name.includes(kw));
          });
          
          if (candidateVoices.length > 0) {
            selectedVoice = candidateVoices[0];
          } else {
            selectedVoice = voices[0] || null;
          }
        }
        
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }

        // Apply distinct pitch and rate to give unique character voices
        if (currentSpeaker === 'metod') {
          utterance.pitch = 0.72; // deep male
          utterance.rate = 0.88;  // slow & heavy
        } else if (currentSpeaker === 'shinta') {
          utterance.pitch = 1.15; // friendly female
          utterance.rate = 1.0;
        } else if (currentSpeaker === 'ima') {
          utterance.pitch = 1.25; // high/sharp female
          utterance.rate = 1.12;  // fast
        } else if (currentSpeaker === 'maya') {
          utterance.pitch = 1.08; // direct female
          utterance.rate = 1.06;
        } else if (currentSpeaker === 'aris') {
          utterance.pitch = 0.9;  // mid-low male
          utterance.rate = 1.05;  // casual/slightly faster
        } else if (currentSpeaker === 'budi') {
          utterance.pitch = 0.8;  // blunt/flat male
          utterance.rate = 0.96;
        }

        utterance.onstart = () => { isAiSpeakingRef.current = true; };

        utterance.onend = () => {
          playSequentially(index + 1);
        };

        utterance.onerror = () => {
          console.warn("TTS error pada bagian:", part.substring(0, 50));
          playSequentially(index + 1);
        };

        synthRef.current?.speak(utterance);
      }
    };

    playSequentially(0);
  };

  return (
    <div className="fixed inset-0 bg-[#281c30] z-[100] flex flex-col font-sans text-white overflow-hidden">
      {/* Gender gradient top stripe */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-pink-400 via-purple-400 to-sky-400 z-[110]" />

      {/* ── Top Bar ── */}
      <div className="h-16 flex items-center justify-between px-6 shrink-0 border-b border-white/5 pt-1.5">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-pink-500 to-sky-500 p-2 rounded-xl">
            <Video size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm md:text-base">
              {mode.includes('sidang') ? 'Sidang TA/Skripsi Live 🎓' : 'Interview Kerja Live 💼'}
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex flex-wrap items-center gap-1 md:gap-2">
              <span>Sidang Santai Room 🧸</span>
              <span>•</span>
              <span>{elapsedTime}</span>
              <span>•</span>
              <span className="text-purple-400 font-black">Progress {Math.min(10, conversation.filter(c => !c.isFollowUp).length + (!currentIsFollowUp ? 1 : 0))}/10</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-4 mr-4 text-slate-400">
            <div className="flex items-center gap-1.5">
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

      {/* ── Main Grid ── */}
      <div className="flex-1 p-3 md:p-6 overflow-hidden relative flex">
        <div className={cn(
          "h-full w-full max-w-6xl mx-auto grid grid-cols-2 gap-2 md:gap-4 auto-rows-fr transition-all duration-300",
          isChatOpen ? "lg:mr-[340px]" : ""
        )}>

          {/* Panelist 1 */}
          <MeetingTile
            id={mode.includes('interview') ? 'shinta' : 'metod'}
            isActive={activeSpeakers.includes('metod') || activeSpeakers.includes('shinta')}
            label={mode.includes('interview') ? PANELISTS.shinta.name : PANELISTS.metod.name}
            isThinking={isAThinking && (activeSpeakers.includes('metod') || activeSpeakers.includes('shinta'))}
          />

          {/* Panelist 2 */}
          <MeetingTile
            id={mode.includes('interview') ? 'maya' : 'ima'}
            isActive={activeSpeakers.includes('ima') || activeSpeakers.includes('maya')}
            label={mode.includes('interview') ? PANELISTS.maya.name : PANELISTS.ima.name}
            isThinking={isAThinking && (activeSpeakers.includes('ima') || activeSpeakers.includes('maya'))}
          />

          {/* Panelist 3 */}
          <MeetingTile
            id={mode.includes('interview') ? 'budi' : 'aris'}
            isActive={activeSpeakers.includes('aris') || activeSpeakers.includes('budi')}
            label={mode.includes('interview') ? PANELISTS.budi.name : PANELISTS.aris.name}
            isThinking={isAThinking && (activeSpeakers.includes('aris') || activeSpeakers.includes('budi'))}
          />

          {/* User Tile */}
          <div className={cn(
            "relative bg-[#4d3a56] rounded-xl md:rounded-2xl border-[2px] md:border-[3px] transition-all overflow-hidden",
            isListening ? "border-pink-400 shadow-[0_0_20px_rgba(244,63,94,0.25)]" : "border-transparent"
          )}>
            <div className="absolute inset-0 flex items-center justify-center">
              {isCamOn && videoStream ? (
                <video 
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 md:w-32 md:h-32 bg-pink-400 rounded-full flex items-center justify-center text-white text-2xl md:text-4xl font-black border-[3px] md:border-[4px] border-white/20 shadow-xl">
                  {user.displayName?.charAt(0) || 'U'}
                </div>
              )}
            </div>

            {/* User Label */}
            <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4 flex items-center gap-1.5 md:gap-2 bg-black/40 backdrop-blur-md px-2 py-1 md:px-3 md:py-1.5 rounded-lg border border-white/10">
              <span className="text-[10px] md:text-xs font-bold">
                {user.displayName ? user.displayName.split(' ')[0] : 'Anda'} (You)
              </span>
              {!isMicOn && <MicOff size={14} className="text-rose-400" />}
            </div>

            {/* Transcript */}
            <AnimatePresence>
              {transcript && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute right-4 bottom-4 bg-pink-500/95 backdrop-blur-md p-3 rounded-xl border border-white/20 shadow-xl z-20 max-w-[200px]"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Mic size={10} className="text-white animate-pulse" />
                    <span className="text-[8px] font-black uppercase text-white/70">Mendengarkan...</span>
                  </div>
                  <p className="text-xs font-bold text-white leading-tight">"{transcript}"</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* AI Captions */}
        <AnimatePresence>
          {aiCaptions && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-32 left-1/2 -translate-x-1/2 md:left-auto md:right-8 md:translate-x-0 w-[calc(100%-2rem)] md:w-full md:max-w-sm z-40"
            >
              <div className="bg-pink-500/95 backdrop-blur-md rounded-2xl border border-white/20 p-4 shadow-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={14} className="text-pink-200" />
                  <span className="text-[10px] font-black uppercase text-pink-100 tracking-widest">Panelis Berbicara</span>
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
      <div className="h-20 md:h-24 bg-[#201422] flex items-center justify-center gap-2 md:gap-3 shrink-0 px-2 md:px-4 relative border-t border-white/5">
        <div className="flex items-center gap-2 md:gap-3">
          <ControlButton
            active={isMicOn}
            onClick={toggleMic}
            icon={isMicOn ? Mic : MicOff}
            color={isMicOn ? "bg-[#4d3a56]" : "bg-rose-500"}
          />
          <ControlButton 
            active={isCamOn} 
            onClick={toggleCam} 
            icon={Video} 
            color={isCamOn ? "bg-[#4d3a56]" : "bg-rose-500"} 
          />
          <ControlButton 
            active={isChatOpen} 
            onClick={() => setIsChatOpen(!isChatOpen)} 
            icon={MessageSquare} 
            color={isChatOpen ? "bg-pink-400" : "bg-[#4d3a56]"} 
          />
          <ControlButton
            active
            onClick={() => onFinish(conversation)}
            icon={PhoneOff}
            color="bg-rose-600"
            large
          />
          <ControlButton active icon={Settings} color="bg-[#4d3a56]" />
        </div>

        {/* Status Koneksi */}
        <div className="absolute right-8 hidden lg:flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
              Status Koneksi
            </p>
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

      {/* AI Thinking Overlay */}
      {isAThinking && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 md:left-auto md:right-8 md:translate-x-0 z-50">
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="bg-pink-500/20 backdrop-blur-md border border-pink-500/30 px-4 py-2 rounded-xl flex items-center gap-3"
          >
            <div className="flex gap-1">
              <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-pink-400 rounded-full" />
              <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-pink-400 rounded-full" />
              <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-pink-400 rounded-full" />
            </div>
            <span className="text-[10px] font-black text-pink-400 tracking-widest uppercase">
              Penguji Menanggapi... 🧸
            </span>
          </motion.div>
        </div>
      )}

      {/* Chat Sidebar Fallback */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="absolute right-0 top-16 bottom-0 w-full sm:w-[320px] bg-[#190d1b] border-l border-white/10 z-[80] flex flex-col shadow-2xl text-slate-200"
          >
            {/* Sidebar Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#201422] shrink-0">
              <span className="font-black text-sm tracking-tight flex items-center gap-2">
                <MessageSquare size={16} /> Meeting Chat 💬
              </span>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="text-xs font-black uppercase text-slate-400 hover:text-white"
              >
                Tutup
              </button>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {conversation.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center gap-2">
                  <MessageSquare size={24} />
                  <p className="text-xs font-bold px-4">Belum ada obrolan. Mulai bicara atau ketik pesan!</p>
                </div>
              ) : (
                conversation.map((entry, idx) => (
                  <div key={idx} className="space-y-2 text-xs">
                    {/* AI Question */}
                    {entry.question && (
                      <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                        <span className="font-black text-pink-400 block mb-0.5">{PANELISTS[entry.panelistId].name}</span>
                        <p className="font-bold text-slate-300">{entry.question}</p>
                      </div>
                    )}
                    {/* User Answer */}
                    {entry.answer && (
                      <div className="bg-pink-500/10 p-2.5 rounded-xl border border-pink-500/20 text-right">
                        <span className="font-black text-pink-300 block mb-0.5">Anda 🎀</span>
                        <p className="font-bold text-slate-200">{entry.answer}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Text Input Footer */}
            <div className="p-3 border-t border-white/10 bg-[#201422] flex gap-2 shrink-0 safe-bottom">
              <input 
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitChatFallback();
                }}
                placeholder="Ketik jawaban cadangan..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-pink-400 text-white font-bold"
              />
              <button 
                onClick={submitChatFallback}
                disabled={!chatInput.trim() || isAThinking}
                className="bg-pink-400 hover:bg-pink-500 text-white px-3.5 rounded-xl text-xs font-black flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Kirim
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── MeetingTile ──
function MeetingTile({
  id, isActive, label, isThinking
}: {
  id: PanelistId; isActive: boolean; label: string; isThinking: boolean;
}) {
  return (
    <div className={cn(
      "relative bg-[#4d3a56] rounded-xl md:rounded-2xl border-[2px] md:border-[3px] transition-all overflow-hidden flex flex-col items-center justify-center",
      isActive ? "border-pink-400 shadow-[0_0_20px_rgba(244,63,94,0.15)]" : "border-transparent"
    )}>
      <PanelistAvatar id={id} size="md" isThinking={isActive || isThinking} />

      {isActive && (
        <>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1.1, opacity: [0, 0.2, 0] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="absolute w-24 h-24 md:w-40 md:h-40 border-[2px] md:border-[4px] border-pink-400 rounded-full pointer-events-none"
          />
          {/* Audio Wave Visualizer Bars */}
          <div className="absolute top-3 left-3 bg-pink-500/80 backdrop-blur-md px-2 py-1.5 rounded-lg border border-white/10 flex items-center gap-0.5 pointer-events-none z-20">
            <span className="w-0.5 h-2.5 bg-white rounded-full animate-audio-bar-1" />
            <span className="w-0.5 h-3.5 bg-white rounded-full animate-audio-bar-2" />
            <span className="w-0.5 h-2 bg-white rounded-full animate-audio-bar-3" />
            <span className="w-0.5 h-3 bg-white rounded-full animate-audio-bar-4" />
          </div>
        </>
      )}

      <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4 flex items-center gap-1.5 md:gap-2 bg-black/40 backdrop-blur-md px-2 py-1 md:px-3 md:py-1.5 rounded-lg border border-white/10">
        {isActive ? (
          <div className="p-0.5 md:p-1 bg-pink-500 rounded-md">
            <Volume2 size={12} className="text-white" />
          </div>
        ) : (
          <div className="p-0.5 md:p-1 bg-slate-600 rounded-md">
            <VolumeX size={12} className="text-slate-400" />
          </div>
        )}
        <span className="text-[10px] md:text-xs font-bold">{label}</span>
      </div>

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

// ── ControlButton ──
function ControlButton({
  icon: Icon, active, onClick, color, large
}: {
  icon: any; active?: boolean; onClick?: () => void; color?: string; large?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full flex items-center justify-center transition-all hover:brightness-110 active:scale-90",
        large ? "w-12 h-12 md:w-14 md:h-14" : "w-10 h-10 md:w-11 md:h-11",
        color || "bg-[#4d3a56]",
        !active && "opacity-40"
      )}
    >
      <Icon size={large ? 20 : 18} strokeWidth={2.5} />
    </button>
  );
}


