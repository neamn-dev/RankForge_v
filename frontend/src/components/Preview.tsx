import { useRef, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Maximize, Pause, Play } from 'lucide-react';
import { useStore, useSelectedClip } from '../store';
import { fmtTime } from '../types';

export default function Preview() {
  const { state, dispatch } = useStore();
  const { project, playing, playhead, hookOn } = state;
  const clip = useSelectedClip();
  const videoRef = useRef<HTMLVideoElement>(null);
  const blurVideoRef = useRef<HTMLVideoElement>(null);

  const total = useMemo(
    () => project.clips.reduce((n, c) => n + c.duration, 0) + (hookOn ? 1.8 : 0),
    [project.clips, hookOn]
  );

  // Determine which clip is active at current playhead
  const activeClip = useMemo(() => {
    let elapsed = hookOn ? 1.8 : 0;
    for (const c of project.clips) {
      if (playhead < elapsed + c.duration) return c;
      elapsed += c.duration;
    }
    return project.clips[project.clips.length - 1] || null;
  }, [project.clips, playhead, hookOn]);

  // Sync video element
  useEffect(() => {
    const url = activeClip?.url;
    if (url && videoRef.current) {
      if (videoRef.current.src !== url) {
        videoRef.current.src = url;
      }
      // Calculate clip-local time
      let elapsed = hookOn ? 1.8 : 0;
      for (const c of project.clips) {
        if (c.id === activeClip.id) break;
        elapsed += c.duration;
      }
      const localTime = Math.max(0, playhead - elapsed) + (activeClip.sourceStart || 0);
      if (Math.abs(videoRef.current.currentTime - localTime) > 0.3) {
        videoRef.current.currentTime = localTime;
      }
      if (playing && videoRef.current.paused) videoRef.current.play().catch(() => {});
      if (!playing && !videoRef.current.paused) videoRef.current.pause();
    }
    // Blur fill mirror
    if (blurVideoRef.current && videoRef.current) {
      blurVideoRef.current.src = videoRef.current.src;
      blurVideoRef.current.currentTime = videoRef.current.currentTime;
    }
  }, [activeClip?.url, activeClip?.id, playhead, playing, hookOn]);

  // Playback tick
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      dispatch({ type: 'SET_PLAYHEAD', time: state.playhead + 0.1 >= total ? 0 : state.playhead + 0.1 });
    }, 100);
    return () => clearInterval(interval);
  }, [playing, total]);

  const layout = project.layout;
  const topH = layout.topRegion.enabled ? layout.topRegion.height : 0;
  const botH = layout.bottomRegion.enabled ? layout.bottomRegion.height : 0;
  const mainH = 100 - topH - botH;
  const showHook = hookOn && playhead < 1.8;

  // Rank badge positioning
  const badgePos = layout.mainRegion.rankBadgePosition;
  const badgeStyle: React.CSSProperties = {
    position: 'absolute',
    ...(badgePos.includes('top') ? { top: 12 + layout.mainRegion.padding } : { bottom: 12 + layout.mainRegion.padding }),
    ...(badgePos.includes('left') ? { left: 12 + layout.mainRegion.padding } : { right: 12 + layout.mainRegion.padding }),
  };

  return (
    <section className="preview">
      <div className="preview-head">
        <span><i />Player <ChevronDown size={13} /></span>
        <div>
          <em>{project.aspectRatio}</em>
          <button className="icon"><Maximize size={15} /></button>
        </div>
      </div>

      <div className="stage-wrap">
        <div className={`stage aspect-${project.aspectRatio.replace(':', '-')}`}>
          {/* ── Sandwich Canvas ── */}
          <div
            className="sandwich-canvas"
            style={{
              background: layout.canvasBackground,
              gap: layout.spacing,
            }}
          >
            {/* ── Top Region ── */}
            {layout.topRegion.enabled && (
              <div
                className="sandwich-region sandwich-top"
                style={{
                  height: `${topH}%`,
                  background: layout.topRegion.gradient || layout.topRegion.backgroundColor,
                  color: layout.topRegion.fontColor,
                  padding: layout.topRegion.padding,
                  textAlign: layout.topRegion.alignment,
                  justifyContent: layout.topRegion.alignment === 'center' ? 'center'
                    : layout.topRegion.alignment === 'right' ? 'flex-end' : 'flex-start',
                }}
              >
                {layout.topRegion.title && (
                  <div
                    className="region-title"
                    style={{
                      fontSize: `clamp(10px, ${layout.topRegion.fontSize * 0.6}px, ${layout.topRegion.fontSize}px)`,
                      fontFamily: layout.topRegion.fontFamily,
                    }}
                  >
                    {layout.topRegion.title}
                  </div>
                )}
                {layout.topRegion.subtitle && (
                  <div
                    className="region-subtitle"
                    style={{
                      fontSize: `clamp(8px, ${layout.topRegion.fontSize * 0.4}px, ${layout.topRegion.fontSize * 0.6}px)`,
                    }}
                  >
                    {layout.topRegion.subtitle}
                  </div>
                )}
                {!layout.topRegion.title && !layout.topRegion.subtitle && (
                  <div className="region-placeholder">Top region</div>
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
                }}
              >
                {/* Blur fill background */}
                {layout.mainRegion.fitMode === 'blur-fill' && activeClip?.url && (
                  <video
                    ref={blurVideoRef}
                    className="blur-fill-bg"
                    muted
                    playsInline
                  />
                )}

                {activeClip?.url ? (
                  <video
                    ref={videoRef}
                    className={`main-video mode-${layout.mainRegion.fitMode}`}
                    muted
                    playsInline
                  />
                ) : (
                  <div className="demo">
                    <div className="trees" />
                    <div className="water" />
                    <span className="cat">🐈</span>
                    <small>PREVIEW TEMPLATE</small>
                  </div>
                )}

                {/* ── Title Overlay ── */}
                <div className="title-overlay" style={{ color: project.titleColor }}>
                  {project.title.split(' ').map((w, i) => (
                    <span key={i} style={{
                      color: i === 1 || i === 2 ? project.accentColor : project.titleColor
                    }}>
                      {w}{' '}
                    </span>
                  ))}
                </div>

                {/* ── Hook ── */}
                {showHook && (
                  <div className="hook">
                    <b>{project.hookText}</b>
                  </div>
                )}

                {/* ── Rank Badge ── */}
                {layout.mainRegion.showRankBadge && activeClip && (
                  <div
                    className={`rank-badge badge-${layout.mainRegion.rankBadgeStyle}`}
                    style={{
                      ...badgeStyle,
                      color: activeClip.color || project.accentColor,
                    }}
                  >
                    <b>{activeClip.rank}</b>
                  </div>
                )}

                {/* ── Rank Labels ── */}
                <div className="ranks">
                  {project.clips.slice(0, 10).map(c => (
                    <div
                      key={c.id}
                      className={state.selectedClipId === c.id ? 'focus' : ''}
                      style={{ color: c.color }}
                      onClick={() => dispatch({ type: 'SET_SELECTED', clipId: c.id })}
                    >
                      <b>{c.rank}.</b>
                      {c.label && <span>{c.label}</span>}
                    </div>
                  ))}
                </div>

                <small className="watermark">RANKFORGE</small>
              </div>
            </div>

            {/* ── Bottom Region ── */}
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
                {layout.bottomRegion.caption && (
                  <div
                    className="region-title"
                    style={{
                      fontSize: `clamp(8px, ${layout.bottomRegion.fontSize * 0.5}px, ${layout.bottomRegion.fontSize}px)`,
                      fontFamily: layout.bottomRegion.fontFamily,
                    }}
                  >
                    {layout.bottomRegion.caption}
                  </div>
                )}
                {layout.bottomRegion.creatorHandle && (
                  <div className="region-subtitle" style={{
                    fontSize: `clamp(7px, ${layout.bottomRegion.fontSize * 0.4}px, ${layout.bottomRegion.fontSize * 0.7}px)`,
                  }}>
                    {layout.bottomRegion.creatorHandle}
                  </div>
                )}
                {!layout.bottomRegion.caption && !layout.bottomRegion.creatorHandle && (
                  <div className="region-placeholder">Bottom region</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

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
            <button className="icon" onClick={() => dispatch({ type: 'SET_PLAYHEAD', time: 0 })}>
              <ChevronLeft size={17} />
            </button>
            <button
              className="play"
              onClick={() => dispatch({ type: 'SET_PLAYING', playing: !playing })}
            >
              {playing ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
            </button>
            <button
              className="icon"
              onClick={() => dispatch({ type: 'SET_PLAYHEAD', time: Math.min(total, playhead + 5) })}
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
          <button className="icon"><Maximize size={15} /></button>
        </div>
      </div>
    </section>
  );
}
