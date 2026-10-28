# 🌌 ACHARYA // Autonomous Desktop AI Mentor OS

> **Major Project**: *A Context-Aware AI Mentor with Persistent Memory Across Learning Sessions*  
> **Researchers**: G. Karthik (2411cs040056) & K. Shalem Raju (2411cs040088)  
> **Guide**: Mr. Ch. P.S.S. Prakash — Department of Computer Science & Engineering, Malla Reddy University

---

## ⚡ Overview

Traditional AI learning tools are trapped inside browser tabs—they lack eyes on the user's workspace, cannot detect real-time coding bottlenecks, and lose context across sessions.

**Acharya** is an ambient, desktop-integrated AI companion built with **Electron**, **React 19**, and native **Win32 OS sensors**. It runs seamlessly on your desktop as an unobtrusive, draggable glowing pill that expands into a full-scale cyberpunk holographic glassmorphic HUD.

```
┌────────────────────────────────────────────────────────┐
│                   WINDOWS OS TELEMETRY                 │
│   • Win32 GetForegroundWindow   • Screen Frame Capture │
│   • System Clipboard Sentry      • CPU / RAM Telemetry  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               ACHARYA REASONING PIPELINE               │
│  ┌───────────────────────┐   ┌──────────────────────┐  │
│  │ Context Vision Engine │   │ AST Code Sentry      │  │
│  └───────────┬───────────┘   └──────────┬───────────┘  │
│              └─────────────┬────────────┘              │
│                            ▼                           │
│               Socratic Knowledge Engine                │
│             & Long-Term Disk Memory Vault              │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│             HOLOGRAPHIC AMBIENT GLASS HUD              │
│   • Vision Monitor Card · Arc Reactor Core             │
│   • Digital Twin Deadlines & Timetable · Tool Ribbon   │
│   • Ambient Draggable Pill with Real-Time Event Alerts │
└────────────────────────────────────────────────────────┘
```

---

## 🌟 Key Capabilities

### 1. Ambient Desktop Pill with Live Event Notifications
- Sits unobtrusively in the corner of your screen as a draggable floating pill.
- Dynamically surfaces upcoming deadlines and newly created exam events directly inside the pill badge (`🔔 Operating Systems Exam · In 2 Days`).
- Displays animated drop-down popout event notifications with one-click navigation to full study schedules.

### 2. Native Win32 Screen & Process Perception
- Interrogates native Windows APIs (`GetForegroundWindow` / `GetWindowText`) and Electron `desktopCapturer` every 2.5s.
- Displays the active foreground window, application process name, and live thumbnail frame preview with zero heavy CPU overhead.

### 3. Universal AST Code Sentry & 1-Click Multi-Bug Fix
- Continuously polls the Windows system clipboard for code.
- Runs local Abstract Syntax Tree (AST) inspection across Java, Python, JavaScript, and C++.
- **`[⚡ FIX ALL AT ONCE]`**: Pinpoints and resolves multiple concurrent issues (missing imports, missing `@Service` annotations, unhandled null pointers) simultaneously in a single atomic pass with side-by-side diff previews.

### 4. Autonomous Conversational Exam Timetable Engine
- Natural language intent extraction: state *"I have Operating Systems exam on Friday"*.
- Automatically registers the deadline countdown in the Digital Twin, commits it to the on-disk memory vault, and populates a 3-phase daily study schedule (Theory, Drills, Mock Exam).

### 5. Studio-Grade 44.1kHz Neural Voice Engine
- Replaced robotic legacy SAPI5 audio with studio 44.1kHz High-Definition audio narration.
- Accents tuned to tactical personas:
  - **JARVIS**: British English (`en-gb`), polished, dignified.
  - **EDITH**: American English (`en-us`), sharp, futuristic.
- Delivers concise, executive-level spoken summaries while rendering detailed diagrams in the chat window.

### 6. Episodic Long-Term Memory Vault
- Automatically persists learning goals, skill progression, project preferences, and exam milestones to disk (`userData/acharya-memory-vault.json`), retaining context across sessions and system reboots.

---

## 🛠️ Tech Stack

- **Runtime**: [Electron](https://www.electronjs.org/) (Multi-process architecture, Win32 User32 IPC)
- **Frontend**: [React 19](https://react.dev/), [Vite](https://vitejs.dev/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Design System**: Frosted Obsidian Glassmorphism (`backdrop-filter: blur(28px)`), JetBrains Mono, Orbitron
- **Markdown & Math**: `react-markdown`, `remark-gfm`, KaTeX LaTeX engine
- **Audio & Sensory**: Web Audio API cybernetic sound synthesizer, HTML5 Audio Neural Stream, Win32 PowerShell telemetry

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or later)
- Windows 10 / 11 (for native Win32 screen perception & clipboard IPC)

### Installation
```bash
# Clone the repository
git clone https://github.com/ganenakarthik/ACHARYA-OS.git
cd ACHARYA-OS

# Install dependencies
npm install

# Build production assets
npm run build

# Launch Acharya Desktop OS
npm run electron
```

---

## 👥 Contributors & Academic Credits

- **G. Karthik** (Roll No: `2411cs040056`)
- **K. Shalem Raju** (Roll No: `2411cs040088`)
- **Project Guide**: **Mr. Ch. P.S.S. Prakash**, Assistant Professor, Dept. of CSE, Malla Reddy University
