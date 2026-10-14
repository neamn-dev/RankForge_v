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
