import { createClient } from '@supabase/supabase-js';

// Vercel Serverless Function to act as API v1 for 3rd Party Integrations
export default async function handler(req, res) {
  const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
  const apiVersion = req.headers['api-version'] || '1.0';

  // Common Headers
  res.setHeader('X-Request-ID', crypto.randomUUID());
  res.setHeader('X-Correlation-ID', correlationId);
  res.setHeader('API-Version', apiVersion);

  // This endpoint has been disabled for security reasons while waiting for a secure SatuSehat implementation.
  return res.status(410).json({
    success: false,
    error: 'Gone',
    message: 'This public endpoint is deprecated and disabled indefinitely for security compliance.',
    code: 'API_DISABLED',
    timestamp: new Date().toISOString(),
    version: apiVersion
  });
}
