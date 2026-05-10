import './Inspector.css';
import useEditorStore from '../../store/useEditorStore';

export default function Inspector() {
  const { getActivePlay, selectedId, updateElement, updateSegment } = useEditorStore();
  const elements = getActivePlay()?.elements || [];
  const selected = elements.find(el => el.id === selectedId);

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
          <label>Fill Color
            <input
              type="color"
              value={selected.style?.fill || '#e94560'}
              onChange={e => handleStyleChange('fill', e.target.value)}
            />
          </label>
          <label>Stroke Color
            <input
              type="color"
              value={selected.style?.stroke || '#ffffff'}
              onChange={e => handleStyleChange('stroke', e.target.value)}
            />
          </label>
          <label>Shape
            <select
              value={selected.style?.shape || 'circle'}
              onChange={e => handleStyleChange('shape', e.target.value)}
            >
              <option value="circle">Circle</option>
              <option value="square">Square</option>
            </select>
          </label>
        </div>
      )}

      {selected.type === 'path' && (
        <div className="inspector-body">
          <label>Stroke Color
            <input
              type="color"
              value={selected.style?.stroke || '#ffffff'}
              onChange={e => handleStyleChange('stroke', e.target.value)}
            />
          </label>
          <label>Thickness
            <div className="range-row">
              <input
                type="range" min="1" max="12"
                value={selected.style?.thickness || 3}
                onChange={e => handleStyleChange('thickness', parseInt(e.target.value))}
              />
              <span>{selected.style?.thickness || 3}px</span>
            </div>
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={selected.style?.dash || false}
              onChange={e => handleStyleChange('dash', e.target.checked)}
            />
            Dashed Line
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={selected.style?.endArrow !== false}
              onChange={e => handleStyleChange('endArrow', e.target.checked)}
            />
            End Arrow
          </label>
          {selected.segments?.length > 0 && (
            <div className="inspector-segments">
              <div className="inspector-segments-label">Segments</div>
              {selected.segments.map((seg, i) => (
                <div key={seg.id} className="inspector-segment-row">
                  <span className="seg-label">
                    {seg.curve ? '⌒' : '╱'} Seg {i + 1}
                    {seg.preSnap ? ' · Pre-snap' : ''}
                  </span>
                  <button
                    className={`seg-presnap-btn ${seg.preSnap ? 'active' : ''}`}
                    onClick={() => updateSegment(selected.id, seg.id, { preSnap: !seg.preSnap })}
                  >
                    {seg.preSnap ? 'Pre-snap ✓' : 'Pre-snap'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="inspector-footer">
        <span className="inspector-id">id: {selected.id}</span>
      </div>
    </div>
  );
}
