import { ThemeId } from './theme';

// Per-theme "atmosphere" — the layer that makes a theme feel like a place, not
// just a recolor. Mirrors the color-palette pattern: only the showcase themes
// have an entry; everything else stays flat (ThemeAtmosphere renders null).
//
// Each ambient element is listed independently so we can drop the one we don't
// like later without touching the other.

export type AmbientKind = 'leaves' | 'fireflies' | 'bubbles' | 'caustics' | 'neonParticles' | 'bokeh' | 'dust' | 'embers';
export type BackgroundKind = 'forest' | 'ocean' | 'neon' | 'pastel' | 'grayscale' | 'dicedrop';

export interface Atmosphere {
  background: BackgroundKind;
  // Vertical background gradient, top → bottom.
  gradient: string[];
  // Soft light-blob color layered over the gradient (dappled sun / light
  // shafts / neon bloom).
  glow: string;
  // Ambient particle layers, drawn in order; each independently removable.
  ambient: AmbientKind[];
  // Tint for the particle glow (fireflies / bubble sheen / neon motes / dust).
  particle: string;
  // Optional multi-colour set (pastel bokeh cycles through these baby hues).
  palette?: string[];
}

export const ATMOSPHERE: Partial<Record<ThemeId, Atmosphere>> = {
  dicedrop: {
    background: 'dicedrop',
    // Fireside warmth: darker overhead, warming toward the hearth below.
    // Centered on the theme's flat #1C1008 so the overall feel (and every
    // surface color tuned against it) is unchanged; the top/bottom stops are
    // pushed ~1.6x further from that anchor than the original subtle version
    // for a more pronounced sweep.
    gradient: ['#130B05', '#1C1008', '#28170B'],
    glow: '#7A3A20',      // low hearth glow
    ambient: ['embers'],
    particle: '#FFB067',  // warm ember motes
  },
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
  pastel: {
    background: 'pastel',
    // Soft multi-pastel wash: pink → lavender → blue (light theme).
    gradient: ['#F7E9F1', '#EEE9F8', '#E7EFFB'],
    glow: '#FFFFFF',
    ambient: ['bokeh'],
    particle: '#C9B0EC',
    // Cool baby colours the bokeh orbs cycle through: pink, coral, purple,
    // peach, blue.
    palette: ['#F4A8C4', '#F09A9A', '#C09AE6', '#F3BE9A', '#9EBEEC'],
  },
  grayscale: {
    background: 'grayscale',
    // Clean near-white → soft grey for gentle depth (light theme).
    gradient: ['#FFFFFF', '#F1F1F4', '#E4E4E9'],
    glow: '#FFFFFF',
    ambient: ['dust'],
    particle: '#B4B4BE',   // soft grey motes
  },
};
