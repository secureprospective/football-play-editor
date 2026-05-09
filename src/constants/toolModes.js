export const TOOL_MODES = {
  SELECT:      'SELECT',
  ADD_PLAYER:  'ADD_PLAYER',
  ADD_LINE:    'ADD_LINE',
  ADD_TEXT:    'ADD_TEXT',
  EDIT_NODES:  'EDIT_NODES',
};

export const DEFAULT_TOOL = TOOL_MODES.SELECT;

export const VIEW_MODES = {
  PLAYBOOK:   'PLAYBOOK',    // Top level — list of playbooks
  FORMATION:  'FORMATION',   // Mid level — formations in a playbook
  PLAY:       'PLAY',        // Mid level — plays in a formation
  FIELD:      'FIELD',       // Bottom level — the field editor
};

export const DEFAULT_VIEW = VIEW_MODES.PLAYBOOK;
