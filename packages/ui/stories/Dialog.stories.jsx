import React from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "../src/Dialog";
import { Button } from "../src/Button";

export default {
  title: "UI/Dialog",
  component: Dialog,
  tags: ["autodocs"],
};

export const Default = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="primary">Buka Modal Konfirmasi</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Konfirmasi Pembatalan Janji</DialogTitle>
          <DialogDescription>
            Apakah Anda yakin ingin membatalkan jadwal kunjungan pasien ini?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 text-sm text-gray-600 dark:text-gray-300">
          Tindakan ini tidak dapat dibatalkan. Pasien akan menerima notifikasi pembatalan.
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Batal</Button>
          </DialogClose>
          <Button variant="danger">Ya, Batalkan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
