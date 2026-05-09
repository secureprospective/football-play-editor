import { useState } from 'react';
import './Views.css';
import useEditorStore from '../store/useEditorStore';
import { VIEW_MODES } from '../constants/toolModes';

export default function FormationView() {
  const {
    getActivePlaybook, activePlaybookId,
    navigateTo, goBack,
    addFormation, deleteFormation, updateFormation,
  } = useEditorStore();

  const playbook = getActivePlaybook();

  const [showInput, setShowInput]     = useState(false);
  const [newName, setNewName]         = useState('');
  const [deletingId, setDeletingId]   = useState(null);
  const [renamingId, setRenamingId]   = useState(null);
  const [renameValue, setRenameValue] = useState('');

  if (!playbook) return <div className="view-container"><p>No playbook selected.</p></div>;

  const formations = playbook.formations;

  function handleAdd() {
    setNewName('');
    setShowInput(true);
  }

  function handleSave() {
    if (!newName.trim()) return;
    const fm = addFormation(activePlaybookId, newName.trim());
    setShowInput(false);
    setNewName('');
    navigateTo(VIEW_MODES.PLAY, { formationId: fm.id });
  }

  function handleAddKeyDown(e) {
    if (e.key === 'Enter')  handleSave();
    if (e.key === 'Escape') { setShowInput(false); setNewName(''); }
  }

  function handleOpen(fm) {
    if (deletingId === fm.id || renamingId === fm.id) return;
    navigateTo(VIEW_MODES.PLAY, { formationId: fm.id });
  }

  function handleRenameArm(e, fm) {
    e.stopPropagation();
    setRenamingId(fm.id);
    setRenameValue(fm.name);
    setDeletingId(null);
  }

  function handleRenameConfirm(e, fm) {
    e.stopPropagation();
    if (renameValue.trim()) {
      updateFormation(activePlaybookId, fm.id, { name: renameValue.trim() });
    }
    setRenamingId(null);
    setRenameValue('');
  }

  function handleRenameKeyDown(e, fm) {
    if (e.key === 'Enter')  handleRenameConfirm(e, fm);
    if (e.key === 'Escape') { setRenamingId(null); setRenameValue(''); }
  }

  function handleDeleteArm(e, id) {
    e.stopPropagation();
    setDeletingId(id);
    setRenamingId(null);
  }

  function handleDeleteConfirm(e, id) {
    e.stopPropagation();
    deleteFormation(activePlaybookId, id);
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
        <h1 className="view-title">{playbook.name}</h1>
        <button className="view-add-btn" onClick={handleAdd}>+ New Formation</button>
      </div>

      {showInput && (
        <div className="inline-input-row">
          <input
            className="inline-input"
            placeholder="Formation name..."
            value={newName}
            autoFocus
            onChange={e => setNewName(e.target.value)}
            onKeyDown={handleAddKeyDown}
          />
          <button className="inline-save-btn" onClick={handleSave}>Save</button>
          <button className="inline-cancel-btn" onClick={() => { setShowInput(false); setNewName(''); }}>Cancel</button>
        </div>
      )}

      <div className="card-grid">
        {formations.map(fm => (
          <div
            key={fm.id}
            className={`card ${deletingId === fm.id ? 'deleting' : ''}`}
            onClick={() => handleOpen(fm)}
          >
            <div className="card-thumb card-thumb-formation">
              <span className="card-thumb-icon">🏈</span>
            </div>
            <div className="card-info">
              <div className="card-name">{fm.name}</div>
              <div className="card-meta">{fm.plays.length} play{fm.plays.length !== 1 ? 's' : ''}</div>
            </div>

            {renamingId === fm.id ? (
              <div className="inline-input-row" style={{ borderTop: '1px solid #0f3460', borderBottom: 'none', padding: '8px' }}>
                <input
                  className="inline-input"
                  value={renameValue}
                  autoFocus
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => handleRenameKeyDown(e, fm)}
                  onClick={e => e.stopPropagation()}
                />
                <button className="inline-save-btn" onClick={e => handleRenameConfirm(e, fm)}>Save</button>
                <button className="inline-cancel-btn" onClick={e => { e.stopPropagation(); setRenamingId(null); }}>✕</button>
              </div>
            ) : (
              <div className="card-actions">
                <button className="card-action-btn" onClick={e => handleRenameArm(e, fm)}>Rename</button>
                <button className="card-action-btn danger" onClick={e => handleDeleteArm(e, fm.id)}>Delete</button>
              </div>
            )}

            {deletingId === fm.id && (
              <div className="card-delete-confirm">
                <span>Delete formation?</span>
                <button className="card-delete-cancel-btn" onClick={handleDeleteCancel}>Cancel</button>
                <button className="card-delete-confirm-btn" onClick={e => handleDeleteConfirm(e, fm.id)}>Delete</button>
              </div>
            )}
          </div>
        ))}
        {formations.length === 0 && (
          <div className="view-empty">No formations yet. Tap + New Formation to start.</div>
        )}
      </div>
    </div>
  );
}
