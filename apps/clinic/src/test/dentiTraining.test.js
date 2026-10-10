/**
 * Data latihan Denti — kalimat nyata (baku, gaul, singkatan, huruf berulang) beserta intent yang
 * diharapkan. Tambahkan kalimat baru di sini setiap kali Denti salah paham, lalu perbaiki aturannya
 * di utils/dentiMood.js sampai semua lulus.
 */
import { describe, it, expect } from 'vitest';
import { smallTalk, normalizeChat, moodForAnswer, topicOf } from '../utils/dentiMood';

const INTENT_CASES = {
  greet: ['halo', 'Halo Denti!', 'haloooo', 'hai kak', 'hi', 'hey denti', 'selamat pagi', 'Pagi!', 'siang dok', 'Selamat malam',
    'assalamualaikum', 'Assalamu alaikum', 'permisi', 'p', 'tes', 'testing'],
  thanks: ['terima kasih', 'Terimakasih ya', 'makasih', 'makasihhh denti', 'mksh', 'trims', 'thanks!', 'thank you', 'thx', 'tq',
    'tengkyu', 'nuhun', 'matur nuwun', 'oke makasih ya', 'Terima kasih banyak 🙏'],
  praise: ['kamu pintar', 'pinter banget', 'hebat!', 'keren', 'mantap', 'mantul', 'bagus sekali', 'luar biasa', 'good job', 'cakep',
    'jago juga kamu', 'the best', 'nice'],
  complaint: ['salah', 'jawabanmu salah', 'kok keliru', 'ngaco', 'tidak tepat', 'gak bener', 'bukan itu', 'kurang bagus',
    'tidak membantu', 'lemot', 'jelek'],
  love: ['sayang kamu', 'love you denti', 'gemes', 'imut'],
  who: ['kamu siapa?', 'siapa kamu', 'siapa namamu', 'nama kamu siapa', 'kenalan dong'],
  maker: ['siapa yang membuat kamu', 'kamu dibuat siapa?', 'siapa yang bikin kamu'],
  joke: ['ceritakan lelucon', 'ada jokes?', 'bercanda dong', 'hibur aku'],
  laugh: ['haha', 'hahaha', 'wkwkwk', 'hehe', 'lol'],
  dance: ['joget dong', 'menari!', 'nyanyi', 'goyang denti'],
  tired: ['capek', 'aku lelah', 'pusing banget', 'stres', 'ngantuk', 'bosan'],
  cheer: ['semangat!', 'yeay', 'hore', 'alhamdulillah'],
  bye: ['dadah', 'sampai jumpa', 'bye', 'pamit dulu', 'see you'],
  how: ['apa kabar?', 'gimana kabarnya', 'kabarmu gimana'],
  ack: ['ok', 'oke', 'sip', 'siap', 'baik', 'noted', 'paham', 'iya', 'lanjut'],
  time: ['jam berapa?', 'jam berapa sekarang', 'sekarang jam berapa', 'pukul berapa'],
  date: ['tanggal berapa?', 'hari ini tanggal berapa', 'hari apa sekarang', 'hari apa'],
  help: ['kamu bisa apa', 'bisa apa saja?', 'bisa bantu apa', 'apa yang bisa kamu bantu', 'help', 'bantuan', 'tolong', 'bisa ngapain aja'],
};

/** Pertanyaan data/panduan — HARUS diteruskan ke AI (bukan obrolan ringan). */
const AI_QUESTIONS = [
  'Berapa pendapatan bulan ini?', 'halo, berapa pendapatan bulan ini?', 'terima kasih, sekarang cek stok bahan',
  'Ringkas kondisi klinik hari ini', 'jadwal dokter minggu depan', 'pasien yang perlu recall', 'tagihan belum dibayar',
  'bagaimana cara membuat tautan antrean', 'simulasi harga scaling naik 10%', 'BEP klinik', 'proyeksi arus kas',
  'tindakan paling menguntungkan', 'stop', 'hapus semua', 'buatkan laporan', 'tolong hitung laba bulan lalu',
  'jam berapa klinik paling ramai?', 'hari apa pasien paling banyak?', 'kenapa pendapatan turun?',
];

