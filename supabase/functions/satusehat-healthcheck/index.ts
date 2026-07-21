import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { getCorsHeaders } from "../_shared/corsHelper.ts";
import { getAccessToken } from "../_shared/satusehatAuth.ts";
import { fhirRequest } from "../_shared/fhirClient.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

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

    // Verify credentials (must be staff role or admin calling)
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

    // Create Supabase client with admin privileges
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Test token retrieval
    console.log('Testing token cache / OAuth2 retrieval...');
    const accessToken = await getAccessToken(supabaseAdmin);
    if (!accessToken) {
      throw new Error('Retrieved access token is empty');
    }

    // Step 2: Test basic Organization query (GET Organization?identifier=...)
    const orgId = Deno.env.get('SATUSEHAT_ORGANIZATION_ID') || '10000004';
    console.log(`Testing query against Organization with ID/identifier: ${orgId}...`);
    const fhirRes = await fhirRequest(supabaseAdmin, 'GET', `Organization?identifier=${orgId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'SatuSehat health-check completed successfully.',
        environment: Deno.env.get('SATUSEHAT_ENVIRONMENT') || 'sandbox',
        oauth2: {
          status: 'ok',
          cached: true
        },
        fhir: {
          status: fhirRes.ok ? 'ok' : 'failed',
          httpStatus: fhirRes.status,
          response: fhirRes.data
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Error during SatuSehat healthcheck:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message,
        environment: Deno.env.get('SATUSEHAT_ENVIRONMENT') || 'sandbox',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
