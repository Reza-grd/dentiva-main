"""Perbarui indeks dan rujukan dari artikel terbit; tidak menulis ulang naskah artikel."""
from pathlib import Path
import argparse
import hashlib
import json
import re
import subprocess

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]
C = 'apps/clinic/src/components/'

STATUS_REFS = [
    [('auth/LoginPage', 'Lupa password?'), ('auth/LoginPage', "resetState === 'sent'")],
    [('settings/SettingsPage', 'Aktifkan 2FA (Nonaktif)'), ('layout/TopBar', "navigate('/pengaturan')")],
    [('settings/SettingsPage', 'Buat Backup Sekarang (Nonaktif)'), ('settings/SettingsPage', 'Pilih File Backup (Nonaktif)')],
    [('common/DesktopUpdater', 'Dentiva {update.version} tersedia'), ('common/DesktopUpdater', "'Perbarui sekarang'")],
    [('payment/PaymentList', 'navigate(`/pembayaran/${payment.visit_id}`)'), ('payment/PaymentForm', 'Cetak Invoice')],
    [('payment/PaymentForm', 'const klinikInfo ='), ('payment/PaymentForm', 'Cetak Invoice')],
    [('admin/UserManagementPage', 'Akun dokter dibuat dan diverifikasi'), ('admin/UserManagementPage', "register('role')")],
    [('payment/PaymentForm', "const isLocked = existingPayment?.status_pembayaran === 'paid'"), ('payment/PaymentList', 'Detail')],
]

def read_json(name):
    return json.loads((OUT / name).read_text(encoding='utf-8'))

def write_json(name, data):
    (OUT / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')

def numbered_steps(text):
    body = text.split('## Langkah\n', 1)[1].split('\n## ', 1)[0]
    return [(int(n), s) for n, s in re.findall(r'^(\d+)\. (.+)$', body, re.M)]

def build(acuan=None):
    index = read_json('indeks.json')
    old = read_json('sumber-langkah.json')
    base = subprocess.check_output(['git', 'rev-parse', acuan or old['commit_sumber']], cwd=ROOT, text=True).strip()
    bystep = {(x['slug'], x['langkah']): x for x in old['langkah']}
    sources, evidence = {}, []
    for entry in index:
        slug = entry['slug']
        text = (OUT / 'artikel' / (slug + '.md')).read_text(encoding='utf-8')
        entry['judul'] = text.splitlines()[0].removeprefix('# ')
        for number, content in numbered_steps(text):
            if slug == 'status-layanan':
                refs = [{'berkas': C + name + '.jsx', 'penanda': anchor} for name, anchor in STATUS_REFS[number - 1]]
            else:
                refs = bystep[(slug, number)]['rujukan']
            resolved = []
            for r in refs:
                path = ROOT / r['berkas']
                lines = path.read_text(encoding='utf-8').splitlines()
                hits = [i for i, line in enumerate(lines, 1) if r['penanda'] in line]
                assert hits, (slug, number, r)
                resolved.append({'berkas': r['berkas'], 'baris': hits[0], 'penanda': r['penanda']})
                sources[r['berkas']] = hashlib.sha256(path.read_bytes()).hexdigest()
            evidence.append({'slug': slug, 'langkah': number, 'teks': content, 'rujukan': resolved})
    # Konteks penilaian Ketua dan batas layanan; terpisah dari naskah yang dibaca staf.
    context = []
    for name, anchor in [
        ('docs/tim/04-papan-tugas.md', 'G7 Pusat Bantuan diserahkan'),
        ('apps/desktop/src-tauri/tauri.conf.json', 'GANTI_DENGAN_KUNCI_PUBLIK_UPDATER'),
        ('docs/desktop.md', 'dialog cetak mungkin tidak muncul'),
    ]:
        lines = (ROOT / name).read_text(encoding='utf-8').splitlines()
        matches = [i for i, line in enumerate(lines, 1) if anchor in line]
        assert matches, name
        context.append({'berkas': name, 'baris': matches[0], 'penanda': anchor,
                        'sha256': hashlib.sha256((ROOT / name).read_bytes()).hexdigest()})
    write_json('indeks.json', index)
    write_json('sumber-langkah.json', {'versi': 2, 'commit_sumber': base,
        'catatan': 'Naskah utama ada pada artikel/*.md. Rujukan teknis hanya disimpan dalam metadata ini. Status layanan mengikuti tinjauan Ketua dan instruksi G7b; label layar bukan bukti kesiapan layanan.',
        'sha256_sumber': sources, 'konteks': context, 'langkah': evidence})
    readme = OUT / 'README.md'
    if readme.exists() and '<!-- STATUS-TABLE:begin -->' in readme.read_text(encoding='utf-8'):
        status = (OUT / 'artikel/status-layanan.md').read_text(encoding='utf-8')
        rows = ['| Penanda STATUS | Berkas dan bagian | Kalimat pembuka yang harus diganti saat layanan siap |',
                '|---|---|---|']
        for marker, block in re.findall(r'<!-- STATUS:([a-z0-9-]+) -->(.*?)(?=<!-- STATUS:|\n## Catatan keamanan)', status, re.S):
            content = re.search(r'^\d+\. (.+)$', block, re.M).group(1)
            opening = content.split('. ', 1)[0] + '.'
            rows.append(f'| `STATUS:{marker}` | [artikel/status-layanan.md — {marker}](artikel/status-layanan.md#{marker}) | {opening} |')
        table = '<!-- STATUS-TABLE:begin -->\n' + '\n'.join(rows) + '\n<!-- STATUS-TABLE:end -->'
        readme.write_text(re.sub(r'<!-- STATUS-TABLE:begin -->.*?<!-- STATUS-TABLE:end -->',
                               lambda _: table, readme.read_text(encoding='utf-8'), flags=re.S),
                          encoding='utf-8', newline='\n')
    print(f"Indeks {len(index)} artikel; {len(evidence)} langkah; {len(sources)} komponen. Artikel tidak ditulis ulang.")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--acuan', help='Commit sumber yang sudah dibaca; bawaan mempertahankan commit manifest.')
    build(parser.parse_args().acuan)
