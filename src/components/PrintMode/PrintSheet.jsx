import useEditorStore from '../../store/useEditorStore';
import PlayThumbnail from '../PlayThumbnail/PlayThumbnail';
import './PrintMode.css';

const TOTAL_SLOTS = 20;

function TextSheet({ slots }) {
  const left  = slots.slice(0, 10);
  const right = slots.slice(10, 20);

  const renderColumn = (col, offset) => (
    <div className="print-text-column">
      <div className="print-text-header">
        <span className="print-text-hnum">#</span>
        <span className="print-text-hname">Play</span>
      </div>
      {col.map((item, i) => (
        <div key={i} className="print-text-row">
          <span className="print-text-rnum">{offset + i + 1}</span>
          <span className="print-text-rname">{item?.name || ''}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="print-text-sheet">
      {renderColumn(left, 0)}
      <div className="print-text-divider" />
      {renderColumn(right, 10)}
    </div>
  );
}

export default function PrintSheet() {
  const { printQueue, printFormat, printSize } = useEditorStore();

  const slots    = Array.from({ length: TOTAL_SLOTS }, (_, i) => printQueue[i] || null);
  const sizeClass = `print-card-${printSize}`;

  return (
    <div className="print-sheet-wrapper">
      {printFormat === 'text' ? (
        <TextSheet slots={slots} />
      ) : (
        <div className={`print-card-grid print-grid-${printSize}`}>
          {slots.map((item, i) => (
            <div
              key={i}
              className={`print-card ${sizeClass} ${!item ? 'print-card-empty' : ''}`}
            >
              {item && (
                <>
                  <div className="print-card-num-bar">{i + 1}</div>
                  <div className="print-card-diagram">
                    <PlayThumbnail
                      elements={item.elements}
                      width={300}
                      height={200}
                      bgColor="#ffffff"
                    />
                  </div>
                  <div className="print-card-label">{item.name}</div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
