/** Denti pintar di Asisten AI: obrolan ringan tanpa kuota, topik analisis, ekspresi dari isi jawaban. */
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { smallTalk, topicOf, moodForAnswer, moodForBrief } from '../utils/dentiMood';

const { ai } = vi.hoisted(() => ({
  ai: {
    getStatus: vi.fn(), getProvider: vi.fn(), setEnabled: vi.fn(), ask: vi.fn(),
    feedback: vi.fn(), listKnowledge: vi.fn(), deleteKnowledge: vi.fn(),
  },
}));
vi.mock('../services/aiService', () => ({ aiService: ai }));

import { ToastProvider } from '../components/common/ToastNotification';
import AiAssistantPage from '../components/ai/AiAssistantPage';

describe('Aturan Denti', () => {
  it('obrolan ringan dikenali; pertanyaan data tidak', () => {
    expect(smallTalk('Terima kasih!', { name: 'Rina' })).toMatchObject({ state: 'love', reply: expect.stringContaining('Rina') });
    expect(smallTalk('kamu pintar banget')).toMatchObject({ state: 'shy' });
    expect(smallTalk('kamu siapa?')).toMatchObject({ state: 'wave' });
    expect(smallTalk('ceritakan lelucon dong')).toMatchObject({ state: 'laugh' });
    expect(smallTalk('joget dong')).toMatchObject({ state: 'dance' });
    expect(smallTalk('Halo', { greeting: 'Selamat Pagi' })).toMatchObject({ state: 'wave', reply: expect.stringContaining('Selamat Pagi') });
    expect(smallTalk('halo, berapa pendapatan bulan ini?')).toBeNull();
    expect(smallTalk('terima kasih, sekarang cek stok bahan')).toBeNull();
    expect(smallTalk('stop')).toBeNull();
  });

  it('topik analisis ditebak dari pertanyaan', () => {
    expect(topicOf('Berapa pendapatan bulan ini?')).toBe('data pendapatan');
    expect(topicOf('Bahan apa yang hampir kadaluarsa?')).toBe('stok bahan');
    expect(topicOf('Bagaimana cara membuat tautan layar antrean?')).toBe('panduan Dentiva');
    expect(topicOf('Tolong jelaskan')).toBe('data klinik');
  });

  it('ekspresi mengikuti isi jawaban', () => {
    expect(moodForAnswer('Pendapatan naik 12% dan tertinggi tahun ini.')).toMatchObject({ state: 'celebrate', line: 'Kabar baik — naik 12%! 🎉' });
    expect(moodForAnswer('Ada 3 bahan kadaluarsa dan stok menipis.').state).toBe('surprise');
    expect(moodForAnswer('Kunjungan menurun dan 2 tagihan belum dibayar.').state).toBe('think');
    expect(moodForAnswer('Buka menu Pengaturan, lalu klik Layar Antrean.').state).toBe('point');
    expect(moodForAnswer('Jumlah pasien: 40.').state).toBe('happy');
    expect(moodForAnswer('', { error: true }).state).toBe('sorry');
  });

  it('ekspresi catatan Dashboard dari tingkat poin', () => {
    expect(moodForBrief({ poin: [{ tingkat: 'penting' }, { tingkat: 'baik' }] })).toBe('think');
    expect(moodForBrief({ poin: [{ tingkat: 'baik' }, { tingkat: 'perhatian' }] })).toBe('happy');
    expect(moodForBrief({ poin: [{ tingkat: 'perhatian' }] })).toBe('talk');
  });
});

