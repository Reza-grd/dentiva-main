export function getSatuSehatBaseUrl(): { auth: string; fhir: string } {
  const env = Deno.env.get('SATUSEHAT_ENVIRONMENT') || 'sandbox'; // 'sandbox' | 'production'
  if (env === 'production') {
    return {
      auth: 'https://api-satusehat.kemkes.go.id/oauth2/v1',
      fhir: 'https://api-satusehat.kemkes.go.id/fhir-r4/v1',
    };
  }
  return {
    auth: 'https://api-satusehat-stg.kemkes.go.id/oauth2/v1',
    fhir: 'https://api-satusehat-stg.kemkes.go.id/fhir-r4/v1',
  };
}
