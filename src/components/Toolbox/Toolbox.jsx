import './Toolbox.css';
import useEditorStore from '../../store/useEditorStore';
import { TOOL_MODES } from '../../constants/toolModes';

const THEMES = [
  { id: 'theme-sun-cyan',        dot: '#00e5ff', title: 'Sun — Cyan'        },
  { id: 'theme-sun-orange',      dot: '#ff6a00', title: 'Sun — Orange'      },
  { id: 'theme-paper-overcast',  dot: '#059669', title: 'Paper — Overcast'  },
  { id: 'theme-paper-newsprint', dot: '#dc2626', title: 'Paper — Newsprint' },
];

const TOOLS = [
  { mode: TOOL_MODES.SELECT,            label: '↖', title: 'Select / Move'       },
  { mode: TOOL_MODES.ADD_PLAYER,        label: '●', title: 'Add Player'           },
  { mode: TOOL_MODES.ADD_LINE_STRAIGHT, label: '╱', title: 'Draw Straight Route'  },
  { mode: TOOL_MODES.ADD_LINE_CURVE,    label: '⌒', title: 'Draw Curved Route'    },
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
            className="tb-theme-dot"
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
