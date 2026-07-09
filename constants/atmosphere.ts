import { ThemeId } from './theme';

// Per-theme "atmosphere" — the layer that makes a theme feel like a place, not
// just a recolor. Mirrors the color-palette pattern: only the showcase themes
// have an entry; everything else stays flat (ThemeAtmosphere renders null).
//
// Each ambient element is listed independently so we can drop the one we don't
// like later without touching the other.

export type AmbientKind = 'leaves' | 'fireflies' | 'bubbles' | 'caustics' | 'neonParticles';
export type BackgroundKind = 'forest' | 'ocean' | 'neon';

export interface Atmosphere {
  background: BackgroundKind;
  // Vertical background gradient, top → bottom.
  gradient: string[];
  // Soft light-blob color layered over the gradient (dappled sun / light
  // shafts / neon bloom).
  glow: string;
  // Ambient particle layers, drawn in order; each independently removable.
  ambient: AmbientKind[];
  // Tint for the particle glow (fireflies / bubble sheen / neon motes).
  particle: string;
}

export const ATMOSPHERE: Partial<Record<ThemeId, Atmosphere>> = {
  forest: {
    background: 'forest',
    gradient: ['#0A1810', '#122414', '#1B2E1C'],
    glow: '#3E5E34',      // dappled sunlight through the canopy
    ambient: ['leaves', 'fireflies'],
    particle: '#EAF2A6',  // warm firefly glow
  },
  ocean: {
    background: 'ocean',
    gradient: ['#07131F', '#0A1B2E', '#0E2A44'],
    glow: '#155A6E',      // light shafts / caustic tint
    ambient: ['bubbles', 'caustics'],
    particle: '#CFEFFF',  // pale bubble sheen
  },
  neon: {
    background: 'neon',
    gradient: ['#000008', '#050516', '#0B0B22'],
    glow: '#2A1A6A',      // deep violet bloom
    ambient: ['neonParticles'],
    particle: '#00FFFF',
  },
};
