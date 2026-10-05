-- Sprint 2, S2.1 (LLD §4, décision de planification du 2026-10-04) : qui a activé la double authentification doit
-- l'utiliser pour tout accès à une daara. Un mot de passe volé seul ne donne plus rien.
-- Ses propres profil et memberships restent lisibles en aal1 (politiques « soi » inchangées) : routage vers /auth/mfa.

-- Session aal2, ou utilisateur sans facteur vérifié (rien à exiger de plus que le mot de passe).
create function public.session_suffisante()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
        or not exists (
            select 1 from auth.mfa_factors f
            where f.user_id = auth.uid() and f.status = 'verified'
        );
$$;
-- Interne : appelée par les helpers (security definer), jamais en RPC.
revoke execute on function public.session_suffisante() from public, anon, authenticated;

create or replace function public.is_member(p_daara uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select public.session_suffisante()
       and exists (
           select 1 from public.memberships m
           where m.daara_id = p_daara and m.user_id = auth.uid() and m.actif
       );
$$;

-- Le rôle admin exige aal2 dans tous les cas (ADR-006) ; les autres rôles, dès qu'un facteur est vérifié.
create or replace function public.has_role(p_daara uuid, p_roles public.role_membre[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select public.session_suffisante()
       and exists (
           select 1 from public.memberships m
           where m.daara_id = p_daara
             and m.user_id = auth.uid()
             and m.actif
             and m.role = any (p_roles)
             and (m.role <> 'admin' or coalesce(auth.jwt() ->> 'aal', '') = 'aal2')
       );
$$;
