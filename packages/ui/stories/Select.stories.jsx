import React from "react";
import { Select } from "../src/Select";

export default {
  title: "UI/Select",
  component: Select,
  tags: ["autodocs"],
};

export const Default = {
  render: () => (
    <div className="max-w-xs">
      <Select label="Pilih Dokter" helperText="Pilih dokter penanggung jawab">
        <option value="">-- Pilih Dokter --</option>
        <option value="drg-1">drg. Ahmad Rifa'i, Sp.KG</option>
        <option value="drg-2">drg. Siti Sarah</option>
      </Select>
    </div>
  ),
};

export const WithError = {
  render: () => (
    <div className="max-w-xs">
      <Select label="Jenis Kunjungan" error="Jenis kunjungan wajib dipilih" required>
        <option value="">-- Pilih --</option>
        <option value="pemeriksaan">Pemeriksaan Rutin</option>
        <option value="tindakan">Tindakan Medis</option>
      </Select>
    </div>
  ),
};
