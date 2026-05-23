import { useState } from 'react';
import './Views.css';
import useDataStore from '../store/useDataStore';
import useUIStore from '../store/useUIStore';
import AppHeader from '../components/AppHeader/AppHeader';
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
import PlayThumbnail from '../components/PlayThumbnail/PlayThumbnail';
import '../components/PrintMode/PrintMode.css';

function PlayCard({ pl, onOpen, onRenameArm, onRenameConfirm, onRenameKeyDown, onDuplicate, onDeleteArm, onDeleteConfirm, onDeleteCancel, deletingId, renamingId, renameValue, setRenameValue, setRenamingId, printMode, queuePosition }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: pl.id });

  const isSelected = queuePosition > 0;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card ${deletingId === pl.id ? 'deleting' : ''} ${isDragging ? 'dragging' : ''} ${printMode && isSelected ? 'print-selected' : ''}`}
      onClick={() => onOpen(pl)}
    >
      {printMode && isSelected && (
        <div className="print-card-badge">{queuePosition}</div>
      )}
      <div className="card-thumb card-thumb-play" style={{ padding: 0, overflow: 'hidden' }}>
        <PlayThumbnail elements={pl.elements} width={300} height={160} />
      </div>
      <div className="card-info">
        <div className="card-name">{pl.name}</div>
        <div className="card-meta">{pl.elements.length - 1} element{pl.elements.length - 1 !== 1 ? 's' : ''}</div>
        {pl.notes && <div className="card-meta">{pl.notes}</div>}
      </div>

      {!printMode && renamingId === pl.id ? (
        <div className="inline-input-row" style={{ borderTop: '1px solid var(--color-border)', borderBottom: 'none', padding: '8px' }}>
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
      ) : !printMode && deletingId === pl.id ? (
        <div className="card-delete-float">
          <span style={{ fontSize: '13px', color: 'var(--color-danger)', fontWeight: 600, flex: 1 }}>Delete play?</span>
          <button className="card-action-btn" onClick={e => { e.stopPropagation(); onDeleteCancel(e); }}>Cancel</button>
          <button className="card-action-btn danger" onClick={e => onDeleteConfirm(e, pl.id)}>Delete</button>
        </div>
      ) : !printMode ? (
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
      ) : null}
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
  } = useDataStore();

  const { printModeActive, printQueue, togglePrintQueueItem } = useUIStore();

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
    if (printModeActive) {
      togglePrintQueueItem({
        playId: pl.id,
        formationId: activeFormationId,
        playbookId: activePlaybookId,
        name: pl.name,
        formationName: formation?.name || '',
        elements: pl.elements,
      });
      return;
    }
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
      <AppHeader
        crumbs={[
          { label: playbook?.name || '…', onClick: () => navigateTo(VIEW_MODES.PLAYBOOK) },
          { label: formation?.name || '…', onClick: () => navigateTo(VIEW_MODES.FORMATION) },
        ]}
        active="Plays"
        onAdd={printModeActive ? null : handleAdd}
        addLabel="+ New Play"
      />

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
            {plays.map(pl => {
              const queueIdx = printQueue.findIndex(q => q.playId === pl.id);
              return (
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
                  printMode={printModeActive}
                  queuePosition={queueIdx >= 0 ? queueIdx + 1 : 0}
                />
              );
            })}
            {plays.length === 0 && (
              <div className="view-empty">No plays yet. Tap + New Play to start.</div>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
