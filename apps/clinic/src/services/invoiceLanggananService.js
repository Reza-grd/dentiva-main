import { supabase } from './supabase';

/**
 * Invoice langganan Dentiva untuk klinik (RPC di migration 20261114120000).
 * Bila fungsi belum ada di server (migrasi belum diterapkan), kembalikan { tersedia: false }
 * agar alur pembayaran tetap berjalan tanpa invoice.
 */
const belumAda = (e) => e?.code === 'PGRST202' || /Could not find the function|does not exist/i.test(e?.message || '');

export async function mintaInvoice(planId, siklus) {
  const { data, error } = await supabase.rpc('billing_minta_invoice', { p_plan_id: planId, p_billing_cycle: siklus });
  if (error) return belumAda(error) ? { tersedia: false } : { tersedia: true, error: error.message };
  return { tersedia: true, invoice: data?.invoice, billTo: data?.bill_to };
}

export async function daftarInvoice() {
  const { data, error } = await supabase.rpc('billing_invoice_klinik');
  if (error) return belumAda(error) ? { tersedia: false, invoices: [] } : { tersedia: true, error: error.message, invoices: [] };
  return { tersedia: true, invoices: data?.invoices || [], billTo: data?.bill_to || {} };
}
