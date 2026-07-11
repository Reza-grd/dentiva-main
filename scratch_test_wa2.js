import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ggwratzhpukgsiduqely.supabase.co';
const supabaseAnonKey = 'sb_publishable_E--fwvixePBEO55zuoNLcw_F3G0Amj1';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    console.log("Invoking send-whatsapp Edge Function...");
    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
      body: {
        visitId: 'c0828b3a-dd7e-4c8d-a872-6e5683f4d49f',
        isTest: true,
        target: '6289602130370',
        message: 'Test from script after secret update'
      }
    });
    
    if (error) {
      console.error('Edge Function returned error:', error);
    } else {
      console.log('Success:', data);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();
