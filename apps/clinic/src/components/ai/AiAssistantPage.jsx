import React, { useCallback, useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { Sparkles, Send, RotateCcw, ShieldCheck, Lock, Database, Power } from 'lucide-react';
import { Card, CardContent, Button, Badge } from '@dentiva/ui';
import { aiService } from '../../services/aiService';
import { miniMarkdown } from '../../utils/miniMarkdown';
import { useToast } from '../common/ToastNotification';
import './ai-assistant.css';

const SUGGESTIONS = [
  'Berapa pendapatan bulan ini dibanding bulan lalu?',
  'Tindakan apa yang paling menguntungkan dalam 3 bulan terakhir?',
  'Bandingkan pendapatan dan pengeluaran bulan ini.',
  'Bagaimana kinerja tiap dokter bulan ini?',
  'Bahan apa yang stoknya menipis atau hampir kadaluarsa?',
  'Ada kunjungan selesai yang belum dibayar?',
];
const TOOL_LABEL = {
  ringkasan_pendapatan: 'Pendapatan',
  kinerja_tindakan: 'Tindakan & HPP',
  pengeluaran_dan_laba: 'Pengeluaran',
  kinerja_dokter: 'Kinerja dokter',
  statistik_kunjungan: 'Kunjungan',
  peringatan_stok: 'Stok bahan',
  kunjungan_belum_dibayar: 'Belum dibayar',
};
const MAX_LEN = 1000;
const STORE_KEY = 'dentiva-ai-chat';

const loadChat = () => {
  try { return JSON.parse(sessionStorage.getItem(STORE_KEY) || '[]'); } catch { return []; }
};
const saveChat = (msgs) => {
  try { sessionStorage.setItem(STORE_KEY, JSON.stringify(msgs.slice(-40))); } catch { /* abaikan */ }
};

function Answer({ text }) {
  const html = DOMPurify.sanitize(miniMarkdown(text));
  return <div className="ai-md" dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function AiAssistantPage() {
  const toast = useToast();
  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState('');
  const [messages, setMessages] = useState(loadChat);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [agree, setAgree] = useState(false);
  const [toggling, setToggling] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  const refreshStatus = useCallback(async () => {
    const res = await aiService.getStatus();
    if (res.success) setStatus(res.data);
    else setStatusError(res.error);
  }, []);

  useEffect(() => { refreshStatus(); }, [refreshStatus]);
  useEffect(() => { saveChat(messages); endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, busy]);

  const ask = async (q) => {
    const question = (q ?? input).trim();
    if (!question || busy) return;
    const history = messages.filter((m) => !m.error).map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { role: 'user', content: question }]);
    setInput('');
    setBusy(true);
    const res = await aiService.ask(question, history);
    setBusy(false);
    if (res.success) {
      setMessages((m) => [...m, { role: 'assistant', content: res.data.answer, tools: res.data.tools || [] }]);
      if (res.data.status) setStatus(res.data.status);
    } else {
      setMessages((m) => [...m, { role: 'assistant', content: res.error, error: true }]);
    }
    inputRef.current?.focus();
  };

  const toggle = async (enabled) => {
    setToggling(true);
    const res = await aiService.setEnabled(enabled);
    setToggling(false);
    if (res.success) {
      setStatus(res.data);
      toast.success(enabled ? 'Asisten AI diaktifkan.' : 'Asisten AI dinonaktifkan.');
    } else {
      toast.error('Gagal menyimpan: ' + res.error);
    }
  };

  const header = (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles className="text-[var(--color-accent)]" /> Asisten Keuangan
          <Badge variant="warning">Beta</Badge>
        </h1>
        <p className="text-sm text-gray-500">Tanyakan kondisi keuangan dan operasional klinik dalam bahasa sehari-hari.</p>
      </div>
      {status?.aktif && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500 tabular-nums">
            {status.terpakai_bulan_ini} / {status.kuota_bulanan} pertanyaan bulan ini
          </span>
          {messages.length > 0 && (
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setMessages([])}>
              <RotateCcw size={14} /> Percakapan baru
            </Button>
          )}
        </div>
      )}
    </div>
  );

  if (statusError) {
    return (
      <div className="space-y-5 max-w-4xl mx-auto">
        {header}
        <Card><CardContent className="p-6 text-sm text-gray-600 dark:text-gray-300">
          Asisten Keuangan hanya dapat dibuka oleh admin klinik. ({statusError})
        </CardContent></Card>
      </div>
    );
  }
  if (!status) {
    return <div className="space-y-5 max-w-4xl mx-auto">{header}<Card><CardContent className="p-6 text-sm text-gray-500">Memuat…</CardContent></Card></div>;
  }

  if (!status.tersedia_di_paket) {
    return (
      <div className="space-y-5 max-w-4xl mx-auto">
        {header}
        <Card><CardContent className="p-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Tersedia di paket Pro dan Enterprise</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Paket klinik saat ini: <strong>{status.paket || 'belum berlangganan'}</strong>. Tingkatkan paket untuk memakai Asisten Keuangan.
          </p>
        </CardContent></Card>
      </div>
    );
  }

  if (!status.aktif) {
    return (
      <div className="space-y-5 max-w-4xl mx-auto">
        {header}
        <Card><CardContent className="p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Aktifkan Asisten Keuangan</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Asisten menjawab pertanyaan seperti pendapatan, pengeluaran, tindakan paling menguntungkan, kinerja dokter, dan stok bahan, memakai data klinik Anda.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-200">
            <li className="flex gap-3"><Database size={18} className="shrink-0 text-[var(--color-accent)] mt-0.5" />
              Yang dikirim ke AI hanya <strong>angka ringkasan</strong> (total, jumlah, per tindakan/dokter/kategori), dan hanya saat Anda bertanya.</li>
            <li className="flex gap-3"><Lock size={18} className="shrink-0 text-[var(--color-accent)] mt-0.5" />
              <span><strong>Tidak ada</strong> nama, NIK, kontak, atau isi rekam medis pasien yang dikirim.</span></li>
            <li className="flex gap-3"><ShieldCheck size={18} className="shrink-0 text-[var(--color-accent)] mt-0.5" />
              Data diproses oleh penyedia AI (Anthropic, di luar Indonesia). Setiap pertanyaan tercatat, dan fitur ini bisa dinonaktifkan kapan saja.</li>
          </ul>
          <label className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-200 cursor-pointer">
            <input id="ai-agree" type="checkbox" className="mt-1" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            Saya admin klinik ini dan menyetujui pemrosesan data ringkasan keuangan klinik oleh Asisten AI.
          </label>
          <Button disabled={!agree || toggling} onClick={() => toggle(true)} className="gap-2">
            <Sparkles size={16} /> {toggling ? 'Menyimpan…' : 'Aktifkan Asisten Keuangan'}
          </Button>
        </CardContent></Card>
      </div>
    );
  }

  const left = Math.max(0, status.kuota_bulanan - status.terpakai_bulan_ini);

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {header}

      <Card>
        <CardContent className="p-0">
          <div className="min-h-[420px] max-h-[calc(100vh-330px)] overflow-y-auto p-5 space-y-5">
            {messages.length === 0 && (
              <div className="py-6 text-center space-y-5">
                <div className="mx-auto w-14 h-14 rounded-2xl grid place-items-center bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)]">
                  <Sparkles className="text-[var(--color-accent)]" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Mau tahu apa tentang klinik hari ini?</p>
                  <p className="text-sm text-gray-500">Pilih contoh di bawah atau ketik pertanyaan Anda sendiri.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-2 text-left">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => ask(s)}
                      className="text-sm px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[var(--color-accent)] hover:bg-[color-mix(in_srgb,var(--color-accent)_6%,transparent)] transition-colors text-gray-700 dark:text-gray-200">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (m.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-tr-md px-4 py-2.5 text-sm text-white bg-[var(--color-accent)] whitespace-pre-wrap">{m.content}</div>
              </div>
            ) : (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 shrink-0 rounded-xl grid place-items-center bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)]">
                  <Sparkles size={16} className="text-[var(--color-accent)]" />
                </div>
                <div className={`min-w-0 flex-1 rounded-2xl rounded-tl-md px-4 py-3 border ${m.error ? 'border-red-200 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-sm' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'}`}>
                  {m.error ? m.content : <Answer text={m.content} />}
                  {!m.error && (
                    <p className="mt-3 text-xs text-gray-400">
                      Dibuat AI, periksa kembali angka penting
                      {m.tools?.length ? ` · data: ${m.tools.map((t) => TOOL_LABEL[t] || t).join(', ')}` : ''}
                    </p>
                  )}
                </div>
              </div>
            )))}

            {busy && (
              <div className="flex gap-3 items-center text-sm text-gray-500">
                <div className="w-8 h-8 rounded-xl grid place-items-center bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)]">
                  <Sparkles size={16} className="text-[var(--color-accent)]" />
                </div>
                Menganalisis data klinik <span className="ai-dots"><span /><span /><span /></span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form className="border-t border-gray-200 dark:border-gray-700 p-3 flex gap-2 items-end"
            onSubmit={(e) => { e.preventDefault(); ask(); }}>
            <textarea
              id="ai-question"
              ref={inputRef}
              rows={2}
              maxLength={MAX_LEN}
              value={input}
              disabled={busy || left === 0}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }}
              placeholder={left === 0 ? 'Kuota bulan ini sudah habis.' : 'Tulis pertanyaan… (Enter untuk kirim, Shift+Enter baris baru)'}
              className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
            <Button type="submit" disabled={busy || !input.trim() || left === 0} className="gap-1 h-11">
              <Send size={16} /> Kirim
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-xs text-gray-400 gap-3 flex-wrap">
        <span>Hanya angka ringkasan yang dikirim ke AI. Tidak ada data identitas atau rekam medis pasien.</span>
        <button type="button" disabled={toggling} onClick={() => toggle(false)} className="inline-flex items-center gap-1 hover:text-red-500">
          <Power size={12} /> Nonaktifkan Asisten AI
        </button>
      </div>
    </div>
  );
}
