import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { autoReplyText, isOptOut, isReplyable, optOutReplyText, parseEvents } from "./waWebhook.ts";

Deno.test("isReplyable: pesan sistem (ganti nomor), reaksi & jenis tak didukung tidak dibalas otomatis", () => {
  // Contoh "User Changed Number System Message" dari spesifikasi Meta (business-messaging-api_v23.0)
  const { messages } = parseEvents(payload({
    messages: [{ from: "16505551234", id: "wamid.SYS", timestamp: "1700000000", type: "system",
      system: { body: "User A changed from 16505551234 to 12195555358", wa_id: "12195555358", type: "user_changed_number" } }],
  }));
  assertEquals(messages.map((m) => m.type), ["system"]);
  for (const t of ["system", "reaction", "unsupported", "unknown"]) assertEquals(isReplyable(t), false, t);
  for (const t of ["text", "button", "interactive", "image", "audio", "document"]) assertEquals(isReplyable(t), true, t);
});

// Bentuk payload mengikuti contoh "messages" dari dashboard Meta (v26.0).
const payload = (value: Record<string, unknown>, field = "messages") => ({
  object: "whatsapp_business_account",
  entry: [{ id: "WABA", changes: [{ field, value: { messaging_product: "whatsapp", metadata: { phone_number_id: "PN1" }, ...value } }] }],
});

Deno.test("parseEvents: pesan masuk teks, tombol, dan interaktif", () => {
  const { messages, statuses } = parseEvents(payload({
    messages: [
      { from: "6281234567890", id: "wamid.A", timestamp: "1700000000", type: "text", text: { body: "Halo" } },
      { from: "6281234567890", id: "wamid.B", type: "button", button: { text: "Konfirmasi" } },
      { from: "6281234567890", id: "wamid.C", type: "interactive", interactive: { button_reply: { title: "BERHENTI" } } },
      { from: "6281234567890", id: "wamid.D", type: "image", image: { id: "m1" } },
      { id: "wamid.tanpa-pengirim", type: "text", text: { body: "x" } },
    ],
  }));
  assertEquals(statuses, []);
  assertEquals(messages.map((m) => [m.wamid, m.type, m.text]), [
    ["wamid.A", "text", "Halo"], ["wamid.B", "button", "Konfirmasi"], ["wamid.C", "interactive", "BERHENTI"], ["wamid.D", "image", ""],
  ]);
});

Deno.test("parseEvents: status dengan waktu & galat; status tak dikenal diabaikan", () => {
  const { statuses } = parseEvents(payload({
    statuses: [
      { id: "wamid.1", status: "delivered", timestamp: "1700000000", recipient_id: "6281" },
      { id: "wamid.2", status: "failed", timestamp: "1700000060", errors: [{ code: 131047, title: "Re-engagement message" }] },
      { id: "wamid.3", status: "deleted" },
      { status: "read" },
    ],
  }));
  assertEquals(statuses, [
    { wamid: "wamid.1", status: "delivered", at: "2023-11-14T22:13:20.000Z", error: null },
    { wamid: "wamid.2", status: "failed", at: "2023-11-14T22:14:20.000Z", error: "131047 Re-engagement message" },
  ]);
});

Deno.test("parseEvents: nomor lain & field selain messages diabaikan; payload rusak tidak melempar", () => {
  const p = payload({ statuses: [{ id: "wamid.1", status: "sent" }] });
  assertEquals(parseEvents(p, "PN-LAIN").statuses, []);
  assertEquals(parseEvents(p, "PN1").statuses.length, 1);
  assertEquals(parseEvents(payload({ statuses: [{ id: "x", status: "sent" }] }, "account_update")).statuses, []);
  for (const rusak of [null, {}, { entry: "x" }, { entry: [{ changes: [null] }] }]) {
    assertEquals(parseEvents(rusak), { statuses: [], messages: [] });
  }
});

Deno.test("isOptOut: hanya kata kunci sendiri", () => {
  for (const t of ["BERHENTI", "berhenti.", "  Stop!", "unsubscribe", "jangan kirim lagi"]) assertEquals(isOptOut(t), true, t);
  for (const t of ["", "kapan berhenti minum obat?", "stop dulu ya dok, besok saya datang", "Halo"]) assertEquals(isOptOut(t), false, t);
});

Deno.test("balasan otomatis menyebut klinik pengirim, bukan Dentiva sebagai klinik", () => {
  const c = { name: "Klinik Gigi Sehat", phone: "0211234567" };
  assertEquals(autoReplyText(c).includes("nomor notifikasi otomatis untuk Klinik Gigi Sehat"), true);
  assertEquals(autoReplyText(c).includes("hubungi Klinik Gigi Sehat di 0211234567"), true);
  assertEquals(autoReplyText({ name: "Klinik X", phone: "-" }).includes("hubungi Klinik X."), true);
  assertEquals(autoReplyText(null).includes("hubungi klinik Anda secara langsung"), true);
  assertEquals(optOutReplyText(c).startsWith("Baik, Anda tidak akan menerima pesan WhatsApp otomatis lagi."), true);
});
