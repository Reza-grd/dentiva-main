import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../src/Tabs";

export default {
  title: "UI/Tabs",
  component: Tabs,
  tags: ["autodocs"],
};

export const Default = {
  render: () => (
    <Tabs defaultValue="profil" className="max-w-md">
      <TabsList>
        <TabsTrigger value="profil">Profil Pasien</TabsTrigger>
        <TabsTrigger value="riwayat">Riwayat Kunjungan</TabsTrigger>
        <TabsTrigger value="pembayaran">Pembayaran</TabsTrigger>
      </TabsList>
      <TabsContent value="profil" className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border">
        Data profil pasien dan riwayat medis umum.
      </TabsContent>
      <TabsContent value="riwayat" className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border">
        Daftar kunjungan klinis terdahulu.
      </TabsContent>
      <TabsContent value="pembayaran" className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border">
        Informasi kuitansi dan tagihan.
      </TabsContent>
    </Tabs>
  ),
};
