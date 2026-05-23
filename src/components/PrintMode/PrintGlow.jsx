// TFM Playbook — Football Play Editor
// Copyright (C) 2024–2026 Christopher Campbell / Tech Freedom Ministries
// Licensed under the Business Source License 1.1
// See LICENSE file in the project root for full terms.
// Commercial use prohibited without written permission from the Licensor.
import useUIStore from '../../store/useUIStore';
import './PrintMode.css';

export default function PrintGlow() {
  const printModeActive = useUIStore(s => s.printModeActive);
  if (!printModeActive) return null;
  return <div className="print-glow" aria-hidden="true" />;
}
