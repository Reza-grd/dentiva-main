/**
 * Pagar mutu data empati Denti (utils/data/dentiEmpatiData.js) — dijalankan GPT setiap kali menambah entri.
 * Gagal di sini = perbaiki DATA, jangan melonggarkan tes.
 */
import { describe, it, expect } from 'vitest';
import { EMPATI } from '../utils/data/dentiEmpatiData';
import { DENTI_STATES } from '../components/mascot/dentiSvg';
import { smallTalk, normalizeChat, followUps } from '../utils/dentiMood';
import { crisisReply } from '../utils/dentiEmpati';

const NOW = new Date(2026, 9, 10, 9, 5);
const talk = (t, ctx = {}) => smallTalk(t, { now: NOW, afterAnswer: true, ...ctx });
const NEW_STATES = DENTI_STATES.slice(43); // 50 ekspresi v6
const FORBIDDEN_REPLY = /(https?:\/\/|www\.|@\w|\b\d{8,}\b|diagnosa|diagnosis|dosis|\bmg\b|resepkan|minum obat|\bbunuh|\bmati saja)/i;

describe('Skema data empati', () => {
  it('id unik berformat kebab-case, ekspresi valid', () => {
    const ids = EMPATI.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((i) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(i))).toEqual([]);
    expect(EMPATI.filter((e) => !DENTI_STATES.includes(e.state)).map((e) => [e.id, e.state])).toEqual([]);
  });

  it('setiap entri: ≥ 6 frasa unik (setelah normalisasi), ≥ 3 balasan berbeda', () => {
    const bad = EMPATI.filter((e) => new Set(e.say.map((p) => normalizeChat(p))).size < 6 || new Set(e.reply).size < 3).map((e) => e.id);
    expect(bad).toEqual([]);
  });

  it('balasan 20–320 karakter, tanpa tautan/nomor/istilah medis, placeholder hanya {nama}/{sapa}', () => {
    const bad = [];
    for (const e of EMPATI) {
      for (const r of e.reply) {
        const stray = (r.match(/\{[^}]*\}/g) || []).filter((p) => !['{nama}', '{sapa}'].includes(p));
        if (r.length < 20 || r.length > 320 || FORBIDDEN_REPLY.test(r) || stray.length) bad.push([e.id, r.slice(0, 40)]);
      }
    }
    expect(bad).toEqual([]);
  });

  it('frasa tidak memuat kata data klinik (itu urusan AI)', () => {
    const DATA = /\b(pasien|omzet|omset|pendapatan|laporan|jadwal|biaya|harga|stok|invoice|bayar|pembayaran|tagihan|laba|untung|margin)\b/i;
    expect(EMPATI.flatMap((e) => e.say.filter((p) => DATA.test(p)).map((p) => [e.id, p]))).toEqual([]);
  });

  it('tombol saran ≤ 3 dan semuanya dipahami Denti', () => {
    const bad = [];
    for (const e of EMPATI) {
      if ((e.follow || []).length > 3) bad.push([e.id, 'follow > 3']);
      for (const f of followUps(`empati:${e.id}`)) if (talk(f) === null) bad.push([e.id, f]);
    }
    expect(bad).toEqual([]);
  });
});

describe('Perilaku', () => {
  it('setiap frasa dikenali sebagai entrinya sendiri dengan ekspresi yang benar', () => {
    const wrong = [];
    for (const e of EMPATI) {
      for (const p of e.say) {
        const r = talk(p);
        if (r?.intent !== `empati:${e.id}` || r.state !== e.state) wrong.push([e.id, p, r?.intent ?? null]);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('50 ekspresi baru semuanya dipakai minimal satu entri', () => {
    const used = new Set(EMPATI.map((e) => e.state));
    expect(NEW_STATES.filter((s) => !used.has(s))).toEqual([]);
  });

  it('balasan bergiliran (tidak mengulang yang baru dipakai) dan menyebut nama bila ada {sapa}', () => {
    const e = EMPATI.find((x) => x.reply.some((r) => r.includes('{sapa}')));
    const phrase = e.say[0];
    const first = talk(phrase, { name: 'Rina', seed: 0 }).reply;
    const second = talk(phrase, { name: 'Rina', seed: 0, recent: [first] }).reply;
    expect(second).not.toBe(first);
    expect(EMPATI.some((x) => x.reply.some((r) => r.includes('{sapa}')))).toBe(true);
  });

  it('kalimat bernuansa data tetap diteruskan ke AI', () => {
    expect(talk('aku capek lihat omzet bulan ini turun')).toBeNull();
    expect(talk('berapa pasien yang kaget kemarin')).toBeNull();
  });

  it('keadaan darurat batin dijawab hati-hati dengan arahan bantuan (bukan oleh data)', () => {
    for (const t of ['aku ingin bunuh diri', 'rasanya pengen mati', 'aku mau menyakiti diri']) {
      const r = talk(t);
      expect(r?.intent).toBe('crisis');
      expect(r.reply).toMatch(/tidak sendirian/);
      expect(r.reply).toMatch(/112/);
    }
    expect(crisisReply('hari ini capek banget')).toBeNull();
  });
});
