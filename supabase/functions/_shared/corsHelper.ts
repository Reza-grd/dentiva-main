/**
 * corsHelper.ts
 * Origin-validated CORS header helper for SATUSEHAT Edge Functions.
 * Replaces wildcard '*' with strict origin validation to satisfy SATUSEHAT security guidelines.
 */

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://dentiva.app',
  'https://app.dentiva.id',
  'https://dentiva-main.vercel.app',
  'https://neurodent.vercel.app'
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin');
  const envOriginsStr = Deno.env.get('ALLOWED_ORIGINS');
  const envOrigins = envOriginsStr ? envOriginsStr.split(',').map(o => o.trim()) : [];
  const allowedOrigins = [...DEFAULT_ALLOWED_ORIGINS, ...envOrigins];

  let matchedOrigin = allowedOrigins[0];
  // Preview Vercel milik proyek Dentiva (pola sama dengan gerbang API di infra/vps/batasi-cors.sh).
  const isDentivaPreview = !!origin && /^https:\/\/dentiva-main[a-z0-9-]*-reza-grds-projects\.vercel\.app$/.test(origin);
  if (origin && (allowedOrigins.includes(origin) || isDentivaPreview)) {
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
