import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ljzyfxkktojmtdrjatfr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YCxyZ9ZijRkT30A57ZlXrQ_eDmXob_e';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
