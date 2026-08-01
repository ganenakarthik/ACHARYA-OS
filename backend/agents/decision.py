import os
import json
import uuid
from utils.ollama_client import generate

try:
    from qdrant_client import QdrantClient
    from qdrant_client.models import PointStruct
    from sentence_transformers import SentenceTransformer
    QDRANT_AVAILABLE = True
except ImportError:
    QDRANT_AVAILABLE = False

class DecisionAgent:
    def __init__(self):
        self.memory_active = False
        if QDRANT_AVAILABLE:
            try:
                self.qdrant = QdrantClient(url="http://localhost:6333")
                self.encoder = SentenceTransformer('all-MiniLM-L6-v2')
                self.memory_active = True
            except Exception as e:
                print(f"DecisionAgent: Qdrant or Encoder failed to initialize: {e}")
            self.memory_active = False
        
    async def evaluate(self, identity_state: dict, observed_state: dict) -> dict:
        """
        The core reasoning engine using Gemini.
        Answers: What changed? Why does it matter? What's blocking growth? What's the highest ROI action?
        """

        action_summary = observed_state.get('details', '')
        
        # 1. Retrieve Past Memories
        past_memories_text = "No past memories found."
        if self.memory_active and action_summary:
            try:
                vector = self.encoder.encode(action_summary).tolist()
                search_result = self.qdrant.search(
                    collection_name="acharya_memory",
                    query_vector=vector,
                    limit=2
                )
                if search_result:
                    memories = [hit.payload.get("memory_text", "") for hit in search_result if hit.score > 0.6]
                    if memories:
                        past_memories_text = "\n".join(memories)
            except Exception as e:
                print(f"Memory Retrieval Error: {e}")

        prompt = f"""
        You are the Decision Engine Agent for an AI Growth OS. You have the persona of J.A.R.V.I.S. from Marvel.
        You are highly proactive, extremely intelligent, and act as the user's executive Chief Growth Officer.
        Analyze the user's updated identity and their most recent action.
        Determine the absolute highest ROI next action for them to take right now to grow.
        
        Identity State: {json.dumps(identity_state)}
        Latest Action: {action_summary}
        
        Past Behavioral Memories (Reference these if relevant to their current action):
        {past_memories_text}
        
        Phrase the 'highest_roi_action' proactively and directly to the user as JARVIS would.
        If a past memory is relevant, explicitly reference it.
        Example: "Sir, I noticed you are procrastinating on Netflix again. Last Tuesday, this exact pattern delayed your Hackathon submission. I strongly recommend we get back to work."

        
        Return a JSON object with:
        - "what_changed": string (a short sentence on what shifted based on the action)
        - "why_it_matters": string (how this affects their trajectory)
        - "bottleneck": string (what is holding them back right now)
        - "highest_roi_action": string (the proactive JARVIS voice payload)
        - "reasoning": string (why this action)
        - "impact": string (High, Medium, Low)
        - "confidence": string (percentage)
        - "minimize_distraction": boolean (Set this to true ONLY if the user is severely procrastinating and JARVIS needs to forcefully minimize their active window to save them. Use sparingly.)
        - "code_fix": string or null (If the visual context shows a clear programming bug, stack trace, or error, write the raw code to fix it here. Otherwise, null.)
        - "os_action": object or null (If the user explicitly asks to open an app like Notepad/Chrome or create a folder, return an object like {{"type": "open_app", "target": "notepad"}} or {{"type": "create_folder", "target": "Desktop/Hackathon"}}. Otherwise null.)
        """
        
        try:
            result = await generate(prompt, model="llama3", json_format=True)
            if "error" in result:
                raise Exception(result["error"])
            
            # 2. Save new memory
            if self.memory_active and action_summary:
                try:
                    memory_text = f"Action: {action_summary} | JARVIS Response: {result.get('highest_roi_action')}"
                    vector = self.encoder.encode(action_summary).tolist()
                    self.qdrant.upsert(
                        collection_name="acharya_memory",
                        points=[
                            PointStruct(
                                id=str(uuid.uuid4()),
                                vector=vector,
                                payload={"memory_text": memory_text}
                            )
                        ]
                    )
                except Exception as e:
                    print(f"Memory Save Error: {e}")
            
            return result
        except Exception as e:
            print(f"Decision Agent Error: {e}")
            return {
                "what_changed": "System encountered an error.",
                "why_it_matters": "Fallback used.",
                "bottleneck": "Unknown",
                "highest_roi_action": "System Offline",
                "reasoning": f"Local LLM Error: {str(e)}",
                "impact": "Low",
                "confidence": "0%",
                "minimize_distraction": False,
                "code_fix": None
            }
