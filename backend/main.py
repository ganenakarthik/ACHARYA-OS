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



@app.get("/")
def read_root():
    return {"message": "ACHARYA Backend is running."}
