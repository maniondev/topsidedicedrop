import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

const PLAYER_ID_KEY    = 'td_player_id';
const DISPLAY_NAME_KEY = 'td_display_name';
const REGISTERED_KEY   = 'td_registered';

const ADJECTIVES = [
  'Swift','Bold','Sharp','Slick','Grim','Wild','Calm','Vast','Keen','Sly','Deft','Brisk',
  'Rapid','Fierce','Smooth','Lucky','Prime','Deep','Hard','Cold','Icy','Odd','Dark','Cool',
  'Quick','Iron','Steel','True','Raw','Neon','Free','High','Stray','Lone','Mad','Crisp',
  'Gold','Jade','Void','Dense','Bright','Brave','Bare','Flat','Thin','Hot','Tense','Stark',
  'Blunt','Firm','Still','Stoic','Stout','Tough','Wise','Wry','Pure','Null','Hex','Even',
  'Ace','Peak','Sage','Rash','Rogue','Flux','Glow','Haze','Hush','Inky','Jolt','Lean',
  'Lithe','Lush','Mute','Nimble','Pale','Plum','Prim','Rigid','Rusty','Salt','Shard','Sleek',
  'Taut','Trim','Turbo','Ultra','Vague','Wiry','Zero','Bleak','Brash',
  'Fluffy','Tiny','Cozy','Snug','Fuzzy','Bouncy','Perky','Sunny','Rosy','Cheery',
  'Bubbly','Breezy','Wiggly','Peppy','Giggly','Dinky','Dewy','Dainty','Plush','Chirpy',
  'Wobbly','Goofy','Wonky','Zany','Wacky','Grumpy','Cranky','Loopy','Nutty','Quirky',
  'Silly','Snarky','Spooky','Chunky','Clumsy','Dopey','Hangry','Squishy','Dizzy','Bogus',
  'Cosmic','Electric','Frozen','Blazing','Stormy','Dusty','Frosty','Gritty','Jagged','Kinetic',
  'Mighty','Noble','Phantom','Primal','Rebel','Shadow','Silent','Sonic','Stellar','Toxic',
  'Twisted','Wicked','Amber','Azure','Cobalt','Crimson','Ember','Flint','Gilded','Gloomy',
  'Indigo','Ivory','Lunar','Marble','Misty','Murky','Onyx','Opal','Scarlet','Silver',
  'Slate','Teal','Velvet','Warped','Hollow','Humble','Lawless','Obscure','Spectral','Subtle',
  'Umbral','Veiled','Worthy','Zealous','Frosted','Weary','Viral','Ragged','Rustic','Mossy','Ashen',
];

const NOUNS = [
  'Tile','Drop','Stack','Block','Cube','Dice','Roll','Merge','Shift','Crash','Slam','Flip',
  'Chain','Combo','Surge','Burst','Spark','Blaze','Clash','Smash','Snap','Lock','Fall','Push',
  'Spin','Blast','Dash','Rush','Slide','Swap','Link','Match','Run','Shot','Crack','Pop',
  'Tap','Bump','Grind','Pivot','Edge','Face','Grid','Heap','Hook','Jump','Kick','Lane',
  'Loop','Mark','Node','Path','Pile','Rack','Ramp','Ring','Roof','Rung','Seal','Seam',
  'Seat','Shed','Skip','Slab','Slot','Spike','Spot','Step','Stop','Tank','Tier','Trap',
  'Trek','Trim','Trip','Tuck','Turn','Vault','Vein','Wall','Wave','Zone','Arc','Base',
  'Beam','Cell','Core','Coil','Curl','Deck','Dive','Dome','Draw',
  'Blob','Boop','Bonk','Bubble','Button','Chime','Clonk','Dimple','Doink','Dot',
  'Drizzle','Fizz','Flop','Mochi','Noodle','Nugget','Pebble','Plop','Plonk','Puff',
  'Splat','Squish','Thud','Wisp','Wonk','Zonk','Zap','Sprout','Boink','Chirp',
  'Chip','Cipher','Crest','Crown','Crystal','Emblem','Facet','Flare','Forge','Glyph',
  'Gust','Knot','Lance','Meld','Nexus','Notch','Orbit','Pixel','Prism','Pulse',
  'Quest','Relic','Rift','Rune','Shrine','Signal','Sigil','Sliver','Socket','Spire',
  'Storm','Strand','Strike','Symbol','Tempo','Torch','Tower','Trail','Trench','Tunnel',
  'Turret','Vector','Vertex','Warp','Wedge','Whirl','Wing','Wraith','Zenith','Quartz',
  'Totem','Trinket','Vortex','Fractal','Stream','Stride','Synth','Siren','Fleck','Ledge',
  'Plume','Specter','Splinter','Ember','Mote','Nook','Perch','Shard',
];

function generateName(): string {
  const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num  = Math.floor(100 + Math.random() * 900);
  return `${adj}${noun}${num}`;
}

let _playerId:    string | null = null;
let _displayName: string | null = null;

export async function getPlayerIdentity(): Promise<{ playerId: string; displayName: string }> {
  if (_playerId && _displayName) return { playerId: _playerId, displayName: _displayName };

  const [storedId, storedName, isRegistered] = await Promise.all([
    AsyncStorage.getItem(PLAYER_ID_KEY),
    AsyncStorage.getItem(DISPLAY_NAME_KEY),
    AsyncStorage.getItem(REGISTERED_KEY),
  ]);

  let playerId    = storedId   ?? generateUUID();
  let displayName = storedName ?? generateName();

  if (!storedId)   await AsyncStorage.setItem(PLAYER_ID_KEY,    playerId);
  if (!storedName) await AsyncStorage.setItem(DISPLAY_NAME_KEY, displayName);

  // Register with Supabase once to claim a unique name in the players table
  if (!isRegistered) {
    try {
      const { data, error } = await supabase.rpc('register_player', {
        p_player_id:      playerId,
        p_candidate_name: displayName,
      });
      if (!error && data) {
        displayName = data as string;
        await Promise.all([
          AsyncStorage.setItem(DISPLAY_NAME_KEY, displayName),
          AsyncStorage.setItem(REGISTERED_KEY,   '1'),
        ]);
      }
    } catch {}
  }

  _playerId    = playerId;
  _displayName = displayName;
  return { playerId, displayName };
}

// Retries up to 10 times on name collision (36M combos makes this extremely unlikely)
export async function regenerateName(): Promise<string> {
  const { playerId } = await getPlayerIdentity();

  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateName();
    const { error } = await supabase.rpc('update_display_name', {
      p_player_id: playerId,
      p_new_name:  candidate,
    });
    if (!error) {
      _displayName = candidate;
      await AsyncStorage.setItem(DISPLAY_NAME_KEY, candidate);
      return candidate;
    }
    if (!error.message?.includes('Name already taken')) {
      throw error;
    }
  }

  throw new Error('Could not find a unique name. Please try again.');
}
