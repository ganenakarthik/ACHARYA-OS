import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import './Onboarding.css'

const STEPS = [
  { id: 'welcome', title: 'Welcome', subtitle: 'Meet your autonomous AI learning companion' },
  { id: 'name', title: 'Your Name', subtitle: 'Let me know who I\'m mentoring' },
  { id: 'goal', title: 'Your Goal', subtitle: 'What do you want to achieve?' },
  { id: 'level', title: 'Your Level', subtitle: 'Where are you starting from?' },
  { id: 'hours', title: 'Daily Time', subtitle: 'How much time can you commit?' },
  { id: 'api', title: 'AI Setup', subtitle: 'Connect your OpenAI API key' },
]

const GOALS = [
  { icon: '☁️', label: 'Cloud Certification', value: 'Pass AWS/Azure/GCP certification exam' },
  { icon: '💻', label: 'Full-Stack Dev', value: 'Become a full-stack web developer' },
  { icon: '📊', label: 'Data Science', value: 'Master data science and machine learning' },
  { icon: '🔐', label: 'Cybersecurity', value: 'Learn cybersecurity and ethical hacking' },
  { icon: '📱', label: 'Mobile Dev', value: 'Build iOS and Android applications' },
  { icon: '🤖', label: 'AI/ML Engineer', value: 'Become an AI/ML engineer' },
  { icon: '⚙️', label: 'DevOps', value: 'Master DevOps and CI/CD pipelines' },
  { icon: '✏️', label: 'Custom Goal', value: '' },
]

const LEVELS = [
  { icon: '🌱', label: 'Beginner', value: 'beginner', desc: 'Just starting out, building foundations' },
  { icon: '📚', label: 'Intermediate', value: 'intermediate', desc: 'Have some experience, want to level up' },
  { icon: '🚀', label: 'Advanced', value: 'advanced', desc: 'Experienced, aiming for mastery' },
]

