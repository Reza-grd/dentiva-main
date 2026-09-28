import { useEffect, useState, type ReactNode } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@dentiva/ui";
import { Field, TextArea } from "./Field";

/**
 * Dialog konfirmasi untuk aksi berisiko. Alasan (min. 5 karakter) ikut
 * tersimpan di audit log. `confirmText` opsional memaksa operator mengetik
 * teks tertentu (mis. slug klinik) sebelum tombol aktif.
 */
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  variant = "danger",
  requireReason = true,
  showReason = true,
  confirmDisabled = false,
  confirmText,
  isPending,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  variant?: "danger" | "primary";
  requireReason?: boolean;
  /** false = sembunyikan kolom alasan (untuk aksi yang tidak mencatat alasan). */
  showReason?: boolean;
  confirmDisabled?: boolean;
  confirmText?: string;
  isPending?: boolean;
  onConfirm: (reason: string, typed: string) => void;
  children?: ReactNode;
}) {
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (open) {
      setReason("");
      setTyped("");
    }
  }, [open]);

  const reasonOk = !showReason || !requireReason || reason.trim().length >= 5;
  const typedOk = !confirmText || typed.trim() === confirmText;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (reasonOk && typedOk && !isPending) onConfirm(reason.trim(), typed.trim());
          }}
        >
          {children}
          {showReason && (
          <Field
            label={requireReason ? "Alasan" : "Alasan (opsional)"}
            htmlFor="reason-dialog-reason"
            required={requireReason}
            hint="Tersimpan di audit log dan terlihat oleh tim."
          >
            <TextArea
              id="reason-dialog-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              autoFocus={!children}
              placeholder="Contoh: Tagihan 60 hari belum dibayar, sudah dihubungi 3x"
            />
          </Field>
          )}

          {confirmText && (
            <Field
              label={
                <>
                  Ketik <code className="rounded bg-background px-1 font-mono text-xs">{confirmText}</code> untuk konfirmasi
                </>
              }
              htmlFor="reason-dialog-confirm"
              required
            >
              <Input
                id="reason-dialog-confirm"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
              />
            </Field>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Batal
            </Button>
            <Button type="submit" variant={variant} disabled={!reasonOk || !typedOk || confirmDisabled} isLoading={isPending}>
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
