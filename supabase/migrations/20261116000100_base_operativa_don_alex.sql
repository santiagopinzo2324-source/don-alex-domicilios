-- Don Alex Domicilios · Etapa 2
-- Base operativa PostgreSQL/Supabase. Ejecutar una sola vez mediante Supabase CLI.
-- No contiene secretos. Las cuentas de servicio deben permanecer en el servidor.

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('admin','cliente','domiciliario','restaurante');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.estado_registro as enum ('pendiente','activo','suspendido');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.tipo_zona as enum ('urbana','alejada','rural','especial');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.estado_tarifa as enum ('ok','revision');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.canal_pedido as enum ('web','whatsapp','telefono','restaurante','manual');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.tipo_servicio as enum ('restaurante','domicilio','compra','recogida','mandado');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.estado_pedido as enum ('recibido','confirmado','en_preparacion','listo','asignado','hacia_recogida','recogido','hacia_entrega','entregado','finalizado','cancelado');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre_completo text not null default '',
  telefono text,
  avatar_url text,
  tipo_cuenta_solicitada public.app_role not null default 'cliente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null default 'cliente',
  created_at timestamptz not null default now(),
  unique(user_id, role)
);

create table if not exists public.categorias (
  slug text primary key,
  nombre text not null,
  orden integer not null default 0,
  activa boolean not null default true,
  restringida boolean not null default false
);

create table if not exists public.configuracion (
  id integer primary key default 1 check (id = 1),
  tarifa_urbana integer not null default 6000 check (tarifa_urbana >= 0),
  tarifa_alejada integer not null default 12000 check (tarifa_alejada >= 0),
  tarifa_rural integer not null default 15000 check (tarifa_rural >= 0),
  comision_domiciliario numeric(5,4) not null default 0.15 check (comision_domiciliario between 0 and 1),
  hora_apertura time not null default '07:00',
  hora_cierre time not null default '23:00',
  horario text not null default 'Todos los días de 7:00 a. m. a 11:00 p. m.',
  whatsapp text not null default '3118199006',
  politicas text,
  updated_at timestamptz not null default now()
);

create table if not exists public.direcciones (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.profiles(id) on delete cascade,
  etiqueta text not null default 'Casa',
  direccion text not null,
  barrio text,
  referencia text,
  lat double precision,
  lng double precision,
  es_principal boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.domiciliarios (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  vehiculo text not null default 'motocicleta',
  documento_identidad text,
  placa text,
  licencia_vigente boolean not null default false,
  soat_vigente boolean not null default false,
  disponible boolean not null default false,
  estado public.estado_registro not null default 'pendiente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.establecimientos (
  id uuid primary key default gen_random_uuid(),
  propietario_id uuid references public.profiles(id) on delete set null,
  nombre text not null,
  slug text not null unique,
  categoria_slug text not null references public.categorias(slug),
  descripcion text,
  direccion text not null,
  barrio text,
  telefono text,
  lat double precision,
  lng double precision,
  logo_url text,
  portada_url text,
  horario jsonb not null default '{}'::jsonb,
  abierto boolean not null default false,
  destacado boolean not null default false,
  venta_licor_autorizada boolean not null default false,
  estado public.estado_registro not null default 'pendiente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  establecimiento_id uuid not null references public.establecimientos(id) on delete cascade,
  nombre text not null,
  descripcion text,
  precio integer not null check (precio >= 0),
  foto_url text,
  seccion text,
  disponible boolean not null default true,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.metodos_pago (
  codigo text primary key,
  nombre text not null,
  activo boolean not null default true,
  instrucciones text,
  orden integer not null default 0
);

create table if not exists public.zonas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo public.tipo_zona not null,
  prioridad integer not null default 0,
  poligono jsonb not null default '[]'::jsonb,
  valor_excepcion integer check (valor_excepcion is null or valor_excepcion >= 0),
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence if not exists public.pedidos_numero_seq;
create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  numero bigint not null unique default nextval('public.pedidos_numero_seq'),
  canal public.canal_pedido not null default 'web',
  tipo_servicio public.tipo_servicio not null default 'domicilio',
  estado public.estado_pedido not null default 'recibido',
  estado_tarifa public.estado_tarifa not null default 'revision',
  cliente_id uuid references public.profiles(id) on delete set null,
  creado_por uuid references public.profiles(id) on delete set null,
  cliente_nombre text not null,
  cliente_telefono text not null,
  establecimiento_id uuid references public.establecimientos(id) on delete set null,
  establecimiento_nombre text,
  recogida_direccion text,
  recogida_lat double precision,
  recogida_lng double precision,
  entrega_direccion text not null,
  entrega_barrio text,
  entrega_referencia text,
  entrega_lat double precision,
  entrega_lng double precision,
  zona_tipo public.tipo_zona,
  descripcion text,
  observaciones text,
  subtotal_productos integer not null default 0 check (subtotal_productos >= 0),
  valor_domicilio integer check (valor_domicilio is null or valor_domicilio >= 0),
  total integer not null default 0 check (total >= 0),
  metodo_pago text references public.metodos_pago(codigo),
  domiciliario_id uuid references public.profiles(id) on delete set null,
  asignado_at timestamptz,
  entregado_at timestamptz,
  tiempo_preparacion_min integer,
  comision_empresa integer,
  pago_domiciliario integer,
  pago_domiciliario_liquidado boolean not null default false,
  motivo_cancelacion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  producto_id uuid references public.productos(id) on delete set null,
  nombre text not null,
  cantidad integer not null check (cantidad > 0),
  precio_unitario integer not null check (precio_unitario >= 0),
  notas text
);

create table if not exists public.pedido_eventos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  tipo text not null default 'actualizacion',
  estado public.estado_pedido,
  nota text,
  created_at timestamptz not null default now()
);

