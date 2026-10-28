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

/* ── 1. ULTRA-CLARITY STUDIO NEURAL VOICE & SPEECH SYNTHESIS ── */
export function speakText(text, options = {}) {
  // Cancel any ongoing speech immediately
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

  if (!clean) return

  const persona = options.persona || 'acharya'
  const lang = 'en-gb'
  const neuralUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(clean)}`

  // 1. Primary High-Definition Neural Studio Audio Stream
  try {
    const audio = new Audio(neuralUrl)
    currentAudioPlayer = audio
    audio.playbackRate = options.rate || 1.15 // Fast, snappy, energetic delivery
    audio.volume = options.volume !== undefined ? options.volume : 1.0

    audio.onplay = () => {
      isSpeakingActive = true
      if (options.onStart) options.onStart()
    }

    audio.onended = () => {
      isSpeakingActive = false
      currentAudioPlayer = null
      if (options.onEnd) options.onEnd()
    }

    audio.onerror = () => {
      console.warn('Neural audio stream error, engaging offline SAPI fallback.')
      fallbackWebSpeech(clean, options)
    }

    const playPromise = audio.play()
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Audio auto-play notice, engaging offline SAPI fallback:', err)
        fallbackWebSpeech(clean, options)
      })
    }
  } catch (e) {
    fallbackWebSpeech(clean, options)
  }
}

/* ── Offline SAPI5 Web Speech API Fallback ── */
function fallbackWebSpeech(cleanText, options = {}) {
  if (!('speechSynthesis' in window)) return

  const rawSentences = cleanText.match(/[^.!?]+(?:[.!?]+|$)/g) || [cleanText]
  activeSpeechQueue = rawSentences.map(s => s.trim()).filter(s => s.length > 0)
  if (activeSpeechQueue.length === 0) return

  isSpeakingActive = true
  if (options.onStart) options.onStart()

  let currentIndex = 0
  const persona = options.persona || 'acharya'

  function speakNextChunk() {
    if (!isSpeakingActive || currentIndex >= activeSpeechQueue.length) {
      stopSpeaking()
      if (options.onEnd) options.onEnd()
      return
    }

    const chunk = activeSpeechQueue[currentIndex]
    currentIndex++

    const utterance = new SpeechSynthesisUtterance(chunk)
    const voices = window.speechSynthesis.getVoices()
    let chosenVoice = voices.find(v => v.lang.startsWith('en') && (
      v.name.includes('Hazel') ||
      v.name.includes('George') ||
      v.name.includes('Oliver') ||
      v.lang === 'en-GB'
    )) || voices.find(v => v.lang.startsWith('en'))
    utterance.pitch = 1.02
    utterance.rate = 1.15

    if (chosenVoice) utterance.voice = chosenVoice
    utterance.volume = options.volume !== undefined ? options.volume : 1.0

    utterance.onend = () => speakNextChunk()
    utterance.onerror = () => speakNextChunk()

    window.speechSynthesis.speak(utterance)
  }

  speakNextChunk()
}

export function stopSpeaking() {
  if (currentAudioPlayer) {
    try {
      currentAudioPlayer.pause()
      currentAudioPlayer.currentTime = 0
    } catch (_) {}
    currentAudioPlayer = null
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
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
