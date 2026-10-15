import { useState, useRef, useCallback } from 'react';
import {
  Clock3, Copy, Plus, Scissors, Trash2, Video, TextCursorInput,
  Music2, Eye, EyeOff, Volume2, VolumeX, Save, ZoomIn, ZoomOut,
  ArrowUpDown, Film
} from 'lucide-react';
import { useStore, useSelectedClip } from '../store';
import { api } from '../api';
import { fmtTime } from '../types';
import type { Clip, Asset } from '../types';

export default function Timeline() {
  const { state, dispatch } = useStore();
  const {
    project, playhead, selectedClipId, hookOn, assets,
    trackVideoHidden, trackOverlaysHidden, trackAudioMuted
  } = state;

  const clip = useSelectedClip();
  const [zoom, setZoom] = useState(45); // pixels per second
  const [draggedClipId, setDraggedClipId] = useState<string | null>(null);
  const [dragOverClipId, setDragOverClipId] = useState<string | null>(null);
  const [isDraggingOverTrack, setIsDraggingOverTrack] = useState(false);
  const timelineTracksRef = useRef<HTMLDivElement>(null);

  const total = project.clips.reduce((n, c) => n + c.duration, 0) + (hookOn ? 1.8 : 0);
  const audio = assets.filter(a => a.type === 'audio');
  const bgMusic = audio.find(a => a.id === project.musicAssetId);

  // Snapping helper
  const getSnapPoints = useCallback((): number[] => {
    const points = [0];
    let elapsed = hookOn ? 1.8 : 0;
    if (hookOn) points.push(1.8);
    for (const c of project.clips) {
      elapsed += c.duration;
      points.push(elapsed);
    }
    return points;
  }, [project.clips, hookOn]);

  const snapTime = useCallback((rawTime: number, thresholdSec = 0.2): number => {
    const points = getSnapPoints();
    for (const p of points) {
      if (Math.abs(rawTime - p) <= thresholdSec) {
        return p;
      }
    }
    return rawTime;
  }, [getSnapPoints]);

  // Timeline scrub handler
  const handleScrub = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineTracksRef.current) return;
    const rect = timelineTracksRef.current.getBoundingClientRect();
    const scrollLeft = timelineTracksRef.current.scrollLeft;
    const clickX = e.clientX - rect.left + scrollLeft;
    const rawTime = Math.max(0, Math.min(total, clickX / zoom));
    const snapped = snapTime(rawTime, 0.25);
    dispatch({ type: 'SET_PLAYHEAD', time: Number(snapped.toFixed(2)) });
  }, [total, zoom, snapTime, dispatch]);

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
        const rawDur = Math.max(0.5, origDuration + deltaTime);
        dispatch({
          type: 'UPDATE_CLIP',
          clipId: clipToTrim.id,
          payload: {
            duration: Number(rawDur.toFixed(2)),
            sourceEnd: Number((origStart + rawDur).toFixed(2)),
          },
        });
      } else {
        const rawStart = Math.max(0, origStart + deltaTime);
        const rawDur = Math.max(0.5, origDuration - deltaTime);
        dispatch({
          type: 'UPDATE_CLIP',
          clipId: clipToTrim.id,
          payload: {
            sourceStart: Number(rawStart.toFixed(2)),
            duration: Number(rawDur.toFixed(2)),
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
    let elapsed = hookOn ? 1.8 : 0;
    for (const c of project.clips) {
      if (c.id === clip.id) break;
      elapsed += c.duration;
    }

    const splitOffset = playhead - elapsed;
    if (splitOffset <= 0.4 || splitOffset >= clip.duration - 0.4) {
      dispatch({
        type: 'SET_NOTICE',
        message: 'Move playhead inside the selected clip to split (at least 0.4s from edges)',
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
    dispatch({ type: 'SET_NOTICE', message: 'Clip split at playhead' });
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
      name: `Rank ${newRank} Item`,
      sourceStart: 0,
      sourceEnd: 4,
      duration: 4,
      label: `Highlight #${newRank}`,
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

  // Drop asset from Media Library onto Video Track
  const handleDropOnTrack = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverTrack(false);
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;
      const asset: Asset = JSON.parse(dataStr);
      if (asset.type === 'video' || asset.type === 'image') {
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
      } else if (asset.type === 'audio') {
        dispatch({ type: 'COMMIT' });
        dispatch({ type: 'UPDATE_PROJECT', payload: { musicAssetId: asset.id } });
        dispatch({ type: 'SET_NOTICE', message: `Set background music: ${asset.name}` });
      }
    } catch {}
  };

  // Drop asset onto a specific clip to replace footage
  const handleDropOnClip = (targetClip: Clip, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverClipId(null);
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;
      const asset: Asset = JSON.parse(dataStr);
      if (asset.type === 'video' || asset.type === 'image') {
        dispatch({ type: 'COMMIT' });
        dispatch({
          type: 'UPDATE_CLIP',
          clipId: targetClip.id,
          payload: {
            assetId: asset.id,
            name: asset.name,
            url: asset.url,
            sourceStart: 0,
            sourceEnd: Math.min(asset.duration || 5, targetClip.duration),
          },
        });
        dispatch({ type: 'SET_NOTICE', message: `Assigned "${asset.name}" to Rank #${targetClip.rank}` });
      }
    } catch {}
  };

  // Reorder clip drag
  const handleClipDragStart = (c: Clip, e: React.DragEvent) => {
    setDraggedClipId(c.id);
    e.dataTransfer.setData('text/plain', c.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleClipDropReorder = (targetClip: Clip, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverClipId(null);
    if (!draggedClipId || draggedClipId === targetClip.id) return;

    const fromIdx = project.clips.findIndex(c => c.id === draggedClipId);
    const toIdx = project.clips.findIndex(c => c.id === targetClip.id);
    if (fromIdx < 0 || toIdx < 0) return;

    dispatch({ type: 'COMMIT' });
    const reordered = [...project.clips];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    dispatch({
      type: 'UPDATE_PROJECT',
      payload: {
        clips: reordered.map((c, i) => ({ ...c, rank: reordered.length - i })),
      },
    });
    dispatch({ type: 'SET_NOTICE', message: 'Clips reordered' });
    setDraggedClipId(null);
  };

  const playheadPixels = playhead * zoom;

  return (
    <section className="timeline">
      {/* ── Toolbar ── */}
      <div className="timeline-tools">
        <div>
          <button title="Add new rank clip" onClick={addClip}>
            <Plus size={15} />
          </button>
          <button title="Split clip at playhead (Shortcut: S)" onClick={splitSelectedClip}>
            <Scissors size={15} />
          </button>
          <button title="Duplicate selected clip" onClick={duplicateClip} disabled={!clip}>
            <Copy size={15} />
          </button>
          <button title="Delete selected clip (Shortcut: Delete)" onClick={deleteClip} disabled={!clip}>
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
            <span style={{ fontSize: 9, color: '#68798d', minWidth: 40, textAlign: 'center' }}>{zoom}px/s</span>
            <button
              className="icon"
              title="Zoom in"
              onClick={() => setZoom(z => Math.min(100, z + 8))}
            >
              <ZoomIn size={13} />
            </button>
          </div>
        </div>

        <span style={{ fontSize: 11, fontFamily: 'monospace' }}>
          <Clock3 size={13} style={{ display: 'inline', marginRight: 4 }} /> {fmtTime(playhead)} / {fmtTime(total)}
        </span>
      </div>

      {/* ── Tracks Main ── */}
      <div className="timeline-main">
        {/* Track labels */}
        <div className="track-names">
          <div className="ruler-name">Timeline</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Video size={13} /> Video</span>
            <button
              className="icon"
              title={trackVideoHidden ? 'Show Video Track' : 'Hide Video Track'}
              onClick={() => dispatch({ type: 'TOGGLE_TRACK_VIDEO_HIDDEN' })}
            >
              {trackVideoHidden ? <EyeOff size={12} style={{ color: '#ef4444' }} /> : <Eye size={12} />}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TextCursorInput size={13} /> Overlays</span>
            <button
              className="icon"
              title={trackOverlaysHidden ? 'Show Overlays Track' : 'Hide Overlays Track'}
              onClick={() => dispatch({ type: 'TOGGLE_TRACK_OVERLAYS_HIDDEN' })}
            >
              {trackOverlaysHidden ? <EyeOff size={12} style={{ color: '#ef4444' }} /> : <Eye size={12} />}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Music2 size={13} /> Audio</span>
            <button
              className="icon"
              title={trackAudioMuted ? 'Unmute Audio Track' : 'Mute Audio Track'}
              onClick={() => dispatch({ type: 'TOGGLE_TRACK_AUDIO_MUTED' })}
            >
              {trackAudioMuted ? <VolumeX size={12} style={{ color: '#ef4444' }} /> : <Volume2 size={12} />}
            </button>
          </div>
        </div>

        {/* Tracks scrollable area */}
        <div
          className="tracks"
          ref={timelineTracksRef}
          onClick={handleScrub}
          style={{ cursor: 'pointer' }}
        >
          {/* Ruler */}
          <div className="ruler" style={{ width: Math.max(900, total * zoom + 160) }}>
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
          <div
            className={`track video-track ${isDraggingOverTrack ? 'drag-over' : ''}`}
            style={{ width: Math.max(900, total * zoom + 160) }}
            onDragOver={e => {
              e.preventDefault();
              setIsDraggingOverTrack(true);
            }}
            onDragLeave={() => setIsDraggingOverTrack(false)}
            onDrop={handleDropOnTrack}
          >
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
              const clipWidth = Math.max(70, c.duration * zoom);
              const isSelected = selectedClipId === c.id;
              const isOver = dragOverClipId === c.id;
              const asset = assets.find(a => a.id === c.assetId);

              return (
                <div
                  key={c.id}
                  className={`timeline-clip ${isSelected ? 'selected' : ''} ${isOver ? 'drop-target' : ''}`}
                  style={{
                    width: clipWidth,
                    border: isOver ? '2px dashed #20c8f2' : undefined,
                  }}
                  draggable={true}
                  onDragStart={e => handleClipDragStart(c, e)}
                  onDragOver={e => {
                    e.preventDefault();
                    setDragOverClipId(c.id);
                  }}
                  onDragLeave={() => setDragOverClipId(null)}
                  onDrop={e => {
                    // Check if dropped from media library or timeline
                    const jsonStr = e.dataTransfer.getData('application/json');
                    if (jsonStr) {
                      handleDropOnClip(c, e);
                    } else {
                      handleClipDropReorder(c, e);
                    }
                  }}
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

                  {/* Clip info & Thumbnail */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, zIndex: 2, overflow: 'hidden' }}>
                    <span
                      className="clip-rank-badge"
                      style={{ background: c.color || project.accentColor }}
                    >
                      #{c.rank}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {c.label || c.name}
                    </span>
                  </div>

                  {/* Thumbnail filmstrip slice */}
                  <div className="filmstrip">
                    {asset?.thumbnailUrl ? (
                      <img
                        src={asset.thumbnailUrl}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }}
                      />
                    ) : (
                      <>
                        <i /><i /><i /><i />
                      </>
                    )}
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
          <div className="track text-track" style={{ width: Math.max(900, total * zoom + 160) }}>
            <div className="text-clip" style={{ width: Math.min(300, total * zoom * 0.6) }}>
              <TextCursorInput size={12} /> {project.title}
            </div>
            {project.clips.slice(0, 8).map(c => (
              <div
                key={c.id}
                className="text-clip secondary-text"
                style={{ width: Math.max(55, c.duration * zoom - 4) }}
              >
                #{c.rank} {c.label}
              </div>
            ))}
          </div>

          {/* Audio track */}
          <div className="track audio-track" style={{ width: Math.max(900, total * zoom + 160) }}>
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
                        height: `${20 + Math.abs(Math.sin(i * 1.4)) * 36}%`,
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
              left: playheadPixels,
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
