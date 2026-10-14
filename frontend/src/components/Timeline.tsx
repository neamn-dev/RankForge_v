import { useState, useRef, useCallback } from 'react';
import {
  Clock3, Copy, Plus, Scissors, Trash2, Video, TextCursorInput,
  Music2, Eye, Save, ZoomIn, ZoomOut, ArrowLeftRight
} from 'lucide-react';
import { useStore, useSelectedClip } from '../store';
import { api } from '../api';
import { fmtTime } from '../types';
import type { Clip } from '../types';

export default function Timeline() {
  const { state, dispatch } = useStore();
  const { project, playhead, selectedClipId, hookOn, assets } = state;
  const clip = useSelectedClip();
  const [zoom, setZoom] = useState(40); // pixels per second
  const timelineTracksRef = useRef<HTMLDivElement>(null);

  const total = project.clips.reduce((n, c) => n + c.duration, 0) + (hookOn ? 1.8 : 0);
  const audio = assets.filter(a => a.type === 'audio');
  const bgMusic = audio.find(a => a.id === project.musicAssetId);

  // Timeline scrub handler
  const handleScrub = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineTracksRef.current) return;
    const rect = timelineTracksRef.current.getBoundingClientRect();
    const scrollLeft = timelineTracksRef.current.scrollLeft;
    const clickX = e.clientX - rect.left + scrollLeft;
    const time = Math.max(0, Math.min(total, clickX / zoom));
    dispatch({ type: 'SET_PLAYHEAD', time });
  }, [total, zoom, dispatch]);

  // Trim drag handlers
  const handleTrimDrag = (
    clipToTrim: Clip,
    edge: 'start' | 'end',
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    const startX = e.clientX;
    const origDuration = clipToTrim.duration;
    const origStart = clipToTrim.sourceStart || 0;
    const origEnd = clipToTrim.sourceEnd || (origStart + origDuration);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaTime = deltaX / zoom;

      if (edge === 'end') {
        const newDur = Math.max(0.5, origDuration + deltaTime);
        dispatch({
          type: 'UPDATE_CLIP',
          clipId: clipToTrim.id,
          payload: {
            duration: Number(newDur.toFixed(2)),
            sourceEnd: Number((origStart + newDur).toFixed(2)),
          },
        });
      } else {
        const newStart = Math.max(0, origStart + deltaTime);
        const newDur = Math.max(0.5, origDuration - deltaTime);
        dispatch({
          type: 'UPDATE_CLIP',
          clipId: clipToTrim.id,
          payload: {
            sourceStart: Number(newStart.toFixed(2)),
            duration: Number(newDur.toFixed(2)),
          },
        });
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dispatch({ type: 'COMMIT' });
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Split clip at playhead
  const splitSelectedClip = () => {
    if (!clip) {
      dispatch({ type: 'SET_NOTICE', message: 'Select a clip to split' });
      return;
    }
    // Calculate clip start in project timeline
    let elapsed = hookOn ? 1.8 : 0;
    for (const c of project.clips) {
      if (c.id === clip.id) break;
      elapsed += c.duration;
    }

    const splitOffset = playhead - elapsed;
    if (splitOffset <= 0.5 || splitOffset >= clip.duration - 0.5) {
      dispatch({
        type: 'SET_NOTICE',
        message: 'Move playhead inside the selected clip to split (at least 0.5s from edges)',
      });
      return;
    }

    dispatch({ type: 'COMMIT' });
    const clipA: Clip = {
      ...clip,
      duration: Number(splitOffset.toFixed(2)),
      sourceEnd: Number(((clip.sourceStart || 0) + splitOffset).toFixed(2)),
    };
    const clipB: Clip = {
      ...clip,
      id: crypto.randomUUID(),
      name: `${clip.name} (Part 2)`,
      sourceStart: Number(((clip.sourceStart || 0) + splitOffset).toFixed(2)),
      duration: Number((clip.duration - splitOffset).toFixed(2)),
    };

    const newClips = project.clips.flatMap(c => (c.id === clip.id ? [clipA, clipB] : [c]));
    dispatch({
      type: 'UPDATE_PROJECT',
      payload: {
        clips: newClips.map((c, i) => ({ ...c, rank: newClips.length - i })),
      },
    });
    dispatch({ type: 'SET_NOTICE', message: 'Clip split into two parts' });
  };

  // Duplicate clip
  const duplicateClip = () => {
    if (!clip) return;
    dispatch({ type: 'COMMIT' });
    const clone: Clip = {
      ...clip,
      id: crypto.randomUUID(),
      name: `Copy of ${clip.name}`,
    };
    const idx = project.clips.findIndex(c => c.id === clip.id);
    const newClips = [...project.clips];
    newClips.splice(idx + 1, 0, clone);
    dispatch({
      type: 'UPDATE_PROJECT',
      payload: {
        clips: newClips.map((c, i) => ({ ...c, rank: newClips.length - i })),
      },
    });
    dispatch({ type: 'SET_SELECTED', clipId: clone.id });
    dispatch({ type: 'SET_NOTICE', message: 'Clip duplicated' });
  };

  // Delete clip
  const deleteClip = () => {
    if (!clip) return;
    dispatch({ type: 'COMMIT' });
    dispatch({ type: 'REMOVE_CLIP', clipId: clip.id });
    dispatch({ type: 'SET_NOTICE', message: `Rank #${clip.rank} deleted` });
  };

  // Add clip
  const addClip = () => {
    dispatch({ type: 'COMMIT' });
    const newRank = project.clips.length + 1;
    const c: Clip = {
      id: crypto.randomUUID(),
      assetId: null,
      name: `Rank ${newRank}`,
      sourceStart: 0,
      sourceEnd: 4,
      duration: 4,
      label: `Rank ${newRank} Item`,
      rank: newRank,
      color: project.accentColor,
    };
    dispatch({ type: 'ADD_CLIP', clip: c });
    dispatch({ type: 'SET_NOTICE', message: `Added Rank #${newRank}` });
  };

  // Save project
  const saveProject = async () => {
    dispatch({ type: 'SET_BUSY', message: 'Saving project…' });
    try {
      const saved = await api.saveProject(project);
      dispatch({ type: 'LOAD_PROJECT', project: saved });
      dispatch({ type: 'MARK_SAVED' });
      dispatch({ type: 'SET_NOTICE', message: 'Project saved successfully' });
    } catch (e) {
      dispatch({
        type: 'SET_NOTICE',
        message: e instanceof Error ? e.message : 'Save failed',
      });
    } finally {
      dispatch({ type: 'SET_BUSY', message: '' });
    }
  };

  // Calculate playhead position in pixels
  const playheadPixels = playhead * zoom;

  return (
    <section className="timeline">
      {/* ── Toolbar ── */}
      <div className="timeline-tools">
        <div>
          <button title="Add clip" onClick={addClip}>
            <Plus size={15} />
          </button>
          <button title="Split clip at playhead" onClick={splitSelectedClip}>
            <Scissors size={15} />
          </button>
          <button title="Duplicate selected clip" onClick={duplicateClip} disabled={!clip}>
            <Copy size={15} />
          </button>
          <button title="Delete selected clip" onClick={deleteClip} disabled={!clip}>
            <Trash2 size={15} />
          </button>
          <div className="zoom-controls">
            <button
              className="icon"
              title="Zoom out"
              onClick={() => setZoom(z => Math.max(15, z - 8))}
            >
              <ZoomOut size={13} />
            </button>
            <span style={{ fontSize: 9, color: '#68798d' }}>{zoom}px/s</span>
            <button
              className="icon"
              title="Zoom in"
              onClick={() => setZoom(z => Math.min(100, z + 8))}
            >
              <ZoomIn size={13} />
            </button>
          </div>
        </div>

        <span>
          <Clock3 size={13} /> {fmtTime(playhead)} / {fmtTime(total)}
        </span>
      </div>

      {/* ── Tracks Main ── */}
      <div className="timeline-main">
        {/* Track labels */}
        <div className="track-names">
          <div className="ruler-name">Timeline</div>
          <div><Video size={13} /> Video <Eye size={12} /></div>
          <div><TextCursorInput size={13} /> Overlays <Eye size={12} /></div>
          <div><Music2 size={13} /> Audio <Eye size={12} /></div>
        </div>

        {/* Tracks scrollable area */}
        <div
          className="tracks"
          ref={timelineTracksRef}
          onClick={handleScrub}
          style={{ cursor: 'pointer' }}
        >
          {/* Ruler */}
          <div className="ruler" style={{ width: Math.max(800, total * zoom + 120) }}>
            {Array.from({ length: Math.ceil(total / 2) + 2 }, (_, i) => {
              const sec = i * 2;
              return (
                <span key={sec} style={{ left: sec * zoom }}>
                  {fmtTime(sec)}
                </span>
              );
            })}
          </div>

          {/* Video track */}
          <div className="track video-track" style={{ width: Math.max(800, total * zoom + 120) }}>
            {/* Hook spacer */}
            {hookOn && (
              <div
                style={{
                  width: 1.8 * zoom,
                  height: 38,
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px dashed #f59e0b',
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  color: '#fbbf24',
                  flex: 'none',
                }}
              >
                Hook (1.8s)
              </div>
            )}

            {/* Clips */}
            {project.clips.map(c => {
              const clipWidth = Math.max(65, c.duration * zoom);
              const isSelected = selectedClipId === c.id;

              return (
                <div
                  key={c.id}
                  className={`timeline-clip ${isSelected ? 'selected' : ''}`}
                  style={{ width: clipWidth }}
                  onClick={e => {
                    e.stopPropagation();
                    dispatch({ type: 'SET_SELECTED', clipId: c.id });
                  }}
                >
                  {/* Left trim handle */}
                  <div
                    className="clip-trim-handle clip-trim-left"
                    onMouseDown={e => handleTrimDrag(c, 'start', e)}
                    title="Drag to trim start"
                  />

                  {/* Clip info */}
                  <div style={{ display: 'flex', alignItems: 'center', zIndex: 2 }}>
                    <span
                      className="clip-rank-badge"
                      style={{ background: c.color || project.accentColor }}
                    >
                      #{c.rank}
                    </span>
                    <span style={{ fontSize: 9, fontWeight: 600 }}>{c.name}</span>
                  </div>

                  <div className="filmstrip">
                    <i /><i /><i /><i />
                  </div>

                  <small>{c.duration.toFixed(1)}s</small>

                  {/* Right trim handle */}
                  <div
                    className="clip-trim-handle clip-trim-right"
                    onMouseDown={e => handleTrimDrag(c, 'end', e)}
                    title="Drag to trim end"
                  />
                </div>
              );
            })}

            <button className="add-clip" onClick={addClip} title="Add another rank item">
              <Plus size={15} />
            </button>
          </div>

          {/* Overlays track */}
          <div className="track text-track" style={{ width: Math.max(800, total * zoom + 120) }}>
            <div className="text-clip" style={{ width: Math.min(300, total * zoom * 0.6) }}>
              <TextCursorInput size={12} /> {project.title}
            </div>
            {project.clips.slice(0, 5).map(c => (
              <div
                key={c.id}
                className="text-clip secondary-text"
                style={{ width: Math.max(50, c.duration * zoom - 4) }}
              >
                #{c.rank} {c.label}
              </div>
            ))}
          </div>

          {/* Audio track */}
          <div className="track audio-track" style={{ width: Math.max(800, total * zoom + 120) }}>
            {project.musicAssetId ? (
              <div
                className="audio-clip"
                style={{ width: Math.max(120, total * zoom) }}
                onClick={() => dispatch({ type: 'SET_TOOL', tool: 'Audio' })}
              >
                <Music2 size={13} />
                <span>{bgMusic?.name || 'Background Music'}</span>
                <div className="waveform">
                  {Array.from({ length: 60 }, (_, i) => (
                    <i
                      key={i}
                      style={{
                        height: `${18 + Math.abs(Math.sin(i * 1.5)) * 32}%`,
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <button className="add-audio" onClick={() => dispatch({ type: 'SET_TOOL', tool: 'Audio' })}>
                <Plus size={13} /> Add background audio track
              </button>
            )}
          </div>

          {/* Playhead */}
          <div
            className="playhead"
            style={{
              left: playheadPixels + (hookOn ? 0 : 0),
            }}
          />
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="timeline-footer">
        <span>{project.clips.length} ranked clips</span>
        <span>
          Total Duration: {fmtTime(total)} · Sandwich Video Engine
        </span>
        <button onClick={saveProject}>
          <Save size={13} /> Save Project
        </button>
      </div>
    </section>
  );
}
