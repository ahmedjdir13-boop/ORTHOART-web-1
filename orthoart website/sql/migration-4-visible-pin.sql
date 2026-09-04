-- Migration 4 : le docteur peut voir le code du patient en permanence
-- (stocké en clair EN PLUS du hash, visible uniquement via l'admin-api)

alter table accounts add column if not exists pin_plain text;

drop function if exists add_patient(text, text);

create or replace function add_patient(input_name text, input_pin text)
returns uuid
language plpgsql
security definer
as $$
declare
  new_id uuid;
begin
  insert into accounts (name, role, pin_hash, pin_plain)
  values (input_name, 'patient', crypt(input_pin, gen_salt('bf')), input_pin)
  returning id into new_id;

  insert into progress (account_id, step, total_steps)
  values (new_id, 0, 12);

  return new_id;
end;
$$;

revoke execute on function add_patient(text, text) from anon, authenticated, public;
grant execute on function add_patient(text, text) to service_role;
