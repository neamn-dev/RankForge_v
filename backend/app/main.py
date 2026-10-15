from __future__ import annotations
import json, os, shutil, subprocess, uuid, urllib.request, urllib.error
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field

BASE = Path(__file__).resolve().parent.parent
DATA = BASE / 'data'
UPLOADS = DATA / 'uploads'
EXPORTS = DATA / 'exports'
PROJECTS = DATA / 'projects'
TEMPLATES_DIR = DATA / 'templates'
THUMBS_DIR = DATA / 'thumbnails'
ASSETS_META = DATA / 'assets.json'

for folder in (UPLOADS, EXPORTS, PROJECTS, TEMPLATES_DIR, THUMBS_DIR):
    folder.mkdir(parents=True, exist_ok=True)

app = FastAPI(title='RankForge API', version='2.1.0')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173', 'http://127.0.0.1:5173', '*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# ── JSON Utilities ───────────────────────────────────────────
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

# ── Media Probing & Thumbnail Generation ────────────────────
def probe_media_file(file_path: Path) -> dict[str, Any]:
    ffprobe = shutil.which('ffprobe')
    info = {
        'duration': 5.0,
        'width': 1080,
        'height': 1920,
        'hasAudio': False,
        'hasVideo': False,
        'codec': '',
    }
    if not ffprobe or not file_path.exists():
        return info
    try:
        res = subprocess.run(
            [
                ffprobe, '-v', 'error',
                '-show_entries', 'format=duration,size:stream=width,height,codec_name,codec_type',
                '-of', 'json', str(file_path),
            ],
            capture_output=True, text=True, timeout=12,
        )
        if res.returncode == 0:
            data = json.loads(res.stdout)
            fmt = data.get('format', {})
            if 'duration' in fmt:
                try:
                    info['duration'] = round(float(fmt['duration']), 2)
                except (ValueError, TypeError):
                    pass
            for st in data.get('streams', []):
                ctype = st.get('codec_type')
                if ctype == 'video':
                    info['hasVideo'] = True
                    info['width'] = st.get('width', 1080)
                    info['height'] = st.get('height', 1920)
                    info['codec'] = st.get('codec_name', '')
                elif ctype == 'audio':
                    info['hasAudio'] = True
    except Exception:
        pass
    return info

def generate_video_thumbnail(video_path: Path, thumb_path: Path) -> bool:
    ffmpeg = shutil.which('ffmpeg')
    if not ffmpeg or not video_path.exists():
        return False
    try:
        cmd = [
            ffmpeg, '-y', '-hide_banner', '-loglevel', 'error',
            '-ss', '00:00:01.000', '-i', str(video_path),
            '-vframes', '1', '-vf', 'scale=360:-1', str(thumb_path)
        ]
        res = subprocess.run(cmd, capture_output=True, timeout=10)
        return res.returncode == 0 and thumb_path.exists()
    except Exception:
        return False

# ── Asset Registry Management ───────────────────────────────
def get_assets_registry() -> dict[str, dict[str, Any]]:
    return read_json(ASSETS_META, default={})

def save_assets_registry(registry: dict[str, dict[str, Any]]):
    write_json(ASSETS_META, registry)

def ensure_sample_audio():
    sample_mp3 = UPLOADS / 'rankforge_synth_pulse.mp3'
    if not sample_mp3.exists():
        ffmpeg = shutil.which('ffmpeg')
        if ffmpeg:
            try:
                cmd = [
                    ffmpeg, '-y', '-hide_banner', '-loglevel', 'error',
                    '-f', 'lavfi', '-i',
                    'anoisesrc=d=30:c=pink:r=44100:a=0.03,lowpass=f=900,volume=0.7',
                    '-f', 'lavfi', '-i',
                    'sine=frequency=180:duration=30,volume=0.12',
                    '-filter_complex', 'amix=inputs=2:duration=first',
                    '-c:a', 'libmp3lame', '-b:a', '128k', str(sample_mp3)
                ]
                subprocess.run(cmd, capture_output=True, timeout=15)
            except Exception:
                pass

