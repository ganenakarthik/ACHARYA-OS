import { useState, useEffect, useRef } from 'react';
import { Power, Target, Activity, Mic, Brain, Send, Minimize2, Shield, Compass, User, Clock, Zap, FileText, Focus, BellOff, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import RightPanelTabs from './RightPanelTabs';


interface Explainability {
  why: string;
  evidence: string;
  impact: string;
  confidence: string;
}

interface PlanPhase {
  phase: string;
  title: string;
  task: string;
}

interface Mission {
  mission: string;
  explainability: Explainability;
  plan_phases?: PlanPhase[];
  curated_resources?: Array<{ title: string; type: string; url: string }>;
}

function App() {
  const [mission, setMission] = useState<Mission | null>(null);
  const [isPowerOn, setIsPowerOn] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [identityTwin, setIdentityTwin] = useState<{
    ideal_self: string;
    momentum: number;
    identity_gap: string;
    actions_completed: number;
  } | null>(null);
  const [visualContext, setVisualContext] = useState("");
  const [inputText, setInputText] = useState("");
  const [logs, setLogs] = useState<string[]>(["[SYSTEM] ACHARYA Online."]);
  const [privacy, setPrivacy] = useState<Record<string, boolean>>({
    MIC: true,
    CAMERA: false,
    SCREEN: true,
    MEMORY: true,
    INTERNET: false
  });

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardGoal, setOnboardGoal] = useState("");
  const [onboardDomain, setOnboardDomain] = useState("");
  const [onboardFocus, setOnboardFocus] = useState("");
  const [onboardLoading, setOnboardLoading] = useState(false);

  // Live clock
  const [clock, setClock] = useState(() => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  });

  // Streak tracker (localStorage persisted)
  const [streak, setStreak] = useState<boolean[]>(() => {
    try { return JSON.parse(localStorage.getItem('acharya_streak') || 'null') || Array(7).fill(false); }
    catch { return Array(7).fill(false); }
  });

  // Pomodoro Focus Timer State
  const [focusTimeRemaining, setFocusTimeRemaining] = useState(25 * 60);
  const [isFocusActive, setIsFocusActive] = useState(false);

  // Input Ref
  const inputRef = useRef<HTMLInputElement>(null);

  const wsRef = useRef<WebSocket | null>(null);

  // Check if user is already onboarded on startup
  useEffect(() => {
    fetch('http://127.0.0.1:8000/onboard/status')
      .then(r => r.json())
      .then(data => {
        if (!data.onboarded) {
          setTimeout(() => setShowOnboarding(true), 800);
        }
      })
      .catch(() => {
        // Backend not ready yet, show onboarding after delay
        setTimeout(() => setShowOnboarding(true), 1500);
      });
  }, []);

  const handleOnboardSubmit = async () => {
    if (!onboardGoal.trim()) return;
    setOnboardLoading(true);

    // Persist to localStorage so RightPanelTabs can read domain for news feed
    localStorage.setItem('acharya_onboard_domain', onboardDomain || 'Startup');
    localStorage.setItem('acharya_onboard_goal', onboardGoal);
    localStorage.setItem('acharya_onboard_focus', onboardFocus);

    try {
      await fetch('http://127.0.0.1:8000/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: onboardGoal, domain: onboardDomain, focus: onboardFocus })
      });
    } catch (e) {
      console.error('Onboard save failed', e);
    }
    setOnboardLoading(false);
    setShowOnboarding(false);
    setIsExpanded(true);
    setLogs(prev => [...prev, `[ACHARYA] Target locked: ${onboardGoal}`].slice(-4));
  };

  useEffect(() => {
    // Make the fullscreen background click-through by default on mount
    (window as any).electronAPI?.setIgnoreMouseEvents(true, { forward: true });
  }, []);

  // Live clock tick
  useEffect(() => {
    const tick = setInterval(() => {
      const now = new Date();
      setClock(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
    }, 10000);
    return () => clearInterval(tick);
  }, []);

  // Mark today as active in streak on first run
  useEffect(() => {
    const todayIdx = new Date().getDay(); // 0=Sun…6=Sat
    setStreak(prev => {
      const next = [...prev];
      next[todayIdx] = true;
      localStorage.setItem('acharya_streak', JSON.stringify(next));
      return next;
    });
  }, []);

  // Pomodoro Focus Timer Ticker
  useEffect(() => {
    if (!isFocusActive) return;
    const interval = setInterval(() => {
      setFocusTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsFocusActive(false);
          // Play speech alerts
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance("Focus session complete. Take a break, Sir.");
            window.speechSynthesis.speak(utterance);
          }
          return 25 * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isFocusActive]);

  const handleQuickAction = (action: string) => {
    // 1. Intercept "Note" click: pre-fill command bar and focus it
    if (action.includes("Take a quick note")) {
      setInputText("take note: ");
      // Small timeout to guarantee DOM update before focus
      setTimeout(() => inputRef.current?.focus(), 50);
      setLogs(prev => [...prev, `[NOTE] Ready to type daily note...`].slice(-4));
      return;
    }

    // 2. Intercept "Focus" click: toggle Pomodoro Timer
    if (action.includes("focus session")) {
      setIsFocusActive(prev => {
        const next = !prev;
        if (next) {
          setFocusTimeRemaining(25 * 60);
          setLogs(prevLogs => [...prevLogs, `[FOCUS] Pomodoro started: 25 mins`].slice(-4));
          // Send to backend so it speaks confirmation
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "signal", data: { type: "text_command", details: action } }));
          }
        } else {
          setLogs(prevLogs => [...prevLogs, `[FOCUS] Pomodoro cancelled`].slice(-4));
        }
        return next;
      });
      return;
    }

    const short = action.split(' ').slice(0, 4).join(' ');
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "signal", data: { type: "text_command", details: action } }));
      setLogs(prev => [...prev, `[QUICK] ${short}…`].slice(-4));
    } else {
      // WS not connected — queue via text input fallback and log
      setInputText(action);
      setLogs(prev => [...prev, `[QUICK] Not connected — typed into bar`].slice(-4));
    }
  };

  // ── KEY FIX: whenever the widget collapses, always release mouse capture ──
  useEffect(() => {
    if (!isExpanded) {
      // Small delay to let the collapse animation finish, then always release
      const t = setTimeout(() => {
        (window as any).electronAPI?.setIgnoreMouseEvents(true, { forward: true });
      }, 350);
      return () => clearTimeout(t);
    }
  }, [isExpanded]);

  // ── Safety net: if cursor is far from any widget, auto-release ─────────────
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      // If no widget element is under the cursor, release capture
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const isOverWidget = el?.closest('[data-widget]') != null;
      if (!isOverWidget) {
        (window as any).electronAPI?.setIgnoreMouseEvents(true, { forward: true });
      }
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, []);

  const handleMouseEnter = () => {
    // When hovering the widget, intercept mouse events
    (window as any).electronAPI?.setIgnoreMouseEvents(false);
  };

  const handleMouseLeave = () => {
    // When leaving the widget, pass mouse events to desktop behind it
    (window as any).electronAPI?.setIgnoreMouseEvents(true, { forward: true });
  };

  useEffect(() => {
    if (!isPowerOn) return;

    let reconnectTimer: any = null;

    const connectWebSocket = () => {
      const ws = new WebSocket('ws://127.0.0.1:8000/ws');
      wsRef.current = ws;
      
      ws.onopen = () => {
        setLogs(prev => [...prev, `[SYSTEM] Neural link established.`].slice(-4));
        // Auto-mark today's streak — ACHARYA being active = streak earned
        const todayIdx = new Date().getDay();
        setStreak(prev => {
          const next = [...prev];
          next[todayIdx] = true;
          localStorage.setItem('acharya_streak', JSON.stringify(next));
          return next;
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'mission_update') {
            setMission(data.data);
            if (data.data?.identity_twin) {
              setIdentityTwin(data.data.identity_twin);
            }
            if (data.data?.explainability?.evidence) {
               setVisualContext(data.data.explainability.evidence);
            }
            setLogs(prev => [...prev, `[MISSION] ${data.data?.mission || 'Update received'}`].slice(-4));
            
            // Speak response using Browser Web Speech API TTS
            if ('speechSynthesis' in window && data.data?.mission) {
              try {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(data.data.mission);
                utterance.rate = 1.0;
                utterance.pitch = 1.0;
                window.speechSynthesis.speak(utterance);
              } catch (e) {
                console.error("Browser TTS error:", e);
              }
            }

            // Trigger speaking animation
            setIsSpeaking(true);
            setTimeout(() => setIsSpeaking(false), 4000);
          } else if (data.type === 'privacy_update') {
            setPrivacy(data.data);
            setLogs(prev => [...prev, `[PRIVACY] Settings updated.`].slice(-4));
          }
        } catch(e) {}
      };

      ws.onclose = () => {
        setLogs(prev => [...prev, `[SYSTEM] Reconnecting neural link...`].slice(-4));
        reconnectTimer = setTimeout(() => {
          if (isPowerOn) connectWebSocket();
        }, 2000);
      };
    };

    connectWebSocket();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isPowerOn]);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
       setLogs(prev => [...prev, "[ERROR] Speech API disabled. Use Text."].slice(-4));
       return;
    }
    const recognition = new SpeechRecognition();
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      setLogs(prev => [...prev, `[MIC ERROR] ${event.error}`].slice(-4));
      setIsListening(false);
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setLogs(prev => [...prev, `[VOICE] ${transcript}`].slice(-4));
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "signal", data: { type: "voice_command", details: transcript } }));
      } else if (wsRef.current?.readyState === WebSocket.CONNECTING) {
        setLogs(prev => [...prev, `[SYSTEM] Establishing link... Please wait.`].slice(-4));
      } else {
        setLogs(prev => [...prev, `[ERROR] No backend connection.`].slice(-4));
      }
      setIsSpeaking(true);
      setTimeout(() => setIsSpeaking(false), 3000);
    };
    try {
      recognition.start();
    } catch (e) {
      setLogs(prev => [...prev, `[MIC ERROR] Already started.`].slice(-4));
    }
  };

  const stopListening = () => setIsListening(false);

  const handleSendText = () => {
    if (!inputText.trim()) return;
    setLogs(prev => [...prev, `[USER] ${inputText}`].slice(-4));
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "signal", data: { type: "text_command", details: inputText } }));
    } else if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      setLogs(prev => [...prev, `[SYSTEM] Establishing link... Please wait.`].slice(-4));
    } else {
      setLogs(prev => [...prev, `[ERROR] No backend connection.`].slice(-4));
    }
    setInputText("");
    setIsSpeaking(true);
    setTimeout(() => setIsSpeaking(false), 3000);
  };

  if (!isPowerOn) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-transparent pointer-events-none">
        <motion.button 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setIsPowerOn(true)} 
          data-widget
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="p-4 rounded-full bg-black/80 border border-cyan-500/50 hover:bg-cyan-500/20 transition-colors shadow-[0_0_20px_rgba(0,243,255,0.3)] pointer-events-auto"
        >
          <Power size={24} className="text-cyan-400" />
        </motion.button>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden pointer-events-none flex items-center justify-center">

      {/* ONBOARDING MODAL */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            data-widget
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] pointer-events-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ type: "spring", stiffness: 200, damping: 22 }}
              className="w-[500px] bg-[#050c18] border border-cyan-500/50 rounded-2xl p-8 shadow-[0_0_80px_rgba(0,243,255,0.25)] flex flex-col gap-6"
            >
              {/* Header */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/30 to-purple-600/30 border border-cyan-500/50 flex items-center justify-center shadow-[0_0_20px_rgba(0,243,255,0.3)]">
                    <Brain size={20} className="text-cyan-400" />
                  </div>
                  <div>
                    <h1 className="text-white font-black text-lg tracking-wide">Welcome to ACHARYA</h1>
                    <p className="text-cyan-400/70 text-[11px] uppercase tracking-widest font-bold">Your AI Operating Mentor</p>
                  </div>
                </div>
                <p className="text-white/50 text-sm leading-relaxed mt-1">
                  Before we begin, tell me about yourself. I'll use this to personalize every recommendation, plan, and mentor resource — from day one.
                </p>
              </div>

              {/* Divider */}
              <div className="w-full h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

              {/* Form */}
              <div className="flex flex-col gap-4">
                {/* Goal */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-cyan-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <Target size={11} /> What is your #1 Goal or Ideal Self?
                  </label>
                  <input
                    type="text"
                    value={onboardGoal}
                    onChange={e => setOnboardGoal(e.target.value)}
                    placeholder="e.g. Become a Startup Founder, Win a Hackathon, Master AI..."
                    className="w-full bg-white/5 border border-cyan-500/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                  />
                </div>

                {/* Domain */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-purple-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <Compass size={11} /> Domain / Field
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Startup', 'AI / ML', 'Coding', 'Hackathon', 'Product', 'Exam Prep'].map(d => (
                      <button
                        key={d}
                        onClick={() => setOnboardDomain(d)}
                        className={`py-2 rounded-lg text-[11px] font-bold border transition-all ${
                          onboardDomain === d
                            ? 'bg-purple-500/30 border-purple-400/80 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                            : 'bg-white/5 border-white/10 text-white/50 hover:border-white/30 hover:text-white/80'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Focus Area */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-emerald-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <Activity size={11} /> Current Focus / What are you building?
                  </label>
                  <input
                    type="text"
                    value={onboardFocus}
                    onChange={e => setOnboardFocus(e.target.value)}
                    placeholder="e.g. Building an MVP, Preparing for placement, Learning React..."
                    className="w-full bg-white/5 border border-emerald-500/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex items-center justify-between gap-3 mt-1">
                <button
                  onClick={() => setShowOnboarding(false)}
                  className="text-white/30 text-xs hover:text-white/60 transition-colors"
                >
                  Skip for now
                </button>
                <button
                  onClick={handleOnboardSubmit}
                  disabled={!onboardGoal.trim() || onboardLoading}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    onboardGoal.trim()
                      ? 'bg-gradient-to-r from-cyan-500/80 to-purple-600/80 border border-cyan-400/60 text-white shadow-[0_0_25px_rgba(0,243,255,0.3)] hover:shadow-[0_0_35px_rgba(0,243,255,0.5)] hover:scale-105'
                      : 'bg-white/10 border border-white/10 text-white/30 cursor-not-allowed'
                  }`}
                >
                  {onboardLoading ? (
                    <>Initializing...</>
                  ) : (
                    <><Send size={14} /> Lock Target & Begin</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Draggable Widget Container */}
      <motion.div 
        drag 
        dragMomentum={false}
        data-widget
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="pointer-events-auto relative flex items-center justify-center cursor-grab active:cursor-grabbing"

      >
        
        {/* LEFT PANEL */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: -170, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
              className="absolute w-[360px] bg-black/90 backdrop-blur-2xl border border-cyan-500/40 rounded-2xl shadow-[0_0_60px_rgba(0,243,255,0.2),inset_0_1px_0_rgba(255,255,255,0.04)] cursor-default z-0 top-1/2 -translate-y-1/2 max-h-[84vh] flex flex-col overflow-hidden"
              style={{ right: '50%' }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {/* Scanlines overlay */}
              <div className="scanlines absolute inset-0 rounded-2xl z-0 pointer-events-none" />

              {/* Panel header bar */}
              <div className="relative z-10 flex items-center justify-between px-4 py-2.5 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 status-blink shadow-[0_0_8px_#00f3ff]" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400/80">ACHARYA · Identity OS</span>
                </div>
                <span className="text-[8px] text-white/20 font-mono">v2.6 · LIVE</span>
              </div>

              <div className="overflow-y-auto custom-scrollbar flex flex-col gap-3 p-3 pt-2 relative z-10">

              {/* ── Identity Twin Card ── */}
              <div className="bg-gradient-to-br from-purple-950/40 to-black/60 border border-purple-500/35 rounded-xl p-4 relative overflow-hidden shadow-[0_0_25px_rgba(168,85,247,0.12)]">
                {/* Subtle corner glow */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl" />
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-purple-400 font-black tracking-widest text-[9px] uppercase flex items-center gap-1.5">
                    <User size={12} className="text-purple-400" /> Identity Twin
                  </h2>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] text-purple-300/70 font-bold">MOMENTUM</span>
                    <span className="bg-purple-500/25 text-purple-200 text-[10px] px-2 py-0.5 rounded-md border border-purple-400/30 font-black tabular-nums">
                      {identityTwin?.momentum || 7}<span className="text-purple-400/50">/10</span>
                    </span>
                  </div>
                </div>
                {/* Ideal self */}
                <p className="neon-shimmer text-[13px] font-black leading-tight mb-3">
                  {identityTwin?.ideal_self || "Visionary Technical Founder"}
                </p>
                {/* Momentum bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[8px] text-white/40 font-bold uppercase tracking-wider">
                    <span>Progress to Ideal Self</span>
                    <span className="text-purple-300">{100 - (identityTwin?.momentum || 7) * 10}% Gap</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="momentum-bar bg-gradient-to-r from-purple-500 via-fuchsia-400 to-cyan-400 h-full rounded-full shadow-[0_0_8px_rgba(168,85,247,0.6)]"
                      style={{ width: `${(identityTwin?.momentum || 7) * 10}%` }}
                    />
                  </div>
                  <div className="flex gap-1 mt-1">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className={`flex-1 h-0.5 rounded-full transition-all ${
                        i < (identityTwin?.momentum || 7) ? 'bg-purple-400/70' : 'bg-white/10'
                      }`} />
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Active Directive Card ── */}
              <div className="bg-gradient-to-br from-cyan-950/30 to-black/60 border border-cyan-500/30 rounded-xl p-4 overflow-hidden relative shadow-[0_0_20px_rgba(0,243,255,0.08)]">
                {isSpeaking && <motion.div layoutId="speaking-glow-left" className="absolute inset-0 bg-cyan-400/15 animate-pulse rounded-xl" />}
                <div className="absolute bottom-0 right-0 w-24 h-16 bg-cyan-500/5 rounded-full blur-2xl" />
                <div className="flex items-center gap-2 mb-2.5 relative z-10">
                  <div className={`w-1.5 h-1.5 rounded-full ${mission ? 'bg-green-400 shadow-[0_0_8px_#22c55e]' : 'bg-white/20'} ${isSpeaking ? 'animate-ping' : 'animate-pulse'}`} />
                  <h2 className="text-green-400 font-black tracking-widest text-[9px] uppercase">Active Directive</h2>
                  {mission && (
                    <span className="ml-auto text-[8px] text-green-400/70 font-bold bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                      {mission.explainability?.confidence || '—'}
                    </span>
                  )}
                </div>
                {mission ? (
                  <div className="space-y-2.5 relative z-10">
                    <motion.p
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} key={mission.mission}
                      className="text-white/90 text-[12px] font-semibold leading-snug"
                    >
                      {mission.mission}
                    </motion.p>
                    {mission.explainability?.why && (
                      <p className="text-white/40 text-[10px] leading-snug border-l-2 border-cyan-500/30 pl-2">
                        {mission.explainability.why}
                      </p>
                    )}
                    <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: '97%' }} transition={{ duration: 1.2, ease: 'easeOut' }}
                        className="bg-gradient-to-r from-green-400 to-cyan-400 h-full rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-3 relative z-10">
                    <div className="w-2 h-2 rounded-full bg-white/20 animate-pulse" />
                    <p className="text-white/25 text-[11px] italic">Awaiting directive — speak or type a command</p>
                  </div>
                )}
              </div>

              {/* ── Action Roadmap ── */}
              {mission?.plan_phases && mission.plan_phases.length > 0 && (
                <div className="bg-gradient-to-br from-emerald-950/30 to-black/60 border border-emerald-500/35 rounded-xl p-4 space-y-3 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                  <div className="flex items-center justify-between">
                    <h2 className="text-emerald-400 font-black tracking-widest text-[9px] uppercase flex items-center gap-1.5">
                      <Target size={12} className="text-emerald-400" /> Action Roadmap
                    </h2>
                    <span className="bg-emerald-500/15 text-emerald-300 text-[8px] px-2 py-0.5 rounded border border-emerald-400/25 font-black">
                      {mission.plan_phases.length} Phases
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {mission.plan_phases.map((item, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.07 }}
                        className="bg-black/50 px-3 py-2.5 rounded-lg border border-emerald-500/20 hover:border-emerald-400/60 transition-all group flex items-start gap-2.5"
                      >
                        <div className={`mt-0.5 w-3.5 h-3.5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                          idx === 0 ? 'bg-emerald-500/30 border-emerald-400' : 'border-white/20 group-hover:border-emerald-500/50'
                        }`}>
                          {idx === 0 && <div className="w-1.5 h-1.5 rounded-sm bg-emerald-400" />}
                        </div>
                        <div>
                          <div className="text-[9px] font-black text-emerald-300/80 uppercase tracking-widest">
                            {item.phase}
                          </div>
                          <div className="text-[11px] text-white/80 leading-snug font-medium">
                            {item.task}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── 7-Day Streak Tracker (auto by ACHARYA) ── */}
              <div className="bg-black/40 border border-orange-500/20 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2.5">
                  <h2 className="text-orange-400/80 font-black tracking-widest text-[9px] uppercase flex items-center gap-1.5">
                    <Zap size={11} className="text-orange-400" /> ACHARYA Streak
                  </h2>
                  <span className="text-[8px] font-black text-orange-300/70 bg-orange-500/10 border border-orange-400/20 px-2 py-0.5 rounded-md">
                    🔥 {streak.filter(Boolean).length} days
                  </span>
                </div>
                <div className="flex gap-1 items-end mb-2">
                  {['S','M','T','W','T','F','S'].map((day, i) => {
                    const isToday = i === new Date().getDay();
                    const done = streak[i];
                    return (
                      <div key={i} className="flex flex-col items-center gap-1 flex-1">
                        <motion.div
                          animate={done ? { scale: [1, 1.15, 1] } : {}}
                          transition={{ duration: 0.4 }}
                          className={`w-full rounded-lg border transition-all flex items-center justify-center ${
                            done
                              ? 'h-8 bg-orange-500/30 border-orange-400/60 shadow-[0_0_12px_rgba(251,146,60,0.35)]'
                              : isToday
                              ? 'h-7 bg-white/5 border-cyan-500/30 shadow-[0_0_6px_rgba(0,243,255,0.1)]'
                              : 'h-6 bg-white/3 border-white/8'
                          }`}
                        >
                          {done ? (
                            <span className="text-[11px]">🔥</span>
                          ) : isToday ? (
                            <div className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />
                          ) : null}
                        </motion.div>
                        <span className={`text-[7px] font-black uppercase ${
                          isToday ? 'text-cyan-400' : done ? 'text-orange-400/70' : 'text-white/15'
                        }`}>{day}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[8px] text-white/20 italic text-center">ACHARYA marks your streak automatically</p>
              </div>

              {/* ── Cognitive Twin Sync (Holographic Digital Twin Core) ── */}
              <div className="bg-gradient-to-br from-cyan-950/20 to-black/60 border border-cyan-500/25 rounded-xl p-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-cyan-400 font-black tracking-widest text-[9px] uppercase flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                    </span>
                    Cognitive Twin Sync
                  </h2>
                  <span className="text-[8px] font-mono text-cyan-300 font-bold tracking-wider uppercase bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded">
                    Syncing.. {identityTwin?.momentum ? (40 + identityTwin.momentum * 5.5).toFixed(1) : "78.4"}%
                  </span>
                </div>
                
                {/* Holographic Synapse wave & Node Mesh */}
                <div className="flex items-center gap-3 py-1">
                  <svg viewBox="0 0 100 32" className="w-24 h-9 flex-shrink-0">
                    <defs>
                      <linearGradient id="waveGrad" x1="0" x2="1" y1="0" y2="0">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
                        <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity="0.8" />
                      </linearGradient>
                    </defs>
                    {/* Background grid gridlines */}
                    <line x1="0" y1="8" x2="100" y2="8" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                    <line x1="0" y1="16" x2="100" y2="16" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                    <line x1="0" y1="24" x2="100" y2="24" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                    {/* Sine & Cosine Wave sync overlay */}
                    <path 
                      d="M 0,16 Q 12,2 25,16 T 50,16 T 75,16 T 100,16" 
                      fill="none" 
                      stroke="url(#waveGrad)" 
                      strokeWidth="1.5" 
                      className={`transition-all duration-300 ${isSpeaking ? 'animate-[pulse_0.4s_infinite]' : ''}`} 
                    />
                    <path 
                      d="M 0,16 Q 12,30 25,16 T 50,16 T 75,16 T 100,16" 
                      fill="none" 
                      stroke="rgba(6, 182, 212, 0.2)" 
                      strokeWidth="1" 
                      strokeDasharray="2 2"
                    />
                    {/* Node particles */}
                    <circle cx="25" cy="16" r="2.5" fill="#a855f7" className="animate-ping" />
                    <circle cx="25" cy="16" r="1.5" fill="#a855f7" />
                    <circle cx="50" cy="16" r="2.5" fill="#06b6d4" className="animate-pulse" />
                    <circle cx="75" cy="16" r="1.5" fill="#22c55e" />
                  </svg>
                  
                  {/* Digital Twin State Parameters */}
                  <div className="flex-1 font-mono text-[8px] text-white/40 space-y-1 border-l border-white/5 pl-3.5">
                    <div className="flex justify-between">
                      <span>COGNITIVE FLOW:</span>
                      <span className="text-cyan-300 font-bold">{isFocusActive ? "HYPER-FOCUS" : "ACTIVE"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>NEURAL TEMP:</span>
                      <span className="text-purple-300 font-bold">{isSpeaking ? "41.2°C" : "36.8°C"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TWIN STATE:</span>
                      <span className="text-green-300 font-bold">STABLE</span>
                    </div>
                  </div>
                </div>
              </div>

              </div>

              {/* Panel footer status bar */}
              <div className="relative z-10 flex items-center justify-between px-4 py-2 border-t border-white/5 shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-green-400 shadow-[0_0_5px_#22c55e] animate-pulse" />
                  <span className="text-[8px] text-white/25 font-mono">WS CONNECTED</span>
                </div>
                <span className="text-[8px] text-white/20 font-mono">{identityTwin?.actions_completed || 3} ACTIONS DONE</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CENTRAL ORB */}
        <motion.div layout className="relative z-10 flex flex-col items-center justify-center">
          {/* Controls visible only when expanded */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                className="absolute -top-14 flex items-center gap-2 cursor-default"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <button onClick={() => setIsExpanded(false)} className="p-1.5 bg-black/90 backdrop-blur-md border border-cyan-500/40 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 rounded-full transition-all shadow-[0_0_15px_rgba(0,243,255,0.3)] text-[10px] font-bold tracking-wider px-3 flex items-center gap-1.5">
                  <Minimize2 size={12} /> Minimize
                </button>
                <button onClick={() => { setIsPowerOn(false); setIsExpanded(false); }} className="p-1.5 bg-black/90 backdrop-blur-md border border-red-500/40 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-full transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] text-[10px] font-bold tracking-wider px-3 flex items-center gap-1.5">
                  <Power size={12} /> Shutdown
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Actions row — shown ABOVE the controls row when expanded */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                transition={{ delay: 0.15 }}
                className="absolute -top-[116px] flex items-center gap-1.5"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                {[
                  { icon: <FileText size={12} />, label: 'Note',   cmd: 'Take a quick note about what I just did' },
                  { icon: <Focus size={12} />,    label: 'Focus',  cmd: 'Start a 25 minute focus session' },
                  { icon: <Zap size={12} />,      label: 'Boost',  cmd: 'Give me a quick motivational push' },
                  { icon: <BellOff size={12} />,  label: 'Snooze', cmd: 'Snooze all alerts for 15 minutes' },
                ].map(({ icon, label, cmd }) => (
                  <button
                    key={label}
                    onClick={() => handleQuickAction(cmd)}
                    title={cmd}
                    className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 bg-black/80 backdrop-blur-md border border-white/10 rounded-xl text-white/50 hover:text-cyan-300 hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:shadow-[0_0_12px_rgba(0,243,255,0.2)] transition-all group"
                  >
                    <span className="group-hover:scale-110 transition-transform">{icon}</span>
                    <span className="text-[7px] font-black uppercase tracking-wider">{label}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* The Orb */}
          <motion.div
            layoutId="central-orb"
            onClick={() => !isExpanded && setIsExpanded(true)}
            className={`rounded-full flex items-center justify-center relative group ${isExpanded ? 'w-40 h-40 cursor-default' : 'w-28 h-28 cursor-pointer'}`}
          >
             {/* Outer glow pulse ring */}
             <motion.div
               animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.8, 0.4] }}
               transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
               className="absolute inset-[-6px] rounded-full border border-cyan-500/30 shadow-[0_0_30px_rgba(0,243,255,0.2)]"
             />
             {/* Active speaking/listening pulse */}
             {(isSpeaking || isListening) && (
               <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1.6 }} exit={{ opacity: 0 }}
                  className={`absolute inset-0 rounded-full border border-cyan-400/60 ${isListening ? 'animate-[ping_0.8s_infinite]' : 'animate-[ping_1.2s_infinite]'}`} 
               />
             )}
             <div className="absolute inset-0 rounded-full border border-cyan-400/40 animate-[spin_10s_linear_infinite]" style={{ borderStyle: 'dashed' }} />
             <div className={`absolute inset-1 rounded-full border-2 border-transparent border-t-cyan-400/80 border-b-purple-500/80 ${isSpeaking ? 'animate-[spin_0.7s_linear_infinite]' : 'animate-[spin_4s_linear_infinite]'}`} />
             <div className="absolute inset-3 rounded-full border border-purple-500/40 animate-[spin_7s_linear_infinite_reverse]" />
             <div className={`absolute inset-5 rounded-full backdrop-blur-xl flex items-center justify-center overflow-hidden transition-all duration-700 ${
               isSpeaking 
                 ? 'bg-gradient-to-br from-cyan-400/80 via-purple-600/60 to-blue-900 shadow-[inset_0_0_60px_rgba(0,243,255,0.9),0_0_40px_rgba(0,243,255,0.4)]' 
                 : isListening
                 ? 'bg-gradient-to-br from-emerald-500/60 to-cyan-900 shadow-[inset_0_0_40px_rgba(16,185,129,0.6)]'
                 : 'bg-gradient-to-br from-[#0a1628] via-cyan-950 to-[#050810] shadow-[inset_0_0_40px_rgba(0,243,255,0.35),0_0_20px_rgba(0,243,255,0.1)]'
             }`}>
               <div className={`w-full h-full bg-[radial-gradient(circle_at_center,rgba(0,243,255,0.25)_0%,transparent_65%)] ${isSpeaking ? 'animate-[pulse_0.25s_infinite]' : 'animate-[pulse_2s_infinite]'}`} />
               {/* ACHARYA label inside orb */}
               <div className="absolute flex flex-col items-center gap-0.5 select-none">
                 {isFocusActive ? (
                   <>
                     <span className="text-sm font-black text-cyan-400 glow-pulse tracking-wider tabular-nums">
                       {Math.floor(focusTimeRemaining / 60).toString().padStart(2, '0')}:
                       {(focusTimeRemaining % 60).toString().padStart(2, '0')}
                     </span>
                     <span className="text-[7px] font-black text-cyan-300/60 uppercase tracking-widest">FOCUSING</span>
                   </>
                 ) : (
                   <>
                     <div className={`rounded-full shadow-[0_0_30px_#00f3ff] ${isExpanded ? 'w-6 h-6' : 'w-3 h-3'} ${isSpeaking ? 'bg-cyan-200 animate-[ping_0.3s_infinite]' : 'bg-cyan-300 animate-pulse'}`} />
                     {isExpanded && <span className="text-[9px] font-black tracking-[0.25em] text-cyan-300/80 uppercase mt-1">ACHARYA</span>}
                   </>
                 )}
               </div>
             </div>
          </motion.div>

          {/* Clock + hint — as flex sibling BELOW the orb, so it flows naturally */}
          <AnimatePresence mode="wait">
            {!isExpanded && (
              <motion.div
                key="clock-hint"
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-0.5 mt-2 pointer-events-none select-none"
              >
                <div className="flex items-center gap-1 text-cyan-400">
                  <Clock size={10} />
                  <span className="text-[12px] font-black tracking-wider tabular-nums">{clock}</span>
                </div>
                <span className="text-[8px] text-white/25 font-mono">◈ tap to expand</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input Area visible only when expanded */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="absolute -bottom-24 w-[340px] bg-black/90 backdrop-blur-2xl border border-cyan-500/60 rounded-2xl px-3 py-2 flex items-center gap-2 shadow-[0_0_40px_rgba(0,243,255,0.25),inset_0_1px_0_rgba(255,255,255,0.05)] cursor-default z-50"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {/* Mic button with glow */}
                <button 
                  onClick={isListening ? stopListening : startListening}
                  className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 border ${
                    isListening 
                      ? 'bg-cyan-500/30 border-cyan-400/80 shadow-[0_0_20px_rgba(0,243,255,0.5)]' 
                      : 'bg-white/5 border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/10'
                  }`}
                >
                  <Mic size={15} className={isListening ? 'text-cyan-200' : 'text-cyan-400/80'} />
                </button>

                {/* Input divider */}
                <div className="w-px h-5 bg-white/10" />

                <div className="flex-1 relative">
                  <input 
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                    placeholder="Ask ACHARYA anything..."
                    className="w-full bg-transparent border-none py-1.5 px-1 text-[12px] text-white/90 placeholder-white/25 focus:outline-none focus:ring-0 font-light tracking-wide"
                  />
                </div>

                <button 
                  onClick={handleSendText} 
                  className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 border ${
                    inputText.trim() 
                      ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300 shadow-[0_0_15px_rgba(0,243,255,0.3)] hover:bg-cyan-500/30' 
                      : 'bg-white/5 border-white/10 text-white/30'
                  }`}
                >
                  <Send size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* RIGHT PANEL */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, x: -50, scale: 0.9 }}
              animate={{ opacity: 1, x: 170, scale: 1 }}
              exit={{ opacity: 0, x: -50, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
              className="absolute w-[350px] bg-black/85 backdrop-blur-2xl border border-cyan-500/50 rounded-2xl shadow-[0_0_50px_rgba(0,243,255,0.25)] cursor-default z-0 top-1/2 -translate-y-1/2 max-h-[82vh] flex flex-col overflow-hidden"
              style={{ left: '50%' }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {/* Tab Bar */}
              <RightPanelTabs
                mission={mission}
                visualContext={visualContext}
                isSpeaking={isSpeaking}
                privacy={privacy}
                setPrivacy={setPrivacy}
                logs={logs}
                wsRef={wsRef}
              />
            </motion.div>
          )}
        </AnimatePresence>


      </motion.div>
    </div>
  );
}

export default App;
