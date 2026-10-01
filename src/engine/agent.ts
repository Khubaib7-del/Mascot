import type { AgentStateId, ClipId, ExpressionId, Vec3, WorldId } from '../mascot/types';

export interface PropPlacement {
  model: string;
  mount: 'handR' | 'handL' | 'world';
  /** World mounts are relative to the mascot root, in units where the mascot is ~1.95 tall. */
  pos?: Vec3;
  rot?: Vec3;
  scale: number;
  motion?: 'float' | 'spin' | 'pulse';
}

export type StatusMode = 'still' | 'spin' | 'pulse' | 'flash' | 'shake';

export interface AgentStateDef {
  id: AgentStateId;
  label: string;
  group: 'Thinking' | 'Working' | 'Shipping' | 'Outcome' | 'Rest';
  expression: ExpressionId;
  clip: ClipId | null;
  props: PropPlacement[];
  sits?: boolean;
  /** The status halo above the head: colour, motion and a text description (never colour alone). */
  status: { color: string; mode: StatusMode; speed: number; text: string };
  suggestWorld?: WorldId;
}

const TABLE: PropPlacement = { model: 'table', mount: 'world', pos: [0, 0.6, 0.78], scale: 1.45 };
const onTable = (model: string, scale: number, x = 0, rot: Vec3 = [0, 0, 0], extraY = 0.03): PropPlacement => ({ model, mount: 'world', pos: [x, 0.6 + extraY, 0.78], rot, scale });

const s = (id: AgentStateId, label: string, group: AgentStateDef['group'], expression: ExpressionId, clip: ClipId | null, props: PropPlacement[], status: AgentStateDef['status'], extra: Partial<AgentStateDef> = {}): [AgentStateId, AgentStateDef] =>
  [id, { id, label, group, expression, clip, props, status, ...extra }];

