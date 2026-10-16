import pytest
from fastapi.testclient import TestClient
from app.main import app, DATA, UPLOADS

client = TestClient(app)

def test_health_endpoint():
    response = client.get('/api/health')
    assert response.status_code == 200
    data = response.json()
    assert data['status'] == 'ok'
    assert 'ffmpegAvailable' in data

def test_get_templates():
    response = client.get('/api/templates')
    assert response.status_code == 200
    templates = response.json()
    assert isinstance(templates, list)
    assert len(templates) >= 6
    ids = [t['id'] for t in templates]
    assert 'classic' in ids
    assert 'cats' in ids
    assert 'sports' in ids

def test_ai_ranking_generator():
    payload = {
        'topic': 'Top 5 Unreal Cat Moments',
        'platform': 'YouTube Shorts',
        'itemCount': 5,
    }
    response = client.post('/api/ai/generate-ranking', json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data['title'] == 'Top 5 Unreal Cat Moments'
    assert 'hookText' in data
    assert len(data['items']) == 5
    assert data['templateId'] == 'cats'
    # Verify rankings descend
    ranks = [item['rank'] for item in data['items']]
    assert ranks == [5, 4, 3, 2, 1]

def test_ai_ranking_generator_sports():
    payload = {
        'topic': 'Top 3 Impossible Basketball Dunks',
        'platform': 'TikTok',
        'itemCount': 3,
    }
    response = client.post('/api/ai/generate-ranking', json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data['items']) == 3
    assert data['templateId'] == 'sports'

def test_project_crud():
    # 1. Create project with Sandwich Layout
    project_data = {
        'name': 'Pytest Sandwich Project',
        'title': 'TOP 5 MOMENTS',
        'hookText': 'WAIT FOR IT',
        'aspectRatio': '9:16',
        'resolution': '1080p',
        'fps': 30,
        'templateId': 'classic',
        'clips': [
            {
                'id': 'c1',
                'name': 'Test Clip 1',
                'sourceStart': 0,
                'sourceEnd': 4,
                'duration': 4,
                'label': 'Moment #1',
                'rank': 1,
                'color': '#22d3ee',
            }
        ],
        'layout': {
            'canvasBackground': '#000000',
            'topRegion': {
                'enabled': True,
                'height': 15,
                'backgroundColor': '#0a1628',
                'fontColor': '#ffffff',
                'title': 'TOP 5 MOMENTS',
            },
            'mainRegion': {
                'fitMode': 'blur-fill',
                'cornerRadius': 12,
                'showRankBadge': True,
                'rankBadgePosition': 'top-left',
            },
            'bottomRegion': {
                'enabled': True,
                'height': 12,
                'backgroundColor': '#0a1628',
                'fontColor': '#ffffff',
                'caption': 'WAIT FOR IT',
            },
        },
    }

    # Save
    save_resp = client.post('/api/projects', json=project_data)
    assert save_resp.status_code == 200
    saved = save_resp.json()
    project_id = saved['id']
    assert project_id is not None
    assert saved['name'] == 'Pytest Sandwich Project'
    assert saved['layout']['topRegion']['height'] == 15
    assert saved['layout']['mainRegion']['fitMode'] == 'blur-fill'

    # Get by ID
    get_resp = client.get(f'/api/projects/{project_id}')
    assert get_resp.status_code == 200
    fetched = get_resp.json()
    assert fetched['id'] == project_id
    assert fetched['name'] == 'Pytest Sandwich Project'

    # List
    list_resp = client.get('/api/projects')
    assert list_resp.status_code == 200
    projects = list_resp.json()
    assert any(p['id'] == project_id for p in projects)

    # Delete
    del_resp = client.delete(f'/api/projects/{project_id}')
    assert del_resp.status_code == 200

    # Verify deleted
    get_del_resp = client.get(f'/api/projects/{project_id}')
    assert get_del_resp.status_code == 404

def test_custom_template_lifecycle():
    tpl = {
        'id': 'my-custom-test-tpl',
        'name': 'Neon Cyberpunk',
        'category': 'Sci-Fi',
        'description': 'Electric cyan and magenta layout.',
        'colors': ['#ffffff', '#00f0ff'],
        'title': 'Cyber Ranking',
        'accent': '#00f0ff',
        'rankStyle': 'outline',
    }
    save_res = client.post('/api/templates', json=tpl)
    assert save_res.status_code == 200

    # Retrieve
    get_res = client.get('/api/templates')
    assert get_res.status_code == 200
    all_tpls = get_res.json()
    assert any(t['id'] == 'my-custom-test-tpl' for t in all_tpls)

    # Delete
    del_res = client.delete('/api/templates/my-custom-test-tpl')
    assert del_res.status_code == 200

def test_upload_invalid_file_type():
    files = {'file': ('bad_file.exe', b'binary content', 'application/octet-stream')}
    resp = client.post('/api/assets', files=files)
    assert resp.status_code == 415

def test_export_validation_no_clips():
    payload = {
        'name': 'Empty Clips Export',
        'clips': [],
    }
    resp = client.post('/api/export', json=payload)
    assert resp.status_code == 400

def test_assets_listing():
    resp = client.get('/api/assets')
    assert resp.status_code == 200
    assets = resp.json()
    assert isinstance(assets, list)
    assert len(assets) > 0
    first = assets[0]
    assert 'id' in first
    assert 'name' in first
    assert 'type' in first
    assert 'url' in first

def test_asset_upload_and_delete():
    # Test uploading an image asset
    dummy_png = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82'
    files = {'file': ('test_logo.png', dummy_png, 'image/png')}
    up_resp = client.post('/api/assets', files=files)
    assert up_resp.status_code == 200
    asset_data = up_resp.json()
    asset_id = asset_data['id']
    assert asset_data['type'] == 'image'

    # Retrieve file
    get_file = client.get(f'/api/assets/{asset_id}')
    assert get_file.status_code == 200

    # Delete
    del_resp = client.delete(f'/api/assets/{asset_id}')
    assert del_resp.status_code == 200

    # Verify deleted
    get_del = client.get(f'/api/assets/{asset_id}')
    assert get_del.status_code == 404

def test_export_with_real_clip_and_music():
    # Fetch available assets
    resp = client.get('/api/assets')
    assert resp.status_code == 200
    assets = resp.json()
    videos = [a for a in assets if a['type'] == 'video']
    audio = [a for a in assets if a['type'] == 'audio']
    assert len(videos) > 0

    payload = {
        'name': 'Pytest Complete Render',
        'title': 'TOP MOMENT',
        'hookText': 'WAIT FOR IT',
        'aspectRatio': '9:16',
        'resolution': '720p',
        'fps': 30,
        'clips': [
            {
                'id': 'clip-test-1',
                'assetId': videos[0]['id'],
                'name': videos[0]['name'],
                'sourceStart': 0,
                'sourceEnd': 1.5,
                'duration': 1.5,
                'label': 'Moment #1',
                'rank': 1,
                'color': '#22d3ee',
            }
        ],
        'musicAssetId': audio[0]['id'] if audio else None,
        'musicVolume': 0.2,
        'layout': {
            'canvasBackground': '#000000',
            'topRegion': {'enabled': True, 'height': 12, 'backgroundColor': '#0a1628', 'fontColor': '#ffffff', 'title': 'TOP MOMENT'},
            'mainRegion': {'fitMode': 'blur-fill', 'cornerRadius': 8, 'showRankBadge': True, 'rankBadgePosition': 'top-left'},
            'bottomRegion': {'enabled': True, 'height': 12, 'backgroundColor': '#0a1628', 'fontColor': '#ffffff', 'caption': 'WAIT FOR IT'}
        }
    }

    exp_resp = client.post('/api/export', json=payload)
    assert exp_resp.status_code == 200
    exp_data = exp_resp.json()
    assert 'id' in exp_data
    assert exp_data['size'] > 1000

    # Verify file download
    dl_resp = client.get(f"/api/exports/{exp_data['id']}")
    assert dl_resp.status_code == 200
    assert dl_resp.headers['content-type'] == 'video/mp4'

def test_ai_ranking_viral_trampoline_and_shark():
    # Trampoline niche
    res = client.post('/api/ai/generate-ranking', json={'topic': 'Ranking Funniest Trampoline Moments', 'itemCount': 6})
    assert res.status_code == 200
    data = res.json()
    assert data['templateId'] == 'trampoline'
    assert len(data['items']) == 6
    # Verify comments and emojis are populated
    items_with_comment = [it for it in data['items'] if it.get('comment')]
    assert len(items_with_comment) > 0
    direct_hit_item = next((it for it in data['items'] if 'Direct hit' in it.get('comment', '')), None)
    assert direct_hit_item is not None
    assert direct_hit_item.get('emoji') == '💀'

    # Shark niche
    shark_res = client.post('/api/ai/generate-ranking', json={'topic': 'Ranking Best Shark Moments', 'itemCount': 6})
    assert shark_res.status_code == 200
    shark_data = shark_res.json()
    assert shark_data['templateId'] == 'shark'
    assert shark_data['accentColor'] == '#38bdf8'
    not_now_item = next((it for it in shark_data['items'] if 'Not now' in it.get('comment', '')), None)
    assert not_now_item is not None
    assert not_now_item.get('emoji') == '😅'

def test_export_viral_ranking_with_stack_and_watermark():
    resp = client.get('/api/assets')
    assets = resp.json()
    videos = [a for a in assets if a['type'] == 'video']
    assert len(videos) > 0

    payload = {
        'name': 'Viral Ranking Trampoline Export',
        'title': 'Ranking Funniest Trampoline Moments',
        'hookText': 'WAIT FOR NUMBER ONE 💀',
        'aspectRatio': '9:16',
        'resolution': '720p',
        'fps': 30,
        'templateId': 'trampoline',
        'clips': [
            {
                'id': 'clip-1',
                'assetId': videos[0]['id'],
                'name': videos[0]['name'],
                'sourceStart': 0,
                'sourceEnd': 1.0,
                'duration': 1.0,
                'label': 'Super Bounce Record',
                'rank': 1,
                'rankColor': '#facc15',
                'color': '#facc15',
                'comment': '',
            },
            {
                'id': 'clip-2',
                'assetId': videos[0]['id'],
                'name': videos[0]['name'],
                'sourceStart': 0,
                'sourceEnd': 1.0,
                'duration': 1.0,
                'label': 'Direct Hit',
                'rank': 6,
                'rankColor': '#ffffff',
                'color': '#ffffff',
                'comment': 'Direct hit',
            }
        ],
        'layout': {
            'canvasBackground': '#000000',
            'topRegion': {
                'enabled': True,
                'mode': 'overlay',
                'height': 14,
                'backgroundColor': '#000000',
                'fontColor': '#ffffff',
                'title': 'Ranking Funniest Trampoline Moments',
            },
            'mainRegion': {'fitMode': 'fill', 'cornerRadius': 0, 'showRankBadge': False},
            'bottomRegion': {'enabled': True, 'height': 8, 'backgroundColor': '#000000', 'fontColor': '#ffffff'},
            'rankingList': {
                'enabled': True,
                'position': 'left',
                'xOffset': 5,
                'yOffset': 26,
                'fontSize': 26,
                'spacing': 14,
            },
            'watermark': {
                'enabled': True,
                'text': 'xiroranks',
                'position': 'bottom-center',
                'opacity': 0.65,
            }
        }
    }

    exp_resp = client.post('/api/export', json=payload)
    assert exp_resp.status_code == 200
    exp_data = exp_resp.json()
    assert 'id' in exp_data
    assert exp_data['size'] > 1000

    # Verify download
    dl_resp = client.get(f"/api/exports/{exp_data['id']}")
    assert dl_resp.status_code == 200
    assert dl_resp.headers['content-type'] == 'video/mp4'

