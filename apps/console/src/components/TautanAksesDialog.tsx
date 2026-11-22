import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input } from "@dentiva/ui";

export interface TautanAkses {
  email: string;
  link: string;
  jenis: "undangan" | "reset";
}

/**
 * Ditampilkan bila email undangan/reset gagal terkirim (mis. SMTP belum terpasang):
 * operator menyalin tautan sekali pakai lalu mengirimkannya sendiri ke pemilik akun.
 */
export function TautanAksesDialog({ data, onClose }: { data: TautanAkses | null; onClose: () => void }) {
  const [tersalin, setTersalin] = useState(false);
  const salin = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.link);
      setTersalin(true);
      window.setTimeout(() => setTersalin(false), 2000);
    } catch {
      /* clipboard ditolak — operator bisa menyalin manual dari kolom */
    }
  };

  return (
    <Dialog open={!!data} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Email belum bisa dikirim</DialogTitle>
          <DialogDescription>
            Layanan email server belum aktif. Salin tautan {data?.jenis === "reset" ? "atur ulang password" : "undangan"} di bawah dan kirimkan langsung ke{" "}
            <span className="font-medium text-text-primary">{data?.email}</span> (mis. lewat WhatsApp).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input readOnly value={data?.link ?? ""} onFocus={(e) => e.currentTarget.select()} aria-label="Tautan sekali pakai" className="font-mono text-xs" />
            <Button type="button" variant="outline" className="gap-1.5 shrink-0" onClick={() => void salin()}>
              {tersalin ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {tersalin ? "Tersalin" : "Salin"}
            </Button>
          </div>
          <p className="text-xs text-text-muted">
            Tautan hanya bisa dipakai sekali dan memberi akses ke akun tersebut. Kirim hanya ke pemilik email, jangan ke grup.
          </p>
        </div>
        <DialogFooter>
          <Button type="button" onClick={onClose}>Selesai</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
