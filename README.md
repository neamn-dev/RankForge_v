# RankForge — AI-Powered Viral Ranking Video Creation Platform

RankForge is a full-stack, production-ready ranking video creation platform inspired by **Viblo AI's automated workflow** and **CapCut's powerful multi-track editing experience**.

It empowers creators to enter any topic or URL, discover viral clips from YouTube Shorts, TikTok, and Instagram Reels, rank them by engagement metrics, customize 3D multi-color titles and vertical ranking stacks, refine every clip on a non-destructive timeline, and export crisp, **100% watermark-free** 9:16 vertical MP4s.

---

## 🌟 Visual References & Inspiration

RankForge's default templates, layouts, and typography directly replicate the visual hierarchy of top-performing ranking shorts:

- **"Ranking Best Shark Moments"** (~340M views, credits `@happypawsdaily69420`):
  - Oceanic teal / ice-blue 3D drop-shadow titles (`shark` template).
  - Vertical countdown stack (`#5` through `#1`) with dynamic active highlights.
  - Middle video window with aesthetic blur-fill background.
  - Bottom creator attribution banner.
- **"Ranking Best Cheetah Moments"** (~252M views, credits `@jacobfeder7630`):
  - Amber & golden savannah 3D typography (`cheetah` template).
  - Fast-paced retention hook and dynamic rank progression.
- **"Craziest Roller-Skating Fails"**:
  - High-contrast red/yellow street theme (`skate-fails` template).

---

## 🚀 Key Features

### 1. 🔍 AI-Powered Viral Video Discovery Engine
- **Topic Search**: Enter any topic (e.g. *"Top 10 Funniest Animal Moments"*, *"Ranking Best Shark Moments"*, *"Craziest Roller-Skating Fails"*).
- **Direct URL Inspector**: Paste links from YouTube Shorts, TikTok, or Instagram Reels to instantly extract metadata, view counts, and original creator handles.
- **Multi-Platform Metric Analysis**:
  - Formatted view counts (e.g., `340.2M`, `252.0M`, `4.8M`).
  - Like counts and logarithmic **Virality Scores** (0–99).
  - Automatic extraction of original creator `@handles` from titles and descriptions for ethical attribution.
- **Intelligent Fallback Database**: Built-in curated clips ensure zero-downtime discovery even when offline or without API keys.

### 2. 🪄 Viblo AI 3-Step Guided Studio
- **Step 1: Discover**: Enter topic or paste URLs, pick target platforms, aspect ratios (`9:16`, `16:9`, `1:1`), and number of ranking tiers.
- **Step 2: Review & Rank**:
  - Live animated radar scanner while analyzing metrics.
  - Interactive candidate cards showing real views, likes, virality scores, and creator credits.
  - In-modal video preview player to verify clip quality before assembling.
  - Drag / click to reorder clips (`Move Up` / `Move Down`), delete unwanted clips, or edit labels, emojis, rank badges, and durations.
- **Step 3: Style & Assemble**:
  - Select viral templates (**Shark 3D**, **Cheetah 3D**, **Skate Fails**, **Neon Pulse**, **Minimalist**).
  - **Interactive 3D Word Colorizer**: Customize individual words of the title independently (e.g., *Ranking* [white], *Best* [cyan], *Shark* [ice-blue], *Moments* [gold]).
  - Edit creator attribution text and toggle background music & HD downloads.

### 3. 🥪 Sandwich Video Composition Engine
- **Top Region (16–22% height)**: 3D multi-color title hook with drop shadow and custom padding.
- **Main Video Region (56–68% height)**:
  - `Blur-Fill`: Aesthetic blurred mirror background with center-focused foreground.
  - `Fit`: Letterboxed presentation within the middle canvas.
  - `Fill`: Smart cropped presentation.
  - Corner radius and border styling.
- **Left-Side Vertical Ranking Stack**:
  - Visual ranking stack (`#5`, `#4`, `#3`, `#2`, `#1`) aligned vertically on the left edge.
  - Automatically highlights the current playing rank in vibrant yellow/gold with smooth pulsing animations.
- **Bottom Region (14–18% height)**: Designated area for creator attribution handles (`Original credits to: @creator`), dynamic subtitles, and branding.

