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
      console.error('Database decrypt_batch RPC failed in Edge Function:', error);
      // Fallback to original ciphertext on error
      pgpIndices.forEach((origIdx, batchIdx) => {
        processed[origIdx] = pgpPayloads[batchIdx];
      });
    } else {
      pgpIndices.forEach((origIdx, batchIdx) => {
        processed[origIdx] = data[batchIdx];
      });
    }
  }

  return processed;
}
