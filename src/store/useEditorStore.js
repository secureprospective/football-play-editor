import { create } from 'zustand';
import { DEFAULT_TOOL } from '../constants/toolModes';

const MAX_HISTORY = 50;

const useEditorStore = create((set, get) => ({

  activeTool: DEFAULT_TOOL,
  setActiveTool: (tool) => set({ activeTool: tool }),

  elements: [],

  selectedId: null,
  setSelectedId: (id) => set({ selectedId: id }),
  clearSelection: () => set({ selectedId: null }),

  snapEnabled: true,
  snapIncrement: 7.5,
  setSnapEnabled: (val) => set({ snapEnabled: val }),
  setSnapIncrement: (val) => set({ snapIncrement: val }),

  // --- Drawing State (moved from FieldCanvas so Toolbar can see it) ---
  drawingPath: null,
  setDrawingPath: (path) => set({ drawingPath: path }),

  finishDrawing: () => {
    const { drawingPath, addElement, setSelectedId } = get();
    if (!drawingPath) return;
    if (drawingPath.points.length >= 2) {
      addElement(drawingPath);
      setSelectedId(drawingPath.id);
    }
    set({ drawingPath: null });
  },

  cancelDrawing: () => set({ drawingPath: null }),

  // --- History ---
  history: [],
  historyIndex: -1,

  pushHistory: () => {
    const { elements, history, historyIndex } = get();
    const trimmed = history.slice(0, historyIndex + 1);
    const snapshot = JSON.parse(JSON.stringify(elements));
    const next = [...trimmed, snapshot].slice(-MAX_HISTORY);
    set({ history: next, historyIndex: next.length - 1 });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];
    set({
      elements: JSON.parse(JSON.stringify(prev)),
      historyIndex: historyIndex - 1,
      selectedId: null,
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    set({
      elements: JSON.parse(JSON.stringify(next)),
      historyIndex: historyIndex + 1,
      selectedId: null,
    });
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  addElement: (element) => {
    const { pushHistory } = get();
    pushHistory();
    set((state) => ({ elements: [...state.elements, element] }));
  },

  updateElement: (id, changes) => {
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, ...changes } : el
      ),
    }));
  },

  deleteElement: (id) => {
    const { pushHistory } = get();
    pushHistory();
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    }));
  },

  clearElements: () => {
    const { pushHistory } = get();
    pushHistory();
    set({ elements: [], selectedId: null, drawingPath: null });
  },

  exportPlay: () => {
    const { elements } = get();
    return JSON.stringify({ version: '1.0', elements }, null, 2);
  },

  importPlay: (jsonString) => {
    try {
      const data = JSON.parse(jsonString);
      if (!data.elements) throw new Error('Invalid play file');
      const { pushHistory } = get();
      pushHistory();
      set({ elements: data.elements, selectedId: null, drawingPath: null });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

}));

export default useEditorStore;
