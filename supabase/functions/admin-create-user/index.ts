import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify the caller is an admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey || supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    })
    
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile } = await userClient
      .from('users')
      .select('role, clinic_id, status')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin' || !['active', 'invited'].includes(profile.status ?? 'active')) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // SaaS Quota Enforcement: Check max_users for caller's clinic
    if (profile.clinic_id) {
      const { data: sub } = await supabaseAdmin
        .from('clinic_subscriptions')
        .select('*, plan:subscription_plans(*)')
        .eq('clinic_id', profile.clinic_id)
        .in('status', ['trialing', 'active', 'past_due'])
        .order('current_period_end', { ascending: false })
        .limit(1)
        .maybeSingle()

      const maxUsers = sub?.plan?.max_users || 3 // Default Starter plan max_users is 3

      const { count: currentUsersCount } = await supabaseAdmin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('clinic_id', profile.clinic_id)
        .in('status', ['invited', 'active'])

      if (currentUsersCount !== null && currentUsersCount >= maxUsers) {
        return new Response(
          JSON.stringify({
            error: `Batas maksimum pengguna (${maxUsers} user) untuk paket langganan Anda telah tercapai. Silakan upgrade paket langganan klinik Anda.`,
          }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // Process request payload
    let body;
    try {
      body = await req.json()
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { email, password, full_name, role, phone } = body

    if (!profile.clinic_id) {
      return new Response(JSON.stringify({ error: 'Akun admin tidak terhubung ke klinik' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!['admin', 'dokter', 'resepsionis'].includes(role)) {
      return new Response(JSON.stringify({ error: 'Role tidak valid' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!email || !password || !full_name || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields (email, password, full_name, role)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create user via Admin API
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    
    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      // Klaim tenant di JWT; juga disinkronkan trigger users_sync_clinic_claim.
      app_metadata: { clinic_id: profile.clinic_id },
    })

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Insert to users table
    const { error: profileError } = await adminClient
      .from('users')
      .insert([{
        id: authData.user.id,
        email,
        full_name,
        role,
        phone: phone || null,
        clinic_id: profile.clinic_id,
        status: 'active',
      }])

    if (profileError) {
      // Rollback auth user creation if profile insert fails
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return new Response(JSON.stringify({ error: 'Failed to create user profile: ' + profileError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, user: authData.user }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
