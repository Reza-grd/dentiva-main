import { supabase } from './supabase';
import { bayarDenganSnap } from '../utils/midtransSnap';

/**
 * Checkout langganan: buat transaksi di server (nominal dari katalog paket di database),
 * lalu buka popup Midtrans Snap. Mengembalikan { orderId, hasil } — hasil popup hanya
 * petunjuk; status resmi dibaca dari getCheckoutStatus() setelah webhook Midtrans masuk.
 */
export async function mulaiCheckout(planId, billingCycle) {
  const { data, error } = await supabase.functions.invoke('midtrans-create-transaction', {
    body: { plan_id: planId, billing_cycle: billingCycle },
  });
  if (error || !data?.success) {
    let pesan = data?.error;
    try { pesan = pesan || (await error?.context?.json?.())?.error; } catch { /* abaikan */ }
    throw new Error(pesan || error?.message || 'Gagal membuat transaksi');
  }
  const { hasil } = await bayarDenganSnap(data.token);
  return { orderId: data.order_id, hasil };
}

export async function getCheckoutPlans() {
  const { data, error } = await supabase.rpc('get_checkout_plans');
  if (error) throw error;
  return data || [];
}

/** { status: 'pending'|'confirmed'|'failed', amount_idr, paid_at, invoice_number, clinic_status } | null */
export async function getCheckoutStatus(orderId) {
  const { data, error } = await supabase.rpc('get_checkout_status', { p_order_id: orderId }).maybeSingle();
  if (error) throw error;
  return data;
}
