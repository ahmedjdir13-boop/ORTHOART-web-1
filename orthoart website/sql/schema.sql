-- =========================================================
-- OrthoArt — Schéma Supabase (Postgres)
-- À exécuter dans Supabase > SQL Editor
-- =========================================================

-- Table des comptes (admin + patients)
create table accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null check (role in ('admin', 'patient')),
  pin_hash text not null,           -- jamais le code en clair
  created_at timestamptz default now()
);

-- Table de progression (liée à un patient)
create table progress (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  step int not null default 0,
  total_steps int not null default 12,
  start_date date default now(),
  next_appointment date,
  updated_at timestamptz default now()
);

-- Active la Row Level Security (RLS) — obligatoire pour la sécurité
alter table accounts enable row level security;
alter table progress enable row level security;

-- IMPORTANT : avec le système "code à 6 chiffres", on NE PERMET PAS
-- de lire directement la table accounts depuis le client (même avec RLS).
-- À la place, on passe par une fonction serveur (RPC) qui est la SEULE
-- porte d'entrée : elle reçoit le code, le compare au hash, et renvoie
-- seulement les infos du compte trouvé (jamais le hash lui-même).
-- Le client (le site) n'a donc jamais un accès direct à la table.

create extension if not exists pgcrypto;

-- Fonction de vérification : le site appelle CETTE fonction, jamais la table
create or replace function verify_pin(input_pin text)
returns table (
  account_id uuid,
  name text,
  role text,
  step int,
  total_steps int,
  next_appointment date
)
language plpgsql
security definer  -- s'exécute avec les droits du serveur, pas du client
as $$
begin
  return query
  select a.id, a.name, a.role, p.step, p.total_steps, p.next_appointment
  from accounts a
  left join progress p on p.account_id = a.id
  where a.pin_hash = crypt(input_pin, a.pin_hash)
  limit 1;
end;
$$;

-- Fonction pour ajouter un patient (utilisée par le panneau admin uniquement —
-- protégée par un mot de passe admin séparé, voir edge function)
create or replace function add_patient(input_name text, input_pin text)
returns uuid
language plpgsql
security definer
as $$
declare
  new_id uuid;
begin
  insert into accounts (name, role, pin_hash)
  values (input_name, 'patient', crypt(input_pin, gen_salt('bf')))
  returning id into new_id;

  insert into progress (account_id, step, total_steps)
  values (new_id, 0, 12);

  return new_id;
end;
$$;

-- Anti brute-force basique : trace les tentatives ratées par IP/session
create table login_attempts (
  id uuid primary key default gen_random_uuid(),
  attempted_at timestamptz default now(),
  success boolean
);
-- Un vrai anti-brute-force complet (blocage après N essais) se fait mieux
-- via une Edge Function Supabase — je peux l'ajouter une fois la base connectée.

-- =========================================================
-- SÉCURITÉ CRITIQUE : verrouille les permissions
-- =========================================================
-- Par défaut, Supabase autorise le rôle "anon" (le site) à exécuter
-- les fonctions. On retire ça pour tout sauf verify_pin (nécessaire
-- pour le login), et on force add_patient à passer par une Edge Function
-- protégée par le service_role (jamais exposé au client).

revoke execute on function add_patient(text, text) from anon, authenticated;
revoke execute on function add_patient(text, text) from public;
grant execute on function add_patient(text, text) to service_role;

-- verify_pin reste accessible au site (c'est le login), mais elle ne
-- renvoie JAMAIS le hash — seulement nom/rôle/progression si ça matche.
grant execute on function verify_pin(text) to anon;

-- Personne (même authentifié) ne peut lire les tables brutes directement
revoke all on accounts from anon, authenticated;
revoke all on progress from anon, authenticated;
