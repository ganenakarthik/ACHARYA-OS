"""
ACHARYA Privacy Control Manager
Manages real-time security flags for system services.
"""

class PrivacyManager:
    def __init__(self):
        self.flags = {
            "MIC": True,
            "CAMERA": False,
            "SCREEN": True,
            "MEMORY": True,
            "INTERNET": False  # 100% Local by default!
        }

    def update_flag(self, flag: str, value: bool):
        flag_upper = flag.upper()
        if flag_upper in self.flags:
            self.flags[flag_upper] = bool(value)
            print(f"[PrivacyManager] Privacy setting updated: {flag_upper} = {value}")
        return self.flags

    def get_status(self) -> dict:
        return self.flags
