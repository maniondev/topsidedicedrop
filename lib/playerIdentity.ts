import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { supabase } from './supabase';

// Keychain keys — survive app deletion/reinstall on iOS (same device + Apple ID).
const KC_REFRESH_TOKEN = 'td_refresh_token';
const KC_PLAYER_ID     = 'td_kc_player_id';

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
  // confident/swagger
  'Clutch','Dapper','Primo','Snappy','Zippy','Plucky','Crafty','Canny','Dashing','Spry','Nifty','Spiffy','Chipper','Frisky',
  // whimsical/food-adjacent
  'Toasty','Minty','Caramel','Pickled','Buttery','Crispy','Tangy','Zesty','Mellow','Malty','Glazed','Candied',
  // nature/texture
  'Briny','Petal','Ferny','Velvety','Thorny','Stony','Waxy','Silky','Grassy','Leafy','Pebbly','Flinty',
  // retro/fun
  'Groovy','Funky','Retro','Kitschy','Jazzy','Punky','Snazzy','Ritzy','Glitzy','Swanky','Dandy',
  // moody/atmospheric
  'Eerie','Dusky','Dreamy','Broody','Wispy','Foggy','Blustery','Hazy',
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
  // animals
  'Fox','Hawk','Moth','Raven','Otter','Lynx','Finch','Gecko','Newt','Vole','Stoat','Mink','Wren','Kite','Pika','Dingo','Quail',
  // food/cozy
  'Waffle','Pretzel','Biscuit','Truffle','Dumpling','Crumpet','Muffin','Cobbler','Toffee','Nougat','Praline','Scone','Brioche','Fritter','Taffy',
  // game-feel
  'Flick','Nudge','Juggle','Volley','Ricochet','Lunge','Feint','Parry','Juke','Lob','Swerve','Jab','Fling',
  // personality/misc
  'Rascal','Gadget','Gizmo','Widget','Sprocket','Bobbin','Thimble','Donut','Bauble','Gremlin',
  // more animals
  'Badger','Ferret','Magpie','Pelican','Capybara','Axolotl','Narwhal','Pangolin','Salamander','Puffin','Jackal','Marmot',
  // objects with personality
  'Lantern','Hammock','Kettle','Canteen','Compass','Locket','Sundial','Periscope','Almanac','Satchel',
  // whimsical/fun words
  'Jamboree','Rumpus','Ruckus','Fandango','Shenanigan','Brouhaha','Hullabaloo',
];

function generateName(): string {
  const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num  = Math.floor(100 + Math.random() * 900);
  return `${adj}${noun}${num}`;
}

let _playerId:    string | null = null;
let _displayName: string | null = null;

async function getOrRestoreSession() {
  // 1. Try the in-memory Supabase client cache (fast path, no network).
  const { data: { session: cached } } = await supabase.auth.getSession();
  if (cached) return cached;

  // 2. Try restoring from Keychain (survives app deletion on iOS).
  try {
    const storedRefresh = await SecureStore.getItemAsync(KC_REFRESH_TOKEN);
    if (storedRefresh) {
      const { data, error } = await supabase.auth.refreshSession({ refresh_token: storedRefresh });
      if (!error && data.session) return data.session;
    }
  } catch {}

  // 3. First launch (or Keychain cleared) — create a new anonymous session.
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.session!;
}

export async function getPlayerIdentity(): Promise<{ playerId: string; displayName: string }> {
  if (_playerId && _displayName) return { playerId: _playerId, displayName: _displayName };

  const session = await getOrRestoreSession();
  const authUid = session.user.id;

  // Persist refresh token to Keychain so reinstalls on the same device can recover.
  if (session.refresh_token) {
    try { await SecureStore.setItemAsync(KC_REFRESH_TOKEN, session.refresh_token); } catch {}
    try { await SecureStore.setItemAsync(KC_PLAYER_ID,     authUid); } catch {}
  }

  const [storedId, storedName, isRegistered] = await Promise.all([
    AsyncStorage.getItem(PLAYER_ID_KEY),
    AsyncStorage.getItem(DISPLAY_NAME_KEY),
    AsyncStorage.getItem(REGISTERED_KEY),
  ]);

  const playerId    = authUid;
  let   displayName = storedName ?? generateName();

  if (!storedName) await AsyncStorage.setItem(DISPLAY_NAME_KEY, displayName);

  // Migration: existing install had a random UUID — move all DB rows to the auth UID.
  // Only update AsyncStorage to the new ID after a successful migration, so a network
  // failure on first launch doesn't permanently orphan the old data.
  if (storedId && storedId !== authUid) {
    try {
      await supabase.rpc('migrate_player_id', {
        p_old_player_id: storedId,
        p_new_player_id: authUid,
      });
      await AsyncStorage.setItem(PLAYER_ID_KEY, authUid);
    } catch {
      // Migration failed (offline?) — keep storedId so we retry next launch.
    }
  } else {
    await AsyncStorage.setItem(PLAYER_ID_KEY, authUid);
  }

  // Register with Supabase once to claim a unique display name.
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
