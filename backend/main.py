from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, get_db
import json
import asyncio
from sqlalchemy import select
from orchestrator import AgentOrchestrator
from database import engine, Base, get_db, AsyncSessionLocal
from models import User, IdentityTwin
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="ACHARYA - AI Growth Operating System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                disconnected.append(connection)
        
        for conn in disconnected:
            self.disconnect(conn)

manager = ConnectionManager()
orchestrator = AgentOrchestrator(manager)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    # Initialize Qdrant Memory
    try:
        from qdrant_client import QdrantClient
        from qdrant_client.models import Distance, VectorParams
        qdrant = QdrantClient(url="http://localhost:6333")
        try:
            qdrant.get_collection("acharya_memory")
        except Exception:
            qdrant.create_collection(
                collection_name="acharya_memory",
                vectors_config=VectorParams(size=384, distance=Distance.COSINE),
            )
            print("Created new Qdrant collection: acharya_memory")
    except Exception as e:
        print(f"Warning: Could not connect to Qdrant: {e}")
        
    # Seed Database
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).filter(User.id == 1))
        user = result.scalars().first()
        if not user:
            user = User(id=1, name="Karthik", email="karthik@example.com")
            session.add(user)
            await session.commit()
            
            identity = IdentityTwin(
                user_id=1, 
                goals=["Submit MVP tomorrow"], 
                skills=["Backend engineering"],
                weaknesses=["Authentication logic", "Presentation skills"],
                behavior_patterns=[{"momentum": 5}]
            )
            session.add(identity)
            await session.commit()
            print("Database seeded with test user.")

    # Start the observer background loop for real-time tracking
    asyncio.create_task(orchestrator.observer.run_background_observation(orchestrator))

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            msg_type = payload.get("type")

            if msg_type == "signal":
                asyncio.create_task(orchestrator.process_signal(payload["data"]))
            elif msg_type == "privacy_toggle":
                flag = payload.get("flag")
                val = payload.get("value")
                updated = orchestrator.privacy.update_flag(flag, val)
                await manager.broadcast({"type": "privacy_update", "data": updated})
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/privacy")
def get_privacy():
    return orchestrator.privacy.get_status()

@app.post("/privacy/toggle")
def toggle_privacy(flag: str, value: bool):
    return orchestrator.privacy.update_flag(flag, value)

@app.post("/onboard")
async def save_onboarding(payload: dict):
    """
    Saves user's pre-onboarding preferences and immediately updates the identity state and curator.
    Payload: { "goal": str, "domain": str, "focus": str }
    """
    goal = payload.get("goal", "").strip()
    domain = payload.get("domain", "").strip()
    focus = payload.get("focus", "").strip()

    if not goal:
        return {"status": "error", "message": "Goal is required"}

    # Update the identity agent's state immediately
    orchestrator.identity.state["ideal_self"] = goal
    orchestrator.identity.state["goals"] = [goal]
    orchestrator.identity.state["domain"] = domain
    orchestrator.identity.state["focus"] = focus
    orchestrator.identity.state["onboarded"] = True
    orchestrator.identity._save_state()

    # Broadcast immediate update to all connected UIs
    await manager.broadcast({
        "type": "mission_update",
        "data": {
            "mission": f"Understood, Sir. I have locked your target: '{goal}'. I will now curate everything around {domain} and {focus}. Let's begin.",
            "identity_twin": {
                "ideal_self": goal,
                "momentum": orchestrator.identity.state.get("momentum", 7),
                "identity_gap": f"{orchestrator.identity.state.get('identity_gap_percent', 42)}% Remaining to Ideal Self",
                "actions_completed": orchestrator.identity.state.get("actions_completed", 3),
                "mentor_mood": orchestrator.identity.state.get("mentor_mood", "Focused & Supportive")
            },
            "explainability": {
                "why": f"Onboarding complete — tuning all systems for {domain} / {focus}.",
                "confidence": "100%"
            }
        }
    })

    return {"status": "ok", "message": f"Onboarding saved: {goal}"}


@app.get("/onboard/status")
def get_onboard_status():
    """Returns whether the user has been onboarded."""
    onboarded = orchestrator.identity.state.get("onboarded", False)
    return {
        "onboarded": onboarded,
        "ideal_self": orchestrator.identity.state.get("ideal_self", ""),
        "domain": orchestrator.identity.state.get("domain", ""),
        "focus": orchestrator.identity.state.get("focus", "")
    }


@app.get("/")
def read_root():
    return {"message": "ACHARYA Backend is running."}
