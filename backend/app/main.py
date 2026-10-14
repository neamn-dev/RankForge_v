from __future__ import annotations
import json, os, shutil, subprocess, uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

BASE = Path(__file__).resolve().parent.parent
DATA = BASE / 'data'
UPLOADS = DATA / 'uploads'
EXPORTS = DATA / 'exports'
PROJECTS = DATA / 'projects'
TEMPLATES_DIR = DATA / 'templates'

for folder in (UPLOADS, EXPORTS, PROJECTS, TEMPLATES_DIR):
    folder.mkdir(parents=True, exist_ok=True)

app = FastAPI(title='RankForge API', version='2.0.0')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173', 'http://127.0.0.1:5173', '*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

BUILTIN_TEMPLATES = [
    {
        'id': 'classic',
        'name': 'Classic Countdown',
        'category': 'Minimal',
        'description': 'Bold, clean numbers with sleek sandwich layout.',
        'colors': ['#ffffff', '#22d3ee'],
        'title': 'Top 5 Moments',
        'accent': '#22d3ee',
        'rankStyle': 'circle',
        'layout': {
            'canvasBackground': '#000000',
            'topRegion': {'enabled': True, 'height': 12, 'backgroundColor': '#000000', 'fontColor': '#ffffff'},
            'mainRegion': {'fitMode': 'fill', 'cornerRadius': 0, 'showRankBadge': True, 'rankBadgePosition': 'top-left'},
            'bottomRegion': {'enabled': True, 'height': 12, 'backgroundColor': '#000000', 'fontColor': '#ffffff'},
        },
    },
    {
        'id': 'pool-fails',
        'name': 'Pool Fails',
        'category': 'Comedy',
        'description': 'High-contrast red accents and fast viral cuts.',
        'colors': ['#ffffff', '#fb4b4b'],
        'title': 'Ranking Pool Fails',
        'accent': '#fb4b4b',
        'rankStyle': 'square',
        'layout': {
            'canvasBackground': '#180a0a',
            'topRegion': {'enabled': True, 'height': 14, 'backgroundColor': '#180a0a', 'fontColor': '#ff4d4d'},
            'mainRegion': {'fitMode': 'blur-fill', 'cornerRadius': 12, 'showRankBadge': True, 'rankBadgePosition': 'top-left'},
            'bottomRegion': {'enabled': True, 'height': 12, 'backgroundColor': '#180a0a', 'fontColor': '#ffffff'},
        },
    },
    {
        'id': 'trampoline',
        'name': 'Action Highlights',
        'category': 'Sports',
        'description': 'Bright yellow and cyan sports action styling.',
        'colors': ['#ffffff', '#facc15'],
        'title': 'Best Action Moments',
        'accent': '#facc15',
        'rankStyle': 'pill',
        'layout': {
            'canvasBackground': '#081426',
            'topRegion': {'enabled': True, 'height': 13, 'backgroundColor': '#081426', 'fontColor': '#facc15'},
            'mainRegion': {'fitMode': 'fill', 'cornerRadius': 8, 'showRankBadge': True, 'rankBadgePosition': 'top-right'},
            'bottomRegion': {'enabled': True, 'height': 11, 'backgroundColor': '#081426', 'fontColor': '#ffffff'},
        },
    },
    {
        'id': 'bruh',
        'name': 'Bruh Moments',
        'category': 'Comedy',
        'description': 'Punchy neon green accents for comedic ranking videos.',
        'colors': ['#ffffff', '#4ade80'],
        'title': 'Top 5 Bruh Moments',
        'accent': '#4ade80',
        'rankStyle': 'bold',
        'layout': {
            'canvasBackground': '#0a1a0f',
            'topRegion': {'enabled': True, 'height': 12, 'backgroundColor': '#0a1a0f', 'fontColor': '#4ade80'},
            'mainRegion': {'fitMode': 'blur-fill', 'cornerRadius': 14, 'showRankBadge': True, 'rankBadgePosition': 'top-left'},
            'bottomRegion': {'enabled': True, 'height': 12, 'backgroundColor': '#0a1a0f', 'fontColor': '#ffffff'},
        },
    },
    {
        'id': 'cats',
        'name': 'Unreal Cat Moments',
        'category': 'Animals',
        'description': 'Warm gold accents, cat emojis, and large rank badges.',
        'colors': ['#ffffff', '#facc15'],
        'title': 'Ranking Unreal Cat Moments',
        'accent': '#facc15',
        'rankStyle': 'circle',
        'layout': {
            'canvasBackground': '#121212',
            'topRegion': {'enabled': True, 'height': 12, 'backgroundColor': '#121212', 'fontColor': '#facc15'},
            'mainRegion': {'fitMode': 'blur-fill', 'cornerRadius': 10, 'showRankBadge': True, 'rankBadgePosition': 'top-left'},
            'bottomRegion': {'enabled': True, 'height': 12, 'backgroundColor': '#121212', 'fontColor': '#ffffff'},
        },
    },
    {
        'id': 'sports',
        'name': 'Sports Hype',
        'category': 'Sports',
        'description': 'High-energy typography for standout championship plays.',
        'colors': ['#ffffff', '#38bdf8'],
        'title': 'Top 5 Sports Moments',
        'accent': '#38bdf8',
        'rankStyle': 'square',
        'layout': {
            'canvasBackground': '#0a121e',
            'topRegion': {'enabled': True, 'height': 13, 'backgroundColor': '#0a121e', 'fontColor': '#38bdf8'},
            'mainRegion': {'fitMode': 'fill', 'cornerRadius': 0, 'showRankBadge': True, 'rankBadgePosition': 'bottom-left'},
            'bottomRegion': {'enabled': True, 'height': 11, 'backgroundColor': '#0a121e', 'fontColor': '#ffffff'},
        },
    },
]

