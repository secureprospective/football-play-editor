// TFM Playbook — Football Play Editor
// Copyright (C) 2024–2026 Christopher Campbell / Tech Freedom Ministries
// Licensed under the Business Source License 1.1
// See LICENSE file in the project root for full terms.
// Commercial use prohibited without written permission from the Licensor.
import { create } from 'zustand';
import { DEFAULT_TOOL } from '../constants/toolModes';
import { FIELD_CONFIG } from '../constants/fieldConfig';
import useDataStore from './useDataStore';

const THEME_KEY   = 'football_theme_v1';
const DEFAULT_THEME = 'theme-sun-cyan';

const useUIStore = create((set, get) => ({

  // --- Active Tool ---
  activeTool: DEFAULT_TOOL,
  setActiveTool: (tool) => set({ activeTool: tool, }),

  // --- Drawing State ---
  drawingPath: null,
  activePathId: null,

  setDrawingPath:  (path) => set({ drawingPath: path }),
  setActivePathId: (id)   => set({ activePathId: id }),

  finishDrawing: () => {
    const { drawingPath, activePathId } = get();
    if (!drawingPath) return;

    const ds = useDataStore.getState();

    if (activePathId) {
      // Adding segments to an existing path (branch/continue)
      const play = ds.getActivePlay();
      const existingPath = play?.elements.find(el => el.id === activePathId);
      if (existingPath && drawingPath.segments.length > 0) {
        ds.updateElement(activePathId, {
          segments: [...existingPath.segments, ...drawingPath.segments],
        });
        ds.pushHistory();
      }
      set({ drawingPath: null, activePathId: null });
      ds.setSelectedId(activePathId);
    } else {
      // Normal new path
      if (drawingPath.segments.length > 0) {
        ds.addElement(drawingPath);
        ds.setSelectedId(drawingPath.id);
      }
      set({ drawingPath: null, activePathId: null });
    }
    set({ activeTool: DEFAULT_TOOL });
  },

  cancelDrawing: () => {
    set({ drawingPath: null, activePathId: null });
  },

  // --- Snap ---
  snapEnabled: true,
  snapIncrement: FIELD_CONFIG.SNAP_HALF_YARD,
  setSnapEnabled: (val) => set({ snapEnabled: val }),
  setSnapIncrement: (val) => set({ snapIncrement: val }),

  // --- Field Visibility ---
  scrimmageVisible: true,
  toggleScrimmage: () => set(state => ({ scrimmageVisible: !state.scrimmageVisible })),

  // --- Present Mode ---
  presentMode: false,
  togglePresentMode: () => set(state => ({ presentMode: !state.presentMode })),

  // --- Print Mode ---
  printModeActive: false,
  printQueue: [],
  printFormat: 'plays',
  printSize: 'adult',

  togglePrintMode: () => set(state => ({
    printModeActive: !state.printModeActive,
    printQueue: [],
  })),

  togglePrintQueueItem: (item) => set(state => {
    const exists = state.printQueue.find(q => q.playId === item.playId);
    if (exists) return { printQueue: state.printQueue.filter(q => q.playId !== item.playId) };
    if (state.printQueue.length >= 20) return {};
    const { playId, formationId, playbookId, name } = item;
    return { printQueue: [...state.printQueue, { playId, formationId, playbookId, name }] };
  }),

  reorderPrintQueue: (newQueue) => set({ printQueue: newQueue }),
  clearPrintQueue:   () => set({ printQueue: [] }),
  setPrintFormat:    (format) => set({ printFormat: format }),
  setPrintSize:      (size)   => set({ printSize: size }),

  // --- Theme ---
  theme: localStorage.getItem(THEME_KEY) || DEFAULT_THEME,
  setTheme: (name) => { localStorage.setItem(THEME_KEY, name); set({ theme: name }); },

}));

export default useUIStore;
