import useEditorStore from '../../store/useEditorStore';
import PlayThumbnail from '../PlayThumbnail/PlayThumbnail';
import './PrintMode.css';

const TOTAL_SLOTS = 20;

export default function PrintSheet() {
  const { printQueue, printFormat, printSize } = useEditorStore();

  const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => printQueue[i] || null);
  const sizeClass = `print-card-${printSize}`;

  return (
    <div className="print-sheet-wrapper">
      <div className={`print-card-grid print-grid-${printSize}`}>
        {slots.map((item, i) => (
          <div
            key={i}
            className={`print-card ${sizeClass} ${!item ? 'print-card-empty' : ''}`}
          >
            {item && (
              <>
                <span className="print-card-num">{i + 1}</span>
                {printFormat === 'plays' ? (
                  <>
                    <div className="print-card-diagram">
                      <PlayThumbnail
                        elements={item.elements}
                        width={108}
                        height={printSize === 'adult' ? 86 : 72}
                      />
                    </div>
                    <div className="print-card-label">{item.name}</div>
                  </>
                ) : (
                  <div className="print-card-text">
                    {item.formationName && (
                      <div className="print-card-formation">{item.formationName}</div>
                    )}
                    <div className="print-card-playname">{item.name}</div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
