import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button, Card, Input, cn } from "@dentiva/ui";
import {
  ACTIONS,
  DEFAULT_TRIAL_DAYS,
  addDays,
  formatDate,
  formatNumber,
  formatRupiah,
  slugify,
  todayWib,
  type ActionParams,
} from "@dentiva/shared";
import { DescriptionList } from "@/components/misc";
import { Field } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { useDebounced } from "@/lib/hooks";
import { useConsoleMutation, useConsoleQuery } from "@/lib/query";

type Form = {
  name: string;
  slug: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  province: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  planId: string;
  trialDays: number;
};

const EMPTY: Form = {
  name: "",
  slug: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  province: "",
  ownerName: "",
  ownerEmail: "",
  ownerPhone: "",
  planId: "",
  trialDays: DEFAULT_TRIAL_DAYS,
};

const STEPS = ["Profil klinik", "Akun pemilik", "Paket & trial", "Tinjau"] as const;

/** Field form → path di skema zod (untuk memetakan pesan error). */
const FIELD_PATH: Record<keyof Form, string> = {
  name: "clinic.name",
  slug: "clinic.slug",
  phone: "clinic.phone",
  email: "clinic.email",
  address: "clinic.address",
  city: "clinic.city",
  province: "clinic.province",
  ownerName: "owner.fullName",
  ownerEmail: "owner.email",
  ownerPhone: "owner.phone",
  planId: "planId",
  trialDays: "trialDays",
};

const STEP_FIELDS: Array<Array<keyof Form>> = [
  ["name", "slug", "phone", "email", "address", "city", "province"],
  ["ownerName", "ownerEmail", "ownerPhone"],
  ["planId", "trialDays"],
  [],
];

function toParams(f: Form): ActionParams<"clinics.create"> {
  return {
    clinic: {
      name: f.name,
      slug: f.slug,
      phone: f.phone || undefined,
      email: f.email || undefined,
      address: f.address || undefined,
      city: f.city || undefined,
      province: f.province || undefined,
    },
    owner: { fullName: f.ownerName, email: f.ownerEmail, phone: f.ownerPhone || undefined },
    planId: f.planId,
    trialDays: f.trialDays,
  };
}

/** Validasi di browser memakai skema zod yang SAMA dengan console-api. */
function validate(f: Form): Partial<Record<keyof Form, string>> {
  const res = ACTIONS["clinics.create"].params.safeParse(toParams(f));
  if (res.success) return {};
  const byPath = new Map(res.error.issues.map((i) => [i.path.map(String).join("."), i.message]));
  const out: Partial<Record<keyof Form, string>> = {};
  (Object.keys(FIELD_PATH) as Array<keyof Form>).forEach((k) => {
    const m = byPath.get(FIELD_PATH[k]);
    if (m) out[k] = m;
  });
  if (!f.planId) out.planId = "Pilih paket";
  return out;
}

