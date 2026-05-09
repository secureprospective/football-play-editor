import { useState } from 'react';
import './Views.css';
import useEditorStore from '../store/useEditorStore';
import { VIEW_MODES } from '../constants/toolModes';

export default function PlaybookView() {
  const { playbooks, navigateTo, addPlaybook, deletePlaybook, updatePlaybook } = useEditorStore();

  const [showInput, setShowInput]     = useState(false);
  const [newName, setNewName]         = useState('');
  const [deletingId, setDeletingId]   = useState(null);
  const [renamingId, setRenamingId]   = useState(null);
  const [renameValue, setRenameValue] = useState('');

  function handleAdd() {
    setNewName('');
    setShowInput(true);
  }

  function handleSave() {
    if (!newName.trim()) return;
    const pb = addPlaybook(newName.trim());
    setShowInput(false);
    setNewName('');
    navigateTo(VIEW_MODES.FORMATION, { playbookId: pb.id });
  }

  function handleAddKeyDown(e) {
    if (e.key === 'Enter')  handleSave();
    if (e.key === 'Escape') { setShowInput(false); setNewName(''); }
  }

  function handleOpen(pb) {
    if (deletingId === pb.id || renamingId === pb.id) return;
    navigateTo(VIEW_MODES.FORMATION, { playbookId: pb.id });
  }

  function handleRenameArm(e, pb) {
    e.stopPropagation();
    setRenamingId(pb.id);
    setRenameValue(pb.name);
    setDeletingId(null);
  }

  function handleRenameConfirm(e, pb) {
    e.stopPropagation();
    if (renameValue.trim()) {
      updatePlaybook(pb.id, { name: renameValue.trim() });
    }
    setRenamingId(null);
    setRenameValue('');
  }

  function handleRenameKeyDown(e, pb) {
    if (e.key === 'Enter')  handleRenameConfirm(e, pb);
    if (e.key === 'Escape') { setRenamingId(null); setRenameValue(''); }
  }

  function handleDeleteArm(e, id) {
    e.stopPropagation();
    setDeletingId(id);
    setRenamingId(null);
  }

  function handleDeleteConfirm(e, id) {
    e.stopPropagation();
    deletePlaybook(id);
    setDeletingId(null);
  }

  function handleDeleteCancel(e) {
    e.stopPropagation();
    setDeletingId(null);
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h1 className="view-title">My Playbooks</h1>
        <button className="view-add-btn" onClick={handleAdd}>+ New Playbook</button>
      </div>

      {showInput && (
        <div className="inline-input-row">
          <input
            className="inline-input"
            placeholder="Playbook name..."
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
        {playbooks.map(pb => (
          <div
            key={pb.id}
            className={`card ${deletingId === pb.id ? 'deleting' : ''}`}
            onClick={() => handleOpen(pb)}
          >
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

            {renamingId === pb.id ? (
              <div className="inline-input-row" style={{ borderTop: '1px solid #0f3460', borderBottom: 'none', padding: '8px' }}>
                <input
                  className="inline-input"
                  value={renameValue}
                  autoFocus
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => handleRenameKeyDown(e, pb)}
                  onClick={e => e.stopPropagation()}
                />
                <button className="inline-save-btn" onClick={e => handleRenameConfirm(e, pb)}>Save</button>
                <button className="inline-cancel-btn" onClick={e => { e.stopPropagation(); setRenamingId(null); }}>✕</button>
              </div>
            ) : (
              <div className="card-actions">
                <button className="card-action-btn" onClick={e => handleRenameArm(e, pb)}>Rename</button>
                <button className="card-action-btn danger" onClick={e => handleDeleteArm(e, pb.id)}>Delete</button>
              </div>
            )}

            {deletingId === pb.id && (
              <div className="card-delete-confirm">
                <span>Delete playbook?</span>
                <button className="card-delete-cancel-btn" onClick={handleDeleteCancel}>Cancel</button>
                <button className="card-delete-confirm-btn" onClick={e => handleDeleteConfirm(e, pb.id)}>Delete</button>
              </div>
            )}
          </div>
        ))}
        {playbooks.length === 0 && (
          <div className="view-empty">No playbooks yet. Tap + New Playbook to start.</div>
        )}
      </div>
    </div>
  );
}
