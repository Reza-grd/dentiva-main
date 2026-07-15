import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import SchedulePage from '../components/schedule/SchedulePage.jsx';

// 1. Mock Contexts & Hooks
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn()
}));

vi.mock('../components/common/ToastNotification', () => ({
  useToast: () => ({
    showToast: vi.fn()
  })
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'dokter-1' },
    userProfile: { role: 'dokter', full_name: 'Drg. Ahmad' }
  })
}));

// 2. Mock Services (relative to src/test/SchedulePage.test.jsx)
vi.mock('../services/visitService', () => ({
  visitService: {
    getVisitsByDate: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          id: 'v1',
          visit_number: 1,
          tanggal_kunjungan: '2026-07-15',
          jam_kunjungan: '10:00',
          status: 'scheduled',
          keluhan: 'Gigi berlubang',
          diagnosa: 'Dental Caries',
          patient: { id: 'p1', nama_lengkap: 'Jane Doe', no_rm: 'RM-001' },
          dokter: { full_name: 'Drg. Ahmad' }
        }
      ]
    }),
    getAllDoctors: vi.fn().mockResolvedValue({
      success: true,
      data: [{ id: 'dokter-1', full_name: 'Drg. Ahmad' }]
    }),
    createVisit: vi.fn().mockResolvedValue({ success: true }),
    updateVisitStatus: vi.fn().mockResolvedValue({ success: true })
  }
}));

vi.mock('../services/patientService', () => ({
  patientService: {
    searchPatients: vi.fn().mockResolvedValue({
      success: true,
      data: [{ id: 'p1', nama_lengkap: 'Jane Doe', no_rm: 'RM-001' }]
    })
  }
}));

vi.mock('../services/doctorScheduleService', () => ({
  doctorScheduleService: {
    getAllActiveSchedules: vi.fn().mockResolvedValue({
      success: true,
      data: []
    })
  },
  getHariLabel: (day) => 'Senin'
}));

// Mock Supabase fully with all query chain methods
vi.mock('../services/supabase', () => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: vi.fn().mockImplementation((cb) => Promise.resolve(cb({ data: [], error: null })))
  };
  return {
    supabase: {
      from: vi.fn(() => mockQuery),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'dokter-1' } }, error: null })
      }
    }
  };
});

describe('SchedulePage Component Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the scheduling dashboard correctly', async () => {
    render(<SchedulePage />);
    
    // Check main title is rendered
    expect(screen.getByText(/Jadwal Kunjungan/i)).toBeInTheDocument();
    
    // Check loading indicator or items are displayed after mount
    await waitFor(() => {
      expect(screen.getByText(/Jane Doe/i)).toBeInTheDocument();
    });
  });

  it('displays the visit list elements', async () => {
    render(<SchedulePage />);
    
    await waitFor(() => {
      expect(screen.getByText(/Gigi berlubang/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Terjadwal/i).length).toBeGreaterThan(0);
    });
  });
});
