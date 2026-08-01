import os
import json
from utils.ollama_client import generate

# Domain-specific curated resource banks
DOMAIN_RESOURCES = {
    "startup": [
        {"title": "Mental Model: First Principles Thinking for Product Strategy", "type": "Idea", "url": "https://fs.blog/first-principles/"},
        {"title": "Story: How Stripe's Founders Built Their MVP Under Pressure", "type": "Story", "url": "https://review.firstround.com/the-stripe-story"},
        {"title": "Tool: YC Startup Application & Founder Toolkit", "type": "Tool", "url": "https://www.ycombinator.com/library"},
        {"title": "Mentor: Paul Graham's Essays on Startups, Growth & Execution", "type": "Mentor", "url": "https://paulgraham.com/articles.html"},
    ],
    "hackathon": [
        {"title": "Mental Model: How to Build in 24 Hours — Ruthless Prioritization", "type": "Idea", "url": "https://devpost.com/hackathons"},
        {"title": "Story: How Devfolio Winners Win With Minimal Teams", "type": "Story", "url": "https://devfolio.co/blog"},
        {"title": "Tool: Bolt.new — Full-Stack App in 60 Seconds", "type": "Tool", "url": "https://bolt.new"},
        {"title": "Mentor: Levels.fyi on Speed of Execution in Engineering", "type": "Mentor", "url": "https://www.levels.fyi"},
    ],
    "ai": [
        {"title": "Mental Model: The Bitter Lesson — Scale Over Clever Heuristics", "type": "Idea", "url": "https://www.incompleteideas.net/IncIdeas/BitterLesson.html"},
        {"title": "Story: How Andrej Karpathy Built MiniGPT from Scratch", "type": "Story", "url": "https://karpathy.ai"},
        {"title": "Tool: Hugging Face Transformers — Fine-tuning & Inference", "type": "Tool", "url": "https://huggingface.co/docs"},
        {"title": "Mentor: Andrew Ng's Deep Learning Specialization", "type": "Mentor", "url": "https://www.deeplearning.ai"},
    ],
    "coding": [
        {"title": "Mental Model: Clean Code — Writing Code for Humans", "type": "Idea", "url": "https://github.com/ryanmcdermott/clean-code-javascript"},
        {"title": "Story: How Linus Torvalds Built the Linux Kernel at 21", "type": "Story", "url": "https://en.wikipedia.org/wiki/History_of_Linux"},
        {"title": "Tool: System Design Primer — Architecture Roadmap 2026", "type": "Tool", "url": "https://github.com/donnemartin/system-design-primer"},
        {"title": "Mentor: NeetCode.io — Algorithmic Thinking & LeetCode Mastery", "type": "Mentor", "url": "https://neetcode.io"},
    ],
    "product": [
        {"title": "Mental Model: Jobs-to-Be-Done Framework for Product Discovery", "type": "Idea", "url": "https://jobs-to-be-done.com"},
        {"title": "Story: How Notion Went from 0 to $10B Valuation", "type": "Story", "url": "https://www.lennysnewsletter.com/p/how-notion-went-viral"},
        {"title": "Tool: Figma — Rapid UI Prototyping & Design System", "type": "Tool", "url": "https://www.figma.com"},
        {"title": "Mentor: Lenny Rachitsky's Product Newsletter", "type": "Mentor", "url": "https://www.lennysnewsletter.com"},
    ],
    "exam": [
        {"title": "Mental Model: Active Recall Beats Passive Re-Reading", "type": "Idea", "url": "https://collegeinfogeek.com/active-recall-study-technique/"},
        {"title": "Story: How Sal Khan Built a Free World-Class Education", "type": "Story", "url": "https://www.khanacademy.org/about"},
        {"title": "Tool: Anki — Spaced Repetition Flashcard System", "type": "Tool", "url": "https://apps.ankiweb.net"},
        {"title": "Mentor: Ali Abdaal on Study With Me & Exam Preparation", "type": "Mentor", "url": "https://www.youtube.com/@aliabdaal"},
    ],
}

FOCUS_TAG_MAP = {
    "python": "coding", "java": "coding", "react": "coding", "javascript": "coding",
    "machine learning": "ai", "deep learning": "ai", "llm": "ai", "nlp": "ai",
    "startup": "startup", "founder": "startup", "business": "startup", "product": "product",
    "hackathon": "hackathon", "competition": "hackathon", "devpost": "hackathon",
    "exam": "exam", "study": "exam", "test": "exam", "gate": "exam", "neet": "exam",
    "design": "product", "ux": "product", "ui": "product",
}


class CuratorAgent:
    def __init__(self):
        pass

    def _detect_domain(self, identity_state: dict) -> str:
        """Detects the best resource domain from the user's onboarding preferences."""
        domain = identity_state.get("domain", "").lower()
        focus = identity_state.get("focus", "").lower()
        ideal_self = identity_state.get("ideal_self", "").lower()

        combined = f"{domain} {focus} {ideal_self}"

        # Try to match to a known domain
        for keyword, domain_key in FOCUS_TAG_MAP.items():
            if keyword in combined:
                return domain_key

        return "startup"  # default

    async def find_resources(self, decision_state: dict, identity_state: dict) -> list:
        """
        Dynamically curates learning resources based on onboarding preferences, identity gap, and momentum.
        Uses pre-collected user preferences first (domain, focus, goal) for hyper-personalized curation.
        """
        momentum = identity_state.get('momentum', 5)
        aspirations = ", ".join(identity_state.get('aspirations', ["Visionary Technical Founder"]))
        mission = decision_state.get('highest_roi_action', 'Master Core Engineering & System Design')
        domain = identity_state.get("domain", "")
        focus = identity_state.get("focus", "")

        # If user is onboarded with a domain, use personalized bank first
        detected = self._detect_domain(identity_state)
        if detected in DOMAIN_RESOURCES:
            resources = list(DOMAIN_RESOURCES[detected])
            # Add domain/focus context to resource titles
            if domain or focus:
                tag = domain or focus
                resources[0]["title"] = f"[{tag.title()}] {resources[0]['title']}"
            return resources

        # Try AI-generated curation (Ollama)
        prompt = f"""You are the Curator Agent optimizing for HUMAN POTENTIAL.
User Target: {aspirations}
Domain: {domain or 'General'}
Focus Area: {focus or 'Startup & Tech'}
Momentum: {momentum}/10
Active Goal: {mission}

Generate a JSON array of 4 resources, one per type: Idea, Story, Tool, Mentor.
Return a JSON array of 4 objects, each with: "title", "type", "url".
Only return the JSON array, nothing else."""

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
        return DOMAIN_RESOURCES["startup"]
