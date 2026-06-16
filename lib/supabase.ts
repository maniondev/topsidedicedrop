import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const SUPABASE_URL      = 'https://ljzyfxkktojmtdrjatfr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YCxyZ9ZijRkT30A57ZlXrQ_eDmXob_e';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Keep the Keychain refresh token up to date whenever Supabase rotates it.
// Rotation happens on every token refresh (default: every hour).
supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.refresh_token) {
    SecureStore.setItemAsync('td_refresh_token', session.refresh_token).catch(() => {});
    SecureStore.setItemAsync('td_kc_player_id',  session.user.id).catch(() => {});
  }
});
