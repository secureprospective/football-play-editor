import './Inspector.css';
import useEditorStore from '../../store/useEditorStore';

const THEME_PALETTES = {
  'theme-sun-cyan': [
    { fill: '#00e5ff', label: '#000000' },
    { fill: '#ffffff', label: '#000000' },
    { fill: '#ffd600', label: '#000000' },
    { fill: '#ff4444', label: '#ffffff' },
  ],
  'theme-sun-orange': [
    { fill: '#ff6a00', label: '#000000' },
    { fill: '#ffffff', label: '#000000' },
    { fill: '#ffd600', label: '#000000' },
    { fill: '#00e676', label: '#000000' },
  ],
  'theme-paper-overcast': [
    { fill: '#1565c0', label: '#ffffff' },
    { fill: '#b71c1c', label: '#ffffff' },
    { fill: '#1b5e20', label: '#ffffff' },
    { fill: '#4a148c', label: '#ffffff' },
  ],
  'theme-paper-newsprint': [
    { fill: '#bf360c', label: '#ffffff' },
    { fill: '#0d47a1', label: '#ffffff' },
    { fill: '#1a237e', label: '#ffffff' },
    { fill: '#33691e', label: '#ffffff' },
  ],
};

export default function Inspector() {
  const { getActivePlay, selectedId, updateElement, updateSegment, theme } = useEditorStore();
  const elements = getActivePlay()?.elements || [];
  const selected = elements.find(el => el.id === selectedId);
  const palette = THEME_PALETTES[theme] || THEME_PALETTES['theme-sun-cyan'];

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
    updateElement(selected.id, {
      style: { ...selected.style, colorIndex: index },
    });
  }

  const activeIndex = selected.style?.colorIndex ?? -1;

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
        </div>
      )}

      {selected.type === 'path' && (
        <div className="inspector-body">
          <label>Color</label>
          <div className="color-btn-row">
            {palette.map(({ fill }, i) => (
              <button
                key={i}
                className={`color-btn ${activeIndex === i ? 'color-btn-active' : ''}`}
                style={{ background: fill }}
                onClick={() => setColorIndex(i)}
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
