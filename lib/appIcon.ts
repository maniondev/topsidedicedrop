import { NativeModules, Platform } from 'react-native';

export type AppIconId = 'default' | 'AppIcon-WarmSerenity' | 'AppIcon-Cream';

export const APP_ICON_META: Record<AppIconId, { label: string }> = {
  'default':              { label: 'Default' },
  'AppIcon-WarmSerenity': { label: 'Warm Serenity' },
  'AppIcon-Cream':        { label: 'Cream' },
};

export const APP_ICON_IDS: AppIconId[] = ['default', 'AppIcon-WarmSerenity', 'AppIcon-Cream'];

// iOS-only for now — Android's equivalent (activity-alias) needs a persistent
// native project + config plugin, which this app doesn't have (Android is
// regenerated fresh on every EAS build).
export const APP_ICON_SUPPORTED = Platform.OS === 'ios';

let cachedCurrent: AppIconId = 'default';

export async function getAppIcon(): Promise<AppIconId> {
  if (!APP_ICON_SUPPORTED) return 'default';
  try {
    const name: string = await NativeModules.RNAppIcon.getIcon();
    if (name in APP_ICON_META) cachedCurrent = name as AppIconId;
    return cachedCurrent;
  } catch {
    return cachedCurrent;
  }
}

export async function setAppIcon(id: AppIconId): Promise<boolean> {
  if (!APP_ICON_SUPPORTED) return false;
  try {
    const ok: boolean = await NativeModules.RNAppIcon.setIcon(id);
    if (ok) cachedCurrent = id;
    return ok;
  } catch {
    return false;
  }
}

// Synchronous best-effort label for places that can't await (e.g. the
// Settings list row) — reflects the last known value from getAppIcon()/setAppIcon().
export function getCurrentAppIconLabel(): string {
  return APP_ICON_META[cachedCurrent].label;
}
