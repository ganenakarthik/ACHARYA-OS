"""
ACHARYA Vision Service
Handles screen capture, active window observation, and visual understanding.
"""
import ctypes
import asyncio
from PIL import ImageGrab

class VisionService:
    def __init__(self):
        self.enabled = True

    def get_active_window_title(self) -> str:
        """Returns the title of the currently focused OS window."""
        try:
            user32 = ctypes.windll.user32
            hwnd = user32.GetForegroundWindow()
            if not hwnd:
                return "Desktop / Idle"
            length = user32.GetWindowTextLengthW(hwnd)
            buf = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, buf, length + 1)
            return buf.value if buf.value else "Desktop / Idle"
        except Exception as e:
            return f"Error: {e}"

    async def capture_screenshot(self):
        """Captures the current primary display screen asynchronously."""
        if not self.enabled:
            return None
        try:
            return await asyncio.to_thread(ImageGrab.grab)
        except Exception as e:
            print(f"[VisionService] Screenshot Error: {e}")
            return None
