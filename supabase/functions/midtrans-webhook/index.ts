import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { verifiedStatus } from "./verifiedStatus.ts";
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

    const verified = await verifiedStatus(order_id, gross_amount, serverKey, Deno.env.get('MIDTRANS_ENVIRONMENT') === 'production');
    const { transaction_status, fraud_status } = verified;
    console.log(`Processing Midtrans Webhook: order=${order_id}, status=${transaction_status}`);

    // Keputusan HANYA berdasarkan order yang tercatat di server (platform.payments).
    // custom_field1/2/3 tidak ikut ditandatangani Midtrans sehingga tidak dipercaya.
    const outcome =
      (transaction_status === "capture" && fraud_status === "accept") || transaction_status === "settlement"
        ? "success"
        : transaction_status === "pending" || (transaction_status === "capture" && fraud_status === "challenge")
        ? "pending"
        : ["deny", "cancel", "expire", "failure"].includes(transaction_status)
        ? "failed"
        : "pending";

    const { data: settleResult, error: settleErr } = await supabaseAdmin.rpc("billing_settle_midtrans_order", {
      p_order_id: order_id,
      p_outcome: outcome,
      p_gross_amount: Math.round(Number(gross_amount)),
      p_raw: verified,
    });

    if (settleErr) {
      console.error(`Failed to settle Midtrans order ${order_id}:`, settleErr);
      // 500 → Midtrans akan mengirim ulang notifikasi (proses idempoten).
      return new Response(JSON.stringify({ success: false, error: "settlement_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Midtrans order ${order_id}: ${settleResult}`);
    if (settleResult === "unknown_order" || settleResult === "amount_mismatch") {
      console.warn(`Midtrans order ${order_id} needs manual review: ${settleResult} (reported clinic=${clinic_id}, plan=${plan_id}, cycle=${billing_cycle})`);
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
