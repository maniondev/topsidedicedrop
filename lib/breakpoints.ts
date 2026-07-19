import { Platform, Dimensions } from 'react-native';

// Single tablet breakpoint for the whole app. Module-load snapshot (matching
// the pattern the per-file copies used) — iPads report isPad regardless of
// window size; the width check catches large Android tablets/foldables.
// Import THIS instead of redeclaring the one-liner in each component.
export const IS_LARGE = (Platform as any).isPad || Dimensions.get('window').width >= 600;
