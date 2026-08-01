import os
import json
from utils.ollama_client import generate

class CuratorAgent:
    def __init__(self):
        pass
        
    async def find_resources(self, decision_state: dict, identity_state: dict) -> list:
        """
        Dynamically curates learning resources based on the identity gap and current momentum.
        Optimizes strictly for HUMAN POTENTIAL (Idea, Story, Tool, Mentor).
        """
        momentum = identity_state.get('momentum', 5)
        aspirations = ", ".join(identity_state.get('aspirations', ["Visionary Technical Founder"]))
        mission = decision_state.get('highest_roi_action', 'Master Core Engineering & System Design')

        prompt = f"""You are the Curator Agent, an advanced AI system optimizing for HUMAN POTENTIAL instead of attention.
Your goal: Help the user cross the 'Identity Gap' between who they are today and who they aspire to become ({aspirations}).

USER CONTEXT:
Momentum Score: {momentum}/10
Active Focus: {mission}

Generate a JSON array of 4 distinct Human Potential resources (one of each type):
1. "Idea": Paradigm shift or core mental model.
2. "Story": Inspiring case study of a pioneer or founder who overcame a similar bottleneck.
3. "Tool": Tactical framework, open-source tool, or practice repository.
4. "Mentor": World-class thinker or expert to follow for ongoing guidance.

Format requirement: Return a JSON array of 4 objects, each containing:
- "title": string (Actionable, inspiring recommendation)
- "type": string ("Idea", "Story", "Tool", "Mentor")
- "url": string (Valid web link or search link)
"""
        try:
            result = await generate(prompt, model="llama3", json_format=True)
            if isinstance(result, list) and len(result) > 0:
                return result
            elif isinstance(result, dict) and "resources" in result:
                return result["resources"]
            else:
                return self._fallback_curation(aspirations, momentum)
        except Exception as e:
            print(f"Curator Agent Error: {e}")
            return self._fallback_curation(aspirations, momentum)

    def _fallback_curation(self, aspirations: str, momentum: int) -> list:
        return [
            {
                "title": "Mental Model: First Principles Thinking for AI Architecture",
                "type": "Idea",
                "url": "https://fs.blog/first-principles/"
            },
            {
                "title": "Case Study: How Stripe's Founders Built Their MVP Under Pressure",
                "type": "Story",
                "url": "https://devpost.com/hackathons"
            },
            {
                "title": "Tactical Toolkit: System Design & Algorithm Roadmap 2026",
                "type": "Tool",
                "url": "https://github.com/donnemartin/system-design-primer"
            },
            {
                "title": "Mentor Profile: Follow Paul Graham's Essays on Growth & Execution",
                "type": "Mentor",
                "url": "https://paulgraham.com/articles.html"
            }
        ]
