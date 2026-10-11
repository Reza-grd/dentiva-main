import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { configProblem, normalizePhone, pickProvider, reminderTemplate, sendWhatsApp } from "./whatsapp.ts";

const envOf = (vars: Record<string, string>) => ({ get: (k: string) => vars[k] });

function fakeFetch(response: { status?: number; body: unknown }) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fn = ((url: string, init: RequestInit) => {
    calls.push({ url, init });
    return Promise.resolve(new Response(JSON.stringify(response.body), { status: response.status ?? 200 }));
  }) as unknown as typeof fetch;
  return { fn, calls };
}

Deno.test("normalizePhone: 08xx → 628xx, hanya digit", () => {
  assertEquals(normalizePhone("0812-3456-7890"), "6281234567890");
  assertEquals(normalizePhone("+62 812 3456 7890"), "6281234567890");
});

Deno.test("pickProvider: WA_PROVIDER menang, lalu urutan sidecar → meta → whapi", () => {
  assertEquals(pickProvider(envOf({})), null);
  assertEquals(pickProvider(envOf({ WHAPI_TOKEN: "x" })), "whapi");
  assertEquals(pickProvider(envOf({ WHAPI_TOKEN: "x", META_WA_TOKEN: "t", META_WA_PHONE_NUMBER_ID: "1" })), "meta");
  assertEquals(pickProvider(envOf({ WHAPI_TOKEN: "x", WA_SIDECAR_URL: "http://wa-sidecar:3000" })), "sidecar");
  assertEquals(pickProvider(envOf({ WA_PROVIDER: "META", WA_SIDECAR_URL: "u" })), "meta");
  assertEquals(pickProvider(envOf({ WA_PROVIDER: "ngawur", WHAPI_TOKEN: "x" })), "whapi");
});

Deno.test("configProblem: menyebut kunci yang belum diisi", () => {
  assertEquals(configProblem(envOf({ WA_PROVIDER: "sidecar", WA_SIDECAR_URL: "u" })), "WhatsApp (sidecar): WA_SIDECAR_KEY belum diisi");
  assertEquals(configProblem(envOf({ WA_SIDECAR_URL: "u", WA_SIDECAR_KEY: "k" })), null);
});

Deno.test("sidecar: POST /send dengan x-api-key, nomor dinormalkan", async () => {
  const { fn, calls } = fakeFetch({ body: { ok: true, id: "ABC" } });
  const r = await sendWhatsApp({ to: "081234567890", text: "Halo" }, {
    env: envOf({ WA_SIDECAR_URL: "http://wa-sidecar:3000/", WA_SIDECAR_KEY: "kunci" }),
    fetch: fn,
  });
  assertEquals(r, { ok: true, provider: "sidecar", id: "ABC", detail: { ok: true, id: "ABC" } });
  assertEquals(calls[0].url, "http://wa-sidecar:3000/send");
  assertEquals((calls[0].init.headers as Record<string, string>)["x-api-key"], "kunci");
  assertEquals(JSON.parse(String(calls[0].init.body)), { to: "6281234567890", text: "Halo" });
});

Deno.test("sidecar: galat dari sidecar diteruskan", async () => {
  const { fn } = fakeFetch({ status: 503, body: { ok: false, error: "WhatsApp belum tersambung (status: qr)" } });
  const r = await sendWhatsApp({ to: "081234567890", text: "Halo" }, {
    env: envOf({ WA_SIDECAR_URL: "http://s", WA_SIDECAR_KEY: "k" }),
    fetch: fn,
  });
  assertEquals(r.ok, false);
  assertEquals(r.error, "WhatsApp belum tersambung (status: qr)");
});

