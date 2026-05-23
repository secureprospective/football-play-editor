import useUIStore from '../../store/useUIStore';
import PlayThumbnail from '../PlayThumbnail/PlayThumbnail';
import './PrintMode.css';

function DiagramCard({ chunk, offset }) {
  return (
    <div className="wristband-card wristband-card-diagram">
      <div className="play-block-grid">
        {chunk.map((item, i) => (
          <div key={i} className="play-block">
            <div className="play-block-header">
              {item ? offset + i + 1 : ''}
            </div>
            <div className="play-block-diagram">
              {item && (
                <PlayThumbnail
                  elements={item.elements}
                  width={150}
                  height={120}
                  bgColor="#ffffff"
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DiagramSheet({ printQueue }) {
  const filled = Array.from({ length: 20 }, (_, i) => printQueue[i] || null);
  const chunks = [];
  for (let i = 0; i < 20; i += 8) {
    const chunk = filled.slice(i, i + 8);
    if (chunk.some(s => s !== null)) chunks.push({ chunk, offset: i });
  }
  if (chunks.length === 0) chunks.push({ chunk: Array(8).fill(null), offset: 0 });

  return (
    <>
      {chunks.map(({ chunk, offset }, pageIdx) => (
        <div
          key={pageIdx}
          className={`print-page${pageIdx < chunks.length - 1 ? ' print-page-break' : ''}`}
        >
          {[0, 1, 2, 3].map(copy => (
            <DiagramCard key={copy} chunk={chunk} offset={offset} />
          ))}
        </div>
      ))}
    </>
  );
}

function TextCard({ slots }) {
  const left  = slots.slice(0, 10);
  const right = slots.slice(10, 20);

  return (
    <div className="wristband-card wristband-card-text">
      <div className="text-card-body">
        <div className="text-card-column">
          <div className="text-card-header">
            <span className="text-card-hnum">#</span>
            <span className="text-card-hname">PLAY</span>
          </div>
          {left.map((item, i) => (
            <div key={i} className={`text-card-row${i % 2 === 0 ? ' text-card-row-alt' : ''}`}>
              <span className="text-card-rnum">{i + 1}</span>
              <span className="text-card-rname">{item?.name || ''}</span>
            </div>
          ))}
        </div>
        <div className="text-card-divider" />
        <div className="text-card-column">
          <div className="text-card-header">
            <span className="text-card-hnum">#</span>
            <span className="text-card-hname">PLAY</span>
          </div>
          {right.map((item, i) => (
            <div key={i} className={`text-card-row${i % 2 === 0 ? ' text-card-row-alt' : ''}`}>
              <span className="text-card-rnum">{i + 11}</span>
              <span className="text-card-rname">{item?.name || ''}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TextSheet({ printQueue }) {
  const slots = Array.from({ length: 20 }, (_, i) => printQueue[i] || null);
  return (
    <div className="print-page">
      <TextCard slots={slots} />
      <TextCard slots={slots} />
      <TextCard slots={slots} />
      <TextCard slots={slots} />
    </div>
  );
}

export default function PrintSheet() {
  const { printQueue, printFormat } = useUIStore();
  return (
    <div className="print-sheet-wrapper">
      {printFormat === 'text'
        ? <TextSheet printQueue={printQueue} />
        : <DiagramSheet printQueue={printQueue} />
      }
    </div>
  );
}
