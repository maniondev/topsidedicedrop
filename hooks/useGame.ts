import { useReducer, useEffect, useRef, useCallback } from 'react';
import { PIECES, PIECE_MAP } from '@/lib/pieces';
import { Board, CellValue, emptyBoard, cloneBoard } from '@/lib/board';
import { MergeEvent, resolveMerges } from '@/lib/merge';
import { applyGravity } from '@/lib/gravity';
import { scoreMerge, scoreClear } from '@/lib/scoring';
import { RNG, weightedValue } from '@/lib/rng';
import {
  COLS, ROWS, LOCK_DELAY_MS, SPAWN_DELAY_MS,
  QUEUE_SIZE, GRAVITY_BASE_MS, ENABLED_PIECE_IDS, chainResolveDelay,
} from '@/constants/game';

// ── Types ────────────────────────────────────────────────────────────────────

export interface PieceTileState {
  dr: number;
  dc: number;
  value: CellValue;
}

export interface ActivePiece {
  shapeId: string;
  rotation: number;
  anchorRow: number;
  anchorCol: number;
  tiles: PieceTileState[];
}

export interface QueuedPiece {
  shapeId: string;
  rotation: number;
  tiles: PieceTileState[];
}

export type GamePhase =
  | 'idle'
  | 'falling'
  | 'locking'
  | 'resolving'
  | 'spawning'
  | 'gameOver'
  | 'condensing';

interface GameState {
  board: Board;
  activePiece: ActivePiece | null;
  queue: QueuedPiece[];
  score: number;
  phase: GamePhase;
  continueAvailable: boolean;
  continueUsed: boolean;
  chainPass: number;
  runBestChain: number;
  triggers: Set<string>;
  lockResetKey: number;
  lockResetCount: number;
  lastMergeEvents: MergeEvent[];
}

type Action =
  | { type: 'START'; initialQueue: QueuedPiece[] }
  | { type: 'LOAD_SAVED'; board: Board; score: number; queue: QueuedPiece[]; runBestChain: number; activePiece: ActivePiece | null }
  | { type: 'TICK' }
  | { type: 'MOVE'; dir: 'left' | 'right' }
  | { type: 'ROTATE' }
  | { type: 'SOFT_DROP' }
  | { type: 'HARD_DROP' }
  | { type: 'LOCK_PIECE' }
  | { type: 'RESOLVE_STEP' }
  | { type: 'SPAWN_NEXT'; newPiece: QueuedPiece }
  | { type: 'START_CONDENSE' }
  | { type: 'UPDATE_CONDENSE_BOARD'; board: Board; scoreGained: number }
  | { type: 'FINISH_CONDENSE'; board: Board; scoreGained: number }
  | { type: 'RESET'; initialQueue: QueuedPiece[] };

// ── Pure helpers ─────────────────────────────────────────────────────────────

function getBoardTiles(p: ActivePiece) {
  return p.tiles.map(t => ({ r: p.anchorRow + t.dr, c: p.anchorCol + t.dc, value: t.value }));
}

function isLegal(board: Board, p: ActivePiece): boolean {
  for (const t of p.tiles) {
    const r = p.anchorRow + t.dr;
    const c = p.anchorCol + t.dc;
    if (r < 0) continue; // above the board is always empty
    if (r >= ROWS || c < 0 || c >= COLS) return false;
    if (board[r][c] !== null) return false;
  }
  return true;
}

function ghostRow(board: Board, p: ActivePiece): number {
  let row = p.anchorRow;
  for (;;) {
    const next = { ...p, anchorRow: row + 1 };
    if (!isLegal(board, next)) return row;
    row++;
  }
}

function inContact(board: Board, p: ActivePiece): boolean {
  return p.anchorRow >= ghostRow(board, p);
}

