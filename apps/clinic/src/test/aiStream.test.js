import { describe, expect, it, vi } from 'vitest';
import { readAnswerStream } from '../services/aiService';

vi.mock('../services/supabase', () => ({ supabase: {} }));

const streamOf = (...chunks) => new Response(new ReadableStream({
  start(c) {
    const enc = new TextEncoder();
    chunks.forEach((t) => c.enqueue(enc.encode(t)));
    c.close();
  },
}));
const sse = (e) => `data: ${JSON.stringify(e)}\n\n`;

describe('readAnswerStream', () => {
  it('menggabungkan teks bertahap dan mengembalikan peristiwa done', async () => {
    const seen = [];
    const done = await readAnswerStream(
      streamOf(sse({ type: 'delta', text: 'Halo ' }), sse({ type: 'delta', text: 'Dok' }), sse({ type: 'done', status: 200, data: { answer: 'Halo Dok' } })),
      { onDelta: (t) => seen.push(t) },
    );
    expect(seen).toEqual(['Halo ', 'Dok']);
    expect(done.data.answer).toBe('Halo Dok');
  });

  it('tetap utuh bila satu peristiwa terpotong di dua potongan jaringan', async () => {
    const whole = sse({ type: 'delta', text: 'Rp 1.250.000' });
    const seen = [];
    await readAnswerStream(streamOf(whole.slice(0, 12), whole.slice(12)), { onDelta: (t) => seen.push(t) });
    expect(seen).toEqual(['Rp 1.250.000']);
  });

  it('meneruskan reset saat model lanjut memanggil alat', async () => {
    const onReset = vi.fn();
    await readAnswerStream(streamOf(sse({ type: 'reset' })), { onReset });
    expect(onReset).toHaveBeenCalledOnce();
  });

  it('mengembalikan null bila koneksi putus sebelum done', async () => {
    expect(await readAnswerStream(streamOf(sse({ type: 'delta', text: 'Sebagian' })))).toBeNull();
  });
});