class ProjectPayload(BaseModel):
    id: str | None = None
    name: str = 'Untitled Ranking'
    title: str = 'Top 5 Moments'
    hookText: str = 'WAIT FOR NUMBER ONE'
    aspectRatio: str = '9:16'
    resolution: str = '1080p'
    fps: int = 30
    templateId: str = 'classic'
    clips: list[dict[str, Any]] = Field(default_factory=list)
    musicAssetId: str | None = None
    musicVolume: float = 0.22
    titleColor: str = '#ffffff'
    accentColor: str = '#22d3ee'
    layout: dict[str, Any] = Field(default_factory=dict)
    category: str = 'General'
    platform: str = 'YouTube Shorts'
    updatedAt: str | None = None

    model_config = {'extra': 'allow'}

class AIGenerateRequest(BaseModel):
    topic: str
    platform: str = 'YouTube Shorts'
    itemCount: int = 5

def read_json(path: Path, default=None):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (json.JSONDecodeError, OSError):
        return default

def write_json(path: Path, value: Any):
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(json.dumps(value, indent=2), encoding='utf-8')
    temp.replace(path)

def escape_drawtext(value: str) -> str:
    if not value:
        return ''
    return (
        value.replace('\\', r'\\')
        .replace(':', r'\:')
        .replace("'", r"\'")
        .replace('%', r'\%')
        .replace(',', r'\,')
        .replace('[', r'\[')
        .replace(']', r'\]')
    )

def to_ffmpeg_color(val: str | None, default: str = 'black') -> str:
    if not val:
        return default
    v = str(val).strip()
    if v.startswith('#'):
        h = v[1:]
        if len(h) == 3:
            h = ''.join(c * 2 for c in h)
        if len(h) == 6:
            return f'0x{h}'
    return v

# ── Health ──────────────────────────────────────────────────
@app.get('/api/health')
def health():
    ffmpeg = shutil.which('ffmpeg')
    return {
        'status': 'ok',
        'ffmpegAvailable': ffmpeg is not None,
        'ffmpegPath': ffmpeg,
    }

