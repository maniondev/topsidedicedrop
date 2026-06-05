export const COLS = 6;
export const ROWS = 8;

export const GRAVITY_BASE_MS = 960;
export const LOCK_DELAY_MS = 300;
export const RESOLVE_PAUSE_MS = 110;
export const MERGE_ANIM_MS = 150;
export const SPAWN_DELAY_MS = 120;
export const QUEUE_SIZE = 3;

export const ENABLED_PIECE_IDS = ['P1', 'P2', 'P3', 'P4', 'P5'];

// Die value → fill color (matches Topside theme FACE_COLOR_SEQUENCE)
export const VALUE_COLORS: Record<number, string> = {
  1: '#E45757',
  2: '#F2994A',
  3: '#F2C94C',
  4: '#27AE60',
  5: '#2F80ED',
  6: '#9B51E0',
};

// Dot color for each value (dark on light faces, white on dark faces)
export const VALUE_DOT_COLORS: Record<number, string> = {
  1: '#ffffff',
  2: '#ffffff',
  3: '#1A1A1A',
  4: '#ffffff',
  5: '#ffffff',
  6: '#ffffff',
};

export const CHAIN_MULTIPLIERS = [1.0, 1.0, 1.25, 1.5, 2.0];
export const SIX_CLEAR_BASE = 20;
