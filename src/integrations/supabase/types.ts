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
          due_date: string | null
          id: string
          requested_at: string
          requested_by: string | null
          reviewer_id: string | null
          status: string
        }
        Insert: {
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          document_version_id: string
          due_date?: string | null
          id?: string
          requested_at?: string
          requested_by?: string | null
          reviewer_id?: string | null
          status?: string
        }
        Update: {
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          document_version_id?: string
          due_date?: string | null
          id?: string
          requested_at?: string
          requested_by?: string | null
          reviewer_id?: string | null
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
          {
            foreignKeyName: "approvals_reviewer_id_fkey"
            columns: ["reviewer_id"]
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
      capacity_allocations: {
        Row: {
          finish_date: string
          lane: string
          mode: string
          owner_id: string
          project_id: string
          start_date: string
          task_id: string
          updated_at: string
          vendor: string | null
        }
        Insert: {
          finish_date: string
          lane: string
          mode: string
          owner_id: string
          project_id: string
          start_date: string
          task_id: string
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          finish_date?: string
          lane?: string
          mode?: string
          owner_id?: string
          project_id?: string
          start_date?: string
          task_id?: string
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "capacity_allocations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capacity_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capacity_allocations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: true
            referencedRelation: "tasks"
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
      comment_edit_history: {
        Row: {
          author_id: string
          comment_id: string
          edited_at: string
          id: string
          new_body: string
          old_body: string
        }
        Insert: {
          author_id: string
          comment_id: string
          edited_at?: string
          id?: string
          new_body: string
          old_body: string
        }
        Update: {
          author_id?: string
          comment_id?: string
          edited_at?: string
          id?: string
          new_body?: string
          old_body?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_edit_history_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_edit_history_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          emoji: string
          id: string
          person_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          emoji: string
          id?: string
          person_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          emoji?: string
          id?: string
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_reactions_person_id_fkey"
            columns: ["person_id"]
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
          reply_to_id: string | null
          thread_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          reply_to_id?: string | null
          thread_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          reply_to_id?: string | null
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
            foreignKeyName: "comments_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "comments"
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
      conversation_preferences: {
        Row: {
          mode: string
          person_id: string
          thread_id: string
        }
        Insert: {
          mode: string
          person_id: string
          thread_id: string
        }
        Update: {
          mode?: string
          person_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_preferences_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_preferences_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "discussion_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_reads: {
        Row: {
          last_read_at: string
          person_id: string
          thread_id: string
        }
        Insert: {
          last_read_at: string
          person_id: string
          thread_id: string
        }
        Update: {
          last_read_at?: string
          person_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_reads_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_reads_thread_id_fkey"
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
          is_general: boolean
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
          is_general?: boolean
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
          is_general?: boolean
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
      document_folders: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          name: string
          parent_id: string | null
          project_id: string
          scene_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          parent_id?: string | null
          project_id: string
          scene_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          project_id?: string
          scene_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      document_stars: {
        Row: {
          document_id: string
          person_id: string
        }
        Insert: {
          document_id: string
          person_id: string
        }
        Update: {
          document_id?: string
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_stars_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_stars_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
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
          deleted_at: string | null
          folder: string | null
          folder_id: string | null
          id: string
          project_id: string
          requires_approval: boolean
          scene_id: string | null
          status: string
          task_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          folder?: string | null
          folder_id?: string | null
          id?: string
          project_id: string
          requires_approval?: boolean
          scene_id?: string | null
          status?: string
          task_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          folder?: string | null
          folder_id?: string | null
          id?: string
          project_id?: string
          requires_approval?: boolean
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
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
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
      notification_preferences: {
        Row: {
          desktop: boolean
          mode: string
          person_id: string
          quiet_end: number
          quiet_start: number
        }
        Insert: {
          desktop?: boolean
          mode?: string
          person_id: string
          quiet_end?: number
          quiet_start?: number
        }
        Update: {
          desktop?: boolean
          mode?: string
          person_id?: string
          quiet_end?: number
          quiet_start?: number
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "people"
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
      personal_notification_state: {
        Row: {
          dismissed: boolean
          notification_id: string
          person_id: string
          snoozed_until: string | null
        }
        Insert: {
          dismissed?: boolean
          notification_id: string
          person_id: string
          snoozed_until?: string | null
        }
        Update: {
          dismissed?: boolean
          notification_id?: string
          person_id?: string
          snoozed_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_notification_state_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_notification_state_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      project_assignments: {
        Row: {
          accepted_at: string | null
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
          accepted_at?: string | null
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
          accepted_at?: string | null
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
      project_workflow_settings: {
        Row: {
          project_id: string
          timeline_owner_id: string
        }
        Insert: {
          project_id: string
          timeline_owner_id: string
        }
        Update: {
          project_id?: string
          timeline_owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_workflow_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_workflow_settings_timeline_owner_id_fkey"
            columns: ["timeline_owner_id"]
            isOneToOne: false
            referencedRelation: "people"
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
          portal_link_url: string | null
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
          portal_link_url?: string | null
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
          portal_link_url?: string | null
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
      schedule_change_requests: {
        Row: {
          created_at: string
          id: string
          new_finish: string
          new_start: string
          old_finish: string | null
          old_start: string | null
          project_id: string
          reason: string
          requested_by: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          new_finish: string
          new_start: string
          old_finish?: string | null
          old_start?: string | null
          project_id: string
          reason: string
          requested_by: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          new_finish?: string
          new_start?: string
          old_finish?: string | null
          old_start?: string | null
          project_id?: string
          reason?: string
          requested_by?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_change_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_change_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_change_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_change_requests_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      set_followers: {
        Row: {
          person_id: string
          scene_id: string
        }
        Insert: {
          person_id: string
          scene_id: string
        }
        Update: {
          person_id?: string
          scene_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "set_followers_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_followers_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      set_instruction_documents: {
        Row: {
          category: string
          document_id: string
          scene_id: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          category: string
          document_id: string
          scene_id: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          category?: string
          document_id?: string
          scene_id?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "set_instruction_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_instruction_documents_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_instruction_documents_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      set_update_recipients: {
        Row: {
          acknowledged_at: string | null
          person_id: string
          update_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          person_id: string
          update_id: string
        }
        Update: {
          acknowledged_at?: string | null
          person_id?: string
          update_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "set_update_recipients_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_update_recipients_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "set_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      set_updates: {
        Row: {
          body: string
          created_at: string
          created_by: string
          document_version_id: string | null
          id: string
          kind: string
          needs_ack: boolean
          owner_id: string
          scene_id: string
          source_comment_id: string | null
          source_snapshot: string | null
          task_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          created_by: string
          document_version_id?: string | null
          id?: string
          kind: string
          needs_ack?: boolean
          owner_id: string
          scene_id: string
          source_comment_id?: string | null
          source_snapshot?: string | null
          task_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          document_version_id?: string | null
          id?: string
          kind?: string
          needs_ack?: boolean
          owner_id?: string
          scene_id?: string
          source_comment_id?: string | null
          source_snapshot?: string | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "set_updates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_updates_document_version_id_fkey"
            columns: ["document_version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_updates_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_updates_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_updates_source_comment_id_fkey"
            columns: ["source_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_updates_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
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
          scene_id: string
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
          scene_id: string
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
          scene_id?: string
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
      conversation_followers: {
        Args: { p_thread: string }
        Returns: {
          person_id: string
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
      department_audience: {
        Args: { p_project: string; p_scene?: string }
        Returns: {
          department_id: string
          person_id: string
        }[]
      }
      department_mention_recipients: {
        Args: { p_thread: string }
        Returns: {
          department_id: string
          person_id: string
        }[]
      }
      ensure_set_chat: {
        Args: { p_actor: string; p_scene: string }
        Returns: string
      }
      file_conversation_attachment: {
        Args: {
          p_actor: string
          p_attachment: string
          p_folder: string
          p_requires_approval?: boolean
          p_title: string
        }
        Returns: string
      }
      library_folder_action: {
        Args: {
          p_action: string
          p_actor: string
          p_folder: string
          p_name?: string
          p_parent?: string
        }
        Returns: undefined
      }
      personal_workflow: {
        Args: { p_action: string; p_actor: string; p_payload?: Json }
        Returns: Json
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
      request_document_review: {
        Args: {
          p_actor: string
          p_document: string
          p_due_date: string
          p_note: string
          p_reviewer: string
          p_version: string
        }
        Returns: string
      }
      review_document: {
        Args: {
          p_actor: string
          p_decision: string
          p_document: string
          p_note: string
          p_reviewer?: string
          p_version: string
        }
        Returns: string
      }
      set_instruction_action: {
        Args: {
          p_actor: string
          p_category: string
          p_document: string
          p_remove?: boolean
          p_scene: string
        }
        Returns: undefined
      }
      set_recipients: {
        Args: { p_scene: string }
        Returns: {
          full_name: string
          person_id: string
        }[]
      }
      workspace_action: {
        Args: { p_action: string; p_actor: string; p_payload: Json }
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