def sync_assets_registry():
    registry = get_assets_registry()
    dirty = False

    video_exts = {'.mp4', '.mov', '.m4v', '.webm', '.mkv'}
    audio_exts = {'.mp3', '.wav', '.m4a', '.aac', '.ogg'}
    image_exts = {'.png', '.jpg', '.jpeg', '.webp'}

    demo_names = [
        'Gym Incline Disaster.mp4',
        'Laser Pointer Drift.mp4',
        'Roof Trampoline Drop.mp4',
        'Half Court Miracle Dunk.mp4',
        'The Impossible Cat Leap.mp4',
        'Pool Diving Fail.mp4',
        'Buzzer Beater Finish.mp4',
        'Unreal Parkour Bounce.mp4',
    ]
    demo_idx = 0

    for file_path in UPLOADS.iterdir():
        if not file_path.is_file() or file_path.name.startswith('.'):
            continue
        suffix = file_path.suffix.lower()
        if suffix not in (video_exts | audio_exts | image_exts):
            continue

        asset_id = file_path.stem
        if asset_id not in registry:
            is_video = suffix in video_exts
            is_audio = suffix in audio_exts
            is_image = suffix in image_exts
            media_type = 'video' if is_video else ('audio' if is_audio else 'image')

            if file_path.name == 'rankforge_synth_pulse.mp3':
                friendly_name = 'Synthwave Beat (Royalty Free).mp3'
            elif demo_idx < len(demo_names) and is_video:
                friendly_name = demo_names[demo_idx]
                demo_idx += 1
            else:
                friendly_name = file_path.name

            probed = probe_media_file(file_path) if (is_video or is_audio) else {'duration': 4.0, 'width': 1080, 'height': 1920}

            thumb_name = f'{asset_id}.jpg'
            thumb_path = THUMBS_DIR / thumb_name
            has_thumb = False
            if is_video:
                has_thumb = generate_video_thumbnail(file_path, thumb_path)

            registry[asset_id] = {
                'id': asset_id,
                'name': friendly_name,
                'filename': file_path.name,
                'url': f'/api/assets/{asset_id}',
                'thumbnailUrl': f'/api/assets/{asset_id}/thumbnail' if has_thumb else None,
                'type': media_type,
                'size': file_path.stat().st_size,
                'extension': suffix,
                'duration': probed.get('duration', 5.0),
                'width': probed.get('width', 1080),
                'height': probed.get('height', 1920),
                'createdAt': datetime.now(timezone.utc).isoformat(),
            }
            dirty = True

    if dirty:
        save_assets_registry(registry)

ensure_sample_audio()
sync_assets_registry()

