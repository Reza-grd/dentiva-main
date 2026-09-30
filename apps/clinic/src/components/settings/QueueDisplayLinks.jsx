import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Monitor, Copy, Check, Trash2, ExternalLink, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, Input } from '@dentiva/ui';
import { supabase } from '../../services/supabase';
import { useToast } from '../common/ToastNotification';
import { PUBLIC_APP_URL, openExternal } from '../../utils/platform';

const formatDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

/**
 * Tautan layar antrean TV. TV membuka /antrean/<token> tanpa login; server hanya
 * mengirim nomor urut, inisial pasien, dan nama dokter (lihat get_queue_display).
 */
export default function QueueDisplayLinks() {
  const toast = useToast();
  // useToast() mengembalikan objek baru tiap render; simpan di ref agar load() stabil.
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [newLink, setNewLink] = useState(null); // { url, label } — hanya ditampilkan sekali
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('queue_display_links')
      .select('id, label, token_hint, created_at, last_seen_at, revoked_at')
      .order('created_at', { ascending: false });
    if (error) toastRef.current.error('Gagal memuat tautan layar antrean: ' + error.message);
    setLinks(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    setCreating(true);
    const { data, error } = await supabase.rpc('create_queue_display_link', { p_label: label || null });
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewLink({ url: `${PUBLIC_APP_URL}/antrean/${data.token}`, label: label || 'Layar ruang tunggu' });
    setCopied(false);
    setLabel('');
    load();
  };

  const revoke = async (link) => {
    if (!window.confirm(`Cabut tautan "${link.label}"? Layar yang memakai tautan ini akan berhenti menampilkan antrean.`)) return;
    const { error } = await supabase.rpc('revoke_queue_display_link', { p_id: link.id });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Tautan dicabut');
    load();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(newLink.url);
      setCopied(true);
    } catch {
      toast.error('Tidak bisa menyalin otomatis. Salin tautan secara manual.');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Monitor className="w-5 h-5 text-[var(--color-accent)]" />
            Layar Antrean TV
          </CardTitle>
          <CardDescription>
            Buat tautan khusus untuk TV ruang tunggu. TV tidak perlu login dan hanya menerima nomor antrean, inisial
            pasien, dan nama dokter — nama lengkap, No. RM, dan kontak pasien tidak pernah dikirim ke TV.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Nama layar, mis. TV Ruang Tunggu Lt. 1"
              maxLength={60}
              className="sm:flex-1"
            />
            <Button onClick={create} isLoading={creating} disabled={creating}>
              Buat tautan
            </Button>
          </div>

          {newLink && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-4 space-y-3">
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Tautan untuk &ldquo;{newLink.label}&rdquo; — hanya ditampilkan sekali
              </p>
              <code className="block break-all text-xs bg-white dark:bg-gray-900 rounded-lg p-3 border border-emerald-200 dark:border-emerald-900">
                {newLink.url}
              </code>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={copy}>
                  {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                  {copied ? 'Tersalin' : 'Salin tautan'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => openExternal(newLink.url)}>
                  <ExternalLink className="w-4 h-4 mr-1" /> Buka
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setNewLink(null)}>
                  Selesai
                </Button>
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Buka tautan ini di browser TV lalu tandai sebagai bookmark. Siapa pun yang memegang tautan bisa melihat
                layar antrean — cabut tautan bila TV diganti atau tautan tersebar.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tautan yang pernah dibuat</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500">Memuat…</p>
          ) : links.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada tautan layar antrean.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {links.map((l) => (
                <li key={l.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                      {l.label} <span className="font-mono text-xs text-gray-400">…{l.token_hint}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Dibuat {formatDateTime(l.created_at)} · Terakhir aktif {formatDateTime(l.last_seen_at)}
                    </p>
                  </div>
                  {l.revoked_at ? (
                    <Badge variant="secondary">Dicabut</Badge>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => revoke(l)} aria-label={`Cabut tautan ${l.label}`}>
                      <Trash2 className="w-4 h-4 mr-1" /> Cabut
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
