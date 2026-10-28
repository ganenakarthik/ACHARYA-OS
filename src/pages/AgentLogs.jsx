import { useStore } from '../store/useStore'
import './AgentLogs.css'

const LOG_COLORS = {
  observe: '#00f0ff',
  remember: '#7b2fff',
  reason: '#6366f1',
  plan: '#ffb800',
  act: '#00ff9d',
  learn: '#ec4899',
  system: 'rgba(120,160,200,0.5)',
}

export default function AgentLogs() {
  const { agentLogs, loopRunning, loopStep, startAgentLoop, stopAgentLoop } = useStore()
  const logs = [...agentLogs].reverse()
  const activeStep = loopStep % 6

  const STEPS = ['OBSERVE', 'REMEMBER', 'REASON', 'PLAN', 'ACT', 'LEARN']

  return (
    <div className="logs-root">
      {/* Header */}
      <div className="logs-header hud-panel">
        <div className="hud-header">
          <div className="hud-header-dot green" />
          <span className="hud-header-title green">AGENT LOOP — FULL TELEMETRY</span>
          <div className="hud-header-badge green">{agentLogs.length} EVENTS</div>
        </div>

        {/* Loop visualizer */}
        <div className="logs-loop-vis">
          {STEPS.map((s, i) => (
            <div key={i} className={`logs-step ${loopRunning && activeStep === i ? 'active' : ''}`}>
              <div className="logs-step-indicator" />
              <span>{s}</span>
              <div className="logs-step-line" />
            </div>
          ))}
        </div>

        <div className="logs-controls">
          <span className={`status-badge ${loopRunning ? 'status-active' : 'status-idle'}`}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: loopRunning ? '#00ff9d' : '#666' }} />
            {loopRunning ? 'ACTIVE' : 'PAUSED'}
          </span>
          <button
            className={`btn-hud ${loopRunning ? '' : 'btn-hud-green'}`}
            onClick={() => loopRunning ? stopAgentLoop() : startAgentLoop()}
          >
            {loopRunning ? '⏸ PAUSE LOOP' : '▶ START LOOP'}
          </button>
        </div>
      </div>

      {/* Log list */}
      <div className="logs-terminal hud-panel">
        <div className="logs-terminal-bar">
          <span className="hud-c-green" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em' }}>
            // AGENT TELEMETRY STREAM — REAL TIME
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff2d6a' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffb800' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00ff9d' }} />
          </div>
        </div>
        <div className="logs-list">
          {logs.length > 0 ? logs.map((log, i) => (
            <div key={log.id || i} className="logs-entry animate-fade-in">
              <span className="logs-time">{log.time || '--:--:--'}</span>
              <span className="logs-bracket">[</span>
              <span className="logs-step-tag" style={{ color: LOG_COLORS[log.type] || LOG_COLORS.system }}>
                {log.step?.toUpperCase().padEnd(7, ' ')}
              </span>
              <span className="logs-bracket">]</span>
              <span className="logs-msg">{log.msg}</span>
            </div>
          )) : (
            <div className="logs-empty">
              <span className="hud-c-muted">// Awaiting agent events. Start the loop to begin telemetry.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
