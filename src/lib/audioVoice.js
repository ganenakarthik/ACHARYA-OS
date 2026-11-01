/* ================================================================
   ACHARYA NEURAL AUDIO & VOICE ENGINE
   Long-Form Charismatic Speech Narration ("Big Speaking")
   Web Audio API Cybernetic Synthesizer · Sentence Pipelining
   ================================================================ */

let activeSpeechQueue = []
let isSpeakingActive = false
let keepAliveTimer = null
let sharedAudioCtx = null

/* ── 0. CYBERNETIC WEB AUDIO SYNTHESIZER (Acharya Chimes) ── */
export function playCyberChime(type = 'affirm') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    if (!sharedAudioCtx || sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx = new AudioCtx()
      if (sharedAudioCtx.state === 'suspended') {
        sharedAudioCtx.resume().catch(() => {})
      }
    }

    const ctx = sharedAudioCtx
    const now = ctx.currentTime

    if (type === 'boot') {
      // Acharya HUD initialization power-up hum
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(140, now)
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.35)
      gain.gain.setValueAtTime(0.01, now)
      gain.gain.linearRampToValueAtTime(0.2, now + 0.1)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.45)

      // Sub-harmonic chord
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'triangle'
      osc2.frequency.setValueAtTime(280, now + 0.1)
      osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.4)
      gain2.gain.setValueAtTime(0.01, now + 0.1)
      gain2.gain.linearRampToValueAtTime(0.15, now + 0.25)
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(now + 0.1)
      osc2.stop(now + 0.5)
    } else if (type === 'affirm' || type === 'action') {
      // Crisp tactical HUD confirmation
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, now) // D5
      osc.frequency.setValueAtTime(880, now + 0.08) // A5
      gain.gain.setValueAtTime(0.15, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.22)
    } else if (type === 'alarm' || type === 'alert') {
      // Cybernetic alert ping
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(880, now)
      osc.frequency.linearRampToValueAtTime(440, now + 0.25)
      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.3)
    } else if (type === 'scan' || type === 'matrix') {
      // Holographic lens frequency chirp
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(1200, now)
      osc.frequency.exponentialRampToValueAtTime(2400, now + 0.12)
      gain.gain.setValueAtTime(0.12, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.16)
    }
  } catch (e) {
    console.warn('CyberChime audio notice:', e)
  }
}

let currentAudioPlayer = null

export function getBestFemaleVoice() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices || voices.length === 0) return null

  // 1. Prioritize natural Windows / Chrome female English voices
  const prioritizedFemale = voices.find(v => 
    v.lang.startsWith('en') && (
      /zira/i.test(v.name) ||
      /jenny/i.test(v.name) ||
      /aria/i.test(v.name) ||
      /samantha/i.test(v.name) ||
      /victoria/i.test(v.name) ||
      /karen/i.test(v.name) ||
      /hazel/i.test(v.name) ||
      /catherine/i.test(v.name) ||
      /female/i.test(v.name)
    )
  )

  if (prioritizedFemale) return prioritizedFemale

  // 2. Filter out explicitly male voices
  const nonMaleEnglish = voices.find(v => 
    v.lang.startsWith('en') && !/david|george|mark|richard|oliver|guy|male|james|ravi/i.test(v.name)
  )
  if (nonMaleEnglish) return nonMaleEnglish

  // 3. Fallback to any English voice
  return voices.find(v => v.lang.startsWith('en')) || voices[0]
}

