import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { getCorsHeaders } from "../_shared/corsHelper.ts";

/**
 * Edge Function: midtrans-webhook
 * Processes Midtrans payment notification webhooks.
 *
 * VERIFIED SIGNATURE FORMULA (midtrans.com):
 * SHA512(order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY)
 * Must equal payload's signature_key.
 *
 * NEEDS-HUMAN-VERIFICATION:
 * - Field names `transaction_status`, `order_id`, `status_code`, `gross_amount`, `signature_key`
 *   are standard Midtrans Snap fields.
 * - MIDTRANS_SERVER_KEY must be set in Supabase Secrets.
 */

async function sha512Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-512", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const serverKey = Deno.env.get("MIDTRANS_SERVER_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Supabase environment configuration missing" }),
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

    const notification = await req.json();

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
      custom_field1: clinic_id,
      custom_field2: plan_id,
      custom_field3: billing_cycle,
    } = notification;

    if (!order_id || !status_code || !gross_amount || !signature_key) {
      return new Response(
        JSON.stringify({ error: "Missing required notification fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify Signature: SHA512(order_id + status_code + gross_amount + ServerKey)
    const expectedSignature = await sha512Hex(
      `${order_id}${status_code}${gross_amount}${serverKey}`
    );

    if (signature_key !== expectedSignature) {
      console.error(`Invalid Midtrans Webhook signature for order ${order_id}`);
      return new Response(
        JSON.stringify({ error: "Invalid signature verification key" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Processing Midtrans Webhook: order=${order_id}, status=${transaction_status}, clinic=${clinic_id}`);

    // Determine payment success status
    const isSuccess =
      (transaction_status === "capture" && fraud_status === "accept") ||
      transaction_status === "settlement";

    if (isSuccess && clinic_id && plan_id) {
      const now = new Date();
      const periodEnd = new Date(now);

      if (billing_cycle === "yearly") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      // Check if subscription record already exists for clinic
      const { data: existingSub } = await supabaseAdmin
        .from("clinic_subscriptions")
        .select("id")
        .eq("clinic_id", clinic_id)
        .maybeSingle();

      if (existingSub) {
        // Update existing subscription
        await supabaseAdmin
          .from("clinic_subscriptions")
          .update({
            plan_id,
            status: "active",
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            cancel_at_period_end: false,
            updated_at: now.toISOString(),
          })
          .eq("id", existingSub.id);
      } else {
        // Insert new subscription
        await supabaseAdmin.from("clinic_subscriptions").insert({
          clinic_id,
          plan_id,
          status: "active",
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
        });
      }
      console.log(`Successfully activated subscription for clinic ${clinic_id} with plan ${plan_id}`);
    } else if (transaction_status === "deny" || transaction_status === "cancel" || transaction_status === "expire") {
      if (clinic_id) {
        await supabaseAdmin
          .from("clinic_subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("clinic_id", clinic_id);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Webhook processed successfully" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Error in midtrans-webhook Edge Function:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
