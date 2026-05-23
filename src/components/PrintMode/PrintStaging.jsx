// TFM Playbook — Football Play Editor
// Copyright (C) 2024–2026 Christopher Campbell / Tech Freedom Ministries
// Licensed under the Business Source License 1.1
// See LICENSE file in the project root for full terms.
// Commercial use prohibited without written permission from the Licensor.
import useUIStore from '../../store/useUIStore';
import useDataStore from '../../store/useDataStore';
import PlayThumbnail from '../PlayThumbnail/PlayThumbnail';

function resolvePlay(item, playbooks) {
  const pb = playbooks.find(p => p.id === item.playbookId);
  const fm = pb?.formations.find(f => f.id === item.formationId);
  const pl = fm?.plays.find(p => p.id === item.playId);
  return pl ? { ...item, elements: pl.elements, name: pl.name } : null;
}
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
import './PrintMode.css';

function SortableTile({ item, index, onRemove, printFormat }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.playId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="print-queue-tile"
      {...attributes}
      {...listeners}
    >
      <span className="print-queue-num">{index + 1}</span>
      <button
        className="print-queue-remove"
        onPointerDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); onRemove(item.playId); }}
        title="Remove"
      >✕</button>
      {printFormat === 'plays' && (
        <div className="print-queue-thumb">
          <PlayThumbnail elements={item.elements} width={82} height={52} bgColor="#ffffff" />
        </div>
      )}
      <div className="print-queue-name">{item.name}</div>
    </div>
  );
}

export default function PrintStaging() {
  const {
    printQueue,
    printFormat,
    printSize,
    reorderPrintQueue,
    clearPrintQueue,
    setPrintFormat,
    setPrintSize,
    togglePrintQueueItem,
  } = useUIStore();
  const playbooks = useDataStore(s => s.playbooks);
  const resolvedQueue = printQueue.map(it => resolvePlay(it, playbooks)).filter(Boolean);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    const oldIndex = printQueue.findIndex(q => q.playId === active.id);
    const newIndex = printQueue.findIndex(q => q.playId === over.id);
    reorderPrintQueue(arrayMove(printQueue, oldIndex, newIndex));
  }

  function handleRemove(playId) {
    togglePrintQueueItem({ playId });
  }

  return (
    <div className="print-staging">
      <div className="print-staging-header">
        <div className="print-staging-controls">
          <div className="print-toggle-group">
            <button
              className={`print-toggle-btn ${printFormat === 'text' ? 'active' : ''}`}
              onClick={() => setPrintFormat('text')}
            >Text</button>
            <button
              className={`print-toggle-btn ${printFormat === 'plays' ? 'active' : ''}`}
              onClick={() => setPrintFormat('plays')}
            >Plays</button>
          </div>
          <div className="print-toggle-group">
            <button
              className={`print-toggle-btn ${printSize === 'youth' ? 'active' : ''}`}
              onClick={() => setPrintSize('youth')}
            >Youth</button>
            <button
              className={`print-toggle-btn ${printSize === 'adult' ? 'active' : ''}`}
              onClick={() => setPrintSize('adult')}
            >Adult</button>
          </div>
          <span className="print-queue-count">{printQueue.length} plays</span>
        </div>
        <div className="print-staging-actions">
          <button
            className="print-action-btn"
            onClick={clearPrintQueue}
            disabled={printQueue.length === 0}
          >Clear</button>
          <button
            className="print-action-btn primary"
            onClick={() => window.print()}
            disabled={printQueue.length === 0}
          >Print PDF</button>
        </div>
      </div>

      {printQueue.length === 0 ? (
        <div className="print-staging-empty">
          Navigate to plays and tap to add them here
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={resolvedQueue.map(q => q.playId)}
            strategy={rectSortingStrategy}
          >
            <div className="print-queue-tiles">
              {resolvedQueue.map((item, i) => (
                <SortableTile
                  key={item.playId}
                  item={item}
                  index={i}
                  onRemove={handleRemove}
                  printFormat={printFormat}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className="print-staging-warning">
        When printing: Paper = Letter · Orientation = Landscape · Scale = 100%
      </div>
    </div>
  );
}
