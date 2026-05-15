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

function FormationCard({ fm, onOpen, onRenameArm, onRenameConfirm, onRenameKeyDown, onDuplicate, onDeleteArm, onDeleteConfirm, onDeleteCancel, deletingId, renamingId, renameValue, setRenameValue, setRenamingId }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: fm.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card ${deletingId === fm.id ? 'deleting' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={() => onOpen(fm)}
    >
      <div className="card-thumb card-thumb-formation">
        <span className="card-thumb-icon">🏈</span>
      </div>
      <div className="card-info">
        <div className="card-name">{fm.name}</div>
        <div className="card-meta">{fm.plays.length} play{fm.plays.length !== 1 ? 's' : ''}</div>
      </div>

      {renamingId === fm.id ? (
        <div className="inline-input-row" style={{ borderTop: '1px solid var(--color-border)', borderBottom: 'none', padding: '8px' }}>
          <input
            className="inline-input"
            value={renameValue}
            autoFocus
            onChange={e => setRenameValue(e.target.value)}
            onKeyDown={e => onRenameKeyDown(e, fm)}
            onClick={e => e.stopPropagation()}
          />
          <button className="inline-save-btn" onClick={e => onRenameConfirm(e, fm)}>Save</button>
          <button className="inline-cancel-btn" onClick={e => { e.stopPropagation(); setRenamingId(null); setRenameValue(''); }}>✕</button>
        </div>
      ) : deletingId === fm.id ? (
        <div className="card-delete-float">
          <span style={{ fontSize: '13px', color: 'var(--color-danger)', fontWeight: 600, flex: 1 }}>Delete formation?</span>
          <button className="card-action-btn" onClick={e => { e.stopPropagation(); onDeleteCancel(e); }}>Cancel</button>
          <button className="card-action-btn danger" onClick={e => onDeleteConfirm(e, fm.id)}>Delete</button>
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
            <button className="card-action-btn" onClick={e => onRenameArm(e, fm)}>Rename</button>
            <button className="card-action-btn" onClick={e => onDuplicate(e, fm)}>Duplicate</button>
            <button className="card-action-btn danger" onClick={e => onDeleteArm(e, fm.id)}>Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FormationView() {
  const {
    getActivePlaybook, activePlaybookId,
    navigateTo, goBack,
    addFormation, deleteFormation, updateFormation, duplicateFormation,
    reorderFormations,
  } = useEditorStore();

  const playbook = getActivePlaybook();

  const [showInput, setShowInput]     = useState(false);
  const [newName, setNewName]         = useState('');
  const [deletingId, setDeletingId]   = useState(null);
  const [renamingId, setRenamingId]   = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const formations = playbook?.formations || [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = formations.findIndex(fm => fm.id === active.id);
    const newIndex = formations.findIndex(fm => fm.id === over.id);
    reorderFormations(activePlaybookId, arrayMove(formations, oldIndex, newIndex));
  }

  function handleAdd() { setNewName(''); setShowInput(true); }

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
    if (renameValue.trim()) updateFormation(activePlaybookId, fm.id, { name: renameValue.trim() });
    setRenamingId(null);
    setRenameValue('');
  }

  function handleRenameKeyDown(e, fm) {
    if (e.key === 'Enter')  handleRenameConfirm(e, fm);
    if (e.key === 'Escape') { setRenamingId(null); setRenameValue(''); }
  }

  function handleDuplicate(e, fm) {
    e.stopPropagation();
    duplicateFormation(activePlaybookId, fm.id);
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
        <h1 className="view-title">{playbook?.name}</h1>
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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={formations.map(fm => fm.id)} strategy={rectSortingStrategy}>
          <div className="card-grid">
            {formations.map(fm => (
              <FormationCard
                key={fm.id}
                fm={fm}
                onOpen={handleOpen}
                onRenameArm={handleRenameArm}
                onRenameConfirm={handleRenameConfirm}
                onRenameKeyDown={handleRenameKeyDown}
                onDuplicate={handleDuplicate}
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
            {formations.length === 0 && (
              <div className="view-empty">No formations yet. Tap + New Formation to start.</div>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