# ── Templates ───────────────────────────────────────────────
@app.get('/api/templates')
def get_templates():
    custom = []
    for p in TEMPLATES_DIR.glob('*.json'):
        data = read_json(p)
        if data:
            data['isCustom'] = True
            custom.append(data)
    return BUILTIN_TEMPLATES + custom

@app.post('/api/templates')
def save_template(template: dict[str, Any]):
    tid = template.get('id') or str(uuid.uuid4())
    template['id'] = tid
    template['updatedAt'] = datetime.now(timezone.utc).isoformat()
    write_json(TEMPLATES_DIR / f'{tid}.json', template)
    return template

@app.delete('/api/templates/{template_id}')
def delete_template(template_id: str):
    p = TEMPLATES_DIR / f'{template_id}.json'
    if not p.exists():
        raise HTTPException(404, 'Template not found')
    p.unlink()
    return {'deleted': True}

# ── Projects ────────────────────────────────────────────────
@app.get('/api/projects')
def list_projects():
    rows = []
    for path in PROJECTS.glob('*.json'):
        data = read_json(path)
        if data:
            rows.append({
                'id': data.get('id', path.stem),
                'name': data.get('name', 'Untitled'),
                'updatedAt': data.get('updatedAt'),
            })
    return sorted(rows, key=lambda x: x.get('updatedAt') or '', reverse=True)

@app.get('/api/projects/{project_id}')
def get_project(project_id: str):
    data = read_json(PROJECTS / f'{project_id}.json')
    if not data:
        raise HTTPException(404, 'Project not found')
    return data

@app.post('/api/projects')
def save_project(payload: ProjectPayload):
    data = payload.model_dump()
    data['id'] = data.get('id') or str(uuid.uuid4())
    data['updatedAt'] = datetime.now(timezone.utc).isoformat()
    write_json(PROJECTS / f"{data['id']}.json", data)
    return data

@app.delete('/api/projects/{project_id}')
def delete_project(project_id: str):
    path = PROJECTS / f'{project_id}.json'
    if not path.exists():
        raise HTTPException(404, 'Project not found')
    path.unlink()
    return {'deleted': True}

# ── Assets ──────────────────────────────────────────────────
@app.post('/api/assets')
async def upload_asset(file: UploadFile = File(...)):
    original = Path(file.filename or 'upload.bin').name
    suffix = Path(original).suffix.lower()
    allowed = {'.mp4', '.mov', '.m4v', '.webm', '.mkv', '.mp3', '.wav', '.m4a', '.aac', '.ogg'}
    if suffix not in allowed:
        raise HTTPException(415, 'Unsupported file type. Upload video or audio.')

    asset_id = str(uuid.uuid4())
    target = UPLOADS / f'{asset_id}{suffix}'
    size = 0
    try:
        with target.open('wb') as out:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > 1_000_000_000:
                    raise HTTPException(413, 'File exceeds 1 GB limit.')
                out.write(chunk)
    except Exception:
        target.unlink(missing_ok=True)
        raise

    is_audio = suffix in {'.mp3', '.wav', '.m4a', '.aac', '.ogg'}
    return {
        'id': asset_id,
        'name': original,
        'filename': target.name,
        'url': f'/api/assets/{asset_id}',
        'type': 'audio' if is_audio else 'video',
        'size': size,
        'extension': suffix,
    }

@app.get('/api/assets/{asset_id}')
def get_asset(asset_id: str):
    found = list(UPLOADS.glob(f'{asset_id}.*'))
    if not found:
        raise HTTPException(404, 'Asset not found')
    return FileResponse(found[0], filename=found[0].name)

