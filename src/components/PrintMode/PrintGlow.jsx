import useUIStore from '../../store/useUIStore';
import './PrintMode.css';

export default function PrintGlow() {
  const printModeActive = useUIStore(s => s.printModeActive);
  if (!printModeActive) return null;
  return <div className="print-glow" aria-hidden="true" />;
}
