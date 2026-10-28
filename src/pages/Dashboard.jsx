import { useStore } from '../store/useStore'
import { useNavigate } from 'react-router-dom'
import './Dashboard.css'

const LOOP_STEP_INFO = [
  { name: 'Observe', icon: '👁️', color: '#06b6d4' },
  { name: 'Remember', icon: '🧠', color: '#8b5cf6' },
  { name: 'Reason', icon: '🧩', color: '#6366f1' },
  { name: 'Plan', icon: '🗺️', color: '#f59e0b' },
  { name: 'Act', icon: '⚡', color: '#10b981' },
  { name: 'Learn', icon: '📈', color: '#ec4899' },
]

export default function Dashboard() {
  const { profile, stats, tasks, completedTasks, weakConcepts, loopRunning, loopStep, agentLogs, startAgentLoop } = useStore()
  const navigate = useNavigate()

  const totalTasks = tasks.length + completedTasks.length
  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0
  const activeStep = loopStep % 6
  const lastLogs = agentLogs.slice(-4).reverse()

  const level = stats.xp < 200 ? 'Novice' : stats.xp < 500 ? 'Learner' : stats.xp < 1000 ? 'Scholar' : 'Master'
  const nextLevelXP = stats.xp < 200 ? 200 : stats.xp < 500 ? 500 : stats.xp < 1000 ? 1000 : 2000
  const xpProgress = Math.min(100, (stats.xp / nextLevelXP) * 100)

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-greeting">
            Good {getGreeting()}, <span>{profile.name || 'Learner'}</span> 👋
          </h1>
          <p className="dashboard-subtitle">Your autonomous mentor is {loopRunning ? 'actively observing' : 'ready to start'}</p>
        </div>
        {!loopRunning && (
          <button className="btn btn-primary" onClick={startAgentLoop}>
            ▶ Start Agent Loop
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="stats-grid">
        {[
          { label: 'Learning Streak', value: `${stats.streak}d`, icon: '🔥', color: 'amber' },
          { label: 'Total XP', value: stats.xp, icon: '⚡', color: 'purple' },
          { label: 'Tasks Done', value: stats.tasksCompleted, icon: '✅', color: 'emerald' },
          { label: 'Quizzes Taken', value: stats.quizzesTaken, icon: '📝', color: 'cyan' },
        ].map((s, i) => (
          <div key={i} className={`stat-card stat-${s.color}`}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Content grid */}
      <div className="dashboard-grid">
        {/* Left col */}
        <div className="dash-left">
          {/* Goal card */}
          <div className="glass-card dash-goal">
            <div className="dash-section-header">
              <span>🎯 Current Goal</span>
            </div>
            <div className="dash-goal-text">{profile.goal || 'No goal set yet'}</div>
            <div className="dash-goal-meta">
              <span className="badge badge-purple">{profile.level}</span>
              <span className="badge badge-cyan">{profile.dailyHours}h/day</span>
            </div>
          </div>

          {/* XP / Level */}
          <div className="glass-card dash-level">
            <div className="dash-section-header">
              <span>🏆 Level Progress</span>
              <span className="dash-level-name">{level}</span>
            </div>
            <div className="dash-level-xp">
              <span className="dash-xp-current">{stats.xp} XP</span>
              <span className="dash-xp-next">/ {nextLevelXP} XP</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${xpProgress}%` }} />
            </div>
            <p className="dash-xp-hint">{nextLevelXP - stats.xp} XP to {level === 'Master' ? 'Grandmaster' : 'next level'}</p>
          </div>

          {/* Task progress */}
          <div className="glass-card dash-tasks-card">
            <div className="dash-section-header">
              <span>✅ Task Progress</span>
              <button className="dash-see-all" onClick={() => navigate('/tasks')}>See all →</button>
            </div>
            <div className="dash-task-ring-wrap">
              <div className="dash-task-ring" style={{ '--progress': completionRate }}>
                <div className="dash-ring-inner">
                  <span className="dash-ring-pct">{completionRate}%</span>
                  <span className="dash-ring-label">complete</span>
                </div>
              </div>
              <div className="dash-task-stats">
                <div className="dash-task-stat"><span>{completedTasks.length}</span> completed</div>
                <div className="dash-task-stat"><span>{tasks.length}</span> pending</div>
              </div>
            </div>

            {/* Next tasks */}
            {tasks.slice(0, 3).map(task => (
              <div key={task.id} className="dash-task-item">
                <div className="dash-task-dot" />
                <span>{task.title}</span>
              </div>
            ))}
            {tasks.length === 0 && (
              <p className="dash-empty">No pending tasks. <span onClick={() => navigate('/tasks')} style={{color:'var(--accent-primary)',cursor:'pointer'}}>Add one →</span></p>
            )}
          </div>
        </div>

        {/* Right col */}
        <div className="dash-right">
          {/* Agent Loop Visualizer */}
          <div className="glass-card dash-agent-card">
            <div className="dash-section-header">
              <span>🤖 Agent Loop</span>
              <span className={`badge ${loopRunning ? 'badge-emerald' : 'badge-amber'}`}>
                {loopRunning ? '● Running' : '○ Paused'}
              </span>
            </div>
            <div className="agent-loop-visual">
              {LOOP_STEP_INFO.map((step, i) => (
                <div
                  key={i}
                  className={`loop-step ${loopRunning && activeStep === i ? 'active' : ''}`}
                  style={{ '--step-color': step.color }}
                >
                  <div className="loop-step-icon">{step.icon}</div>
                  <div className="loop-step-name">{step.name}</div>
                  {loopRunning && activeStep === i && <div className="loop-step-ping" />}
                </div>
              ))}
            </div>

            {/* Recent logs */}
            <div className="dash-logs">
              {lastLogs.length > 0 ? lastLogs.map((log, i) => (
                <div key={i} className={`dash-log-item dash-log-${log.type}`}>
                  <span className="dash-log-step">{log.step}</span>
                  <span className="dash-log-msg">{log.msg}</span>
                  <span className="dash-log-time">{log.time}</span>
                </div>
              )) : (
                <p className="dash-empty">Start the agent loop to see live activity</p>
              )}
            </div>

            <button className="dash-see-all-logs" onClick={() => navigate('/logs')}>
              View Full Agent Logs →
            </button>
          </div>

          {/* Weak Concepts */}
          <div className="glass-card dash-weak">
            <div className="dash-section-header">
              <span>⚠️ Weak Areas</span>
              <button className="dash-see-all" onClick={() => navigate('/mentor')}>Get help →</button>
            </div>
            {weakConcepts.length > 0 ? (
              <div className="weak-chips">
                {weakConcepts.map((c, i) => (
                  <span key={i} className="weak-chip">{c}</span>
                ))}
              </div>
            ) : (
              <p className="dash-empty">No weak concepts identified yet. Start learning!</p>
            )}
          </div>

          {/* Quick actions */}
          <div className="glass-card dash-quick">
            <div className="dash-section-header"><span>⚡ Quick Actions</span></div>
            <div className="quick-actions">
              {[
                { icon: '🧠', label: 'Ask Mentor', path: '/mentor', color: 'purple' },
                { icon: '🗺️', label: 'View Roadmap', path: '/roadmap', color: 'cyan' },
                { icon: '📝', label: 'Take Exam', path: '/exam', color: 'amber' },
                { icon: '✅', label: 'Add Task', path: '/tasks', color: 'emerald' },
              ].map((a, i) => (
                <button key={i} className={`quick-btn quick-${a.color}`} onClick={() => navigate(a.path)}>
                  <span>{a.icon}</span>
                  <span>{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
