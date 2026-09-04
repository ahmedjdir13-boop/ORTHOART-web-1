-- Force le code admin à 100000, sans ambiguïté (écrase l'ancien)
update accounts
set pin_hash = crypt('100000', gen_salt('bf'))
where role = 'admin';
