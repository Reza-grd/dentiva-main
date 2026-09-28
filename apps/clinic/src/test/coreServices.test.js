import { vi, describe, it, expect, beforeEach } from 'vitest';
import { parseDateLocal, formatDateID, formatRupiah, calcAge } from '../utils/dateUtils.js';

// Setup Mock Supabase client
vi.mock('../services/supabase.js', () => {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(async () => ({ data: { id: 'p1', nama_lengkap: 'PGP:encName' }, error: null })),
    maybeSingle: vi.fn().mockImplementation(async () => ({ data: null, error: null })),
    then: vi.fn().mockImplementation(function(callback) {
      return Promise.resolve(callback({ data: [], error: null, count: 0 }));
    })
  };

  return {
    supabase: {
      from: vi.fn(() => mockQueryBuilder),
      rpc: vi.fn().mockImplementation(async (name, _args) => {
        if (name === 'encrypt_batch') return { data: ['PGP:encName', 'PGP:encPhone', 'PGP:encAddress'], error: null };
        if (name === 'decrypt_batch') return { data: ['Jane Doe', '08123', 'Bandung'], error: null };
        return { data: [], error: null };
      }),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'usr1' } }, error: null }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null })
      }
    }
  };
});

// Import services after mock setup
import { patientService } from '../services/patientService.js';
import { visitService } from '../services/visitService.js';
import { paymentService } from '../services/paymentService.js';
import { doctorScheduleService } from '../services/doctorScheduleService.js';
import { supabase } from '../services/supabase.js';

describe('1. Date & Timezone Utilities', () => {
  it('parseDateLocal should append T00:00:00 to enforce local timezone parsing', () => {
    const parsed = parseDateLocal('2026-05-28');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(4); // 0-indexed
    expect(parsed.getDate()).toBe(28);
  });

  it('formatDateID should render standard Indonesian locale date text', () => {
    const formatted = formatDateID('2026-05-28');
    expect(formatted).toContain('Mei');
    expect(formatted).toContain('2026');
  });

  it('calcAge should compute correct age boundary based on local time', () => {
    const age = calcAge('1990-01-01');
    const currentYear = new Date().getFullYear();
    expect(age).toBe(currentYear - 1990);
  });

  it('formatRupiah should format numeric amounts to IDR representation', () => {
    expect(formatRupiah(1500000)).toBe('Rp 1.500.000');
    expect(formatRupiah(0)).toBe('Rp 0');
  });
});

describe('2. Patient Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createPatient should batch-encrypt confidential inputs and return decrypted outputs', async () => {
    const pData = { nama_lengkap: 'Jane Doe', no_wa: '08123', alamat: 'Bandung' };
    const res = await patientService.createPatient(pData);
    
    expect(supabase.rpc).toHaveBeenCalledWith('encrypt_batch', expect.any(Object));
    expect(res.success).toBe(true);
  });

  it('getPatientById should retrieve record and automatically decrypt PII properties', async () => {
    const res = await patientService.getPatientById('p1');
    expect(res.success).toBe(true);
    expect(res.data.nama_lengkap).toBe('Jane Doe');
  });
});

describe('3. Visit Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createVisit should invoke authenticated user lookup and save EMR details', async () => {
    const vData = { patient_id: 'p1', diagnosa: 'Dental Caries' };
    const res = await visitService.createVisit(vData);

    expect(supabase.auth.getUser).toHaveBeenCalled();
    expect(res.success).toBe(true);
  });
});

describe('4. Payment Service', () => {
  it('getAllPayments should resolve query payload successfully', async () => {
    const res = await paymentService.getAllPayments({ page: 1, limit: 10 });
    expect(res.success).toBe(true);
  });

  it('getAllPayments should sanitize search terms containing PostgREST significant characters', async () => {
    // Create a mock builder spy specifically for this test
    const mockOr = vi.fn().mockReturnThis();
    
    // We need to override the supabase.from mock temporarily for this test
    // so we can inspect the exact string passed to .or()
    const originalFrom = supabase.from;
    
    const mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      or: mockOr,
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockImplementation(async () => ({ data: [], error: null, count: 0 }))
    };
    
    supabase.from = vi.fn(() => mockQueryBuilder);
    
    // Pass a search term with harmful characters
    const dirtyTerm = 'John, Doe (VIP) %*';
    const res = await paymentService.getAllPayments({ searchTerm: dirtyTerm });
    
    // The expected sanitized term is "John Doe VIP" (since we strip , ( ) % *)
    expect(mockOr).toHaveBeenCalledWith(
      expect.stringContaining('John Doe VIP')
    );
    expect(res.success).toBe(true);
    
    // Restore the original mock
    supabase.from = originalFrom;
  });
});

describe('5. Doctor Schedule Service', () => {
  it('getAllSchedules should resolve schedules query successfully', async () => {
    const res = await doctorScheduleService.getAllSchedules();
    expect(res.success).toBe(true);
  });
});