describe('Latihan Denti — pengenalan obrolan ringan', () => {
  for (const [intent, phrases] of Object.entries(INTENT_CASES)) {
    it(`mengenali "${intent}" (${phrases.length} kalimat)`, () => {
      const wrong = phrases
        .map((p) => [p, smallTalk(p, { now: new Date(2026, 9, 10, 9, 5), afterAnswer: true })?.intent ?? null])
        .filter(([, got]) => got !== intent);
      expect(wrong).toEqual([]);
    });
  }

  it('pertanyaan data & panduan tetap diteruskan ke AI', () => {
    const leaked = AI_QUESTIONS.filter((q) => smallTalk(q) !== null);
    expect(leaked).toEqual([]);
  });

  it('akurasi keseluruhan 100% pada data latihan', () => {
    const all = Object.entries(INTENT_CASES).flatMap(([intent, ps]) => ps.map((p) => [p, intent]));
    const right = all.filter(([p, intent]) => smallTalk(p)?.intent === intent).length
      + AI_QUESTIONS.filter((q) => smallTalk(q) === null).length;
    expect(right / (all.length + AI_QUESTIONS.length)).toBe(1);
    expect(all.length).toBeGreaterThanOrEqual(100);
  });
});

describe('Latihan Denti — balasan', () => {
  const now = new Date(2026, 9, 10, 9, 5);

  it('jam & tanggal dijawab dari perangkat', () => {
    expect(smallTalk('jam berapa?', { now }).reply).toContain('09.05');
    expect(smallTalk('hari ini tanggal berapa', { now }).reply).toMatch(/Sabtu, 10 Oktober 2026/);
  });

  it('balasan bervariasi & menyebut nama', () => {
    const a = smallTalk('makasih', { name: 'Rina', seed: 0 }).reply;
    const b = smallTalk('makasih', { name: 'Rina', seed: 1 }).reply;
    expect(a).not.toBe(b);
    expect(a).toContain('Rina');
  });

  it('keluhan: arahkan ke 👎 bila sudah ada jawaban AI', () => {
    expect(smallTalk('salah', { afterAnswer: true }).reply).toContain('Kurang tepat');
    expect(smallTalk('salah', { afterAnswer: false }).reply).not.toContain('Kurang tepat');
  });

  it('bantuan menampilkan daftar kemampuan', () => {
    expect(smallTalk('kamu bisa apa').reply).toMatch(/Keuangan[\s\S]*Perencanaan[\s\S]*Operasional/);
  });

  it('normalisasi: huruf berulang, emoji, sapaan ke Denti, partikel', () => {
    expect(normalizeChat('Makasihhh Denti!! 😍')).toBe('makasih');
    expect(normalizeChat('halo kak denti dong ya')).toBe('halo');
  });
});

describe('Latihan Denti — ekspresi dari isi jawaban', () => {
  const CASES = [
    ['Pendapatan naik 12% dan tertinggi tahun ini.', 'celebrate'],
    ['Tidak ada bahan yang kadaluarsa; semua stok aman.', 'celebrate'],
    ['Belum ada tagihan yang belum dibayar.', 'happy'],
    ['Ada 3 bahan kadaluarsa dan 2 stok menipis.', 'surprise'],
    ['Ada 10 tagihan belum dibayar dan kunjungan menurun.', 'think'],
    ['Klinik defisit Rp 2 juta bulan ini.', 'surprise'],
    ['Buka menu Pengaturan, lalu klik Layar Antrean TV.', 'point'],
    ['Jumlah pasien hari ini: 14.', 'happy'],
  ];
  it.each(CASES)('%s → %s', (text, state) => {
    expect(moodForAnswer(text).state).toBe(state);
  });

  it('topik ringkasan hari ini', () => {
    expect(topicOf('Ringkas kondisi klinik hari ini')).toBe('kondisi klinik hari ini');
  });
});
