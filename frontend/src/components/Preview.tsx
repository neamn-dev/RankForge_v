import { useRef, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown, ChevronLeft, ChevronRight, Maximize, Pause, Play,
  Volume2, VolumeX, Upload, ZoomIn, Film, Image as ImageIcon,
  MoreVertical
} from 'lucide-react';
import { useStore, useSelectedClip } from '../store';
import { fmtTime } from '../types';

function parseTitleWords(title: string, userWords?: { text: string; color: string }[]) {
  if (userWords && userWords.length > 0) {
    return userWords;
  }
  const words = (title || 'Top 5 Moments').trim().split(/\s+/);
  return words.map((w) => {
    const clean = w.toLowerCase().replace(/[^a-z0-9]/g, '');
    let color = '#ffffff';
    if (['funniest', 'best', 'craziest', 'unreal', 'insane', 'top', 'epic', 'wildest'].includes(clean)) {
      color = '#facc15'; // Yellow
    } else if (['trampoline', 'shark', 'sports', 'clutch', 'pool', 'dive', 'bounce'].includes(clean)) {
      color = '#38bdf8'; // Sky Blue / Cyan
    } else if (['fail', 'fails', 'disaster', 'danger', 'deadly', 'shocking', 'died'].includes(clean)) {
      color = '#ef4444'; // Red
    } else if (['gaming', 'win', 'legend'].includes(clean)) {
      color = '#c084fc'; // Purple
    } else if (['bruh', 'meme', 'comedy', 'humor'].includes(clean)) {
      color = '#4ade80'; // Lime
    }
    return { text: w, color };
  });
}

