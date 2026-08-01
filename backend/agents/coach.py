class CoachAgent:
    async def generate_mission(self, decision_state: dict, resources: list, opportunities: dict) -> dict:
        """
        Generates Today's Mission with explainability.
        Acts as the final compiler for the Mission Control UI payload.
        """
        return {
            "mission": decision_state.get("highest_roi_action", "Keep up the momentum!"),
            "explainability": {
                "why": decision_state.get("reasoning", ""),
                "evidence": decision_state.get("what_changed", ""),
                "impact": decision_state.get("impact", "Medium"),
                "confidence": decision_state.get("confidence", "80%")
            },
            "resources": resources,
            "opportunity": opportunities
        }
