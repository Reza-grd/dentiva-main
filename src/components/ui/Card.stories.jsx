import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./Card";
import { Button } from "./Button";

export default {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
};

export const Default = {
  render: () => (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Ringkasan Pasien</CardTitle>
        <CardDescription>Detail Kunjungan Terakhir Pasien</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">
          Nama: Budi Santoso (RM-2026-0042)
          <br />
          Tindakan: Penambalan Komposit Gigi 16
        </p>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline" size="sm">
          Batal
        </Button>
        <Button variant="primary" size="sm">
          Lihat Rekam Medis
        </Button>
      </CardFooter>
    </Card>
  ),
};
