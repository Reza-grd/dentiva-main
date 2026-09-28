import React from "react";
import {
  TableContainer,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../src/Table";

export default {
  title: "UI/Table",
  component: TableContainer,
  tags: ["autodocs"],
};

export const Default = {
  render: () => (
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>No. RM</TableHead>
            <TableHead>Nama Pasien</TableHead>
            <TableHead>Dokter</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-mono">RM-2026-0001</TableCell>
            <TableCell className="font-medium">Budi Santoso</TableCell>
            <TableCell>drg. Ahmad Rifa'i</TableCell>
            <TableCell>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Selesai
              </span>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">RM-2026-0002</TableCell>
            <TableCell className="font-medium">Siti Aminah</TableCell>
            <TableCell>drg. Siti Sarah</TableCell>
            <TableCell>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Menunggu
              </span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  ),
};
