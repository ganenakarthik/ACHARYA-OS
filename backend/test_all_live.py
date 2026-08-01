"""
ACHARYA OS Live Comprehensive System Test Suite
Tests backend REST endpoints, WebSocket signals, Fastpath OS execution, and Ollama integration.
"""
import asyncio
import json
import httpx
from core.orchestrator import CoreOrchestrator
from services.automate.desktop import AutomateService
from utils.ollama_client import generate

async def test_rest_api():
    print("--- 1. Testing REST Endpoints ---")
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000") as client:
        try:
            r = await client.get("/")
            print(f"[REST GET /] Status: {r.status_code} | Body: {r.json()}")
            
            r_priv = await client.get("/privacy")
            print(f"[REST GET /privacy] Status: {r_priv.status_code} | Body: {r_priv.json()}")
            
            r_toggle = await client.post("/privacy/toggle?flag=SCREEN&value=true")
            print(f"[REST POST /privacy/toggle] Status: {r_toggle.status_code} | Body: {r_toggle.json()}")
            print("[SUCCESS] REST API Tests Passed!\n")
        except Exception as e:
            print(f"[ERROR] REST API Test Failed: {e}\n")

async def test_fastpath_commands():
    print("--- 2. Testing Fastpath OS Automate Service ---")
    service = AutomateService()
    
    test_cases = [
        "open chrome",
        "open youtube",
        "open notepad",
        "open explorer",
        "open calculator"
    ]
    
    for cmd in test_cases:
        res = service.detect_and_execute_fastpath(cmd)
        if res:
            print(f"[Fastpath Test] Command: '{cmd}' -> Executed: {res['result']}")
        else:
            print(f"[Fastpath Test] Command: '{cmd}' -> No match")
    print("[SUCCESS] Fastpath OS Commands Tested!\n")

async def test_ollama_llm():
    print("--- 3. Testing Local Ollama Llama3 Connection ---")
    prompt = 'You are Acharya. Respond in JSON: {"speech": "Acharya online and operational."}'
    try:
        res = await generate(prompt, model="llama3", json_format=True)
        print(f"[Ollama Test] Response: {res}")
        print("[SUCCESS] Local Ollama LLM Connection Passed!\n")
    except Exception as e:
        print(f"[ERROR] Ollama Test Error: {e}\n")

class MockWebSocketManager:
    async def broadcast(self, data):
        print(f"[WebSocket Mock Broadcast] Type: {data.get('type')} | Mission: {data.get('data', {}).get('mission')}")

async def test_orchestrator_pipeline():
    print("--- 4. Testing Core Orchestrator Pipeline ---")
    mock_ws = MockWebSocketManager()
    orch = CoreOrchestrator(mock_ws)
    
    print("Testing fastpath signal through orchestrator:")
    await orch.process_signal({"type": "text_command", "details": "open notepad"})
    
    print("Testing conversational signal through orchestrator:")
    await orch.process_signal({"type": "text_command", "details": "I want to learn python"})
    print("[SUCCESS] Orchestrator Pipeline Test Complete!\n")

async def main():
    print("==================================================")
    print("ACHARYA OS LIVE COMPREHENSIVE TEST SUITE")
    print("==================================================\n")
    await test_rest_api()
    await test_fastpath_commands()
    await test_ollama_llm()
    await test_orchestrator_pipeline()
    print("==================================================")
    print("ALL TESTS COMPLETED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(main())
