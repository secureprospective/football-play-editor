import { create } from 'zustand';
import { DEFAULT_TOOL, DEFAULT_VIEW, VIEW_MODES } from '../constants/toolModes';
import { FIELD_CONFIG } from '../constants/fieldConfig';

const MAX_HISTORY = 50;
const STORAGE_KEY = 'football_playbook_v1';

// --- ID Generator ---
function genId(prefix = 'id') {
  return prefix + '_' + Math.random().toString(36).slice(2, 9);
}

// --- Default scrimmage element ---
function createScrimmage() {
  return {
    id: 'scrimmage_line',
    type: 'scrimmage',
    y: FIELD_CONFIG.SCRIMMAGE_DEFAULT_Y,
    visible: true,
  };
}

// --- Default empty play ---
function createPlay(name = 'New Play') {
  return {
    id: genId('pl'),
    name,
    notes: '',
    tags: [],
    elements: [createScrimmage()],
  };
}

// --- Default empty formation ---
function createFormation(name = 'New Formation') {
  return {
    id: genId('fm'),
    name,
    plays: [createPlay('Play 1')],
  };
}

// --- Default empty playbook ---
function createPlaybook(name = 'New Playbook') {
  return {
    id: genId('pb'),
    name,
    tags: [],
    formations: [createFormation('Formation 1')],
  };
}

// --- Load from localStorage ---
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// --- Save to localStorage ---
function saveToStorage(playbooks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playbooks));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

// --- Initial state ---
const stored = loadFromStorage();
const initialPlaybooks = stored?.playbooks || [createPlaybook('My First Playbook')];

