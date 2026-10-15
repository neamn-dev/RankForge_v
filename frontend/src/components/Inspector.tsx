import { useStore, useSelectedClip } from '../store';
import {
  ArrowUp, ArrowDown, RotateCcw, Volume2, Sparkles, SlidersHorizontal,
  Clock, Film, Layers, Type, Move, Check
} from 'lucide-react';
import type { InspectorTab } from '../types';
import { fmtTime } from '../types';

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

  const clipAdjustments = clip?.adjustments || { brightness: 100, contrast: 100, saturation: 100 };

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
                  <h4><Type size={13} /> Rank Badge & Overlay</h4>
                  <label>
                    Rank label card
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

                  <label style={{ marginTop: 10 }}>
                    Badge position
                    <select
                      value={project.layout.mainRegion.rankBadgePosition}
                      onChange={e => {
                        dispatch({ type: 'COMMIT' });
                        dispatch({
                          type: 'SET_MAIN_REGION',
                          config: { rankBadgePosition: e.target.value as any },
                        });
                      }}
                    >
                      <option value="top-left">Top Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-right">Bottom Right</option>
                    </select>
                  </label>

                  <div className="rank-actions" style={{ marginTop: 12 }}>
                    <button onClick={() => moveClip(-1)}>
                      <ArrowUp size={13} /> Move up in ranking
                    </button>
                    <button onClick={() => moveClip(1)}>
                      <ArrowDown size={13} /> Move down in ranking
                    </button>
                  </div>
                </div>

                {/* Timing & Trimming */}
                <div className="prop-section">
                  <h4><Clock size={13} /> Clip Timing & Trimming</h4>
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
                    Clip Duration <span>{clip.duration.toFixed(1)}s</span>
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="20"
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
                      <option value="fill">Fill (Crop to canvas)</option>
                      <option value="fit">Fit (Letterbox in canvas)</option>
                      <option value="blur-fill">Blur Fill (Aesthetic mirror backdrop)</option>
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
              Selected music track
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
                    {a.name} ({a.duration ? `${fmtTime(a.duration)}` : ''})
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
              Audio is automatically mixed and balanced with video dialogue during export.
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
            <h4><Clock size={13} /> Playback Speed Multiplier</h4>
            <p className="hint">Adjust playback speed for Rank #{clip?.rank || 1}:</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 10 }}>
              {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(speed => {
                const isCurrent = Math.abs((clip?.speed || 1.0) - speed) < 0.05;

                return (
                  <button
                    key={speed}
                    className={`preset ${isCurrent ? 'active' : ''}`}
                    style={{
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 11,
                      padding: '8px 4px',
                      border: isCurrent ? '1px solid #20c8f2' : undefined,
                      background: isCurrent ? '#162335' : undefined,
                      color: isCurrent ? '#20c8f2' : undefined,
                    }}
                    onClick={() => {
                      if (!clip) return;
                      dispatch({ type: 'COMMIT' });
                      const orig = (clip.sourceEnd || 5) - (clip.sourceStart || 0);
                      const newDur = Math.max(0.5, orig / speed);
                      updateClip({
                        speed,
                        duration: Number(newDur.toFixed(2)),
                      });
                      dispatch({
                        type: 'SET_NOTICE',
                        message: `Speed set to ${speed}x (${newDur.toFixed(1)}s)`,
                      });
                    }}
                  >
                    {speed}x
                  </button>
                );
              })}
            </div>
            <p className="hint" style={{ marginTop: 12 }}>
              Active speed: <b>{clip?.speed || 1.0}x</b> (Applied to FFmpeg setpts and timeline duration).
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            ANIMATION TAB
            ══════════════════════════════════════════════════ */}
        {inspectorTab === 'Animation' && (
          <div className="prop-section">
            <h4><Sparkles size={13} /> Entrance & Transitions</h4>
            <p className="hint">Transition preset for Rank #{clip?.rank || 1}:</p>
            {['Pop Up & Bounce', 'Cinematic Slide Up', 'Smooth Crossfade', 'Zoom & Flash', 'Scale In'].map(
              anim => {
                const isSelected = clip?.transition === anim;

                return (
                  <button
                    key={anim}
                    className={`preset ${isSelected ? 'active' : ''}`}
                    style={{
                      border: isSelected ? '1px solid #20c8f2' : undefined,
                      background: isSelected ? '#162335' : undefined,
                      color: isSelected ? '#20c8f2' : undefined,
                    }}
                    onClick={() => {
                      if (!clip) return;
                      dispatch({ type: 'COMMIT' });
                      updateClip({ transition: anim });
                      dispatch({
                        type: 'SET_NOTICE',
                        message: `Applied "${anim}" transition to Rank #${clip.rank}`,
                      });
                    }}
                  >
                    <Sparkles size={13} style={{ color: isSelected ? '#20c8f2' : '#68798d' }} />
                    <span style={{ flex: 1, textAlign: 'left' }}>{anim}</span>
                    {isSelected && <Check size={12} />}
                  </button>
                );
              }
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            ADJUST TAB
            ══════════════════════════════════════════════════ */}
        {inspectorTab === 'Adjust' && (
          <div className="prop-section">
            <h4><SlidersHorizontal size={13} /> Real-Time Color Adjustments</h4>
            <p className="hint">Fine-tune exposure and vibrance for Rank #{clip?.rank || 1}:</p>

            <label className="range-label" style={{ marginTop: 10 }}>
              Brightness <span>{clipAdjustments.brightness}%</span>
            </label>
            <input
              type="range"
              min="60"
              max="140"
              value={clipAdjustments.brightness}
              onChange={e => {
                updateClip({
                  adjustments: {
                    ...clipAdjustments,
                    brightness: Number(e.target.value),
                  },
                });
              }}
              onMouseUp={() => dispatch({ type: 'COMMIT' })}
            />

            <label className="range-label" style={{ marginTop: 10 }}>
              Contrast <span>{clipAdjustments.contrast}%</span>
            </label>
            <input
              type="range"
              min="60"
              max="140"
              value={clipAdjustments.contrast}
              onChange={e => {
                updateClip({
                  adjustments: {
                    ...clipAdjustments,
                    contrast: Number(e.target.value),
                  },
                });
              }}
              onMouseUp={() => dispatch({ type: 'COMMIT' })}
            />

            <label className="range-label" style={{ marginTop: 10 }}>
              Saturation <span>{clipAdjustments.saturation}%</span>
            </label>
            <input
              type="range"
              min="40"
              max="160"
              value={clipAdjustments.saturation}
              onChange={e => {
                updateClip({
                  adjustments: {
                    ...clipAdjustments,
                    saturation: Number(e.target.value),
                  },
                });
              }}
              onMouseUp={() => dispatch({ type: 'COMMIT' })}
            />

            <button
              className="reset"
              style={{ width: '100%', marginTop: 14 }}
              onClick={() => {
                dispatch({ type: 'COMMIT' });
                updateClip({
                  adjustments: { brightness: 100, contrast: 100, saturation: 100 },
                });
                dispatch({ type: 'SET_NOTICE', message: 'Color adjustments reset to 100%' });
              }}
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
              onMouseUp={() => dispatch({ type: 'COMMIT' })}
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
              onMouseUp={() => dispatch({ type: 'COMMIT' })}
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
