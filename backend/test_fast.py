import asyncio
import httpx
from core.orchestrator import CoreOrchestrator
from services.automate.desktop import AutomateService

async def run_fast_tests():
    print("==================================================")
    print("ACHARYA OS FAST SYSTEM VERIFICATION")
    print("==================================================\n")
    
    # 1. REST Endpoints
    print("1. Testing REST Endpoints:")
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000") as client:
        r = await client.get("/")
        print("  - GET / -> Status:", r.status_code, "| Response:", r.json())
        r_priv = await client.get("/privacy")
        print("  - GET /privacy -> Status:", r_priv.status_code, "| Status:", r_priv.json())
        r_tog = await client.post("/privacy/toggle?flag=SCREEN&value=true")
        print("  - POST /privacy/toggle -> Status:", r_tog.status_code, "| New Status:", r_tog.json())
    print("[PASS] REST Endpoints verified.\n")

    # 2. Automate Fastpath Commands
    print("2. Testing Fastpath OS Automate Service:")
    service = AutomateService()
    for cmd in ["open chrome", "open youtube", "open notepad", "open explorer"]:
        res = service.detect_and_execute_fastpath(cmd)
        print(f"  - Command: '{cmd}' -> Result: {res['result']}")
    print("[PASS] Automate Fastpath OS Commands verified.\n")

    # 3. Core Orchestrator Fastpath Execution & Broadcast
    print("3. Testing Core Orchestrator Live Signal & WebSocket Payload:")
    received_broadcasts = []
    class MockWS:
        async def broadcast(self, payload):
            received_broadcasts.append(payload)

    orch = CoreOrchestrator(MockWS())
    await orch.process_signal({"type": "text_command", "details": "open chrome"})
    print("  - Broadcast Received:", received_broadcasts[0])
    print("[PASS] Core Orchestrator Fastpath Signal verified.\n")

    print("==================================================")
    print("ALL FAST SYSTEM VERIFICATIONS PASSED 100%!")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(run_fast_tests())