const useEditorStore = create((set, get) => ({

  // --- View Navigation ---
  viewMode: DEFAULT_VIEW,
  activePlaybookId: initialPlaybooks[0]?.id || null,
  activeFormationId: initialPlaybooks[0]?.formations[0]?.id || null,
  activePlayId: initialPlaybooks[0]?.formations[0]?.plays[0]?.id || null,

  navigateTo: (viewMode, ids = {}) => {
    set({
      viewMode,
      ...(ids.playbookId  !== undefined && { activePlaybookId:  ids.playbookId }),
      ...(ids.formationId !== undefined && { activeFormationId: ids.formationId }),
      ...(ids.playId      !== undefined && { activePlayId:      ids.playId }),
    });
  },

  goBack: () => {
    const { viewMode } = get();
    if (viewMode === VIEW_MODES.FIELD)      set({ viewMode: VIEW_MODES.PLAY });
    if (viewMode === VIEW_MODES.PLAY)       set({ viewMode: VIEW_MODES.FORMATION });
    if (viewMode === VIEW_MODES.FORMATION)  set({ viewMode: VIEW_MODES.PLAYBOOK });
  },

  // --- Playbook Data ---
  playbooks: initialPlaybooks,

  _persist: () => {
    saveToStorage({ playbooks: get().playbooks });
  },

  // Getters for active objects
  getActivePlaybook: () => {
    const { playbooks, activePlaybookId } = get();
    return playbooks.find(pb => pb.id === activePlaybookId) || null;
  },

  getActiveFormation: () => {
    const pb = get().getActivePlaybook();
    if (!pb) return null;
    return pb.formations.find(fm => fm.id === get().activeFormationId) || null;
  },

  getActivePlay: () => {
    const fm = get().getActiveFormation();
    if (!fm) return null;
    return fm.plays.find(pl => pl.id === get().activePlayId) || null;
  },

  // --- Playbook CRUD ---
  addPlaybook: (name) => {
    const pb = createPlaybook(name);
    set(state => ({ playbooks: [...state.playbooks, pb] }));
    get()._persist();
    return pb;
  },

  updatePlaybook: (id, changes) => {
    set(state => ({
      playbooks: state.playbooks.map(pb => pb.id === id ? { ...pb, ...changes } : pb)
    }));
    get()._persist();
  },

  deletePlaybook: (id) => {
    set(state => ({
      playbooks: state.playbooks.filter(pb => pb.id !== id),
      activePlaybookId: state.activePlaybookId === id ? (state.playbooks[0]?.id || null) : state.activePlaybookId,
    }));
    get()._persist();
  },

  // --- Formation CRUD ---
  addFormation: (playbookId, name) => {
    const fm = createFormation(name);
    set(state => ({
      playbooks: state.playbooks.map(pb =>
        pb.id === playbookId
          ? { ...pb, formations: [...pb.formations, fm] }
          : pb
      )
    }));
    get()._persist();
    return fm;
  },

  updateFormation: (playbookId, formationId, changes) => {
    set(state => ({
      playbooks: state.playbooks.map(pb =>
        pb.id === playbookId ? {
          ...pb,
          formations: pb.formations.map(fm =>
            fm.id === formationId ? { ...fm, ...changes } : fm
          )
        } : pb
      )
    }));
    get()._persist();
  },

  deleteFormation: (playbookId, formationId) => {
    set(state => ({
      playbooks: state.playbooks.map(pb =>
        pb.id === playbookId ? {
          ...pb,
          formations: pb.formations.filter(fm => fm.id !== formationId)
        } : pb
      )
    }));
    get()._persist();
  },

  // --- Play CRUD ---
  addPlay: (playbookId, formationId, name) => {
    const pl = createPlay(name);
    set(state => ({
      playbooks: state.playbooks.map(pb =>
        pb.id === playbookId ? {
          ...pb,
          formations: pb.formations.map(fm =>
            fm.id === formationId
              ? { ...fm, plays: [...fm.plays, pl] }
              : fm
          )
        } : pb
      )
    }));
    get()._persist();
    return pl;
  },

  updatePlay: (playbookId, formationId, playId, changes) => {
    set(state => ({
      playbooks: state.playbooks.map(pb =>
        pb.id === playbookId ? {
          ...pb,
          formations: pb.formations.map(fm =>
            fm.id === formationId ? {
              ...fm,
              plays: fm.plays.map(pl =>
                pl.id === playId ? { ...pl, ...changes } : pl
              )
            } : fm
          )
        } : pb
      )
    }));
    get()._persist();
  },

  deletePlay: (playbookId, formationId, playId) => {
    set(state => ({
      playbooks: state.playbooks.map(pb =>
        pb.id === playbookId ? {
          ...pb,
          formations: pb.formations.map(fm =>
            fm.id === formationId ? {
              ...fm,
              plays: fm.plays.filter(pl => pl.id !== playId)
            } : fm
          )
        } : pb
      )
    }));
    get()._persist();
  },

  // --- Element Operations (operate on active play) ---
  activeTool: DEFAULT_TOOL,
  setActiveTool: (tool) => set({ activeTool: tool }),

  selectedId: null,
  setSelectedId: (id) => set({ selectedId: id }),
  clearSelection: () => set({ selectedId: null }),

  snapEnabled: true,
  snapIncrement: 15.33,
  setSnapEnabled: (val) => set({ snapEnabled: val }),
  setSnapIncrement: (val) => set({ snapIncrement: val }),

  scrimmageVisible: true,
  toggleScrimmage: () => set(state => ({ scrimmageVisible: !state.scrimmageVisible })),

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

  // History (per session, not persisted)
  history: [],
  historyIndex: -1,

  pushHistory: () => {
    const play = get().getActivePlay();
    if (!play) return;
    const { history, historyIndex } = get();
    const trimmed = history.slice(0, historyIndex + 1);
    const snapshot = JSON.parse(JSON.stringify(play.elements));
    const next = [...trimmed, snapshot].slice(-MAX_HISTORY);
    set({ history: next, historyIndex: next.length - 1 });
  },

  undo: () => {
    const { history, historyIndex, activePlaybookId, activeFormationId, activePlayId } = get();
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];
    get().updatePlay(activePlaybookId, activeFormationId, activePlayId, {
      elements: JSON.parse(JSON.stringify(prev))
    });
    set({ historyIndex: historyIndex - 1, selectedId: null });
  },

  redo: () => {
    const { history, historyIndex, activePlaybookId, activeFormationId, activePlayId } = get();
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    get().updatePlay(activePlaybookId, activeFormationId, activePlayId, {
      elements: JSON.parse(JSON.stringify(next))
    });
    set({ historyIndex: historyIndex + 1, selectedId: null });
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  addElement: (element) => {
    const { pushHistory, activePlaybookId, activeFormationId, activePlayId, getActivePlay } = get();
    const play = getActivePlay();
    if (!play) return;
    pushHistory();
    get().updatePlay(activePlaybookId, activeFormationId, activePlayId, {
      elements: [...play.elements, element]
    });
  },

  updateElement: (id, changes) => {
    const { activePlaybookId, activeFormationId, activePlayId, getActivePlay } = get();
    const play = getActivePlay();
    if (!play) return;
    get().updatePlay(activePlaybookId, activeFormationId, activePlayId, {
      elements: play.elements.map(el => el.id === id ? { ...el, ...changes } : el)
    });
  },

  deleteElement: (id) => {
    if (id === 'scrimmage_line') return;
    const { pushHistory, activePlaybookId, activeFormationId, activePlayId, getActivePlay } = get();
    const play = getActivePlay();
    if (!play) return;
    pushHistory();
    get().updatePlay(activePlaybookId, activeFormationId, activePlayId, {
      elements: play.elements.filter(el => el.id !== id)
    });
    set(state => ({ selectedId: state.selectedId === id ? null : state.selectedId }));
  },

  clearElements: () => {
    const { pushHistory, activePlaybookId, activeFormationId, activePlayId } = get();
    pushHistory();
    get().updatePlay(activePlaybookId, activeFormationId, activePlayId, {
      elements: [createScrimmage()]
    });
    set({ selectedId: null, drawingPath: null });
  },

  // --- Playbook Export/Import (full playbook JSON) ---
  exportPlaybook: () => {
    const pb = get().getActivePlaybook();
    if (!pb) return null;
    return JSON.stringify({ version: '2.0', playbook: pb }, null, 2);
  },

  importPlaybook: (jsonString) => {
    try {
      const data = JSON.parse(jsonString);
      if (!data.playbook) throw new Error('Invalid playbook file');
      const pb = { ...data.playbook, id: genId('pb') };
      set(state => ({ playbooks: [...state.playbooks, pb] }));
      get()._persist();
      return { success: true, id: pb.id };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

}));

export default useEditorStore;
