import { getSatuSehatBaseUrl } from './satusehatConfig.ts';

export async function getAccessToken(supabaseAdmin: any): Promise<string> {
  const now = new Date();
  
  // Try to load cached token
  const { data: cached, error: cacheError } = await supabaseAdmin
    .from('satusehat_token_cache')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (cacheError) {
    console.error('Error fetching cached token:', cacheError);
  }

  // Check if token exists and is valid (with 60 seconds buffer)
  if (cached && new Date(cached.expires_at) > new Date(now.getTime() + 60_000)) {
    return cached.access_token;
  }

  const clientId = Deno.env.get('SATUSEHAT_CLIENT_ID');
  const clientSecret = Deno.env.get('SATUSEHAT_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    throw new Error('SATUSEHAT_CLIENT_ID or SATUSEHAT_CLIENT_SECRET is not configured in Supabase Secrets');
  }

  const { auth } = getSatuSehatBaseUrl();
  const url = `${auth}/accesstoken?grant_type=client_credentials`;
  
  const bodyParams = new URLSearchParams();
  bodyParams.set('client_id', clientId);
  bodyParams.set('client_secret', clientSecret);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: bodyParams.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to retrieve SatuSehat access token: HTTP ${res.status} - ${errorText}`);
  }

  const json = await res.json();
  if (!json.access_token || !json.expires_in) {
    throw new Error('SatuSehat access token response format is invalid or missing fields');
  }

  const expiresSeconds = Number(json.expires_in) || 3600;
  const expiresAt = new Date(Date.now() + expiresSeconds * 1000);
  const environment = Deno.env.get('SATUSEHAT_ENVIRONMENT') || 'sandbox';

  // Upsert the new cached token
  const { error: upsertError } = await supabaseAdmin
    .from('satusehat_token_cache')
    .upsert({
      id: 1,
      access_token: json.access_token,
      expires_at: expiresAt.toISOString(),
      environment: environment,
      updated_at: new Date().toISOString()
    });

  if (upsertError) {
    console.error('Warning: Failed to update SatuSehat token cache table:', upsertError);
  }

  return json.access_token;
}
