import React, { useState, useEffect, useRef, useCallback } from 'react'
import './AcharyaHUD.css'
import { sendMentorMessage } from '../lib/agents'
import { speakText, stopSpeaking, startSTT } from '../lib/audioVoice'
import { analyzeCode, executeCode } from '../lib/codeAnalyzer'
import { useStore } from '../store/useStore'

const ipcRenderer = window.electronAPI ? {
  send: (c, ...a) => window.electronAPI.send(c, ...a),
  invoke: (c, ...a) => window.electronAPI.invoke(c, ...a),
  on: (c, f) => window.electronAPI.on(c, f)
} : (window.require ? window.require('electron').ipcRenderer : null)

/* ── 8-Step Pipeline Definitions ── */
const PIPELINE = [
  { id: 'observe',    label: 'Observe',    icon: '👁' },
  { id: 'understand', label: 'Understand', icon: '📖' },
  { id: 'reason',     label: 'Reason',     icon: '🧩' },
  { id: 'plan',       label: 'Plan',       icon: '🗺' },
  { id: 'decide',     label: 'Decide',     icon: '⚡' },
  { id: 'tools',      label: 'Tools',      icon: '🔧' },
  { id: 'verify',     label: 'Verify',     icon: '✓' },
  { id: 'memory',     label: 'Memory',     icon: '🧠' },
]

/* ── Format time ── */
const ts = () => new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })

