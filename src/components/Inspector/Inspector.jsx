import { useState, useEffect } from 'react';
import './Inspector.css';
import useDataStore from '../../store/useDataStore';
import useUIStore from '../../store/useUIStore';
import { THEME_COLORS } from '../../constants/themeColors';
import { getDuration } from '../../store/useAnimationStore';
import { getSnapTime } from '../../utils/animationRuntime';

function VisibilityControls({ visibility, duration, onChange }) {
  const timed = visibility?.startTime !== null && visibility?.startTime !== undefined;
  const startTime = visibility?.startTime ?? 0;
  const endTime   = visibility?.endTime   ?? null;
  const maxTime   = duration > 0 ? duration : 10;

  function setTimed(enabled) {
    onChange(enabled
      ? { startTime: 0, endTime: null, fade: false }
      : { startTime: null, endTime: null, fade: false }
    );
  }

  return (
    <div className="inspector-visibility">
      <div className="inspector-segments-label">Visibility</div>
      <label className="check-row">
        <input type="checkbox" checked={timed} onChange={e => setTimed(e.target.checked)}
          onKeyDown={e => e.stopPropagation()} />
        Timed
      </label>
      {timed && (
        <>
          <label>Show at (s)
            <div className="range-row">
              <input type="range" min="0" max={maxTime} step="0.1"
                value={startTime}
                onChange={e => onChange({ ...visibility, startTime: parseFloat(e.target.value) })}
                onKeyDown={e => e.stopPropagation()}
              />
              <input type="number" min="0" max={maxTime} step="0.1"
                value={startTime}
                onChange={e => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v)) onChange({ ...visibility, startTime: Math.max(0, Math.min(maxTime, v)) });
                }}
                onKeyDown={e => e.stopPropagation()}
              />
            </div>
          </label>
          <label>Hide at (s, blank = never)
            <div className="range-row">
              <input type="range" min="0" max={maxTime} step="0.1"
                value={endTime ?? maxTime}
                onChange={e => onChange({ ...visibility, endTime: parseFloat(e.target.value) })}
                onKeyDown={e => e.stopPropagation()}
              />
              <input type="number" min="0" max={maxTime} step="0.1"
                value={endTime ?? ''}
                placeholder="∞"
                onChange={e => {
                  const raw = e.target.value;
                  if (raw === '') { onChange({ ...visibility, endTime: null }); return; }
                  const v = parseFloat(raw);
                  if (!isNaN(v)) onChange({ ...visibility, endTime: Math.max(0, Math.min(maxTime, v)) });
                }}
                onKeyDown={e => e.stopPropagation()}
              />
            </div>
          </label>
        </>
      )}
    </div>
  );
}

