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
  }, [dispatch]);

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
