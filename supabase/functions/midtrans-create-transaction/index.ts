import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { getCorsHeaders } from "../_shared/corsHelper.ts";

/**
 * Edge Function: midtrans-create-transaction
 * Generates Midtrans Snap transaction token & redirect URL for SaaS subscription upgrade/renewal.
 *
 * RBAC: Admin role required for the requested clinic_id.
 * MIDTRANS SNAP API VERIFIED DETAILS (midtrans.com):
 * - Endpoint (Sandbox): POST https://app.sandbox.midtrans.com/snap/v1/transactions
 * - Endpoint (Production): POST https://app.midtrans.com/snap/v1/transactions
 * - Authorization Header: Basic base64(MIDTRANS_SERVER_KEY + ":")
 * - Response fields: { token, redirect_url }
 *
 * NEEDS-HUMAN-VERIFICATION:
 * - MIDTRANS_SERVER_KEY must be populated in Supabase Edge Function Secrets dashboard.
 */

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing Authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serverKey = Deno.env.get("MIDTRANS_SERVER_KEY");
    const environment = Deno.env.get("MIDTRANS_ENVIRONMENT") || "sandbox";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Supabase environment variables not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!serverKey) {
      console.error("FATAL: MIDTRANS_SERVER_KEY is not configured in Supabase Edge Function Secrets.");
      return new Response(
        JSON.stringify({ error: "MIDTRANS_SERVER_KEY not configured in environment secrets" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify calling user via JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey || supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid credentials" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // RBAC: Check calling user role and clinic_id
    const { data: profile } = await supabaseAdmin
      .from("users")
      .select("role, clinic_id, status")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "admin" || !["active", "invited"].includes(profile.status ?? "active")) {
      return new Response(
        JSON.stringify({
          error: "Forbidden: Only clinic Admin can initiate subscription purchases.",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json();
    const { plan_id, billing_cycle = "monthly" } = body;

    if (!plan_id) {
      return new Response(
        JSON.stringify({ error: "plan_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (billing_cycle !== "monthly" && billing_cycle !== "yearly") {
      return new Response(
        JSON.stringify({ error: "billing_cycle harus 'monthly' atau 'yearly'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const orderId = `SUB-${profile.clinic_id.substring(0, 8)}-${Date.now()}`;

    // Catat order di server SEBELUM memanggil Midtrans. Nominal dihitung database
    // dari katalog paket; webhook nanti hanya memercayai catatan ini (bukan custom_field
    // yang tidak ikut ditandatangani Midtrans).
    const { data: registered, error: regErr } = await supabaseAdmin
      .rpc("billing_register_midtrans_order", {
        p_order_id: orderId,
        p_clinic_id: profile.clinic_id,
        p_plan_id: plan_id,
        p_billing_cycle: billing_cycle,
      })
      .single();

    if (regErr || !registered) {
      console.error("Failed to register Midtrans order:", regErr);
      return new Response(
        JSON.stringify({ error: "Paket tidak valid atau tidak aktif" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const amount = Number((registered as { amount_idr: number }).amount_idr);
    const plan = { id: plan_id, name: (registered as { plan_name: string }).plan_name };

    // Construct Midtrans Snap API Payload
    const snapUrl =
      environment === "production"
        ? "https://app.midtrans.com/snap/v1/transactions"
        : "https://app.sandbox.midtrans.com/snap/v1/transactions";

    const authString = btoa(`${serverKey}:`);

    const snapPayload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      item_details: [
        {
          id: plan.id,
          price: amount,
          quantity: 1,
          name: `Dentiva ${plan.name} (${billing_cycle})`,
        },
      ],
      customer_details: {
        email: user.email,
        first_name: user.user_metadata?.full_name || "Admin",
      },
      // Informasi saja (tidak dipakai webhook untuk keputusan apa pun).
      custom_field1: profile.clinic_id,
      custom_field2: plan.id,
      custom_field3: billing_cycle,
    };

    const midtransRes = await fetch(snapUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Basic ${authString}`,
      },
      body: JSON.stringify(snapPayload),
    });

    const snapData = await midtransRes.json();

    if (!midtransRes.ok) {
      console.error("Midtrans API Error:", snapData);
      return new Response(
        JSON.stringify({
          error: `Midtrans payment init failed: ${
            snapData.error_messages?.[0] || JSON.stringify(snapData)
          }`,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        token: snapData.token,
        redirect_url: snapData.redirect_url,
        order_id: orderId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Error in midtrans-create-transaction:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
