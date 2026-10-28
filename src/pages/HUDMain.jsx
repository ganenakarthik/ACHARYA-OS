import { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from '../store/useStore'
import { useNavigate } from 'react-router-dom'
import { generateRoadmap, analyzeWeakAreas } from '../lib/agents'
import './HUDMain.css'

/* ── Draggable Pill Widget ── */
function PillWidget({ id, title, icon, color = '#00f0ff', defaultPos, defaultOpen = true, badge, children, onToggle, isOpen, className = '' }) {
  const posRef = useRef(null)
  const dragging = useRef(false)
  const offset = useRef({ x: 0, y: 0 })
  const [pos, setPos] = useState(defaultPos)
  const [isDragging, setIsDragging] = useState(false)

  const onMouseDown = useCallback((e) => {
    if (e.target.closest('.pill-body') && isOpen) return // don't drag when clicking content
    dragging.current = true
    setIsDragging(true)
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    e.preventDefault()
  }, [pos, isOpen])

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return
      setPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y })
    }
    const onUp = () => { dragging.current = false; setIsDragging(false) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  return (
    <div
      className={`pill-widget ${isOpen ? 'expanded' : 'collapsed'} ${isDragging ? 'dragging' : ''} ${className}`}
      style={{ left: pos.x, top: pos.y, '--pill-color': color }}
    >
      {/* Pill header — always visible */}
      <div className="pill-header" onMouseDown={onMouseDown} onClick={() => !isDragging && onToggle(id)}>
        <div className="pill-dot" />
        <span className="pill-icon">{icon}</span>
        <span className="pill-title">{title}</span>
        {badge && <div className="pill-badge">{badge}</div>}
        <button className="pill-toggle" onClick={(e) => { e.stopPropagation(); onToggle(id) }}>
          {isOpen ? '▾' : '▸'}
        </button>
      </div>

      {/* Expanded body */}
      {isOpen && (
        <div className="pill-body">
          {children}
        </div>
      )}
    </div>
  )
}

