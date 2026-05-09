import './Views.css';
import useEditorStore from '../store/useEditorStore';
import { VIEW_MODES } from '../constants/toolModes';

export default function PlayView() {
  const {
    getActivePlaybook, getActiveFormation,
    activePlaybookId, activeFormationId,
    navigateTo, goBack,
    addPlay, deletePlay,
  } = useEditorStore();

  const playbook  = getActivePlaybook();
  const formation = getActiveFormation();
  if (!formation) return <div className="view-container"><p>No formation selected.</p></div>;

  const plays = formation.plays;

  function handleAdd() {
    const name = prompt('Play name:');
    if (!name?.trim()) return;
    const pl = addPlay(activePlaybookId, activeFormationId, name.trim());
    navigateTo(VIEW_MODES.FIELD, { playId: pl.id });
  }

  function handleOpen(pl) {
    navigateTo(VIEW_MODES.FIELD, { playId: pl.id });
  }

  function handleDelete(e, plId) {
    e.stopPropagation();
    if (confirm('Delete this play?')) {
      deletePlay(activePlaybookId, activeFormationId, plId);
    }
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <button className="view-back-btn" onClick={goBack}>← Back</button>
        <h1 className="view-title">{formation.name}</h1>
        <button className="view-add-btn" onClick={handleAdd}>+ New Play</button>
      </div>
      <p className="view-subtitle">{playbook?.name}</p>
      <div className="card-grid">
        {plays.map(pl => (
          <div key={pl.id} className="card" onClick={() => handleOpen(pl)}>
            <div className="card-thumb card-thumb-play">
              <span className="card-thumb-icon">▶</span>
            </div>
            <div className="card-info">
              <div className="card-name">{pl.name}</div>
              <div className="card-meta">{pl.elements.length - 1} element{pl.elements.length - 1 !== 1 ? 's' : ''}</div>
              {pl.notes && <div className="card-meta">{pl.notes}</div>}
            </div>
            <button className="card-delete" onClick={e => handleDelete(e, pl.id)}>✕</button>
          </div>
        ))}
        {plays.length === 0 && (
          <div className="view-empty">No plays yet. Tap + New Play to start.</div>
        )}
      </div>
    </div>
  );
}
