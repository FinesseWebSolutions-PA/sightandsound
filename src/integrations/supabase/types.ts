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
      approvals: {
        Row: {
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          document_version_id: string
          id: string
          requested_at: string
          requested_by: string | null
          status: string
        }
        Insert: {
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          document_version_id: string
          id?: string
          requested_at?: string
          requested_by?: string | null
          status?: string
        }
        Update: {
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          document_version_id?: string
          id?: string
          requested_at?: string
          requested_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_document_version_id_fkey"
            columns: ["document_version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          changes: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          changes?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          changes?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_attachments: {
        Row: {
          byte_size: number | null
          comment_id: string
          created_at: string
          file_name: string
          id: string
          mime_type: string | null
          saved_document_id: string | null
          storage_key: string
          uploaded_by: string | null
        }
        Insert: {
          byte_size?: number | null
          comment_id: string
          created_at?: string
          file_name: string
          id?: string
          mime_type?: string | null
          saved_document_id?: string | null
          storage_key: string
          uploaded_by?: string | null
        }
        Update: {
          byte_size?: number | null
          comment_id?: string
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          saved_document_id?: string | null
          storage_key?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comment_attachments_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_attachments_saved_document_id_fkey"
            columns: ["saved_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          thread_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          thread_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "discussion_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      department_job_titles: {
        Row: {
          created_at: string
          department_id: string
          id: string
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          sort_order?: number
          title: string
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_job_titles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      department_memberships: {
        Row: {
          department_id: string
          is_lead: boolean
          person_id: string
        }
        Insert: {
          department_id: string
          is_lead?: boolean
          person_id: string
        }
        Update: {
          department_id?: string
          is_lead?: boolean
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_memberships_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_memberships_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          default_owner_id: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          default_owner_id?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          default_owner_id?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_default_owner_id_fkey"
            columns: ["default_owner_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dept_owner_deferrable"
            columns: ["default_owner_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_threads: {
        Row: {
          context_type: string
          created_at: string
          created_by: string | null
          document_id: string | null
          id: string
          project_id: string
          scene_id: string | null
          task_id: string | null
        }
        Insert: {
          context_type: string
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          id?: string
          project_id: string
          scene_id?: string | null
          task_id?: string | null
        }
        Update: {
          context_type?: string
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          id?: string
          project_id?: string
          scene_id?: string | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discussion_threads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_threads_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_threads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_threads_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_threads_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          change_note: string | null
          document_id: string
          id: string
          storage_key: string | null
          uploaded_at: string
          uploaded_by: string | null
          version_number: number
        }
        Insert: {
          change_note?: string | null
          document_id: string
          id?: string
          storage_key?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          version_number: number
        }
        Update: {
          change_note?: string | null
          document_id?: string
          id?: string
          storage_key?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          created_by: string | null
          folder: string | null
          id: string
          project_id: string
          scene_id: string | null
          status: string
          task_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          folder?: string | null
          id?: string
          project_id: string
          scene_id?: string | null
          status?: string
          task_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          folder?: string | null
          id?: string
          project_id?: string
          scene_id?: string | null
          status?: string
          task_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      mentions: {
        Row: {
          comment_id: string
          id: string
          mentioned_department_id: string | null
          mentioned_person_id: string | null
        }
        Insert: {
          comment_id: string
          id?: string
          mentioned_department_id?: string | null
          mentioned_person_id?: string | null
        }
        Update: {
          comment_id?: string
          id?: string
          mentioned_department_id?: string | null
          mentioned_person_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_mentioned_department_id_fkey"
            columns: ["mentioned_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_mentioned_person_id_fkey"
            columns: ["mentioned_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          actual_date: string | null
          affects_performance: boolean
          affects_rehearsal: boolean
          criticality: string
          due_date: string | null
          forecast_date: string | null
          id: string
          name: string
          project_id: string
          sort_order: number
          status: string
        }
        Insert: {
          actual_date?: string | null
          affects_performance?: boolean
          affects_rehearsal?: boolean
          criticality?: string
          due_date?: string | null
          forecast_date?: string | null
          id?: string
          name: string
          project_id: string
          sort_order?: number
          status?: string
        }
        Update: {
          actual_date?: string | null
          affects_performance?: boolean
          affects_rehearsal?: boolean
          criticality?: string
          due_date?: string | null
          forecast_date?: string | null
          id?: string
          name?: string
          project_id?: string
          sort_order?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          person_id: string
          project_id: string | null
          source_comment_id: string | null
          source_entity_id: string | null
          source_entity_type: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          person_id: string
          project_id?: string | null
          source_comment_id?: string | null
          source_entity_id?: string | null
          source_entity_type?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          person_id?: string
          project_id?: string | null
          source_comment_id?: string | null
          source_entity_id?: string | null
          source_entity_type?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_source_comment_id_fkey"
            columns: ["source_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          avatar_url: string | null
          created_at: string
          deactivated_at: string | null
          email: string | null
          full_name: string
          id: string
          role: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deactivated_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          role?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deactivated_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      project_assignments: {
        Row: {
          created_at: string
          department_id: string
          id: string
          is_head: boolean
          job_title: string
          person_id: string
          project_id: string
          scene_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          is_head?: boolean
          job_title?: string
          person_id: string
          project_id: string
          scene_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          is_head?: boolean
          job_title?: string
          person_id?: string
          project_id?: string
          scene_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_assignments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      project_departments: {
        Row: {
          default_owner_id: string | null
          department_id: string
          project_id: string
        }
        Insert: {
          default_owner_id?: string | null
          department_id: string
          project_id: string
        }
        Update: {
          default_owner_id?: string | null
          department_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_departments_default_owner_id_fkey"
            columns: ["default_owner_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_departments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          closed_at: string | null
          created_at: string
          id: string
          name: string
          owner_id: string | null
          portal_link_url: string | null
          slug: string
          start_date: string | null
          status: string
          target_close_date: string | null
          venue: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          id?: string
          name: string
          owner_id?: string | null
          portal_link_url?: string | null
          slug: string
          start_date?: string | null
          status?: string
          target_close_date?: string | null
          venue: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string | null
          portal_link_url?: string | null
          slug?: string
          start_date?: string | null
          status?: string
          target_close_date?: string | null
          venue?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      scenes: {
        Row: {
          depends_on_scene_id: string | null
          due_date: string | null
          forecast_finish: string | null
          forecast_start: string | null
          id: string
          lag_days: number
          name: string
          owner_id: string | null
          project_id: string
          sort_order: number
          start_date: string | null
          status: string
        }
        Insert: {
          depends_on_scene_id?: string | null
          due_date?: string | null
          forecast_finish?: string | null
          forecast_start?: string | null
          id?: string
          lag_days?: number
          name: string
          owner_id?: string | null
          project_id: string
          sort_order?: number
          start_date?: string | null
          status?: string
        }
        Update: {
          depends_on_scene_id?: string | null
          due_date?: string | null
          forecast_finish?: string | null
          forecast_start?: string | null
          id?: string
          lag_days?: number
          name?: string
          owner_id?: string | null
          project_id?: string
          sort_order?: number
          start_date?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenes_depends_on_scene_id_fkey"
            columns: ["depends_on_scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      task_dependencies: {
        Row: {
          depends_on_task_id: string
          hard_constraint: boolean
          id: string
          lag_hours: number
          task_id: string
          type: string
        }
        Insert: {
          depends_on_task_id: string
          hard_constraint?: boolean
          id?: string
          lag_hours?: number
          task_id: string
          type?: string
        }
        Update: {
          depends_on_task_id?: string
          hard_constraint?: boolean
          id?: string
          lag_hours?: number
          task_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_finish: string | null
          actual_start: string | null
          affects_performance: boolean
          affects_rehearsal: boolean
          created_at: string
          created_by: string | null
          criticality: string
          department_id: string | null
          description: string | null
          due_date: string | null
          forecast_finish: string | null
          forecast_start: string | null
          id: string
          milestone_id: string | null
          owner_id: string | null
          parent_task_id: string | null
          project_id: string
          scene_id: string | null
          sort_order: number
          start_date: string | null
          status: string
          title: string
          total_float_hours: number | null
          updated_at: string
        }
        Insert: {
          actual_finish?: string | null
          actual_start?: string | null
          affects_performance?: boolean
          affects_rehearsal?: boolean
          created_at?: string
          created_by?: string | null
          criticality?: string
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          forecast_finish?: string | null
          forecast_start?: string | null
          id?: string
          milestone_id?: string | null
          owner_id?: string | null
          parent_task_id?: string | null
          project_id: string
          scene_id?: string | null
          sort_order?: number
          start_date?: string | null
          status?: string
          title: string
          total_float_hours?: number | null
          updated_at?: string
        }
        Update: {
          actual_finish?: string | null
          actual_start?: string | null
          affects_performance?: boolean
          affects_rehearsal?: boolean
          created_at?: string
          created_by?: string | null
          criticality?: string
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          forecast_finish?: string | null
          forecast_start?: string | null
          id?: string
          milestone_id?: string | null
          owner_id?: string | null
          parent_task_id?: string | null
          project_id?: string
          scene_id?: string | null
          sort_order?: number
          start_date?: string | null
          status?: string
          title?: string
          total_float_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      compute_project_schedule: {
        Args: { p_project_id: string }
        Returns: {
          criticality: string
          entity_id: string
          entity_type: string
          forecast_finish: string
          forecast_start: string
          late_finish: string
          late_start: string
          total_float_hours: number
        }[]
      }
      cpm_task_schedule: {
        Args: {
          p_override_finish?: string
          p_override_start?: string
          p_override_task?: string
          p_project_id: string
        }
        Returns: {
          criticality: string
          early_finish: string
          early_start: string
          late_finish: string
          late_start: string
          task_id: string
          total_float_hours: number
        }[]
      }
      preview_task_reschedule: {
        Args: { p_new_finish: string; p_new_start: string; p_task_id: string }
        Returns: {
          affects_performance: boolean
          affects_rehearsal: boolean
          crosses_protected_date: boolean
          current_finish: string
          department_id: string
          entity_id: string
          entity_type: string
          name: string
          new_finish: string
          protected_label: string
          shift_days: number
        }[]
      }
      recompute_milestone_status: {
        Args: { p_milestone_id: string }
        Returns: undefined
      }
      recompute_parent_task: { Args: { p_task_id: string }; Returns: undefined }
      recompute_scene_rollup: {
        Args: { p_scene_id: string }
        Returns: undefined
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
  public: {
    Enums: {},
  },
} as const
