import { useRef, useState } from 'react';
import {
  FolderOpen, LayoutTemplate, Type, Sparkles, Layers, Music2,
  Sticker, Settings2, Upload, Search, Grid2X2, Video, AudioLines,
  Plus, ChevronDown, ArrowUp, ArrowDown, SlidersHorizontal
} from 'lucide-react';
import { useStore, useSelectedClip } from '../store';
import { api } from '../api';
import type { Asset, Clip, ToolName } from '../types';
import { fmtBytes } from '../types';

const NAV_ITEMS: [ToolName, React.ElementType][] = [
  ['Media', FolderOpen],
  ['Templates', LayoutTemplate],
  ['Text', Type],
  ['Layout', SlidersHorizontal],
  ['Effects', Sparkles],
  ['Transitions', Layers],
  ['Audio', Music2],
  ['Stickers', Sticker],
  ['Settings', Settings2],
];

export default function Sidebar() {
  const { state, dispatch } = useStore();
  const { tool, assets, templates, project } = state;
  const clip = useSelectedClip();
  const fileRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'All' | 'video' | 'audio'>('All');
  const audio = assets.filter(a => a.type === 'audio');
  const videos = assets.filter(a => a.type === 'video');
  const visibleAssets = assets.filter(a =>
    (filter === 'All' || a.type === filter) &&
    a.name.toLowerCase().includes(query.toLowerCase())
  );

  async function upload(list: FileList | null) {
    if (!list?.length) return;
    dispatch({ type: 'SET_BUSY', message: 'Importing media…' });
    try {
      const fresh: Asset[] = [];
      for (const f of Array.from(list)) {
        const data = await api.uploadAsset(f);
        fresh.push(data);
      }
      dispatch({ type: 'ADD_ASSETS', assets: fresh });
      const vids = fresh.filter(a => a.type === 'video');
      const aud = fresh.find(a => a.type === 'audio');
      if (vids.length) {
        dispatch({ type: 'COMMIT' });
        for (const a of vids) {
          const c: Clip = {
            id: crypto.randomUUID(),
            assetId: a.id,
            name: a.name,
            url: a.url,
            sourceStart: 0,
            sourceEnd: 5,
            duration: 5,
            label: 'Add a label',
            rank: project.clips.length + 1,
            color: project.accentColor,
          };
          dispatch({ type: 'ADD_CLIP', clip: c });
        }
      }
      if (aud) dispatch({ type: 'UPDATE_PROJECT', payload: { musicAssetId: aud.id } });
      dispatch({ type: 'SET_NOTICE', message: `${fresh.length} asset(s) imported` });
    } catch (e) {
      dispatch({ type: 'SET_NOTICE', message: e instanceof Error ? e.message : 'Upload failed' });
    } finally {
      dispatch({ type: 'SET_BUSY', message: '' });
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <>
      <nav className="rail">
        {NAV_ITEMS.map(([n, I]) => (
          <button
            key={n}
            className={tool === n ? 'on' : ''}
            onClick={() => dispatch({ type: 'SET_TOOL', tool: n })}
          >
            <I size={19} />
            <span>{n}</span>
          </button>
        ))}
      </nav>

      <section className="left">
        {/* ── Tab bar ── */}
        <div className="tabs">
          {(tool === 'Media' ? ['Media'] :
            tool === 'Templates' ? ['Templates'] :
            tool === 'Audio' ? ['Audio'] :
            tool === 'Text' ? ['Text & Titles'] :
            tool === 'Layout' ? ['Sandwich Layout'] :
            [tool]
          ).map((x) => (
            <button key={x} className="active">{x}</button>
          ))}
        </div>

        {/* ── Template panel ── */}
        {tool === 'Templates' ? (
          <div className="scroll">
            <div className="section-head">
              <div>
                <b>Template library</b>
                <small>Start with a style, then customize it.</small>
              </div>
              <button className="small-btn" onClick={() =>
                dispatch({ type: 'SET_NOTICE', message: 'Save current settings as a template from the Layout panel.' })
              }>
                <Plus size={14} />New
              </button>
            </div>
            {templates.map(t => (
              <button
                key={t.id}
                className={`template ${project.templateId === t.id ? 'selected' : ''}`}
                onClick={() => {
                  dispatch({ type: 'COMMIT' });
                  dispatch({ type: 'APPLY_TEMPLATE', template: t });
                  dispatch({ type: 'SET_NOTICE', message: `${t.name} applied` });
                }}
              >
                <div className="template-art" style={{ '--accent': t.accent } as React.CSSProperties}>
                  <b>{t.title}</b>
                  <span>RANKING VIDEO</span>
                  <i>1.</i>
                </div>
                <div className="template-meta">
                  <strong>{t.name}</strong>
                  <em>{t.category}</em>
                  <small>{t.description}</small>
                </div>
              </button>
            ))}
          </div>

        /* ── Text panel ── */
        ) : tool === 'Text' ? (
          <div className="scroll text-editor">
            <h3>Text & titles</h3>
            <p>Customize overlay text for the composition.</p>
            <label>
              Main title
              <textarea
                rows={3}
                value={project.title}
                onChange={e => dispatch({ type: 'UPDATE_PROJECT', payload: { title: e.target.value } })}
                onBlur={() => dispatch({ type: 'COMMIT' })}
              />
            </label>
            <label>
              Opening hook
              <textarea
                rows={2}
                value={project.hookText}
                onChange={e => dispatch({ type: 'UPDATE_PROJECT', payload: { hookText: e.target.value } })}
                onBlur={() => dispatch({ type: 'COMMIT' })}
              />
            </label>
            <div className="colors">
              <label>
                Title
                <input
                  type="color"
                  value={project.titleColor}
                  onChange={e => dispatch({ type: 'UPDATE_PROJECT', payload: { titleColor: e.target.value } })}
                  onBlur={() => dispatch({ type: 'COMMIT' })}
                />
              </label>
              <label>
                Rank accent
                <input
                  type="color"
                  value={project.accentColor}
                  onChange={e => dispatch({ type: 'UPDATE_PROJECT', payload: { accentColor: e.target.value } })}
                  onBlur={() => dispatch({ type: 'COMMIT' })}
                />
              </label>
            </div>
            <label className="check-label">
              <input
                type="checkbox"
                checked={state.hookOn}
                onChange={e => dispatch({ type: 'SET_HOOK_ON', on: e.target.checked })}
              />
              Show opening hook
            </label>
            {/* ── Top region text ── */}
            <h4 style={{ marginTop: 20 }}>Top region text</h4>
            <label>
              Title text
              <input
                value={project.layout.topRegion.title}
                onChange={e => dispatch({ type: 'SET_TOP_REGION', config: { title: e.target.value } })}
                onBlur={() => dispatch({ type: 'COMMIT' })}
              />
            </label>
            <label>
              Subtitle
              <input
                value={project.layout.topRegion.subtitle}
                onChange={e => dispatch({ type: 'SET_TOP_REGION', config: { subtitle: e.target.value } })}
                onBlur={() => dispatch({ type: 'COMMIT' })}
              />
            </label>
            {/* ── Bottom region text ── */}
            <h4 style={{ marginTop: 20 }}>Bottom region text</h4>
            <label>
              Caption
              <input
                value={project.layout.bottomRegion.caption}
                onChange={e => dispatch({ type: 'SET_BOTTOM_REGION', config: { caption: e.target.value } })}
                onBlur={() => dispatch({ type: 'COMMIT' })}
              />
            </label>
            <label>
              Creator handle
              <input
                value={project.layout.bottomRegion.creatorHandle}
                onChange={e => dispatch({ type: 'SET_BOTTOM_REGION', config: { creatorHandle: e.target.value } })}
                onBlur={() => dispatch({ type: 'COMMIT' })}
              />
            </label>
          </div>

        /* ── Layout panel (Sandwich) ── */
        ) : tool === 'Layout' ? (
          <div className="scroll layout-panel">
            <div className="section-head">
              <div>
                <b>Sandwich Layout</b>
                <small>Configure top, main, and bottom regions.</small>
              </div>
            </div>

            {/* Preset quick buttons */}
            <div className="layout-presets">
              {[
                ['Full Black', '#000000'],
                ['Dark Navy', '#0a1628'],
                ['Charcoal', '#1a1a2e'],
                ['Deep Purple', '#16082e'],
              ].map(([name, color]) => (
                <button
                  key={name}
                  className={`preset-chip ${
                    project.layout.topRegion.backgroundColor === color &&
                    project.layout.bottomRegion.backgroundColor === color ? 'active' : ''
                  }`}
                  onClick={() => {
                    dispatch({ type: 'COMMIT' });
                    dispatch({ type: 'SET_TOP_REGION', config: { backgroundColor: color as string } });
                    dispatch({ type: 'SET_BOTTOM_REGION', config: { backgroundColor: color as string } });
                    dispatch({ type: 'SET_LAYOUT', layout: { canvasBackground: color as string } });
                  }}
                >
                  <span className="color-dot" style={{ background: color as string }} />
                  {name}
                </button>
              ))}
            </div>

            {/* ── Top Region ── */}
            <div className="layout-section">
              <div className="layout-section-head">
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={project.layout.topRegion.enabled}
                    onChange={e => {
                      dispatch({ type: 'COMMIT' });
                      dispatch({ type: 'SET_TOP_REGION', config: { enabled: e.target.checked } });
                    }}
                  />
                  <b>Top Region</b>
                </label>
                <ChevronDown size={13} />
              </div>
              {project.layout.topRegion.enabled && (
                <>
                  <label className="range-label">
                    Height <span>{project.layout.topRegion.height}%</span>
                  </label>
                  <input
                    type="range"
                    min={5} max={35}
                    value={project.layout.topRegion.height}
                    onChange={e => dispatch({ type: 'SET_TOP_REGION', config: { height: Number(e.target.value) } })}
                    onMouseUp={() => dispatch({ type: 'COMMIT' })}
                  />
                  <label>
                    Background
                    <div className="color-field">
                      <input
                        type="color"
                        value={project.layout.topRegion.backgroundColor}
                        onChange={e => dispatch({ type: 'SET_TOP_REGION', config: { backgroundColor: e.target.value } })}
                        onBlur={() => dispatch({ type: 'COMMIT' })}
                      />
                      <input
                        type="text"
                        value={project.layout.topRegion.backgroundColor}
                        onChange={e => dispatch({ type: 'SET_TOP_REGION', config: { backgroundColor: e.target.value } })}
                        onBlur={() => dispatch({ type: 'COMMIT' })}
                      />
                    </div>
                  </label>
                  <label>
                    Font color
                    <div className="color-field">
                      <input
                        type="color"
                        value={project.layout.topRegion.fontColor}
                        onChange={e => dispatch({ type: 'SET_TOP_REGION', config: { fontColor: e.target.value } })}
                        onBlur={() => dispatch({ type: 'COMMIT' })}
                      />
                      <input
                        type="text"
                        value={project.layout.topRegion.fontColor}
                        onChange={e => dispatch({ type: 'SET_TOP_REGION', config: { fontColor: e.target.value } })}
                        onBlur={() => dispatch({ type: 'COMMIT' })}
                      />
                    </div>
                  </label>
                  <label className="range-label">
                    Font size <span>{project.layout.topRegion.fontSize}px</span>
                  </label>
                  <input
                    type="range"
                    min={12} max={48}
                    value={project.layout.topRegion.fontSize}
                    onChange={e => dispatch({ type: 'SET_TOP_REGION', config: { fontSize: Number(e.target.value) } })}
                    onMouseUp={() => dispatch({ type: 'COMMIT' })}
                  />
                  <label>
                    Alignment
                    <div className="align-btns">
                      {(['left', 'center', 'right'] as const).map(a => (
                        <button
                          key={a}
                          className={project.layout.topRegion.alignment === a ? 'active' : ''}
                          onClick={() => {
                            dispatch({ type: 'COMMIT' });
                            dispatch({ type: 'SET_TOP_REGION', config: { alignment: a } });
                          }}
                        >
                          {a[0].toUpperCase() + a.slice(1)}
                        </button>
                      ))}
                    </div>
                  </label>
                  <label className="range-label">
                    Padding <span>{project.layout.topRegion.padding}px</span>
                  </label>
                  <input
                    type="range"
                    min={0} max={40}
                    value={project.layout.topRegion.padding}
                    onChange={e => dispatch({ type: 'SET_TOP_REGION', config: { padding: Number(e.target.value) } })}
                    onMouseUp={() => dispatch({ type: 'COMMIT' })}
                  />
                </>
              )}
            </div>

            {/* ── Main Region ── */}
            <div className="layout-section">
              <div className="layout-section-head">
                <b>Main Video</b>
                <ChevronDown size={13} />
              </div>
              <label>
                Fit mode
                <select
                  value={project.layout.mainRegion.fitMode}
                  onChange={e => {
                    dispatch({ type: 'COMMIT' });
                    dispatch({ type: 'SET_MAIN_REGION', config: { fitMode: e.target.value as 'fit' | 'fill' | 'blur-fill' } });
                  }}
                >
                  <option value="fill">Fill (crop)</option>
                  <option value="fit">Fit (letterbox)</option>
                  <option value="blur-fill">Blur fill</option>
                </select>
              </label>
              <label className="range-label">
                Corner radius <span>{project.layout.mainRegion.cornerRadius}px</span>
              </label>
              <input
                type="range"
                min={0} max={30}
                value={project.layout.mainRegion.cornerRadius}
                onChange={e => dispatch({ type: 'SET_MAIN_REGION', config: { cornerRadius: Number(e.target.value) } })}
                onMouseUp={() => dispatch({ type: 'COMMIT' })}
              />
              <label className="range-label">
                Padding <span>{project.layout.mainRegion.padding}px</span>
              </label>
              <input
                type="range"
                min={0} max={24}
                value={project.layout.mainRegion.padding}
                onChange={e => dispatch({ type: 'SET_MAIN_REGION', config: { padding: Number(e.target.value) } })}
                onMouseUp={() => dispatch({ type: 'COMMIT' })}
              />
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={project.layout.mainRegion.showRankBadge}
                  onChange={e => {
                    dispatch({ type: 'COMMIT' });
                    dispatch({ type: 'SET_MAIN_REGION', config: { showRankBadge: e.target.checked } });
                  }}
                />
                Show rank badge
              </label>
              {project.layout.mainRegion.showRankBadge && (
                <label>
                  Badge position
                  <select
                    value={project.layout.mainRegion.rankBadgePosition}
                    onChange={e => {
                      dispatch({ type: 'COMMIT' });
                      dispatch({ type: 'SET_MAIN_REGION', config: {
                        rankBadgePosition: e.target.value as 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
                      } });
                    }}
                  >
                    <option value="top-left">Top Left</option>
                    <option value="top-right">Top Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="bottom-right">Bottom Right</option>
                  </select>
                </label>
              )}
            </div>

            {/* ── Bottom Region ── */}
            <div className="layout-section">
              <div className="layout-section-head">
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={project.layout.bottomRegion.enabled}
                    onChange={e => {
                      dispatch({ type: 'COMMIT' });
                      dispatch({ type: 'SET_BOTTOM_REGION', config: { enabled: e.target.checked } });
                    }}
                  />
                  <b>Bottom Region</b>
                </label>
                <ChevronDown size={13} />
              </div>
              {project.layout.bottomRegion.enabled && (
                <>
                  <label className="range-label">
                    Height <span>{project.layout.bottomRegion.height}%</span>
                  </label>
                  <input
                    type="range"
                    min={5} max={35}
                    value={project.layout.bottomRegion.height}
                    onChange={e => dispatch({ type: 'SET_BOTTOM_REGION', config: { height: Number(e.target.value) } })}
                    onMouseUp={() => dispatch({ type: 'COMMIT' })}
                  />
                  <label>
                    Background
                    <div className="color-field">
                      <input
                        type="color"
                        value={project.layout.bottomRegion.backgroundColor}
                        onChange={e => dispatch({ type: 'SET_BOTTOM_REGION', config: { backgroundColor: e.target.value } })}
                        onBlur={() => dispatch({ type: 'COMMIT' })}
                      />
                      <input
                        type="text"
                        value={project.layout.bottomRegion.backgroundColor}
                        onChange={e => dispatch({ type: 'SET_BOTTOM_REGION', config: { backgroundColor: e.target.value } })}
                        onBlur={() => dispatch({ type: 'COMMIT' })}
                      />
                    </div>
                  </label>
                  <label>
                    Font color
                    <div className="color-field">
                      <input
                        type="color"
                        value={project.layout.bottomRegion.fontColor}
                        onChange={e => dispatch({ type: 'SET_BOTTOM_REGION', config: { fontColor: e.target.value } })}
                        onBlur={() => dispatch({ type: 'COMMIT' })}
                      />
                      <input
                        type="text"
                        value={project.layout.bottomRegion.fontColor}
                        onChange={e => dispatch({ type: 'SET_BOTTOM_REGION', config: { fontColor: e.target.value } })}
                        onBlur={() => dispatch({ type: 'COMMIT' })}
                      />
                    </div>
                  </label>
                  <label className="range-label">
                    Font size <span>{project.layout.bottomRegion.fontSize}px</span>
                  </label>
                  <input
                    type="range"
                    min={10} max={36}
                    value={project.layout.bottomRegion.fontSize}
                    onChange={e => dispatch({ type: 'SET_BOTTOM_REGION', config: { fontSize: Number(e.target.value) } })}
                    onMouseUp={() => dispatch({ type: 'COMMIT' })}
                  />
                  <label>
                    Alignment
                    <div className="align-btns">
                      {(['left', 'center', 'right'] as const).map(a => (
                        <button
                          key={a}
                          className={project.layout.bottomRegion.alignment === a ? 'active' : ''}
                          onClick={() => {
                            dispatch({ type: 'COMMIT' });
                            dispatch({ type: 'SET_BOTTOM_REGION', config: { alignment: a } });
                          }}
                        >
                          {a[0].toUpperCase() + a.slice(1)}
                        </button>
                      ))}
                    </div>
                  </label>
                  <label className="range-label">
                    Padding <span>{project.layout.bottomRegion.padding}px</span>
                  </label>
                  <input
                    type="range"
                    min={0} max={40}
                    value={project.layout.bottomRegion.padding}
                    onChange={e => dispatch({ type: 'SET_BOTTOM_REGION', config: { padding: Number(e.target.value) } })}
                    onMouseUp={() => dispatch({ type: 'COMMIT' })}
                  />
                </>
              )}
            </div>

            {/* ── Canvas / Spacing ── */}
            <div className="layout-section">
              <div className="layout-section-head">
                <b>Canvas</b>
                <ChevronDown size={13} />
              </div>
              <label>
                Background color
                <div className="color-field">
                  <input
                    type="color"
                    value={project.layout.canvasBackground}
                    onChange={e => dispatch({ type: 'SET_LAYOUT', layout: { canvasBackground: e.target.value } })}
                    onBlur={() => dispatch({ type: 'COMMIT' })}
                  />
                  <input
                    type="text"
                    value={project.layout.canvasBackground}
                    onChange={e => dispatch({ type: 'SET_LAYOUT', layout: { canvasBackground: e.target.value } })}
                    onBlur={() => dispatch({ type: 'COMMIT' })}
                  />
                </div>
              </label>
              <label className="range-label">
                Region spacing <span>{project.layout.spacing}px</span>
              </label>
              <input
                type="range"
                min={0} max={20}
                value={project.layout.spacing}
                onChange={e => dispatch({ type: 'SET_LAYOUT', layout: { spacing: Number(e.target.value) } })}
                onMouseUp={() => dispatch({ type: 'COMMIT' })}
              />
            </div>

            {/* ── Actions ── */}
            <div className="layout-actions">
              <button
                className="secondary"
                onClick={() => {
                  dispatch({ type: 'COMMIT' });
                  dispatch({ type: 'SET_LAYOUT', layout: {
                    canvasBackground: '#000000',
                    spacing: 0,
                    topRegion: { ...project.layout.topRegion, enabled: true, height: 12, backgroundColor: '#000000' } as any,
                    mainRegion: { ...project.layout.mainRegion, fitMode: 'fill', cornerRadius: 0, padding: 0 } as any,
                    bottomRegion: { ...project.layout.bottomRegion, enabled: true, height: 12, backgroundColor: '#000000' } as any,
                  } });
                  dispatch({ type: 'SET_NOTICE', message: 'Layout reset to default' });
                }}
              >
                Reset to default
              </button>
            </div>
          </div>

        /* ── Audio panel ── */
        ) : tool === 'Audio' ? (
          <div className="scroll">
            <div className="section-head">
              <div>
                <b>Audio library</b>
                <small>Music and sound effects</small>
              </div>
            </div>
            <button className="import" onClick={() => fileRef.current?.click()}>
              <Upload size={15} />Import audio
            </button>
            <div className="asset-grid">
              {audio.map(a => (
                <button
                  key={a.id}
                  className="asset"
                  onClick={() => {
                    dispatch({ type: 'UPDATE_PROJECT', payload: { musicAssetId: a.id } });
                    dispatch({ type: 'SET_NOTICE', message: `${a.name} selected as background music` });
                  }}
                >
                  <div className="asset-thumb wave"><AudioLines size={30} /></div>
                  <span>{a.name}</span>
                  <small>{fmtBytes(a.size)}</small>
                </button>
              ))}
            </div>
            <p className="hint">Background music is mixed during export. Control volume in the inspector Audio tab.</p>
          </div>

        /* ── Media panel (default) ── */
        ) : (
          <div className="scroll">
            <div className="section-head">
              <div>
                <b>Media library</b>
                <small>Import clips to build your ranking.</small>
              </div>
              <button className="small-btn" onClick={() => fileRef.current?.click()}>
                <Plus size={14} />Import
              </button>
            </div>
            <button className="import" onClick={() => fileRef.current?.click()}>
              <Upload size={15} />Import media <span>Video / Audio</span>
            </button>
            <div className="media-filter">
              <div>
                <Search size={14} />
                <input
                  placeholder="Search media"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>
              <select value={filter} onChange={e => setFilter(e.target.value as any)}>
                <option value="All">All</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
              </select>
              <button className="icon"><Grid2X2 size={15} /></button>
            </div>
            <div className="asset-grid">
              {visibleAssets.map(a => (
                <button
                  key={a.id}
                  className="asset"
                  onClick={() => {
                    if (a.type === 'video' && clip) {
                      dispatch({ type: 'COMMIT' });
                      dispatch({
                        type: 'UPDATE_CLIP',
                        clipId: clip.id,
                        payload: {
                          assetId: a.id,
                          name: a.name,
                          url: a.url,
                          sourceStart: 0,
                          sourceEnd: Math.min(5, clip.duration),
                          duration: Math.min(5, clip.duration),
                        },
                      });
                      dispatch({ type: 'SET_NOTICE', message: `${a.name} assigned to rank ${clip.rank}` });
                    } else if (a.type === 'audio') {
                      dispatch({ type: 'UPDATE_PROJECT', payload: { musicAssetId: a.id } });
                    }
                  }}
                >
                  <div className={`asset-thumb ${a.type === 'audio' ? 'wave' : ''}`}>
                    {a.type === 'video' ? <Video size={23} /> : <AudioLines size={25} />}
                    <small>{a.type.toUpperCase()}</small>
                  </div>
                  <span>{a.name}</span>
                  <small>{fmtBytes(a.size)}</small>
                </button>
              ))}
              {!visibleAssets.length && (
                <div className="empty">
                  <Upload size={24} />
                  <b>No media imported</b>
                  <p>Import video or audio files to start editing.</p>
                  <button className="secondary" onClick={() => fileRef.current?.click()}>
                    Choose files
                  </button>
                </div>
              )}
            </div>
            <div className="asset-footer">
              {assets.length} assets
              <span>{videos.length} videos · {audio.length} audio</span>
            </div>
          </div>
        )}
      </section>

      <input
        ref={fileRef}
        type="file"
        multiple
        hidden
        accept="video/*,audio/*,.mp4,.mov,.mkv,.webm,.mp3,.wav,.m4a"
        onChange={e => upload(e.target.files)}
      />
    </>
  );
}
