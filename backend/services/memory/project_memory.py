"""
ACHARYA Memory Service
Handles Project Memory, Semantic Search (Qdrant), and Long-Term Knowledge.
Safely falls back if Qdrant/SentenceTransformers are unavailable in environment.
"""
import uuid
import json

try:
    from qdrant_client import QdrantClient
    from qdrant_client.models import PointStruct, Distance, VectorParams
    from sentence_transformers import SentenceTransformer
    VECTOR_MEMORY_AVAILABLE = True
except ImportError:
    VECTOR_MEMORY_AVAILABLE = False
    print("[MemoryService] Notice: qdrant_client or sentence_transformers not installed. Semantic vector search disabled.")

class MemoryService:
    def __init__(self):
        self.active = False
        if VECTOR_MEMORY_AVAILABLE:
            try:
                self.qdrant = QdrantClient(url="http://localhost:6333")
                self.encoder = SentenceTransformer('all-MiniLM-L6-v2')
                self._ensure_collections()
                self.active = True
                print("[MemoryService] Qdrant & Vector Encoder initialized.")
            except Exception as e:
                print(f"[MemoryService] Warning: Vector memory unavailable ({e})")

    def _ensure_collections(self):
        if not VECTOR_MEMORY_AVAILABLE:
            return
        try:
            self.qdrant.get_collection("acharya_memory")
        except Exception:
            self.qdrant.create_collection(
                collection_name="acharya_memory",
                vectors_config=VectorParams(size=384, distance=Distance.COSINE),
            )
        try:
            self.qdrant.get_collection("project_memory")
        except Exception:
            self.qdrant.create_collection(
                collection_name="project_memory",
                vectors_config=VectorParams(size=384, distance=Distance.COSINE),
            )

    def save_memory(self, collection: str, text: str, metadata: dict = None):
        if not self.active or not VECTOR_MEMORY_AVAILABLE or not text:
            return
        try:
            vector = self.encoder.encode(text).tolist()
            payload = {"memory_text": text}
            if metadata:
                payload.update(metadata)
            self.qdrant.upsert(
                collection_name=collection,
                points=[PointStruct(id=str(uuid.uuid4()), vector=vector, payload=payload)]
            )
            print(f"[MemoryService] Saved to {collection}: {text[:50]}...")
        except Exception as e:
            print(f"[MemoryService] Save Error: {e}")

    def recall_memories(self, collection: str, query: str, limit: int = 3, score_threshold: float = 0.5) -> list[str]:
        if not self.active or not VECTOR_MEMORY_AVAILABLE or not query:
            return []
        try:
            vector = self.encoder.encode(query).tolist()
            results = self.qdrant.search(
                collection_name=collection,
                query_vector=vector,
                limit=limit
            )
            return [hit.payload.get("memory_text", "") for hit in results if hit.score >= score_threshold]
        except Exception as e:
            print(f"[MemoryService] Recall Error: {e}")
            return []
