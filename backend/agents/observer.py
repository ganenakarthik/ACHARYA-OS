import asyncio
import ctypes
import time
import os
import google.generativeai as genai
from PIL import ImageGrab
from sqlalchemy.ext.asyncio import AsyncSession

class ObserverAgent:
    def __init__(self):
        self.last_window_title = ""
        self.current_context_start_time = time.time()
        genai.configure(api_key=os.getenv("GEMINI_API_KEY", "dummy"))
        self.vision_model = genai.GenerativeModel('gemini-2.5-flash')
        
    def get_active_window_title(self) -> str:
        """
        Uses Windows ctypes to get the active window title.
        """
        try:
            user32 = ctypes.windll.user32
            hwnd = user32.GetForegroundWindow()
            if not hwnd:
                return "Unknown"
            length = user32.GetWindowTextLengthW(hwnd)
            buf = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, buf, length + 1)
            return buf.value if buf.value else "Unknown"
        except Exception as e:
            return f"Error: {str(e)}"

    async def run_background_observation(self, orchestrator, db: AsyncSession = None):
        """
        Continuously polls the active window. Triggers a signal if a significant shift occurs.
        """
        print("Observer Agent: Starting real-time background observation...")
        while True:
            await asyncio.sleep(5) # Poll every 5 seconds
            
            current_title = self.get_active_window_title()
            
            # Filter out empty or unchanged titles
            if not current_title or current_title == "Unknown":
                continue
                
            if current_title != self.last_window_title:
                duration_spent = time.time() - self.current_context_start_time
                
                # If they spent more than a few seconds in the last window, it's a context shift
                if self.last_window_title and duration_spent > 15:
                    print(f"Observer Agent: Context shift detected! Spent {int(duration_spent)}s on '{self.last_window_title}'. Now on '{current_title}'")
                    
                    # God-Mode: Capture screen and analyze visual context
                    visual_context = "Vision scanning disabled due to privacy settings."
                    if orchestrator.privacy.flags.get("SCREEN", True):
                        try:
                            print("Observer Agent: Capturing screen for God-Mode Vision...")
                            # Run screenshot in a separate thread so we don't block the loop
                            screenshot = await asyncio.to_thread(ImageGrab.grab)
                            
                            prompt = "You are JARVIS. Describe exactly what the user is looking at on this screen in 1 short, highly factual sentence. Do not mention that this is a screenshot."
                            response = await self.vision_model.generate_content_async([prompt, screenshot])
                            visual_context = response.text.strip()
                            print(f"Vision Analysis: {visual_context}")
                        except Exception as e:
                            print(f"Vision API Error: {e}")
                    else:
                        print("Observer Agent: Skipping screen vision analysis due to SCREEN privacy flag.")
                    
                    signal_data = {
                        "type": "context_switch",
                        "details": f"User spent {int(duration_spent)}s focused on '{self.last_window_title}' and switched to '{current_title}'. On-screen context: {visual_context}",
                        "timestamp": time.time()
                    }
                    
                    # Create a DB session and trigger orchestrator
                    from database import AsyncSessionLocal
                    async def process_with_db():
                        async with AsyncSessionLocal() as session:
                            await orchestrator.process_signal(signal_data, session)
                    
                    asyncio.create_task(process_with_db())
                
                # Reset tracking
                self.last_window_title = current_title
                self.current_context_start_time = time.time()

    async def process(self, signal_data: dict) -> dict:
        """
        Parses the generated signal into a structured observation.
        """
        return {
            "event_type": signal_data.get("type", "unknown"),
            "details": signal_data.get("details", ""),
            "timestamp": signal_data.get("timestamp", "")
        }
