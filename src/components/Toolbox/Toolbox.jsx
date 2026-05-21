import './Toolbox.css';
import useEditorStore from '../../store/useEditorStore';
import { TOOL_MODES } from '../../constants/toolModes';

const THEMES = [
  { id: 'theme-sun-cyan',        dot: '#00e5ff', title: 'Sun — Cyan'        },
  { id: 'theme-sun-orange',      dot: '#ff6a00', title: 'Sun — Orange'      },
  { id: 'theme-paper-overcast',  dot: '#059669', title: 'Paper — Overcast'  },
  { id: 'theme-paper-newsprint', dot: '#dc2626', title: 'Paper — Newsprint' },
];

const IconHand = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15.0423 21.6718L13.6835 16.6007M13.6835 16.6007L11.1741 18.826L11.7425 9.35623L16.9697 17.2731L13.6835 16.6007ZM12 2.25V4.5M17.8336 4.66637L16.2426 6.25736M20.25 10.5H18M7.75736 14.7426L6.16637 16.3336M6 10.5H3.75M7.75736 6.25736L6.16637 4.66637" />
  </svg>
);

const IconStraightRoute = () => (
  <svg viewBox="0 0 24 24" width="22" height="22">
    <line x1="5" y1="20" x2="18" y2="7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <polygon points="18,7 16.2,13.7 11.3,8.8" fill="currentColor" />
  </svg>
);

const IconPlayer = () => (
  <svg viewBox="0 0 24 24" width="22" height="22">
    <circle cx="12" cy="12" r="9" fill="currentColor" />
  </svg>
);

const IconCurveRoute = () => (
  <svg viewBox="0 0 24 24" width="22" height="22">
    <path d="M 12,21 Q 3,14 12,12 Q 21,10 12,3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <polygon points="12,3 18.9,3.9 14.6,9.4" fill="currentColor" />
  </svg>
);

const IconFootball = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M12,2 C22,2 22,22 12,22 C2,22 2,2 12,2 Z" transform="rotate(35 12 12)" />
  </svg>
);

const IconText = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="12" y1="6" x2="12" y2="20" />
  </svg>
);

const IconHighlight = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" strokeDasharray="3.5 2.5" />
  </svg>
);

const TOOLS = [
  { mode: TOOL_MODES.SELECT,            label: <IconHand />,          title: 'Select / Move'      },
  { mode: TOOL_MODES.BOX_SELECT,        label: '⬚',                   title: 'Box Select'         },
  { mode: TOOL_MODES.ADD_PLAYER,        label: <IconPlayer />,        title: 'Add Player'         },
  { mode: TOOL_MODES.ADD_LINE_STRAIGHT, label: <IconStraightRoute />, title: 'Draw Straight Route'},
  { mode: TOOL_MODES.ADD_LINE_CURVE,    label: <IconCurveRoute />,    title: 'Draw Curved Route'  },
  { mode: TOOL_MODES.ADD_FOOTBALL,      label: <IconFootball />,      title: 'Place Football'     },
  { mode: TOOL_MODES.ADD_TEXT,          label: <IconText />,          title: 'Add Text'           },
  { mode: TOOL_MODES.ADD_HIGHLIGHT,     label: <IconHighlight />,     title: 'Add Highlight'      },
];

export default function Toolbox() {
  const { activeTool, setActiveTool, theme, setTheme } = useEditorStore();

  return (
    <div className="toolbox">
      {TOOLS.map(tool => (
        <button
          key={tool.mode}
          className={`tool-btn ${activeTool === tool.mode ? 'active' : ''}`}
          onClick={() => setActiveTool(tool.mode)}
          title={tool.title}
        >
          {tool.label}
        </button>
      ))}

      <div className="toolbox-theme-group">
        {THEMES.map(t => (
          <button
            key={t.id}
            className="toolbox-dot"
            onClick={() => setTheme(t.id)}
            title={t.title}
            style={{ '--dot': t.dot }}
            aria-pressed={theme === t.id}
          />
        ))}
      </div>
    </div>
  );
}
