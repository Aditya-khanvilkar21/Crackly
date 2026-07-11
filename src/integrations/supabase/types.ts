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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_requests: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      class_students: {
        Row: {
          class_id: string
          id: string
          joined_at: string
          student_id: string
        }
        Insert: {
          class_id: string
          id?: string
          joined_at?: string
          student_id: string
        }
        Update: {
          class_id?: string
          id?: string
          joined_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "tuition_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      join_requests: {
        Row: {
          class_id: string
          created_at: string
          id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "join_requests_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "tuition_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          class_status: string | null
          created_at: string
          district: string | null
          full_name: string
          id: string
          state: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          class_status?: string | null
          created_at?: string
          district?: string | null
          full_name: string
          id: string
          state?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          class_status?: string | null
          created_at?: string
          district?: string | null
          full_name?: string
          id?: string
          state?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_tests: {
        Row: {
          class_id: string
          created_at: string
          created_by: string
          duration_minutes: number
          id: string
          instructions: string | null
          scheduled_at: string
          status: string
          test_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          created_by: string
          duration_minutes: number
          id?: string
          instructions?: string | null
          scheduled_at: string
          status?: string
          test_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          created_by?: string
          duration_minutes?: number
          id?: string
          instructions?: string | null
          scheduled_at?: string
          status?: string
          test_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      test_attempts: {
        Row: {
          answers: Json
          current_question_index: number
          id: string
          marked_for_review: Json
          original_index_map: Json
          started_at: string
          student_id: string
          submitted: boolean
          test_id: string
          time_left_seconds: number
          updated_at: string
          visited_questions: Json
        }
        Insert: {
          answers?: Json
          current_question_index?: number
          id?: string
          marked_for_review?: Json
          original_index_map?: Json
          started_at?: string
          student_id: string
          submitted?: boolean
          test_id: string
          time_left_seconds?: number
          updated_at?: string
          visited_questions?: Json
        }
        Update: {
          answers?: Json
          current_question_index?: number
          id?: string
          marked_for_review?: Json
          original_index_map?: Json
          started_at?: string
          student_id?: string
          submitted?: boolean
          test_id?: string
          time_left_seconds?: number
          updated_at?: string
          visited_questions?: Json
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_availability: {
        Row: {
          class_id: string
          created_at: string
          id: string
          is_locked: boolean | null
          test_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          is_locked?: boolean | null
          test_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          is_locked?: boolean | null
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_availability_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "tuition_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_availability_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_results: {
        Row: {
          answers: Json
          completed_at: string
          id: string
          score: number
          student_id: string
          test_id: string
          time_taken_seconds: number | null
          total_questions: number
        }
        Insert: {
          answers: Json
          completed_at?: string
          id?: string
          score: number
          student_id: string
          test_id: string
          time_taken_seconds?: number | null
          total_questions: number
        }
        Update: {
          answers?: Json
          completed_at?: string
          id?: string
          score?: number
          student_id?: string
          test_id?: string
          time_taken_seconds?: number | null
          total_questions?: number
        }
        Relationships: [
          {
            foreignKeyName: "test_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          chapter: string | null
          cloned_from: string | null
          created_at: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          duration_minutes: number
          exam_type: Database["public"]["Enums"]["exam_type"]
          id: string
          is_active: boolean | null
          negative_marking: number | null
          questions: Json
          subject: Database["public"]["Enums"]["test_subject"] | null
          test_type: Database["public"]["Enums"]["test_type"]
          title: string
          updated_at: string
        }
        Insert: {
          chapter?: string | null
          cloned_from?: string | null
          created_at?: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          duration_minutes?: number
          exam_type?: Database["public"]["Enums"]["exam_type"]
          id?: string
          is_active?: boolean | null
          negative_marking?: number | null
          questions: Json
          subject?: Database["public"]["Enums"]["test_subject"] | null
          test_type?: Database["public"]["Enums"]["test_type"]
          title: string
          updated_at?: string
        }
        Update: {
          chapter?: string | null
          cloned_from?: string | null
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          duration_minutes?: number
          exam_type?: Database["public"]["Enums"]["exam_type"]
          id?: string
          is_active?: boolean | null
          negative_marking?: number | null
          questions?: Json
          subject?: Database["public"]["Enums"]["test_subject"] | null
          test_type?: Database["public"]["Enums"]["test_type"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tests_cloned_from_fkey"
            columns: ["cloned_from"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tuition_classes: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          is_disabled: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          is_disabled?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          is_disabled?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tuition_classes_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_student_access_test: {
        Args: { _student_id: string; _test_id: string }
        Returns: boolean
      }
      generate_student_id: { Args: never; Returns: string }
      get_available_students_for_class: {
        Args: { _class_id: string }
        Returns: {
          full_name: string
          id: string
          student_id: string
        }[]
      }
      get_scheduled_test_meta: {
        Args: { _test_ids: string[] }
        Returns: {
          id: string
          title: string
        }[]
      }
      get_student_available_tests: {
        Args: {
          _exam_type?: Database["public"]["Enums"]["exam_type"]
          _subject?: Database["public"]["Enums"]["test_subject"]
          _test_type?: Database["public"]["Enums"]["test_type"]
        }
        Returns: {
          chapter: string
          created_at: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          duration_minutes: number
          exam_type: Database["public"]["Enums"]["exam_type"]
          id: string
          is_active: boolean
          negative_marking: number
          subject: Database["public"]["Enums"]["test_subject"]
          test_type: Database["public"]["Enums"]["test_type"]
          title: string
        }[]
      }
      get_test_for_taking: { Args: { test_id_param: string }; Returns: Json }
      get_test_result_with_questions: {
        Args: { test_id_param: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_class_admin: {
        Args: { _class_id: string; _user_id: string }
        Returns: boolean
      }
      is_in_class: {
        Args: { _class_id: string; _user_id: string }
        Returns: boolean
      }
      is_test_admin_for_student: {
        Args: { _admin_id: string; _student_id: string; _test_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "student" | "admin" | "super_admin"
      difficulty_level: "easy" | "medium" | "hard"
      exam_type: "JEE" | "NEET" | "CET"
      test_subject: "physics" | "chemistry" | "mathematics" | "biology"
      test_type: "chapter_test" | "mock_test"
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
      app_role: ["student", "admin", "super_admin"],
      difficulty_level: ["easy", "medium", "hard"],
      exam_type: ["JEE", "NEET", "CET"],
      test_subject: ["physics", "chemistry", "mathematics", "biology"],
      test_type: ["chapter_test", "mock_test"],
    },
  },
} as const