function rotatePiece(p: ActivePiece): ActivePiece {
  const shape = PIECE_MAP[p.shapeId];
  const nextRot = (p.rotation + 1) % shape.rotations.length;
  const newOffsets = shape.rotations[nextRot];

  // Proper 90° CW rotation: (dr, dc) → (dc, maxDr - dr), then normalize.
  // This keeps each die value attached to its tile as it moves through space,
  // so all 4 rotation states are visually distinct (e.g. [3][5] → [5][3] at 180°).
  const maxDr = Math.max(...p.tiles.map(t => t.dr));
  const rotated = p.tiles.map(t => ({ dr: t.dc, dc: maxDr - t.dr, value: t.value }));
  const minDr   = Math.min(...rotated.map(t => t.dr));
  const minDc   = Math.min(...rotated.map(t => t.dc));
  const normed  = rotated.map(t => ({ dr: t.dr - minDr, dc: t.dc - minDc, value: t.value }));

  // Map each canonical offset in the new rotation to its geometrically-rotated value.
  const newTiles = newOffsets.map(offset => {
    const match = normed.find(t => t.dr === offset.dr && t.dc === offset.dc);
    return { dr: offset.dr, dc: offset.dc, value: match?.value ?? p.tiles[0].value };
  });

  const anchorColDelta = shape.anchorColOffsets?.[nextRot] ?? 0;
  return { ...p, rotation: nextRot, tiles: newTiles, anchorCol: p.anchorCol + anchorColDelta };
}

function tryRotate(board: Board, p: ActivePiece): ActivePiece | null {
  const rotated = rotatePiece(p);
  for (const kick of [0, -1, 1, -2, 2]) {
    const kicked = { ...rotated, anchorCol: rotated.anchorCol + kick };
    if (isLegal(board, kicked)) return kicked;
  }
  return null;
}

function spawnPiece(queued: QueuedPiece, board: Board): ActivePiece | null {
  // Find the dc that has tiles in 2+ different rows — the "vertical spine".
  // Center that column on the grid. Falls back to bounding-box centering for
  // purely horizontal pieces (no multi-row column exists).
  const dcRows = new Map<number, Set<number>>();
  for (const t of queued.tiles) {
    if (!dcRows.has(t.dc)) dcRows.set(t.dc, new Set());
    dcRows.get(t.dc)!.add(t.dr);
  }
  let spineDc: number | null = null;
  for (const [dc, rows] of dcRows) {
    if (rows.size >= 2) { spineDc = dc; break; }
  }
  const gridCenter = Math.floor(COLS / 2);
  const defaultCol = spineDc !== null
    ? gridCenter - spineDc
    : Math.ceil((COLS - (Math.max(...queued.tiles.map(t => t.dc)) + 1)) / 2);
  for (const anchorRow of [0, -1]) {
    // For anchorRow < 0, skip if no tile would reach the board — nothing would be placed.
    if (anchorRow < 0 && !queued.tiles.some(t => anchorRow + t.dr >= 0)) continue;
    for (const offset of [0, -1, 1, -2, 2]) {
      const p: ActivePiece = {
        shapeId: queued.shapeId,
        rotation: queued.rotation,
        anchorRow,
        anchorCol: defaultCol + offset,
        tiles: queued.tiles,
      };
      if (isLegal(board, p)) return p;
    }
  }
  return null;
}

const EMPTY_TRIGGERS = new Set<string>();

function initialState(): GameState {
  return {
    board: emptyBoard(),
    activePiece: null,
    queue: [],
    score: 0,
    phase: 'idle',
    continueAvailable: true,
    continueUsed: false,
    chainPass: 0,
    runBestChain: 0,
    triggers: EMPTY_TRIGGERS,
    lockResetKey: 0,
    lockResetCount: 0,
    lastMergeEvents: [],
  };
}

const MAX_LOCK_RESETS = 12;

