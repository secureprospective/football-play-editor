import './App.css';
import useEditorStore from './store/useEditorStore';
import { VIEW_MODES } from './constants/toolModes';
import PlaybookView  from './views/PlaybookView';
import FormationView from './views/FormationView';
import PlayView      from './views/PlayView';
import Toolbar       from './components/Toolbar/Toolbar';
import Toolbox       from './components/Toolbox/Toolbox';
import Inspector     from './components/Inspector/Inspector';
import FieldCanvas   from './components/Stage/FieldCanvas';

export default function App() {
  const { viewMode, presentMode, togglePresentMode } = useEditorStore();
  const isFieldView = viewMode === VIEW_MODES.FIELD;

  if (!isFieldView) {
    return (
      <div className="app-shell-nav">
        {viewMode === VIEW_MODES.PLAYBOOK  && <PlaybookView />}
        {viewMode === VIEW_MODES.FORMATION && <FormationView />}
        {viewMode === VIEW_MODES.PLAY      && <PlayView />}
      </div>
    );
  }

  if (presentMode) {
    return (
      <div className="app-shell-present">
        <FieldCanvas />
        <button
          className="present-exit-btn"
          onClick={togglePresentMode}
          title="Exit Present Mode"
        >
          ✏️
        </button>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="toolbar-area">
        <Toolbar />
      </div>
      <div className="toolbox-area">
        <Toolbox />
      </div>
      <div className="stage-area">
        <FieldCanvas />
      </div>
      <div className="inspector-area">
        <Inspector />
      </div>
    </div>
  );
}
