import type { ThemeId } from './theme';
import type { SoundtrackId } from '@/contexts/MusicContext';
import type { DiceStyleId } from '@/contexts/DiceStyleContext';
import type { SoundPackId } from '@/contexts/SoundContext';
import type { AnimPackId } from '@/contexts/AnimationContext';

// Optional "complete the look" bundle per theme — everything customizable
// EXCEPT the app icon. Only themes listed here offer the one-tap "Match" card
// in the theme picker; any unset field is left untouched when applying.
//
// IMPORTANT: these reference stable IDs, NOT display labels. Renaming any label
// (a soundtrack, dice style, sound pack, etc.) will NOT affect this matching.
// If an ID is ever removed/renamed, TypeScript flags it here at compile time.
export interface ThemePreset {
  soundtrack?: SoundtrackId;
  diceStyle?: DiceStyleId;
  soundPack?: SoundPackId;   // Sound Effects
  animPack?: AnimPackId;     // Dice Animations
}

// Authored mapping (labels shown in comments; values are the stable IDs).
export const THEME_PRESETS: Partial<Record<ThemeId, ThemePreset>> = {
  // Dice Drop · Classic SFX · Classic motion · Classic dice
  dicedrop:  { soundtrack: 'dicedrop',   soundPack: 'topside', animPack: 'classic', diceStyle: 'classic' },
  // "Classic" theme · Classic soundtrack · Classic SFX · Classic motion · Classic dice
  dice:      { soundtrack: 'classic',    soundPack: 'topside', animPack: 'classic', diceStyle: 'classic' },
  // Light · Classic soundtrack · Snow SFX · Classic motion · Classic dice
  light:     { soundtrack: 'classic',    soundPack: 'snow',    animPack: 'classic', diceStyle: 'classic' },
  // Dark · Dice Drop soundtrack · Metal SFX · Shatter motion · 8-Bit dice
  dark:      { soundtrack: 'dicedrop',   soundPack: 'metal',   animPack: 'shatter', diceStyle: 'pixel' },
  // Pastel · Forest soundtrack · Bubbles SFX · Extra motion · Jelly dice
  pastel:    { soundtrack: 'forest',     soundPack: 'bubbles', animPack: 'extra',   diceStyle: 'pastel' },
  // Grayscale · Classic soundtrack · Marimba SFX · Twist motion · Round dice
  grayscale: { soundtrack: 'classic',    soundPack: 'marimba', animPack: 'twist',   diceStyle: 'round' },
  // Ocean · Ocean soundtrack · Splash SFX · Extra motion · Sea Glass dice
  ocean:     { soundtrack: 'underwater', soundPack: 'splash',  animPack: 'extra',   diceStyle: 'ocean' },
  // Forest · Forest soundtrack · Dig SFX · Minimal motion · Wooden dice
  forest:    { soundtrack: 'forest',     soundPack: 'dig',     animPack: 'minimal', diceStyle: 'wooden' },
  // Neon · Neon soundtrack · Coins SFX · Glitch motion · Neon dice
  neon:      { soundtrack: 'neon',       soundPack: 'coins',   animPack: 'glitch',  diceStyle: 'neon' },
};
