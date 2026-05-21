import useEditorStore from '../../store/useEditorStore';
import './PrintMode.css';

export default function PrintGlow() {
  const printModeActive = useEditorStore(s => s.printModeActive);
  if (!printModeActive) return null;
  return <div className="print-glow" aria-hidden="true" />;
}
