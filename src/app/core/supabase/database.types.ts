export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
    graphql_public: {
        Tables: {
            [_ in never]: never;
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            graphql: { Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json }; Returns: Json };
        };
        Enums: {
            [_ in never]: never;
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
    public: {
        Tables: {
            audit_log: {
                Row: {
                    action: string;
                    at: string;
                    daara_id: string;
                    id: number;
                    new_data: Json | null;
                    old_data: Json | null;
                    record_id: string | null;
                    table_name: string;
                    user_id: string | null;
                };
                Insert: {
                    action: string;
                    at?: string;
                    daara_id: string;
                    id?: never;
                    new_data?: Json | null;
                    old_data?: Json | null;
                    record_id?: string | null;
                    table_name: string;
                    user_id?: string | null;
                };
                Update: {
                    action?: string;
                    at?: string;
                    daara_id?: string;
                    id?: never;
                    new_data?: Json | null;
                    old_data?: Json | null;
                    record_id?: string | null;
                    table_name?: string;
                    user_id?: string | null;
                };
                Relationships: [];
            };
            daara_modules: {
                Row: {
                    actif: boolean;
                    daara_id: string;
                    module: Database['public']['Enums']['module_daara'];
                    updated_at: string;
                    updated_by: string | null;
                };
                Insert: {
                    actif?: boolean;
                    daara_id: string;
                    module: Database['public']['Enums']['module_daara'];
                    updated_at?: string;
                    updated_by?: string | null;
                };
                Update: {
                    actif?: boolean;
                    daara_id?: string;
                    module?: Database['public']['Enums']['module_daara'];
                    updated_at?: string;
                    updated_by?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'daara_modules_daara_id_fkey';
                        columns: ['daara_id'];
                        isOneToOne: false;
                        referencedRelation: 'daaras';
                        referencedColumns: ['id'];
                    },
                ];
            };
            daaras: {
                Row: {
                    bareme: number;
                    created_at: string;
                    created_by: string | null;
                    id: string;
                    langue_defaut: string;
                    logo_path: string | null;
                    nom: string;
                    slug: string;
                    statut: string;
                    telephone: string | null;
                    updated_at: string;
                    ville: string | null;
                };
                Insert: {
                    bareme?: number;
                    created_at?: string;
                    created_by?: string | null;
                    id?: string;
                    langue_defaut?: string;
                    logo_path?: string | null;
                    nom: string;
                    slug: string;
                    statut?: string;
                    telephone?: string | null;
                    updated_at?: string;
                    ville?: string | null;
                };
                Update: {
                    bareme?: number;
                    created_at?: string;
                    created_by?: string | null;
                    id?: string;
                    langue_defaut?: string;
                    logo_path?: string | null;
                    nom?: string;
                    slug?: string;
                    statut?: string;
                    telephone?: string | null;
                    updated_at?: string;
                    ville?: string | null;
                };
                Relationships: [];
            };
            memberships: {
                Row: {
                    actif: boolean;
                    created_at: string;
                    created_by: string | null;
                    daara_id: string;
                    id: string;
                    role: Database['public']['Enums']['role_membre'];
                    updated_at: string;
                    user_id: string;
                };
                Insert: {
                    actif?: boolean;
                    created_at?: string;
                    created_by?: string | null;
                    daara_id: string;
                    id?: string;
                    role: Database['public']['Enums']['role_membre'];
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    actif?: boolean;
                    created_at?: string;
                    created_by?: string | null;
                    daara_id?: string;
                    id?: string;
                    role?: Database['public']['Enums']['role_membre'];
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'memberships_daara_id_fkey';
                        columns: ['daara_id'];
                        isOneToOne: false;
                        referencedRelation: 'daaras';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'memberships_user_id_fkey';
                        columns: ['user_id'];
                        isOneToOne: false;
                        referencedRelation: 'profiles';
                        referencedColumns: ['id'];
                    },
                ];
            };
            platform_admins: {
                Row: {
                    created_at: string;
                    user_id: string;
                };
                Insert: {
                    created_at?: string;
                    user_id: string;
                };
                Update: {
                    created_at?: string;
                    user_id?: string;
                };
                Relationships: [];
            };
            profiles: {
                Row: {
                    avatar_path: string | null;
                    created_at: string;
                    id: string;
                    langue: string;
                    nom: string;
                    prenom: string;
                    telephone: string | null;
                    updated_at: string;
                };
                Insert: {
                    avatar_path?: string | null;
                    created_at?: string;
                    id: string;
                    langue?: string;
                    nom?: string;
                    prenom?: string;
                    telephone?: string | null;
                    updated_at?: string;
                };
                Update: {
                    avatar_path?: string | null;
                    created_at?: string;
                    id?: string;
                    langue?: string;
                    nom?: string;
                    prenom?: string;
                    telephone?: string | null;
                    updated_at?: string;
                };
                Relationships: [];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            avec_prerequis: { Args: { p_modules: Database['public']['Enums']['module_daara'][] }; Returns: Database['public']['Enums']['module_daara'][] };
            basculer_module: {
                Args: { p_actif: boolean; p_daara: string; p_module: Database['public']['Enums']['module_daara'] };
                Returns: Database['public']['Enums']['module_daara'][];
            };
            creer_daara: {
                Args: {
                    p_bareme?: number;
                    p_langue_defaut?: string;
                    p_modules?: Database['public']['Enums']['module_daara'][];
                    p_nom: string;
                    p_slug: string;
                    p_telephone?: string;
                    p_ville?: string;
                };
                Returns: string;
            };
            definir_modules: {
                Args: { p_daara: string; p_modules: Database['public']['Enums']['module_daara'][] };
                Returns: Database['public']['Enums']['module_daara'][];
            };
            ecrire_modules: { Args: { p_actifs: Database['public']['Enums']['module_daara'][]; p_daara: string }; Returns: undefined };
            has_role: { Args: { p_daara: string; p_roles: Database['public']['Enums']['role_membre'][] }; Returns: boolean };
            is_member: { Args: { p_daara: string }; Returns: boolean };
            is_platform_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
            membres_administres: { Args: Record<PropertyKey, never>; Returns: string[] };
            module_actif: { Args: { p_daara: string; p_module: Database['public']['Enums']['module_daara'] }; Returns: boolean };
            modules_valides: { Args: { p_modules: Database['public']['Enums']['module_daara'][] }; Returns: boolean };
            prerequis_module: { Args: { p_module: Database['public']['Enums']['module_daara'] }; Returns: Database['public']['Enums']['module_daara'][] };
            session_suffisante: { Args: Record<PropertyKey, never>; Returns: boolean };
        };
        Enums: {
            module_daara: 'structure' | 'absences' | 'notes' | 'bulletins' | 'coran_cahier' | 'coran_recitations' | 'coran_nafar' | 'notifications';
            role_membre: 'admin' | 'enseignant' | 'parent' | 'apprenant';
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
    DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views']) | { schema: keyof DatabaseWithoutInternals },
    TableName extends (DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
              DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
        : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
          DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
          Row: infer R;
      }
        ? R
        : never
    : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
      ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
            Row: infer R;
        }
          ? R
          : never
      : never;

export type TablesInsert<
    DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
    TableName extends (DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
        : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
          Insert: infer I;
      }
        ? I
        : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
      ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
            Insert: infer I;
        }
          ? I
          : never
      : never;

export type TablesUpdate<
    DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
    TableName extends (DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
        : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
          Update: infer U;
      }
        ? U
        : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
      ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
            Update: infer U;
        }
          ? U
          : never
      : never;

export type Enums<
    DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
    EnumName extends (DefaultSchemaEnumNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
        : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
    : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
      ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
      : never;

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
    CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
        : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
      ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
      : never;

export const Constants = {
    graphql_public: {
        Enums: {},
    },
    public: {
        Enums: {
            module_daara: ['structure', 'absences', 'notes', 'bulletins', 'coran_cahier', 'coran_recitations', 'coran_nafar', 'notifications'],
            role_membre: ['admin', 'enseignant', 'parent', 'apprenant'],
        },
    },
} as const;
