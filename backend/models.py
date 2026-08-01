from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class IdentityTwin(Base):
    __tablename__ = "identity_twins"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    goals = Column(JSON, default=list) # List of current goals
    skills = Column(JSON, default=list)
    weaknesses = Column(JSON, default=list)
    behavior_patterns = Column(JSON, default=list)
    aspirations = Column(JSON, default=list)
    habits = Column(JSON, default=list)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class CuratedFeed(Base):
    __tablename__ = "curated_feed"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    resource_type = Column(String) # Idea, Story, Tool, Mentor
    url = Column(String)
    reasoning = Column(Text)
    is_consumed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Goal(Base):
    __tablename__ = "goals"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    description = Column(Text)
    is_completed = Column(Boolean, default=False)
    deadline = Column(DateTime, nullable=True)

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)

class Reflection(Base):
    __tablename__ = "reflections"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    content = Column(Text)
    mood = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Mission(Base):
    __tablename__ = "missions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    highest_impact_action = Column(String)
    reason = Column(Text)
    evidence = Column(Text)
    expected_impact = Column(String)
    confidence = Column(Integer) # Percentage
    resources = Column(JSON, default=list)
    opportunity = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
