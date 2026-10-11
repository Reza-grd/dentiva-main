import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts"
import { parseTypes } from "./notificationInput.ts"

Deno.test("parseTypes: bawaan semua jenis, duplikat dibuang, nilai asing ditolak", () => {
  assertEquals(parseTypes(undefined), ["receipt", "education"])
  assertEquals(parseTypes(["receipt", "receipt"]), ["receipt"])
  assertEquals(parseTypes(["education"]), ["education"])
  assertEquals(parseTypes([]), null)
  assertEquals(parseTypes(["receipt", "spam"]), null)
  assertEquals(parseTypes("receipt"), null)
  assertEquals(parseTypes(["receipt", "education", "receipt_resend"]), null)
})
