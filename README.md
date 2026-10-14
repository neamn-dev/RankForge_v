# RankForge — Production-Ready AI Ranking Video Creation Platform

RankForge is a full-stack ranking video creation platform inspired by Viblo AI and CapCut. It enables creators to transform raw video clips into viral, polished ranking videos for **YouTube Shorts**, **TikTok**, and **Instagram Reels**.

---

## 🚀 Key Features

### 1. 🥪 Sandwich Video Composition Engine
- **Top Region**: Independently styled banner for ranking category, title, or hook with customizable height (%), background colors, typography, and alignments.
- **Main Video Region**: Intelligent video framing supporting:
  - `Blur-Fill`: Aesthetic blurred mirror background with center-focused foreground.
  - `Fit`: Letterboxed presentation within the middle canvas.
  - `Fill`: Smart cropped presentation.
  - Corner radius and border styling.
- **Bottom Region**: Designated area for captions, creator branding handles, and footers.
- **Dynamic Rank Badges**: Badges (`#5`, `#4`, ..., `#1`) with multiple styles (`circle`, `square`, `pill`, `outline`) and flexible positioning (`top-left`, `top-right`, `bottom-left`, `bottom-right`).

### 2. 🪄 Viblo AI-Inspired Guided Wizard
- Step-by-step creation flow: Prompt/Idea → Rank Entries & Durations → Template & Sandwich Theme → Editor.
- AI topic and hook generator endpoint (`POST /api/ai/generate-ranking`) supporting 20+ viral niches (gaming, sports, fails, animals, tech, comedy) with smart fallbacks.

### 3. 🎬 Multi-Track Timeline & CapCut-Inspired Controls
- Real scrubbable interactive playhead synchronized with the canvas preview.
- Drag-to-trim start and end handles on video clips.
- Clip splitting at playhead (`Scissors` tool).
- Clip duplication, deletion, and sequence reordering (`Move Up` / `Move Down`).
- Timeline zoom controls (15px/s to 100px/s).
- Dedicated Video, Text/Overlay, and Audio waveform tracks.

### 4. 🎛️ Comprehensive Inspector Panel
- **Video Tab**: Rank overlay labels, accent colors, badge style/position, source start/end trim fields, duration slider, fit mode selector.
- **Audio Tab**: Background music track selector and volume slider (0%–100%) with automated audio ducking on export.
- **Speed Tab**: Clip playback speed multipliers (`0.5x`, `0.75x`, `1.0x`, `1.25x`, `1.5x`, `2.0x`).
- **Animation Tab**: Transition presets (Pop Up, Slide Up, Crossfade, Zoom).
- **Adjust Tab**: Brightness, Contrast, Saturation controls.
- **Layout Tab**: Quick sandwich height and canvas theme overrides.

### 5. ⚡ Real Hardware-Accelerated FFmpeg Export
- Complete Sandwich layout rendering in FFmpeg (`POST /api/export`):
  - Canvas background and aspect ratio scaling (`9:16`, `16:9`, `1:1`, `4:5`).
  - Top & bottom banners rendered with `drawbox` and `drawtext`.
  - Blur-fill background with `boxblur` and scaled foreground video overlays.
  - Per-clip rank badge overlays and clip label cards.
  - Opening retention hook overlay (`00:00 - 00:01.8`).
  - Background music mixing with volume control.

---

## 🛠️ Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Lucide Icons, Vanilla CSS (dark-mode glassmorphic theme).
- **State Management**: React Context + Reducer with undo/redo history stack.
- **Backend**: FastAPI, Pydantic v2, Python 3.11+, FFmpeg subprocess pipeline.
- **Storage**: Local JSON persistence (`backend/data/projects/*.json`, `backend/data/templates/*.json`) and media upload storage (`backend/data/uploads/`).

---

## 💻 Quick Start

### 1. Prerequisites
- **Node.js**: 20+
- **Python**: 3.11+
- **FFmpeg**: Installed and available in system `PATH` (Verify with `ffmpeg -version`).

### 2. Run Backend
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 3. Run Frontend
```powershell
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Testing

### Backend Unit Tests (Pytest)
```powershell
cd backend
.\.venv\Scripts\python -m pytest tests -v
```
All 8 test suites verify:
- Health check & FFmpeg detection.
- Template library & custom template CRUD.
- AI ranking generation logic.
- Project CRUD and persistence with Sandwich Layout.
- Invalid asset upload rejection.
- Export parameter validation.

### Frontend Production Build
```powershell
cd frontend
npm run build
```
Builds clean production assets with zero TypeScript or bundling errors.

---

## 📁 Project Structure
```
rankforge-fullstack/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   └── main.py          # FastAPI application & Sandwich FFmpeg renderer
│   ├── data/
│   │   ├── exports/         # Rendered MP4 videos
│   │   ├── projects/        # Project JSON data
│   │   ├── templates/       # Saved custom templates
│   │   └── uploads/         # Uploaded video and audio assets
│   ├── tests/
│   │   └── test_api.py      # Pytest API test suite
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ExportModal.tsx   # Video export settings & download
    │   │   ├── Inspector.tsx     # Right properties panel
    │   │   ├── Preview.tsx       # Live Sandwich video player
    │   │   ├── ProjectsModal.tsx # Project management modal
    │   │   ├── Sidebar.tsx       # Left tools & asset library
    │   │   ├── Timeline.tsx      # Multi-track trim/split timeline
    │   │   ├── Topbar.tsx        # Top navigation & actions
    │   │   └── Wizard.tsx        # AI ranking generation wizard
    │   ├── api.ts                # REST API client
    │   ├── App.tsx               # Main modular layout
    │   ├── main.tsx              # React DOM entry
    │   ├── store.tsx             # State provider, reducer & undo/redo
    │   ├── styles.css            # Dark-mode styling system
    │   ├── types.ts              # TypeScript data interfaces
    │   └── vite-env.d.ts
    └── package.json
```
