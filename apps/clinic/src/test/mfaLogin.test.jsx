import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const verifikasiMfa = vi.fn();
vi.mock('../contexts/AuthContext', async (asli) => {
  const m = await asli();
  return { ...m, useAuth: () => ({ user: { email: 'admin@klinik.test' }, verifikasiMfa, signOut: vi.fn() }) };
});

import { aalSesi, sesiPerluMfa } from '../contexts/AuthContext';
import VerifikasiMfaPage from '../components/auth/VerifikasiMfaPage';

const token = (payload) => `x.${btoa(JSON.stringify(payload)).replace(/=+$/, '')}.y`;

describe('Verifikasi dua langkah', () => {
  it('membaca level sesi dari token dan menentukan kapan kode diperlukan', () => {
    const aal1 = { access_token: token({ aal: 'aal1' }), user: { factors: [{ status: 'verified' }] } };
    const aal2 = { access_token: token({ aal: 'aal2' }), user: { factors: [{ status: 'verified' }] } };
    const tanpaMfa = { access_token: token({ aal: 'aal1' }), user: { factors: [] } };
    expect(aalSesi(aal1)).toBe('aal1');
    expect(sesiPerluMfa(aal1)).toBe(true);
    expect(sesiPerluMfa(aal2)).toBe(false);
    expect(sesiPerluMfa(tanpaMfa)).toBe(false);
    expect(sesiPerluMfa({ access_token: 'rusak', user: { factors: [{ status: 'unverified' }] } })).toBe(false);
  });

  it('halaman kode menolak format salah dan meneruskan 6 digit', async () => {
    verifikasiMfa.mockResolvedValue({ success: false, error: 'Kode salah atau sudah kedaluwarsa. Coba kode terbaru.' });
    render(<VerifikasiMfaPage />);
    fireEvent.change(screen.getByLabelText('Kode verifikasi'), { target: { value: '12a3' } });
    fireEvent.click(screen.getByRole('button', { name: /Verifikasi/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('6 digit');
    expect(verifikasiMfa).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Kode verifikasi'), { target: { value: '482913' } });
    fireEvent.click(screen.getByRole('button', { name: /Verifikasi/ }));
    expect(await screen.findByText(/Kode salah/)).toBeInTheDocument();
    expect(verifikasiMfa).toHaveBeenCalledWith('482913');
  });
});
