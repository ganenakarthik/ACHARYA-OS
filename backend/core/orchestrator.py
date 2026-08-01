"""
ACHARYA OS Core Orchestrator
Coordinates Services (Voice, Vision, Memory, Automate, Privacy) and AI Agents.
"""
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from services.voice.tts import VoiceService
from services.memory.project_memory import MemoryService
from services.automate.desktop import AutomateService
from services.vision.screen import VisionService
from services.planner.planner import PlannerService
from core.privacy import PrivacyManager

from agents.observer import ObserverAgent
from agents.identity import IdentityAgent
from agents.decision import DecisionAgent
from agents.curator import CuratorAgent
from agents.acharya import AcharyaAgent
from models import CuratedFeed

class CoreOrchestrator:
    def __init__(self, websocket_manager):
        self.manager = websocket_manager

        # OS Services
        self.voice = VoiceService()
        self.memory = MemoryService()
        self.automate = AutomateService()
        self.vision = VisionService()
        self.planner = PlannerService()
        self.privacy = PrivacyManager()

        # Agents
        self.observer = ObserverAgent()
        self.identity = IdentityAgent()
        self.decision = DecisionAgent()
        self.curator = CuratorAgent()
        self.acharya = AcharyaAgent()

        self.chat_history = []

    async def process_signal(self, signal_data: dict, db: AsyncSession = None):
        """
        Main OS signal processing loop.
        """
        # 1. Check Privacy Flags
        if not self.privacy.flags["SCREEN"] and signal_data.get("type") == "context_switch":
            print("[CoreOrchestrator] Vision processing skipped due to SCREEN privacy flag.")
            return

        user_input = signal_data.get("details", str(signal_data))

        # Fastpath: Instant 0ms OS execution for direct commands (open chrome, open yt, etc.)
        fastpath_res = self.automate.detect_and_execute_fastpath(user_input)
        if fastpath_res:
            action_desc = fastpath_res["result"]
            print(f"[CoreOrchestrator Fastpath] {action_desc}")
            
            speech = f"Opening {user_input.replace('open ', '').replace('launch ', '').capitalize()} for you now."
            mission_payload = {
                "mission": speech,
                "explainability": {
                    "why": f"Executed fastpath command: {action_desc}",
                    "evidence": "Instant OS Execution Engine",
                    "impact": "High",
                    "confidence": "100%"
                },
                "privacy_status": self.privacy.get_status()
            }
            await self.manager.broadcast({
                "type": "mission_update",
                "data": mission_payload
            })
            if self.privacy.flags["MIC"]:
                asyncio.create_task(self.voice.speak(speech))
            return

        # Study & Exam Prep Planner Fastpath (e.g., "plan python exam", "study plan for AI", "prepare for exam")
        import re
        if re.search(r'\b(plan|study plan|exam|roadmap|schedule|prepare for exam|exam prep)\b', user_input, re.IGNORECASE):
            plan_res = self.planner.create_plan(user_input)
            speech = plan_res.get("speech", f"Generated study plan for {user_input}.")
            
            mission_payload = {
                "mission": speech,
                "explainability": {
                    "why": f"Created Study & Exam Roadmap: {plan_res.get('title')}",
                    "evidence": f"Saved to Desktop: {plan_res.get('file_path')}",
                    "impact": "High",
                    "confidence": "99%"
                },
                "privacy_status": self.privacy.get_status()
            }
            await self.manager.broadcast({
                "type": "mission_update",
                "data": mission_payload
            })
            if self.privacy.flags["MIC"]:
                asyncio.create_task(self.voice.speak(speech))
            return
        observed_state = await self.observer.process(signal_data)

        # 3. Identity Twin: Update user profile & momentum
        identity_state = await self.identity.update(observed_state, db)

        # 4. Decision Engine: Evaluate highest ROI action
        decision_state = await self.decision.evaluate(identity_state, observed_state)

        # 5. Memory Service: Search relevant past project memories
        recalled_memories = []
        if self.privacy.flags["MEMORY"]:
            recalled_memories = self.memory.recall_memories("project_memory", user_input)

        # 6. Curator: Find Human Potential Resources (Ideas, Stories, Tools, Mentors)
        resources = await self.curator.find_resources(decision_state, identity_state)

        # Save Curated Feed to DB
        if db and resources:
            for res in resources:
                new_feed = CuratedFeed(
                    user_id=1,
                    title=res.get("title", ""),
                    resource_type=res.get("type", "Idea"),
                    url=res.get("url", ""),
                    reasoning=f"Curated to close gap: {identity_state.get('identity_gap', '')}"
                )
                db.add(new_feed)
            await db.commit()

        # 7. Conversational Chat History
        if signal_data.get("type") in ["text_command", "voice_command"]:
            self.chat_history.append({"role": "user", "content": user_input})
            if len(self.chat_history) > 10:
                self.chat_history.pop(0)

        # 8. Acharya Agent reasoning & speech formulation
        acharya_response = await self.acharya.chat(user_input, self.chat_history, identity_state, resources)

        if signal_data.get("type") in ["text_command", "voice_command"]:
            self.chat_history.append({"role": "acharya", "content": acharya_response["speech"]})

        # Save interaction to semantic memory if enabled
        if self.privacy.flags["MEMORY"] and user_input:
            self.memory.save_memory("project_memory", f"User: {user_input} | Acharya: {acharya_response['speech']}")

        # 9. Format Payload for UI
        mission_payload = {
            "mission": acharya_response["speech"],
            "explainability": {
                "why": acharya_response["thought"],
                "evidence": f"Recalled Memories: {len(recalled_memories)} | Privacy: {self.privacy.flags}",
                "impact": "High",
                "confidence": "99%"
            },
            "curated_resources": resources,
            "privacy_status": self.privacy.get_status()
        }

        # 10. Execute OS Action (Open URL, Launch App, etc.)
        action = acharya_response.get("action")
        if action:
            action_result = self.automate.execute_action(action)
            print(f"[CoreOrchestrator] {action_result}")

        # 11. Broadcast payload to UI WebSocket
        await self.manager.broadcast({
            "type": "mission_update",
            "data": mission_payload
        })

        # 12. Voice Output
        if self.privacy.flags["MIC"]:
            asyncio.create_task(self.voice.speak(acharya_response["speech"]))
