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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      blocks: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      component_replacements: {
        Row: {
          component_name: string
          created_at: string | null
          id: string
          maintenance_id: string
          notes: string | null
          quantity: number | null
          unit_cost: number | null
        }
        Insert: {
          component_name: string
          created_at?: string | null
          id?: string
          maintenance_id: string
          notes?: string | null
          quantity?: number | null
          unit_cost?: number | null
        }
        Update: {
          component_name?: string
          created_at?: string | null
          id?: string
          maintenance_id?: string
          notes?: string | null
          quantity?: number | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "component_replacements_maintenance_id_fkey"
            columns: ["maintenance_id"]
            isOneToOne: false
            referencedRelation: "maintenances"
            referencedColumns: ["id"]
          },
        ]
      }
      device_readings: {
        Row: {
          created_at: string | null
          device_id: string
          fault_detected: boolean
          fault_type: string | null
          id: string
          is_on: boolean
          latitude: number | null
          longitude: number | null
          pole_id: string | null
          power_consumption_watts: number | null
          raw_data: Json | null
        }
        Insert: {
          created_at?: string | null
          device_id: string
          fault_detected?: boolean
          fault_type?: string | null
          id?: string
          is_on?: boolean
          latitude?: number | null
          longitude?: number | null
          pole_id?: string | null
          power_consumption_watts?: number | null
          raw_data?: Json | null
        }
        Update: {
          created_at?: string | null
          device_id?: string
          fault_detected?: boolean
          fault_type?: string | null
          id?: string
          is_on?: boolean
          latitude?: number | null
          longitude?: number | null
          pole_id?: string | null
          power_consumption_watts?: number | null
          raw_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "device_readings_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "esp32_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_readings_pole_id_fkey"
            columns: ["pole_id"]
            isOneToOne: false
            referencedRelation: "poles"
            referencedColumns: ["id"]
          },
        ]
      }
      esp32_devices: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          device_token: string
          id: string
          last_seen_at: string | null
          name: string
          pole_id: string | null
          registered_by: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          device_token?: string
          id?: string
          last_seen_at?: string | null
          name: string
          pole_id?: string | null
          registered_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          device_token?: string
          id?: string
          last_seen_at?: string | null
          name?: string
          pole_id?: string | null
          registered_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "esp32_devices_pole_id_fkey"
            columns: ["pole_id"]
            isOneToOne: false
            referencedRelation: "poles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenances: {
        Row: {
          assigned_to: string | null
          completed_date: string | null
          cost: number | null
          created_at: string | null
          description: string
          failure_type: Database["public"]["Enums"]["failure_type"]
          id: string
          pole_id: string
          priority: Database["public"]["Enums"]["priority_level"] | null
          reported_by: string | null
          resolution_notes: string | null
          scheduled_date: string | null
          status: Database["public"]["Enums"]["maintenance_status"] | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_date?: string | null
          cost?: number | null
          created_at?: string | null
          description: string
          failure_type: Database["public"]["Enums"]["failure_type"]
          id?: string
          pole_id: string
          priority?: Database["public"]["Enums"]["priority_level"] | null
          reported_by?: string | null
          resolution_notes?: string | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"] | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_date?: string | null
          cost?: number | null
          created_at?: string | null
          description?: string
          failure_type?: Database["public"]["Enums"]["failure_type"]
          id?: string
          pole_id?: string
          priority?: Database["public"]["Enums"]["priority_level"] | null
          reported_by?: string | null
          resolution_notes?: string | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenances_pole_id_fkey"
            columns: ["pole_id"]
            isOneToOne: false
            referencedRelation: "poles"
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
          related_maintenance_id: string | null
          related_pole_id: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          related_maintenance_id?: string | null
          related_pole_id?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          related_maintenance_id?: string | null
          related_pole_id?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_maintenance_id_fkey"
            columns: ["related_maintenance_id"]
            isOneToOne: false
            referencedRelation: "maintenances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_pole_id_fkey"
            columns: ["related_pole_id"]
            isOneToOne: false
            referencedRelation: "poles"
            referencedColumns: ["id"]
          },
        ]
      }
      poles: {
        Row: {
          code: string
          created_at: string | null
          current_lamp_hours: number | null
          id: string
          installation_date: string | null
          lamp_lifespan_hours: number | null
          last_lamp_change: string | null
          latitude: number | null
          lighting_type: Database["public"]["Enums"]["lighting_type"]
          location_description: string
          location_type: string | null
          longitude: number | null
          maintenance_company: string | null
          power_watts: number
          status: Database["public"]["Enums"]["pole_status"] | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          current_lamp_hours?: number | null
          id?: string
          installation_date?: string | null
          lamp_lifespan_hours?: number | null
          last_lamp_change?: string | null
          latitude?: number | null
          lighting_type: Database["public"]["Enums"]["lighting_type"]
          location_description: string
          location_type?: string | null
          longitude?: number | null
          maintenance_company?: string | null
          power_watts: number
          status?: Database["public"]["Enums"]["pole_status"] | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          current_lamp_hours?: number | null
          id?: string
          installation_date?: string | null
          lamp_lifespan_hours?: number | null
          last_lamp_change?: string | null
          latitude?: number | null
          lighting_type?: Database["public"]["Enums"]["lighting_type"]
          location_description?: string
          location_type?: string | null
          longitude?: number | null
          maintenance_company?: string | null
          power_watts?: number
          status?: Database["public"]["Enums"]["pole_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      preventive_schedules: {
        Row: {
          created_at: string | null
          description: string
          frequency_days: number
          id: string
          is_active: boolean | null
          last_executed: string | null
          next_scheduled: string | null
          pole_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          frequency_days: number
          id?: string
          is_active?: boolean | null
          last_executed?: string | null
          next_scheduled?: string | null
          pole_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          frequency_days?: number
          id?: string
          is_active?: boolean | null
          last_executed?: string | null
          next_scheduled?: string | null
          pole_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preventive_schedules_pole_id_fkey"
            columns: ["pole_id"]
            isOneToOne: false
            referencedRelation: "poles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      resident_history: {
        Row: {
          created_at: string | null
          id: string
          move_in_date: string
          move_out_date: string | null
          notes: string | null
          resident_name: string
          resident_type: Database["public"]["Enums"]["resident_type"]
          unit_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          move_in_date: string
          move_out_date?: string | null
          notes?: string | null
          resident_name: string
          resident_type: Database["public"]["Enums"]["resident_type"]
          unit_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          move_in_date?: string
          move_out_date?: string | null
          notes?: string | null
          resident_name?: string
          resident_type?: Database["public"]["Enums"]["resident_type"]
          unit_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resident_history_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      residents: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          move_in_date: string | null
          move_out_date: string | null
          resident_type: Database["public"]["Enums"]["resident_type"]
          unit_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          move_in_date?: string | null
          move_out_date?: string | null
          resident_type: Database["public"]["Enums"]["resident_type"]
          unit_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          move_in_date?: string | null
          move_out_date?: string | null
          resident_type?: Database["public"]["Enums"]["resident_type"]
          unit_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "residents_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          block_id: string
          created_at: string | null
          floor: number | null
          id: string
          number: string
          parking_spots: number | null
          status: Database["public"]["Enums"]["unit_status"] | null
          updated_at: string | null
        }
        Insert: {
          block_id: string
          created_at?: string | null
          floor?: number | null
          id?: string
          number: string
          parking_spots?: number | null
          status?: Database["public"]["Enums"]["unit_status"] | null
          updated_at?: string | null
        }
        Update: {
          block_id?: string
          created_at?: string | null
          floor?: number | null
          id?: string
          number?: string
          parking_spots?: number | null
          status?: Database["public"]["Enums"]["unit_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "units_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_sindico: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "sindico" | "subsindico" | "morador" | "manutencao"
      failure_type:
        | "lampada_queimada"
        | "curto_circuito"
        | "oscilacao"
        | "fiacao_danificada"
        | "poste_danificado"
        | "outros"
      lighting_type:
        | "led"
        | "fluorescente"
        | "solar"
        | "halogenea"
        | "vapor_sodio"
        | "vapor_mercurio"
      maintenance_status: "aberto" | "em_andamento" | "concluido" | "cancelado"
      pole_status: "funcionando" | "com_falha" | "em_manutencao" | "desativado"
      priority_level: "baixa" | "media" | "alta" | "urgente"
      resident_type: "proprietario" | "inquilino" | "morador"
      unit_status: "ocupada" | "vazia" | "alugada"
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
      app_role: ["admin", "sindico", "subsindico", "morador", "manutencao"],
      failure_type: [
        "lampada_queimada",
        "curto_circuito",
        "oscilacao",
        "fiacao_danificada",
        "poste_danificado",
        "outros",
      ],
      lighting_type: [
        "led",
        "fluorescente",
        "solar",
        "halogenea",
        "vapor_sodio",
        "vapor_mercurio",
      ],
      maintenance_status: ["aberto", "em_andamento", "concluido", "cancelado"],
      pole_status: ["funcionando", "com_falha", "em_manutencao", "desativado"],
      priority_level: ["baixa", "media", "alta", "urgente"],
      resident_type: ["proprietario", "inquilino", "morador"],
      unit_status: ["ocupada", "vazia", "alugada"],
    },
  },
} as const
