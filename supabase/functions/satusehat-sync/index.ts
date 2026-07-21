import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { getCorsHeaders } from "../_shared/corsHelper.ts";
import { syncOrganization } from "../_shared/resources/organization.ts";
import { syncLocation } from "../_shared/resources/location.ts";
import { syncPractitioner } from "../_shared/resources/practitioner.ts";
import { syncPatient } from "../_shared/resources/patient.ts";

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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Item 6 Fix: Role-Based Access Control (RBAC) & Multi-tenant clinic verification
    let callingUserId: string | null = null;
    let callingUserRole: string | null = null;
    let callingUserClinicId: string | null = null;
    let isServiceRole = false;

    if (authHeader === `Bearer ${supabaseServiceKey}`) {
      isServiceRole = true;
    } else {
      const userClient = createClient(supabaseUrl, supabaseAnonKey || supabaseServiceKey, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: { user }, error: authError } = await userClient.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized: Invalid credentials' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      callingUserId = user.id;

      const { data: profile } = await supabaseAdmin
        .from('users')
        .select('role, clinic_id')
        .eq('id', user.id)
        .maybeSingle();

      callingUserRole = profile?.role || null;
      callingUserClinicId = profile?.clinic_id || null;
    }

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
        if (!isServiceRole) {
          if (callingUserRole !== 'admin') {
            return new Response(JSON.stringify({ error: 'Forbidden: Only Admin role can sync Organization metadata' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
          if (clinicId !== callingUserClinicId) {
            return new Response(JSON.stringify({ error: 'Forbidden: Multi-tenant access violation' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        }
        result = await syncOrganization(supabaseAdmin, clinicId, undefined, callingUserId);
        break;

      case 'syncLocation':
        if (!locationId) throw new Error('locationId is required for syncLocation');
        if (!isServiceRole) {
          if (callingUserRole !== 'admin') {
            return new Response(JSON.stringify({ error: 'Forbidden: Only Admin role can sync Location metadata' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
          const { data: loc } = await supabaseAdmin.from('satusehat_locations').select('clinic_id').eq('id', locationId).maybeSingle();
          if (!loc || loc.clinic_id !== callingUserClinicId) {
            return new Response(JSON.stringify({ error: 'Forbidden: Multi-tenant access violation' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        }
        result = await syncLocation(supabaseAdmin, locationId, undefined, callingUserId);
        break;

      case 'syncPractitioner':
        if (!userId) throw new Error('userId is required for syncPractitioner');
        if (!isServiceRole) {
          if (!['admin', 'dokter'].includes(callingUserRole || '')) {
            return new Response(JSON.stringify({ error: 'Forbidden: Insufficient role privileges for Practitioner sync' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
          const { data: uCheck } = await supabaseAdmin.from('users').select('clinic_id').eq('id', userId).maybeSingle();
          if (!uCheck || uCheck.clinic_id !== callingUserClinicId) {
            return new Response(JSON.stringify({ error: 'Forbidden: Multi-tenant access violation' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        }
        result = await syncPractitioner(supabaseAdmin, userId, undefined, callingUserId);
        break;

      case 'syncPatient':
        if (!patientId) throw new Error('patientId is required for syncPatient');
        if (!isServiceRole) {
          if (!['admin', 'dokter', 'resepsionis'].includes(callingUserRole || '')) {
            return new Response(JSON.stringify({ error: 'Forbidden: Insufficient role privileges for Patient sync' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
          const { data: pCheck } = await supabaseAdmin.from('patients').select('clinic_id').eq('id', patientId).maybeSingle();
          if (!pCheck || pCheck.clinic_id !== callingUserClinicId) {
            return new Response(JSON.stringify({ error: 'Forbidden: Multi-tenant access violation' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        }
        result = await syncPatient(supabaseAdmin, patientId, undefined, callingUserId);
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
    console.error('Error during SATUSEHAT sync execution:', err);
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
