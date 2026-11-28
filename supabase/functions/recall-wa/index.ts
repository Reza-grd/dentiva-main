/**
 * Edge Function: recall-wa — Recall Fase 3 lewat sidecar WhatsApp Web (sementara, sebelum template Meta).
 * Dijalankan cron `recall-wa` tiap 5 menit (migrasi 20261130090000). Hanya service role.
 *
 *  1. Balasan pasien: ambil kotak masuk sidecar (GET /inbox), tafsir 1/2/3/BERHENTI, catat lewat RPC,
 *     balas pasien (baris identitas klinik), lalu konfirmasi (POST /inbox/ack).
 *  2. Pesan recall: 09.00–16.00 WIB (bukan Minggu), maksimal PER_PUTARAN pesan per putaran agar tersebar
 *     sepanjang jam kerja. Klaim atomik di notification_logs mencegah kirim dobel.
 *
 * Isi pesan & nomor pasien tidak dicatat di log; whatsapp_inbound hanya menyimpan sidik nomor.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"
import { decryptBatch } from "../_shared/decryptionHelper.ts"
import { recipientHash, sendWhatsApp, sentLogFields } from "../_shared/whatsapp.ts"
import { barisIdentitas, beriIdentitas } from "../_shared/tandaPesan.ts"
import {
  dalamJendelaKirim, type HasilJawab, PESAN_BERHENTI, PESAN_PETUNJUK, pesanBalasan, pesanRecall, tafsirJawaban,
} from "../_shared/recallWa.ts"

const PER_PUTARAN = 6

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

interface Masuk { seq: number; id: string; from: string | null; text: string; quotedId: string | null }

Deno.serve(async (req) => {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  if (req.headers.get('Authorization') !== `Bearer ${serviceKey}`) {
    return json(401, { error: 'Unauthorized: Service role key required' })
  }
  const base = Deno.env.get('WA_SIDECAR_URL')?.replace(/\/+$/, '')
  const key = Deno.env.get('WA_SIDECAR_KEY')
  if (!base || !key) return json(200, { success: true, note: 'Sidecar WhatsApp belum dikonfigurasi' })

  const db = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey)
  const sidecar = (path: string, init: RequestInit = {}) =>
    fetch(`${base}${path}`, { ...init, headers: { 'content-type': 'application/json', 'x-api-key': key }, signal: AbortSignal.timeout(15_000) })

  // Kirim teks lewat sidecar + catat di notification_logs (tanpa isi).
  const kirim = async (to: string, text: string, log: Record<string, unknown> | null) => {
    const r = await sendWhatsApp({ to, text, kind: 'reminder' }, { provider: 'sidecar' })
    if (r.ok && log) {
      const { error } = await db.from('notification_logs').insert([{ ...log, status: 'sent', gateway_response: JSON.stringify({ provider: r.provider, id: r.id }), ...(await sentLogFields(r, to)) }])
      if (error) console.error('recall-wa: log balasan gagal:', error.message)
    }
    return r
  }

  const hasil = { masuk: 0, diproses: 0, terkirim: 0, ditunda: 0, gagal: 0 }

  // ── 1. Balasan pasien ──
  try {
    const res = await sidecar('/inbox?after=0')
    const items: Masuk[] = res.ok ? ((await res.json())?.items ?? []) : []
    hasil.masuk = items.length
    let upTo = 0
    for (const m of items) {
      try {
        await prosesMasuk(m)
        upTo = m.seq
      } catch (err: any) {
        // Berhenti di sini: pesan ini & sesudahnya dicoba lagi pada putaran berikutnya.
        console.error('recall-wa: pesan masuk gagal diproses:', err?.message)
        break
      }
    }
    if (upTo) await sidecar('/inbox/ack', { method: 'POST', body: JSON.stringify({ upTo }) }).catch(() => {})
  } catch (err: any) {
    console.error('recall-wa: kotak masuk sidecar tidak terbaca:', err?.message)
  }

  async function prosesMasuk(m: Masuk) {
    const jawaban = tafsirJawaban(m.text)
    const hash = m.from ? await recipientHash(m.from) : null
    const catatMasuk = async (clinicId: string | null, patientId: string | null, action: string) => {
      // wamid unik: pesan yang sama (ack sebelumnya gagal) tidak diproses dua kali.
      const { error } = await db.from('whatsapp_inbound').insert([{
        wamid: `sc:${m.id}`, clinic_id: clinicId, patient_id: patientId, sender_hash: hash ?? 'tidak-diketahui',
        message_type: 'text', action,
      }])
      if (error?.code === '23505') return false
      if (error) throw error
      return true
    }

    if (jawaban === 'berhenti') {
      if (!hash || !m.from) return
      if (!(await catatMasuk(null, null, 'opt_out'))) return
      const { data: n, error } = await db.rpc('wa_cabut_persetujuan', { p_sender_hash: hash })
      if (error) throw error
      if ((n ?? 0) > 0) await kirim(m.from, PESAN_BERHENTI, null)
      hasil.diproses += 1
      return
    }

    const { data: rows, error: cariErr } = await db.rpc('recall_wa_cari', { p_pesan_id: m.quotedId, p_sender_hash: hash })
    if (cariErr) throw cariErr
    const r = rows?.[0]
    if (!r || !m.from) return // bukan balasan recall → abaikan (pesan lain ke nomor bersama)

    if (!jawaban) {
      // Petunjuk sekali saja, hanya untuk recall yang masih menunggu jawaban.
      if (r.wa_jawaban || !['diingatkan', 'menunggu'].includes(r.status)) return
      const { data: perlu, error } = await db.rpc('recall_wa_petunjuk', { p_id: r.id })
      if (error) throw error
      if (!perlu) return
      if (!(await catatMasuk(r.clinic_id, r.patient_id, 'recall'))) return
      const [nama] = await decryptBatch(db, [r.nama_lengkap || ''])
      await kirim(m.from, beriIdentitas(PESAN_PETUNJUK, barisIdentitas({ kode: r.kode_wa, noRm: r.no_rm, nama })),
        { message_type: 'recall_balasan', clinic_id: r.clinic_id, patient_id: r.patient_id })
      hasil.diproses += 1
      return
    }

    if (!(await catatMasuk(r.clinic_id, r.patient_id, 'recall'))) return
    const { data: h, error } = await db.rpc('recall_wa_jawab', { p_id: r.id, p_jawaban: jawaban })
    if (error) {
      // Lepas catatan agar pesan ini diproses ulang pada putaran berikutnya.
      await db.from('whatsapp_inbound').delete().eq('wamid', `sc:${m.id}`)
      throw error
    }
    const [nama] = await decryptBatch(db, [r.nama_lengkap || ''])
    const teks = pesanBalasan(h as HasilJawab, { nama, klinik: r.nama_klinik, tanggal: r.tanggal_target, telepon: r.telepon_klinik })
    await kirim(m.from, beriIdentitas(teks, barisIdentitas({ kode: r.kode_wa, noRm: r.no_rm, nama })),
      { message_type: 'recall_balasan', clinic_id: r.clinic_id, patient_id: r.patient_id })
    hasil.diproses += 1
  }

  // ── 2. Pesan recall terjadwal ──
  if (!dalamJendelaKirim()) return json(200, { success: true, jendelaKirim: false, ...hasil })

  try {
    // Klaim 'sending' yang macet (> 10 menit): hasil tidak pasti → 'uncertain' (tidak dikirim ulang).
    await db.from('notification_logs')
      .update({ status: 'uncertain', gateway_response: '[macet] klaim kedaluwarsa — hasil tidak pasti' })
      .in('message_type', ['recall_awal', 'recall_ulang']).eq('status', 'sending')
      .lt('timestamp', new Date(Date.now() - 10 * 60_000).toISOString())

    const { data: antrean, error } = await db.rpc('recall_wa_antrean', { p_limit: PER_PUTARAN })
    if (error) throw error

    for (const r of antrean ?? []) {
      const type = `recall_${r.jenis}`
      const dasar = { visit_id: r.visit_id, patient_id: r.patient_id, clinic_id: r.clinic_id, message_type: type }
      const { data: klaim, error: klaimErr } = await db.from('notification_logs')
        .insert([{ ...dasar, status: 'sending', gateway_response: '' }]).select('id').single()
      if (klaimErr) {
        if (klaimErr.code !== '23505') console.error('recall-wa: klaim gagal:', klaimErr.code, klaimErr.message)
        continue
      }
      const ubah = (status: string, why: string, extra: Record<string, unknown> = {}) =>
        db.from('notification_logs').update({ status, gateway_response: why.slice(0, 500), ...extra }).eq('id', klaim.id)

      const [nama, wa] = await decryptBatch(db, [r.nama_lengkap || '', r.no_wa || ''])
      if (!wa) { await ubah('skipped_no_phone', 'Nomor WA kosong'); continue }

      const isi = pesanRecall(r.jenis, { nama, klinik: r.nama_klinik, tanggal: r.tanggal_target, tujuan: r.tujuan })
      const text = beriIdentitas(isi, barisIdentitas({ kode: r.kode_wa, noRm: r.no_rm, nama }))
      const s = await sendWhatsApp({ to: wa, text, kind: 'reminder', idempotencyKey: `${type}:${r.id}` }, { provider: 'sidecar' })
      if (s.ok) {
        await ubah('sent', JSON.stringify({ provider: s.provider, id: s.id }), await sentLogFields(s, wa))
        const { error: tErr } = await db.rpc('recall_wa_tandai', { p_id: r.id, p_jenis: r.jenis })
        if (tErr) console.error('recall-wa: tandai gagal:', tErr.message)
        hasil.terkirim += 1
      } else if (s.retryable) {
        // WA belum tersambung / batas kirim: lepas klaim, coba lagi putaran berikutnya, hentikan putaran ini.
        await db.from('notification_logs').delete().eq('id', klaim.id)
        hasil.ditunda += 1
        break
      } else {
        await ubah('failed', s.error || 'gagal')
        hasil.gagal += 1
      }
    }
  } catch (err: any) {
    console.error('recall-wa error:', err?.message)
    return json(500, { error: err?.message ?? 'Internal error', ...hasil })
  }

  return json(200, { success: true, jendelaKirim: true, ...hasil })
})
