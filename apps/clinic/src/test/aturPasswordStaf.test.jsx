import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AturPasswordStafModal, { cekPasswordStaf } from '../components/admin/AturPasswordStafModal';

describe('Atur ulang password staf', () => {
  it('aturan password sama dengan server', () => {
    expect(cekPasswordStaf('abc1')).toMatch(/minimal 8/);
    expect(cekPasswordStaf('abcdefgh')).toMatch(/huruf dan angka/);
    expect(cekPasswordStaf('12345678')).toMatch(/huruf dan angka/);
    expect(cekPasswordStaf('klinik2026')).toBeNull();
  });

  it('menolak konfirmasi berbeda dan mengirim password yang valid', async () => {
    const onSubmit = vi.fn(async () => ({ success: true }));
    render(<AturPasswordStafModal staf={{ id: 's1', full_name: 'Rina', email: 'rina@k.test' }} onSubmit={onSubmit} onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText('Password baru'), { target: { value: 'klinik2026' } });
    fireEvent.change(screen.getByLabelText('Ulangi password baru'), { target: { value: 'klinik2025' } });
    fireEvent.click(screen.getByRole('button', { name: /Simpan password/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('tidak sama');
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Ulangi password baru'), { target: { value: 'klinik2026' } });
    fireEvent.click(screen.getByRole('button', { name: /Simpan password/ }));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledWith('klinik2026', { resetMfa: false }));
  });
});
