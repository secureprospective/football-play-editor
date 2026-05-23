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

  // Arc drawing mode — set when the coach is drawing a pass/toss flight path.
  // arcDrawingForEventId: the journey eventId this arc belongs to
  // arcDrawingFootballId: the football element that owns the event
  arcDrawingForEventId: null,
  arcDrawingFootballId: null,

  setDrawingPath:  (path) => set({ drawingPath: path }),
  setActivePathId: (id)   => set({ activePathId: id }),

  // Enter arc drawing mode: switches tool to straight line so coach can draw immediately.
  setArcDrawingMode: (footballId, eventId) => {
    set({
      arcDrawingForEventId: eventId,
      arcDrawingFootballId: footballId,
      activeTool: 'ADD_LINE_STRAIGHT',
    });
  },

  finishDrawing: () => {
    const { drawingPath, activePathId, arcDrawingForEventId, arcDrawingFootballId } = get();
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

    } else if (arcDrawingForEventId && arcDrawingFootballId) {
      // Arc mode: add the path, then link it to the journey event.
      // Use updateElement (no extra pushHistory) so the whole op is one undo step.
      if (drawingPath.segments.length > 0) {
        ds.addElement(drawingPath);  // adds path + pushes history
        // Link arcPathId without a second history push
        const play = ds.getActivePlay();
        const football = play?.elements.find(el => el.id === arcDrawingFootballId);
        if (football) {
          const events = (football.journey?.events || []).map(evt =>
            evt.id === arcDrawingForEventId ? { ...evt, arcPathId: drawingPath.id } : evt
          );
          ds.updateElement(arcDrawingFootballId, { journey: { ...football.journey, events } });
        }
      }
      set({ drawingPath: null, activePathId: null, arcDrawingForEventId: null, arcDrawingFootballId: null });
      ds.setSelectedId(arcDrawingFootballId);  // return focus to football

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
    const { arcDrawingFootballId } = get();
    set({ drawingPath: null, activePathId: null, arcDrawingForEventId: null, arcDrawingFootballId: null });
    // Re-select the football so the inspector stays on it
    if (arcDrawingFootballId) {
      useDataStore.getState().setSelectedId(arcDrawingFootballId);
    }
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
    return { printQueue: [...state.printQueue, item] };
  }),

  reorderPrintQueue: (newQueue) => set({ printQueue: newQueue }),
  clearPrintQueue:   () => set({ printQueue: [] }),
  setPrintFormat:    (format) => set({ printFormat: format }),
  setPrintSize:      (size)   => set({ printSize: size }),

  // --- Theme (Option A: persists via localStorage, not in data store) ---
  theme: localStorage.getItem(THEME_KEY) || DEFAULT_THEME,
  setTheme: (name) => { localStorage.setItem(THEME_KEY, name); set({ theme: name }); },

}));

export default useUIStore;
