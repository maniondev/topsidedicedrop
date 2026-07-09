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
    // Real-ocean depth: lit teal surface up top, darkening into the deep.
    gradient: ['#1A5568', '#0E3247', '#061019'],
    glow: '#2E7E92',      // surface caustic light
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
