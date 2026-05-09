import { useState } from 'react';
import './Views.css';
import useEditorStore from '../store/useEditorStore';
import { VIEW_MODES } from '../constants/toolModes';

export default function PlaybookView() {
  const { playbooks, navigateTo, addPlaybook, deletePlaybook, updatePlaybook } = useEditorStore();
  const [showInput, setShowInput]   = useState(false);
  const [newName, setNewName]       = useState('');
  const [deletingId, setDeletingId] = useState(null);

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

  function handleKeyDown(e) {
    if (e.key === 'Enter')  handleSave();
    if (e.key === 'Escape') { setShowInput(false); setNewName(''); }
  }

  function handleOpen(pb) {
    navigateTo(VIEW_MODES.FORMATION, { playbookId: pb.id });
  }

  function handleRename(e, pb) {
    e.stopPropagation();
    const name = prompt('Rename playbook:', pb.name);
    if (name?.trim()) updatePlaybook(pb.id, { name: name.trim() });
  }

  function handleDeleteArm(e, id) {
    e.stopPropagation();
    setDeletingId(id);
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
            onKeyDown={handleKeyDown}
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
            onClick={() => deletingId !== pb.id && handleOpen(pb)}
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
            <div className="card-actions">
              <button className="card-action-btn" onClick={e => handleRename(e, pb)}>Rename</button>
              <button className="card-action-btn danger" onClick={e => handleDeleteArm(e, pb.id)}>Delete</button>
            </div>
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
