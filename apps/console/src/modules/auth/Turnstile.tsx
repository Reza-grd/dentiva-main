import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

// Cloudflare Turnstile (CAPTCHA) untuk login & reset password console.
// Site key bersifat publik; VITE_TURNSTILE_SITE_KEY=off mematikan widget (mis. untuk uji lokal).
const BAWAAN = "0x4AAAAAAGMx-16yVqRjfyI3";
const dariEnv = ((import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ?? "").trim();
export const TURNSTILE_SITE_KEY = dariEnv === "off" ? "" : dariEnv || BAWAAN;

type TurnstileApi = {
  render: (el: HTMLElement, opsi: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SKRIP = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let muatSkrip: Promise<TurnstileApi> | null = null;
function pastikanSkrip(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!muatSkrip) {
    muatSkrip = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SKRIP;
      s.async = true;
      s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile tidak tersedia")));
      s.onerror = () => {
        muatSkrip = null;
        reject(new Error("Skrip verifikasi keamanan gagal dimuat"));
      };
      document.head.appendChild(s);
    });
  }
  return muatSkrip;
}

export type TurnstileHandle = {
  /** Menunggu verifikasi selesai (maks. 20 dtk); undefined bila widget dimatikan. */
  ambilToken: () => Promise<string | undefined>;
  /** Token hanya bisa dipakai sekali — panggil setelah setiap permintaan. */
  reset: () => void;
};

export const Turnstile = forwardRef<TurnstileHandle>(function Turnstile(_props, ref) {
  const wadah = useRef<HTMLDivElement>(null);
  const idWidget = useRef<string | null>(null);
  const token = useRef("");
  const penunggu = useRef<Array<(t: string) => void>>([]);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return undefined;
    let batal = false;
    pastikanSkrip()
      .then((ts) => {
        if (batal || !wadah.current || idWidget.current != null) return;
        idWidget.current = ts.render(wadah.current, {
          sitekey: TURNSTILE_SITE_KEY,
          language: "id",
          appearance: "interaction-only",
          callback: (t: string) => {
            token.current = t;
            penunggu.current.splice(0).forEach((f) => f(t));
          },
          "expired-callback": () => {
            token.current = "";
          },
          "error-callback": () => {
            token.current = "";
          },
        });
      })
      .catch(() => {});
    return () => {
      batal = true;
      if (idWidget.current != null) window.turnstile?.remove(idWidget.current);
      idWidget.current = null;
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      ambilToken() {
        if (!TURNSTILE_SITE_KEY) return Promise.resolve(undefined);
        if (token.current) return Promise.resolve(token.current);
        return new Promise((resolve, reject) => {
          const waktu = setTimeout(
            () => reject(new Error("Verifikasi keamanan belum selesai. Tunggu sebentar lalu coba lagi.")),
            20000,
          );
          penunggu.current.push((t) => {
            clearTimeout(waktu);
            resolve(t);
          });
        });
      },
      reset() {
        token.current = "";
        if (idWidget.current != null) window.turnstile?.reset(idWidget.current);
      },
    }),
    [],
  );

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={wadah} className="flex justify-center empty:hidden" />;
});
