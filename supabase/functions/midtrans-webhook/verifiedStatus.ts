/** Notification status fields are unsigned; obtain authoritative status directly. */
export async function verifiedStatus(orderId: string, amount: string, key: string, production: boolean, request = fetch) {
  const host = production ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com';
  const response = await request(`${host}/v2/${encodeURIComponent(orderId)}/status`, {
    headers: { Authorization: `Basic ${btoa(`${key}:`)}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('Midtrans status verification unavailable');
  const status = await response.json();
  if (status.order_id !== orderId || !Number.isFinite(Number(status.gross_amount))
    || Number(status.gross_amount) !== Number(amount) || typeof status.transaction_status !== 'string') {
    throw new Error('Midtrans verified status mismatch');
  }
  return status;
}