create table if not exists public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pedido_id uuid references public.pedidos(id) on delete cascade,
  titulo text not null,
  cuerpo text,
  leida boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.registro_actividad (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  accion text not null,
  entidad text,
  entidad_id text,
  detalle jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role); $$;

create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select public.has_role(auth.uid(), 'admin'); $$;

create or replace function public.es_domiciliario_activo()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.domiciliarios where user_id = auth.uid() and estado = 'activo'); $$;

create or replace function public.es_propietario_establecimiento(_establecimiento_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.establecimientos where id = _establecimiento_id and propietario_id = auth.uid()); $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_nombre text; v_telefono text; v_solicitud public.app_role;
begin
  v_nombre := coalesce(new.raw_user_meta_data->>'nombre_completo', '');
  v_telefono := nullif(new.raw_user_meta_data->>'telefono', '');
  begin v_solicitud := coalesce((new.raw_user_meta_data->>'tipo_cuenta')::public.app_role, 'cliente');
  exception when others then v_solicitud := 'cliente'; end;
  insert into public.profiles(id,nombre_completo,telefono,tipo_cuenta_solicitada)
  values(new.id,v_nombre,v_telefono,v_solicitud)
  on conflict(id) do nothing;
  insert into public.user_roles(user_id,role) values(new.id,'cliente') on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created_don_alex on auth.users;
create trigger on_auth_user_created_don_alex after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

do $$ declare t text; begin
  foreach t in array array['profiles','configuracion','domiciliarios','establecimientos','productos','zonas','pedidos'] loop
    execute format('drop trigger if exists touch_updated_at on public.%I',t);
    execute format('create trigger touch_updated_at before update on public.%I for each row execute procedure public.touch_updated_at()',t);
  end loop;
end $$;

insert into public.configuracion(id) values(1) on conflict(id) do nothing;
insert into public.metodos_pago(codigo,nombre,orden) values
 ('efectivo','Efectivo',1),('nequi','Nequi',2),('bancolombia','Bancolombia',3),('transferencia','Transferencia bancaria',4)
on conflict(codigo) do nothing;

insert into public.categorias(slug,nombre,orden,restringida) values
 ('restaurantes','Restaurantes',1,false),('comidas-rapidas','Comidas rápidas',2,false),
 ('hamburguesas','Hamburguesas',3,false),('perros','Perros calientes',4,false),
 ('pizzerias','Pizzerías',5,false),('pollo','Pollo',6,false),('desayunos','Desayunos',7,false),
 ('almuerzos','Almuerzos',8,false),('postres','Postres',9,false),('heladerias','Heladerías',10,false),
 ('fruterias','Fruterías',11,false),('supermercados','Supermercados',12,false),
 ('tiendas','Tiendas',13,false),('farmacias','Farmacias',14,false),('floristerias','Floristerías',15,false),
 ('papelerias','Papelerías',16,false),('licorerias','Licorerías',17,true),('otros','Otros establecimientos',18,false)
