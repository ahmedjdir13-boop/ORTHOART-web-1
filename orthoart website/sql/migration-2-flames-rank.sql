-- Migration 2 : flammes, favoris, notes de séance, rang
-- À coller et lancer dans le SQL Editor Supabase

alter table progress add column if not exists flames int not null default 0;
alter table progress add column if not exists favorite boolean not null default false;
alter table progress add column if not exists last_note text;
alter table progress add column if not exists last_progress_delta numeric default 0;
alter table progress add column if not exists last_flame_delta int default 0;

-- Remplace verify_pin pour inclure flammes, favori, et rang calculé
create or replace function verify_pin(input_pin text)
returns table (
  account_id uuid,
  name text,
  role text,
  step int,
  total_steps int,
  next_appointment date,
  flames int,
  favorite boolean,
  last_note text,
  last_progress_delta numeric,
  last_flame_delta int,
  rank bigint,
  total_patients bigint
)
language plpgsql
security definer
as $$
begin
  return query
  select
    a.id, a.name, a.role,
    p.step, p.total_steps, p.next_appointment,
    p.flames, p.favorite, p.last_note, p.last_progress_delta, p.last_flame_delta,
    (select count(*) + 1 from progress p2 where p2.flames > p.flames) as rank,
    (select count(*) from progress) as total_patients
  from accounts a
  left join progress p on p.account_id = a.id
  where a.pin_hash = crypt(input_pin, a.pin_hash)
  limit 1;
end;
$$;

grant execute on function verify_pin(text) to anon;