describe('Denti di halaman Asisten AI', () => {
  const status = { paket: 'Pro', tersedia_di_paket: true, aktif: true, kuota_bulanan: 300, terpakai_bulan_ini: 1 };
  const wrap = () => render(<MemoryRouter><ToastProvider><AiAssistantPage /></ToastProvider></MemoryRouter>);
  const send = async (text) => {
    const box = await screen.findByPlaceholderText(/Tulis pertanyaan/);
    fireEvent.change(box, { target: { value: text } });
    fireEvent.click(screen.getByRole('button', { name: /Kirim/ }));
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    sessionStorage.clear();
    ai.getStatus.mockResolvedValue({ success: true, data: status });
    ai.getProvider.mockResolvedValue({ success: true, data: { configured: true, provider: 'gemini', label: 'Google Gemini' } });
  });

  it('menyapa saat dibuka; obrolan ringan dijawab Denti tanpa memanggil AI', async () => {
    wrap();
    expect(await screen.findByText(/Saya Denti — tanyakan apa saja/)).toBeInTheDocument();
    await send('terima kasih');
    expect(await screen.findByText('Dijawab langsung oleh Denti · tidak memakai kuota')).toBeInTheDocument();
    expect(ai.ask).not.toHaveBeenCalled();
    expect(document.querySelector('svg.denti')).toHaveAttribute('data-state', 'love');
  });

  it('pertanyaan data: Denti memindai lalu bereaksi pada jawaban; obrolan ringan tidak ikut riwayat AI', async () => {
    let resolve;
    ai.ask.mockReturnValue(new Promise((r) => { resolve = r; }));
    wrap();
    await send('halo');
    await screen.findByText('Dijawab langsung oleh Denti · tidak memakai kuota');
    await send('Berapa pendapatan bulan ini?');
    expect(await screen.findByText('Menganalisis data pendapatan…')).toBeInTheDocument();
    await waitFor(() => expect(document.querySelector('svg.denti')).toHaveAttribute('data-state', 'scan'));
    expect(ai.ask).toHaveBeenCalledWith('Berapa pendapatan bulan ini?', []);
    resolve({ success: true, data: { answer: 'Pendapatan naik 15% dibanding bulan lalu.', tools: [], usage_id: 'u1' } });
    // Denti "berbicara" selama jawaban muncul, lalu merayakan sambil menyebut angka pentingnya
    expect(await screen.findByText('Kabar baik — naik 15%! 🎉')).toBeInTheDocument();
    await waitFor(() => expect(document.querySelector('svg.denti')).toHaveAttribute('data-state', 'celebrate'), { timeout: 2500 });
  });

  it('Denti bisa dicolek', async () => {
    wrap();
    fireEvent.click(await screen.findByRole('button', { name: 'Colek Denti' }));
    expect(await screen.findByText('Hihi, geli!')).toBeInTheDocument();
    expect(document.querySelector('svg.denti')).toHaveAttribute('data-state', 'laugh');
  });
});