// ── Reducer ───────────────────────────────────────────────────────────────────

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {

    case 'START':
    case 'RESET': {
      const q = action.initialQueue;
      return {
        ...initialState(),
        queue: q,
        phase: 'spawning',
        continueAvailable: true,
        continueUsed: false,
      };
    }

    case 'LOAD_SAVED': {
      const base = {
        ...initialState(),
        board: action.board,
        score: action.score,
        queue: action.queue,
        runBestChain: action.runBestChain,
        continueAvailable: true,
        continueUsed: false,
      };
      // Restore the exact in-flight piece (same shape/rotation/values — no free
      // reroll), but move it back to the TOP so resuming never drops you straight
      // into a hit. Try the saved column first, then small offsets if blocked.
      if (action.activePiece) {
        const saved = action.activePiece;
        let placed: ActivePiece | null = null;
        for (const offset of [0, -1, 1, -2, 2]) {
          const candidate: ActivePiece = { ...saved, anchorRow: 0, anchorCol: saved.anchorCol + offset };
          if (isLegal(action.board, candidate)) { placed = candidate; break; }
        }
        if (placed) {
          return {
            ...base,
            activePiece: placed,
            phase: inContact(action.board, placed) ? 'locking' : 'falling',
          };
        }
      }
      return { ...base, phase: 'spawning' };
    }

    case 'TICK': {
      if (state.phase !== 'falling' || !state.activePiece) return state;
      const moved = { ...state.activePiece, anchorRow: state.activePiece.anchorRow + 1 };
      if (!isLegal(state.board, moved)) {
        return { ...state, phase: 'locking' };
      }
      return {
        ...state,
        activePiece: moved,
        phase: inContact(state.board, moved) ? 'locking' : 'falling',
      };
    }

    case 'MOVE': {
      if (!state.activePiece) return state;
      if (state.phase !== 'falling' && state.phase !== 'locking') return state;
      const dc = action.dir === 'left' ? -1 : 1;
      const moved = { ...state.activePiece, anchorCol: state.activePiece.anchorCol + dc };
      if (!isLegal(state.board, moved)) return state;
      const contact = inContact(state.board, moved);
      const atCap = state.lockResetCount >= MAX_LOCK_RESETS;
      // Once cap is hit, keep piece in locking so the running timer isn't restarted
      // by a falling→locking phase oscillation.
      const newPhase = contact || (atCap && state.phase === 'locking') ? 'locking' : 'falling';
      const resetsTimer = state.phase === 'locking' && newPhase === 'locking' && !atCap;
      return {
        ...state,
        activePiece: moved,
        phase: newPhase,
        lockResetKey: resetsTimer ? state.lockResetKey + 1 : state.lockResetKey,
        lockResetCount: resetsTimer ? state.lockResetCount + 1 : state.lockResetCount,
      };
    }

    case 'ROTATE': {
      if (!state.activePiece) return state;
      if (state.phase !== 'falling' && state.phase !== 'locking') return state;
      const kicked = tryRotate(state.board, state.activePiece);
      if (!kicked) return state;
      const contact = inContact(state.board, kicked);
      const atCap = state.lockResetCount >= MAX_LOCK_RESETS;
      const newPhase = contact || (atCap && state.phase === 'locking') ? 'locking' : 'falling';
      const resetsTimer = state.phase === 'locking' && newPhase === 'locking' && !atCap;
      return {
        ...state,
        activePiece: kicked,
        phase: newPhase,
        lockResetKey: resetsTimer ? state.lockResetKey + 1 : state.lockResetKey,
        lockResetCount: resetsTimer ? state.lockResetCount + 1 : state.lockResetCount,
      };
    }

    case 'SOFT_DROP': {
      if (state.phase !== 'falling' && state.phase !== 'locking') return state;
      return reducer(state, { type: 'TICK' });
    }

    case 'HARD_DROP': {
      if (!state.activePiece) return state;
      if (state.phase !== 'falling' && state.phase !== 'locking') return state;
      const gr = ghostRow(state.board, state.activePiece);
      return {
        ...state,
        activePiece: { ...state.activePiece, anchorRow: gr },
        phase: 'locking',
      };
    }

    case 'LOCK_PIECE': {
      if (state.phase !== 'locking' || !state.activePiece) return state;
      const board = cloneBoard(state.board);
      const triggers = new Set<string>();
      let id = Date.now();
      for (const t of state.activePiece.tiles) {
        const r = state.activePiece.anchorRow + t.dr;
        const c = state.activePiece.anchorCol + t.dc;
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
          board[r][c] = { value: t.value, id: `t${id++}` };
          triggers.add(`${r},${c}`);
        }
      }
      return {
        ...state,
        board,
        activePiece: null,
        phase: 'resolving',
        chainPass: 0,
        triggers,
        lastMergeEvents: [],
      };
    }

    case 'RESOLVE_STEP': {
      if (state.phase !== 'resolving') return state;

      const { newBoard, events, changed } = resolveMerges(state.board, state.triggers);

      if (!changed) {
        const { newBoard: gravBoard, moved } = applyGravity(state.board);
        if (!moved) return { ...state, phase: 'spawning' };
        // After gravity, the tiles that moved become new triggers
        const newTriggers = new Set<string>();
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (gravBoard[r][c] && state.board[r][c] === null) {
              newTriggers.add(`${r},${c}`);
            }
          }
        }
        return { ...state, board: gravBoard, triggers: newTriggers };
      }

      const pass = state.chainPass;
      let gain = 0;
      for (const evt of events) {
        if (evt.newValue === 'clear') gain += scoreClear(pass);
        else gain += scoreMerge(evt.newValue as CellValue, pass, evt.group.length);
      }

      const { newBoard: gravBoard } = applyGravity(newBoard);
      const newTriggers = new Set<string>();
      // Merge result destinations
      for (const evt of events) {
        if (evt.newValue !== 'clear') newTriggers.add(`${evt.dest[0]},${evt.dest[1]}`);
      }
      // Tiles that fell due to gravity after the merge (e.g. unsupported tiles
      // that drop once space clears below them) — these are the "new" tiles and
      // should be preferred as merge destinations in the next pass.
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (gravBoard[r][c] && !newBoard[r][c]) newTriggers.add(`${r},${c}`);
        }
      }

      return {
        ...state,
        board: gravBoard,
        score: state.score + gain,
        chainPass: pass + 1,
        runBestChain: Math.max(state.runBestChain, pass + 1),
        triggers: newTriggers,
        lastMergeEvents: events,
      };
    }

    case 'SPAWN_NEXT': {
      if (state.phase !== 'spawning') return state;
      const next = state.queue[0];
      const rest = state.queue.slice(1);
      const newQueue = [...rest, action.newPiece];

      if (!next) return { ...state, phase: 'gameOver' };

      const piece = spawnPiece(next, state.board);
      if (!piece) {
        return { ...state, queue: newQueue, phase: 'gameOver' };
      }

      return {
        ...state,
        activePiece: piece,
        queue: newQueue,
        phase: inContact(state.board, piece) ? 'locking' : 'falling',
        lockResetCount: 0,
      };
    }

    case 'START_CONDENSE': {
      if (state.phase !== 'gameOver') return state;
      return { ...state, phase: 'condensing', continueUsed: true };
    }

    case 'UPDATE_CONDENSE_BOARD': {
      if (state.phase !== 'condensing') return state;
      return { ...state, board: action.board, score: state.score + action.scoreGained };
    }

    case 'FINISH_CONDENSE': {
      if (state.phase !== 'condensing') return state;
      return {
        ...state,
        board: action.board,
        score: state.score + action.scoreGained,
        phase: 'spawning',
      };
    }

    default:
      return state;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