Deno.test("meta: teks biasa ke Graph API /{phone_number_id}/messages", async () => {
  const { fn, calls } = fakeFetch({ body: { messages: [{ id: "wamid.1" }] } });
  const r = await sendWhatsApp({ to: "081234567890", text: "Halo" }, {
    env: envOf({ META_WA_TOKEN: "tok", META_WA_PHONE_NUMBER_ID: "123", META_WA_API_VERSION: "v99.0" }),
    fetch: fn,
  });
  assertEquals(r.ok, true);
  assertEquals(r.id, "wamid.1");
  assertEquals(calls[0].url, "https://graph.facebook.com/v99.0/123/messages");
  assertEquals((calls[0].init.headers as Record<string, string>).authorization, "Bearer tok");
  assertEquals(JSON.parse(String(calls[0].init.body)), {
    messaging_product: "whatsapp", to: "6281234567890", type: "text", text: { body: "Halo", preview_url: false },
  });
});

Deno.test("meta: template dengan parameter body; penyedia lain mengabaikan template", async () => {
  const env = envOf({ META_WA_TOKEN: "t", META_WA_PHONE_NUMBER_ID: "1", META_WA_TEMPLATE_PENGINGAT: "pengingat_jadwal" });
  const tpl = reminderTemplate(["Budi", "Senin", "09:00", "drg. A", "Klinik X", ""], env)!;
  assertEquals(tpl, { name: "pengingat_jadwal", language: "id", params: ["Budi", "Senin", "09:00", "drg. A", "Klinik X", ""] });

  const meta = fakeFetch({ body: { messages: [{ id: "wamid.2" }] } });
  await sendWhatsApp({ to: "0812345678", text: "cadangan", template: tpl }, { env, fetch: meta.fn });
  const sent = JSON.parse(String(meta.calls[0].init.body));
  assertEquals(sent.type, "template");
  assertEquals(sent.template.name, "pengingat_jadwal");
  assertEquals(sent.template.language, { code: "id" });
  assertEquals(sent.template.components[0].parameters[5], { type: "text", text: "-" });

  const side = fakeFetch({ body: { ok: true, id: "S" } });
  await sendWhatsApp({ to: "0812345678", text: "cadangan", template: tpl }, {
    env: envOf({ WA_SIDECAR_URL: "http://s", WA_SIDECAR_KEY: "k" }),
    fetch: side.fn,
  });
  assertEquals(JSON.parse(String(side.calls[0].init.body)).text, "cadangan");
});

Deno.test("meta: galat Graph API diteruskan", async () => {
  const { fn } = fakeFetch({ status: 400, body: { error: { message: "Re-engagement message" } } });
  const r = await sendWhatsApp({ to: "081234567890", text: "Halo" }, {
    env: envOf({ META_WA_TOKEN: "t", META_WA_PHONE_NUMBER_ID: "1" }),
    fetch: fn,
  });
  assertEquals(r.ok, false);
  assertEquals(r.error, "Re-engagement message");
});

Deno.test("whapi: tetap berfungsi seperti sebelumnya", async () => {
  const { fn, calls } = fakeFetch({ body: { sent: true, message: { id: "W1" } } });
  const r = await sendWhatsApp({ to: "081234567890", text: "Halo" }, { env: envOf({ WHAPI_TOKEN: "w" }), fetch: fn });
  assertEquals(r.ok, true);
  assertEquals(r.id, "W1");
  assertEquals(JSON.parse(String(calls[0].init.body)), { to: "6281234567890@s.whatsapp.net", body: "Halo" });
});

Deno.test("validasi: nomor tidak valid & belum dikonfigurasi", async () => {
  const { fn, calls } = fakeFetch({ body: {} });
  assertEquals((await sendWhatsApp({ to: "123", text: "x" }, { env: envOf({ WHAPI_TOKEN: "w" }), fetch: fn })).error, "Nomor WhatsApp tidak valid");
  assertEquals((await sendWhatsApp({ to: "081234567890", text: "x" }, { env: envOf({}), fetch: fn })).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("jaringan putus → ok:false, bukan exception", async () => {
  const boom = (() => Promise.reject(new Error("ECONNREFUSED"))) as unknown as typeof fetch;
  const r = await sendWhatsApp({ to: "081234567890", text: "x" }, { env: envOf({ WA_SIDECAR_URL: "http://s", WA_SIDECAR_KEY: "k" }), fetch: boom });
  assertEquals(r.ok, false);
  assertEquals(r.error, "Jaringan ke penyedia WhatsApp gagal: ECONNREFUSED");
});