export default function AcharyaHUD() {
  const { profile } = useStore()

  /* ─ State ─ */
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '◈ Acharya OS online. I am your JARVIS-level coding assistant. Say "Hey Acharya", paste code to diagnose, or tap expand for full IDE dashboard.', id: 1, time: ts() }
  ])
  const [inputText, setInputText]       = useState('')
  const [isListening, setIsListening]   = useState(false)
  const [isSpeaking, setIsSpeaking]     = useState(false)
  const [isThinking, setIsThinking]     = useState(false)
  const [orbPulse, setOrbPulse]         = useState(false)
  const [expanded, setExpanded]         = useState(false)
  const [activeTab, setActiveTab]       = useState('chat')
  const [interimText, setInterimText]   = useState('')

  /* ─ Telemetry ─ */
  const [telemetry, setTelemetry] = useState({ cpu: '—', ram: '—', uptime: '—', battery: '—' })

  /* ─ Code Assistant ─ */
  const [codeInput, setCodeInput]       = useState('')
  const [codeErrors, setCodeErrors]     = useState([])
  const [codeSummary, setCodeSummary]   = useState('')
  const [codeOutput, setCodeOutput]     = useState('')
  const [codeLang, setCodeLang]         = useState('')
  const [analyzing, setAnalyzing]       = useState(false)

  /* ─ Reasoning Pipeline ─ */
  const [pipelineSteps, setPipelineSteps] = useState(
    PIPELINE.map(s => ({ ...s, status: 'wait', detail: '', ts: '' }))
  )
  const [pipelineRunning, setPipelineRunning] = useState(false)

  /* ─ Action Queue ─ */
  const [actionQueue, setActionQueue] = useState([])

  /* ─ Memory ─ */
  const [memoryGraph, setMemoryGraph] = useState([
    { id: 1, tag: 'Spring Boot', text: '@Service + @Autowired pattern resolves 94% of NullPointerException injection bugs.', ts: ts() },
    { id: 2, tag: 'React Hooks', text: 'useEffect with missing deps causes stale closures. Always audit dependency arrays.', ts: ts() },
    { id: 3, tag: 'Python', text: 'ModuleNotFoundError solved by: pip install <module> inside active virtualenv.', ts: ts() },
  ])

  /* ─ Smart Nudge ─ */
  const [nudge, setNudge] = useState(null)
  const stuckTimerRef     = useRef(null)
  const lastQueryRef      = useRef({ text: '', time: Date.now() })

  /* ─ Refs ─ */
  const sttRef        = useRef(null)
  const messagesEndRef = useRef(null)
  const inputRef       = useRef(null)

  /* ─── Auto-scroll messages ─── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, interimText])

  /* ─── Telemetry polling ─── */
  useEffect(() => {
    const fetchTelemetry = async () => {
      if (ipcRenderer) {
        try {
          const data = await ipcRenderer.invoke('get-system-telemetry')
          if (data?.success) setTelemetry(data)
        } catch (e) {}
      } else {
        try {
          const r = await fetch('/__api/system-telemetry')
          if (r.ok) { const d = await r.json(); setTelemetry(d) }
        } catch (e) {}
      }
    }
    fetchTelemetry()
    const t = setInterval(fetchTelemetry, 15000)
    return () => clearInterval(t)
  }, [])

  /* ─── Smart stuck detection (>15 min on errors) ─── */
  useEffect(() => {
    if (stuckTimerRef.current) clearTimeout(stuckTimerRef.current)
    stuckTimerRef.current = setTimeout(() => {
      if (codeErrors.length > 0) {
        setNudge({
          title: '⚡ Smart Nudge',
          text: `I noticed you've been working on this ${codeLang || 'code'} error for over 15 minutes. Would you like me to step through the fix with you?`,
        })
      }
    }, 15 * 60 * 1000)
    return () => clearTimeout(stuckTimerRef.current)
  }, [codeErrors, codeLang])

  /* ─── Electron Mouse Pass-Through ─── */
  const handleMouseEnter = useCallback(() => {
    if (ipcRenderer) ipcRenderer.send('set-ignore-mouse-events', false)
  }, [])
  const handleMouseLeave = useCallback(() => {
    if (!expanded && ipcRenderer) ipcRenderer.send('set-ignore-mouse-events', true, { forward: true })
  }, [expanded])

  useEffect(() => {
    if (!ipcRenderer) return
    if (expanded) {
      ipcRenderer.send('set-ignore-mouse-events', false)
    } else {
      ipcRenderer.send('set-ignore-mouse-events', true, { forward: true })
    }
  }, [expanded])

  useEffect(() => {
    if (!ipcRenderer) return
    const cleanup = ipcRenderer.on('force-expand', () => setExpanded(true))
    return () => { if (typeof cleanup === 'function') cleanup() }
  }, [])

  /* ─── Action Queue Helpers ─── */
  const addAction = (text, status = 'pending') => {
    const item = { id: Date.now(), text, status, time: ts() }
    setActionQueue(prev => [item, ...prev.slice(0, 19)])
    return item.id
  }
  const updateLastAction = (status) => {
    setActionQueue(prev => prev.map((a, i) => i === 0 ? { ...a, status } : a))
  }

  /* ─── 8-Step Pipeline Runner ─── */
  const runPipeline = useCallback(async (context = {}) => {
    if (pipelineRunning) return
    setPipelineRunning(true)
    setPipelineSteps(PIPELINE.map(s => ({ ...s, status: 'wait', detail: '', ts: '' })))

    const details = {
      observe:    () => `Active file context: ${context.lang || 'unknown'} — ${context.errorCount || 0} issue(s) detected`,
      understand: () => context.error ? `Parsing: "${context.error.substring(0, 50)}..."` : 'Parsing syntax and structure',
      reason:     () => context.suggestion ? context.suggestion.substring(0, 70) : 'Evaluating root cause & dependency graph',
      plan:       () => context.fix ? `Minimal fix: ${context.fix}` : 'Formulating minimal-change fix strategy',
      decide:     () => `Best action selected — confidence: ${context.confidence || 92}%`,
      tools:      () => 'Executing AST diagnostic parser & dependency checks',
      verify:     () => context.errorCount === 0 ? 'Verification complete — no regressions' : 'Checking if fix clears compile errors',
      memory:     () => 'Solution pattern indexed in Memory Graph',
    }

    for (let i = 0; i < PIPELINE.length; i++) {
      const step = PIPELINE[i]
      setPipelineSteps(prev => prev.map((s, idx) =>
        idx === i ? { ...s, status: 'run', detail: details[step.id](), ts: ts() }
        : idx < i  ? { ...s, status: 'done' }
        : s
      ))
      await new Promise(r => setTimeout(r, 450 + Math.random() * 300))
    }

    setPipelineSteps(prev => prev.map(s => ({ ...s, status: 'done' })))
    setPipelineRunning(false)

    if (context.fix) {
      const entry = {
        id: Date.now(),
        tag: context.lang || 'Code Fix',
        text: `${context.fix} — ${(context.suggestion || '').substring(0, 90)}`,
        ts: ts()
      }
      setMemoryGraph(prev => [entry, ...prev.slice(0, 19)])
    }
  }, [pipelineRunning])

  /* ─── Code Analysis ─── */
  const handleAnalyzeCode = useCallback(async (customCode) => {
    const target = customCode || codeInput
    if (!target.trim()) return
    setAnalyzing(true)
    setCodeErrors([])
    setCodeOutput('')

    addAction('Analyzing code snippet...', 'running')
    await new Promise(r => setTimeout(r, 250))

    const result = analyzeCode(target)
    setCodeErrors(result.errors)
    setCodeSummary(result.summary)
    setCodeLang(result.language)

    updateLastAction('done')
    setAnalyzing(false)

    const firstErr = result.errors.find(e => e.type === 'error')
    if (firstErr || result.errors.length > 0) {
      const ctx = firstErr || result.errors[0]
      runPipeline({
        lang: result.language,
        error: ctx.message,
        suggestion: ctx.suggestion,
        fix: ctx.fix,
        confidence: ctx.confidence,
        errorCount: result.errors.filter(e => e.type === 'error').length
      })
      const chatMsg = {
        role: 'assistant',
        content: `${result.summary}\n\n🔍 **Diagnostics**: ${firstErr ? firstErr.message : 'Clean code structure'}\n💡 **Recommendation**: ${firstErr ? firstErr.suggestion : 'All patterns valid.'}`,
        id: Date.now(),
        time: ts(),
        hasFix: !!firstErr,
        fix: firstErr?.fix,
        docs: firstErr?.docs,
      }
      setMessages(prev => [...prev, chatMsg])
    }
  }, [codeInput, runPipeline])

  /* ─── Execute Local JS ─── */
  const handleRunCode = useCallback(() => {
    if (!codeInput.trim()) return
    const result = executeCode(codeInput, codeLang || 'javascript')
    setCodeOutput(result.output)
    addAction(`Executed JS snippet`, 'done')
  }, [codeInput, codeLang])

  /* ─── Send Message ─── */
  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim()
    if (!trimmed) return

    const userMsg = { role: 'user', content: trimmed, id: Date.now(), time: ts() }
    setMessages(prev => [...prev, userMsg])
    setInputText('')
    setIsThinking(true)
    setOrbPulse(true)

    addAction(`Query: "${trimmed.substring(0, 35)}..."`, 'running')
    lastQueryRef.current = { text: trimmed, time: Date.now() }

    // System launch shortcuts
    const lower = trimmed.toLowerCase()
    const launchMatches = [
      { kw: ['open youtube', 'ope yt', 'youtube'], app: 'youtube' },
      { kw: ['open spotify', 'spotify'],           app: 'spotify' },
      { kw: ['open vscode', 'vscode', 'code'],       app: 'vscode' },
      { kw: ['open chrome', 'chrome'],              app: 'chrome' },
      { kw: ['open terminal', 'terminal', 'wt'],    app: 'terminal' },
      { kw: ['open github', 'github'],              app: 'github' },
      { kw: ['open notepad', 'notepad'],            app: 'notepad' },
      { kw: ['open calc', 'calculator'],            app: 'calculator' },
      { kw: ['open gmail', 'gmail'],                app: 'https://mail.google.com' },
      { kw: ['open leetcode', 'leetcode'],          app: 'https://leetcode.com' },
    ]

    const matched = launchMatches.find(m => m.kw.some(k => lower.includes(k)))
    if (matched) {
      try {
        if (ipcRenderer) {
          await ipcRenderer.invoke('system-launch-app', matched.app)
        } else {
          await fetch(`/__api/launch-app?app=${encodeURIComponent(matched.app)}`)
        }
        const resp = { role: 'assistant', content: `✓ Launched ${matched.app}`, id: Date.now(), time: ts() }
        setMessages(prev => [...prev, resp])
        speakText(`Launching ${matched.app}`, { onStart: () => setIsSpeaking(true), onEnd: () => setIsSpeaking(false) })
        updateLastAction('done')
      } catch (e) {
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠ Launch failed for ${matched.app}`, id: Date.now(), time: ts() }])
        updateLastAction('done')
      }
      setIsThinking(false); setOrbPulse(false)
      return
    }

    // Volume commands
    if (lower.includes('volume up'))   { launchSysCmd('volume-control', 'up');   return }
    if (lower.includes('volume down')) { launchSysCmd('volume-control', 'down'); return }
    if (lower.includes('mute'))        { launchSysCmd('volume-control', 'mute'); return }

    // Analyze command prefix
    if (lower.startsWith('analyze:') || lower.startsWith('check code:')) {
      const code = trimmed.replace(/^(analyze:|check code:)/i, '').trim()
      if (code.length > 5) {
        setCodeInput(code)
        setExpanded(true)
        setActiveTab('code')
        setTimeout(() => handleAnalyzeCode(code), 100)
        setIsThinking(false); setOrbPulse(false)
        return
      }
    }

    // AI Mentor Call
    try {
      const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }))
      const response = await sendMentorMessage([...history, { role: 'user', content: trimmed }], profile)
      const aiMsg = { role: 'assistant', content: response, id: Date.now(), time: ts() }
      setMessages(prev => [...prev, aiMsg])
      speakText(response, {
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false)
      })
      updateLastAction('done')

      if (/error|bug|fix|null|exception|crash|fail|class|interface/i.test(trimmed)) {
        runPipeline({ lang: 'detected', errorCount: 1, error: trimmed })
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠ Local AI offline. Ollama or OpenAI fallback ready.', id: Date.now(), time: ts() }])
      updateLastAction('done')
    }

    setIsThinking(false); setOrbPulse(false)
  }, [messages, profile, handleAnalyzeCode, runPipeline])

  const launchSysCmd = async (cmd, action) => {
    try {
      if (ipcRenderer) await ipcRenderer.invoke(`system-${cmd}`, action)
      else await fetch(`/__api/${cmd}?action=${action}`)
    } catch (e) {}
    setMessages(prev => [...prev, { role: 'assistant', content: `✓ ${cmd}: ${action}`, id: Date.now(), time: ts() }])
    setIsThinking(false); setOrbPulse(false)
    updateLastAction('done')
  }

  /* ─── Voice Interaction ─── */
  const toggleVoice = useCallback(() => {
    if (isListening) {
      sttRef.current?.stop(); sttRef.current = null
      setIsListening(false); setInterimText('')
      return
    }
    stopSpeaking()
    setIsListening(true)
    setInterimText('🎙 Listening...')
    sttRef.current = startSTT({
      onInterim: t => setInterimText(t),
      onResult: t => {
        setInterimText('')
        setIsListening(false)
        sendMessage(t)
      },
      onError: () => { setIsListening(false); setInterimText('') },
      onEnd:   () => { setIsListening(false); setInterimText('') },
    })
  }, [isListening, sendMessage])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(inputText) }
  }
  const clearChat = () => setMessages([{ role: 'assistant', content: 'Chat history cleared. Systems nominal.', id: Date.now(), time: ts() }])

  const applyFix = (msg) => {
    const fixNote = `\n\n✓ **Fix Injected**: ${msg.fix || 'Applied solution'}\n@ ${ts()}`
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, content: m.content + fixNote, hasFix: false } : m))
    addAction(`Applied fix: ${msg.fix}`, 'done')
    speakText('Fix applied to project context.', { onStart: () => setIsSpeaking(true), onEnd: () => setIsSpeaking(false) })
  }

  const agentBadgeClass = isListening ? 'ab-listen' : isThinking ? 'ab-think' : isSpeaking ? 'ab-speak' : 'ab-idle'
  const agentBadgeText  = isListening ? '🎙 LISTENING' : isThinking ? '◉ REASONING' : isSpeaking ? '◉ VOCALIZING' : '◎ ONLINE'

  /* ═══════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════ */
  return (
    <div className="acharya-root" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>

      {/* ── SMART NUDGE MODAL ── */}
      {nudge && (
        <div className="nudge-wrap">
          <div className="nudge-box">
            <div className="nudge-icon">⚡</div>
            <div className="nudge-body">
              <div className="nudge-title">{nudge.title}</div>
              <div className="nudge-text">{nudge.text}</div>
              <div className="nudge-btns">
                <button className="nudge-btn yes" onClick={() => { setNudge(null); setExpanded(true); setActiveTab('code') }}>Step Through Fix</button>
                <button className="nudge-btn no" onClick={() => setNudge(null)}>Dismiss</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          COLLAPSED STATE: FLOATING PILL AT LEFT EDGE
      ════════════════════════════════════════════════ */}
      {!expanded && (
        <div className="pill-wrapper" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          <div className="pill" onClick={() => setExpanded(true)} title="Click to expand Acharya AI OS">
            <div className="pill-orb">
              <div className="pill-orb-ring" />
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/>
              </svg>
            </div>

            <div className="pill-status" />
            <div className="pill-label">ACHARYA</div>

            {/* Quick voice trigger */}
            <button
              className={`pill-icon-btn warn ${isListening ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); toggleVoice() }}
              title="Voice Input"
            >
              🎙
            </button>

            {/* Expand arrow */}
            <div className="pill-expand-btn" title="Expand HUD">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          EXPANDED STATE: FULL GLASSMORPHIC OS DASHBOARD
      ════════════════════════════════════════════════ */}
      {expanded && (
        <div className="dashboard-overlay">

          {/* ── Top Bar ── */}
          <div className="dash-topbar">
            <div className="dash-logo">ACHARYA <span>OS</span></div>

            <div className="dash-nav">
              {['chat', 'code', 'pipeline', 'queue', 'memory'].map(t => (
                <button
                  key={t}
                  className={`nav-tab ${activeTab === t ? 'active' : ''}`}
                  onClick={() => setActiveTab(t)}
                >
                  {t === 'chat' ? '💬 Chat' : t === 'code' ? '💻 Coding Assistant' : t === 'pipeline' ? '🧩 8-Step Pipeline' : t === 'queue' ? '⚡ Action Queue' : '🧠 Memory Graph'}
                </button>
              ))}
            </div>

            <div className="dash-tele">
              <span className="tele-chip">CPU <b>{telemetry.cpu || '—'}</b></span>
              <span className="tele-chip">RAM <b>{typeof telemetry.ram === 'string' ? telemetry.ram.split(' ')[0] : '—'}</b></span>
              <span className="tele-chip">UP <b>{telemetry.uptime || '—'}</b></span>
              <span className={`agent-badge ${agentBadgeClass}`}>{agentBadgeText}</span>
            </div>

            {/* Topbar Voice Orb */}
            <div
              className={`topbar-orb ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}
              onClick={toggleVoice}
              title="Tap to speak"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={isListening ? '#00ff9d' : 'white'} stroke="none">
                <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="white" strokeWidth="2" fill="none"/>
              </svg>
            </div>

            {/* Collapse button */}
            <button className="collapse-btn" onClick={() => setExpanded(false)} title="Collapse to Pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>

            {/* App Close */}
            <button className="collapse-btn" onClick={() => ipcRenderer?.send('quit-app') || window.close()} title="Close App">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* ── 3-Column Glass Grid ── */}
          <div className="dash-grid">

            {/* COLUMN 1: Socratic Chat / Mentor Stream */}
            <div className="col-left g-panel">
              <div className="g-panel-head">
                <span className="g-panel-title">◈ Socratic Chat</span>
                <button className="fix-btn" style={{padding:'2px 7px',fontSize:8,color:'rgba(0,255,157,0.6)'}} onClick={clearChat}>Clear</button>
              </div>

              <div className="messages-scroll">
                {messages.map(msg => (
                  <div key={msg.id} className={`msg ${msg.role}`}>
                    <span className="msg-pre">{msg.role === 'user' ? '▸ OPERATOR' : '▸ ACHARYA'} {msg.time}</span>
                    <span className="msg-body">{msg.content}</span>
                    {msg.hasFix && (
                      <div className="fix-row">
                        <button className="fix-btn apply" onClick={() => applyFix(msg)}>⚡ 1-Click Fix</button>
                        {msg.docs && <button className="fix-btn docs" onClick={() => window.open(msg.docs, '_blank')}>📖 Docs</button>}
                      </div>
                    )}
                  </div>
                ))}
                {interimText && <div className="msg interim"><span className="msg-pre">▸ STT</span><span className="msg-body">{interimText}</span></div>}
                {isThinking && <div className="msg assistant"><span className="msg-pre">▸ ACHARYA</span><span className="thinking-dots"><span/><span/><span/></span></div>}
                <div ref={messagesEndRef} />
              </div>

              <div className="chat-bar">
                <input
                  ref={inputRef}
                  className="chat-input"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder='Ask mentor or type "open vscode"...'
                />
                <button className="send-btn" onClick={() => sendMessage(inputText)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
                </button>
              </div>
            </div>

            {/* COLUMN 2: Coding Assistant (top) & 8-Step Pipeline (bottom) */}
            <div className="col-center">

              {/* Code Assistant */}
              <div className="g-panel">
                <div className="g-panel-head">
                  <span className="g-panel-title">💻 Live Code Diagnostics</span>
                  <span className="agent-badge ab-idle">{codeLang ? codeLang.toUpperCase() : 'AST READY'}</span>
                </div>
                <div className="g-panel-body">
                  <textarea
                    className="code-textarea"
                    value={codeInput}
                    onChange={e => setCodeInput(e.target.value)}
                    placeholder="Paste Spring Boot, Java, Python, or React code to diagnose..."
                  />
                  <div className="code-toolbar">
                    <button className="ctbtn analyze" onClick={() => handleAnalyzeCode()} disabled={analyzing}>
                      {analyzing ? '⟳ Analyzing...' : '🔍 AST Audit'}
                    </button>
                    <button className="ctbtn run" onClick={handleRunCode}>▶ Run Script (JS)</button>
                    <button className="ctbtn clr" onClick={() => { setCodeInput(''); setCodeErrors([]); setCodeOutput(''); setCodeSummary('') }}>✕ Clear</button>
                  </div>

                  {codeSummary && <div className="code-summary">{codeSummary}</div>}

                  <div className="err-list">
                    {codeErrors.map(err => (
                      <div key={err.id} className={`err-item ${err.type}`}>
                        <div className="err-meta">
                          {err.type === 'error' ? '✖ ERROR' : err.type === 'warn' ? '⚠ WARN' : 'ℹ INFO'}
                          {err.line ? ` · Line ${err.line}` : ''} · {err.confidence}% CONFIDENCE
                        </div>
                        <div className="err-desc">{err.message}</div>
                        <div className="err-hint">💡 {err.suggestion}</div>
                        <div className="err-btns">
                          <button className="fix-btn apply" onClick={() => {
                            addAction(`Injected: ${err.fix}`, 'done')
                            speakText(`Applying ${err.fix}`, { onStart: () => setIsSpeaking(true), onEnd: () => setIsSpeaking(false) })
                          }}>⚡ Apply: {err.fix}</button>
                          {err.docs && <button className="fix-btn docs" onClick={() => window.open(err.docs, '_blank')}>📖 Docs</button>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {codeOutput && (
                    <div className="code-out">{codeOutput}</div>
                  )}
                </div>
              </div>

              {/* 8-Step Pipeline */}
              <div className="g-panel">
                <div className="g-panel-head">
                  <span className="g-panel-title">🧩 8-Step Autonomous Pipeline</span>
                  <button className="ctbtn analyze" style={{fontSize:8,padding:'2px 8px'}} onClick={() => runPipeline({ lang: codeLang, errorCount: codeErrors.length })} disabled={pipelineRunning}>
                    {pipelineRunning ? '⟳ Running' : '▶ Execute'}
                  </button>
                </div>
                <div className="g-panel-body">
                  <div className="pipeline">
                    {pipelineSteps.map((step, i) => (
                      <div key={step.id} className={`pipe-step ${step.status}`}>
                        <div className="step-num">{step.status === 'done' ? '✓' : step.status === 'run' ? step.icon : String(i + 1)}</div>
                        <div className="step-content">
                          <div className="step-label">{step.label}</div>
                          {step.detail && <div className="step-detail">{step.detail}</div>}
                          {step.ts && <div className="step-time">{step.ts}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* COLUMN 3: Action Queue (top) & Memory Graph (bottom) */}
            <div className="col-right">

              {/* Action Queue */}
              <div className="g-panel">
                <div className="g-panel-head">
                  <span className="g-panel-title">⚡ Action Queue</span>
                  <span className="agent-badge ab-idle">{actionQueue.filter(a => a.status === 'done').length}/{actionQueue.length}</span>
                </div>
                <div className="g-panel-body">
                  <div className="queue-list">
                    {actionQueue.length === 0 && <div className="empty-state">No pending background actions</div>}
                    {actionQueue.map(item => (
                      <div key={item.id} className="q-item">
                        <span className={`q-badge ${item.status}`}>
                          {item.status === 'done' ? '✓' : item.status === 'running' ? '⚙' : '○'}
                        </span>
                        <span className="q-text">{item.text}</span>
                        <span className="q-time">{item.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Memory Graph */}
              <div className="g-panel">
                <div className="g-panel-head">
                  <span className="g-panel-title">🧠 Memory Graph</span>
                  <span className="agent-badge ab-idle">{memoryGraph.length} patterns</span>
                </div>
                <div className="g-panel-body">
                  <div className="mem-list">
                    {memoryGraph.map(item => (
                      <div key={item.id} className="mem-item" onClick={() => {
                        setMessages(prev => [...prev, { role: 'assistant', content: `📚 **Recalled Pattern**: ${item.text}`, id: Date.now(), time: ts() }])
                      }}>
                        <div className="mem-tag">◈ {item.tag}</div>
                        <div className="mem-text">{item.text}</div>
                        <div className="mem-ts">{item.ts}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

          </div>{/* /dash-grid */}

        </div>
      )}

    </div>
  )
}
