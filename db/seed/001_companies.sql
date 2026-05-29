insert into companies (id, name) values
  ('nova-core', 'Nova Core'),
  ('nova-data', 'Nova Data'),
  ('nova-finance', 'Nova Finance'),
  ('nova-consulting', 'Nova Consulting')
on conflict (id) do update set name = excluded.name;