# ── AI Ranking Generator (Viblo AI Inspired) ────────────────
@app.post('/api/ai/generate-ranking')
def generate_ranking(req: AIGenerateRequest):
    topic = req.topic.strip() or 'Top 5 Viral Moments'
    count = max(3, min(10, req.itemCount))
    t_lower = topic.lower()

    # Intelligent template and category classification
    if any(k in t_lower for k in ['cat', 'dog', 'animal', 'pet', 'wildlife']):
        template_id = 'cats'
        accent = '#facc15'
        default_items = [
            'Hilarious Swimming Fail', 'Laser Pointer Drift', 'The High-Gravity Leap',
            'Keyboard Typist Overtime', 'The Impossible Plot Twist', 'Sneak Attack Mastery',
            'Midnight Zoomies', 'Cardboard Box Champion', 'Mirror Encounter', 'Feather Chase'
        ]
        hook = 'WAIT FOR NUMBER ONE 🐈'
    elif any(k in t_lower for k in ['goal', 'football', 'soccer', 'basketball', 'dunk', 'nba', 'sports', 'athlete']):
        template_id = 'sports'
        accent = '#38bdf8'
        default_items = [
            'Overtime Miracle Play', 'Half-Court Buzzer Beater', 'Impossible Diving Save',
            'Behind-The-Back Assist', 'The Solo Masterpiece', 'Injury Time Header',
            'Ankle-Breaking Crossover', 'Game Winning Penalty', 'Acrobatic Bicycle Kick', 'The Legendary Shot'
        ]
        hook = 'NUMBER 1 BROKE THE INTERNET 🏆'
    elif any(k in t_lower for k in ['fail', 'pool', 'gym', 'accident', 'wipeout', 'skate']):
        template_id = 'pool-fails'
        accent = '#fb4b4b'
        default_items = [
            'Overconfident Launch', 'Equipment Malfunction', 'Slippery Edge Regret',
            'Uncalculated Trajectory', 'The Instant Legend Fail', 'Treadmill Disaster',
            'Weight Room Slip', 'Diving Board Catastrophe', 'Skateboard Wobble', 'Instant Karma'
        ]
        hook = 'WAIT TILL YOU SEE #1 😱'
    elif any(k in t_lower for k in ['bruh', 'funny', 'meme', 'comedy', 'humor', 'lol']):
        template_id = 'bruh'
        accent = '#4ade80'
        default_items = [
            'Questionable Life Choice', 'Awkward Silence Moment', 'The Instant Betrayal',
            'Unexpected Guest Entrance', 'Absolute Peak Bruh', 'Misunderstood Directions',
            'Accidental FaceTime Call', 'Handshake Confusion', 'Auto-Correct Nightmare', 'The Stare of Regret'
        ]
        hook = 'BRO DID NOT JUST DO THAT 💀'
    elif any(k in t_lower for k in ['trampoline', 'trick', 'stunt', 'parkour', 'flip']):
        template_id = 'trampoline'
        accent = '#facc15'
        default_items = [
            'Triple Backflip Attempt', 'Roof To Trampoline Jump', 'Synchronized Bounce',
            'Wall-Run Defiance', 'World Record Airtime', 'Double Gainer Combo',
            'Foam Pit Overthrow', 'Springboard Precision', 'Super Tramp Launch', 'Zero Gravity Sequence'
        ]
        hook = 'WAIT FOR THE FINAL TRICK 🔥'
    else:
        template_id = 'classic'
        accent = '#22d3ee'
        clean = topic.replace('Top', '').replace('top', '').strip()
        default_items = [
            f'Iconic {clean} Entry', f'Unreal {clean} Highlight', f'Mind-Bending {clean}',
            f'Surprising {clean} Play', f'The Undisputed #1 {clean}', f'Hidden Gem in {clean}',
            f'Historic {clean} Event', f'Crowd Favorite {clean}', f'Most Intense {clean}', f'Legendary {clean}'
        ]
        hook = 'WAIT FOR NUMBER ONE 🤯'

    items = []
    for i in range(count):
        rank = count - i
        label = default_items[i % len(default_items)]
        dur = round(3.2 + (count - rank) * 0.25, 1)
        items.append({
            'rank': rank,
            'label': label,
            'duration': dur,
            'description': f'Rank #{rank}: {label}',
        })

    return {
        'title': topic,
        'hookText': hook,
        'templateId': template_id,
        'accentColor': accent,
        'platform': req.platform,
        'items': items,
    }

