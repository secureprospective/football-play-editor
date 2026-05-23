import './Toolbox.css';
import useUIStore from '../../store/useUIStore';
import { TOOL_MODES } from '../../constants/toolModes';
import { triggerHaptic } from '../../utils/haptics';

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
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 19.5L19.5 4.5M19.5 4.5L8.25 4.5M19.5 4.5V15.75" />
  </svg>
);

const IconPlayer = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2.25C6.61522 2.25 2.25 6.61522 2.25 12C2.25 17.3848 6.61522 21.75 12 21.75C17.3848 21.75 21.75 17.3848 21.75 12C21.75 6.61522 17.3848 2.25 12 2.25ZM10.2803 9.21967C9.98744 8.92678 9.51256 8.92678 9.21967 9.21967C8.92678 9.51256 8.92678 9.98744 9.21967 10.2803L10.9393 12L9.21967 13.7197C8.92678 14.0126 8.92678 14.4874 9.21967 14.7803C9.51256 15.0732 9.98744 15.0732 10.2803 14.7803L12 13.0607L13.7197 14.7803C14.0126 15.0732 14.4874 15.0732 14.7803 14.7803C15.0732 14.4874 15.0732 14.0126 14.7803 13.7197L13.0607 12L14.7803 10.2803C15.0732 9.98744 15.0732 9.51256 14.7803 9.21967C14.4874 8.92678 14.0126 8.92678 13.7197 9.21967L12 10.9393L10.2803 9.21967Z" />
  </svg>
);

const IconCurveRoute = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 9L15 3M15 3L21 9M15 3L15 15C15 18.3137 12.3137 21 9 21C5.68629 21 3 18.3137 3 15L3 12" />
  </svg>
);

const IconFootball = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M12,2 C22,2 22,22 12,22 C2,22 2,2 12,2 Z" transform="rotate(35 12 12)" />
  </svg>
);

const IconText = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.25 12.7593C2.25 14.3604 3.37341 15.754 4.95746 15.987C6.04357 16.1467 7.14151 16.27 8.25 16.3556V21L12.326 16.924C12.6017 16.6483 12.9738 16.4919 13.3635 16.481C15.2869 16.4274 17.1821 16.2606 19.0425 15.9871C20.6266 15.7542 21.75 14.3606 21.75 12.7595V6.74056C21.75 5.13946 20.6266 3.74583 19.0425 3.51293C16.744 3.17501 14.3926 3 12.0003 3C9.60776 3 7.25612 3.17504 4.95747 3.51302C3.37342 3.74593 2.25 5.13956 2.25 6.74064V12.7593Z" />
  </svg>
);

const IconHighlight = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13.77 3.043a34 34 0 0 0-3.54 0" />
    <path d="M13.771 20.956a33 33 0 0 1-3.541.001" />
    <path d="M20.18 17.74c-.51 1.15-1.29 1.93-2.439 2.44" />
    <path d="M20.18 6.259c-.51-1.148-1.291-1.929-2.44-2.438" />
    <path d="M20.957 10.23a33 33 0 0 1 0 3.54" />
    <path d="M3.043 10.23a34 34 0 0 0 .001 3.541" />
    <path d="M6.26 20.179c-1.15-.508-1.93-1.29-2.44-2.438" />
    <path d="M6.26 3.82c-1.149.51-1.93 1.291-2.44 2.44" />
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
  const { activeTool, setActiveTool, theme, setTheme } = useUIStore();

  return (
    <div className="toolbox">
      {TOOLS.map(tool => (
        <button
          key={tool.mode}
          className={`tool-btn ${activeTool === tool.mode ? 'active' : ''}`}
          onPointerDown={triggerHaptic}
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
