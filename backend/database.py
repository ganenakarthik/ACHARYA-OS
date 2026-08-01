from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./acharya.db")

# Use aiosqlite for zero-config local db or asyncpg if configured
try:
    engine = create_async_engine(DATABASE_URL, echo=False)
except Exception as e:
    print(f"[Database] Warning: {DATABASE_URL} failed, falling back to local SQLite: {e}")
    engine = create_async_engine("sqlite+aiosqlite:///./acharya.db", echo=False)

AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
