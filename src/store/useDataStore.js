import { create } from 'zustand';
import { DEFAULT_VIEW, VIEW_MODES } from '../constants/toolModes';
import { FIELD_CONFIG } from '../constants/fieldConfig';

const MAX_HISTORY = 50;
const STORAGE_KEY = 'football_playbook_v1';

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
  return { id: genId('pl'), name, notes: '', tags: [], elements: [createScrimmage()] };
}

function createFormation(name = 'New Formation') {
  return { id: genId('fm'), name, plays: [createPlay('Play 1')] };
}

function createPlaybook(name = 'New Playbook') {
  return { id: genId('pb'), name, tags: [], formations: [createFormation('Formation 1')] };
}

// --- Migrations ---

function migratePath(el) {
  if (el.type !== 'path') return el;
  if (el.segments) {
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
  const segments = [];
  for (let i = 0; i < el.points.length - 1; i++) {
    segments.push({
      id: genId('seg'),
      points: [el.points[i], el.points[i + 1]],
      curve: false, preSnap: false, duration: 0.5,
    });
  }
  const { points, ...rest } = el;
  return { ...rest, playerId: null, segments };
}

export function migrateFootball(fb) {
  // Backfill journey field for football elements created before Phase 2 football build
  if (!fb.journey) {
    fb.journey = { snapToPlayer: null, events: [] };
  }
  return fb;
}

function migrateElements(elements) {
  return elements
    .map(el => migratePath(el))
    .map(el => (el.type === 'player' && el.routeId === undefined) ? { ...el, routeId: null } : el)
    .map(el => el.type === 'football' ? migrateFootball(el) : el);
}

// --- Persistence ---

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
            pl.elements = migrateElements(pl.elements || []);
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
  } catch { /* storage full — fail silently */ }
}

const stored = loadFromStorage();
const initialPlaybooks = stored?.playbooks || [createPlaybook('My First Playbook')];

