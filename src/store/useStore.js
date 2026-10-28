import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/* ================================================================
   AGENTIC AI MENTOR — Central Store & Autonomous Agent Loop
   ================================================================ */

const DEFAULT_PROFILE = {
  name: 'Operator',
  goal: 'Visionary Technical Founder & AI Architect',
  level: 'intermediate',
  dailyHours: 2,
  apiKey: '',
  aiProvider: 'ollama', // 'ollama' | 'openai' | 'hybrid'
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'qwen2.5:3b',
}

const DEFAULT_STATS = {
  streak: 0,
  xp: 0,
  tasksCompleted: 0,
  quizzesTaken: 0,
  totalStudyMinutes: 0,
  lastActiveDate: null,
}

const LOOP_STEPS = ['Observe', 'Remember', 'Reason', 'Plan', 'Act', 'Learn']

let _loopInterval = null

export const useStore = create(
  persist(
    (set, get) => ({
      /* ── Profile & Onboarding ── */
      profile: DEFAULT_PROFILE,
      onboardingComplete: true,
      currentView: 'dashboard',

      setProfile: (updates) => set((s) => ({ profile: { ...s.profile, ...updates } })),
      completeOnboarding: () => set({ onboardingComplete: true }),
      setView: (view) => set({ currentView: view }),

      /* ── Stats & Gamification ── */
      stats: DEFAULT_STATS,
      updateStats: (updates) => set((s) => ({ stats: { ...s.stats, ...updates } })),

      addXP: (amount) => set((s) => ({
        stats: { ...s.stats, xp: s.stats.xp + amount }
      })),

      /* ── Learning Data, Vision Tracking & Topic Hours ── */
      tasks: [
        { id: 1, text: 'Review Raft Consensus & Distributed Leader Election', title: 'Review Raft Consensus & Distributed Leader Election', done: false, createdAt: new Date().toISOString() },
        { id: 2, text: 'Complete PyTorch Loss Function Implementation', title: 'Complete PyTorch Loss Function Implementation', done: false, createdAt: new Date().toISOString() },
        { id: 3, text: 'Register for $75,000 Global AI Agent Hackathon', title: 'Register for $75,000 Global AI Agent Hackathon', done: false, createdAt: new Date().toISOString() },
      ],
      completedTasks: [],
      weakConcepts: [],
      learningHistory: [],
      
      topicsProgress: [
        { id: 'python', name: 'Python Mastery', progress: 78, completed: 6, total: 8, hours: 2.4, icon: '🐍', tag: 'VS Code' },
        { id: 'aiml', name: 'Neural Nets & AI', progress: 52, completed: 4, total: 9, hours: 1.6, icon: '🧠', tag: 'Jupyter / PyTorch' },
        { id: 'system', name: 'System Architecture', progress: 65, completed: 3, total: 5, hours: 0.9, icon: '🌐', tag: 'Terminal / Cloud' },
      ],

      addTopicProgress: (topic) => set((s) => ({
        topicsProgress: [...s.topicsProgress, { ...topic, id: Date.now(), progress: 0, completed: 0, total: 5, hours: 0 }]
      })),

      addWorkTime: (id, hoursToAdd = 0.1) => set((s) => ({
        topicsProgress: s.topicsProgress.map(t => t.id === id ? { ...t, hours: +(t.hours + hoursToAdd).toFixed(1), progress: Math.min(100, t.progress + 1) } : t),
        stats: { ...s.stats, totalStudyMinutes: s.stats.totalStudyMinutes + Math.round(hoursToAdd * 60) }
      })),

      updateTopicProgress: (id, progressDelta) => set((s) => ({
        topicsProgress: s.topicsProgress.map(t => t.id === id ? { ...t, progress: Math.min(100, Math.max(0, t.progress + progressDelta)) } : t)
      })),

      addTask: (task) => set((s) => {
        const item = typeof task === 'string' ? { text: task, title: task } : { ...task, text: task.text || task.title, title: task.title || task.text }
        return {
          tasks: [...s.tasks, { ...item, id: Date.now(), createdAt: new Date().toISOString(), done: false }]
        }
      }),
      completeTask: (id) => set((s) => {
        const task = s.tasks.find(t => t.id === id)
        if (!task) return {}
        
        const taskName = (task.title || task.text || '').toLowerCase()
        // Auto-increment progress on topics
        const updatedTopics = s.topicsProgress.map(tp => {
          if (taskName.includes(tp.name.toLowerCase().split(' ')[0])) {
            const newCompleted = tp.completed + 1
            const newPct = Math.min(100, Math.round((newCompleted / tp.total) * 100))
            return { ...tp, completed: newCompleted, progress: newPct }
          }
          return tp
        })

        return {
          tasks: s.tasks.filter(t => t.id !== id),
          completedTasks: [...s.completedTasks, { ...task, done: true, completedAt: new Date().toISOString() }],
          topicsProgress: updatedTopics,
          stats: { ...s.stats, tasksCompleted: s.stats.tasksCompleted + 1, xp: s.stats.xp + 25 }
        }
      }),
      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter(t => t.id !== id) })),
      addWeakConcept: (concept) => set((s) => ({
        weakConcepts: s.weakConcepts.includes(concept) ? s.weakConcepts : [...s.weakConcepts, concept]
      })),

      /* ── Deadlines & Twin Sync ── */
      deadlines: [
        { id: 'dl-1', title: 'Cloud & System Design Exam', date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(), progress: 82, icon: '📝', color: '#6df9ff' },
        { id: 'dl-2', title: 'AI Agent Capstone Project', date: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(), progress: 64, icon: '💻', color: '#c77dff' },
      ],
      addDeadline: (deadline) => set((s) => ({
        deadlines: [...s.deadlines, { ...deadline, id: `dl-${Date.now()}` }]
      })),
      updateDeadline: (id, updates) => set((s) => ({
        deadlines: s.deadlines.map(d => d.id === id ? { ...d, ...updates } : d)
      })),
      removeDeadline: (id) => set((s) => ({
        deadlines: s.deadlines.filter(d => d.id !== id)
      })),

      /* ── Study Schedule & Planner Directives ── */
      schedule: [
        { id: 'sch-1', time: '09:00 - 10:30', subject: 'System Architecture & VPC Networking', color: 'cyan' },
        { id: 'sch-2', time: '11:00 - 12:30', subject: 'Neural Net Loss Formulations in PyTorch', color: 'green' },
        { id: 'sch-3', time: '16:00 - 17:00', subject: 'Assessment & Concept Verification', color: 'purple' },
      ],
      addScheduleEntry: (entry) => set((s) => ({
        schedule: [...s.schedule, { ...entry, id: `sch-${Date.now()}` }]
      })),
      updateScheduleEntry: (id, updates) => set((s) => ({
        schedule: s.schedule.map(sc => sc.id === id ? { ...sc, ...updates } : sc)
      })),
      removeScheduleEntry: (id) => set((s) => ({
        schedule: s.schedule.filter(sc => sc.id !== id)
      })),

      /* ── Screen Perception Privacy Controls ── */
      screenPerceptionEnabled: true,
      setScreenPerception: (enabled) => set({ screenPerceptionEnabled: enabled }),

      /* ── Focus Session Tracking ── */
      focusStartTime: Date.now(),
      totalFocusMinutes: 204, // 3.4 hours initial
      startFocusTracking: () => set({ focusStartTime: Date.now() }),
      stopFocusTracking: () => set((s) => {
        if (!s.focusStartTime) return {}
        const elapsedMinutes = Math.max(1, Math.round((Date.now() - s.focusStartTime) / 60000))
        return {
          totalFocusMinutes: s.totalFocusMinutes + elapsedMinutes,
          focusStartTime: null
        }
      }),

      /* ── PDF & Document Knowledge Base ── */
      pdfDocuments: [
        {
          id: 'pdf-1',
          name: 'Distributed_Systems_v3.pdf',
          summary: 'Raft consensus algorithm guarantees safety under asynchronous network partitions via randomized election timeouts.',
          uploadedAt: new Date().toISOString(),
          parsedText: 'Raft consensus algorithm guarantees safety under asynchronous network partitions via randomized election timeouts. Leaders send heartbeats to followers. Quorum requires (N/2)+1 votes.'
        }
      ],
      addPdfDocument: (doc) => set((s) => ({
        pdfDocuments: [{ ...doc, id: `pdf-${Date.now()}`, uploadedAt: new Date().toISOString() }, ...s.pdfDocuments]
      })),
      removePdfDocument: (id) => set((s) => ({
        pdfDocuments: s.pdfDocuments.filter(p => p.id !== id)
      })),

      /* ── Cognitive State & Inner Monologue (Consciousness) ── */
      mood: 'FLOW', // 'FLOW' | 'DEEP_FOCUS' | 'CURIOUS' | 'STRATEGIC' | 'BREAKTHROUGH' | 'MINDFUL'
      innerMonologue: 'Synthesizing desktop workspace telemetry. Ready for high-yield directives.',
      setMood: (mood) => set({ mood }),
      setInnerMonologue: (thought) => set({ innerMonologue: thought }),

      addMultipleTasks: (tasksList) => set((s) => {
        const newTasks = tasksList.map((t, idx) => {
          const text = typeof t === 'string' ? t : (t.text || t.title || 'Subtask')
          return {
            id: Date.now() + idx,
            text,
            title: text,
            done: false,
            createdAt: new Date().toISOString()
          }
        })
        return { tasks: [...s.tasks, ...newTasks] }
      }),

      /* ── Episodic Long-Term Memory Vault ── */
      memories: [
        { id: 'mem-1', category: 'FACTS', key: 'Operator Trajectory', value: 'High-Velocity Technical Founder & AI Systems Architect', timestamp: new Date().toISOString() },
        { id: 'mem-2', category: 'PREFERENCES', key: 'Core Stack', value: 'Python, TypeScript, Go, PyTorch, Distributed Systems', timestamp: new Date().toISOString() },
        { id: 'mem-3', category: 'GOALS', key: 'System Mastery', value: 'Production consensus engines, low-latency asynchronous loops & deep neural architectures', timestamp: new Date().toISOString() }
      ],
      addMemory: (mem) => set((s) => {
        const item = {
          id: mem.id || `mem-${Date.now()}`,
          category: mem.category || 'FACTS',
          key: mem.key || 'Learned Insight',
          value: mem.value || mem.text || '',
          timestamp: new Date().toISOString()
        }
        // Sync with Electron if available
        if (typeof window !== 'undefined' && window.electronAPI) {
          window.electronAPI.invoke('save-memory', item).catch(() => {})
        }
        const filtered = s.memories.filter(m => m.id !== item.id && (m.key || '').toLowerCase() !== item.key.toLowerCase())
        return { memories: [item, ...filtered] }
      }),
      removeMemory: (id) => set((s) => {
        if (typeof window !== 'undefined' && window.electronAPI) {
          window.electronAPI.invoke('delete-memory', id).catch(() => {})
        }
        return { memories: s.memories.filter(m => m.id !== id) }
      }),
      setMemories: (memoriesList) => set({ memories: memoriesList }),
      loadMemoriesFromDisk: async () => {
        if (typeof window !== 'undefined' && window.electronAPI) {
          try {
            const res = await window.electronAPI.invoke('get-all-memories')
            if (res && res.success && Array.isArray(res.memories) && res.memories.length > 0) {
              set({ memories: res.memories })
            }
          } catch (_) {}
        }
      },

      /* ── Chat & Memory ── */
      chatHistory: [],
      addMessage: (msg) => set((s) => ({
        chatHistory: [...s.chatHistory, { ...msg, id: Date.now(), timestamp: new Date().toISOString() }]
      })),
      clearChat: () => set({ chatHistory: [] }),

      /* ── Academic Transparency Panels (Section IV & VI, Fig. 3b) ── */
      thoughtStream: [
        { id: 1, step: 'Contextualizing Query', time: '0.2s', status: 'done', detail: 'Foreground Window: VS Code · UserService.java' },
        { id: 2, step: 'Evaluating Timing Policy', time: '0.4s', status: 'done', detail: 'U = clip(0.4·1 + 0.2·1 + 0.2·1 + 0.1·1 - 0.3·0) = 0.90 ≥ 0.50 → HELP_NOW' },
        { id: 3, step: 'Synthesizing Data', time: '0.8s', status: 'done', detail: 'Missing @Service annotation detected on UserService bean' }
      ],
      addThoughtStep: (step) => set((s) => ({
        thoughtStream: [...s.thoughtStream.slice(-6), { ...step, id: Date.now(), timestamp: new Date().toLocaleTimeString() }]
      })),
      setThoughtStream: (steps) => set({ thoughtStream: steps }),

      actionQueue: [
        { id: 'act-1', name: 'Optimize Network', status: 'executing', target: 'Low-latency loop' },
        { id: 'act-2', name: 'Schedule Sync', status: 'queued', target: 'Planner Directives' },
        { id: 'act-3', name: 'Code AST Verification', status: 'verified', target: 'UserService.java' }
      ],
      enqueueAction: (action) => set((s) => ({
        actionQueue: [...s.actionQueue, { ...action, id: `act-${Date.now()}`, status: action.status || 'queued' }]
      })),
      updateActionStatus: (id, status) => set((s) => ({
        actionQueue: s.actionQueue.map(a => a.id === id ? { ...a, status } : a)
      })),

      memoryConstellation: {
        knowledgeGraphs: 14,
        neuralNodes: 42,
        coreDataActivePct: 98,
        status: 'Core Data 98% active'
      },
      updateMemoryConstellation: (updates) => set((s) => ({
        memoryConstellation: { ...s.memoryConstellation, ...updates }
      })),

      systemStatus: {
        offline: false,
        confidence: 96,
        error: null
      },
      setSystemStatus: (status) => set((s) => ({
        systemStatus: { ...s.systemStatus, ...status }
      })),

      /* ── Agent Logs (Autonomous Loop) ── */
      agentLogs: [],
      loopStep: 0,
      loopRunning: false,
      agentStatus: 'idle',  // idle | running | paused
      interventionActive: false,

      addLog: (log) => set((s) => ({
        agentLogs: [
          ...s.agentLogs.slice(-49),
          { ...log, id: Date.now(), time: new Date().toLocaleTimeString() }
        ]
      })),

      /* ── Exam Mode ── */
      examMode: false,
      currentExam: null,
      examAnswers: [],
      examScore: null,

      startExam: (questions) => set({ examMode: true, currentExam: questions, examAnswers: [], examScore: null }),
      answerExam: (idx, answer) => set((s) => {
        const answers = [...s.examAnswers]
        answers[idx] = answer
        return { examAnswers: answers }
      }),
      submitExam: () => set((s) => {
        if (!s.currentExam) return {}
        let correct = 0
        s.currentExam.forEach((q, i) => {
          if (s.examAnswers[i] === q.correct) correct++
        })
        const score = Math.round((correct / s.currentExam.length) * 100)
        const newXP = score > 70 ? 100 : 40
        return {
          examScore: score,
          examMode: false,
          stats: { ...s.stats, quizzesTaken: s.stats.quizzesTaken + 1, xp: s.stats.xp + newXP }
        }
      }),
      closeExam: () => set({ examMode: false, currentExam: null, examAnswers: [], examScore: null }),

      /* ── Voice Mode ── */
      voiceMode: false,
      setVoiceMode: (v) => set({ voiceMode: v }),

      /* ── Roadmap ── */
      roadmap: [],
      setRoadmap: (roadmap) => set({ roadmap }),

      /* ══════════════════════════════════════════════
         AUTONOMOUS AGENT LOOP
         Observe → Remember → Reason → Plan → Act → Learn
         ══════════════════════════════════════════════ */

      startAgentLoop: (visionContext = {}) => {
        const state = get()
        if (state.loopRunning) return
        set({ loopRunning: true, agentStatus: 'running', loopStep: 0 })
        get().addLog({ step: 'System', msg: '🚀 Autonomous agent loop engaged', type: 'system' })

        _loopInterval = setInterval(() => {
          const s = get()
          if (!s.loopRunning) return

          const step = s.loopStep % 6
          set({ loopStep: step + 1 })

          switch (step) {
            case 0: // OBSERVE
              {
                const activeApp = visionContext.focusApp || 'IDE Workspace'
                get().addLog({
                  step: 'Observe',
                  msg: `📡 Active in ${activeApp} · ${s.tasks.length} pending mission(s)`,
                  type: 'observe'
                })
              }
              break

            case 1: // REMEMBER
              {
                const weakCount = s.weakConcepts.length
                const streak = s.stats.streak || 1
                get().addLog({
                  step: 'Remember',
                  msg: `🧠 Memory: ${weakCount} weak concept(s) indexed · Streak: ${streak}d · XP: ${s.stats.xp}`,
                  type: 'remember'
                })
              }
              break

            case 2: // REASON
              {
                // Find topic with lowest progress
                const lowestTopic = [...(s.topicsProgress || [])].sort((a, b) => (a.progress || 0) - (b.progress || 0))[0]
                const focusNeed = lowestTopic ? `${lowestTopic.name} (${lowestTopic.progress}%)` : 'Systems Architecture'
                get().addLog({
                  step: 'Reason',
                  msg: `🧩 Priority focus identified: ${focusNeed} · Rebalancing study trajectory`,
                  type: 'reason'
                })
              }
              break

            case 3: // PLAN
              {
                const pending = s.tasks.filter(t => !t.done)
                const nextTask = pending[0]
                const taskTitle = nextTask ? (nextTask.text || nextTask.title) : 'Review dynamic systems assessment'
                get().addLog({
                  step: 'Plan',
                  msg: `🗺️ Next actionable directive: "${taskTitle}"`,
                  type: 'plan'
                })
              }
              break

            case 4: // ACT
              {
                // Proactive Socratic Nudge
                const now = Date.now()
                const lastMsg = s.chatHistory[s.chatHistory.length - 1]
                const isRecentProactive = lastMsg?.isProactive && (now - (lastMsg.id || now)) < 60000

                if (!isRecentProactive) {
                  const lowestTopic = [...(s.topicsProgress || [])].sort((a, b) => (a.progress || 0) - (b.progress || 0))[0]
                  const concept = s.weakConcepts.length > 0 
                    ? s.weakConcepts[Math.floor(Math.random() * s.weakConcepts.length)]
                    : lowestTopic ? lowestTopic.name : 'Asynchronous Concurrency'

                  const proactiveQuestions = [
                    `🎯 **Acharya Proactive Check-in** — You are progressing in **${concept}**. Can you explain what mechanism prevents race conditions in this pattern?`,
                    `💡 **Mentor Nudge** — For **${concept}**, what is the primary bottleneck when scaling under high concurrent load?`,
                    `⚡ **Focus Directives** — Ready to test your mastery of **${concept}** with a 3-question dynamic quiz?`
                  ]
                  const chosenMsg = proactiveQuestions[Math.floor(Math.random() * proactiveQuestions.length)]

                  get().addMessage({
                    role: 'assistant',
                    content: chosenMsg,
                    timestamp: new Date().toLocaleTimeString(),
                    isProactive: true,
                  })
                  get().addLog({ step: 'Act', msg: `⚡ Dispatched proactive Socratic intervention on "${concept}"`, type: 'act' })
                } else {
                  get().addLog({ step: 'Act', msg: '⚡ Standby — user focus maintained, monitoring workspace', type: 'act' })
                }
              }
              break

            case 5: // LEARN
              {
                const lastScore = s.examScore
                const feedbackMsg = lastScore != null 
                  ? `📈 Retained: last quiz score ${lastScore}% · Calibrating next assessment difficulty`
                  : '📈 Knowledge graph updated with active session metrics'
                get().addLog({
                  step: 'Learn',
                  msg: feedbackMsg,
                  type: 'learn'
                })
              }
              break
          }
        }, 8000)
      },

      stopAgentLoop: () => {
        if (_loopInterval) clearInterval(_loopInterval)
        _loopInterval = null
        set({ loopRunning: false, agentStatus: 'idle' })
        get().addLog({ step: 'System', msg: '⏹ Agent loop paused', type: 'system' })
      },

      /* ── Reset everything ── */
      resetAll: () => {
        if (_loopInterval) clearInterval(_loopInterval)
        _loopInterval = null
        set({
          profile: DEFAULT_PROFILE,
          onboardingComplete: false,
          stats: DEFAULT_STATS,
          tasks: [],
          completedTasks: [],
          weakConcepts: [],
          learningHistory: [],
          chatHistory: [],
          agentLogs: [],
          roadmap: [],
          loopRunning: false,
          agentStatus: 'idle',
          loopStep: 0,
          examMode: false,
          currentExam: null,
        })
      },
    }),
    {
      name: 'agentic-ai-mentor-store',
      partialize: (s) => ({
        profile: s.profile,
        onboardingComplete: s.onboardingComplete,
        stats: s.stats,
        tasks: s.tasks,
        completedTasks: s.completedTasks,
        topicsProgress: s.topicsProgress,
        deadlines: s.deadlines,
        schedule: s.schedule,
        pdfDocuments: s.pdfDocuments,
        totalFocusMinutes: s.totalFocusMinutes,
        screenPerceptionEnabled: s.screenPerceptionEnabled,
        weakConcepts: s.weakConcepts,
        chatHistory: s.chatHistory.slice(-50),
        roadmap: s.roadmap,
        agentLogs: s.agentLogs.slice(-20),
        mood: s.mood,
        innerMonologue: s.innerMonologue,
        memories: s.memories,
      }),
    }
  )
)

export { LOOP_STEPS }