on conflict(slug) do nothing;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.categorias enable row level security;
alter table public.configuracion enable row level security;
alter table public.direcciones enable row level security;
alter table public.domiciliarios enable row level security;
alter table public.establecimientos enable row level security;
alter table public.productos enable row level security;
alter table public.metodos_pago enable row level security;
alter table public.zonas enable row level security;
alter table public.pedidos enable row level security;
alter table public.pedido_items enable row level security;
alter table public.pedido_eventos enable row level security;
alter table public.notificaciones enable row level security;
alter table public.registro_actividad enable row level security;

-- Perfil: cada usuario ve/edita el suyo; administración puede gestionar todos.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid() or public.es_admin());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid() or public.es_admin()) with check (id = auth.uid() or public.es_admin());

-- Los usuarios no pueden asignarse roles privilegiados por sí mismos.
drop policy if exists roles_select on public.user_roles;
create policy roles_select on public.user_roles for select to authenticated using (user_id = auth.uid() or public.es_admin());
drop policy if exists roles_admin_all on public.user_roles;
create policy roles_admin_all on public.user_roles for all to authenticated using (public.es_admin()) with check (public.es_admin());

drop policy if exists categorias_public_read on public.categorias;
create policy categorias_public_read on public.categorias for select to anon, authenticated using (activa or public.es_admin());
drop policy if exists categorias_admin_write on public.categorias;
create policy categorias_admin_write on public.categorias for all to authenticated using (public.es_admin()) with check (public.es_admin());

drop policy if exists config_read on public.configuracion;
create policy config_read on public.configuracion for select to anon, authenticated using (true);
drop policy if exists config_admin_write on public.configuracion;
create policy config_admin_write on public.configuracion for all to authenticated using (public.es_admin()) with check (public.es_admin());

drop policy if exists direcciones_owner on public.direcciones;
create policy direcciones_owner on public.direcciones for all to authenticated using (cliente_id = auth.uid() or public.es_admin()) with check (cliente_id = auth.uid() or public.es_admin());

drop policy if exists domiciliarios_read_self_admin on public.domiciliarios;
create policy domiciliarios_read_self_admin on public.domiciliarios for select to authenticated using (user_id = auth.uid() or public.es_admin());
drop policy if exists domiciliarios_admin_write on public.domiciliarios;
create policy domiciliarios_admin_write on public.domiciliarios for all to authenticated using (public.es_admin()) with check (public.es_admin());

drop policy if exists establecimientos_public_read on public.establecimientos;
create policy establecimientos_public_read on public.establecimientos for select to anon, authenticated using (estado = 'activo' and abierto or estado = 'activo' or public.es_admin() or propietario_id = auth.uid());
drop policy if exists establecimientos_owner_insert on public.establecimientos;
create policy establecimientos_owner_insert on public.establecimientos for insert to authenticated with check (propietario_id = auth.uid() or public.es_admin());
drop policy if exists establecimientos_owner_update on public.establecimientos;
create policy establecimientos_owner_update on public.establecimientos for update to authenticated using (propietario_id = auth.uid() or public.es_admin()) with check (propietario_id = auth.uid() or public.es_admin());

drop policy if exists productos_public_read on public.productos;
create policy productos_public_read on public.productos for select to anon, authenticated using (
  disponible and exists(select 1 from public.establecimientos e where e.id = establecimiento_id and e.estado = 'activo')
  or public.es_admin() or public.es_propietario_establecimiento(establecimiento_id)
);
drop policy if exists productos_owner_insert on public.productos;
create policy productos_owner_insert on public.productos for insert to authenticated with check (public.es_propietario_establecimiento(establecimiento_id) or public.es_admin());
drop policy if exists productos_owner_update on public.productos;
create policy productos_owner_update on public.productos for update to authenticated using (public.es_propietario_establecimiento(establecimiento_id) or public.es_admin()) with check (public.es_propietario_establecimiento(establecimiento_id) or public.es_admin());
drop policy if exists productos_owner_delete on public.productos;
create policy productos_owner_delete on public.productos for delete to authenticated using (public.es_propietario_establecimiento(establecimiento_id) or public.es_admin());

