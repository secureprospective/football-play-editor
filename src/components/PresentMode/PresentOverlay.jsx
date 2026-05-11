import { useState } from 'react';
import useEditorStore from '../../store/useEditorStore';
import './PresentOverlay.css';

export default function PresentOverlay() {
  const { getActivePlay, getActiveFormation, togglePresentMode } = useEditorStore();

  const play      = getActivePlay();
  const formation = getActiveFormation();

  const defaultText = formation && play
    ? `${formation.name} - ${play.name}`
    : '';

  const [text, setText] = useState(defaultText);

  if (!play) return null;

  return (
    <div className="present-overlay">
      <div className="present-overlay-inner">
        <input
          className="present-input"
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
        />
      </div>
      <button className="present-exit-btn" onClick={togglePresentMode}>
        EDIT
      </button>
    </div>
  );
}