# ── Builtin Templates ───────────────────────────────────────
BUILTIN_TEMPLATES = [
    {
        'id': 'classic',
        'name': 'Classic Countdown',
        'category': 'Minimal',
        'description': 'Bold, clean numbers with sleek black sandwich layout.',
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
        'description': 'Warm gold accents, emojis, and large rank badges.',
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
    {
        'id': 'gaming',
        'name': 'Gaming Plays',
        'category': 'Gaming',
        'description': 'Electric purple and cyan framing for clutch plays.',
        'colors': ['#ffffff', '#c084fc'],
        'title': 'Top 5 Gaming Clutches',
        'accent': '#c084fc',
        'rankStyle': 'pill',
        'layout': {
            'canvasBackground': '#130a24',
            'topRegion': {'enabled': True, 'height': 13, 'backgroundColor': '#130a24', 'fontColor': '#c084fc'},
            'mainRegion': {'fitMode': 'blur-fill', 'cornerRadius': 12, 'showRankBadge': True, 'rankBadgePosition': 'top-left'},
            'bottomRegion': {'enabled': True, 'height': 12, 'backgroundColor': '#130a24', 'fontColor': '#ffffff'},
        },
    },
    {
        'id': 'cinematic',
        'name': 'Cinematic Countdown',
        'category': 'Film',
        'description': 'Sophisticated letterboxed framing with silver typography.',
        'colors': ['#e2e8f0', '#94a3b8'],
        'title': 'Top 5 Greatest Scenes',
        'accent': '#94a3b8',
        'rankStyle': 'outline',
        'layout': {
            'canvasBackground': '#05070a',
            'topRegion': {'enabled': True, 'height': 14, 'backgroundColor': '#05070a', 'fontColor': '#e2e8f0'},
            'mainRegion': {'fitMode': 'fit', 'cornerRadius': 6, 'showRankBadge': True, 'rankBadgePosition': 'bottom-right'},
            'bottomRegion': {'enabled': True, 'height': 12, 'backgroundColor': '#05070a', 'fontColor': '#94a3b8'},
        },
    },
]

# ── Data Models ─────────────────────────────────────────────
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
    niche: str | None = None

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
@app.get('/api/assets')
def list_assets():
    sync_assets_registry()
    registry = get_assets_registry()
    assets = list(registry.values())
    return sorted(assets, key=lambda a: a.get('createdAt') or '', reverse=True)

@app.post('/api/assets')
async def upload_asset(file: UploadFile = File(...)):
    original = Path(file.filename or 'upload.bin').name
    suffix = Path(original).suffix.lower()
    allowed_videos = {'.mp4', '.mov', '.m4v', '.webm', '.mkv'}
    allowed_audios = {'.mp3', '.wav', '.m4a', '.aac', '.ogg'}
    allowed_images = {'.png', '.jpg', '.jpeg', '.webp'}
    allowed = allowed_videos | allowed_audios | allowed_images

    if suffix not in allowed:
        raise HTTPException(
            415,
            f'Unsupported file type {suffix}. Allowed: Video (.mp4, .mov, .webm), Audio (.mp3, .wav), Image (.png, .jpg, .webp)'
        )

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

    is_audio = suffix in allowed_audios
    is_image = suffix in allowed_images
    media_type = 'audio' if is_audio else ('image' if is_image else 'video')

    probed = probe_media_file(target) if not is_image else {'duration': 4.0, 'width': 1080, 'height': 1920}

    # Generate thumbnail for video
    thumb_path = THUMBS_DIR / f'{asset_id}.jpg'
    has_thumb = False
    if media_type == 'video':
        has_thumb = generate_video_thumbnail(target, thumb_path)

    asset_item = {
        'id': asset_id,
        'name': original,
        'filename': target.name,
        'url': f'/api/assets/{asset_id}',
        'thumbnailUrl': f'/api/assets/{asset_id}/thumbnail' if has_thumb else None,
        'type': media_type,
        'size': size,
        'extension': suffix,
        'duration': probed.get('duration', 5.0),
        'width': probed.get('width', 1080),
        'height': probed.get('height', 1920),
        'createdAt': datetime.now(timezone.utc).isoformat(),
    }

    registry = get_assets_registry()
    registry[asset_id] = asset_item
    save_assets_registry(registry)

    return asset_item

@app.get('/api/assets/{asset_id}')
def get_asset(asset_id: str):
    found = list(UPLOADS.glob(f'{asset_id}.*'))
    if not found:
        raise HTTPException(404, 'Asset not found')
    f = found[0]
    media_type = 'video/mp4'
    if f.suffix in {'.mp3', '.wav', '.m4a', '.ogg'}:
        media_type = 'audio/mpeg'
    elif f.suffix in {'.jpg', '.jpeg'}:
        media_type = 'image/jpeg'
    elif f.suffix == '.png':
        media_type = 'image/png'
    return FileResponse(f, media_type=media_type, filename=f.name)

@app.get('/api/assets/{asset_id}/thumbnail')
def get_asset_thumbnail(asset_id: str):
    thumb = THUMBS_DIR / f'{asset_id}.jpg'
    if thumb.exists():
        return FileResponse(thumb, media_type='image/jpeg')

    found = list(UPLOADS.glob(f'{asset_id}.*'))
    if found and found[0].suffix.lower() in {'.mp4', '.mov', '.webm', '.mkv'}:
        if generate_video_thumbnail(found[0], thumb):
            return FileResponse(thumb, media_type='image/jpeg')

    raise HTTPException(404, 'Thumbnail not found')

@app.delete('/api/assets/{asset_id}')
def delete_asset(asset_id: str):
    found = list(UPLOADS.glob(f'{asset_id}.*'))
    for f in found:
        f.unlink(missing_ok=True)
    thumb = THUMBS_DIR / f'{asset_id}.jpg'
    thumb.unlink(missing_ok=True)

    registry = get_assets_registry()
    if asset_id in registry:
        del registry[asset_id]
        save_assets_registry(registry)

    return {'deleted': True}

# ── AI Ranking Generator (Viblo AI Inspired) ────────────────
VIRAL_NICHES = {
    'cats': {
        'templateId': 'cats', 'accent': '#facc15',
        'hook': 'WAIT FOR NUMBER ONE 🐈',
        'items': [
            ('Hilarious Swimming Fail', 'Instant miscalculation into the bathtub', 'Swimming Cat Fail'),
            ('Laser Pointer Drift', 'Tokyo drift across the hardwood floor', 'Laser Pointer Drift'),
            ('The High-Gravity Leap', 'Defying physics with zero launch speed', 'The High-Gravity Leap'),
            ('Keyboard Typist Overtime', 'Typing 200 WPM on a mechanical keyboard', 'Keyboard Typist Cat'),
            ('The Impossible Plot Twist', 'Unbelievable jump save from the ceiling', 'The Ultimate Plot Twist'),
            ('Cardboard Box Champion', 'If it fits, it sits: Olympic edition', 'Box Champion'),
            ('Midnight Zoomies', 'Unstoppable 3 AM velocity around the couch', 'Midnight Zoomies'),
        ],
    },
    'sports': {
        'templateId': 'sports', 'accent': '#38bdf8',
        'hook': 'NUMBER 1 BROKE THE INTERNET 🏆',
        'items': [
            ('Overtime Miracle Play', 'Game-winning buzzer beater with 0.1 seconds left', 'Overtime Miracle Play'),
            ('Half-Court Swish', 'He launched it from beyond the logo', 'Half-Court Buzzer Beater'),
            ('Impossible Diving Save', 'Goalkeeper stretches beyond human limits', 'Impossible Diving Save'),
            ('Behind-The-Back Assist', 'Blind no-look pass that froze the entire defense', 'Behind-The-Back Assist'),
            ('The Solo Masterpiece', 'Dribbles past four defenders for the finish', 'The Solo Masterpiece'),
            ('Ankle-Breaking Crossover', 'Defender literally slid across the floor', 'Ankle-Breaking Crossover'),
        ],
    },
    'pool-fails': {
        'templateId': 'pool-fails', 'accent': '#fb4b4b',
        'hook': 'WAIT TILL YOU SEE #1 😱',
        'items': [
            ('Overconfident Launch', 'Slipped before the diving board even bounced', 'Overconfident Launch'),
            ('Equipment Malfunction', 'Inflatable flamingo had other plans', 'Equipment Malfunction'),
            ('Slippery Edge Regret', 'The exact second he realized there was no friction', 'Slippery Edge Regret'),
            ('Uncalculated Trajectory', 'Total belly flop into the shallow end', 'Uncalculated Trajectory'),
            ('The Instant Legend Fail', 'Diving board snapped in mid air', 'Diving Board Catastrophe'),
        ],
    },
    'bruh': {
        'templateId': 'bruh', 'accent': '#4ade80',
        'hook': 'BRO DID NOT JUST DO THAT 💀',
        'items': [
            ('Questionable Life Choice', 'Confidence was 100, execution was zero', 'Questionable Life Choice'),
            ('Awkward Silence Moment', 'Wave back to someone waving at someone behind you', 'Awkward Silence Moment'),
            ('The Instant Betrayal', 'Best friend dropped the pizza box upside down', 'The Instant Betrayal'),
            ('Unexpected Guest Entrance', 'Walked directly into the glass sliding door', 'Glass Door Incident'),
            ('Absolute Peak Bruh', 'Looked for phone for 10 minutes while holding it', 'Absolute Peak Bruh'),
        ],
    },
    'trampoline': {
        'templateId': 'trampoline', 'accent': '#facc15',
        'hook': 'WAIT FOR THE FINAL TRICK 🔥',
        'items': [
            ('Triple Backflip Attempt', 'Rotation speed was dizzying', 'Triple Backflip Attempt'),
            ('Roof To Trampoline Jump', 'Calculated jump into maximum bounce', 'Roof To Trampoline Jump'),
            ('Synchronized Double Bounce', 'Two acrobats launched simultaneously', 'Synchronized Bounce'),
            ('Wall-Run Defiance', 'Running up the vertical wall and flipping backwards', 'Wall-Run Defiance'),
            ('World Record Airtime', 'Super trampoline launch reaching roof height', 'World Record Airtime'),
        ],
    },
    'gaming': {
        'templateId': 'gaming', 'accent': '#c084fc',
        'hook': 'NO WAY HE HIT THAT CLUTCH 🎮',
        'items': [
            ('1v5 Impossible Defuse', 'Last bullet, zero armor, full squad wipe', '1v5 Clutch Defuse'),
            ('360 No-Scope Across Map', 'He shot blindly through the smoke', '360 No-Scope'),
            ('Frame-Perfect Parry', 'Countered the boss at 1% health', 'Frame-Perfect Parry'),
            ('Speedrun World Record', 'Skip that bypassed 40 minutes of gameplay', 'Glitch World Record'),
            ('The 200 IQ Trap', 'Lured the entire enemy team into one grenade', '200 IQ Trap'),
        ],
    },
    'classic': {
        'templateId': 'classic', 'accent': '#22d3ee',
        'hook': 'WAIT FOR NUMBER ONE 🤯',
        'items': [
            ('Mind-Bending Highlight', 'Nobody expected this sequence of events', 'Mind-Bending Highlight'),
            ('Unreal Performance', 'Peak precision under maximum pressure', 'Unreal Performance'),
            ('Surprising Twist', 'The outcome flipped in three seconds', 'Surprising Twist'),
            ('Crowd Favorite Pick', 'The moment that made the entire arena roar', 'Crowd Favorite Pick'),
            ('The Undisputed #1 Entry', 'Historic perfection that will never be topped', 'Undisputed #1 Legend'),
        ],
    },
}

def generate_with_llm(topic: str, platform: str, count: int) -> dict[str, Any] | None:
    api_key = os.environ.get('GEMINI_API_KEY') or os.environ.get('OPENAI_API_KEY')
    if not api_key:
        return None

    prompt = (
        f"You are a viral YouTube Shorts/TikTok ranking video producer. "
        f"Create an engaging countdown ranking for topic: '{topic}' with {count} items for {platform}. "
        f"Return ONLY valid JSON with keys:\n"
        f"title (string), hookText (string, punchy all-caps opening hook), templateId ('classic'|'cats'|'sports'|'pool-fails'|'bruh'|'trampoline'|'gaming'), "
        f"accentColor (hex string), items (array of {count} objects in descending rank order, e.g. #{count} down to #1, each with rank, label, duration (3.0-5.5), description, narration (script sentence))."
    )

    try:
        if os.environ.get('GEMINI_API_KEY'):
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={os.environ['GEMINI_API_KEY']}"
            payload = json.dumps({
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"response_mime_type": "application/json"}
            }).encode('utf-8')
            req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'}, method='POST')
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                text = data['candidates'][0]['content']['parts'][0]['text']
                return json.loads(text)
    except Exception:
        pass
    return None

