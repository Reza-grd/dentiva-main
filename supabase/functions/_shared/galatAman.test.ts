import { assert, assertEquals, assertMatch } from "jsr:@std/assert@1";
import { galatAman, kodeRujukan } from "./galatAman.ts";

Deno.test("kodeRujukan: format G- + 8 karakter tanpa huruf/angka yang mirip", () => {
  for (let i = 0; i < 50; i++) assertMatch(kodeRujukan(), /^G-[A-HJ-NP-Z2-9]{8}$/);
});

Deno.test("galatAman: detail teknis tidak ikut ke respons", () => {
  const asli = console.error;
  const tercatat: unknown[][] = [];
  console.error = (...a: unknown[]) => { tercatat.push(a); };
  try {
    const r = galatAman("uji", new Error('duplicate key value violates unique constraint "users_pkey"'));
    assert(!r.error.includes("users_pkey"));
    assert(r.error.includes(r.kode));
    assertEquals(tercatat.length, 1);
    assert(String(tercatat[0][0]).includes(r.kode));
  } finally {
    console.error = asli;
  }
});
