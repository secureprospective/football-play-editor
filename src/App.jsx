import './App.css';
import Toolbar   from './components/Toolbar/Toolbar';
import Toolbox   from './components/Toolbox/Toolbox';
import Inspector from './components/Inspector/Inspector';
import FieldCanvas from './components/Stage/FieldCanvas';

function App() {
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

export default App;