drop policy if exists metodos_pago_read on public.metodos_pago;
create policy metodos_pago_read on public.metodos_pago for select to anon, authenticated using (activo or public.es_admin());
drop policy if exists metodos_pago_admin_write on public.metodos_pago;
create policy metodos_pago_admin_write on public.metodos_pago for all to authenticated using (public.es_admin()) with check (public.es_admin());

drop policy if exists zonas_read on public.zonas;
create policy zonas_read on public.zonas for select to anon, authenticated using (activa or public.es_admin());
drop policy if exists zonas_admin_write on public.zonas;
create policy zonas_admin_write on public.zonas for all to authenticated using (public.es_admin()) with check (public.es_admin());

drop policy if exists pedidos_select_participants on public.pedidos;
create policy pedidos_select_participants on public.pedidos for select to authenticated using (
  cliente_id = auth.uid() or domiciliario_id = auth.uid() or public.es_admin()
  or (establecimiento_id is not null and public.es_propietario_establecimiento(establecimiento_id))
);
drop policy if exists pedidos_customer_insert on public.pedidos;
create policy pedidos_customer_insert on public.pedidos for insert to authenticated with check (
  (cliente_id = auth.uid() and creado_por = auth.uid()) or public.es_admin()
  or (establecimiento_id is not null and public.es_propietario_establecimiento(establecimiento_id))
);
drop policy if exists pedidos_update_admin_or_assigned on public.pedidos;
create policy pedidos_update_admin_or_assigned on public.pedidos for update to authenticated using (
  public.es_admin() or domiciliario_id = auth.uid()
  or (establecimiento_id is not null and public.es_propietario_establecimiento(establecimiento_id))
) with check (
  public.es_admin() or domiciliario_id = auth.uid()
  or (establecimiento_id is not null and public.es_propietario_establecimiento(establecimiento_id))
);

drop policy if exists pedido_items_participants on public.pedido_items;
create policy pedido_items_participants on public.pedido_items for select to authenticated using (
  exists(select 1 from public.pedidos p where p.id = pedido_id and
    (p.cliente_id = auth.uid() or p.domiciliario_id = auth.uid() or public.es_admin()
     or (p.establecimiento_id is not null and public.es_propietario_establecimiento(p.establecimiento_id)))
);
drop policy if exists pedido_items_customer_insert on public.pedido_items;
create policy pedido_items_customer_insert on public.pedido_items for insert to authenticated with check (
  exists(select 1 from public.pedidos p where p.id = pedido_id and (p.cliente_id = auth.uid() or public.es_admin()))
);

drop policy if exists pedido_eventos_participants on public.pedido_eventos;
create policy pedido_eventos_participants on public.pedido_eventos for select to authenticated using (
  exists(select 1 from public.pedidos p where p.id = pedido_id and
    (p.cliente_id = auth.uid() or p.domiciliario_id = auth.uid() or public.es_admin()
     or (p.establecimiento_id is not null and public.es_propietario_establecimiento(p.establecimiento_id)))
);
drop policy if exists pedido_eventos_insert_participants on public.pedido_eventos;
create policy pedido_eventos_insert_participants on public.pedido_eventos for insert to authenticated with check (
  actor_id = auth.uid() and exists(select 1 from public.pedidos p where p.id = pedido_id and
    (p.cliente_id = auth.uid() or p.domiciliario_id = auth.uid() or public.es_admin()
     or (p.establecimiento_id is not null and public.es_propietario_establecimiento(p.establecimiento_id)))
);

drop policy if exists notificaciones_owner on public.notificaciones;
create policy notificaciones_owner on public.notificaciones for select to authenticated using (user_id = auth.uid() or public.es_admin());
drop policy if exists notificaciones_mark_read on public.notificaciones;
create policy notificaciones_mark_read on public.notificaciones for update to authenticated using (user_id = auth.uid() or public.es_admin()) with check (user_id = auth.uid() or public.es_admin());

drop policy if exists actividad_admin_read on public.registro_actividad;
create policy actividad_admin_read on public.registro_actividad for select to authenticated using (public.es_admin());
drop policy if exists actividad_admin_insert on public.registro_actividad;
create policy actividad_admin_insert on public.registro_actividad for insert to authenticated with check (public.es_admin());

-- Activar cambios en tiempo real para pedidos y notificaciones si aún no están publicados.
do $$ begin
  alter publication supabase_realtime add table public.pedidos;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.notificaciones;
exception when duplicate_object then null; when undefined_object then null; end $$;
