import { useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Sparkles, Undo2, Upload } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
} from "@dentiva/ui";
import {
  formatDateTime,
  formatNumber,
  type BarisPasienMigrasi,
  type MigrasiDuplikat,
  type MigrasiPasien,
} from "@dentiva/shared";
import { DataTable } from "@/components/DataTable";
import { Field, TextArea } from "@/components/Field";
import { Can, Section } from "@/components/misc";
import { ReasonDialog } from "@/components/ReasonDialog";
import { callConsole, ConsoleApiError } from "@/lib/api";
import { useConsoleMutation, useConsoleQuery } from "@/lib/query";
import { useQueryClient } from "@tanstack/react-query";
import { MODEL_KOLOM } from "./modelKolom";
import {
  bacaBerkas,
  KOLOM_MIGRASI,
  analisisKolom,
  bahanLatihPemetaan,
  olahBaris,
  potong,
  ringkasPerbaikan,
  urutkanSiap,
  type AnalisisKolom,
  type Berkas,
  type BarisHasil,
  type KunciKolom,
  type PetaKolom,
} from "./bacaBerkas";

const POTONGAN_PRATINJAU = 1000;
const POTONGAN_KIRIM = 200;
const INVALIDATE = ["migrasi.", "clinics.", "usage.", "audit."];

