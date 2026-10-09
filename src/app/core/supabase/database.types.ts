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
            annees_scolaires: {
                Row: {
                    active: boolean;
                    created_at: string;
                    created_by: string | null;
                    daara_id: string;
                    date_debut: string;
                    date_fin: string;
                    id: string;
                    libelle: string;
                };
                Insert: {
                    active?: boolean;
                    created_at?: string;
                    created_by?: string | null;
                    daara_id: string;
                    date_debut: string;
                    date_fin: string;
                    id?: string;
                    libelle: string;
                };
                Update: {
                    active?: boolean;
                    created_at?: string;
                    created_by?: string | null;
                    daara_id?: string;
                    date_debut?: string;
                    date_fin?: string;
                    id?: string;
                    libelle?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'annees_scolaires_daara_id_fkey';
                        columns: ['daara_id'];
                        isOneToOne: false;
                        referencedRelation: 'daaras';
                        referencedColumns: ['id'];
                    },
                ];
            };
            apprenants: {
                Row: {
                    created_at: string;
                    created_by: string | null;
                    daara_id: string;
                    date_naissance: string | null;
                    id: string;
                    matricule: string;
                    nom: string;
                    photo_path: string | null;
                    prenom: string;
                    recherche: string | null;
                    sexe: Database['public']['Enums']['sexe_apprenant'] | null;
                    statut: Database['public']['Enums']['statut_apprenant'];
                    updated_at: string;
                    user_id: string | null;
                };
                Insert: {
                    created_at?: string;
                    created_by?: string | null;
                    daara_id: string;
                    date_naissance?: string | null;
                    id?: string;
                    matricule?: string;
                    nom: string;
                    photo_path?: string | null;
                    prenom: string;
                    recherche?: never;
                    sexe?: Database['public']['Enums']['sexe_apprenant'] | null;
                    statut?: Database['public']['Enums']['statut_apprenant'];
                    updated_at?: string;
                    user_id?: string | null;
                };
                Update: {
                    created_at?: string;
                    created_by?: string | null;
                    daara_id?: string;
                    date_naissance?: string | null;
                    id?: string;
                    matricule?: string;
                    nom?: string;
                    photo_path?: string | null;
                    prenom?: string;
                    recherche?: never;
                    sexe?: Database['public']['Enums']['sexe_apprenant'] | null;
                    statut?: Database['public']['Enums']['statut_apprenant'];
                    updated_at?: string;
                    user_id?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'apprenants_daara_id_fkey';
                        columns: ['daara_id'];
                        isOneToOne: false;
                        referencedRelation: 'daaras';
                        referencedColumns: ['id'];
                    },
                ];
            };
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
            classe_matieres: {
                Row: {
                    classe_id: string;
                    coefficient: number;
                    created_at: string;
                    created_by: string | null;
                    daara_id: string;
                    enseignant_id: string | null;
                    id: string;
                    matiere_id: string;
                };
                Insert: {
                    classe_id: string;
                    coefficient?: number;
                    created_at?: string;
                    created_by?: string | null;
                    daara_id: string;
                    enseignant_id?: string | null;
                    id?: string;
                    matiere_id: string;
                };
                Update: {
                    classe_id?: string;
                    coefficient?: number;
                    created_at?: string;
                    created_by?: string | null;
                    daara_id?: string;
                    enseignant_id?: string | null;
                    id?: string;
                    matiere_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'classe_matieres_classe_id_fkey';
                        columns: ['classe_id'];
                        isOneToOne: false;
                        referencedRelation: 'classes';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'classe_matieres_daara_id_fkey';
                        columns: ['daara_id'];
                        isOneToOne: false;
                        referencedRelation: 'daaras';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'classe_matieres_matiere_id_fkey';
                        columns: ['matiere_id'];
                        isOneToOne: false;
                        referencedRelation: 'matieres';
                        referencedColumns: ['id'];
                    },
                ];
            };
            classes: {
                Row: {
                    annee_id: string;
                    created_at: string;
                    created_by: string | null;
                    daara_id: string;
                    id: string;
                    niveau: string | null;
                    nom: string;
                    recherche: string | null;
                    titulaire_id: string | null;
                };
                Insert: {
                    annee_id: string;
                    created_at?: string;
                    created_by?: string | null;
                    daara_id: string;
                    id?: string;
                    niveau?: string | null;
                    nom: string;
                    recherche?: never;
                    titulaire_id?: string | null;
                };
                Update: {
                    annee_id?: string;
                    created_at?: string;
                    created_by?: string | null;
                    daara_id?: string;
                    id?: string;
                    niveau?: string | null;
                    nom?: string;
                    recherche?: never;
                    titulaire_id?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'classes_annee_id_fkey';
                        columns: ['annee_id'];
                        isOneToOne: false;
                        referencedRelation: 'annees_scolaires';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'classes_daara_id_fkey';
                        columns: ['daara_id'];
                        isOneToOne: false;
                        referencedRelation: 'daaras';
                        referencedColumns: ['id'];
                    },
                ];
            };
            codes_acces: {
                Row: {
                    code_hash: string;
                    created_at: string;
                    cree_par: string | null;
                    daara_id: string;
                    expires_at: string;
                    id: string;
                    tentatives: number;
                    used_at: string | null;
                    user_id: string;
                };
                Insert: {
                    code_hash: string;
                    created_at?: string;
                    cree_par?: string | null;
                    daara_id: string;
                    expires_at?: string;
                    id?: string;
                    tentatives?: number;
                    used_at?: string | null;
                    user_id: string;
                };
                Update: {
                    code_hash?: string;
                    created_at?: string;
                    cree_par?: string | null;
                    daara_id?: string;
                    expires_at?: string;
                    id?: string;
                    tentatives?: number;
                    used_at?: string | null;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'codes_acces_daara_id_fkey';
                        columns: ['daara_id'];
                        isOneToOne: false;
                        referencedRelation: 'daaras';
                        referencedColumns: ['id'];
                    },
                ];
            };
            compteurs_matricule: {
                Row: {
                    annee: number;
                    daara_id: string;
                    dernier: number;
                };
                Insert: {
                    annee: number;
                    daara_id: string;
                    dernier?: number;
                };
                Update: {
                    annee?: number;
                    daara_id?: string;
                    dernier?: number;
                };
                Relationships: [
                    {
                        foreignKeyName: 'compteurs_matricule_daara_id_fkey';
                        columns: ['daara_id'];
                        isOneToOne: false;
                        referencedRelation: 'daaras';
                        referencedColumns: ['id'];
                    },
                ];
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
            invitations: {
                Row: {
                    accepted_at: string | null;
                    accepted_by: string | null;
                    created_at: string;
                    daara_id: string;
                    email: string | null;
                    expires_at: string;
                    id: string;
                    invited_by: string | null;
                    langue: string;
                    nom: string | null;
                    prenom: string | null;
                    revoked_at: string | null;
                    role: Database['public']['Enums']['role_membre'];
                    telephone: string | null;
                    token_hash: string;
                    etat_invitation: string | null;
                };
                Insert: {
                    accepted_at?: string | null;
                    accepted_by?: string | null;
                    created_at?: string;
                    daara_id: string;
                    email?: string | null;
                    expires_at?: string;
                    id?: string;
                    invited_by?: string | null;
                    langue?: string;
                    nom?: string | null;
                    prenom?: string | null;
                    revoked_at?: string | null;
                    role: Database['public']['Enums']['role_membre'];
                    telephone?: string | null;
                    token_hash: string;
                };
                Update: {
                    accepted_at?: string | null;
                    accepted_by?: string | null;
                    created_at?: string;
                    daara_id?: string;
                    email?: string | null;
                    expires_at?: string;
                    id?: string;
                    invited_by?: string | null;
                    langue?: string;
                    nom?: string | null;
                    prenom?: string | null;
                    revoked_at?: string | null;
                    role?: Database['public']['Enums']['role_membre'];
                    telephone?: string | null;
                    token_hash?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'invitations_daara_id_fkey';
                        columns: ['daara_id'];
                        isOneToOne: false;
                        referencedRelation: 'daaras';
                        referencedColumns: ['id'];
                    },
                ];
            };
            matieres: {
                Row: {
                    archivee: boolean;
                    code: string;
                    created_at: string;
                    created_by: string | null;
                    daara_id: string;
                    id: string;
                    nom: string;
                    recherche: string | null;
                    type: Database['public']['Enums']['type_matiere'];
                };
                Insert: {
                    archivee?: boolean;
                    code: string;
                    created_at?: string;
                    created_by?: string | null;
                    daara_id: string;
                    id?: string;
                    nom: string;
                    recherche?: never;
                    type?: Database['public']['Enums']['type_matiere'];
                };
                Update: {
                    archivee?: boolean;
                    code?: string;
                    created_at?: string;
                    created_by?: string | null;
                    daara_id?: string;
                    id?: string;
                    nom?: string;
                    recherche?: never;
                    type?: Database['public']['Enums']['type_matiere'];
                };
                Relationships: [
                    {
                        foreignKeyName: 'matieres_daara_id_fkey';
                        columns: ['daara_id'];
                        isOneToOne: false;
                        referencedRelation: 'daaras';
                        referencedColumns: ['id'];
                    },
                ];
            };
            memberships: {
                Row: {
                    actif: boolean;
                    created_at: string;
                    created_by: string | null;
                    daara_id: string;
                    id: string;
                    nom_affiche: string | null;
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
                    nom_affiche?: string | null;
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
                    nom_affiche?: string | null;
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
            periodes: {
                Row: {
                    annee_id: string;
                    cloturee: boolean;
                    created_at: string;
                    created_by: string | null;
                    daara_id: string;
                    date_debut: string;
                    date_fin: string;
                    id: string;
                    libelle: string;
                    ordre: number;
                };
                Insert: {
                    annee_id: string;
                    cloturee?: boolean;
                    created_at?: string;
                    created_by?: string | null;
                    daara_id: string;
                    date_debut: string;
                    date_fin: string;
                    id?: string;
                    libelle: string;
                    ordre: number;
                };
                Update: {
                    annee_id?: string;
                    cloturee?: boolean;
                    created_at?: string;
                    created_by?: string | null;
                    daara_id?: string;
                    date_debut?: string;
                    date_fin?: string;
                    id?: string;
                    libelle?: string;
                    ordre?: number;
                };
                Relationships: [
                    {
                        foreignKeyName: 'periodes_annee_id_fkey';
                        columns: ['annee_id'];
                        isOneToOne: false;
                        referencedRelation: 'annees_scolaires';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'periodes_daara_id_fkey';
                        columns: ['daara_id'];
                        isOneToOne: false;
                        referencedRelation: 'daaras';
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
            accepter_invitation: { Args: { p_token: string }; Returns: string };
            accepter_invitation_nouveau_compte: { Args: { p_token: string; p_user: string }; Returns: string };
            accepter_invitation_pour: { Args: { p_nouveau_compte: boolean; p_token: string; p_uid: string }; Returns: string };
            activer_annee: { Args: { p_annee: string }; Returns: undefined };
            avant_creation_utilisateur: { Args: { event: Json }; Returns: Json };
            avec_prerequis: { Args: { p_modules: Database['public']['Enums']['module_daara'][] }; Returns: Database['public']['Enums']['module_daara'][] };
            basculer_module: {
                Args: { p_actif: boolean; p_daara: string; p_module: Database['public']['Enums']['module_daara'] };
                Returns: Database['public']['Enums']['module_daara'][];
            };
            changer_role: { Args: { p_membership: string; p_role: Database['public']['Enums']['role_membre'] }; Returns: undefined };
            chiffres: { Args: { p_texte: string }; Returns: string };
            compte_du_contact: { Args: { p_email: string; p_telephone: string }; Returns: string };
            consommer_code_acces: {
                Args: { p_code: string; p_identifiant: string };
                Returns: {
                    email: string;
                    langue: string;
                    user_id: string;
                }[];
            };
            creer_code_acces: { Args: { p_membership: string }; Returns: string };
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
            creer_invitation: {
                Args: {
                    p_daara: string;
                    p_email: string;
                    p_langue: string;
                    p_nom: string;
                    p_prenom: string;
                    p_role: Database['public']['Enums']['role_membre'];
                    p_telephone: string;
                };
                Returns: {
                    id: string;
                    jeton: string;
                }[];
            };
            definir_actif: { Args: { p_actif: boolean; p_membership: string }; Returns: undefined };
            definir_auteur: { Args: { p_auteur: string }; Returns: undefined };
            definir_modules: {
                Args: { p_daara: string; p_modules: Database['public']['Enums']['module_daara'][] };
                Returns: Database['public']['Enums']['module_daara'][];
            };
            ecrire_modules: { Args: { p_actifs: Database['public']['Enums']['module_daara'][]; p_daara: string }; Returns: undefined };
            ecrivain_admin: { Args: { p_daara: string }; Returns: undefined };
            ecrivain_structure: { Args: { p_daara: string }; Returns: undefined };
            enseignants_daara: {
                Args: { p_daara: string };
                Returns: {
                    actif: boolean;
                    nom: string;
                    prenom: string;
                    user_id: string;
                }[];
            };
            envoi_sms_factice: { Args: { event: Json }; Returns: Json };
            est_admin_quelque_part: { Args: { p_user: string }; Returns: boolean };
            est_enseignant_de: { Args: { p_daara: string; p_user: string }; Returns: boolean };
            etat_invitation: { Args: { p_invitation: Database['public']['Tables']['invitations']['Row'] }; Returns: string };
            hacher_code_acces: { Args: { p_code: string; p_user: string }; Returns: string };
            hacher_jeton: { Args: { p_token: string }; Returns: string };
            has_role: { Args: { p_daara: string; p_roles: Database['public']['Enums']['role_membre'][] }; Returns: boolean };
            invitation_par_jeton: {
                Args: { p_token: string };
                Returns: {
                    compte_existant: boolean;
                    daara_nom: string;
                    email: string;
                    etat: string;
                    id: string;
                    langue: string;
                    role: Database['public']['Enums']['role_membre'];
                    telephone: string;
                }[];
            };
            is_member: { Args: { p_daara: string }; Returns: boolean };
            is_platform_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
            libelle_valide: { Args: { p_max: number; p_texte: string }; Returns: boolean };
            membership_administre: {
                Args: { p_membership: string };
                Returns: {
                    actif: boolean;
                    created_at: string;
                    created_by: string | null;
                    daara_id: string;
                    id: string;
                    nom_affiche: string | null;
                    role: Database['public']['Enums']['role_membre'];
                    updated_at: string;
                    user_id: string;
                };
                SetofOptions: {
                    from: '*';
                    to: 'memberships';
                    isOneToOne: true;
                    isSetofReturn: false;
                };
            };
            membres_administres: { Args: Record<PropertyKey, never>; Returns: string[] };
            module_actif: { Args: { p_daara: string; p_module: Database['public']['Enums']['module_daara'] }; Returns: boolean };
            modules_valides: { Args: { p_modules: Database['public']['Enums']['module_daara'][] }; Returns: boolean };
            normaliser_code_acces: { Args: { p_code: string }; Returns: string };
            photo_apprenant_administree: { Args: { p_nom: string }; Returns: boolean };
            prerequis_module: { Args: { p_module: Database['public']['Enums']['module_daara'] }; Returns: Database['public']['Enums']['module_daara'][] };
            rechercher_membres: {
                Args: {
                    p_daara: string;
                    p_etat: string;
                    p_limite: number;
                    p_offset: number;
                    p_role: Database['public']['Enums']['role_membre'];
                    p_texte: string;
                    p_tri: string;
                };
                Returns: {
                    actif: boolean;
                    depuis: string;
                    id: string;
                    nom: string;
                    role: Database['public']['Enums']['role_membre'];
                    telephone: string;
                    total: number;
                    user_id: string;
                }[];
            };
            retirer_facteurs: { Args: { p_motif: string; p_user: string }; Returns: number };
            revoquer_invitation: { Args: { p_invitation: string }; Returns: undefined };
            sans_accents: { Args: { p_texte: string }; Returns: string };
            session_suffisante: { Args: Record<PropertyKey, never>; Returns: boolean };
            teaches_class: { Args: { p_classe: string }; Returns: boolean };
            texte_sur: { Args: { p_texte: string }; Returns: boolean };
        };
        Enums: {
            module_daara: 'structure' | 'absences' | 'notes' | 'bulletins' | 'coran_cahier' | 'coran_recitations' | 'coran_nafar' | 'notifications';
            role_membre: 'admin' | 'enseignant' | 'parent' | 'apprenant';
            sexe_apprenant: 'F' | 'M';
            statut_apprenant: 'inscrit' | 'parti';
            type_matiere: 'scolaire' | 'coran' | 'religieux';
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
            sexe_apprenant: ['F', 'M'],
            statut_apprenant: ['inscrit', 'parti'],
            type_matiere: ['scolaire', 'coran', 'religieux'],
        },
    },
} as const;