const useDataStore = create((set, get) => ({

  // --- View Navigation ---
  viewMode: DEFAULT_VIEW,
  activePlaybookId: initialPlaybooks[0]?.id || null,
  activeFormationId: initialPlaybooks[0]?.formations[0]?.id || null,
  activePlayId: initialPlaybooks[0]?.formations[0]?.plays[0]?.id || null,

  navigateTo: (viewMode, ids = {}) => {
    const playIdChanging = ids.playId !== undefined && ids.playId !== get().activePlayId;
    let historyReset = {};
    if (playIdChanging) {
      // Pre-compute the new play's elements before state changes so we can seed history
      const pbId = ids.playbookId  ?? get().activePlaybookId;
      const fmId = ids.formationId ?? get().activeFormationId;
      const pb   = get().playbooks.find(p => p.id === pbId);
      const fm   = pb?.formations.find(f => f.id === fmId);
      const pl   = fm?.plays.find(p => p.id === ids.playId);
      const seed = JSON.parse(JSON.stringify(pl?.elements || []));
      // history[0] = initial state of new play; historyIndex = 0
      historyReset = { history: [seed], historyIndex: 0, selectedId: null };
    }
    set({
      viewMode,
      ...(ids.playbookId  !== undefined && { activePlaybookId:  ids.playbookId }),
      ...(ids.formationId !== undefined && { activeFormationId: ids.formationId }),
      ...(ids.playId      !== undefined && { activePlayId:      ids.playId }),
      ...historyReset,
    });
  },

  goBack: () => {
    const { viewMode } = get();
    if (viewMode === VIEW_MODES.FIELD)     set({ viewMode: VIEW_MODES.PLAY });
    if (viewMode === VIEW_MODES.PLAY)      set({ viewMode: VIEW_MODES.FORMATION });
    if (viewMode === VIEW_MODES.FORMATION) set({ viewMode: VIEW_MODES.PLAYBOOK });
  },

  // --- Playbook Data ---
  playbooks: initialPlaybooks,

  _persist: () => saveToStorage({ playbooks: get().playbooks }),

  getActivePlaybook: () => {
    const { playbooks, activePlaybookId } = get();
    return playbooks.find(pb => pb.id === activePlaybookId) || null;
  },
  getActiveFormation: () => {
    const pb = get().getActivePlaybook();
    return pb ? pb.formations.find(fm => fm.id === get().activeFormationId) || null : null;
  },
  getActivePlay: () => {
    const fm = get().getActiveFormation();
    return fm ? fm.plays.find(pl => pl.id === get().activePlayId) || null : null;
  },

  // --- Playbook CRUD ---
  addPlaybook: (name) => {
    const pb = createPlaybook(name);
    set(state => ({ playbooks: [...state.playbooks, pb] }));
    get()._persist();
    return pb;
  },
  updatePlaybook: (id, changes) => {
    set(state => ({ playbooks: state.playbooks.map(pb => pb.id === id ? { ...pb, ...changes } : pb) }));
    get()._persist();
  },
  deletePlaybook: (id) => {
    set(state => ({
      playbooks: state.playbooks.filter(pb => pb.id !== id),
      activePlaybookId: state.activePlaybookId === id ? (state.playbooks[0]?.id || null) : state.activePlaybookId,
    }));
    get()._persist();
  },
  reorderPlaybooks: (newOrder) => { set({ playbooks: newOrder }); get()._persist(); },

  // --- Formation CRUD ---
  addFormation: (playbookId, name) => {
    const fm = createFormation(name);
    set(state => ({
      playbooks: state.playbooks.map(pb =>
        pb.id === playbookId ? { ...pb, formations: [...pb.formations, fm] } : pb
      ),
    }));
    get()._persist();
    return fm;
  },
  updateFormation: (playbookId, formationId, changes) => {
    set(state => ({
      playbooks: state.playbooks.map(pb =>
        pb.id === playbookId ? {
          ...pb,
          formations: pb.formations.map(fm => fm.id === formationId ? { ...fm, ...changes } : fm),
        } : pb
      ),
    }));
    get()._persist();
  },
  deleteFormation: (playbookId, formationId) => {
    set(state => ({
      playbooks: state.playbooks.map(pb =>
        pb.id === playbookId ? {
          ...pb,
          formations: pb.formations.filter(fm => fm.id !== formationId),
        } : pb
      ),
    }));
    get()._persist();
  },
  duplicateFormation: (playbookId, formationId) => {
    const state = get();
    const pb = state.playbooks.find(p => p.id === playbookId);
    const fm = pb?.formations.find(f => f.id === formationId);
    if (!fm) return;
    const sourcePlayers = (fm.plays[0]?.elements || [])
      .filter(el => el.type === 'player')
      .map(el => ({ ...el, id: genId('el'), routeId: null }));
    const newPlay = { ...createPlay('Play 1'), elements: [createScrimmage(), ...sourcePlayers] };
    const copy = { ...JSON.parse(JSON.stringify(fm)), id: genId('fm'), name: fm.name + ' (copy)', plays: [newPlay] };
    set(s => ({
      playbooks: s.playbooks.map(p =>
        p.id === playbookId ? { ...p, formations: [...p.formations, copy] } : p
      ),
    }));
    get()._persist();
    return copy;
  },
  reorderFormations: (playbookId, newOrder) => {
    set(state => ({
      playbooks: state.playbooks.map(pb =>
        pb.id === playbookId ? { ...pb, formations: newOrder } : pb
      ),
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
            fm.id === formationId ? { ...fm, plays: [...fm.plays, pl] } : fm
          ),
        } : pb
      ),
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
              plays: fm.plays.map(pl => pl.id === playId ? { ...pl, ...changes } : pl),
            } : fm
          ),
        } : pb
      ),
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
              plays: fm.plays.filter(pl => pl.id !== playId),
            } : fm
          ),
        } : pb
      ),
    }));
    get()._persist();
  },
  duplicatePlay: (playbookId, formationId, playId) => {
    const { playbooks } = get();
    const pb = playbooks.find(p => p.id === playbookId);
    const fm = pb?.formations.find(f => f.id === formationId);
    const pl = fm?.plays.find(p => p.id === playId);
    if (!pl) return;
    const copy = { ...JSON.parse(JSON.stringify(pl)), id: genId('pl'), name: pl.name + ' (copy)' };
    set(state => ({
      playbooks: state.playbooks.map(p =>
        p.id === playbookId ? {
          ...p,
          formations: p.formations.map(f =>
            f.id === formationId ? { ...f, plays: [...f.plays, copy] } : f
          ),
        } : p
      ),
    }));
    get()._persist();
    return copy;
  },
  reorderPlays: (playbookId, formationId, newOrder) => {
    set(state => ({
      playbooks: state.playbooks.map(pb =>
        pb.id === playbookId ? {
          ...pb,
          formations: pb.formations.map(fm =>
            fm.id === formationId ? { ...fm, plays: newOrder } : fm
          ),
        } : pb
      ),
    }));
    get()._persist();
  },

  // --- Selection (lives here to avoid cross-store calls in element ops, undo, delete, nav) ---
  selectedId: null,
  setSelectedId: (id) => set({ selectedId: id }),
  clearSelection: () => set({ selectedId: null }),

  marqueeIds: [],
  setMarqueeIds: (ids) => set({ marqueeIds: ids }),
  clearMarquee: () => set({ marqueeIds: [] }),

  // --- Element Operations ---
  // Rule: call updatePlay BEFORE pushHistory so history always holds post-change state.
  // This makes undo/redo symmetric: history[i] = state after action i.
  addElement: (element) => {
    const { pushHistory, activePlaybookId, activeFormationId, activePlayId, getActivePlay } = get();
    const play = getActivePlay();
    if (!play) return;
    get().updatePlay(activePlaybookId, activeFormationId, activePlayId, {
      elements: [...play.elements, element],
    });
    pushHistory();
  },

  updateElement: (id, changes) => {
    const { activePlaybookId, activeFormationId, activePlayId, getActivePlay } = get();
    const play = getActivePlay();
    if (!play) return;
    get().updatePlay(activePlaybookId, activeFormationId, activePlayId, {
      elements: play.elements.map(el => el.id === id ? { ...el, ...changes } : el),
    });
  },

  updateElements: (updates) => {
    const { activePlaybookId, activeFormationId, activePlayId, getActivePlay } = get();
    const play = getActivePlay();
    if (!play) return;
    const map = new Map(updates.map(u => [u.id, u.changes]));
    get().updatePlay(activePlaybookId, activeFormationId, activePlayId, {
      elements: play.elements.map(el => map.has(el.id) ? { ...el, ...map.get(el.id) } : el),
    });
  },

  updateSegment: (pathId, segmentId, changes) => {
    const { activePlaybookId, activeFormationId, activePlayId, getActivePlay, pushHistory } = get();
    const play = getActivePlay();
    if (!play) return;
    get().updatePlay(activePlaybookId, activeFormationId, activePlayId, {
      elements: play.elements.map(el => {
        if (el.id !== pathId) return el;
        return { ...el, segments: el.segments.map(seg => seg.id === segmentId ? { ...seg, ...changes } : seg) };
      }),
    });
    pushHistory();
  },

  deleteElement: (id) => {
    if (id === 'scrimmage_line') return;
    const { pushHistory, activePlaybookId, activeFormationId, activePlayId, getActivePlay } = get();
    const play = getActivePlay();
    if (!play) return;
    get().updatePlay(activePlaybookId, activeFormationId, activePlayId, {
      elements: play.elements
        .filter(el => el.id !== id)
        .map(el => {
          if (el.type === 'player' && el.routeId === id) return { ...el, routeId: null };
          if (el.type === 'path' && el.playerId === id) return { ...el, playerId: null };
          if (el.type === 'football' && el.journey?.events) {
            const events = el.journey.events.map(evt =>
              evt.arcPathId === id ? { ...evt, arcPathId: null } : evt
            );
            const snapToPlayer = el.journey.snapToPlayer === id ? null : el.journey.snapToPlayer;
            const cleanedEvents = events.map(evt =>
              (evt.toPlayer === id) ? { ...evt, toPlayer: null } : evt
            );
            return { ...el, journey: { ...el.journey, snapToPlayer, events: cleanedEvents } };
          }
          return el;
        }),
    });
    set(state => ({ selectedId: state.selectedId === id ? null : state.selectedId }));
    pushHistory();
  },

  // Note: callers should also call useUIStore.getState().cancelDrawing() after clearElements
  clearElements: () => {
    const { pushHistory, activePlaybookId, activeFormationId, activePlayId } = get();
    get().updatePlay(activePlaybookId, activeFormationId, activePlayId, {
      elements: [createScrimmage()],
    });
    set({ selectedId: null, marqueeIds: [] });
    pushHistory();
  },

  linkPlayerToRoute: (playerId, routeId) => {
    const { activePlaybookId, activeFormationId, activePlayId, getActivePlay, pushHistory } = get();
    const play = getActivePlay();
    if (!play) return;
    const player = play.elements.find(el => el.id === playerId);
    const path   = play.elements.find(el => el.id === routeId);
    if (!player || !path) return;
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
    get().updatePlay(activePlaybookId, activeFormationId, activePlayId, {
      elements: play.elements.map(el => {
        if (el.id === playerId) return { ...el, routeId };
        if (el.id === routeId)  return { ...el, playerId, segments: translatedSegments };
        if (el.type === 'path'   && el.playerId === playerId && el.id !== routeId) return { ...el, playerId: null };
        if (el.type === 'player' && el.routeId  === routeId  && el.id !== playerId) return { ...el, routeId: null };
        return el;
      }),
    });
    pushHistory();
  },

  unlinkPlayerFromRoute: (playerId) => {
    const { activePlaybookId, activeFormationId, activePlayId, getActivePlay, pushHistory } = get();
    const play = getActivePlay();
    if (!play) return;
    const player = play.elements.find(el => el.id === playerId);
    if (!player?.routeId) return;
    const routeId = player.routeId;
    get().updatePlay(activePlaybookId, activeFormationId, activePlayId, {
      elements: play.elements.map(el => {
        if (el.id === playerId) return { ...el, routeId: null };
        if (el.id === routeId)  return { ...el, playerId: null };
        return el;
      }),
    });
    pushHistory();
  },

  // --- Football Journey Actions (Phase 2 football build) ---
  setFootballSnapTo: (footballId, playerId) => {
    const { activePlaybookId, activeFormationId, activePlayId, getActivePlay, pushHistory } = get();
    const play = getActivePlay();
    if (!play) return;
    get().updatePlay(activePlaybookId, activeFormationId, activePlayId, {
      elements: play.elements.map(el =>
        el.id === footballId && el.type === 'football'
          ? { ...el, journey: { ...el.journey, snapToPlayer: playerId } }
          : el
      ),
    });
    pushHistory();
  },

  addJourneyEvent: (footballId, eventType, defaultTime = 1.0) => {
    const { activePlaybookId, activeFormationId, activePlayId, getActivePlay, pushHistory } = get();
    const play = getActivePlay();
    if (!play) return;
    const football = play.elements.find(el => el.id === footballId);
    if (!football) return;
    const newEvent = { id: genId('evt'), time: defaultTime, type: eventType, toPlayer: null, arcPathId: null };
    const events = [...(football.journey?.events || []), newEvent]
      .sort((a, b) => a.time - b.time);
    get().updatePlay(activePlaybookId, activeFormationId, activePlayId, {
      elements: play.elements.map(el =>
        el.id === footballId ? { ...el, journey: { ...el.journey, events } } : el
      ),
    });
    pushHistory();
  },

  updateJourneyEvent: (footballId, eventId, patch) => {
    const { activePlaybookId, activeFormationId, activePlayId, getActivePlay, pushHistory } = get();
    const play = getActivePlay();
    if (!play) return;
    const football = play.elements.find(el => el.id === footballId);
    if (!football) return;
    const events = (football.journey?.events || [])
      .map(evt => evt.id === eventId ? { ...evt, ...patch } : evt)
      .sort((a, b) => a.time - b.time);
    get().updatePlay(activePlaybookId, activeFormationId, activePlayId, {
      elements: play.elements.map(el =>
        el.id === footballId ? { ...el, journey: { ...el.journey, events } } : el
      ),
    });
    pushHistory();
  },

  deleteJourneyEvent: (footballId, eventId) => {
    const { activePlaybookId, activeFormationId, activePlayId, getActivePlay, pushHistory } = get();
    const play = getActivePlay();
    if (!play) return;
    const football = play.elements.find(el => el.id === footballId);
    if (!football) return;
    const events = (football.journey?.events || []).filter(evt => evt.id !== eventId);
    get().updatePlay(activePlaybookId, activeFormationId, activePlayId, {
      elements: play.elements.map(el =>
        el.id === footballId ? { ...el, journey: { ...el.journey, events } } : el
      ),
    });
    pushHistory();
  },

  setEventArcPath: (footballId, eventId, pathId) => {
    const { activePlaybookId, activeFormationId, activePlayId, getActivePlay, pushHistory } = get();
    const play = getActivePlay();
    if (!play) return;
    const football = play.elements.find(el => el.id === footballId);
    if (!football) return;
    const events = (football.journey?.events || [])
      .map(evt => evt.id === eventId ? { ...evt, arcPathId: pathId } : evt);
    get().updatePlay(activePlaybookId, activeFormationId, activePlayId, {
      elements: play.elements.map(el =>
        el.id === footballId ? { ...el, journey: { ...el.journey, events } } : el
      ),
    });
    pushHistory();
  },

  // --- History ---
  history: [],
  historyIndex: -1,

  pushHistory: () => {
    const play = get().getActivePlay();
    if (!play) return;
    const { history, historyIndex } = get();
    const trimmed  = history.slice(0, historyIndex + 1);
    const snapshot = JSON.parse(JSON.stringify(play.elements));
    const next     = [...trimmed, snapshot].slice(-MAX_HISTORY);
    set({ history: next, historyIndex: next.length - 1 });
  },

  undo: () => {
    const { history, historyIndex, activePlaybookId, activeFormationId, activePlayId } = get();
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];
    get().updatePlay(activePlaybookId, activeFormationId, activePlayId, {
      elements: JSON.parse(JSON.stringify(prev)),
    });
    set({ historyIndex: historyIndex - 1, selectedId: null, marqueeIds: [] });
  },

  redo: () => {
    const { history, historyIndex, activePlaybookId, activeFormationId, activePlayId } = get();
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    get().updatePlay(activePlaybookId, activeFormationId, activePlayId, {
      elements: JSON.parse(JSON.stringify(next)),
    });
    set({ historyIndex: historyIndex + 1, selectedId: null, marqueeIds: [] });
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  // --- Export / Import ---
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
      pb.formations?.forEach(fm => {
        fm.plays?.forEach(pl => {
          pl.elements = migrateElements(pl.elements || []);
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

export default useDataStore;
