export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  platform: {
    Tables: {
      announcements: {
        Row: {
          audience: string
          body: string
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          severity: string
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          body: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          severity?: string
          starts_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          body?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          severity?: string
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["user_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          after: Json | null
          before: Json | null
          clinic_id: string | null
          created_at: string
          id: string
          ip: unknown
          operator_id: string | null
          reason: string | null
          request_id: string | null
          target_id: string | null
          target_type: string
          user_agent: string | null
        }
        Insert: {
          action: string
          after?: Json | null
          before?: Json | null
          clinic_id?: string | null
          created_at?: string
          id?: string
          ip?: unknown
          operator_id?: string | null
          reason?: string | null
          request_id?: string | null
          target_id?: string | null
          target_type: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          after?: Json | null
          before?: Json | null
          clinic_id?: string | null
          created_at?: string
          id?: string
          ip?: unknown
          operator_id?: string | null
          reason?: string | null
          request_id?: string | null
          target_id?: string | null
          target_type?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["user_id"]
          },
        ]
      }
      clinic_notes: {
        Row: {
          body: string
          clinic_id: string
          created_at: string
          id: string
          operator_id: string | null
        }
        Insert: {
          body: string
          clinic_id: string
          created_at?: string
          id?: string
          operator_id?: string | null
        }
        Update: {
          body?: string
          clinic_id?: string
          created_at?: string
          id?: string
          operator_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_notes_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_notes_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["user_id"]
          },
        ]
      }
      invoice_counters: {
        Row: {
          last: number
          year: number
        }
        Insert: {
          last?: number
          year: number
        }
        Update: {
          last?: number
          year?: number
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_idr: number
          clinic_id: string
          created_at: string
          created_by: string | null
          due_date: string
          id: string
          notes: string | null
          number: string
          paid_at: string | null
          period_end: string
          period_start: string
          source: string
          status: string
          tax_idr: number
          total_idr: number | null
          updated_at: string
          void_reason: string | null
          voided_at: string | null
        }
        Insert: {
          amount_idr: number
          clinic_id: string
          created_at?: string
          created_by?: string | null
          due_date: string
          id?: string
          notes?: string | null
          number: string
          paid_at?: string | null
          period_end: string
          period_start: string
          source?: string
          status?: string
          tax_idr?: number
          total_idr?: number | null
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Update: {
          amount_idr?: number
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          due_date?: string
          id?: string
          notes?: string | null
          number?: string
          paid_at?: string | null
          period_end?: string
          period_start?: string
          source?: string
          status?: string
          tax_idr?: number
          total_idr?: number | null
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["user_id"]
          },
        ]
      }
      operators: {
        Row: {
          created_at: string
          full_name: string
          invited_by: string | null
          is_active: boolean
          last_login_at: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          invited_by?: string | null
          is_active?: boolean
          last_login_at?: string | null
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          invited_by?: string | null
          is_active?: boolean
          last_login_at?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operators_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["user_id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_idr: number
          clinic_id: string
          confirmed_by: string | null
          created_at: string
          id: string
          invoice_id: string | null
          metadata: Json
          notes: string | null
          paid_at: string | null
          provider: string
          provider_ref: string | null
          raw: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_idr: number
          clinic_id: string
          confirmed_by?: string | null
          created_at?: string
          id?: string
          invoice_id?: string | null
          metadata?: Json
          notes?: string | null
          paid_at?: string | null
          provider: string
          provider_ref?: string | null
          raw?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_idr?: number
          clinic_id?: string
          confirmed_by?: string | null
          created_at?: string
          id?: string
          invoice_id?: string | null
          metadata?: Json
          notes?: string | null
          paid_at?: string | null
          provider?: string
          provider_ref?: string | null
          raw?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_daily: {
        Row: {
          active_users: number
          clinic_id: string
          collected_at: string
          date: string
          patients_total: number
          satusehat_errors: number
          storage_bytes: number
          visits_count: number
          wa_sent: number
        }
        Insert: {
          active_users?: number
          clinic_id: string
          collected_at?: string
          date: string
          patients_total?: number
          satusehat_errors?: number
          storage_bytes?: number
          visits_count?: number
          wa_sent?: number
        }
        Update: {
          active_users?: number
          clinic_id?: string
          collected_at?: string
          date?: string
          patients_total?: number
          satusehat_errors?: number
          storage_bytes?: number
          visits_count?: number
          wa_sent?: number
        }
        Relationships: [
          {
            foreignKeyName: "usage_daily_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_overview"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      clinic_overview: {
        Row: {
          activated_at: string | null
          active_users: number | null
          billing_cycle: string | null
          city: string | null
          created_at: string | null
          current_period_end: string | null
          email: string | null
          id: string | null
          last_activity_at: string | null
          max_patients: number | null
          max_users: number | null
          name: string | null
          patients_total: number | null
          phone: string | null
          plan_id: string | null
          plan_name: string | null
          price_monthly: number | null
          price_yearly: number | null
          province: string | null
          satusehat_errors: number | null
          slug: string | null
          status: string | null
          storage_bytes: number | null
          subscription_id: string | null
          subscription_status: string | null
          suspended_at: string | null
          trial_ends_at: string | null
          usage_date: string | null
          users_count: number | null
          visits_count: number | null
          wa_sent: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      clinic_health: { Args: { p_limit?: number }; Returns: Json }
      collect_usage_daily: { Args: { p_date?: string }; Returns: number }
      confirm_manual_payment: {
        Args: {
          p_amount_idr: number
          p_invoice_id: string
          p_notes: string
          p_operator_id: string
          p_paid_at: string
          p_reference: string
        }
        Returns: {
          invoice_status: string
          payment_id: string
        }[]
      }
      create_invoice: {
        Args: {
          p_amount_idr: number
          p_clinic_id: string
          p_due_date: string
          p_notes: string
          p_operator_id: string
          p_period_end: string
          p_period_start: string
          p_source?: string
          p_tax_idr: number
        }
        Returns: {
          amount_idr: number
          clinic_id: string
          created_at: string
          created_by: string | null
          due_date: string
          id: string
          notes: string | null
          number: string
          paid_at: string | null
          period_end: string
          period_start: string
          source: string
          status: string
          tax_idr: number
          total_idr: number | null
          updated_at: string
          void_reason: string | null
          voided_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      dashboard_summary: { Args: { p_churn_days?: number }; Returns: Json }
      legacy_clinic_id: { Args: never; Returns: string }
      make_unique_per_clinic: {
        Args: { p_column: string; p_table: string }
        Returns: undefined
      }
      mark_overdue_invoices: { Args: never; Returns: number }
      next_invoice_number: { Args: { p_at?: string }; Returns: string }
      provision_clinic: {
        Args: {
          p_address: string
          p_city: string
          p_email: string
          p_name: string
          p_operator_id: string
          p_owner_email: string
          p_owner_name: string
          p_owner_phone: string
          p_owner_user_id: string
          p_phone: string
          p_plan_id: string
          p_province: string
          p_slug: string
          p_trial_days: number
        }
        Returns: string
      }
      register_midtrans_order: {
        Args: {
          p_billing_cycle: string
          p_clinic_id: string
          p_order_id: string
          p_plan_id: string
        }
        Returns: {
          amount_idr: number
          invoice_id: string
          payment_id: string
          plan_name: string
        }[]
      }
      revoke_user_sessions: { Args: { p_user_id: string }; Returns: number }
      rls_consolidate: { Args: never; Returns: number }
      settle_midtrans_order: {
        Args: {
          p_gross_amount: number
          p_order_id: string
          p_outcome: string
          p_raw: Json
        }
        Returns: string
      }
      wrap_policy_expr: { Args: { expr: string }; Returns: string }
      write_audit: {
        Args: {
          p_action: string
          p_after: Json
          p_before: Json
          p_clinic_id: string
          p_ip: string
          p_operator_id: string
          p_reason: string
          p_request_id: string
          p_target_id: string
          p_target_type: string
          p_user_agent: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_feedback: {
        Row: {
          clinic_id: string
          correct: boolean
          created_at: string
          id: string
          note: string | null
          usage_id: string | null
          user_id: string | null
        }
        Insert: {
          clinic_id: string
          correct: boolean
          created_at?: string
          id?: string
          note?: string | null
          usage_id?: string | null
          user_id?: string | null
        }
        Update: {
          clinic_id?: string
          correct?: boolean
          created_at?: string
          id?: string
          note?: string | null
          usage_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_feedback_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_feedback_usage_id_fkey"
            columns: ["usage_id"]
            isOneToOne: false
            referencedRelation: "ai_usage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insights: {
        Row: {
          clinic_id: string
          content: Json
          generated_at: string
          generated_by: string | null
          id: string
          kind: string
          model: string | null
        }
        Insert: {
          clinic_id: string
          content: Json
          generated_at?: string
          generated_by?: string | null
          id?: string
          kind?: string
          model?: string | null
        }
        Update: {
          clinic_id?: string
          content?: Json
          generated_at?: string
          generated_by?: string | null
          id?: string
          kind?: string
          model?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_insights_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_knowledge: {
        Row: {
          answer: string
          clinic_id: string
          created_at: string
          data_fingerprint: string | null
          hit_count: number
          id: string
          kind: string
          last_used_at: string | null
          question: string
          question_norm: string
          source_usage_id: string | null
          tools_used: string[]
          updated_at: string
          verified_by: string | null
        }
        Insert: {
          answer: string
          clinic_id: string
          created_at?: string
          data_fingerprint?: string | null
          hit_count?: number
          id?: string
          kind?: string
          last_used_at?: string | null
          question: string
          question_norm: string
          source_usage_id?: string | null
          tools_used?: string[]
          updated_at?: string
          verified_by?: string | null
        }
        Update: {
          answer?: string
          clinic_id?: string
          created_at?: string
          data_fingerprint?: string | null
          hit_count?: number
          id?: string
          kind?: string
          last_used_at?: string | null
          question?: string
          question_norm?: string
          source_usage_id?: string | null
          tools_used?: string[]
          updated_at?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_knowledge_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_knowledge_source_usage_id_fkey"
            columns: ["source_usage_id"]
            isOneToOne: false
            referencedRelation: "ai_usage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_knowledge_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage: {
        Row: {
          answer: string | null
          cache_read_tokens: number
          cache_write_tokens: number
          clinic_id: string
          cost_usd: number
          created_at: string
          data_fingerprint: string | null
          feature: string
          id: string
          input_tokens: number
          model: string
          output_tokens: number
          question: string | null
          question_norm: string | null
          status: string
          tools_used: string[]
          user_id: string | null
        }
        Insert: {
          answer?: string | null
          cache_read_tokens?: number
          cache_write_tokens?: number
          clinic_id: string
          cost_usd?: number
          created_at?: string
          data_fingerprint?: string | null
          feature?: string
          id?: string
          input_tokens?: number
          model: string
          output_tokens?: number
          question?: string | null
          question_norm?: string | null
          status?: string
          tools_used?: string[]
          user_id?: string | null
        }
        Update: {
          answer?: string | null
          cache_read_tokens?: number
          cache_write_tokens?: number
          clinic_id?: string
          cost_usd?: number
          created_at?: string
          data_fingerprint?: string | null
          feature?: string
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
          question?: string | null
          question_norm?: string | null
          status?: string
          tools_used?: string[]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          clinic_id: string
          id: string
          ip_address: string | null
          module: string
          new_value: Json | null
          patient_id: string | null
          previous_value: Json | null
          risk_level: string | null
          session_id: string | null
          timestamp: string
          user_agent: string | null
          user_id: string | null
          user_role: string | null
          visit_id: string | null
        }
        Insert: {
          action: string
          clinic_id: string
          id?: string
          ip_address?: string | null
          module: string
          new_value?: Json | null
          patient_id?: string | null
          previous_value?: Json | null
          risk_level?: string | null
          session_id?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
          user_role?: string | null
          visit_id?: string | null
        }
        Update: {
          action?: string
          clinic_id?: string
          id?: string
          ip_address?: string | null
          module?: string
          new_value?: Json | null
          patient_id?: string | null
          previous_value?: Json | null
          risk_level?: string | null
          session_id?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
          user_role?: string | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "v_patient_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_requests: {
        Row: {
          clinic_id: string
          complaint: string | null
          created_at: string
          dokter_id: string | null
          handled_at: string | null
          handled_by: string | null
          id: string
          note: string | null
          patient_name: string
          patient_phone: string
          phone_hash: string
          reference_code: string
          requested_date: string
          requested_time: string
          status: string
        }
        Insert: {
          clinic_id: string
          complaint?: string | null
          created_at?: string
          dokter_id?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          note?: string | null
          patient_name: string
          patient_phone: string
          phone_hash: string
          reference_code: string
          requested_date: string
          requested_time: string
          status?: string
        }
        Update: {
          clinic_id?: string
          complaint?: string | null
          created_at?: string
          dokter_id?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          note?: string | null
          patient_name?: string
          patient_phone?: string
          phone_hash?: string
          reference_code?: string
          requested_date?: string
          requested_time?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_dokter_id_fkey"
            columns: ["dokter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_rm_counters: {
        Row: {
          clinic_id: string
          last_value: number
        }
        Insert: {
          clinic_id: string
          last_value?: number
        }
        Update: {
          clinic_id?: string
          last_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "clinic_rm_counters_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_settings: {
        Row: {
          clinic_id: string
          id: string
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          clinic_id: string
          id?: string
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          clinic_id?: string
          id?: string
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_subscriptions: {
        Row: {
          billing_cycle: string
          cancel_at_period_end: boolean | null
          clinic_id: string
          created_at: string | null
          current_period_end: string
          current_period_start: string
          id: string
          plan_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          billing_cycle?: string
          cancel_at_period_end?: boolean | null
          clinic_id: string
          created_at?: string | null
          current_period_end: string
          current_period_start?: string
          id?: string
          plan_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_cycle?: string
          cancel_at_period_end?: boolean | null
          clinic_id?: string
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_clinic_subscriptions_clinic"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_data: {
        Row: {
          clinic_id: string
          created_at: string | null
          diagnosis_additional_notes: string | null
          diagnosis_list: Json | null
          diastema: string | null
          gigi_anomali: string | null
          id: string
          lain_lain: string | null
          oklusi: string | null
          palatum: string | null
          patient_id: string | null
          supernumery_teeth: string | null
          tanggal_pencatatan: string | null
          torus_mandibularis: string | null
          torus_palatinus: string | null
          total_treatment_cost: number | null
          treatment_list: Json | null
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          diagnosis_additional_notes?: string | null
          diagnosis_list?: Json | null
          diastema?: string | null
          gigi_anomali?: string | null
          id?: string
          lain_lain?: string | null
          oklusi?: string | null
          palatum?: string | null
          patient_id?: string | null
          supernumery_teeth?: string | null
          tanggal_pencatatan?: string | null
          torus_mandibularis?: string | null
          torus_palatinus?: string | null
          total_treatment_cost?: number | null
          treatment_list?: Json | null
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          diagnosis_additional_notes?: string | null
          diagnosis_list?: Json | null
          diastema?: string | null
          gigi_anomali?: string | null
          id?: string
          lain_lain?: string | null
          oklusi?: string | null
          palatum?: string | null
          patient_id?: string | null
          supernumery_teeth?: string | null
          tanggal_pencatatan?: string | null
          torus_mandibularis?: string | null
          torus_palatinus?: string | null
          total_treatment_cost?: number | null
          treatment_list?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_data_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_data_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_data_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "v_patient_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          activated_at: string | null
          address: string | null
          city: string | null
          closed_at: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          owner_user_id: string | null
          phone: string | null
          province: string | null
          slug: string
          status: string
          suspended_at: string | null
          suspended_reason: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          address?: string | null
          city?: string | null
          closed_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          owner_user_id?: string | null
          phone?: string | null
          province?: string | null
          slug: string
          status?: string
          suspended_at?: string | null
          suspended_reason?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          address?: string | null
          city?: string | null
          closed_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          owner_user_id?: string | null
          phone?: string | null
          province?: string | null
          slug?: string
          status?: string
          suspended_at?: string | null
          suspended_reason?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      data_subject_requests: {
        Row: {
          clinic_id: string
          created_at: string | null
          handled_by: string | null
          id: string
          notes: string | null
          patient_id: string
          request_type: string
          requested_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          handled_by?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          request_type: string
          requested_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          handled_by?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          request_type?: string
          requested_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_subject_requests_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_subject_requests_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_subject_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_subject_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "v_patient_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_schedules: {
        Row: {
          clinic_id: string
          created_at: string
          dokter_id: string
          hari: number
          id: string
          is_active: boolean
          jam_mulai: string
          jam_selesai: string
          kapasitas_pasien_per_hari: number | null
          keterangan: string | null
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          dokter_id: string
          hari: number
          id?: string
          is_active?: boolean
          jam_mulai: string
          jam_selesai: string
          kapasitas_pasien_per_hari?: number | null
          keterangan?: string | null
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          dokter_id?: string
          hari?: number
          id?: string
          is_active?: boolean
          jam_mulai?: string
          jam_selesai?: string
          kapasitas_pasien_per_hari?: number | null
          keterangan?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_schedules_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_schedules_dokter_id_fkey"
            columns: ["dokter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          bukti_url: string | null
          clinic_id: string
          created_at: string | null
          deskripsi: string
          id: string
          jumlah: number
          kategori: string
          nomor_nota: string | null
          pemasok: string | null
          recorded_by: string | null
          sumber: string
          tanggal_expense: string
          updated_at: string | null
        }
        Insert: {
          bukti_url?: string | null
          clinic_id: string
          created_at?: string | null
          deskripsi: string
          id?: string
          jumlah: number
          kategori: string
          nomor_nota?: string | null
          pemasok?: string | null
          recorded_by?: string | null
          sumber?: string
          tanggal_expense?: string
          updated_at?: string | null
        }
        Update: {
          bukti_url?: string | null
          clinic_id?: string
          created_at?: string | null
          deskripsi?: string
          id?: string
          jumlah?: number
          kategori?: string
          nomor_nota?: string | null
          pemasok?: string | null
          recorded_by?: string | null
          sumber?: string
          tanggal_expense?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      extra_oral_data: {
        Row: {
          bibir: string | null
          bibir_keterangan: string | null
          clinic_id: string
          created_at: string | null
          id: string
          kebiasaan_buruk: string | null
          kelenjar_getah_bening: string | null
          kelenjar_lainnya: string | null
          keterangan: string | null
          kgb_kanan: string | null
          kgb_kanan_sakit: string | null
          kgb_kiri: string | null
          kgb_kiri_sakit: string | null
          otot_pengunyahan: string | null
          patient_id: string | null
          pipi: string | null
          riwayat_perawatan: string | null
          riwayat_perawatan_keterangan: string | null
          riwayat_sosial: string | null
          temporomandibular: string | null
          updated_at: string | null
          wajah: string | null
        }
        Insert: {
          bibir?: string | null
          bibir_keterangan?: string | null
          clinic_id: string
          created_at?: string | null
          id?: string
          kebiasaan_buruk?: string | null
          kelenjar_getah_bening?: string | null
          kelenjar_lainnya?: string | null
          keterangan?: string | null
          kgb_kanan?: string | null
          kgb_kanan_sakit?: string | null
          kgb_kiri?: string | null
          kgb_kiri_sakit?: string | null
          otot_pengunyahan?: string | null
          patient_id?: string | null
          pipi?: string | null
          riwayat_perawatan?: string | null
          riwayat_perawatan_keterangan?: string | null
          riwayat_sosial?: string | null
          temporomandibular?: string | null
          updated_at?: string | null
          wajah?: string | null
        }
        Update: {
          bibir?: string | null
          bibir_keterangan?: string | null
          clinic_id?: string
          created_at?: string | null
          id?: string
          kebiasaan_buruk?: string | null
          kelenjar_getah_bening?: string | null
          kelenjar_lainnya?: string | null
          keterangan?: string | null
          kgb_kanan?: string | null
          kgb_kanan_sakit?: string | null
          kgb_kiri?: string | null
          kgb_kiri_sakit?: string | null
          otot_pengunyahan?: string | null
          patient_id?: string | null
          pipi?: string | null
          riwayat_perawatan?: string | null
          riwayat_perawatan_keterangan?: string | null
          riwayat_sosial?: string | null
          temporomandibular?: string | null
          updated_at?: string | null
          wajah?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extra_oral_data_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extra_oral_data_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extra_oral_data_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "v_patient_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_reports: {
        Row: {
          clinic_id: string
          generated_at: string | null
          generated_by: string | null
          id: string
          net_income: number | null
          report_date: string
          report_type: string | null
          total_expenses: number | null
          total_patients: number | null
          total_revenue: number | null
          total_visits: number | null
        }
        Insert: {
          clinic_id: string
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          net_income?: number | null
          report_date: string
          report_type?: string | null
          total_expenses?: number | null
          total_patients?: number | null
          total_revenue?: number | null
          total_visits?: number | null
        }
        Update: {
          clinic_id?: string
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          net_income?: number | null
          report_date?: string
          report_type?: string | null
          total_expenses?: number | null
          total_patients?: number | null
          total_revenue?: number | null
          total_visits?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_reports_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      informed_consents: {
        Row: {
          clinic_id: string
          created_at: string
          doctor_name: string
          id: string
          patient_id: string
          patient_name: string
          signature_data: string
          title: string
          treatment_type: string
          visit_id: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string
          doctor_name: string
          id?: string
          patient_id: string
          patient_name: string
          signature_data: string
          title: string
          treatment_type: string
          visit_id?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string
          doctor_name?: string
          id?: string
          patient_id?: string
          patient_name?: string
          signature_data?: string
          title?: string
          treatment_type?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "informed_consents_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "informed_consents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "informed_consents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "v_patient_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "informed_consents_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      intra_oral_data: {
        Row: {
          clinic_id: string
          created_at: string | null
          dasar_mulut: string | null
          dasar_mulut_keterangan: string | null
          debri: string | null
          debri_regio: string | null
          gingiva: string | null
          gingiva_keterangan: string | null
          hubungan_rahang: string | null
          id: string
          kalkulus: string | null
          kalkulus_regio: string | null
          kelainan_gigi_geligi: string | null
          kelainan_gigi_geligi_keterangan: string | null
          lain_lain: string | null
          lidah: string | null
          lidah_keterangan: string | null
          mukosa: string | null
          mukosa_keterangan: string | null
          palatum: string | null
          palatum_keterangan: string | null
          patient_id: string | null
          perdarahan_papila: string | null
          perdarahan_papila_regio: string | null
          ph_plak: string | null
          ph_plak_tinggi: boolean | null
          ph_saliva: string | null
          ph_saliva_tinggi: boolean | null
          plak: string | null
          plak_regio: string | null
          risiko_karies: string | null
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          dasar_mulut?: string | null
          dasar_mulut_keterangan?: string | null
          debri?: string | null
          debri_regio?: string | null
          gingiva?: string | null
          gingiva_keterangan?: string | null
          hubungan_rahang?: string | null
          id?: string
          kalkulus?: string | null
          kalkulus_regio?: string | null
          kelainan_gigi_geligi?: string | null
          kelainan_gigi_geligi_keterangan?: string | null
          lain_lain?: string | null
          lidah?: string | null
          lidah_keterangan?: string | null
          mukosa?: string | null
          mukosa_keterangan?: string | null
          palatum?: string | null
          palatum_keterangan?: string | null
          patient_id?: string | null
          perdarahan_papila?: string | null
          perdarahan_papila_regio?: string | null
          ph_plak?: string | null
          ph_plak_tinggi?: boolean | null
          ph_saliva?: string | null
          ph_saliva_tinggi?: boolean | null
          plak?: string | null
          plak_regio?: string | null
          risiko_karies?: string | null
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          dasar_mulut?: string | null
          dasar_mulut_keterangan?: string | null
          debri?: string | null
          debri_regio?: string | null
          gingiva?: string | null
          gingiva_keterangan?: string | null
          hubungan_rahang?: string | null
          id?: string
          kalkulus?: string | null
          kalkulus_regio?: string | null
          kelainan_gigi_geligi?: string | null
          kelainan_gigi_geligi_keterangan?: string | null
          lain_lain?: string | null
          lidah?: string | null
          lidah_keterangan?: string | null
          mukosa?: string | null
          mukosa_keterangan?: string | null
          palatum?: string | null
          palatum_keterangan?: string | null
          patient_id?: string | null
          perdarahan_papila?: string | null
          perdarahan_papila_regio?: string | null
          ph_plak?: string | null
          ph_plak_tinggi?: boolean | null
          ph_saliva?: string | null
          ph_saliva_tinggi?: boolean | null
          plak?: string | null
          plak_regio?: string | null
          risiko_karies?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intra_oral_data_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intra_oral_data_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intra_oral_data_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "v_patient_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_counters: {
        Row: {
          clinic_id: string
          last_number: number | null
          month_key: string
        }
        Insert: {
          clinic_id: string
          last_number?: number | null
          month_key: string
        }
        Update: {
          clinic_id?: string
          last_number?: number | null
          month_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_counters_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      master_bahan: {
        Row: {
          clinic_id: string
          created_at: string | null
          dosis_default: string | null
          education_text: string | null
          faktor_konversi: number | null
          frekuensi_default: string | null
          harga_rata2: number
          id: string
          is_active: boolean | null
          kategori: string | null
          kfa_bentuk_sediaan_nama: string | null
          kfa_nama: string | null
          kfa_verified_at: string | null
          kode_bahan: string
          kode_bentuk_sediaan: string | null
          kode_kfa: string | null
          nama_bahan: string
          satuan_beli: string | null
          satuan_dasar: string
          stok_minimum: number | null
          stok_saat_ini: number
          supplier: string | null
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          dosis_default?: string | null
          education_text?: string | null
          faktor_konversi?: number | null
          frekuensi_default?: string | null
          harga_rata2?: number
          id?: string
          is_active?: boolean | null
          kategori?: string | null
          kfa_bentuk_sediaan_nama?: string | null
          kfa_nama?: string | null
          kfa_verified_at?: string | null
          kode_bahan: string
          kode_bentuk_sediaan?: string | null
          kode_kfa?: string | null
          nama_bahan: string
          satuan_beli?: string | null
          satuan_dasar: string
          stok_minimum?: number | null
          stok_saat_ini?: number
          supplier?: string | null
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          dosis_default?: string | null
          education_text?: string | null
          faktor_konversi?: number | null
          frekuensi_default?: string | null
          harga_rata2?: number
          id?: string
          is_active?: boolean | null
          kategori?: string | null
          kfa_bentuk_sediaan_nama?: string | null
          kfa_nama?: string | null
          kfa_verified_at?: string | null
          kode_bahan?: string
          kode_bentuk_sediaan?: string | null
          kode_kfa?: string | null
          nama_bahan?: string
          satuan_beli?: string | null
          satuan_dasar?: string
          stok_minimum?: number | null
          stok_saat_ini?: number
          supplier?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "master_bahan_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      master_obat: {
        Row: {
          clinic_id: string
          created_at: string | null
          dosis_default: string | null
          education_text: string | null
          frekuensi_default: string | null
          harga_satuan: number
          id: string
          is_active: boolean | null
          kode_kfa: string | null
          nama_obat: string
          satuan: string
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          dosis_default?: string | null
          education_text?: string | null
          frekuensi_default?: string | null
          harga_satuan?: number
          id?: string
          is_active?: boolean | null
          kode_kfa?: string | null
          nama_obat: string
          satuan?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          dosis_default?: string | null
          education_text?: string | null
          frekuensi_default?: string | null
          harga_satuan?: number
          id?: string
          is_active?: boolean | null
          kode_kfa?: string | null
          nama_obat?: string
          satuan?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_obat_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      material_batches: {
        Row: {
          clinic_id: string
          created_at: string | null
          harga_satuan: number
          id: string
          material_id: string
          no_batch: string | null
          qty_awal: number
          qty_sisa: number
          tanggal_kadaluarsa: string | null
          tanggal_masuk: string
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          harga_satuan: number
          id?: string
          material_id: string
          no_batch?: string | null
          qty_awal: number
          qty_sisa: number
          tanggal_kadaluarsa?: string | null
          tanggal_masuk?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          harga_satuan?: number
          id?: string
          material_id?: string
          no_batch?: string | null
          qty_awal?: number
          qty_sisa?: number
          tanggal_kadaluarsa?: string | null
          tanggal_masuk?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_batches_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_batches_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "master_bahan"
            referencedColumns: ["id"]
          },
        ]
      }
      material_purchases: {
        Row: {
          clinic_id: string
          created_at: string | null
          harga_satuan_beli: number
          id: string
          jumlah_beli: number
          jumlah_dasar: number
          material_id: string
          no_faktur: string | null
          recorded_by: string | null
          supplier: string | null
          tanggal: string
          tanggal_kadaluarsa: string | null
          total_harga: number | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          harga_satuan_beli: number
          id?: string
          jumlah_beli: number
          jumlah_dasar: number
          material_id: string
          no_faktur?: string | null
          recorded_by?: string | null
          supplier?: string | null
          tanggal?: string
          tanggal_kadaluarsa?: string | null
          total_harga?: number | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          harga_satuan_beli?: number
          id?: string
          jumlah_beli?: number
          jumlah_dasar?: number
          material_id?: string
          no_faktur?: string | null
          recorded_by?: string | null
          supplier?: string | null
          tanggal?: string
          tanggal_kadaluarsa?: string | null
          total_harga?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "material_purchases_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_purchases_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "master_bahan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_purchases_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_history: {
        Row: {
          alergi: boolean | null
          alergi_detail: string | null
          asam_urat: boolean | null
          asma: boolean | null
          clinic_id: string
          covid19: boolean | null
          created_at: string | null
          diabetes: boolean | null
          epilepsi: boolean | null
          ginjal: boolean | null
          glaukoma: boolean | null
          hemofilia: boolean | null
          hepatitis: boolean | null
          hipertensi: boolean | null
          hiv: boolean | null
          id: string
          jantung: boolean | null
          kanker: boolean | null
          konsumsi_obat: string | null
          osteoporosis: boolean | null
          patient_id: string | null
          reumatik: boolean | null
          riwayat_lain: string | null
          stroke: boolean | null
          thalassemia: boolean | null
          tiroid: boolean | null
          tuberkulosis: boolean | null
          updated_at: string | null
        }
        Insert: {
          alergi?: boolean | null
          alergi_detail?: string | null
          asam_urat?: boolean | null
          asma?: boolean | null
          clinic_id: string
          covid19?: boolean | null
          created_at?: string | null
          diabetes?: boolean | null
          epilepsi?: boolean | null
          ginjal?: boolean | null
          glaukoma?: boolean | null
          hemofilia?: boolean | null
          hepatitis?: boolean | null
          hipertensi?: boolean | null
          hiv?: boolean | null
          id?: string
          jantung?: boolean | null
          kanker?: boolean | null
          konsumsi_obat?: string | null
          osteoporosis?: boolean | null
          patient_id?: string | null
          reumatik?: boolean | null
          riwayat_lain?: string | null
          stroke?: boolean | null
          thalassemia?: boolean | null
          tiroid?: boolean | null
          tuberkulosis?: boolean | null
          updated_at?: string | null
        }
        Update: {
          alergi?: boolean | null
          alergi_detail?: string | null
          asam_urat?: boolean | null
          asma?: boolean | null
          clinic_id?: string
          covid19?: boolean | null
          created_at?: string | null
          diabetes?: boolean | null
          epilepsi?: boolean | null
          ginjal?: boolean | null
          glaukoma?: boolean | null
          hemofilia?: boolean | null
          hepatitis?: boolean | null
          hipertensi?: boolean | null
          hiv?: boolean | null
          id?: string
          jantung?: boolean | null
          kanker?: boolean | null
          konsumsi_obat?: string | null
          osteoporosis?: boolean | null
          patient_id?: string | null
          reumatik?: boolean | null
          riwayat_lain?: string | null
          stroke?: boolean | null
          thalassemia?: boolean | null
          tiroid?: boolean | null
          tuberkulosis?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_history_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_history_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_history_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "v_patient_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_record_versions: {
        Row: {
          catatan_dokter: string | null
          change_summary: string | null
          changed_at: string
          changed_by: string
          clinic_id: string
          diagnosa: string | null
          id: string
          keluhan: string | null
          kode_icd10: string | null
          metadata: Json | null
          new_data: Json | null
          patient_id: string
          pemeriksaan_fisik: string | null
          previous_data: Json | null
          reason: string | null
          restored_from: number | null
          terapi: string | null
          version: number
          visit_id: string
        }
        Insert: {
          catatan_dokter?: string | null
          change_summary?: string | null
          changed_at?: string
          changed_by: string
          clinic_id: string
          diagnosa?: string | null
          id?: string
          keluhan?: string | null
          kode_icd10?: string | null
          metadata?: Json | null
          new_data?: Json | null
          patient_id: string
          pemeriksaan_fisik?: string | null
          previous_data?: Json | null
          reason?: string | null
          restored_from?: number | null
          terapi?: string | null
          version: number
          visit_id: string
        }
        Update: {
          catatan_dokter?: string | null
          change_summary?: string | null
          changed_at?: string
          changed_by?: string
          clinic_id?: string
          diagnosa?: string | null
          id?: string
          keluhan?: string | null
          kode_icd10?: string | null
          metadata?: Json | null
          new_data?: Json | null
          patient_id?: string
          pemeriksaan_fisik?: string | null
          previous_data?: Json | null
          reason?: string | null
          restored_from?: number | null
          terapi?: string | null
          version?: number
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_record_versions_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_record_versions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_record_versions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_record_versions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "v_patient_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_record_versions_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          clinic_id: string
          gateway_response: string | null
          id: string
          message_type: string
          patient_id: string | null
          status: string
          timestamp: string
          triggered_by: string | null
          visit_id: string | null
        }
        Insert: {
          clinic_id: string
          gateway_response?: string | null
          id?: string
          message_type: string
          patient_id?: string | null
          status: string
          timestamp?: string
          triggered_by?: string | null
          visit_id?: string | null
        }
        Update: {
          clinic_id?: string
          gateway_response?: string | null
          id?: string
          message_type?: string
          patient_id?: string | null
          status?: string
          timestamp?: string
          triggered_by?: string | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "v_patient_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      odontogram_meta: {
        Row: {
          catatan_odontogram: string | null
          clinic_id: string
          created_at: string | null
          id: string
          patient_id: string | null
          relasi_molar_kanan: string | null
          relasi_molar_kiri: string | null
          updated_at: string | null
        }
        Insert: {
          catatan_odontogram?: string | null
          clinic_id: string
          created_at?: string | null
          id?: string
          patient_id?: string | null
          relasi_molar_kanan?: string | null
          relasi_molar_kiri?: string | null
          updated_at?: string | null
        }
        Update: {
          catatan_odontogram?: string | null
          clinic_id?: string
          created_at?: string | null
          id?: string
          patient_id?: string | null
          relasi_molar_kanan?: string | null
          relasi_molar_kiri?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "odontogram_meta_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "odontogram_meta_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "odontogram_meta_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "v_patient_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      overhead_costs: {
        Row: {
          aktif: boolean | null
          catatan: string | null
          clinic_id: string
          created_at: string | null
          id: string
          jumlah_bulanan: number
          kategori: string | null
          nama_biaya: string
          updated_at: string | null
        }
        Insert: {
          aktif?: boolean | null
          catatan?: string | null
          clinic_id: string
          created_at?: string | null
          id?: string
          jumlah_bulanan?: number
          kategori?: string | null
          nama_biaya: string
          updated_at?: string | null
        }
        Update: {
          aktif?: boolean | null
          catatan?: string | null
          clinic_id?: string
          created_at?: string | null
          id?: string
          jumlah_bulanan?: number
          kategori?: string | null
          nama_biaya?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "overhead_costs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      overhead_monthly_target: {
        Row: {
          catatan: string | null
          clinic_id: string
          created_at: string | null
          created_by: string | null
          id: string
          overhead_per_unit_bobot: number | null
          periode: string
          total_bobot_estimasi: number
          total_overhead_bulanan: number
        }
        Insert: {
          catatan?: string | null
          clinic_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          overhead_per_unit_bobot?: number | null
          periode: string
          total_bobot_estimasi: number
          total_overhead_bulanan: number
        }
        Update: {
          catatan?: string | null
          clinic_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          overhead_per_unit_bobot?: number | null
          periode?: string
          total_bobot_estimasi?: number
          total_overhead_bulanan?: number
        }
        Relationships: [
          {
            foreignKeyName: "overhead_monthly_target_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overhead_monthly_target_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_media: {
        Row: {
          caption: string | null
          category: string
          clinic_id: string
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          display_order: number | null
          file_type: string | null
          file_url: string
          filename: string
          id: string
          notes: string | null
          patient_id: string
          visit_id: string | null
        }
        Insert: {
          caption?: string | null
          category: string
          clinic_id: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          display_order?: number | null
          file_type?: string | null
          file_url: string
          filename: string
          id?: string
          notes?: string | null
          patient_id: string
          visit_id?: string | null
        }
        Update: {
          caption?: string | null
          category?: string
          clinic_id?: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          display_order?: number | null
          file_type?: string | null
          file_url?: string
          filename?: string
          id?: string
          notes?: string | null
          patient_id?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_media_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_media_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_media_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_media_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "v_patient_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_media_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_referrals: {
        Row: {
          anamnesis: string | null
          clinic_id: string
          created_at: string | null
          date: string | null
          deleted_at: string | null
          deleted_by: string | null
          diagnosis: string | null
          doctor_name: string
          id: string
          patient_id: string
          physical_exam: string | null
          place: string | null
          referral_number: string | null
          therapy: string | null
          to_doctor: string
          to_hospital: string
          to_specialist: string
          visit_id: string | null
        }
        Insert: {
          anamnesis?: string | null
          clinic_id: string
          created_at?: string | null
          date?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          diagnosis?: string | null
          doctor_name: string
          id?: string
          patient_id: string
          physical_exam?: string | null
          place?: string | null
          referral_number?: string | null
          therapy?: string | null
          to_doctor: string
          to_hospital: string
          to_specialist: string
          visit_id?: string | null
        }
        Update: {
          anamnesis?: string | null
          clinic_id?: string
          created_at?: string | null
          date?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          diagnosis?: string | null
          doctor_name?: string
          id?: string
          patient_id?: string
          physical_exam?: string | null
          place?: string | null
          referral_number?: string | null
          therapy?: string | null
          to_doctor?: string
          to_hospital?: string
          to_specialist?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_referrals_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_referrals_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_referrals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_referrals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "v_patient_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_referrals_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_visits: {
        Row: {
          chief_complaint: string | null
          clinic_id: string
          created_at: string | null
          id: string
          patient_id: string
          treatment_notes: string | null
          visit_date: string | null
        }
        Insert: {
          chief_complaint?: string | null
          clinic_id: string
          created_at?: string | null
          id?: string
          patient_id: string
          treatment_notes?: string | null
          visit_date?: string | null
        }
        Update: {
          chief_complaint?: string | null
          clinic_id?: string
          created_at?: string | null
          id?: string
          patient_id?: string
          treatment_notes?: string | null
          visit_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_visits_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_visits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_visits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "v_patient_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          agama: string | null
          alamat: string | null
          alamat_detail: string | null
          berat_badan: number | null
          clinic_id: string
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          desa: string | null
          dokter_gigi_keluarga: string | null
          dokter_keluarga: string | null
          foto_profile: string | null
          golongan_darah: string | null
          id: string
          identitas_alternatif_jenis: string | null
          jaminan_kesehatan: string | null
          jenis_kelamin: string | null
          kabupaten: string | null
          kecamatan: string | null
          keluhan_awal: string | null
          nama_kk: string | null
          nama_lengkap: string
          nik: string | null
          nik_ibu: string | null
          no_rm: string
          no_telepon: string | null
          no_wa: string | null
          pekerjaan: string | null
          pendidikan_terakhir: string | null
          provinsi: string | null
          registered_by: string | null
          rujukan_dari: string | null
          satusehat_last_synced_at: string | null
          satusehat_patient_id: string | null
          status: string | null
          status_pernikahan: string | null
          tanggal_lahir: string | null
          tempat_lahir: string | null
          tinggi_badan: number | null
          umur: number | null
          updated_at: string | null
          wa_consent: boolean
        }
        Insert: {
          agama?: string | null
          alamat?: string | null
          alamat_detail?: string | null
          berat_badan?: number | null
          clinic_id: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          desa?: string | null
          dokter_gigi_keluarga?: string | null
          dokter_keluarga?: string | null
          foto_profile?: string | null
          golongan_darah?: string | null
          id?: string
          identitas_alternatif_jenis?: string | null
          jaminan_kesehatan?: string | null
          jenis_kelamin?: string | null
          kabupaten?: string | null
          kecamatan?: string | null
          keluhan_awal?: string | null
          nama_kk?: string | null
          nama_lengkap: string
          nik?: string | null
          nik_ibu?: string | null
          no_rm: string
          no_telepon?: string | null
          no_wa?: string | null
          pekerjaan?: string | null
          pendidikan_terakhir?: string | null
          provinsi?: string | null
          registered_by?: string | null
          rujukan_dari?: string | null
          satusehat_last_synced_at?: string | null
          satusehat_patient_id?: string | null
          status?: string | null
          status_pernikahan?: string | null
          tanggal_lahir?: string | null
          tempat_lahir?: string | null
          tinggi_badan?: number | null
          umur?: number | null
          updated_at?: string | null
          wa_consent?: boolean
        }
        Update: {
          agama?: string | null
          alamat?: string | null
          alamat_detail?: string | null
          berat_badan?: number | null
          clinic_id?: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          desa?: string | null
          dokter_gigi_keluarga?: string | null
          dokter_keluarga?: string | null
          foto_profile?: string | null
          golongan_darah?: string | null
          id?: string
          identitas_alternatif_jenis?: string | null
          jaminan_kesehatan?: string | null
          jenis_kelamin?: string | null
          kabupaten?: string | null
          kecamatan?: string | null
          keluhan_awal?: string | null
          nama_kk?: string | null
          nama_lengkap?: string
          nik?: string | null
          nik_ibu?: string | null
          no_rm?: string
          no_telepon?: string | null
          no_wa?: string | null
          pekerjaan?: string | null
          pendidikan_terakhir?: string | null
          provinsi?: string | null
          registered_by?: string | null
          rujukan_dari?: string | null
          satusehat_last_synced_at?: string | null
          satusehat_patient_id?: string | null
          status?: string | null
          status_pernikahan?: string | null
          tanggal_lahir?: string | null
          tempat_lahir?: string | null
          tinggi_badan?: number | null
          umur?: number | null
          updated_at?: string | null
          wa_consent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "patients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          biaya_tambahan: number | null
          clinic_id: string
          created_at: string | null
          diskon: number | null
          id: string
          invoice_number: string
          jumlah_bayar: number | null
          kembalian: number | null
          keterangan_tambahan: string | null
          metode_pembayaran: string | null
          patient_id: string | null
          processed_by: string | null
          status_pembayaran: string | null
          tanggal_pembayaran: string | null
          total_bayar: number
          total_treatment: number
          updated_at: string | null
          visit_id: string | null
          wa_sent: boolean | null
        }
        Insert: {
          biaya_tambahan?: number | null
          clinic_id: string
          created_at?: string | null
          diskon?: number | null
          id?: string
          invoice_number: string
          jumlah_bayar?: number | null
          kembalian?: number | null
          keterangan_tambahan?: string | null
          metode_pembayaran?: string | null
          patient_id?: string | null
          processed_by?: string | null
          status_pembayaran?: string | null
          tanggal_pembayaran?: string | null
          total_bayar: number
          total_treatment?: number
          updated_at?: string | null
          visit_id?: string | null
          wa_sent?: boolean | null
        }
        Update: {
          biaya_tambahan?: number | null
          clinic_id?: string
          created_at?: string | null
          diskon?: number | null
          id?: string
          invoice_number?: string
          jumlah_bayar?: number | null
          kembalian?: number | null
          keterangan_tambahan?: string | null
          metode_pembayaran?: string | null
          patient_id?: string | null
          processed_by?: string | null
          status_pembayaran?: string | null
          tanggal_pembayaran?: string | null
          total_bayar?: number
          total_treatment?: number
          updated_at?: string | null
          visit_id?: string | null
          wa_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "v_patient_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: true
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      periodontal_data: {
        Row: {
          bop: string | null
          calculus: string | null
          clinic_id: string
          created_at: string | null
          furkasi: string | null
          id: string
          kondisi_gingiva: string | null
          kondisi_mukosa: string | null
          mobility: string | null
          ohi_s: string | null
          patient_id: string | null
          plak_indeks: string | null
          pocket_depth: string | null
          resesi_gingiva: string | null
          updated_at: string | null
        }
        Insert: {
          bop?: string | null
          calculus?: string | null
          clinic_id: string
          created_at?: string | null
          furkasi?: string | null
          id?: string
          kondisi_gingiva?: string | null
          kondisi_mukosa?: string | null
          mobility?: string | null
          ohi_s?: string | null
          patient_id?: string | null
          plak_indeks?: string | null
          pocket_depth?: string | null
          resesi_gingiva?: string | null
          updated_at?: string | null
        }
        Update: {
          bop?: string | null
          calculus?: string | null
          clinic_id?: string
          created_at?: string | null
          furkasi?: string | null
          id?: string
          kondisi_gingiva?: string | null
          kondisi_mukosa?: string | null
          mobility?: string | null
          ohi_s?: string | null
          patient_id?: string | null
          plak_indeks?: string | null
          pocket_depth?: string | null
          resesi_gingiva?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "periodontal_data_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodontal_data_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodontal_data_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "v_patient_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          id: string
          module: string
          name: string
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          id?: string
          module: string
          name: string
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          id?: string
          module?: string
          name?: string
        }
        Relationships: []
      }
      queue_display_links: {
        Row: {
          clinic_id: string
          created_at: string
          created_by: string | null
          id: string
          label: string
          last_seen_at: string | null
          revoked_at: string | null
          token_hash: string
          token_hint: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          last_seen_at?: string | null
          revoked_at?: string | null
          token_hash: string
          token_hint: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          last_seen_at?: string | null
          revoked_at?: string | null
          token_hash?: string
          token_hint?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_display_links_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      recall_contacts: {
        Row: {
          channel: string
          clinic_id: string
          contacted_by: string | null
          created_at: string
          id: string
          patient_id: string
        }
        Insert: {
          channel?: string
          clinic_id: string
          contacted_by?: string | null
          created_at?: string
          id?: string
          patient_id: string
        }
        Update: {
          channel?: string
          clinic_id?: string
          contacted_by?: string | null
          created_at?: string
          id?: string
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recall_contacts_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recall_contacts_contacted_by_fkey"
            columns: ["contacted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recall_contacts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recall_contacts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "v_patient_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_logs: {
        Row: {
          clinic_id: string
          error_message: string | null
          id: string
          reminder_type: string
          sent_at: string | null
          status: string
          visit_id: string | null
        }
        Insert: {
          clinic_id: string
          error_message?: string | null
          id?: string
          reminder_type: string
          sent_at?: string | null
          status: string
          visit_id?: string | null
        }
        Update: {
          clinic_id?: string
          error_message?: string | null
          id?: string
          reminder_type?: string
          sent_at?: string | null
          status?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminder_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_logs_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_system: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
        }
        Relationships: []
      }
      satusehat_consents: {
        Row: {
          clinic_id: string
          consent_date: string | null
          consent_given: boolean
          created_at: string | null
          id: string
          notes: string | null
          patient_id: string
          recorded_by: string | null
        }
        Insert: {
          clinic_id: string
          consent_date?: string | null
          consent_given?: boolean
          created_at?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          recorded_by?: string | null
        }
        Update: {
          clinic_id?: string
          consent_date?: string | null
          consent_given?: boolean
          created_at?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          recorded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "satusehat_consents_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satusehat_consents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satusehat_consents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "v_patient_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satusehat_consents_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      satusehat_locations: {
        Row: {
          clinic_id: string
          created_at: string | null
          id: string
          is_default: boolean | null
          nama_unit: string
          satusehat_location_id: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          nama_unit: string
          satusehat_location_id?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          nama_unit?: string
          satusehat_location_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "satusehat_locations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      satusehat_organizations: {
        Row: {
          client_id: string | null
          clinic_id: string
          environment: string
          registered_at: string | null
          satusehat_organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          clinic_id: string
          environment?: string
          registered_at?: string | null
          satusehat_organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          clinic_id?: string
          environment?: string
          registered_at?: string | null
          satusehat_organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "satusehat_organizations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      satusehat_outbox: {
        Row: {
          attempt_count: number
          clinic_id: string
          created_at: string | null
          id: string
          last_attempt_at: string | null
          last_error: string | null
          next_retry_at: string | null
          payload: Json
          related_patient_id: string | null
          related_visit_id: string | null
          resource_type: string
          satusehat_resource_id: string | null
          status: string
          trigger_source: string | null
          triggered_by: string | null
          updated_at: string | null
        }
        Insert: {
          attempt_count?: number
          clinic_id: string
          created_at?: string | null
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          next_retry_at?: string | null
          payload: Json
          related_patient_id?: string | null
          related_visit_id?: string | null
          resource_type: string
          satusehat_resource_id?: string | null
          status?: string
          trigger_source?: string | null
          triggered_by?: string | null
          updated_at?: string | null
        }
        Update: {
          attempt_count?: number
          clinic_id?: string
          created_at?: string | null
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          next_retry_at?: string | null
          payload?: Json
          related_patient_id?: string | null
          related_visit_id?: string | null
          resource_type?: string
          satusehat_resource_id?: string | null
          status?: string
          trigger_source?: string | null
          triggered_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "satusehat_outbox_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satusehat_outbox_related_patient_id_fkey"
            columns: ["related_patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satusehat_outbox_related_patient_id_fkey"
            columns: ["related_patient_id"]
            isOneToOne: false
            referencedRelation: "v_patient_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satusehat_outbox_related_visit_id_fkey"
            columns: ["related_visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satusehat_outbox_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      satusehat_token_cache: {
        Row: {
          access_token: string
          environment: string
          expires_at: string
          id: number
          updated_at: string | null
        }
        Insert: {
          access_token: string
          environment: string
          expires_at: string
          id?: number
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          environment?: string
          expires_at?: string
          id?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      satusehat_verification_runs: {
        Row: {
          created_at: string
          environment: string
          id: string
          passed: boolean
          report: Json
          visit_id: string | null
        }
        Insert: {
          created_at?: string
          environment?: string
          id?: string
          passed: boolean
          report: Json
          visit_id?: string | null
        }
        Update: {
          created_at?: string
          environment?: string
          id?: string
          passed?: boolean
          report?: Json
          visit_id?: string | null
        }
        Relationships: []
      }
      soap_templates: {
        Row: {
          clinic_id: string
          created_at: string
          diagnosa: string | null
          id: string
          keluhan: string | null
          pemeriksaan_fisik: string | null
          terapi: string | null
          treatment_type: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          diagnosa?: string | null
          id?: string
          keluhan?: string | null
          pemeriksaan_fisik?: string | null
          terapi?: string | null
          treatment_type: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          diagnosa?: string | null
          id?: string
          keluhan?: string | null
          pemeriksaan_fisik?: string | null
          terapi?: string | null
          treatment_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "soap_templates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      stok_movements: {
        Row: {
          catatan: string | null
          clinic_id: string
          created_at: string | null
          created_by: string | null
          harga_saat_itu: number | null
          id: string
          jumlah: number
          material_id: string
          referensi_id: string | null
          referensi_tipe: string | null
          stok_sebelum: number
          stok_sesudah: number
          tipe: string
        }
        Insert: {
          catatan?: string | null
          clinic_id: string
          created_at?: string | null
          created_by?: string | null
          harga_saat_itu?: number | null
          id?: string
          jumlah: number
          material_id: string
          referensi_id?: string | null
          referensi_tipe?: string | null
          stok_sebelum: number
          stok_sesudah: number
          tipe: string
        }
        Update: {
          catatan?: string | null
          clinic_id?: string
          created_at?: string | null
          created_by?: string | null
          harga_saat_itu?: number | null
          id?: string
          jumlah?: number
          material_id?: string
          referensi_id?: string | null
          referensi_tipe?: string | null
          stok_sebelum?: number
          stok_sesudah?: number
          tipe?: string
        }
        Relationships: [
          {
            foreignKeyName: "stok_movements_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stok_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stok_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "master_bahan"
            referencedColumns: ["id"]
          },
        ]
      }
      stok_opname: {
        Row: {
          catatan: string | null
          clinic_id: string
          created_at: string | null
          dilakukan_oleh: string | null
          id: string
          material_id: string
          selisih: number | null
          stok_fisik: number
          stok_sistem: number
          tanggal: string
        }
        Insert: {
          catatan?: string | null
          clinic_id: string
          created_at?: string | null
          dilakukan_oleh?: string | null
          id?: string
          material_id: string
          selisih?: number | null
          stok_fisik: number
          stok_sistem: number
          tanggal?: string
        }
        Update: {
          catatan?: string | null
          clinic_id?: string
          created_at?: string | null
          dilakukan_oleh?: string | null
          id?: string
          material_id?: string
          selisih?: number | null
          stok_fisik?: number
          stok_sistem?: number
          tanggal?: string
        }
        Relationships: [
          {
            foreignKeyName: "stok_opname_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stok_opname_dilakukan_oleh_fkey"
            columns: ["dilakukan_oleh"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stok_opname_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "master_bahan"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          max_patients: number
          max_users: number
          name: string
          price_monthly: number
          price_yearly: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_patients?: number
          max_users?: number
          name: string
          price_monthly: number
          price_yearly: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_patients?: number
          max_users?: number
          name?: string
          price_monthly?: number
          price_yearly?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      tier_weights: {
        Row: {
          bobot: number
          clinic_id: string
          label: string
          tier: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          bobot: number
          clinic_id: string
          label: string
          tier: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          bobot?: number
          clinic_id?: string
          label?: string
          tier?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tier_weights_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tier_weights_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tooth_conditions: {
        Row: {
          clinic_id: string
          condition_code: string
          condition_type: string
          created_at: string | null
          has_rct: boolean | null
          id: string
          notes: string | null
          patient_id: string | null
          recorded_by: string | null
          surface: string | null
          tooth_number: number
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          condition_code: string
          condition_type: string
          created_at?: string | null
          has_rct?: boolean | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          recorded_by?: string | null
          surface?: string | null
          tooth_number: number
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          condition_code?: string
          condition_type?: string
          created_at?: string | null
          has_rct?: boolean | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          recorded_by?: string | null
          surface?: string | null
          tooth_number?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tooth_conditions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tooth_conditions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tooth_conditions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "v_patient_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tooth_conditions_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_cost_snapshot: {
        Row: {
          bobot_saat_itu: number
          clinic_id: string
          created_at: string | null
          detail_bahan: Json | null
          harga_jual_saat_itu: number
          id: string
          margin: number | null
          margin_percent: number | null
          overhead_allocated: number
          overhead_per_unit_bobot: number
          tier_saat_itu: string
          total_biaya_bahan: number
          total_modal: number | null
          visit_treatment_id: string
        }
        Insert: {
          bobot_saat_itu: number
          clinic_id: string
          created_at?: string | null
          detail_bahan?: Json | null
          harga_jual_saat_itu: number
          id?: string
          margin?: number | null
          margin_percent?: number | null
          overhead_allocated: number
          overhead_per_unit_bobot: number
          tier_saat_itu: string
          total_biaya_bahan?: number
          total_modal?: number | null
          visit_treatment_id: string
        }
        Update: {
          bobot_saat_itu?: number
          clinic_id?: string
          created_at?: string | null
          detail_bahan?: Json | null
          harga_jual_saat_itu?: number
          id?: string
          margin?: number | null
          margin_percent?: number | null
          overhead_allocated?: number
          overhead_per_unit_bobot?: number
          tier_saat_itu?: string
          total_biaya_bahan?: number
          total_modal?: number | null
          visit_treatment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_cost_snapshot_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_cost_snapshot_visit_treatment_id_fkey"
            columns: ["visit_treatment_id"]
            isOneToOne: true
            referencedRelation: "visit_treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_education: {
        Row: {
          clinic_id: string
          created_at: string
          edukasi_obat: string | null
          id: string
          is_active: boolean
          isi_edukasi: string
          judul: string
          treatment_id: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          edukasi_obat?: string | null
          id?: string
          is_active?: boolean
          isi_edukasi: string
          judul: string
          treatment_id: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          edukasi_obat?: string | null
          id?: string
          is_active?: boolean
          isi_edukasi?: string
          judul?: string
          treatment_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_education_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_education_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: true
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_education_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: true
            referencedRelation: "v_popular_treatments"
            referencedColumns: ["treatment_id"]
          },
        ]
      }
      treatment_education_templates: {
        Row: {
          clinic_id: string
          education_text: string | null
          id: string
          keywords: string[] | null
          last_updated_at: string
          last_updated_by: string | null
          medication_instructions: string | null
          treatment_type: string
        }
        Insert: {
          clinic_id: string
          education_text?: string | null
          id?: string
          keywords?: string[] | null
          last_updated_at?: string
          last_updated_by?: string | null
          medication_instructions?: string | null
          treatment_type: string
        }
        Update: {
          clinic_id?: string
          education_text?: string | null
          id?: string
          keywords?: string[] | null
          last_updated_at?: string
          last_updated_by?: string | null
          medication_instructions?: string | null
          treatment_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_education_templates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_education_templates_last_updated_by_fkey"
            columns: ["last_updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_materials: {
        Row: {
          catatan: string | null
          clinic_id: string
          created_at: string | null
          id: string
          material_id: string
          qty_rata2: number
          treatment_id: string
          updated_at: string | null
          wajib: boolean | null
          wastage_percent: number | null
        }
        Insert: {
          catatan?: string | null
          clinic_id: string
          created_at?: string | null
          id?: string
          material_id: string
          qty_rata2: number
          treatment_id: string
          updated_at?: string | null
          wajib?: boolean | null
          wastage_percent?: number | null
        }
        Update: {
          catatan?: string | null
          clinic_id?: string
          created_at?: string | null
          id?: string
          material_id?: string
          qty_rata2?: number
          treatment_id?: string
          updated_at?: string | null
          wajib?: boolean | null
          wastage_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_materials_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "master_bahan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_materials_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_materials_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "v_popular_treatments"
            referencedColumns: ["treatment_id"]
          },
        ]
      }
      treatment_plans: {
        Row: {
          clinic_id: string
          created_at: string | null
          created_by: string | null
          gigi: string | null
          id: string
          keterangan: string | null
          patient_id: string | null
          prioritas: number
          status: string | null
          tindakan: string
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          created_by?: string | null
          gigi?: string | null
          id?: string
          keterangan?: string | null
          patient_id?: string | null
          prioritas?: number
          status?: string | null
          tindakan: string
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          created_by?: string | null
          gigi?: string | null
          id?: string
          keterangan?: string | null
          patient_id?: string | null
          prioritas?: number
          status?: string | null
          tindakan?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plans_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "v_patient_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      treatments: {
        Row: {
          clinic_id: string
          created_at: string | null
          deskripsi: string | null
          durasi_menit: number | null
          harga_dasar: number
          id: string
          is_active: boolean | null
          kategori: string | null
          kode_icd9cm: string | null
          kode_snomed_ct: string | null
          kode_treatment: string
          nama_treatment: string
          tier: string | null
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          deskripsi?: string | null
          durasi_menit?: number | null
          harga_dasar: number
          id?: string
          is_active?: boolean | null
          kategori?: string | null
          kode_icd9cm?: string | null
          kode_snomed_ct?: string | null
          kode_treatment: string
          nama_treatment: string
          tier?: string | null
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          deskripsi?: string | null
          durasi_menit?: number | null
          harga_dasar?: number
          id?: string
          is_active?: boolean | null
          kategori?: string | null
          kode_icd9cm?: string | null
          kode_snomed_ct?: string | null
          kode_treatment?: string
          nama_treatment?: string
          tier?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          is_revoked: boolean | null
          permission_id: string
          user_id: string
        }
        Insert: {
          is_revoked?: boolean | null
          permission_id: string
          user_id: string
        }
        Update: {
          is_revoked?: boolean | null
          permission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          bio: string | null
          clinic_id: string
          created_at: string | null
          email: string
          foto_profil: string | null
          full_name: string
          gelar_belakang: string | null
          gelar_depan: string | null
          id: string
          invited_by: string | null
          is_active: boolean | null
          jenis_dokter: string | null
          last_login_at: string | null
          nik: string | null
          no_sip: string | null
          no_str: string | null
          no_telepon: string | null
          phone: string | null
          practitioner_type: string | null
          qualification_code: string | null
          role: string
          role_id: string | null
          satusehat_practitioner_id: string | null
          spesialisasi: string | null
          status: string
          str_berlaku_hingga: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          clinic_id: string
          created_at?: string | null
          email: string
          foto_profil?: string | null
          full_name: string
          gelar_belakang?: string | null
          gelar_depan?: string | null
          id: string
          invited_by?: string | null
          is_active?: boolean | null
          jenis_dokter?: string | null
          last_login_at?: string | null
          nik?: string | null
          no_sip?: string | null
          no_str?: string | null
          no_telepon?: string | null
          phone?: string | null
          practitioner_type?: string | null
          qualification_code?: string | null
          role: string
          role_id?: string | null
          satusehat_practitioner_id?: string | null
          spesialisasi?: string | null
          status?: string
          str_berlaku_hingga?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          clinic_id?: string
          created_at?: string | null
          email?: string
          foto_profil?: string | null
          full_name?: string
          gelar_belakang?: string | null
          gelar_depan?: string | null
          id?: string
          invited_by?: string | null
          is_active?: boolean | null
          jenis_dokter?: string | null
          last_login_at?: string | null
          nik?: string | null
          no_sip?: string | null
          no_str?: string | null
          no_telepon?: string | null
          phone?: string | null
          practitioner_type?: string | null
          qualification_code?: string | null
          role?: string
          role_id?: string | null
          satusehat_practitioner_id?: string | null
          spesialisasi?: string | null
          status?: string
          str_berlaku_hingga?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_obat: {
        Row: {
          clinic_id: string
          created_at: string | null
          dosis: string | null
          frekuensi: string | null
          harga_satuan: number
          id: string
          master_bahan_id: string | null
          nama_obat: string
          obat_id: string | null
          qty: number
          subtotal: number | null
          visit_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          dosis?: string | null
          frekuensi?: string | null
          harga_satuan: number
          id?: string
          master_bahan_id?: string | null
          nama_obat: string
          obat_id?: string | null
          qty?: number
          subtotal?: number | null
          visit_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          dosis?: string | null
          frekuensi?: string | null
          harga_satuan?: number
          id?: string
          master_bahan_id?: string | null
          nama_obat?: string
          obat_id?: string | null
          qty?: number
          subtotal?: number | null
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_obat_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_obat_master_bahan_id_fkey"
            columns: ["master_bahan_id"]
            isOneToOne: false
            referencedRelation: "master_bahan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_obat_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_treatment_material_overrides: {
        Row: {
          catatan: string | null
          clinic_id: string
          created_at: string | null
          created_by: string | null
          id: string
          material_id: string
          qty_aktual: number
          visit_treatment_id: string
        }
        Insert: {
          catatan?: string | null
          clinic_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          material_id: string
          qty_aktual: number
          visit_treatment_id: string
        }
        Update: {
          catatan?: string | null
          clinic_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          material_id?: string
          qty_aktual?: number
          visit_treatment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_treatment_material_overrides_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_treatment_material_overrides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_treatment_material_overrides_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "master_bahan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_treatment_material_overrides_visit_treatment_id_fkey"
            columns: ["visit_treatment_id"]
            isOneToOne: false
            referencedRelation: "visit_treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_treatments: {
        Row: {
          clinic_id: string
          created_at: string | null
          harga_satuan: number
          id: string
          notes: string | null
          quantity: number | null
          subtotal: number
          tooth_number: number | null
          treatment_id: string | null
          visit_id: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          harga_satuan: number
          id?: string
          notes?: string | null
          quantity?: number | null
          subtotal: number
          tooth_number?: number | null
          treatment_id?: string | null
          visit_id?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          harga_satuan?: number
          id?: string
          notes?: string | null
          quantity?: number | null
          subtotal?: number
          tooth_number?: number | null
          treatment_id?: string | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visit_treatments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_treatments_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_treatments_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "v_popular_treatments"
            referencedColumns: ["treatment_id"]
          },
          {
            foreignKeyName: "visit_treatments_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          catatan_dokter: string | null
          clinic_id: string
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          diagnosa: string | null
          dokter_id: string | null
          id: string
          is_locked: boolean
          jam_kunjungan: string | null
          keluhan: string | null
          kode_icd10: string | null
          lock_change_reason: string | null
          locked_at: string | null
          locked_by: string | null
          patient_id: string | null
          pemeriksaan_fisik: string | null
          satusehat_composition_id: string | null
          satusehat_encounter_id: string | null
          satusehat_resource_ids: Json | null
          status: string | null
          tanggal_kunjungan: string
          terapi: string | null
          updated_at: string | null
          visit_number: number
        }
        Insert: {
          catatan_dokter?: string | null
          clinic_id: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          diagnosa?: string | null
          dokter_id?: string | null
          id?: string
          is_locked?: boolean
          jam_kunjungan?: string | null
          keluhan?: string | null
          kode_icd10?: string | null
          lock_change_reason?: string | null
          locked_at?: string | null
          locked_by?: string | null
          patient_id?: string | null
          pemeriksaan_fisik?: string | null
          satusehat_composition_id?: string | null
          satusehat_encounter_id?: string | null
          satusehat_resource_ids?: Json | null
          status?: string | null
          tanggal_kunjungan?: string
          terapi?: string | null
          updated_at?: string | null
          visit_number: number
        }
        Update: {
          catatan_dokter?: string | null
          clinic_id?: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          diagnosa?: string | null
          dokter_id?: string | null
          id?: string
          is_locked?: boolean
          jam_kunjungan?: string | null
          keluhan?: string | null
          kode_icd10?: string | null
          lock_change_reason?: string | null
          locked_at?: string | null
          locked_by?: string | null
          patient_id?: string | null
          pemeriksaan_fisik?: string | null
          satusehat_composition_id?: string | null
          satusehat_encounter_id?: string | null
          satusehat_resource_ids?: Json | null
          status?: string | null
          tanggal_kunjungan?: string
          terapi?: string | null
          updated_at?: string | null
          visit_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "visits_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_dokter_id_fkey"
            columns: ["dokter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "v_patient_summary"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_daily_revenue: {
        Row: {
          avg_transaction: number | null
          tanggal: string | null
          total_revenue: number | null
          total_transactions: number | null
        }
        Relationships: []
      }
      v_monthly_revenue: {
        Row: {
          avg_transaction: number | null
          bulan: string | null
          label_bulan: string | null
          total_revenue: number | null
          total_transactions: number | null
        }
        Relationships: []
      }
      v_patient_summary: {
        Row: {
          agama: string | null
          alamat: string | null
          alamat_detail: string | null
          berat_badan: number | null
          created_at: string | null
          desa: string | null
          foto_profile: string | null
          golongan_darah: string | null
          id: string | null
          jenis_kelamin: string | null
          kabupaten: string | null
          kecamatan: string | null
          keluhan_awal: string | null
          last_visit: string | null
          nama_lengkap: string | null
          no_rm: string | null
          no_wa: string | null
          pekerjaan: string | null
          pendidikan_terakhir: string | null
          provinsi: string | null
          status: string | null
          status_pernikahan: string | null
          tanggal_lahir: string | null
          tempat_lahir: string | null
          tinggi_badan: number | null
          total_spent: number | null
          total_visits: number | null
          umur: number | null
        }
        Relationships: []
      }
      v_popular_treatments: {
        Row: {
          kategori: string | null
          nama_treatment: string | null
          total_revenue: number | null
          treatment_id: string | null
          usage_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      ai_answer_feedback: {
        Args: { p_correct: boolean; p_note?: string; p_usage_id: string }
        Returns: Json
      }
      ai_break_even: { Args: { p_bulan: number }; Returns: Json }
      ai_cashflow_projection: {
        Args: { p_bulan_historis: number; p_bulan_ke_depan: number }
        Returns: Json
      }
      ai_check_range: {
        Args: { p_from: string; p_to: string }
        Returns: undefined
      }
      ai_doctor_performance: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
      ai_doctor_schedule_load: { Args: { p_minggu: number }; Returns: Json }
      ai_expense_summary: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
      ai_knowledge_hit: { Args: { p_id: string }; Returns: undefined }
      ai_knowledge_match: {
        Args: { p_limit?: number; p_norm: string }
        Returns: {
          answer: string
          data_fingerprint: string
          id: string
          kind: string
          question: string
          question_norm: string
          similarity: number
        }[]
      }
      ai_price_simulation: {
        Args: { p_bulan: number; p_nama: string; p_perubahan_persen: number }
        Returns: Json
      }
      ai_recall_stats: { Args: { p_bulan: number }; Returns: Json }
      ai_require_admin: { Args: never; Returns: string }
      ai_reserve_usage: {
        Args: {
          p_clinic: string
          p_feature: string
          p_model: string
          p_user: string
        }
        Returns: string
      }
      ai_revenue_summary: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
      ai_service_clinics: {
        Args: never
        Returns: {
          clinic_id: string
        }[]
      }
      ai_service_snapshots: { Args: { p_clinic: string }; Returns: Json }
      ai_set_enabled: { Args: { p_enabled: boolean }; Returns: Json }
      ai_snapshot: { Args: never; Returns: Json }
      ai_staff_snapshot: { Args: never; Returns: Json }
      ai_staff_status: { Args: never; Returns: Json }
      ai_status: { Args: never; Returns: Json }
      ai_stock_alerts: { Args: never; Returns: Json }
      ai_today_summary: { Args: never; Returns: Json }
      ai_treatment_performance: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
      ai_unbilled_visits: { Args: { p_days?: number }; Returns: Json }
      ai_visit_stats: { Args: { p_from: string; p_to: string }; Returns: Json }
      billing_register_midtrans_order: {
        Args: {
          p_billing_cycle: string
          p_clinic_id: string
          p_order_id: string
          p_plan_id: string
        }
        Returns: {
          amount_idr: number
          invoice_id: string
          payment_id: string
          plan_name: string
        }[]
      }
      billing_settle_midtrans_order: {
        Args: {
          p_gross_amount: number
          p_order_id: string
          p_outcome: string
          p_raw: Json
        }
        Returns: string
      }
      create_queue_display_link: { Args: { p_label?: string }; Returns: Json }
      decrypt_batch: { Args: { p_payloads: string[] }; Returns: string[] }
      decrypt_field: { Args: { p_ciphertext: string }; Returns: string }
      encrypt_batch: { Args: { p_payloads: string[] }; Returns: string[] }
      encrypt_field: { Args: { p_plaintext: string }; Returns: string }
      fn_proses_stok_dan_snapshot_visit_treatment: {
        Args: { p_visit_treatment_id: string }
        Returns: undefined
      }
      get_active_announcements: {
        Args: never
        Returns: {
          body: string
          ends_at: string
          id: string
          severity: string
          starts_at: string
          title: string
        }[]
      }
      get_audit_logs: {
        Args: never
        Returns: {
          action: string
          clinic_id: string
          id: string
          ip_address: string | null
          module: string
          new_value: Json | null
          patient_id: string | null
          previous_value: Json | null
          risk_level: string | null
          session_id: string | null
          timestamp: string
          user_agent: string | null
          user_id: string | null
          user_role: string | null
          visit_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "audit_logs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_booking_page: { Args: { p_slug: string }; Returns: Json }
      get_my_account_status: {
        Args: never
        Returns: {
          clinic_id: string
          clinic_name: string
          clinic_status: string
          has_access: boolean
          role: string
          suspended_reason: string
          trial_ends_at: string
          user_id: string
          user_status: string
        }[]
      }
      get_my_permissions: {
        Args: never
        Returns: {
          permission_name: string
        }[]
      }
      get_onboarding_status: { Args: never; Returns: Json }
      get_patient_media_paths: {
        Args: { p_patient_id: string }
        Returns: {
          category: string
          file_url: string
        }[]
      }
      get_queue_display: { Args: { p_token: string }; Returns: Json }
      get_user_clinic_id: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
      has_permission: { Args: { p_permission_name: string }; Returns: boolean }
      is_medical_reader: { Args: never; Returns: boolean }
      queue_initials: { Args: { p_name: string }; Returns: string }
      recall_candidates: {
        Args: { p_bulan: number; p_limit?: number }
        Returns: {
          jumlah_dihubungi: number
          jumlah_kunjungan: number
          kunjungan_terakhir: string
          nama_lengkap: string
          no_rm: string
          no_wa: string
          patient_id: string
          terakhir_dihubungi: string
          wa_consent: boolean
        }[]
      }
      recall_mark_contacted: {
        Args: { p_channel: string; p_patient_id: string }
        Returns: string
      }
      recall_require_staff: { Args: never; Returns: string }
      record_login: { Args: never; Returns: undefined }
      register_clinic: {
        Args: {
          p_city: string
          p_clinic_name: string
          p_clinic_phone: string
          p_owner_name: string
          p_owner_phone: string
          p_province: string
        }
        Returns: string
      }
      replace_tooth_conditions: {
        Args: { p_conditions: Json; p_patient_id: string }
        Returns: undefined
      }
      replace_treatment_plans: {
        Args: { p_patient_id: string; p_plans: Json }
        Returns: undefined
      }
      replace_visit_treatments: {
        Args: { p_treatments: Json; p_visit_id: string }
        Returns: undefined
      }
      restore_emr_version: {
        Args: { p_reason?: string; p_version: number; p_visit_id: string }
        Returns: boolean
      }
      restore_visit_version: {
        Args: { p_version: number; p_visit_id: string }
        Returns: undefined
      }
      revoke_queue_display_link: { Args: { p_id: string }; Returns: undefined }
      save_visit_payment: {
        Args: {
          p_medications: Json
          p_payment: Json
          p_treatments: Json
          p_visit_id: string
        }
        Returns: Json
      }
      storage_object_in_my_clinic: {
        Args: { p_name: string }
        Returns: boolean
      }
      submit_booking_request: {
        Args: {
          p_complaint?: string
          p_date: string
          p_dokter_id: string
          p_name: string
          p_phone: string
          p_slug: string
          p_time: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  platform: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