// ── Football journey inspector ───────────────────────────────────────────────
function FootballInspector({ football, elements, allPlayers }) {
  const {
    setFootballSnapTo,
    addJourneyEvent,
    updateJourneyEvent,
    deleteJourneyEvent,
  } = useDataStore();

  const journey  = football.journey || { snapToPlayer: null, events: [] };
  const events   = [...(journey.events || [])].sort((a, b) => a.time - b.time);
  const snapTime = getSnapTime(elements);
  const duration = getDuration(elements);
  const maxTime  = duration > 0 ? duration : 10;

  function playerLabel(id) {
    const p = allPlayers.find(pl => pl.id === id);
    return p ? (p.label || `Player ${allPlayers.indexOf(p) + 1}`) : '[deleted]';
  }

  return (
    <>
      {/* Position */}
      <div className="inspector-field-row">
        <span className="inspector-field-label">Position</span>
        <span className="inspector-field-value">x={Math.round(football.x)}  y={Math.round(football.y)} (LOS)</span>
      </div>

      {/* Snap to */}
      <label>Snap to
        <select
          value={journey.snapToPlayer || 'none'}
          onChange={e => setFootballSnapTo(football.id, e.target.value === 'none' ? null : e.target.value)}
          onKeyDown={e => e.stopPropagation()}
        >
          <option value="none">— No snap —</option>
          {allPlayers.map((p, i) => (
            <option key={p.id} value={p.id}>
              {p.label || `Player ${i + 1}`}
            </option>
          ))}
        </select>
      </label>

      <div className="inspector-field-row">
        <span className="inspector-field-label">Snap time</span>
        <span className="inspector-field-value">{snapTime.toFixed(1)}s (auto)</span>
      </div>

      {/* Journey events */}
      <div className="inspector-segments-label" style={{ marginTop: 10 }}>Journey Events</div>

      {events.length === 0 && (
        <div className="inspector-hint">No events — ball goes straight from snap to end of play</div>
      )}

      {events.map(evt => {
        const isInFlight = evt.type === 'pass' || evt.type === 'toss';
        return (
          <div key={evt.id} className="inspector-journey-event">
            <div className="journey-event-row">
              {/* Time */}
              <input
                type="number"
                className="journey-time-input"
                min={snapTime.toFixed(1)}
                max={maxTime}
                step="0.1"
                value={evt.time}
                onChange={e => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v)) updateJourneyEvent(football.id, evt.id, {
                    time: Math.max(snapTime, Math.min(maxTime, Math.round(v * 10) / 10)),
                  });
                }}
                onKeyDown={e => e.stopPropagation()}
                title="Event time (s)"
              />
              <span className="journey-time-unit">s</span>

              {/* Type */}
              <select
                className="journey-type-select"
                value={evt.type}
                onChange={e => updateJourneyEvent(football.id, evt.id, { type: e.target.value })}
                onKeyDown={e => e.stopPropagation()}
              >
                <option value="handoff">Handoff</option>
                <option value="toss">Toss</option>
                <option value="pass">Pass</option>
              </select>

              {/* To player */}
              <select
                className="journey-player-select"
                value={evt.toPlayer || 'none'}
                onChange={e => updateJourneyEvent(football.id, evt.id, {
                  toPlayer: e.target.value === 'none' ? null : e.target.value,
                })}
                onKeyDown={e => e.stopPropagation()}
              >
                <option value="none">— Player —</option>
                {allPlayers.map((p, i) => (
                  <option key={p.id} value={p.id}>{p.label || `P${i + 1}`}</option>
                ))}
              </select>

              {/* Delete */}
              <button
                className="journey-delete-btn"
                onClick={() => deleteJourneyEvent(football.id, evt.id)}
                title="Remove event"
              >×</button>
            </div>

            {/* Arc status for pass/toss */}
            {isInFlight && (
              <div className="journey-arc-row">
                {evt.arcPathId
                  ? <span className="journey-arc-status arc-drawn">Arc ✓</span>
                  : <span className="journey-arc-status arc-missing">Arc: not drawn (Step 6)</span>
                }
              </div>
            )}
          </div>
        );
      })}

      {/* Add event buttons */}
      <div className="journey-add-row">
        <button className="seg-label-btn" onClick={() => addJourneyEvent(football.id, 'handoff')}>+ Handoff</button>
        <button className="seg-label-btn" onClick={() => addJourneyEvent(football.id, 'toss')}>+ Toss</button>
        <button className="seg-label-btn" onClick={() => addJourneyEvent(football.id, 'pass')}>+ Pass</button>
      </div>
    </>
  );
}

