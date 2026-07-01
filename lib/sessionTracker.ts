import { AppState } from 'react-native';

const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

let firstRunUsed = false;
let lastBackgroundedAt = 0;
let initialized = false;

export function initSessionTracker() {
  if (initialized) return;
  initialized = true;
  AppState.addEventListener('change', state => {
    if (state === 'background' || state === 'inactive') {
      lastBackgroundedAt = Date.now();
    } else if (state === 'active' && lastBackgroundedAt > 0) {
      if (Date.now() - lastBackgroundedAt > SESSION_TIMEOUT_MS) {
        firstRunUsed = false;
      }
    }
  });
}

export function isFirstRunOfSession(): boolean {
  return !firstRunUsed;
}

export function markFirstRunUsed(): void {
  firstRunUsed = true;
}

export function resetFirstRunForQuit(): void {
  firstRunUsed = false;
}
