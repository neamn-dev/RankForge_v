import { useEffect } from 'react';
import { StoreProvider, useStore } from './store';
import { api } from './api';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import Preview from './components/Preview';
import Inspector from './components/Inspector';
import Timeline from './components/Timeline';
import Wizard from './components/Wizard';
import ProjectsModal from './components/ProjectsModal';
import ExportModal from './components/ExportModal';
import { LoaderCircle, X } from 'lucide-react';

function AppContent() {
  const { state, dispatch } = useStore();
  const { notice, busy } = state;

  // Initialize data on mount
  useEffect(() => {
    api.health()
      .then(h => dispatch({ type: 'SET_HEALTH', health: h }))
      .catch(() => {});

    api.templates()
      .then(t => dispatch({ type: 'SET_TEMPLATES', templates: t }))
      .catch(() => {});

    api.listProjects()
      .then(p => dispatch({ type: 'SET_PROJECTS', projects: p }))
      .catch(() => {});

    api.listAssets()
      .then(a => dispatch({ type: 'SET_ASSETS', assets: a }))
      .catch(() => {});
  }, [dispatch]);

  // Global Keyboard Shortcuts (Space, Ctrl+Z, Ctrl+Y, Delete, S, Arrows, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (isInput) return;

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          dispatch({ type: 'REDO' });
        } else {
          dispatch({ type: 'UNDO' });
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        dispatch({ type: 'REDO' });
        return;
      }

      // Play / Pause (Space)
      if (e.code === 'Space') {
        e.preventDefault();
        dispatch({ type: 'SET_PLAYING', playing: !state.playing });
        return;
      }

      // Delete selected clip
      if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedClipId) {
        e.preventDefault();
        dispatch({ type: 'COMMIT' });
        dispatch({ type: 'REMOVE_CLIP', clipId: state.selectedClipId });
        dispatch({ type: 'SET_NOTICE', message: 'Clip deleted' });
        return;
      }

      // Split clip at playhead ('s' or 'S')
      if ((e.key === 's' || e.key === 'S') && state.selectedClipId) {
        const clip = state.project.clips.find(c => c.id === state.selectedClipId);
        if (clip) {
          let elapsed = state.hookOn ? 1.8 : 0;
          for (const c of state.project.clips) {
            if (c.id === clip.id) break;
            elapsed += c.duration;
          }
          const splitOffset = state.playhead - elapsed;
          if (splitOffset > 0.4 && splitOffset < clip.duration - 0.4) {
            e.preventDefault();
            dispatch({ type: 'COMMIT' });
            const clipA = {
              ...clip,
              duration: Number(splitOffset.toFixed(2)),
              sourceEnd: Number(((clip.sourceStart || 0) + splitOffset).toFixed(2)),
            };
            const clipB = {
              ...clip,
              id: crypto.randomUUID(),
              name: `${clip.name} (Part 2)`,
              sourceStart: Number(((clip.sourceStart || 0) + splitOffset).toFixed(2)),
              duration: Number((clip.duration - splitOffset).toFixed(2)),
            };
            const newClips = state.project.clips.flatMap(c => (c.id === clip.id ? [clipA, clipB] : [c]));
            dispatch({
              type: 'UPDATE_PROJECT',
              payload: {
                clips: newClips.map((c, i) => ({ ...c, rank: newClips.length - i })),
              },
            });
            dispatch({ type: 'SET_NOTICE', message: 'Clip split at playhead (S)' });
          }
        }
        return;
      }

      // Step playhead (Left / Right Arrow)
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const delta = e.shiftKey ? 1.0 : 0.1;
        dispatch({ type: 'SET_PLAYHEAD', time: Math.max(0, state.playhead - delta) });
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const total = state.project.clips.reduce((n, c) => n + c.duration, 0) + (state.hookOn ? 1.8 : 0);
        const delta = e.shiftKey ? 1.0 : 0.1;
        dispatch({ type: 'SET_PLAYHEAD', time: Math.min(total, state.playhead + delta) });
        return;
      }

      // Escape key (deselect / close modals)
      if (e.key === 'Escape') {
        if (state.exportOpen) dispatch({ type: 'SET_EXPORT_OPEN', open: false });
        if (state.projectsOpen) dispatch({ type: 'SET_PROJECTS_OPEN', open: false });
        if (state.wizardOpen) dispatch({ type: 'SET_WIZARD_OPEN', open: false });
        if (state.selectedClipId) dispatch({ type: 'SET_SELECTED', clipId: '' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, dispatch]);

  // Notice auto-dismiss
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => dispatch({ type: 'SET_NOTICE', message: '' }), 4000);
    return () => clearTimeout(t);
  }, [notice, dispatch]);

  return (
    <div className="app">
      {/* ── Top Navigation Bar ── */}
      <Topbar />

      {/* ── Main Workspace ── */}
      <main className="workspace">
        <Sidebar />
        <Preview />
        <Inspector />
      </main>

      {/* ── Multi-Track Timeline ── */}
      <Timeline />

      {/* ── Modals & Overlays ── */}
      <Wizard />
      <ProjectsModal />
      <ExportModal />

      {/* ── Toast Notification ── */}
      {notice && (
        <div className="toast">
          <span>● &nbsp;{notice}</span>
          <button onClick={() => dispatch({ type: 'SET_NOTICE', message: '' })}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Busy Spinner ── */}
      {busy && (
        <div className="overlay">
          <div className="busy">
            <LoaderCircle className="spin" size={28} />
            <b>{busy}</b>
            <small>Please keep this window open.</small>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