export function NewClinicPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(EMPTY);
  const [touched, setTouched] = useState<Set<keyof Form>>(new Set());
  const [slugEdited, setSlugEdited] = useState(false);
  const { data: plans } = useConsoleQuery("billing.plans.list", {});

  const create = useConsoleMutation("clinics.create", {
    invalidate: ["clinics.", "dashboard.", "users.", "usage."],
    toastError: false,
    successMessage: (r) => (r.inviteSent ? "Klinik terdaftar. Undangan dikirim ke pemilik." : "Klinik terdaftar. Undangan GAGAL dikirim — kirim ulang dari menu Pengguna."),
    onSuccess: (r) => navigate(`/clinics/${r.clinicId}`, { replace: true }),
  });

  const errors = useMemo(() => validate(form), [form]);
  const serverFields = create.error?.code === "invalid_params" ? create.error.fields ?? {} : {};
  const errorFor = (k: keyof Form) => (touched.has(k) ? errors[k] : undefined) ?? serverFields[FIELD_PATH[k]];

  // Slug otomatis dari nama sampai operator mengubahnya sendiri
  useEffect(() => {
    if (!slugEdited) setForm((f) => ({ ...f, slug: slugify(f.name) }));
  }, [form.name, slugEdited]);

  // Default paket termurah
  useEffect(() => {
    if (plans?.length && !form.planId) setForm((f) => ({ ...f, planId: plans[0].id }));
  }, [plans, form.planId]);

  const debouncedSlug = useDebounced(form.slug, 400);
  const slugCheck = useConsoleQuery(
    "clinics.checkSlug",
    { slug: debouncedSlug },
    { enabled: debouncedSlug.length >= 3 && !errors.slug, staleTime: 10_000 },
  );
  const slugTaken = slugCheck.data?.available === false && debouncedSlug === form.slug;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const touch = (k: keyof Form) => setTouched((t) => new Set(t).add(k));

  const stepValid = (i: number) => STEP_FIELDS[i].every((k) => !errors[k]) && !(i === 0 && slugTaken);

  function next() {
    STEP_FIELDS[step].forEach(touch);
    if (stepValid(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  const plan = plans?.find((p) => p.id === form.planId);

  const input = (k: keyof Form, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <Input
      id={`nc-${k}`}
      value={String(form[k])}
      onChange={(e) => {
        if (k === "slug") setSlugEdited(true);
        set(k, (k === "slug" ? e.target.value.toLowerCase() : e.target.value) as never);
      }}
      // Validasi saat blur hanya jika sudah diisi; field kosong ditandai saat "Lanjut".
      // (Mencegah pesan error menggeser tombol tepat ketika operator mengekliknya.)
      onBlur={() => {
        if (String(form[k]).trim() !== "") touch(k);
      }}
      error={errorFor(k)}
      aria-describedby={errorFor(k) ? `nc-${k}-error` : undefined}
      {...props}
    />
  );

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Klinik", to: "/clinics" }, { label: "Daftarkan klinik" }]}
        title="Daftarkan klinik baru"
        description="Klinik dibuat dalam status trial. Pemilik menerima email undangan untuk membuat password."
      />

      <ol className="mb-6 flex flex-wrap items-center gap-2 text-sm" aria-label="Langkah">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold",
                i < step && "border-accent-primary bg-accent-primary text-white",
                i === step && "border-accent-primary text-accent-primary",
                i > step && "border-border text-text-muted",
              )}
              aria-current={i === step ? "step" : undefined}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={cn(i === step ? "font-medium text-text-primary" : "text-text-muted")}>{label}</span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-border" aria-hidden />}
          </li>
        ))}
      </ol>

      <Card className="max-w-3xl p-6 hover:shadow-card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (step < STEPS.length - 1) return next();
            (Object.keys(FIELD_PATH) as Array<keyof Form>).forEach(touch);
            if (Object.keys(errors).length === 0 && !slugTaken) create.mutate(toParams(form));
          }}
          className="space-y-5"
        >
          {step === 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nama klinik" htmlFor="nc-name" required error={errorFor("name")} className="sm:col-span-2">
                {input("name", { autoFocus: true, placeholder: "Klinik Gigi Sehat Jaya" })}
              </Field>
              <Field
                label="Slug"
                htmlFor="nc-slug"
                required
                error={errorFor("slug") ?? (slugTaken ? "Slug sudah dipakai klinik lain" : undefined)}
                hint={
                  <span className="flex items-center gap-1">
                    {slugCheck.isFetching ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : slugCheck.data?.available ? (
                      <CheckCircle2 className="h-3 w-3 text-[var(--color-success)]" />
                    ) : null}
                    Pengenal unik (huruf kecil, angka, tanda hubung).
                  </span>
                }
                className="sm:col-span-2"
              >
                {input("slug", { className: "font-mono" })}
              </Field>
              <Field label="Telepon klinik" htmlFor="nc-phone" error={errorFor("phone")}>
                {input("phone", { inputMode: "tel", placeholder: "021-555-1234" })}
              </Field>
              <Field label="Email klinik" htmlFor="nc-email" error={errorFor("email")}>
                {input("email", { type: "email" })}
              </Field>
              <Field label="Alamat" htmlFor="nc-address" error={errorFor("address")} className="sm:col-span-2">
                {input("address")}
              </Field>
              <Field label="Kota / Kabupaten" htmlFor="nc-city" error={errorFor("city")}>
                {input("city")}
              </Field>
              <Field label="Provinsi" htmlFor="nc-province" error={errorFor("province")}>
                {input("province")}
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <p className="text-sm text-text-muted sm:col-span-2">
                Pemilik menjadi <strong>Admin Klinik</strong> pertama. Gunakan email yang belum pernah terdaftar di Dentiva.
              </p>
              <Field label="Nama lengkap pemilik" htmlFor="nc-ownerName" required error={errorFor("ownerName")} className="sm:col-span-2">
                {input("ownerName", { autoFocus: true, placeholder: "drg. Nama Lengkap" })}
              </Field>
              <Field label="Email pemilik" htmlFor="nc-ownerEmail" required error={errorFor("ownerEmail")}>
                {input("ownerEmail", { type: "email", autoComplete: "off" })}
              </Field>
              <Field label="Telepon pemilik" htmlFor="nc-ownerPhone" error={errorFor("ownerPhone")}>
                {input("ownerPhone", { inputMode: "tel" })}
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-text-primary">Paket</legend>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {plans?.map((p) => (
                    <label
                      key={p.id}
                      className={cn(
                        "cursor-pointer rounded-xl border p-4 transition-colors",
                        form.planId === p.id ? "border-accent-primary ring-2 ring-accent-primary/20" : "border-border hover:bg-background",
                      )}
                    >
                      <input
                        type="radio"
                        name="plan"
                        value={p.id}
                        checked={form.planId === p.id}
                        onChange={() => set("planId", p.id)}
                        className="sr-only"
                      />
                      <p className="font-semibold text-text-primary">{p.name}</p>
                      <p className="mt-1 text-sm tabular-nums text-text-primary">{formatRupiah(p.price_monthly)}<span className="text-text-muted">/bulan</span></p>
                      <p className="mt-2 text-xs text-text-muted">
                        {formatNumber(p.max_users)} user · {formatNumber(p.max_patients)} pasien
                      </p>
                    </label>
                  ))}
                </div>
                {errorFor("planId") && <p className="mt-1 text-xs text-[var(--color-danger)]">{errorFor("planId")}</p>}
              </fieldset>
              <Field
                label="Masa trial (hari)"
                htmlFor="nc-trialDays"
                error={errorFor("trialDays")}
                hint={
                  form.trialDays > 0
                    ? `Trial berakhir ${formatDate(addDays(todayWib(), form.trialDays))}. Isi 0 untuk langsung aktif (tanpa trial).`
                    : "Klinik langsung aktif tanpa trial; buat invoice dari menu Langganan & Keuangan."
                }
              >
                <Input
                  id="nc-trialDays"
                  type="number"
                  min={0}
                  max={90}
                  value={form.trialDays}
                  onChange={(e) => set("trialDays", Math.max(0, Math.min(90, Number(e.target.value) || 0)))}
                  className="w-32"
                />
              </Field>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="mb-3 text-sm font-semibold text-text-primary">Klinik</h2>
                <DescriptionList
                  items={[
                    { label: "Nama", value: form.name },
                    { label: "Slug", value: <span className="font-mono">{form.slug}</span> },
                    { label: "Telepon", value: form.phone || "—" },
                    { label: "Email", value: form.email || "—" },
                    { label: "Alamat", value: [form.address, form.city, form.province].filter(Boolean).join(", ") || "—" },
                  ]}
                />
              </div>
              <div className="border-t border-border pt-5">
                <h2 className="mb-3 text-sm font-semibold text-text-primary">Pemilik</h2>
                <DescriptionList
                  items={[
                    { label: "Nama", value: form.ownerName },
                    { label: "Email (menerima undangan)", value: form.ownerEmail },
                    { label: "Telepon", value: form.ownerPhone || "—" },
                  ]}
                />
              </div>
              <div className="border-t border-border pt-5">
                <h2 className="mb-3 text-sm font-semibold text-text-primary">Langganan</h2>
                <DescriptionList
                  items={[
                    { label: "Paket", value: plan ? `${plan.name} (${formatRupiah(plan.price_monthly)}/bulan)` : "—" },
                    { label: "Trial", value: form.trialDays > 0 ? `${form.trialDays} hari` : "Tanpa trial (langsung aktif)" },
                  ]}
                />
              </div>
              {create.error && create.error.code !== "invalid_params" && (
                <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm">
                  <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-danger)]" />
                  <span>{create.error.message}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border pt-5">
            <Button type="button" variant="ghost" onClick={() => (step === 0 ? navigate("/clinics") : setStep((s) => s - 1))}>
              {step === 0 ? "Batal" : "Kembali"}
            </Button>
            <Button type="submit" isLoading={create.isPending}>
              {step < STEPS.length - 1 ? "Lanjut" : "Daftarkan klinik & kirim undangan"}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
