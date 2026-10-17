"""Periksa naskah terbit G7b: istilah, indeks/tautan, label UI, dan rujukan langkah."""
from pathlib import Path
from collections import Counter
import hashlib
import io
import json
import re
import subprocess
import unicodedata

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]
# Istilah implementasi tidak menjadi bagian panduan staf, termasuk halaman status.
FORBIDDEN = re.compile(
    r"\b(?:SMTP|offsite|VPS|RLS|GoTrue|aal2|PGlite|Supabase|PostgREST|JWT|RPC|"
    r"backend|frontend|sessionStorage|localStorage|placeholder|updater|"
    r"deployment|deploy|worktree|commit|repo|repository|rasterisasi|"
    r"server|snapshot|harness)\b|edge[ -]functions?|"
    r"(?:apps|supabase|packages|infra|docs)/|"
    r"\b[\w-]+\.(?:jsx|tsx|js|ts|py|sql|mjs|toml)\b|kode sumber",
    re.I)
TEMPORARY = re.compile(
    r"(?:MFA|2FA).*(?:belum tersedia|\bNonaktif\b)|"
    r"(?:email|cadangan|backup|pembaruan otomatis).*(?:belum aktif|belum tersedia|belum dijamin)|"
    r"(?:kunci publik|alamat tetap|formulir saat ini hanya)", re.I)


def load(name):
    return json.loads((OUT / name).read_text(encoding='utf-8'))


