from utils.ollama_client import generate

class AcharyaAgent:
    async def chat(self, user_input: str, chat_history: list, identity_state: dict, curated_resources: list) -> dict:
        """
        Conversational Acharya agent (JARVIS persona).
        Handles complex commands, web search, laptop OS actions, and human potential curation.
        """
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

ACTION RECOGNITION RULES:
1. If the user asks to open an app or site: "action": {{"type": "open_app", "target": "chrome"}} (or youtube, notepad, terminal, settings, calculator, explorer).
2. If the user asks to search or find something (e.g. "find hackathons", "search python tutorials"): "action": {{"type": "web_search", "target": "python tutorials"}} or {{"type": "search_hackathons", "target": "hackathons"}}.
3. If the user asks to create a folder: "action": {{"type": "create_folder", "target": "FolderName"}}.
4. If no OS action is requested, set "action": null.

SPEECH STYLE:
- Speak directly, confidently, and concisely like JARVIS ("Sir, I've opened the hackathons on Devpost for you.").

CONVERSATION HISTORY:
{history_str}

LATEST USER INPUT:
{user_input}

Respond ONLY with a valid JSON object in this exact format, with no markdown codeblocks:
{{
    "thought": "Reasoning about intent and laptop control.",
    "speech": "Your response to the user.",
    "action": null
}}
"""
        try:
            result = await generate(prompt, model="llama3", json_format=True)
            if "error" in result:
                return {
                    "thought": "JSON parse error from Ollama.",
                    "speech": "Processing your request, sir.",
                    "action": None
                }
                
            return {
                "thought": result.get("thought", "Analyzing intent..."),
                "speech": result.get("speech", "I am processing your request, sir."),
                "action": result.get("action", None)
            }
        except Exception as e:
            return {
                "thought": f"Error connecting to Ollama: {e}",
                "speech": "Local neural net is reconnecting, sir.",
                "action": None
            }