export default function Preview() {
  const { state, dispatch } = useStore();
  const {
    project, playing, playhead, hookOn, assets,
    trackVideoHidden, trackOverlaysHidden, trackAudioMuted,
    previewZoom, previewMuted
  } = state;

  const clip = useSelectedClip();
  const videoRef = useRef<HTMLVideoElement>(null);
  const blurVideoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const stageWrapRef = useRef<HTMLDivElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);

  const total = useMemo(
    () => project.clips.reduce((n, c) => n + c.duration, 0) + (hookOn ? 1.8 : 0),
    [project.clips, hookOn]
  );

  const sortedRankingClips = useMemo(() => {
    return [...project.clips].sort((a, b) => a.rank - b.rank);
  }, [project.clips]);

  // Background music asset
  const bgMusic = useMemo(() => {
    return assets.find(a => a.id === project.musicAssetId) || null;
  }, [assets, project.musicAssetId]);

  // Determine active clip at current playhead
  const activeClip = useMemo(() => {
    let elapsed = hookOn ? 1.8 : 0;
    for (const c of project.clips) {
      if (playhead < elapsed + c.duration) return c;
      elapsed += c.duration;
    }
    return project.clips[project.clips.length - 1] || null;
  }, [project.clips, playhead, hookOn]);

  // Video playback synchronization
  useEffect(() => {
    const url = activeClip?.url;
    const isImage = url && (url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.webp'));

    if (url && !isImage && videoRef.current) {
      if (videoRef.current.src !== url) {
        videoRef.current.src = url;
      }

      let elapsed = hookOn ? 1.8 : 0;
      for (const c of project.clips) {
        if (c.id === activeClip.id) break;
        elapsed += c.duration;
      }
      const localTime = Math.max(0, playhead - elapsed) + (activeClip.sourceStart || 0);
      if (Math.abs(videoRef.current.currentTime - localTime) > 0.35) {
        videoRef.current.currentTime = localTime;
      }

      // Audio volume and mute
      const isMuted = previewMuted || trackAudioMuted;
      videoRef.current.muted = isMuted;
      videoRef.current.volume = isMuted ? 0 : 1;

      if (playing && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      } else if (!playing && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    }

    if (blurVideoRef.current && videoRef.current && url && !isImage) {
      if (blurVideoRef.current.src !== videoRef.current.src) {
        blurVideoRef.current.src = videoRef.current.src;
      }
      if (Math.abs(blurVideoRef.current.currentTime - videoRef.current.currentTime) > 0.35) {
        blurVideoRef.current.currentTime = videoRef.current.currentTime;
      }
      if (playing && blurVideoRef.current.paused) blurVideoRef.current.play().catch(() => {});
      if (!playing && !blurVideoRef.current.paused) blurVideoRef.current.pause();
    }
  }, [activeClip?.url, activeClip?.id, playhead, playing, hookOn, previewMuted, trackAudioMuted]);

  // Background music playback synchronization
  useEffect(() => {
    if (!audioRef.current) return;
    if (bgMusic?.url) {
      if (audioRef.current.src !== bgMusic.url) {
        audioRef.current.src = bgMusic.url;
      }
      if (Math.abs(audioRef.current.currentTime - playhead) > 0.4) {
        audioRef.current.currentTime = playhead;
      }
      const vol = (project.musicVolume ?? 0.22) * (previewMuted || trackAudioMuted ? 0 : 1);
      audioRef.current.volume = Math.max(0, Math.min(1, vol));

      if (playing && audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
      } else if (!playing && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    } else {
      audioRef.current.pause();
    }
  }, [bgMusic?.url, playing, playhead, project.musicVolume, previewMuted, trackAudioMuted]);

  // Playhead ticking
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      dispatch({
        type: 'SET_PLAYHEAD',
        time: playhead + 0.1 >= total ? 0 : Number((playhead + 0.1).toFixed(2)),
      });
    }, 100);
    return () => clearInterval(interval);
  }, [playing, total, playhead, dispatch]);

  // Fullscreen listener
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!stageWrapRef.current) return;
    if (!document.fullscreenElement) {
      stageWrapRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const layout = project.layout;
  const topH = layout.topRegion.enabled ? layout.topRegion.height : 0;
  const botH = layout.bottomRegion.enabled ? layout.bottomRegion.height : 0;
  const showHook = hookOn && playhead < 1.8 && !trackOverlaysHidden;

  // Active clip color adjustments
  const clipAdj = activeClip?.adjustments || { brightness: 100, contrast: 100, saturation: 100 };
  const filterStyle = `brightness(${clipAdj.brightness}%) contrast(${clipAdj.contrast}%) saturate(${clipAdj.saturation}%)`;

  // Badge position
  const badgePos = layout.mainRegion.rankBadgePosition;
  const badgeStyle: React.CSSProperties = {
    position: 'absolute',
    ...(badgePos.includes('top') ? { top: 12 + layout.mainRegion.padding } : { bottom: 12 + layout.mainRegion.padding }),
    ...(badgePos.includes('left') ? { left: 12 + layout.mainRegion.padding } : { right: 12 + layout.mainRegion.padding }),
  };

  const isImageClip = activeClip?.url && (activeClip.url.endsWith('.png') || activeClip.url.endsWith('.jpg') || activeClip.url.endsWith('.jpeg') || activeClip.url.endsWith('.webp'));

  return (
    <section className="preview">
      {/* ── Top Bar ── */}
      <div className="preview-head">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <i style={{ width: 8, height: 8, borderRadius: '50%', background: '#20c8f2' }} />
          Player
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            value={previewZoom}
            onChange={e => dispatch({ type: 'SET_PREVIEW_ZOOM', zoom: e.target.value as any })}
            style={{ fontSize: 10, padding: '2px 6px', background: '#101620', border: '1px solid #1c2734', color: '#8899a6', borderRadius: 4 }}
          >
            <option value="fit">Fit Canvas</option>
            <option value="100%">100%</option>
            <option value="75%">75%</option>
            <option value="50%">50%</option>
          </select>
          <button
            className="icon"
            title={previewMuted ? 'Unmute preview' : 'Mute preview'}
            onClick={() => dispatch({ type: 'TOGGLE_PREVIEW_MUTED' })}
          >
            {previewMuted || trackAudioMuted ? <VolumeX size={15} style={{ color: '#ef4444' }} /> : <Volume2 size={15} />}
          </button>
          <em>{project.aspectRatio}</em>
          <button className="icon" title="Fullscreen preview" onClick={toggleFullscreen}>
            <Maximize size={15} />
          </button>
        </div>
      </div>

      {/* ── Stage Wrap ── */}
      <div className="stage-wrap" ref={stageWrapRef}>
        <div
          className={`stage aspect-${project.aspectRatio.replace(':', '-')}`}
          style={{
            transform: previewZoom === '75%' ? 'scale(0.75)' : previewZoom === '50%' ? 'scale(0.5)' : previewZoom === '100%' ? 'scale(1)' : undefined,
            transformOrigin: 'center center',
          }}
        >
          {/* Sandwich Canvas */}
          <div
            className="sandwich-canvas"
            style={{
              background: layout.canvasBackground,
              gap: layout.spacing,
            }}
          >
            {/* ── Top Region (Solid Banner Mode, Image 3) ── */}
            {layout.topRegion.enabled && layout.topRegion.mode === 'banner' && (
              <div
                className="sandwich-region sandwich-top banner-mode"
                style={{
                  height: `${topH}%`,
                  background: layout.topRegion.gradient || layout.topRegion.backgroundColor || '#000000',
                  color: layout.topRegion.fontColor,
                  padding: layout.topRegion.padding,
                  textAlign: layout.topRegion.alignment,
                  justifyContent: 'center',
                }}
              >
                {!trackOverlaysHidden && (
                  <div className="viral-title-container">
                    <div
                      className="region-title viral-3d-title"
                      style={{
                        fontSize: `clamp(14px, ${layout.topRegion.fontSize * 0.8}px, ${layout.topRegion.fontSize}px)`,
                        fontFamily: layout.topRegion.fontFamily || 'Space Grotesk',
                      }}
                    >
                      {parseTitleWords(layout.topRegion.title || project.title, layout.topRegion.titleWords).map((w, idx) => (
                        <span key={idx} style={{ color: w.color }} className="viral-title-word">
                          {w.text}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Main Video Region ── */}
            <div
              className="sandwich-main"
              style={{
                flex: 1,
                padding: layout.mainRegion.padding,
                minHeight: 0,
              }}
            >
              <div
                className="main-video-container"
                style={{
                  borderRadius: layout.mainRegion.cornerRadius,
                  border: layout.mainRegion.borderWidth
                    ? `${layout.mainRegion.borderWidth}px solid ${layout.mainRegion.borderColor}`
                    : 'none',
                  overflow: 'hidden',
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                }}
              >
                {/* Track Hidden State */}
                {trackVideoHidden ? (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0e14', color: '#68798d' }}>
                    <Film size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <span style={{ fontSize: 11, fontWeight: 600 }}>Video Track Hidden</span>
                  </div>
                ) : (
                  <>
                    {/* Blur fill background mirror */}
                    {layout.mainRegion.fitMode === 'blur-fill' && activeClip?.url && !isImageClip && (
                      <video
                        ref={blurVideoRef}
                        className="blur-fill-bg"
                        muted
                        playsInline
                        style={{ filter: filterStyle }}
                      />
                    )}

                    {/* Main media playback */}
                    {activeClip?.url ? (
                      isImageClip ? (
                        <img
                          src={activeClip.url}
                          alt={activeClip.name}
                          className={`main-video mode-${layout.mainRegion.fitMode}`}
                          style={{ filter: filterStyle, width: '100%', height: '100%', objectFit: layout.mainRegion.fitMode === 'fill' ? 'cover' : 'contain' }}
                        />
                      ) : (
                        <video
                          ref={videoRef}
                          className={`main-video mode-${layout.mainRegion.fitMode}`}
                          playsInline
                          style={{ filter: filterStyle }}
                        />
                      )
                    ) : (
                      /* Active Rank Clip Footage Placeholder */
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'radial-gradient(circle at center, #162438 0%, #080c14 100%)',
                          color: '#ffffff',
                          padding: 24,
                          textAlign: 'center',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 38,
                            fontWeight: 900,
                            fontFamily: 'Space Grotesk, sans-serif',
                            color: activeClip?.color || project.accentColor,
                            letterSpacing: -1,
                            textShadow: '0 4px 16px rgba(0,0,0,0.8)',
                          }}
                        >
                          #{activeClip?.rank || 1}
                        </div>
                        <b style={{ fontSize: 13, marginTop: 4, color: '#e2e8f0', maxWidth: '80%' }}>
                          {activeClip?.label || activeClip?.name || 'Unassigned Rank Clip'}
                        </b>
                        <p style={{ fontSize: 10, color: '#7e90a2', marginTop: 4, maxWidth: '80%' }}>
                          Drag footage from Media Library or click below
                        </p>
                        <button
                          className="primary"
                          style={{ marginTop: 12, fontSize: 10, padding: '5px 12px' }}
                          onClick={() => dispatch({ type: 'SET_TOOL', tool: 'Media' })}
                        >
                          <Upload size={12} /> Assign Footage
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Overlays Layer */}
                {!trackOverlaysHidden && (
                  <>
                    {/* Top Floating Overlay Controls (matching images 1, 2, 3) */}
                    <div className="viral-stage-controls">
                      <button
                        className="stage-ctrl-btn"
                        title={playing ? 'Pause' : 'Play'}
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch({ type: 'SET_PLAYING', playing: !playing });
                        }}
                      >
                        {playing ? <Pause size={17} fill="#ffffff" /> : <Play size={17} fill="#ffffff" />}
                      </button>
                      <button
                        className="stage-ctrl-btn"
                        title={previewMuted ? 'Unmute' : 'Mute'}
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch({ type: 'TOGGLE_PREVIEW_MUTED' });
                        }}
                      >
                        {previewMuted ? <VolumeX size={17} style={{ color: '#ef4444' }} /> : <Volume2 size={17} />}
                      </button>
                      <div style={{ flex: 1 }} />
                      <button
                        className="stage-ctrl-btn"
                        title="Sandwich & Layout Options"
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch({ type: 'SET_TOOL', tool: 'Layout' });
                        }}
                      >
                        <MoreVertical size={17} />
                      </button>
                      <button
                        className="stage-ctrl-btn"
                        title="Toggle Fullscreen"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFullscreen();
                        }}
                      >
                        <Maximize size={16} />
                      </button>
                    </div>

                    {/* Top Floating 3D Title (Overlay Mode, Images 1 & 2) */}
                    {layout.topRegion.enabled && layout.topRegion.mode !== 'banner' && (
                      <div
                        className="viral-title-overlay"
                        style={{
                          position: 'absolute',
                          top: '6%',
                          left: '4%',
                          right: '4%',
                          textAlign: layout.topRegion.alignment || 'center',
                          zIndex: 14,
                          pointerEvents: 'none',
                        }}
                      >
                        <div
                          className="region-title viral-3d-title"
                          style={{
                            fontSize: `clamp(16px, ${layout.topRegion.fontSize * 0.9}px, ${layout.topRegion.fontSize}px)`,
                            fontFamily: layout.topRegion.fontFamily || 'Space Grotesk',
                          }}
                        >
                          {parseTitleWords(layout.topRegion.title || project.title, layout.topRegion.titleWords).map((w, idx) => (
                            <span key={idx} style={{ color: w.color }} className="viral-title-word">
                              {w.text}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── Persistent Left-Side Vertical Ranking List (Matches Images 1, 2, 3) ── */}
                    {layout.rankingList?.enabled !== false && (
                      <div
                        className="viral-ranking-list"
                        style={{
                          position: 'absolute',
                          left: `${layout.rankingList?.xOffset ?? 5}%`,
                          top: `${layout.rankingList?.yOffset ?? 26}%`,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: `${layout.rankingList?.spacing ?? 8}px`,
                          zIndex: 16,
                          pointerEvents: 'auto',
                        }}
                      >
                        {sortedRankingClips.map((c) => {
                          const isCurrent = activeClip?.id === c.id;
                          const numColor =
                            c.rankColor ||
                            c.color ||
                            (c.rank === 1 ? '#facc15' : c.rank === 2 ? '#38bdf8' : c.rank === 3 ? '#ef4444' : '#ffffff');

                          return (
                            <div
                              key={c.id}
                              className={`viral-rank-row ${isCurrent ? 'active' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                let time = hookOn ? 1.8 : 0;
                                for (const item of project.clips) {
                                  if (item.id === c.id) break;
                                  time += item.duration;
                                }
                                dispatch({ type: 'SET_PLAYHEAD', time });
                                dispatch({ type: 'SET_SELECTED', clipId: c.id });
                              }}
                              title={`Jump to Rank #${c.rank}: ${c.label}`}
                            >
                              <span
                                className="viral-rank-number"
                                style={{
                                  color: numColor,
                                  fontSize: `clamp(18px, ${(layout.rankingList?.fontSize ?? 26) * 0.95}px, ${layout.rankingList?.fontSize ?? 26}px)`,
                                }}
                              >
                                {c.rank}.
                              </span>
                              {(c.comment || c.emoji) && (
                                <span className="viral-rank-comment">
                                  {c.comment} {c.emoji}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Opening Hook Card (First 1.8s) */}
                    {showHook && (
                      <div className="hook">
                        <b>{project.hookText}</b>
                      </div>
                    )}

                    {/* Single Rank Badge (Optional Corner Badge if enabled) */}
                    {layout.mainRegion.showRankBadge && activeClip && (
                      <div
                        className={`rank-badge badge-${layout.mainRegion.rankBadgeStyle}`}
                        style={{
                          ...badgeStyle,
                          color: activeClip.color || project.accentColor,
                        }}
                      >
                        <b>#{activeClip.rank}</b>
                      </div>
                    )}

                    {/* Active Clip Label Card */}
                    {activeClip?.label && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 14 + layout.mainRegion.padding,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          background: 'rgba(0, 0, 0, 0.65)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          backdropFilter: 'blur(8px)',
                          borderRadius: 6,
                          padding: '4px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          zIndex: 10,
                          maxWidth: '85%',
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: 10,
                            color: activeClip.color || project.accentColor,
                          }}
                        >
                          #{activeClip.rank}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: '#ffffff',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {activeClip.label}
                        </span>
                      </div>
                    )}

                    {/* Creator Watermark (Matching Image 2: "xiroranks") */}
                    {layout.watermark?.enabled !== false && (layout.watermark?.text || layout.bottomRegion.creatorHandle) && (
                      <div
                        className="viral-watermark"
                        style={{
                          position: 'absolute',
                          bottom: '5%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          color: 'rgba(255, 255, 255, 0.75)',
                          fontSize: 'clamp(10px, 1.4vw, 15px)',
                          fontFamily: 'Space Grotesk, sans-serif',
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          textShadow: '0 2px 8px rgba(0, 0, 0, 0.85)',
                          zIndex: 12,
                          pointerEvents: 'none',
                          opacity: layout.watermark?.opacity ?? 0.8,
                        }}
                      >
                        {layout.watermark?.text || layout.bottomRegion.creatorHandle}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ── Bottom Region (Sandwich Footer) ── */}
            {layout.bottomRegion.enabled && (
              <div
                className="sandwich-region sandwich-bottom"
                style={{
                  height: `${botH}%`,
                  background: layout.bottomRegion.gradient || layout.bottomRegion.backgroundColor,
                  color: layout.bottomRegion.fontColor,
                  padding: layout.bottomRegion.padding,
                  textAlign: layout.bottomRegion.alignment,
                  justifyContent: layout.bottomRegion.alignment === 'center' ? 'center'
                    : layout.bottomRegion.alignment === 'right' ? 'flex-end' : 'flex-start',
                }}
              >
                {!trackOverlaysHidden && (
                  <>
                    {(layout.bottomRegion.caption || project.hookText) && (
                      <div
                        className="region-title"
                        style={{
                          fontSize: `clamp(9px, ${layout.bottomRegion.fontSize * 0.5}px, ${layout.bottomRegion.fontSize}px)`,
                          fontFamily: layout.bottomRegion.fontFamily,
                          color: layout.bottomRegion.fontColor,
                        }}
                      >
                        {layout.bottomRegion.caption || project.hookText}
                      </div>
                    )}
                    {layout.bottomRegion.creatorHandle && (
                      <div
                        className="region-subtitle"
                        style={{
                          fontSize: `clamp(7px, ${layout.bottomRegion.fontSize * 0.38}px, ${layout.bottomRegion.fontSize * 0.6}px)`,
                        }}
                      >
                        {layout.bottomRegion.creatorHandle}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden Audio Element for Background Music */}
      <audio ref={audioRef} playsInline />

      {/* ── Playback Controls ── */}
      <div className="player">
        <div
          className="progress"
          onClick={e => {
            const r = e.currentTarget.getBoundingClientRect();
            dispatch({
              type: 'SET_PLAYHEAD',
              time: Math.max(0, Math.min(total, ((e.clientX - r.left) / r.width) * total)),
            });
          }}
        >
          <i style={{ width: `${Math.min(100, (playhead / Math.max(total, 1)) * 100)}%` }} />
        </div>
        <div className="player-row">
          <b>{fmtTime(playhead)}</b>
          <span>/ {fmtTime(total)}</span>
          <div className="play-actions">
            <button className="icon" title="Jump to start" onClick={() => dispatch({ type: 'SET_PLAYHEAD', time: 0 })}>
              <ChevronLeft size={17} />
            </button>
            <button
              className="play"
              title={playing ? 'Pause (Space)' : 'Play (Space)'}
              onClick={() => dispatch({ type: 'SET_PLAYING', playing: !playing })}
            >
              {playing ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
            </button>
            <button
              className="icon"
              title="Step forward 2s"
              onClick={() => dispatch({ type: 'SET_PLAYHEAD', time: Math.min(total, playhead + 2) })}
            >
              <ChevronRight size={17} />
            </button>
          </div>
          <select
            value={project.aspectRatio}
            onChange={e => dispatch({ type: 'UPDATE_PROJECT', payload: { aspectRatio: e.target.value } })}
          >
            <option>9:16</option>
            <option>16:9</option>
            <option>1:1</option>
            <option>4:5</option>
          </select>
          <button className="icon" title="Toggle Fullscreen" onClick={toggleFullscreen}>
            <Maximize size={15} />
          </button>
        </div>
      </div>
    </section>
  );
}
