import { useStore, useSelectedClip } from '../store';
import {
  ChevronDown, ArrowUp, ArrowDown, RotateCcw, Volume2, Sparkles, SlidersHorizontal,
  Clock, Eye, Film, Layers, Type, Move, Palette
} from 'lucide-react';
import type { InspectorTab } from '../types';

const TABS: InspectorTab[] = ['Video', 'Audio', 'Speed', 'Animation', 'Adjust', 'Layout'];

export default function Inspector() {
  const { state, dispatch } = useStore();
  const { inspectorTab, project, assets } = state;
  const clip = useSelectedClip();
  const audioAssets = assets.filter(a => a.type === 'audio');

  const updateClip = (payload: Partial<typeof clip>) => {
    if (!clip) return;
    dispatch({ type: 'UPDATE_CLIP', clipId: clip.id, payload: payload as any });
  };

  const moveClip = (delta: number) => {
    if (!clip) return;
    dispatch({ type: 'COMMIT' });
    dispatch({ type: 'MOVE_CLIP', clipId: clip.id, delta });
  };

  return (
    <aside className="right">
      {/* ── Tab headers ── */}
      <div className="prop-tabs">
        {TABS.map(tab => (
          <button
            key={tab}
            className={inspectorTab === tab ? 'active' : ''}
            onClick={() => dispatch({ type: 'SET_INSPECTOR_TAB', tab })}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="prop-scroll">
        {/* ══════════════════════════════════════════════════
            VIDEO TAB
            ══════════════════════════════════════════════════ */}
        {inspectorTab === 'Video' && (
          <>
            {clip ? (
              <>
                <div className="prop-section" style={{ background: '#121a25', borderBottom: '1px solid #233345' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="clip-rank-badge" style={{ background: clip.color || project.accentColor, fontSize: 10, padding: '2px 6px' }}>
                        #{clip.rank}
                      </span>
                      <b style={{ fontSize: 11, color: '#f0f5fa' }}>{clip.name}</b>
                    </div>
                    <span style={{ fontSize: 9, color: '#7e90a2' }}>{clip.duration.toFixed(1)}s</span>
                  </div>
                </div>

                {/* Rank & Overlay Settings */}
                <div className="prop-section">
                  <h4><Type size={13} /> Rank & Overlay</h4>
                  <label>
                    Rank label
                    <input
                      type="text"
                      value={clip.label || ''}
                      placeholder="e.g. The Giant Cat Leap"
                      onChange={e => updateClip({ label: e.target.value })}
                      onBlur={() => dispatch({ type: 'COMMIT' })}
                    />
                  </label>

                  <div className="two-fields" style={{ marginTop: 10 }}>
                    <label>
                      Accent color
                      <input
                        type="color"
                        value={clip.color || project.accentColor}
                        onChange={e => updateClip({ color: e.target.value })}
                        onBlur={() => dispatch({ type: 'COMMIT' })}
                      />
                    </label>
                    <label>
                      Badge style
                      <select
                        value={project.layout.mainRegion.rankBadgeStyle}
                        onChange={e => {
                          dispatch({ type: 'COMMIT' });
                          dispatch({
                            type: 'SET_MAIN_REGION',
                            config: { rankBadgeStyle: e.target.value as any },
                          });
                        }}
                      >
                        <option value="circle">Circle</option>
                        <option value="square">Square</option>
                        <option value="pill">Pill</option>
                        <option value="outline">Outline</option>
                      </select>
                    </label>
                  </div>

                  <div className="rank-actions" style={{ marginTop: 12 }}>
                    <button onClick={() => moveClip(-1)}>
                      <ArrowUp size={13} /> Move up
                    </button>
                    <button onClick={() => moveClip(1)}>
                      <ArrowDown size={13} /> Move down
                    </button>
                  </div>
                </div>

                {/* Timing & Trimming */}
                <div className="prop-section">
                  <h4><Clock size={13} /> Clip Timing & Trim</h4>
                  <div className="two-fields">
                    <label>
                      Start (sec)
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={clip.sourceStart || 0}
                        onChange={e => {
                          const val = Math.max(0, parseFloat(e.target.value) || 0);
                          updateClip({
                            sourceStart: val,
                            duration: Math.max(0.5, (clip.sourceEnd || 5) - val),
                          });
                        }}
                        onBlur={() => dispatch({ type: 'COMMIT' })}
                      />
                    </label>
                    <label>
                      End (sec)
                      <input
                        type="number"
                        step="0.1"
                        min="0.5"
                        value={clip.sourceEnd || clip.duration || 5}
                        onChange={e => {
                          const val = Math.max((clip.sourceStart || 0) + 0.5, parseFloat(e.target.value) || 1);
                          updateClip({
                            sourceEnd: val,
                            duration: val - (clip.sourceStart || 0),
                          });
                        }}
                        onBlur={() => dispatch({ type: 'COMMIT' })}
                      />
                    </label>
                  </div>
                  <label className="range-label" style={{ marginTop: 10 }}>
                    Duration <span>{clip.duration.toFixed(1)}s</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="0.5"
                    value={clip.duration}
                    onChange={e => {
                      const dur = parseFloat(e.target.value);
                      updateClip({
                        duration: dur,
                        sourceEnd: (clip.sourceStart || 0) + dur,
                      });
                    }}
                    onMouseUp={() => dispatch({ type: 'COMMIT' })}
                  />
                </div>

                {/* Transform & Fit */}
                <div className="prop-section">
                  <h4><Move size={13} /> Video Fit & Placement</h4>
                  <label>
                    Fit mode
                    <select
                      value={project.layout.mainRegion.fitMode}
                      onChange={e => {
                        dispatch({ type: 'COMMIT' });
                        dispatch({
                          type: 'SET_MAIN_REGION',
                          config: { fitMode: e.target.value as any },
                        });
                      }}
                    >
                      <option value="fill">Fill (crop to fit canvas)</option>
                      <option value="fit">Fit (letterbox)</option>
                      <option value="blur-fill">Blur Fill (aesthetic backdrop)</option>
                    </select>
                  </label>

                  <label className="range-label" style={{ marginTop: 10 }}>
                    Corner radius <span>{project.layout.mainRegion.cornerRadius}px</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="28"
                    value={project.layout.mainRegion.cornerRadius}
                    onChange={e =>
                      dispatch({
                        type: 'SET_MAIN_REGION',
                        config: { cornerRadius: Number(e.target.value) },
                      })
                    }
                    onMouseUp={() => dispatch({ type: 'COMMIT' })}
                  />
                </div>
              </>
            ) : (
              <div className="empty" style={{ padding: 24 }}>
                <Film size={24} style={{ opacity: 0.4 }} />
                <p>Select a clip in the timeline or preview to inspect its properties.</p>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════
            AUDIO TAB
            ══════════════════════════════════════════════════ */}
        {inspectorTab === 'Audio' && (
          <div className="prop-section">
            <h4><Volume2 size={13} /> Background Audio & Music</h4>
            <label>
              Music track
              <select
                value={project.musicAssetId || ''}
                onChange={e => {
                  dispatch({ type: 'COMMIT' });
                  dispatch({
                    type: 'UPDATE_PROJECT',
                    payload: { musicAssetId: e.target.value || null },
                  });
                }}
              >
                <option value="">No background music</option>
                {audioAssets.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="range-label" style={{ marginTop: 14 }}>
              Music volume <span>{Math.round((project.musicVolume ?? 0.22) * 100)}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round((project.musicVolume ?? 0.22) * 100)}
              onChange={e =>
                dispatch({
                  type: 'UPDATE_PROJECT',
                  payload: { musicVolume: Number(e.target.value) / 100 },
                })
              }
              onMouseUp={() => dispatch({ type: 'COMMIT' })}
            />

            <p className="hint" style={{ marginTop: 12 }}>
              Audio is automatically ducked and balanced with video dialogue during export.
            </p>

            <button
              className="small-btn"
              style={{ width: '100%', marginTop: 8 }}
              onClick={() => dispatch({ type: 'SET_TOOL', tool: 'Audio' })}
            >
              Browse Audio Library
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            SPEED TAB
            ══════════════════════════════════════════════════ */}
        {inspectorTab === 'Speed' && (
          <div className="prop-section">
            <h4><Clock size={13} /> Playback Speed</h4>
            <p className="hint">Adjust playback speed for the selected clip:</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 10 }}>
              {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(speed => (
                <button
                  key={speed}
                  className="preset"
                  style={{
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: 11,
                    padding: 8,
                  }}
                  onClick={() => {
                    if (!clip) return;
                    dispatch({ type: 'COMMIT' });
                    const orig = (clip.sourceEnd || 5) - (clip.sourceStart || 0);
                    updateClip({ duration: Math.max(0.5, orig / speed) });
                    dispatch({
                      type: 'SET_NOTICE',
                      message: `Speed set to ${speed}x (duration: ${(orig / speed).toFixed(1)}s)`,
                    });
                  }}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            ANIMATION TAB
            ══════════════════════════════════════════════════ */}
        {inspectorTab === 'Animation' && (
          <div className="prop-section">
            <h4><Sparkles size={13} /> Entrance & Transitions</h4>
            <p className="hint">Ranking entry animations applied to overlays and cards:</p>
            {['Pop Up & Bounce', 'Cinematic Slide Up', 'Smooth Crossfade', 'Zoom & Flash', 'Scale In'].map(
              anim => (
                <button
                  key={anim}
                  className="preset"
                  onClick={() =>
                    dispatch({
                      type: 'SET_NOTICE',
                      message: `Applied "${anim}" transition to #${clip?.rank || 1}`,
                    })
                  }
                >
                  <Sparkles size={13} style={{ color: varCyan() }} />
                  {anim}
                </button>
              )
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            ADJUST TAB
            ══════════════════════════════════════════════════ */}
        {inspectorTab === 'Adjust' && (
          <div className="prop-section">
            <h4><SlidersHorizontal size={13} /> Color Adjustments</h4>
            <label className="range-label">Brightness <span>100%</span></label>
            <input type="range" min="60" max="140" defaultValue="100" />

            <label className="range-label">Contrast <span>100%</span></label>
            <input type="range" min="60" max="140" defaultValue="100" />

            <label className="range-label">Saturation <span>100%</span></label>
            <input type="range" min="40" max="160" defaultValue="100" />

            <button
              className="reset"
              style={{ width: '100%', marginTop: 14 }}
              onClick={() => dispatch({ type: 'SET_NOTICE', message: 'Adjustments reset' })}
            >
              <RotateCcw size={12} style={{ display: 'inline', marginRight: 5 }} /> Reset Adjustments
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            LAYOUT TAB
            ══════════════════════════════════════════════════ */}
        {inspectorTab === 'Layout' && (
          <div className="prop-section">
            <h4><Layers size={13} /> Sandwich Layout Quick Controls</h4>
            <label className="range-label">
              Top bar height <span>{project.layout.topRegion.height}%</span>
            </label>
            <input
              type="range"
              min="6"
              max="28"
              value={project.layout.topRegion.height}
              onChange={e =>
                dispatch({
                  type: 'SET_TOP_REGION',
                  config: { height: Number(e.target.value) },
                })
              }
            />

            <label className="range-label" style={{ marginTop: 10 }}>
              Bottom bar height <span>{project.layout.bottomRegion.height}%</span>
            </label>
            <input
              type="range"
              min="6"
              max="28"
              value={project.layout.bottomRegion.height}
              onChange={e =>
                dispatch({
                  type: 'SET_BOTTOM_REGION',
                  config: { height: Number(e.target.value) },
                })
              }
            />

            <button
              className="small-btn"
              style={{ width: '100%', marginTop: 14 }}
              onClick={() => dispatch({ type: 'SET_TOOL', tool: 'Layout' })}
            >
              Open Full Sandwich Layout Panel
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

function varCyan() {
  return '#20c8f2';
}
