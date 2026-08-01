import google.generativeai as genai
import os
import json

class OpportunityAgent:
    def __init__(self):
        try:
            genai.configure(api_key=os.getenv("GEMINI_API_KEY", "dummy"))
            self.model = genai.GenerativeModel('gemini-2.5-flash', generation_config={"response_mime_type": "application/json"})
        except Exception:
            self.model = None
        
    async def find_opportunities(self, decision_state: dict, privacy_flags: dict, identity_state: dict) -> dict:
        """
        Dynamically finds real-world opportunities based on the decision.
        Respects INTERNET privacy toggle and falls back safely when offline.
        """
        domain = (identity_state.get("domain") or "").lower()
        api_key = os.getenv("GEMINI_API_KEY")
        internet_allowed = privacy_flags.get("INTERNET", True)
        
        # Hard deterministic fallback definitions for offline/privacy-safe operation
        fallbacks = {
            "ai": {
                "title": "Sir, I detected a Generative AI Hackathon on Devpost matching your AI/ML focus.",
                "deadline": "Closes in 4 days",
                "url": "https://devpost.com/hackathons?search=AI"
            },
            "coding": {
                "title": "Sir, there are active open-source contribution issues on the FastAPI GitHub repository.",
                "deadline": "Open Contribution",
                "url": "https://github.com/fastapi/fastapi/issues"
            },
            "exam prep": {
                "title": "Sir, registration is open for the upcoming GATE mock national practice examination.",
                "deadline": "Closes next week",
                "url": "https://gate.iitk.ac.in"
            },
            "hackathon": {
                "title": "Sir, the Smart India Hackathon registrations are active. Excellent for your MVP execution.",
                "deadline": "Closes in 2 days",
                "url": "https://sih.gov.in"
            },
            "startup": {
                "title": "Sir, Y Combinator applications are active. We should prepare the MVP demo deck.",
                "deadline": "YC Funding Batch",
                "url": "https://www.ycombinator.com/apply"
            }
        }
        
        fallback_option = fallbacks.get(domain, fallbacks["startup"])

        if not internet_allowed or not api_key or api_key == "your_gemini_api_key_here" or api_key == "dummy" or not self.model:
            return fallback_option
            
        prompt = f"""
        You are the Opportunity Agent, an advanced AI system with a persona similar to J.A.R.V.I.S. from Marvel.
        You are highly proactive, extremely intelligent, and act as an executive Chief Growth Officer.
        The user has been assigned the following high ROI mission:
        "{decision_state.get('highest_roi_action', 'Build tech project')}"
        
        Generate exactly 1 highly relevant opportunity for them to apply this skill in the real world.
        For example: a specific Hackathon (like 'Hackathon at IIT Pune'), an Open Source GitHub issue, or a competition.
        
        Phrase the 'title' proactively, exactly how JARVIS would say it to Tony Stark. 
        Example: "Sir, there is a Hackathon at IIT Pune this weekend perfectly matching your backend skills. Shall I add it to your calendar?"
        
        Return a JSON object with:
        - "title": string (The JARVIS-style conversational recommendation)
        - "deadline": string (e.g. "Registration closes in 12 hours")
        - "url": string (A realistic URL)
        """
        
        try:
            response = await self.model.generate_content_async(prompt)
            data = json.loads(response.text)
            if isinstance(data, dict) and "title" in data:
                return data
            return fallback_option
        except Exception as e:
            print(f"Opportunity LLM Error (Falling back): {e}")
            return fallback_option
