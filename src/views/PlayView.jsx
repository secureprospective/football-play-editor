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

function PlayCard({ pl, onOpen, onRenameArm, onRenameConfirm, onRenameKeyDown, onDuplicate, onDeleteArm, onDeleteConfirm, onDeleteCancel, deletingId, renamingId, renameValue, setRenameValue, setRenamingId }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: pl.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card ${deletingId === pl.id ? 'deleting' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={() => onOpen(pl)}
    >
      <div className="card-thumb card-thumb-play">
        <span className="card-thumb-icon">▶</span>
      </div>
      <div className="card-info">
        <div className="card-name">{pl.name}</div>
        <div className="card-meta">{pl.elements.length - 1} element{pl.elements.length - 1 !== 1 ? 's' : ''}</div>
        {pl.notes && <div className="card-meta">{pl.notes}</div>}
      </div>

      {renamingId === pl.id ? (
        <div className="inline-input-row" style={{ borderTop: '1px solid #0f3460', borderBottom: 'none', padding: '8px' }}>
          <input
            className="inline-input"
            value={renameValue}
            autoFocus
            onChange={e => setRenameValue(e.target.value)}
            onKeyDown={e => onRenameKeyDown(e, pl)}
            onClick={e => e.stopPropagation()}
          />
          <button className="inline-save-btn" onClick={e => onRenameConfirm(e, pl)}>Save</button>
          <button className="inline-cancel-btn" onClick={e => { e.stopPropagation(); setRenamingId(null); setRenameValue(''); }}>✕</button>
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
            <button className="card-action-btn" onClick={e => onRenameArm(e, pl)}>Rename</button>
            <button className="card-action-btn" onClick={e => onDuplicate(e, pl)}>Duplicate</button>
            <button className="card-action-btn danger" onClick={e => onDeleteArm(e, pl.id)}>Delete</button>
          </div>
        </div>
      )}

      {deletingId === pl.id && (
        <div className="card-delete-confirm">
          <span>Delete play?</span>
          <button className="card-delete-cancel-btn" onClick={onDeleteCancel}>Cancel</button>
          <button className="card-delete-confirm-btn" onClick={e => onDeleteConfirm(e, pl.id)}>Delete</button>
        </div>
      )}
    </div>
  );
}

export default function PlayView() {
  const {
    getActivePlaybook, getActiveFormation,
    activePlaybookId, activeFormationId,
    navigateTo, goBack,
    addPlay, deletePlay, updatePlay, duplicatePlay,
    reorderPlays,
  } = useEditorStore();

  const formation = getActiveFormation();
  const playbook  = getActivePlaybook();

  const [showInput, setShowInput]     = useState(false);
  const [newName, setNewName]         = useState('');
  const [deletingId, setDeletingId]   = useState(null);
  const [renamingId, setRenamingId]   = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const plays = formation?.plays || [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = plays.findIndex(pl => pl.id === active.id);
    const newIndex = plays.findIndex(pl => pl.id === over.id);
    reorderPlays(activePlaybookId, activeFormationId, arrayMove(plays, oldIndex, newIndex));
  }

  function handleAdd() { setNewName(''); setShowInput(true); }

  function handleSave() {
    if (!newName.trim()) return;
    const pl = addPlay(activePlaybookId, activeFormationId, newName.trim());
    setShowInput(false);
    setNewName('');
    navigateTo(VIEW_MODES.FIELD, { playId: pl.id });
  }

  function handleAddKeyDown(e) {
    if (e.key === 'Enter')  handleSave();
    if (e.key === 'Escape') { setShowInput(false); setNewName(''); }
  }

  function handleOpen(pl) {
    if (deletingId === pl.id || renamingId === pl.id) return;
    navigateTo(VIEW_MODES.FIELD, { playId: pl.id });
  }

  function handleRenameArm(e, pl) {
    e.stopPropagation();
    setRenamingId(pl.id);
    setRenameValue(pl.name);
    setDeletingId(null);
  }

  function handleRenameConfirm(e, pl) {
    e.stopPropagation();
    if (renameValue.trim()) updatePlay(activePlaybookId, activeFormationId, pl.id, { name: renameValue.trim() });
    setRenamingId(null);
    setRenameValue('');
  }

  function handleRenameKeyDown(e, pl) {
    if (e.key === 'Enter')  handleRenameConfirm(e, pl);
    if (e.key === 'Escape') { setRenamingId(null); setRenameValue(''); }
  }

  function handleDuplicate(e, pl) {
    e.stopPropagation();
    duplicatePlay(activePlaybookId, activeFormationId, pl.id);
  }

  function handleDeleteArm(e, id) {
    e.stopPropagation();
    setDeletingId(id);
    setRenamingId(null);
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
            onKeyDown={handleAddKeyDown}
          />
          <button className="inline-save-btn" onClick={handleSave}>Save</button>
          <button className="inline-cancel-btn" onClick={() => { setShowInput(false); setNewName(''); }}>Cancel</button>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={plays.map(pl => pl.id)} strategy={rectSortingStrategy}>
          <div className="card-grid">
            {plays.map(pl => (
              <PlayCard
                key={pl.id}
                pl={pl}
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
            {plays.length === 0 && (
              <div className="view-empty">No plays yet. Tap + New Play to start.</div>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
