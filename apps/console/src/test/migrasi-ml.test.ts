import { describe, expect, it } from "vitest";
import { ABAIKAN, fiturKolom, KELAS, NAMA_FITUR, pasangkanKolom, prediksi } from "@/modules/clinics/migrasi/ml";
import { MODEL_KOLOM } from "@/modules/clinics/migrasi/modelKolom";
import { buatAcak, buatBerkas, type OpsiPabrik } from "../../scripts/migrasi-ml/pabrik";
import { bacaKoreksi, ujiNyata } from "../../scripts/migrasi-ml/koreksi";
import { pemetaanKolomMigrasi } from "@dentiva/shared";
import { analisisKolom, bahanLatihPemetaan, type Berkas } from "@/modules/clinics/migrasi/bacaBerkas";

const HARI = new Date(2026, 10, 23);

function akurasi(seed: number, jumlah: number, opsi: OpsiPabrik) {
  const r = buatAcak(seed);
  let benar = 0;
  let total = 0;
  let sempurna = 0;
  for (let b = 0; b < jumlah; b++) {
    const f = buatBerkas(r, opsi);
    const peluang = f.judul.map((j, c) => prediksi(MODEL_KOLOM, fiturKolom(j, f.isi.map((x) => x[c]), HARI)));
    const tebak = new Array(f.judul.length).fill(ABAIKAN);
    for (const p of pasangkanKolom(peluang)) tebak[p.kolom] = p.kelas;
    const ok = f.label.filter((l, c) => tebak[c] === l).length;
    benar += ok;
    total += f.label.length;
    if (ok === f.label.length) sempurna++;
  }
  return { kolom: benar / total, berkas: sempurna / jumlah };
}

describe("model ML pengenal kolom migrasi", () => {
  it("bentuk model cocok dengan fitur & kelas yang dipakai", () => {
    expect(MODEL_KOLOM.fitur).toEqual(NAMA_FITUR);
    expect(MODEL_KOLOM.kelas).toEqual([...KELAS]);
    expect(MODEL_KOLOM.bobot).toHaveLength(KELAS.length);
    expect(MODEL_KOLOM.bobot.every((w) => w.length === NAMA_FITUR.length)).toBe(true);
  });

  it("penjaga mutu: ≥ 99% kolom benar pada berkas sintetis baru (judul baru & tanpa judul)", () => {
    const a = akurasi(9001, 150, { judulAkhir: true, pGenerik: 0.4 });
    expect(a.kolom).toBeGreaterThanOrEqual(0.99);
    expect(a.berkas).toBeGreaterThanOrEqual(0.95);
  }, 60_000);

  it("peluang masuk akal untuk kolom yang jelas", () => {
    const p = prediksi(MODEL_KOLOM, fiturKolom("", ["3201011705900001", "3201015702850002", "3273014101950003"], HARI));
    expect(KELAS[p.indexOf(Math.max(...p))]).toBe("nik");
    const urut = prediksi(MODEL_KOLOM, fiturKolom("No", [1, 2, 3, 4, 5, 6], HARI));
    expect(KELAS[urut.indexOf(Math.max(...urut))]).toBe("abaikan");
  });

  describe("umpan balik koreksi operator", () => {
    const berkas: Berkas = {
      judul: ["Nama Pasien", "Tgl Lhr", "Ket 2"],
      isi: [
        ["Budi Santoso", "17/05/1990", "081234567890"],
        ["Siti Aminah", "01/02/1985", "085711112222"],
        ["Rina Wati", "03/04/1995", "081398765432"],
      ],
      nomor: [2, 3, 4],
      barisJudul: 1,
    };

    it("tidak membawa isi data pasien — hanya judul, angka ciri, tebakan & pilihan akhir", () => {
      const a = analisisKolom(berkas.judul, berkas.isi, HARI);
      const akhir = { ...a.peta, no_wa: 2 };
      const bahan = bahanLatihPemetaan(berkas, a.peta, akhir, HARI);
      expect(bahan).toHaveLength(3);
      for (const b of bahan) {
        expect(pemetaanKolomMigrasi.safeParse(b).success).toBe(true);
        expect(b.fitur).toHaveLength(NAMA_FITUR.length);
      }
      const teks = JSON.stringify(bahan);
      for (const nilai of ["Budi", "Siti", "Rina", "0812", "1990", "Santoso"]) expect(teks).not.toContain(nilai);
      expect(bahan[2].final).toBe("no_wa");
      expect(bahan[0].judul).toBe("Nama Pasien");
    });

    it("judul tidak dikirim bila baris pertama ternyata data (tanpa baris judul)", () => {
      const tanpaJudul: Berkas = { ...berkas, judul: ["Budi Santoso", "17/05/1990", "081234567890"], isi: berkas.isi.slice(1) };
      const a = analisisKolom(tanpaJudul.judul, tanpaJudul.isi, HARI);
      const bahan = bahanLatihPemetaan(tanpaJudul, a.peta, a.peta, HARI);
      expect(bahan.every((b) => b.judul === null)).toBe(true);
      expect(JSON.stringify(bahan)).not.toContain("Budi");
    });

    it("ekspor koreksi dibaca: versi fitur lain & jenis asing dibuang, 20% disisihkan untuk uji", () => {
      const f = fiturKolom("No HP", ["081234567890", "085711112222"], HARI);
      const baris = Array.from({ length: 10 }, () => ({ fitur: f, final: "no_wa" }));
      const k = bacaKoreksi([...baris, { fitur: [1, 2], final: "no_wa" }, { fitur: f, final: "hobi" }]);
      expect(k.dibuang).toBe(2);
      expect(k.latih.X).toHaveLength(8);
      expect(k.uji.X).toHaveLength(2);
      expect(ujiNyata(MODEL_KOLOM, k.uji)).toBe(1);
    });
  });
});