### 4. 🎬 CapCut-Inspired Multi-Track Timeline & Editor
- **Scrubbable Playhead**: Synchronized frame-by-frame with the canvas preview.
- **Clip Trimming**: Drag-to-trim start and end handles on video clips.
- **Precision Splitting**: Split clips at playhead (`Scissors` tool).
- **Sequencing**: Move clips up/down, duplicate, or delete.
- **Speed Multipliers**: `0.5x`, `0.75x`, `1.0x`, `1.25x`, `1.5x`, `2.0x`.
- **Color Grading**: Brightness, contrast, and saturation adjustments.
- **Transitions**: Pop Up, Slide Up, Crossfade, Zoom presets.
- **Audio Mixing**: Background music volume slider (0%–100%) and automatic audio ducking on export.

### 5. ⚡ Real Hardware-Accelerated FFmpeg Export (No Watermarks)
- **100% Watermark-Free**: Clean, professional MP4 output ready for publishing.
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
- **Backend**: FastAPI, Pydantic v2, Python 3.11+, `yt-dlp`, FFmpeg subprocess pipeline.
- **Storage**: Local JSON persistence (`backend/data/projects/*.json`, `backend/data/templates/*.json`) and media upload storage (`backend/data/uploads/`).

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check & FFmpeg availability |
| `POST` | `/api/ai/discover-videos` | Discovers viral clips with views, likes, virality scores, and creator handles |
| `POST` | `/api/ai/inspect-url` | Extracts metadata, views, and credits for a single video URL |
| `POST` | `/api/ai/assemble-project` | Assembles discovered clips into a complete Sandwich layout project |
| `POST` | `/api/ai/generate-ranking` | AI topic generator for 20+ viral niches |
| `GET` | `/api/templates` | Returns built-in templates (`shark`, `cheetah`, `skate-fails`, `neon`, `minimal`) |
| `POST` | `/api/projects` | Creates a new project |
| `GET` | `/api/projects/{id}` | Loads a saved project |
| `POST` | `/api/export` | Renders a 100% watermark-free MP4 via FFmpeg |

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

### Backend Unit & Integration Tests (Pytest)
```powershell
cd backend
.\.venv\Scripts\python -m pytest tests -v
```
All 15 test suites verify:
- Health check & FFmpeg detection.
- Multi-platform viral discovery engine & fallback databases.
- Single URL inspector with creator credit extraction.
- Logarithmic virality scoring & view count formatting.
- Project assembly with 3D word tokens, ranking stacks, and audio.
- Template library & custom template CRUD.
- Sandwich layout rendering & export validation.

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
│   │   └── main.py          # FastAPI application, AI Discovery, & FFmpeg Sandwich Renderer
│   ├── data/
│   │   ├── exports/         # Rendered watermark-free MP4 videos
│   │   ├── projects/        # Project JSON data
│   │   ├── templates/       # Saved custom & built-in templates
│   │   └── uploads/         # Uploaded video and audio assets
│   ├── tests/
│   │   └── test_api.py      # Pytest API test suite (15 tests)
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ExportModal.tsx   # Video export settings & MP4 download
    │   │   ├── Inspector.tsx     # Right properties panel (video, audio, speed, color)
    │   │   ├── Preview.tsx       # Live Sandwich video player with 3D titles & ranking stack
    │   │   ├── ProjectsModal.tsx # Project management modal
    │   │   ├── Sidebar.tsx       # Left tools & asset library
    │   │   ├── Timeline.tsx      # Multi-track CapCut-like trim/split timeline
    │   │   ├── Topbar.tsx        # Top navigation & AI Studio trigger
    │   │   └── Wizard.tsx        # Viblo AI 3-step viral discovery & assembly wizard
    │   ├── api.ts                # REST API client
    │   ├── App.tsx               # Main modular layout
    │   ├── main.tsx              # React DOM entry
    │   ├── store.tsx             # State provider, reducer & undo/redo
    │   ├── styles.css            # Dark-mode glassmorphic styling system
    │   ├── types.ts              # TypeScript data interfaces
    │   └── vite-env.d.ts
    └── package.json
```

---

## ⚖️ Rights, Attribution & Ethics

RankForge promotes ethical content creation:
- **Automatic Creator Attribution**: Original creator `@handles` are automatically extracted from source metadata and rendered in the bottom attribution footer.
- **Zero Watermark Removal**: RankForge does not remove third-party watermarks or bypass platform access controls.
- **Clean Source Footage**: Supports user-provided footage, permitted creative commons media, and licensed assets.
- **Non-Destructive Editing**: Discovered ranking projects generate editable clip objects rather than flattened videos, giving creators complete editorial control.

