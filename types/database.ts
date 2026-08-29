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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      admin_staff: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          organization_id: string
          permissions: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          permissions: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          permissions?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_staff_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_staff_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_type: Database["public"]["Enums"]["appointment_type"]
          booking_source: Database["public"]["Enums"]["booking_source"]
          called_at: string | null
          cancellation_reason: string | null
          cancelled_by: string | null
          checked_in_at: string | null
          checked_in_by: string | null
          completed_at: string | null
          consultation_fee: number
          created_at: string | null
          doctor_id: string | null
          doctor_notes: string | null
          duration_minutes: number | null
          expiry_processed_at: string | null
          id: string
          no_show_party: string | null
          organization_id: string
          patient_id: string | null
          patient_notes: string | null
          prescription_url: string | null
          queue_position: number | null
          reminder_sent_at: string | null
          scheduled_at: string
          service_id: string | null
          status: Database["public"]["Enums"]["appointment_status"] | null
          token_number: string | null
          updated_at: string | null
          video_room_url: string | null
        }
        Insert: {
          appointment_type: Database["public"]["Enums"]["appointment_type"]
          booking_source?: Database["public"]["Enums"]["booking_source"]
          called_at?: string | null
          cancellation_reason?: string | null
          cancelled_by?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          completed_at?: string | null
          consultation_fee: number
          created_at?: string | null
          doctor_id?: string | null
          doctor_notes?: string | null
          duration_minutes?: number | null
          expiry_processed_at?: string | null
          id?: string
          no_show_party?: string | null
          organization_id?: string
          patient_id?: string | null
          patient_notes?: string | null
          prescription_url?: string | null
          queue_position?: number | null
          reminder_sent_at?: string | null
          scheduled_at: string
          service_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status"] | null
          token_number?: string | null
          updated_at?: string | null
          video_room_url?: string | null
        }
        Update: {
          appointment_type?: Database["public"]["Enums"]["appointment_type"]
          booking_source?: Database["public"]["Enums"]["booking_source"]
          called_at?: string | null
          cancellation_reason?: string | null
          cancelled_by?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          completed_at?: string | null
          consultation_fee?: number
          created_at?: string | null
          doctor_id?: string | null
          doctor_notes?: string | null
          duration_minutes?: number | null
          expiry_processed_at?: string | null
          id?: string
          no_show_party?: string | null
          organization_id?: string
          patient_id?: string | null
          patient_notes?: string | null
          prescription_url?: string | null
          queue_position?: number | null
          reminder_sent_at?: string | null
          scheduled_at?: string
          service_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status"] | null
          token_number?: string | null
          updated_at?: string | null
          video_room_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_checked_in_by_fkey"
            columns: ["checked_in_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_shares: {
        Row: {
          assessment_id: string
          doctor_id: string
          doctor_notes: string | null
          id: string
          reviewed_at: string | null
          shared_at: string
          status: string
        }
        Insert: {
          assessment_id: string
          doctor_id: string
          doctor_notes?: string | null
          id?: string
          reviewed_at?: string | null
          shared_at?: string
          status?: string
        }
        Update: {
          assessment_id?: string
          doctor_id?: string
          doctor_notes?: string | null
          id?: string
          reviewed_at?: string | null
          shared_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_shares_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "patient_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_shares_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          organization_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          organization_id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_slots: {
        Row: {
          created_at: string | null
          day_of_week: number
          doctor_id: string | null
          end_time: string
          id: string
          is_active: boolean | null
          organization_id: string
          slot_duration_minutes: number | null
          start_time: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          doctor_id?: string | null
          end_time: string
          id?: string
          is_active?: boolean | null
          organization_id?: string
          slot_duration_minutes?: number | null
          start_time: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          doctor_id?: string | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          organization_id?: string
          slot_duration_minutes?: number | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_slots_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_slots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_payments: {
        Row: {
          amount: number
          appointment_id: string
          id: string
          invoice_id: string
          method: Database["public"]["Enums"]["clinic_payment_method"]
          notes: string | null
          organization_id: string
          received_at: string
          received_by: string | null
        }
        Insert: {
          amount: number
          appointment_id: string
          id?: string
          invoice_id: string
          method: Database["public"]["Enums"]["clinic_payment_method"]
          notes?: string | null
          organization_id?: string
          received_at?: string
          received_by?: string | null
        }
        Update: {
          amount?: number
          appointment_id?: string
          id?: string
          invoice_id?: string
          method?: Database["public"]["Enums"]["clinic_payment_method"]
          notes?: string | null
          organization_id?: string
          received_at?: string
          received_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_payments_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_subscription_payments: {
        Row: {
          amount: number
          billing_cycle: string
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          payment_method: string | null
          plan_id: string
          proof_url: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          submitted_by: string
          subscription_id: string
        }
        Insert: {
          amount: number
          billing_cycle: string
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          payment_method?: string | null
          plan_id: string
          proof_url: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          submitted_by: string
          subscription_id: string
        }
        Update: {
          amount?: number
          billing_cycle?: string
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          payment_method?: string | null
          plan_id?: string
          proof_url?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_subscription_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_subscription_payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "clinic_subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_subscription_payments_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_subscription_payments_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_subscription_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "clinic_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_subscription_plans: {
        Row: {
          description: string
          features: string[]
          id: string
          is_active: boolean
          monthly_amount: number
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          description?: string
          features?: string[]
          id: string
          is_active?: boolean
          monthly_amount: number
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          description?: string
          features?: string[]
          id?: string
          is_active?: boolean
          monthly_amount?: number
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      clinic_subscriptions: {
        Row: {
          created_at: string
          id: string
          last_reminder_on: string | null
          organization_id: string
          paid_through: string
          plan_id: string
          slug: string
          unfreeze_until: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_reminder_on?: string | null
          organization_id?: string
          paid_through: string
          plan_id: string
          slug?: string
          unfreeze_until?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_reminder_on?: string | null
          organization_id?: string
          paid_through?: string
          plan_id?: string
          slug?: string
          unfreeze_until?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "clinic_subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          appointment_id: string
          chief_complaint: string | null
          completed_at: string | null
          created_at: string
          diagnosis: string | null
          doctor_id: string
          follow_up_date: string | null
          id: string
          organization_id: string
          patient_id: string
          symptoms: string | null
          treatment_notes: string | null
          updated_at: string
        }
        Insert: {
          appointment_id: string
          chief_complaint?: string | null
          completed_at?: string | null
          created_at?: string
          diagnosis?: string | null
          doctor_id: string
          follow_up_date?: string | null
          id?: string
          organization_id?: string
          patient_id: string
          symptoms?: string | null
          treatment_notes?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          chief_complaint?: string | null
          completed_at?: string | null
          created_at?: string
          diagnosis?: string | null
          doctor_id?: string
          follow_up_date?: string | null
          id?: string
          organization_id?: string
          patient_id?: string
          symptoms?: string | null
          treatment_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultations_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          participant_a: string
          participant_b: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_a: string
          participant_b: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_a?: string
          participant_b?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_participant_a_fkey"
            columns: ["participant_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_b_fkey"
            columns: ["participant_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_blocked_slots: {
        Row: {
          blocked_date: string
          created_at: string
          doctor_id: string
          end_time: string | null
          id: string
          organization_id: string
          reason: string
          start_time: string | null
        }
        Insert: {
          blocked_date: string
          created_at?: string
          doctor_id: string
          end_time?: string | null
          id?: string
          organization_id?: string
          reason?: string
          start_time?: string | null
        }
        Update: {
          blocked_date?: string
          created_at?: string
          doctor_id?: string
          end_time?: string | null
          id?: string
          organization_id?: string
          reason?: string
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_blocked_slots_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_blocked_slots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_landing_pages: {
        Row: {
          created_at: string
          doctor_id: string
          draft_content: Json
          id: string
          is_featured: boolean
          organization_id: string
          published_at: string | null
          published_content: Json | null
          slug: string
          status: Database["public"]["Enums"]["landing_page_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          draft_content?: Json
          id?: string
          is_featured?: boolean
          organization_id?: string
          published_at?: string | null
          published_content?: Json | null
          slug: string
          status?: Database["public"]["Enums"]["landing_page_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          draft_content?: Json
          id?: string
          is_featured?: boolean
          organization_id?: string
          published_at?: string | null
          published_content?: Json | null
          slug?: string
          status?: Database["public"]["Enums"]["landing_page_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_landing_pages_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: true
            referencedRelation: "doctor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_landing_pages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_medicines: {
        Row: {
          category: string
          created_at: string
          doctor_id: string
          dosage_options: string[]
          id: string
          is_active: boolean
          master_medicine_id: string | null
          name: string
          notes: string | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          doctor_id: string
          dosage_options?: string[]
          id?: string
          is_active?: boolean
          master_medicine_id?: string | null
          name: string
          notes?: string | null
          organization_id?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          doctor_id?: string
          dosage_options?: string[]
          id?: string
          is_active?: boolean
          master_medicine_id?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_medicines_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_medicines_master_medicine_id_fkey"
            columns: ["master_medicine_id"]
            isOneToOne: false
            referencedRelation: "master_medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_medicines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          bio: string | null
          cities: string[] | null
          consultation_fee: number
          created_at: string | null
          documents: Json | null
          experience_years: number
          follow_up_fee: number | null
          hospital_affiliations: string[] | null
          id: string
          is_available: boolean | null
          languages: string[] | null
          organization_id: string
          pmdc_number: string
          qualification: string[]
          rating: number | null
          rejection_reason: string | null
          specialization: string
          status: Database["public"]["Enums"]["doctor_status"] | null
          sub_specialization: string | null
          total_consultations: number | null
          total_reviews: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          bio?: string | null
          cities?: string[] | null
          consultation_fee: number
          created_at?: string | null
          documents?: Json | null
          experience_years: number
          follow_up_fee?: number | null
          hospital_affiliations?: string[] | null
          id?: string
          is_available?: boolean | null
          languages?: string[] | null
          organization_id?: string
          pmdc_number: string
          qualification: string[]
          rating?: number | null
          rejection_reason?: string | null
          specialization: string
          status?: Database["public"]["Enums"]["doctor_status"] | null
          sub_specialization?: string | null
          total_consultations?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          bio?: string | null
          cities?: string[] | null
          consultation_fee?: number
          created_at?: string | null
          documents?: Json | null
          experience_years?: number
          follow_up_fee?: number | null
          hospital_affiliations?: string[] | null
          id?: string
          is_available?: boolean | null
          languages?: string[] | null
          organization_id?: string
          pmdc_number?: string
          qualification?: string[]
          rating?: number | null
          rejection_reason?: string | null
          specialization?: string
          status?: Database["public"]["Enums"]["doctor_status"] | null
          sub_specialization?: string | null
          total_consultations?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_profiles_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_public_services: {
        Row: {
          consultation_types: string[]
          created_at: string
          doctor_id: string
          fee_override: number | null
          id: string
          is_visible: boolean
          organization_id: string
          service_id: string
          sort_order: number
        }
        Insert: {
          consultation_types?: string[]
          created_at?: string
          doctor_id: string
          fee_override?: number | null
          id?: string
          is_visible?: boolean
          organization_id?: string
          service_id: string
          sort_order?: number
        }
        Update: {
          consultation_types?: string[]
          created_at?: string
          doctor_id?: string
          fee_override?: number | null
          id?: string
          is_visible?: boolean
          organization_id?: string
          service_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "doctor_public_services_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_public_services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_public_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_taxonomy: {
        Row: {
          created_at: string
          doctor_id: string
          taxonomy_id: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          taxonomy_id: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          taxonomy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_taxonomy_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_taxonomy_taxonomy_id_fkey"
            columns: ["taxonomy_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_items"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          description: string
          id: string
          invoice_id: string
          line_total: number
          organization_id: string
          quantity: number
          service_id: string | null
          unit_price: number
        }
        Insert: {
          description: string
          id?: string
          invoice_id: string
          line_total: number
          organization_id?: string
          quantity?: number
          service_id?: string | null
          unit_price: number
        }
        Update: {
          description?: string
          id?: string
          invoice_id?: string
          line_total?: number
          organization_id?: string
          quantity?: number
          service_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          appointment_id: string
          created_at: string
          created_by: string | null
          discount: number
          doctor_id: string
          id: string
          invoice_number: string
          notes: string | null
          organization_id: string
          patient_id: string
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          created_by?: string | null
          discount?: number
          doctor_id: string
          id?: string
          invoice_number: string
          notes?: string | null
          organization_id?: string
          patient_id: string
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          created_by?: string | null
          discount?: number
          doctor_id?: string
          id?: string
          invoice_number?: string
          notes?: string | null
          organization_id?: string
          patient_id?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      master_medicines: {
        Row: {
          category: string
          created_at: string
          dosage_options: string[]
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          dosage_options?: string[]
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          dosage_options?: string[]
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reads: {
        Row: {
          message_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          message_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          message_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_size: number | null
          attachment_type: string | null
          attachment_url: string | null
          body: string | null
          conversation_id: string
          created_at: string | null
          deleted_for_everyone: boolean | null
          deleted_for_sender: boolean | null
          edited_at: string | null
          id: string
          is_edited: boolean | null
          reply_to_id: string | null
          sender_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          body?: string | null
          conversation_id: string
          created_at?: string | null
          deleted_for_everyone?: boolean | null
          deleted_for_sender?: boolean | null
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          reply_to_id?: string | null
          sender_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          body?: string | null
          conversation_id?: string
          created_at?: string | null
          deleted_for_everyone?: boolean | null
          deleted_for_sender?: boolean | null
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          reply_to_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      no_show_events: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          metadata: Json | null
          organization_id: string
          party: string
          reason: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          organization_id?: string
          party: string
          reason: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          organization_id?: string
          party?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "no_show_events_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "no_show_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          member_role: Database["public"]["Enums"]["organization_member_role"]
          organization_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          member_role: Database["public"]["Enums"]["organization_member_role"]
          organization_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          member_role?: Database["public"]["Enums"]["organization_member_role"]
          organization_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          created_by: string | null
          id: string
          is_publicly_listed: boolean
          kind: Database["public"]["Enums"]["organization_kind"]
          name: string
          phone: string | null
          slug: string
          status: Database["public"]["Enums"]["organization_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_publicly_listed?: boolean
          kind?: Database["public"]["Enums"]["organization_kind"]
          name: string
          phone?: string | null
          slug: string
          status?: Database["public"]["Enums"]["organization_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_publicly_listed?: boolean
          kind?: Database["public"]["Enums"]["organization_kind"]
          name?: string
          phone?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["organization_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_assessments: {
        Row: {
          created_at: string
          id: string
          patient_id: string
          responses: Json
          severity: string
          test_type: string
          total_score: number
        }
        Insert: {
          created_at?: string
          id?: string
          patient_id: string
          responses: Json
          severity: string
          test_type: string
          total_score: number
        }
        Update: {
          created_at?: string
          id?: string
          patient_id?: string
          responses?: Json
          severity?: string
          test_type?: string
          total_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "patient_assessments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_documents: {
        Row: {
          appointment_id: string | null
          consultation_id: string | null
          created_at: string
          file_name: string
          file_url: string
          id: string
          mime_type: string | null
          organization_id: string
          patient_id: string
          uploaded_by: string | null
        }
        Insert: {
          appointment_id?: string | null
          consultation_id?: string | null
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          mime_type?: string | null
          organization_id?: string
          patient_id: string
          uploaded_by?: string | null
        }
        Update: {
          appointment_id?: string | null
          consultation_id?: string | null
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          mime_type?: string | null
          organization_id?: string
          patient_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_documents_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_accounts: {
        Row: {
          account_number: string
          account_title: string
          bank_name: string | null
          created_at: string | null
          created_by: string | null
          display_order: number
          iban: string | null
          id: string
          instructions: string | null
          is_active: boolean
          method: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          account_number: string
          account_title: string
          bank_name?: string | null
          created_at?: string | null
          created_by?: string | null
          display_order?: number
          iban?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          method: string
          organization_id?: string
          updated_at?: string | null
        }
        Update: {
          account_number?: string
          account_title?: string
          bank_name?: string | null
          created_at?: string | null
          created_by?: string | null
          display_order?: number
          iban?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          method?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          appointment_id: string | null
          created_at: string | null
          doctor_earning: number
          doctor_id: string | null
          gateway_response: Json | null
          id: string
          organization_id: string
          paid_at: string | null
          paid_by: string | null
          patient_id: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payout_receipt_url: string | null
          payout_reference: string | null
          payout_status: string
          platform_fee: number | null
          proof_url: string | null
          refund_amount: number | null
          refund_id: string | null
          refund_initiated_at: string | null
          refund_note: string | null
          refund_processed_at: string | null
          refund_processed_by: string | null
          refund_status: string
          refunded_at: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          created_at?: string | null
          doctor_earning: number
          doctor_id?: string | null
          gateway_response?: Json | null
          id?: string
          organization_id?: string
          paid_at?: string | null
          paid_by?: string | null
          patient_id?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payout_receipt_url?: string | null
          payout_reference?: string | null
          payout_status?: string
          platform_fee?: number | null
          proof_url?: string | null
          refund_amount?: number | null
          refund_id?: string | null
          refund_initiated_at?: string | null
          refund_note?: string | null
          refund_processed_at?: string | null
          refund_processed_by?: string | null
          refund_status?: string
          refunded_at?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          created_at?: string | null
          doctor_earning?: number
          doctor_id?: string | null
          gateway_response?: Json | null
          id?: string
          organization_id?: string
          paid_at?: string | null
          paid_by?: string | null
          patient_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payout_receipt_url?: string | null
          payout_reference?: string | null
          payout_status?: string
          platform_fee?: number | null
          proof_url?: string | null
          refund_amount?: number | null
          refund_id?: string | null
          refund_initiated_at?: string | null
          refund_note?: string | null
          refund_processed_at?: string | null
          refund_processed_by?: string | null
          refund_status?: string
          refunded_at?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_refund_processed_by_fkey"
            columns: ["refund_processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_items: {
        Row: {
          dose: string | null
          duration: string | null
          frequency: string | null
          id: string
          instructions: string | null
          medicine_name: string
          organization_id: string
          prescription_id: string
          sort_order: number
        }
        Insert: {
          dose?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          medicine_name: string
          organization_id?: string
          prescription_id: string
          sort_order?: number
        }
        Update: {
          dose?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          medicine_name?: string
          organization_id?: string
          prescription_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          appointment_id: string
          consultation_id: string
          created_at: string
          doctor_id: string
          id: string
          instructions: string | null
          organization_id: string
          patient_id: string
          updated_at: string
        }
        Insert: {
          appointment_id: string
          consultation_id: string
          created_at?: string
          doctor_id: string
          id?: string
          instructions?: string | null
          organization_id?: string
          patient_id: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          consultation_id?: string
          created_at?: string
          doctor_id?: string
          id?: string
          instructions?: string | null
          organization_id?: string
          patient_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: true
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          city: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string
          full_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          is_active: boolean | null
          patient_code: string | null
          phone: string | null
          rejection_reason: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email: string
          full_name: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id: string
          is_active?: boolean | null
          patient_code?: string | null
          phone?: string | null
          rejection_reason?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string
          full_name?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          is_active?: boolean | null
          patient_code?: string | null
          phone?: string | null
          rejection_reason?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          expiration_time: number | null
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          expiration_time?: number | null
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          expiration_time?: number | null
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          appointment_id: string | null
          comment: string | null
          created_at: string | null
          display_name: string | null
          doctor_id: string | null
          id: string
          is_visible: boolean | null
          moderated_at: string | null
          moderated_by: string | null
          moderation_status: Database["public"]["Enums"]["review_moderation_status"]
          organization_id: string
          patient_id: string | null
          rating: number | null
        }
        Insert: {
          appointment_id?: string | null
          comment?: string | null
          created_at?: string | null
          display_name?: string | null
          doctor_id?: string | null
          id?: string
          is_visible?: boolean | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_status?: Database["public"]["Enums"]["review_moderation_status"]
          organization_id?: string
          patient_id?: string | null
          rating?: number | null
        }
        Update: {
          appointment_id?: string | null
          comment?: string | null
          created_at?: string | null
          display_name?: string | null
          doctor_id?: string | null
          id?: string
          is_visible?: boolean | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_status?: Database["public"]["Enums"]["review_moderation_status"]
          organization_id?: string
          patient_id?: string | null
          rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          default_fee: number
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_fee?: number
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_fee?: number
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      taxonomy_items: {
        Row: {
          id: string
          is_active: boolean
          kind: string
          label: string
          sort_order: number
        }
        Insert: {
          id: string
          is_active?: boolean
          kind: string
          label: string
          sort_order?: number
        }
        Update: {
          id?: string
          is_active?: boolean
          kind?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      vitals: {
        Row: {
          blood_pressure: string | null
          consultation_id: string
          height: number | null
          id: string
          organization_id: string
          pulse: number | null
          recorded_at: string
          recorded_by: string | null
          spo2: number | null
          temperature: number | null
          weight: number | null
        }
        Insert: {
          blood_pressure?: string | null
          consultation_id: string
          height?: number | null
          id?: string
          organization_id?: string
          pulse?: number | null
          recorded_at?: string
          recorded_by?: string | null
          spo2?: number | null
          temperature?: number | null
          weight?: number | null
        }
        Update: {
          blood_pressure?: string | null
          consultation_id?: string
          height?: number | null
          id?: string
          organization_id?: string
          pulse?: number | null
          recorded_at?: string
          recorded_by?: string | null
          spo2?: number | null
          temperature?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vitals_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: true
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vitals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vitals_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      doctor_public_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          display_name: string | null
          doctor_id: string | null
          id: string | null
          rating: number | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          display_name?: string | null
          doctor_id?: string | null
          id?: string | null
          rating?: number | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          display_name?: string | null
          doctor_id?: string | null
          id?: string | null
          rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      apply_cancellation_refund: {
        Args: {
          p_payment_id: string
          p_refund_amount: number
          p_refund_note?: string
          p_refund_status: string
        }
        Returns: undefined
      }
      clinic_call_next: { Args: { p_doctor_id: string }; Returns: string }
      clinic_check_in: {
        Args: { p_appointment_id: string }
        Returns: {
          status: Database["public"]["Enums"]["appointment_status"]
          token_number: string
        }[]
      }
      clinic_collect_payment: {
        Args: {
          p_appointment_id: string
          p_discount?: number
          p_method: Database["public"]["Enums"]["clinic_payment_method"]
          p_notes?: string
        }
        Returns: string
      }
      clinic_complete_consultation: {
        Args: { p_appointment_id: string }
        Returns: Database["public"]["Enums"]["appointment_status"]
      }
      clinic_create_walk_in: {
        Args: {
          p_doctor_id: string
          p_notes?: string
          p_patient_id: string
          p_service_id?: string
        }
        Returns: string
      }
      clinic_desk_import_master_medicines: {
        Args: { p_doctor_id: string; p_medicine_ids: string[] }
        Returns: number
      }
      clinic_ensure_consultation: {
        Args: { p_appointment_id: string }
        Returns: string
      }
      clinic_ensure_invoice: {
        Args: { p_appointment_id: string; p_discount?: number }
        Returns: string
      }
      clinic_import_master_medicines: {
        Args: { p_medicine_ids: string[] }
        Returns: number
      }
      clinic_is_prepaid: {
        Args: { p_appointment_id: string }
        Returns: boolean
      }
      clinic_next_token: { Args: { p_doctor_id: string }; Returns: string }
      clinic_open_consultation: {
        Args: { p_appointment_id: string }
        Returns: string
      }
      clinic_organization_id_for_user: { Args: never; Returns: string }
      create_organization: {
        Args: {
          p_address?: string
          p_city?: string
          p_is_publicly_listed?: boolean
          p_kind?: Database["public"]["Enums"]["organization_kind"]
          p_name: string
          p_phone?: string
        }
        Returns: string
      }
      invite_organization_member: {
        Args: {
          p_email: string
          p_member_role: Database["public"]["Enums"]["organization_member_role"]
          p_organization_id: string
        }
        Returns: Json
      }
      accept_organization_invite: { Args: { p_token: string }; Returns: string }
      revoke_organization_invite: {
        Args: { p_invite_id: string }
        Returns: undefined
      }
      clinic_pkt_today: { Args: never; Returns: string }
      clinic_reassign_doctor: {
        Args: { p_appointment_id: string; p_doctor_id: string }
        Returns: undefined
      }
      clinic_record_vitals: {
        Args: {
          p_appointment_id: string
          p_blood_pressure?: string
          p_height?: number
          p_pulse?: number
          p_spo2?: number
          p_temperature?: number
          p_weight?: number
        }
        Returns: string
      }
      clinic_subscription_is_frozen: { Args: never; Returns: boolean }
      clinic_subscription_review_payment: {
        Args: {
          p_approve: boolean
          p_payment_id: string
          p_rejection_reason?: string
        }
        Returns: undefined
      }
      clinic_subscription_snapshot: { Args: never; Returns: Json }
      clinic_subscription_submit_payment: {
        Args: {
          p_notes?: string
          p_payment_method?: string
          p_plan_id: string
          p_proof_url: string
        }
        Returns: string
      }
      clinic_subscription_unfreeze: {
        Args: { p_days: number }
        Returns: string
      }
      clinic_update_status: {
        Args: {
          p_appointment_id: string
          p_reason?: string
          p_status: Database["public"]["Enums"]["appointment_status"]
        }
        Returns: undefined
      }
      clinic_write_audit: {
        Args: {
          p_action: string
          p_entity_id: string
          p_entity_type: string
          p_metadata?: Json
        }
        Returns: undefined
      }
      complete_manual_refund: {
        Args: {
          p_admin_id: string
          p_note?: string
          p_payment_id: string
          p_reference: string
        }
        Returns: undefined
      }
      create_notification: {
        Args: {
          p_message: string
          p_metadata?: Json
          p_title: string
          p_type?: string
          p_user_id: string
        }
        Returns: undefined
      }
      default_organization_id: { Args: never; Returns: string }
      doctor_add_landing_review: {
        Args: {
          p_comment?: string
          p_display_name: string
          p_doctor_id: string
          p_rating: number
        }
        Returns: string
      }
      doctor_delete_landing_review: {
        Args: { p_review_id: string }
        Returns: undefined
      }
      doctor_moderate_own_review: {
        Args: {
          p_review_id: string
          p_status: Database["public"]["Enums"]["review_moderation_status"]
        }
        Returns: undefined
      }
      doctor_owns_profile: {
        Args: { doctor_profile_id: string }
        Returns: boolean
      }
      doctor_set_review_visibility: {
        Args: { p_review_id: string; p_visible: boolean }
        Returns: undefined
      }
      ensure_doctor_landing_page: {
        Args: { p_doctor_id: string }
        Returns: string
      }
      expire_unstarted_appointment: {
        Args: {
          p_appointment_id: string
          p_no_show_party?: string
          p_reason?: string
        }
        Returns: boolean
      }
      get_assessment_patient_id: {
        Args: { p_assessment_id: string }
        Returns: string
      }
      get_booked_slots: {
        Args: { p_date: string; p_doctor_id: string }
        Returns: {
          is_blocked: boolean
          slot_time: string
        }[]
      }
      get_first_admin_id: { Args: never; Returns: string }
      get_or_create_conversation: {
        Args: { user_a: string; user_b: string }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      is_appointment_doctor: {
        Args: { p_appointment_id: string }
        Returns: boolean
      }
      is_approved_doctor: { Args: never; Returns: boolean }
      is_clinic_staff: { Args: never; Returns: boolean }
      is_conversation_participant: {
        Args: { conv_id: string }
        Returns: boolean
      }
      is_doctor: { Args: never; Returns: boolean }
      is_doctor_of_patient: {
        Args: { doctor_uid: string; patient_uid: string }
        Returns: boolean
      }
      is_organization_operator: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
      is_receptionist: { Args: never; Returns: boolean }
      is_slot_blocked: {
        Args: { p_date: string; p_doctor_id: string; p_time: string }
        Returns: boolean
      }
      is_slot_within_working_hours: {
        Args: {
          p_doctor_id: string
          p_duration_minutes?: number
          p_scheduled_at: string
        }
        Returns: boolean
      }
      is_subscription_actor: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      list_doctor_clinic_staff: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string
        }[]
      }
      notify_admins_on_login: {
        Args: { p_name: string; p_role: string; p_user_id: string }
        Returns: undefined
      }
      provision_clinic_staff: {
        Args: {
          p_email: string
          p_full_name: string
          p_password: string
          p_permissions: Json
          p_phone: string
          p_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: string
      }
      provision_staff_member: {
        Args: {
          p_email: string
          p_full_name: string
          p_password: string
          p_permissions: Json
          p_phone: string
          p_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: string
      }
      provision_walk_in_patient: {
        Args: {
          p_city?: string
          p_date_of_birth?: string
          p_email?: string
          p_full_name: string
          p_gender?: Database["public"]["Enums"]["gender"]
          p_phone: string
        }
        Returns: string
      }
      review_display_name: { Args: { p_full_name: string }; Returns: string }
      set_doctor_clinic_staff_active: {
        Args: { p_is_active: boolean; p_user_id: string }
        Returns: undefined
      }
      set_doctor_taxonomy: {
        Args: { p_doctor_id: string; p_tag_ids: string[] }
        Returns: undefined
      }
      slugify_doctor_name: { Args: { p_name: string }; Returns: string }
      sync_doctor_taxonomy_from_meta: {
        Args: { p_meta: Json; p_user_id: string }
        Returns: undefined
      }
      unique_doctor_slug: {
        Args: { p_doctor_id: string; p_name: string }
        Returns: string
      }
    }
    Enums: {
      account_status: "pending" | "approved" | "rejected"
      appointment_status:
        | "scheduled"
        | "ongoing"
        | "completed"
        | "cancelled"
        | "no_show"
        | "pending_payment"
        | "expired_no_show"
        | "checked_in"
        | "waiting"
        | "with_doctor"
        | "payment_pending"
      appointment_type: "video" | "chat" | "in_person"
      booking_source: "online" | "walk_in"
      clinic_payment_method: "cash" | "card" | "online"
      doctor_status: "pending" | "approved" | "rejected" | "suspended"
      gender: "male" | "female" | "other"
      invoice_status: "draft" | "issued" | "paid" | "void"
      landing_page_status: "draft" | "published" | "unpublished"
      organization_kind: "clinic" | "hospital" | "solo_practice"
      organization_invite_status: "pending" | "accepted" | "revoked"
      organization_member_role: "owner" | "admin" | "doctor" | "receptionist"
      organization_status: "pending" | "active" | "suspended" | "closed"
      payment_method: "jazzcash" | "easypaisa" | "stripe" | "bank_transfer"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      review_moderation_status: "pending" | "approved" | "rejected"
      user_role: "patient" | "doctor" | "admin" | "super_admin" | "receptionist"
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
    Enums: {
      account_status: ["pending", "approved", "rejected"],
      appointment_status: [
        "scheduled",
        "ongoing",
        "completed",
        "cancelled",
        "no_show",
        "pending_payment",
        "expired_no_show",
        "checked_in",
        "waiting",
        "with_doctor",
        "payment_pending",
      ],
      appointment_type: ["video", "chat", "in_person"],
      booking_source: ["online", "walk_in"],
      clinic_payment_method: ["cash", "card", "online"],
      doctor_status: ["pending", "approved", "rejected", "suspended"],
      gender: ["male", "female", "other"],
      invoice_status: ["draft", "issued", "paid", "void"],
      landing_page_status: ["draft", "published", "unpublished"],
      organization_kind: ["clinic", "hospital", "solo_practice"],
      organization_member_role: ["owner", "admin", "doctor", "receptionist"],
      organization_status: ["pending", "active", "suspended", "closed"],
      payment_method: ["jazzcash", "easypaisa", "stripe", "bank_transfer"],
      payment_status: ["pending", "completed", "failed", "refunded"],
      review_moderation_status: ["pending", "approved", "rejected"],
      user_role: ["patient", "doctor", "admin", "super_admin", "receptionist"],
    },
  },
} as const
