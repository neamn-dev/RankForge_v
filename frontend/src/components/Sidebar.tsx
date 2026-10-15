import { useRef, useState } from 'react';
import {
  FolderOpen, LayoutTemplate, Type, Sparkles, Layers, Music2,
  Settings2, Upload, Search, Video, AudioLines,
  Plus, ChevronDown, ArrowUp, ArrowDown, SlidersHorizontal,
  Trash2, Play, Pause, Image as ImageIcon, Check, ListOrdered,
  Shuffle, ArrowUpDown, Target
} from 'lucide-react';
import { useStore, useSelectedClip } from '../store';
import { api } from '../api';
import type { Asset, Clip, ToolName } from '../types';
import { fmtBytes, fmtTime } from '../types';

const NAV_ITEMS: [ToolName, React.ElementType][] = [
  ['Media', FolderOpen],
  ['Ranking', ListOrdered],
  ['Templates', LayoutTemplate],
  ['Layout', SlidersHorizontal],
  ['Text', Type],
  ['Audio', Music2],
  ['Transitions', Layers],
  ['Settings', Settings2],
];

export default function Sidebar() {
  const { state, dispatch } = useStore();
  const { tool, assets, templates, project } = state;
  const clip = useSelectedClip();
  const fileRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'All' | 'video' | 'audio' | 'image'>('All');
  const [previewingAssetId, setPreviewingAssetId] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  const audio = assets.filter(a => a.type === 'audio');
  const videos = assets.filter(a => a.type === 'video');
  const images = assets.filter(a => a.type === 'image');

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

      // If user had unassigned clips, auto-assign first uploaded video
      if (vids.length && project.clips.length) {
        const unassigned = project.clips.filter(c => !c.assetId);
        if (unassigned.length) {
          dispatch({ type: 'COMMIT' });
          unassigned.slice(0, vids.length).forEach((c, idx) => {
            const v = vids[idx];
            dispatch({
              type: 'UPDATE_CLIP',
              clipId: c.id,
              payload: {
                assetId: v.id,
                name: v.name,
                url: v.url,
                sourceStart: 0,
                sourceEnd: Math.min(v.duration || 5, c.duration),
              },
            });
          });
        }
      }

      if (aud && !project.musicAssetId) {
        dispatch({ type: 'UPDATE_PROJECT', payload: { musicAssetId: aud.id } });
      }

      dispatch({ type: 'SET_NOTICE', message: `${fresh.length} asset(s) imported successfully` });
    } catch (e) {
      dispatch({ type: 'SET_NOTICE', message: e instanceof Error ? e.message : 'Upload failed' });
    } finally {
      dispatch({ type: 'SET_BUSY', message: '' });
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const handleDeleteAsset = async (assetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteAsset(assetId);
      dispatch({ type: 'REMOVE_ASSET', assetId });
      dispatch({ type: 'SET_NOTICE', message: 'Asset deleted' });
    } catch {
      dispatch({ type: 'REMOVE_ASSET', assetId });
    }
  };

  const assignAssetToClip = (asset: Asset, targetClipId?: string) => {
    const cId = targetClipId || clip?.id || project.clips[0]?.id;
    if (!cId) {
      // Add as new clip
      addAssetAsNewClip(asset);
      return;
    }
    dispatch({ type: 'COMMIT' });
    dispatch({
      type: 'UPDATE_CLIP',
      clipId: cId,
      payload: {
        assetId: asset.id,
        name: asset.name,
        url: asset.url,
        sourceStart: 0,
        sourceEnd: Math.min(asset.duration || 5, 5),
        duration: Math.min(asset.duration || 5, 5),
      },
    });
    dispatch({ type: 'SET_NOTICE', message: `Assigned "${asset.name}" to Rank #${clip?.rank || 1}` });
  };

  const addAssetAsNewClip = (asset: Asset) => {
    dispatch({ type: 'COMMIT' });
    const newRank = project.clips.length + 1;
    const newClip: Clip = {
      id: crypto.randomUUID(),
      assetId: asset.id,
      name: asset.name,
      url: asset.url,
      sourceStart: 0,
      sourceEnd: Math.min(asset.duration || 5, 5),
      duration: Math.min(asset.duration || 5, 5),
      label: asset.name.replace(/\.[^/.]+$/, ''),
      rank: newRank,
      color: project.accentColor,
    };
    dispatch({ type: 'ADD_CLIP', clip: newClip });
    dispatch({ type: 'SET_NOTICE', message: `Added "${asset.name}" to timeline` });
  };

  const handleAuditionAudio = (asset: Asset, e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewingAssetId === asset.id) {
      audioPreviewRef.current?.pause();
      setPreviewingAssetId(null);
    } else {
      if (!audioPreviewRef.current) {
        audioPreviewRef.current = new Audio();
      }
      audioPreviewRef.current.src = asset.url;
      audioPreviewRef.current.play().catch(() => {});
      audioPreviewRef.current.onended = () => setPreviewingAssetId(null);
      setPreviewingAssetId(asset.id);
    }
  };

  const handleSaveAsCustomTemplate = async () => {
    const tplName = prompt('Enter a name for this custom template:', `${project.name} Style`);
    if (!tplName) return;
    try {
      const saved = await api.saveTemplate({
        name: tplName,
        category: 'Custom',
        description: `Custom Sandwich layout with ${project.layout.mainRegion.fitMode} framing.`,
        colors: [project.titleColor, project.accentColor],
        title: project.title,
        accent: project.accentColor,
        rankStyle: project.layout.mainRegion.rankBadgeStyle,
        layout: project.layout,
      });
      dispatch({ type: 'SET_TEMPLATES', templates: [...templates, saved] });
      dispatch({ type: 'SET_NOTICE', message: `Template "${tplName}" saved!` });
    } catch (e) {
      dispatch({ type: 'SET_NOTICE', message: 'Failed to save template' });
    }
  };

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
          {(tool === 'Media' ? ['Media Library'] :
            tool === 'Ranking' ? ['Ranking Entries'] :
            tool === 'Templates' ? ['Templates'] :
            tool === 'Audio' ? ['Audio Library'] :
            tool === 'Text' ? ['Text & Titles'] :
            tool === 'Layout' ? ['Sandwich Layout'] :
            [tool]
          ).map((x) => (
            <button key={x} className="active">{x}</button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════
            RANKING ENTRIES PANEL (Viblo / CapCut Inspired)
            ══════════════════════════════════════════════════ */}
        {tool === 'Ranking' && (
          <div className="scroll">
            <div className="section-head">
              <div>
                <b>Rank Entries</b>
                <small>{project.clips.length} ranked items in countdown</small>
              </div>
              <button
                className="small-btn"
                onClick={() => {
                  dispatch({ type: 'COMMIT' });
                  const newRank = project.clips.length + 1;
                  const c: Clip = {
                    id: crypto.randomUUID(),
                    assetId: null,
                    name: `Rank ${newRank} Highlight`,
                    sourceStart: 0,
                    sourceEnd: 4,
                    duration: 4,
                    label: `Highlight #${newRank}`,
                    rank: newRank,
                    color: project.accentColor,
                  };
                  dispatch({ type: 'ADD_CLIP', clip: c });
                }}
              >
                <Plus size={14} /> Add Rank
              </button>
            </div>

            {/* Quick Renumber Controls */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              <button
                className="secondary"
                style={{ flex: 1, fontSize: 10, padding: '6px 8px' }}
                title="Renumber as Countdown: #5 down to #1"
                onClick={() => {
                  dispatch({ type: 'COMMIT' });
                  dispatch({ type: 'RENUMBER_RANKS', mode: 'countdown' });
                  dispatch({ type: 'SET_NOTICE', message: 'Renumbered in countdown order (#5 -> #1)' });
                }}
              >
                <ArrowDown size={12} /> Countdown (#5→#1)
              </button>
              <button
                className="secondary"
                style={{ flex: 1, fontSize: 10, padding: '6px 8px' }}
                title="Renumber standard: #1 up to #5"
                onClick={() => {
                  dispatch({ type: 'COMMIT' });
                  dispatch({ type: 'RENUMBER_RANKS', mode: 'standard' });
                  dispatch({ type: 'SET_NOTICE', message: 'Renumbered in standard order (#1→#5)' });
                }}
              >
                <ArrowUp size={12} /> Standard (#1→#5)
              </button>
            </div>

            {/* List of ranking entries */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {project.clips.map((c, index) => {
                const isSelected = clip?.id === c.id;
                const asset = assets.find(a => a.id === c.assetId);

                return (
                  <div
                    key={c.id}
                    className={`rank-item-card ${isSelected ? 'selected' : ''}`}
                    style={{
                      background: isSelected ? '#162335' : '#0e1520',
                      border: isSelected ? '1px solid #20c8f2' : '1px solid #1c2734',
                      borderRadius: 8,
                      padding: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      cursor: 'pointer',
                    }}
                    onClick={() => dispatch({ type: 'SET_SELECTED', clipId: c.id })}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          className="clip-rank-badge"
                          style={{
                            background: c.color || project.accentColor,
                            fontWeight: 800,
                            fontSize: 11,
                            padding: '3px 8px',
                            borderRadius: 6,
                          }}
                        >
                          #{c.rank}
                        </span>
                        <input
                          type="text"
                          value={c.label || ''}
                          placeholder="Rank title label"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ffffff',
                            fontWeight: 600,
                            fontSize: 12,
                            width: 140,
                          }}
                          onChange={e => {
                            dispatch({
                              type: 'UPDATE_CLIP',
                              clipId: c.id,
                              payload: { label: e.target.value },
                            });
                          }}
                          onBlur={() => dispatch({ type: 'COMMIT' })}
                          onClick={e => e.stopPropagation()}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button
                          className="icon"
                          title="Move up"
                          disabled={index === 0}
                          onClick={e => {
                            e.stopPropagation();
                            dispatch({ type: 'COMMIT' });
                            dispatch({ type: 'MOVE_CLIP', clipId: c.id, delta: -1 });
                          }}
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          className="icon"
                          title="Move down"
                          disabled={index === project.clips.length - 1}
                          onClick={e => {
                            e.stopPropagation();
                            dispatch({ type: 'COMMIT' });
                            dispatch({ type: 'MOVE_CLIP', clipId: c.id, delta: 1 });
                          }}
                        >
                          <ArrowDown size={13} />
                        </button>
                        <button
                          className="icon"
                          title="Delete rank entry"
                          onClick={e => {
                            e.stopPropagation();
                            dispatch({ type: 'COMMIT' });
                            dispatch({ type: 'REMOVE_CLIP', clipId: c.id });
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Media status & duration row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, color: '#7e90a2' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {asset ? (
                          <span style={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Check size={11} /> {asset.name.slice(0, 20)}
                          </span>
                        ) : (
                          <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
                            ● No video assigned
                          </span>
                        )}
                      </div>
                      <span>{c.duration.toFixed(1)}s</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            TEMPLATES PANEL
            ══════════════════════════════════════════════════ */}
        {tool === 'Templates' && (
          <div className="scroll">
            <div className="section-head">
              <div>
                <b>Template Library</b>
                <small>Choose a visual theme for the sandwich composition.</small>
              </div>
              <button className="small-btn" onClick={handleSaveAsCustomTemplate}>
                <Plus size={14} /> Save Current
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
        )}

        {/* ══════════════════════════════════════════════════
            TEXT & TITLES PANEL
            ══════════════════════════════════════════════════ */}
        {tool === 'Text' && (
          <div className="scroll text-editor">
            <h3>Text & Titles</h3>
            <p>Customize overlay text and banner cards for the composition.</p>
            <label>
              Main project title
              <textarea
                rows={2}
                value={project.title}
                onChange={e => dispatch({ type: 'UPDATE_PROJECT', payload: { title: e.target.value } })}
                onBlur={() => dispatch({ type: 'COMMIT' })}
              />
            </label>
            <label>
              Opening hook text (first 1.8s)
              <textarea
                rows={2}
                value={project.hookText}
                onChange={e => dispatch({ type: 'UPDATE_PROJECT', payload: { hookText: e.target.value } })}
                onBlur={() => dispatch({ type: 'COMMIT' })}
              />
            </label>
            <div className="colors">
              <label>
                Title color
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

            {/* Top region text */}
            <h4 style={{ marginTop: 20 }}>Top banner text</h4>
            <label>
              Top title
              <input
                value={project.layout.topRegion.title}
                placeholder="e.g. TOP 5 VIRAL PLAYS"
                onChange={e => dispatch({ type: 'SET_TOP_REGION', config: { title: e.target.value } })}
                onBlur={() => dispatch({ type: 'COMMIT' })}
              />
            </label>
            <label>
              Top subtitle
              <input
                value={project.layout.topRegion.subtitle}
                placeholder="e.g. YouTube Shorts Edition"
                onChange={e => dispatch({ type: 'SET_TOP_REGION', config: { subtitle: e.target.value } })}
                onBlur={() => dispatch({ type: 'COMMIT' })}
              />
            </label>

            {/* Bottom region text */}
            <h4 style={{ marginTop: 20 }}>Bottom banner text</h4>
            <label>
              Bottom caption / hook
              <input
                value={project.layout.bottomRegion.caption}
                placeholder="e.g. Wait for number one!"
                onChange={e => dispatch({ type: 'SET_BOTTOM_REGION', config: { caption: e.target.value } })}
                onBlur={() => dispatch({ type: 'COMMIT' })}
              />
            </label>
            <label>
              Creator handle / watermark
              <input
                value={project.layout.bottomRegion.creatorHandle}
                placeholder="e.g. @RankForgeCreator"
                onChange={e => dispatch({ type: 'SET_BOTTOM_REGION', config: { creatorHandle: e.target.value } })}
                onBlur={() => dispatch({ type: 'COMMIT' })}
              />
            </label>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            LAYOUT PANEL (Sandwich Video Composition)
            ══════════════════════════════════════════════════ */}
        {tool === 'Layout' && (
          <div className="scroll layout-panel">
            <div className="section-head">
              <div>
                <b>Sandwich Layout</b>
                <small>Configure top, main video, and bottom regions.</small>
              </div>
              <button className="small-btn" onClick={handleSaveAsCustomTemplate}>
                Save Preset
              </button>
            </div>

            {/* Quick Presets */}
            <div className="layout-presets" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
              {[
                ['Full Black', '#000000', 'fill'],
                ['Dark Navy', '#0a1628', 'blur-fill'],
                ['Charcoal', '#1a1a2e', 'fill'],
                ['Crimson Fails', '#180a0a', 'blur-fill'],
                ['Emerald Meme', '#0a1a0f', 'blur-fill'],
                ['Purple Clutch', '#130a24', 'blur-fill'],
              ].map(([name, bg, fit]) => (
                <button
                  key={name}
                  className="preset"
                  style={{ fontSize: 10, padding: 8, justifyContent: 'flex-start' }}
                  onClick={() => {
                    dispatch({ type: 'COMMIT' });
                    dispatch({
                      type: 'SET_LAYOUT',
                      layout: {
                        canvasBackground: bg,
                        topRegion: { ...project.layout.topRegion, backgroundColor: bg },
                        bottomRegion: { ...project.layout.bottomRegion, backgroundColor: bg },
                        mainRegion: { ...project.layout.mainRegion, fitMode: fit as any },
                      },
                    });
                    dispatch({ type: 'SET_NOTICE', message: `Preset "${name}" applied` });
                  }}
                >
                  <i style={{ width: 12, height: 12, borderRadius: 3, background: bg, border: '1px solid #334155' }} />
                  {name}
                </button>
              ))}
            </div>

            {/* Top Region */}
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
                    min={5} max={30}
                    value={project.layout.topRegion.height}
                    onChange={e => dispatch({ type: 'SET_TOP_REGION', config: { height: Number(e.target.value) } })}
                    onMouseUp={() => dispatch({ type: 'COMMIT' })}
                  />
                  <label>
                    Background color
                    <input
                      type="color"
                      value={project.layout.topRegion.backgroundColor}
                      onChange={e => dispatch({ type: 'SET_TOP_REGION', config: { backgroundColor: e.target.value } })}
                      onBlur={() => dispatch({ type: 'COMMIT' })}
                    />
                  </label>
                </>
              )}
            </div>

            {/* Main Video Region */}
            <div className="layout-section">
              <div className="layout-section-head">
                <b>Main Video Framing</b>
              </div>
              <label>
                Fit Mode
                <select
                  value={project.layout.mainRegion.fitMode}
                  onChange={e => {
                    dispatch({ type: 'COMMIT' });
                    dispatch({ type: 'SET_MAIN_REGION', config: { fitMode: e.target.value as any } });
                  }}
                >
                  <option value="fill">Fill (Cropped to canvas)</option>
                  <option value="fit">Fit (Letterboxed in canvas)</option>
                  <option value="blur-fill">Blur Fill (Aesthetic mirror backdrop)</option>
                </select>
              </label>
              <label className="range-label">
                Corner Radius <span>{project.layout.mainRegion.cornerRadius}px</span>
              </label>
              <input
                type="range"
                min={0} max={30}
                value={project.layout.mainRegion.cornerRadius}
                onChange={e => dispatch({ type: 'SET_MAIN_REGION', config: { cornerRadius: Number(e.target.value) } })}
                onMouseUp={() => dispatch({ type: 'COMMIT' })}
              />
              <label className="range-label">
                Canvas Padding <span>{project.layout.mainRegion.padding}px</span>
              </label>
              <input
                type="range"
                min={0} max={24}
                value={project.layout.mainRegion.padding}
                onChange={e => dispatch({ type: 'SET_MAIN_REGION', config: { padding: Number(e.target.value) } })}
                onMouseUp={() => dispatch({ type: 'COMMIT' })}
              />
            </div>

            {/* Bottom Region */}
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
              </div>
              {project.layout.bottomRegion.enabled && (
                <>
                  <label className="range-label">
                    Height <span>{project.layout.bottomRegion.height}%</span>
                  </label>
                  <input
                    type="range"
                    min={5} max={30}
                    value={project.layout.bottomRegion.height}
                    onChange={e => dispatch({ type: 'SET_BOTTOM_REGION', config: { height: Number(e.target.value) } })}
                    onMouseUp={() => dispatch({ type: 'COMMIT' })}
                  />
                  <label>
                    Background color
                    <input
                      type="color"
                      value={project.layout.bottomRegion.backgroundColor}
                      onChange={e => dispatch({ type: 'SET_BOTTOM_REGION', config: { backgroundColor: e.target.value } })}
                      onBlur={() => dispatch({ type: 'COMMIT' })}
                    />
                  </label>
                </>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            AUDIO LIBRARY PANEL
            ══════════════════════════════════════════════════ */}
        {tool === 'Audio' && (
          <div className="scroll">
            <div className="section-head">
              <div>
                <b>Audio Library</b>
                <small>Royalty-free background music and sound tracks</small>
              </div>
            </div>
            <button className="import" onClick={() => fileRef.current?.click()}>
              <Upload size={15} /> Import Audio File
            </button>
            <div className="asset-grid">
              {audio.map(a => {
                const isSelected = project.musicAssetId === a.id;
                const isAuditioning = previewingAssetId === a.id;

                return (
                  <div
                    key={a.id}
                    className={`asset ${isSelected ? 'selected' : ''}`}
                    style={{
                      border: isSelected ? '1px solid #20c8f2' : undefined,
                      position: 'relative',
                    }}
                    onClick={() => {
                      dispatch({ type: 'COMMIT' });
                      dispatch({ type: 'UPDATE_PROJECT', payload: { musicAssetId: a.id } });
                      dispatch({ type: 'SET_NOTICE', message: `${a.name} chosen as background music` });
                    }}
                  >
                    <div className="asset-thumb wave">
                      <AudioLines size={28} />
                      <button
                        className="audition-btn"
                        style={{
                          position: 'absolute',
                          bottom: 6,
                          right: 6,
                          background: 'rgba(0,0,0,0.7)',
                          border: 'none',
                          borderRadius: '50%',
                          width: 24,
                          height: 24,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          cursor: 'pointer',
                        }}
                        onClick={e => handleAuditionAudio(a, e)}
                        title={isAuditioning ? 'Pause preview' : 'Audition track'}
                      >
                        {isAuditioning ? <Pause size={12} /> : <Play size={12} fill="currentColor" />}
                      </button>
                    </div>
                    <span>{a.name}</span>
                    <small>{a.duration ? `${fmtTime(a.duration)} · ` : ''}{fmtBytes(a.size)}</small>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            MEDIA LIBRARY PANEL (Default)
            ══════════════════════════════════════════════════ */}
        {tool === 'Media' && (
          <div className="scroll">
            <div className="section-head">
              <div>
                <b>Media Library</b>
                <small>Drag footage onto timeline or double-click</small>
              </div>
              <button className="small-btn" onClick={() => fileRef.current?.click()}>
                <Plus size={14} /> Import
              </button>
            </div>

            <button className="import" onClick={() => fileRef.current?.click()}>
              <Upload size={15} /> Import Video, Audio, or Image
            </button>

            {/* Filter tabs */}
            <div className="media-filter">
              <div>
                <Search size={14} />
                <input
                  placeholder="Search media files"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>
              <select value={filter} onChange={e => setFilter(e.target.value as any)}>
                <option value="All">All ({assets.length})</option>
                <option value="video">Videos ({videos.length})</option>
                <option value="audio">Audio ({audio.length})</option>
                <option value="image">Images ({images.length})</option>
              </select>
            </div>

            {/* Asset Grid */}
            <div className="asset-grid">
              {visibleAssets.map(a => {
                const isAssigned = project.clips.some(c => c.assetId === a.id);

                return (
                  <div
                    key={a.id}
                    className="asset"
                    draggable={true}
                    onDragStart={e => {
                      e.dataTransfer.setData('application/json', JSON.stringify(a));
                      e.dataTransfer.effectAllowed = 'copyMove';
                    }}
                    onDoubleClick={() => {
                      if (a.type === 'video' || a.type === 'image') {
                        assignAssetToClip(a);
                      } else if (a.type === 'audio') {
                        dispatch({ type: 'UPDATE_PROJECT', payload: { musicAssetId: a.id } });
                      }
                    }}
                    style={{ position: 'relative' }}
                  >
                    <div className={`asset-thumb ${a.type === 'audio' ? 'wave' : ''}`}>
                      {a.thumbnailUrl ? (
                        <img
                          src={a.thumbnailUrl}
                          alt={a.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : a.type === 'video' ? (
                        <Video size={24} />
                      ) : a.type === 'audio' ? (
                        <AudioLines size={24} />
                      ) : (
                        <ImageIcon size={24} />
                      )}

                      {/* Duration badge */}
                      {a.duration && a.type !== 'image' && (
                        <span
                          style={{
                            position: 'absolute',
                            bottom: 4,
                            left: 4,
                            background: 'rgba(0,0,0,0.8)',
                            fontSize: 9,
                            fontWeight: 700,
                            padding: '1px 4px',
                            borderRadius: 3,
                            color: '#ffffff',
                          }}
                        >
                          {fmtTime(a.duration)}
                        </span>
                      )}

                      {/* Quick Assign / Add Button */}
                      <button
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          background: 'rgba(0,0,0,0.75)',
                          border: 'none',
                          color: '#ffffff',
                          borderRadius: '50%',
                          width: 22,
                          height: 22,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                        title={a.type === 'audio' ? 'Set as background music' : 'Assign to selected rank'}
                        onClick={e => {
                          e.stopPropagation();
                          if (a.type === 'audio') {
                            dispatch({ type: 'UPDATE_PROJECT', payload: { musicAssetId: a.id } });
                            dispatch({ type: 'SET_NOTICE', message: `${a.name} set as music` });
                          } else {
                            assignAssetToClip(a);
                          }
                        }}
                      >
                        <Target size={12} />
                      </button>

                      {/* Delete button */}
                      <button
                        style={{
                          position: 'absolute',
                          bottom: 4,
                          right: 4,
                          background: 'rgba(239, 68, 68, 0.75)',
                          border: 'none',
                          color: '#ffffff',
                          borderRadius: '50%',
                          width: 20,
                          height: 20,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                        title="Delete asset"
                        onClick={e => handleDeleteAsset(a.id, e)}
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>

                    <span title={a.name}>{a.name}</span>
                    <small>
                      {a.width && a.height ? `${a.width}x${a.height} · ` : ''}{fmtBytes(a.size)}
                    </small>
                  </div>
                );
              })}

              {!visibleAssets.length && (
                <div className="empty" style={{ gridColumn: 'span 2', padding: 24 }}>
                  <Upload size={28} style={{ opacity: 0.3 }} />
                  <b>No media files found</b>
                  <p>Import video clips or audio tracks to begin editing your ranking video.</p>
                  <button className="secondary" onClick={() => fileRef.current?.click()}>
                    Upload Footage
                  </button>
                </div>
              )}
            </div>

            <div className="asset-footer">
              {assets.length} assets
              <span>{videos.length} videos · {audio.length} audio · {images.length} images</span>
            </div>
          </div>
        )}
      </section>

      <input
        ref={fileRef}
        type="file"
        multiple
        hidden
        accept="video/*,audio/*,image/*,.mp4,.mov,.mkv,.webm,.mp3,.wav,.m4a,.png,.jpg,.jpeg,.webp"
        onChange={e => upload(e.target.files)}
      />
    </>
  );
}
