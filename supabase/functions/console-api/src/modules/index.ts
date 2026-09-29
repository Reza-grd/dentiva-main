/**
 * Registry handler. Menambah aksi baru = satu entri di contract/actions.ts
 * + satu handler di sini. Tipe HandlerRegistry memaksa setiap aksi punya handler.
 */
import type { AnySql } from "../db.ts";
import type { HandlerRegistry } from "../types.ts";
import * as announcements from "./announcements.ts";
import * as audit from "./audit.ts";
import * as billing from "./billing.ts";
import * as clinics from "./clinics.ts";
import * as dashboard from "./dashboard.ts";
import * as operators from "./operators.ts";
import * as usage from "./usage.ts";
import * as users from "./users.ts";

export const handlers: HandlerRegistry<AnySql> = {
  "operators.me": operators.me,
  "operators.list": operators.list,
  "operators.invite": operators.invite,
  "operators.update": operators.update,

  "dashboard.summary": dashboard.summary,

  "clinics.list": clinics.list,
  "clinics.get": clinics.get,
  "clinics.checkSlug": clinics.checkSlug,
  "clinics.create": clinics.create,
  "clinics.update": clinics.update,
  "clinics.approve": clinics.approve,
  "clinics.activate": clinics.activate,
  "clinics.suspend": clinics.suspend,
  "clinics.close": clinics.close,
  "clinics.extendTrial": clinics.extendTrial,
  "clinics.changePlan": clinics.changePlan,
  "clinics.notes.list": clinics.notesList,
  "clinics.notes.add": clinics.notesAdd,

  "users.list": users.list,
  "users.setStatus": users.setStatus,
  "users.resendInvite": users.resendInvite,
  "users.sendPasswordReset": users.sendPasswordReset,

  "billing.plans.list": billing.plansList,
  "billing.plans.update": billing.plansUpdate,
  "billing.subscriptions.list": billing.subscriptionsList,
  "billing.invoices.list": billing.invoicesList,
  "billing.invoices.create": billing.invoicesCreate,
  "billing.invoices.void": billing.invoicesVoid,
  "billing.payments.list": billing.paymentsList,
  "billing.payments.confirmManual": billing.paymentsConfirmManual,

  "usage.clinic": usage.clinic,
  "usage.overview": usage.overview,

  "audit.list": audit.list,

  "announcements.list": announcements.list,
  "announcements.upsert": announcements.upsert,
  "announcements.end": announcements.end,
};
