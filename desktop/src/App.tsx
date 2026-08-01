import { useState, useEffect, useRef } from 'react';
import { Power, Target, Activity, Mic, Brain, Send, Minimize2, Shield, Compass, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    // Make the fullscreen background click-through by default
    (window as any).electronAPI?.setIgnoreMouseEvents(true, { forward: true });
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
              className="absolute w-[350px] bg-black/85 backdrop-blur-2xl border border-cyan-500/50 rounded-2xl p-4 shadow-[0_0_50px_rgba(0,243,255,0.25)] cursor-default z-0 top-1/2 -translate-y-1/2 max-h-[82vh] flex flex-col overflow-hidden"
              style={{ right: '50%' }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onPointerDown={(e) => e.stopPropagation()} // Prevent dragging from panels
            >
              <div className="overflow-y-auto custom-scrollbar flex flex-col gap-3.5 pr-1">
              {/* Evolving Identity Twin Card */}
              <div className="bg-purple-900/20 border border-purple-500/40 rounded-xl p-4 relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-purple-400 font-bold tracking-widest text-[10px] uppercase flex items-center gap-2">
                    <User size={14} className="text-purple-400" /> Evolving Identity Twin
                  </h2>
                  <span className="bg-purple-500/30 text-purple-300 text-[9px] px-2 py-0.5 rounded-full border border-purple-400/40 font-bold">
                    Momentum {identityTwin?.momentum || 7}/10
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs text-white/90 font-semibold leading-tight">
                    Target: <span className="text-purple-300 font-bold">{identityTwin?.ideal_self || "Visionary Technical Founder & AI Architect"}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-white/60">
                    <span>Identity Gap</span>
                    <span className="text-purple-400 font-bold">{identityTwin?.identity_gap || "42% Remaining"}</span>
                  </div>
                  <div className="w-full bg-black/60 rounded-full h-1 overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-500 to-cyan-400 h-1 rounded-full w-[65%]" />
                  </div>
                </div>
              </div>

              {/* Directive Card */}
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 overflow-hidden relative">
                {isSpeaking && <motion.div layoutId="speaking-glow-left" className="absolute inset-0 bg-cyan-400/20 animate-pulse" />}
                <h2 className="text-green-400 font-bold tracking-widest text-[10px] uppercase mb-3 flex items-center gap-2 relative z-10">
                  <Target size={14} /> Active Directive
                </h2>
                {mission ? (
                  <div className="space-y-3 relative z-10">
                    <div>
                      <motion.h3 
                        initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} key={mission?.mission}
                        className="text-white text-sm font-medium leading-snug"
                      >
                        {mission?.mission || "Analyzing optimal path..."}
                      </motion.h3>
                      <motion.p 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                        className="text-white/50 text-xs mt-1"
                      >
                        {mission?.explainability?.why || "Calculating reasoning..."}
                      </motion.p>
                    </div>
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-semibold">
                      <span className="text-white/40">Confidence</span>
                      <span className="text-green-400">{mission?.explainability?.confidence || "0%"}</span>
                    </div>
                    <div className="w-full bg-black/50 rounded-full h-1 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }} animate={{ width: '98%' }} transition={{ duration: 1 }}
                        className="bg-green-400 h-1 rounded-full shadow-[0_0_10px_#22c55e]" 
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-white/30 text-xs text-center py-2 italic relative z-10">Awaiting directive...</p>
                )}
              </div>

              {/* Interactive Action Plan Card */}
              {mission?.plan_phases && mission.plan_phases.length > 0 && (
                <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-4 space-y-3 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                  <div className="flex items-center justify-between">
                    <h2 className="text-emerald-400 font-bold tracking-widest text-[10px] uppercase flex items-center gap-2">
                      <Target size={14} className="text-emerald-400" /> Action Roadmap & Plan
                    </h2>
                    <span className="bg-emerald-500/20 text-emerald-300 text-[9px] px-2 py-0.5 rounded-full border border-emerald-400/30 font-bold">
                      5 Phases Active
                    </span>
                  </div>
                  <div className="space-y-2">
                    {mission.plan_phases.map((item, idx) => (
                      <div key={idx} className="bg-black/60 p-2.5 rounded-lg border border-emerald-500/30 flex items-start gap-2.5 group hover:border-emerald-400 transition-colors">
                        <input type="checkbox" className="mt-0.5 accent-emerald-400 cursor-pointer" defaultChecked={idx === 0} />
                        <div>
                          <div className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                            {item.phase}: {item.title}
                          </div>
                          <div className="text-xs text-white/90 leading-snug mt-0.5 font-medium">
                            {item.task}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}



              {/* Memory Sync */}
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 flex flex-col items-center">
                 <h2 className="text-blue-400 font-bold tracking-widest text-[10px] uppercase mb-1.5 w-full text-left flex items-center gap-2">
                    <Brain size={14} /> Neural Link
                  </h2>
                  <svg viewBox="0 0 100 30" className="w-full h-8 opacity-80 mt-1">
                    <path d="M10,15 Q25,5 40,15 T70,15 T90,8" fill="none" stroke="#60a5fa" strokeWidth="1" className="opacity-50" />
                    <circle cx="10" cy="15" r="2" fill="#60a5fa" className="animate-pulse" />
                    <circle cx="40" cy="15" r="3" fill="#3b82f6" className={isSpeaking ? 'animate-[ping_0.5s_infinite]' : 'animate-pulse'} />
                    <circle cx="70" cy="15" r="2" fill="#93c5fd" />
                    <circle cx="90" cy="8" r="2" fill="#60a5fa" className="animate-pulse" />
                  </svg>
              </div>
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
               <div className="absolute flex flex-col items-center gap-0.5">
                 <div className={`rounded-full shadow-[0_0_30px_#00f3ff] ${isExpanded ? 'w-6 h-6' : 'w-3 h-3'} ${isSpeaking ? 'bg-cyan-200 animate-[ping_0.3s_infinite]' : 'bg-cyan-300 animate-pulse'}`} />
                 {isExpanded && <span className="text-[9px] font-black tracking-[0.25em] text-cyan-300/80 uppercase mt-1">ACHARYA</span>}
               </div>
             </div>
             {!isExpanded && (
               <motion.div
                 initial={{ opacity: 0 }}
                 whileHover={{ opacity: 1 }}
                 className="absolute -bottom-9 whitespace-nowrap text-cyan-400 font-mono text-[9px] tracking-widest uppercase bg-black/70 px-2.5 py-1 rounded-lg border border-cyan-500/30 shadow-[0_0_10px_rgba(0,243,255,0.2)]"
               >
                 ◈ Click to Expand
               </motion.div>
             )}
          </motion.div>

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
              className="absolute w-[350px] bg-black/85 backdrop-blur-2xl border border-cyan-500/50 rounded-2xl p-4 shadow-[0_0_50px_rgba(0,243,255,0.25)] cursor-default z-0 top-1/2 -translate-y-1/2 max-h-[82vh] flex flex-col overflow-hidden"
              style={{ left: '50%' }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="overflow-y-auto custom-scrollbar flex flex-col gap-3.5 pr-1">
              {/* Wise Supporting Mentor & Human Potential Curation Card */}
              {mission?.curated_resources && mission.curated_resources.length > 0 && (
                <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-4 shadow-[0_0_20px_rgba(245,158,11,0.15)] space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-amber-400 font-bold tracking-widest text-[10px] uppercase flex items-center gap-2">
                      <Compass size={14} className="text-amber-400" /> Supporting Mentor Guidance
                    </h2>
                    <span className="bg-amber-500/20 text-amber-300 text-[9px] px-2 py-0.5 rounded-full border border-amber-400/30 font-bold">
                      Human Potential Engine
                    </span>
                  </div>

                  <div className="text-[11px] text-amber-200/90 bg-black/50 p-2.5 rounded-lg border border-amber-500/20 italic leading-snug">
                    "Sir, I have curated these 4 high-ROI resources to transform passive scrolling into purposeful growth toward your Ideal Self."
                  </div>

                  <div className="space-y-2">
                    {mission.curated_resources.map((res, i) => {
                      const badgeColor = 
                        res.type === 'Idea' ? 'border-purple-500/40 text-purple-300 bg-purple-950/40' :
                        res.type === 'Story' ? 'border-amber-500/40 text-amber-300 bg-amber-950/40' :
                        res.type === 'Tool' ? 'border-emerald-500/40 text-emerald-300 bg-emerald-950/40' :
                        'border-cyan-500/40 text-cyan-300 bg-cyan-950/40';

                      const icon = 
                        res.type === 'Idea' ? '💡' :
                        res.type === 'Story' ? '📖' :
                        res.type === 'Tool' ? '🛠️' : '👤';

                      return (
                        <a
                          key={i}
                          href={res.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block p-2.5 bg-black/60 border border-amber-500/30 hover:border-amber-400 rounded-lg transition-all shadow-sm group"
                        >
                          <div className="flex items-center justify-between text-[9px] uppercase tracking-wider font-bold mb-1">
                            <span className={`px-2 py-0.5 rounded border ${badgeColor}`}>
                              {icon} {res.type}
                            </span>
                            <span className="text-white/40 group-hover:text-amber-300 transition-colors">Open Resource &rarr;</span>
                          </div>
                          <p className="text-white/90 text-xs font-medium leading-tight mt-1">{res.title}</p>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Context */}
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 overflow-hidden relative">
                 {isSpeaking && <motion.div layoutId="speaking-glow-right" className="absolute inset-0 bg-cyan-400/10 animate-pulse" />}
                <h2 className="text-cyan-400 font-bold tracking-widest text-[10px] uppercase mb-3 flex items-center gap-2 relative z-10">
                  <Activity size={14} /> Screen Context
                </h2>
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_15px_#00f3ff] ${isSpeaking ? 'animate-[ping_0.3s_infinite]' : 'animate-pulse'}`} />
                    <p className="text-white/90 text-[10px] uppercase tracking-wider">Vision Analyzer</p>
                  </div>
                  <div className="bg-black/60 rounded-lg p-2.5 font-mono text-[10px] text-cyan-300 border border-cyan-500/30 h-24 overflow-y-auto custom-scrollbar">
                    &gt; {visualContext || "Scanning visual data stream..."}
                  </div>
                </div>
              </div>

              {/* Privacy Panel */}
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
                <h2 className="text-cyan-400 font-bold tracking-widest text-[10px] uppercase mb-3 flex items-center gap-2">
                  <Shield size={14} className="text-green-400" /> Privacy & Security Controls
                </h2>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-[9px]">
                  {Object.entries(privacy).map(([flag, val]) => (
                    <button
                      key={flag}
                      onClick={() => {
                        const newVal = !val;
                        setPrivacy(prev => ({ ...prev, [flag]: newVal }));
                        if (wsRef.current?.readyState === WebSocket.OPEN) {
                          wsRef.current.send(JSON.stringify({ type: 'privacy_toggle', flag, value: newVal }));
                        }
                      }}
                      className={`flex items-center justify-between px-2 py-1 rounded border transition-all ${
                        val 
                          ? 'bg-green-500/20 border-green-500/50 text-green-300 shadow-[0_0_10px_rgba(34,197,94,0.2)]' 
                          : 'bg-red-500/10 border-red-500/30 text-red-400 opacity-60'
                      }`}
                    >
                      <span className="font-bold tracking-wider">{flag}</span>
                      <span className="text-[8px] font-extrabold uppercase">{val ? 'ON' : 'OFF'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Logs */}
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3">
                <h2 className="text-purple-400 font-bold tracking-widest text-[10px] uppercase mb-2">
                  System Logs
                </h2>
                <div className="font-mono text-[9px] text-white/50 space-y-1.5 h-16 overflow-y-auto flex flex-col justify-end custom-scrollbar">
                   {logs.map((log, i) => (
                      <motion.div 
                        initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} key={i + log}
                        className={log.includes('[ERROR]') ? 'text-red-400' : log.includes('[USER]') ? 'text-purple-300 font-bold' : log.includes('[PRIVACY]') ? 'text-green-400 font-bold' : 'text-cyan-400'}
                      >
                        {log}
                      </motion.div>
                   ))}
                </div>
              </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}

export default App;
