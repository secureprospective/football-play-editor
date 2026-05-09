import { useState } from 'react';
import './Views.css';
import useEditorStore from '../store/useEditorStore';
import { VIEW_MODES } from '../constants/toolModes';

export default function PlayView() {
  const {
    getActivePlaybook, getActiveFormation,
    activePlaybookId, activeFormationId,
    navigateTo, goBack,
    addPlay, deletePlay, updatePlay,
  } = useEditorStore();

  const playbook  = getActivePlaybook();
  const formation = getActiveFormation();
  const [showInput, setShowInput]   = useState(false);
  const [newName, setNewName]       = useState('');
  const [deletingId, setDeletingId] = useState(null);

  if (!formation) return <div className="view-container"><p>No formation selected.</p></div>;

  const plays = formation.plays;

  function handleAdd() {
    setNewName('');
    setShowInput(true);
  }

  function handleSave() {
    if (!newName.trim()) return;
    const pl = addPlay(activePlaybookId, activeFormationId, newName.trim());
    setShowInput(false);
    setNewName('');
    navigateTo(VIEW_MODES.FIELD, { playId: pl.id });
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter')  handleSave();
    if (e.key === 'Escape') { setShowInput(false); setNewName(''); }
  }

  function handleOpen(pl) {
    navigateTo(VIEW_MODES.FIELD, { playId: pl.id });
  }

  function handleRename(e, pl) {
    e.stopPropagation();
    const name = prompt('Rename play:', pl.name);
    if (name?.trim()) updatePlay(activePlaybookId, activeFormationId, pl.id, { name: name.trim() });
  }

  function handleDuplicate(e, pl) {
    e.stopPropagation();
    // TODO: wire duplicate in next session
  }

  function handleDeleteArm(e, id) {
    e.stopPropagation();
    setDeletingId(id);
  }

  function handleDeleteConfirm(e, id) {
    e.stopPropagation();
    deletePlay(activePlaybookId, activeFormationId, id);
    setDeletingId(null);
  }

  function handleDeleteCancel(e) {
    e.stopPropagation();
    setDeletingId(null);
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <button className="view-back-btn" onClick={goBack}>← Back</button>
        <h1 className="view-title">{formation.name}</h1>
        <button className="view-add-btn" onClick={handleAdd}>+ New Play</button>
      </div>

      {showInput && (
        <div className="inline-input-row">
          <input
            className="inline-input"
            placeholder="Play name..."
            value={newName}
            autoFocus
            onChange={e => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="inline-save-btn" onClick={handleSave}>Save</button>
          <button className="inline-cancel-btn" onClick={() => { setShowInput(false); setNewName(''); }}>Cancel</button>
        </div>
      )}

      <div className="card-grid">
        {plays.map(pl => (
          <div
            key={pl.id}
            className={`card ${deletingId === pl.id ? 'deleting' : ''}`}
            onClick={() => deletingId !== pl.id && handleOpen(pl)}
          >
            <div className="card-thumb card-thumb-play">
              <span className="card-thumb-icon">▶</span>
            </div>
            <div className="card-info">
              <div className="card-name">{pl.name}</div>
              <div className="card-meta">{pl.elements.length - 1} element{pl.elements.length - 1 !== 1 ? 's' : ''}</div>
              {pl.notes && <div className="card-meta">{pl.notes}</div>}
            </div>
            <div className="card-actions">
              <button className="card-action-btn" onClick={e => handleRename(e, pl)}>Rename</button>
              <button className="card-action-btn" onClick={e => handleDuplicate(e, pl)}>Duplicate</button>
              <button className="card-action-btn danger" onClick={e => handleDeleteArm(e, pl.id)}>Delete</button>
            </div>
            {deletingId === pl.id && (
              <div className="card-delete-confirm">
                <span>Delete play?</span>
                <button className="card-delete-cancel-btn" onClick={handleDeleteCancel}>Cancel</button>
                <button className="card-delete-confirm-btn" onClick={e => handleDeleteConfirm(e, pl.id)}>Delete</button>
              </div>
            )}
          </div>
        ))}
        {plays.length === 0 && (
          <div className="view-empty">No plays yet. Tap + New Play to start.</div>
        )}
      </div>
    </div>
  );
}
