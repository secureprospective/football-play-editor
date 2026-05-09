import './Views.css';
import useEditorStore from '../store/useEditorStore';
import { VIEW_MODES } from '../constants/toolModes';

export default function FormationView() {
  const {
    getActivePlaybook, activePlaybookId,
    navigateTo, goBack,
    addFormation, deleteFormation,
  } = useEditorStore();

  const playbook = getActivePlaybook();
  if (!playbook) return <div className="view-container"><p>No playbook selected.</p></div>;

  const formations = playbook.formations;

  function handleAdd() {
    const name = prompt('Formation name:');
    if (!name?.trim()) return;
    const fm = addFormation(activePlaybookId, name.trim());
    navigateTo(VIEW_MODES.PLAY, { formationId: fm.id });
  }

  function handleOpen(fm) {
    navigateTo(VIEW_MODES.PLAY, { formationId: fm.id });
  }

  function handleDelete(e, fmId) {
    e.stopPropagation();
    if (confirm('Delete this formation and all its plays?')) {
      deleteFormation(activePlaybookId, fmId);
    }
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <button className="view-back-btn" onClick={goBack}>← Back</button>
        <h1 className="view-title">{playbook.name}</h1>
        <button className="view-add-btn" onClick={handleAdd}>+ New Formation</button>
      </div>
      <div className="card-grid">
        {formations.map(fm => (
          <div key={fm.id} className="card" onClick={() => handleOpen(fm)}>
            <div className="card-thumb card-thumb-formation">
              <span className="card-thumb-icon">🏈</span>
            </div>
            <div className="card-info">
              <div className="card-name">{fm.name}</div>
              <div className="card-meta">{fm.plays.length} play{fm.plays.length !== 1 ? 's' : ''}</div>
            </div>
            <button className="card-delete" onClick={e => handleDelete(e, fm.id)}>✕</button>
          </div>
        ))}
        {formations.length === 0 && (
          <div className="view-empty">No formations yet. Tap + New Formation to start.</div>
        )}
      </div>
    </div>
  );
}
