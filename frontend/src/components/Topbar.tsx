import { useStore } from '../store';
import { Check, ChevronDown, Download, Eye, Pause, Redo2, Save, Sparkles, Undo2, X } from 'lucide-react';

export default function Topbar() {
  const { state, dispatch } = useStore();
  const { project, saved, playing, past, future } = state;

  return (
    <header className="topbar">
      <div className="brand">
        <span className="logo"><i /><i /><i /><i /></span>
        RankForge
      </div>
      <span className="vline" />
      <button
        className="top-menu"
        onClick={() => dispatch({ type: 'SET_PROJECTS_OPEN', open: !state.projectsOpen })}
      >
        Project <ChevronDown size={14} />
      </button>
      <button
        className="secondary"
        style={{
          background: 'linear-gradient(135deg, rgba(32, 200, 242, 0.15), rgba(147, 51, 234, 0.15))',
          borderColor: 'rgba(32, 200, 242, 0.45)',
          color: '#38bdf8',
          fontWeight: 700,
        }}
        onClick={() => dispatch({ type: 'SET_WIZARD_OPEN', open: true })}
        title="Open AI Viral Ranking Studio"
      >
        <Sparkles size={14} style={{ color: '#20c8f2' }} /> AI Studio
      </button>
      <input
        className="project-name"
        value={project.name}
        onChange={e => dispatch({ type: 'UPDATE_PROJECT', payload: { name: e.target.value } })}
        onBlur={() => dispatch({ type: 'COMMIT' })}
        aria-label="Project name"
      />
      <div className="grow" />
      <span className={`saved ${saved ? 'yes' : ''}`}>
        {saved ? <Check size={14} /> : <i />}
        {saved ? 'Saved' : 'Unsaved changes'}
      </span>
      <button
        className="icon"
        title="Undo"
        disabled={!past.length}
        onClick={() => dispatch({ type: 'UNDO' })}
      >
        <Undo2 size={17} />
      </button>
      <button
        className="icon"
        title="Redo"
        disabled={!future.length}
        onClick={() => dispatch({ type: 'REDO' })}
      >
        <Redo2 size={17} />
      </button>
      <button
        className="secondary"
        onClick={() => dispatch({ type: 'SET_PLAYING', playing: !playing })}
      >
        {playing ? <Pause size={15} /> : <Eye size={15} />}
        {playing ? 'Pause' : 'Preview'}
      </button>
      <button
        className="primary"
        onClick={() => dispatch({ type: 'SET_EXPORT_OPEN', open: true })}
      >
        <Download size={15} />Export
      </button>
    </header>
  );
}
