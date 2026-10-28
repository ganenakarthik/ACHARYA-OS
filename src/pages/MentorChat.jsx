import { useState, useRef, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { sendMentorMessage } from '../lib/agents'
import ReactMarkdown from 'react-markdown'
import './MentorChat.css'

export default function MentorChat() {
  const { profile, chatHistory, addMessage, addWeakConcept } = useStore()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [voiceMode, setVoiceMode] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const recognitionRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory, loading])

  const send = async (text) => {
    const msg = (text || input).trim()
    if (!msg) return
    setInput('')
    addMessage({ role: 'user', content: msg })
    setLoading(true)

    try {
      const history = [...chatHistory, { role: 'user', content: msg }]
      const reply = await sendMentorMessage(history, profile)
      addMessage({ role: 'assistant', content: reply })
      // detect weak concepts
      const weakMatch = reply.match(/(?:struggling with|difficulty with|weak on|revisit)\s+([A-Za-z\s]+)/gi)
      if (weakMatch) {
        weakMatch.slice(0, 2).forEach(m => {
          const concept = m.replace(/^.*?(with|on)\s+/i, '').trim().slice(0, 40)
          if (concept.length > 2) addWeakConcept(concept)
        })
      }
    } catch (e) {
      addMessage({ role: 'assistant', content: `⚠️ **Connection Error**: ${e.message}` })
    }
    setLoading(false)
  }

  const startVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice not supported in this browser')
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SR()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript
      setInput(text)
      setIsListening(false)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  const speak = (text) => {
    if (!voiceMode || !('speechSynthesis' in window)) return
    const clean = text.replace(/[*#`>]/g, '').substring(0, 300)
    const utter = new SpeechSynthesisUtterance(clean)
    utter.rate = 0.95
    window.speechSynthesis.speak(utter)
  }

  return (
    <div className="mentor-root">
      {/* Header */}
      <div className="mentor-header hud-panel">
        <div className="mentor-header-left">
          <div className="mentor-avatar">
            <div className="ma-ring ma-ring1" />
            <div className="ma-ring ma-ring2" />
            <span>◈</span>
          </div>
          <div>
            <div className="mentor-name">NEURAL LINK — AI MENTOR</div>
            <div className="mentor-sub">Proactive · Socratic · Autonomous</div>
          </div>
        </div>
        <div className="mentor-header-actions">
          <button
            className={`btn-hud ${voiceMode ? 'btn-hud-green' : ''}`}
            onClick={() => setVoiceMode(v => !v)}
          >
            {voiceMode ? '🔊 VOICE ON' : '🔇 VOICE OFF'}
          </button>
        </div>
      </div>

      {/* Chat */}
      <div className="mentor-chat-area">
        {chatHistory.length === 0 && (
          <div className="mentor-welcome">
            <div className="mentor-welcome-icon">◈</div>
            <h2 className="mentor-welcome-title">Neural Link Established</h2>
            <p className="mentor-welcome-sub">Ask me anything. I observe, reason, and act — not just respond.</p>
            <div className="mentor-suggestions">
              {[
                `Explain ${profile.goal ? profile.goal.split(' ')[0] : 'this concept'} to me`,
                'What should I focus on today?',
                'Quiz me on my weak areas',
                'Create a study plan for this week',
              ].map((s, i) => (
                <button key={i} className="mentor-suggest" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatHistory.map((msg, i) => (
          <div key={i} className={`mentor-msg ${msg.role} ${msg.isProactive ? 'proactive' : ''} animate-fade-in`}>
            {msg.role === 'assistant' && (
              <div className="msg-avatar-ai">◈</div>
            )}
            <div className="msg-bubble">
              {msg.isProactive && (
                <div className="msg-proactive-badge">⚡ PROACTIVE INTERVENTION</div>
              )}
              <div className="msg-content markdown-content">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
              <div className="msg-meta">
                <span>{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}</span>
                {msg.role === 'assistant' && (
                  <button className="msg-speak" onClick={() => speak(msg.content)} title="Read aloud">🔊</button>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="mentor-msg assistant animate-fade-in">
            <div className="msg-avatar-ai">◈</div>
            <div className="msg-bubble">
              <div className="typing-dots">
                <span /><span /><span />
              </div>
              <div className="msg-thinking">Processing query through neural network...</div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mentor-input-area hud-panel">
        <div className="mentor-input-row">
          <button
            className={`btn-hud btn-icon-only ${isListening ? 'btn-hud-green listening' : ''}`}
            onClick={isListening ? () => recognitionRef.current?.stop() : startVoice}
            title={isListening ? 'Stop' : 'Voice input'}
          >
            🎤
          </button>
          <input
            ref={inputRef}
            className="hud-input mentor-text-input"
            placeholder="Command... (Enter to send)"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            disabled={loading}
          />
          <button className="btn-hud btn-hud-primary" onClick={() => send()} disabled={loading || !input.trim()}>
            {loading ? '◌' : '▶ SEND'}
          </button>
        </div>
        {isListening && (
          <div className="mentor-listening-bar">
            <div className="listening-waves">
              {[...Array(5)].map((_, i) => <div key={i} className="wave" style={{ animationDelay: `${i * 0.1}s` }} />)}
            </div>
            <span>Listening...</span>
          </div>
        )}
      </div>
    </div>
  )
}
