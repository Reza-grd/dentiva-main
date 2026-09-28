/**
 * import_kfa_dictionary.js
 * Utility script to parse official Kemenkes SatuSehat KFA CSV export and update master_bahan / master_obat records.
 *
 * Usage:
 *   node scripts/import_kfa_dictionary.js <path-to-kfa-csv-file>
 *
 * Example:
 *   node scripts/import_kfa_dictionary.js ./downloads/kfa_official_2026.csv
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://ggwratzhpukgsiduqely.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[WARNING] SUPABASE_SERVICE_ROLE_KEY is not set in environment. Read-only dry run mode enabled.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || 'dummy_key');

function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

async function run() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('ERROR: Please provide path to official KFA CSV file.');
    console.log('Usage: node scripts/import_kfa_dictionary.js <path-to-kfa-csv-file>');
    process.exit(1);
  }

  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`ERROR: File not found at ${absolutePath}`);
    process.exit(1);
  }

  console.log(`Reading KFA CSV file from: ${absolutePath}...`);
  const fileContent = fs.readFileSync(absolutePath, 'utf-8');
  const lines = fileContent.split(/\r?\n/).filter(line => line.trim().length > 0);

  if (lines.length < 2) {
    console.error('ERROR: CSV file is empty or missing data rows.');
    process.exit(1);
  }

  // Parse Header
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/["']/g, ''));
  const codeIndex = headers.findIndex(h => h.includes('kode') || h.includes('code') || h.includes('kfa'));
  const nameIndex = headers.findIndex(h => h.includes('nama') || h.includes('display') || h.includes('name') || h.includes('obat'));

  if (codeIndex === -1 || nameIndex === -1) {
    console.error('ERROR: Could not auto-detect "kode_kfa" and "nama_obat" columns in CSV header:', headers);
    process.exit(1);
  }

  // Extract KFA dictionary mapping
  const kfaMap = new Map(); // normalizedName -> { kode, originalName }
  let parsedCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/["']/g, ''));
    const code = cols[codeIndex];
    const name = cols[nameIndex];
    if (code && name) {
      const norm = normalizeName(name);
      kfaMap.set(norm, { code, originalName: name });
      parsedCount++;
    }
  }

  console.log(`Successfully parsed ${parsedCount} KFA entries from CSV.`);

  // Fetch local master_bahan records
  console.log('Fetching local master_bahan records from database...');
  const { data: localItems, error: fetchErr } = await supabase
    .from('master_bahan')
    .select('id, nama_bahan, kode_kfa');

  if (fetchErr) {
    console.error('ERROR fetching master_bahan:', fetchErr.message);
    process.exit(1);
  }

  console.log(`Found ${localItems?.length || 0} local items in master_bahan.`);

  let exactMatches = 0;
  let unmappedItems = [];

  for (const item of (localItems || [])) {
    const normLocal = normalizeName(item.nama_bahan);
    const matched = kfaMap.get(normLocal);

    if (matched) {
      console.log(`[MATCH] "${item.nama_bahan}" -> KFA ${matched.code} (${matched.originalName})`);
      exactMatches++;

      if (SUPABASE_SERVICE_ROLE_KEY) {
        await supabase
          .from('master_bahan')
          .update({ kode_kfa: matched.code })
          .eq('id', item.id);
      }
    } else {
      unmappedItems.push(item);
    }
  }

  console.log('\n========================================');
  console.log('IMPORT SUMMARY REPORT');
  console.log('========================================');
  console.log(`Total KFA Entries Parsed : ${parsedCount}`);
  console.log(`Total Local Medicines    : ${localItems?.length || 0}`);
  console.log(`Exact Matches Updated    : ${exactMatches}`);
  console.log(`Unmapped / Review Needed : ${unmappedItems.length}`);

  if (unmappedItems.length > 0) {
    console.log('\nList of Unmapped Medicines (Require manual KFA assignment in UI):');
    unmappedItems.forEach(u => {
      console.log(` - ID: ${u.id} | Nama: "${u.nama_bahan}" | Current KFA: ${u.kode_kfa || 'NONE'}`);
    });
  }
}

run().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
