import { create } from 'zustand';
import { DEFAULT_TOOL, DEFAULT_VIEW, VIEW_MODES } from '../constants/toolModes';
import { FIELD_CONFIG } from '../constants/fieldConfig';

const MAX_HISTORY = 50;
const STORAGE_KEY = 'football_playbook_v1';

function genId(prefix = 'id') {
  return prefix + '_' + Math.random().toString(36).slice(2, 9);
}

function createScrimmage() {
  return {
    id: 'scrimmage_line',
    type: 'scrimmage',
    y: FIELD_CONFIG.SCRIMMAGE_DEFAULT_Y,
    visible: true,
  };
}

function createPlay(name = 'New Play') {
  return {
    id: genId('pl'),
    name,
    notes: '',
    tags: [],
    elements: [createScrimmage()],
  };
}

function createFormation(name = 'New Formation') {
  return {
    id: genId('fm'),
    name,
    plays: [createPlay('Play 1')],
  };
}

function createPlaybook(name = 'New Playbook') {
  return {
    id: genId('pb'),
    name,
    tags: [],
    formations: [createFormation('Formation 1')],
  };
}

// --- Migrate old flat-points path to new segment structure ---
function migratePath(el) {
  if (el.type !== 'path') return el;
  if (el.segments) return el; // already migrated
  if (!el.points || el.points.length < 2) return el;
  // Convert flat points array into single straight segment per consecutive pair
  const segments = [];
  for (let i = 0; i < el.points.length - 1; i++) {
    segments.push({
      id: genId('seg'),
      points: [el.points[i], el.points[i + 1]],
      curve: false,
      preSnap: false,
    });
  }
  const { points, ...rest } = el;
  return { ...rest, segments, branches: [] };
}

function migratePlay(play) {
  return {
    ...play,
    elements: play.elements.map(el => migratePath(el)),
  };
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data?.playbooks) {
      data.playbooks.forEach(pb => {
        pb.formations?.forEach(fm => {
          fm.plays?.forEach(pl => {
            const scrimmage = pl.elements?.find(el => el.id === 'scrimmage_line');
            if (scrimmage && scrimmage.y > FIELD_CONFIG.STAGE_HEIGHT) {
              scrimmage.y = FIELD_CONFIG.SCRIMMAGE_DEFAULT_Y;
            }
            // Migrate old path format
            pl.elements = pl.elements.map(el => migratePath(el));
          });
        });
      });
    }
    return data;
  } catch {
    return null;
  }
}

