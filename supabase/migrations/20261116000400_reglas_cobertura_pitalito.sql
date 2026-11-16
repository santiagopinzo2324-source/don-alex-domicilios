-- Reglas de cobertura y horario para Pitalito.
create table if not exists public.reglas_cobertura (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  servicio_disponible boolean not null default true,
  hora_limite time,
  mensaje_cliente text not null,
  poligono jsonb not null default '[]'::jsonb,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reglas_cobertura_hora_valida check (hora_limite is null or (hora_limite >= time '00:00' and hora_limite <= time '23:59'))
);
alter table public.reglas_cobertura enable row level security;
drop policy if exists reglas_cobertura_public_read on public.reglas_cobertura;
create policy reglas_cobertura_public_read on public.reglas_cobertura
  for select to anon, authenticated using (activa or public.es_admin());
drop policy if exists reglas_cobertura_admin_write on public.reglas_cobertura;
create policy reglas_cobertura_admin_write on public.reglas_cobertura
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
grant select on public.reglas_cobertura to anon, authenticated;
grant insert, update, delete on public.reglas_cobertura to authenticated;
insert into public.reglas_cobertura (nombre, servicio_disponible, hora_limite, mensaje_cliente, activa)
values
 ('Barrio Popular', false, null, 'Por el momento no contamos con cobertura de domicilios en este sector. Comunícate con nosotros para consultar alternativas.', true),
 ('Barrio Porvenir', false, null, 'Por el momento no contamos con cobertura de domicilios en este sector. Comunícate con nosotros para consultar alternativas.', true),
 ('Villa del Prado', true, time '17:30', 'En este sector recibimos pedidos hasta las 5:30 p. m. Confirma la disponibilidad antes de realizar tu pedido.', true)
on conflict (nombre) do update set
 servicio_disponible = excluded.servicio_disponible,
 hora_limite = excluded.hora_limite,
 mensaje_cliente = excluded.mensaje_cliente,
 activa = excluded.activa,
 updated_at = now();