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
            RANKING ENTRIES PANEL (Viral Ranking Studio)
            ══════════════════════════════════════════════════ */}
        {tool === 'Ranking' && (
          <div className="scroll">
            <div className="section-head">
              <div>
                <b>Ranking Countdown Studio</b>
                <small>{project.clips.length} ranked items with viral styles</small>
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
                    rankColor: newRank === 1 ? '#facc15' : newRank === 2 ? '#38bdf8' : newRank === 3 ? '#ef4444' : '#ffffff',
                    comment: '',
                    emoji: '',
                  };
                  dispatch({ type: 'ADD_CLIP', clip: c });
                }}
              >
                <Plus size={14} /> Add Rank
              </button>
            </div>

            {/* ── Left-Side Persistent Ranking Stack Settings (Images 1, 2, 3) ── */}
            <div
              style={{
                background: '#121a26',
                border: '1px solid #223244',
                borderRadius: 8,
                padding: 10,
                marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label className="toggle-row" style={{ fontSize: 11, fontWeight: 700, color: '#e2edf8' }}>
                  <input
                    type="checkbox"
                    checked={project.layout.rankingList?.enabled !== false}
                    onChange={e => {
                      dispatch({ type: 'COMMIT' });
                      dispatch({ type: 'SET_RANKING_LIST', config: { enabled: e.target.checked } });
                    }}
                  />
                  <span>Show Left Ranking Stack Overlay</span>
                </label>
                <span style={{ fontSize: 9, color: '#38bdf8', fontWeight: 600 }}>TikTok / Shorts</span>
              </div>

              {project.layout.rankingList?.enabled !== false && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <label style={{ fontSize: 9, color: '#8899aa' }}>
                      Top Offset: <b>{project.layout.rankingList?.yOffset ?? 26}%</b>
                      <input
                        type="range"
                        min={10}
                        max={45}
                        value={project.layout.rankingList?.yOffset ?? 26}
                        onChange={e => dispatch({ type: 'SET_RANKING_LIST', config: { yOffset: Number(e.target.value) } })}
                        onMouseUp={() => dispatch({ type: 'COMMIT' })}
                        style={{ width: '100%', height: 3 }}
                      />
                    </label>
                    <label style={{ fontSize: 9, color: '#8899aa' }}>
                      Left Offset: <b>{project.layout.rankingList?.xOffset ?? 5}%</b>
                      <input
                        type="range"
                        min={2}
                        max={20}
                        value={project.layout.rankingList?.xOffset ?? 5}
                        onChange={e => dispatch({ type: 'SET_RANKING_LIST', config: { xOffset: Number(e.target.value) } })}
                        onMouseUp={() => dispatch({ type: 'COMMIT' })}
                        style={{ width: '100%', height: 3 }}
                      />
                    </label>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <label style={{ fontSize: 9, color: '#8899aa' }}>
                      Number Size: <b>{project.layout.rankingList?.fontSize ?? 26}px</b>
                      <input
                        type="range"
                        min={18}
                        max={38}
                        value={project.layout.rankingList?.fontSize ?? 26}
                        onChange={e => dispatch({ type: 'SET_RANKING_LIST', config: { fontSize: Number(e.target.value) } })}
                        onMouseUp={() => dispatch({ type: 'COMMIT' })}
                        style={{ width: '100%', height: 3 }}
                      />
                    </label>
                    <label style={{ fontSize: 9, color: '#8899aa' }}>
                      Item Spacing: <b>{project.layout.rankingList?.spacing ?? 8}px</b>
                      <input
                        type="range"
                        min={3}
                        max={18}
                        value={project.layout.rankingList?.spacing ?? 8}
                        onChange={e => dispatch({ type: 'SET_RANKING_LIST', config: { spacing: Number(e.target.value) } })}
                        onMouseUp={() => dispatch({ type: 'COMMIT' })}
                        style={{ width: '100%', height: 3 }}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Renumber Controls */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              <button
                className="secondary"
                style={{ flex: 1, fontSize: 10, padding: '6px 8px' }}
                title="Renumber as Countdown: #6 down to #1"
                onClick={() => {
                  dispatch({ type: 'COMMIT' });
                  dispatch({ type: 'RENUMBER_RANKS', mode: 'countdown' });
                  dispatch({ type: 'SET_NOTICE', message: 'Renumbered in countdown order (#6 -> #1)' });
                }}
              >
                <ArrowDown size={12} /> Countdown (#6→#1)
              </button>
              <button
                className="secondary"
                style={{ flex: 1, fontSize: 10, padding: '6px 8px' }}
                title="Renumber standard: #1 up to #6"
                onClick={() => {
                  dispatch({ type: 'COMMIT' });
                  dispatch({ type: 'RENUMBER_RANKS', mode: 'standard' });
                  dispatch({ type: 'SET_NOTICE', message: 'Renumbered in standard order (#1→#6)' });
                }}
              >
                <ArrowUp size={12} /> Standard (#1→#6)
              </button>
            </div>

            {/* List of ranking entries */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {project.clips.map((c, index) => {
                const isSelected = clip?.id === c.id;
                const asset = assets.find(a => a.id === c.assetId);
                const currentRankColor =
                  c.rankColor ||
                  c.color ||
                  (c.rank === 1 ? '#facc15' : c.rank === 2 ? '#38bdf8' : c.rank === 3 ? '#ef4444' : '#ffffff');

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
                    {/* Header: Rank Number, Label, Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          className="clip-rank-badge"
                          style={{
                            background: currentRankColor,
                            color: currentRankColor === '#ffffff' || currentRankColor === '#facc15' ? '#000000' : '#ffffff',
                            fontWeight: 900,
                            fontSize: 12,
                            padding: '3px 8px',
                            borderRadius: 6,
                            textShadow: 'none',
                          }}
                        >
                          #{c.rank}
                        </span>
                        <input
                          type="text"
                          value={c.label || ''}
                          placeholder="Clip title"
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

                    {/* Viral Reaction & Note row (Matches: "6. Direct hit 💀", "6. Not now 😅", "2. Almost died 🤯") */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: '#0a0f16', padding: '6px 8px', borderRadius: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 9, color: '#7e90a2', whiteSpace: 'nowrap' }}>Tag & Reaction:</span>
                        <input
                          type="text"
                          placeholder="e.g. Direct hit / Almost died"
                          value={c.comment || ''}
                          style={{
                            flex: 1,
                            background: '#131c28',
                            border: '1px solid #233346',
                            borderRadius: 4,
                            padding: '3px 6px',
                            fontSize: 10,
                            color: '#ffffff',
                          }}
                          onChange={e => {
                            dispatch({
                              type: 'UPDATE_CLIP',
                              clipId: c.id,
                              payload: { comment: e.target.value },
                            });
                          }}
                          onBlur={() => dispatch({ type: 'COMMIT' })}
                          onClick={e => e.stopPropagation()}
                        />
                        <input
                          type="text"
                          placeholder="Emoji"
                          value={c.emoji || ''}
                          style={{
                            width: 38,
                            textAlign: 'center',
                            background: '#131c28',
                            border: '1px solid #233346',
                            borderRadius: 4,
                            padding: '3px 4px',
                            fontSize: 11,
                            color: '#ffffff',
                          }}
                          onChange={e => {
                            dispatch({
                              type: 'UPDATE_CLIP',
                              clipId: c.id,
                              payload: { emoji: e.target.value },
                            });
                          }}
                          onBlur={() => dispatch({ type: 'COMMIT' })}
                          onClick={e => e.stopPropagation()}
                        />
                      </div>

                      {/* 1-Click Quick Emoji Picker */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto', paddingTop: 2 }}>
                        {['💀', '😅', '🤯', '😱', '🔥', '🏆', '👀', '🤡', '⚡', '💯'].map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            style={{
                              background: c.emoji === emoji ? '#23384f' : 'transparent',
                              border: c.emoji === emoji ? '1px solid #20c8f2' : '1px solid transparent',
                              borderRadius: 3,
                              fontSize: 11,
                              padding: '1px 3px',
                              cursor: 'pointer',
                            }}
                            onClick={e => {
                              e.stopPropagation();
                              dispatch({ type: 'COMMIT' });
                              dispatch({
                                type: 'UPDATE_CLIP',
                                clipId: c.id,
                                payload: { emoji: c.emoji === emoji ? '' : emoji },
                              });
                            }}
                            title={`Set emoji ${emoji}`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>

                      {/* Quick Rank Number Color Palette */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingTop: 3 }}>
                        <span style={{ fontSize: 8, color: '#68798d' }}>Number color:</span>
                        {[
                          ['#facc15', 'Yellow'],
                          ['#38bdf8', 'Blue'],
                          ['#ef4444', 'Red'],
                          ['#ffffff', 'White'],
                          ['#4ade80', 'Green'],
                          ['#fb923c', 'Orange'],
                          ['#c084fc', 'Purple'],
                        ].map(([col, name]) => (
                          <button
                            key={col}
                            type="button"
                            style={{
                              width: 13,
                              height: 13,
                              borderRadius: '50%',
                              background: col,
                              border: currentRankColor === col ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.5)',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                            onClick={e => {
                              e.stopPropagation();
                              dispatch({ type: 'COMMIT' });
                              dispatch({
                                type: 'UPDATE_CLIP',
                                clipId: c.id,
                                payload: { rankColor: col, color: col },
                              });
                            }}
                            title={name}
                          />
                        ))}
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
                <small>Choose a visual theme for the ranking composition.</small>
              </div>
              <button className="small-btn" onClick={handleSaveAsCustomTemplate}>
                <Plus size={14} /> Save Current
              </button>
            </div>

            {/* Quick Inspiration Presets Matching Uploaded Images */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              <button
                className="secondary"
                style={{
                  justifyContent: 'flex-start',
                  padding: '8px 12px',
                  background: 'linear-gradient(135deg, #162438, #0e1622)',
                  borderColor: '#20c8f2',
                }}
                onClick={() => {
                  dispatch({ type: 'COMMIT' });
                  dispatch({
                    type: 'UPDATE_PROJECT',
                    payload: {
                      title: 'Ranking Funniest Trampoline Moments',
                      name: 'Ranking Funniest Trampoline Moments',
                      templateId: 'trampoline',
                      accentColor: '#facc15',
                      layout: {
                        ...project.layout,
                        topRegion: {
                          ...project.layout.topRegion,
                          mode: 'overlay',
                          title: 'Ranking Funniest Trampoline Moments',
                          fontSize: 26,
                        },
                        mainRegion: {
                          ...project.layout.mainRegion,
                          fitMode: 'fill',
                        },
                        rankingList: {
                          ...project.layout.rankingList,
                          enabled: true,
                          xOffset: 5,
                          yOffset: 26,
                        },
                      },
                    },
                  });
                  dispatch({ type: 'SET_NOTICE', message: 'Applied Funniest Trampoline Moments style!' });
                }}
              >
                <span style={{ color: '#facc15', fontWeight: 800 }}>⚡ Image 1:</span>
                <span style={{ marginLeft: 6 }}>Funniest Trampoline Moments</span>
              </button>

              <button
                className="secondary"
                style={{
                  justifyContent: 'flex-start',
                  padding: '8px 12px',
                  background: 'linear-gradient(135deg, #0e2433, #0a1722)',
                  borderColor: '#38bdf8',
                }}
                onClick={() => {
                  dispatch({ type: 'COMMIT' });
                  dispatch({
                    type: 'UPDATE_PROJECT',
                    payload: {
                      title: 'Ranking Best Shark Moments',
                      name: 'Ranking Best Shark Moments',
                      templateId: 'shark',
                      accentColor: '#38bdf8',
                      layout: {
                        ...project.layout,
                        topRegion: {
                          ...project.layout.topRegion,
                          mode: 'overlay',
                          title: 'Ranking Best Shark Moments',
                          fontSize: 26,
                        },
                        mainRegion: {
                          ...project.layout.mainRegion,
                          fitMode: 'blur-fill',
                        },
                        watermark: {
                          enabled: true,
                          text: 'xiroranks',
                          position: 'bottom-center',
                          opacity: 0.8,
                        },
                        rankingList: {
                          ...project.layout.rankingList,
                          enabled: true,
                          xOffset: 5,
                          yOffset: 30,
                        },
                      },
                    },
                  });
                  dispatch({ type: 'SET_NOTICE', message: 'Applied Best Shark Moments style (Blur-Fill)!' });
                }}
              >
                <span style={{ color: '#38bdf8', fontWeight: 800 }}>🦈 Image 2:</span>
                <span style={{ marginLeft: 6 }}>Best Shark Moments (Blur-Fill)</span>
              </button>

              <button
                className="secondary"
                style={{
                  justifyContent: 'flex-start',
                  padding: '8px 12px',
                  background: 'linear-gradient(135deg, #2b1111, #160a0a)',
                  borderColor: '#ef4444',
                }}
                onClick={() => {
                  dispatch({ type: 'COMMIT' });
                  dispatch({
                    type: 'UPDATE_PROJECT',
                    payload: {
                      title: 'Ranking Funniest WaterSlide Fail Moments',
                      name: 'Ranking Funniest WaterSlide Fail Moments',
                      templateId: 'pool-fails',
                      accentColor: '#ef4444',
                      layout: {
                        ...project.layout,
                        topRegion: {
                          ...project.layout.topRegion,
                          mode: 'banner',
                          backgroundColor: '#000000',
                          title: 'Ranking Funniest WaterSlide Fail Moments',
                          fontSize: 24,
                        },
                        mainRegion: {
                          ...project.layout.mainRegion,
                          fitMode: 'fill',
                        },
                        rankingList: {
                          ...project.layout.rankingList,
                          enabled: true,
                          xOffset: 5,
                          yOffset: 24,
                        },
                      },
                    },
                  });
                  dispatch({ type: 'SET_NOTICE', message: 'Applied WaterSlide Fail Moments style (Top Banner)!' });
                }}
              >
                <span style={{ color: '#ef4444', fontWeight: 800 }}>🌊 Image 3:</span>
                <span style={{ marginLeft: 6 }}>WaterSlide Fail (Top Banner)</span>
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
            TEXT & TITLES PANEL (Interactive Word Highlighter)
            ══════════════════════════════════════════════════ */}
        {tool === 'Text' && (
          <div className="scroll text-editor">
            <h3>Text & Titles</h3>
            <p>Customize 3D overlay titles and multi-color word highlights.</p>

            <label>
              Main Title
              <textarea
                rows={2}
                value={project.title}
                onChange={e => {
                  dispatch({ type: 'UPDATE_PROJECT', payload: { title: e.target.value } });
                  dispatch({ type: 'SET_TOP_REGION', config: { title: e.target.value, titleWords: [] } });
                }}
                onBlur={() => dispatch({ type: 'COMMIT' })}
              />
            </label>

            {/* Interactive Word Color Highlighter (WYSIWYG) */}
            <div style={{ background: '#121a25', border: '1px solid #233346', borderRadius: 8, padding: 10, margin: '10px 0' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#e2edf8', marginBottom: 6 }}>
                Interactive Word Color Highlighter:
              </div>
              <p style={{ fontSize: 9, color: '#8899aa', margin: '0 0 8px' }}>
                Click any word below to assign viral highlight colors (Yellow, Sky Blue, Red):
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {project.title.trim().split(/\s+/).map((word, wIdx) => {
                  const existingWord = project.layout.topRegion.titleWords?.[wIdx];
                  const wordCol = existingWord ? existingWord.color : (
                    ['funniest', 'best', 'unreal'].includes(word.toLowerCase()) ? '#facc15' :
                    ['trampoline', 'shark', 'sports'].includes(word.toLowerCase()) ? '#38bdf8' :
                    ['fail', 'fails', 'slide'].includes(word.toLowerCase()) ? '#ef4444' : '#ffffff'
                  );

                  return (
                    <div key={wIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <span
                        style={{
                          background: '#192534',
                          border: `1px solid ${wordCol}`,
                          borderRadius: 4,
                          padding: '3px 8px',
                          fontSize: 11,
                          fontWeight: 700,
                          color: wordCol,
                        }}
                      >
                        {word}
                      </span>
                      {/* Color dots for this word */}
                      <div style={{ display: 'flex', gap: 2 }}>
                        {[
                          ['#ffffff', 'White'],
                          ['#facc15', 'Yellow'],
                          ['#38bdf8', 'Blue'],
                          ['#ef4444', 'Red'],
                          ['#4ade80', 'Green'],
                        ].map(([col, name]) => (
                          <button
                            key={col}
                            type="button"
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: col,
                              border: wordCol === col ? '1px solid #fff' : 'none',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                            onClick={() => {
                              dispatch({ type: 'COMMIT' });
                              const allWords = project.title.trim().split(/\s+/).map((w, i) => {
                                if (i === wIdx) return { text: w, color: col };
                                const prev = project.layout.topRegion.titleWords?.[i];
                                return prev || { text: w, color: '#ffffff' };
                              });
                              dispatch({ type: 'SET_TOP_REGION', config: { titleWords: allWords } });
                            }}
                            title={name}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Banner Mode (Floating Overlay vs Solid Header Box) */}
            <label style={{ marginTop: 12 }}>
              Top Header Mode
              <select
                value={project.layout.topRegion.mode || 'overlay'}
                onChange={e => {
                  dispatch({ type: 'COMMIT' });
                  dispatch({ type: 'SET_TOP_REGION', config: { mode: e.target.value as any } });
                }}
              >
                <option value="overlay">Floating 3D Overlay (Images 1 & 2)</option>
                <option value="banner">Solid Header Box (Image 3)</option>
              </select>
            </label>

            <label className="range-label" style={{ marginTop: 10 }}>
              Title Font Size <span>{project.layout.topRegion.fontSize}px</span>
              <input
                type="range"
                min={18}
                max={38}
                value={project.layout.topRegion.fontSize}
                onChange={e => dispatch({ type: 'SET_TOP_REGION', config: { fontSize: Number(e.target.value) } })}
                onMouseUp={() => dispatch({ type: 'COMMIT' })}
              />
            </label>

            {/* Creator Watermark (Matching Image 2: "xiroranks") */}
            <h4 style={{ marginTop: 20 }}>Creator Watermark & Handle</h4>
            <div style={{ background: '#121a25', border: '1px solid #233346', borderRadius: 8, padding: 10 }}>
              <label className="toggle-row" style={{ fontSize: 10, marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={project.layout.watermark?.enabled !== false}
                  onChange={e => {
                    dispatch({ type: 'COMMIT' });
                    dispatch({ type: 'SET_WATERMARK', config: { enabled: e.target.checked } });
                  }}
                />
                <b>Show Creator Watermark (e.g. xiroranks)</b>
              </label>

              <label>
                Watermark text
                <input
                  value={project.layout.watermark?.text || ''}
                  placeholder="e.g. xiroranks / @creator"
                  onChange={e => dispatch({ type: 'SET_WATERMARK', config: { text: e.target.value } })}
                  onBlur={() => dispatch({ type: 'COMMIT' })}
                />
              </label>

              <label className="range-label" style={{ marginTop: 8 }}>
                Watermark Opacity <span>{Math.round((project.layout.watermark?.opacity ?? 0.8) * 100)}%</span>
                <input
                  type="range"
                  min={20}
                  max={100}
                  value={Math.round((project.layout.watermark?.opacity ?? 0.8) * 100)}
                  onChange={e => dispatch({ type: 'SET_WATERMARK', config: { opacity: Number(e.target.value) / 100 } })}
                  onMouseUp={() => dispatch({ type: 'COMMIT' })}
                />
              </label>
            </div>

            <label style={{ marginTop: 14 }}>
              Opening hook text (first 1.8s)
              <textarea
                rows={2}
                value={project.hookText}
                onChange={e => dispatch({ type: 'UPDATE_PROJECT', payload: { hookText: e.target.value } })}
                onBlur={() => dispatch({ type: 'COMMIT' })}
              />
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={state.hookOn}
                onChange={e => dispatch({ type: 'SET_HOOK_ON', on: e.target.checked })}
              />
              Show opening hook
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <button className="import" style={{ margin: 0 }} onClick={() => fileRef.current?.click()}>
                <Upload size={14} /> Import File
              </button>
              <button
                className="import"
                style={{
                  margin: 0,
                  background: 'linear-gradient(135deg, rgba(32, 200, 242, 0.15), rgba(147, 51, 234, 0.15))',
                  borderColor: 'rgba(32, 200, 242, 0.4)',
                  color: '#38bdf8',
                }}
                onClick={() => dispatch({ type: 'SET_WIZARD_OPEN', open: true })}
              >
                <Sparkles size={14} /> AI Discover
              </button>
            </div>

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
