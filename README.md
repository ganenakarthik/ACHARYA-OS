# 🌌 ACHARYA // Context-Aware AI Mentor OS

> **Major Project**: *A CONTEXT-AWARE AI MENTOR WITH PERSISTENT MEMORY ACROSS LEARNING SESSIONS*  
> **Researchers**: **G. Karthik** (`2411CS040056`) & **K. Shalem Raju** (`2411CS040088`)  
> **Department**: Department of Computer Science & Engineering (Cyber Security), School of Engineering  
> **Institution**: Malla Reddy University, Hyderabad  
> **Internal Guide**: Mr. Ch. P.S.S. Prakash (Assistant Professor)  
> **Dean**: Dr. G. Anand Kumar (Professor & Dean, CSE - Cyber Security)  

---

## ⚡ Overview & Problem Statement

Traditional AI learning assistants (such as ChatGPT) suffer from three fatal limitations in higher-education engineering environments:
1. **Manual Prompting Overhead**: The student must manually context-switch, copy-paste compiler traces into a browser, and request help.
2. **Session Amnesia**: Standard LLMs forget student weaknesses between sessions, treating each login as a cold start without longitudinal cognitive tracking.
3. **Data Exfiltration in Cyber Security Environments**: Cloud-hosted screen trackers transmit sensitive developer telemetry to third-party endpoints.

**Acharya** solves this by operating as an ambient, desktop-integrated AI companion built with **Electron**, **React 19**, and native **Win32 OS sensors**. It runs seamlessly on your desktop as an unobtrusive, draggable glowing pill that expands into a full-scale cyberpunk holographic HUD with zero cloud data leaks.

---

## 🌟 Novel Core Contributions (Addressing Viva & Review Criteria)

### 1. Autonomous Zero-Touch Socratic OS Error Interceptor
- **Unlike ChatGPT**, Acharya does not require manual prompting. Native Win32 OS background hooks continuously monitor runtime exceptions across Java (NullPointerException), Python (KeyError), C/C++ (Segmentation Fault / SIGSEGV), and SQL.
- When an IDE or console throws a fault, Acharya autonomously surfaces a **Socratic guidance banner** without the student touching a keyboard.
- It directs the student to the invariant rather than spoon-feeding code, preserving deep problem-solving skills.

### 2. Longitudinal Ebbinghaus Spaced Retrieval Engine ($R = e^{-t/S}$)
- Tracks concept retention decay across sequential learning intervals.
- If a student struggles with a concept during Session 1 (e.g. *Banker's Algorithm Safety Invariant*), Acharya calculates the decay rate over elapsed time.
- When Session 3 launches, Acharya proactively activates a **Cross-Session Retrieval Drill**, restoring retention from 48% to 96% upon verification.

### 3. Cryptographic Block-Chained Session Memory Ledger (SHA-256)
- Designed specifically for the **CSE (Cyber Security)** curriculum:
  $$\mathcal{H}_n = \text{SHA256}(\mathcal{H}_{n-1} \parallel \text{SessionPayload})$$
- All learning sessions, concept scores, and weaknesses are sealed into an air-gapped cryptographic blockchain stored locally at `userData/acharya-learning-sessions.json`.
- Includes a live 1-click **Chain Integrity Validator** (`verify-session-ledger-integrity`) that proves tamper resistance across sessions.

### 4. Native Win32 Screen & Process Perception
- Interrogates native Windows APIs (`GetForegroundWindow` / `GetWindowText`) and Electron `desktopCapturer` every 2.5s.
- Displays the active foreground window, application process name, and live thumbnail frame preview with zero heavy CPU overhead.

### 5. Universal AST Code Sentry & 1-Click Multi-Bug Fix
- Real-time Abstract Syntax Tree inspection across Java, Python, JavaScript, and C++.
- Pinpoints and resolves multiple concurrent issues (missing imports, missing `@Service` annotations, unhandled null pointers) in a single atomic pass with side-by-side diff previews.

### 6. Studio-Grade 44.1kHz Neural Voice Engine
- Replaced robotic legacy SAPI5 audio with studio 44.1kHz High-Definition audio narration.
- Delivers concise, Socratic spoken summaries while rendering detailed diagrams in the HUD window.

---

## 🎬 2-Minute Reviewer Demonstration Walkthrough

When presenting to evaluators, execute this sequence:

| Step | Action in HUD | Reviewer Value Demonstrated |
| :--- | :--- | :--- |
| **1** | Open Acharya & click **`🧠 SESSIONS & MEMORY`** | Shows persistent timeline across Session 1 (Concurrency), Session 2 (Paging), Session 3 (Live). |
| **2** | In Tab 1, click **`[Test Java NullPointer]`** | Demonstrates **Zero-Touch OS Interception**: Acharya catches the runtime error automatically without student prompt. |
| **3** | Switch to **Tab 2 (`RETENTION GRAPH`)** & answer Drill B | Demonstrates **Ebbinghaus Decay & Cross-Session Retrieval**: Session 1 weakness is tested and boosted from 48% $\rightarrow$ 96%. |
| **4** | Switch to **Tab 3 (`SECURITY & LEDGER`)** & click **`[🔍 Verify Chain]`** | Demonstrates **Cyber Security Blockchain Ledger**: All sessions validated with SHA-256 air-gapped integrity. |

---

## 🛠️ Tech Stack

- **Runtime**: [Electron](https://www.electronjs.org/) (Multi-process architecture, Win32 User32 IPC)
- **Frontend**: [React 19](https://react.dev/), [Vite](https://vitejs.dev/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Design System**: Frosted Obsidian Glassmorphism (`backdrop-filter: blur(28px)`), JetBrains Mono, Orbitron
- **Cryptographic Security**: Node.js `crypto` SHA-256 cascade, Air-Gapped Local Storage
- **Audio & Sensory**: Web Audio API cybernetic sound synthesizer, HTML5 Audio Neural Stream, Win32 PowerShell telemetry
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
