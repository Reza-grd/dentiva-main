import React from "react";
import { Input } from "../src/Input";

export default {
  title: "UI/Input",
  component: Input,
  tags: ["autodocs"],
  argTypes: {
    disabled: { control: "boolean" },
    error: { control: "text" },
  },
};

export const Default = {
  args: {
    label: "Nama Pasien",
    placeholder: "Masukkan nama lengkap...",
    helperText: "Sesuai KTP / Kartu Identitas",
  },
};

export const Required = {
  args: {
    label: "NIK Pasien",
    placeholder: "16 digit NIK...",
    required: true,
  },
};

export const WithError = {
  args: {
    label: "Nomor Telepon",
    value: "abc",
    error: "Nomor telepon harus berupa angka",
  },
};

export const Disabled = {
  args: {
    label: "ID Rekam Medis",
    value: "RM-2026-0001",
    disabled: true,
  },
};
