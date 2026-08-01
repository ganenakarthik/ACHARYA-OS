"""
ACHARYA Automate Service - Full Laptop OS Control & Human Potential Engine
Handles:
- Doom-scroll Interception & Anti-Distraction Redirection
- Human Potential Curation Filtering (Ideas, Stories, Tools, Mentors)
- Web Curation & Search (Hackathons, Python, Google, Devpost, GitHub)
- App Launching (Chrome, Notepad, Command Prompt, PowerShell, Settings, Calculator, File Explorer)
- Window Navigation & Controls (Scroll Down, Scroll Up, Close Window, Minimize Window)
- Desktop Notes & Task Tracking (Create folders, write daily notes, track progress)
"""
import webbrowser
import subprocess
import ctypes
import os
import re
import datetime
import urllib.parse
from PIL import ImageGrab

class AutomateService:
    def detect_and_execute_fastpath(self, text: str) -> dict | None:
        """
        Instantly detects and executes direct OS commands, web actions, window controls, and scrolling.
        """
        if not text:
            return None
            
        text_lower = text.lower().strip()
        text_lower = re.sub(r'[?!.,]+$', '', text_lower)

        # 1. Doom-Scroll Interceptor & Human Potential Redirection
        if re.search(r'\b(doomscroll|doom scrolling|bored|distracted|stop scrolling|wasting time)\b', text_lower):
            action = {"type": "intercept_doomscroll"}
            res = self.execute_action(action)
            return {"action": action, "result": res}

        # 2. Curation Add-ons: Idea, Story, Tool, Mentor
        if re.search(r'\b(curate idea|curate ideas|show idea|show ideas|mental model)\b', text_lower):
            action = {"type": "curate_category", "target": "Idea"}
            res = self.execute_action(action)
            return {"action": action, "result": res}

        if re.search(r'\b(curate story|curate stories|show story|show stories|founder story)\b', text_lower):
            action = {"type": "curate_category", "target": "Story"}
            res = self.execute_action(action)
            return {"action": action, "result": res}

        if re.search(r'\b(curate tool|curate tools|show tool|show tools|framework)\b', text_lower):
            action = {"type": "curate_category", "target": "Tool"}
            res = self.execute_action(action)
            return {"action": action, "result": res}

        if re.search(r'\b(curate mentor|curate mentors|show mentor|show mentors|thought leader)\b', text_lower):
            action = {"type": "curate_category", "target": "Mentor"}
            res = self.execute_action(action)
            return {"action": action, "result": res}

        # 3. Scroll Down / Scroll Up
        if "scroll down" in text_lower or "page down" in text_lower:
            action = {"type": "scroll_down"}
            res = self.execute_action(action)
            return {"action": action, "result": res}

        if "scroll up" in text_lower or "page up" in text_lower:
            action = {"type": "scroll_up"}
            res = self.execute_action(action)
            return {"action": action, "result": res}

        # 4. Close Window / Close App
        if "close window" in text_lower or "close app" in text_lower or "close active" in text_lower:
            action = {"type": "close_window"}
            res = self.execute_action(action)
            return {"action": action, "result": res}

        # 5. Hackathon Search & Apply
        if re.search(r'\b(apply|apply hackathon|apply to hackathon|hackathon|hackathons|find hackathons|search hackathons)\b', text_lower):
            action = {"type": "search_hackathons", "target": "hackathons"}
            res = self.execute_action(action)
            return {"action": action, "result": res}

        # 6. Add Daily Note
        note_match = re.search(r'^(?:add note|take note|write note|note)\s+(.+)$', text_lower)
        if note_match:
            note_text = note_match.group(1).strip()
            action = {"type": "add_note", "target": note_text}
            res = self.execute_action(action)
            return {"action": action, "result": res}

        # 7. Web Search
        search_match = re.search(r'^(?:search|google|find|look up)\s+(.+)$', text_lower)
        if search_match:
            query = search_match.group(1).strip()
            action = {"type": "web_search", "target": query}
            res = self.execute_action(action)
            return {"action": action, "result": res}

        # 8. Create Folder
        folder_match = re.search(r'^(?:create folder|make folder|create directory|make directory)\s+(.+)$', text_lower)
        if folder_match:
            folder_name = folder_match.group(1).strip()
            action = {"type": "create_folder", "target": folder_name}
            res = self.execute_action(action)
            return {"action": action, "result": res}

        # 9. Open Application or Website
        open_match = re.search(r'^(?:open|launch|start|run)\s+(.+)$', text_lower)
        if open_match:
            target = open_match.group(1).strip()
            if target in ["chrome", "google chrome", "browser", "google"]:
                action = {"type": "open_app", "target": "chrome"}
            elif target in ["youtube", "yt"]:
                action = {"type": "open_app", "target": "youtube"}
            elif target in ["notepad", "text editor", "editor"]:
                action = {"type": "open_app", "target": "notepad"}
            elif target in ["cmd", "command prompt", "terminal", "powershell"]:
                action = {"type": "open_app", "target": "terminal"}
            elif target in ["settings", "system settings"]:
                action = {"type": "open_app", "target": "settings"}
            elif target in ["calculator", "calc"]:
                action = {"type": "open_app", "target": "calc"}
            elif target in ["explorer", "files", "file explorer"]:
                action = {"type": "open_app", "target": "explorer"}
            elif target.startswith("http://") or target.startswith("https://") or target.endswith(".com") or target.endswith(".org"):
                action = {"type": "open_url", "target": target}
            else:
                action = {"type": "open_app", "target": target}
                
            res = self.execute_action(action)
            return {"action": action, "result": res}

        # 10. Screenshot
        if "screenshot" in text_lower or "capture screen" in text_lower:
            action = {"type": "screenshot", "target": "desktop"}
            res = self.execute_action(action)
            return {"action": action, "result": res}

        # 11. Minimize Window
        if "minimize" in text_lower or "hide window" in text_lower:
            action = {"type": "minimize_window", "target": "active"}
            res = self.execute_action(action)
            return {"action": action, "result": res}

        return None

    def execute_action(self, action: dict) -> str:
        """
        Executes a structured OS, Window, or Web action payload.
        """
        if not action or not isinstance(action, dict):
            return "No action to execute."

        action_type = action.get("type")
        target = str(action.get("target", "")).strip()
        target_lower = target.lower()

        try:
            if action_type == "intercept_doomscroll":
                # Intercept passive scrolling, minimize active window, and open Devpost Hackathons + Mental Model
                user32 = ctypes.windll.user32
                hwnd = user32.GetForegroundWindow()
                if hwnd:
                    user32.ShowWindow(hwnd, 6) # SW_MINIMIZE
                webbrowser.open("https://devpost.com/hackathons")
                webbrowser.open("https://fs.blog/first-principles/")
                return "Intercepted passive doom-scrolling! Redirected to Devpost Hackathons & First Principles Mental Model."

            elif action_type == "curate_category":
                if target == "Idea":
                    webbrowser.open("https://fs.blog/first-principles/")
                    return "Curated Top Idea: First Principles Thinking Mental Model."
                elif target == "Story":
                    webbrowser.open("https://devpost.com/hackathons")
                    return "Curated Top Story: Stripe Founders MVP Case Study."
                elif target == "Tool":
                    webbrowser.open("https://github.com/donnemartin/system-design-primer")
                    return "Curated Top Tool: System Design & Algorithm Primer Repository."
                elif target == "Mentor":
                    webbrowser.open("https://paulgraham.com/articles.html")
                    return "Curated Top Mentor: Paul Graham's Growth Essays."
                return f"Curated category: {target}"

            elif action_type == "scroll_down":
                user32 = ctypes.windll.user32
                user32.mouse_event(0x0800, 0, 0, -600, 0)
                return "Scrolled down active window."

            elif action_type == "scroll_up":
                user32 = ctypes.windll.user32
                user32.mouse_event(0x0800, 0, 0, 600, 0)
                return "Scrolled up active window."

            elif action_type == "close_window":
                user32 = ctypes.windll.user32
                hwnd = user32.GetForegroundWindow()
                if hwnd:
                    user32.PostMessageW(hwnd, 0x0010, 0, 0)
                    return "Closed active window."
                return "No active window to close."

            elif action_type == "search_hackathons":
                webbrowser.open("https://devpost.com/hackathons?open_to[]=public")
                webbrowser.open("https://unstop.com/hackathons")
                return "Opened Devpost & Unstop Hackathon Application portal."

            elif action_type == "add_note":
                desktop_dir = os.path.join(os.path.expanduser("~"), "Desktop")
                notes_path = os.path.join(desktop_dir, "ACHARYA_DAILY_NOTES.txt")
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
                with open(notes_path, "a", encoding="utf-8") as f:
                    f.write(f"[{timestamp}] {target}\n")
                return f"Appended daily note to Desktop: '{target}'"

            elif action_type == "web_search":
                encoded_query = urllib.parse.quote(target)
                url = f"https://www.google.com/search?q={encoded_query}"
                webbrowser.open(url)
                return f"Performed web search for: '{target}'"

            elif action_type == "open_url":
                url = target if target.startswith("http") else f"https://{target}"
                webbrowser.open(url)
                return f"Opened URL: {url}"

            elif action_type == "open_app":
                if target_lower in ["chrome", "google chrome", "browser", "google"]:
                    try:
                        webbrowser.open("https://www.google.com")
                        return "Opened Chrome / Default Browser."
                    except Exception:
                        os.system("start chrome")
                        return "Executed: start chrome"

                elif target_lower in ["yt", "youtube"]:
                    webbrowser.open("https://www.youtube.com")
                    return "Opened YouTube."

                elif target_lower in ["notepad", "editor", "text editor"]:
                    os.system("start notepad")
                    return "Opened Notepad."

                elif target_lower in ["terminal", "cmd", "command prompt", "powershell"]:
                    os.system("start wt") or os.system("start cmd")
                    return "Opened Terminal / Command Prompt."

                elif target_lower in ["settings", "system settings"]:
                    os.system("start ms-settings:")
                    return "Opened Windows Settings."

                elif target_lower in ["calc", "calculator"]:
                    os.system("start calc")
                    return "Opened Calculator."

                elif target_lower in ["explorer", "files", "file explorer"]:
                    os.system("explorer")
                    return "Opened File Explorer."

                else:
                    os.system(f"start {target}")
                    return f"Executed Windows command: start {target}"

            elif action_type == "create_folder":
                desktop_dir = os.path.join(os.path.expanduser("~"), "Desktop")
                new_folder_path = os.path.join(desktop_dir, target)
                os.makedirs(new_folder_path, exist_ok=True)
                return f"Created folder on Desktop: '{target}'"

            elif action_type == "screenshot":
                desktop_dir = os.path.join(os.path.expanduser("~"), "Desktop")
                save_path = os.path.join(desktop_dir, "ACHARYA_Screenshot.png")
                screenshot = ImageGrab.grab()
                screenshot.save(save_path)
                return f"Saved screenshot to Desktop: ACHARYA_Screenshot.png"

            elif action_type == "minimize_window":
                user32 = ctypes.windll.user32
                hwnd = user32.GetForegroundWindow()
                if hwnd:
                    user32.ShowWindow(hwnd, 6)
                    return "Minimized active window."
                return "No active window to minimize."

            else:
                return f"Unknown action type: {action_type}"

        except Exception as e:
            print(f"[AutomateService] Action Error: {e}")
            return f"Failed to execute {action_type}: {e}"