function saveToStorage(playbooks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playbooks));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

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

  duplicatePlay: (playbookId, formationId, playId) => {
    const state = get();
    const pb = state.playbooks.find(p => p.id === playbookId);
    const fm = pb?.formations.find(f => f.id === formationId);
    const pl = fm?.plays.find(p => p.id === playId);
    if (!pl) return;
    const copy = {
      ...JSON.parse(JSON.stringify(pl)),
      id: genId('pl'),
      name: pl.name + ' (copy)',
    };
    set(state => ({
      playbooks: state.playbooks.map(pb =>
        pb.id === playbookId ? {
          ...pb,
          formations: pb.formations.map(fm =>
            fm.id === formationId
              ? { ...fm, plays: [...fm.plays, copy] }
              : fm
          )
        } : pb
      )
    }));
    get()._persist();
    return copy;
  },

  duplicateFormation: (playbookId, formationId) => {
    const state = get();
    const pb = state.playbooks.find(p => p.id === playbookId);
    const fm = pb?.formations.find(f => f.id === formationId);
    if (!fm) return;
    const copy = {
      id: genId('fm'),
      name: fm.name + ' (copy)',
      plays: [createPlay('Play 1')],
    };
    set(state => ({
      playbooks: state.playbooks.map(pb =>
        pb.id === playbookId
          ? { ...pb, formations: [...pb.formations, copy] }
          : pb
      )
    }));
    get()._persist();
    return copy;
  },

  reorderPlaybooks: (newOrder) => {
    set({ playbooks: newOrder });
    get()._persist();
  },

  reorderFormations: (playbookId, newOrder) => {
    set(state => ({
      playbooks: state.playbooks.map(pb =>
        pb.id === playbookId
          ? { ...pb, formations: newOrder }
          : pb
      )
    }));
    get()._persist();
  },

  reorderPlays: (playbookId, formationId, newOrder) => {
    set(state => ({
      playbooks: state.playbooks.map(pb =>
        pb.id === playbookId ? {
          ...pb,
          formations: pb.formations.map(fm =>
            fm.id === formationId
              ? { ...fm, plays: newOrder }
              : fm
          )
        } : pb
      )
    }));
    get()._persist();
  },

  // --- Element Operations ---
  activeTool: DEFAULT_TOOL,
  setActiveTool: (tool) => set({ activeTool: tool }),

  selectedId: null,
  selectedSegmentId: null,
  setSelectedId: (id) => set({ selectedId: id, selectedSegmentId: null }),
  setSelectedSegmentId: (pathId, segmentId) => set({ selectedId: pathId, selectedSegmentId: segmentId }),
  clearSelection: () => set({ selectedId: null, selectedSegmentId: null }),

  snapEnabled: true,
  snapIncrement: 19.28,
  setSnapEnabled: (val) => set({ snapEnabled: val }),
  setSnapIncrement: (val) => set({ snapIncrement: val }),

  scrimmageVisible: true,
  toggleScrimmage: () => set(state => ({ scrimmageVisible: !state.scrimmageVisible })),

  presentMode: false,
  togglePresentMode: () => set(state => ({ presentMode: !state.presentMode })),

  // drawingPath: the path currently being drawn
  // activePathId: if set, new segments are added to this existing path (branch/continue)
  drawingPath: null,
  activePathId: null,
  setDrawingPath: (path) => set({ drawingPath: path }),

  finishDrawing: () => {
    const { drawingPath, activePathId, addElement, updateElement, getActivePlay, setSelectedId } = get();
    if (!drawingPath) return;

    if (activePathId) {
      // Adding segments to an existing path
      const play = getActivePlay();
      const existingPath = play?.elements.find(el => el.id === activePathId);
      if (existingPath && drawingPath.segments.length > 0) {
        updateElement(activePathId, {
          segments: [...existingPath.segments, ...drawingPath.segments],
        });
      }
      set({ drawingPath: null, activePathId: null });
      setSelectedId(activePathId);
    } else {
      // New path
      if (drawingPath.segments.length > 0) {
        addElement(drawingPath);
        setSelectedId(drawingPath.id);
      }
      set({ drawingPath: null, activePathId: null });
    }
  },

  cancelDrawing: () => set({ drawingPath: null, activePathId: null }),

  // History
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
    set({ historyIndex: historyIndex - 1, selectedId: null, selectedSegmentId: null });
  },

  redo: () => {
    const { history, historyIndex, activePlaybookId, activeFormationId, activePlayId } = get();
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    get().updatePlay(activePlaybookId, activeFormationId, activePlayId, {
      elements: JSON.parse(JSON.stringify(next))
    });
    set({ historyIndex: historyIndex + 1, selectedId: null, selectedSegmentId: null });
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

  updateSegment: (pathId, segmentId, changes) => {
    const { activePlaybookId, activeFormationId, activePlayId, getActivePlay, pushHistory } = get();
    const play = getActivePlay();
    if (!play) return;
    pushHistory();
    get().updatePlay(activePlaybookId, activeFormationId, activePlayId, {
      elements: play.elements.map(el => {
        if (el.id !== pathId) return el;
        return {
          ...el,
          segments: el.segments.map(seg =>
            seg.id === segmentId ? { ...seg, ...changes } : seg
          ),
        };
      })
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
    set(state => ({ selectedId: state.selectedId === id ? null : state.selectedId, selectedSegmentId: null }));
  },

  clearElements: () => {
    const { pushHistory, activePlaybookId, activeFormationId, activePlayId } = get();
    pushHistory();
    get().updatePlay(activePlaybookId, activeFormationId, activePlayId, {
      elements: [createScrimmage()]
    });
    set({ selectedId: null, selectedSegmentId: null, drawingPath: null, activePathId: null });
  },

  // --- Playbook Export/Import ---
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
      // Migrate any old-format paths in the imported playbook
      pb.formations?.forEach(fm => {
        fm.plays?.forEach(pl => {
          pl.elements = pl.elements.map(el => migratePath(el));
        });
      });
      set(state => ({ playbooks: [...state.playbooks, pb] }));
      get()._persist();
      return { success: true, id: pb.id };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

}));

export default useEditorStore;
