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
  public: {
    Tables: {
      absence_balances: {
        Row: {
          employee_id: string
          id: string
          sick_days_total: number
          sick_days_used: number
          tenant_id: string
          updated_at: string
          vacation_days_total: number
          vacation_days_used: number
          year: number
        }
        Insert: {
          employee_id: string
          id?: string
          sick_days_total?: number
          sick_days_used?: number
          tenant_id: string
          updated_at?: string
          vacation_days_total?: number
          vacation_days_used?: number
          year?: number
        }
        Update: {
          employee_id?: string
          id?: string
          sick_days_total?: number
          sick_days_used?: number
          tenant_id?: string
          updated_at?: string
          vacation_days_total?: number
          vacation_days_used?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "absence_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_balances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      absence_requests: {
        Row: {
          created_at: string
          days_count: number
          employee_id: string
          end_date: string
          id: string
          manager_note: string | null
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: string
          tenant_id: string
          type: string
        }
        Insert: {
          created_at?: string
          days_count?: number
          employee_id: string
          end_date: string
          id?: string
          manager_note?: string | null
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: string
          tenant_id: string
          type: string
        }
        Update: {
          created_at?: string
          days_count?: number
          employee_id?: string
          end_date?: string
          id?: string
          manager_note?: string | null
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: string
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "absence_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_edits: {
        Row: {
          applies_to_date: string
          created_at: string | null
          edit_type: string
          id: string
          payload: Json
          proposed_by: string
          reason: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          applies_to_date: string
          created_at?: string | null
          edit_type: string
          id?: string
          payload: Json
          proposed_by: string
          reason?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          applies_to_date?: string
          created_at?: string | null
          edit_type?: string
          id?: string
          payload?: Json
          proposed_by?: string
          reason?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_edits_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_edits_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_edits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_edits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_events: {
        Row: {
          app_identifier: string | null
          device_id: string | null
          domain: string | null
          duration_seconds: number | null
          event_type: string
          id: number
          metadata: Json | null
          productivity: string | null
          session_id: string | null
          started_at: string
          tenant_id: string
          user_id: string
          window_title: string | null
        }
        Insert: {
          app_identifier?: string | null
          device_id?: string | null
          domain?: string | null
          duration_seconds?: number | null
          event_type: string
          id?: number
          metadata?: Json | null
          productivity?: string | null
          session_id?: string | null
          started_at: string
          tenant_id: string
          user_id: string
          window_title?: string | null
        }
        Update: {
          app_identifier?: string | null
          device_id?: string | null
          domain?: string | null
          duration_seconds?: number | null
          event_type?: string
          id?: number
          metadata?: Json | null
          productivity?: string | null
          session_id?: string | null
          started_at?: string
          tenant_id?: string
          user_id?: string
          window_title?: string | null
        }
        Relationships: []
      }
      activity_events_2026_05: {
        Row: {
          app_identifier: string | null
          device_id: string | null
          domain: string | null
          duration_seconds: number | null
          event_type: string
          id: number
          metadata: Json | null
          productivity: string | null
          session_id: string | null
          started_at: string
          tenant_id: string
          user_id: string
          window_title: string | null
        }
        Insert: {
          app_identifier?: string | null
          device_id?: string | null
          domain?: string | null
          duration_seconds?: number | null
          event_type: string
          id?: number
          metadata?: Json | null
          productivity?: string | null
          session_id?: string | null
          started_at: string
          tenant_id: string
          user_id: string
          window_title?: string | null
        }
        Update: {
          app_identifier?: string | null
          device_id?: string | null
          domain?: string | null
          duration_seconds?: number | null
          event_type?: string
          id?: number
          metadata?: Json | null
          productivity?: string | null
          session_id?: string | null
          started_at?: string
          tenant_id?: string
          user_id?: string
          window_title?: string | null
        }
        Relationships: []
      }
      activity_events_2026_06: {
        Row: {
          app_identifier: string | null
          device_id: string | null
          domain: string | null
          duration_seconds: number | null
          event_type: string
          id: number
          metadata: Json | null
          productivity: string | null
          session_id: string | null
          started_at: string
          tenant_id: string
          user_id: string
          window_title: string | null
        }
        Insert: {
          app_identifier?: string | null
          device_id?: string | null
          domain?: string | null
          duration_seconds?: number | null
          event_type: string
          id?: number
          metadata?: Json | null
          productivity?: string | null
          session_id?: string | null
          started_at: string
          tenant_id: string
          user_id: string
          window_title?: string | null
        }
        Update: {
          app_identifier?: string | null
          device_id?: string | null
          domain?: string | null
          duration_seconds?: number | null
          event_type?: string
          id?: number
          metadata?: Json | null
          productivity?: string | null
          session_id?: string | null
          started_at?: string
          tenant_id?: string
          user_id?: string
          window_title?: string | null
        }
        Relationships: []
      }
      activity_events_2026_07: {
        Row: {
          app_identifier: string | null
          device_id: string | null
          domain: string | null
          duration_seconds: number | null
          event_type: string
          id: number
          metadata: Json | null
          productivity: string | null
          session_id: string | null
          started_at: string
          tenant_id: string
          user_id: string
          window_title: string | null
        }
        Insert: {
          app_identifier?: string | null
          device_id?: string | null
          domain?: string | null
          duration_seconds?: number | null
          event_type: string
          id?: number
          metadata?: Json | null
          productivity?: string | null
          session_id?: string | null
          started_at: string
          tenant_id: string
          user_id: string
          window_title?: string | null
        }
        Update: {
          app_identifier?: string | null
          device_id?: string | null
          domain?: string | null
          duration_seconds?: number | null
          event_type?: string
          id?: number
          metadata?: Json | null
          productivity?: string | null
          session_id?: string | null
          started_at?: string
          tenant_id?: string
          user_id?: string
          window_title?: string | null
        }
        Relationships: []
      }
      activity_events_2026_08: {
        Row: {
          app_identifier: string | null
          device_id: string | null
          domain: string | null
          duration_seconds: number | null
          event_type: string
          id: number
          metadata: Json | null
          productivity: string | null
          session_id: string | null
          started_at: string
          tenant_id: string
          user_id: string
          window_title: string | null
        }
        Insert: {
          app_identifier?: string | null
          device_id?: string | null
          domain?: string | null
          duration_seconds?: number | null
          event_type: string
          id?: number
          metadata?: Json | null
          productivity?: string | null
          session_id?: string | null
          started_at: string
          tenant_id: string
          user_id: string
          window_title?: string | null
        }
        Update: {
          app_identifier?: string | null
          device_id?: string | null
          domain?: string | null
          duration_seconds?: number | null
          event_type?: string
          id?: number
          metadata?: Json | null
          productivity?: string | null
          session_id?: string | null
          started_at?: string
          tenant_id?: string
          user_id?: string
          window_title?: string | null
        }
        Relationships: []
      }
      activity_events_2026_09: {
        Row: {
          app_identifier: string | null
          device_id: string | null
          domain: string | null
          duration_seconds: number | null
          event_type: string
          id: number
          metadata: Json | null
          productivity: string | null
          session_id: string | null
          started_at: string
          tenant_id: string
          user_id: string
          window_title: string | null
        }
        Insert: {
          app_identifier?: string | null
          device_id?: string | null
          domain?: string | null
          duration_seconds?: number | null
          event_type: string
          id?: number
          metadata?: Json | null
          productivity?: string | null
          session_id?: string | null
          started_at: string
          tenant_id: string
          user_id: string
          window_title?: string | null
        }
        Update: {
          app_identifier?: string | null
          device_id?: string | null
          domain?: string | null
          duration_seconds?: number | null
          event_type?: string
          id?: number
          metadata?: Json | null
          productivity?: string | null
          session_id?: string | null
          started_at?: string
          tenant_id?: string
          user_id?: string
          window_title?: string | null
        }
        Relationships: []
      }
      activity_events_2026_10: {
        Row: {
          app_identifier: string | null
          device_id: string | null
          domain: string | null
          duration_seconds: number | null
          event_type: string
          id: number
          metadata: Json | null
          productivity: string | null
          session_id: string | null
          started_at: string
          tenant_id: string
          user_id: string
          window_title: string | null
        }
        Insert: {
          app_identifier?: string | null
          device_id?: string | null
          domain?: string | null
          duration_seconds?: number | null
          event_type: string
          id?: number
          metadata?: Json | null
          productivity?: string | null
          session_id?: string | null
          started_at: string
          tenant_id: string
          user_id: string
          window_title?: string | null
        }
        Update: {
          app_identifier?: string | null
          device_id?: string | null
          domain?: string | null
          duration_seconds?: number | null
          event_type?: string
          id?: number
          metadata?: Json | null
          productivity?: string | null
          session_id?: string | null
          started_at?: string
          tenant_id?: string
          user_id?: string
          window_title?: string | null
        }
        Relationships: []
      }
      agent_devices: {
        Row: {
          agent_version: string
          capabilities: Json | null
          device_token_hash: string
          enrolled_at: string | null
          enrollment_code_hash: string | null
          hostname: string | null
          id: string
          last_seen_at: string | null
          name: string | null
          os: string
          os_version: string | null
          pin_hash: string | null
          platform: string | null
          revoked_at: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_version: string
          capabilities?: Json | null
          device_token_hash: string
          enrolled_at?: string | null
          enrollment_code_hash?: string | null
          hostname?: string | null
          id?: string
          last_seen_at?: string | null
          name?: string | null
          os: string
          os_version?: string | null
          pin_hash?: string | null
          platform?: string | null
          revoked_at?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_version?: string
          capabilities?: Json | null
          device_token_hash?: string
          enrolled_at?: string | null
          enrollment_code_hash?: string | null
          hostname?: string | null
          id?: string
          last_seen_at?: string | null
          name?: string | null
          os?: string
          os_version?: string | null
          pin_hash?: string | null
          platform?: string | null
          revoked_at?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_devices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_notifications: {
        Row: {
          alert_rule_id: string | null
          body: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          severity: string
          subject_user_id: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          alert_rule_id?: string | null
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          severity?: string
          subject_user_id?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          alert_rule_id?: string | null
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          severity?: string
          subject_user_id?: string | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_notifications_alert_rule_id_fkey"
            columns: ["alert_rule_id"]
            isOneToOne: false
            referencedRelation: "alert_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_notifications_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_rules: {
        Row: {
          consecutive_days: number
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          notify_admin: boolean
          notify_manager: boolean
          rule_type: string
          scope: string
          scope_id: string | null
          tenant_id: string
          threshold_value: number
        }
        Insert: {
          consecutive_days?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          notify_admin?: boolean
          notify_manager?: boolean
          rule_type: string
          scope?: string
          scope_id?: string | null
          tenant_id: string
          threshold_value: number
        }
        Update: {
          consecutive_days?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notify_admin?: boolean
          notify_manager?: boolean
          rule_type?: string
          scope?: string
          scope_id?: string | null
          tenant_id?: string
          threshold_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "alert_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          acknowledged_at: string | null
          alert_type: string
          id: string
          message: string
          metadata: Json | null
          severity: string | null
          tenant_id: string
          triggered_at: string | null
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          alert_type: string
          id?: string
          message: string
          metadata?: Json | null
          severity?: string | null
          tenant_id: string
          triggered_at?: string | null
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          alert_type?: string
          id?: string
          message?: string
          metadata?: Json | null
          severity?: string | null
          tenant_id?: string
          triggered_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_by: string | null
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          scopes: string[]
          tenant_id: string
        }
        Insert: {
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          scopes: string[]
          tenant_id: string
        }
        Update: {
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          scopes?: string[]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      api_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          scopes: string[]
          tenant_id: string
          token_hash: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          scopes?: string[]
          tenant_id: string
          token_hash: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          scopes?: string[]
          tenant_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_tokens_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      app_catalog: {
        Row: {
          category: string | null
          created_at: string | null
          display_name: string
          id: string
          identifier: string
          identifier_type: string
          name: string | null
          process_name: string | null
          productivity: string
          rule: string | null
          tenant_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          display_name: string
          id?: string
          identifier: string
          identifier_type: string
          name?: string | null
          process_name?: string | null
          productivity: string
          rule?: string | null
          tenant_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
          identifier?: string
          identifier_type?: string
          name?: string | null
          process_name?: string | null
          productivity?: string
          rule?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_catalog_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          after_state: Json | null
          before_state: Json | null
          entity_id: string | null
          entity_type: string | null
          id: number
          ip_inet: unknown
          occurred_at: string | null
          tenant_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: number
          ip_inet?: unknown
          occurred_at?: string | null
          tenant_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: number
          ip_inet?: unknown
          occurred_at?: string | null
          tenant_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      auth_sessions: {
        Row: {
          device_fingerprint: string | null
          expires_at: string
          id: string
          ip_inet: unknown
          issued_at: string | null
          refresh_token_hash: string
          revoked_at: string | null
          tenant_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          device_fingerprint?: string | null
          expires_at: string
          id?: string
          ip_inet?: unknown
          issued_at?: string | null
          refresh_token_hash: string
          revoked_at?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          device_fingerprint?: string | null
          expires_at?: string
          id?: string
          ip_inet?: unknown
          issued_at?: string | null
          refresh_token_hash?: string
          revoked_at?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auth_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auth_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_events: {
        Row: {
          amount_cop: number | null
          event_type: string
          id: string
          license_id: string | null
          metadata: Json | null
          occurred_at: string | null
          tenant_id: string
        }
        Insert: {
          amount_cop?: number | null
          event_type: string
          id?: string
          license_id?: string | null
          metadata?: Json | null
          occurred_at?: string | null
          tenant_id: string
        }
        Update: {
          amount_cop?: number | null
          event_type?: string
          id?: string
          license_id?: string | null
          metadata?: Json | null
          occurred_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      break_sessions: {
        Row: {
          created_at: string
          employee_id: string
          ended_at: string | null
          id: string
          note: string | null
          started_at: string
          tenant_id: string
          type: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          ended_at?: string | null
          id?: string
          note?: string | null
          started_at?: string
          tenant_id: string
          type?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          ended_at?: string | null
          id?: string
          note?: string | null
          started_at?: string
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "break_sessions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "break_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      consents: {
        Row: {
          consent_type: string
          evidence_hash: string | null
          granted: boolean
          granted_at: string | null
          id: string
          ip_inet: unknown
          policy_version: string
          revoked_at: string | null
          tenant_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          consent_type: string
          evidence_hash?: string | null
          granted: boolean
          granted_at?: string | null
          id?: string
          ip_inet?: unknown
          policy_version: string
          revoked_at?: string | null
          tenant_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          consent_type?: string
          evidence_hash?: string | null
          granted?: boolean
          granted_at?: string | null
          id?: string
          ip_inet?: unknown
          policy_version?: string
          revoked_at?: string | null
          tenant_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      corporate_ip_ranges: {
        Row: {
          cidr: unknown
          created_at: string | null
          id: string
          label: string | null
          tenant_id: string
        }
        Insert: {
          cidr: unknown
          created_at?: string | null
          id?: string
          label?: string | null
          tenant_id: string
        }
        Update: {
          cidr?: unknown
          created_at?: string | null
          id?: string
          label?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "corporate_ip_ranges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_user_metrics: {
        Row: {
          active_seconds: number | null
          apps_top: Json | null
          domains_top: Json | null
          expected_seconds: number | null
          focus_score: number | null
          location_type: string | null
          metric_date: string
          non_productive_seconds: number | null
          overtime_seconds: number | null
          productive_seconds: number | null
          productivity_ratio: number | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          active_seconds?: number | null
          apps_top?: Json | null
          domains_top?: Json | null
          expected_seconds?: number | null
          focus_score?: number | null
          location_type?: string | null
          metric_date: string
          non_productive_seconds?: number | null
          overtime_seconds?: number | null
          productive_seconds?: number | null
          productivity_ratio?: number | null
          tenant_id: string
          user_id: string
        }
        Update: {
          active_seconds?: number | null
          apps_top?: Json | null
          domains_top?: Json | null
          expected_seconds?: number | null
          focus_score?: number | null
          location_type?: string | null
          metric_date?: string
          non_productive_seconds?: number | null
          overtime_seconds?: number | null
          productive_seconds?: number | null
          productivity_ratio?: number | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: []
      }
      employee_goals: {
        Row: {
          created_at: string
          created_by: string
          current_value: number
          description: string | null
          due_date: string | null
          employee_id: string
          id: string
          status: string
          target_value: number | null
          tenant_id: string
          title: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          current_value?: number
          description?: string | null
          due_date?: string | null
          employee_id: string
          id?: string
          status?: string
          target_value?: number | null
          tenant_id: string
          title: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          current_value?: number
          description?: string | null
          due_date?: string | null
          employee_id?: string
          id?: string
          status?: string
          target_value?: number | null
          tenant_id?: string
          title?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_goals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_goals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_codes: {
        Row: {
          code: string | null
          code_hash: string
          created_at: string | null
          created_by: string
          expires_at: string
          id: string
          tenant_id: string
          used_at: string | null
          used_by_device: string | null
          user_id: string | null
        }
        Insert: {
          code?: string | null
          code_hash: string
          created_at?: string | null
          created_by: string
          expires_at: string
          id?: string
          tenant_id: string
          used_at?: string | null
          used_by_device?: string | null
          user_id?: string | null
        }
        Update: {
          code?: string | null
          code_hash?: string
          created_at?: string | null
          created_by?: string
          expires_at?: string
          id?: string
          tenant_id?: string
          used_at?: string | null
          used_by_device?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_codes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_codes_used_by_device_fkey"
            columns: ["used_by_device"]
            isOneToOne: false
            referencedRelation: "agent_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          active: boolean
          config: Json
          created_at: string
          id: string
          label: string | null
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          config?: Json
          created_at?: string
          id?: string
          label?: string | null
          tenant_id: string
          type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          config?: Json
          created_at?: string
          id?: string
          label?: string | null
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_email: string | null
          client_name: string | null
          created_at: string
          currency: string
          employee_id: string
          hours_worked: number
          id: string
          invoice_number: string | null
          notes: string | null
          period_end: string
          period_start: string
          rate_per_hour: number
          status: string
          subtotal: number
          tax_amount: number
          tax_rate: number
          tenant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          currency?: string
          employee_id: string
          hours_worked?: number
          id?: string
          invoice_number?: string | null
          notes?: string | null
          period_end: string
          period_start: string
          rate_per_hour?: number
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          tenant_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          currency?: string
          employee_id?: string
          hours_worked?: number
          id?: string
          invoice_number?: string | null
          notes?: string | null
          period_end?: string
          period_start?: string
          rate_per_hour?: number
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      licenses: {
        Row: {
          created_at: string | null
          ends_at: string | null
          feature_overrides: Json | null
          id: string
          plan_id: string
          seats_total: number
          starts_at: string
          status: string
          tenant_id: string
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          ends_at?: string | null
          feature_overrides?: Json | null
          id?: string
          plan_id: string
          seats_total: number
          starts_at: string
          status?: string
          tenant_id: string
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          ends_at?: string | null
          feature_overrides?: Json | null
          id?: string
          plan_id?: string
          seats_total?: number
          starts_at?: string
          status?: string
          tenant_id?: string
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "licenses_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_time_entries: {
        Row: {
          approved_by: string | null
          created_at: string | null
          description: string
          duration_minutes: number | null
          ended_at: string
          entry_date: string
          entry_type: string
          id: string
          review_note: string | null
          reviewed_at: string | null
          started_at: string
          status: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          description: string
          duration_minutes?: number | null
          ended_at: string
          entry_date: string
          entry_type?: string
          id?: string
          review_note?: string | null
          reviewed_at?: string | null
          started_at: string
          status?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          description?: string
          duration_minutes?: number | null
          ended_at?: string
          entry_date?: string
          entry_type?: string
          id?: string
          review_note?: string | null
          reviewed_at?: string | null
          started_at?: string
          status?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_time_entries_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_time_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_time_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          from_user_id: string
          id: string
          read_at: string | null
          tenant_id: string
          to_user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          from_user_id: string
          id?: string
          read_at?: string | null
          tenant_id: string
          to_user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          from_user_id?: string
          id?: string
          read_at?: string | null
          tenant_id?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          channel: string
          created_at: string | null
          id: string
          link: string | null
          read_at: string | null
          sent_by: string | null
          tenant_id: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          channel: string
          created_at?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          sent_by?: string | null
          tenant_id: string
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          channel?: string
          created_at?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          sent_by?: string | null
          tenant_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      overtime_requests: {
        Row: {
          created_at: string
          date: string
          employee_id: string
          id: string
          manager_note: string | null
          overtime_seconds: number
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tenant_id: string
          type: string
        }
        Insert: {
          created_at?: string
          date: string
          employee_id: string
          id?: string
          manager_note?: string | null
          overtime_seconds: number
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id: string
          type: string
        }
        Update: {
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          manager_note?: string | null
          overtime_seconds?: number
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "overtime_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      password_history: {
        Row: {
          created_at: string | null
          id: string
          password_hash: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          password_hash: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          password_hash?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "password_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "password_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          code: string
          created_at: string | null
          features: Json
          id: string
          is_active: boolean | null
          monthly_price_per_seat_cop: number
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          features?: Json
          id?: string
          is_active?: boolean | null
          monthly_price_per_seat_cop: number
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          features?: Json
          id?: string
          is_active?: boolean | null
          monthly_price_per_seat_cop?: number
          name?: string
        }
        Relationships: []
      }
      project_tasks: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          project_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          project_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          project_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_time_entries: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          notes: string | null
          project_id: string
          started_at: string
          task_id: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          project_id: string
          started_at: string
          task_id?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          started_at?: string
          task_id?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_time_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_reports: {
        Row: {
          created_by: string
          cron_expression: string
          filters: Json | null
          format: string | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          name: string
          next_run_at: string | null
          recipients: string[]
          report_type: string
          tenant_id: string
        }
        Insert: {
          created_by: string
          cron_expression: string
          filters?: Json | null
          format?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          recipients: string[]
          report_type: string
          tenant_id: string
        }
        Update: {
          created_by?: string
          cron_expression?: string
          filters?: Json | null
          format?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          recipients?: string[]
          report_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      screenshots: {
        Row: {
          created_at: string | null
          device_id: string | null
          height: number | null
          id: string
          session_id: string | null
          storage_path: string
          taken_at: string
          tenant_id: string
          thumbnail_path: string | null
          user_id: string
          width: number | null
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          height?: number | null
          id?: string
          session_id?: string | null
          storage_path: string
          taken_at?: string
          tenant_id: string
          thumbnail_path?: string | null
          user_id: string
          width?: number | null
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          height?: number | null
          id?: string
          session_id?: string | null
          storage_path?: string
          taken_at?: string
          tenant_id?: string
          thumbnail_path?: string | null
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "screenshots_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "agent_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screenshots_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "work_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screenshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screenshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          joined_at: string | null
          role: string
          team_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string | null
          role?: string
          team_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          joined_at?: string | null
          role?: string
          team_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          manager_id: string | null
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          manager_id?: string | null
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          manager_id?: string | null
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          contact_email: string
          contact_phone: string | null
          country_code: string | null
          created_at: string | null
          data_protection_officer: string | null
          data_retention_months: number | null
          id: string
          legal_name: string
          logo_url: string | null
          nit: string
          onboarding_complete: boolean
          status: string
          timezone: string | null
          trade_name: string | null
          updated_at: string | null
        }
        Insert: {
          contact_email: string
          contact_phone?: string | null
          country_code?: string | null
          created_at?: string | null
          data_protection_officer?: string | null
          data_retention_months?: number | null
          id?: string
          legal_name: string
          logo_url?: string | null
          nit: string
          onboarding_complete?: boolean
          status?: string
          timezone?: string | null
          trade_name?: string | null
          updated_at?: string | null
        }
        Update: {
          contact_email?: string
          contact_phone?: string | null
          country_code?: string | null
          created_at?: string | null
          data_protection_officer?: string | null
          data_retention_months?: number | null
          id?: string
          legal_name?: string
          logo_url?: string | null
          nit?: string
          onboarding_complete?: boolean
          status?: string
          timezone?: string | null
          trade_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      time_off: {
        Row: {
          approved_by: string | null
          created_at: string | null
          ends_on: string
          id: string
          notes: string | null
          starts_on: string
          status: string | null
          tenant_id: string
          type: string
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          ends_on: string
          id?: string
          notes?: string | null
          starts_on: string
          status?: string | null
          tenant_id: string
          type: string
          user_id: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          ends_on?: string
          id?: string
          notes?: string | null
          starts_on?: string
          status?: string | null
          tenant_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_off_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_off_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_off_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_schedules: {
        Row: {
          effective_from: string
          effective_to: string | null
          schedule_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          effective_from: string
          effective_to?: string | null
          schedule_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          effective_from?: string
          effective_to?: string | null
          schedule_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_schedules_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "work_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          department: string | null
          document_id_encrypted: string | null
          email: string
          failed_login_attempts: number | null
          full_name: string
          geo_city: string | null
          geo_country: string | null
          geo_lat: number | null
          geo_lon: number | null
          id: string
          last_login_at: string | null
          locked_until: string | null
          manager_id: string | null
          mfa_enabled: boolean | null
          mfa_secret_encrypted: string | null
          must_change_password: boolean | null
          password_changed_at: string | null
          password_hash: string
          position: string | null
          role: string
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          document_id_encrypted?: string | null
          email: string
          failed_login_attempts?: number | null
          full_name: string
          geo_city?: string | null
          geo_country?: string | null
          geo_lat?: number | null
          geo_lon?: number | null
          id?: string
          last_login_at?: string | null
          locked_until?: string | null
          manager_id?: string | null
          mfa_enabled?: boolean | null
          mfa_secret_encrypted?: string | null
          must_change_password?: boolean | null
          password_changed_at?: string | null
          password_hash: string
          position?: string | null
          role: string
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          document_id_encrypted?: string | null
          email?: string
          failed_login_attempts?: number | null
          full_name?: string
          geo_city?: string | null
          geo_country?: string | null
          geo_lat?: number | null
          geo_lon?: number | null
          id?: string
          last_login_at?: string | null
          locked_until?: string | null
          manager_id?: string | null
          mfa_enabled?: boolean | null
          mfa_secret_encrypted?: string | null
          must_change_password?: boolean | null
          password_changed_at?: string | null
          password_hash?: string
          position?: string | null
          role?: string
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          created_at: string
          error: string | null
          event: string
          id: string
          payload: Json
          status_code: number | null
          tenant_id: string
          webhook_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          event: string
          id?: string
          payload: Json
          status_code?: number | null
          tenant_id: string
          webhook_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          event?: string
          id?: string
          payload?: Json
          status_code?: number | null
          tenant_id?: string
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string
          created_by: string | null
          events: string[]
          id: string
          is_active: boolean
          last_called_at: string | null
          last_status_code: number | null
          name: string
          secret: string | null
          tenant_id: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          events?: string[]
          id?: string
          is_active?: boolean
          last_called_at?: string | null
          last_status_code?: number | null
          name: string
          secret?: string | null
          tenant_id: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          events?: string[]
          id?: string
          is_active?: boolean
          last_called_at?: string | null
          last_status_code?: number | null
          name?: string
          secret?: string | null
          tenant_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhooks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      work_schedules: {
        Row: {
          break_alert_enabled: boolean
          break_alert_interval_minutes: number
          break_alert_message: string
          break_minutes: number | null
          created_at: string | null
          days_of_week: number[] | null
          disconnection_grace_minutes: number | null
          end_of_day_alert_enabled: boolean
          end_of_day_alert_message: string
          end_of_day_alert_offset_minutes: number
          end_time: string | null
          flex_minutes: number | null
          id: string
          name: string
          start_time: string | null
          tenant_id: string
          timezone: string
          updated_at: string | null
          weekly_hours: number | null
        }
        Insert: {
          break_alert_enabled?: boolean
          break_alert_interval_minutes?: number
          break_alert_message?: string
          break_minutes?: number | null
          created_at?: string | null
          days_of_week?: number[] | null
          disconnection_grace_minutes?: number | null
          end_of_day_alert_enabled?: boolean
          end_of_day_alert_message?: string
          end_of_day_alert_offset_minutes?: number
          end_time?: string | null
          flex_minutes?: number | null
          id?: string
          name: string
          start_time?: string | null
          tenant_id: string
          timezone?: string
          updated_at?: string | null
          weekly_hours?: number | null
        }
        Update: {
          break_alert_enabled?: boolean
          break_alert_interval_minutes?: number
          break_alert_message?: string
          break_minutes?: number | null
          created_at?: string | null
          days_of_week?: number[] | null
          disconnection_grace_minutes?: number | null
          end_of_day_alert_enabled?: boolean
          end_of_day_alert_message?: string
          end_of_day_alert_offset_minutes?: number
          end_time?: string | null
          flex_minutes?: number | null
          id?: string
          name?: string
          start_time?: string | null
          tenant_id?: string
          timezone?: string
          updated_at?: string | null
          weekly_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "work_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      work_sessions: {
        Row: {
          active_seconds: number | null
          created_at: string | null
          device_id: string | null
          ended_at: string | null
          id: string
          idle_seconds: number | null
          ip_inet: unknown
          location_type: string | null
          non_productive_seconds: number | null
          productive_seconds: number | null
          source: string | null
          started_at: string
          status: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          active_seconds?: number | null
          created_at?: string | null
          device_id?: string | null
          ended_at?: string | null
          id?: string
          idle_seconds?: number | null
          ip_inet?: unknown
          location_type?: string | null
          non_productive_seconds?: number | null
          productive_seconds?: number | null
          source?: string | null
          started_at: string
          status?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          active_seconds?: number | null
          created_at?: string | null
          device_id?: string | null
          ended_at?: string | null
          id?: string
          idle_seconds?: number | null
          ip_inet?: unknown
          location_type?: string | null
          non_productive_seconds?: number | null
          productive_seconds?: number | null
          source?: string | null
          started_at?: string
          status?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_sessions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "agent_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aggregate_daily_user_metrics: {
        Args: { p_date: string; p_tenant_id?: string }
        Returns: {
          out_date: string
          out_tenant_id: string
          out_user_id: string
          rows_upserted: number
        }[]
      }
      backfill_daily_metrics: {
        Args: { p_days?: number; p_tenant_id?: string }
        Returns: number
      }
      evaluate_alerts: {
        Args: { p_date: string; p_tenant_id?: string }
        Returns: number
      }
      get_weekly_digest: {
        Args: { p_from: string; p_tenant_id: string; p_to: string }
        Returns: {
          avg_productivity: number
          days_active: number
          email: string
          full_name: string
          total_active_seconds: number
          total_overtime_secs: number
          total_productive_secs: number
          user_id: string
        }[]
      }
      set_tenant_context: {
        Args: { p_role: string; p_tenant: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
