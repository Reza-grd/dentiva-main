import { describe, it, expect } from 'vitest';
import { miniMarkdown } from '../utils/miniMarkdown';

describe('miniMarkdown (jawaban Asisten AI)', () => {
  it('mengonsumsi baris pipe tanpa divider tabel', () => {
    expect(miniMarkdown('| orphan |')).toBe('<p>| orphan |</p>');
    expect(miniMarkdown('Awal\n| <script> |\nAkhir')).toContain('&lt;script&gt;');
    expect(miniMarkdown('| A |\n| invalid divider |')).toContain('<p>| invalid divider |</p>');
  });
  it('meng-escape HTML dari model', () => {
    const html = miniMarkdown('<img src=x onerror=alert(1)> **aman**');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
    expect(html).toContain('<strong>aman</strong>');
  });

  it('merender tabel dan menandai kolom angka', () => {
    const html = miniMarkdown('| Tindakan | Pendapatan |\n|---|---:|\n| Scaling | Rp 1.250.000 |');
    expect(html).toContain('<table>');
    expect(html).toContain('<th>Tindakan</th>');
    expect(html).toContain('<td class="num">Rp 1.250.000</td>');
  });

  it('merender daftar dan paragraf', () => {
    const html = miniMarkdown('Ringkasan:\n- satu\n- dua\n\n1. langkah');
    expect(html).toContain('<p>Ringkasan:</p>');
    expect(html).toContain('<ul><li>satu</li><li>dua</li></ul>');
    expect(html).toContain('<ol><li>langkah</li></ol>');
  });
});
