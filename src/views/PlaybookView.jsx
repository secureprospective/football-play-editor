import { useState } from 'react';
import './Views.css';
import useEditorStore from '../store/useEditorStore';
import { VIEW_MODES } from '../constants/toolModes';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function PlaybookCard({
  pb,
  onOpen, onRenameArm, onRenameConfirm, onRenameKeyDown,
  onDeleteArm, onDeleteConfirm, onDeleteCancel,
  deletingId, renamingId, renameValue, setRenameValue, setRenamingId,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: pb.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card ${deletingId === pb.id ? 'deleting' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={() => onOpen(pb)}
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
            onKeyDown={e => onRenameKeyDown(e, pb)}
            onClick={e => e.stopPropagation()}
          />
          <button className="inline-save-btn" onClick={e => onRenameConfirm(e, pb)}>Save</button>
          <button
            className="inline-cancel-btn"
            onClick={e => { e.stopPropagation(); setRenamingId(null); setRenameValue(''); }}
          >✕</button>
        </div>
      ) : (
        <div className="card-actions">
          <div
            className="card-drag-handle"
            {...attributes}
            {...listeners}
            onClick={e => e.stopPropagation()}
            title="Drag to reorder"
          >⠿</div>
          <div className="card-action-btns">
            <button className="card-action-btn" onClick={e => onRenameArm(e, pb)}>Rename</button>
            <button className="card-action-btn danger" onClick={e => onDeleteArm(e, pb.id)}>Delete</button>
          </div>
        </div>
      )}

      {deletingId === pb.id && (
        <div className="card-delete-confirm">
          <span>Delete playbook?</span>
          <button className="card-delete-cancel-btn" onClick={onDeleteCancel}>Cancel</button>
          <button className="card-delete-confirm-btn" onClick={e => onDeleteConfirm(e, pb.id)}>Delete</button>
        </div>
      )}
    </div>
  );
}

export default function PlaybookView() {
  const { playbooks, navigateTo, addPlaybook, deletePlaybook, updatePlaybook, reorderPlaybooks } = useEditorStore();

  const [showInput, setShowInput]     = useState(false);
  const [newName, setNewName]         = useState('');
  const [deletingId, setDeletingId]   = useState(null);
  const [renamingId, setRenamingId]   = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = playbooks.findIndex(pb => pb.id === active.id);
    const newIndex = playbooks.findIndex(pb => pb.id === over.id);
    reorderPlaybooks(arrayMove(playbooks, oldIndex, newIndex));
  }

  function handleAdd() { setNewName(''); setShowInput(true); }

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
    if (renameValue.trim()) updatePlaybook(pb.id, { name: renameValue.trim() });
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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={playbooks.map(pb => pb.id)} strategy={rectSortingStrategy}>
          <div className="card-grid">
            {playbooks.map(pb => (
              <PlaybookCard
                key={pb.id}
                pb={pb}
                onOpen={handleOpen}
                onRenameArm={handleRenameArm}
                onRenameConfirm={handleRenameConfirm}
                onRenameKeyDown={handleRenameKeyDown}
                onDeleteArm={handleDeleteArm}
                onDeleteConfirm={handleDeleteConfirm}
                onDeleteCancel={handleDeleteCancel}
                deletingId={deletingId}
                renamingId={renamingId}
                renameValue={renameValue}
                setRenameValue={setRenameValue}
                setRenamingId={setRenamingId}
              />
            ))}
            {playbooks.length === 0 && (
              <div className="view-empty">No playbooks yet. Tap + New Playbook to start.</div>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
