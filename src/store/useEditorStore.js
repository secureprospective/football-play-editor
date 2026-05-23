import { create } from 'zustand';
import { DEFAULT_TOOL, DEFAULT_VIEW, VIEW_MODES } from '../constants/toolModes';
import { FIELD_CONFIG } from '../constants/fieldConfig';

const MAX_HISTORY = 50;
const STORAGE_KEY = 'football_playbook_v1';
const THEME_KEY = 'football_theme_v1';
const DEFAULT_THEME = 'theme-sun-cyan';

export function genId(prefix = 'id') {
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
  if (el.segments) {
    // Already on segment model — backfill duration and new style fields
    const { dash, ...restStyle } = el.style || {};
    const migratedStyle = {
      ...restStyle,
      lineStyle: restStyle.lineStyle !== undefined ? restStyle.lineStyle : (dash ? 'dash' : 'solid'),
      endT: restStyle.endT !== undefined ? restStyle.endT : false,
    };
    return {
      ...el,
      style: migratedStyle,
      playerId: el.playerId !== undefined ? el.playerId : null,
      segments: el.segments.map(seg =>
        seg.duration !== undefined ? seg : { ...seg, duration: 0.5 }
      ),
    };
  }
  if (!el.points || el.points.length < 2) return el;
  // Convert flat points array into single straight segment per consecutive pair
  const segments = [];
  for (let i = 0; i < el.points.length - 1; i++) {
    segments.push({
      id: genId('seg'),
      points: [el.points[i], el.points[i + 1]],
      curve: false,
      preSnap: false,
      duration: 0.5,
    });
  }
  const { points, ...rest } = el;
  return { ...rest, playerId: null, segments };
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
            // Migrate old path format and backfill Phase 2 linkage fields
            pl.elements = pl.elements.map(el => migratePath(el));
            pl.elements = pl.elements.map(el => {
              if (el.type === 'player' && el.routeId === undefined) return { ...el, routeId: null };
              return el;
            });

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
    // Copy player positions from the first play into the new formation's default play
    const sourcePlayers = (fm.plays[0]?.elements || [])
      .filter(el => el.type === 'player')
      .map(el => ({ ...el, id: genId('pl') }));
    const defaultPlay = {
      ...createPlay('Play 1'),
      elements: [createScrimmage(), ...sourcePlayers],
    };
    const copy = {
      id: genId('fm'),
      name: fm.name + ' (copy)',
      plays: [defaultPlay],
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
  setActiveTool: (tool) => set({ activeTool: tool, marqueeIds: [] }),

  selectedId: null,
  setSelectedId: (id) => set({ selectedId: id }),
  clearSelection: () => set({ selectedId: null }),

  marqueeIds: [],
  setMarqueeIds: (ids) => set({ marqueeIds: ids }),
  clearMarquee: () => set({ marqueeIds: [] }),

  snapEnabled: true,
  snapIncrement: FIELD_CONFIG.SNAP_HALF_YARD,
  setSnapEnabled: (val) => set({ snapEnabled: val }),
  setSnapIncrement: (val) => set({ snapIncrement: val }),

  scrimmageVisible: true,
  toggleScrimmage: () => set(state => ({ scrimmageVisible: !state.scrimmageVisible })),

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
  clearPrintQueue: () => set({ printQueue: [] }),
  setPrintFormat: (format) => set({ printFormat: format }),
  setPrintSize: (size) => set({ printSize: size }),

  theme: localStorage.getItem(THEME_KEY) || DEFAULT_THEME,
  setTheme: (name) => { localStorage.setItem(THEME_KEY, name); set({ theme: name }); },

  // drawingPath: the path currently being drawn
  // activePathId: if set, new segments are added to this existing path (branch/continue)
  drawingPath: null,
  activePathId: null,
  setDrawingPath: (path) => set({ drawingPath: path }),
  setActivePathId: (id) => set({ activePathId: id }),

  finishDrawing: () => {
    const { drawingPath, activePathId, addElement, updateElement, getActivePlay, setSelectedId, pushHistory, setActiveTool } = get();
    if (!drawingPath) return;

    if (activePathId) {
      // Adding segments to an existing path
      const play = getActivePlay();
      const existingPath = play?.elements.find(el => el.id === activePathId);
      if (existingPath && drawingPath.segments.length > 0) {
        pushHistory();
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
    setActiveTool(DEFAULT_TOOL);
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
    set({ historyIndex: historyIndex - 1, selectedId: null, marqueeIds: [] });
  },

  redo: () => {
    const { history, historyIndex, activePlaybookId, activeFormationId, activePlayId } = get();
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    get().updatePlay(activePlaybookId, activeFormationId, activePlayId, {
      elements: JSON.parse(JSON.stringify(next))
    });
    set({ historyIndex: historyIndex + 1, selectedId: null, marqueeIds: [] });
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

  // Batch update — one store write and one persist for multiple elements (used by group move)
  updateElements: (updates) => {
    const { activePlaybookId, activeFormationId, activePlayId, getActivePlay } = get();
    const play = getActivePlay();
    if (!play) return;
    const map = new Map(updates.map(u => [u.id, u.changes]));
    get().updatePlay(activePlaybookId, activeFormationId, activePlayId, {
      elements: play.elements.map(el => map.has(el.id) ? { ...el, ...map.get(el.id) } : el)
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

  linkPlayerToRoute: (playerId, routeId) => {
    const { activePlaybookId, activeFormationId, activePlayId, getActivePlay, pushHistory } = get();
    const play = getActivePlay();
    if (!play) return;

    const player = play.elements.find(el => el.id === playerId);
    const path   = play.elements.find(el => el.id === routeId);
    if (!player || !path) return;

    // Translate the route so its first node snaps to the player's center
    let translatedSegments = path.segments;
    const firstPoint = path.segments?.[0]?.points?.[0];
    if (firstPoint && path.segments?.length) {
      const dx = player.x - firstPoint.x;
      const dy = player.y - firstPoint.y;
      if (dx !== 0 || dy !== 0) {
        translatedSegments = path.segments.map(seg => ({
          ...seg,
          points: seg.points.map(p => ({ x: p.x + dx, y: p.y + dy })),
          ...(seg.controlPoint ? { controlPoint: { x: seg.controlPoint.x + dx, y: seg.controlPoint.y + dy } } : {}),
        }));
      }
    }

    pushHistory();
    get().updatePlay(activePlaybookId, activeFormationId, activePlayId, {
      elements: play.elements.map(el => {
        if (el.id === playerId) return { ...el, routeId };
        if (el.id === routeId)  return { ...el, playerId, segments: translatedSegments };
        // Clear stale back-ref on old path if player previously had a different route
        if (el.type === 'path'   && el.playerId === playerId  && el.id !== routeId)  return { ...el, playerId: null };
        // Clear stale back-ref on old player if path was previously owned by different player
        if (el.type === 'player' && el.routeId  === routeId   && el.id !== playerId) return { ...el, routeId: null };
        return el;
      }),
    });
  },

  unlinkPlayerFromRoute: (playerId) => {
    const { activePlaybookId, activeFormationId, activePlayId, getActivePlay, pushHistory } = get();
    const play = getActivePlay();
    if (!play) return;
    const player = play.elements.find(el => el.id === playerId);
    if (!player?.routeId) return;
    const routeId = player.routeId;
    pushHistory();
    get().updatePlay(activePlaybookId, activeFormationId, activePlayId, {
      elements: play.elements.map(el => {
        if (el.id === playerId) return { ...el, routeId: null };
        if (el.id === routeId)  return { ...el, playerId: null };
        return el;
      }),
    });
  },

  deleteElement: (id) => {
    if (id === 'scrimmage_line') return;
    const { pushHistory, activePlaybookId, activeFormationId, activePlayId, getActivePlay } = get();
    const play = getActivePlay();
    if (!play) return;
    pushHistory();
    get().updatePlay(activePlaybookId, activeFormationId, activePlayId, {
      elements: play.elements
        .filter(el => el.id !== id)
        .map(el => {
          if (el.type === 'player' && el.routeId === id) return { ...el, routeId: null };
          if (el.type === 'path' && el.playerId === id) return { ...el, playerId: null };
          return el;
        }),
    });
    set(state => ({ selectedId: state.selectedId === id ? null : state.selectedId }));
  },

  clearElements: () => {
    const { pushHistory, activePlaybookId, activeFormationId, activePlayId } = get();
    pushHistory();
    get().updatePlay(activePlaybookId, activeFormationId, activePlayId, {
      elements: [createScrimmage()]
    });
    set({ selectedId: null, drawingPath: null, activePathId: null });
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
      // Migrate any old-format paths and backfill Phase 2 linkage fields
      pb.formations?.forEach(fm => {
        fm.plays?.forEach(pl => {
          pl.elements = pl.elements.map(el => migratePath(el));
          pl.elements = pl.elements.map(el => {
            if (el.type === 'player' && el.routeId === undefined) return { ...el, routeId: null };
            return el;
          });
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
