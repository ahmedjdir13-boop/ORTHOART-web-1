-- Migration 3 : historique complet des séances

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  note text,
  progress_delta numeric default 0,
  flame_delta int default 0,
  created_at timestamptz default now()
);

alter table sessions enable row level security;
revoke all on sessions from anon, authenticated;

drop function if exists verify_pin(text);

create or replace function verify_pin(input_pin text)
returns table (
  account_id uuid, name text, role text, step int, total_steps int,
  next_appointment date, flames int, favorite boolean,
  last_note text, last_progress_delta numeric, last_flame_delta int,
  rank bigint, total_patients bigint, history jsonb
)
language plpgsql
security definer
as $$
begin
  return query
  select
    a.id, a.name, a.role, p.step, p.total_steps, p.next_appointment,
    p.flames, p.favorite, p.last_note, p.last_progress_delta, p.last_flame_delta,
    (select count(*) + 1 from progress p2 where p2.flames > p.flames) as rank,
    (select count(*) from progress) as total_patients,
    (
      select coalesce(jsonb_agg(s order by s.created_at desc), '[]'::jsonb)
      from (
        select note, progress_delta, flame_delta, created_at
        from sessions
        where sessions.account_id = a.id
        order by created_at desc
        limit 20
      ) s
    ) as history
  from accounts a
  left join progress p on p.account_id = a.id
  where a.pin_hash = crypt(input_pin, a.pin_hash)
  limit 1;
end;
$$;

grant execute on function verify_pin(text) to anon;
