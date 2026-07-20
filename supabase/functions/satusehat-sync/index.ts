import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { syncOrganization } from "../_shared/resources/organization.ts";
import { syncLocation } from "../_shared/resources/location.ts";
import { syncPractitioner } from "../_shared/resources/practitioner.ts";
import { syncPatient } from "../_shared/resources/patient.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Supabase environment variables not configured in Edge Function' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify credentials
    let isAuthorized = false;
    if (authHeader === `Bearer ${supabaseServiceKey}`) {
      isAuthorized = true;
    } else {
      const userClient = createClient(supabaseUrl, supabaseAnonKey || supabaseServiceKey, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: { user }, error: authError } = await userClient.auth.getUser();
      if (!authError && user) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid credentials' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, clinicId, locationId, userId, patientId } = body;
    let result;

    switch (action) {
      case 'syncOrganization':
        if (!clinicId) throw new Error('clinicId is required for syncOrganization');
        result = await syncOrganization(supabaseAdmin, clinicId);
        break;
      case 'syncLocation':
        if (!locationId) throw new Error('locationId is required for syncLocation');
        result = await syncLocation(supabaseAdmin, locationId);
        break;
      case 'syncPractitioner':
        if (!userId) throw new Error('userId is required for syncPractitioner');
        result = await syncPractitioner(supabaseAdmin, userId);
        break;
      case 'syncPatient':
        if (!patientId) throw new Error('patientId is required for syncPatient');
        result = await syncPatient(supabaseAdmin, patientId);
        break;
      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        data: result
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Error during SatuSehat sync execution:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
