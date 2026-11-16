-- Don Alex · WhatsApp Cloud API
-- Mensajes entrantes y salientes asociados a conversaciones. Sin credenciales en SQL.

create table if not exists public.whatsapp_conversaciones (
  id uuid primary key default gen_random_uuid(),
  wa_id text not null unique,
  nombre_contacto text,
  estado text not null default 'bot' check (estado in ('bot','humano','cerrada')),
  ultimo_mensaje_at timestamptz,
  asignado_a uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_mensajes (
  id uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null references public.whatsapp_conversaciones(id) on delete cascade,
  wamid text unique,
  direccion text not null check (direccion in ('entrante','saliente')),
  tipo text not null default 'text',
  contenido text,
  estado text not null default 'recibido',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.whatsapp_conversaciones enable row level security;
alter table public.whatsapp_mensajes enable row level security;

drop policy if exists whatsapp_conversaciones_admin on public.whatsapp_conversaciones;
create policy whatsapp_conversaciones_admin on public.whatsapp_conversaciones
for all to authenticated using (public.es_admin()) with check (public.es_admin());

drop policy if exists whatsapp_mensajes_admin on public.whatsapp_mensajes;
create policy whatsapp_mensajes_admin on public.whatsapp_mensajes
for all to authenticated using (public.es_admin()) with check (public.es_admin());

create index if not exists whatsapp_mensajes_conversacion_fecha
on public.whatsapp_mensajes(conversacion_id, created_at desc);

create index if not exists whatsapp_conversaciones_ultimo_mensaje
on public.whatsapp_conversaciones(ultimo_mensaje_at desc);
