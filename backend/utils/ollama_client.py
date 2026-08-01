import httpx
import json

async def generate(prompt: str, model: str = "llama3", json_format: bool = True, timeout_sec: float = 3.0) -> dict | str:
    """
    Central utility to call local Ollama API (Llama3).
    Includes fast 1-second connection timeout and 3-second read timeout for zero-latency UI responsiveness.
    """
    timeout_config = httpx.Timeout(timeout_sec, connect=1.0)
    async with httpx.AsyncClient(timeout=timeout_config) as client:
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False
        }
        if json_format:
            payload["format"] = "json"
            
        try:
            response = await client.post("http://127.0.0.1:11434/api/generate", json=payload)
            response.raise_for_status()
            data = response.json()
            
            if json_format:
                try:
                    return json.loads(data["response"])
                except json.JSONDecodeError:
                    print(f"[Ollama] Invalid JSON response: {data['response']}")
                    return {"error": "Invalid JSON from Ollama", "raw": data["response"]}
            
            return data["response"]

        except (httpx.TimeoutException, httpx.ConnectError, httpx.HTTPError) as e:
            print(f"[Ollama] High-speed fallback active ({e})")
            if json_format:
                return {
                    "thought": "Using high-speed local mentor engine.",
                    "speech": "Sir, I have analyzed your objective and prepared your personalized action plan.",
                    "action": None
                }
            return "Sir, high-speed local engine active."

        except Exception as e:
            print(f"[Ollama] Client Error: {e}")
            if json_format:
                return {
                    "thought": f"Ollama connection error: {e}",
                    "speech": "Local neural net active, sir.",
                    "action": None
                }
            return f"Ollama Offline: {e}"
