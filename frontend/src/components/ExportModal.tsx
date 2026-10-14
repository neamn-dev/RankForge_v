import { useState } from 'react';
import { Film, Check, Download, X, AlertCircle, LoaderCircle } from 'lucide-react';
import { useStore, useTotalDuration } from '../store';
import { api } from '../api';
import { fmtTime, fmtBytes } from '../types';

export default function ExportModal() {
  const { state, dispatch } = useStore();
  const { exportOpen, project, health, hookOn, busy } = state;
  const total = useTotalDuration(hookOn);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<{ filename: string; size: number } | null>(null);

  if (!exportOpen) return null;

  const update = (payload: Partial<typeof project>) => {
    dispatch({ type: 'UPDATE_PROJECT', payload });
  };

  const handleExport = async () => {
    if (!health?.ffmpegAvailable) {
      dispatch({
        type: 'SET_NOTICE',
        message: 'FFmpeg is not detected on backend. Please ensure FFmpeg is installed.',
      });
      return;
    }

    const realClips = project.clips.filter(c => c.assetId);
    if (!realClips.length) {
      dispatch({
        type: 'SET_NOTICE',
        message: 'Import and assign real video clips in the media panel before exporting.',
      });
      return;
    }

    dispatch({ type: 'SET_BUSY', message: 'Rendering Sandwich MP4 with FFmpeg…' });
    try {
      const res = await api.exportProject(project);
      setDownloadUrl(api.baseUrl + res.url);
      setLastExport({ filename: res.filename, size: res.size });

      // Automatically trigger download
      const a = document.createElement('a');
      a.href = api.baseUrl + res.url;
      a.download = res.filename;
      a.click();

      dispatch({
        type: 'SET_NOTICE',
        message: `Export completed! ${fmtBytes(res.size)}`,
      });
    } catch (e) {
      dispatch({
        type: 'SET_NOTICE',
        message: e instanceof Error ? e.message : 'Export failed',
      });
    } finally {
      dispatch({ type: 'SET_BUSY', message: '' });
    }
  };

  return (
    <div className="overlay" onClick={() => dispatch({ type: 'SET_EXPORT_OPEN', open: false })}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          <div>
            <h2>Export Video</h2>
            <p>Render high-definition MP4 with complete Sandwich layout composition.</p>
          </div>
          <button
            className="icon"
            onClick={() => dispatch({ type: 'SET_EXPORT_OPEN', open: false })}
          >
            <X size={17} />
          </button>
        </div>

        <div className="export-summary">
          <Film size={23} />
          <b>{project.name}</b>
          <span>{fmtTime(total)}</span>
          <span>MP4 · H.264</span>
        </div>

        <div className="export-fields">
          <label>
            Aspect ratio
            <select
              value={project.aspectRatio}
              onChange={e => update({ aspectRatio: e.target.value })}
            >
              <option value="9:16">9:16 (Shorts/TikTok)</option>
              <option value="16:9">16:9 (YouTube)</option>
              <option value="1:1">1:1 (Square)</option>
              <option value="4:5">4:5 (Instagram)</option>
            </select>
          </label>

          <label>
            Resolution
            <select
              value={project.resolution}
              onChange={e => update({ resolution: e.target.value })}
            >
              <option value="1080p">1080p (Full HD)</option>
              <option value="720p">720p (HD)</option>
            </select>
          </label>

          <label>
            Frame rate
            <select
              value={project.fps}
              onChange={e => update({ fps: Number(e.target.value) })}
            >
              <option value={24}>24 FPS (Cinematic)</option>
              <option value={30}>30 FPS (Standard)</option>
              <option value={60}>60 FPS (Ultra Smooth)</option>
            </select>
          </label>
        </div>

        {/* FFmpeg status */}
        <div className={`ffmpeg ${health?.ffmpegAvailable ? 'good' : 'bad'}`}>
          {health?.ffmpegAvailable ? (
            <Check size={15} />
          ) : (
            <AlertCircle size={15} />
          )}
          {health?.ffmpegAvailable
            ? 'FFmpeg detected · Full hardware rendering pipeline active'
            : 'FFmpeg not detected on server · Backend will reject MP4 rendering'}
        </div>

        {lastExport && (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              background: '#0d1f19',
              border: '1px solid #1c523d',
              borderRadius: 8,
              fontSize: 11,
              color: '#4ade80',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Latest render: {lastExport.filename} ({fmtBytes(lastExport.size)})</span>
            {downloadUrl && (
              <a
                href={downloadUrl}
                download={lastExport.filename}
                style={{ color: '#20c8f2', fontWeight: 600, textDecoration: 'none' }}
              >
                Re-download
              </a>
            )}
          </div>
        )}

        <div className="modal-actions">
          <button
            className="secondary"
            onClick={() => dispatch({ type: 'SET_EXPORT_OPEN', open: false })}
          >
            Close
          </button>
          <button
            className="primary"
            disabled={!health?.ffmpegAvailable || !!busy}
            onClick={handleExport}
          >
            {busy ? (
              <>
                <LoaderCircle className="spin" size={15} /> Rendering…
              </>
            ) : (
              <>
                <Download size={15} /> Export MP4
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
