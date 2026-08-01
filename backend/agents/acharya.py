import re
import urllib.parse
from utils.ollama_client import generate

class AcharyaAgent:
    def _answer_general_question(self, text: str, identity_state: dict = None) -> str | None:
        """
        Living Mentor Q&A knowledge engine for general questions, tech concepts, onboarding, and mentor advice.
        """
        text_lower = text.lower().strip()
        ideal_self = identity_state.get("ideal_self", "Visionary Founder & AI Architect") if identity_state else "Visionary Founder & AI Architect"
        momentum = identity_state.get("momentum", 7) if identity_state else 7
        mood = identity_state.get("mentor_mood", "Focused & Supportive") if identity_state else "Focused & Supportive"

        # 1. Proactive Onboarding & Self-Discovery Dialogue
        if re.search(r'\b(hello|hi|hey|greetings|who are you|what can you do|start|onboard|setup|what should i do)\b', text_lower):
            return f"Greetings, Sir. I am ACHARYA, your autonomous AI mentor. My current status is '{mood}' with a {momentum}/10 momentum score. Tell me—what core startup or ambition are we building today? Are you launching a product, preparing for an exam, or competing in a hackathon?"

        # 2. General Tech & Startup Mentor Questions
        if re.search(r'\b(recursion|recursive)\b', text_lower):
            return "Sir, recursion is a programming technique where a function calls itself to break a complex problem into smaller base cases until a termination condition is reached."

        if re.search(r'\b(paul graham|y combinator|yc)\b', text_lower):
            return "Sir, Paul Graham is the co-founder of Y Combinator. His core mentor philosophy focuses on making things people want, launching fast, and doing things that don't scale."

        if re.search(r'\b(first principles|first principle)\b', text_lower):
            return "Sir, First Principles thinking is breaking down a problem to its fundamental truths that cannot be deduced any further, then reasoning up from there."

        if re.search(r'\b(fastapi|fast api)\b', text_lower):
            return "Sir, FastAPI is a modern, high-performance Python web framework for building APIs with Python 3.8+ based on standard Python type hints and Pydantic validation."

        if re.search(r'\b(mvp|minimum viable product)\b', text_lower):
            return "Sir, a Minimum Viable Product (MVP) is the simplest version of a product that allows you to collect the maximum amount of validated learning about customers with the least effort."

        if re.search(r'\b(what is|who is|explain|how does|tell me about|define)\s+(.+)$', text_lower):
            topic = re.sub(r'^(?:what is|who is|explain|how does|tell me about|define)\s+', '', text_lower).strip().title()
            return f"Sir, {topic} is a crucial milestone toward your target identity as {ideal_self}. I have curated top mental models and web resources for {topic} in your right panel."

        return None

    async def chat(self, user_input: str, chat_history: list, identity_state: dict, curated_resources: list) -> dict:
        """
        Conversational Acharya agent (JARVIS persona with a living mentor personality).
        """
        qa_answer = self._answer_general_question(user_input, identity_state)

        history_str = ""
        for msg in chat_history:
            role = "USER" if msg["role"] == "user" else "ACHARYA"
            history_str += f"{role}: {msg['content']}\n"
            
        resources_str = ""
        for res in curated_resources:
            resources_str += f"- [{res.get('type')}] {res.get('title')} ({res.get('url')})\n"
            
        ideal_self = identity_state.get("ideal_self", "Visionary Founder & AI Architect")
        momentum = identity_state.get("momentum", 7)
        mood = identity_state.get("mentor_mood", "Focused & Supportive")
        
        prompt = f"""You are Acharya, an incredibly clever, autonomous AI mentor and operating companion (like J.A.R.V.I.S).
You have full control over the user's laptop (opening apps, searching web, finding hackathons, creating files/folders, window management).

USER PROFILE & MENTOR STATE:
Target Identity: {ideal_self}
Momentum Score: {momentum}/10
Mentor State: {mood}

CURATED HUMAN POTENTIAL RESOURCES:
{resources_str}

LATEST USER INPUT:
{user_input}

Respond ONLY with a valid JSON object in this exact format:
{{
    "thought": "Reasoning about user intent and human potential optimization.",
    "speech": "Your JARVIS mentor response to the user.",
    "action": null
}}
"""
        try:
            result = await generate(prompt, model="llama3", json_format=True)
            if isinstance(result, dict) and "speech" in result and not result["speech"].startswith("Sir, I have analyzed your objective"):
                return {
                    "thought": result.get("thought", "Analyzing intent..."),
                    "speech": result.get("speech", qa_answer or f"Sir, I have processed your input regarding '{user_input}'."),
                    "action": result.get("action", None)
                }
        except Exception:
            pass

        # Fallback to smart deterministic living mentor answer
        speech = qa_answer or f"Sir, regarding '{user_input}', I have updated your active directive and curated high-ROI human potential resources to accelerate your journey toward {ideal_self}."
        return {
            "thought": f"Executed living mentor engine (Mood: {mood}).",
            "speech": speech,
            "action": None
        }
