"""
Backward compatibility bridge for AgentOrchestrator.
Delegates directly to core.orchestrator.CoreOrchestrator.
"""
from core.orchestrator import CoreOrchestrator

class AgentOrchestrator(CoreOrchestrator):
    pass