export const AGENT_STATES: Record<AgentStateId, AgentStateDef> = Object.fromEntries([
  s('idle', 'Idle', 'Rest', 'neutral', null, [], { color: '#9aa1b0', mode: 'still', speed: 0, text: 'Ready' }),
  s('thinking', 'Thinking', 'Thinking', 'focused', 'think', [], { color: '#7f9bff', mode: 'spin', speed: 1.2, text: 'Thinking it through' }),
  s('planning', 'Planning', 'Thinking', 'focused', 'write', [TABLE, onTable('notebook', 0.42, 0, [-1.35, 0, 0]), { model: 'pen', mount: 'handR', scale: 0.3, rot: [1.2, 0, 0.3] }], { color: '#7f9bff', mode: 'spin', speed: 0.8, text: 'Planning next steps' }, { sits: true }),
  s('searching', 'Searching', 'Thinking', 'curious', 'search', [{ model: 'magnifier', mount: 'handR', scale: 0.55, rot: [0.3, 0, 0] }], { color: '#4fd8ff', mode: 'spin', speed: 2.2, text: 'Searching' }),
  s('reading', 'Reading', 'Thinking', 'focused', 'read', [{ model: 'book', mount: 'world', pos: [0, 0.92, 0.42], rot: [-0.55, 0, 0], scale: 0.62 }], { color: '#8a4fd0', mode: 'spin', speed: 0.7, text: 'Reading' }),
  s('writing', 'Writing', 'Working', 'focused', 'write', [TABLE, onTable('notebook', 0.42, 0, [-1.35, 0, 0]), { model: 'pen', mount: 'handR', scale: 0.3, rot: [1.2, 0, 0.3] }], { color: '#3b5bdb', mode: 'spin', speed: 1.1, text: 'Writing' }, { sits: true }),
  s('coding', 'Coding', 'Working', 'focused', 'type', [TABLE, onTable('laptop', 0.62, 0, [0, Math.PI, 0], 0.03)], { color: '#5dffa0', mode: 'spin', speed: 1.6, text: 'Writing code' }, { sits: true, suggestWorld: 'devDesk' }),
  s('editing', 'Editing', 'Working', 'focused', 'type', [TABLE, onTable('laptop', 0.62, 0, [0, Math.PI, 0]), { model: 'pen', mount: 'world', pos: [0.55, 0.7, 0.8], rot: [0, 0, 1.2], scale: 0.3 }], { color: '#e39bff', mode: 'spin', speed: 1.3, text: 'Editing' }, { sits: true }),
  s('creating', 'Creating', 'Working', 'excited', 'write', [{ model: 'palette', mount: 'handL', scale: 0.42, rot: [0.4, 0, 0] }, { model: 'pen', mount: 'handR', scale: 0.3, rot: [1.2, 0, 0.3] }], { color: '#ff7fb0', mode: 'pulse', speed: 2, text: 'Creating' }),
  s('deleting', 'Deleting', 'Working', 'worried', 'point', [{ model: 'document', mount: 'world', pos: [0.8, 0.9, 0.5], rot: [0, -0.5, 0.2], scale: 0.5, motion: 'float' }], { color: '#ff6a5a', mode: 'flash', speed: 3, text: 'Deleting' }),
  s('testing', 'Testing', 'Working', 'focused', 'type', [TABLE, onTable('laptop', 0.62, -0.25, [0, Math.PI, 0]), onTable('chart', 0.38, 0.5)], { color: '#ffb347', mode: 'spin', speed: 1.4, text: 'Running tests' }, { sits: true }),
  s('debugging', 'Debugging', 'Working', 'focused', 'search', [{ model: 'magnifier', mount: 'handR', scale: 0.55, rot: [0.3, 0, 0] }, { model: 'branch', mount: 'world', pos: [0.95, 1.1, 0.3], scale: 0.45, motion: 'float' }], { color: '#ff6a5a', mode: 'spin', speed: 1.8, text: 'Debugging' }),
  s('reviewing', 'Reviewing', 'Working', 'focused', 'read', [{ model: 'document', mount: 'world', pos: [0, 0.95, 0.42], rot: [-0.5, 0, 0], scale: 0.62 }], { color: '#4fd8ff', mode: 'spin', speed: 0.9, text: 'Reviewing' }),
  s('running', 'Running', 'Working', 'excited', 'gallop', [{ model: 'gear', mount: 'world', pos: [1.0, 1.3, 0.2], scale: 0.4, motion: 'spin' }], { color: '#5dffa0', mode: 'spin', speed: 3, text: 'Running' }),
  s('installing', 'Installing', 'Shipping', 'focused', 'carry', [{ model: 'package', mount: 'world', pos: [0, 0.72, 0.42], scale: 0.5 }], { color: '#c9a074', mode: 'pulse', speed: 1.5, text: 'Installing' }),
  s('compiling', 'Compiling', 'Shipping', 'focused', 'type', [TABLE, onTable('laptop', 0.62, 0, [0, Math.PI, 0]), { model: 'gear', mount: 'world', pos: [1.0, 1.1, 0.4], scale: 0.38, motion: 'spin' }], { color: '#ffb347', mode: 'spin', speed: 2.4, text: 'Compiling' }, { sits: true }),
  s('deploying', 'Deploying', 'Shipping', 'excited', 'point', [{ model: 'rocket', mount: 'world', pos: [1.35, 1.0, 0.1], scale: 1.1, motion: 'float' }], { color: '#ff7a59', mode: 'spin', speed: 2.8, text: 'Deploying' }, { suggestWorld: 'space' }),
  s('waiting', 'Waiting', 'Rest', 'relaxed', 'wait', [{ model: 'coffee', mount: 'handR', scale: 0.4, rot: [0.1, 0, 0] }], { color: '#9aa1b0', mode: 'pulse', speed: 0.6, text: 'Waiting for input' }),
  s('blocked', 'Blocked', 'Outcome', 'worried', 'confused', [{ model: 'lock', mount: 'world', pos: [0.9, 1.0, 0.4], scale: 0.5, motion: 'float' }], { color: '#ff6a5a', mode: 'pulse', speed: 2.2, text: 'Blocked — needs input' }),
  s('successful', 'Successful', 'Outcome', 'happy', 'celebrate', [{ model: 'star', mount: 'world', pos: [0.0, 2.1, 0.2], scale: 0.4, motion: 'spin' }], { color: '#5dffa0', mode: 'flash', speed: 1.6, text: 'Success' }),
  s('failed', 'Failed', 'Outcome', 'worried', 'sad', [], { color: '#ff6a5a', mode: 'shake', speed: 2.4, text: 'Failed' }),
  s('learning', 'Learning', 'Thinking', 'curious', 'read', [{ model: 'book', mount: 'world', pos: [0, 0.92, 0.42], rot: [-0.55, 0, 0], scale: 0.62 }, { model: 'star', mount: 'world', pos: [0.85, 1.5, 0.3], scale: 0.28, motion: 'spin' }], { color: '#ffd24a', mode: 'spin', speed: 1, text: 'Learning' }),
  s('researching', 'Researching', 'Thinking', 'curious', 'search', [{ model: 'magnifier', mount: 'handR', scale: 0.55, rot: [0.3, 0, 0] }, { model: 'book', mount: 'world', pos: [-0.95, 0.35, 0.5], rot: [-0.2, 0.5, 0], scale: 0.5 }], { color: '#4fd8ff', mode: 'spin', speed: 1.6, text: 'Researching' }),
  s('processing', 'Processing', 'Thinking', 'focused', 'think', [{ model: 'database', mount: 'world', pos: [0.95, 0.95, 0.3], scale: 0.5, motion: 'float' }, { model: 'gear', mount: 'world', pos: [-0.95, 1.15, 0.3], scale: 0.32, motion: 'spin' }], { color: '#4a7bff', mode: 'spin', speed: 2, text: 'Processing' }),
  s('responding', 'Responding', 'Outcome', 'talking', null, [], { color: '#7f9bff', mode: 'pulse', speed: 3, text: 'Responding' }),
  s('completed', 'Completed', 'Outcome', 'happy', 'celebrate', [{ model: 'medal', mount: 'world', pos: [0, 2.05, 0.2], scale: 0.45, motion: 'float' }], { color: '#5dffa0', mode: 'still', speed: 0, text: 'Completed' }),
  s('sleeping', 'Sleeping', 'Rest', 'sleepy', 'sleep', [], { color: '#6f7fb8', mode: 'pulse', speed: 0.4, text: 'Asleep' }),
  s('emailing', 'Emailing', 'Working', 'happy', 'point', [{ model: 'envelope', mount: 'handR', scale: 0.5, rot: [0.2, 0, 0.1] }], { color: '#ff8fa8', mode: 'pulse', speed: 1.4, text: 'Sending mail' }),
  s('calculating', 'Calculating', 'Working', 'focused', 'type', [TABLE, onTable('calculator', 0.4, -0.1, [-1.2, 0, 0]), onTable('spreadsheet', 0.42, 0.5, [-1.3, 0, 0])], { color: '#2f9e62', mode: 'spin', speed: 1.5, text: 'Calculating' }, { sits: true }),
]) as Record<AgentStateId, AgentStateDef>;

export const AGENT_GROUPS: AgentStateDef['group'][] = ['Thinking', 'Working', 'Shipping', 'Outcome', 'Rest'];
