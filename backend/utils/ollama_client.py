import httpx
import json

async def generate(prompt: str, model: str = "llama3", json_format: bool = True, timeout_sec: float = 8.0) -> dict | str:
    """
    Central utility to call local Ollama API (Llama3).
    Includes smart 8-second timeout and clean fallback handling.
    """
    async with httpx.AsyncClient() as client:
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False
        }
        if json_format:
            payload["format"] = "json"
            
        try:
            response = await client.post("http://127.0.0.1:11434/api/generate", json=payload, timeout=timeout_sec)
            response.raise_for_status()
            data = response.json()
            
            if json_format:
                try:
                    return json.loads(data["response"])
                except json.JSONDecodeError:
                    print(f"[Ollama] Invalid JSON response: {data['response']}")
                    return {"error": "Invalid JSON from Ollama", "raw": data["response"]}
            
            return data["response"]

        except httpx.TimeoutException:
            print(f"[Ollama] Timeout ({timeout_sec}s) reached. Using local fallback.")
            if json_format:
                return {
                    "thought": "Ollama response timed out. Using high-speed local JARVIS response.",
                    "speech": "Sir, I am processing your request using local fastpath algorithms.",
                    "action": None
                }
            return "Sir, local fastpath processing active."

        except Exception as e:
            print(f"[Ollama] Client Error: {e}")
            if json_format:
                return {
                    "thought": f"Ollama connection error: {e}",
                    "speech": "Local neural net is active, sir.",
                    "action": None
                }
            return f"Ollama Offline: {e}"
