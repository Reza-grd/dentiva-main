import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { analisisKolom, bacaBerkas, kelamin, nomorWa, olahBaris, potong, ringkasPerbaikan, tanggal, tebakPeta, urutkanSiap } from "@/modules/clinics/migrasi/bacaBerkas";
import { bersihkanNama, infoNik, jaroWinkler, tebakFormatTanggal } from "@/modules/clinics/migrasi/cerdas";

function berkasExcel(baris: unknown[][]): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(baris), "Pasien");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

describe("migrasi: baca berkas Excel klinik", () => {
  it("tebak kolom dari judul umum, termasuk No. RM lama", () => {
    expect(tebakPeta(["No. RM", "Nama Pasien", "Tgl Lahir", "L/P", "No HP", "Alamat", "Catatan"])).toEqual({
      no_rm_lama: 0, nama_lengkap: 1, tanggal_lahir: 2, jenis_kelamin: 3, no_wa: 4, alamat: 5,
    });
  });

  it("normalisasi tanggal, kelamin, nomor WA", () => {
    expect(tanggal("17/05/1990")).toBe("1990-05-17");
    expect(tanggal("1990-5-7")).toBe("1990-05-07");
    expect(tanggal("31/02/1990")).toBe("INVALID");
    expect(tanggal(32995)).toBe("1990-05-02"); // nomor seri Excel
    expect(kelamin("P")).toBe("Perempuan");
    expect(kelamin("pria")).toBe("Laki-laki");
    expect(kelamin("x")).toBe("INVALID");
    expect(nomorWa("+62 812-3456-7890")).toBe("081234567890");
    expect(nomorWa("812 345 678")).toBe("0812345678");
    expect(nomorWa("")).toBeNull();
  });

  it("berkas sungguhan: baris kosong dibuang, nomor baris Excel dipertahankan, galat & duplikat ditandai", async () => {
    const b = await bacaBerkas(berkasExcel([
      ["No RM", "Nama", "Tanggal Lahir", "JK", "NIK", "Gol Darah"],
      ["A-1", "Budi Santoso", "17/05/1990", "L", "3201 2345 6789 0001", "o+"],
      ["", "", "", "", "", ""],
      ["A-2", "S", "", "P", "", ""],
      ["A-3", "Ani", "31/02/2000", "X", "123", ""],
      ["A-1", "Budi Lagi", "", "", "", ""],
      ["", "Citra", "2999-01-01", "", "", ""],
      ["", "Dewi", "", "", "", ""],
    ]));
    expect(b.nomor).toEqual([2, 4, 5, 6, 7, 8]);
    const h = olahBaris(b, tebakPeta(b.judul));
    expect(h[0]).toMatchObject({
      baris: 2,
      galat: [],
      data: { nama_lengkap: "Budi Santoso", tanggal_lahir: "1990-05-17", jenis_kelamin: "Laki-laki", nik: "3201234567890001", golongan_darah: "O", no_rm_lama: "A-1" },
    });
    expect(h[1].galat).toEqual(["Nama Lengkap: Nama kosong"]);
    expect(h[2].galat).toEqual(expect.arrayContaining([expect.stringMatching(/Tanggal lahir tidak dikenali/), "Jenis kelamin harus L/P", "NIK: NIK harus 16 digit"]));
    expect(h[3].galat).toEqual(["Duplikat dengan baris 2 di berkas ini"]);
    expect(h[4].galat).toEqual(["Tanggal Lahir: Tanggal lahir di masa depan"]);
    expect(h[5]).toMatchObject({ baris: 8, galat: [], data: { nama_lengkap: "Dewi", no_rm_lama: null, tanggal_lahir: null } });
  });

  it("potong array menjadi potongan kiriman", () => {
    expect(potong([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});


const HARI = new Date(2026, 10, 23);

describe("migrasi: mesin cerdas", () => {
  it("nama: sapaan dibuang & jadi petunjuk kelamin, HURUF BESAR dirapikan", () => {
    expect(bersihkanNama("TN. BUDI SANTOSO")).toMatchObject({ nama: "Budi Santoso", kelaminSapaan: "Laki-laki", sapaanDibuang: true });
    expect(bersihkanNama("siti aminah, ny")).toMatchObject({ nama: "Siti Aminah", kelaminSapaan: "Perempuan" });
    expect(bersihkanNama("An. Rizky")).toMatchObject({ nama: "Rizky", kelaminSapaan: null, sapaanDibuang: true });
    expect(bersihkanNama("Dewi O'Neil-Putri")).toMatchObject({ nama: "Dewi O'Neil-Putri", dirapikan: false });
    expect(bersihkanNama("ANTON").nama).toBe("Anton"); // nama satu kata tidak dianggap sapaan
  });

  it("NIK → tanggal lahir & kelamin (perempuan: tanggal + 40)", () => {
    expect(infoNik("3201011705900001", HARI)).toEqual({ tanggal: "1990-05-17", kelamin: "Laki-laki" });
    expect(infoNik("3201015702050002", HARI)).toEqual({ tanggal: "2005-02-17", kelamin: "Perempuan" });
    expect(infoNik("3201019913900001", HARI)).toBeNull();
  });

  it("format tanggal: nama bulan, tahun 2 digit, bulan/hari terdeteksi dari isi kolom", () => {
    expect(tanggal("17 Mei 1990", "dmy", HARI)).toBe("1990-05-17");
    expect(tanggal("5-Agu-85", "dmy", HARI)).toBe("1985-08-05");
    expect(tanggal("17/05/90", "dmy", HARI)).toBe("1990-05-17");
    expect(tanggal("03/04/2001", "mdy", HARI)).toBe("2001-03-04");
    expect(tebakFormatTanggal(["03/04/2001", "12/25/1999"])).toBe("mdy");
    expect(tebakFormatTanggal(["25/12/1999", "03/04/2001"])).toBe("dmy");
  });

  it("kemiripan nama (Jaro-Winkler)", () => {
    expect(jaroWinkler("budi santoso", "budy santoso")).toBeGreaterThan(0.9);
    expect(jaroWinkler("budi santoso", "siti aminah")).toBeLessThan(0.7);
  });

  it("kolom dikenali dari ISI walau judulnya tidak jelas", () => {
    const isi = [
      ["0012", "TN. BUDI SANTOSO", "3201011705900001", "0812-3456-7890", "Jl. Merdeka No. 1 RT 01", "L"],
      ["0002", "NY. SITI AMINAH", "3201015702850002", "+62 857 1111 2222", "Gg. Mawar 5, Kec. Coblong", "P"],
      ["0103", "An. Rizky Pratama", "", "085733334444", "Perum Griya Asri Blok C2", "L"],
      ["0004", "Dewi Lestari", "", "", "Jl. Sudirman 10", "P"],
    ];
    const a = analisisKolom(["Kolom1", "Kolom2", "Kolom3", "Kolom4", "Kolom5", "Kolom6"], isi);
    expect(a.peta).toMatchObject({ no_rm_lama: 0, nama_lengkap: 1, nik: 2, no_wa: 3, alamat: 4, jenis_kelamin: 5 });
    expect(a.keyakinan.nik?.sumber).toBe("isi");
  });

  it("berkas berantakan: kop di atas judul, perbaikan otomatis, duplikat mirip, urut RM lama", async () => {
    const b = await bacaBerkas(berkasExcel([
      ["DATA PASIEN KLINIK GIGI SEHAT"],
      ["Per 31 Oktober 2026"],
      [],
      ["No. MR", "Nama Pasien", "Tgl Lhr", "NIK", "Telp"],
      ["RM-10", "TN. BUDI SANTOSO", "", "3201011705900001", "62 812 3456 7890"],
      ["RM-2", "NY. SITI AMINAH", "17 Mei 1990", "", "0857.1111.2222 / 0813"],
      ["RM-3", "Budy Santoso", "17/05/1990", "", ""],
      ["RM-1", "siti aminah", "2 Jan 1985", "", "085711112222"],
    ]));
    expect(b.barisJudul).toBe(4);
    expect(b.nomor).toEqual([5, 6, 7, 8]);
    const a = analisisKolom(b.judul, b.isi);
    expect(a.peta).toMatchObject({ no_rm_lama: 0, nama_lengkap: 1, tanggal_lahir: 2, nik: 3, no_wa: 4 });
    const h = olahBaris(b, a.peta, { formatTanggal: a.formatTanggal, hariIni: HARI });
    expect(h.every((x) => x.galat.length === 0)).toBe(true);
    expect(h[0].data).toMatchObject({ nama_lengkap: "Budi Santoso", tanggal_lahir: "1990-05-17", jenis_kelamin: "Laki-laki", no_wa: "081234567890" });
    expect(h[0].perbaikan).toEqual(expect.arrayContaining(["sapaan_dibuang", "lahir_dari_nik", "kelamin_dari_sapaan", "wa_dirapikan"]));
    expect(h[1].data).toMatchObject({ nama_lengkap: "Siti Aminah", jenis_kelamin: "Perempuan", tanggal_lahir: "1990-05-17", no_wa: "085711112222" });
    expect(h[2].peringatan).toEqual(["Mungkin orang yang sama dengan baris 5 (nama hampir sama, tanggal lahir sama)"]);
    expect(h[3].peringatan).toEqual(["Mungkin orang yang sama dengan baris 6 (nama mirip, nomor WA sama)"]);
    expect(ringkasPerbaikan(h).find((p) => p.kode === "lahir_dari_nik")?.jumlah).toBe(1);
    expect(urutkanSiap(h.map((x) => x.data!)).map((d) => d.no_rm_lama)).toEqual(["RM-1", "RM-2", "RM-3", "RM-10"]);
  });

  it("judul menyesatkan dikoreksi isi; peringatan bila NIK bertentangan", () => {
    const isi = [["Budi", "P", "3201011705900001"], ["Andi", "L", "3201011805910001"]];
    const a = analisisKolom(["Nama", "JK", "NIK"], isi);
    const h = olahBaris({ judul: ["Nama", "JK", "NIK"], isi, nomor: [2, 3] }, a.peta, { hariIni: HARI });
    expect(h[0].peringatan).toEqual(["Jenis kelamin berbeda dengan yang tertera di NIK"]);
    expect(tebakPeta(["Nama", "JK", "NIK"], isi)).toEqual({ nama_lengkap: 0, jenis_kelamin: 1, nik: 2 });
  });
});
