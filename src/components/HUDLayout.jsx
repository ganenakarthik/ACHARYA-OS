import { useState, useEffect, useRef } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore'
import HUDMain from '../pages/HUDMain'
import MentorChat from '../pages/MentorChat'
import ExamPage from '../pages/ExamPage'
import Settings from '../pages/Settings'
import AgentLogs from '../pages/AgentLogs'
import ExamOverlay from './ExamOverlay'
import './HUDLayout.css'

const NAV_ITEMS = [
  { path: '/hud', icon: '⬡', label: 'NEXUS', exact: true },
  { path: '/hud/mentor', icon: '◈', label: 'MENTOR' },
  { path: '/hud/exam', icon: '◇', label: 'EXAM' },
  { path: '/hud/logs', icon: '◉', label: 'LOGS' },
  { path: '/hud/settings', icon: '◎', label: 'CONFIG' },
]

export default function HUDLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, stats, loopRunning, agentLogs, startAgentLoop, stopAgentLoop, examMode } = useStore()
  const [time, setTime] = useState(new Date())
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Auto-start agent loop
  useEffect(() => {
    if (!loopRunning) startAgentLoop()
  }, [])

  const lastLog = agentLogs[agentLogs.length - 1]
  const hh = String(time.getHours()).padStart(2, '0')
  const mm = String(time.getMinutes()).padStart(2, '0')
  const ss = String(time.getSeconds()).padStart(2, '0')

  const isActive = (path, exact) => {
    if (exact) return location.pathname === path
    return location.pathname.startsWith(path) && path !== '/hud'
  }

  return (
    <div className="hud-root">
      {/* Animated background grid */}
      <div className="hud-bg">
        <div className="hud-bg-grid" />
        <div className="hud-bg-glow hud-glow-1" />
        <div className="hud-bg-glow hud-glow-2" />
        <div className="hud-bg-glow hud-glow-3" />
        <div className="scan-line" />
      </div>

      {/* Top HUD Bar */}
      <header className="hud-topbar">
        <div className="hud-topbar-left">
          <div className="hud-logo" onClick={() => navigate('/hud')}>
            <div className="hud-logo-hex">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L22 7V17L12 22L2 17V7L12 2Z" stroke="#00f0ff" strokeWidth="1.5" fill="rgba(0,240,255,0.08)"/>
                <circle cx="12" cy="12" r="3" fill="#00f0ff" opacity="0.9"/>
              </svg>
            </div>
            <div className="hud-logo-text">
              <span className="hud-logo-main">AGENTIC</span>
              <span className="hud-logo-sub">AI MENTOR</span>
            </div>
          </div>
          <div className="hud-topbar-divider" />
          <div className="hud-agent-indicator">
            <div className={`hud-agent-dot ${loopRunning ? 'active' : ''}`} />
            <span className="hud-agent-text">
              {loopRunning ? 'AGENT ONLINE' : 'AGENT OFFLINE'}
            </span>
          </div>
        </div>

        <nav className="hud-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.path}
              className={`hud-nav-btn ${isActive(item.path, item.exact) ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="hud-nav-icon">{item.icon}</span>
              <span className="hud-nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="hud-topbar-right">
          <div className="hud-system-info">
            <div className="hud-info-item">
              <span className="hud-info-label">XP</span>
              <span className="hud-info-val cyan">{stats.xp}</span>
            </div>
            <div className="hud-info-item">
              <span className="hud-info-label">STREAK</span>
              <span className="hud-info-val amber">{stats.streak}d</span>
            </div>
          </div>
          <div className="hud-clock">
            <span className="hud-clock-time">{hh}:{mm}:{ss}</span>
          </div>
          <button
            className={`hud-loop-btn ${loopRunning ? 'running' : ''}`}
            onClick={() => loopRunning ? stopAgentLoop() : startAgentLoop()}
            title={loopRunning ? 'Pause agent' : 'Start agent'}
          >
            {loopRunning ? '⏸' : '▶'}
          </button>
        </div>
      </header>

      {/* Live status bar */}
      <div className="hud-statusbar">
        <div className="hud-status-item">
          <span className="hud-status-label">SYS //</span>
          <span className="hud-status-val">NOMINAL</span>
        </div>
        <div className="hud-status-sep" />
        <div className="hud-status-item">
          <span className="hud-status-label">OPERATOR //</span>
          <span className="hud-status-val cyan">{profile.name?.toUpperCase() || 'UNKNOWN'}</span>
        </div>
        <div className="hud-status-sep" />
        <div className="hud-status-item">
          <span className="hud-status-label">LOOP //</span>
          <span className={`hud-status-val ${loopRunning ? 'green' : 'amber'}`}>
            {loopRunning ? 'ACTIVE' : 'PAUSED'}
          </span>
        </div>
        <div className="hud-status-sep" />
        <div className="hud-status-ticker">
          <span className="hud-status-label">LAST EVENT //</span>
          <span className="hud-status-val muted">
            {lastLog ? `[${lastLog.step?.toUpperCase()}] ${lastLog.msg}` : 'Awaiting agent events...'}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <main className="hud-main">
        <Routes>
          <Route path="/" element={<HUDMain />} />
          <Route path="/mentor" element={<MentorChat />} />
          <Route path="/exam" element={<ExamPage />} />
          <Route path="/logs" element={<AgentLogs />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>

      {/* Exam overlay */}
      {examMode && <ExamOverlay />}
    </div>
  )
}
