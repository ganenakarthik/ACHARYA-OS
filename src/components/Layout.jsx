import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useStore } from '../store/useStore'
import Dashboard from '../pages/Dashboard'
import MentorChat from '../pages/MentorChat'
import Roadmap from '../pages/Roadmap'
import Tasks from '../pages/Tasks'
import ExamPage from '../pages/ExamPage'
import Settings from '../pages/Settings'
import AgentLogs from '../pages/AgentLogs'
import ExamOverlay from './ExamOverlay'
import './Layout.css'

const NAV_ITEMS = [
  { path: '/dashboard', icon: '⚡', label: 'Dashboard' },
  { path: '/mentor', icon: '🧠', label: 'AI Mentor' },
  { path: '/roadmap', icon: '🗺️', label: 'Roadmap' },
  { path: '/tasks', icon: '✅', label: 'Tasks' },
  { path: '/exam', icon: '📝', label: 'Exam Mode' },
  { path: '/logs', icon: '🔮', label: 'Agent Logs' },
  { path: '/settings', icon: '⚙️', label: 'Settings' },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { profile, stats, loopRunning, agentStatus, startAgentLoop, stopAgentLoop, examMode } = useStore()
  const navigate = useNavigate()

  return (
    <div className="layout-root">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="layout-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo" onClick={() => navigate('/dashboard')}>
          <div className="sidebar-logo-icon">
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
              <path d="M14 2L26 8V20L14 26L2 20V8L14 2Z" fill="url(#lg2)" stroke="rgba(99,102,241,0.4)" strokeWidth="1"/>
              <circle cx="14" cy="14" r="4.5" fill="white" fillOpacity="0.9"/>
              <defs>
                <linearGradient id="lg2" x1="2" y1="2" x2="26" y2="26" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6366f1"/><stop offset="1" stopColor="#06b6d4"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="sidebar-brand">
            <span className="sidebar-brand-name">Agentic AI</span>
            <span className="sidebar-brand-sub">Mentor</span>
          </div>
        </div>

        {/* Agent Status */}
        <div className={`sidebar-agent-status ${loopRunning ? 'running' : ''}`}>
          <div className={`agent-dot ${loopRunning ? 'active' : ''}`} />
          <div className="agent-status-info">
            <span className="agent-status-label">Agent Loop</span>
            <span className="agent-status-val">{loopRunning ? 'Running' : 'Paused'}</span>
          </div>
          <button
            className={`agent-toggle ${loopRunning ? 'stop' : 'start'}`}
            onClick={() => loopRunning ? stopAgentLoop() : startAgentLoop()}
          >
            {loopRunning ? '⏸' : '▶'}
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              <span className="sidebar-nav-label">{item.label}</span>
              {item.path === '/mentor' && <div className="nav-badge-ai">AI</div>}
            </NavLink>
          ))}
        </nav>

        {/* Profile */}
        <div className="sidebar-profile">
          <div className="sidebar-avatar">
            {profile.name ? profile.name[0].toUpperCase() : '?'}
          </div>
          <div className="sidebar-profile-info">
            <div className="sidebar-profile-name">{profile.name || 'Learner'}</div>
            <div className="sidebar-profile-xp">⚡ {stats.xp} XP</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="layout-main">
        {/* Top bar (mobile) */}
        <header className="layout-topbar">
          <button className="topbar-menu" onClick={() => setSidebarOpen(true)}>☰</button>
          <div className="topbar-title">Agentic AI Mentor</div>
          <div className="topbar-xp">⚡ {stats.xp} XP</div>
        </header>

        {/* Content */}
        <main className="layout-content">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/mentor" element={<MentorChat />} />
            <Route path="/roadmap" element={<Roadmap />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/exam" element={<ExamPage />} />
            <Route path="/logs" element={<AgentLogs />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>

      {/* Exam overlay */}
      {examMode && <ExamOverlay />}
    </div>
  )
}
