import { createClient } from '@supabase/supabase-js';

// Vercel Serverless Function to act as API v1 for 3rd Party Integrations
export default async function handler(req, res) {
  const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
  const apiVersion = req.headers['api-version'] || '1.0';

  // Common Headers
  res.setHeader('X-Request-ID', crypto.randomUUID());
  res.setHeader('X-Correlation-ID', correlationId);
  res.setHeader('API-Version', apiVersion);

  // Validate API Key / Auth (Simplified for MVP, would normally use JWT or API Key table)
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Missing Authorization header',
      code: 'AUTH_001',
      timestamp: new Date().toISOString(),
      version: apiVersion
    });
  }

  // Initialize Supabase Admin client for secure server-side fetching
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // Need service role for API if validating token manually
  );

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('patients')
        .select('id, rekam_medis, nama, tanggal_lahir, no_hp, alamat, created_at, updated_at');
        // Note: For multi-tenant, we would enforce clinic_id here based on the API Key.

      if (error) throw error;

      return res.status(200).json({
        success: true,
        data: data,
        message: 'Patients retrieved successfully',
        timestamp: new Date().toISOString(),
        version: apiVersion
      });
    }

    // Other methods would go here...
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed',
      message: `Method ${req.method} is not allowed`,
      code: 'HTTP_405',
      timestamp: new Date().toISOString(),
      version: apiVersion
    });
    
  } catch (error) {
    console.error(`[${correlationId}] Error in /api/v1/patients:`, error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message,
      code: 'SYS_500',
      timestamp: new Date().toISOString(),
      version: apiVersion
    });
  }
}
