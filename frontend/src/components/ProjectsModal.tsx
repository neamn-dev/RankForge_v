import { useEffect } from 'react';
import { X, Plus, FileVideo, Trash2, FolderOpen, Clock } from 'lucide-react';
import { useStore } from '../store';
import { api } from '../api';

export default function ProjectsModal() {
  const { state, dispatch } = useStore();
  const { projectsOpen, projects } = state;

  useEffect(() => {
    if (projectsOpen) {
      api.listProjects()
        .then(list => dispatch({ type: 'SET_PROJECTS', projects: list }))
        .catch(() => {});
    }
  }, [projectsOpen, dispatch]);

  if (!projectsOpen) return null;

  const handleOpen = async (id: string) => {
    try {
      dispatch({ type: 'SET_BUSY', message: 'Loading project…' });
      const p = await api.getProject(id);
      dispatch({ type: 'LOAD_PROJECT', project: p });
      dispatch({ type: 'SET_PROJECTS_OPEN', open: false });
      dispatch({ type: 'SET_NOTICE', message: `Opened "${p.name}"` });
    } catch (e) {
      dispatch({ type: 'SET_NOTICE', message: 'Failed to open project' });
    } finally {
      dispatch({ type: 'SET_BUSY', message: '' });
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteProject(id);
      dispatch({
        type: 'SET_PROJECTS',
        projects: projects.filter(p => p.id !== id),
      });
      dispatch({ type: 'SET_NOTICE', message: 'Project deleted' });
    } catch {
      dispatch({ type: 'SET_NOTICE', message: 'Failed to delete project' });
    }
  };

  const handleNew = () => {
    dispatch({ type: 'NEW_PROJECT' });
    dispatch({ type: 'SET_PROJECTS_OPEN', open: false });
  };

  return (
    <div
      className="overlay"
      onClick={() => dispatch({ type: 'SET_PROJECTS_OPEN', open: false })}
    >
      <div
        className="modal"
        style={{ width: 'min(640px, 92vw)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-title">
          <div>
            <h2>My Ranking Projects</h2>
            <p>Manage, load, or start a new ranking video project.</p>
          </div>
          <button
            className="icon"
            onClick={() => dispatch({ type: 'SET_PROJECTS_OPEN', open: false })}
          >
            <X size={17} />
          </button>
        </div>

        <div style={{ marginTop: 14 }}>
          <button
            className="primary"
            style={{ width: '100%', height: 40 }}
            onClick={handleNew}
          >
            <Plus size={16} /> Create New Ranking Project
          </button>
        </div>

        <div className="project-card-grid">
          {projects.map(p => (
            <div
              key={p.id}
              className="project-box"
              onClick={() => handleOpen(p.id)}
            >
              <div>
                <div className="project-box-title">
                  <FileVideo size={16} style={{ color: '#20c8f2' }} />
                  <span>{p.name || 'Untitled Project'}</span>
                </div>
                <div className="project-box-meta">
                  <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />
                  {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : 'Recently'}
                </div>
              </div>

              <div className="project-box-actions">
                <button
                  className="icon"
                  title="Delete project"
                  onClick={e => handleDelete(p.id, e)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {!projects.length && (
            <div
              className="empty"
              style={{ gridColumn: '1 / -1', padding: 24, minHeight: 120 }}
            >
              <FolderOpen size={24} style={{ opacity: 0.4 }} />
              <p>No saved projects found on server yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