@app.post('/api/ai/generate-ranking')
def generate_ranking(req: AIGenerateRequest):
    topic = req.topic.strip() or 'Top 5 Viral Moments'
    count = max(3, min(10, req.itemCount))

    llm_result = generate_with_llm(topic, req.platform, count)
    if llm_result and 'items' in llm_result and len(llm_result['items']) >= count:
        return llm_result

    t_lower = topic.lower()
    if any(k in t_lower for k in ['cat', 'dog', 'animal', 'pet', 'wildlife', 'kitten', 'puppy']):
        category_key = 'cats'
    elif any(k in t_lower for k in ['game', 'gaming', 'clutch', 'fps', 'fortnite', 'cod', 'esports', 'minecraft', 'streamer']):
        category_key = 'gaming'
    elif any(k in t_lower for k in ['goal', 'football', 'soccer', 'basketball', 'dunk', 'nba', 'sports', 'athlete', 'race', 'tennis']):
        category_key = 'sports'
    elif any(k in t_lower for k in ['fail', 'pool', 'gym', 'accident', 'wipeout', 'skate', 'slip', 'crash']):
        category_key = 'pool-fails'
    elif any(k in t_lower for k in ['bruh', 'funny', 'meme', 'comedy', 'humor', 'lol', 'cringe', 'joke']):
        category_key = 'bruh'
    elif any(k in t_lower for k in ['trampoline', 'trick', 'stunt', 'parkour', 'flip', 'jump']):
        category_key = 'trampoline'
    else:
        category_key = 'classic'

    niche = VIRAL_NICHES[category_key]
    template_id = niche['templateId']
    accent = niche['accent']
    hook = niche['hook']
    source_items = niche['items']

    items = []
    clean_topic = topic.replace('Top', '').replace('top', '').strip()

    for i in range(count):
        rank = count - i
        if i < len(source_items):
            label, desc, narration = source_items[i]
        else:
            label = f'Unreal {clean_topic} #{rank}'
            desc = f'Spectacular highlight ranked at position #{rank}'
            narration = f'Coming in at number {rank}, check out this unbelievable {clean_topic} moment!'

        dur = round(3.2 + (count - rank) * 0.25, 1)
        items.append({
            'rank': rank,
            'label': label,
            'duration': dur,
            'description': desc,
            'narration': narration,
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

    paths: list[Path] = []
    clip_is_image: list[bool] = []

    for clip in clips:
        found = list(UPLOADS.glob(f"{clip['assetId']}.*"))
        if not found:
            raise HTTPException(400, f"Missing uploaded video asset: {clip.get('name', 'unknown')}")
        file_path = found[0]
        paths.append(file_path)
        clip_is_image.append(file_path.suffix.lower() in {'.png', '.jpg', '.jpeg', '.webp'})

    music: Path | None = None
    if payload.musicAssetId:
        found = list(UPLOADS.glob(f'{payload.musicAssetId}.*'))
        music = found[0] if found else None

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

    for idx, (p, is_img) in enumerate(zip(paths, clip_is_image)):
        if is_img:
            cmd += ['-loop', '1', '-i', str(p)]
        else:
            cmd += ['-i', str(p)]

    music_idx: int | None = None
    if music:
        music_idx = len(paths)
        cmd += ['-stream_loop', '-1', '-i', str(music)]

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
    main_h = max(100, h - top_h - bot_h)
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

    for i, (c, is_img) in enumerate(zip(clips, clip_is_image)):
        try:
            start = max(0.0, float(c.get('sourceStart', 0) or 0))
            end = float(c.get('sourceEnd', 0) or 0)
        except (ValueError, TypeError):
            start, end = 0.0, 0.0

        dur = max(0.5, end - start) if end > start else max(0.5, float(c.get('duration', 4) or 4))
        durations.append(dur)

        if is_img:
            trim_filter = f'trim=duration={dur:.3f},setpts=PTS-STARTPTS'
        else:
            trim_filter = f'trim=start={start:.3f}:duration={dur:.3f},setpts=PTS-STARTPTS'

        adj = c.get('adjustments') or {}
        br = float(adj.get('brightness', 100)) / 100.0
        co = float(adj.get('contrast', 100)) / 100.0
        sa = float(adj.get('saturation', 100)) / 100.0
        adj_filter = ''
        if abs(br - 1.0) > 0.02 or abs(co - 1.0) > 0.02 or abs(sa - 1.0) > 0.02:
            eq_b = max(-0.8, min(0.8, br - 1.0))
            eq_c = max(0.2, min(3.0, co))
            eq_s = max(0.0, min(3.0, sa))
            adj_filter = f',eq=brightness={eq_b:.2f}:contrast={eq_c:.2f}:saturation={eq_s:.2f}'

        speed = float(c.get('speed', 1.0) or 1.0)
        speed_filter = f',setpts={1.0 / speed:.3f}*PTS' if abs(speed - 1.0) > 0.05 else ''

        full_clip_prep = f'{trim_filter}{adj_filter}{speed_filter}'

        if fit_mode == 'blur-fill':
            blur_bg_tag = f'bgblur{i}'
            fg_tag = f'fg{i}'
            comp_tag = f'comp{i}'
            filters.append(
                f'[{i}:v]{full_clip_prep},scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},boxblur=24:2,fps={fps}[{blur_bg_tag}]'
            )
            filters.append(
                f'[{i}:v]{full_clip_prep},scale={w}:{main_h}:force_original_aspect_ratio=decrease,fps={fps}[{fg_tag}]'
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
                f'[{i}:v]{full_clip_prep},scale={w}:{main_h}:force_original_aspect_ratio=decrease,fps={fps}[{fg_tag}]'
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
                f'[{i}:v]{full_clip_prep},scale={w}:{main_h}:force_original_aspect_ratio=increase,crop={w}:{main_h},fps={fps}[{fg_tag}]'
            )
            filters.append(
                f'[{canvas_tag}][{fg_tag}]overlay=0:{main_y}[{comp_tag}]'
            )
            current_v = comp_tag

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

        if main_cfg.get('showRankBadge', True):
            badge_tag = f'badge{i}'
            rank_num = c.get('rank', len(clips) - i)
            badge_pos = main_cfg.get('rankBadgePosition', 'top-left')

            if 'left' in badge_pos:
                bx = 'w*0.06'
            else:
                bx = 'w*0.82'

            if 'top' in badge_pos:
                by = f'{main_y}+h*0.04'
            else:
                by = f'{main_y + main_h}-h*0.12'

            accent = to_ffmpeg_color(c.get('color') or payload.accentColor, default='cyan')
            fs = max(24, int(h * 0.045))
            filters.append(
                f"[{current_v}]drawtext={font_opt}text='#{rank_num}':fontcolor={accent}:borderw=3:bordercolor=black:fontsize={fs}:x={bx}:y={by}:box=1:boxcolor=black@0.65:boxborderw=8[{badge_tag}]"
            )
            current_v = badge_tag

        label = c.get('label', '')
        if label:
            label_tag = f'label{i}'
            fs = max(16, int(h * 0.024))
            ly = f'{main_y + main_h}-h*0.07'
            filters.append(
                f"[{current_v}]drawtext={font_opt}text='{escape_drawtext(label[:60])}':fontcolor=white:borderw=2:bordercolor=black:fontsize={fs}:x=(w-text_w)/2:y={ly}:box=1:boxcolor=black@0.55:boxborderw=6[{label_tag}]"
            )
            current_v = label_tag

        out_clip_tag = f'vclip{i}'
        filters.append(f'[{current_v}]setsar=1,format=yuv420p[{out_clip_tag}]')
        clip_labels.append(f'[{out_clip_tag}]')

    concat_tag = 'base_concat'
    filters.append(''.join(clip_labels) + f'concat=n={len(clips)}:v=1:a=0[{concat_tag}]')
    final_v = concat_tag

    if payload.hookText:
        hook_tag = 'hook_video'
        fs = max(20, int(h * 0.035))
        filters.append(
            f"[{final_v}]drawtext={font_opt}text='{escape_drawtext(payload.hookText[:80])}':fontcolor=yellow:borderw=4:bordercolor=black:fontsize={fs}:x=(w-text_w)/2:y={main_y + int(main_h * 0.35)}:box=1:boxcolor=black@0.75:boxborderw=12:enable='between(t,0,1.8)'[{hook_tag}]"
        )
        final_v = hook_tag

    total_duration = sum(durations)

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
