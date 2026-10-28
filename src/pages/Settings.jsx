import { useState } from 'react'
import { useStore } from '../store/useStore'
import { useNavigate } from 'react-router-dom'
import './Settings.css'

export default function Settings() {
  const navigate = useNavigate()
  const { profile, setProfile, resetAll, stats } = useStore()
  const [form, setForm] = useState({ ...profile })
  const [saved, setSaved] = useState(false)

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = () => {
    setProfile(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const reset = () => {
    if (confirm('Reset ALL data? This cannot be undone.')) {
      resetAll()
      navigate('/onboarding')
    }
  }

  return (
    <div className="settings-root">
      <div className="settings-panel hud-panel">
        <div className="hud-header">
          <div className="hud-header-dot" />
          <span className="hud-header-title">SYSTEM CONFIGURATION</span>
        </div>
        <div className="settings-body">

          {/* Profile */}
          <div className="settings-section">
            <div className="settings-section-title">OPERATOR PROFILE</div>
            <div className="settings-field">
              <label className="settings-label">OPERATOR NAME</label>
              <input className="hud-input" value={form.name} onChange={e => update('name', e.target.value)} placeholder="Your name" />
            </div>
            <div className="settings-field">
              <label className="settings-label">PRIMARY OBJECTIVE</label>
              <textarea className="hud-input settings-textarea" value={form.goal} onChange={e => update('goal', e.target.value)} placeholder="Your learning goal..." />
            </div>
            <div className="settings-row">
              <div className="settings-field">
                <label className="settings-label">SKILL LEVEL</label>
                <select className="hud-input" value={form.level} onChange={e => update('level', e.target.value)}>
                  <option value="beginner">BEGINNER</option>
                  <option value="intermediate">INTERMEDIATE</option>
                  <option value="advanced">ADVANCED</option>
                </select>
              </div>
              <div className="settings-field">
                <label className="settings-label">DAILY HOURS</label>
                <select className="hud-input" value={form.dailyHours} onChange={e => update('dailyHours', Number(e.target.value))}>
                  <option value={0.5}>0.5h</option>
                  <option value={1}>1h</option>
                  <option value={2}>2h</option>
                  <option value={3}>3h+</option>
                </select>
              </div>
            </div>
          </div>

          <div className="settings-divider" />

          {/* API */}
          <div className="settings-section">
            <div className="settings-section-title">AI NEURAL LINK</div>
            <div className="settings-field">
              <label className="settings-label">OPENAI API KEY</label>
              <input
                className="hud-input settings-mono"
                type="password"
                value={form.apiKey}
                onChange={e => update('apiKey', e.target.value)}
                placeholder="sk-..."
              />
              <p className="settings-hint">
                Used for AI mentoring, exam generation, and roadmap creation.
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="settings-link"> Get key →</a>
              </p>
            </div>
            <div className={`settings-key-status ${form.apiKey ? 'active' : ''}`}>
              <div className={`settings-key-dot ${form.apiKey ? 'active' : ''}`} />
              <span>{form.apiKey ? 'Neural link ready' : 'No API key configured'}</span>
            </div>
          </div>

          <div className="settings-divider" />

          {/* Stats */}
          <div className="settings-section">
            <div className="settings-section-title">PERFORMANCE METRICS</div>
            <div className="settings-stats-grid">
              {[
                { label: 'Total XP', val: stats.xp },
                { label: 'Streak', val: `${stats.streak}d` },
                { label: 'Tasks Done', val: stats.tasksCompleted },
                { label: 'Exams Taken', val: stats.quizzesTaken },
              ].map((s, i) => (
                <div key={i} className="settings-stat">
                  <span className="settings-stat-val">{s.val}</span>
                  <span className="settings-stat-label">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="settings-divider" />

          {/* Actions */}
          <div className="settings-actions">
            <button className="btn-hud btn-hud-primary" onClick={save}>
              {saved ? '✓ SAVED' : '⚡ SAVE CONFIG'}
            </button>
            <button className="btn-hud" style={{ color: '#ff2d6a', borderColor: 'rgba(255,45,106,0.3)' }} onClick={reset}>
              ✕ RESET ALL DATA
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
