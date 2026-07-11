import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ggwratzhpukgsiduqely.supabase.co';
const supabaseAnonKey = 'sb_publishable_E--fwvixePBEO55zuoNLcw_F3G0Amj1';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Testing visits...');
  const { data: visits, error: err } = await supabase
    .from('visits')
    .select('*')
    .limit(10);
  
  if (err) console.error('Error fetching visits:', err);
  else console.log('visits data:', visits);
}

test();
