import os
import json
import re
import subprocess
from sqlalchemy.ext.asyncio import AsyncSession
from utils.ollama_client import generate

STATE_FILE = os.path.join(os.path.expanduser("~"), "ACHARYA_IDENTITY_STATE.json")

class IdentityAgent:
    def __init__(self):
        self.state = self._load_persisted_state()

    def _load_persisted_state(self) -> dict:
        if os.path.exists(STATE_FILE):
            try:
                with open(STATE_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return {
            "ideal_self": "Visionary Founder & AI Architect",
            "goals": ["Build Tech Product", "Master AI Systems"],
            "momentum": 7,
            "actions_completed": 3,
            "identity_gap_percent": 42,
            "mentor_mood": "Focused & Supportive",
            "history": []
        }

    def _save_state(self):
        try:
            with open(STATE_FILE, "w", encoding="utf-8") as f:
                json.dump(self.state, f, indent=2)
        except Exception as e:
            print(f"[IdentityAgent] Error saving state: {e}")

    def _count_completed_milestones(self) -> int:
        count = 0
        desktop_dir = os.path.join(os.path.expanduser("~"), "Desktop")
        notes_path = os.path.join(desktop_dir, "ACHARYA_DAILY_NOTES.txt")
        if os.path.exists(notes_path):
            try:
                with open(notes_path, "r", encoding="utf-8") as f:
                    count += len(f.readlines())
            except Exception:
                pass

        if os.path.exists(desktop_dir):
            try:
                plans = [f for f in os.listdir(desktop_dir) if f.startswith("ACHARYA_PLAN_")]
                count += len(plans) * 2
            except Exception:
                pass
        return count

    async def update(self, observed_state: dict, db: AsyncSession = None) -> dict:
        """
        Dynamically updates identity twin based on user's real input, active project goals, screen context, and completed actions.
        """
        raw_text = observed_state.get("details", "") or observed_state.get("text", "") or ""
        window_title = observed_state.get("window_title", "") or ""
        text_lower = (raw_text + " " + window_title).lower().strip()

        # Autonomous Behavioral Goal Detection from screen context / input
        if "startup" in text_lower or "business" in text_lower:
            self.state["ideal_self"] = "Startup Founder & Product Leader"
        elif "hackathon" in text_lower or "devpost" in text_lower:
            self.state["ideal_self"] = "Hackathon Champion & Product Builder"
        elif "java" in text_lower or "python" in text_lower or "react" in text_lower or "code" in text_lower:
            self.state["ideal_self"] = "Master Technical Architect & Engineer"
        else:
            goal_match = re.search(r'\b(?:im working on|i am working on|my goal is|i want to build|i am building|im building|my target is|target)\s+(.+)$', text_lower)
            if goal_match:
                new_target = goal_match.group(1).strip().title()
                if len(new_target) > 3:
                    self.state["ideal_self"] = new_target

        # Calculate progress dynamically based on completed actions & notes
        milestones_count = self._count_completed_milestones()
        self.state["actions_completed"] = milestones_count + len(self.state["history"]) + 1

        # Momentum calculation (1-10)
        new_momentum = min(10, max(5, 5 + (self.state["actions_completed"] // 2)))
        self.state["momentum"] = new_momentum

        # Identity Gap calculation
        new_gap = max(10, 50 - (self.state["actions_completed"] * 4))
        self.state["identity_gap_percent"] = new_gap

        # Living Mentor Persona Feeling / Mood calculation
        if new_momentum >= 8:
            self.state["mentor_mood"] = "Empowered & Proud"
        elif new_momentum >= 5:
            self.state["mentor_mood"] = "Focused & Supportive"
        else:
            self.state["mentor_mood"] = "Protective & Encouraging"

        self.state["history"].append(raw_text)
        if len(self.state["history"]) > 20:
            self.state["history"].pop(0)

        self._save_state()

        # Synchronize with PostgreSQL database if session is active
        if db:
            try:
                from sqlalchemy import select
                from models import IdentityTwin as DBIdentityTwin
                
                result = await db.execute(select(DBIdentityTwin).filter(DBIdentityTwin.user_id == 1))
                db_twin = result.scalars().first()
                
                if not db_twin:
                    db_twin = DBIdentityTwin(user_id=1)
                    db.add(db_twin)
                
                db_twin.goals = self.state.get("goals", [])
                db_twin.skills = ["Python", "React", "System Architecture"]
                db_twin.weaknesses = ["Procrastination"]
                db_twin.aspirations = [self.state["ideal_self"]]
                db_twin.habits = ["Active Execution"]
                db_twin.behavior_patterns = [{"momentum": self.state["momentum"]}]
                
                await db.commit()
                print("[IdentityAgent] Synchronized IdentityTwin state with PostgreSQL.")
            except Exception as e:
                print(f"[IdentityAgent] Database Sync Error: {e}")

        return {
            "goals": self.state["goals"],
            "skills": ["Python", "React", "System Architecture"],
            "weaknesses": ["Procrastination"],
            "aspirations": [self.state["ideal_self"]],
            "habits": ["Active Execution"],
            "momentum": self.state["momentum"],
            "ideal_self": self.state["ideal_self"],
            "identity_gap": f"{self.state['identity_gap_percent']}% Remaining to Ideal Self",
            "actions_completed": self.state["actions_completed"],
            "mentor_mood": self.state["mentor_mood"]
        }
