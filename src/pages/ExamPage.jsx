import { useState } from 'react'
import { useStore } from '../store/useStore'
import { generateExam } from '../lib/agents'
import './ExamPage.css'

export default function ExamPage() {
  const { profile, startExam, examMode, currentExam, examAnswers, answerExam, submitExam, examScore, closeExam, stats } = useStore()
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentQ, setCurrentQ] = useState(0)

  const handleGenerate = async () => {
    if (!topic.trim()) return
    if (!profile.apiKey) { alert('Add your OpenAI API key in Settings first.'); return }
    setLoading(true)
    try {
      const questions = await generateExam(topic, profile)
      startExam(questions)
      setCurrentQ(0)
    } catch (e) { alert('Error: ' + e.message) }
    setLoading(false)
  }

  if (examScore !== null) {
    return (
      <div className="exam-root">
        <div className="exam-result-panel hud-panel">
          <div className="hud-header">
            <div className="hud-header-dot" />
            <span className="hud-header-title">ASSESSMENT COMPLETE</span>
          </div>
          <div className="exam-result-body">
            <div className="exam-score-circle" style={{ '--score-color': examScore >= 70 ? '#00ff9d' : examScore >= 50 ? '#ffb800' : '#ff2d6a' }}>
              <div className="exam-score-val">{examScore}%</div>
              <div className="exam-score-label">SCORE</div>
            </div>
            <div className={`exam-result-title ${examScore >= 70 ? 'pass' : 'fail'}`}>
              {examScore >= 70 ? '✓ ASSESSMENT PASSED' : '✕ NEEDS IMPROVEMENT'}
            </div>
            <p className="exam-result-msg">
              {examScore >= 70
                ? 'Excellent performance. Neural pathways strengthened. +100 XP awarded.'
                : 'Below threshold. Reinforcing fundamental nodes. +40 XP awarded.'}
            </p>
            <div className="exam-result-stats">
              <div className="exam-res-stat">
                <span className="exam-res-val cyan">{stats.quizzesTaken}</span>
                <span className="exam-res-label">TOTAL EXAMS</span>
              </div>
              <div className="exam-res-stat">
                <span className="exam-res-val">{stats.xp}</span>
                <span className="exam-res-label">TOTAL XP</span>
              </div>
            </div>
            <button className="btn-hud btn-hud-primary w-full" onClick={closeExam}>
              ↩ RETURN TO NEXUS
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (currentExam) {
    const q = currentExam[currentQ]
    if (!q) return null
    return (
      <div className="exam-root">
        <div className="exam-active-panel hud-panel">
          <div className="hud-header">
            <div className="hud-header-dot" />
            <span className="hud-header-title">EXAM MODE — ACTIVE</span>
            <div className="hud-header-badge">{currentQ + 1}/{currentExam.length}</div>
          </div>
          <div className="exam-progress-bar">
            <div className="neon-bar">
              <div className="neon-bar-fill" style={{ width: `${((currentQ) / currentExam.length) * 100}%` }} />
            </div>
          </div>

          <div className="exam-q-body">
            <div className="exam-q-num">QUESTION {currentQ + 1}</div>
            <div className="exam-q-text">{q.question}</div>

            <div className="exam-options">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  className={`exam-option ${examAnswers[currentQ] === i ? 'selected' : ''}`}
                  onClick={() => answerExam(currentQ, i)}
                >
                  <div className="exam-opt-letter">{String.fromCharCode(65 + i)}</div>
                  <div className="exam-opt-text">{opt.replace(/^[A-D]\)\s*/, '')}</div>
                  {examAnswers[currentQ] === i && <div className="exam-opt-check">✓</div>}
                </button>
              ))}
            </div>

            <div className="exam-nav">
              <button className="btn-hud" onClick={() => setCurrentQ(q => Math.max(0, q - 1))} disabled={currentQ === 0}>
                ← PREV
              </button>
              {currentQ < currentExam.length - 1 ? (
                <button className="btn-hud btn-hud-green" onClick={() => setCurrentQ(q => q + 1)} disabled={examAnswers[currentQ] === undefined}>
                  NEXT →
                </button>
              ) : (
                <button className="btn-hud btn-hud-primary" onClick={submitExam}>
                  ⚡ SUBMIT EXAM
                </button>
              )}
            </div>

            <button className="exam-skip-btn" onClick={closeExam}>
              Skip Exam
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="exam-root">
      <div className="exam-setup-panel hud-panel">
        <div className="hud-header">
          <div className="hud-header-dot" />
          <span className="hud-header-title">EXAM MODE — INITIALIZE</span>
        </div>
        <div className="exam-setup-body">
          <div className="exam-setup-icon">◇</div>
          <h2 className="exam-setup-title">Assessment Protocol</h2>
          <p className="exam-setup-sub">
            Enter a topic to generate a 5-question MCQ exam. All UI features are locked during assessment.
          </p>
          <div className="exam-topic-row">
            <input
              className="hud-input"
              placeholder="Topic: AWS VPC, Machine Learning, React hooks..."
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGenerate()}
            />
            <button className="btn-hud btn-hud-primary" onClick={handleGenerate} disabled={loading || !topic.trim()}>
              {loading ? '◌ GENERATING...' : '⚡ START EXAM'}
            </button>
          </div>
          {!profile.apiKey && (
            <div className="exam-no-key">
              ⚠️ API key required. <span className="hud-c-cyan" style={{ cursor: 'pointer' }}>Configure in Settings →</span>
            </div>
          )}
          <div className="exam-info-grid">
            {[
              { label: 'Questions', val: '5 MCQ' },
              { label: 'Pass Threshold', val: '70%' },
              { label: 'XP Pass', val: '+100 XP' },
              { label: 'XP Fail', val: '+40 XP' },
            ].map((s, i) => (
              <div key={i} className="exam-info-card">
                <span className="exam-info-val">{s.val}</span>
                <span className="exam-info-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
