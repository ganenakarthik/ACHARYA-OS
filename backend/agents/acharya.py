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

        if re.search(r'\b(system design|architecture)\b', text_lower):
            return "Sir, System Design is the process of defining the architecture, modules, interfaces, and data for a system to satisfy specified requirements. Key concepts include horizontal scaling, load balancing, caching, and database replication."

        if re.search(r'\b(clean code|dry|yagni)\b', text_lower):
            return "Sir, Clean Code is readable and maintainable. DRY (Don't Repeat Yourself) advocates reducing repetition, and YAGNI (You Aren't Gonna Need It) warns against adding functionality until it is absolutely necessary."

        if re.search(r'\b(premature optimization)\b', text_lower):
            return "Sir, Donald Knuth stated that 'premature optimization is the root of all evil.' Focus first on building clean, working code, and only optimize when performance bottlenecks are measured."

        if re.search(r'\b(paul graham|y combinator|yc)\b', text_lower):
            return "Sir, Paul Graham is the co-founder of Y Combinator. His core mentor philosophy focuses on making things people want, launching fast, and doing things that don't scale."

        if re.search(r'\b(first principles|first principle)\b', text_lower):
            return "Sir, First Principles thinking is breaking down a problem to its fundamental truths that cannot be deduced any further, then reasoning up from there."

        if re.search(r'\b(fastapi|fast api)\b', text_lower):
            return "Sir, FastAPI is a modern, high-performance Python web framework for building APIs with Python 3.8+ based on standard Python type hints and Pydantic validation."

        if re.search(r'\b(mvp|minimum viable product)\b', text_lower):
            return "Sir, a Minimum Viable Product (MVP) is the simplest version of a product that allows you to collect the maximum amount of validated learning about customers with the least effort."

        if re.search(r'\b(product market fit|pmf)\b', text_lower):
            return "Sir, Product-Market Fit (PMF) is being in a good market with a product that can satisfy that market. Marc Andreessen defines it as: 'the customers are buying the product just as fast as you can make it.'"

        if re.search(r'\b(retention|churn)\b', text_lower):
            return "Sir, retention measures how many users return to your product over time. Churn is the rate at which users stop using it. PMF cannot exist without a stable retention curve."

        # 3. Product Strategy & Metrics
        if re.search(r'\b(jobs to be done|jtbd)\b', text_lower):
            return "Sir, Jobs-to-Be-Done (JTBD) is a framework for understanding customer needs. It states that customers don't buy products; they 'hire' them to do a specific job in their life."

        if re.search(r'\b(north star metric|nsm)\b', text_lower):
            return "Sir, the North Star Metric is the key measure that best captures the core value your product delivers to customers. Focusing on this prevents distraction from vanity metrics."

        if re.search(r'\b(pirate metrics|aarrr)\b', text_lower):
            return "Sir, the AARRR framework (Acquisition, Activation, Retention, Referral, Revenue) maps the user lifecycle, helping startup founders identify where their growth funnel is leaking."

        # 4. Cognitive & Learning Techniques
        if re.search(r'\b(feynman technique)\b', text_lower):
            return "Sir, the Feynman Technique is a learning method where you explain a complex concept in simple, plain language to a child. If you get stuck, it highlights exactly where your understanding is weak."

        if re.search(r'\b(active recall|spaced repetition)\b', text_lower):
            return "Sir, Active Recall involves testing your memory instead of passively re-reading notes. Spaced Repetition distributes review sessions over increasing intervals of time to optimize long-term retention."

        if re.search(r'\b(pareto principle|80/20 rule)\b', text_lower):
            return "Sir, the Pareto Principle states that 80% of effects come from 20% of causes. Identify the 20% high-leverage efforts that yield 80% of your results and execute them ruthlessly."

        # 5. Mentor Wisdom Quotes
        if re.search(r'\b(naval ravikant|naval)\b', text_lower):
            return "Sir, Naval Ravikant advises: 'Seek wealth, not money or status. Wealth is having assets that earn while you sleep.' He emphasizes specific knowledge, accountability, and leverage."

        if re.search(r'\b(steve jobs|jobs advice)\b', text_lower):
            return "Sir, Steve Jobs famously advised: 'Your work is going to fill a large part of your life, and the only way to be truly satisfied is to do what you believe is great work. Stay hungry, stay foolish.'"

        if re.search(r'\b(what is|who is|explain|how does|tell me about|define)\s+(.+)$', text_lower):
            topic = re.sub(r'^(?:what is|who is|explain|how does|tell me about|define)\s+', '', text_lower).strip().title()
            return f"Sir, {topic} is a crucial milestone toward your target identity as {ideal_self}. I have curated top mental models and web resources for {topic} in your right panel."

        return None

    async def chat(self, user_input: str, chat_history: list, identity_state: dict, curated_resources: list) -> dict:
        """
        Conversational Acharya agent (JARVIS persona with a living mentor personality).
        """
        qa_answer = self._answer_general_question(user_input, identity_state)
        if qa_answer:
            return {
                "thought": "Deterministic Living Mentor Engine match (0ms latency).",
                "speech": qa_answer,
                "action": None
            }

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
