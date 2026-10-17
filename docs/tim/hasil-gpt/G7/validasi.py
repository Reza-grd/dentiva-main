"""Validasi editorial G7, tanpa dependency, jaringan, atau mutasi aplikasi."""
from collections import Counter
from pathlib import Path
import hashlib
import io
import json
import re
import subprocess

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]

def load(name):
    return json.loads((OUT / name).read_text(encoding='utf-8'))

def validate():
    index = load('indeks.json')
    manifest = load('sumber-langkah.json')
    assert isinstance(index, list) and len(index) == 25
    slugs = [a['slug'] for a in index]
    assert len(set(slugs)) == len(slugs)
    assert set(slugs) == {p.stem for p in (OUT / 'artikel').glob('*.md')}
    valid_roles = {'admin', 'dokter', 'resepsionis'}
    role_counts, steps, links, refs = Counter(), 0, 0, 0
    evidence = {(s['slug'], s['langkah']): s for s in manifest['langkah']}
    assert len(evidence) == len(manifest['langkah'])
    used_sources = set()
    for a in index:
        assert set(a) == {'slug', 'judul', 'peran', 'kata_kunci'}
        assert re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', a['slug'])
        assert a['judul'].strip() and a['peran'] and a['kata_kunci']
        assert set(a['peran']) <= valid_roles
        assert len(a['peran']) == len(set(a['peran']))
        assert all(isinstance(x, str) and x.strip() for x in a['kata_kunci'])
        role_counts.update(a['peran'])
        p = OUT / 'artikel' / (a['slug'] + '.md')
        text = p.read_text(encoding='utf-8')
        assert text.startswith('# ' + a['judul'] + '\n')
        assert text.count('\n# ') == 0
        for h in ['**Untuk siapa:**', '## Langkah', '## Catatan keamanan', '## Artikel terkait', '## Rujukan langkah untuk peninjau']:
            assert h in text, (p.name, h)
        for role in a['peran']:
            assert role in text.split('**Untuk siapa:**', 1)[1].split('\n', 1)[0]
        body = text.split('## Langkah\n', 1)[1].split('\n## ', 1)[0]
        numbered = re.findall(r'^(\d+)\. (.+) \[\^langkah-(\d+)\]$', body, re.M)
        assert len(numbered) >= 3
        assert len(numbered) == len(re.findall(r'^\d+\. ', body, re.M))
        assert [int(n) for n, _, _ in numbered] == list(range(1, len(numbered) + 1))
        assert len(re.findall(r'^\[\^langkah-\d+\]:', text, re.M)) == len(numbered)
        for num, content, foot in numbered:
            assert num == foot
            key = (a['slug'], int(num))
            record = evidence.pop(key)
            assert record['teks'] == content
            assert record['rujukan']
            assert any(r['berkas'].startswith('apps/clinic/src/components/') for r in record['rujukan'])
            footnote = re.search(r'^\[\^langkah-' + num + r'\]: (.+)$', text, re.M).group(1)
            for r in record['rujukan']:
                relative = r['berkas']
                used_sources.add(relative)
                lines = (ROOT / relative).read_text(encoding='utf-8').splitlines()
                assert 1 <= r['baris'] <= len(lines)
                assert r['penanda'] in lines[r['baris'] - 1], (key, r)
                assert f"`{relative}:{r['baris']}`" in footnote
                refs += 1
            steps += 1
        related = text.split('## Artikel terkait\n', 1)[1].split('\n## ', 1)[0]
        targets = re.findall(r'\]\(([^)]+)\)', related)
        assert len(targets) >= 2
        assert all(t.endswith('.md') and Path(t).stem in slugs and Path(t).stem != a['slug'] for t in targets)
    assert not evidence
    assert used_sources == set(manifest['sha256_sumber'])
    source_paths = list(manifest['sha256_sumber'])
    objects = subprocess.check_output(
        ['git', 'cat-file', '--batch'], cwd=ROOT,
        input=''.join(manifest['commit_sumber'] + ':' + p + '\n' for p in source_paths).encode('utf-8'))
    stream = io.BytesIO(objects)
    for relative, expected in manifest['sha256_sumber'].items():
        data = (ROOT / relative).read_bytes()
        assert hashlib.sha256(data).hexdigest() == expected, relative
        # Git normalisasi LF; nomor baris dan isi harus cocok dengan snapshot tercatat.
        header = stream.readline().decode('ascii').split()
        assert len(header) == 3 and header[1] == 'blob', (relative, header)
        original = stream.read(int(header[2]))
        assert stream.read(1) == b'\n'
        assert original.decode('utf-8').splitlines() == data.decode('utf-8').splitlines(), relative
    assert stream.read() == b''
    for p in OUT.rglob('*.md'):
        t = p.read_text(encoding='utf-8')
        assert '\ufffd' not in t, p
        for target in re.findall(r'(?<!!)\[[^\]\n]+\]\(([^)]+)\)', t):
            if re.match(r'\w+://|mailto:|#', target):
                continue
            local = target.split('#', 1)[0]
            assert (p.parent / local).exists(), (p.name, target)
            links += 1
    assert (OUT / 'glosarium.md').exists()
    assert (ROOT / 'docs/tim/serah-terima/G7.md').exists()
    report = {
        'status': 'lulus', 'commit_sumber': manifest['commit_sumber'],
        'artikel': len(index), 'langkah': steps, 'rujukan_langkah': refs,
        'komponen_berhash': len(used_sources), 'tautan_lokal': links,
        'artikel_per_peran': dict(sorted(role_counts.items())),
        'pemeriksaan': ['indeks JSON dan schema', 'slug unik dan artikel tepat sesuai indeks',
                        'judul, peran dan bagian wajib', '130 langkah berurutan dan catatan kaki',
                        'teks langkah sama dengan manifest', 'setiap langkah memiliki rujukan komponen',
                        'baris dan penanda sumber cocok', 'SHA-256 komponen cocok',
                        'sumber sama dengan commit tercatat', 'tautan Markdown lokal ada',
                        'UTF-8 tanpa karakter pengganti', 'glosarium dan serah-terima tersedia'],
        'batasan': ['Pembacaan kode; belum uji klik runtime, axe, atau backend produksi.',
                    'Validasi rujukan bukan pembuktian otomatis ketepatan makna.',
                    'Lint/typecheck/test/build aplikasi tidak dijalankan untuk paket dokumentasi ini.']
    }
    (OUT / 'validasi.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    validate()
