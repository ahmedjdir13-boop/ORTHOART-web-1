-- Crée le compte admin (à lancer une seule fois dans le SQL Editor)
insert into accounts (name, role, pin_hash)
values ('Dr. Saloua Ben Rejeb Jdir', 'admin', crypt('100000', gen_salt('bf')));
