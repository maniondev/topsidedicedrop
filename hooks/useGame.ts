import { useReducer, useEffect, useRef, useCallback } from 'react';
import { PIECES, PIECE_MAP } from '@/lib/pieces';
import { Board, CellValue, emptyBoard, cloneBoard } from '@/lib/board';
import { MergeEvent, resolveMerges } from '@/lib/merge';
import { applyGravity } from '@/lib/gravity';
import { scoreMerge, scoreClear } from '@/lib/scoring';
import { RNG, weightedValue } from '@/lib/rng';
import {
  COLS, ROWS, LOCK_DELAY_MS, RESOLVE_PAUSE_MS, SPAWN_DELAY_MS,
  QUEUE_SIZE, GRAVITY_BASE_MS, ENABLED_PIECE_IDS,
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
  triggers: Set<string>;
  lockResetKey: number;
  lastMergeEvents: MergeEvent[];
}

type Action =
  | { type: 'START'; initialQueue: QueuedPiece[] }
  | { type: 'TICK' }
  | { type: 'MOVE'; dir: 'left' | 'right' }
  | { type: 'ROTATE' }
  | { type: 'SOFT_DROP' }
  | { type: 'HARD_DROP' }
  | { type: 'LOCK_PIECE' }
  | { type: 'RESOLVE_STEP' }
  | { type: 'SPAWN_NEXT'; newPiece: QueuedPiece }
  | { type: 'START_CONDENSE' }
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
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
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
  const offsets = shape.rotations[nextRot];
  return {
    ...p,
    rotation: nextRot,
    tiles: offsets.map((o, i) => ({ dr: o.dr, dc: o.dc, value: p.tiles[i % p.tiles.length].value })),
  };
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
  const maxDc = Math.max(...queued.tiles.map(t => t.dc));
  const pieceW = maxDc + 1;
  const defaultCol = Math.floor((COLS - pieceW) / 2);
  for (const offset of [0, -1, 1, -2, 2]) {
    const p: ActivePiece = {
      shapeId: queued.shapeId,
      rotation: queued.rotation,
      anchorRow: 0,
      anchorCol: defaultCol + offset,
      tiles: queued.tiles,
    };
    if (isLegal(board, p)) return p;
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
    triggers: EMPTY_TRIGGERS,
    lockResetKey: 0,
    lastMergeEvents: [],
  };
}

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
      return {
        ...state,
        activePiece: moved,
        phase: contact ? 'locking' : 'falling',
        lockResetKey: state.phase === 'locking' ? state.lockResetKey + 1 : state.lockResetKey,
      };
    }

    case 'ROTATE': {
      if (!state.activePiece) return state;
      if (state.phase !== 'falling' && state.phase !== 'locking') return state;
      const kicked = tryRotate(state.board, state.activePiece);
      if (!kicked) return state;
      const contact = inContact(state.board, kicked);
      return {
        ...state,
        activePiece: kicked,
        phase: contact ? 'locking' : 'falling',
        lockResetKey: state.phase === 'locking' ? state.lockResetKey + 1 : state.lockResetKey,
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
        lockResetKey: state.lockResetKey + 1,
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

      const pass = state.chainPass + 1;
      let gain = 0;
      for (const evt of events) {
        if (evt.newValue === 'clear') gain += scoreClear(pass);
        else gain += scoreMerge(evt.newValue as CellValue, pass);
      }

      const { newBoard: gravBoard } = applyGravity(newBoard);
      const newTriggers = new Set<string>();
      for (const evt of events) {
        if (evt.newValue !== 'clear') newTriggers.add(`${evt.dest[0]},${evt.dest[1]}`);
      }

      return {
        ...state,
        board: gravBoard,
        score: state.score + gain,
        chainPass: pass,
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
      };
    }

    case 'START_CONDENSE': {
      if (state.phase !== 'gameOver' || state.continueUsed) return state;
      return { ...state, phase: 'condensing' };
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

export function useGame() {
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

  // Gravity tick
  useEffect(() => {
    if (state.phase !== 'falling') return;
    const id = setInterval(() => dispatch({ type: 'TICK' }), GRAVITY_BASE_MS);
    return () => clearInterval(id);
  }, [state.phase]);

  // Lock delay (resets on lockResetKey change so moves reset the timer)
  useEffect(() => {
    if (state.phase !== 'locking') return;
    const id = setTimeout(() => dispatch({ type: 'LOCK_PIECE' }), LOCK_DELAY_MS);
    return () => clearTimeout(id);
  }, [state.phase, state.lockResetKey]);

  // Board resolution steps
  useEffect(() => {
    if (state.phase !== 'resolving') return;
    const id = setTimeout(() => dispatch({ type: 'RESOLVE_STEP' }), RESOLVE_PAUSE_MS);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.board]);

  // Spawn next piece
  useEffect(() => {
    if (state.phase !== 'spawning') return;
    const score = stateRef.current.score;
    const id = setTimeout(() => {
      dispatch({ type: 'SPAWN_NEXT', newPiece: nextPiece(score) });
    }, SPAWN_DELAY_MS);
    return () => clearTimeout(id);
  }, [state.phase, nextPiece]);

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
  const finishCondense = useCallback((board: Board, scoreGained: number) => {
    dispatch({ type: 'FINISH_CONDENSE', board, scoreGained });
  }, []);

  const ghost = state.activePiece ? ghostRow(state.board, state.activePiece) : null;

  return {
    board: state.board,
    activePiece: state.activePiece,
    ghostAnchorRow: ghost,
    queue: state.queue.slice(0, QUEUE_SIZE),
    score: state.score,
    phase: state.phase,
    continueAvailable: state.continueAvailable && !state.continueUsed,
    lastMergeEvents: state.lastMergeEvents,
    startGame,
    resetGame,
    moveLeft,
    moveRight,
    rotate,
    softDrop,
    hardDrop,
    startCondense,
    finishCondense,
  };
}
