import './Toolbox.css';
import useEditorStore from '../../store/useEditorStore';
import { TOOL_MODES } from '../../constants/toolModes';

const TOOLS = [
  { mode: TOOL_MODES.SELECT,            label: '↖', title: 'Select / Move' },
  { mode: TOOL_MODES.ADD_PLAYER,        label: '●', title: 'Add Player' },
  { mode: TOOL_MODES.ADD_LINE_STRAIGHT, label: '╱', title: 'Draw Straight Route' },
  { mode: TOOL_MODES.ADD_LINE_CURVE,    label: '⌒', title: 'Draw Curved Route' },
];

export default function Toolbox() {
  const { activeTool, setActiveTool } = useEditorStore();
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
    </div>
  );
}