# ── Sandwich Layout Video Export Pipeline ──────────────────
@app.post('/api/export')
def export_project(payload: ProjectPayload):
    ffmpeg = shutil.which('ffmpeg')
    if not ffmpeg:
        raise HTTPException(
            503,
            'FFmpeg was not found. Install FFmpeg and add its bin folder to system PATH, then restart the backend.',
        )

    clips = [c for c in payload.clips if c.get('assetId')]
    if not clips:
        raise HTTPException(400, 'Import and assign at least one real video clip before exporting.')

    paths = []
    for clip in clips:
        found = list(UPLOADS.glob(f"{clip['assetId']}.*"))
        if not found:
            raise HTTPException(400, f"Missing uploaded video asset: {clip.get('name', 'unknown')}")
        paths.append(found[0])

    music = None
    if payload.musicAssetId:
        found = list(UPLOADS.glob(f'{payload.musicAssetId}.*'))
        music = found[0] if found else None

    # Calculate resolution
    is_hd = payload.resolution == '720p'
    if payload.aspectRatio == '16:9':
        w, h = (1280, 720) if is_hd else (1920, 1080)
    elif payload.aspectRatio == '1:1':
        w = h = 720 if is_hd else 1080
    elif payload.aspectRatio == '4:5':
        w, h = (720, 900) if is_hd else (1080, 1350)
    else:  # 9:16
        w, h = (720, 1280) if is_hd else (1080, 1920)

    fps = max(24, min(60, payload.fps))
    out_id = str(uuid.uuid4())
    out = EXPORTS / f'rankforge-{out_id}.mp4'

    cmd = [ffmpeg, '-y', '-hide_banner', '-loglevel', 'error']
    for p in paths:
        cmd += ['-i', str(p)]

    music_idx = None
    if music:
        music_idx = len(paths)
        cmd += ['-stream_loop', '-1', '-i', str(music)]

    # Parse sandwich layout
    layout = payload.layout or {}
    top_cfg = layout.get('topRegion', {})
    bot_cfg = layout.get('bottomRegion', {})
    main_cfg = layout.get('mainRegion', {})

    top_enabled = top_cfg.get('enabled', True)
    bot_enabled = bot_cfg.get('enabled', True)
    top_h_pct = float(top_cfg.get('height', 12) if top_enabled else 0)
    bot_h_pct = float(bot_cfg.get('height', 12) if bot_enabled else 0)

    top_h = int(h * (top_h_pct / 100.0))
    bot_h = int(h * (bot_h_pct / 100.0))
    main_h = h - top_h - bot_h
    main_y = top_h

    canvas_bg = to_ffmpeg_color(layout.get('canvasBackground', '#000000'))
    top_bg = to_ffmpeg_color(top_cfg.get('backgroundColor', '#000000'))
    bot_bg = to_ffmpeg_color(bot_cfg.get('backgroundColor', '#000000'))
    fit_mode = main_cfg.get('fitMode', 'fill')

    filters = []
    durations = []
    clip_labels = []

    font_file = Path('C:/Windows/Fonts/arial.ttf')
    font_opt = "fontfile='C\\:/Windows/Fonts/arial.ttf':" if font_file.exists() else ""

    for i, c in enumerate(clips):
        try:
            start = max(0.0, float(c.get('sourceStart', 0) or 0))
            end = float(c.get('sourceEnd', 0) or 0)
        except (ValueError, TypeError):
            start, end = 0.0, 0.0

        dur = max(0.5, end - start) if end > start else max(0.5, float(c.get('duration', 4) or 4))
        durations.append(dur)

        trim_filter = f'trim=start={start:.3f}:duration={dur:.3f},setpts=PTS-STARTPTS'

        # 1. Base video composition based on fitMode
        if fit_mode == 'blur-fill':
            blur_bg_tag = f'bgblur{i}'
            fg_tag = f'fg{i}'
            comp_tag = f'comp{i}'
            filters.append(
                f'[{i}:v]{trim_filter},scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},boxblur=24:2,fps={fps}[{blur_bg_tag}]'
            )
            filters.append(
                f'[{i}:v]{trim_filter},scale={w}:{main_h}:force_original_aspect_ratio=decrease,fps={fps}[{fg_tag}]'
            )
            filters.append(
                f'[{blur_bg_tag}][{fg_tag}]overlay=(W-w)/2:{main_y}+({main_h}-h)/2[{comp_tag}]'
            )
            current_v = comp_tag
        elif fit_mode == 'fit':
            canvas_tag = f'canvas{i}'
            filters.append(f'color=c={canvas_bg}:s={w}x{h}:d={dur:.3f}:r={fps}[{canvas_tag}]')
            fg_tag = f'fg{i}'
            comp_tag = f'comp{i}'
            filters.append(
                f'[{i}:v]{trim_filter},scale={w}:{main_h}:force_original_aspect_ratio=decrease,fps={fps}[{fg_tag}]'
            )
            filters.append(
                f'[{canvas_tag}][{fg_tag}]overlay=(W-w)/2:{main_y}+({main_h}-h)/2[{comp_tag}]'
            )
            current_v = comp_tag
        else:  # 'fill'
            canvas_tag = f'canvas{i}'
            filters.append(f'color=c={canvas_bg}:s={w}x{h}:d={dur:.3f}:r={fps}[{canvas_tag}]')
            fg_tag = f'fg{i}'
            comp_tag = f'comp{i}'
            filters.append(
                f'[{i}:v]{trim_filter},scale={w}:{main_h}:force_original_aspect_ratio=increase,crop={w}:{main_h},fps={fps}[{fg_tag}]'
            )
            filters.append(
                f'[{canvas_tag}][{fg_tag}]overlay=0:{main_y}[{comp_tag}]'
            )
            current_v = comp_tag

        # 2. Top region overlay
        if top_enabled and top_h > 10:
            top_box_tag = f'topbox{i}'
            filters.append(
                f'[{current_v}]drawbox=x=0:y=0:w={w}:h={top_h}:color={top_bg}:t=fill[{top_box_tag}]'
            )
            current_v = top_box_tag

            top_title = top_cfg.get('title') or payload.title
            if top_title:
                top_txt_tag = f'toptxt{i}'
                top_color = to_ffmpeg_color(top_cfg.get('fontColor', '#ffffff'), default='white')
                fs = max(18, int(top_h * 0.40))
                filters.append(
                    f"[{current_v}]drawtext={font_opt}text='{escape_drawtext(top_title[:80])}':fontcolor={top_color}:borderw=2:bordercolor=black:fontsize={fs}:x=(w-text_w)/2:y={int(top_h * 0.28)}[{top_txt_tag}]"
                )
                current_v = top_txt_tag

        # 3. Bottom region overlay
        if bot_enabled and bot_h > 10:
            bot_box_tag = f'botbox{i}'
            filters.append(
                f'[{current_v}]drawbox=x=0:y={h - bot_h}:w={w}:h={bot_h}:color={bot_bg}:t=fill[{bot_box_tag}]'
            )
            current_v = bot_box_tag

            bot_caption = bot_cfg.get('caption') or payload.hookText
            if bot_caption:
                bot_txt_tag = f'bottxt{i}'
                bot_color = to_ffmpeg_color(bot_cfg.get('fontColor', '#ffffff'), default='white')
                fs = max(14, int(bot_h * 0.36))
                filters.append(
                    f"[{current_v}]drawtext={font_opt}text='{escape_drawtext(bot_caption[:80])}':fontcolor={bot_color}:borderw=2:bordercolor=black:fontsize={fs}:x=(w-text_w)/2:y={h - bot_h + int(bot_h * 0.3)}[{bot_txt_tag}]"
                )
                current_v = bot_txt_tag

        # 4. Rank badge
        if main_cfg.get('showRankBadge', True):
            badge_tag = f'badge{i}'
            rank_num = c.get('rank', len(clips) - i)
            badge_pos = main_cfg.get('rankBadgePosition', 'top-left')

            if 'left' in badge_pos:
                bx = 'w*0.06'
            else:
                bx = 'w*0.82'

            if 'top' in badge_pos:
                by = f'{main_y} + h*0.04'
            else:
                by = f'{main_y + main_h} - h*0.12'

            accent = to_ffmpeg_color(c.get('color') or payload.accentColor, default='cyan')
            fs = max(24, int(h * 0.045))
            filters.append(
                f"[{current_v}]drawtext={font_opt}text='#{rank_num}':fontcolor={accent}:borderw=3:bordercolor=black:fontsize={fs}:x={bx}:y={by}:box=1:boxcolor=black@0.6:boxborderw=8[{badge_tag}]"
            )
            current_v = badge_tag

        # 5. Clip Label
        label = c.get('label', '')
        if label:
            label_tag = f'label{i}'
            fs = max(16, int(h * 0.024))
            ly = f'{main_y + main_h} - h*0.06'
            filters.append(
                f"[{current_v}]drawtext={font_opt}text='{escape_drawtext(label[:60])}':fontcolor=white:borderw=2:bordercolor=black:fontsize={fs}:x=(w-text_w)/2:y={ly}:box=1:boxcolor=black@0.5:boxborderw=6[{label_tag}]"
            )
            current_v = label_tag

        out_clip_tag = f'vclip{i}'
        filters.append(f'[{current_v}]setsar=1,format=yuv420p[{out_clip_tag}]')
        clip_labels.append(f'[{out_clip_tag}]')

    # Concat all clips
    concat_tag = 'base_concat'
    filters.append(''.join(clip_labels) + f'concat=n={len(clips)}:v=1:a=0[{concat_tag}]')
    final_v = concat_tag

    # Opening Hook (first 1.8 seconds)
    if payload.hookText:
        hook_tag = 'hook_video'
        fs = max(20, int(h * 0.035))
        filters.append(
            f"[{final_v}]drawtext={font_opt}text='{escape_drawtext(payload.hookText[:80])}':fontcolor=yellow:borderw=4:bordercolor=black:fontsize={fs}:x=(w-text_w)/2:y={main_y + int(main_h * 0.35)}:box=1:boxcolor=black@0.75:boxborderw=12:enable='between(t,0,1.8)'[{hook_tag}]"
        )
        final_v = hook_tag

    total_duration = sum(durations)

    # Audio mixing
    if music_idx is not None:
        music_vol = max(0.0, min(1.0, float(payload.musicVolume)))
        filters.append(
            f'[{music_idx}:a]volume={music_vol:.2f},atrim=duration={total_duration:.3f},asetpts=PTS-STARTPTS[music_out]'
        )
        cmd += [
            '-filter_complex', ';'.join(filters),
            '-map', f'[{final_v}]',
            '-map', '[music_out]',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-shortest',
        ]
    else:
        cmd += [
            '-filter_complex', ';'.join(filters),
            '-map', f'[{final_v}]',
            '-an',
        ]

    cmd += [
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '20',
        '-pix_fmt', 'yuv420p',
        '-r', str(fps),
        '-movflags', '+faststart',
        str(out),
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=1800)
    except subprocess.TimeoutExpired:
        out.unlink(missing_ok=True)
        raise HTTPException(504, 'Video export timed out.')

    if result.returncode or not out.exists() or out.stat().st_size < 1024:
        out.unlink(missing_ok=True)
        raise HTTPException(500, f"FFmpeg export failed: {(result.stderr or 'Unknown error')[-1800:]}")

    return {
        'id': out_id,
        'filename': out.name,
        'url': f'/api/exports/{out_id}',
        'size': out.stat().st_size,
        'durationEstimate': round(total_duration, 2),
    }

@app.get('/api/exports/{export_id}')
def get_export(export_id: str):
    path = EXPORTS / f'rankforge-{export_id}.mp4'
    if not path.exists():
        raise HTTPException(404, 'Export not found')
    return FileResponse(path, media_type='video/mp4', filename=path.name)
