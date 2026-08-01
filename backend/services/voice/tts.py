"""
ACHARYA Voice Service
Handles TTS (Text-to-Speech) output with a clear, calm voice.
Safely falls back if pyttsx3 is not installed in environment.
"""
import asyncio

try:
    import pyttsx3
    PYTTSX3_AVAILABLE = True
except ImportError:
    PYTTSX3_AVAILABLE = False
    print("[VoiceService] Notice: pyttsx3 not installed. Voice TTS disabled (UI text mode active).")

class VoiceService:
    def __init__(self):
        # Disabled by default because the frontend React UI already handles high-fidelity HTML5 SpeechSynthesis.
        # Keeping it True causes double voice echoes and SAPI5 thread locks on rapid calls.
        self.enabled = False

    def _speak_sync(self, text: str):
        """Runs synchronously in a thread."""
        if not self.enabled or not PYTTSX3_AVAILABLE:
            return
        try:
            engine = pyttsx3.init()
            voices = engine.getProperty('voices')
            for voice in voices:
                if "zira" in voice.name.lower() or "female" in voice.name.lower():
                    engine.setProperty('voice', voice.id)
                    break
            engine.setProperty('rate', 185)
            engine.say(text)
            engine.runAndWait()
        except Exception as e:
            print(f"[VoiceService] TTS Error: {e}")

    async def speak(self, text: str):
        """Async wrapper to speak text without blocking the event loop."""
        if PYTTSX3_AVAILABLE and self.enabled:
            await asyncio.to_thread(self._speak_sync, text)
