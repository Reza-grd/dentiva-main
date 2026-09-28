/**
 * ⚠️ PLACEHOLDER — ditulis tangan dari migration 20260928000100–700.
 *
 * Setelah proyek di-link (`supabase link --project-ref <ref>`) dan migration
 * dijalankan, GANTI file ini dengan hasil generate:
 *
 *     npm run db:types
 *
 * Hanya tabel/fungsi yang disentuh Dentiva Console & alur akun klinik yang
 * dicantumkan di sini. Hasil generate akan mencakup seluruh skema.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type ClinicStatus = "pending" | "trial" | "active" | "suspended" | "closed";
type UserStatus = "invited" | "active" | "suspended" | "deactivated";

export interface Database {
  public: {
    Tables: {
      clinics: {
        Row: {
          id: string;
          name: string;
          slug: string;
          status: ClinicStatus;
          owner_user_id: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          city: string | null;
          province: string | null;
          trial_ends_at: string | null;
          activated_at: string | null;
          suspended_at: string | null;
          suspended_reason: string | null;
          closed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: "admin" | "dokter" | "resepsionis";
          clinic_id: string;
          status: UserStatus;
          is_active: boolean | null;
          last_login_at: string | null;
          invited_by: string | null;
          phone: string | null;
          avatar_url: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["users"]["Row"]> &
          Pick<Database["public"]["Tables"]["users"]["Row"], "id" | "email" | "full_name" | "role">;
        Update: Partial<Database["public"]["Tables"]["users"]["Row"]>;
        Relationships: [];
      };
      subscription_plans: {
        Row: {
          id: string;
          name: string;
          price_monthly: number;
          price_yearly: number;
          max_users: number;
          max_patients: number;
          features: Json;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      clinic_subscriptions: {
        Row: {
          id: string;
          clinic_id: string;
          plan_id: string;
          status: "trialing" | "active" | "past_due" | "canceled";
          billing_cycle: "monthly" | "yearly";
          current_period_start: string;
          current_period_end: string;
          cancel_at_period_end: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_my_account_status: {
        Args: Record<string, never>;
        Returns: {
          user_id: string;
          user_status: UserStatus;
          role: string;
          clinic_id: string;
          clinic_name: string;
          clinic_status: ClinicStatus;
          suspended_reason: string | null;
          trial_ends_at: string | null;
          has_access: boolean;
        }[];
      };
      record_login: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      get_active_announcements: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          title: string;
          body: string;
          severity: "info" | "warning" | "critical";
          starts_at: string;
          ends_at: string | null;
        }[];
      };
      get_user_clinic_id: { Args: Record<string, never>; Returns: string | null };
      get_user_role: { Args: Record<string, never>; Returns: string | null };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
