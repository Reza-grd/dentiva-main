export async function decryptBatch(supabaseAdmin: any, payloads: string[]): Promise<string[]> {
  if (!payloads || payloads.length === 0) return [];
  
  const processed: string[] = [];
  const pgpPayloads: string[] = [];
  const pgpIndices: number[] = [];

  for (let i = 0; i < payloads.length; i++) {
    const val = payloads[i];
    if (val && val.startsWith('PGP:')) {
      processed[i] = ''; // placeholder
      pgpPayloads.push(val);
      pgpIndices.push(i);
    } else {
      processed[i] = val || '';
    }
  }

  if (pgpPayloads.length > 0) {
    const { data, error } = await supabaseAdmin.rpc('decrypt_batch', { p_payloads: pgpPayloads });
    if (error) {
      console.error('[CRITICAL SECURITY ERROR] Database decrypt_batch RPC failed in Edge Function:', error.message);
      // Hard security rule: NEVER return raw ciphertext as a fallback. Abort sync immediately.
      throw new Error(`PHI Decryption Failed: Database decrypt_batch RPC error (${error.message}). Sync aborted to prevent ciphertext leakage.`);
    }

    if (!data || !Array.isArray(data) || data.length !== pgpPayloads.length) {
      console.error('[CRITICAL SECURITY ERROR] decrypt_batch RPC returned unexpected output structure:', data);
      throw new Error('PHI Decryption Failed: Invalid RPC output returned from server.');
    }

    pgpIndices.forEach((origIdx, batchIdx) => {
      const decryptedVal = data[batchIdx];
      if (typeof decryptedVal === 'string' && decryptedVal.startsWith('PGP:')) {
        throw new Error(`PHI Decryption Failed: Item at index ${origIdx} failed to decrypt properly.`);
      }
      processed[origIdx] = decryptedVal || '';
    });
  }

  return processed;
}