/* ── Central Neural Orb ── */
function NeuralOrb({ loopRunning, loopStep, agentLogs, onToggleAll }) {
  const [hovered, setHovered] = useState(false)
  const lastLog = agentLogs[agentLogs.length - 1]
  const activeStep = loopStep % 6
  const stepColors = ['#00f0ff', '#7b2fff', '#6366f1', '#ffb800', '#00ff9d', '#ec4899']
  const currentColor = loopRunning ? stepColors[activeStep] : '#334155'

  return (
    <div className="orb-container" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {/* Outer rings */}
      <div className="orb-ring orb-ring-3" style={{ borderColor: currentColor + '18' }} />
      <div className="orb-ring orb-ring-2" style={{ borderColor: currentColor + '30' }} />
      <div className="orb-ring orb-ring-1" style={{ borderColor: currentColor + '55' }} />

      {/* Main sphere */}
      <div className="orb-sphere" style={{ boxShadow: `0 0 60px ${currentColor}40, 0 0 120px ${currentColor}18, inset 0 0 40px rgba(0,0,0,0.6)` }}>
        <div className="orb-inner-glow" style={{ background: `radial-gradient(circle at 35% 35%, ${currentColor}30, transparent 70%)` }} />
        <div className="orb-center-dot" style={{ background: currentColor, boxShadow: `0 0 12px ${currentColor}` }} />
      </div>

      {/* Orbiting pill buttons */}
      <div className="orb-pills">
        <button className="orb-pill orb-pill-top" onClick={onToggleAll}>
          <span>⊕</span>
          <span>{hovered ? 'TOGGLE ALL' : '⊕'}</span>
        </button>
        <button className="orb-pill orb-pill-bottom" style={{ borderColor: loopRunning ? '#00ff9d40' : '#33415540', color: loopRunning ? '#00ff9d' : '#64748b' }}>
          <span>{loopRunning ? '◉' : '◎'}</span>
          <span>{loopRunning ? 'ONLINE' : 'OFFLINE'}</span>
        </button>
      </div>

      {/* Current step label */}
      {loopRunning && lastLog && (
        <div className="orb-label">
          <span style={{ color: currentColor }}>[{lastLog.step?.toUpperCase()}]</span>
          <span>{lastLog.msg?.substring(0, 32)}...</span>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════
   MAIN HUD COMPONENT
══════════════════════════════════════ */
export default function HUDMain() {
  const navigate = useNavigate()
  const {
    profile, stats, tasks, completedTasks, weakConcepts,
    loopRunning, loopStep, agentLogs, roadmap, setRoadmap,
    addTask, completeTask, deleteTask, startAgentLoop, stopAgentLoop
  } = useStore()

  const [loadingRoadmap, setLoadingRoadmap] = useState(false)
  const [analysis, setAnalysis] = useState('')
  const [newTask, setNewTask] = useState('')
  const [openWidgets, setOpenWidgets] = useState({
    progress: true,
    thought: true,
    action: true,
    memory: true,
    syslog: false,
  })

  const toggleWidget = (id) => setOpenWidgets(s => ({ ...s, [id]: !s[id] }))
  const toggleAll = () => {
    const anyOpen = Object.values(openWidgets).some(Boolean)
    setOpenWidgets(s => Object.fromEntries(Object.keys(s).map(k => [k, !anyOpen])))
  }

  const totalTasks = tasks.length + completedTasks.length
  const completionPct = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0
  const nextXP = stats.xp < 200 ? 200 : stats.xp < 500 ? 500 : stats.xp < 1000 ? 1000 : 2000
  const xpPct = Math.min(100, (stats.xp / nextXP) * 100)
  const level = stats.xp < 200 ? 'NOVICE' : stats.xp < 500 ? 'LEARNER' : stats.xp < 1000 ? 'SCHOLAR' : 'MASTER'
  const lastLogs = [...agentLogs].reverse().slice(0, 8)
  const activeStep = loopStep % 6

  const handleAddTask = () => {
    if (!newTask.trim()) return
    addTask({ title: newTask.trim(), priority: 'medium' })
    setNewTask('')
  }

  const handleRoadmap = async () => {
    if (!profile.apiKey) { navigate('/hud/settings'); return }
    setLoadingRoadmap(true)
    try { const r = await generateRoadmap(profile); setRoadmap(r) }
    catch (e) { console.error(e) }
    setLoadingRoadmap(false)
  }

  const STEP_INFO = [
    { label: 'OBSERVE', icon: '👁', color: '#00f0ff' },
    { label: 'REMEMBER', icon: '🧠', color: '#7b2fff' },
    { label: 'REASON', icon: '◈', color: '#6366f1' },
    { label: 'PLAN', icon: '◇', color: '#ffb800' },
    { label: 'ACT', icon: '⚡', color: '#00ff9d' },
    { label: 'LEARN', icon: '📈', color: '#ec4899' },
  ]

  return (
    <div className="hud-overlay">

      {/* ── WIDGET 1: EVOLVING IDENTITY (Progress) ── */}
      <PillWidget
        id="progress"
        title="EVOLVING IDENTITY"
        icon="◈"
        color="#7b2fff"
        badge={`MOMENTUM ${Math.round(xpPct / 10)}/10`}
        defaultPos={{ x: 24, y: 80 }}
        isOpen={openWidgets.progress}
        onToggle={toggleWidget}
      >
        <div className="pw-goal-row">
          <div className="pw-label">TARGET OBJECTIVE</div>
          <div className="pw-goal">{profile.goal || 'No goal set — configure in Settings'}</div>
          <div className="pw-tags">
            <span className="pw-tag cyan">{profile.level?.toUpperCase()}</span>
            <span className="pw-tag purple">{profile.dailyHours}H/DAY</span>
            <span className="pw-tag green">{level}</span>
          </div>
        </div>

        <div className="pw-divider" />

        {/* Identity Gap */}
        <div className="pw-metric">
          <div className="pw-metric-row">
            <span className="pw-metric-label">IDENTITY GAP</span>
            <span className="pw-metric-val" style={{ color: '#7b2fff' }}>{Math.round(100 - xpPct)}% REMAINING</span>
          </div>
          <div className="pw-bar"><div className="pw-bar-fill purple" style={{ width: `${xpPct}%` }} /></div>
          <div className="pw-bar-sub"><span>{stats.xp} XP</span><span>{nextXP - stats.xp} to next</span></div>
        </div>

        {/* Directive Completion */}
        <div className="pw-metric">
          <div className="pw-metric-row">
            <span className="pw-metric-label">DIRECTIVE COMPLETION</span>
            <span className="pw-metric-val" style={{ color: '#00ff9d' }}>{completionPct}%</span>
          </div>
          <div className="pw-bar"><div className="pw-bar-fill green" style={{ width: `${completionPct}%` }} /></div>
          <div className="pw-bar-sub"><span>{completedTasks.length} done</span><span>{tasks.length} pending</span></div>
        </div>

        <div className="pw-divider" />

        {/* Stats grid */}
        <div className="pw-stats-grid">
          {[
            { l: 'STREAK', v: `${stats.streak}D`, c: '#ffb800' },
            { l: 'TASKS', v: stats.tasksCompleted, c: '#00f0ff' },
            { l: 'EXAMS', v: stats.quizzesTaken, c: '#7b2fff' },
            { l: 'XP', v: stats.xp, c: '#00ff9d' },
          ].map((s, i) => (
            <div key={i} className="pw-stat">
              <span className="pw-stat-val" style={{ color: s.c }}>{s.v}</span>
              <span className="pw-stat-label">{s.l}</span>
            </div>
          ))}
        </div>
      </PillWidget>

      {/* ── WIDGET 2: THOUGHT STREAM (Active Directives) ── */}
      <PillWidget
        id="thought"
        title="THOUGHT STREAM"
        icon="◉"
        color="#00f0ff"
        defaultPos={{ x: 24, y: 420 }}
        isOpen={openWidgets.thought}
        onToggle={toggleWidget}
      >
        {/* Loop steps */}
        <div className="pw-loop-steps">
          {STEP_INFO.map((s, i) => (
            <div key={i} className={`pw-loop-step ${loopRunning && activeStep === i ? 'active' : ''}`} style={{ '--sc': s.color }}>
              <div className="pw-loop-dot" />
              <span className="pw-loop-text">{s.icon} {s.label}</span>
              {loopRunning && activeStep === i && <span className="pw-loop-timing">processing...</span>}
            </div>
          ))}
        </div>

        <div className="pw-divider" />

        {/* Active tasks */}
        <div className="pw-active-tasks">
          <div className="pw-section-label">ACTIVE DIRECTIVES</div>
          {tasks.slice(0, 4).map(t => (
            <div key={t.id} className="pw-task-row">
              <div className="pw-task-dot" />
              <span className="pw-task-text">{t.title}</span>
              <button className="pw-task-done" onClick={() => completeTask(t.id)} title="Complete">✓</button>
              <button className="pw-task-del" onClick={() => deleteTask(t.id)} title="Delete">✕</button>
            </div>
          ))}
          {tasks.length === 0 && <div className="pw-empty">// No active directives</div>}

          {/* Add task */}
          <div className="pw-add-task">
            <input
              className="pw-task-input"
              placeholder="Add directive..."
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddTask()}
            />
            <button className="pw-add-btn" onClick={handleAddTask}>+</button>
          </div>
        </div>
      </PillWidget>

      {/* ── WIDGET 3: ACTION QUEUE (Recommendations) ── */}
      <PillWidget
        id="action"
        title="ACTION QUEUE"
        icon="◇"
        color="#00ff9d"
        badge={`${tasks.length} QUEUED`}
        defaultPos={{ x: Math.max(100, (typeof window !== 'undefined' ? window.innerWidth : 1280) - 360), y: 80 }}
        isOpen={openWidgets.action}
        onToggle={toggleWidget}
        className="pill-right"
      >
        {/* Roadmap phases */}
        {roadmap.length > 0 ? (
          roadmap.map((phase, i) => (
            <div key={i} className={`pw-phase ${i === 0 ? 'active' : ''}`}>
              <div className="pw-phase-header">
                <span className="pw-phase-num">PHASE {i + 1}</span>
                <span className="pw-phase-name">{phase.phase}</span>
                <span className={`pw-phase-status ${i === 0 ? 'executing' : i === 1 ? 'scheduled' : 'pending'}`}>
                  {i === 0 ? 'Executing' : i === 1 ? `${phase.duration}` : 'Pending'}
                </span>
              </div>
              {i === 0 && (
                <>
                  <div className="pw-phase-milestone">{phase.milestone}</div>
                  <div className="pw-bar" style={{ marginTop: 6 }}>
                    <div className="pw-bar-fill green" style={{ width: `${Math.min(completionPct + 5, 100)}%` }} />
                  </div>
                  <div className="pw-phase-topics">
                    {phase.topics?.map((t, ti) => <span key={ti} className="pw-topic">{t}</span>)}
                  </div>
                </>
              )}
            </div>
          ))
        ) : (
          <div className="pw-no-roadmap">
            <span className="pw-nr-icon">◈</span>
            <p>No roadmap generated</p>
            <button className="pw-gen-btn" onClick={handleRoadmap} disabled={loadingRoadmap}>
              {loadingRoadmap ? '◌ Generating...' : '⚡ Generate Roadmap'}
            </button>
            {!profile.apiKey && (
              <span className="pw-nr-hint" onClick={() => navigate('/hud/settings')}>Configure API key →</span>
            )}
          </div>
        )}

        <div className="pw-divider" />

        {/* Completed tasks */}
        {completedTasks.slice(0, 3).map(t => (
          <div key={t.id} className="pw-done-row">
            <span className="pw-done-check">✓</span>
            <span className="pw-done-text">{t.title}</span>
            <span className="pw-done-badge">COMPLETE</span>
          </div>
        ))}
      </PillWidget>

      {/* ── WIDGET 4: MEMORY CONSTELLATION ── */}
      <PillWidget
        id="memory"
        title="MEMORY CONSTELLATION"
        icon="◎"
        color="#ec4899"
        defaultPos={{ x: Math.max(100, (typeof window !== 'undefined' ? window.innerWidth : 1280) - 360), y: 400 }}
        isOpen={openWidgets.memory}
        onToggle={toggleWidget}
        className="pill-right"
      >
        {/* SVG constellation */}
        <div className="pw-constellation">
          <svg viewBox="0 0 280 160" style={{ width: '100%', height: 160 }}>
            {/* Lines */}
            <line x1="60" y1="80" x2="140" y2="50" stroke="#00f0ff" strokeWidth="0.5" opacity="0.4" />
            <line x1="140" y1="50" x2="220" y2="80" stroke="#7b2fff" strokeWidth="0.5" opacity="0.4" />
            <line x1="60" y1="80" x2="140" y2="130" stroke="#ec4899" strokeWidth="0.5" opacity="0.3" />
            <line x1="140" y1="130" x2="220" y2="80" stroke="#00ff9d" strokeWidth="0.5" opacity="0.3" />
            <line x1="140" y1="50" x2="140" y2="130" stroke="#00f0ff" strokeWidth="0.5" opacity="0.2" />

            {/* Nodes */}
            {[
              { x: 60, y: 80, c: '#00f0ff', label: 'Core Data', active: true },
              { x: 140, y: 50, c: '#7b2fff', label: 'Knowledge', active: false },
              { x: 220, y: 80, c: '#ec4899', label: 'Neural Nodes', active: false },
              { x: 140, y: 130, c: '#00ff9d', label: `98% Active`, active: true },
              { x: 100, y: 100, c: '#ffb800', label: 'Memory', active: false },
            ].map((n, i) => (
              <g key={i}>
                <circle cx={n.x} cy={n.y} r={n.active ? 7 : 5} fill={n.c} opacity="0.9" style={{ filter: `drop-shadow(0 0 6px ${n.c})` }} />
                {n.active && <circle cx={n.x} cy={n.y} r={12} fill="none" stroke={n.c} strokeWidth="0.5" opacity="0.5" />}
                <text x={n.x} y={n.y + 18} fill="rgba(180,210,240,0.6)" fontSize="8" textAnchor="middle" fontFamily="JetBrains Mono">{n.label}</text>
              </g>
            ))}

            {/* Center orb */}
            <circle cx="140" cy="80" r="4" fill="white" opacity="0.8" style={{ filter: 'drop-shadow(0 0 8px #00f0ff)' }} />
          </svg>
        </div>

        <div className="pw-divider" />

        {/* Weak concepts */}
        <div className="pw-section-label">WEAK SIGNAL NODES</div>
        {weakConcepts.length > 0 ? (
          <div className="pw-weak-chips">
            {weakConcepts.map((c, i) => (
              <span key={i} className="pw-weak-chip">● {c}</span>
            ))}
          </div>
        ) : (
          <div className="pw-empty">// No weak signals detected</div>
        )}

        <div className="pw-constellation-stats">
          <div><span style={{ color: '#00f0ff' }}>{weakConcepts.length}</span> <span>weak nodes</span></div>
          <div><span style={{ color: '#00ff9d' }}>98%</span> <span>core active</span></div>
          <div><span style={{ color: '#ec4899' }}>{agentLogs.length}</span> <span>log entries</span></div>
        </div>
      </PillWidget>

      {/* ── WIDGET 5: SYSTEM LOGS ── */}
      <PillWidget
        id="syslog"
        title="SYSTEM LOGS"
        icon="◉"
        color="#00ff9d"
        defaultPos={{ x: Math.max(100, (typeof window !== 'undefined' ? window.innerWidth : 1280) - 360), y: 680 }}
        isOpen={openWidgets.syslog}
        onToggle={toggleWidget}
        className="pill-right"
      >
        <div className="pw-syslog">
          {lastLogs.length > 0 ? lastLogs.map((log, i) => (
            <div key={i} className="pw-log-line">
              <span className="pw-log-bracket">[</span>
              <span className="pw-log-step" style={{ color: { observe: '#00f0ff', remember: '#7b2fff', reason: '#6366f1', plan: '#ffb800', act: '#00ff9d', learn: '#ec4899', system: '#64748b' }[log.type] || '#64748b' }}>
                {log.step?.toUpperCase()}
              </span>
              <span className="pw-log-bracket">]</span>
              <span className="pw-log-msg">{log.msg}</span>
            </div>
          )) : <div className="pw-empty">// Awaiting agent events...</div>}
        </div>
        <button className="pw-view-all" onClick={() => navigate('/hud/logs')}>VIEW FULL LOGS →</button>
      </PillWidget>

      {/* ── CENTRAL NEURAL ORB ── */}
      <NeuralOrb
        loopRunning={loopRunning}
        loopStep={loopStep}
        agentLogs={agentLogs}
        onToggleAll={toggleAll}
      />

      {/* ── FLOATING ACTION PILLS ── */}
      <div className="hud-action-pills">
        <button className="action-pill cyan" onClick={() => navigate('/hud/mentor')}>
          <span>◈</span><span>NEURAL LINK</span>
        </button>
        <button className="action-pill" onClick={() => loopRunning ? stopAgentLoop() : startAgentLoop()}
          style={{ borderColor: loopRunning ? '#00ff9d40' : '#00f0ff40', color: loopRunning ? '#00ff9d' : '#00f0ff' }}>
          <span>{loopRunning ? '⏸' : '▶'}</span>
          <span>{loopRunning ? 'PAUSE' : 'START'}</span>
        </button>
        <button className="action-pill amber" onClick={() => navigate('/hud/exam')}>
          <span>◇</span><span>EXAM MODE</span>
        </button>
      </div>
    </div>
  )
}