def dump(name, data):
    (OUT / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')


def steps(text):
    body = text.split('## Langkah\n', 1)[1].split('\n## ', 1)[0]
    return [(int(n), value) for n, value in re.findall(r'^(\d+)\. (.+)$', body, re.M)]


def anchors(text):
    result = set(re.findall(r'<a id="([^"]+)"', text))
    for title in re.findall(r'^#{1,6} (.+)$', text, re.M):
        title = title.lower().replace(' ', '-')
        result.add(''.join(c for c in title if unicodedata.category(c)[0] in 'LN' or c in '_-'))
    return result


def validate():
    index, manifest = load('indeks.json'), load('sumber-langkah.json')
    assert isinstance(index, list) and len(index) == 26
    slugs = [a['slug'] for a in index]
    assert len(set(slugs)) == len(slugs)
    assert 'status-layanan' in slugs
    assert set(slugs) == {p.stem for p in (OUT / 'artikel').glob('*.md')}
    articles = {s: (OUT / 'artikel' / (s + '.md')).read_text(encoding='utf-8') for s in slugs}
    roles = Counter()
    hits = []
    for slug, text in articles.items():
        hits.extend({'slug': slug, 'istilah': m.group(0)} for m in FORBIDDEN.finditer(text))
        assert '[^langkah-' not in text and 'Rujukan langkah untuk peninjau' not in text
        assert '\ufffd' not in text
        if slug != 'status-layanan':
            assert not TEMPORARY.search(text), (slug, 'Status sementara di luar halaman status')
    assert not hits, hits
    assert not FORBIDDEN.search((OUT / 'glosarium.md').read_text(encoding='utf-8'))
    records = {(x['slug'], x['langkah']): x for x in manifest['langkah']}
    assert len(records) == len(manifest['langkah'])
    used, total_steps, ref_count = set(), 0, 0
    for a in index:
        assert set(a) == {'slug', 'judul', 'peran', 'kata_kunci'}
        assert re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', a['slug'])
        assert a['peran'] and set(a['peran']) <= {'admin', 'dokter', 'resepsionis'}
        assert len(a['peran']) == len(set(a['peran']))
        assert a['kata_kunci'] and all(isinstance(k, str) and k.strip() for k in a['kata_kunci'])
        roles.update(a['peran'])
        text = articles[a['slug']]
        assert text.startswith('# ' + a['judul'] + '\n')
        assert text.count('\n# ') == 0
        for required in ['**Untuk siapa:**', '## Langkah', '## Catatan keamanan', '## Artikel terkait']:
            assert required in text, (a['slug'], required)
        for role in a['peran']:
            assert role in text.split('**Untuk siapa:**', 1)[1].split('\n', 1)[0]
        numbered = steps(text)
        assert len(numbered) >= 3
        assert [n for n, _ in numbered] == list(range(1, len(numbered) + 1))
        for n, content in numbered:
            record = records.pop((a['slug'], n))
            assert record['teks'] == content, (a['slug'], n)
            assert record['rujukan']
            assert any(r['berkas'].startswith('apps/clinic/src/components/') for r in record['rujukan'])
            for r in record['rujukan']:
                used.add(r['berkas'])
                lines = (ROOT / r['berkas']).read_text(encoding='utf-8').splitlines()
                assert r['penanda'] in lines[r['baris'] - 1], (a['slug'], n, r)
                ref_count += 1
            total_steps += 1
        related = text.split('## Artikel terkait\n', 1)[1]
        targets = re.findall(r'\]\(([^)]+)\)', related)
        assert len(targets) >= 2
        assert all(Path(t.split('#')[0]).stem in slugs and Path(t.split('#')[0]).stem != a['slug'] for t in targets)
    assert not records
    assert used == set(manifest['sha256_sumber'])
    hashes = dict(manifest['sha256_sumber'])
    for item in manifest['konteks']:
        lines = (ROOT / item['berkas']).read_text(encoding='utf-8').splitlines()
        assert item['penanda'] in lines[item['baris'] - 1]
        hashes[item['berkas']] = item['sha256']
    objects = subprocess.check_output(['git', 'cat-file', '--batch'], cwd=ROOT,
        input=''.join(manifest['commit_sumber'] + ':' + p + '\n' for p in hashes).encode('utf-8'))
    stream = io.BytesIO(objects)
    for path, expected in hashes.items():
        raw = (ROOT / path).read_bytes()
        assert hashlib.sha256(raw).hexdigest() == expected, path
        header = stream.readline().decode('ascii').split()
        assert len(header) == 3 and header[1] == 'blob'
        original = stream.read(int(header[2]))
        assert stream.read(1) == b'\n'
        assert original.decode('utf-8').splitlines() == raw.decode('utf-8').splitlines(), path
    assert stream.read() == b''
    # Setiap label tebal diperiksa; hanya label dinamis yang dibuktikan boleh dirakit.
    components = {p.relative_to(ROOT).as_posix(): p.read_text(encoding='utf-8')
                  for p in sorted((ROOT / 'apps/clinic/src/components').rglob('*.jsx'))}
    label_proof, counts, groups = [], Counter(), 0
    for slug, text in articles.items():
        for whole in re.findall(r'\*\*([^*\n]+)\*\*', text):
            if whole == 'Untuk siapa:':
                continue
            groups += 1
            for label in re.split(r'\s+→\s+', whole):
                found = next(((p, src) for p, src in components.items() if label in src), None)
                if found:
                    path, src = found
                    line = next(i for i, s in enumerate(src.splitlines(), 1) if label in s)
                    result = {'jenis': 'literal', 'sumber': [{'berkas': path, 'baris': line, 'penanda': label}]}
                elif label == 'Dentiva … tersedia':
                    path = 'apps/clinic/src/components/common/DesktopUpdater.jsx'
                    anchor = 'Dentiva {update.version} tersedia'
                    assert anchor in components[path]
                    line = next(i for i, s in enumerate(components[path].splitlines(), 1) if anchor in s)
                    result = {'jenis': 'dinamis', 'sumber': [{'berkas': path, 'baris': line, 'penanda': anchor}]}
                elif label in ['Lihat di Pengeluaran', 'Lihat di Master Treatment', 'Lihat di Biaya & Modal']:
                    path = 'apps/clinic/src/components/ai/AgentActions.jsx'
                    parts = ['Lihat di {link.label}', "label: '" + label.removeprefix('Lihat di ') + "'"]
                    refs = []
                    for anchor in parts:
                        assert anchor in components[path]
                        line = next(i for i, s in enumerate(components[path].splitlines(), 1) if anchor in s)
                        refs.append({'berkas': path, 'baris': line, 'penanda': anchor})
                    result = {'jenis': 'dinamis', 'sumber': refs}
                else:
                    result = {'jenis': 'tidak_ditemukan', 'sumber': []}
                counts[result['jenis']] += 1
                label_proof.append({'slug': slug, 'label_tebal': whole, 'segmen': label, **result})
    dump('bukti-label.json', {'commit_sumber': manifest['commit_sumber'], 'kelompok_tebal': groups,
        'segmen_label': sum(counts.values()), 'ringkasan': dict(counts), 'bukti': label_proof})
    assert not counts['tidak_ditemukan'], [x for x in label_proof if x['jenis'] == 'tidak_ditemukan']
    link_count, article_links = 0, 0
    for p in OUT.rglob('*.md'):
        text = p.read_text(encoding='utf-8')
        for target in re.findall(r'(?<!!)\[[^\]\n]+\]\(([^)]+)\)', text):
            if re.match(r'\w+://|mailto:', target):
                continue
            local, _, fragment = target.partition('#')
            dest = (p.parent / local) if local else p
            assert dest.is_file(), (p.name, target)
            if fragment:
                assert fragment in anchors(dest.read_text(encoding='utf-8')), (p.name, target)
            link_count += 1
            if p.parent == OUT / 'artikel':
                article_links += 1
    status = articles['status-layanan']
    markers = re.findall(r'<!-- STATUS:([a-z0-9-]+) -->', status)
    assert len(markers) == len(set(markers)) == 8
    assert set(markers) <= anchors(status)
    readme = (OUT / 'README.md').read_text(encoding='utf-8')
    assert '## Saat fitur aktif, ubah ini' in readme
    assert all('`STATUS:' + m + '`' in readme for m in markers)
    assert (ROOT / 'docs/tim/serah-terima/G7b.md').exists()
    report = {'status': 'lulus', 'commit_sumber': manifest['commit_sumber'],
        'artikel': len(index), 'artikel_lama_diubah': 25, 'artikel_baru': 1,
        'istilah_terlarang': {'seluruh_artikel_termasuk_status': len(hits), 'temuan': hits},
        'indeks_terurai': True, 'status_layanan_terindeks': True,
        'tautan_lokal_valid': link_count, 'tautan_dalam_artikel_valid': article_links, 'tautan_rusak': 0,
        'label': {'kelompok_tebal': groups, 'segmen_diperiksa': sum(counts.values()),
                  'literal': counts['literal'], 'dinamis_terbukti': counts['dinamis'], 'tidak_ditemukan': 0},
        'langkah': total_steps, 'rujukan_langkah': ref_count, 'komponen_berhash': len(used),
        'penanda_status': markers, 'artikel_per_peran': dict(sorted(roles.items())),
        'batasan': ['Validasi terhadap kode; bukan uji klik atau kesiapan layanan produksi.',
                    'Label literal diperiksa sebagai teks persis di komponen; label dinamis memiliki bukti perakitan.',
                    'Lint/typecheck/test/build aplikasi tidak dijalankan untuk revisi dokumentasi ini.']}
    dump('validasi.json', report)
    print(json.dumps(report, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    validate()
