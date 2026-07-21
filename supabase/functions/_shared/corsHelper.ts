/**
 * corsHelper.ts
 * Origin-validated CORS header helper for SATUSEHAT Edge Functions.
 * Replaces wildcard '*' with strict origin validation to satisfy SATUSEHAT security guidelines.
 */

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://dentiva.app',
  'https://dentiva-main.vercel.app',
  'https://neurodent.vercel.app'
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin');
  const envOriginsStr = Deno.env.get('ALLOWED_ORIGINS');
  const envOrigins = envOriginsStr ? envOriginsStr.split(',').map(o => o.trim()) : [];
  const allowedOrigins = [...DEFAULT_ALLOWED_ORIGINS, ...envOrigins];

  let matchedOrigin = allowedOrigins[0];
  if (origin && allowedOrigins.includes(origin)) {
    matchedOrigin = origin;
  } else if (Deno.env.get('SATUSEHAT_ENVIRONMENT') === 'sandbox' && origin && origin.startsWith('http://localhost:')) {
    matchedOrigin = origin;
  }

  return {
    'Access-Control-Allow-Origin': matchedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-correlation-id',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Vary': 'Origin'
  };
}
