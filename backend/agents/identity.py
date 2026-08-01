import os
import json
import subprocess
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import IdentityTwin
from utils.ollama_client import generate

class IdentityAgent:
    def __init__(self):
        pass
        
    def _gather_local_git_context(self) -> str:
        """
        Runs local git commands to determine recent coding behavior.
        """
        try:
            # We assume we are running inside the backend folder, so we check the parent folder or current folder.
            result = subprocess.run(
                ["git", "log", "-1", "--stat"], 
                capture_output=True, text=True, timeout=2,
                cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            )
            if result.returncode == 0:
                return f"Recent Git Commit Context:\n{result.stdout.strip()}"
            return "No recent git commit context available."
        except Exception:
            return "Git context unavailable."

    async def update(self, observed_state: dict, db: AsyncSession = None) -> dict:
        """
        Analyzes the observation and extracts identity shifts using Gemini.
        Saves the persistent state in PostgreSQL.
        """
        user_id = 1
        
        # 1. Fetch current identity twin
        current_identity = None
        if db:
            result = await db.execute(select(IdentityTwin).filter(IdentityTwin.user_id == user_id))
            current_identity = result.scalars().first()

        current_state = {
            "goals": current_identity.goals if current_identity else ["Win Hackathon"],
            "skills": current_identity.skills if current_identity else ["Python", "React"],
            "weaknesses": current_identity.weaknesses if current_identity else ["Procrastination"],
            "aspirations": current_identity.aspirations if current_identity else ["Become a visionary technical leader"],
            "habits": current_identity.habits if current_identity else ["Late night coding"],
            "behavior_patterns": current_identity.behavior_patterns if current_identity else []
        }

        # 2. Gather Local OS Git Context
        git_context = self._gather_local_git_context()

        # 3. Use LLM to evolve identity
        prompt = f"""
        You are the JARVIS Identity Manager. Your goal is to optimize for the user's Human Potential.
        The user's current identity state is: {json.dumps(current_state)}
        The user just performed this action: {json.dumps(observed_state)}
        The user's local Git environment shows: {git_context}
        
        Update their skills, weaknesses, aspirations, habits, and behavior_patterns based on this new data.
        Also calculate an 'identity_gap_analysis' - how far are their current habits and skills from their aspirations?
        
        Return a JSON object with:
        - "updated_skills": array of strings
        - "updated_weaknesses": array of strings
        - "updated_aspirations": array of strings
        - "updated_habits": array of strings
        - "momentum_score": integer 1-10 (how much momentum they have toward their aspirations)
        - "identity_gap_analysis": string (what they need to cross the chasm to their ideal self)
        """
        
        try:
            result = await generate(prompt, model="llama3", json_format=True)
            if "error" in result:
                raise Exception(result["error"])
            
            # Save to DB
            if current_identity and db:
                current_identity.skills = result.get("updated_skills", current_state["skills"])
                current_identity.weaknesses = result.get("updated_weaknesses", current_state["weaknesses"])
                current_identity.aspirations = result.get("updated_aspirations", current_state["aspirations"])
                current_identity.habits = result.get("updated_habits", current_state["habits"])
                current_identity.behavior_patterns = [{"momentum": result.get("momentum_score", 5), "gap": result.get("identity_gap_analysis", "")}]
                await db.commit()
            
            return {
                **current_state,
                "skills": result.get("updated_skills", current_state["skills"]),
                "weaknesses": result.get("updated_weaknesses", current_state["weaknesses"]),
                "aspirations": result.get("updated_aspirations", current_state["aspirations"]),
                "habits": result.get("updated_habits", current_state["habits"]),
                "momentum": result.get("momentum_score", 7),
                "ideal_self": "Visionary Technical Founder & AI Architect",
                "identity_gap": result.get("identity_gap_analysis", "42% Remaining to Ideal Self"),
                "recent_milestones": [observed_state]
            }
        except Exception as e:
            print(f"Identity Agent Error: {e}")
            return {
                **current_state,
                "momentum": 7,
                "ideal_self": "Visionary Technical Founder & AI Architect",
                "identity_gap": "42% Remaining to Ideal Self",
                "recent_milestones": [observed_state]
            }