describe('Denti pintar — keterampilan di halaman', () => {
  const status = { paket: 'Pro', tersedia_di_paket: true, aktif: true, kuota_bulanan: 300, terpakai_bulan_ini: 1 };
  const Where = () => {
    const loc = useLocation();
    return <span data-testid="where">{loc.pathname}{loc.search}</span>;
  };
  const wrap = () => render(
    <MemoryRouter initialEntries={['/admin/asisten-ai']}>
      <ToastProvider>
        <Routes>
          <Route path="/admin/asisten-ai" element={<AiAssistantPage />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
  const send = async (text) => {
    const box = await screen.findByPlaceholderText(/Tulis pertanyaan/);
    fireEvent.change(box, { target: { value: text } });
    fireEvent.click(screen.getByRole('button', { name: /Kirim/ }));
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    sessionStorage.clear();
    localStorage.clear();
    ai.getStatus.mockResolvedValue({ success: true, data: status });
    ai.getProvider.mockResolvedValue({ success: true, data: { configured: true, provider: 'gemini', label: 'Google Gemini' } });
  });

  it('kalkulator dijawab instan dengan indikator mengetik, tanpa AI', async () => {
    wrap();
    await send('diskon 20% dari 350rb');
    expect(await screen.findByText('Denti sedang mengetik')).toBeInTheDocument();
    expect((await screen.findAllByText(/harga setelah diskon/)).length).toBeGreaterThan(0);
    expect(ai.ask).not.toHaveBeenCalled();
  });

  it('"buka jadwal dokter" membuka halaman Jadwal Dokter', async () => {
    wrap();
    await send('buka jadwal dokter');
    expect((await screen.findAllByText(/Siap, saya buka/)).length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/admin/jadwal-dokter'), { timeout: 2500 });
  });

  it('mengingat nama panggilan di perangkat', async () => {
    wrap();
    await send('panggil aku Bu Rina');
    expect((await screen.findAllByText(/Senang berkenalan, Bu Rina/)).length).toBeGreaterThan(0);
    expect(localStorage.getItem('dentiva-denti-nickname')).toBe('Bu Rina');
    await send('siapa namaku');
    expect((await screen.findAllByText(/Tentu ingat/)).length).toBeGreaterThan(0);
  });

  it('saran pertanyaan lanjutan muncul dan bisa diklik', async () => {
    ai.ask.mockResolvedValue({ success: true, data: { answer: 'Pendapatan bulan ini Rp 12.000.000.', tools: [], usage_id: 'u9' } });
    wrap();
    await send('Berapa pendapatan bulan ini?');
    const chip = await screen.findByRole('button', { name: 'Bandingkan dengan bulan lalu' });
    fireEvent.click(chip);
    await waitFor(() => expect(ai.ask).toHaveBeenLastCalledWith('Bandingkan dengan bulan lalu', expect.any(Array)));
  });

  it('"mulai baru" membersihkan percakapan', async () => {
    wrap();
    await send('halo');
    await screen.findByText('Dijawab langsung oleh Denti · tidak memakai kuota');
    await send('mulai baru');
    expect(await screen.findByText(/Percakapan dibersihkan/)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Dijawab langsung oleh Denti · tidak memakai kuota')).not.toBeInTheDocument());
  });
});

describe('Denti 4× — fitur hidup di halaman', () => {
  const status = { paket: 'Pro', tersedia_di_paket: true, aktif: true, kuota_bulanan: 300, terpakai_bulan_ini: 1 };
  const wrap = () => render(<MemoryRouter><ToastProvider><AiAssistantPage /></ToastProvider></MemoryRouter>);
  const box = () => screen.findByPlaceholderText(/Tulis pertanyaan/);

  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    sessionStorage.clear();
    ai.getStatus.mockResolvedValue({ success: true, data: status });
    ai.getProvider.mockResolvedValue({ success: true, data: { configured: true, provider: 'gemini', label: 'Google Gemini' } });
    delete ai.getBrief;
  });

  it('saran saat mengetik muncul; Tab mengisi saran pertama', async () => {
    wrap();
    const input = await box();
    fireEvent.change(input, { target: { value: 'diskon' } });
    expect(await screen.findByText('Mungkin maksud Anda')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(input.value).toBe('Hitung diskon 10% dari 500rb');
  });

  it('tombol Bacakan memakai suara browser dan Denti berbicara', async () => {
    const speak = vi.fn((u) => u.onstart?.());
    window.speechSynthesis = { speak, cancel: vi.fn(), getVoices: () => [{ lang: 'id-ID', name: 'Indonesia' }] };
    window.SpeechSynthesisUtterance = function U(text) { this.text = text; };
    ai.ask.mockResolvedValue({ success: true, data: { answer: 'Pendapatan bulan ini **Rp 12.400.000**.', tools: [], usage_id: 'u1' } });
    wrap();
    fireEvent.change(await box(), { target: { value: 'Berapa pendapatan bulan ini?' } });
    fireEvent.click(screen.getByRole('button', { name: /Kirim/ }));
    fireEvent.click((await screen.findAllByRole('button', { name: 'Bacakan jawaban' }))[0]);
    expect(speak).toHaveBeenCalled();
    expect(speak.mock.calls[0][0].text).toBe('Pendapatan bulan ini 12.400.000 rupiah.');
    expect(document.querySelector('svg.denti')).toHaveAttribute('data-state', 'talk');
    delete window.speechSynthesis;
    delete window.SpeechSynthesisUtterance;
  });

  it('catatan hari ini dari cache Dashboard ditawarkan tanpa memanggil AI', async () => {
    ai.getBrief = vi.fn().mockResolvedValue({ success: true, data: { brief: { poin: [{ judul: '3 tagihan belum dibayar', tingkat: 'perhatian' }] } } });
    wrap();
    expect(await screen.findByRole('button', { name: /Jelaskan catatan hari ini: 3 tagihan belum dibayar/ })).toBeInTheDocument();
    expect(ai.getBrief).toHaveBeenCalledWith(false, 'admin');
    expect(ai.ask).not.toHaveBeenCalled();
  });
});

describe('DentiMascot — arah pandang & kedip alami', () => {
  it('look mengisi --look-x/--look-y; kedip punya tempo acak', async () => {
    const { default: DentiMascot } = await import('../components/mascot/DentiMascot');
    const { container } = render(<DentiMascot look={{ x: 0.5, y: -1 }} />);
    const svg = container.querySelector('svg.denti');
    expect(svg.style.getPropertyValue('--look-x')).toBe('0.500');
    expect(svg.style.getPropertyValue('--look-y')).toBe('-1.000');
    expect(svg.style.getPropertyValue('--blink')).toMatch(/s$/);
    expect(['1', '2']).toContain(svg.getAttribute('data-blink'));
    expect(container.querySelector('.d-gaze')).not.toBeNull();
    expect(container.querySelector('.d-lean')).not.toBeNull();
  });
});