export default function Inspector() {
  const { getActivePlay, selectedId, updateElement, updateSegment, marqueeIds, linkPlayerToRoute, unlinkPlayerFromRoute } = useDataStore();
  const { theme } = useUIStore();
  const elements = getActivePlay()?.elements || [];
  const allPaths   = elements.filter(el => el.type === 'path');
  const allPlayers = elements.filter(el => el.type === 'player');
  const selected = elements.find(el => el.id === selectedId);
  const tc = THEME_COLORS[theme] || THEME_COLORS['theme-sun-cyan'];
  const palette = tc.palette.map((fill, i) => ({ fill, label: tc.labels[i] }));

  const [activeSegColorId, setActiveSegColorId] = useState(null);

  // Reset segment color mode when the selected element changes
  useEffect(() => { setActiveSegColorId(null); }, [selected?.id]);

  // ESC cancels segment color mode
  useEffect(() => {
    if (!activeSegColorId) return;
    function onKey(e) { if (e.key === 'Escape') setActiveSegColorId(null); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [activeSegColorId]);

  if (marqueeIds.length > 0) {
    return (
      <div className="inspector">
        <div className="inspector-header">Group Selected</div>
        <div className="inspector-empty">
          <div>{marqueeIds.length} element{marqueeIds.length !== 1 ? 's' : ''} selected</div>
          <div>Drag to move the group</div>
        </div>
      </div>
    );
  }

  if (!selected || selected.type === 'scrimmage') {
    return (
      <div className="inspector">
        <div className="inspector-empty">
          <div>Nothing selected</div>
          <div>Click an element on the field</div>
        </div>
      </div>
    );
  }

  function handleChange(field, value) {
    updateElement(selected.id, { [field]: value });
  }

  function handleStyleChange(field, value) {
    updateElement(selected.id, { style: { ...selected.style, [field]: value } });
  }

  function setColorIndex(index) {
    const changes = { style: { ...selected.style, colorIndex: index } };
    if (selected.segments) {
      changes.segments = selected.segments.map(({ colorIndex: _ci, ...rest }) => rest);
    }
    updateElement(selected.id, changes);
  }

  const activeIndex = selected.style?.colorIndex ?? -1;
  const activeSeg = activeSegColorId
    ? selected.segments?.find(s => s.id === activeSegColorId)
    : null;
  const paletteActiveIndex = activeSeg
    ? (activeSeg.colorIndex !== undefined ? activeSeg.colorIndex : -1)
    : activeIndex;

  if (selected.type === 'text') {
    return (
      <div className="inspector">
        <div className="inspector-header">Text</div>
        <div className="inspector-body">
          <label>Content
            <textarea
              value={selected.content || ''}
              rows={3}
              onChange={e => updateElement(selected.id, { content: e.target.value })}
              onKeyDown={e => e.stopPropagation()}
            />
          </label>
          <VisibilityControls
            visibility={selected.visibility}
            duration={getDuration(elements)}
            onChange={v => updateElement(selected.id, { visibility: v })}
          />
        </div>
        <div className="inspector-footer">
          <span className="inspector-id">id: {selected.id}</span>
        </div>
      </div>
    );
  }

  if (selected.type === 'highlight') {
    return (
      <div className="inspector">
        <div className="inspector-header">Highlight</div>
        <div className="inspector-body">
          <label>Color
            <input
              type="color"
              value={selected.color || '#ffff00'}
              onChange={e => updateElement(selected.id, { color: e.target.value })}
              onKeyDown={e => e.stopPropagation()}
            />
          </label>
          <label>Opacity
            <div className="range-row">
              <input
                type="range" min="0" max="1" step="0.05"
                value={selected.opacity ?? 0.3}
                onChange={e => updateElement(selected.id, { opacity: parseFloat(e.target.value) })}
                onKeyDown={e => e.stopPropagation()}
              />
              <span>{Math.round((selected.opacity ?? 0.3) * 100)}%</span>
            </div>
          </label>
          <VisibilityControls
            visibility={selected.visibility}
            duration={getDuration(elements)}
            onChange={v => updateElement(selected.id, { visibility: v })}
          />
        </div>
        <div className="inspector-footer">
          <span className="inspector-id">id: {selected.id}</span>
        </div>
      </div>
    );
  }

  if (selected.type === 'football') {
    return (
      <div className="inspector">
        <div className="inspector-header">Football</div>
        <div className="inspector-body">
          <FootballInspector
            football={selected}
            elements={elements}
            allPlayers={allPlayers}
          />
        </div>
        <div className="inspector-footer">
          <span className="inspector-id">id: {selected.id}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="inspector">
      <div className="inspector-header">
        {selected.type === 'player' ? 'Player' : 'Route'} Properties
      </div>

      {selected.type === 'player' && (
        <div className="inspector-body">
          <label>Label
            <input
              type="text"
              value={selected.label || ''}
              maxLength={3}
              onChange={e => handleChange('label', e.target.value)}
            />
          </label>
          <label>Color</label>
          <div className="color-btn-row">
            {palette.map(({ fill, label }, i) => (
              <button
                key={i}
                className={`color-btn ${activeIndex === i ? 'color-btn-active' : ''}`}
                style={{ background: fill }}
                onClick={() => setColorIndex(i)}
                title={fill}
              >
                <span style={{ color: label, fontWeight: 900, fontSize: 11 }}>X</span>
              </button>
            ))}
          </div>
          <label>Shape
            <select
              value={selected.style?.shape || 'circle'}
              onChange={e => handleStyleChange('shape', e.target.value)}
            >
              <option value="circle">Circle</option>
              <option value="square">Square</option>
            </select>
          </label>
          <label>Route
            <select
              value={selected.routeId || 'none'}
              onChange={e => {
                if (e.target.value === 'none') unlinkPlayerFromRoute(selected.id);
                else linkPlayerToRoute(selected.id, e.target.value);
              }}
              onKeyDown={e => e.stopPropagation()}
            >
              <option value="none">— None —</option>
              {allPaths
                .filter(p => !p.playerId || p.playerId === selected.id)
                .map(p => (
                  <option key={p.id} value={p.id}>Route {allPaths.indexOf(p) + 1}</option>
                ))}
            </select>
          </label>
        </div>
      )}

      {selected.type === 'path' && (
        <div className="inspector-body">
          <label>{activeSegColorId ? `Color — Seg ${(selected.segments?.findIndex(s => s.id === activeSegColorId) ?? 0) + 1}` : 'Color'}</label>
          <div className={`color-btn-row${activeSegColorId ? ' seg-color-active' : ''}`}>
            {palette.map(({ fill }, i) => (
              <button
                key={i}
                className={`color-btn ${paletteActiveIndex === i ? 'color-btn-active' : ''}`}
                style={{ background: fill }}
                onClick={() => {
                  if (activeSegColorId) {
                    updateSegment(selected.id, activeSegColorId, { colorIndex: i });
                    setActiveSegColorId(null);
                  } else {
                    setColorIndex(i);
                  }
                }}
                title={fill}
              />
            ))}
          </div>
          <label>Thickness
            <div className="range-row">
              <input
                type="range" min="1" max="12"
                value={selected.style?.thickness || 3}
                onChange={e => handleStyleChange('thickness', parseInt(e.target.value))}
              />
              <input
                type="number" min="1" max="12" step="1"
                value={selected.style?.thickness || 3}
                onChange={e => {
                  const v = parseInt(e.target.value);
                  if (!isNaN(v)) handleStyleChange('thickness', Math.max(1, Math.min(12, v)));
                }}
                onKeyDown={e => e.stopPropagation()}
              />
            </div>
          </label>
          <div className="check-pair-row">
            <label className="check-row">
              <input
                type="checkbox"
                checked={selected.style?.lineStyle === 'dash'}
                onChange={e => handleStyleChange('lineStyle', e.target.checked ? 'dash' : 'solid')}
                onKeyDown={e => e.stopPropagation()}
              />
              Dash
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={selected.style?.lineStyle === 'dotted'}
                onChange={e => handleStyleChange('lineStyle', e.target.checked ? 'dotted' : 'solid')}
                onKeyDown={e => e.stopPropagation()}
              />
              Dotted
            </label>
          </div>
          <div className="check-pair-row">
            <label className="check-row">
              <input
                type="checkbox"
                checked={selected.style?.endArrow !== false}
                onChange={e => updateElement(selected.id, { style: { ...selected.style, endArrow: e.target.checked, endT: false } })}
                onKeyDown={e => e.stopPropagation()}
              />
              Arrow
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={!!selected.style?.endT}
                onChange={e => updateElement(selected.id, { style: { ...selected.style, endT: e.target.checked, endArrow: false } })}
                onKeyDown={e => e.stopPropagation()}
              />
              T-End
            </label>
          </div>
          {selected.segments?.length > 0 && (
            <div className="inspector-segments">
              <div className="inspector-segments-label">Segments</div>
              {selected.segments.map((seg, i) => (
                <div key={seg.id} className="inspector-segment-row">
                  <div className="seg-row-header">
                    <button
                      className={`seg-label-btn${activeSegColorId === seg.id ? ' seg-label-btn-active' : ''}`}
                      onClick={() => setActiveSegColorId(id => id === seg.id ? null : seg.id)}
                    >
                      Seg {i + 1}
                    </button>
                    <button
                      className={`seg-presnap-btn ${seg.preSnap ? 'active' : ''}`}
                      onClick={() => updateSegment(selected.id, seg.id, { preSnap: !seg.preSnap })}
                    >
                      {seg.preSnap ? 'Pre-snap ✓' : 'Pre-snap'}
                    </button>
                  </div>
                  <div className="range-row">
                    <input
                      type="range" min="0.1" max="3.0" step="0.1"
                      value={seg.duration ?? 0.5}
                      onChange={e => updateSegment(selected.id, seg.id, { duration: parseFloat(e.target.value) })}
                      onKeyDown={e => e.stopPropagation()}
                    />
                    <input
                      type="number" min="0.1" max="3.0" step="0.1"
                      value={seg.duration ?? 0.5}
                      onChange={e => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v)) updateSegment(selected.id, seg.id, { duration: Math.max(0.1, Math.min(3.0, v)) });
                      }}
                      onWheel={e => {
                        e.preventDefault();
                        const cur = seg.duration ?? 0.5;
                        const delta = e.deltaY < 0 ? 0.1 : -0.1;
                        const next = Math.max(0.1, Math.min(3.0, Math.round((cur + delta) * 10) / 10));
                        updateSegment(selected.id, seg.id, { duration: next });
                      }}
                      onKeyDown={e => e.stopPropagation()}
                    />
                  </div>
                </div>
              ))}

            </div>
          )}
          {(() => {
            const linkedPlayer = selected.playerId
              ? elements.find(el => el.id === selected.playerId)
              : null;
            const playerIndex = linkedPlayer ? allPlayers.indexOf(linkedPlayer) : -1;
            return (
              <div className="inspector-link-row">
                <span className="inspector-link-label">
                  Player: {linkedPlayer ? `Player ${playerIndex + 1}` : 'None'}
                </span>
                {linkedPlayer && (
                  <button
                    className="seg-label-btn"
                    onClick={() => unlinkPlayerFromRoute(selected.playerId)}
                    onKeyDown={e => e.stopPropagation()}
                  >
                    Unlink
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      )}

      <div className="inspector-footer">
        <span className="inspector-id">id: {selected.id}</span>
      </div>
    </div>
  );
}
