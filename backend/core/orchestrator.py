import asyncio
import os
import json
from sqlalchemy.ext.asyncio import AsyncSession
from core.privacy import PrivacyManager
from agents.observer import ObserverAgent
from agents.identity import IdentityAgent
from agents.decision import DecisionAgent
from agents.curator import CuratorAgent
from agents.acharya import AcharyaAgent
from services.automate.desktop import AutomateService
from services.memory.project_memory import MemoryService
from services.voice.tts import VoiceService
from services.planner.planner import PlannerService
from models import CuratedFeed

class CoreOrchestrator:
    def __init__(self, manager):
        self.manager = manager
        self.privacy = PrivacyManager()
        self.observer = ObserverAgent()
        self.identity = IdentityAgent()
        self.decision = DecisionAgent()
        self.curator = CuratorAgent()
        self.automate = AutomateService()
        self.memory = MemoryService()
        self.voice = VoiceService()
        self.acharya = AcharyaAgent()
        self.planner = PlannerService()

        self.chat_history = []

    async def process_signal(self, signal_data: dict, db: AsyncSession = None):
        """
        Main OS signal processing loop with SILENT background vision & selective voice speech.
        """
        signal_type = signal_data.get("type", "")

        # 1. Check Privacy Flags
        if not self.privacy.flags["SCREEN"] and signal_type == "context_switch":
            print("[CoreOrchestrator] Vision processing skipped due to SCREEN privacy flag.")
            return

        user_input = signal_data.get("details", str(signal_data))

        # Fastpath: Instant 0ms OS execution for direct commands (open chrome, open yt, etc.)
        fastpath_res = self.automate.detect_and_execute_fastpath(user_input)
        if fastpath_res:
            action_desc = fastpath_res["result"]
            print(f"[CoreOrchestrator Fastpath] {action_desc}")
            
            action_type = fastpath_res["action"]["type"]
            if action_type in ["open_app", "open_url"]:
                speech = f"Opening {user_input.replace('open ', '').replace('launch ', '').replace('start ', '').replace('run ', '').capitalize()} for you now."
            else:
                speech = action_desc

            # Handle Snooze Mode natively in orchestrator
            if action_type == "snooze_alerts":
                self.privacy.update_flag("MIC", False)
                self.privacy.update_flag("SCREEN", False)
                # Broadcast privacy update to UI so settings checkboxes update instantly
                await self.manager.broadcast({"type": "privacy_update", "data": self.privacy.get_status()})

                # Background task to restore privacy settings automatically after 15 minutes
                async def auto_restore_snooze():
                    await asyncio.sleep(900)
                    self.privacy.update_flag("MIC", True)
                    self.privacy.update_flag("SCREEN", True)
                    await self.manager.broadcast({"type": "privacy_update", "data": self.privacy.get_status()})
                    await self.manager.broadcast({
                        "type": "mission_update",
                        "data": {
                            "mission": "Alerts restored, Sir. I am back online.",
                            "explainability": {
                                "why": "Snooze timer expired.",
                                "evidence": "Snooze auto-restore",
                                "impact": "Low",
                                "confidence": "100%"
                            }
                        }
                    })
                asyncio.create_task(auto_restore_snooze())

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
            # Only speak if MIC wasn't turned off by this command
            if self.privacy.flags["MIC"]:
                asyncio.create_task(self.voice.speak(speech))
            return

        # Study, Exam Prep & Learning Planner Fastpath
        if signal_type in ["text_command", "voice_command"] and any(w in user_input.lower() for w in ["plan", "prepare", "study plan", "exam plan", "roadmap", "mastery"]):
            study_plan = self.planner.create_plan(user_input)
            if study_plan:
                speech = study_plan["speech"]
                mission_payload = {
                    "mission": speech,
                    "explainability": {
                        "why": f"Generated 5-Phase Action Plan for '{study_plan['title']}'",
                        "evidence": f"Created file {study_plan['file_path']} on Desktop",
                        "impact": "High",
                        "confidence": "100%"
                    },
                    "plan_phases": study_plan["phases"],
                    "privacy_status": self.privacy.get_status()
                }
                await self.manager.broadcast({
                    "type": "mission_update",
                    "data": mission_payload
                })
                if self.privacy.flags["MIC"]:
                    asyncio.create_task(self.voice.speak(speech))
                return

        # 2. Observer Agent: Process screen observation & window title SILENTLY
        observed_state = await self.observer.process(signal_data)

        # 3. Identity Twin: Update user profile & momentum
        identity_state = await self.identity.update(observed_state, db)

        # 4. Decision Engine: Evaluate highest ROI action
        decision_state = await self.decision.evaluate(identity_state, observed_state)

        # 5. Memory Service: Search relevant past project memories
        recalled_memories = []
        if self.privacy.flags["MEMORY"] and signal_type in ["text_command", "voice_command"]:
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

        # 7. Conversational Chat History (only for explicit user commands)
        is_user_command = signal_type in ["text_command", "voice_command"]

        if is_user_command:
            self.chat_history.append({"role": "user", "content": user_input})
            if len(self.chat_history) > 10:
                self.chat_history.pop(0)

            # 8. Acharya Agent reasoning & speech formulation for user input
            acharya_response = await self.acharya.chat(user_input, self.chat_history, identity_state, resources)
            self.chat_history.append({"role": "acharya", "content": acharya_response["speech"]})

            # Save interaction to semantic memory if enabled
            if self.privacy.flags["MEMORY"]:
                self.memory.save_memory("project_memory", f"User: {user_input} | Acharya: {acharya_response['speech']}")

            # Format Payload for UI
            mission_payload = {
                "mission": acharya_response["speech"],
                "explainability": {
                    "why": acharya_response["thought"],
                    "evidence": f"Recalled Memories: {len(recalled_memories)} | Privacy: {self.privacy.flags}",
                    "impact": "High",
                    "confidence": "99%"
                },
                "curated_resources": resources,
                "identity_twin": identity_state,
                "privacy_status": self.privacy.get_status()
            }

            # Execute OS Action if specified
            action = acharya_response.get("action")
            if action:
                action_result = self.automate.execute_action(action)
                print(f"[CoreOrchestrator Action] {action_result}")

            # Broadcast payload to UI WebSocket
            await self.manager.broadcast({
                "type": "mission_update",
                "data": mission_payload
            })

            # Voice Output ONLY for direct user commands!
            if self.privacy.flags["MIC"]:
                asyncio.create_task(self.voice.speak(acharya_response["speech"]))

        else:
            # SILENT BACKGROUND SCREEN & VISION UPDATES (NO VOICE OUTPUT!)
            # Only update UI Screen Context & Identity Twin silently without speaking!
            mission_payload = {
                "identity_twin": identity_state,
                "curated_resources": resources,
                "visual_context": observed_state.get("details", ""),
                "privacy_status": self.privacy.get_status()
            }

            await self.manager.broadcast({
                "type": "mission_update",
                "data": mission_payload
            })