function makePiece(shapeId: string, score: number, rng: RNG): QueuedPiece {
  const shape = PIECE_MAP[shapeId];
  const rotation = 0;
  const offsets = shape.rotations[rotation];
  return {
    shapeId,
    rotation,
    tiles: offsets.map(o => ({ dr: o.dr, dc: o.dc, value: weightedValue(score, rng) })),
  };
}

function drawShape(bag: string[], rng: RNG): { shapeId: string; newBag: string[] } {
  if (bag.length === 0) {
    const newBag = rng.shuffle([...ENABLED_PIECE_IDS]);
    return { shapeId: newBag[0], newBag: newBag.slice(1) };
  }
  return { shapeId: bag[0], newBag: bag.slice(1) };
}

export function useGame(gravityMs: number = GRAVITY_BASE_MS, paused: boolean = false) {
  const rngRef = useRef<RNG>(new RNG(Date.now()));
  const bagRef = useRef<string[]>([]);
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const nextPiece = useCallback((score: number): QueuedPiece => {
    const { shapeId, newBag } = drawShape(bagRef.current, rngRef.current);
    bagRef.current = newBag;
    return makePiece(shapeId, score, rngRef.current);
  }, []);

  // Gravity tick — stops when paused
  useEffect(() => {
    if (state.phase !== 'falling' || paused) return;
    const id = setInterval(() => dispatch({ type: 'TICK' }), gravityMs);
    return () => clearInterval(id);
  }, [state.phase, gravityMs, paused]);

  // Lock delay — resets on phase change to locking or explicit lockResetKey bump.
  useEffect(() => {
    if (state.phase !== 'locking' || paused) return;
    const id = setTimeout(() => dispatch({ type: 'LOCK_PIECE' }), LOCK_DELAY_MS);
    return () => clearTimeout(id);
  }, [state.phase, state.lockResetKey, paused]);

  // Board resolution — stops when paused.
  // Cadence builds suspense: the first two merges are fast, then each subsequent
  // chain pass waits +100ms longer (capped) — bum-bum-bum … bum … bum …  BUM.
  useEffect(() => {
    if (state.phase !== 'resolving' || paused) return;
    const delay = chainResolveDelay(state.chainPass);
    const id = setTimeout(() => dispatch({ type: 'RESOLVE_STEP' }), delay);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.board, paused]);

  // Spawn next piece — stops when paused
  useEffect(() => {
    if (state.phase !== 'spawning' || paused) return;
    const score = stateRef.current.score;
    const id = setTimeout(() => {
      dispatch({ type: 'SPAWN_NEXT', newPiece: nextPiece(score) });
    }, SPAWN_DELAY_MS);
    return () => clearTimeout(id);
  }, [state.phase, nextPiece, paused]);

  // ── Controls ───────────────────────────────────────────────────────────────

  const startGame = useCallback(() => {
    rngRef.current = new RNG(Date.now());
    bagRef.current = [];
    const q = Array.from({ length: QUEUE_SIZE + 1 }, () => nextPiece(0));
    dispatch({ type: 'START', initialQueue: q });
  }, [nextPiece]);

  const resetGame = useCallback(() => {
    rngRef.current = new RNG(Date.now());
    bagRef.current = [];
    const q = Array.from({ length: QUEUE_SIZE + 1 }, () => nextPiece(0));
    dispatch({ type: 'RESET', initialQueue: q });
  }, [nextPiece]);

  const moveLeft  = useCallback(() => dispatch({ type: 'MOVE', dir: 'left' }), []);
  const moveRight = useCallback(() => dispatch({ type: 'MOVE', dir: 'right' }), []);
  const rotate    = useCallback(() => dispatch({ type: 'ROTATE' }), []);
  const softDrop  = useCallback(() => dispatch({ type: 'SOFT_DROP' }), []);
  const hardDrop  = useCallback(() => dispatch({ type: 'HARD_DROP' }), []);

  const startCondense = useCallback(() => dispatch({ type: 'START_CONDENSE' }), []);
  const updateCondenseBoard = useCallback((board: Board, scoreGained: number) => {
    dispatch({ type: 'UPDATE_CONDENSE_BOARD', board, scoreGained });
  }, []);
  const finishCondense = useCallback((board: Board, scoreGained: number) => {
    dispatch({ type: 'FINISH_CONDENSE', board, scoreGained });
  }, []);

  const ghost = state.activePiece ? ghostRow(state.board, state.activePiece) : null;

  /** Serialise current state for "Continue Later" (includes the in-flight piece) */
  const exportState = useCallback(() => ({
    board: state.board,
    score: state.score,
    queue: state.queue,
    runBestChain: state.runBestChain,
    activePiece: state.activePiece,
  }), [state.board, state.score, state.queue, state.runBestChain, state.activePiece]);

  /** Restore from a saved game (board + score + queue + the exact active piece) */
  const loadSaved = useCallback((
    board: Board, score: number, queue: QueuedPiece[], runBestChain: number,
    activePiece: ActivePiece | null,
  ) => {
    rngRef.current = new RNG(Date.now());
    bagRef.current = [];
    // Refill queue to QUEUE_SIZE+1 if needed
    const filledQueue = [...queue];
    while (filledQueue.length < QUEUE_SIZE + 1) {
      filledQueue.push(nextPiece(score));
    }
    dispatch({ type: 'LOAD_SAVED', board, score, queue: filledQueue, runBestChain, activePiece });
  }, [nextPiece]);

  return {
    board: state.board,
    activePiece: state.activePiece,
    ghostAnchorRow: ghost,
    queue: state.queue.slice(0, QUEUE_SIZE),
    score: state.score,
    phase: state.phase,
    continueAvailable: state.continueAvailable && !state.continueUsed,
    runBestChain: state.runBestChain,
    chainPass: state.chainPass,
    lastMergeEvents: state.lastMergeEvents,
    startGame,
    resetGame,
    moveLeft,
    moveRight,
    rotate,
    softDrop,
    hardDrop,
    startCondense,
    updateCondenseBoard,
    finishCondense,
    exportState,
    loadSaved,
  };
}