const HOURS = [
  { label: '30 min', value: 0.5 },
  { label: '1 hour', value: 1 },
  { label: '2 hours', value: 2 },
  { label: '3+ hours', value: 3 },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { setProfile, completeOnboarding, startAgentLoop } = useStore()

  const [step, setStep] = useState(0)
  const [data, setData] = useState({ name: '', goal: '', customGoal: '', level: 'beginner', dailyHours: 1, apiKey: '' })
  const [customGoal, setCustomGoal] = useState(false)

  const update = (key, val) => setData(d => ({ ...d, [key]: val }))

  const canNext = () => {
    if (step === 1) return data.name.trim().length > 0
    if (step === 2) return (customGoal ? data.customGoal : data.goal).length > 0
    return true
  }

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else finish()
  }

  const finish = () => {
    const finalGoal = customGoal ? data.customGoal : data.goal
    setProfile({ name: data.name, goal: finalGoal, level: data.level, dailyHours: data.dailyHours, apiKey: data.apiKey })
    completeOnboarding()
    setTimeout(() => startAgentLoop(), 2000)
    navigate('/hud')
  }

  const progress = ((step) / (STEPS.length - 1)) * 100

  return (
    <div className="onboarding-root">
      {/* Animated background */}
      <div className="ob-bg">
        <div className="ob-orb ob-orb1" />
        <div className="ob-orb ob-orb2" />
        <div className="ob-orb ob-orb3" />
        <div className="ob-grid" />
      </div>

      <div className="ob-container">
        {/* Logo */}
        <div className="ob-logo">
          <div className="ob-logo-icon">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 2L26 8V20L14 26L2 20V8L14 2Z" fill="url(#lg)" stroke="rgba(99,102,241,0.5)" strokeWidth="1"/>
              <circle cx="14" cy="14" r="5" fill="white" fillOpacity="0.9"/>
              <defs>
                <linearGradient id="lg" x1="2" y1="2" x2="26" y2="26" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6366f1"/>
                  <stop offset="1" stopColor="#06b6d4"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="ob-logo-text">Agentic AI Mentor</span>
        </div>

        {/* Progress */}
        <div className="ob-progress-wrap">
          <div className="ob-progress-track">
            <div className="ob-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="ob-progress-label">{step + 1} / {STEPS.length}</span>
        </div>

        {/* Card */}
        <div className="ob-card" key={step}>
          <div className="ob-step-badge">{STEPS[step].title}</div>
          <h1 className="ob-title">{STEPS[step].subtitle}</h1>

          {/* STEP 0: Welcome */}
          {step === 0 && (
            <div className="ob-step ob-welcome">
              <div className="ob-agent-visual">
                <div className="ob-agent-ring ob-agent-ring1" />
                <div className="ob-agent-ring ob-agent-ring2" />
                <div className="ob-agent-ring ob-agent-ring3" />
                <div className="ob-agent-core">
                  <span>🧠</span>
                </div>
              </div>
              <div className="ob-features">
                {[
                  { icon: '👁️', text: 'Observes your learning patterns' },
                  { icon: '🧠', text: 'Reasons about your weak spots' },
                  { icon: '🗺️', text: 'Plans your optimal learning path' },
                  { icon: '⚡', text: 'Acts proactively without being asked' },
                  { icon: '📈', text: 'Learns and improves over time' },
                ].map((f, i) => (
                  <div key={i} className="ob-feature-item" style={{ animationDelay: `${i * 0.08}s` }}>
                    <span>{f.icon}</span>
                    <span>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 1: Name */}
          {step === 1 && (
            <div className="ob-step">
              <input
                autoFocus
                className="ob-input"
                placeholder="Enter your name..."
                value={data.name}
                onChange={e => update('name', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && canNext() && next()}
              />
              {data.name && (
                <p className="ob-greeting">
                  Hello, <strong>{data.name}</strong>! I'm ready to be your mentor. 🎓
                </p>
              )}
            </div>
          )}

          {/* STEP 2: Goal */}
          {step === 2 && (
            <div className="ob-step">
              <div className="ob-grid-goals">
                {GOALS.map((g, i) => (
                  <button
                    key={i}
                    className={`ob-goal-chip ${data.goal === g.value && !customGoal ? 'active' : ''} ${g.label === 'Custom Goal' && customGoal ? 'active' : ''}`}
                    onClick={() => {
                      if (g.label === 'Custom Goal') { setCustomGoal(true); update('goal', '') }
                      else { setCustomGoal(false); update('goal', g.value) }
                    }}
                  >
                    <span className="ob-goal-icon">{g.icon}</span>
                    <span>{g.label}</span>
                  </button>
                ))}
              </div>
              {customGoal && (
                <input
                  autoFocus
                  className="ob-input ob-input-mt"
                  placeholder="Describe your learning goal..."
                  value={data.customGoal}
                  onChange={e => update('customGoal', e.target.value)}
                />
              )}
            </div>
          )}

          {/* STEP 3: Level */}
          {step === 3 && (
            <div className="ob-step">
              <div className="ob-level-list">
                {LEVELS.map((l) => (
                  <button
                    key={l.value}
                    className={`ob-level-card ${data.level === l.value ? 'active' : ''}`}
                    onClick={() => update('level', l.value)}
                  >
                    <span className="ob-level-icon">{l.icon}</span>
                    <div>
                      <div className="ob-level-name">{l.label}</div>
                      <div className="ob-level-desc">{l.desc}</div>
                    </div>
                    {data.level === l.value && <span className="ob-check">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Hours */}
          {step === 4 && (
            <div className="ob-step">
              <div className="ob-hours-grid">
                {HOURS.map((h) => (
                  <button
                    key={h.value}
                    className={`ob-hour-btn ${data.dailyHours === h.value ? 'active' : ''}`}
                    onClick={() => update('dailyHours', h.value)}
                  >
                    <span className="ob-hour-label">{h.label}</span>
                    <span className="ob-hour-sub">/ day</span>
                  </button>
                ))}
              </div>
              <p className="ob-hint">Consistency beats intensity. Even 30 minutes daily creates massive results.</p>
            </div>
          )}

          {/* STEP 5: API Key */}
          {step === 5 && (
            <div className="ob-step">
              <div className="ob-api-info">
                <div className="ob-api-icon">🔑</div>
                <p>Enter your <strong>OpenAI API key</strong> to enable AI-powered mentoring, exam generation, and roadmap planning.</p>
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="ob-api-link">
                  Get your API key →
                </a>
              </div>
              <input
                className="ob-input ob-input-mono"
                placeholder="sk-..."
                type="password"
                value={data.apiKey}
                onChange={e => update('apiKey', e.target.value)}
              />
              <p className="ob-skip-hint">
                You can skip this for now and add it later in Settings. AI features will be limited.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="ob-nav">
            {step > 0 && (
              <button className="ob-btn-back" onClick={() => setStep(s => s - 1)}>
                ← Back
              </button>
            )}
            <button
              className={`ob-btn-next ${!canNext() ? 'disabled' : ''}`}
              onClick={next}
              disabled={!canNext() && step !== 5}
            >
              {step === STEPS.length - 1 ? '🚀 Launch Mentor' : 'Continue →'}
            </button>
          </div>

          {step === 5 && (
            <button className="ob-skip" onClick={finish}>Skip for now</button>
          )}
        </div>
      </div>
    </div>
  )
}