/* ── 1. ULTRA-CLARITY STUDIO NEURAL VOICE & SPEECH SYNTHESIS (FEMALE) ── */
export function speakText(text, options = {}) {
  // Cancel any ongoing speech immediately — completely eliminates dual/overlapping voices
  stopSpeaking()

  if (!text || !text.trim()) return

  // Play subtle tactical audio chime
  playCyberChime('affirm')

  // Check for explicit [SPOKEN: ...] tag for concise, executive-level speech
  let textToSpeak = text
  const spokenTagMatch = text.match(/\[SPOKEN:\s*([\s\S]*?)\]/i)
  if (spokenTagMatch) {
    textToSpeak = spokenTagMatch[1].trim()
  }

  // Clean markdown, symbols, and formatting for articulate verbal speech
  let clean = textToSpeak
    .replace(/\[MOOD:[^\]]*\]/gi, '')
    .replace(/\[THOUGHT:[^\]]*\]/gi, '')
    .replace(/\[SPOKEN:[^\]]*\]/gi, '')
    .replace(/\[ACTION:[^\]]*\]/gi, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[#*_~>-]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\\([()[\]{}])/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  // For long technical markdown without a spoken tag, take the first 2 crisp sentences (max 180 chars)
  if (!spokenTagMatch) {
    const sentences = clean.match(/[^.!?]+(?:[.!?]+|$)/g) || [clean]
    clean = sentences.slice(0, 2).join(' ').trim()
    if (clean.length > 200) {
      clean = clean.slice(0, 195).trim() + '.'
    }
  }

  if (!clean || typeof window === 'undefined' || !('speechSynthesis' in window)) return

  try {
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(clean)
    const femaleVoice = getBestFemaleVoice()
    if (femaleVoice) {
      utterance.voice = femaleVoice
    }

    utterance.pitch = 1.08 // Crisp, bright, articulate female tone
    utterance.rate = options.rate || 1.04 // Smooth, natural academic pacing
    utterance.volume = options.volume !== undefined ? options.volume : 1.0

    utterance.onstart = () => {
      isSpeakingActive = true
      if (options.onStart) options.onStart()
    }

    utterance.onend = () => {
      isSpeakingActive = false
      if (options.onEnd) options.onEnd()
    }

    utterance.onerror = () => {
      isSpeakingActive = false
      if (options.onEnd) options.onEnd()
    }

    window.speechSynthesis.speak(utterance)
  } catch (err) {
    console.warn('Speech synthesis notice:', err)
  }
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel()
    } catch (_) {}
  }
  if (currentAudioPlayer) {
    try {
      currentAudioPlayer.pause()
      currentAudioPlayer.currentTime = 0
    } catch (_) {}
    currentAudioPlayer = null
  }
  isSpeakingActive = false
  activeSpeechQueue = []
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer)
    keepAliveTimer = null
  }
}

export function isSpeaking() {
  return isSpeakingActive
}

export function getSystemVoices() {
  if (!('speechSynthesis' in window)) return []
  return window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'))
}

/* ── 2. SPEECH-TO-TEXT (STT) ── */
export function startSTT(arg1, arg2, arg3) {
  let onResult, onInterim, onError, onEnd
  if (typeof arg1 === 'function') {
    onResult = arg1
    onEnd = arg2
    onError = arg3
  } else if (arg1 && typeof arg1 === 'object') {
    onResult = arg1.onResult
    onInterim = arg1.onInterim
    onError = arg1.onError
    onEnd = arg1.onEnd
  }

  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    if (onError) onError(new Error('Speech recognition not supported in browser.'))
    return null
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  const recognition = new SR()
  recognition.lang = 'en-US'
  recognition.interimResults = true
  recognition.continuous = false

  recognition.onresult = (event) => {
    let interimTranscript = ''
    let finalTranscript = ''

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript
      } else {
        interimTranscript += event.results[i][0].transcript
      }
    }

    if (interimTranscript && onInterim) onInterim(interimTranscript)
    if (finalTranscript && onResult) onResult(finalTranscript)
  }

  recognition.onerror = (err) => {
    if (onError) onError(err)
    if (onEnd) onEnd()
  }

  recognition.onend = () => {
    if (onEnd) onEnd()
  }

  try {
    recognition.start()
    return recognition
  } catch (err) {
    if (onError) onError(err)
    return null
  }
}

/* ── 3. REAL-TIME MICROPHONE AUDIO ANALYSER (Web Audio API) ── */
let micStream = null
let analyser = null
let freqDataArray = null

export async function initMicAudioAnalyser(onAudioLevel) {
  try {
    if (!navigator.mediaDevices?.getUserMedia) return null
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    sharedAudioCtx = new AudioCtx()
    analyser = sharedAudioCtx.createAnalyser()
    analyser.fftSize = 64

    const source = sharedAudioCtx.createMediaStreamSource(micStream)
    source.connect(analyser)

    freqDataArray = new Uint8Array(analyser.frequencyBinCount)

    let animationFrameId
    const sample = () => {
      if (!analyser) return
      analyser.getByteFrequencyData(freqDataArray)
      let sum = 0
      for (let i = 0; i < freqDataArray.length; i++) {
        sum += freqDataArray[i]
      }
      const average = sum / freqDataArray.length
      if (onAudioLevel) onAudioLevel(average, Array.from(freqDataArray.slice(0, 12)))
      animationFrameId = requestAnimationFrame(sample)
    }
    sample()

    return () => {
      cancelAnimationFrame(animationFrameId)
      if (micStream) micStream.getTracks().forEach(t => t.stop())
      if (sharedAudioCtx) sharedAudioCtx.close()
    }
  } catch (e) {
    console.warn('Mic audio analyser initialization notice:', e)
    return null
  }
}