const STATUS_LABEL: Record<MigrasiPasien["status"], { label: string; cls: string }> = {
  berjalan: { label: "Berjalan", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  selesai: { label: "Selesai", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  dibatalkan: { label: "Dibatalkan", cls: "bg-slate-500/15 text-text-muted" },
};

/** Riwayat + tombol migrasi data pasien lama (dibantu tim Dentiva). */
export function MigrasiSection({ clinicId, clinicName }: { clinicId: string; clinicName: string }) {
  const { data, isLoading, error, refetch } = useConsoleQuery("migrasi.list", { clinicId });
  const [buka, setBuka] = useState(false);
  const [batal, setBatal] = useState<MigrasiPasien | null>(null);
  const batalkan = useConsoleMutation("migrasi.batalkan", {
    invalidate: INVALIDATE,
    successMessage: (m) => `Migrasi dibatalkan: ${m.jumlah_dibatalkan} pasien dihapus, ${m.jumlah_dipertahankan} dipertahankan`,
    onSuccess: () => setBatal(null),
  });
  const selesaikan = useConsoleMutation("migrasi.selesai", { invalidate: INVALIDATE, successMessage: "Migrasi ditutup & klinik diberi tahu" });

  return (
    <Section
      title="Migrasi data pasien"
      description="Pindahkan data pasien lama dari Excel klinik. Disimpan terenkripsi atas nama klinik; setiap migrasi bisa dibatalkan."
      actions={
        <Can action="migrasi.mulai">
          <Button size="sm" className="gap-1.5" onClick={() => setBuka(true)}>
            <Upload className="h-3.5 w-3.5" /> Migrasi data pasien
          </Button>
        </Can>
      }
    >
      <DataTable
        caption="Riwayat migrasi data pasien"
        rows={data}
        rowKey={(m) => m.id}
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        empty={{ title: "Belum ada migrasi", description: "Gunakan tombol di atas setelah klinik mengirim berkas Excel pasiennya." }}
        columns={[
          {
            key: "berkas",
            header: "Berkas",
            cell: (m) => (
              <div>
                <p className="font-medium text-text-primary">{m.nama_berkas}</p>
                <p className="text-xs text-text-muted">{formatDateTime(m.dibuat_pada)} · {m.operator_name ?? "Operator"}</p>
              </div>
            ),
          },
          {
            key: "hasil",
            header: "Hasil",
            cell: (m) => (
              <div className="text-xs">
                <p>{formatNumber(m.jumlah_masuk)} masuk · {formatNumber(m.jumlah_lewati)} dilewati</p>
                {m.status === "dibatalkan" && (
                  <p className="text-text-muted">{formatNumber(m.jumlah_dibatalkan)} dihapus · {formatNumber(m.jumlah_dipertahankan)} dipertahankan</p>
                )}
              </div>
            ),
          },
          {
            key: "status",
            header: "Status",
            cell: (m) => <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_LABEL[m.status].cls}`}>{STATUS_LABEL[m.status].label}</span>,
          },
          {
            key: "aksi",
            header: <span className="sr-only">Aksi</span>,
            align: "right",
            cell: (m) => (
              <div className="flex justify-end gap-1">
                {m.status === "berjalan" && (
                  <Can action="migrasi.selesai">
                    <Button variant="ghost" size="sm" isLoading={selesaikan.isPending} onClick={() => selesaikan.mutate({ migrasiId: m.id })}>
                      Selesaikan
                    </Button>
                  </Can>
                )}
                {m.status !== "dibatalkan" && (
                  <Can action="migrasi.batalkan">
                    <Button variant="ghost" size="sm" className="gap-1" onClick={() => setBatal(m)}>
                      <Undo2 className="h-3.5 w-3.5" /> Batalkan
                    </Button>
                  </Can>
                )}
              </div>
            ),
          },
        ]}
      />

      {buka && <MigrasiDialog clinicId={clinicId} clinicName={clinicName} onClose={() => setBuka(false)} />}

      <ReasonDialog
        open={Boolean(batal)}
        onOpenChange={(o) => !o && setBatal(null)}
        title={`Batalkan migrasi "${batal?.nama_berkas ?? ""}"?`}
        description="Pasien hasil migrasi ini yang belum dipakai klinik (tanpa kunjungan, pembayaran, rencana perawatan, persetujuan, riwayat medis, dan belum diubah) akan dihapus. Pasien yang sudah dipakai dipertahankan. Klinik akan diberi tahu."
        confirmLabel="Batalkan migrasi"
        isPending={batalkan.isPending}
        onConfirm={(reason) => batal && batalkan.mutate({ migrasiId: batal.id, reason })}
      />
    </Section>
  );
}

type Tahap = "pilih" | "petakan" | "periksa" | "impor" | "hasil";

interface Ringkas {
  hasil: BarisHasil[];
  duplikat: MigrasiDuplikat[];
  kuota: { maks: number; terpakai: number };
}

interface Kemajuan {
  migrasiId?: string;
  terkirim: number;
  total: number;
  masuk: number;
  lewati: { baris: number; alasan: string; no_rm: string | null }[];
  galat?: string;
  potonganBerikut: number;
}

function pesanGalat(e: unknown): string {
  if (e instanceof ConsoleApiError) return e.message + (e.requestId ? ` (ref: ${e.requestId.slice(0, 8)})` : "");
  return e instanceof Error ? e.message : String(e);
}

function MigrasiDialog({ clinicId, clinicName, onClose }: { clinicId: string; clinicName: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [tahap, setTahap] = useState<Tahap>("pilih");
  const [namaBerkas, setNamaBerkas] = useState("");
  const [berkas, setBerkas] = useState<Berkas | null>(null);
  const [peta, setPeta] = useState<PetaKolom>({});
  const [analisis, setAnalisis] = useState<AnalisisKolom | null>(null);
  const [ringkas, setRingkas] = useState<Ringkas | null>(null);
  const [dasar, setDasar] = useState("");
  const [setuju, setSetuju] = useState(false);
  const [sibuk, setSibuk] = useState("");
  const [galat, setGalat] = useState("");
  const [kemajuan, setKemajuan] = useState<Kemajuan | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pilih = async (f: File | undefined) => {
    if (!f) return;
    setGalat("");
    setSibuk("Membaca berkas…");
    try {
      const b = await bacaBerkas(f);
      if (b.isi.length === 0) throw new Error("Berkas tidak berisi data (baris pertama harus judul kolom).");
      setBerkas(b);
      const a = analisisKolom(b.judul, b.isi);
      setAnalisis(a);
      setPeta(a.peta);
      setNamaBerkas(f.name.slice(0, 200));
      setTahap("petakan");
    } catch (e) {
      setGalat(`Berkas tidak bisa dibaca: ${pesanGalat(e)}`);
    } finally {
      setSibuk("");
    }
  };

  const periksa = async () => {
    if (!berkas) return;
    setGalat("");
    setSibuk("Memeriksa data & duplikat…");
    try {
      const hasil = olahBaris(berkas, peta, { formatTanggal: peta.tanggal_lahir === analisis?.peta.tanggal_lahir ? analisis?.formatTanggal : undefined });
      const valid = hasil.flatMap((h) => (h.data ? [h.data] : []));
      const duplikat: MigrasiDuplikat[] = [];
      let kuota = { maks: 0, terpakai: 0 };
      for (const bagian of potong(valid, POTONGAN_PRATINJAU)) {
        const r = await callConsole("migrasi.pratinjau", { clinicId, rows: bagian });
        duplikat.push(...r.duplikat);
        kuota = r.kuota;
      }
      setRingkas({ hasil, duplikat, kuota });
      setTahap("periksa");
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setSibuk("");
    }
  };

  const siap = useMemo<BarisPasienMigrasi[]>(() => {
    if (!ringkas) return [];
    const lewat = new Set(ringkas.duplikat.filter((d) => d.pasti).map((d) => d.baris));
    // diurutkan menurut No. RM lama → nomor RM Dentiva baru mengikuti urutan lama
    return urutkanSiap(ringkas.hasil.flatMap((h) => (h.data && !lewat.has(h.baris) ? [h.data] : [])));
  }, [ringkas]);

  const jalankan = async (awal?: Kemajuan) => {
    const bagian = potong(siap, POTONGAN_KIRIM);
    let k: Kemajuan = awal ?? { terkirim: 0, total: siap.length, masuk: 0, lewati: [], potonganBerikut: 0 };
    setTahap("impor");
    try {
      if (!k.migrasiId) {
        const pemetaan = berkas && analisis ? bahanLatihPemetaan(berkas, analisis.peta, peta) : undefined;
        const m = await callConsole("migrasi.mulai", {
          clinicId,
          namaBerkas,
          dasarPersetujuan: dasar.trim(),
          totalBaris: siap.length,
          versiModel: MODEL_KOLOM.versi,
          pemetaan,
        });
        k = { ...k, migrasiId: m.id };
      }
      for (let i = k.potonganBerikut; i < bagian.length; i++) {
        setKemajuan({ ...k, galat: undefined });
        const r = await callConsole("migrasi.kirim", { migrasiId: k.migrasiId!, rows: bagian[i] });
        k = { ...k, terkirim: k.terkirim + bagian[i].length, masuk: k.masuk + r.masuk, lewati: [...k.lewati, ...r.lewati], potonganBerikut: i + 1 };
      }
      setKemajuan({ ...k, galat: undefined });
      await callConsole("migrasi.selesai", { migrasiId: k.migrasiId! });
      setTahap("hasil");
    } catch (e) {
      setKemajuan({ ...k, galat: pesanGalat(e) });
    } finally {
      void qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && INVALIDATE.some((p) => (q.queryKey[0] as string).startsWith(p)) });
    }
  };

  const tutup = () => {
    if (tahap === "impor" && kemajuan && !kemajuan.galat) return; // jangan tutup saat mengirim
    onClose();
  };

  const unduhLaporan = async () => {
    if (!ringkas) return;
    const XLSX = await import("xlsx");
    const baris: (string | number)[][] = [["Baris di Excel", "Status", "Keterangan", "No. RM Dentiva yang cocok"]];
    ringkas.hasil.filter((h) => h.galat.length).forEach((h) => baris.push([h.baris, "Tidak valid", h.galat.join("; "), ""]));
    ringkas.hasil.filter((h) => h.peringatan.length).forEach((h) => baris.push([h.baris, "Masuk — periksa manual", h.peringatan.join("; "), ""]));
    ringkas.duplikat.forEach((d) => baris.push([d.baris, d.pasti ? "Dilewati (duplikat)" : "Masuk — periksa manual", d.alasan, d.no_rm ?? ""]));
    kemajuan?.lewati.forEach((l) => {
      if (!ringkas.duplikat.some((d) => d.baris === l.baris)) baris.push([l.baris, "Dilewati saat impor", l.alasan, l.no_rm ?? ""]);
    });
    baris.splice(1, baris.length - 1, ...baris.slice(1).sort((a, b) => Number(a[0]) - Number(b[0])));
    const ws = XLSX.utils.aoa_to_sheet(baris);
    ws["!cols"] = [{ wch: 14 }, { wch: 24 }, { wch: 60 }, { wch: 22 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan");
    XLSX.writeFile(wb, `Laporan_Migrasi_${clinicName.replace(/[^A-Za-z0-9]+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const galatBaris = ringkas?.hasil.filter((h) => h.galat.length) ?? [];
  const pasti = ringkas?.duplikat.filter((d) => d.pasti) ?? [];
  const lewatPasti = new Set(pasti.map((d) => d.baris));
  const peringatan = [
    ...(ringkas?.duplikat.filter((d) => !d.pasti).map((d) => ({ baris: d.baris, teks: `${d.alasan} (${d.no_rm})` })) ?? []),
    ...(ringkas?.hasil.filter((h) => h.data && h.peringatan.length && !lewatPasti.has(h.baris)).map((h) => ({ baris: h.baris, teks: h.peringatan.join("; ") })) ?? []),
  ].sort((a, b) => a.baris - b.baris);
  const perbaikan = ringkas ? ringkasPerbaikan(ringkas.hasil) : [];
  const sisaKuota = ringkas ? ringkas.kuota.maks - ringkas.kuota.terpakai : 0;
  const kuotaCukup = siap.length <= sisaKuota;
  const namaTerpetakan = peta.nama_lengkap !== undefined;

  return (
    <Dialog open onOpenChange={(o) => !o && tutup()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-accent-primary" /> Migrasi data pasien · {clinicName}
          </DialogTitle>
          <DialogDescription>
            Langkah {["pilih", "petakan", "periksa", "impor", "hasil"].indexOf(tahap) + 1} dari 5 ·{" "}
            {{ pilih: "Pilih berkas", petakan: "Cocokkan kolom", periksa: "Periksa & setujui", impor: "Memasukkan data", hasil: "Selesai" }[tahap]}
          </DialogDescription>
        </DialogHeader>

        {tahap === "pilih" && (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              Pilih berkas Excel (.xlsx/.xls) atau CSV dari klinik. Baris pertama harus berisi judul kolom. Nomor RM lama akan disimpan;
              Dentiva tetap membuat nomor RM baru secara otomatis.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => void pilih(e.target.files?.[0])}
              aria-label="Berkas Excel pasien"
            />
            <Button className="gap-2" onClick={() => inputRef.current?.click()} isLoading={Boolean(sibuk)}>
              <Upload className="h-4 w-4" /> Pilih berkas
            </Button>
          </div>
        )}

        {tahap === "petakan" && berkas && (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              <strong className="text-text-primary">{namaBerkas}</strong> · {formatNumber(berkas.isi.length)} baris data. Periksa pasangan kolom di
              bawah — sudah dikenali otomatis dari judul <em>dan isi</em> tiap kolom.
              {berkas.barisJudul && berkas.barisJudul > 1 && <> Judul kolom ditemukan di baris {berkas.barisJudul} (baris di atasnya diabaikan).</>}
              {analisis?.formatTanggal === "mdy" && <> Tanggal terbaca berformat bulan/hari/tahun.</>}
              <> Pasangan kolom yang Anda pilih (tanpa isi data pasien) disimpan untuk melatih mesin agar makin tepat.</>
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {KOLOM_MIGRASI.map((k) => (
                <div key={k.key}>
                <Select
                  label={k.label}
                  required={k.wajib}
                  value={peta[k.key] === undefined ? "" : String(peta[k.key])}
                  onChange={(e) =>
                    setPeta((p) => {
                      const baru = { ...p };
                      if (e.target.value === "") delete baru[k.key as KunciKolom];
                      else baru[k.key as KunciKolom] = Number(e.target.value);
                      return baru;
                    })
                  }
                >
                  <option value="">— tidak dipakai —</option>
                  {berkas.judul.map((j, i) => (
                    <option key={i} value={i}>
                      {j || `(Kolom ${i + 1} tanpa judul)`}
                    </option>
                  ))}
                </Select>
                  <TandaKeyakinan k={analisis?.keyakinan[k.key]} sama={peta[k.key] !== undefined && peta[k.key] === analisis?.peta[k.key]} contoh={peta[k.key] === undefined ? undefined : contohNilai(berkas, peta[k.key]!)} />
                </div>
              ))}
            </div>
            {!namaTerpetakan && <p className="text-sm text-[var(--color-danger)]">Kolom Nama Lengkap wajib dipasangkan.</p>}
          </div>
        )}

        {tahap === "periksa" && ringkas && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Angka label="Baris di berkas" nilai={ringkas.hasil.length} />
              <Angka label="Siap dimasukkan" nilai={siap.length} tegas />
              <Angka label="Dilewati (sudah ada)" nilai={pasti.length} />
              <Angka label="Tidak valid" nilai={galatBaris.length} />
            </div>
            {siap.length > 0 && <p className={`text-sm ${kuotaCukup ? "text-text-muted" : "text-[var(--color-danger)]"}`}>
              Kuota paket: {formatNumber(ringkas.kuota.terpakai)} dari {formatNumber(ringkas.kuota.maks)} pasien terpakai · sisa{" "}
              {formatNumber(Math.max(sisaKuota, 0))}.{!kuotaCukup && " Kuota tidak cukup — naikkan paket klinik dulu atau pecah berkas."}
            </p>}

            {perbaikan.length > 0 && (
              <div className="rounded-lg border border-accent-primary/30 bg-accent-primary/5 px-3 py-2 text-sm">
                <p className="flex items-center gap-1.5 font-medium text-text-primary">
                  <Sparkles className="h-4 w-4 text-accent-primary" /> Diperbaiki otomatis
                </p>
                <ul className="mt-1 space-y-0.5 text-xs text-text-muted">
                  {perbaikan.map((p) => (
                    <li key={p.kode}>{p.label}: {formatNumber(p.jumlah)} baris</li>
                  ))}
                </ul>
              </div>
            )}
            {siap.some((r) => r.no_rm_lama) && (
              <p className="text-xs text-text-muted">Pasien dimasukkan berurutan menurut No. RM lama, sehingga nomor RM Dentiva yang baru mengikuti urutan lama.</p>
            )}
            {galatBaris.length > 0 && (
              <Daftar judul={`Tidak valid (${galatBaris.length}) — tidak dimasukkan`} item={galatBaris.map((h) => `Baris ${h.baris}: ${h.galat.join("; ")}`)} />
            )}
            {pasti.length > 0 && (
              <Daftar judul={`Sudah ada di klinik (${pasti.length}) — dilewati`} item={pasti.map((d) => `Baris ${d.baris}: ${d.alasan} (${d.no_rm})`)} />
            )}
            {peringatan.length > 0 && (
              <Daftar
                judul={`Perlu diperiksa klinik (${peringatan.length}) — tetap dimasukkan`}
                item={peringatan.map((d) => `Baris ${d.baris}: ${d.teks}`)}
              />
            )}

            <Field label="Dasar persetujuan klinik" htmlFor="dasar-migrasi" required hint="Contoh: Permintaan tertulis drg. Rina (pemilik) via WA 23 Nov 2026. Tercatat di audit.">
              <TextArea id="dasar-migrasi" value={dasar} onChange={(e) => setDasar(e.target.value)} maxLength={500} className="min-h-[64px]" />
            </Field>
            <label className="flex items-start gap-2 text-sm text-text-primary">
              <input type="checkbox" className="mt-1" checked={setuju} onChange={(e) => setSetuju(e.target.checked)} />
              <span>
                Klinik telah meminta dan menyetujui pemindahan data ini. Berkas asli akan saya hapus dari perangkat setelah selesai.
              </span>
            </label>
          </div>
        )}

        {(tahap === "impor" || tahap === "hasil") && kemajuan && (
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span>{tahap === "hasil" ? "Selesai" : kemajuan.galat ? "Terhenti" : "Mengirim data terenkripsi…"}</span>
                <span>
                  {formatNumber(kemajuan.terkirim)} / {formatNumber(kemajuan.total)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-border" role="progressbar" aria-valuemin={0} aria-valuemax={kemajuan.total} aria-valuenow={kemajuan.terkirim}>
                <div className="h-full bg-accent-primary transition-all" style={{ width: `${kemajuan.total ? (kemajuan.terkirim / kemajuan.total) * 100 : 100}%` }} />
              </div>
            </div>
            {kemajuan.galat && (
              <div role="alert" className="rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm">
                <p className="flex items-center gap-1.5 font-medium"><AlertTriangle className="h-4 w-4" /> Pengiriman terhenti</p>
                <p className="mt-1 text-text-muted">{kemajuan.galat}</p>
                <p className="mt-1 text-text-muted">
                  Data yang sudah masuk aman. Lanjutkan untuk mengirim sisanya, atau tutup — migrasi bisa diselesaikan/dibatalkan dari riwayat.
                </p>
              </div>
            )}
            {tahap === "hasil" && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
                <p className="flex items-center gap-1.5 font-medium text-text-primary">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> {formatNumber(kemajuan.masuk)} pasien dimasukkan
                  {kemajuan.lewati.length > 0 && `, ${formatNumber(kemajuan.lewati.length)} dilewati saat impor`}
                </p>
                <p className="mt-1 text-text-muted">Klinik sudah menerima notifikasi untuk memeriksa daftar pasien.</p>
              </div>
            )}
          </div>
        )}

        {galat && <p className="text-sm text-[var(--color-danger)]" role="alert">{galat}</p>}
        {sibuk && <p className="text-sm text-text-muted" aria-live="polite">{sibuk}</p>}

        <DialogFooter>
          {tahap === "petakan" && (
            <>
              <Button variant="outline" onClick={() => setTahap("pilih")}>Kembali</Button>
              <Button onClick={() => void periksa()} disabled={!namaTerpetakan} isLoading={Boolean(sibuk)}>Periksa data</Button>
            </>
          )}
          {tahap === "periksa" && (
            <>
              <Button variant="outline" className="gap-1.5" onClick={() => void unduhLaporan()}>
                <Download className="h-4 w-4" /> Laporan baris bermasalah
              </Button>
              <Button variant="outline" onClick={() => setTahap("petakan")}>Kembali</Button>
              <Button onClick={() => void jalankan()} disabled={!setuju || dasar.trim().length < 5 || siap.length === 0 || !kuotaCukup}>
                Masukkan {formatNumber(siap.length)} pasien
              </Button>
            </>
          )}
          {tahap === "impor" && kemajuan?.galat && (
            <>
              <Button variant="outline" onClick={onClose}>Tutup</Button>
              <Button onClick={() => void jalankan(kemajuan)}>Lanjutkan</Button>
            </>
          )}
          {tahap === "hasil" && (
            <>
              <Button variant="outline" className="gap-1.5" onClick={() => void unduhLaporan()}>
                <Download className="h-4 w-4" /> Unduh laporan
              </Button>
              <Button onClick={onClose}>Tutup</Button>
            </>
          )}
          {tahap === "pilih" && <Button variant="outline" onClick={onClose}>Batal</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function contohNilai(berkas: Berkas, kolom: number): string | undefined {
  const v = berkas.isi.map((r) => r[kolom]).find((x) => String(x ?? "").trim() !== "");
  if (v === undefined) return undefined;
  const s = v instanceof Date ? v.toLocaleDateString("id-ID") : String(v);
  return s.length > 28 ? `${s.slice(0, 28)}…` : s;
}

function TandaKeyakinan({ k, sama, contoh }: { k?: { skor: number; sumber: string }; sama: boolean; contoh?: string }) {
  if (!contoh && !k) return null;
  const persen = k && sama ? Math.round(k.skor * 100) : null;
  const warna = persen === null ? "text-text-muted" : persen >= 85 ? "text-emerald-600" : persen >= 65 ? "text-amber-600" : "text-[var(--color-danger)]";
  return (
    <p className="mt-1 truncate text-xs text-text-muted">
      {persen !== null && <span className={`font-medium ${warna}`}>Yakin {persen}% · dari {k!.sumber} </span>}
      {persen === null && contoh && <span>Dipilih manual · </span>}
      {contoh && <span>contoh: “{contoh}”</span>}
    </p>
  );
}

function Angka({ label, nilai, tegas }: { label: string; nilai: number; tegas?: boolean }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`text-lg font-semibold ${tegas ? "text-accent-primary" : "text-text-primary"}`}>{formatNumber(nilai)}</p>
    </div>
  );
}

function Daftar({ judul, item }: { judul: string; item: string[] }) {
  return (
    <details className="rounded-lg border border-border px-3 py-2 text-sm">
      <summary className="cursor-pointer font-medium text-text-primary">{judul}</summary>
      <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto text-xs text-text-muted">
        {item.slice(0, 200).map((t, i) => (
          <li key={i}>{t}</li>
        ))}
        {item.length > 200 && <li>…dan {formatNumber(item.length - 200)} lainnya (lihat laporan Excel)</li>}
      </ul>
    </details>
  );
}
