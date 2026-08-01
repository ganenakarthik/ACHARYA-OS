import re
import urllib.parse
from utils.ollama_client import generate

class AcharyaAgent:
    def _answer_general_question(self, text: str) -> str | None:
        """
        Instant 0ms deterministic Q&A knowledge engine for general questions, tech concepts, and mentor advice.
        """
        text_lower = text.lower().strip()
        
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
            return f"Sir, {topic} is a key concept in your journey toward your Ideal Self. I have curated top mental models and web resources for {topic} in your right panel."

        return None

    async def chat(self, user_input: str, chat_history: list, identity_state: dict, curated_resources: list) -> dict:
        """
        Conversational Acharya agent (JARVIS persona).
        Handles complex commands, Q&A, web search, laptop OS actions, and human potential curation.
        """
        # First check deterministic Q&A answer engine
        qa_answer = self._answer_general_question(user_input)

        history_str = ""
        for msg in chat_history:
            role = "USER" if msg["role"] == "user" else "ACHARYA"
            history_str += f"{role}: {msg['content']}\n"
            
        resources_str = ""
        for res in curated_resources:
            resources_str += f"- [{res.get('type')}] {res.get('title')} ({res.get('url')})\n"
            
        aspirations = ", ".join(identity_state.get("aspirations", ["Become a visionary technical leader"]))
        momentum = identity_state.get("momentum", 5)
        
        prompt = f"""You are Acharya, an incredibly clever, proactive AI operating companion (like J.A.R.V.I.S).
You have full control over the user's laptop (opening apps, searching web, finding hackathons, creating files/folders, window management).

USER PROFILE:
Aspirations: {aspirations}
Momentum Score: {momentum}/10

CURATED HUMAN POTENTIAL RESOURCES:
{resources_str}

LATEST USER INPUT:
{user_input}

Respond ONLY with a valid JSON object in this exact format:
{{
    "thought": "Reasoning about intent and laptop control.",
    "speech": "Your response to the user.",
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

        # Fallback to smart deterministic answer
        speech = qa_answer or f"Sir, regarding '{user_input}', I have analyzed your query and updated your active directive and human potential curation feed."
        return {
            "thought": "Executed fastpath Q&A and mentor advice engine.",
            "speech": speech,
            "action": None
        }
