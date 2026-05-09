import './Views.css';
import useEditorStore from '../store/useEditorStore';
import { VIEW_MODES } from '../constants/toolModes';

export default function PlaybookView() {
  const { playbooks, navigateTo, addPlaybook, deletePlaybook } = useEditorStore();

  function handleAdd() {
    const name = prompt('Playbook name:');
    if (!name?.trim()) return;
    const pb = addPlaybook(name.trim());
    navigateTo(VIEW_MODES.FORMATION, { playbookId: pb.id });
  }

  function handleOpen(pb) {
    navigateTo(VIEW_MODES.FORMATION, { playbookId: pb.id });
  }

  function handleDelete(e, id) {
    e.stopPropagation();
    if (confirm('Delete this playbook and all its formations and plays?')) {
      deletePlaybook(id);
    }
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h1 className="view-title">My Playbooks</h1>
        <button className="view-add-btn" onClick={handleAdd}>+ New Playbook</button>
      </div>
      <div className="card-grid">
        {playbooks.map(pb => (
          <div key={pb.id} className="card" onClick={() => handleOpen(pb)}>
            <div className="card-thumb card-thumb-playbook">
              <span className="card-thumb-icon">📋</span>
            </div>
            <div className="card-info">
              <div className="card-name">{pb.name}</div>
              <div className="card-meta">{pb.formations.length} formation{pb.formations.length !== 1 ? 's' : ''}</div>
              {pb.tags?.length > 0 && (
                <div className="card-tags">
                  {pb.tags.map(t => <span key={t} className="card-tag">{t}</span>)}
                </div>
              )}
            </div>
            <button className="card-delete" onClick={e => handleDelete(e, pb.id)}>✕</button>
          </div>
        ))}
        {playbooks.length === 0 && (
          <div className="view-empty">No playbooks yet. Tap + New Playbook to start.</div>
        )}
      </div>
    </div>
  );
}
