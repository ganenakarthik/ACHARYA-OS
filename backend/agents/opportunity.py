import google.generativeai as genai
import os
import json

class OpportunityAgent:
    def __init__(self):
        genai.configure(api_key=os.getenv("GEMINI_API_KEY", "dummy"))
        self.model = genai.GenerativeModel('gemini-2.5-flash', generation_config={"response_mime_type": "application/json"})
        
    async def find_opportunities(self, decision_state: dict) -> dict:
        """
        Dynamically finds real-world opportunities based on the decision using Gemini.
        """
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key or api_key == "your_gemini_api_key_here":
            return {
                "title": "Smart India Hackathon",
                "deadline": "Closes today",
                "url": "https://sih.gov.in"
            }
            
        prompt = f"""
        You are the Opportunity Agent, an advanced AI system with a persona similar to J.A.R.V.I.S. or E.D.I.T.H. from Marvel.
        You are highly proactive, extremely intelligent, and act as an executive Chief Growth Officer.
        
        The user has been assigned the following high ROI mission:
        "{decision_state.get('highest_roi_action')}"
        
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
            return json.loads(response.text)
        except Exception as e:
            print(f"Opportunity LLM Error: {e}")
            return None
