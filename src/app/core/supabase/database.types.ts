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
            absences: {
                Row: {
                    appel_id: string;
                    apprenant_id: string;
                    classe_id: string;
                    created_at: string;
                    created_by: string | null;
                    creneau: Database['public']['Enums']['creneau_appel'];
                    daara_id: string;
                    date_absence: string;
                    decide_at: string | null;
                    decide_par: string | null;
                    etat: Database['public']['Enums']['etat_justification'];
                    id: string;
                    motif: string | null;
                    motif_at: string | null;
                    type: Database['public']['Enums']['type_absence'];
                };
                Insert: {
                    appel_id: string;
                    apprenant_id: string;
                    classe_id: string;
                    created_at?: string;
                    created_by?: string | null;
                    creneau: Database['public']['Enums']['creneau_appel'];
                    daara_id: string;
                    date_absence: string;
                    decide_at?: string | null;
                    decide_par?: string | null;
                    etat?: Database['public']['Enums']['etat_justification'];
                    id?: string;
                    motif?: string | null;
                    motif_at?: string | null;
                    type?: Database['public']['Enums']['type_absence'];
                };
                Update: {
                    appel_id?: string;
                    apprenant_id?: string;
                    classe_id?: string;
                    created_at?: string;
                    created_by?: string | null;
                    creneau?: Database['public']['Enums']['creneau_appel'];
                    daara_id?: string;
                    date_absence?: string;
                    decide_at?: string | null;
                    decide_par?: string | null;
                    etat?: Database['public']['Enums']['etat_justification'];
                    id?: string;
                    motif?: string | null;
                    motif_at?: string | null;
                    type?: Database['public']['Enums']['type_absence'];
                };
                Relationships: [
                    {
                        foreignKeyName: 'absences_appel_id_fkey';
                        columns: ['appel_id'];
                        isOneToOne: false;
                        referencedRelation: 'appels';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'absences_apprenant_id_fkey';
                        columns: ['apprenant_id'];
                        isOneToOne: false;
                        referencedRelation: 'apprenants';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'absences_classe_id_fkey';
                        columns: ['classe_id'];
                        isOneToOne: false;
                        referencedRelation: 'classes';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'absences_daara_id_fkey';
                        columns: ['daara_id'];
                        isOneToOne: false;
                        referencedRelation: 'daaras';
                        referencedColumns: ['id'];
                    },
                ];
            };
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
            appels: {
                Row: {
                    annee_id: string;
                    classe_id: string;
                    created_at: string;
                    created_by: string | null;
                    creneau: Database['public']['Enums']['creneau_appel'];
                    daara_id: string;
                    date_appel: string;
                    id: string;
                    termine_at: string | null;
                    termine_par: string | null;
                };
                Insert: {
                    annee_id: string;
                    classe_id: string;
                    created_at?: string;
                    created_by?: string | null;
                    creneau?: Database['public']['Enums']['creneau_appel'];
                    daara_id: string;
                    date_appel: string;
                    id?: string;
                    termine_at?: string | null;
                    termine_par?: string | null;
                };
                Update: {
                    annee_id?: string;
                    classe_id?: string;
                    created_at?: string;
                    created_by?: string | null;
                    creneau?: Database['public']['Enums']['creneau_appel'];
                    daara_id?: string;
                    date_appel?: string;
                    id?: string;
                    termine_at?: string | null;
                    termine_par?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'appels_annee_id_fkey';
                        columns: ['annee_id'];
                        isOneToOne: false;
                        referencedRelation: 'annees_scolaires';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'appels_classe_id_fkey';
                        columns: ['classe_id'];
                        isOneToOne: false;
                        referencedRelation: 'classes';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'appels_daara_id_fkey';
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
                    sexe: Database['public']['Enums']['sexe_apprenant'];
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
                    sexe: Database['public']['Enums']['sexe_apprenant'];
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
                    sexe?: Database['public']['Enums']['sexe_apprenant'];
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
                    appel_demi_journee: boolean;
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
                    appel_demi_journee?: boolean;
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
                    appel_demi_journee?: boolean;
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
            evaluations: {
                Row: {
                    bareme: number;
                    classe_id: string;
                    classe_matiere_id: string;
                    coefficient: number;
                    created_at: string;
                    created_by: string | null;
                    daara_id: string;
                    date_eval: string;
                    id: string;
                    libelle: string;
                    periode_id: string;
                    publiee_at: string | null;
                    type_id: string;
                };
                Insert: {
                    bareme: number;
                    classe_id: string;
                    classe_matiere_id: string;
                    coefficient: number;
                    created_at?: string;
                    created_by?: string | null;
                    daara_id: string;
                    date_eval?: string;
                    id?: string;
                    libelle: string;
                    periode_id: string;
                    publiee_at?: string | null;
                    type_id: string;
                };
                Update: {
                    bareme?: number;
                    classe_id?: string;
                    classe_matiere_id?: string;
                    coefficient?: number;
                    created_at?: string;
                    created_by?: string | null;
                    daara_id?: string;
                    date_eval?: string;
                    id?: string;
                    libelle?: string;
                    periode_id?: string;
                    publiee_at?: string | null;
                    type_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'evaluations_classe_id_fkey';
                        columns: ['classe_id'];
                        isOneToOne: false;
                        referencedRelation: 'classes';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'evaluations_classe_matiere_id_fkey';
                        columns: ['classe_matiere_id'];
                        isOneToOne: false;
                        referencedRelation: 'classe_matieres';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'evaluations_daara_id_fkey';
                        columns: ['daara_id'];
                        isOneToOne: false;
                        referencedRelation: 'daaras';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'evaluations_periode_id_fkey';
                        columns: ['periode_id'];
                        isOneToOne: false;
                        referencedRelation: 'periodes';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'evaluations_type_id_fkey';
                        columns: ['type_id'];
                        isOneToOne: false;
                        referencedRelation: 'types_evaluation';
                        referencedColumns: ['id'];
                    },
                ];
            };
            inscriptions: {
                Row: {
                    annee_id: string;
                    apprenant_id: string;
                    classe_id: string;
                    created_at: string;
                    created_by: string | null;
                    daara_id: string;
                    date_inscription: string;
                    id: string;
                };
                Insert: {
                    annee_id: string;
                    apprenant_id: string;
                    classe_id: string;
                    created_at?: string;
                    created_by?: string | null;
                    daara_id: string;
                    date_inscription?: string;
                    id?: string;
                };
                Update: {
                    annee_id?: string;
                    apprenant_id?: string;
                    classe_id?: string;
                    created_at?: string;
                    created_by?: string | null;
                    daara_id?: string;
                    date_inscription?: string;
                    id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'inscriptions_annee_id_fkey';
                        columns: ['annee_id'];
                        isOneToOne: false;
                        referencedRelation: 'annees_scolaires';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'inscriptions_apprenant_id_fkey';
                        columns: ['apprenant_id'];
                        isOneToOne: false;
                        referencedRelation: 'apprenants';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'inscriptions_classe_id_fkey';
                        columns: ['classe_id'];
                        isOneToOne: false;
                        referencedRelation: 'classes';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'inscriptions_daara_id_fkey';
                        columns: ['daara_id'];
                        isOneToOne: false;
                        referencedRelation: 'daaras';
                        referencedColumns: ['id'];
                    },
                ];
            };
            invitation_enfants: {
                Row: {
                    apprenant_id: string;
                    created_at: string;
                    daara_id: string;
                    id: string;
                    invitation_id: string;
                    lien: Database['public']['Enums']['lien_parent'];
                };
                Insert: {
                    apprenant_id: string;
                    created_at?: string;
                    daara_id: string;
                    id?: string;
                    invitation_id: string;
                    lien: Database['public']['Enums']['lien_parent'];
                };
                Update: {
                    apprenant_id?: string;
                    created_at?: string;
                    daara_id?: string;
                    id?: string;
                    invitation_id?: string;
                    lien?: Database['public']['Enums']['lien_parent'];
                };
                Relationships: [
                    {
                        foreignKeyName: 'invitation_enfants_apprenant_id_fkey';
                        columns: ['apprenant_id'];
                        isOneToOne: false;
                        referencedRelation: 'apprenants';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'invitation_enfants_daara_id_fkey';
                        columns: ['daara_id'];
                        isOneToOne: false;
                        referencedRelation: 'daaras';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'invitation_enfants_invitation_id_fkey';
                        columns: ['invitation_id'];
                        isOneToOne: false;
                        referencedRelation: 'invitations';
                        referencedColumns: ['id'];
                    },
                ];
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
            notes: {
                Row: {
                    absent: boolean;
                    appreciation: string | null;
                    apprenant_id: string;
                    classe_id: string;
                    classe_matiere_id: string;
                    created_at: string;
                    created_by: string | null;
                    daara_id: string;
                    evaluation_id: string;
                    id: string;
                    updated_at: string;
                    updated_by: string | null;
                    valeur: number | null;
                };
                Insert: {
                    absent?: boolean;
                    appreciation?: string | null;
                    apprenant_id: string;
                    classe_id: string;
                    classe_matiere_id: string;
                    created_at?: string;
                    created_by?: string | null;
                    daara_id: string;
                    evaluation_id: string;
                    id?: string;
                    updated_at?: string;
                    updated_by?: string | null;
                    valeur?: number | null;
                };
                Update: {
                    absent?: boolean;
                    appreciation?: string | null;
                    apprenant_id?: string;
                    classe_id?: string;
                    classe_matiere_id?: string;
                    created_at?: string;
                    created_by?: string | null;
                    daara_id?: string;
                    evaluation_id?: string;
                    id?: string;
                    updated_at?: string;
                    updated_by?: string | null;
                    valeur?: number | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'notes_apprenant_id_fkey';
                        columns: ['apprenant_id'];
                        isOneToOne: false;
                        referencedRelation: 'apprenants';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'notes_classe_id_fkey';
                        columns: ['classe_id'];
                        isOneToOne: false;
                        referencedRelation: 'classes';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'notes_classe_matiere_id_fkey';
                        columns: ['classe_matiere_id'];
                        isOneToOne: false;
                        referencedRelation: 'classe_matieres';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'notes_daara_id_fkey';
                        columns: ['daara_id'];
                        isOneToOne: false;
                        referencedRelation: 'daaras';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'notes_evaluation_id_fkey';
                        columns: ['evaluation_id'];
                        isOneToOne: false;
                        referencedRelation: 'evaluations';
                        referencedColumns: ['id'];
                    },
                ];
            };
            notifications: {
                Row: {
                    absence_id: string | null;
                    apprenant_id: string | null;
                    created_at: string;
                    creneau: Database['public']['Enums']['creneau_appel'] | null;
                    daara_id: string;
                    date_absence: string | null;
                    id: string;
                    lu_at: string | null;
                    type: Database['public']['Enums']['type_notification'];
                    user_id: string;
                };
                Insert: {
                    absence_id?: string | null;
                    apprenant_id?: string | null;
                    created_at?: string;
                    creneau?: Database['public']['Enums']['creneau_appel'] | null;
                    daara_id: string;
                    date_absence?: string | null;
                    id?: string;
                    lu_at?: string | null;
                    type: Database['public']['Enums']['type_notification'];
                    user_id: string;
                };
                Update: {
                    absence_id?: string | null;
                    apprenant_id?: string | null;
                    created_at?: string;
                    creneau?: Database['public']['Enums']['creneau_appel'] | null;
                    daara_id?: string;
                    date_absence?: string | null;
                    id?: string;
                    lu_at?: string | null;
                    type?: Database['public']['Enums']['type_notification'];
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'notifications_absence_id_fkey';
                        columns: ['absence_id'];
                        isOneToOne: false;
                        referencedRelation: 'absences';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'notifications_apprenant_id_fkey';
                        columns: ['apprenant_id'];
                        isOneToOne: false;
                        referencedRelation: 'apprenants';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'notifications_daara_id_fkey';
                        columns: ['daara_id'];
                        isOneToOne: false;
                        referencedRelation: 'daaras';
                        referencedColumns: ['id'];
                    },
                ];
            };
            parent_links: {
                Row: {
                    apprenant_id: string;
                    created_at: string;
                    created_by: string | null;
                    daara_id: string;
                    id: string;
                    lien: Database['public']['Enums']['lien_parent'];
                    parent_user_id: string;
                };
                Insert: {
                    apprenant_id: string;
                    created_at?: string;
                    created_by?: string | null;
                    daara_id: string;
                    id?: string;
                    lien: Database['public']['Enums']['lien_parent'];
                    parent_user_id: string;
                };
                Update: {
                    apprenant_id?: string;
                    created_at?: string;
                    created_by?: string | null;
                    daara_id?: string;
                    id?: string;
                    lien?: Database['public']['Enums']['lien_parent'];
                    parent_user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'parent_links_apprenant_id_fkey';
                        columns: ['apprenant_id'];
                        isOneToOne: false;
                        referencedRelation: 'apprenants';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'parent_links_daara_id_fkey';
                        columns: ['daara_id'];
                        isOneToOne: false;
                        referencedRelation: 'daaras';
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
            reglages_absences: {
                Row: {
                    daara_id: string;
                    decideur: Database['public']['Enums']['decideur_justification'];
                    delai_correction: number;
                    justification_parent: boolean;
                    updated_at: string;
                    updated_by: string | null;
                };
                Insert: {
                    daara_id: string;
                    decideur?: Database['public']['Enums']['decideur_justification'];
                    delai_correction?: number;
                    justification_parent?: boolean;
                    updated_at?: string;
                    updated_by?: string | null;
                };
                Update: {
                    daara_id?: string;
                    decideur?: Database['public']['Enums']['decideur_justification'];
                    delai_correction?: number;
                    justification_parent?: boolean;
                    updated_at?: string;
                    updated_by?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'reglages_absences_daara_id_fkey';
                        columns: ['daara_id'];
                        isOneToOne: true;
                        referencedRelation: 'daaras';
                        referencedColumns: ['id'];
                    },
                ];
            };
            reglages_notes: {
                Row: {
                    absence_evaluation: Database['public']['Enums']['regle_absence_eval'];
                    appreciations: boolean;
                    arrondi: Database['public']['Enums']['arrondi_note'];
                    daara_id: string;
                    moyenne_generale: Database['public']['Enums']['mode_moyenne'];
                    moyennes_visibles: boolean;
                    seuil_reussite: number | null;
                    titulaire_saisit: boolean;
                    updated_at: string;
                    updated_by: string | null;
                    visibilite: Database['public']['Enums']['visibilite_notes'];
                };
                Insert: {
                    absence_evaluation?: Database['public']['Enums']['regle_absence_eval'];
                    appreciations?: boolean;
                    arrondi?: Database['public']['Enums']['arrondi_note'];
                    daara_id: string;
                    moyenne_generale?: Database['public']['Enums']['mode_moyenne'];
                    moyennes_visibles?: boolean;
                    seuil_reussite?: number | null;
                    titulaire_saisit?: boolean;
                    updated_at?: string;
                    updated_by?: string | null;
                    visibilite?: Database['public']['Enums']['visibilite_notes'];
                };
                Update: {
                    absence_evaluation?: Database['public']['Enums']['regle_absence_eval'];
                    appreciations?: boolean;
                    arrondi?: Database['public']['Enums']['arrondi_note'];
                    daara_id?: string;
                    moyenne_generale?: Database['public']['Enums']['mode_moyenne'];
                    moyennes_visibles?: boolean;
                    seuil_reussite?: number | null;
                    titulaire_saisit?: boolean;
                    updated_at?: string;
                    updated_by?: string | null;
                    visibilite?: Database['public']['Enums']['visibilite_notes'];
                };
                Relationships: [
                    {
                        foreignKeyName: 'reglages_notes_daara_id_fkey';
                        columns: ['daara_id'];
                        isOneToOne: true;
                        referencedRelation: 'daaras';
                        referencedColumns: ['id'];
                    },
                ];
            };
            types_evaluation: {
                Row: {
                    archive: boolean;
                    coefficient: number;
                    created_at: string;
                    created_by: string | null;
                    daara_id: string;
                    id: string;
                    nom: string;
                    ordre: number;
                };
                Insert: {
                    archive?: boolean;
                    coefficient?: number;
                    created_at?: string;
                    created_by?: string | null;
                    daara_id: string;
                    id?: string;
                    nom: string;
                    ordre?: number;
                };
                Update: {
                    archive?: boolean;
                    coefficient?: number;
                    created_at?: string;
                    created_by?: string | null;
                    daara_id?: string;
                    id?: string;
                    nom?: string;
                    ordre?: number;
                };
                Relationships: [
                    {
                        foreignKeyName: 'types_evaluation_daara_id_fkey';
                        columns: ['daara_id'];
                        isOneToOne: false;
                        referencedRelation: 'daaras';
                        referencedColumns: ['id'];
                    },
                ];
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
            canal_daara_autorise: { Args: { p_topic: string }; Returns: boolean };
            changer_role: { Args: { p_membership: string; p_role: Database['public']['Enums']['role_membre'] }; Returns: undefined };
            chiffres: { Args: { p_texte: string }; Returns: string };
            classe_d_un_enfant: { Args: { p_classe: string }; Returns: boolean };
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
            decider_justification: { Args: { p_absence: string; p_justifiee: boolean }; Returns: undefined };
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
            enseigne_apprenant: { Args: { p_apprenant: string }; Returns: boolean };
            enseigne_classe_active: { Args: { p_classe: string }; Returns: boolean };
            envoi_sms_factice: { Args: { event: Json }; Returns: Json };
            equipe_a_prevenir: { Args: { p_classe: string }; Returns: string[] };
            est_admin_quelque_part: { Args: { p_user: string }; Returns: boolean };
            est_enseignant_de: { Args: { p_daara: string; p_user: string }; Returns: boolean };
            etat_invitation: { Args: { p_invitation: Database['public']['Tables']['invitations']['Row'] }; Returns: string };
            hacher_code_acces: { Args: { p_code: string; p_user: string }; Returns: string };
            hacher_jeton: { Args: { p_token: string }; Returns: string };
            has_role: { Args: { p_daara: string; p_roles: Database['public']['Enums']['role_membre'][] }; Returns: boolean };
            importer_apprenants: { Args: { p_classe?: string; p_daara: string; p_lignes: Json; p_simuler?: boolean }; Returns: Json };
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
            is_parent_of: { Args: { p_apprenant: string }; Returns: boolean };
            is_platform_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
            justifier_absence: { Args: { p_absence: string; p_motif: string }; Returns: undefined };
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
            membre_actuel: { Args: { p_daara: string }; Returns: boolean };
            membres_administres: { Args: Record<PropertyKey, never>; Returns: string[] };
            module_actif: { Args: { p_daara: string; p_module: Database['public']['Enums']['module_daara'] }; Returns: boolean };
            modules_valides: { Args: { p_modules: Database['public']['Enums']['module_daara'][] }; Returns: boolean };
            normaliser_code_acces: { Args: { p_code: string }; Returns: string };
            notifier: {
                Args: {
                    p_absence: string;
                    p_apprenant: string;
                    p_creneau: Database['public']['Enums']['creneau_appel'];
                    p_daara: string;
                    p_date: string;
                    p_destinataires: string[];
                    p_type: Database['public']['Enums']['type_notification'];
                };
                Returns: undefined;
            };
            parent_actuel: { Args: { p_daara: string }; Returns: boolean };
            parents_a_prevenir: { Args: { p_apprenant: string }; Returns: string[] };
            peut_ecrire_evaluation: { Args: { p_classe_matiere: string; p_daara: string }; Returns: boolean };
            photo_apprenant_administree: { Args: { p_nom: string }; Returns: boolean };
            photo_apprenant_lisible: { Args: { p_nom: string }; Returns: boolean };
            prerequis_module: { Args: { p_module: Database['public']['Enums']['module_daara'] }; Returns: Database['public']['Enums']['module_daara'][] };
            rattacher_enfant_invitation: {
                Args: { p_apprenant: string; p_invitation: string; p_lien: Database['public']['Enums']['lien_parent'] };
                Returns: undefined;
            };
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
                    ancien_parent: boolean;
                    depuis: string;
                    id: string;
                    nom: string;
                    role: Database['public']['Enums']['role_membre'];
                    telephone: string;
                    total: number;
                    user_id: string;
                }[];
            };
            reglages_par_defaut: { Args: { p_daara: string }; Returns: undefined };
            retirer_facteurs: { Args: { p_motif: string; p_user: string }; Returns: number };
            revoquer_invitation: { Args: { p_invitation: string }; Returns: undefined };
            sans_accents: { Args: { p_texte: string }; Returns: string };
            session_suffisante: { Args: Record<PropertyKey, never>; Returns: boolean };
            statistiques_absences: { Args: { p_classe?: string; p_daara: string; p_debut: string; p_fin: string }; Returns: Json };
            teaches_class: { Args: { p_classe: string }; Returns: boolean };
            terminer_appel: { Args: { p_appel: string }; Returns: undefined };
            texte_sur: { Args: { p_texte: string }; Returns: boolean };
            verifier_appel: { Args: { p_classe: string; p_daara: string; p_date: string }; Returns: string };
        };
        Enums: {
            arrondi_note: 'centieme' | 'dixieme' | 'quart' | 'demi';
            creneau_appel: 'journee' | 'matin' | 'apres_midi';
            decideur_justification: 'admin_titulaire' | 'admin';
            etat_justification: 'aucune' | 'envoyee' | 'justifiee' | 'non_justifiee';
            lien_parent: 'pere' | 'mere' | 'tuteur';
            mode_moyenne: 'ponderee' | 'simple';
            module_daara: 'structure' | 'absences' | 'notes' | 'bulletins' | 'coran_cahier' | 'coran_recitations' | 'coran_nafar' | 'notifications';
            regle_absence_eval: 'ignorer' | 'zero' | 'zero_si_non_justifiee';
            role_membre: 'admin' | 'enseignant' | 'parent' | 'apprenant';
            sexe_apprenant: 'F' | 'M';
            statut_apprenant: 'inscrit' | 'parti';
            type_absence: 'absence' | 'retard';
            type_matiere: 'scolaire' | 'coran' | 'religieux';
            type_notification: 'absence' | 'retard' | 'absence_annulee' | 'justification_envoyee' | 'justification_decidee';
            visibilite_notes: 'publication' | 'saisie';
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
            arrondi_note: ['centieme', 'dixieme', 'quart', 'demi'],
            creneau_appel: ['journee', 'matin', 'apres_midi'],
            decideur_justification: ['admin_titulaire', 'admin'],
            etat_justification: ['aucune', 'envoyee', 'justifiee', 'non_justifiee'],
            lien_parent: ['pere', 'mere', 'tuteur'],
            mode_moyenne: ['ponderee', 'simple'],
            module_daara: ['structure', 'absences', 'notes', 'bulletins', 'coran_cahier', 'coran_recitations', 'coran_nafar', 'notifications'],
            regle_absence_eval: ['ignorer', 'zero', 'zero_si_non_justifiee'],
            role_membre: ['admin', 'enseignant', 'parent', 'apprenant'],
            sexe_apprenant: ['F', 'M'],
            statut_apprenant: ['inscrit', 'parti'],
            type_absence: ['absence', 'retard'],
            type_matiere: ['scolaire', 'coran', 'religieux'],
            type_notification: ['absence', 'retard', 'absence_annulee', 'justification_envoyee', 'justification_decidee'],
            visibilite_notes: ['publication', 'saisie'],
        },
    },
} as const;
