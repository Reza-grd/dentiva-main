import { getSatuSehatBaseUrl } from './satusehatConfig.ts';
import { getAccessToken } from './satusehatAuth.ts';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fhirRequest(
  supabaseAdmin: any,
  method: 'GET' | 'POST' | 'PUT',
  resourcePath: string,
  body?: object
): Promise<{ ok: boolean; status: number; data: any }> {
  const token = await getAccessToken(supabaseAdmin);
  const { fhir } = getSatuSehatBaseUrl();
  const url = `${fhir}/${resourcePath}`;
  
  let attempts = 0;
  const maxAttempts = 3;
  let delay = 1000; // start with 1 second delay
  
  while (true) {
    attempts++;
    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/fhir+json',
          'Accept': 'application/fhir+json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const isTransientError = res.status === 429 || (res.status >= 500 && res.status < 600);
      
      if (isTransientError && attempts < maxAttempts) {
        console.warn(`Transient error HTTP ${res.status} on attempt ${attempts} for path ${resourcePath}. Retrying in ${delay}ms...`);
        await wait(delay);
        delay *= 2; // exponential backoff
        continue;
      }
      
      const data = await res.json().catch(() => null);
      return { ok: res.ok, status: res.status, data };
    } catch (err: any) {
      if (attempts < maxAttempts) {
        console.warn(`Network/Fetch error on attempt ${attempts} for path ${resourcePath}: ${err.message}. Retrying in ${delay}ms...`);
        await wait(delay);
        delay *= 2;
        continue;
      }
      return { ok: false, status: 0, data: { error: err.message } };
    }
  }
}
